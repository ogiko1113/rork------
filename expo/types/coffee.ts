export type TasteKey = "sour" | "bitter" | "thin";
export type EquipmentKey =
  | "hario_v60"
  | "kalita_wave"
  | "melitta"
  | "french_press"
  | "other";
export type RoastKey = "light" | "medium" | "dark" | "unknown";
export type FlowKey = "fast" | "normal" | "slow" | "unknown";
export type HelperTasteKey = TasteKey | "aroma_weak";

export interface CoffeeRule {
  equipment: EquipmentKey;
  roast: Exclude<RoastKey, "unknown">;
  taste: TasteKey;
  flow: Exclude<FlowKey, "normal" | "unknown">;
  suggestion: string;
  reason: string;
}

export interface CoffeeRulesJson {
  rules: CoffeeRule[];
}

export interface DiagnosisForm {
  taste: TasteKey | null;
  helperTaste: HelperTasteKey | null;
  equipment: EquipmentKey | null;
  roast: RoastKey | null;
  flow: FlowKey | null;
}

export interface SuggestionResult {
  suggestion: string;
  reason: string;
  matchedRule?: CoffeeRule;
  fallbackType: "exact" | "general" | "equipment";
}

export interface SavedSuggestion {
  id: string;
  createdAt: string;
  suggestion: string;
  reason: string;
  taste: TasteKey;
  equipment: EquipmentKey;
  roast: RoastKey;
  flow: FlowKey;
}
