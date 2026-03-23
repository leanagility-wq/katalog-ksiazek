import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { appText } from "@/config/uiText";
import { DuplicateResolutionSheet } from "@/components/DuplicateResolutionSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import {
  DuplicateConflictError,
  DuplicateMatch,
  DuplicateSaveResolution
} from "@/features/catalog/duplicateDetection";
import { mapCandidateToBook } from "@/features/scanning/scanMapper";
import { useLibraryStore } from "@/store/useLibraryStore";
import { Book } from "@/types/book";
import { ScanSession } from "@/types/scan";

interface EditableCandidate {
  id: string;
  rawText: string;
  titleSuggestion: string;
  authorSuggestion: string;
  confidence?: number;
  needsAttention?: boolean;
  reviewReason?: string;
}

interface ReviewScreenProps {
  scanSession: ScanSession | null;
  onCancel: () => void;
  onComplete: () => void;
}

function confidenceLabel(confidence?: number) {
  if (confidence == null) {
    return appText.review.noScore;
  }

  const roundedConfidence = Math.round(confidence * 100);

  if (confidence >= 0.82) {
    return appText.review.confidenceHigh(roundedConfidence);
  }

  if (confidence >= 0.6) {
    return appText.review.confidenceMedium(roundedConfidence);
  }

  return appText.review.confidenceLow(roundedConfidence);
}

