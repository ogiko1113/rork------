import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { coffeeTheme } from "@/constants/coffeeTheme";
import { getSavedSuggestions, updateBrewResult } from "@/lib/storage";
import { BrewRecord, EquipmentKey, FlowKey, RoastKey, TasteKey } from "@/types/coffee";

const tasteLabels: Record<TasteKey, string> = {
  sour: "酸っぱい",
  bitter: "苦い",
  thin: "薄い",
};

const equipmentLabels: Record<EquipmentKey, string> = {
  hario_v60: "HARIO V60",
  kalita_wave: "Kalita Wave",
  melitta: "メリタ",
  french_press: "フレンチプレス",
  other: "その他",
};

const roastLabels: Record<RoastKey, string> = {
  light: "浅煎り",
  medium: "中煎り",
  dark: "深煎り",
  unknown: "不明",
};

const flowLabels: Record<FlowKey, string> = {
  fast: "速い",
  normal: "普通",
  slow: "遅い",
  unknown: "不明",
};

const resultLabels: Record<string, string> = {
  improved: "良くなった",
  still_off: "まだ少し気になる",
  reversed: "逆になった",
  unclear: "よく分からない",
};

type ResultKey = "improved" | "still_off" | "reversed" | "unclear";

const resultOptions: { key: ResultKey; label: string }[] = [
  { key: "improved", label: "良くなった" },
  { key: "still_off", label: "まだ少し気になる" },
  { key: "reversed", label: "逆になった" },
  { key: "unclear", label: "よく分からない" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function RecordCard({
  record,
  onReport,
}: {
  record: BrewRecord;
  onReport: (id: string, result: ResultKey) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const hasResult = record.result !== null;

  const handleReport = useCallback(
    (result: ResultKey) => {
      onReport(record.id, result);
      setShowOptions(false);
    },
    [record.id, onReport]
  );

  return (
    <View style={styles.card} testID={`history-card-${record.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{formatDate(record.createdAt)}</Text>
      </View>

      <View style={styles.detailsSection}>
        <DetailRow label="焙煎度" value={roastLabels[record.roast]} />
        {record.dose !== null && (
          <DetailRow label="粉量" value={`${record.dose}g`} />
        )}
        <DetailRow label="器具" value={equipmentLabels[record.equipment]} />
        <DetailRow label="お湯の速さ" value={flowLabels[record.flow]} />
        <DetailRow label="味の感想" value={tasteLabels[record.taste]} />
      </View>

      <View style={styles.suggestionSection}>
        <Text style={styles.suggestionLabel}>提案</Text>
        <Text style={styles.suggestionText}>{record.suggestion}</Text>
      </View>

      {hasResult ? (
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>結果</Text>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>
              {resultLabels[record.result!] ?? record.result}
            </Text>
          </View>
        </View>
      ) : showOptions ? (
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>結果を選んでください</Text>
          <View style={styles.optionsGrid}>
            {resultOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionButtonPressed,
                ]}
                onPress={() => handleReport(opt.key)}
                testID={`report-${record.id}-${opt.key}`}
              >
                <Text style={styles.optionButtonText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => setShowOptions(false)}
            style={styles.cancelLink}
          >
            <Text style={styles.cancelLinkText}>キャンセル</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.reportButtonPressed,
          ]}
          onPress={() => setShowOptions(true)}
          testID={`report-btn-${record.id}`}
        >
          <Text style={styles.reportButtonText}>結果を報告する</Text>
        </Pressable>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const queryClient = useQueryClient();

  const recordsQuery = useQuery({
    queryKey: ["saved-suggestions"],
    queryFn: getSavedSuggestions,
  });

  const records = recordsQuery.data ?? [];

  const handleReport = useCallback(
    async (id: string, result: ResultKey) => {
      console.log("[History] Reporting result:", id, result);
      await updateBrewResult(id, result);
      await queryClient.invalidateQueries({ queryKey: ["saved-suggestions"] });
    },
    [queryClient]
  );

  return (
    <View style={styles.screen} testID="history-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            testID="history-back"
            accessibilityRole="button"
          >
            <ChevronLeft color={coffeeTheme.textMuted} size={22} />
            <Text style={styles.backText}>戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle}>診断の履歴</Text>
          <View style={styles.backButton} />
        </View>

        {records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>まだ記録がありません</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecordCard record={item} onReport={handleReport} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            testID="history-list"
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: coffeeTheme.background,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coffeeTheme.cardBorder,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 64,
  },
  backText: {
    fontSize: 15,
    color: coffeeTheme.textMuted,
    fontWeight: "600" as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: coffeeTheme.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: coffeeTheme.textMuted,
    fontWeight: "500" as const,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "rgba(74, 46, 28, 0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    fontWeight: "600" as const,
  },
  detailsSection: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    fontWeight: "500" as const,
  },
  detailValue: {
    fontSize: 13,
    color: coffeeTheme.text,
    fontWeight: "600" as const,
  },
  suggestionSection: {
    backgroundColor: coffeeTheme.background,
    borderRadius: 8,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: coffeeTheme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600" as const,
    color: coffeeTheme.text,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  resultLabel: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    fontWeight: "500" as const,
  },
  resultBadge: {
    backgroundColor: coffeeTheme.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: coffeeTheme.accentStrong,
  },
  reportButton: {
    backgroundColor: coffeeTheme.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  reportButtonPressed: {
    opacity: 0.8,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  optionsSection: {
    gap: 8,
  },
  optionsTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: coffeeTheme.textMuted,
    textAlign: "center",
  },
  optionsGrid: {
    gap: 6,
  },
  optionButton: {
    backgroundColor: coffeeTheme.background,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
  },
  optionButtonPressed: {
    backgroundColor: coffeeTheme.accentSoft,
    borderColor: coffeeTheme.accent,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: coffeeTheme.text,
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  cancelLinkText: {
    fontSize: 13,
    color: coffeeTheme.textMuted,
    fontWeight: "500" as const,
  },
});
