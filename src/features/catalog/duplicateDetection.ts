import { Book } from "@/types/book";

export type DuplicateReason = "isbn" | "title_author";
export type DuplicateSaveMode = "overwrite" | "save_as_copy";

export interface DuplicateMatch {
  book: Book;
  reason: DuplicateReason;
}

export interface DuplicateSaveResolution {
  mode: DuplicateSaveMode;
  targetBookId?: string;
}

export class DuplicateConflictError extends Error {
  matches: DuplicateMatch[];

  constructor(matches: DuplicateMatch[]) {
    super(getDuplicateErrorMessage(matches));
    this.name = "DuplicateConflictError";
    Object.setPrototypeOf(this, DuplicateConflictError.prototype);
    this.matches = matches;
  }
}

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeIsbn(value?: string) {
  return (value ?? "").toUpperCase().replace(/[^0-9X]/g, "");
}

function isSameTitleAndAuthor(left: Book, right: Book) {
  const leftTitle = normalizeText(left.title);
  const rightTitle = normalizeText(right.title);
  const leftAuthor = normalizeText(left.author);
  const rightAuthor = normalizeText(right.author);

  if (!leftTitle || !rightTitle || !leftAuthor || !rightAuthor) {
    return false;
  }

  return leftTitle === rightTitle && leftAuthor === rightAuthor;
}

function getDuplicateReason(left: Book, right: Book): DuplicateReason | null {
  const leftIsbn = normalizeIsbn(left.isbn);
  const rightIsbn = normalizeIsbn(right.isbn);

  if (leftIsbn && rightIsbn && leftIsbn === rightIsbn) {
    return "isbn";
  }

  if (isSameTitleAndAuthor(left, right)) {
    return "title_author";
  }

  return null;
}

export function findDuplicateMatches(
  candidate: Book,
  books: Book[],
  excludeId?: string
) {
  return books.reduce<DuplicateMatch[]>((matches, book) => {
    if (book.id === excludeId) {
      return matches;
    }

    const reason = getDuplicateReason(candidate, book);

    if (!reason) {
      return matches;
    }

    matches.push({ book, reason });
    return matches;
  }, []);
}

export function collectDuplicateBookIds(books: Book[]) {
  const duplicateIds = new Set<string>();
  const booksByIsbn = new Map<string, Book[]>();
  const booksByTitleAuthor = new Map<string, Book[]>();

  for (const book of books) {
    const normalizedIsbn = normalizeIsbn(book.isbn);

    if (normalizedIsbn) {
      const isbnGroup = booksByIsbn.get(normalizedIsbn) ?? [];
      isbnGroup.push(book);
      booksByIsbn.set(normalizedIsbn, isbnGroup);
    }

    const normalizedTitle = normalizeText(book.title);
    const normalizedAuthor = normalizeText(book.author);

    if (normalizedTitle && normalizedAuthor) {
      const titleAuthorKey = `${normalizedTitle}|${normalizedAuthor}`;
      const titleAuthorGroup = booksByTitleAuthor.get(titleAuthorKey) ?? [];
      titleAuthorGroup.push(book);
      booksByTitleAuthor.set(titleAuthorKey, titleAuthorGroup);
    }
  }

  for (const group of booksByIsbn.values()) {
    if (group.length < 2) {
      continue;
    }

    for (const book of group) {
      duplicateIds.add(book.id);
    }
  }

  for (const group of booksByTitleAuthor.values()) {
    if (group.length < 2) {
      continue;
    }

    for (const book of group) {
      duplicateIds.add(book.id);
    }
  }

  return duplicateIds;
}

export function getDuplicateErrorMessage(matches: DuplicateMatch[]) {
  const [firstMatch] = matches;

  if (!firstMatch) {
    return "Wykryto możliwy duplikat książki.";
  }

  const reasonLabel =
    firstMatch.reason === "isbn" ? "ten sam ISBN" : "ten sam tytuł i autora";

  return `Wykryto możliwy duplikat. W katalogu jest już podobny wpis: "${firstMatch.book.title}" (${reasonLabel}).`;
}

export function getDuplicateReasonLabel(reason: DuplicateReason) {
  return reason === "isbn" ? "Ten sam ISBN" : "Ten sam tytuł i autor";
}
