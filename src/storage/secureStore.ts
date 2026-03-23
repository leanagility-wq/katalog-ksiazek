import * as SecureStore from "expo-secure-store";

const OPENAI_API_KEY_KEY = "openai.apiKey";

export async function getStoredOpenAIApiKey() {
  return SecureStore.getItemAsync(OPENAI_API_KEY_KEY);
}

export async function setStoredOpenAIApiKey(apiKey: string) {
  await SecureStore.setItemAsync(OPENAI_API_KEY_KEY, apiKey);
}

export async function clearStoredOpenAIApiKey() {
  await SecureStore.deleteItemAsync(OPENAI_API_KEY_KEY);
}
