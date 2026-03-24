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

import { STATUS_OPTIONS } from "@/config/bookUi";
import { DuplicateResolutionSheet } from "@/components/DuplicateResolutionSheet";
import { appText } from "@/config/uiText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import {
  DuplicateConflictError,
  DuplicateMatch,
  DuplicateSaveResolution
} from "@/features/catalog/duplicateDetection";
import {
  RemoteBookMatch,
  searchBooksOnline
} from "@/features/catalog/bookLookupService";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSettingsStore } from "@/store/useSettingsStore";
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
  const parsedPrice = draft.price.trim()
    ? Number(draft.price.replace(",", "."))
    : undefined;

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
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    candidateBook: Book;
    matches: DuplicateMatch[];
  } | null>(null);
  const { saveBook, deleteBook } = useLibraryStore();
  const { savedLocations } = useSettingsStore();

  useEffect(() => {
    setDraft(createDraft(book));
    setSearchResults([]);
    setSearchError(null);
    setPendingDuplicate(null);
  }, [book]);

  const screenTitle = useMemo(
    () => (book ? appText.editor.editTitle : appText.editor.createTitle),
    [book]
  );

  const updateDraft = <K extends keyof BookDraft>(
    key: K,
    value: BookDraft[K]
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchBooksOnline(
        draft.title,
        draft.author,
        draft.isbn
      );
      setSearchResults(results);

      if (!results.length) {
        setSearchError(appText.editor.noResults);
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : appText.editor.fetchError
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

  const persistBook = async (candidateBook: Book, resolution?: DuplicateSaveResolution) => {
    await saveBook(candidateBook, resolution);
    setPendingDuplicate(null);
    onSaved();
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      Alert.alert(
        appText.editor.missingTitleAlertTitle,
        appText.editor.missingTitleAlertDescription
      );
      return;
    }

    setIsSaving(true);
    const candidateBook = toBook(draft);

    try {
      await persistBook(candidateBook);
    } catch (error) {
      if (error instanceof DuplicateConflictError) {
        setPendingDuplicate({
          candidateBook,
          matches: error.matches
        });
      } else {
        Alert.alert(
          appText.editor.saveErrorTitle,
          error instanceof Error ? error.message : appText.editor.retryLabel
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateResolution = async (resolution: DuplicateSaveResolution) => {
    if (!pendingDuplicate) {
      return;
    }

    setIsSaving(true);

    try {
      await persistBook(pendingDuplicate.candidateBook, resolution);
    } catch (error) {
      Alert.alert(
        appText.editor.saveErrorTitle,
        error instanceof Error ? error.message : appText.editor.retryLabel
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!book) {
      onBack();
      return;
    }

    Alert.alert(
      appText.editor.deleteConfirmTitle,
      appText.editor.deleteConfirmDescription,
      [
        { text: appText.editor.cancelButton, style: "cancel" },
        {
          text: appText.editor.deleteButton,
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);

            try {
              await deleteBook(book.id);
              onSaved();
            } catch (error) {
              Alert.alert(
                appText.editor.deleteErrorTitle,
                error instanceof Error ? error.message : appText.editor.retryLabel
              );
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard title={screenTitle} subtitle={appText.editor.subtitle}>
        <View style={styles.topActions}>
          <Pressable onPress={onBack} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>{appText.editor.backButton}</Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            disabled={isDeleting}
            style={[styles.secondaryButton, styles.dangerButton]}
          >
            <Text
              style={[styles.secondaryButtonLabel, styles.dangerButtonLabel]}
            >
              {book
                ? isDeleting
                  ? appText.editor.deletingButton
                  : appText.editor.deleteButton
                : appText.editor.cancelButton}
            </Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Field
            label={appText.editor.fields.title}
            value={draft.title}
            onChangeText={(value) => updateDraft("title", value)}
            placeholder={appText.editor.fields.titlePlaceholder}
          />
          <Field
            label={appText.editor.fields.author}
            value={draft.author}
            onChangeText={(value) => updateDraft("author", value)}
            placeholder={appText.editor.fields.authorPlaceholder}
          />
          <View style={styles.inlineActions}>
            <PrimaryButton
              label={
                isSearching
                  ? appText.editor.searchingButton
                  : appText.editor.searchButton
              }
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
                      ? appText.editor.firstEditionLabel(result.publishYear)
                      : appText.editor.unknownEditionLabel}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Field
            label={appText.editor.fields.isbn}
            value={draft.isbn}
            onChangeText={(value) => updateDraft("isbn", value)}
            placeholder={appText.editor.fields.optionalPlaceholder}
          />
          <Field
            label={appText.editor.fields.location}
            value={draft.shelfLocation}
            onChangeText={(value) => updateDraft("shelfLocation", value)}
            placeholder={appText.editor.fields.locationPlaceholder}
          />
          {savedLocations.length ? (
            <View style={styles.locationSuggestions}>
              {savedLocations.map((location) => (
                <Pressable
                  key={location}
                  onPress={() => updateDraft("shelfLocation", location)}
                  style={styles.locationChip}
                >
                  <Text style={styles.locationChipLabel}>{location}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Field
            label={appText.editor.fields.price}
            value={draft.price}
            onChangeText={(value) => updateDraft("price", value)}
            placeholder={appText.editor.fields.pricePlaceholder}
            keyboardType="decimal-pad"
          />
          <Field
            label={appText.editor.fields.borrowedTo}
            value={draft.borrowedTo}
            onChangeText={(value) => updateDraft("borrowedTo", value)}
            placeholder={appText.editor.fields.optionalPlaceholder}
          />
          <Field
            label={appText.editor.fields.ocrText}
            value={draft.ocrText}
            onChangeText={(value) => updateDraft("ocrText", value)}
            placeholder={appText.editor.fields.ocrTextPlaceholder}
            multiline
          />
          <Field
            label={appText.editor.fields.notes}
            value={draft.notes}
            onChangeText={(value) => updateDraft("notes", value)}
            placeholder={appText.editor.fields.notesPlaceholder}
            multiline
          />
          <View style={styles.statusBlock}>
            <Text style={styles.fieldLabel}>{appText.editor.fields.status}</Text>
            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map((option) => {
                const isActive = draft.status === option.key;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => updateDraft("status", option.key)}
                    style={[
                      styles.statusChip,
                      isActive ? styles.statusChipActive : null
                    ]}
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
            label={
              isSaving ? appText.editor.savingButton : appText.editor.saveButton
            }
            onPress={() => {
              void handleSave();
            }}
            disabled={isSaving}
          />
        </View>
        </SectionCard>
      </ScrollView>
      <DuplicateResolutionSheet
        visible={Boolean(pendingDuplicate)}
        candidateBook={pendingDuplicate?.candidateBook ?? null}
        matches={pendingDuplicate?.matches ?? []}
        onOverwrite={(targetBookId) => {
          void handleDuplicateResolution({ mode: "overwrite", targetBookId });
        }}
        onSaveCopy={() => {
          void handleDuplicateResolution({ mode: "save_as_copy" });
        }}
        onReject={() => {
          setPendingDuplicate(null);
        }}
        onCancel={() => {
          setPendingDuplicate(null);
        }}
      />
    </>
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
  locationSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -6
  },
  locationChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f2ebdf",
    borderWidth: 1,
    borderColor: "#e5d8c3"
  },
  locationChipLabel: {
    color: "#6e5a43",
    fontSize: 12,
    fontWeight: "700"
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
