import { StyleSheet, Text, View } from "react-native";

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Domowa biblioteka</Text>
      <Text style={styles.title}>Katalog ksi\u0105\u017cek</Text>
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
