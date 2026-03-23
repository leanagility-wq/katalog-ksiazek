import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { appText } from "@/config/uiText";
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
      setScanMessage(appText.scan.cameraNotReady);
      return;
    }

    setIsProcessing(true);
    setScanMessage(appText.scan.processing);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.9
      });

      if (!picture?.uri) {
        setScanMessage(appText.scan.savePhotoError);
        return;
      }

      const session = await scanShelfImage(picture.uri);
      setScanMessage(
        session.source === "openai"
          ? appText.scan.openAiSuccess
          : session.source === "camera"
            ? appText.scan.localSuccess
            : appText.scan.mockSuccess
      );
      onMockScanReady(session);
    } catch (error) {
      setScanMessage(
        error instanceof Error ? error.message : appText.scan.scanError
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title={appText.scan.title} subtitle={appText.scan.subtitle}>
        {permission?.granted ? (
          <View style={styles.cameraShell}>
            <CameraView
              ref={cameraRef}
              facing="back"
              style={styles.cameraPreview}
              ratio="16:9"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(event) =>
                setScanMessage(appText.scan.cameraMountError(event.message))
              }
            />
          </View>
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackTitle}>{appText.scan.permissionTitle}</Text>
            <Text style={styles.fallbackCopy}>
              {appText.scan.permissionDescription}
            </Text>
            <PrimaryButton
              label={appText.scan.permissionButton}
              onPress={() => void requestPermission()}
            />
          </View>
        )}
        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>{appText.scan.guideTitle}</Text>
          <Text style={styles.guideHint}>{appText.scan.guideDescription}</Text>
        </View>
        {scanMessage ? <Text style={styles.status}>{scanMessage}</Text> : null}
        <PrimaryButton
          label={
            isProcessing
              ? appText.scan.processingButton
              : appText.scan.captureButton
          }
          onPress={() => void handleCaptureAndScan()}
          disabled={isProcessing || !permission?.granted}
        />
      </SectionCard>

      <SectionCard
        title={appText.scan.tipsTitle}
        subtitle={appText.scan.tipsSubtitle}
      >
        {appText.scan.tips.map((tip) => (
          <Text key={tip} style={styles.listItem}>
            {tip}
          </Text>
        ))}
        <Text style={styles.listItem}>
          {openAIApiKey ? appText.scan.apiKeyPresent : appText.scan.apiKeyMissing}
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
