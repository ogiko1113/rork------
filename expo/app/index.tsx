import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ChevronLeft, Clock, Coffee, Droplets, RotateCcw, Save, Share2, Sparkles } from "lucide-react-native";

import {
  equipmentOptions,
  flowOptions,
  helperTasteOptions,
  roastOptions,
  tasteOptions,
  tempPresets,
  TEMP_BOILING,
  TEMP_MAX,
  TEMP_MIN,
} from "@/constants/coffeeOptions";
import { coffeeTheme } from "@/constants/coffeeTheme";
import { router } from "expo-router";
import { getSuggestion, getTempRange } from "@/lib/coffeeRules";
import { getSavedSuggestions, getUserSettings, saveBrewRecord, saveDiagnosisMode } from "@/lib/storage";
import {
  BrewRecord,
  DiagnosisForm,
  DiagnosisMode,
  EquipmentKey,
  FlowKey,
  HelperTasteKey,
  RoastKey,
  TasteKey,
} from "@/types/coffee";

type AppStep = "diagnosis" | "suggestion" | "result";
type DiagnosisStep = 1 | 2 | 3 | 4 | 5 | 6;
type UnknownTasteValue = TasteKey | "unknown";
type ResultChoice = "improved" | "still_off" | "reversed" | "unclear";

const initialForm: DiagnosisForm = {
  taste: null,
  helperTaste: null,
  equipment: null,
  roast: null,
  dose: null,
  flow: null,
  temp: null,
  tempRange: "unknown",
  mode: "normal",
};

const buttonHeight = 58;
const accentShadow = {
  shadowColor: coffeeTheme.shadow,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 6,
};

// --- Reusable Components ---

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

// --- Main Screen ---

