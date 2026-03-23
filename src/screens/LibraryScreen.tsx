import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
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
import { BookEditorScreen } from "@/screens/BookEditorScreen";
import { useLibraryStore } from "@/store/useLibraryStore";

interface LibraryScreenProps {
  onStartScan: () => void;
}

export function LibraryScreen({ onStartScan }: LibraryScreenProps) {
  const { books, isLoading, errorMessage } = useLibraryStore();
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");
  const [query, setQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId]
  );

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

  const closeEditor = () => {
    setSelectedBookId(null);
    setIsCreating(false);
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
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={appText.library.title}
        subtitle={
          isLoading
            ? appText.library.loading
            : appText.library.countLabel(books.length)
        }
      >
        <View style={styles.heroActions}>
          <View style={styles.heroAction}>
            <PrimaryButton
              label={appText.library.scanButton}
              onPress={onStartScan}
            />
          </View>
          <View style={styles.heroAction}>
            <PrimaryButton
              label={appText.library.addManualButton}
              onPress={() => {
                setIsCreating(true);
              }}
            />
          </View>
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </SectionCard>

      <SectionCard
        title={appText.library.browseTitle}
        subtitle={appText.library.browseSubtitle}
      >
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
        <View style={styles.list}>
          {visibleBooks.length ? (
            visibleBooks.map((book) => (
              <BookListItem
                key={book.id}
                book={book}
                onPress={() => setSelectedBookId(book.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{appText.library.emptyTitle}</Text>
              <Text style={styles.emptyText}>{appText.library.emptyDescription}</Text>
            </View>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title={appText.library.guideTitle}
        subtitle={appText.library.guideSubtitle}
      >
        {appText.library.guideSteps.map((step) => (
          <Text key={step} style={styles.listItem}>
            {step}
          </Text>
        ))}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 12
  },
  heroActions: {
    flexDirection: "row",
    gap: 10
  },
  heroAction: {
    flex: 1
  },
  searchInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1d4bf",
    backgroundColor: "#fffdf8",
    color: "#2d2419",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eee2cf"
  },
  sortChipActive: {
    backgroundColor: "#704d2e"
  },
  sortChipLabel: {
    color: "#6d5636",
    fontSize: 13,
    fontWeight: "700"
  },
  sortChipLabelActive: {
    color: "#fff8ee"
  },
  list: {
    gap: 8
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
  listItem: {
    color: "#4c3926",
    fontSize: 15,
    lineHeight: 22
  },
  error: {
    color: "#8f2f2f",
    lineHeight: 22
  }
});
