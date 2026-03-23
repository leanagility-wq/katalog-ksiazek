import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  STATUS_LABELS,
  STATUS_OPTIONS,
  STATUS_STYLES
} from "@/config/bookUi";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Book, BookStatus } from "@/types/book";

type QuickEditMode = "status" | "location" | null;

interface BookListItemProps {
  book: Book;
  onPress?: () => void;
  quickEditMode?: QuickEditMode;
  isUpdating?: boolean;
  locationOptions: string[];
  onToggleQuickEdit: (mode: Exclude<QuickEditMode, null>) => void;
  onQuickStatusSelect: (status: BookStatus) => void;
  onQuickLocationSave: (location?: string) => void;
}

export function BookListItem({
  book,
  onPress,
  quickEditMode = null,
  isUpdating = false,
  locationOptions,
  onToggleQuickEdit,
  onQuickStatusSelect,
  onQuickLocationSave
}: BookListItemProps) {
  const statusStyle = STATUS_STYLES[book.status];
  const [locationDraft, setLocationDraft] = useState(book.shelfLocation ?? "");

  useEffect(() => {
    setLocationDraft(book.shelfLocation ?? "");
  }, [book.shelfLocation, quickEditMode]);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      >
        <View style={styles.mainRow}>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>
              {book.title || "Bez tytułu"}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {book.author || "Autor do uzupełnienia"}
            </Text>
            <View style={styles.metaRow}>
              <Pressable
                onPress={() => onToggleQuickEdit("location")}
                style={styles.metaPill}
              >
                <Text numberOfLines={1} style={styles.metaPillText}>
                  {book.shelfLocation || "Dodaj lokalizację"}
                </Text>
              </Pressable>
              {book.isbn ? (
                <Text numberOfLines={1} style={styles.metaPill}>
                  <Text style={styles.metaPillText}>ISBN {book.isbn}</Text>
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.sideColumn}>
            <Pressable
              onPress={() => onToggleQuickEdit("status")}
              style={[
                styles.badge,
                { backgroundColor: statusStyle.backgroundColor }
              ]}
            >
              <Text style={[styles.badgeText, { color: statusStyle.textColor }]}>
                {STATUS_LABELS[book.status]}
              </Text>
            </Pressable>
            <Text style={styles.arrow}>{">"}</Text>
          </View>
        </View>
      </Pressable>

      {quickEditMode === "status" ? (
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

      {quickEditMode === "location" ? (
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
  sideColumn: {
    alignItems: "flex-end",
    gap: 10
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
