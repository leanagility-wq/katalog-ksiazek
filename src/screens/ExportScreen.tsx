import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { appText } from "@/config/uiText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import {
  importBooksFromCsv,
  shareCsvExport,
} from "@/features/export/exportService";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export function ExportScreen() {
  const { hasMoreBooks, loadAllBooks, saveBooksBulk } = useLibraryStore();
  const { isLoaded, loadSettings, mergeSavedGenres } = useSettingsStore();
  const [isSharingCsv, setIsSharingCsv] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  const handleShareCsv = async () => {
    setIsSharingCsv(true);
    setLastExportMessage(null);

    try {
      if (hasMoreBooks) {
        await loadAllBooks();
      }

      const fileUri = await shareCsvExport(useLibraryStore.getState().books);
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

  const handleImportCsv = async () => {
    setIsImportingCsv(true);
    setLastExportMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const csvText = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8
      });
      const importedBooks = importBooksFromCsv(csvText);

      await saveBooksBulk(importedBooks);
      await mergeSavedGenres(
        importedBooks
          .map((book) => book.genre)
          .filter((genre): genre is string => Boolean(genre))
      );

      setLastExportMessage(
        appText.export.importSuccessMessage(importedBooks.length)
      );
    } catch (error) {
      Alert.alert(
        appText.export.importErrorTitle,
        error instanceof Error ? error.message : appText.editor.retryLabel
      );
    } finally {
      setIsImportingCsv(false);
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
        <PrimaryButton
          label={
            isImportingCsv
              ? appText.export.importingCsvButton
              : appText.export.importCsvButton
          }
          onPress={() => {
            void handleImportCsv();
          }}
          disabled={isImportingCsv || isSharingCsv}
        />
        {lastExportMessage ? (
          <Text style={styles.successMessage}>{lastExportMessage}</Text>
        ) : null}
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
  successMessage: {
    color: "#5f6f2c",
    fontSize: 12,
    lineHeight: 18
  }
});