export function ReviewScreen({
  scanSession,
  onCancel,
  onComplete
}: ReviewScreenProps) {
  const { saveBook } = useLibraryStore();
  const [items, setItems] = useState<EditableCandidate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    index: number;
    candidateBook: Book;
    matches: DuplicateMatch[];
  } | null>(null);

  useEffect(() => {
    setItems(
      (scanSession?.candidates ?? []).map((candidate) => ({
        id: candidate.id,
        rawText: candidate.rawText,
        titleSuggestion: candidate.titleSuggestion,
        authorSuggestion: candidate.authorSuggestion ?? "",
        confidence: candidate.confidence,
        needsAttention: candidate.needsAttention,
        reviewReason: candidate.reviewReason
      }))
    );
    setSaveError(null);
    setPendingDuplicate(null);
  }, [scanSession]);

  const attentionCount = useMemo(
    () => items.filter((item) => item.needsAttention).length,
    [items]
  );

  const handleChange = (
    id: string,
    key: "titleSuggestion" | "authorSuggestion",
    value: string
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, [key]: value, needsAttention: false, reviewReason: undefined }
          : item
      )
    );
  };

  const toCandidateBook = (item: EditableCandidate) =>
    mapCandidateToBook(
      {
        id: item.id,
        rawText: item.rawText,
        titleSuggestion: item.titleSuggestion,
        authorSuggestion: item.authorSuggestion
      },
      {
        imageUri: scanSession?.imageUri
      }
    );

  const continueSaving = async (
    startIndex: number,
    resolution?: DuplicateSaveResolution,
    candidateBookOverride?: Book
  ) => {
    for (let index = startIndex; index < items.length; index += 1) {
      const item = items[index];
      const candidateBook =
        index === startIndex && candidateBookOverride
          ? candidateBookOverride
          : toCandidateBook(item);

      try {
        await saveBook(candidateBook, index === startIndex ? resolution : undefined);
      } catch (error) {
        if (error instanceof DuplicateConflictError) {
          setPendingDuplicate({
            index,
            candidateBook,
            matches: error.matches
          });
          return;
        }

        throw error;
      }
    }

    setPendingDuplicate(null);
    onComplete();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await continueSaving(0);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : appText.review.saveError
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateResolution = async (resolution: DuplicateSaveResolution) => {
    if (!pendingDuplicate) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await continueSaving(
        pendingDuplicate.index,
        resolution,
        pendingDuplicate.candidateBook
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : appText.review.saveError
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectDuplicate = async () => {
    if (!pendingDuplicate) {
      return;
    }

    const nextIndex = pendingDuplicate.index + 1;
    setPendingDuplicate(null);
    setIsSaving(true);
    setSaveError(null);

    try {
      await continueSaving(nextIndex);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : appText.review.saveError
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!scanSession) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard
          title={appText.review.title}
          subtitle={appText.review.noScanSubtitle}
        >
          <PrimaryButton label={appText.review.backToScan} onPress={onCancel} />
        </SectionCard>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard
          title={appText.review.title}
          subtitle={appText.review.subtitle(scanSession.imageLabel, items.length)}
        >
          <Text style={styles.helper}>{appText.review.helper}</Text>
          <Text style={styles.summary}>
            {appText.review.summary(attentionCount, items.length)}
          </Text>
          {scanSession.imageUri ? (
            <Text style={styles.meta}>
              {appText.review.imageSource(scanSession.imageUri)}
            </Text>
          ) : null}
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        </SectionCard>

        {items.map((item, index) => (
          <SectionCard
            key={item.id}
            title={appText.review.positionTitle(index)}
            subtitle={appText.review.rawOcr(item.rawText)}
          >
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  item.needsAttention ? styles.badgeWarning : styles.badgeOk
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.needsAttention ? styles.badgeWarningText : styles.badgeOkText
                  ]}
                >
                  {item.needsAttention
                    ? appText.review.needsAttention
                    : appText.review.looksGood}
                </Text>
              </View>
              <Text style={styles.confidence}>{confidenceLabel(item.confidence)}</Text>
            </View>
            {item.reviewReason ? (
              <Text style={styles.reviewReason}>{item.reviewReason}</Text>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>{appText.review.titleField}</Text>
              <TextInput
                value={item.titleSuggestion}
                onChangeText={(value) =>
                  handleChange(item.id, "titleSuggestion", value)
                }
                style={styles.input}
                placeholder={appText.review.titlePlaceholder}
                placeholderTextColor="#9a8a76"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{appText.review.authorField}</Text>
              <TextInput
                value={item.authorSuggestion}
                onChangeText={(value) =>
                  handleChange(item.id, "authorSuggestion", value)
                }
                style={styles.input}
                placeholder={appText.review.authorPlaceholder}
                placeholderTextColor="#9a8a76"
              />
            </View>
          </SectionCard>
        ))}

        <View style={styles.actions}>
          <PrimaryButton label={appText.review.backToScanShort} onPress={onCancel} />
          <PrimaryButton
            label={isSaving ? appText.review.savingButton : appText.review.saveButton}
            onPress={() => void handleSave()}
            disabled={isSaving || items.length === 0}
          />
        </View>
      </ScrollView>
      <DuplicateResolutionSheet
        visible={Boolean(pendingDuplicate)}
        candidateBook={pendingDuplicate?.candidateBook ?? null}
        matches={pendingDuplicate?.matches ?? []}
        onOverwrite={(targetBookId) => {
          void handleDuplicateResolution({ mode: "overwrite", targetBookId });
        }}
        onSaveCopy={() => {
          void handleDuplicateResolution({ mode: "save_as_copy" });
        }}
        onReject={() => {
          void handleRejectDuplicate();
        }}
        onCancel={() => {
          setPendingDuplicate(null);
          setIsSaving(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    gap: 12
  },
  helper: {
    color: "#5d4b39",
    lineHeight: 22
  },
  summary: {
    color: "#3e2f1f",
    fontWeight: "700"
  },
  meta: {
    color: "#7d6240",
    lineHeight: 20,
    fontSize: 12
  },
  error: {
    color: "#8f2f2f",
    lineHeight: 20
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeWarning: {
    backgroundColor: "#f8ddce"
  },
  badgeOk: {
    backgroundColor: "#dfefdd"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  badgeWarningText: {
    color: "#8a3c18"
  },
  badgeOkText: {
    color: "#315f28"
  },
  confidence: {
    color: "#6f5a42",
    fontSize: 12,
    fontWeight: "600"
  },
  reviewReason: {
    color: "#7a4d2c",
    lineHeight: 21
  },
  field: {
    gap: 6
  },
  label: {
    fontWeight: "700",
    color: "#4c3926"
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbcdb7",
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#2d2419"
  },
  actions: {
    gap: 10,
    paddingBottom: 8
  }
});
