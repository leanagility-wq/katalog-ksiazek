import { SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

import { mockBooks } from "@/data/mockBooks";

const DATABASE_NAME = "library.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

function toSqlValue(value: string | number | null | undefined) {
  if (value == null) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

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
    await db.execAsync(`
      INSERT INTO books (
        id, title, author, isbn, shelfLocation, imageUri, ocrText,
        price, borrowedTo, notes, status, createdAt, updatedAt
      )
      VALUES (
        ${toSqlValue(book.id)},
        ${toSqlValue(book.title)},
        ${toSqlValue(book.author)},
        ${toSqlValue(book.isbn)},
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
