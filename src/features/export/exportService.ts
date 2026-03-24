import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { Book, BookStatus } from "@/types/book";
import { normalizeStoredText } from "@/utils/text";

const csvEscape = (value: string) =>
  `"${normalizeStoredText(value)?.replaceAll("\"", "\"\"") ?? ""}"`;

const CSV_COLUMNS = [
  "id",
  "title",
  "author",
  "genre",
  "isbn",
  "shelfLocation",
  "ocrText",
  "status",
  "price",
  "borrowedTo",
  "notes",
  "createdAt",
  "updatedAt"
] as const;

export const exportBooksToCsv = (books: Book[]) => {
  const rows = books.map((book) =>
    [
      book.id,
      book.title,
      book.author,
      book.genre ?? "",
      book.isbn ?? "",
      book.shelfLocation ?? "",
      book.ocrText,
      book.status,
      book.price?.toString() ?? "",
      book.borrowedTo ?? "",
      book.notes ?? "",
      book.createdAt,
      book.updatedAt
    ]
      .map((cell) => csvEscape(cell))
      .join(",")
  );

  // BOM pomaga Excelowi poprawnie odczytać polskie znaki w CSV.
  return `\uFEFF${[CSV_COLUMNS.join(","), ...rows].join("\n")}`;
};

const VALID_BOOK_STATUSES: BookStatus[] = [
  "available",
  "borrowed",
  "for_sale",
  "sold",
  "needs_review"
];

function createImportedBookId() {
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function removeUtfBom(value: string) {
  return value.replace(/^\uFEFF/, "");
}

function splitCsvRow(row: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const nextChar = row[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsvRows(csvText: string) {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      if (current.trim().length > 0) {
        rows.push(current);
      }

      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    rows.push(current);
  }

  return rows;
}

function getOptionalValue(value: string | undefined) {
  const normalizedValue = normalizeStoredText(value);
  return normalizedValue ? normalizedValue : undefined;
}

function getRequiredValue(value: string | undefined, fallback = "") {
  return normalizeStoredText(value) ?? fallback;
}

function parseBookStatus(value: string | undefined): BookStatus {
  const normalizedValue = getOptionalValue(value);

  if (!normalizedValue) {
    return "available";
  }

  return VALID_BOOK_STATUSES.includes(normalizedValue as BookStatus)
    ? (normalizedValue as BookStatus)
    : "available";
}

function parseBookPrice(value: string | undefined) {
  const normalizedValue = getOptionalValue(value);

  if (!normalizedValue) {
    return undefined;
  }

  const parsedPrice = Number(normalizedValue.replace(",", "."));
  return Number.isFinite(parsedPrice) ? parsedPrice : undefined;
}

export function importBooksFromCsv(csvText: string): Book[] {
  const sanitizedCsv = removeUtfBom(csvText);
  const rows = parseCsvRows(sanitizedCsv);

  if (rows.length < 2) {
    throw new Error("Plik CSV nie zawiera żadnych danych książek.");
  }

  const header = splitCsvRow(rows[0]).map((column) => column.trim());
  const missingColumns = CSV_COLUMNS.filter((column) => !header.includes(column));

  if (missingColumns.length) {
    throw new Error(
      `Brakuje wymaganych kolumn CSV: ${missingColumns.join(", ")}.`
    );
  }

  const headerIndexMap = new Map(header.map((column, index) => [column, index]));

  return rows.slice(1).map((row, rowIndex) => {
    const values = splitCsvRow(row);
    const getValue = (column: (typeof CSV_COLUMNS)[number]) =>
      values[headerIndexMap.get(column) ?? -1];
    const timestamp = new Date().toISOString();
    const title = getRequiredValue(getValue("title"));

    if (!title) {
      throw new Error(`Wiersz ${rowIndex + 2} nie zawiera tytułu książki.`);
    }

    return {
      id: getRequiredValue(getValue("id"), createImportedBookId()),
      title,
      author: getRequiredValue(getValue("author")),
      genre: getOptionalValue(getValue("genre")),
      isbn: getOptionalValue(getValue("isbn")),
      shelfLocation: getOptionalValue(getValue("shelfLocation")),
      ocrText: getRequiredValue(getValue("ocrText")),
      status: parseBookStatus(getValue("status")),
      price: parseBookPrice(getValue("price")),
      borrowedTo: getOptionalValue(getValue("borrowedTo")),
      notes: getOptionalValue(getValue("notes")),
      createdAt: getRequiredValue(getValue("createdAt"), timestamp),
      updatedAt: getRequiredValue(getValue("updatedAt"), timestamp)
    };
  });
}

function buildTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`;
}

export async function createCsvExportFile(books: Book[]) {
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (!baseDirectory) {
    throw new Error("Nie udało się przygotować katalogu na plik eksportu.");
  }

  const fileUri = `${baseDirectory}katalog-ksiazek_${buildTimestamp()}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, exportBooksToCsv(books), {
    encoding: FileSystem.EncodingType.UTF8
  });

  return fileUri;
}

export async function shareCsvExport(books: Book[]) {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error("Udostępnianie plików nie jest dostępne na tym urządzeniu.");
  }

  const fileUri = await createCsvExportFile(books);

  await Sharing.shareAsync(fileUri, {
    dialogTitle: "Udostępnij katalog książek",
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text"
  });

  return fileUri;
}
