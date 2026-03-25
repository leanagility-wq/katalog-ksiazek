import { create } from "zustand";

import {
  DuplicateConflictError,
  DuplicateSaveResolution,
  buildTitleDuplicateMatches,
  normalizeTitleForDuplicate
} from "@/features/catalog/duplicateDetection";
import { bookRepository } from "@/storage/bookRepository";
import { Book } from "@/types/book";

const LIBRARY_PAGE_SIZE = 80;

interface LibraryState {
  books: Book[];
  totalBooks: number;
  hasMoreBooks: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  loadBooks: () => Promise<void>;
  loadMoreBooks: () => Promise<void>;
  loadAllBooks: () => Promise<void>;
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
  totalBooks: 0,
  hasMoreBooks: false,
  isLoading: false,
  isLoadingMore: false,
  errorMessage: null,
  loadBooks: async () => {
    set({ isLoading: true, errorMessage: null });

    try {
      const [totalBooks, books] = await Promise.all([
        bookRepository.count(),
        bookRepository.listPage(0, LIBRARY_PAGE_SIZE)
      ]);

      set({
        books,
        totalBooks,
        hasMoreBooks: books.length < totalBooks,
        isLoading: false,
        isLoadingMore: false,
        errorMessage: null
      });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się załadować katalogu."
      );

      set({
        isLoading: false,
        isLoadingMore: false,
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  },
  loadMoreBooks: async () => {
    const { hasMoreBooks, isLoadingMore, isLoading, books, totalBooks } = get();

    if (!hasMoreBooks || isLoadingMore || isLoading) {
      return;
    }

    set({ isLoadingMore: true, errorMessage: null });

    try {
      const nextPage = await bookRepository.listPage(books.length, LIBRARY_PAGE_SIZE);
      const nextBooks = upsertBooksInCollection(books, nextPage);

      set({
        books: nextBooks,
        hasMoreBooks: nextBooks.length < totalBooks,
        isLoadingMore: false,
        errorMessage: null
      });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się dociągnąć kolejnych książek."
      );

      set({
        isLoadingMore: false,
        errorMessage: resolvedError.message
      });

      throw resolvedError;
    }
  },
  loadAllBooks: async () => {
    while (get().hasMoreBooks && !get().isLoadingMore && !get().isLoading) {
      await get().loadMoreBooks();
    }

    while (get().hasMoreBooks && !get().isLoading) {
      await get().loadMoreBooks();
    }
  },
  saveBook: async (book, resolution) => {
    try {
      const loadedBooks = get().books;
      const currentBook = loadedBooks.find((item) => item.id === book.id);
      const shouldCheckDuplicates =
        !currentBook ||
        normalizeTitleForDuplicate(currentBook.title) !==
          normalizeTitleForDuplicate(book.title);
      const duplicateBooks = shouldCheckDuplicates
        ? await bookRepository.findByNormalizedTitle(book.title, book.id)
        : [];
      const duplicateMatches = buildTitleDuplicateMatches(duplicateBooks);

      if (duplicateMatches.length && !resolution) {
        throw new DuplicateConflictError(duplicateMatches);
      }

      if (resolution?.mode === "overwrite") {
        const targetBook = duplicateBooks.find(
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

        const nextLoadedBooks = loadedBooks.filter(
          (item) => item.id !== targetBook.id && item.id !== currentBook?.id
        );
        const nextBooks = upsertBookInCollection(nextLoadedBooks, overwrittenBook);

        set({
          books: nextBooks,
          hasMoreBooks: nextBooks.length < get().totalBooks,
          errorMessage: null
        });
      } else {
        await bookRepository.save(book);
        const nextBooks = upsertBookInCollection(loadedBooks, book);
        const nextTotalBooks = currentBook ? get().totalBooks : get().totalBooks + 1;
        set({
          books: nextBooks,
          totalBooks: nextTotalBooks,
          hasMoreBooks: nextBooks.length < nextTotalBooks,
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
      const nextBooks = upsertBooksInCollection(get().books, booksToSave);
      const nextTotalBooks = await bookRepository.count();

      set({
        books: nextBooks,
        totalBooks: nextTotalBooks,
        hasMoreBooks: nextBooks.length < nextTotalBooks,
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

      set({
        books: nextBooks,
        hasMoreBooks: nextBooks.length < get().totalBooks,
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
  deleteBook: async (id) => {
    try {
      await bookRepository.remove(id);
      const nextBooks = get().books.filter((book) => book.id !== id);
      const nextTotalBooks = Math.max(0, get().totalBooks - 1);
      set({
        books: nextBooks,
        totalBooks: nextTotalBooks,
        hasMoreBooks: nextBooks.length < nextTotalBooks,
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
