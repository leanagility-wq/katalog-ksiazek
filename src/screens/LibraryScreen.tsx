import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { BookListItem } from "@/components/BookListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { BookEditorScreen } from "@/screens/BookEditorScreen";
import { useLibraryStore } from "@/store/useLibraryStore";

type SortKey = "updated_desc" | "title_asc" | "author_asc" | "status_asc";

interface LibraryScreenProps {
  onStartScan: () => void;
}

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "updated_desc", label: "Ostatnio zmienione" },
  { key: "title_asc", label: "Tytuł A-Z" },
  { key: "author_asc", label: "Autor A-Z" },
  { key: "status_asc", label: "Status" }
];

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
        title="Katalog"
        subtitle={
          isLoading ? "Ładowanie biblioteki..." : `Pozycji w katalogu: ${books.length}`
        }
      >
        <View style={styles.heroActions}>
          <View style={styles.heroAction}>
            <PrimaryButton label="Zeskanuj nową półkę" onPress={onStartScan} />
          </View>
          <View style={styles.heroAction}>
            <PrimaryButton
              label="Dodaj ręcznie"
              onPress={() => {
                setIsCreating(true);
              }}
            />
          </View>
        </View>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </SectionCard>

      <SectionCard
        title="Przeglądaj i poprawiaj"
        subtitle="Otwórz książkę, aby dopisać dane, wyszukać metadane online albo usunąć wpis."
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Szukaj po tytule, autorze, ISBN albo lokalizacji"
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
              <Text style={styles.emptyTitle}>Nie ma jeszcze pasujących książek.</Text>
              <Text style={styles.emptyText}>
                Zeskanuj półkę albo dodaj tytuł ręcznie, a potem uzupełnij
                szczegóły z sieci.
              </Text>
            </View>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="Jak to działa"
        subtitle="Najwygodniejszy sposób pracy z katalogiem na telefonie."
      >
        <Text style={styles.listItem}>1. Zeskanuj półkę albo dodaj książkę ręcznie.</Text>
        <Text style={styles.listItem}>
          2. Otwórz wpis i popraw tytuł, autora, lokalizację albo status.
        </Text>
        <Text style={styles.listItem}>
          3. Użyj przycisku "Wyszukaj w sieci", gdy chcesz dobrać ISBN lub lepsze
          metadane.
        </Text>
        <Text style={styles.listItem}>
          4. W razie potrzeby usuń wpis jednym przyciskiem z poziomu edycji.
        </Text>
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