export default function HomeScreen() {
  const [step, setStep] = useState<AppStep>("diagnosis");
  const [diagStep, setDiagStep] = useState<DiagnosisStep>(1);
  const [showHelperTaste, setShowHelperTaste] = useState(false);
  const [form, setForm] = useState<DiagnosisForm>(initialForm);
  const [mode, setMode] = useState<DiagnosisMode>("normal");
  const [doseInput, setDoseInput] = useState("");
  const [tempInput, setTempInput] = useState("");
  const [tempError, setTempError] = useState<string | null>(null);
  const [resultChoice, setResultChoice] = useState<ResultChoice | null>(null);
  const [lastBrewId, setLastBrewId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Load saved mode on mount
  useEffect(() => {
    void getUserSettings().then((s) => {
      setMode(s.diagnosisMode);
      setForm((f) => ({ ...f, mode: s.diagnosisMode }));
    });
  }, []);

  const savedSuggestionsQuery = useQuery({
    queryKey: ["saved-suggestions"],
    queryFn: getSavedSuggestions,
  });

  const saveMutation = useMutation({
    mutationFn: saveBrewRecord,
    onSuccess: async () => {
      await savedSuggestionsQuery.refetch();
      Alert.alert("保存しました", "提案と条件をこの端末に保存しました");
    },
    onError: () => {
      Alert.alert("保存できませんでした", "少し時間をおいて、もう一度お試しください");
    },
  });

  const suggestion = useMemo(() => getSuggestion(form), [form]);

  // --- Diagnosis Step Helpers ---

  const _maxDiagStep: DiagnosisStep = mode === "detailed" ? 6 : 5;

  const shouldSkipFlow = form.equipment === "french_press";

  const getEffectiveMaxStep = useCallback((): DiagnosisStep => {
    if (mode === "normal") {
      return 5;
    }
    return 6;
  }, [mode]);

  const canGoNext = useCallback((): boolean => {
    switch (diagStep) {
      case 1:
        return form.roast !== null;
      case 2:
        return true; // dose is optional
      case 3:
        return form.equipment !== null;
      case 4:
        return form.flow !== null;
      case 5:
        return showHelperTaste ? form.helperTaste !== null : form.taste !== null;
      case 6:
        return true; // temp is optional
      default:
        return false;
    }
  }, [diagStep, form, showHelperTaste]);

  const goNextStep = useCallback(() => {
    void Haptics.selectionAsync();
    const effective = getEffectiveMaxStep();
    if (diagStep >= effective) {
      // Submit diagnosis
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep("suggestion");
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }

    let next = (diagStep + 1) as DiagnosisStep;
    // Skip flow step (step 4) for french press
    if (next === 4 && shouldSkipFlow) {
      setForm((f) => ({ ...f, flow: "unknown" }));
      next = 5 as DiagnosisStep;
    }

    setDiagStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [diagStep, getEffectiveMaxStep, shouldSkipFlow]);

  const goPrevStep = useCallback(() => {
    void Haptics.selectionAsync();
    if (diagStep === 1) return;

    let prev = (diagStep - 1) as DiagnosisStep;
    // Skip flow step (step 4) going back for french press
    if (prev === 4 && shouldSkipFlow) {
      prev = 3 as DiagnosisStep;
    }

    if (prev === 5 && showHelperTaste) {
      // stay on step 5 but we're in helper mode, that's fine
    }

    setDiagStep(prev);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [diagStep, shouldSkipFlow, showHelperTaste]);

  // --- Handlers ---

  const handleTasteSelect = useCallback((value: UnknownTasteValue) => {
    void Haptics.selectionAsync();
    if (value === "unknown") {
      setShowHelperTaste(true);
      setForm((f) => ({ ...f, taste: null, helperTaste: null }));
      return;
    }
    setShowHelperTaste(false);
    setForm((f) => ({ ...f, taste: value, helperTaste: value }));
  }, []);

  const handleHelperSelect = useCallback((value: HelperTasteKey | "none") => {
    void Haptics.selectionAsync();
    if (value === "none") {
      // "unclear" maps to fallback-004
      setForm((f) => ({ ...f, helperTaste: null, taste: null }));
      // Proceed with taste = null, will hit fallback
      setShowHelperTaste(false);
      // Set a special flag so we know it's "unclear"
      setForm((f) => ({ ...f, taste: "thin" as TasteKey, helperTaste: null }));
      return;
    }
    const tasteMap: Record<HelperTasteKey, TasteKey> = {
      sour: "sour",
      bitter: "bitter",
      thin: "thin",
      aroma_weak: "thin",
    };
    setForm((f) => ({
      ...f,
      helperTaste: value,
      taste: tasteMap[value],
    }));
  }, []);

  const handleDoseInputChange = useCallback((text: string) => {
    setDoseInput(text);
    if (text === "") {
      setForm((f) => ({ ...f, dose: null }));
      return;
    }
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0) {
      setForm((f) => ({ ...f, dose: num }));
    }
  }, []);

  const handleTempPreset = useCallback((celsius: number) => {
    void Haptics.selectionAsync();
    setTempInput(String(celsius));
    setTempError(null);
    setForm((f) => ({ ...f, temp: celsius, tempRange: getTempRange(celsius) }));
  }, []);

  const handleTempInputChange = useCallback((text: string) => {
    setTempInput(text);
    const num = parseInt(text, 10);
    if (text === "") {
      setTempError(null);
      setForm((f) => ({ ...f, temp: null, tempRange: "unknown" }));
      return;
    }
    if (isNaN(num) || num < TEMP_MIN || num > TEMP_MAX) {
      setTempError(`${TEMP_MIN}〜${TEMP_MAX}の範囲で入力してください`);
      return;
    }
    setTempError(null);
    setForm((f) => ({ ...f, temp: num, tempRange: getTempRange(num) }));
  }, []);

  const handleTempUnknown = useCallback(() => {
    void Haptics.selectionAsync();
    setTempInput("");
    setTempError(null);
    setForm((f) => ({ ...f, temp: null, tempRange: "unknown" }));
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  }, [toastOpacity]);

  const handleModeToggle = useCallback(() => {
    const next: DiagnosisMode = mode === "normal" ? "detailed" : "normal";
    setMode(next);
    setForm((f) => ({ ...f, mode: next }));
    if (next === "normal") {
      setForm((f) => ({ ...f, temp: null, tempRange: "unknown" }));
      setTempInput("");
      setTempError(null);
    }
    void Haptics.selectionAsync();
    void saveDiagnosisMode(next);
    showToast(next === "detailed" ? "くわしく診断に切り替えました" : "かんたん診断に切り替えました");
  }, [mode, showToast]);

  const handleSave = useCallback(() => {
    if (!form.taste || !form.equipment || !form.roast) return;

    const record: BrewRecord = {
      id: `${Date.now()}`,
      equipment: form.equipment,
      roast: form.roast,
      taste: form.taste,
      dose: form.dose,
      flow: form.flow ?? "unknown",
      temp: form.temp,
      tempRange: form.tempRange,
      mode: form.mode,
      suggestion: suggestion.suggestion,
      reason: suggestion.reason,
      result: null,
      previousBrewId: lastBrewId,
      createdAt: new Date().toISOString(),
    };

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveMutation.mutate(record);
    setLastBrewId(record.id);
  }, [form, suggestion, saveMutation, lastBrewId]);

  const handleShareFallback = useCallback(async () => {
    const msg = `次の一杯\n提案: ${suggestion.suggestion}\n理由: ${suggestion.reason}`;
    try {
      await Share.share({ message: msg, title: "次の一杯の提案" });
    } catch {
      Alert.alert("共有できませんでした");
    }
  }, [suggestion]);

  const handleResultChoice = useCallback(
    (value: ResultChoice) => {
      void Haptics.selectionAsync();
      setResultChoice(value);

      if (value === "improved") {
        // Show save prompt — handled in render
        return;
      }

      if (value === "still_off") {
        // Back to diagnosis with previous inputs preserved
        setTimeout(() => {
          setStep("diagnosis");
          setDiagStep(1);
          setResultChoice(null);
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, 600);
        return;
      }

      if (value === "reversed") {
        // Reset all inputs
        setTimeout(() => {
          setForm({ ...initialForm, mode });
          setDiagStep(1);
          setShowHelperTaste(false);
          setDoseInput("");
          setTempInput("");
          setTempError(null);
          setStep("diagnosis");
          setResultChoice(null);
          setLastBrewId(null);
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, 600);
        return;
      }

      // "unclear" — show follow-up in render
    },
    [mode]
  );

  const handleResultFollowUp = useCallback(
    (taste: TasteKey) => {
      void Haptics.selectionAsync();
      setForm((f) => ({ ...f, taste }));
      setTimeout(() => {
        setStep("diagnosis");
        setDiagStep(1);
        setResultChoice(null);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 800);
    },
    []
  );

  const resetDiagnosis = useCallback(() => {
    void Haptics.selectionAsync();
    setForm({ ...initialForm, mode });
    setDiagStep(1);
    setShowHelperTaste(false);
    setTempInput("");
    setTempError(null);
    setStep("diagnosis");
    setResultChoice(null);
    setLastBrewId(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [mode]);

  const savedCount = savedSuggestionsQuery.data?.length ?? 0;

  // --- Diagnosis Step Labels ---
  const diagStepLabel = (() => {
    switch (diagStep) {
      case 1:
        return "豆の焙煎度は？";
      case 2:
        return "コーヒーの粉量は？";
      case 3:
        return "使っている器具は？";
      case 4:
        return shouldSkipFlow ? "お湯の温度は？" : "お湯が落ちるのは？";
      case 5:
        return showHelperTaste ? "こんな感じはありますか？" : "今のコーヒー、何が気になりますか？";
      case 6:
        return "お湯の温度は？";
      default:
        return "";
    }
  })();

  const effectiveMax = getEffectiveMaxStep();
  const isLastDiagStep = diagStep >= effectiveMax;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#FCF8F3", "#F4E8D8"]} style={styles.backgroundGlow} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>次の一杯</Text>
            <Text style={styles.headerTitle}>
              {step === "diagnosis" ? "今の一杯、どうでしたか？" : step === "suggestion" ? "提案" : "結果入力"}
            </Text>
          </View>
          <Pressable style={styles.badge} onPress={() => router.push("/history")} testID="badge-go-to-history">
            <Coffee color={coffeeTheme.accentStrong} size={18} />
            <Text style={styles.badgeText}>{savedCount}件保存</Text>
          </Pressable>
        </View>

        {/* Mode label + toggle - diagnosis only */}
        {step === "diagnosis" ? (
          <View style={styles.modeRow}>
            <Text style={[styles.modeLabel, mode === "detailed" ? styles.modeLabelDetailed : null]}>
              {mode === "normal" ? "かんたん診断" : "くわしく診断"}
            </Text>
            <Pressable onPress={handleModeToggle} testID="mode-toggle">
              <Text style={styles.modeToggleText}>
                {mode === "normal" ? "もっと正確に診断する ＞" : "かんたん診断に戻す ＞"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Toast */}
        {toastMessage ? (
          <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== DIAGNOSIS ===== */}
          {step === "diagnosis" ? (
            <View style={styles.stageContainer} testID="diagnosis-screen">
              {/* Progress */}
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  ステップ {diagStep} / {effectiveMax}
                </Text>
              </View>

              {/* Back button */}
              {diagStep > 1 ? (
                <Pressable onPress={goPrevStep} style={styles.backButton} testID="diag-back">
                  <ChevronLeft color={coffeeTheme.textMuted} size={20} />
                  <Text style={styles.backButtonText}>戻る</Text>
                </Pressable>
              ) : null}

              {/* Step 1: Roast */}
              {diagStep === 1 ? (
                <SelectionCard
                  title={diagStepLabel}
                  options={roastOptions}
                  selectedValue={form.roast}
                  onSelect={(value) => {
                    void Haptics.selectionAsync();
                    setForm((f) => ({ ...f, roast: value as RoastKey }));
                  }}
                  testId="roast-selector"
                />
              ) : null}

              {/* Step 2: Dose (optional) */}
              {diagStep === 2 ? (
                <View style={styles.sectionCard} testID="dose-input">
                  <Text style={styles.sectionTitle}>{diagStepLabel}</Text>
                  <Text style={styles.sectionDescription}>分からなければスキップしてOK</Text>
                  <View style={styles.tempInputRow}>
                    <TextInput
                      style={styles.tempTextInput}
                      value={doseInput}
                      onChangeText={handleDoseInputChange}
                      keyboardType="numeric"
                      placeholder="例: 15"
                      placeholderTextColor={coffeeTheme.textMuted}
                      maxLength={5}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                      testID="dose-free-input"
                    />
                    <Text style={styles.tempUnit}>g</Text>
                  </View>
                </View>
              ) : null}

              {/* Step 3: Equipment */}
              {diagStep === 3 ? (
                <SelectionCard
                  title={diagStepLabel}
                  options={equipmentOptions}
                  selectedValue={form.equipment}
                  onSelect={(value) => {
                    void Haptics.selectionAsync();
                    setForm((f) => ({ ...f, equipment: value as EquipmentKey }));
                  }}
                  testId="equipment-selector"
                />
              ) : null}

              {/* Step 4: Flow (skipped for french press) */}
              {diagStep === 4 && !shouldSkipFlow ? (
                <SelectionCard
                  title={diagStepLabel}
                  options={flowOptions}
                  selectedValue={form.flow}
                  onSelect={(value) => {
                    void Haptics.selectionAsync();
                    setForm((f) => ({ ...f, flow: value as FlowKey }));
                  }}
                  testId="flow-selector"
                />
              ) : null}

              {/* Step 5: Taste */}
              {diagStep === 5 && !showHelperTaste ? (
                <SelectionCard
                  title={diagStepLabel}
                  options={tasteOptions}
                  selectedValue={form.taste ?? (showHelperTaste ? ("unknown" as TasteKey) : null)}
                  onSelect={handleTasteSelect}
                  testId="taste-selector"
                />
              ) : null}

              {/* Step 5b: Helper taste */}
              {diagStep === 5 && showHelperTaste ? (
                <SelectionCard
                  title={diagStepLabel}
                  description="迷うときは、最も気になった感覚を1つ選んでください"
                  options={helperTasteOptions}
                  selectedValue={(form.helperTaste ?? null) as (HelperTasteKey | "none") | null}
                  onSelect={handleHelperSelect}
                  testId="helper-selector"
                />
              ) : null}

              {/* Step 6: Temp input (detailed mode only) */}
              {(diagStep === 6 && mode === "detailed") ? (
                <View style={styles.sectionCard} testID="temp-input">
                  <Text style={styles.sectionTitle}>{diagStepLabel}</Text>

                  {/* Presets */}
                  <View style={styles.tempPresetRow}>
                    {tempPresets.map((p) => {
                      const selected = form.temp === p.value;
                      return (
                        <Pressable
                          key={p.value}
                          onPress={() => handleTempPreset(p.value)}
                          style={[styles.tempPresetButton, selected ? styles.optionButtonSelected : null]}
                          testID={`temp-${p.value}`}
                        >
                          <Text style={[styles.tempPresetText, selected ? styles.optionLabelSelected : null]}>
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Boiling */}
                  <Pressable
                    onPress={() => handleTempPreset(TEMP_BOILING)}
                    style={[
                      styles.boilingButton,
                      form.temp === TEMP_BOILING ? styles.optionButtonSelected : null,
                    ]}
                    testID="temp-boiling"
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        form.temp === TEMP_BOILING ? styles.optionLabelSelected : null,
                      ]}
                    >
                      沸騰直後
                    </Text>
                  </Pressable>

                  {/* Free input */}
                  <View style={styles.tempInputRow}>
                    <TextInput
                      style={styles.tempTextInput}
                      value={tempInput}
                      onChangeText={handleTempInputChange}
                      keyboardType="numeric"
                      placeholder="温度を入力（60〜100）"
                      placeholderTextColor={coffeeTheme.textMuted}
                      maxLength={3}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                      testID="temp-free-input"
                    />
                    <Text style={styles.tempUnit}>℃</Text>
                  </View>
                  {tempError ? <Text style={styles.tempErrorText}>{tempError}</Text> : null}

                  {/* Unknown link */}
                  <Pressable onPress={handleTempUnknown} testID="temp-unknown">
                    <Text style={styles.textLink}>分からない</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Next / Submit button */}
              <PrimaryButton
                label={isLastDiagStep ? "次の一杯を直す" : "次へ"}
                onPress={goNextStep}
                disabled={!canGoNext() && !isLastDiagStep}
                icon={isLastDiagStep ? <Sparkles color="#FFF9F0" size={18} /> : undefined}
                testId="diag-next"
              />
            </View>
          ) : null}

          {/* ===== SUGGESTION ===== */}
          {step === "suggestion" ? (
            <View style={styles.stageContainer} testID="suggestion-screen">
              <Text style={styles.smallLabel}>次に変えるのはこれ</Text>

              <View style={[styles.suggestionCard, accentShadow]}>
                <View style={styles.suggestionPill}>
                  <Droplets color={coffeeTheme.accentStrong} size={16} />
                  <Text style={styles.suggestionPillText}>次の一杯で変えることは1つだけ</Text>
                </View>
                <Text style={styles.suggestionText}>{suggestion.suggestion}</Text>
                <Text style={styles.reasonText}>{suggestion.reason}</Text>
                <Text style={styles.footnote}>明日の朝、もう一杯試してみてください ☕</Text>
              </View>

              <View style={styles.actionRow}>
                <PrimaryButton
                  label="スクリーンショットを保存"
                  onPress={() => {
                    Alert.alert("共有で保存を補助します", "この環境では共有シートで保存や送信を行えます", [
                      { text: "キャンセル", style: "cancel" },
                      { text: "共有する", onPress: () => void handleShareFallback() },
                    ]);
                  }}
                  icon={<Share2 color={coffeeTheme.accentStrong} size={18} />}
                  testId="share-suggestion"
                  subtle
                />
                <PrimaryButton
                  label={saveMutation.isPending ? "保存中..." : "保存する"}
                  onPress={handleSave}
                  disabled={saveMutation.isPending}
                  icon={<Save color="#FFF9F0" size={18} />}
                  testId="save-suggestion"
                />
              </View>

              <PrimaryButton
                label="結果を教える →"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep("result");
                  setResultChoice(null);
                  scrollRef.current?.scrollTo({ y: 0, animated: false });
                }}
                testId="go-to-result"
              />

              <Pressable
                onPress={() => router.push("/history")}
                style={styles.historyLink}
                testID="go-to-history"
              >
                <Clock color={coffeeTheme.textMuted} size={15} />
                <Text style={styles.historyLinkText}>履歴を見る</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ===== RESULT ===== */}
          {step === "result" ? (
            <View style={styles.stageContainer} testID="result-screen">
              <View style={styles.resultIntroCard}>
                <Text style={styles.sectionTitle}>次に淹れたら教えてください</Text>
              </View>

              <View style={styles.resultGrid}>
                <PrimaryButton
                  label="良くなった！"
                  onPress={() => handleResultChoice("improved")}
                  testId="result-improved"
                />
                <PrimaryButton
                  label="まだ少し気になる"
                  onPress={() => handleResultChoice("still_off")}
                  testId="result-still_off"
                  subtle
                />
                <PrimaryButton
                  label="逆になった"
                  onPress={() => handleResultChoice("reversed")}
                  testId="result-reversed"
                  subtle
                />
                <PrimaryButton
                  label="よく分からない"
                  onPress={() => handleResultChoice("unclear")}
                  testId="result-unclear"
                  subtle
                />
              </View>

              {resultChoice === "improved" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>やった！このレシピを保存しますか？</Text>
                  <PrimaryButton
                    label={saveMutation.isPending ? "保存中..." : "保存する"}
                    onPress={() => {
                      handleSave();
                      setTimeout(() => {
                        resetDiagnosis();
                      }, 400);
                    }}
                    disabled={saveMutation.isPending}
                    icon={<Save color="#FFF9F0" size={18} />}
                    testId="result-save"
                  />
                </View>
              ) : null}

              {resultChoice === "still_off" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>もう一歩ですね。もう一回試してみましょう</Text>
                </View>
              ) : null}

              {resultChoice === "reversed" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>すみません、逆方向に動きました。もう一度診断しましょう</Text>
                </View>
              ) : null}

              {resultChoice === "unclear" ? (
                <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackTitle}>何が気になりますか？</Text>
                  <View style={styles.resultGrid}>
                    <PrimaryButton
                      label="酸味が残る"
                      onPress={() => handleResultFollowUp("sour")}
                      testId="followup-sour"
                      subtle
                    />
                    <PrimaryButton
                      label="苦味が残る"
                      onPress={() => handleResultFollowUp("bitter")}
                      testId="followup-bitter"
                      subtle
                    />
                    <PrimaryButton
                      label="薄い感じがする"
                      onPress={() => handleResultFollowUp("thin")}
                      testId="followup-thin"
                      subtle
                    />
                    <PrimaryButton
                      label="香りが弱い"
                      onPress={() => handleResultFollowUp("thin")}
                      testId="followup-aroma"
                      subtle
                    />
                  </View>
                </View>
              ) : null}

              <Pressable onPress={resetDiagnosis} style={styles.inlineReset} testID="reset-diagnosis">
                <RotateCcw color={coffeeTheme.textMuted} size={16} />
                <Text style={styles.inlineResetText}>最初からやり直す</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: coffeeTheme.background,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  eyebrow: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: coffeeTheme.text,
    fontWeight: "700",
    maxWidth: 250,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
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
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8C8C8C",
  },
  modeLabelDetailed: {
    color: "#D4A574",
  },
  modeToggleText: {
    fontSize: 13,
    color: coffeeTheme.accent,
    fontWeight: "500",
  },
  toast: {
    position: "absolute",
    top: 100,
    left: 24,
    right: 24,
    backgroundColor: coffeeTheme.text,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 100,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF9F0",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 32,
  },
  stageContainer: {
    gap: 14,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 14,
    color: coffeeTheme.textMuted,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: coffeeTheme.text,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: coffeeTheme.textMuted,
  },
  smallLabel: {
    fontSize: 14,
    color: coffeeTheme.textMuted,
    fontWeight: "500",
  },
  optionGrid: {
    gap: 8,
  },
  optionButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: coffeeTheme.background,
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
    backgroundColor: "#FFFFFF",
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
  // Temp input styles
  tempPresetRow: {
    flexDirection: "row",
    gap: 8,
  },
  tempPresetButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: coffeeTheme.background,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  tempPresetText: {
    fontSize: 15,
    fontWeight: "700",
    color: coffeeTheme.text,
  },
  boilingButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: coffeeTheme.background,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  tempInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tempTextInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: coffeeTheme.background,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    paddingHorizontal: 14,
    fontSize: 16,
    color: coffeeTheme.text,
  },
  tempUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: coffeeTheme.textMuted,
  },
  tempErrorText: {
    fontSize: 13,
    color: coffeeTheme.warning,
  },
  textLink: {
    fontSize: 14,
    color: coffeeTheme.accent,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  // Suggestion
  suggestionCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 12,
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
    fontSize: 30,
    lineHeight: 40,
    fontWeight: "800",
    color: coffeeTheme.text,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 16,
    lineHeight: 24,
    color: coffeeTheme.textMuted,
  },
  footnote: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    marginTop: 4,
  },
  actionRow: {
    gap: 10,
  },
  // Result
  resultIntroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 8,
  },
  resultGrid: {
    gap: 10,
  },
  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
    gap: 10,
  },
  feedbackTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: coffeeTheme.text,
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
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
  },
  historyLinkText: {
    fontSize: 14,
    color: coffeeTheme.textMuted,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
