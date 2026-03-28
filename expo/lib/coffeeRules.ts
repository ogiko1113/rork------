import rulesJson from "@/data/correction-rules-v2.json";
import { CorrectionRule, CorrectionRulesJson, DiagnosisForm, SuggestionResult, TempRange } from "@/types/coffee";

const data = rulesJson as CorrectionRulesJson;
const rules = data.rules;

const FALLBACK_RULE_ID = "fallback-004";

export function getTempRange(celsius: number | null): TempRange {
  if (celsius === null || celsius === undefined) return "unknown";
  if (celsius <= 87) return "low";
  if (celsius <= 93) return "mid";
  return "high";
}

function findRule(criteria: {
  equipment: string;
  roast: string;
  taste: string;
  flow: string;
  temp: string;
}): CorrectionRule | undefined {
  return rules.find(
    (r) =>
      r.equipment === criteria.equipment &&
      r.roast === criteria.roast &&
      r.taste === criteria.taste &&
      r.flow === criteria.flow &&
      r.temp === criteria.temp
  );
}

export function matchRule(form: DiagnosisForm): SuggestionResult {
  const taste = form.taste;

  if (!taste) {
    return {
      suggestion: "味をひとつ選んでください",
      reason: "今の印象が分かると、次の一杯で直すポイントをひとつに絞れます",
      fallbackType: "general",
    };
  }

  const equipment = form.equipment ?? "other";
  const roast = form.roast ?? "unknown";
  const flow = form.flow ?? "unknown";
  const temp = form.tempRange ?? "unknown";

  // Priority 1: 5-axis exact match
  const exact = findRule({ equipment, roast, taste, flow, temp });
  if (exact) {
    return { suggestion: exact.suggestion, reason: exact.reason, matchedRule: exact, fallbackType: "exact" };
  }

  // Priority 2: temp → "unknown" (4-axis fallback)
  if (temp !== "unknown") {
    const tempFallback = findRule({ equipment, roast, taste, flow, temp: "unknown" });
    if (tempFallback) {
      return { suggestion: tempFallback.suggestion, reason: tempFallback.reason, matchedRule: tempFallback, fallbackType: "temp_fallback" };
    }
  }

  // Priority 3: flow → "unknown" (3-axis fallback)
  if (flow !== "unknown") {
    const flowFallback = findRule({ equipment, roast, taste, flow: "unknown", temp: "unknown" });
    if (flowFallback) {
      return { suggestion: flowFallback.suggestion, reason: flowFallback.reason, matchedRule: flowFallback, fallbackType: "flow_fallback" };
    }
  }

  // Priority 4: equipment → "other" (generic rule)
  if (equipment !== "other") {
    const otherExact = findRule({ equipment: "other", roast: "unknown", taste, flow: "unknown", temp: "unknown" });
    if (otherExact) {
      return { suggestion: otherExact.suggestion, reason: otherExact.reason, matchedRule: otherExact, fallbackType: "equipment" };
    }
  }

  // Priority 5: ultimate fallback (fallback-004)
  const fallback = rules.find((r) => r.id === FALLBACK_RULE_ID);
  if (fallback) {
    return { suggestion: fallback.suggestion, reason: fallback.reason, matchedRule: fallback, fallbackType: "general" };
  }

  return {
    suggestion: "挽きを少し細かくする",
    reason: "迷ったときは、まず挽きを細かくしてみるのが最も変化が分かりやすいです",
    fallbackType: "general",
  };
}

// Keep backward compat export name
export const getSuggestion = matchRule;
