import * as FileSystem from "expo-file-system";

import { getStoredOpenAIApiKey } from "@/storage/secureStore";
import { ScanCandidate } from "@/types/book";
import { ScanSession } from "@/types/scan";

const OPENAI_MODEL = "gpt-4.1";
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const HIGH_CONFIDENCE_THRESHOLD = 0.82;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
const MAX_RETURNED_BOOKS = 16;

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

async function analyzeWithOpenAI(imageUri: string) {
  const apiKey = await getStoredOpenAIApiKey();

  if (!apiKey) {
    throw new Error("Brak klucza OpenAI API. Dodaj go w zakladce Ustawienia.");
  }

  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
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
              text:
                "Na zdjeciu telefonu widac fragment polki z ksiazkami. Zwykle bedzie tam 3 do 6 grzbietow, ale jesli ksiazki sa cienkie i wysokie, moze byc ich wiecej. Skup sie na centralnej czesci kadru i ignoruj dalsze tlo. Zwracaj wszystkie ksiazki, ktorych grzbiet jest naprawde widoczny i czytelny, nawet jesli jest ich 8, 10 albo wiecej. Nie zgaduj brakujacych danych. Zachowuj polskie znaki, jesli sa widoczne. Dla kazdej ksiazki zwroc pola raw_text, title, author, confidence, review_reason. raw_text ma zachowac tekst z grzbietu mozliwie wiernie. title i author maja byc puste, jesli nie da sie ich odczytac z rozsadna pewnoscia. confidence ma byc liczba od 0 do 1. review_reason ma krotko wyjasnic, co jest niepewne. Odpowiedz wylacznie poprawnym JSON-em w formacie {\"books\":[...]}.",
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
  const books = deduplicateBooks(parsed.books ?? [])
    .filter(
      (book) =>
        normalizeWhitespace(book.raw_text).length > 1 ||
        normalizeWhitespace(book.title).length > 1
    )
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
}
