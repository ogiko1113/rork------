export type TasteKey = "sour" | "bitter" | "thin";
export type EquipmentKey =
  | "hario_v60"
  | "kalita_wave"
  | "melitta"
  | "french_press"
  | "other";
export type RoastKey = "light" | "medium" | "dark" | "unknown";
export type FlowKey = "fast" | "normal" | "slow" | "unknown";
export type TempRange = "low" | "mid" | "high" | "unknown";
export type HelperTasteKey = TasteKey | "aroma_weak";
export type DiagnosisMode = "normal" | "detailed";

export interface CorrectionRule {
  id: string;
  equipment: string;
  roast: string;
  taste: string;
  flow: string;
  temp: string;
  suggestion: string;
  reason: string;
}

export interface CorrectionRulesJson {
  version: string;
  description: string;
  temp_ranges: Record<string, { min: number; max: number; label: string }>;
  rules: CorrectionRule[];
  rule_matching_priority: string[];
}

export interface DiagnosisForm {
  taste: TasteKey | null;
  helperTaste: HelperTasteKey | null;
  equipment: EquipmentKey | null;
  roast: RoastKey | null;
  flow: FlowKey | null;
  temp: number | null;
  tempRange: TempRange;
  mode: DiagnosisMode;
}

export interface SuggestionResult {
  suggestion: string;
  reason: string;
  matchedRule?: CorrectionRule;
  fallbackType: "exact" | "general" | "equipment" | "temp_fallback" | "flow_fallback";
}

export interface BrewRecord {
  id: string;
  equipment: EquipmentKey;
  roast: RoastKey;
  taste: TasteKey;
  flow: FlowKey;
  temp: number | null;
  tempRange: TempRange;
  mode: DiagnosisMode;
  suggestion: string;
  reason: string;
  result: "improved" | "still_off" | "reversed" | "unclear" | null;
  previousBrewId: string | null;
  createdAt: string;
}

export interface UserSettings {
  diagnosisMode: DiagnosisMode;
}

// Keep backward compat alias
export type CoffeeRule = CorrectionRule;
export type CoffeeRulesJson = CorrectionRulesJson;
export type SavedSuggestion = BrewRecord;
