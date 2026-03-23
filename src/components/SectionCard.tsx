import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function SectionCard({
  title,
  subtitle,
  children
}: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf2",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e7dcc9"
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3e2f1f"
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6f5a42"
  },
  content: {
    gap: 8
  }
});
