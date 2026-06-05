# 旧運用: GAS から物件一覧を GET する

このドキュメントは旧運用のアーカイブです。

現在の NAGA ROOM では、物件データの正本は **Firestore + admin.html** です。公開サイトは **`/api/properties`** から読み込み、失敗時のみ `data/properties.json` にフォールバックします。

相談・リード記録のスプレッドシート送信は引き続き [`GAS_SHEET_UPSERT.md`](GAS_SHEET_UPSERT.md) を使います。このページで説明していた **物件一覧GET用の GAS** は新規運用では使いません。

## 現在の物件データ経路

1. `admin.html` で物件を追加・編集
2. Firestore の `properties` に保存
3. `GET /api/properties` が公開物件だけを返す
4. `rental.html` / `listings.html` / `property.html` が表示
5. API 失敗時のみ `data/properties.json` を最終フォールバックとして読む

## 旧運用の概要

一覧の **条件フィルタ**（`?budget=` など）と会話連動の詳細は [`RENTAL_FILTERS.md`](RENTAL_FILTERS.md) を参照してください。

以前は `js/nagaroom-data.js` の **`GAS_PROPERTIES_GET_URL`** に、Web アプリの `doGet` 用 URL（`.../exec`）を設定し、`rental.html` がブラウザから `fetch`（GET、`cache: 'no-store'`）で JSON を読み込んでいました。

## レスポンス形式

次のいずれかを返してください。

- JSON **配列**（物件オブジェクトのリスト）
- `{ "items": [ ... ] }`
- `{ "properties": [ ... ] }`

各行は rental 側で `normalizeGasProperty` により既存カード用に変換されます（例: `title` → `name`、`image1` → `image`、`city` + `area` → `area`、`story_comment` → `comment`）。

## CORS

`script.google.com` へフロントから直接 `fetch` すると、**CORS でブロックされる**ことがあります。次のいずれかで対応してください。

1. **GAS の `doGet` で CORS ヘッダを付与する**  
   - `Content-Type: application/json; charset=utf-8`  
   - `Access-Control-Allow-Origin: *`（または自サイトのオリジンだけ許可）

2. **Vercel 等のサーバでプロキシする（任意・後追い可）**  
   - 既存の [`api/sheet.js`](../api/sheet.js) と同様、環境変数に GAS の GET 用 URL を置き、サーバ側で `fetch` して JSON を返すエンドポイントを追加する方法があります。  
   - その場合は `GAS_PROPERTIES_GET_URL` にそのプロキシの絶対 URL（または `API_ORIGIN` と組み合わせたパス）を設定します。

初回は GAS 側で CORS を整えて直接 GET を試し、不可ならプロキシを検討する流れで問題ありません。

## 旧 property.html（物件詳細・1ページ）

旧運用では、[`property.html`](../property.html) を **`?id=物件ID`** で開き、**同じ `GAS_PROPERTIES_GET_URL`** から一覧 JSON を1回 `fetch` し、配列内で `id` が一致する行だけ表示していました。

- **URL の貼り場所は rental と同じ**: [`js/nagaroom-data.js`](../js/nagaroom-data.js) の `GAS_PROPERTIES_GET_URL` のみ（`property.html` 内には URL を書きません）。
- **件数**: 100件・1000件でも、1リクエストで一覧を受け取りメモリ上で線形検索するだけなのでそのまま動きます（一覧が極端に大きくなったら GAS 側で id 指定 API に分ける等の別設計を検討）。
- **見つからないとき**: 「物件が見つかりません」と表示します。
