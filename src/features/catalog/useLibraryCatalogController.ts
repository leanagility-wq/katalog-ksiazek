import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Alert, InteractionManager } from "react-native";

import { SortKey } from "@/config/bookUi";
import { appText } from "@/config/uiText";
import {
  RemoteLookupError,
  pickBestRemoteBookMatch,
  searchBooksOnline
} from "@/features/catalog/bookLookupService";
import { collectDuplicateBookIds } from "@/features/catalog/duplicateDetection";
import { normalizeGenreLabel } from "@/features/catalog/genreCatalog";
import { bookRepository } from "@/storage/bookRepository";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Book } from "@/types/book";

type QuickEditMode = "status" | "location" | "genre" | null;
export type QuickCatalogFilter = "no_location" | "no_isbn" | "no_genre" | null;

export const ALL_GENRES_FILTER = "__all__";
export const ALL_LOCATIONS_FILTER = "__all_locations__";

const ENRICHMENT_SAVE_CHUNK_SIZE = 10;
const ENRICHMENT_REQUEST_DELAY_MS = 250;
const FILTERED_PAGE_SIZE = 80;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useLibraryCatalogController() {
  const {
    books,
    totalBooks,
    withoutLocationCount,
    withoutIsbnCount,
    withoutGenreCount,
    catalogLocations,
    catalogGenres,
    hasMoreBooks,
    isLoading,
    isLoadingMore,
    errorMessage,
    loadMoreBooks,
    quickUpdateBook,
    saveBooksBulk,
    applyBatchUpdate,
    deleteBook
  } = useLibraryStore();
  const { savedLocations, savedGenres } = useSettingsStore();

  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>(ALL_GENRES_FILTER);
  const [locationFilter, setLocationFilter] = useState<string>(ALL_LOCATIONS_FILTER);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [quickEditBookId, setQuickEditBookId] = useState<string | null>(null);
  const [quickEditMode, setQuickEditMode] = useState<QuickEditMode>(null);
  const [updatingBookId, setUpdatingBookId] = useState<string | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [batchLocationDraft, setBatchLocationDraft] = useState("");
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchActionMessage, setBatchActionMessage] = useState<string | null>(null);
  const [isEnrichingMissingIsbn, setIsEnrichingMissingIsbn] = useState(false);
  const [forceRetryLookup, setForceRetryLookup] = useState(false);
  const [isbnEnrichmentMessage, setIsbnEnrichmentMessage] = useState<string | null>(
    null
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] =
    useState<QuickCatalogFilter>(null);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [filteredTotalBooks, setFilteredTotalBooks] = useState(0);
  const [isFilteredLoading, setIsFilteredLoading] = useState(false);
  const [isFilteredLoadingMore, setIsFilteredLoadingMore] = useState(false);
  const [filterQueryVersion, setFilterQueryVersion] = useState(0);

  const selectedBookIdsRef = useRef<string[]>([]);
  const searchDraftRef = useRef("");
  const [, startTransition] = useTransition();

  const isSelectionMode = selectedBookIds.length > 0;

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...savedLocations, ...catalogLocations]
            .map((value) => value.trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, "pl")),
    [catalogLocations, savedLocations]
  );

  const genreOptions = useMemo(
    () =>
      [
        ALL_GENRES_FILTER,
        ...Array.from(
          new Set(
            [...savedGenres, ...catalogGenres.map((genre) => normalizeGenreLabel(genre) ?? "")]
              .map((value) => value.trim())
              .filter(Boolean)
          )
        ).sort((left, right) => left.localeCompare(right, "pl"))
      ],
    [catalogGenres, savedGenres]
  );

  const quickGenreOptions = useMemo(
    () => genreOptions.filter((option) => option !== ALL_GENRES_FILTER),
    [genreOptions]
  );

  const locationFilterOptions = useMemo(
    () => [ALL_LOCATIONS_FILTER, ...locationOptions],
    [locationOptions]
  );

  const usesRepositoryFiltering =
    Boolean(query) ||
    genreFilter !== ALL_GENRES_FILTER ||
    locationFilter !== ALL_LOCATIONS_FILTER ||
    activeQuickFilter !== null ||
    sortKey !== "updated_desc";

  const visibleBooks = usesRepositoryFiltering ? filteredBooks : books;

  const selectedBook = useMemo(
    () => visibleBooks.find((book) => book.id === selectedBookId) ?? null,
    [selectedBookId, visibleBooks]
  );

  const duplicateBookIds = useMemo(
    () => collectDuplicateBookIds(visibleBooks),
    [visibleBooks]
  );

  const selectedBookIdSet = useMemo(() => new Set(selectedBookIds), [selectedBookIds]);

  const selectedBooks = useMemo(
    () => visibleBooks.filter((book) => selectedBookIdSet.has(book.id)),
    [selectedBookIdSet, visibleBooks]
  );

  const selectedBooksMissingLocation = useMemo(
    () => selectedBooks.filter((book) => !book.shelfLocation?.trim()),
    [selectedBooks]
  );

  const selectedBooksMissingRemoteData = useMemo(
    () =>
      selectedBooks.filter((book) => {
        if (forceRetryLookup) {
          return !book.isbn?.trim() || !book.genre?.trim();
        }

        return (
          (!book.isbn?.trim() || !book.genre?.trim()) &&
          book.remoteLookupStatus !== "not_found"
        );
      }),
    [forceRetryLookup, selectedBooks]
  );

  const isLookupSelectionContext = useMemo(
    () =>
      selectedBooks.length > 0 &&
      selectedBooks.some((book) => !book.isbn?.trim() || !book.genre?.trim()),
    [selectedBooks]
  );

  const isLookupFilterContext = useMemo(
    () =>
      !isSelectionMode &&
      (activeQuickFilter === "no_isbn" || activeQuickFilter === "no_genre"),
    [activeQuickFilter, isSelectionMode]
  );

  const isLocationFilterContext = useMemo(
    () => !isSelectionMode && activeQuickFilter === "no_location",
    [activeQuickFilter, isSelectionMode]
  );

  const isLocationSelectionContext = useMemo(
    () =>
      selectedBooks.length > 0 &&
      selectedBooks.every((book) => !book.shelfLocation?.trim()),
    [selectedBooks]
  );

  const activePanelFilters = useMemo(() => {
    const filters: Array<{
      key: "genre" | "location";
      label: string;
      onClear: () => void;
    }> = [];

    if (genreFilter !== ALL_GENRES_FILTER) {
      filters.push({
        key: "genre",
        label: appText.library.activeGenreFilterLabel(genreFilter),
        onClear: () =>
          startTransition(() => {
            setGenreFilter(ALL_GENRES_FILTER);
          })
      });
    }

    if (locationFilter !== ALL_LOCATIONS_FILTER) {
      filters.push({
        key: "location",
        label: appText.library.activeLocationFilterLabel(locationFilter),
        onClear: () =>
          startTransition(() => {
            setLocationFilter(ALL_LOCATIONS_FILTER);
          })
      });
    }

    return filters;
  }, [genreFilter, locationFilter, startTransition]);

  useEffect(() => {
    if (!usesRepositoryFiltering) {
      setFilteredBooks([]);
      setFilteredTotalBooks(0);
      setIsFilteredLoading(false);
      setIsFilteredLoadingMore(false);
      return;
    }

    let isCancelled = false;
    let interactionHandle:
      | ReturnType<typeof InteractionManager.runAfterInteractions>
      | null = null;

    setIsFilteredLoading(true);

    interactionHandle = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const filterQuery = {
            query,
            genre: genreFilter !== ALL_GENRES_FILTER ? genreFilter : undefined,
            location: locationFilter !== ALL_LOCATIONS_FILTER ? locationFilter : undefined,
            quickFilter: activeQuickFilter,
            sortKey
          };

          const [nextBooks, nextTotalBooks] = await Promise.all([
            bookRepository.listFilteredPage({
              ...filterQuery,
              offset: 0,
              limit: FILTERED_PAGE_SIZE
            }),
            bookRepository.countFiltered(filterQuery)
          ]);

          if (!isCancelled) {
            setFilteredBooks(nextBooks);
            setFilteredTotalBooks(nextTotalBooks);
          }
        } finally {
          if (!isCancelled) {
            setIsFilteredLoading(false);
          }
        }
      })();
    });

    return () => {
      isCancelled = true;
      interactionHandle?.cancel();
    };
  }, [
    activeQuickFilter,
    filterQueryVersion,
    genreFilter,
    locationFilter,
    query,
    sortKey,
    usesRepositoryFiltering
  ]);

  useEffect(() => {
    if (!selectedBookIds.length) {
      setForceRetryLookup(false);
    }
  }, [selectedBookIds.length]);

  const resetTextSearchOnReturn = useCallback(() => {
    searchDraftRef.current = "";
    setQuery("");
  }, []);

  const closeEditor = useCallback(() => {
    resetTextSearchOnReturn();
    setFilterQueryVersion((current) => current + 1);
    setSelectedBookId(null);
    setIsCreating(false);
  }, [resetTextSearchOnReturn]);

  const closeQuickEdit = useCallback(() => {
    setQuickEditBookId(null);
    setQuickEditMode(null);
  }, []);

  const clearSelection = useCallback(() => {
    selectedBookIdsRef.current = [];
    setSelectedBookIds([]);
    setBatchLocationDraft("");
    setBatchActionMessage(null);
    setForceRetryLookup(false);
  }, []);

  const handleQuickEditToggle = useCallback(
    (bookId: string, mode: Exclude<QuickEditMode, null>) => {
      if (isSelectionMode) {
        return;
      }

      if (quickEditBookId === bookId && quickEditMode === mode) {
        closeQuickEdit();
        return;
      }

      setQuickEditBookId(bookId);
      setQuickEditMode(mode);
    },
    [closeQuickEdit, isSelectionMode, quickEditBookId, quickEditMode]
  );

  const enterSelectionMode = useCallback(
    (bookId: string) => {
      closeQuickEdit();
      selectedBookIdsRef.current = [bookId];
      setSelectedBookIds([bookId]);
    },
    [closeQuickEdit]
  );

  const toggleSelection = useCallback((bookId: string) => {
    const nextSelection = selectedBookIdsRef.current.includes(bookId)
      ? selectedBookIdsRef.current.filter((id) => id !== bookId)
      : [...selectedBookIdsRef.current, bookId];

    selectedBookIdsRef.current = nextSelection;
    setSelectedBookIds(nextSelection);
  }, []);

  const replaceSelection = useCallback((bookIds: string[]) => {
    const nextSelection = Array.from(new Set(bookIds));
    selectedBookIdsRef.current = nextSelection;
    setSelectedBookIds(nextSelection);
  }, []);

  const toggleQuickFilter = useCallback((filterKey: QuickCatalogFilter) => {
    setActiveQuickFilter((current) => (current === filterKey ? null : filterKey));
  }, []);

  const handleSubmitSearch = useCallback(() => {
    setQuery(searchDraftRef.current.trim());
  }, []);

  const buildCatalogFilterQuery = useCallback(
    () => ({
      query,
      genre: genreFilter !== ALL_GENRES_FILTER ? genreFilter : undefined,
      location: locationFilter !== ALL_LOCATIONS_FILTER ? locationFilter : undefined,
      quickFilter: activeQuickFilter,
      sortKey
    }),
    [activeQuickFilter, genreFilter, locationFilter, query, sortKey]
  );

  const loadAllFilteredBooks = useCallback(async () => {
    if (!usesRepositoryFiltering) {
      return visibleBooks;
    }

    if (filteredBooks.length >= filteredTotalBooks && filteredTotalBooks > 0) {
      return filteredBooks;
    }

    const filterQuery = buildCatalogFilterQuery();
    const total = await bookRepository.countFiltered(filterQuery);
    const allBooks: Book[] = [];

    for (let offset = 0; offset < total; offset += FILTERED_PAGE_SIZE) {
      const page = await bookRepository.listFilteredPage({
        ...filterQuery,
        offset,
        limit: FILTERED_PAGE_SIZE
      });

      allBooks.push(...page);

      if (page.length < FILTERED_PAGE_SIZE) {
        break;
      }
    }

    return allBooks;
  }, [
    buildCatalogFilterQuery,
    filteredBooks,
    filteredTotalBooks,
    usesRepositoryFiltering,
    visibleBooks
  ]);

  const selectAllVisibleBooks = useCallback(() => {
    replaceSelection(visibleBooks.map((book) => book.id));
  }, [replaceSelection, visibleBooks]);

  const updateBookQuickly = useCallback(
    async (
      book: Book,
      changes: Partial<Pick<Book, "status" | "shelfLocation" | "genre">>
    ) => {
      setUpdatingBookId(book.id);

      try {
        await quickUpdateBook(book.id, changes);
        if (usesRepositoryFiltering) {
          setFilterQueryVersion((current) => current + 1);
        }
        closeQuickEdit();
      } finally {
        setUpdatingBookId(null);
      }
    },
    [closeQuickEdit, quickUpdateBook, usesRepositoryFiltering]
  );

  const handleQuickStatusSelect = useCallback(
    async (book: Book, status: Book["status"]) => {
      await updateBookQuickly(book, { status });
    },
    [updateBookQuickly]
  );

  const handleQuickLocationSave = useCallback(
    async (book: Book, location?: string) => {
      await updateBookQuickly(book, {
        shelfLocation: location?.trim() || undefined
      });
    },
    [updateBookQuickly]
  );

  const handleQuickGenreSave = useCallback(
    async (book: Book, genre?: string) => {
      await updateBookQuickly(book, {
        genre: normalizeGenreLabel(genre)
      });
    },
    [updateBookQuickly]
  );

  const handleDeleteBook = useCallback(
    (book: Book) => {
      Alert.alert("Usunąć książkę?", `Czy na pewno chcesz usunąć „${book.title}”?`, [
        {
          text: "Anuluj",
          style: "cancel"
        },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setUpdatingBookId(book.id);

              try {
                await deleteBook(book.id);
                if (usesRepositoryFiltering) {
                  setFilterQueryVersion((current) => current + 1);
                }
              } finally {
                setUpdatingBookId(null);
                closeQuickEdit();
              }
            })();
          }
        }
      ]);
    },
    [closeQuickEdit, deleteBook, usesRepositoryFiltering]
  );

  const applyBatchChanges = useCallback(
    async (
      changes: Partial<Pick<Book, "status" | "shelfLocation">>,
      actionMessage: string
    ) => {
      const targetIds = isSelectionMode
        ? [...selectedBookIdsRef.current]
        : isLocationFilterContext
          ? (await loadAllFilteredBooks()).map((book) => book.id)
          : [];

      if (!targetIds.length) {
        return;
      }

      setIsApplyingBatch(true);
      setBatchActionMessage(actionMessage);

      try {
        await applyBatchUpdate(targetIds, changes);

        if (isSelectionMode) {
          clearSelection();
        }

        if (usesRepositoryFiltering) {
          setFilterQueryVersion((current) => current + 1);
        }
      } finally {
        setIsApplyingBatch(false);
        setBatchActionMessage(null);
      }
    },
    [
      applyBatchUpdate,
      clearSelection,
      isLocationFilterContext,
      isSelectionMode,
      loadAllFilteredBooks,
      usesRepositoryFiltering
    ]
  );

  const handleEnrichMissingIsbn = useCallback(async () => {
    if (!selectedBookIdsRef.current.length && !isLookupFilterContext) {
      setIsbnEnrichmentMessage(appText.library.enrichingMissingDataSelectBooks);
      return;
    }

    const filterContextBooks =
      !isSelectionMode && isLookupFilterContext
        ? await loadAllFilteredBooks()
        : visibleBooks;

    const booksMissingData = isSelectionMode
      ? selectedBooksMissingRemoteData
      : filterContextBooks.filter((book) => {
          if (forceRetryLookup) {
            return !book.isbn?.trim() || !book.genre?.trim();
          }

          return (
            (!book.isbn?.trim() || !book.genre?.trim()) &&
            book.remoteLookupStatus !== "not_found"
          );
        });

    if (!booksMissingData.length) {
      setIsbnEnrichmentMessage(appText.library.enrichingMissingDataNothingToDo);
      return;
    }

    setIsEnrichingMissingIsbn(true);
    setBatchActionMessage(null);
    let pendingBooks: Book[] = [];
    let savedUpdatesCount = 0;
    let processedCount = 0;

    const flushPendingBooks = async () => {
      if (!pendingBooks.length) {
        return;
      }

      const booksToSave = [...pendingBooks];
      pendingBooks = [];
      await saveBooksBulk(booksToSave);
      savedUpdatesCount += booksToSave.length;
    };

    try {
      for (const [index, book] of booksMissingData.entries()) {
        setIsbnEnrichmentMessage(
          appText.library.enrichingMissingDataProgress(
            index + 1,
            booksMissingData.length,
            book.title
          )
        );

        try {
          const results = await searchBooksOnline(
            book.title,
            book.author,
            undefined,
            book.genre,
            savedGenres
          );
          const bestMatch = pickBestRemoteBookMatch(results, {
            title: book.title,
            author: book.author,
            genre: book.genre
          });

          processedCount += 1;

          if (bestMatch && (bestMatch.isbn || bestMatch.genre)) {
            pendingBooks.push({
              ...book,
              title: book.title || bestMatch.title,
              author: book.author || bestMatch.author,
              genre: book.genre?.trim() ? book.genre : bestMatch.genre,
              isbn: book.isbn?.trim() ? book.isbn : bestMatch.isbn,
              remoteLookupStatus: undefined,
              updatedAt: book.updatedAt
            });
          } else {
            pendingBooks.push({
              ...book,
              remoteLookupStatus: "not_found",
              updatedAt: book.updatedAt
            });
          }

          if (pendingBooks.length >= ENRICHMENT_SAVE_CHUNK_SIZE) {
            await flushPendingBooks();
          }

          if (index < booksMissingData.length - 1) {
            await delay(ENRICHMENT_REQUEST_DELAY_MS);
          }
        } catch (error) {
          await flushPendingBooks();

          if (error instanceof RemoteLookupError && error.status === 429) {
            setIsbnEnrichmentMessage(
              `${appText.library.enrichingMissingDataRateLimited} ${appText.library.enrichingMissingDataPartial(
                savedUpdatesCount,
                processedCount,
                booksMissingData.length
              )}`
            );
            return;
          }
        }
      }

      await flushPendingBooks();
      if (usesRepositoryFiltering) {
        setFilterQueryVersion((current) => current + 1);
      }

      setIsbnEnrichmentMessage(
        appText.library.enrichingMissingDataDone(
          savedUpdatesCount,
          booksMissingData.length
        )
      );
    } catch (error) {
      await flushPendingBooks();
      let fallbackMessage = error instanceof Error ? error.message : errorMessage;

      if (error instanceof RemoteLookupError && error.status === 429) {
        fallbackMessage = `${appText.library.enrichingMissingDataRateLimited} ${appText.library.enrichingMissingDataPartial(
          savedUpdatesCount,
          processedCount,
          booksMissingData.length
        )}`;
      }

      setIsbnEnrichmentMessage(fallbackMessage);
    } finally {
      setIsEnrichingMissingIsbn(false);
    }
  }, [
    errorMessage,
    forceRetryLookup,
    isLookupFilterContext,
    isSelectionMode,
    loadAllFilteredBooks,
    saveBooksBulk,
    savedGenres,
    selectedBooksMissingRemoteData,
    usesRepositoryFiltering,
    visibleBooks
  ]);

  const handleBatchLocationApply = useCallback(
    async (location?: string) => {
      const normalizedLocation = location?.trim();

      await applyBatchChanges(
        {
          shelfLocation: normalizedLocation || undefined
        },
        normalizedLocation
          ? appText.library.batchApplyingLocation(normalizedLocation)
          : appText.library.batchApplyingClearLocation
      );
    },
    [applyBatchChanges]
  );

  const handleLoadMoreBooks = useCallback(() => {
    if (usesRepositoryFiltering) {
      if (
        isFilteredLoading ||
        isFilteredLoadingMore ||
        filteredBooks.length >= filteredTotalBooks
      ) {
        return;
      }

      setIsFilteredLoadingMore(true);

      void (async () => {
        try {
          const nextPage = await bookRepository.listFilteredPage({
            query,
            genre: genreFilter !== ALL_GENRES_FILTER ? genreFilter : undefined,
            location: locationFilter !== ALL_LOCATIONS_FILTER ? locationFilter : undefined,
            quickFilter: activeQuickFilter,
            sortKey,
            offset: filteredBooks.length,
            limit: FILTERED_PAGE_SIZE
          });

          setFilteredBooks((current) => [...current, ...nextPage]);
        } finally {
          setIsFilteredLoadingMore(false);
        }
      })();
      return;
    }

    if (!hasMoreBooks || isLoadingMore) {
      return;
    }

    void loadMoreBooks();
  }, [
    activeQuickFilter,
    filteredBooks.length,
    filteredTotalBooks,
    genreFilter,
    hasMoreBooks,
    isFilteredLoading,
    isFilteredLoadingMore,
    isLoadingMore,
    loadMoreBooks,
    locationFilter,
    query,
    sortKey,
    usesRepositoryFiltering
  ]);

  return {
    books,
    totalBooks,
    withoutLocationCount,
    withoutIsbnCount,
    withoutGenreCount,
    hasMoreBooks,
    isLoading,
    isLoadingMore,
    errorMessage,
    sortKey,
    setSortKey,
    query,
    selectedBook,
    isCreating,
    setIsCreating,
    duplicateBookIds,
    isSelectionMode,
    selectedBookIdSet,
    selectedBookIds,
    quickEditBookId,
    quickEditMode,
    updatingBookId,
    locationOptions,
    genreOptions,
    quickGenreOptions,
    locationFilterOptions,
    visibleBooks,
    usesRepositoryFiltering,
    filteredBooks,
    filteredTotalBooks,
    isFilteredLoadingMore,
    hasActiveCatalogFilters: usesRepositoryFiltering,
    isbnEnrichmentMessage,
    batchLocationDraft,
    setBatchLocationDraft,
    isApplyingBatch,
    batchActionMessage,
    isEnrichingMissingIsbn,
    forceRetryLookup,
    setForceRetryLookup,
    isFiltersOpen,
    setIsFiltersOpen,
    activeQuickFilter,
    activePanelFilters,
    genreFilter,
    setGenreFilter,
    locationFilter,
    setLocationFilter,
    isLookupSelectionContext,
    isLookupFilterContext,
    isLocationFilterContext,
    isLocationSelectionContext,
    searchDraftRef,
    startTransition,
    closeEditor,
    setSelectedBookId,
    enterSelectionMode,
    toggleSelection,
    handleQuickEditToggle,
    handleQuickStatusSelect,
    handleQuickLocationSave,
    handleQuickGenreSave,
    handleDeleteBook,
    handleSubmitSearch,
    filterBooksWithoutLocation: () => toggleQuickFilter("no_location"),
    filterBooksWithoutIsbn: () => toggleQuickFilter("no_isbn"),
    filterBooksWithoutGenre: () => toggleQuickFilter("no_genre"),
    selectAllVisibleBooks,
    clearSelection,
    handleEnrichMissingIsbn,
    handleBatchLocationApply,
    handleLoadMoreBooks
  };
}
