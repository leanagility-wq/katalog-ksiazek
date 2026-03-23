import { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { TabBar, TabKey } from "@/components/TabBar";
import { ExportScreen } from "@/screens/ExportScreen";
import { LibraryScreen } from "@/screens/LibraryScreen";
import { ReviewScreen } from "@/screens/ReviewScreen";
import { ScanScreen } from "@/screens/ScanScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ScanSession } from "@/types/scan";

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>("scan");
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const { loadBooks } = useLibraryStore();
  const { loadSettings } = useSettingsStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void loadBooks();
    void loadSettings();
  }, [loadBooks, loadSettings]);

  const handleMockScanReady = (session: ScanSession) => {
    setScanSession(session);
    setActiveTab("review");
  };

  const handleReviewComplete = () => {
    setScanSession(null);
    setActiveTab("scan");
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "scan":
        return <ScanScreen onMockScanReady={handleMockScanReady} />;
      case "review":
        return (
          <ReviewScreen
            scanSession={scanSession}
            onCancel={() => setActiveTab("scan")}
            onComplete={handleReviewComplete}
          />
        );
      case "export":
        return <ExportScreen />;
      case "settings":
        return <SettingsScreen />;
      case "library":
      default:
        return <LibraryScreen onStartScan={() => setActiveTab("scan")} />;
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.screen}>{renderScreen()}</View>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe7"
  },
  container: {
    flex: 1
  },
  screen: {
    flex: 1,
    minHeight: 0
  }
});
