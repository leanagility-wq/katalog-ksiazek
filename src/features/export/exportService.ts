import { Book } from "@/types/book";

const csvEscape = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;

export const exportBooksToCsv = (books: Book[]) => {
  const header = [
    "id",
    "title",
    "author",
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

  return [header.join(","), ...rows].join("\n");
};

export const exportBooksToJson = (books: Book[]) =>
  JSON.stringify(books, null, 2);
