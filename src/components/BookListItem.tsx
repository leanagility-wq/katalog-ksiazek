import { Pressable, StyleSheet, Text, View } from "react-native";

import { Book } from "@/types/book";

interface BookListItemProps {
  book: Book;
  onPress?: () => void;
}

const STATUS_LABELS: Record<Book["status"], string> = {
  available: "Dostepna",
  borrowed: "Pozyczona",
  for_sale: "Na sprzedaz",
  sold: "Sprzedana",
  needs_review: "Do poprawy"
};

export function BookListItem({ book, onPress }: BookListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{STATUS_LABELS[book.status]}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{book.title || "Bez tytulu"}</Text>
        <Text style={styles.meta}>{book.author || "Autor do uzupelnienia"}</Text>
        <View style={styles.metaRow}>
          {book.shelfLocation ? (
            <Text style={styles.metaPill}>{book.shelfLocation}</Text>
          ) : null}
          {book.isbn ? <Text style={styles.metaPill}>ISBN {book.isbn}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee2cf",
    backgroundColor: "#fffdf8"
  },
  rowPressed: {
    opacity: 0.9
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  badge: {
    backgroundColor: "#efe4ce",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeText: {
    fontSize: 11,
    textTransform: "uppercase",
    color: "#6d5636",
    fontWeight: "700"
  },
  arrow: {
    fontSize: 20,
    lineHeight: 20,
    color: "#94785a"
  },
  copy: {
    gap: 6
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2d2419"
  },
  meta: {
    fontSize: 13,
    color: "#6f5a42"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#f4ede2",
    color: "#6b5640",
    fontSize: 12,
    overflow: "hidden"
  }
});
