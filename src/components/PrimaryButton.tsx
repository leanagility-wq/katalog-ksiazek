import { Pressable, StyleSheet, Text } from "react-native";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  compact = false
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.buttonCompact : null,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#704d2e",
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 46,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12
  },
  buttonPressed: {
    opacity: 0.92
  },
  buttonDisabled: {
    backgroundColor: "#b9a794"
  },
  label: {
    color: "#fff7ec",
    fontWeight: "700",
    fontSize: 14
  }
});
