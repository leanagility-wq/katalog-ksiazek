import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { Book } from "@/types/book";
import { normalizeStoredText } from "@/utils/text";

const csvEscape = (value: string) =>
  `"${normalizeStoredText(value)?.replaceAll("\"", "\"\"") ?? ""}"`;

export const exportBooksToCsv = (books: Book[]) => {
  const header = [
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
  ];

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
  return `\uFEFF${[header.join(","), ...rows].join("\n")}`;
};

export const exportBooksToJson = (books: Book[]) =>
  JSON.stringify(books, null, 2);

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
