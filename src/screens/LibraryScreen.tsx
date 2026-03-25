import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { SORT_OPTIONS, SortKey } from "@/config/bookUi";
import { appText } from "@/config/uiText";
import { BookListItem } from "@/components/BookListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import {
  RemoteLookupError,
  pickBestRemoteBookMatch,
  searchBooksOnline
} from "@/features/catalog/bookLookupService";
import { collectDuplicateBookIds } from "@/features/catalog/duplicateDetection";
import { normalizeGenreLabel } from "@/features/catalog/genreCatalog";
import { BookEditorScreen } from "@/screens/BookEditorScreen";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Book } from "@/types/book";

type QuickEditMode = "status" | "location" | "genre" | null;
const ALL_GENRES_FILTER = "__all__";
const ALL_LOCATIONS_FILTER = "__all_locations__";
const ENRICHMENT_SAVE_CHUNK_SIZE = 10;
const ENRICHMENT_REQUEST_DELAY_MS = 250;
type QuickCatalogFilter = "no_location" | "no_isbn" | "no_genre" | null;

interface LibraryScreenProps {
  onStartScan: () => void;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LibraryScreen({ onStartScan }: LibraryScreenProps) {
  const {
    books,
    totalBooks,
    hasMoreBooks,
    isLoading,
    isLoadingMore,
    errorMessage,
    loadMoreBooks,
    loadAllBooks,
    saveBook,
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
  const selectedBookIdsRef = useRef<string[]>([]);
  const searchDraftRef = useRef("");

  const isSelectionMode = selectedBookIds.length > 0;

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId]
  );

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...savedLocations, ...books.map((book) => book.shelfLocation ?? "")]
            .map((value) => value.trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, "pl")),
    [books, savedLocations]
  );

  const genreOptions = useMemo(
    () =>
      [
        ALL_GENRES_FILTER,
        ...Array.from(
          new Set(
            [...savedGenres, ...books.map((book) => normalizeGenreLabel(book.genre) ?? "")]
              .map((value) => value.trim())
              .filter(Boolean)
          )
        ).sort((left, right) => left.localeCompare(right, "pl"))
      ],
    [books, savedGenres]
  );
  const quickGenreOptions = useMemo(
    () => genreOptions.filter((option) => option !== ALL_GENRES_FILTER),
    [genreOptions]
  );

  const locationFilterOptions = useMemo(
    () => [ALL_LOCATIONS_FILTER, ...locationOptions],
    [locationOptions]
  );

  const duplicateBookIds = useMemo(() => collectDuplicateBookIds(books), [books]);
  const selectedBookIdSet = useMemo(() => new Set(selectedBookIds), [selectedBookIds]);
  const selectedBooks = useMemo(
    () => books.filter((book) => selectedBookIdSet.has(book.id)),
    [books, selectedBookIdSet]
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

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesGenreFilter = (book: Book) =>
      genreFilter === ALL_GENRES_FILTER ||
      normalizeGenreLabel(book.genre) === genreFilter;
    const matchesLocationFilter = (book: Book) =>
      locationFilter === ALL_LOCATIONS_FILTER ||
      (book.shelfLocation?.trim() ?? "") === locationFilter;
    const matchesQuickFilter = (book: Book) => {
      switch (activeQuickFilter) {
        case "no_location":
          return !book.shelfLocation?.trim();
        case "no_isbn":
          return !book.isbn?.trim();
        case "no_genre":
          return !book.genre?.trim();
        default:
          return true;
      }
    };

    const filteredBooks = books.filter((book) => {
      if (
        !matchesGenreFilter(book) ||
        !matchesLocationFilter(book) ||
        !matchesQuickFilter(book)
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        book.title,
        book.author,
        book.genre,
        book.isbn,
        book.shelfLocation,
        book.notes
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });

    const sortedBooks = [...filteredBooks];

    sortedBooks.sort((left, right) => {
      switch (sortKey) {
        case "title_asc":
          return left.title.localeCompare(right.title, "pl");
        case "author_asc":
          return left.author.localeCompare(right.author, "pl");
        case "status_asc":
          return (
            left.status.localeCompare(right.status, "pl") ||
            left.title.localeCompare(right.title, "pl")
          );
        case "updated_desc":
        default:
          return right.updatedAt.localeCompare(left.updatedAt);
      }
    });

    return sortedBooks;
  }, [activeQuickFilter, books, genreFilter, locationFilter, query, sortKey]);

  const visibleWithoutLocationCount = useMemo(
    () => visibleBooks.filter((book) => !book.shelfLocation?.trim()).length,
    [visibleBooks]
  );

  const visibleWithoutIsbnCount = useMemo(
    () => visibleBooks.filter((book) => !book.isbn?.trim()).length,
    [visibleBooks]
  );

  const visibleWithoutGenreCount = useMemo(
    () => visibleBooks.filter((book) => !book.genre?.trim()).length,
    [visibleBooks]
  );

  const quickFilteredLookupBooks = useMemo(() => {
    if (activeQuickFilter !== "no_isbn" && activeQuickFilter !== "no_genre") {
      return [];
    }

    return visibleBooks.filter((book) => {
      if (forceRetryLookup) {
        return !book.isbn?.trim() || !book.genre?.trim();
      }

      return (
        (!book.isbn?.trim() || !book.genre?.trim()) &&
        book.remoteLookupStatus !== "not_found"
      );
    });
  }, [activeQuickFilter, forceRetryLookup, visibleBooks]);

  const hasActiveCatalogFilters =
    Boolean(query) ||
    genreFilter !== ALL_GENRES_FILTER ||
    locationFilter !== ALL_LOCATIONS_FILTER ||
    activeQuickFilter !== null;

  useEffect(() => {
    if (hasActiveCatalogFilters && hasMoreBooks && !isLoading && !isLoadingMore) {
      void loadAllBooks();
    }
  }, [
    activeQuickFilter,
    genreFilter,
    hasActiveCatalogFilters,
    hasMoreBooks,
    isLoading,
    isLoadingMore,
    loadAllBooks,
    locationFilter,
    query
  ]);

  useEffect(() => {
    if (!selectedBookIds.length) {
      setForceRetryLookup(false);
    }
  }, [selectedBookIds.length]);

  const closeEditor = () => {
    setSelectedBookId(null);
    setIsCreating(false);
  };

  const closeQuickEdit = () => {
    setQuickEditBookId(null);
    setQuickEditMode(null);
  };

  const clearSelection = () => {
    selectedBookIdsRef.current = [];
    setSelectedBookIds([]);
    setBatchLocationDraft("");
    setBatchActionMessage(null);
    setForceRetryLookup(false);
  };

  const handleQuickEditToggle = (
    bookId: string,
    mode: Exclude<QuickEditMode, null>
  ) => {
    if (isSelectionMode) {
      return;
    }

    if (quickEditBookId === bookId && quickEditMode === mode) {
      closeQuickEdit();
      return;
    }

    setQuickEditBookId(bookId);
    setQuickEditMode(mode);
  };

  const enterSelectionMode = (bookId: string) => {
    closeQuickEdit();
    selectedBookIdsRef.current = [bookId];
    setSelectedBookIds([bookId]);
  };

  const toggleSelection = (bookId: string) => {
    const nextSelection = selectedBookIdsRef.current.includes(bookId)
      ? selectedBookIdsRef.current.filter((id) => id !== bookId)
      : [...selectedBookIdsRef.current, bookId];

    selectedBookIdsRef.current = nextSelection;
    setSelectedBookIds(nextSelection);
  };

  const replaceSelection = (bookIds: string[]) => {
    const nextSelection = Array.from(new Set(bookIds));
    selectedBookIdsRef.current = nextSelection;
    setSelectedBookIds(nextSelection);
  };

  const toggleQuickFilter = (filterKey: QuickCatalogFilter) => {
    if (activeQuickFilter === filterKey) {
      setActiveQuickFilter(null);
      return;
    }

    setActiveQuickFilter(filterKey);
  };

  const handleSubmitSearch = () => {
    setQuery(searchDraftRef.current.trim());
  };

  const filterBooksWithoutLocation = () => {
    toggleQuickFilter("no_location");
  };

  const filterBooksWithoutIsbn = () => {
    toggleQuickFilter("no_isbn");
  };

  const filterBooksWithoutGenre = () => {
    toggleQuickFilter("no_genre");
  };

  const selectAllVisibleBooks = () => {
    replaceSelection(visibleBooks.map((book) => book.id));
  };

  const updateBookQuickly = async (
    book: Book,
    changes: Partial<Pick<Book, "status" | "shelfLocation" | "genre">>
  ) => {
    setUpdatingBookId(book.id);

    try {
      await saveBook({
        ...book,
        ...changes
      });
      closeQuickEdit();
    } finally {
      setUpdatingBookId(null);
    }
  };

  const handleQuickStatusSelect = async (
    book: Book,
    status: Book["status"]
  ) => {
    await updateBookQuickly(book, { status });
  };

  const handleQuickLocationSave = async (book: Book, location?: string) => {
    await updateBookQuickly(book, {
      shelfLocation: location?.trim() || undefined
    });
  };

  const handleQuickGenreSave = async (book: Book, genre?: string) => {
    await updateBookQuickly(book, {
      genre: normalizeGenreLabel(genre)
    });
  };

  const handleDeleteBook = (book: Book) => {
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
            } finally {
              setUpdatingBookId(null);
              closeQuickEdit();
            }
          })();
        }
      }
    ]);
  };

  const applyBatchChanges = async (
    changes: Partial<Pick<Book, "status" | "shelfLocation">>,
    actionMessage: string
  ) => {
    const targetIds = isSelectionMode
      ? [...selectedBookIdsRef.current]
      : isLocationFilterContext
        ? visibleBooks.map((book) => book.id)
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
    } finally {
      setIsApplyingBatch(false);
      setBatchActionMessage(null);
    }
  };

  const handleEnrichMissingIsbn = async () => {
    if (!selectedBookIdsRef.current.length && !isLookupFilterContext) {
      setIsbnEnrichmentMessage(appText.library.enrichingMissingDataSelectBooks);
      return;
    }

    const booksMissingData = isSelectionMode
      ? selectedBooksMissingRemoteData
      : quickFilteredLookupBooks;

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
  };

  const handleBatchLocationApply = async (location?: string) => {
    const normalizedLocation = location?.trim();

    await applyBatchChanges(
      {
        shelfLocation: normalizedLocation || undefined
      },
      normalizedLocation
        ? appText.library.batchApplyingLocation(normalizedLocation)
        : appText.library.batchApplyingClearLocation
    );
  };

  const handleLoadMoreBooks = () => {
    if (hasActiveCatalogFilters || !hasMoreBooks || isLoadingMore) {
      return;
    }

    void loadMoreBooks();
  };

  if (selectedBook || isCreating) {
    return (
      <BookEditorScreen
        book={selectedBook}
        onBack={closeEditor}
        onSaved={closeEditor}
      />
    );
  }

  const renderBookItem = ({ item }: ListRenderItemInfo<Book>) => (
    <BookListItem
      key={item.id}
      book={item}
      isDuplicate={duplicateBookIds.has(item.id)}
      isSelectable={isSelectionMode}
      isSelected={selectedBookIdSet.has(item.id)}
      onPress={() => setSelectedBookId(item.id)}
      onTitleLongPress={() => enterSelectionMode(item.id)}
      onToggleSelection={() => toggleSelection(item.id)}
      quickEditMode={
        !isSelectionMode && quickEditBookId === item.id ? quickEditMode : null
      }
      isUpdating={updatingBookId === item.id}
      locationOptions={locationOptions.filter(
        (location) => location !== item.shelfLocation
      )}
      genreOptions={quickGenreOptions.filter(
        (genre) => genre !== normalizeGenreLabel(item.genre)
      )}
      onToggleQuickEdit={(mode) => handleQuickEditToggle(item.id, mode)}
      onQuickStatusSelect={(status) => {
        void handleQuickStatusSelect(item, status);
      }}
      onQuickLocationSave={(location) => {
        void handleQuickLocationSave(item, location);
      }}
      onQuickGenreSave={(genre) => {
        void handleQuickGenreSave(item, genre);
      }}
      onDeletePress={() => handleDeleteBook(item)}
    />
  );

  const renderListHeader = () => (
    <View style={styles.headerContent}>
      <SectionCard
        title={appText.library.title}
        subtitle={
          isLoading
            ? appText.library.loading
            : appText.library.countLabel(totalBooks)
        }
      >
        <View style={styles.actionsRow}>
          <View style={styles.action}>
            <PrimaryButton
              label={appText.library.scanButton}
              onPress={onStartScan}
              compact
            />
          </View>
          <View style={styles.action}>
            <PrimaryButton
              label={appText.library.addManualButton}
              onPress={() => {
                setIsCreating(true);
              }}
              compact
            />
          </View>
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {isbnEnrichmentMessage ? (
          <Text style={styles.selectionHint}>{isbnEnrichmentMessage}</Text>
        ) : null}
        {!isSelectionMode ? (
          <Text style={styles.selectionHint}>{appText.library.batchModeHint}</Text>
        ) : null}
      </SectionCard>

      <View style={styles.controlsWrap}>
        <View style={styles.stickyBar}>
          <View style={styles.searchRow}>
            <TextInput
              defaultValue={query}
              onChangeText={(value) => {
                searchDraftRef.current = value;
              }}
              onSubmitEditing={handleSubmitSearch}
              placeholder={appText.library.searchPlaceholder}
              placeholderTextColor="#9a8a76"
              style={[styles.searchInput, styles.searchInputWide]}
              returnKeyType="search"
              blurOnSubmit
            />
            <Pressable
              onPress={() => setIsFiltersOpen((current) => !current)}
              style={({ pressed }) => [
                styles.panelToggleButton,
                isFiltersOpen ? styles.panelToggleButtonActive : null,
                pressed ? styles.panelToggleButtonPressed : null
              ]}
            >
              <Text
                style={[
                  styles.panelToggleButtonLabel,
                  isFiltersOpen ? styles.panelToggleButtonLabelActive : null
                ]}
              >
                {isFiltersOpen
                  ? appText.library.filtersHideButton
                  : appText.library.filtersShowButton}
              </Text>
            </Pressable>
          </View>

          <View style={styles.visibleStatsRow}>
            <Pressable
              onPress={filterBooksWithoutLocation}
              style={({ pressed }) => [
                styles.visibleStatChip,
                activeQuickFilter === "no_location"
                  ? styles.visibleStatChipActive
                  : null,
                pressed ? styles.visibleStatChipPressed : null
              ]}
            >
              <Text
                style={[
                  styles.visibleStatLabel,
                  activeQuickFilter === "no_location"
                    ? styles.visibleStatLabelActive
                    : null
                ]}
              >
                {appText.library.visibleWithoutLocationLabel(visibleWithoutLocationCount)}
              </Text>
            </Pressable>
            <Pressable
              onPress={filterBooksWithoutIsbn}
              style={({ pressed }) => [
                styles.visibleStatChip,
                activeQuickFilter === "no_isbn"
                  ? styles.visibleStatChipActive
                  : null,
                pressed ? styles.visibleStatChipPressed : null
              ]}
            >
              <Text
                style={[
                  styles.visibleStatLabel,
                  activeQuickFilter === "no_isbn"
                    ? styles.visibleStatLabelActive
                    : null
                ]}
              >
                {appText.library.visibleWithoutIsbnLabel(visibleWithoutIsbnCount)}
              </Text>
            </Pressable>
            <Pressable
              onPress={filterBooksWithoutGenre}
              style={({ pressed }) => [
                styles.visibleStatChip,
                activeQuickFilter === "no_genre"
                  ? styles.visibleStatChipActive
                  : null,
                pressed ? styles.visibleStatChipPressed : null
              ]}
            >
              <Text
                style={[
                  styles.visibleStatLabel,
                  activeQuickFilter === "no_genre"
                    ? styles.visibleStatLabelActive
                    : null
                ]}
              >
                {appText.library.visibleWithoutGenreLabel(visibleWithoutGenreCount)}
              </Text>
            </Pressable>
          </View>

          {isFiltersOpen ? (
            <View style={styles.filtersPanel}>
              <Text style={styles.genreFilterLabel}>{appText.library.genreFilterLabel}</Text>
              <View style={styles.genreFilterRow}>
                {genreOptions.map((option) => {
                  const isAllOption = option === ALL_GENRES_FILTER;
                  const label = isAllOption
                    ? appText.library.genreFilterAll
                    : option;
                  const isActive = genreFilter === option;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setGenreFilter(option)}
                      style={[
                        styles.genreChip,
                        isActive ? styles.genreChipActive : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.genreChipLabel,
                          isActive ? styles.genreChipLabelActive : null
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.genreFilterLabel}>
                {appText.library.locationFilterLabel}
              </Text>
              <View style={styles.genreFilterRow}>
                {locationFilterOptions.map((option) => {
                  const isAllOption = option === ALL_LOCATIONS_FILTER;
                  const label = isAllOption
                    ? appText.library.locationFilterAll
                    : option;
                  const isActive = locationFilter === option;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setLocationFilter(option)}
                      style={[
                        styles.genreChip,
                        isActive ? styles.genreChipActive : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.genreChipLabel,
                          isActive ? styles.genreChipLabelActive : null
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((option) => {
                  const isActive = option.key === sortKey;

                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setSortKey(option.key)}
                      style={[styles.sortChip, isActive ? styles.sortChipActive : null]}
                    >
                      <Text
                        style={[
                          styles.sortChipLabel,
                          isActive ? styles.sortChipLabelActive : null
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.filterSummary}>
              {appText.library.filtersActiveSummary(
                (genreFilter !== ALL_GENRES_FILTER ? 1 : 0) +
                  (locationFilter !== ALL_LOCATIONS_FILTER ? 1 : 0) +
                  (activeQuickFilter ? 1 : 0)
              )}
            </Text>
          )}

          <View style={styles.lazyInfoRow}>
            <Text style={styles.lazyInfoLabel}>
              {appText.library.lazyLoadedCount(
                visibleBooks.length,
                hasActiveCatalogFilters ? visibleBooks.length : totalBooks
              )}
            </Text>
          </View>

          {isSelectionMode || isLookupFilterContext || isLocationFilterContext ? (
            <View style={styles.batchPanel}>
              {isSelectionMode ? (
                <Text style={styles.batchCount}>
                  {appText.library.batchSelectedLabel(selectedBookIds.length)}
                </Text>
              ) : null}
              {batchActionMessage ? (
                <View style={styles.batchMessage}>
                  <Text style={styles.batchMessageLabel}>{batchActionMessage}</Text>
                </View>
              ) : null}
              {isSelectionMode ? (
                <View style={styles.batchShortcuts}>
                  <Pressable
                    onPress={selectAllVisibleBooks}
                    style={({ pressed }) => [
                      styles.batchShortcutChip,
                      pressed ? styles.batchChipPressed : null,
                      isApplyingBatch ? styles.batchChipDisabled : null
                    ]}
                    disabled={isApplyingBatch}
                  >
                    <Text style={styles.batchShortcutLabel}>
                      {appText.library.selectAllVisible}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={clearSelection}
                    style={({ pressed }) => [
                      styles.batchClearChip,
                      pressed ? styles.batchChipPressed : null,
                      isApplyingBatch ? styles.batchChipDisabled : null
                    ]}
                    disabled={isApplyingBatch}
                  >
                    <Text style={styles.batchClearLabel}>
                      {appText.library.clearSelection}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {isLookupSelectionContext || isLookupFilterContext ? (
                <View style={styles.batchBlock}>
                  <View style={styles.lookupToggleRow}>
                    <Pressable
                      onPress={() => setForceRetryLookup((current) => !current)}
                      style={({ pressed }) => [
                        styles.retryCheckboxWrap,
                        pressed ? styles.batchChipPressed : null
                      ]}
                    >
                      <View
                        style={[
                          styles.retryCheckbox,
                          forceRetryLookup ? styles.retryCheckboxActive : null
                        ]}
                      >
                        {forceRetryLookup ? (
                          <Text style={styles.retryCheckboxTick}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={styles.retryCheckboxLabel}>
                        {appText.library.forceRetryLookupLabel}
                      </Text>
                    </Pressable>
                  </View>
                  <PrimaryButton
                    label={
                      isEnrichingMissingIsbn
                        ? appText.library.enrichingMissingDataButton
                        : appText.library.enrichMissingDataButton
                    }
                    onPress={() => {
                      void handleEnrichMissingIsbn();
                    }}
                    disabled={isEnrichingMissingIsbn || isLoading}
                    compact
                  />
                </View>
              ) : null}

              {isLocationSelectionContext || isLocationFilterContext ? (
                <View style={styles.batchBlock}>
                  <Text style={styles.batchTitle}>
                    {appText.library.batchLocationTitle}
                  </Text>
                  {locationOptions.length ? (
                    <View style={styles.batchOptions}>
                      {locationOptions.map((location) => (
                        <Pressable
                          key={location}
                          onPress={() => {
                            void handleBatchLocationApply(location);
                          }}
                          disabled={isApplyingBatch}
                          style={({ pressed }) => [
                            styles.batchOptionChip,
                            pressed ? styles.batchOptionChipPressed : null,
                            isApplyingBatch ? styles.batchChipDisabled : null
                          ]}
                        >
                          <Text style={styles.batchOptionLabel}>{location}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <TextInput
                    value={batchLocationDraft}
                    onChangeText={setBatchLocationDraft}
                    placeholder={appText.library.batchLocationPlaceholder}
                    placeholderTextColor="#9a8a76"
                    style={styles.batchLocationInput}
                  />
                  <View style={styles.batchActionRow}>
                    <View style={styles.batchAction}>
                      <PrimaryButton
                        label={
                          isApplyingBatch
                            ? appText.library.batchApplying
                            : appText.library.batchSaveLocation
                        }
                        onPress={() => {
                          void handleBatchLocationApply(batchLocationDraft);
                        }}
                        disabled={isApplyingBatch}
                        compact
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={visibleBooks}
      keyExtractor={(item) => item.id}
      renderItem={renderBookItem}
      ListHeaderComponent={renderListHeader}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{appText.library.emptyTitle}</Text>
          <Text style={styles.emptyText}>{appText.library.emptyDescription}</Text>
        </View>
      }
      ListFooterComponent={
        !hasActiveCatalogFilters && (hasMoreBooks || isLoadingMore) ? (
          <View style={styles.footerLoader}>
            <Text style={styles.footerLoaderLabel}>
              {isLoadingMore
                ? appText.library.lazyLoadingMore
                : appText.library.lazyLoadedCount(books.length, totalBooks)}
            </Text>
          </View>
        ) : null
      }
      onEndReached={handleLoadMoreBooks}
      onEndReachedThreshold={0.35}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 10
  },
  headerContent: {
    gap: 10
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8
  },
  selectionHint: {
    color: "#7d6240",
    fontSize: 12,
    lineHeight: 18
  },
  action: {
    flex: 1
  },
  controlsWrap: {
    paddingBottom: 2
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  searchInputWide: {
    flex: 1
  },
  panelToggleButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd1bc",
    backgroundColor: "#f6efe4",
    alignItems: "center",
    justifyContent: "center"
  },
  panelToggleButtonActive: {
    backgroundColor: "#704d2e",
    borderColor: "#704d2e"
  },
  panelToggleButtonPressed: {
    opacity: 0.88
  },
  panelToggleButtonLabel: {
    color: "#6d5636",
    fontSize: 12,
    fontWeight: "700"
  },
  panelToggleButtonLabelActive: {
    color: "#fff8ee"
  },
  filtersPanel: {
    gap: 10,
    paddingTop: 2
  },
  filterSummary: {
    color: "#8a7355",
    fontSize: 11,
    fontWeight: "700"
  },
  genreFilterLabel: {
    color: "#4c3926",
    fontSize: 12,
    fontWeight: "800"
  },
  genreFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd1bc",
    backgroundColor: "#f6efe4"
  },
  genreChipActive: {
    backgroundColor: "#704d2e",
    borderColor: "#704d2e"
  },
  genreChipLabel: {
    color: "#6d5636",
    fontSize: 12,
    fontWeight: "700"
  },
  genreChipLabelActive: {
    color: "#fff8ee"
  },
  stickyBar: {
    gap: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e7dcc9",
    backgroundColor: "#fffaf2"
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1d4bf",
    backgroundColor: "#fffdf8",
    color: "#2d2419",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  batchPanel: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#eadfce",
    paddingTop: 10
  },
  batchMessage: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#efe3cf",
    borderWidth: 1,
    borderColor: "#dcc7a8"
  },
  batchMessageLabel: {
    color: "#6c5232",
    fontSize: 12,
    fontWeight: "700"
  },
  batchCount: {
    color: "#3e2f1f",
    fontSize: 13,
    fontWeight: "800"
  },
  batchShortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  batchShortcutChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#efe3cf",
    borderWidth: 1,
    borderColor: "#dcc7a8"
  },
  batchShortcutChipActive: {
    backgroundColor: "#704d2e",
    borderColor: "#704d2e"
  },
  batchShortcutLabel: {
    color: "#6c5232",
    fontSize: 12,
    fontWeight: "700"
  },
  batchShortcutLabelActive: {
    color: "#fff8ee"
  },
  batchClearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f5ddd9",
    borderWidth: 1,
    borderColor: "#e7bdb5"
  },
  batchClearLabel: {
    color: "#8b3028",
    fontSize: 12,
    fontWeight: "700"
  },
  batchChipPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9
  },
  batchChipDisabled: {
    opacity: 0.55
  },
  batchBlock: {
    gap: 8
  },
  lookupToggleRow: {
    gap: 8
  },
  retryCheckboxWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  retryCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ceb99a",
    backgroundColor: "#fffaf2",
    alignItems: "center",
    justifyContent: "center"
  },
  retryCheckboxActive: {
    backgroundColor: "#704d2e",
    borderColor: "#704d2e"
  },
  retryCheckboxTick: {
    color: "#fffaf2",
    fontSize: 13,
    fontWeight: "800"
  },
  retryCheckboxLabel: {
    flex: 1,
    color: "#6c5232",
    fontSize: 12,
    fontWeight: "700"
  },
  batchTitle: {
    color: "#4c3926",
    fontSize: 12,
    fontWeight: "800"
  },
  batchOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  batchOptionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5d8c3",
    backgroundColor: "#f2ebdf"
  },
  batchOptionChipPressed: {
    backgroundColor: "#e7dccb",
    borderColor: "#b69264",
    transform: [{ scale: 0.98 }]
  },
  batchOptionLabel: {
    color: "#6e5a43",
    fontSize: 12,
    fontWeight: "700"
  },
  batchLocationInput: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1d4bf",
    backgroundColor: "#fffdf8",
    color: "#2d2419",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14
  },
  batchActionRow: {
    flexDirection: "row",
    gap: 8
  },
  batchAction: {
    flex: 1
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  visibleStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  visibleStatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f4ede2"
  },
  visibleStatChipActive: {
    backgroundColor: "#704d2e"
  },
  visibleStatChipPressed: {
    opacity: 0.82
  },
  visibleStatLabel: {
    color: "#6b5640",
    fontSize: 12,
    fontWeight: "700"
  },
  visibleStatLabelActive: {
    color: "#fff8ee"
  },
  lazyInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  lazyInfoLabel: {
    color: "#8a7355",
    fontSize: 11,
    fontWeight: "700"
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eee2cf"
  },
  sortChipActive: {
    backgroundColor: "#704d2e"
  },
  sortChipLabel: {
    color: "#6d5636",
    fontSize: 12,
    fontWeight: "700"
  },
  sortChipLabelActive: {
    color: "#fff8ee"
  },
  separator: {
    height: 6
  },
  emptyState: {
    borderRadius: 14,
    backgroundColor: "#f8f1e8",
    padding: 14,
    gap: 6
  },
  emptyTitle: {
    color: "#3d2d1d",
    fontSize: 15,
    fontWeight: "700"
  },
  emptyText: {
    color: "#6f5a42",
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    color: "#8f2f2f",
    lineHeight: 22
  },
  footerLoader: {
    paddingVertical: 10,
    alignItems: "center"
  },
  footerLoaderLabel: {
    color: "#7d6240",
    fontSize: 12,
    fontWeight: "700"
  }
});
