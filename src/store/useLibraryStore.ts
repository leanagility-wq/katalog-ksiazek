import { create } from "zustand";

import { bookRepository } from "@/storage/bookRepository";
import { Book } from "@/types/book";

interface LibraryState {
  books: Book[];
  isLoading: boolean;
  loadBooks: () => Promise<void>;
  saveBook: (book: Book) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  books: [],
  isLoading: false,
  loadBooks: async () => {
    set({ isLoading: true });
    const books = await bookRepository.list();
    set({ books, isLoading: false });
  },
  saveBook: async (book) => {
    await bookRepository.save(book);
    const books = await bookRepository.list();
    set({ books });
  }
}));
