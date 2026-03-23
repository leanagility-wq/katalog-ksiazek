import { Book } from "@/types/book";

export type DuplicateReason = "isbn" | "title_author";

export interface DuplicateMatch {
  book: Book;
  reason: DuplicateReason;
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

  for (let index = 0; index < books.length; index += 1) {
    const currentBook = books[index];

    for (let compareIndex = index + 1; compareIndex < books.length; compareIndex += 1) {
      const comparedBook = books[compareIndex];
      const reason = getDuplicateReason(currentBook, comparedBook);

      if (!reason) {
        continue;
      }

      duplicateIds.add(currentBook.id);
      duplicateIds.add(comparedBook.id);
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
