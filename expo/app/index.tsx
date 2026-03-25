import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Coffee, Droplets, RotateCcw, Save, Share2, Sparkles } from "lucide-react-native";

import { equipmentOptions, flowOptions, helperTasteOptions, roastOptions, tasteOptions } from "@/constants/coffeeOptions";
import { coffeeTheme } from "@/constants/coffeeTheme";
import { getSuggestion } from "@/lib/coffeeRules";
import { getSavedSuggestions, saveSuggestionRecord } from "@/lib/storage";
import { DiagnosisForm, EquipmentKey, FlowKey, RoastKey, SavedSuggestion, TasteKey } from "@/types/coffee";

type AppStep = "diagnosis" | "suggestion" | "result";
type UnknownTasteValue = TasteKey | "unknown";
type ResultChoice = "better" | "slightly" | "opposite" | "unknown";

const initialForm: DiagnosisForm = {
  taste: null,
  helperTaste: null,
  equipment: null,
  roast: null,
  flow: null,
};

const buttonHeight = 58;
const accentShadow = {
  shadowColor: coffeeTheme.shadow,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 6,
};

function SelectionCard<T extends string>({
  title,
  description,
  options,
  selectedValue,
  onSelect,
  testId,
}: {
  title: string;
  description?: string;
  options: { value: T; label: string; description?: string }[];
  selectedValue: T | null;
  onSelect: (value: T) => void;
  testId: string;
}) {
  return (
    <View style={styles.sectionCard} testID={testId}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const selected = selectedValue === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.optionButton,
                selected ? styles.optionButtonSelected : null,
                pressed ? styles.optionButtonPressed : null,
              ]}
              testID={`${testId}-${option.value}`}
            >
              <Text style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}>{option.label}</Text>
              {option.description ? (
                <Text style={[styles.optionDescription, selected ? styles.optionDescriptionSelected : null]}>
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  testId,
  subtle,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  testId: string;
  subtle?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        subtle ? styles.secondaryButton : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.primaryButtonPressed : null,
      ]}
      testID={testId}
    >
      <View style={styles.primaryButtonContent}>
        {icon}
        <Text style={[styles.primaryButtonText, subtle ? styles.secondaryButtonText : null]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [step, setStep] = useState<AppStep>("diagnosis");
  const [form, setForm] = useState<DiagnosisForm>(initialForm);
  const [showHelperTaste, setShowHelperTaste] = useState<boolean>(false);
  const [resultChoice, setResultChoice] = useState<ResultChoice | null>(null);

  const savedSuggestionsQuery = useQuery({
    queryKey: ["saved-suggestions"],
    queryFn: getSavedSuggestions,
  });

  const saveMutation = useMutation({
    mutationFn: saveSuggestionRecord,
    onSuccess: async () => {
      await savedSuggestionsQuery.refetch();
      Alert.alert("保存しました", "提案と条件をこの端末に保存しました");
    },
    onError: () => {
      Alert.alert("保存できませんでした", "少し時間をおいて、もう一度お試しください");
    },
  });

  const suggestion = useMemo(() => getSuggestion(form), [form]);

  const canProceed = Boolean(form.taste && form.equipment && form.roast && form.flow);

  const handleTasteSelect = useCallback((value: UnknownTasteValue) => {
    void Haptics.selectionAsync();
    if (value === "unknown") {
      setShowHelperTaste(true);
      setForm((current) => ({
        ...current,
        taste: null,
        helperTaste: null,
      }));
      return;
    }

    setShowHelperTaste(false);
    setForm((current) => ({
      ...current,
      taste: value,
      helperTaste: value,
    }));
  }, []);

  const handleHelperSelect = useCallback((value: DiagnosisForm["helperTaste"]) => {
    void Haptics.selectionAsync();
    setForm((current) => ({
      ...current,
      helperTaste: value,
      taste: value === "aroma_weak" ? "thin" : value,
    }));
  }, []);

  const handleDiagnosisSubmit = useCallback(() => {
    if (!canProceed) {
      Alert.alert("あと少しです", "味・器具・焙煎度・お湯の落ち方を選んでください");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("suggestion");
  }, [canProceed]);

  const handleSaveSuggestion = useCallback(() => {
    if (!form.taste || !form.equipment || !form.roast || !form.flow) {
      return;
    }

    const record: SavedSuggestion = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      suggestion: suggestion.suggestion,
      reason: suggestion.reason,
      taste: form.taste,
      equipment: form.equipment,
      roast: form.roast,
      flow: form.flow,
    };

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveMutation.mutate(record);
  }, [form.equipment, form.flow, form.roast, form.taste, saveMutation, suggestion.reason, suggestion.suggestion]);

  const handleShareFallback = useCallback(async () => {
    const shareMessage = `次の一杯\n提案: ${suggestion.suggestion}\n理由: ${suggestion.reason}\n\n味: ${form.taste ?? "未選択"}\n器具: ${form.equipment ?? "未選択"}\n焙煎度: ${form.roast ?? "未選択"}\nお湯: ${form.flow ?? "未選択"}`;

    try {
      await Share.share({
        message: shareMessage,
        title: "次の一杯の提案",
      });
    } catch (error) {
      console.log("[share] failed", error);
      Alert.alert("共有できませんでした", "この環境ではスクリーンショット保存の代わりに共有を案内しています");
    }
  }, [form.equipment, form.flow, form.roast, form.taste, suggestion.reason, suggestion.suggestion]);

  const handleResultChoice = useCallback((value: ResultChoice) => {
    void Haptics.selectionAsync();
    setResultChoice(value);

    if (value === "slightly" || value === "opposite") {
      setTimeout(() => {
        setStep("diagnosis");
      }, 500);
    }
  }, []);

  const resetDiagnosis = useCallback(() => {
    void Haptics.selectionAsync();
    setStep("diagnosis");
    setResultChoice(null);
    setShowHelperTaste(false);
    setForm(initialForm);
  }, []);

  const savedCount = savedSuggestionsQuery.data?.length ?? 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#FCF8F3", "#F4E8D8"]} style={styles.backgroundGlow} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>次の一杯</Text>
              <Text style={styles.headerTitle}>今の一杯、どうでしたか？</Text>
            </View>
            <View style={styles.badge}>
              <Coffee color={coffeeTheme.accentStrong} size={18} />
              <Text style={styles.badgeText}>{savedCount}件保存</Text>
            </View>
          </View>

          {step === "diagnosis" ? (
            <View style={styles.stageContainer} testID="diagnosis-screen">
              <SelectionCard
                title="味の印象"
                options={tasteOptions}
                selectedValue={showHelperTaste ? "unknown" : form.taste}
                onSelect={handleTasteSelect}
                testId="taste-selector"
              />

              {showHelperTaste ? (
                <SelectionCard
                  title="何が近いですか？"
                  description="迷うときは、最も気になった感覚を1つ選んでください"
                  options={helperTasteOptions}
                  selectedValue={form.helperTaste}
                  onSelect={handleHelperSelect}
                  testId="helper-selector"
                />
              ) : null}

              <View style={styles.compactRow}>
                <View style={styles.compactColumn}>
                  <SelectionCard
                    title="器具"
                    options={equipmentOptions}
                    selectedValue={form.equipment}
                    onSelect={(value) => {
                      void Haptics.selectionAsync();
                      setForm((current) => ({ ...current, equipment: value as EquipmentKey }));
                    }}
                    testId="equipment-selector"
                  />
                </View>
                <View style={styles.compactColumn}>
                  <SelectionCard
                    title="焙煎度"
                    options={roastOptions}
                    selectedValue={form.roast}
                    onSelect={(value) => {
                      void Haptics.selectionAsync();
                      setForm((current) => ({ ...current, roast: value as RoastKey }));
                    }}
                    testId="roast-selector"
                  />
                </View>
              </View>

              <SelectionCard
                title="お湯が落ちるのは？"
                options={flowOptions}
                selectedValue={form.flow}
                onSelect={(value) => {
                  void Haptics.selectionAsync();
                  setForm((current) => ({ ...current, flow: value as FlowKey }));
                }}
                testId="flow-selector"
              />

              <PrimaryButton
                label="次の一杯を直す"
                onPress={handleDiagnosisSubmit}
                disabled={!canProceed}
                icon={<Sparkles color="#FFF9F0" size={18} />}
                testId="go-to-suggestion"
              />
            </View>
          ) : null}

          {step === "suggestion" ? (
            <View style={styles.stageContainer} testID="suggestion-screen">
              <View style={[styles.suggestionCard, accentShadow]}>
                <View style={styles.suggestionPill}>
                  <Droplets color={coffeeTheme.accentStrong} size={16} />
                  <Text style={styles.suggestionPillText}>次の一杯で変えることは1つだけ</Text>
                </View>
                <Text style={styles.suggestionText}>{suggestion.suggestion}</Text>
                <Text style={styles.reasonText}>{suggestion.reason}</Text>
                <Text style={styles.footnote}>明日の朝、もう一杯試してみてください</Text>
              </View>

              <View style={styles.actionRow}>
                <PrimaryButton
                  label={saveMutation.isPending ? "保存中..." : "この提案を保存"}
                  onPress={handleSaveSuggestion}
                  disabled={saveMutation.isPending}
                  icon={<Save color="#FFF9F0" size={18} />}
                  testId="save-suggestion"
                />
                <PrimaryButton
                  label="スクリーンショットを保存"
                  onPress={() => {
                    Alert.alert(
                      "共有で保存を補助します",
                      "この環境では直接の画面保存ではなく、共有シートで保存や送信を行えます",
                      [
                        { text: "キャンセル", style: "cancel" },
                        { text: "共有する", onPress: () => void handleShareFallback() },
                      ]
                    );
                  }}
                  icon={<Share2 color={coffeeTheme.accentStrong} size={18} />}
                  testId="share-suggestion"
                  subtle
                />
              </View>

              <PrimaryButton
                label="次に淹れたら教えてください →"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep("result");
                  setResultChoice(null);
                }}
                testId="go-to-result"
              />
            </View>
          ) : null}

          {step === "result" ? (
            <View style={styles.stageContainer} testID="result-screen">
              <View style={styles.resultIntroCard}>
                <Text style={styles.sectionTitle}>次の一杯はどうでしたか？</Text>
                <Text style={styles.sectionDescription}>2タップ以内で終わるように、短く選べるようにしました。</Text>
              </View>

              <View style={styles.resultGrid}>
                <PrimaryButton
                  label="良くなった！"
                  onPress={() => handleResultChoice("better")}
                  testId="result-better"
                />
                <PrimaryButton
                  label="まだ少し気になる"
                  onPress={() => handleResultChoice("slightly")}
                  testId="result-slightly"
                  subtle
                />
                <PrimaryButton
                  label="逆になった"
                  onPress={() => handleResultChoice("opposite")}
                  testId="result-opposite"
                  subtle
                />
                <PrimaryButton
                  label="よく分からない"
                  onPress={() => handleResultChoice("unknown")}
                  testId="result-unknown"
                  subtle
                />
              </View>

              {resultChoice === "better" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>やった！このレシピを保存しますか？</Text>
                  <Text style={styles.feedbackText}>今の提案が合っていそうです。必要ならもう一度保存してください。</Text>
                  <PrimaryButton
                    label="この提案を保存"
                    onPress={handleSaveSuggestion}
                    testId="result-save"
                  />
                </View>
              ) : null}

              {resultChoice === "slightly" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>もう一歩ですね。もう一回試してみましょう</Text>
                  <Text style={styles.feedbackText}>診断画面に戻ります。条件を少し見直してみてください。</Text>
                </View>
              ) : null}

              {resultChoice === "opposite" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>すみません、逆方向に動きました。もう一度診断しましょう</Text>
                  <Text style={styles.feedbackText}>診断画面に戻ります。最初の印象から選び直せます。</Text>
                </View>
              ) : null}

              {resultChoice === "unknown" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>何が気になりますか？</Text>
                  <Text style={styles.feedbackText}>口がキュッとする / 後味が渋い / 水っぽい / 香りが弱い から近いものを選んで、もう一度診断してください。</Text>
                  <PrimaryButton
                    label="診断に戻る"
                    onPress={() => setStep("diagnosis")}
                    testId="back-to-diagnosis"
                  />
                </View>
              ) : null}

              <Pressable onPress={resetDiagnosis} style={styles.inlineReset} testID="reset-diagnosis">
                <RotateCcw color={coffeeTheme.textMuted} size={16} />
                <Text style={styles.inlineResetText}>最初からやり直す</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: coffeeTheme.background,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: coffeeTheme.text,
    fontWeight: "700",
    maxWidth: 250,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: coffeeTheme.accentStrong,
  },
  stageContainer: {
    flex: 1,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: "rgba(255,253,249,0.86)",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 10,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: coffeeTheme.text,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: coffeeTheme.textMuted,
  },
  compactRow: {
    flexDirection: "row",
    gap: 10,
  },
  compactColumn: {
    flex: 1,
  },
  optionGrid: {
    gap: 8,
  },
  optionButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: coffeeTheme.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    justifyContent: "center",
    gap: 4,
  },
  optionButtonSelected: {
    backgroundColor: coffeeTheme.accentStrong,
    borderColor: coffeeTheme.accentStrong,
  },
  optionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: coffeeTheme.text,
  },
  optionLabelSelected: {
    color: "#FFF9F0",
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: coffeeTheme.textMuted,
  },
  optionDescriptionSelected: {
    color: "rgba(255,249,240,0.82)",
  },
  primaryButton: {
    minHeight: buttonHeight,
    borderRadius: 20,
    backgroundColor: coffeeTheme.accent,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    ...accentShadow,
  },
  secondaryButton: {
    backgroundColor: coffeeTheme.surface,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF9F0",
  },
  secondaryButtonText: {
    color: coffeeTheme.accentStrong,
  },
  suggestionCard: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: coffeeTheme.surface,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    justifyContent: "space-between",
  },
  suggestionPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: coffeeTheme.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: coffeeTheme.accentStrong,
  },
  suggestionText: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
    color: coffeeTheme.text,
    marginTop: 10,
  },
  reasonText: {
    fontSize: 16,
    lineHeight: 24,
    color: coffeeTheme.textMuted,
  },
  footnote: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
  },
  actionRow: {
    gap: 10,
  },
  resultIntroCard: {
    backgroundColor: "rgba(255,253,249,0.82)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 8,
  },
  resultGrid: {
    gap: 10,
  },
  feedbackCard: {
    backgroundColor: coffeeTheme.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 10,
  },
  feedbackTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: coffeeTheme.text,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: coffeeTheme.textMuted,
  },
  inlineReset: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 42,
  },
  inlineResetText: {
    fontSize: 14,
    color: coffeeTheme.textMuted,
    fontWeight: "600",
  },
});
