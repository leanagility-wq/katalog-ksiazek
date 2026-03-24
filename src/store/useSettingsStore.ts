import { create } from "zustand";

import {
  clearStoredOpenAIApiKey,
  getStoredOpenAIApiKey,
  getStoredSavedGenres,
  getStoredSavedLocations,
  setStoredOpenAIApiKey,
  setStoredSavedGenres,
  setStoredSavedLocations
} from "@/storage/secureStore";

interface SettingsState {
  openAIApiKey: string;
  savedLocations: string[];
  savedGenres: string[];
  isLoaded: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  loadSettings: () => Promise<void>;
  saveOpenAIApiKey: (apiKey: string) => Promise<void>;
  clearOpenAIApiKey: () => Promise<void>;
  saveSavedLocations: (locations: string[]) => Promise<void>;
  saveSavedGenres: (genres: string[]) => Promise<void>;
}

function normalizeValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "pl"));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openAIApiKey: "",
  savedLocations: [],
  savedGenres: [],
  isLoaded: false,
  isSaving: false,
  errorMessage: null,
  loadSettings: async () => {
    try {
      const [apiKey, savedLocations, savedGenres] = await Promise.all([
        getStoredOpenAIApiKey(),
        getStoredSavedLocations(),
        getStoredSavedGenres()
      ]);

      set({
        openAIApiKey: apiKey ?? "",
        savedLocations: normalizeValues(savedLocations),
        savedGenres: normalizeValues(savedGenres),
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
    const normalizedLocations = normalizeValues(locations);
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
  },
  saveSavedGenres: async (genres) => {
    const normalizedGenres = normalizeValues(genres);
    set({ isSaving: true, errorMessage: null });

    try {
      await setStoredSavedGenres(normalizedGenres);
      set({
        savedGenres: normalizedGenres,
        isSaving: false
      });
    } catch (error) {
      set({
        isSaving: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się zapisać listy gatunków."
      });
      throw error;
    }
  }
}));
