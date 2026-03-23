import { Book } from "@/types/book";
import { getDatabase } from "@/storage/database";
import { normalizeStoredText } from "@/utils/text";

export interface BookRepository {
  list(): Promise<Book[]>;
  save(book: Book): Promise<void>;
  remove(id: string): Promise<void>;
}

function toSqlValue(value: string | number | null | undefined) {
  if (value == null) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

class SQLiteBookRepository implements BookRepository {
  async list() {
    const db = await getDatabase();

    return db.getAllAsync<Book>(
      `
        SELECT
          id,
          title,
          author,
          isbn,
          shelfLocation,
          imageUri,
          ocrText,
          price,
          borrowedTo,
          notes,
          status,
          createdAt,
          updatedAt
        FROM books
        ORDER BY datetime(updatedAt) DESC, rowid DESC
      `
    );
  }

  async save(book: Book) {
    const db = await getDatabase();
    const normalizedBook: Book = {
      ...book,
      title: normalizeStoredText(book.title) ?? "",
      author: normalizeStoredText(book.author) ?? "",
      isbn: normalizeStoredText(book.isbn),
      shelfLocation: normalizeStoredText(book.shelfLocation),
      imageUri: normalizeStoredText(book.imageUri),
      ocrText: normalizeStoredText(book.ocrText) ?? "",
      borrowedTo: normalizeStoredText(book.borrowedTo),
      notes: normalizeStoredText(book.notes)
    };

    await db.execAsync(`
      INSERT INTO books (
        id, title, author, isbn, shelfLocation, imageUri, ocrText,
        price, borrowedTo, notes, status, createdAt, updatedAt
      )
      VALUES (
        ${toSqlValue(normalizedBook.id)},
        ${toSqlValue(normalizedBook.title)},
        ${toSqlValue(normalizedBook.author)},
        ${toSqlValue(normalizedBook.isbn)},
        ${toSqlValue(normalizedBook.shelfLocation)},
        ${toSqlValue(normalizedBook.imageUri)},
        ${toSqlValue(normalizedBook.ocrText)},
        ${toSqlValue(normalizedBook.price ?? null)},
        ${toSqlValue(normalizedBook.borrowedTo)},
        ${toSqlValue(normalizedBook.notes)},
        ${toSqlValue(normalizedBook.status)},
        ${toSqlValue(normalizedBook.createdAt)},
        ${toSqlValue(normalizedBook.updatedAt)}
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        author = excluded.author,
        isbn = excluded.isbn,
        shelfLocation = excluded.shelfLocation,
        imageUri = excluded.imageUri,
        ocrText = excluded.ocrText,
        price = excluded.price,
        borrowedTo = excluded.borrowedTo,
        notes = excluded.notes,
        status = excluded.status,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt;
    `);
  }

  async remove(id: string) {
    const db = await getDatabase();
    await db.execAsync(`DELETE FROM books WHERE id = ${toSqlValue(id)};`);
  }
}

export const bookRepository: BookRepository = new SQLiteBookRepository();
