import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { appText } from "@/config/uiText";
import {
  DuplicateMatch,
  getDuplicateReasonLabel
} from "@/features/catalog/duplicateDetection";
import { PrimaryButton } from "@/components/PrimaryButton";
import { STATUS_LABELS } from "@/config/bookUi";
import { Book } from "@/types/book";

interface DuplicateResolutionSheetProps {
  visible: boolean;
  candidateBook: Book | null;
  matches: DuplicateMatch[];
  onOverwrite: (targetBookId: string) => void;
  onSaveCopy: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export function DuplicateResolutionSheet({
  visible,
  candidateBook,
  matches,
  onOverwrite,
  onSaveCopy,
  onReject,
  onCancel
}: DuplicateResolutionSheetProps) {
  if (!candidateBook) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{appText.duplicates.title}</Text>
          <Text style={styles.subtitle}>{appText.duplicates.subtitle}</Text>

          <View style={styles.currentCard}>
            <Text style={styles.cardEyebrow}>{appText.duplicates.currentBook}</Text>
            <Text style={styles.bookTitle}>
              {candidateBook.title || appText.duplicates.existingTitleFallback}
            </Text>
            <Text style={styles.bookMeta}>
              {candidateBook.author || appText.duplicates.existingAuthorFallback}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>{appText.duplicates.matchesTitle}</Text>

          <ScrollView style={styles.matchesList} contentContainerStyle={styles.matchesContent}>
            {matches.map((match) => (
              <View key={match.book.id} style={styles.matchCard}>
                <Text style={styles.bookTitle}>
                  {match.book.title || appText.duplicates.existingTitleFallback}
                </Text>
                <Text style={styles.bookMeta}>
                  {match.book.author || appText.duplicates.existingAuthorFallback}
                </Text>
                <Text style={styles.detailLine}>
                  {appText.duplicates.existingReasonLabel}: {getDuplicateReasonLabel(match.reason)}
                </Text>
                <Text style={styles.detailLine}>
                  {appText.duplicates.existingStatusLabel}: {STATUS_LABELS[match.book.status]}
                </Text>
                <Text style={styles.detailLine}>
                  {appText.duplicates.existingLocationLabel}:{" "}
                  {match.book.shelfLocation || appText.duplicates.existingLocationFallback}
                </Text>
                <PrimaryButton
                  label={appText.duplicates.overwriteButton}
                  onPress={() => onOverwrite(match.book.id)}
                  compact
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.bottomActions}>
            <PrimaryButton
              label={appText.duplicates.saveCopyButton}
              onPress={onSaveCopy}
            />
            <View style={styles.secondaryRow}>
              <Pressable onPress={onReject} style={styles.secondaryButton}>
                <Text style={styles.secondaryLabel}>
                  {appText.duplicates.rejectButton}
                </Text>
              </Pressable>
              <Pressable onPress={onCancel} style={styles.secondaryButton}>
                <Text style={styles.secondaryLabel}>
                  {appText.duplicates.cancelButton}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(26, 18, 10, 0.42)",
    justifyContent: "center",
    padding: 18
  },
  sheet: {
    maxHeight: "88%",
    borderRadius: 20,
    backgroundColor: "#fffaf2",
    padding: 16,
    gap: 12
  },
  title: {
    color: "#2d2419",
    fontSize: 18,
    fontWeight: "800"
  },
  subtitle: {
    color: "#6f5a42",
    lineHeight: 20
  },
  currentCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#f7efe3",
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 4
  },
  cardEyebrow: {
    color: "#8b6c46",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  sectionTitle: {
    color: "#4b3927",
    fontSize: 13,
    fontWeight: "800"
  },
  matchesList: {
    maxHeight: 280
  },
  matchesContent: {
    gap: 10
  },
  matchCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eadfce",
    backgroundColor: "#fdf8ef",
    padding: 12,
    gap: 6
  },
  bookTitle: {
    color: "#2d2419",
    fontSize: 15,
    fontWeight: "700"
  },
  bookMeta: {
    color: "#6f5a42",
    fontSize: 13
  },
  detailLine: {
    color: "#6a533c",
    fontSize: 12,
    lineHeight: 18
  },
  bottomActions: {
    gap: 10
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 8
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede2d0"
  },
  secondaryLabel: {
    color: "#5c4833",
    fontWeight: "700",
    fontSize: 14
  }
});
