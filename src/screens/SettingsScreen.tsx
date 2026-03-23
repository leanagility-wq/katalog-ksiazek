import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { appText } from "@/config/uiText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { useSettingsStore } from "@/store/useSettingsStore";

function locationsToDraft(locations: string[]) {
  return locations.join("\n");
}

function draftToLocations(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SettingsScreen() {
  const {
    openAIApiKey,
    savedLocations,
    isLoaded,
    isSaving,
    errorMessage,
    loadSettings,
    saveOpenAIApiKey,
    clearOpenAIApiKey,
    saveSavedLocations
  } = useSettingsStore();
  const [draftApiKey, setDraftApiKey] = useState("");
  const [draftLocations, setDraftLocations] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  useEffect(() => {
    setDraftApiKey(openAIApiKey);
  }, [openAIApiKey]);

  useEffect(() => {
    setDraftLocations(locationsToDraft(savedLocations));
  }, [savedLocations]);

  const normalizedLocationCount = useMemo(
    () => draftToLocations(draftLocations).length,
    [draftLocations]
  );

  const handleSaveApiKey = async () => {
    await saveOpenAIApiKey(draftApiKey);
    setInfoMessage(appText.settings.savedInfo);
  };

  const handleClear = async () => {
    await clearOpenAIApiKey();
    setDraftApiKey("");
    setInfoMessage(appText.settings.clearedInfo);
  };

  const handleSaveLocations = async () => {
    await saveSavedLocations(draftToLocations(draftLocations));
    setInfoMessage(appText.settings.locationsSavedInfo);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title={appText.settings.title}
        subtitle={appText.settings.subtitle}
      >
        <View style={styles.field}>
          <Text style={styles.label}>{appText.settings.inputLabel}</Text>
          <TextInput
            value={draftApiKey}
            onChangeText={setDraftApiKey}
            style={styles.input}
            placeholder="sk-..."
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>
        <Text style={styles.helper}>{appText.settings.helper}</Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            label={
              isSaving
                ? appText.settings.savingButton
                : appText.settings.saveButton
            }
            onPress={() => void handleSaveApiKey()}
            disabled={isSaving || draftApiKey.trim().length === 0}
          />
          <PrimaryButton
            label={
              isSaving ? appText.settings.busyButton : appText.settings.clearButton
            }
            onPress={() => void handleClear()}
            disabled={isSaving || openAIApiKey.length === 0}
          />
        </View>
      </SectionCard>

      <SectionCard
        title={appText.settings.locationsTitle}
        subtitle={appText.settings.locationsSubtitle}
      >
        <View style={styles.field}>
          <Text style={styles.label}>
            {appText.settings.locationsLabel} ({normalizedLocationCount})
          </Text>
          <TextInput
            value={draftLocations}
            onChangeText={setDraftLocations}
            style={[styles.input, styles.multilineInput]}
            placeholder={appText.settings.locationsPlaceholder}
            placeholderTextColor="#9a8a76"
            multiline
            textAlignVertical="top"
          />
        </View>
        <PrimaryButton
          label={
            isSaving
              ? appText.settings.savingButton
              : appText.settings.saveLocationsButton
          }
          onPress={() => void handleSaveLocations()}
          disabled={isSaving}
        />
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
  field: {
    gap: 6
  },
  label: {
    fontWeight: "700",
    color: "#4c3926"
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbcdb7",
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#2d2419"
  },
  multilineInput: {
    minHeight: 140
  },
  helper: {
    color: "#5d4b39",
    lineHeight: 22
  },
  actions: {
    gap: 10
  },
  error: {
    color: "#8f2f2f",
    lineHeight: 22
  },
  info: {
    color: "#365b34",
    lineHeight: 22
  }
});
