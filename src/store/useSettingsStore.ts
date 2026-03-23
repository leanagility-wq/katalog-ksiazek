import { create } from "zustand";

import {
  clearStoredOpenAIApiKey,
  getStoredOpenAIApiKey,
  setStoredOpenAIApiKey
} from "@/storage/secureStore";

interface SettingsState {
  openAIApiKey: string;
  isLoaded: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  loadSettings: () => Promise<void>;
  saveOpenAIApiKey: (apiKey: string) => Promise<void>;
  clearOpenAIApiKey: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openAIApiKey: "",
  isLoaded: false,
  isSaving: false,
  errorMessage: null,
  loadSettings: async () => {
    try {
      const apiKey = await getStoredOpenAIApiKey();
      set({
        openAIApiKey: apiKey ?? "",
        isLoaded: true,
        errorMessage: null
      });
    } catch (error) {
      set({
        isLoaded: true,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Nie udało się wczytać ustawień OCR."
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
    }
  }
}));
