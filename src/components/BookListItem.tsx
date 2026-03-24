import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  STATUS_LABELS,
  STATUS_OPTIONS,
  STATUS_STYLES
} from "@/config/bookUi";
import { PrimaryButton } from "@/components/PrimaryButton";
import { normalizeGenreLabel } from "@/features/catalog/genreCatalog";
import { Book, BookStatus } from "@/types/book";

type QuickEditMode = "status" | "location" | "genre" | null;

interface BookListItemProps {
  book: Book;
  isDuplicate?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onTitleLongPress?: () => void;
  onToggleSelection?: () => void;
  quickEditMode?: QuickEditMode;
  isUpdating?: boolean;
  locationOptions: string[];
  genreOptions: string[];
  onToggleQuickEdit: (mode: Exclude<QuickEditMode, null>) => void;
  onQuickStatusSelect: (status: BookStatus) => void;
  onQuickLocationSave: (location?: string) => void;
  onQuickGenreSave: (genre?: string) => void;
  onDeletePress?: () => void;
}

export function BookListItem({
  book,
  isDuplicate = false,
  isSelectable = false,
  isSelected = false,
  onPress,
  onTitleLongPress,
  onToggleSelection,
  quickEditMode = null,
  isUpdating = false,
  locationOptions,
  genreOptions,
  onToggleQuickEdit,
  onQuickStatusSelect,
  onQuickLocationSave,
  onQuickGenreSave,
  onDeletePress
}: BookListItemProps) {
  const statusStyle = STATUS_STYLES[book.status];
  const bookGenre = normalizeGenreLabel(book.genre);
  const [locationDraft, setLocationDraft] = useState(book.shelfLocation ?? "");
  const [genreDraft, setGenreDraft] = useState(bookGenre ?? "");

  useEffect(() => {
    setLocationDraft(book.shelfLocation ?? "");
    setGenreDraft(bookGenre ?? "");
  }, [book.shelfLocation, bookGenre, quickEditMode]);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={isSelectable ? onToggleSelection : undefined}
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      >
        <View style={styles.mainRow}>
          {isSelectable ? (
            <Pressable onPress={onToggleSelection} style={styles.checkboxWrap}>
              <View style={[styles.checkbox, isSelected ? styles.checkboxActive : null]}>
                {isSelected ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
            </Pressable>
          ) : null}

          <View style={styles.copy}>
            <Pressable
              onPress={isSelectable ? onToggleSelection : onPress}
              onLongPress={onTitleLongPress}
              delayLongPress={260}
            >
              <Text numberOfLines={1} style={styles.title}>
                {book.title || "Bez tytułu"}
              </Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.meta}>
              {book.author || "Autor do uzupełnienia"}
            </Text>

            {isDuplicate ? (
              <View style={styles.duplicatePill}>
                <Text style={styles.duplicatePillText}>Możliwy duplikat</Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Pressable
                onPress={() => onToggleQuickEdit("location")}
                disabled={isSelectable}
                style={styles.metaPill}
              >
                <Text numberOfLines={1} style={styles.metaPillText}>
                  {book.shelfLocation || "Dodaj lokalizację"}
                </Text>
              </Pressable>

              {bookGenre ? (
                <Pressable
                  onPress={() => onToggleQuickEdit("genre")}
                  disabled={isSelectable}
                  style={styles.metaPill}
                >
                  <Text numberOfLines={1} style={styles.metaPillText}>
                    {bookGenre}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.sideColumn}>
            <Pressable
              onPress={() => onToggleQuickEdit("status")}
              disabled={isSelectable}
              style={[
                styles.badge,
                { backgroundColor: statusStyle.backgroundColor }
              ]}
            >
              <Text style={[styles.badgeText, { color: statusStyle.textColor }]}>
                {STATUS_LABELS[book.status]}
              </Text>
            </Pressable>

            {!isSelectable ? (
              <View style={styles.sideActions}>
                <Pressable onPress={onDeletePress} style={styles.deleteAction}>
                  <Text style={styles.deleteActionLabel}>Usuń</Text>
                </Pressable>
                <Pressable onPress={onPress} style={styles.arrowPressable}>
                  <Text style={styles.arrow}>{">"}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>

      {quickEditMode === "status" && !isSelectable ? (
        <View style={styles.quickPanel}>
          <Text style={styles.quickTitle}>Zmień status</Text>
          <View style={styles.quickOptions}>
            {STATUS_OPTIONS.map((option) => {
              const isActive = option.key === book.status;
              const optionStyle = STATUS_STYLES[option.key];

              return (
                <Pressable
                  key={option.key}
                  onPress={() => onQuickStatusSelect(option.key)}
                  disabled={isUpdating}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: isActive
                        ? optionStyle.backgroundColor
                        : "#f2ebdf",
                      borderColor: isActive ? optionStyle.textColor : "#e5d8c3"
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: isActive ? optionStyle.textColor : "#6e5a43" }
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {quickEditMode === "location" && !isSelectable ? (
        <View style={styles.quickPanel}>
          <Text style={styles.quickTitle}>Zmień lokalizację</Text>
          {locationOptions.length ? (
            <View style={styles.quickOptions}>
              {locationOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => onQuickLocationSave(option)}
                  disabled={isUpdating}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <TextInput
            value={locationDraft}
            onChangeText={setLocationDraft}
            placeholder="Wpisz nową lokalizację"
            placeholderTextColor="#9a8a76"
            style={styles.locationInput}
          />
          <View style={styles.quickActions}>
            <View style={styles.quickAction}>
              <PrimaryButton
                label={isUpdating ? "Zapisywanie..." : "Zapisz"}
                onPress={() => onQuickLocationSave(locationDraft.trim() || undefined)}
                disabled={isUpdating}
                compact
              />
            </View>
            <View style={styles.quickAction}>
              <PrimaryButton
                label="Wyczyść"
                onPress={() => onQuickLocationSave(undefined)}
                disabled={isUpdating}
                compact
              />
            </View>
          </View>
        </View>
      ) : null}

      {quickEditMode === "genre" && !isSelectable ? (
        <View style={styles.quickPanel}>
          <Text style={styles.quickTitle}>Zmień gatunek</Text>
          {genreOptions.length ? (
            <View style={styles.quickOptions}>
              {genreOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => onQuickGenreSave(option)}
                  disabled={isUpdating}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <TextInput
            value={genreDraft}
            onChangeText={setGenreDraft}
            placeholder="Wpisz gatunek"
            placeholderTextColor="#9a8a76"
            style={styles.locationInput}
          />
          <View style={styles.quickActions}>
            <View style={styles.quickAction}>
              <PrimaryButton
                label={isUpdating ? "Zapisywanie..." : "Zapisz"}
                onPress={() => onQuickGenreSave(genreDraft.trim() || undefined)}
                disabled={isUpdating}
                compact
              />
            </View>
            <View style={styles.quickAction}>
              <PrimaryButton
                label="Wyczyść"
                onPress={() => onQuickGenreSave(undefined)}
                disabled={isUpdating}
                compact
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee2cf",
    backgroundColor: "#fffdf8"
  },
  rowPressed: {
    opacity: 0.9
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  checkboxWrap: {
    paddingTop: 2
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#ceb99a",
    backgroundColor: "#fffaf2",
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxActive: {
    backgroundColor: "#704d2e",
    borderColor: "#704d2e"
  },
  checkboxTick: {
    color: "#fffaf2",
    fontSize: 14,
    fontWeight: "800"
  },
  sideColumn: {
    alignItems: "flex-end",
    gap: 8
  },
  sideActions: {
    alignItems: "flex-end",
    gap: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999
  },
  badgeText: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "800"
  },
  deleteAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f8dfdc"
  },
  deleteActionLabel: {
    color: "#8b3028",
    fontSize: 11,
    fontWeight: "700"
  },
  arrowPressable: {
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  arrow: {
    fontSize: 20,
    lineHeight: 20,
    color: "#94785a"
  },
  copy: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2d2419"
  },
  meta: {
    fontSize: 12,
    color: "#6f5a42"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  duplicatePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f8ddce"
  },
  duplicatePillText: {
    color: "#8a3c18",
    fontSize: 11,
    fontWeight: "800"
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f4ede2"
  },
  metaPillText: {
    color: "#6b5640",
    fontSize: 11
  },
  quickPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eadfce",
    backgroundColor: "#fbf5ec",
    padding: 10,
    gap: 8
  },
  quickTitle: {
    color: "#4b3927",
    fontSize: 12,
    fontWeight: "700"
  },
  quickOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5d8c3",
    backgroundColor: "#f2ebdf"
  },
  quickChipText: {
    color: "#6e5a43",
    fontSize: 12,
    fontWeight: "700"
  },
  locationInput: {
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
  quickActions: {
    flexDirection: "row",
    gap: 8
  },
  quickAction: {
    flex: 1
  }
});
