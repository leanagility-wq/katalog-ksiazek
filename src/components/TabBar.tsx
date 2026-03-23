import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TabKey = "library" | "scan" | "review" | "export" | "settings";

interface TabBarProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "library", label: "Katalog" },
  { key: "scan", label: "Skan" },
  { key: "review", label: "Przegląd" },
  { key: "export", label: "Eksport" },
  { key: "settings", label: "Ustawienia" }
];

export function TabBar({ activeTab, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: Math.max(insets.bottom, 8) }
      ]}
    >
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[styles.item, isActive ? styles.itemActive : null]}
            >
              <Text style={[styles.label, isActive ? styles.labelActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    backgroundColor: "#f3efe7"
  },
  bar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e7dcc9",
    borderRadius: 22,
    backgroundColor: "#fbf6ee",
    shadowColor: "#2c2218",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: -2
    },
    elevation: 6
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingVertical: 8,
    borderRadius: 14
  },
  itemActive: {
    backgroundColor: "#efe4ce"
  },
  label: {
    color: "#6f5a42",
    fontWeight: "600",
    fontSize: 12
  },
  labelActive: {
    color: "#3e2f1f"
  }
});
