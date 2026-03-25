import { create } from "zustand";

import {
  DuplicateConflictError,
  DuplicateSaveResolution,
  findDuplicateMatches
} from "@/features/catalog/duplicateDetection";
import { bookRepository } from "@/storage/bookRepository";
import { Book } from "@/types/book";

interface LibraryState {
  books: Book[];
  isLoading: boolean;
  errorMessage: string | null;
  loadBooks: () => Promise<void>;
  saveBook: (book: Book, resolution?: DuplicateSaveResolution) => Promise<void>;
  saveBooksBulk: (books: Book[]) => Promise<void>;
  applyBatchUpdate: (
    ids: string[],
    changes: Partial<Pick<Book, "status" | "shelfLocation">>
  ) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

function toLibraryError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

function sortBooksForDisplay(books: Book[]) {
  return [...books].sort((left, right) => {
    const updatedAtOrder = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedAtOrder !== 0) {
      return updatedAtOrder;
    }

    return right.id.localeCompare(left.id);
  });
}

function upsertBookInCollection(books: Book[], nextBook: Book) {
  const withoutExisting = books.filter((item) => item.id !== nextBook.id);
  return sortBooksForDisplay([...withoutExisting, nextBook]);
}

function upsertBooksInCollection(books: Book[], nextBooks: Book[]) {
  const nextBookMap = new Map(nextBooks.map((book) => [book.id, book]));
  const preservedBooks = books.filter((item) => !nextBookMap.has(item.id));
  return sortBooksForDisplay([...preservedBooks, ...nextBooks]);
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  isLoading: false,
  errorMessage: null,
  loadBooks: async () => {
    set({ isLoading: true, errorMessage: null });

    try {
      const books = await bookRepository.list();
      set({ books, isLoading: false });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się załadować katalogu."
      );

      set({
        isLoading: false,
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  },
  saveBook: async (book, resolution) => {
    try {
      const existingBooks = get().books;
      const duplicateMatches = findDuplicateMatches(book, existingBooks, book.id);
      const currentBook = existingBooks.find((item) => item.id === book.id);

      if (duplicateMatches.length && !resolution) {
        throw new DuplicateConflictError(duplicateMatches);
      }

      if (resolution?.mode === "overwrite") {
        const targetBook = existingBooks.find(
          (item) => item.id === resolution.targetBookId
        );

        if (!targetBook) {
          throw new Error("Nie udało się znaleźć wpisu do nadpisania.");
        }

        const overwrittenBook: Book = {
          ...book,
          id: targetBook.id,
          createdAt: targetBook.createdAt
        };

        await bookRepository.save(overwrittenBook);

        if (currentBook && currentBook.id !== targetBook.id) {
          await bookRepository.remove(currentBook.id);
        }

        const nextBooks = existingBooks.filter(
          (item) => item.id !== targetBook.id && item.id !== currentBook?.id
        );

        set({
          books: upsertBookInCollection(nextBooks, overwrittenBook),
          errorMessage: null
        });
      } else {
        await bookRepository.save(book);
        set({
          books: upsertBookInCollection(existingBooks, book),
          errorMessage: null
        });
      }
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się zapisać książki."
      );

      set({
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  },
  saveBooksBulk: async (booksToSave) => {
    try {
      await bookRepository.saveMany(booksToSave);
      set({
        books: upsertBooksInCollection(get().books, booksToSave),
        errorMessage: null
      });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się zapisać zmian zbiorczych."
      );

      set({
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  },
  applyBatchUpdate: async (ids, changes) => {
    try {
      await bookRepository.updateMany(ids, changes);
      const selectedIds = new Set(ids);
      const nextBooks = get().books.map((book) =>
        selectedIds.has(book.id)
          ? {
              ...book,
              ...changes
            }
          : book
      );

      set({ books: nextBooks, errorMessage: null });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się zapisać zmian zbiorczych."
      );

      set({
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  },
  deleteBook: async (id) => {
    try {
      await bookRepository.remove(id);
      set({
        books: get().books.filter((book) => book.id !== id),
        errorMessage: null
      });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się usunąć książki."
      );

      set({
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  }
}));
