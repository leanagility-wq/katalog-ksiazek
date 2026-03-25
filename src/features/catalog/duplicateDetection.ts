import { Book } from "@/types/book";

export type DuplicateReason = "title";

export interface DuplicateMatch {
  book: Book;
  reason: DuplicateReason;
}

export type DuplicateSaveResolution =
  | {
      mode: "overwrite";
      targetBookId: string;
    }
  | {
      mode: "save_as_copy";
    };

export class DuplicateConflictError extends Error {
  matches: DuplicateMatch[];

  constructor(matches: DuplicateMatch[]) {
    super(getDuplicateErrorMessage(matches));
    this.name = "DuplicateConflictError";
    this.matches = matches;
  }
}

export function normalizeTitleForDuplicate(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildTitleDuplicateMatches(books: Book[]): DuplicateMatch[] {
  return books.map((book) => ({
    book,
    reason: "title" as const
  }));
}

export function findDuplicateMatches(
  candidate: Book,
  books: Book[],
  excludeId?: string
) {
  const normalizedTitle = normalizeTitleForDuplicate(candidate.title);

  if (!normalizedTitle) {
    return [];
  }

  return buildTitleDuplicateMatches(
    books.filter(
      (book) =>
        book.id !== excludeId &&
        normalizeTitleForDuplicate(book.title) === normalizedTitle
    )
  );
}

export function collectDuplicateBookIds(books: Book[]) {
  const groupedBooks = new Map<string, string[]>();

  books.forEach((book) => {
    const normalizedTitle = normalizeTitleForDuplicate(book.title);

    if (!normalizedTitle) {
      return;
    }

    const ids = groupedBooks.get(normalizedTitle) ?? [];
    ids.push(book.id);
    groupedBooks.set(normalizedTitle, ids);
  });

  const duplicateIds = new Set<string>();

  groupedBooks.forEach((ids) => {
    if (ids.length < 2) {
      return;
    }

    ids.forEach((id) => duplicateIds.add(id));
  });

  return duplicateIds;
}

export function getDuplicateErrorMessage(matches: DuplicateMatch[]) {
  if (!matches.length) {
    return "Wykryto duplikat książki.";
  }

  return matches.length === 1
    ? "W katalogu jest już książka o tym samym tytule."
    : "W katalogu są już książki o tym samym tytule.";
}

export function getDuplicateReasonLabel(reason: DuplicateReason) {
  switch (reason) {
    case "title":
      return "Ten sam tytuł";
    default:
      return "Duplikat";
  }
}
