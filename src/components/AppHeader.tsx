import { StyleSheet, Text, View } from "react-native";

import { appText } from "@/config/uiText";

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{appText.header.eyebrow}</Text>
      <Text style={styles.title}>{appText.header.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 2
  },
  eyebrow: {
    color: "#7d6240",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700"
  },
  title: {
    color: "#2c2218",
    fontSize: 24,
    fontWeight: "800"
  }
});
