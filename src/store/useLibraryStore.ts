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
  applyBatchUpdate: (
    ids: string[],
    changes: Partial<Pick<Book, "status" | "shelfLocation">>
  ) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

function toLibraryError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

export const useLibraryStore = create<LibraryState>((set) => ({
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
      const existingBooks = await bookRepository.list();
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

        await bookRepository.save({
          ...book,
          id: targetBook.id,
          createdAt: targetBook.createdAt
        });

        if (currentBook && currentBook.id !== targetBook.id) {
          await bookRepository.remove(currentBook.id);
        }
      } else {
        await bookRepository.save(book);
      }
      const books = await bookRepository.list();
      set({ books, errorMessage: null });
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
  applyBatchUpdate: async (ids, changes) => {
    try {
      await bookRepository.updateMany(ids, changes);
      const books = await bookRepository.list();
      set({ books, errorMessage: null });
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
      const books = await bookRepository.list();
      set({ books, errorMessage: null });
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
