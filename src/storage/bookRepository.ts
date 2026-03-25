import { Book } from "@/types/book";
import { normalizeTitleForDuplicate } from "@/features/catalog/duplicateDetection";
import { SortKey } from "@/config/bookUi";
import { getDatabase } from "@/storage/database";
import { normalizeStoredText } from "@/utils/text";
import { toSqlValue } from "@/utils/sql";

export interface CatalogFilterQuery {
  query?: string;
  genre?: string;
  location?: string;
  quickFilter?: "no_location" | "no_isbn" | "no_genre" | null;
  sortKey: SortKey;
  offset: number;
  limit: number;
}

export interface BookRepository {
  list(): Promise<Book[]>;
  listPage(offset: number, limit: number): Promise<Book[]>;
  count(): Promise<number>;
  getStats(): Promise<{
    totalBooks: number;
    withoutLocationCount: number;
    withoutIsbnCount: number;
    withoutGenreCount: number;
  }>;
  getFilterOptions(): Promise<{
    locations: string[];
    genres: string[];
  }>;
  listFilteredPage(query: CatalogFilterQuery): Promise<Book[]>;
  countFiltered(query: Omit<CatalogFilterQuery, "offset" | "limit">): Promise<number>;
  findByNormalizedTitle(title: string, excludeId?: string): Promise<Book[]>;
  updateQuickFields(
    id: string,
    changes: Partial<Pick<Book, "status" | "shelfLocation" | "genre">>
  ): Promise<void>;
  save(book: Book): Promise<void>;
  saveMany(books: Book[]): Promise<void>;
  updateMany(
    ids: string[],
    changes: Partial<Pick<Book, "status" | "shelfLocation">>
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

class SQLiteBookRepository implements BookRepository {
  private buildCatalogWhereClause(query: Omit<CatalogFilterQuery, "offset" | "limit" | "sortKey">) {
    const clauses = ["1 = 1"];

    if (query.genre?.trim()) {
      clauses.push(`genre = ${toSqlValue(query.genre.trim())}`);
    }

    if (query.location?.trim()) {
      clauses.push(`shelfLocation = ${toSqlValue(query.location.trim())}`);
    }

    switch (query.quickFilter) {
      case "no_location":
        clauses.push(`(shelfLocation IS NULL OR TRIM(shelfLocation) = '')`);
        break;
      case "no_isbn":
        clauses.push(`(isbn IS NULL OR TRIM(isbn) = '')`);
        break;
      case "no_genre":
        clauses.push(`(genre IS NULL OR TRIM(genre) = '')`);
        break;
      default:
        break;
    }

    const normalizedQuery = query.query?.trim().toLowerCase();

    if (normalizedQuery) {
      const likeValue = `%${normalizedQuery}%`;
      clauses.push(`
        LOWER(
          COALESCE(title, '') || ' ' ||
          COALESCE(author, '') || ' ' ||
          COALESCE(genre, '') || ' ' ||
          COALESCE(isbn, '') || ' ' ||
          COALESCE(shelfLocation, '') || ' ' ||
          COALESCE(notes, '')
        ) LIKE ${toSqlValue(likeValue)}
      `);
    }

    return clauses.join("\n        AND ");
  }

  private buildCatalogOrderBy(sortKey: SortKey) {
    switch (sortKey) {
      case "title_asc":
        return "ORDER BY title COLLATE NOCASE ASC, author COLLATE NOCASE ASC, rowid DESC";
      case "author_asc":
        return "ORDER BY author COLLATE NOCASE ASC, title COLLATE NOCASE ASC, rowid DESC";
      case "status_asc":
        return "ORDER BY status COLLATE NOCASE ASC, title COLLATE NOCASE ASC, rowid DESC";
      case "updated_desc":
      default:
        return "ORDER BY updatedAt DESC, rowid DESC";
    }
  }

  private sortUniqueValues(values: Array<string | null | undefined>) {
    return Array.from(
      new Set(
        values
          .map((value) => normalizeStoredText(value) ?? "")
          .map((value) => value.trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right, "pl"));
  }

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
        id, title, normalizedTitle, author, genre, isbn, remoteLookupStatus, shelfLocation, imageUri, ocrText,
        price, borrowedTo, notes, status, createdAt, updatedAt
      )
      VALUES (
        ${toSqlValue(book.id)},
        ${toSqlValue(book.title)},
        ${toSqlValue(normalizeTitleForDuplicate(book.title))},
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
        normalizedTitle = excluded.normalizedTitle,
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

  private readonly baseSelect = `
    SELECT
      id,
      title,
      normalizedTitle,
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
  `;

  private readonly baseOrderBy = `
    ORDER BY updatedAt DESC, rowid DESC
  `;

  async list() {
    const db = await getDatabase();

    return db.getAllAsync<Book>(
      `
        ${this.baseSelect}
        ${this.baseOrderBy}
      `
    );
  }

  async listPage(offset: number, limit: number) {
    const db = await getDatabase();

    return db.getAllAsync<Book>(
      `
        ${this.baseSelect}
        ${this.baseOrderBy}
        LIMIT ${toSqlValue(limit)}
        OFFSET ${toSqlValue(offset)}
      `
    );
  }

  async count() {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM books"
    );

    return result?.count ?? 0;
  }

  async getStats() {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{
      totalBooks: number;
      withoutLocationCount: number;
      withoutIsbnCount: number;
      withoutGenreCount: number;
    }>(`
      SELECT
        COUNT(*) as totalBooks,
        SUM(CASE WHEN shelfLocation IS NULL OR TRIM(shelfLocation) = '' THEN 1 ELSE 0 END) as withoutLocationCount,
        SUM(CASE WHEN isbn IS NULL OR TRIM(isbn) = '' THEN 1 ELSE 0 END) as withoutIsbnCount,
        SUM(CASE WHEN genre IS NULL OR TRIM(genre) = '' THEN 1 ELSE 0 END) as withoutGenreCount
      FROM books
    `);

    return {
      totalBooks: result?.totalBooks ?? 0,
      withoutLocationCount: result?.withoutLocationCount ?? 0,
      withoutIsbnCount: result?.withoutIsbnCount ?? 0,
      withoutGenreCount: result?.withoutGenreCount ?? 0
    };
  }

  async getFilterOptions() {
    const db = await getDatabase();
    const [locations, genres] = await Promise.all([
      db.getAllAsync<{ value: string | null }>(`
        SELECT DISTINCT shelfLocation as value
        FROM books
        WHERE shelfLocation IS NOT NULL AND TRIM(shelfLocation) <> ''
      `),
      db.getAllAsync<{ value: string | null }>(`
        SELECT DISTINCT genre as value
        FROM books
        WHERE genre IS NOT NULL AND TRIM(genre) <> ''
      `)
    ]);

    return {
      locations: this.sortUniqueValues(locations.map((entry) => entry.value)),
      genres: this.sortUniqueValues(genres.map((entry) => entry.value))
    };
  }

  async listFilteredPage(query: CatalogFilterQuery) {
    const db = await getDatabase();
    const whereClause = this.buildCatalogWhereClause(query);
    const orderBy = this.buildCatalogOrderBy(query.sortKey);

    return db.getAllAsync<Book>(`
      ${this.baseSelect}
      WHERE ${whereClause}
      ${orderBy}
      LIMIT ${toSqlValue(query.limit)}
      OFFSET ${toSqlValue(query.offset)}
    `);
  }

  async countFiltered(query: Omit<CatalogFilterQuery, "offset" | "limit">) {
    const db = await getDatabase();
    const whereClause = this.buildCatalogWhereClause(query);
    const result = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM books
      WHERE ${whereClause}
    `);

    return result?.count ?? 0;
  }

  async findByNormalizedTitle(title: string, excludeId?: string) {
    const db = await getDatabase();
    const normalizedTitle = normalizeTitleForDuplicate(title);

    if (!normalizedTitle) {
      return [];
    }

    const excludeClause = excludeId
      ? `AND id <> ${toSqlValue(excludeId)}`
      : "";

    return db.getAllAsync<Book>(`
      ${this.baseSelect}
      WHERE normalizedTitle = ${toSqlValue(normalizedTitle)}
      ${excludeClause}
      ${this.baseOrderBy}
    `);
  }

  async updateQuickFields(
    id: string,
    changes: Partial<Pick<Book, "status" | "shelfLocation" | "genre">>
  ) {
    const db = await getDatabase();
    const updates: string[] = [];

    if (Object.prototype.hasOwnProperty.call(changes, "status")) {
      updates.push(`status = ${toSqlValue(changes.status ?? null)}`);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "shelfLocation")) {
      const normalizedShelfLocation = normalizeStoredText(changes.shelfLocation);
      updates.push(`shelfLocation = ${toSqlValue(normalizedShelfLocation)}`);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "genre")) {
      const normalizedGenre = normalizeStoredText(changes.genre);
      updates.push(`genre = ${toSqlValue(normalizedGenre)}`);
    }

    if (!updates.length) {
      return;
    }

    await db.execAsync(`
      UPDATE books
      SET ${updates.join(", ")}
      WHERE id = ${toSqlValue(id)};
    `);
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
