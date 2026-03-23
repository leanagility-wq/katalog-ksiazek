import { SafeAreaView, StatusBar, StyleSheet, View } from "react-native";

import { HomeScreen } from "@/screens/HomeScreen";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <HomeScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe7"
  },
  container: {
    flex: 1
  }
});
