import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { mapCandidateToBook } from "@/features/scanning/scanMapper";
import { useLibraryStore } from "@/store/useLibraryStore";
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
    return "Brak oceny";
  }

  if (confidence >= 0.82) {
    return `Wysoka pewność (${Math.round(confidence * 100)}%)`;
  }

  if (confidence >= 0.6) {
    return `Średnia pewność (${Math.round(confidence * 100)}%)`;
  }

  return `Niska pewność (${Math.round(confidence * 100)}%)`;
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

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      for (const item of items) {
        await saveBook(
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
          )
        );
      }

      onComplete();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Nie udało się zapisać książek."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!scanSession) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard
          title={"Przegląd OCR"}
          subtitle={
            "Nie ma jeszcze aktywnego skanu. Najpierw przejdź do ekranu skanowania."
          }
        >
          <PrimaryButton label={"Wróć do skanowania"} onPress={onCancel} />
        </SectionCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={"Przegląd OCR"}
        subtitle={`Skan: ${scanSession.imageLabel}. Rozpoznane pozycje: ${items.length}`}
      >
        <Text style={styles.helper}>
          Sprawdź przede wszystkim wpisy oznaczone do uwagi. To one najczęściej
          wymagają ręcznej korekty.
        </Text>
        <Text style={styles.summary}>
          Wymaga uwagi: {attentionCount} z {items.length}
        </Text>
        {scanSession.imageUri ? (
          <Text style={styles.meta}>{`Źródło obrazu: ${scanSession.imageUri}`}</Text>
        ) : null}
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      </SectionCard>

      {items.map((item, index) => (
        <SectionCard
          key={item.id}
          title={`Pozycja ${index + 1}`}
          subtitle={`Surowy OCR: ${item.rawText || "brak"}`}
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
                {item.needsAttention ? "Sprawdź ręcznie" : "Wygląda dobrze"}
              </Text>
            </View>
            <Text style={styles.confidence}>{confidenceLabel(item.confidence)}</Text>
          </View>
          {item.reviewReason ? (
            <Text style={styles.reviewReason}>{item.reviewReason}</Text>
          ) : null}
          <View style={styles.field}>
            <Text style={styles.label}>Tytuł</Text>
            <TextInput
              value={item.titleSuggestion}
              onChangeText={(value) => handleChange(item.id, "titleSuggestion", value)}
              style={styles.input}
              placeholder={"Tytuł książki"}
              placeholderTextColor="#9a8a76"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Autor</Text>
            <TextInput
              value={item.authorSuggestion}
              onChangeText={(value) => handleChange(item.id, "authorSuggestion", value)}
              style={styles.input}
              placeholder={"Autor"}
              placeholderTextColor="#9a8a76"
            />
          </View>
        </SectionCard>
      ))}

      <View style={styles.actions}>
        <PrimaryButton label={"Wróć do skanu"} onPress={onCancel} />
        <PrimaryButton
          label={isSaving ? "Zapisywanie..." : "Zapisz w katalogu"}
          onPress={() => void handleSave()}
          disabled={isSaving || items.length === 0}
        />
      </View>
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
