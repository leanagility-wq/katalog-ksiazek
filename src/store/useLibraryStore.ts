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
  withoutLocationCount: number;
  withoutIsbnCount: number;
  withoutGenreCount: number;
  catalogLocations: string[];
  catalogGenres: string[];
  hasMoreBooks: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  loadBooks: () => Promise<void>;
  loadMoreBooks: () => Promise<void>;
  loadAllBooks: () => Promise<void>;
  saveBook: (book: Book, resolution?: DuplicateSaveResolution) => Promise<void>;
  quickUpdateBook: (
    id: string,
    changes: Partial<Pick<Book, "status" | "shelfLocation" | "genre">>
  ) => Promise<void>;
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

function sortUniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim() ?? "").filter(Boolean))).sort(
    (left, right) => left.localeCompare(right, "pl")
  );
}

function hasValue(value?: string) {
  return Boolean(value?.trim());
}

function applyStatsDelta(
  current: Pick<
    LibraryState,
    "withoutLocationCount" | "withoutIsbnCount" | "withoutGenreCount"
  >,
  previousBook: Book,
  nextBook: Book
) {
  return {
    withoutLocationCount:
      current.withoutLocationCount +
      Number(!hasValue(nextBook.shelfLocation)) -
      Number(!hasValue(previousBook.shelfLocation)),
    withoutIsbnCount:
      current.withoutIsbnCount +
      Number(!hasValue(nextBook.isbn)) -
      Number(!hasValue(previousBook.isbn)),
    withoutGenreCount:
      current.withoutGenreCount +
      Number(!hasValue(nextBook.genre)) -
      Number(!hasValue(previousBook.genre))
  };
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  totalBooks: 0,
  withoutLocationCount: 0,
  withoutIsbnCount: 0,
  withoutGenreCount: 0,
  catalogLocations: [],
  catalogGenres: [],
  hasMoreBooks: false,
  isLoading: false,
  isLoadingMore: false,
  errorMessage: null,
  loadBooks: async () => {
    set({ isLoading: true, errorMessage: null });

    try {
      const [stats, filterOptions, books] = await Promise.all([
        bookRepository.getStats(),
        bookRepository.getFilterOptions(),
        bookRepository.listPage(0, LIBRARY_PAGE_SIZE)
      ]);

      set({
        books,
        totalBooks: stats.totalBooks,
        withoutLocationCount: stats.withoutLocationCount,
        withoutIsbnCount: stats.withoutIsbnCount,
        withoutGenreCount: stats.withoutGenreCount,
        catalogLocations: filterOptions.locations,
        catalogGenres: filterOptions.genres,
        hasMoreBooks: books.length < stats.totalBooks,
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
        const [nextStats, nextFilterOptions] = await Promise.all([
          bookRepository.getStats(),
          bookRepository.getFilterOptions()
        ]);

        set({
          books: nextBooks,
          totalBooks: nextStats.totalBooks,
          withoutLocationCount: nextStats.withoutLocationCount,
          withoutIsbnCount: nextStats.withoutIsbnCount,
          withoutGenreCount: nextStats.withoutGenreCount,
          catalogLocations: nextFilterOptions.locations,
          catalogGenres: nextFilterOptions.genres,
          hasMoreBooks: nextBooks.length < nextStats.totalBooks,
          errorMessage: null
        });
      } else {
        await bookRepository.save(book);
        const nextBooks = upsertBookInCollection(loadedBooks, book);
        const [nextStats, nextFilterOptions] = await Promise.all([
          bookRepository.getStats(),
          bookRepository.getFilterOptions()
        ]);
        set({
          books: nextBooks,
          totalBooks: nextStats.totalBooks,
          withoutLocationCount: nextStats.withoutLocationCount,
          withoutIsbnCount: nextStats.withoutIsbnCount,
          withoutGenreCount: nextStats.withoutGenreCount,
          catalogLocations: nextFilterOptions.locations,
          catalogGenres: nextFilterOptions.genres,
          hasMoreBooks: nextBooks.length < nextStats.totalBooks,
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
  quickUpdateBook: async (id, changes) => {
    try {
      const currentState = get();
      const previousBook = currentState.books.find((item) => item.id === id);

      if (!previousBook) {
        return;
      }

      const nextBook: Book = {
        ...previousBook,
        ...changes
      };

      await bookRepository.updateQuickFields(id, changes);

      const nextBooks = upsertBookInCollection(currentState.books, nextBook);
      const nextStats = applyStatsDelta(currentState, previousBook, nextBook);
      const nextCatalogLocations = sortUniqueValues([
        ...currentState.catalogLocations,
        ...nextBooks.map((book) => book.shelfLocation)
      ]);
      const nextCatalogGenres = sortUniqueValues([
        ...currentState.catalogGenres,
        ...nextBooks.map((book) => book.genre)
      ]);

      set({
        books: nextBooks,
        withoutLocationCount: nextStats.withoutLocationCount,
        withoutIsbnCount: nextStats.withoutIsbnCount,
        withoutGenreCount: nextStats.withoutGenreCount,
        catalogLocations: nextCatalogLocations,
        catalogGenres: nextCatalogGenres,
        errorMessage: null
      });
    } catch (error) {
      const resolvedError = toLibraryError(
        error,
        "Nie udało się zapisać szybkiej zmiany."
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
      const [nextStats, nextFilterOptions] = await Promise.all([
        bookRepository.getStats(),
        bookRepository.getFilterOptions()
      ]);

      set({
        books: nextBooks,
        totalBooks: nextStats.totalBooks,
        withoutLocationCount: nextStats.withoutLocationCount,
        withoutIsbnCount: nextStats.withoutIsbnCount,
        withoutGenreCount: nextStats.withoutGenreCount,
        catalogLocations: nextFilterOptions.locations,
        catalogGenres: nextFilterOptions.genres,
        hasMoreBooks: nextBooks.length < nextStats.totalBooks,
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
      const [nextStats, nextFilterOptions] = await Promise.all([
        bookRepository.getStats(),
        bookRepository.getFilterOptions()
      ]);

      set({
        books: nextBooks,
        totalBooks: nextStats.totalBooks,
        withoutLocationCount: nextStats.withoutLocationCount,
        withoutIsbnCount: nextStats.withoutIsbnCount,
        withoutGenreCount: nextStats.withoutGenreCount,
        catalogLocations: nextFilterOptions.locations,
        catalogGenres: nextFilterOptions.genres,
        hasMoreBooks: nextBooks.length < nextStats.totalBooks,
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
      const [nextStats, nextFilterOptions] = await Promise.all([
        bookRepository.getStats(),
        bookRepository.getFilterOptions()
      ]);
      set({
        books: nextBooks,
        totalBooks: nextStats.totalBooks,
        withoutLocationCount: nextStats.withoutLocationCount,
        withoutIsbnCount: nextStats.withoutIsbnCount,
        withoutGenreCount: nextStats.withoutGenreCount,
        catalogLocations: nextFilterOptions.locations,
        catalogGenres: nextFilterOptions.genres,
        hasMoreBooks: nextBooks.length < nextStats.totalBooks,
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
