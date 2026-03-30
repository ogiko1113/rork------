import AsyncStorage from "@react-native-async-storage/async-storage";

import { BrewRecord, DiagnosisMode, UserSettings } from "@/types/coffee";

const BREW_RECORDS_KEY = "next-cup-saved-suggestions";
const SETTINGS_KEY = "next-cup-user-settings";

// --- Brew Records ---

export async function saveBrewRecord(record: BrewRecord): Promise<void> {
  const current = await AsyncStorage.getItem(BREW_RECORDS_KEY);
  const parsed: BrewRecord[] = current ? JSON.parse(current) : [];

  const duplicate = parsed.find((r) => r.id === record.id);
  if (duplicate) {
    console.warn("[Storage] Duplicate ID detected:", record.id);
  }
  console.log("[Storage] Saving record id:", record.id, "existing count:", parsed.length);

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
  console.log("[Storage] updateBrewResult called. id:", id, "total records:", parsed.length);

  const matchIndex = parsed.findIndex((r) => r.id === id);
  console.log("[Storage] Match index for id", id, ":", matchIndex);

  if (matchIndex === -1) {
    console.warn("[Storage] No record found with id:", id);
    return;
  }

  const updated = parsed.map((r) => (r.id === id ? { ...r, result } : r));
  await AsyncStorage.setItem(BREW_RECORDS_KEY, JSON.stringify(updated));
  console.log("[Storage] Record updated successfully for id:", id);
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
