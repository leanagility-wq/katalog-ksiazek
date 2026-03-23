import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { SORT_OPTIONS, SortKey, STATUS_OPTIONS } from "@/config/bookUi";
import { appText } from "@/config/uiText";
import { BookListItem } from "@/components/BookListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { collectDuplicateBookIds } from "@/features/catalog/duplicateDetection";
import { BookEditorScreen } from "@/screens/BookEditorScreen";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Book, BookStatus } from "@/types/book";

type QuickEditMode = "status" | "location" | null;

interface LibraryScreenProps {
  onStartScan: () => void;
}

export function LibraryScreen({ onStartScan }: LibraryScreenProps) {
  const { books, isLoading, errorMessage, saveBook, applyBatchUpdate } =
    useLibraryStore();
  const { savedLocations } = useSettingsStore();
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");
  const [query, setQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [quickEditBookId, setQuickEditBookId] = useState<string | null>(null);
  const [quickEditMode, setQuickEditMode] = useState<QuickEditMode>(null);
  const [updatingBookId, setUpdatingBookId] = useState<string | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [batchLocationDraft, setBatchLocationDraft] = useState("");
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchActionMessage, setBatchActionMessage] = useState<string | null>(null);
  const selectedBookIdsRef = useRef<string[]>([]);

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

  const duplicateBookIds = useMemo(() => collectDuplicateBookIds(books), [books]);
  const selectedBookIdSet = useMemo(() => new Set(selectedBookIds), [selectedBookIds]);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredBooks = normalizedQuery
      ? books.filter((book) =>
          [book.title, book.author, book.isbn, book.shelfLocation, book.notes]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedQuery))
        )
      : books;

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
  }, [books, query, sortKey]);

  const visibleWithoutLocationCount = useMemo(
    () => visibleBooks.filter((book) => !book.shelfLocation?.trim()).length,
    [visibleBooks]
  );

  const visibleNeedsReviewCount = useMemo(
    () => visibleBooks.filter((book) => book.status === "needs_review").length,
    [visibleBooks]
  );

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

  const selectBooksWithoutLocation = () => {
    replaceSelection(
      visibleBooks.filter((book) => !book.shelfLocation?.trim()).map((book) => book.id)
    );
  };

  const selectBooksNeedingReview = () => {
    replaceSelection(
      visibleBooks
        .filter((book) => book.status === "needs_review")
        .map((book) => book.id)
    );
  };

  const selectAllVisibleBooks = () => {
    replaceSelection(visibleBooks.map((book) => book.id));
  };

  const updateBookQuickly = async (
    book: Book,
    changes: Partial<Pick<Book, "status" | "shelfLocation">>
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

  const handleQuickStatusSelect = async (book: Book, status: BookStatus) => {
    await updateBookQuickly(book, { status });
  };

  const handleQuickLocationSave = async (book: Book, location?: string) => {
    await updateBookQuickly(book, {
      shelfLocation: location?.trim() || undefined
    });
  };

  const applyBatchChanges = async (
    changes: Partial<Pick<Book, "status" | "shelfLocation">>,
    actionMessage: string
  ) => {
    const selectedIds = [...selectedBookIdsRef.current];

    if (!selectedIds.length) {
      return;
    }

    setIsApplyingBatch(true);
    setBatchActionMessage(actionMessage);

    try {
      await applyBatchUpdate(selectedIds, changes);
      clearSelection();
    } finally {
      setIsApplyingBatch(false);
      setBatchActionMessage(null);
    }
  };

  const handleBatchStatusApply = async (status: BookStatus) => {
    const statusLabel =
      STATUS_OPTIONS.find((option) => option.key === status)?.label ?? status;

    await applyBatchChanges(
      { status },
      appText.library.batchApplyingStatus(statusLabel)
    );
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

  if (selectedBook || isCreating) {
    return (
      <BookEditorScreen
        book={selectedBook}
        onBack={closeEditor}
        onSaved={closeEditor}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[1]}
      keyboardShouldPersistTaps="handled"
    >
      <SectionCard
        title={appText.library.title}
        subtitle={
          isLoading
            ? appText.library.loading
            : appText.library.countLabel(books.length)
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
        {!isSelectionMode ? (
          <Text style={styles.selectionHint}>{appText.library.batchModeHint}</Text>
        ) : null}
      </SectionCard>

      <View style={styles.stickyWrap}>
        <View style={styles.stickyBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={appText.library.searchPlaceholder}
            placeholderTextColor="#9a8a76"
            style={styles.searchInput}
          />

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

          <View style={styles.visibleStatsRow}>
            <Pressable
              onPress={selectBooksWithoutLocation}
              style={({ pressed }) => [
                styles.visibleStatChip,
                pressed ? styles.visibleStatChipPressed : null
              ]}
            >
              <Text style={styles.visibleStatLabel}>
                {appText.library.visibleWithoutLocationLabel(visibleWithoutLocationCount)}
              </Text>
            </Pressable>
            <View style={styles.visibleStatChip}>
              <Text style={styles.visibleStatLabel}>
                {appText.library.visibleNeedsReviewLabel(visibleNeedsReviewCount)}
              </Text>
            </View>
          </View>

          {isSelectionMode ? (
            <View style={styles.batchPanel}>
              <Text style={styles.batchCount}>
                {appText.library.batchSelectedLabel(selectedBookIds.length)}
              </Text>
              {batchActionMessage ? (
                <View style={styles.batchMessage}>
                  <Text style={styles.batchMessageLabel}>{batchActionMessage}</Text>
                </View>
              ) : null}
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
                  onPress={selectBooksWithoutLocation}
                  style={({ pressed }) => [
                    styles.batchShortcutChip,
                    pressed ? styles.batchChipPressed : null,
                    isApplyingBatch ? styles.batchChipDisabled : null
                  ]}
                  disabled={isApplyingBatch}
                >
                  <Text style={styles.batchShortcutLabel}>
                    {appText.library.selectNoLocation}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={selectBooksNeedingReview}
                  style={({ pressed }) => [
                    styles.batchShortcutChip,
                    pressed ? styles.batchChipPressed : null,
                    isApplyingBatch ? styles.batchChipDisabled : null
                  ]}
                  disabled={isApplyingBatch}
                >
                  <Text style={styles.batchShortcutLabel}>
                    {appText.library.selectNeedsReview}
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

              <View style={styles.batchBlock}>
                <Text style={styles.batchTitle}>{appText.library.batchStatusTitle}</Text>
                <View style={styles.batchOptions}>
                  {STATUS_OPTIONS.map((option) => (
                    <Pressable
                      key={option.key}
                      onPress={() => {
                        void handleBatchStatusApply(option.key);
                      }}
                      disabled={isApplyingBatch}
                      style={({ pressed }) => [
                        styles.batchOptionChip,
                        pressed ? styles.batchOptionChipPressed : null,
                        isApplyingBatch ? styles.batchChipDisabled : null
                      ]}
                    >
                      <Text style={styles.batchOptionLabel}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.batchBlock}>
                <Text style={styles.batchTitle}>{appText.library.batchLocationTitle}</Text>
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
                  <View style={styles.batchAction}>
                    <PrimaryButton
                      label={appText.library.batchClearLocation}
                      onPress={() => {
                        void handleBatchLocationApply(undefined);
                      }}
                      disabled={isApplyingBatch}
                      compact
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.list}>
        {visibleBooks.length ? (
          visibleBooks.map((book) => (
            <BookListItem
              key={book.id}
              book={book}
              isDuplicate={duplicateBookIds.has(book.id)}
              isSelectable={isSelectionMode}
              isSelected={selectedBookIdSet.has(book.id)}
              onPress={() => setSelectedBookId(book.id)}
              onTitleLongPress={() => enterSelectionMode(book.id)}
              onToggleSelection={() => toggleSelection(book.id)}
              quickEditMode={
                !isSelectionMode && quickEditBookId === book.id ? quickEditMode : null
              }
              isUpdating={updatingBookId === book.id}
              locationOptions={locationOptions.filter(
                (location) => location !== book.shelfLocation
              )}
              onToggleQuickEdit={(mode) => handleQuickEditToggle(book.id, mode)}
              onQuickStatusSelect={(status) => {
                void handleQuickStatusSelect(book, status);
              }}
              onQuickLocationSave={(location) => {
                void handleQuickLocationSave(book, location);
              }}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{appText.library.emptyTitle}</Text>
            <Text style={styles.emptyText}>{appText.library.emptyDescription}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
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
  stickyWrap: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 2,
    backgroundColor: "#f3efe7"
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
  batchShortcutLabel: {
    color: "#6c5232",
    fontSize: 12,
    fontWeight: "700"
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
  visibleStatChipPressed: {
    opacity: 0.82
  },
  visibleStatLabel: {
    color: "#6b5640",
    fontSize: 12,
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
  list: {
    gap: 6
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
  }
});
