import rulesJson from "@/data/coffee-rules.json";
import { CoffeeRule, CoffeeRulesJson, DiagnosisForm, SuggestionResult, TasteKey } from "@/types/coffee";

const coffeeRules = (rulesJson as CoffeeRulesJson).rules;

const generalTasteSuggestion: Record<TasteKey, Record<string, { suggestion: string; reason: string }>> = {
  sour: {
    light: {
      suggestion: "挽きを少し細かく",
      reason: "浅煎りの酸っぱさは抽出不足になりやすいです",
    },
    medium: {
      suggestion: "挽きを少し細かく",
      reason: "成分をもう少し引き出すと味がまとまりやすくなります",
    },
    dark: {
      suggestion: "湯温を上げる（92℃以上へ）",
      reason: "深煎りでも温度が低いと酸味が前に出ます",
    },
    unknown: {
      suggestion: "挽きを少し細かく",
      reason: "まずは抽出量を少し増やして味の芯を探しましょう",
    },
  },
  bitter: {
    light: {
      suggestion: "湯温を下げる（90℃前後へ）",
      reason: "浅煎りは温度の影響を受けやすく、苦さが立つことがあります",
    },
    medium: {
      suggestion: "挽きを少し粗く",
      reason: "苦さが残るときは抽出を少しだけ抑えるのが安全です",
    },
    dark: {
      suggestion: "挽きを少し粗く",
      reason: "深煎りは過抽出で重さと渋さが出やすいです",
    },
    unknown: {
      suggestion: "湯温を少し下げる",
      reason: "まずは苦みの出方を穏やかにしてバランスを見ましょう",
    },
  },
  thin: {
    light: {
      suggestion: "粉量を増やす（+2g）",
      reason: "成分量が足りず、味が水っぽく感じやすいです",
    },
    medium: {
      suggestion: "挽きを細かく + 粉量を増やす",
      reason: "濃度と抽出量の両方を少し上げると改善しやすいです",
    },
    dark: {
      suggestion: "粉量を増やす（+2g）",
      reason: "深煎りでも薄いときはまず粉量を見直すのが確実です",
    },
    unknown: {
      suggestion: "粉量を増やす（+2g）",
      reason: "まずはコーヒー成分の総量を少し増やしてみましょう",
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
