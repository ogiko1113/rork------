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

  const exactRule =
    form.equipment && form.roast && form.roast !== "unknown" && form.flow && form.flow !== "unknown" && form.flow !== "normal"
      ? findExactRule({
          equipment: form.equipment,
          roast: form.roast,
          taste,
          flow: form.flow,
        })
      : undefined;

  if (exactRule) {
    console.log("[coffeeRules] exact rule matched", exactRule);
    return {
      suggestion: exactRule.suggestion,
      reason: exactRule.reason,
      matchedRule: exactRule,
      fallbackType: "exact",
    };
  }

  if (form.helperTaste === "aroma_weak") {
    console.log("[coffeeRules] helper fallback used", helperFallback);
    return {
      ...helperFallback,
      fallbackType: "general",
    };
  }

  const roastKey = form.roast ?? "unknown";
  const generalByRoast = generalTasteSuggestion[taste][roastKey] ?? generalTasteSuggestion[taste].unknown;

  if (form.equipment === "hario_v60" || form.equipment === null) {
    console.log("[coffeeRules] general roast fallback used", generalByRoast);
    return {
      suggestion: generalByRoast.suggestion,
      reason: generalByRoast.reason,
      fallbackType: "general",
    };
  }

  const equipmentFallback = taste === "bitter"
    ? {
        suggestion: "挽きを少し粗く",
        reason: "器具が違っても、苦さが残るときは抽出を少し抑えるのが基本です",
      }
    : taste === "sour"
      ? {
          suggestion: "挽きを少し細かく",
          reason: "酸っぱさが出るときは、まず抽出を少し進めるのが安全です",
        }
      : {
          suggestion: "湯温を少し上げる",
          reason: "薄いときは抽出の進み方を少しだけ強めると変化が見えやすいです",
        };

  console.log("[coffeeRules] equipment fallback used", equipmentFallback);
  return {
    suggestion: equipmentFallback.suggestion,
    reason: equipmentFallback.reason,
    fallbackType: "equipment",
  };
}
