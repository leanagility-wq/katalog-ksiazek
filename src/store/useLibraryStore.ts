import { create } from "zustand";

import { bookRepository } from "@/storage/bookRepository";
import { Book } from "@/types/book";

interface LibraryState {
  books: Book[];
  isLoading: boolean;
  errorMessage: string | null;
  loadBooks: () => Promise<void>;
  saveBook: (book: Book) => Promise<void>;
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
      set({
        isLoading: false,
          errorMessage:
          error instanceof Error ? error.message : "Nie udało się załadować katalogu."
      });
    }
  },
  saveBook: async (book) => {
    try {
      await bookRepository.save(book);
      const books = await bookRepository.list();
      set({ books, errorMessage: null });
    } catch (error) {
      set({
        errorMessage:
          error instanceof Error ? error.message : "Nie udało się zapisać książki."
      });
    }
  }
}));
