import * as FileSystem from "expo-file-system";
import {
  SaveFormat,
  manipulateAsync,
  type ActionCrop,
  type ActionResize
} from "expo-image-manipulator";

import { getStoredOpenAIApiKey } from "@/storage/secureStore";
import { ScanCandidate } from "@/types/book";
import { ScanSession } from "@/types/scan";

const OPENAI_MODEL = "gpt-4.1";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const HIGH_CONFIDENCE_THRESHOLD = 0.82;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
const MAX_RETURNED_BOOKS = 16;
const PREPROCESS_MAX_DIMENSION = 1600;
const PREPROCESS_JPEG_QUALITY = 0.86;
const SEGMENT_OVERLAP_RATIO = 0.08;

interface TextRecognitionFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface OcrLine {
  text: string;
  frame: TextRecognitionFrame;
}

interface OcrBlock {
  text: string;
  frame: TextRecognitionFrame;
  lines: OcrLine[];
}

interface OpenAIBookCandidate {
  raw_text: string;
  title: string;
  author: string;
  confidence: number;
  review_reason?: string;
}

interface OpenAIOcrPayload {
  books: OpenAIBookCandidate[];
}

interface OpenAIResponsesApiResult {
  output_text?: string;
  error?: {
    message?: string;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
}

interface PreparedImageVariant {
  uri: string;
  width: number;
  height: number;
  label: string;
}

const scanSessionCache = new Map<string, Promise<ScanSession>>();

const mockCandidates: ScanCandidate[] = [
  {
    id: "mock-1",
    rawText: "LEM SOLARIS",
    titleSuggestion: "Solaris",
    authorSuggestion: "Stanislaw Lem",
    confidence: 0.94
  },
  {
    id: "mock-2",
    rawText: "TOKARCZUK BIEGUNI",
    titleSuggestion: "Bieguni",
    authorSuggestion: "Olga Tokarczuk",
    confidence: 0.88
  },
  {
    id: "mock-3",
    rawText: "MILOSZ ZNIEWOLONY UMYSL",
    titleSuggestion: "Zniewolony umysl",
    authorSuggestion: "Czeslaw Milosz",
    confidence: 0.83
  }
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function frameToBoundingBox(frame?: TextRecognitionFrame) {
  if (!frame) {
    return undefined;
  }

  return {
    x: frame.left,
    y: frame.top,
    width: frame.width,
    height: frame.height
  };
}

function buildMockSession(imageUri?: string, reason?: string): ScanSession {
  return {
    id: `scan-${Date.now()}`,
    source: "mock-camera",
    createdAt: new Date().toISOString(),
    imageLabel: reason ? `Probny skan polki (${reason})` : "Probny skan polki",
    imageUri,
    candidates: mockCandidates
  };
}

function withAttentionFlags(candidate: OpenAIBookCandidate): ScanCandidate {
  const confidence = Number.isFinite(candidate.confidence)
    ? Math.max(0, Math.min(1, candidate.confidence))
    : 0;
  const reviewReason = normalizeWhitespace(candidate.review_reason ?? "");
  const titleSuggestion = normalizeWhitespace(candidate.title);
  const authorSuggestion = normalizeWhitespace(candidate.author);
  const rawText = normalizeWhitespace(candidate.raw_text);
  const needsAttention =
    confidence < HIGH_CONFIDENCE_THRESHOLD ||
    titleSuggestion.length === 0 ||
    (authorSuggestion.length === 0 && confidence < 0.92);

  return {
    id: `openai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    rawText,
    titleSuggestion,
    authorSuggestion,
    confidence,
    needsAttention,
    reviewReason:
      reviewReason ||
      (confidence < MEDIUM_CONFIDENCE_THRESHOLD
        ? "Niska pewnosc odczytu. Sprawdz caly wpis recznie."
        : authorSuggestion.length === 0
          ? "Brakuje autora albo grzbiet byl tylko czesciowo widoczny."
          : titleSuggestion.length === 0
            ? "Brakuje tytulu. Warto porownac z grzbietem ksiazki."
            : undefined)
  };
}

function buildOpenAISession(
  imageUri: string,
  books: OpenAIBookCandidate[]
): ScanSession {
  return {
    id: `scan-${Date.now()}`,
    source: "openai",
    createdAt: new Date().toISOString(),
    imageLabel: "Skan z kamery (OpenAI Vision)",
    imageUri,
    candidates: books.map(withAttentionFlags)
  };
}

async function recognizeTextLocally(imageUri: string) {
  const module = await import("@react-native-ml-kit/text-recognition");
  return module.default.recognize(imageUri);
}

function mapBlockToCandidate(block: OcrBlock, index: number): ScanCandidate {
  const rawText = normalizeWhitespace(block.text);
  const fallbackText = block.lines.map((line) => normalizeWhitespace(line.text)).join(" ");
  const effectiveText = rawText || fallbackText || `Pozycja ${index + 1}`;

  return {
    id: `ocr-${Date.now()}-${index}`,
    rawText: effectiveText,
    titleSuggestion: effectiveText,
    authorSuggestion: "",
    confidence: undefined,
    needsAttention: true,
    reviewReason: "To wynik lokalnego fallbacku. Warto go porownac z grzbietem.",
    boundingBox: frameToBoundingBox(block.frame)
  };
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as OpenAIOcrPayload;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Model nie zwrocil poprawnego JSON.");
    }

    return JSON.parse(match[0]) as OpenAIOcrPayload;
  }
}

function extractResponseText(data: OpenAIResponsesApiResult) {
  if (data.output_text && data.output_text.trim().length > 0) {
    return data.output_text;
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && item.text);

  if (outputText?.text) {
    return outputText.text;
  }

  const refusal = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "refusal" && item.refusal);

  if (refusal?.refusal) {
    throw new Error(`Model odmowil odpowiedzi: ${refusal.refusal}`);
  }

  return null;
}

function deduplicateBooks(books: OpenAIBookCandidate[]) {
  const seen = new Set<string>();

  return books.filter((book) => {
    const fingerprint = [
      normalizeWhitespace(book.raw_text).toLowerCase(),
      normalizeWhitespace(book.title).toLowerCase(),
      normalizeWhitespace(book.author).toLowerCase()
    ].join("|");

    if (seen.has(fingerprint) || fingerprint === "||") {
      return false;
    }

    seen.add(fingerprint);
    return true;
  });
}

function buildOpenAiPrompt(label: string) {
  return [
    "Na zdjeciu telefonu widac fragment polki z ksiazkami.",
    "Zwykle bedzie tam 3 do 6 grzbietow, ale jesli ksiazki sa cienkie i wysokie, moze byc ich wiecej.",
    `Analizujesz teraz obszar: ${label}.`,
    "Skup sie tylko na ksiazkach, ktorych grzbiety sa faktycznie widoczne w tym obszarze.",
    "Ignoruj tlo, dlonie i elementy spoza ksiazek.",
    "Nie zgaduj brakujacych danych.",
    "Zachowuj polskie znaki, jesli sa widoczne.",
    "Dla kazdej ksiazki zwroc pola raw_text, title, author, confidence, review_reason.",
    "raw_text ma zachowac tekst z grzbietu mozliwie wiernie.",
    "title i author maja byc puste, jesli nie da sie ich odczytac z rozsadna pewnoscia.",
    "confidence ma byc liczba od 0 do 1.",
    "review_reason ma krotko wyjasnic, co jest niepewne.",
    "Odpowiedz wylacznie poprawnym JSON-em w formacie {\"books\":[...]}."
  ].join(" ");
}

function buildResizeAction(
  width: number,
  height: number
): ActionResize | null {
  const longestSide = Math.max(width, height);

  if (longestSide <= PREPROCESS_MAX_DIMENSION) {
    return null;
  }

  if (width >= height) {
    return {
      resize: {
        width: PREPROCESS_MAX_DIMENSION
      }
    };
  }

  return {
    resize: {
      height: PREPROCESS_MAX_DIMENSION
    }
  };
}

async function prepareImageVariants(imageUri: string): Promise<PreparedImageVariant[]> {
  const imageInfo = await FileSystem.getInfoAsync(imageUri);

  if (!imageInfo.exists) {
    throw new Error("Nie znaleziono zdjecia do analizy OCR.");
  }

  const dimensions =
    "width" in imageInfo && typeof imageInfo.width === "number" &&
    "height" in imageInfo && typeof imageInfo.height === "number"
      ? { width: imageInfo.width, height: imageInfo.height }
      : null;

  if (!dimensions) {
    return [
      {
        uri: imageUri,
        width: PREPROCESS_MAX_DIMENSION,
        height: PREPROCESS_MAX_DIMENSION,
        label: "caly srodkowy kadr"
      }
    ];
  }

  const resizeAction = buildResizeAction(dimensions.width, dimensions.height);
  const resizedImage = resizeAction
    ? await manipulateAsync(imageUri, [resizeAction], {
        compress: PREPROCESS_JPEG_QUALITY,
        format: SaveFormat.JPEG
      })
    : {
        uri: imageUri,
        width: dimensions.width,
        height: dimensions.height
      };

  const cropInsetX = Math.round(resizedImage.width * 0.04);
  const cropInsetY = Math.round(resizedImage.height * 0.03);
  const centeredWidth = Math.max(resizedImage.width - cropInsetX * 2, 320);
  const centeredHeight = Math.max(resizedImage.height - cropInsetY * 2, 320);
  const centeredCrop: ActionCrop = {
    crop: {
      originX: Math.max(0, cropInsetX),
      originY: Math.max(0, cropInsetY),
      width: Math.min(centeredWidth, resizedImage.width),
      height: Math.min(centeredHeight, resizedImage.height)
    }
  };

  const centeredImage = await manipulateAsync(resizedImage.uri, [centeredCrop], {
    compress: PREPROCESS_JPEG_QUALITY,
    format: SaveFormat.JPEG
  });

  const variants: PreparedImageVariant[] = [
    {
      uri: centeredImage.uri,
      width: centeredImage.width,
      height: centeredImage.height,
      label: "caly srodkowy kadr"
    }
  ];

  if (centeredImage.width >= 900) {
    const segmentCount = centeredImage.width >= 1300 ? 3 : 2;
    const baseSegmentWidth = Math.round(centeredImage.width / segmentCount);
    const overlap = Math.round(centeredImage.width * SEGMENT_OVERLAP_RATIO);

    for (let index = 0; index < segmentCount; index += 1) {
      const originX =
        index === 0
          ? 0
          : Math.max(0, index * baseSegmentWidth - overlap);
      const segmentWidth =
        index === segmentCount - 1
          ? centeredImage.width - originX
          : Math.min(centeredImage.width - originX, baseSegmentWidth + overlap * 2);

      const segmentImage = await manipulateAsync(
        centeredImage.uri,
        [
          {
            crop: {
              originX,
              originY: 0,
              width: segmentWidth,
              height: centeredImage.height
            }
          }
        ],
        {
          compress: PREPROCESS_JPEG_QUALITY,
          format: SaveFormat.JPEG
        }
      );

      variants.push({
        uri: segmentImage.uri,
        width: segmentImage.width,
        height: segmentImage.height,
        label: `sekcja ${index + 1} z ${segmentCount}`
      });
    }
  }

  return variants;
}

async function analyzeImageVariantWithOpenAI(
  variant: PreparedImageVariant,
  apiKey: string
) {
  const base64Image = await FileSystem.readAsStringAsync(variant.uri, {
    encoding: FileSystem.EncodingType.Base64
  });

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_output_tokens: 900,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildOpenAiPrompt(variant.label)
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "book_spine_scan",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              books: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    raw_text: { type: "string" },
                    title: { type: "string" },
                    author: { type: "string" },
                    confidence: { type: "number" },
                    review_reason: { type: "string" }
                  },
                  required: ["raw_text", "title", "author", "confidence", "review_reason"]
                }
              }
            },
            required: ["books"]
          },
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI OCR error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as OpenAIResponsesApiResult;
  const responseText = extractResponseText(data);

  if (!responseText) {
    throw new Error(
      data.error?.message
        ? `OpenAI nie zwrocil wyniku OCR: ${data.error.message}`
        : "OpenAI nie zwrocil wyniku OCR."
    );
  }

  const parsed = extractJsonObject(responseText);
  return parsed.books ?? [];
}

async function analyzeWithOpenAI(imageUri: string) {
  const apiKey = await getStoredOpenAIApiKey();

  if (!apiKey) {
    throw new Error("Brak klucza OpenAI API. Dodaj go w zakladce Ustawienia.");
  }

  const variants = await prepareImageVariants(imageUri);
  const booksByVariant = await Promise.all(
    variants.map((variant) => analyzeImageVariantWithOpenAI(variant, apiKey))
  );
  const books = deduplicateBooks(booksByVariant.flat())
    .filter(
      (book) =>
        normalizeWhitespace(book.raw_text).length > 1 ||
        normalizeWhitespace(book.title).length > 1
    )
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, MAX_RETURNED_BOOKS);

  if (books.length === 0) {
    throw new Error("OpenAI nie rozpoznal zadnych ksiazek na zdjeciu.");
  }

  return buildOpenAISession(imageUri, books);
}

async function analyzeLocally(imageUri: string) {
  const result = await recognizeTextLocally(imageUri);
  const blocks = result.blocks.filter(
    (block) => normalizeWhitespace(block.text).length >= 3
  );
  const candidates = blocks.map((block, index) =>
    mapBlockToCandidate(block as OcrBlock, index)
  );

  if (candidates.length === 0) {
    return buildMockSession(imageUri, "brak wykrytego tekstu");
  }

  return {
    id: `scan-${Date.now()}`,
    source: "camera",
    createdAt: new Date().toISOString(),
    imageLabel: "Skan z kamery (lokalny OCR)",
    imageUri,
    candidates
  } satisfies ScanSession;
}

export async function scanShelfImage(imageUri: string): Promise<ScanSession> {
  const cachedSession = scanSessionCache.get(imageUri);

  if (cachedSession) {
    return cachedSession;
  }

  const scanPromise = (async () => {
    const apiKey = await getStoredOpenAIApiKey();

    try {
      return await analyzeWithOpenAI(imageUri);
    } catch (error) {
      if (apiKey) {
        throw error;
      }

      try {
        return await analyzeLocally(imageUri);
      } catch {
        return buildMockSession(imageUri, "fallback OCR");
      }
    }
  })();

  scanSessionCache.set(imageUri, scanPromise);

  try {
    return await scanPromise;
  } catch (error) {
    scanSessionCache.delete(imageUri);
    throw error;
  }
}
