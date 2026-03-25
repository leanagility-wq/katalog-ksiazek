import { SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

import { mockBooks } from "@/data/mockBooks";
import { toSqlValue } from "@/utils/sql";

const DATABASE_NAME = "library.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function createSchema(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      genre TEXT,
      isbn TEXT,
      remoteLookupStatus TEXT,
      shelfLocation TEXT,
      imageUri TEXT,
      ocrText TEXT NOT NULL,
      price REAL,
      borrowedTo TEXT,
      notes TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
    CREATE INDEX IF NOT EXISTS idx_books_title_author ON books(title, author);
    CREATE INDEX IF NOT EXISTS idx_books_shelf_location ON books(shelfLocation);
    CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
  `);

  const columns =
    (await db.getAllAsync<{ name: string }>("PRAGMA table_info(books);")) ?? [];

  if (!columns.some((column) => column.name === "genre")) {
    await db.execAsync("ALTER TABLE books ADD COLUMN genre TEXT;");
  }

  if (!columns.some((column) => column.name === "remoteLookupStatus")) {
    await db.execAsync("ALTER TABLE books ADD COLUMN remoteLookupStatus TEXT;");
  }
}

async function seedDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM books"
  );

  if ((result?.count ?? 0) > 0) {
    return;
  }

  for (const book of mockBooks) {
    await db.execAsync(`
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
      );
    `);
  }
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await createSchema(db);
      await seedDatabase(db);
      return db;
    })();
  }

  return databasePromise;
}
