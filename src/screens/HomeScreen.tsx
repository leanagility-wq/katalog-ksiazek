import { useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BookListItem } from "@/components/BookListItem";
import { SectionCard } from "@/components/SectionCard";
import { exportBooksToCsv, exportBooksToJson } from "@/features/export/exportService";
import { ocrPlan } from "@/features/scanning/ocrPlan";
import { useLibraryStore } from "@/store/useLibraryStore";

export function HomeScreen() {
  const { books, isLoading, loadBooks } = useLibraryStore();

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const exportPreview = useMemo(() => {
    return {
      csv: exportBooksToCsv(books).split("\n").slice(0, 3).join("\n"),
      json: exportBooksToJson(books).slice(0, 180)
    };
  }, [books]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Katalog domowej biblioteki</Text>
        <Text style={styles.title}>Androidowa aplikacja do skanowania grzbietow ksiazek</Text>
        <Text style={styles.description}>
          Ten szkielet przygotowuje przeplyw pod OCR, katalog lokalny i eksport danych do dalszej sprzedazy lub pozyczania.
        </Text>
      </View>

      <SectionCard
        title="Skanowanie"
        subtitle="Pierwsza wersja bedzie prowadzila uzytkownika od zdjecia polki do recznej korekty OCR."
      >
        {ocrPlan.steps.map((step, index) => (
          <Text key={step} style={styles.listItem}>
            {index + 1}. {step}
          </Text>
        ))}
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Dodaj ekran kamery</Text>
        </Pressable>
      </SectionCard>

      <SectionCard
        title="Katalog"
        subtitle={isLoading ? "Ladowanie danych..." : `Wstepnie zaladowane pozycje: ${books.length}`}
      >
        {books.map((book) => (
          <BookListItem key={book.id} book={book} />
        ))}
      </SectionCard>

      <SectionCard
        title="Eksport"
        subtitle="Docelowo zapis do pliku CSV lub JSON na urzadzeniu."
      >
        <Text style={styles.previewLabel}>Podglad CSV</Text>
        <Text style={styles.codeBlock}>{exportPreview.csv}</Text>
        <Text style={styles.previewLabel}>Podglad JSON</Text>
        <Text style={styles.codeBlock}>{exportPreview.json}...</Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16
  },
  hero: {
    gap: 10,
    paddingVertical: 12
  },
  eyebrow: {
    color: "#7d6240",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700"
  },
  title: {
    color: "#2c2218",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800"
  },
  description: {
    color: "#5d4b39",
    fontSize: 16,
    lineHeight: 24
  },
  listItem: {
    color: "#4c3926",
    fontSize: 15,
    lineHeight: 22
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#704d2e",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: "flex-start"
  },
  primaryButtonText: {
    color: "#fff7ec",
    fontWeight: "700"
  },
  previewLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#7d6240",
    fontWeight: "700"
  },
  codeBlock: {
    backgroundColor: "#f4ead8",
    borderRadius: 12,
    padding: 12,
    color: "#4f3c28",
    fontFamily: "monospace"
  }
});
