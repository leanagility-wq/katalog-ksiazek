import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import {
  RemoteBookMatch,
  searchBooksOnline
} from "@/features/catalog/bookLookupService";
import { useLibraryStore } from "@/store/useLibraryStore";
import { Book, BookStatus } from "@/types/book";

type BookDraft = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  shelfLocation: string;
  ocrText: string;
  price: string;
  borrowedTo: string;
  notes: string;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
};

interface BookEditorScreenProps {
  book?: Book | null;
  onBack: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: Array<{ key: BookStatus; label: string }> = [
  { key: "available", label: "Dostepna" },
  { key: "borrowed", label: "Pozyczona" },
  { key: "for_sale", label: "Na sprzedaz" },
  { key: "sold", label: "Sprzedana" },
  { key: "needs_review", label: "Do poprawy" }
];

function createId() {
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDraft(book?: Book | null): BookDraft {
  const timestamp = new Date().toISOString();

  if (!book) {
    return {
      id: createId(),
      title: "",
      author: "",
      isbn: "",
      shelfLocation: "",
      ocrText: "",
      price: "",
      borrowedTo: "",
      notes: "",
      status: "available",
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn ?? "",
    shelfLocation: book.shelfLocation ?? "",
    ocrText: book.ocrText,
    price: book.price != null ? String(book.price) : "",
    borrowedTo: book.borrowedTo ?? "",
    notes: book.notes ?? "",
    status: book.status,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt
  };
}

function toBook(draft: BookDraft): Book {
  const parsedPrice = draft.price.trim() ? Number(draft.price.replace(",", ".")) : undefined;

  return {
    id: draft.id,
    title: draft.title.trim(),
    author: draft.author.trim(),
    isbn: draft.isbn.trim() || undefined,
    shelfLocation: draft.shelfLocation.trim() || undefined,
    ocrText: draft.ocrText.trim(),
    price: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
    borrowedTo: draft.borrowedTo.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    status: draft.status,
    createdAt: draft.createdAt,
    updatedAt: new Date().toISOString()
  };
}

export function BookEditorScreen({
  book,
  onBack,
  onSaved
}: BookEditorScreenProps) {
  const [draft, setDraft] = useState<BookDraft>(() => createDraft(book));
  const [searchResults, setSearchResults] = useState<RemoteBookMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { saveBook, deleteBook } = useLibraryStore();

  useEffect(() => {
    setDraft(createDraft(book));
    setSearchResults([]);
    setSearchError(null);
  }, [book]);

  const screenTitle = useMemo(
    () => (book ? "Edytuj ksiazke" : "Dodaj ksiazke"),
    [book]
  );

  const updateDraft = <K extends keyof BookDraft>(key: K, value: BookDraft[K]) => {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchBooksOnline(draft.title, draft.author);
      setSearchResults(results);

      if (!results.length) {
        setSearchError("Nie znaleziono podobnych tytulow.");
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Nie udalo sie pobrac wynikow."
      );
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const applySearchResult = (result: RemoteBookMatch) => {
    setDraft((current) => ({
      ...current,
      title: result.title || current.title,
      author: result.author || current.author,
      isbn: result.isbn ?? current.isbn
    }));
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      Alert.alert("Brakuje tytulu", "Uzupelnij tytul przed zapisem.");
      return;
    }

    setIsSaving(true);

    try {
      await saveBook(toBook(draft));
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!book) {
      onBack();
      return;
    }

    Alert.alert("Usunac ksiazke?", "Ta operacja usunie wpis z katalogu.", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usun",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);

          try {
            await deleteBook(book.id);
            onSaved();
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={screenTitle}
        subtitle={"Uzupelnij dane recznie albo podpowiedz je wyszukiwaniem online."}
      >
        <View style={styles.topActions}>
          <Pressable onPress={onBack} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Wroc</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            disabled={isDeleting}
            style={[styles.secondaryButton, styles.dangerButton]}
          >
            <Text style={[styles.secondaryButtonLabel, styles.dangerButtonLabel]}>
              {book ? (isDeleting ? "Usuwanie..." : "Usun") : "Anuluj"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Field
            label="Tytul"
            value={draft.title}
            onChangeText={(value) => updateDraft("title", value)}
            placeholder="Np. Lalka"
          />
          <Field
            label="Autor"
            value={draft.author}
            onChangeText={(value) => updateDraft("author", value)}
            placeholder="Np. Boleslaw Prus"
          />
          <View style={styles.inlineActions}>
            <PrimaryButton
              label={isSearching ? "Szukam..." : "Wyszukaj w sieci"}
              onPress={() => {
                void handleSearch();
              }}
              disabled={isSearching}
            />
          </View>
          {searchError ? <Text style={styles.helperError}>{searchError}</Text> : null}
          {searchResults.length ? (
            <View style={styles.searchResults}>
              {searchResults.map((result) => (
                <Pressable
                  key={result.key}
                  onPress={() => applySearchResult(result)}
                  style={styles.resultCard}
                >
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  <Text style={styles.resultMeta}>{result.author}</Text>
                  <Text style={styles.resultMeta}>
                    {result.publishYear
                      ? `Pierwsze wydanie: ${result.publishYear}`
                      : "Rok wydania nieznany"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Field
            label="ISBN"
            value={draft.isbn}
            onChangeText={(value) => updateDraft("isbn", value)}
            placeholder="Opcjonalnie"
          />
          <Field
            label="Lokalizacja"
            value={draft.shelfLocation}
            onChangeText={(value) => updateDraft("shelfLocation", value)}
            placeholder="Np. Salon / Polka A"
          />
          <Field
            label="Cena"
            value={draft.price}
            onChangeText={(value) => updateDraft("price", value)}
            placeholder="Np. 24.99"
            keyboardType="decimal-pad"
          />
          <Field
            label="Pozyczona komu"
            value={draft.borrowedTo}
            onChangeText={(value) => updateDraft("borrowedTo", value)}
            placeholder="Opcjonalnie"
          />
          <Field
            label="OCR / tekst z grzbietu"
            value={draft.ocrText}
            onChangeText={(value) => updateDraft("ocrText", value)}
            placeholder="Surowy tekst ze skanu"
            multiline
          />
          <Field
            label="Notatki"
            value={draft.notes}
            onChangeText={(value) => updateDraft("notes", value)}
            placeholder="Stan, uwagi, komplet serii..."
            multiline
          />
          <View style={styles.statusBlock}>
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map((option) => {
                const isActive = draft.status === option.key;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => updateDraft("status", option.key)}
                    style={[styles.statusChip, isActive ? styles.statusChipActive : null]}
                  >
                    <Text
                      style={[
                        styles.statusChipLabel,
                        isActive ? styles.statusChipLabelActive : null
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <PrimaryButton
            label={isSaving ? "Zapisywanie..." : "Zapisz w katalogu"}
            onPress={() => {
              void handleSave();
            }}
            disabled={isSaving}
          />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
}

function Field({
  label,
  value,
  placeholder,
  keyboardType = "default",
  multiline = false,
  onChangeText
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9a8a76"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18
  },
  topActions: {
    flexDirection: "row",
    gap: 10
  },
  form: {
    gap: 14
  },
  field: {
    gap: 6
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#56402b"
  },
  input: {
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
  inputMultiline: {
    minHeight: 96
  },
  inlineActions: {
    paddingTop: 2
  },
  helperError: {
    color: "#8f2f2f",
    fontSize: 13,
    lineHeight: 19
  },
  searchResults: {
    gap: 8
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eadfce",
    backgroundColor: "#f9f3ea",
    padding: 12,
    gap: 4
  },
  resultTitle: {
    color: "#2f2418",
    fontSize: 15,
    fontWeight: "700"
  },
  resultMeta: {
    color: "#6e5a43",
    fontSize: 13
  },
  statusBlock: {
    gap: 8
  },
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eee2cf"
  },
  statusChipActive: {
    backgroundColor: "#704d2e"
  },
  statusChipLabel: {
    color: "#6d5636",
    fontSize: 13,
    fontWeight: "700"
  },
  statusChipLabelActive: {
    color: "#fff8ee"
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede2d0"
  },
  secondaryButtonLabel: {
    color: "#5c4833",
    fontWeight: "700",
    fontSize: 14
  },
  dangerButton: {
    backgroundColor: "#f8dfdc"
  },
  dangerButtonLabel: {
    color: "#8b3028"
  }
});
