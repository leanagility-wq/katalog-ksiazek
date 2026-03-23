import { Pressable, StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS, STATUS_STYLES } from "@/config/bookUi";
import { Book } from "@/types/book";

interface BookListItemProps {
  book: Book;
  onPress?: () => void;
}

export function BookListItem({ book, onPress }: BookListItemProps) {
  const statusStyle = STATUS_STYLES[book.status];

  return (
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
            {book.shelfLocation ? (
              <Text numberOfLines={1} style={styles.metaPill}>
                {book.shelfLocation}
              </Text>
            ) : null}
            {book.isbn ? (
              <Text numberOfLines={1} style={styles.metaPill}>
                ISBN {book.isbn}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.sideColumn}>
          <View
            style={[
              styles.badge,
              { backgroundColor: statusStyle.backgroundColor }
            ]}
          >
            <Text style={[styles.badgeText, { color: statusStyle.textColor }]}>
              {STATUS_LABELS[book.status]}
            </Text>
          </View>
          <Text style={styles.arrow}>{">"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#f4ede2",
    color: "#6b5640",
    fontSize: 11,
    overflow: "hidden"
  }
});
