import AsyncStorage from "@react-native-async-storage/async-storage";

import { SavedSuggestion } from "@/types/coffee";

const STORAGE_KEY = "next-cup-saved-suggestions";

export async function saveSuggestionRecord(record: SavedSuggestion): Promise<void> {
  console.log("[storage] saving suggestion", record.id);
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = current ? (JSON.parse(current) as SavedSuggestion[]) : [];
  const nextRecords = [record, ...parsed].slice(0, 20);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
}

export async function getSavedSuggestions(): Promise<SavedSuggestion[]> {
  console.log("[storage] loading saved suggestions");
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  return current ? (JSON.parse(current) as SavedSuggestion[]) : [];
}
