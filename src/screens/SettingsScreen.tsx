import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { appText } from "@/config/uiText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionCard } from "@/components/SectionCard";
import { useSettingsStore } from "@/store/useSettingsStore";

export function SettingsScreen() {
  const {
    openAIApiKey,
    savedLocations,
    savedGenres,
    isLoaded,
    isSaving,
    errorMessage,
    loadSettings,
    saveOpenAIApiKey,
    clearOpenAIApiKey,
    saveSavedLocations,
    saveSavedGenres
  } = useSettingsStore();
  const [draftApiKey, setDraftApiKey] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftGenre, setDraftGenre] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  useEffect(() => {
    setDraftApiKey(openAIApiKey);
  }, [openAIApiKey]);

  const handleSaveApiKey = async () => {
    await saveOpenAIApiKey(draftApiKey);
    setInfoMessage(appText.settings.savedInfo);
  };

  const handleClear = async () => {
    await clearOpenAIApiKey();
    setDraftApiKey("");
    setInfoMessage(appText.settings.clearedInfo);
  };

  const handleAddLocation = async () => {
    const nextLocation = draftLocation.trim();

    if (!nextLocation) {
      return;
    }

    await saveSavedLocations([...savedLocations, nextLocation]);
    setDraftLocation("");
    setInfoMessage(appText.settings.locationsSavedInfo);
  };

  const handleRemoveLocation = async (location: string) => {
    await saveSavedLocations(savedLocations.filter((item) => item !== location));
    setInfoMessage(appText.settings.locationsSavedInfo);
  };

  const handleAddGenre = async () => {
    const nextGenre = draftGenre.trim();

    if (!nextGenre) {
      return;
    }

    await saveSavedGenres([...savedGenres, nextGenre]);
    setDraftGenre("");
    setInfoMessage(appText.settings.genresSavedInfo);
  };

  const handleRemoveGenre = async (genre: string) => {
    await saveSavedGenres(savedGenres.filter((item) => item !== genre));
    setInfoMessage(appText.settings.genresSavedInfo);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
            <Text style={styles.label}>{appText.settings.locationsLabel}</Text>
            <TextInput
              value={draftLocation}
              onChangeText={setDraftLocation}
              style={styles.input}
              placeholder={appText.settings.locationsPlaceholder}
              placeholderTextColor="#9a8a76"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleAddLocation();
              }}
            />
          </View>

          <PrimaryButton
            label={
              isSaving
                ? appText.settings.savingButton
                : appText.settings.saveLocationsButton
            }
            onPress={() => void handleAddLocation()}
            disabled={isSaving || draftLocation.trim().length === 0}
          />

          <View style={styles.savedLocations}>
            {savedLocations.length ? (
              savedLocations.map((location) => (
                <View key={location} style={styles.locationRow}>
                  <Text style={styles.locationLabel}>{location}</Text>
                  <View style={styles.locationAction}>
                    <PrimaryButton
                      label={appText.settings.removeLocationButton}
                      onPress={() => void handleRemoveLocation(location)}
                      disabled={isSaving}
                      compact
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.helper}>{appText.settings.locationsEmpty}</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard
          title={appText.settings.genresTitle}
          subtitle={appText.settings.genresSubtitle}
        >
          <View style={styles.field}>
            <Text style={styles.label}>{appText.settings.genresLabel}</Text>
            <TextInput
              value={draftGenre}
              onChangeText={setDraftGenre}
              style={styles.input}
              placeholder={appText.settings.genresPlaceholder}
              placeholderTextColor="#9a8a76"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleAddGenre();
              }}
            />
          </View>

          <PrimaryButton
            label={
              isSaving
                ? appText.settings.savingButton
                : appText.settings.saveGenresButton
            }
            onPress={() => void handleAddGenre()}
            disabled={isSaving || draftGenre.trim().length === 0}
          />

          <View style={styles.savedLocations}>
            {savedGenres.length ? (
              savedGenres.map((genre) => (
                <View key={genre} style={styles.locationRow}>
                  <Text style={styles.locationLabel}>{genre}</Text>
                  <View style={styles.locationAction}>
                    <PrimaryButton
                      label={appText.settings.removeLocationButton}
                      onPress={() => void handleRemoveGenre(genre)}
                      disabled={isSaving}
                      compact
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.helper}>{appText.settings.genresEmpty}</Text>
            )}
          </View>
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
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
  helper: {
    color: "#5d4b39",
    lineHeight: 22
  },
  actions: {
    gap: 10
  },
  savedLocations: {
    gap: 8
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f8f1e8",
    borderWidth: 1,
    borderColor: "#eadfce"
  },
  locationLabel: {
    flex: 1,
    color: "#4b3927",
    fontSize: 14
  },
  locationAction: {
    minWidth: 84
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
