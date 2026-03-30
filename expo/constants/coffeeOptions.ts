import { EquipmentKey, FlowKey, HelperTasteKey, RoastKey, TasteKey } from "@/types/coffee";

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export const tasteOptions: Option<TasteKey | "unknown">[] = [
  {
    value: "sour",
    label: "酸っぱい",
    description: "口の中がキュッとなる。舌の横がピリッとする",
  },
  {
    value: "bitter",
    label: "苦い",
    description: "舌の奥に残る。飲んだ後に渋い",
  },
  {
    value: "thin",
    label: "薄い",
    description: "水っぽい。コーヒーの味が弱い",
  },
  {
    value: "unknown",
    label: "よく分からない",
    description: "どれにも当てはまらないとき",
  },
];

export const helperTasteOptions: Option<HelperTasteKey>[] = [
  { value: "sour", label: "口がキュッとする" },
  { value: "bitter", label: "後味が渋い" },
  { value: "thin", label: "水っぽい" },
  { value: "aroma_weak", label: "香りが弱い" },
];

export const equipmentOptions: Option<EquipmentKey>[] = [
  { value: "hario_v60", label: "HARIO V60" },
  { value: "kalita_wave", label: "Kalita Wave" },
  { value: "melitta", label: "メリタ" },
  { value: "french_press", label: "フレンチプレス" },
  { value: "other", label: "その他" },
];

export const roastOptions: Option<RoastKey>[] = [
  { value: "light", label: "浅煎り" },
  { value: "medium", label: "中煎り" },
  { value: "dark", label: "深煎り" },
  { value: "unknown", label: "分からない" },
];

export const flowOptions: Option<FlowKey>[] = [
  { value: "fast", label: "速かった" },
  { value: "normal", label: "普通" },
  { value: "slow", label: "遅かった" },
  { value: "unknown", label: "分からない" },
];

export const tempPresets = [
  { value: 80, label: "80℃" },
  { value: 85, label: "85℃" },
  { value: 90, label: "90℃" },
  { value: 95, label: "95℃" },
] as const;

export const TEMP_BOILING = 100;
export const TEMP_MIN = 60;
export const TEMP_MAX = 100;
