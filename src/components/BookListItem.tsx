import { StyleSheet, Text, View } from "react-native";

import { Book } from "@/types/book";

interface BookListItemProps {
  book: Book;
}

export function BookListItem({ book }: BookListItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{book.status}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.meta}>{book.author}</Text>
        {book.shelfLocation ? (
          <Text style={styles.meta}>{book.shelfLocation}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee2cf"
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
  copy: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2d2419"
  },
  meta: {
    fontSize: 13,
    color: "#6f5a42"
  }
});
