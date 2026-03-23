import { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { appText } from "@/config/uiText";
import { SectionCard } from "@/components/SectionCard";
import {
  exportBooksToCsv,
  exportBooksToJson
} from "@/features/export/exportService";
import { useLibraryStore } from "@/store/useLibraryStore";

export function ExportScreen() {
  const { books } = useLibraryStore();

  const preview = useMemo(
    () => ({
      csv: exportBooksToCsv(books),
      json: exportBooksToJson(books)
    }),
    [books]
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={appText.export.title}
        subtitle={appText.export.subtitle}
      >
        <Text style={styles.label}>{appText.export.csvLabel}</Text>
        <Text style={styles.codeBlock}>{preview.csv}</Text>
        <Text style={styles.label}>{appText.export.jsonLabel}</Text>
        <Text style={styles.codeBlock}>{preview.json}</Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18
  },
  label: {
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
    fontFamily: "monospace",
    maxHeight: 180
  }
});
