import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import { appText } from "@/config/uiText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import {
  shareCsvExport,
  exportBooksToCsv,
  exportBooksToJson
} from "@/features/export/exportService";
import { useLibraryStore } from "@/store/useLibraryStore";

export function ExportScreen() {
  const { books } = useLibraryStore();
  const [isSharingCsv, setIsSharingCsv] = useState(false);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  const preview = useMemo(
    () => ({
      csv: exportBooksToCsv(books),
      json: exportBooksToJson(books)
    }),
    [books]
  );

  const handleShareCsv = async () => {
    setIsSharingCsv(true);
    setLastExportMessage(null);

    try {
      const fileUri = await shareCsvExport(books);
      setLastExportMessage(appText.export.successMessage(fileUri));
    } catch (error) {
      Alert.alert(
        appText.export.errorTitle,
        error instanceof Error ? error.message : appText.editor.retryLabel
      );
    } finally {
      setIsSharingCsv(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={appText.export.title}
        subtitle={appText.export.subtitle}
      >
        <PrimaryButton
          label={
            isSharingCsv
              ? appText.export.sharingCsvButton
              : appText.export.shareCsvButton
          }
          onPress={() => {
            void handleShareCsv();
          }}
          disabled={isSharingCsv}
        />
        {lastExportMessage ? (
          <Text style={styles.successMessage}>{lastExportMessage}</Text>
        ) : null}
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
  successMessage: {
    color: "#5f6f2c",
    fontSize: 12,
    lineHeight: 18
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
