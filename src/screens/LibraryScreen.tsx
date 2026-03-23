import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BookListItem } from "@/components/BookListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { useLibraryStore } from "@/store/useLibraryStore";

interface LibraryScreenProps {
  onStartScan: () => void;
}

export function LibraryScreen({ onStartScan }: LibraryScreenProps) {
  const { books, isLoading, errorMessage } = useLibraryStore();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={"Katalog"}
        subtitle={
          isLoading
            ? "\u0141adowanie biblioteki..."
            : `Liczba pozycji: ${books.length}`
        }
      >
        <PrimaryButton label={"Zeskanuj now\u0105 p\u00f3\u0142k\u0119"} onPress={onStartScan} />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.list}>
          {books.map((book) => (
            <BookListItem key={book.id} book={book} />
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title={"Jak u\u017cywa\u0107"}
        subtitle={"Kr\u00f3tka instrukcja obs\u0142ugi aplikacji."}
      >
        <Text style={styles.listItem}>
          {"1. Otw\u00f3rz \"Ustawienia\" i zapisz sw\u00f3j klucz OpenAI API."}
        </Text>
        <Text style={styles.listItem}>
          {"2. Przejd\u017a do \"Skan\" i zr\u00f3b zdj\u0119cie p\u00f3\u0142ki z ksi\u0105\u017ckami."}
        </Text>
        <Text style={styles.listItem}>
          {"3. W \"Przegl\u0105dzie\" popraw tytu\u0142y i autor\u00f3w, je\u015bli trzeba."}
        </Text>
        <Text style={styles.listItem}>
          {"4. Zapisz wynik, a ksi\u0105\u017cki pojawi\u0105 si\u0119 w katalogu."}
        </Text>
        <Text style={styles.listItem}>
          {"5. W zak\u0142adce \"Eksport\" skopiujesz dane do dalszej obr\u00f3bki."}
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
  list: {
    gap: 4
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
