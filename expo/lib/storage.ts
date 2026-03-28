import AsyncStorage from "@react-native-async-storage/async-storage";

import { BrewRecord, DiagnosisMode, UserSettings } from "@/types/coffee";

const BREW_RECORDS_KEY = "next-cup-saved-suggestions";
const SETTINGS_KEY = "next-cup-user-settings";

// --- Brew Records ---

export async function saveBrewRecord(record: BrewRecord): Promise<void> {
  const current = await AsyncStorage.getItem(BREW_RECORDS_KEY);
  const parsed: BrewRecord[] = current ? JSON.parse(current) : [];
  const nextRecords = [record, ...parsed].slice(0, 20);
  await AsyncStorage.setItem(BREW_RECORDS_KEY, JSON.stringify(nextRecords));
}

export async function getSavedSuggestions(): Promise<BrewRecord[]> {
  const current = await AsyncStorage.getItem(BREW_RECORDS_KEY);
  return current ? JSON.parse(current) : [];
}

export async function updateBrewResult(
  id: string,
  result: BrewRecord["result"]
): Promise<void> {
  const current = await AsyncStorage.getItem(BREW_RECORDS_KEY);
  const parsed: BrewRecord[] = current ? JSON.parse(current) : [];
  const updated = parsed.map((r) => (r.id === id ? { ...r, result } : r));
  await AsyncStorage.setItem(BREW_RECORDS_KEY, JSON.stringify(updated));
}

// --- User Settings ---

const defaultSettings: UserSettings = {
  diagnosisMode: "normal",
};

export async function getUserSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  return { ...defaultSettings, ...JSON.parse(raw) };
}

export async function saveDiagnosisMode(mode: DiagnosisMode): Promise<void> {
  const settings = await getUserSettings();
  settings.diagnosisMode = mode;
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Backward compat alias
export const saveSuggestionRecord = saveBrewRecord;
