import { create } from "zustand";

import {
  clearStoredOpenAIApiKey,
  getStoredOpenAIApiKey,
  getStoredSavedLocations,
  setStoredOpenAIApiKey,
  setStoredSavedLocations
} from "@/storage/secureStore";

interface SettingsState {
  openAIApiKey: string;
  savedLocations: string[];
  isLoaded: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  loadSettings: () => Promise<void>;
  saveOpenAIApiKey: (apiKey: string) => Promise<void>;
  clearOpenAIApiKey: () => Promise<void>;
  saveSavedLocations: (locations: string[]) => Promise<void>;
}

function normalizeLocations(locations: string[]) {
  return Array.from(
    new Set(
      locations
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "pl"));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openAIApiKey: "",
  savedLocations: [],
  isLoaded: false,
  isSaving: false,
  errorMessage: null,
  loadSettings: async () => {
    try {
      const [apiKey, savedLocations] = await Promise.all([
        getStoredOpenAIApiKey(),
        getStoredSavedLocations()
      ]);

      set({
        openAIApiKey: apiKey ?? "",
        savedLocations: normalizeLocations(savedLocations),
        isLoaded: true,
        errorMessage: null
      });
    } catch (error) {
      set({
        isLoaded: true,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się wczytać ustawień."
      });
    }
  },
  saveOpenAIApiKey: async (apiKey) => {
    set({ isSaving: true, errorMessage: null });

    try {
      await setStoredOpenAIApiKey(apiKey.trim());
      set({
        openAIApiKey: apiKey.trim(),
        isSaving: false
      });
    } catch (error) {
      set({
        isSaving: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się zapisać klucza API."
      });
      throw error;
    }
  },
  clearOpenAIApiKey: async () => {
    set({ isSaving: true, errorMessage: null });

    try {
      await clearStoredOpenAIApiKey();
      set({
        openAIApiKey: "",
        isSaving: false
      });
    } catch (error) {
      set({
        isSaving: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się usunąć klucza API."
      });
      throw error;
    }
  },
  saveSavedLocations: async (locations) => {
    const normalizedLocations = normalizeLocations(locations);
    set({ isSaving: true, errorMessage: null });

    try {
      await setStoredSavedLocations(normalizedLocations);
      set({
        savedLocations: normalizedLocations,
        isSaving: false
      });
    } catch (error) {
      set({
        isSaving: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się zapisać listy lokalizacji."
      });
      throw error;
    }
  }
}));
