# Brew Fix Japan（次の一杯）

## プロジェクト概要

- **アプリ名**: Brew Fix Japan（次の一杯）
- **概要**: 日本のコーヒー初心者向け抽出補正コーチアプリ
- **スタック**: Expo (React Native) + Supabase
- **コアロジック**: ルールベース（AI API不要）
- **UI生成**: Rorkで生成 → Claude Codeで統合・品質管理
- **コード操作**: Claude Codeで完結（Cursorは使わない）

## 協業モデル

| 担当 | 領域 |
|------|------|
| Rork | UI/UXデザイン、画面レイアウト、コンポーネント生成 |
| Claude Code | ロジック実装、DB設計、品質管理、テスト、デプロイ |

---

## エージェントチーム

### 🏗 Architect（設計・構造判断）
- Rork生成コードの評価とフォルダ構成決定
- 技術選定・アーキテクチャ設計
- コンポーネント分割方針の策定
- 呼び出し例: 「Architectとして設計レビューして」

### 🔨 Builder（実装・修正・テスト）
- 通常のコーディング作業全般
- 機能実装・バグ修正
- テストコード記述
- 呼び出し例: 「Builderとして実装して」

### 🔍 Reviewer（品質管理・バグ検出）
- コードレビュー・品質チェック
- バグ検出・パフォーマンス分析
- /postmortem の実行
- 呼び出し例: 「Reviewerとしてレビューして」

### 🌉 Rork Bridge（Rorkコード統合）
- Rorkからのコード統合専門
- UI層とロジック層の境界維持
- /rork-sync の実行
- 呼び出し例: 「Rork Bridgeとして統合して」

### 🗄 DB Engineer（Supabase専門）
- スキーマ設計・RLS設定
- マイグレーション管理
- Edge Function開発
- /supabase-ops の実行
- 呼び出し例: 「DB Engineerとしてスキーマ設計して」

---

## スキル一覧

### gstack スキル（部分導入）
- `/plan-ceo-review` — CEO視点でのプランレビュー
- `/plan-eng-review` — エンジニアリング視点でのプランレビュー
- `/review` — コードレビュー
- `/retro` — 振り返り
- `/investigate` — 調査・分析

### プロジェクト固有スキル
- `/postmortem` — バグ発生時の5軸分析レポート生成
- `/rork-sync` — Rorkコードの差分確認・マージ・型整合チェック
- `/brew-logic` — コーヒー抽出補正ルールの管理・矛盾チェック
- `/supabase-ops` — Supabaseの安全な操作手順（dry-run必須）

---

## 開発ルール

### ブランチ戦略
- mainには直接pushしない
- feature/xxx ブランチで作業 → PRでマージ

### Rork統合ルール
- UI層（JSX/スタイル）: Rork優先
- ロジック層（hooks/utils/services）: Claude Code優先
- 型定義: 両方の変更を統合
- DB層: Claude Code優先

### コーヒーロジック
- AI APIは使わない — すべてルールベース
- ルールは `lib/brew-rules/` または `utils/brew-logic/` に配置
- ルール追加時は矛盾チェック必須

### Supabase
- 本番への直接操作禁止 — マイグレーション経由
- dry-run必須
- 全テーブルでRLS有効化
