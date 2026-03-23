export function normalizeStoredText(value?: string | null) {
  if (value == null) {
    return value ?? undefined;
  }

  return value.normalize("NFC");
}
