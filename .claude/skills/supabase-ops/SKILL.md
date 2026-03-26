# /supabase-ops — Supabase安全操作ガイド

## 概要
Supabaseのスキーマ変更・RLS・Edge Functionの安全な操作手順を提供する。
マイグレーション前のdry-run必須。

## 起動条件
ユーザーが `/supabase-ops` と入力したとき、またはSupabase関連の操作を依頼されたとき。

## 操作カテゴリ

### 1. スキーマ変更

#### 手順
1. **変更計画の作成**: 変更内容をSQL文で記述
2. **dry-run実行**: ブランチDBまたはローカルで変更を試行
3. **影響分析**: 既存データ・RLS・Edge Functionへの影響を確認
4. **マイグレーションファイル作成**: `supabase/migrations/` に配置
5. **レビュー**: 変更内容の最終確認
6. **適用**: 本番環境への反映

#### dry-runチェックリスト
- [ ] 既存テーブルのデータが消えないこと
- [ ] 外部キー制約が正しいこと
- [ ] インデックスが適切に設定されていること
- [ ] NOT NULL制約を追加する場合、既存データにNULLがないこと
- [ ] カラム名の変更がアプリコードに影響しないこと

### 2. RLS（Row Level Security）

#### ポリシー設計原則
- **デフォルト拒否**: すべてのテーブルでRLSを有効化
- **最小権限**: 必要最小限のアクセスのみ許可
- **認証必須**: `auth.uid()` ベースの認証チェック

#### ポリシーテンプレート
```sql
-- ユーザー自身のデータのみ読み取り可能
CREATE POLICY "Users can read own data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);

-- ユーザー自身のデータのみ作成可能
CREATE POLICY "Users can insert own data"
ON table_name FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ユーザー自身のデータのみ更新可能
CREATE POLICY "Users can update own data"
ON table_name FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

#### RLSチェックリスト
- [ ] 全テーブルでRLSが有効か
- [ ] SELECT/INSERT/UPDATE/DELETEそれぞれにポリシーがあるか
- [ ] `auth.uid()` を使った認証チェックがあるか
- [ ] 管理者向けポリシーが適切に制限されているか
- [ ] JOINを使うクエリでもRLSが機能するか

### 3. Edge Function

#### デプロイ手順
1. `supabase/functions/` にファンクションを作成
2. ローカルテスト: `supabase functions serve`
3. 環境変数の設定確認
4. デプロイ: `supabase functions deploy <function-name>`

#### セキュリティチェック
- [ ] 認証トークンの検証を実装しているか
- [ ] CORS設定が適切か
- [ ] 環境変数にシークレットを格納しているか（ハードコードしていないか）
- [ ] レートリミットを考慮しているか
- [ ] エラーメッセージに内部情報を含めていないか

### 4. マイグレーション管理

#### 命名規則
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

#### マイグレーション作成手順
1. 変更SQLを作成
2. dry-runで検証
3. マイグレーションファイルを作成
4. ローカルDBで適用テスト
5. コミット・プッシュ

#### ロールバック
- 各マイグレーションに対応するロールバックSQLを用意
- `supabase/migrations/rollbacks/` に配置

## 出力フォーマット

```markdown
## Supabase操作レポート

### 操作種別
スキーマ変更 / RLS設定 / Edge Function / マイグレーション

### 変更内容
（SQL文またはコード）

### dry-run結果
- ステータス: 成功 / 失敗
- 影響テーブル: （リスト）
- データ影響: あり / なし

### チェックリスト
- [x] 項目1
- [x] 項目2

### 適用コマンド
（実行すべきコマンド）
```

## 注意事項
- **本番環境への直接操作は禁止** — 必ずマイグレーション経由
- **dry-run必須** — 省略不可
- **バックアップ確認** — 破壊的変更前にバックアップ状況を確認
- Supabase MCPツールが利用可能な場合は活用する
