# Firebase 物件管理のセットアップ

物件データの正本を **Cloud Firestore** に置き、公開サイトは **`/api/properties`** 経由で読み取り、運営は **`admin.html`** から追加・編集します。

物件管理は Firebase に一本化しています。スプレッドシート / GAS は **相談・リード記録** 用にだけ残します。

## ローカル用クイックスタート（約10分）

`firebase-client-config.js` を作らなくても、admin 画面だけで設定できます。

1. ターミナルでプロジェクト直下を開き、`npm run serve` を実行
2. ブラウザで **http://localhost:3000/admin.html** を開く（`file://` では開かない）
3. 画面の手順どおり:
   - Firestore データベースを作成（未作成の場合）
   - 「ルールをコピー」→ Firebase Console の Firestore → ルール に貼って **公開**
   - Storage を有効化し、[`storage.rules`](../storage.rules) を Firebase Console の Storage → ルール に貼って **公開**
   - Console で Web アプリを追加し、表示された `firebaseConfig` をフォームに貼る（または JSON 一括貼り付け → 「フォームに反映」）
4. **設定を保存して続行** → 作成済みの Auth メール/パスワードでログイン
5. **JSONからインポート** で `data/properties.json` を投入して一覧を確認

設定はこの PC のブラウザの `localStorage` に保存されます（Git には載りません）。別 PC では再入力するか、従来どおり `js/firebase-client-config.js` を作成してください。

## 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** を有効化 → **メール/パスワード**（必要なら Google）をオン
3. 運営用ユーザーを **Users** から1件以上作成（admin ログイン用）
4. **Firestore Database** を作成（本番モード推奨、リージョンは `asia-northeast1` など）
5. **Storage** を作成（画像アップロード用。Firestore と同じリージョン推奨）

## 2. Firestore セキュリティルール

リポジトリの [`firestore.rules`](../firestore.rules) を Firebase Console → Firestore → ルール に貼り付けて公開してください。

- 現状: **ログイン済みユーザー**のみ `properties` を読み書き可能（小規模運用向け）
- 強化する場合: Custom Claims の `admin: true` や許可 UID リストに変更

## 3. Storage セキュリティルール

物件画像は **Firebase Storage** の `properties/{物件ID}/ファイル名` に保存します。

リポジトリの [`storage.rules`](../storage.rules) を Firebase Console → Storage → ルール に貼り付けて公開してください。

- 読み取り: 公開サイトで画像表示するため誰でも可
- 書き込み: ログイン済みユーザーのみ
- 制限: 画像ファイルのみ、1ファイル10MB未満

本番でより強化する場合は、Firestore と同様に Custom Claims の `admin: true` や許可 UID リストを使ってください。

## 4. Web アプリ設定（admin 用）

1. プロジェクト設定 → **全般** → 「アプリを追加」→ **Web**
2. 表示される `firebaseConfig` をコピー
3. [`js/firebase-client-config.example.js`](../js/firebase-client-config.example.js) を **`js/firebase-client-config.js`** にコピーし、値を貼る
4. `js/firebase-client-config.js` は Git に載せない（`.gitignore` 済み）

## 5. サービスアカウント（Vercel / API 用）

1. プロジェクト設定 → **サービスアカウント** → **新しい秘密鍵の生成**（JSON）
2. Vercel の Environment Variables に設定:

| 変数名 | 内容 |
|--------|------|
| `FIREBASE_PROJECT_ID` | JSON の `project_id` |
| `FIREBASE_CLIENT_EMAIL` | JSON の `client_email` |
| `FIREBASE_PRIVATE_KEY` | JSON の `private_key`（改行は `\n` のまま貼り付け可） |
| `ALLOWED_ORIGINS` | 任意。本番ドメインだけ許可したい場合に `https://example.com,https://www.example.com` のように指定 |

3. 再デプロイ後、`GET /api/properties` が JSON を返すことを確認

## 6. サイト側の切り替え

[`js/nagaroom-data.js`](../js/nagaroom-data.js):

```javascript
USE_FIREBASE_PROPERTIES: true,
PROPERTIES_API_URL: '/api/properties',
```

- `true` のとき: `/api/properties` → 失敗時は `data/properties.json`
- ローカルで API を試す場合: `API_ORIGIN: 'https://あなたの-vercel-url.vercel.app'`

## 7. admin の使い方

1. デプロイ後 `https://あなたのドメイン/admin.html` を開く
2. Firebase で作成したメール/パスワードでログイン
3. **新規物件** から基本情報・費用・設備・周辺情報を入力
4. 画像は **画像ファイルをアップロード** から複数選択すると、Storage に保存されて画像URL欄へ自動追加されます
5. **公開** で保存
6. 数分以内（API キャッシュ最大約2分）に `rental.html` / `listings.html` / `property.html` に反映

### 画像アップロードの注意

- 先に物件IDが空の場合、アップロード時に自動で仮IDを作成します
- メイン画像は `メイン画像番号` で指定できます（0 が1枚目）
- 画像URL欄に外部URLを手入力する運用も残しています
- 画像アップロード中は保存せず、完了メッセージ後に保存してください

### 初回データ移行

admin の **JSON からインポート** で [`data/properties.json`](../data/properties.json) を Firestore に投入できます（既存 ID は上書き確認あり）。

## 8. 閲覧数

物件詳細・カードクリック時に `POST /api/properties/view` で `views` を +1 します（ブラウザ側で30分抑止あり）。

GA4 との併用は任意（Looker Studio 用）。

## 9. 相談・リード記録

物件データは Firebase 管理ですが、`rental.html` の相談・リード記録は引き続き `POST /api/sheet` 経由でスプレッドシートへ送ります。

- Vercel の `GAS_SHEET_WEBHOOK_URL` に Apps Script の Web アプリ URL を設定
- `js/nagaroom-data.js` の `GAS_SHEET_WEBHOOK_URL` は空のまま推奨（URL を Git に載せないため）
- シート側の upsert 実装は [`GAS_SHEET_UPSERT.md`](GAS_SHEET_UPSERT.md) を参照
- 本番では `ALLOWED_ORIGINS` で許可ドメインを絞ることを推奨

## トラブルシュート

| 症状 | 確認 |
|------|------|
| `/api/properties` が 503 | Vercel の Firebase 環境変数3点 |
| admin にログインできない | Authentication でメール/パスワード有効か |
| 保存できない | Firestore ルール・`firebase-client-config.js` の projectId |
| 公開サイトに出ない | `status` が `公開` か、キャッシュ待ち |
