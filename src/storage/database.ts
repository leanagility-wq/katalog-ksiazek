import { SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

import { mockBooks } from "@/data/mockBooks";

const DATABASE_NAME = "library.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function createSchema(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
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
}

async function seedDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM books"
  );

  if ((result?.count ?? 0) > 0) {
    return;
  }

  for (const book of mockBooks) {
    await db.runAsync(
      `
        INSERT INTO books (
          id, title, author, isbn, shelfLocation, imageUri, ocrText,
          price, borrowedTo, notes, status, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        book.id,
        book.title,
        book.author,
        book.isbn ?? null,
        book.shelfLocation ?? null,
        book.imageUri ?? null,
        book.ocrText,
        book.price ?? null,
        book.borrowedTo ?? null,
        book.notes ?? null,
        book.status,
        book.createdAt,
        book.updatedAt
      ]
    );
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
