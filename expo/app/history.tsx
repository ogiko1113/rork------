import { useQuery } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React from "react";
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
import { getSavedSuggestions } from "@/lib/storage";
import { BrewRecord, EquipmentKey, RoastKey, TasteKey } from "@/types/coffee";

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

const resultLabels: Record<string, string> = {
  improved: "良くなった",
  still_off: "まだ気になる",
  reversed: "逆になった",
  unclear: "よく分からない",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function RecordCard({ record }: { record: BrewRecord }) {
  const hasResult = record.result !== null;
  const resultText = hasResult ? resultLabels[record.result!] ?? "未回答" : "未回答";

  return (
    <View style={styles.card} testID={`history-card-${record.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{formatDate(record.createdAt)}</Text>
        <View style={[styles.resultBadge, !hasResult && styles.resultBadgeUnanswered]}>
          <Text style={[styles.resultBadgeText, !hasResult && styles.resultBadgeTextUnanswered]}>
            {resultText}
          </Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tasteLabels[record.taste]}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{equipmentLabels[record.equipment]}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{roastLabels[record.roast]}</Text>
        </View>
      </View>

      <Text style={styles.suggestionText} numberOfLines={3}>
        {record.suggestion}
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const recordsQuery = useQuery({
    queryKey: ["saved-suggestions"],
    queryFn: getSavedSuggestions,
  });

  const records = recordsQuery.data ?? [];

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
            renderItem={({ item }) => <RecordCard record={item} />}
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
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
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
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 10,
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
    fontWeight: "600",
  },
  resultBadge: {
    backgroundColor: coffeeTheme.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultBadgeUnanswered: {
    backgroundColor: "#E8E4E0",
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: coffeeTheme.accentStrong,
  },
  resultBadgeTextUnanswered: {
    color: "#9E9691",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: coffeeTheme.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: coffeeTheme.cardBorder,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: coffeeTheme.text,
  },
  suggestionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: coffeeTheme.text,
  },
});
