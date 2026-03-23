import { create } from "zustand";

import {
  findDuplicateMatches,
  getDuplicateErrorMessage
} from "@/features/catalog/duplicateDetection";
import { bookRepository } from "@/storage/bookRepository";
import { Book } from "@/types/book";

interface LibraryState {
  books: Book[];
  isLoading: boolean;
  errorMessage: string | null;
  loadBooks: () => Promise<void>;
  saveBook: (book: Book) => Promise<void>;
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
  saveBook: async (book) => {
    try {
      const existingBooks = await bookRepository.list();
      const duplicateMatches = findDuplicateMatches(book, existingBooks, book.id);

      if (duplicateMatches.length) {
        throw new Error(getDuplicateErrorMessage(duplicateMatches));
      }

      await bookRepository.save(book);
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
