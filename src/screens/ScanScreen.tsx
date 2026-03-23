import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { scanShelfImage } from "@/features/scanning/ocrService";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ScanSession } from "@/types/scan";

interface ScanScreenProps {
  onMockScanReady: (session: ScanSession) => void;
}

export function ScanScreen({ onMockScanReady }: ScanScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const { openAIApiKey } = useSettingsStore();

  const handleCaptureAndScan = async () => {
    if (!cameraRef.current || !isCameraReady) {
      setScanMessage("Kamera nie jest jeszcze gotowa do wykonania zdjęcia.");
      return;
    }

    setIsProcessing(true);
    setScanMessage("Robię zdjęcie i analizuję 3–6 grzbietów z centralnej części kadru...");

    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9
      });

      if (!picture?.uri) {
        setScanMessage("Nie udało się zapisać zdjęcia do analizy.");
        return;
      }

      const session = await scanShelfImage(picture.uri);
      setScanMessage(
        session.source === "openai"
          ? "OCR online zakończony. Przechodzę do przeglądu."
          : session.source === "camera"
            ? "Używam lokalnego OCR jako fallbacku. Przechodzę do przeglądu."
            : "Uruchomiłem awaryjny fallback z przykładowymi danymi."
      );
      onMockScanReady(session);
    } catch (error) {
      setScanMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się wykonać skanu."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title="Skanowanie"
        subtitle="Najlepsze wyniki daje mały fragment półki: zwykle 3–6 grzbietów, ale przy cienkich książkach może być ich więcej."
      >
        {permission?.granted ? (
          <View style={styles.cameraShell}>
            <CameraView
              ref={cameraRef}
              facing="back"
              style={styles.cameraPreview}
              ratio="16:9"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(event) =>
                setScanMessage(`Błąd kamery: ${event.message}`)
              }
            />
          </View>
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackTitle}>Kamera czeka na zgodę</Text>
            <Text style={styles.fallbackCopy}>
              Przy pierwszym uruchomieniu aplikacja poprosi o dostęp do aparatu.
            </Text>
            <PrimaryButton
              label="Nadaj uprawnienia kamery"
              onPress={() => void requestPermission()}
            />
          </View>
        )}
        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>Celuj w środkowy obszar kadru</Text>
          <Text style={styles.guideHint}>
            Najlepiej, jeśli w jednym zdjęciu widzisz kilka wyraźnych grzbietów i niewiele tła po bokach. Cienkich książek może być więcej niż 5.
          </Text>
        </View>
        {scanMessage ? <Text style={styles.status}>{scanMessage}</Text> : null}
        <PrimaryButton
          label={isProcessing ? "Przetwarzanie..." : "Zrób zdjęcie i skanuj"}
          onPress={() => void handleCaptureAndScan()}
          disabled={isProcessing || !permission?.granted}
        />
      </SectionCard>

      <SectionCard
        title="Jak skanować"
        subtitle="Tu naprawdę liczy się sposób robienia zdjęcia, nie tylko sam model OCR."
      >
        <Text style={styles.listItem}>1. Skanuj małe fragmenty półki, nie cały regał.</Text>
        <Text style={styles.listItem}>2. Utrzymuj telefon równolegle do grzbietów książek.</Text>
        <Text style={styles.listItem}>3. Unikaj odbić światła i cienia na lakierowanych okładkach.</Text>
        <Text style={styles.listItem}>4. Jeśli jeden grzbiet jest węższy lub pionowy, zeskanuj go osobno.</Text>
        <Text style={styles.listItem}>
          {openAIApiKey
            ? "Klucz API jest zapisany. Użyjemy mocniejszego OCR online."
            : "Brak klucza API. Ustaw go w zakładce Ustawienia, żeby włączyć OCR online."}
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
  cameraShell: {
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1f1811",
    borderWidth: 1,
    borderColor: "#d8c5a7"
  },
  cameraPreview: {
    flex: 1
  },
  guideBox: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d8c5a7",
    backgroundColor: "#fbf4e8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  guideTitle: {
    color: "#3e2f1f",
    fontWeight: "700"
  },
  guideHint: {
    color: "#6f5a42",
    lineHeight: 20
  },
  cameraFallback: {
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbcdb7",
    backgroundColor: "#f6efe2",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10
  },
  fallbackTitle: {
    fontWeight: "700",
    fontSize: 17,
    color: "#3e2f1f"
  },
  fallbackCopy: {
    textAlign: "center",
    color: "#5d4b39",
    lineHeight: 22
  },
  listItem: {
    color: "#4c3926",
    fontSize: 15,
    lineHeight: 22
  },
  status: {
    color: "#6f5a42",
    lineHeight: 22
  }
});
