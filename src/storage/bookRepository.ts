import { Book } from "@/types/book";
import { getDatabase } from "@/storage/database";
import { normalizeStoredText } from "@/utils/text";
import { toSqlValue } from "@/utils/sql";

export interface BookRepository {
  list(): Promise<Book[]>;
  save(book: Book): Promise<void>;
  saveMany(books: Book[]): Promise<void>;
  updateMany(
    ids: string[],
    changes: Partial<Pick<Book, "status" | "shelfLocation">>
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

class SQLiteBookRepository implements BookRepository {
  private normalizeBook(book: Book): Book {
    return {
      ...book,
      title: normalizeStoredText(book.title) ?? "",
      author: normalizeStoredText(book.author) ?? "",
      genre: normalizeStoredText(book.genre),
      isbn: normalizeStoredText(book.isbn),
      remoteLookupStatus: book.remoteLookupStatus,
      shelfLocation: normalizeStoredText(book.shelfLocation),
      imageUri: normalizeStoredText(book.imageUri),
      ocrText: normalizeStoredText(book.ocrText) ?? "",
      borrowedTo: normalizeStoredText(book.borrowedTo),
      notes: normalizeStoredText(book.notes)
    };
  }

  private buildSaveStatement(book: Book) {
    return `
      INSERT INTO books (
        id, title, author, genre, isbn, remoteLookupStatus, shelfLocation, imageUri, ocrText,
        price, borrowedTo, notes, status, createdAt, updatedAt
      )
      VALUES (
        ${toSqlValue(book.id)},
        ${toSqlValue(book.title)},
        ${toSqlValue(book.author)},
        ${toSqlValue(book.genre)},
        ${toSqlValue(book.isbn)},
        ${toSqlValue(book.remoteLookupStatus)},
        ${toSqlValue(book.shelfLocation)},
        ${toSqlValue(book.imageUri)},
        ${toSqlValue(book.ocrText)},
        ${toSqlValue(book.price ?? null)},
        ${toSqlValue(book.borrowedTo)},
        ${toSqlValue(book.notes)},
        ${toSqlValue(book.status)},
        ${toSqlValue(book.createdAt)},
        ${toSqlValue(book.updatedAt)}
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        author = excluded.author,
        genre = excluded.genre,
        isbn = excluded.isbn,
        remoteLookupStatus = excluded.remoteLookupStatus,
        shelfLocation = excluded.shelfLocation,
        imageUri = excluded.imageUri,
        ocrText = excluded.ocrText,
        price = excluded.price,
        borrowedTo = excluded.borrowedTo,
        notes = excluded.notes,
        status = excluded.status,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt;
    `;
  }

  async list() {
    const db = await getDatabase();

    return db.getAllAsync<Book>(
      `
        SELECT
          id,
          title,
          author,
          genre,
          isbn,
          remoteLookupStatus,
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
        ORDER BY updatedAt DESC, rowid DESC
      `
    );
  }

  async save(book: Book) {
    const db = await getDatabase();
    await db.execAsync(this.buildSaveStatement(this.normalizeBook(book)));
  }

  async saveMany(books: Book[]) {
    if (!books.length) {
      return;
    }

    const db = await getDatabase();
    const statements = books
      .map((book) => this.buildSaveStatement(this.normalizeBook(book)))
      .join("\n");

    await db.execAsync(`
      BEGIN TRANSACTION;
      ${statements}
      COMMIT;
    `);
  }

  async updateMany(
    ids: string[],
    changes: Partial<Pick<Book, "status" | "shelfLocation">>
  ) {
    if (!ids.length) {
      return;
    }

    const db = await getDatabase();
    const bookIds = ids.map((id) => toSqlValue(id)).join(", ");
    const updates: string[] = [];

    if (Object.prototype.hasOwnProperty.call(changes, "status")) {
      updates.push(`status = ${toSqlValue(changes.status ?? null)}`);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "shelfLocation")) {
      const normalizedShelfLocation = normalizeStoredText(changes.shelfLocation);
      updates.push(`shelfLocation = ${toSqlValue(normalizedShelfLocation)}`);
    }

    if (!updates.length) {
      return;
    }

    await db.execAsync(`
      UPDATE books
      SET ${updates.join(", ")}
      WHERE id IN (${bookIds});
    `);
  }

  async remove(id: string) {
    const db = await getDatabase();
    await db.execAsync(`DELETE FROM books WHERE id = ${toSqlValue(id)};`);
  }
}

export const bookRepository: BookRepository = new SQLiteBookRepository();
