import * as SecureStore from "expo-secure-store";

const OPENAI_API_KEY_KEY = "openai.apiKey";
const SAVED_LOCATIONS_KEY = "catalog.savedLocations";

export async function getStoredOpenAIApiKey() {
  return SecureStore.getItemAsync(OPENAI_API_KEY_KEY);
}

export async function setStoredOpenAIApiKey(apiKey: string) {
  await SecureStore.setItemAsync(OPENAI_API_KEY_KEY, apiKey);
}

export async function clearStoredOpenAIApiKey() {
  await SecureStore.deleteItemAsync(OPENAI_API_KEY_KEY);
}

export async function getStoredSavedLocations() {
  const rawValue = await SecureStore.getItemAsync(SAVED_LOCATIONS_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export async function setStoredSavedLocations(locations: string[]) {
  await SecureStore.setItemAsync(SAVED_LOCATIONS_KEY, JSON.stringify(locations));
}
