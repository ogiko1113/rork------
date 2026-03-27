import rulesJson from "@/data/coffee-rules.json";
import { CoffeeRule, CoffeeRulesJson, DiagnosisForm, SuggestionResult, TasteKey } from "@/types/coffee";

const coffeeRules = (rulesJson as CoffeeRulesJson).rules;

const generalTasteSuggestion: Record<TasteKey, Record<string, { suggestion: string; reason: string }>> = {
  sour: {
    light: {
      suggestion: "挽きを少し細かくしてみてください",
      reason: "酸味が強いときは、挽きを細かくして抽出を進めるのが基本です",
    },
    medium: {
      suggestion: "挽きを少し細かくしてみてください",
      reason: "もう少し成分を引き出すと酸味が和らいで甘さが出ます",
    },
    dark: {
      suggestion: "挽きを少し細かくしてみてください",
      reason: "深煎りで酸味が出るのは抽出不足のサインです",
    },
    unknown: {
      suggestion: "挽きを少し細かくしてみてください",
      reason: "酸味が強いときは、まず挽きを細かくするのが基本です",
    },
  },
  bitter: {
    light: {
      suggestion: "お湯の温度を少し下げてみてください（88℃くらい）",
      reason: "浅煎りは温度が高すぎると渋みが出やすいです",
    },
    medium: {
      suggestion: "挽きを少し粗くしてみてください",
      reason: "苦味が強いときは、挽きを粗くして抽出を抑えましょう",
    },
    dark: {
      suggestion: "お湯の温度を下げてみてください（83℃くらい）",
      reason: "深煎りの苦味は温度を下げると和らぎます",
    },
    unknown: {
      suggestion: "挽きを少し粗くしてみてください",
      reason: "苦味が強いときは、まず挽きを粗くするのが基本です",
    },
  },
  thin: {
    light: {
      suggestion: "粉の量を2g増やしてみてください",
      reason: "コーヒーの成分が足りていません。粉を増やすのが一番確実です",
    },
    medium: {
      suggestion: "粉の量を2g増やしてみてください",
      reason: "コーヒーの成分をもう少し増やしましょう",
    },
    dark: {
      suggestion: "粉の量を2g増やしてみてください",
      reason: "粉の量で味の濃さを調整しましょう",
    },
    unknown: {
      suggestion: "粉の量を2g増やしてみてください",
      reason: "薄いときは粉を増やすのが一番確実です",
    },
  },
};

const helperFallback = {
  suggestion: "粉量を増やす（+2g）",
  reason: "香りが弱いときは、まずコーヒーの量を少し増やして輪郭を出しましょう",
};

function findExactRule(ruleInput: {
  equipment: DiagnosisForm["equipment"];
  roast: DiagnosisForm["roast"];
  taste: TasteKey;
  flow: DiagnosisForm["flow"];
}): CoffeeRule | undefined {
  return coffeeRules.find((rule) => {
    return (
      rule.equipment === ruleInput.equipment &&
      rule.roast === ruleInput.roast &&
      rule.taste === ruleInput.taste &&
      rule.flow === ruleInput.flow
    );
  });
}

export function getSuggestion(form: DiagnosisForm): SuggestionResult {
  const taste = form.taste;

  console.log("[coffeeRules] resolving suggestion", form);

  if (!taste) {
    return {
      suggestion: "味をひとつ選んでください",
      reason: "今の印象が分かると、次の一杯で直すポイントをひとつに絞れます",
      fallbackType: "general",
    };
  }

  const equipment = form.equipment;
  const roast = form.roast;
  const flow = form.flow;

  if (equipment && roast && roast !== "unknown" && flow && flow !== "unknown") {
    const exactRule = findExactRule({ equipment, roast, taste, flow });
    if (exactRule) {
      console.log("[coffeeRules] exact rule matched", exactRule);
      return {
        suggestion: exactRule.suggestion,
        reason: exactRule.reason,
        matchedRule: exactRule,
        fallbackType: "exact",
      };
    }
  }

  if (equipment && roast && roast !== "unknown") {
    const normalRule = findExactRule({ equipment, roast, taste, flow: "normal" });
    if (normalRule) {
      console.log("[coffeeRules] normal-flow rule matched", normalRule);
      return {
        suggestion: normalRule.suggestion,
        reason: normalRule.reason,
        matchedRule: normalRule,
        fallbackType: "exact",
      };
    }
    const unknownFlowRule = findExactRule({ equipment, roast, taste, flow: "unknown" });
    if (unknownFlowRule) {
      console.log("[coffeeRules] unknown-flow rule matched", unknownFlowRule);
      return {
        suggestion: unknownFlowRule.suggestion,
        reason: unknownFlowRule.reason,
        matchedRule: unknownFlowRule,
        fallbackType: "exact",
      };
    }
  }

  if (form.helperTaste === "aroma_weak") {
    console.log("[coffeeRules] helper fallback used", helperFallback);
    return {
      ...helperFallback,
      fallbackType: "general",
    };
  }

  const roastKey = roast ?? "unknown";

  const otherRule = coffeeRules.find(
    (r) => r.equipment === "other" && r.roast === roastKey && r.taste === taste
  );
  if (otherRule) {
    console.log("[coffeeRules] 'other' equipment fallback matched", otherRule);
    return {
      suggestion: otherRule.suggestion,
      reason: otherRule.reason,
      matchedRule: otherRule,
      fallbackType: "equipment",
    };
  }

  const otherUnknownRoast = coffeeRules.find(
    (r) => r.equipment === "other" && r.roast === "unknown" && r.taste === taste
  );
  if (otherUnknownRoast) {
    console.log("[coffeeRules] 'other' unknown-roast fallback matched", otherUnknownRoast);
    return {
      suggestion: otherUnknownRoast.suggestion,
      reason: otherUnknownRoast.reason,
      matchedRule: otherUnknownRoast,
      fallbackType: "equipment",
    };
  }

  const generalByRoast = generalTasteSuggestion[taste][roastKey] ?? generalTasteSuggestion[taste].unknown;
  console.log("[coffeeRules] general roast fallback used", generalByRoast);
  return {
    suggestion: generalByRoast.suggestion,
    reason: generalByRoast.reason,
    fallbackType: "general",
  };
}
