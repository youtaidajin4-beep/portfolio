# GAS から物件一覧を GET する（rental.html）

一覧の **条件フィルタ**（`?budget=` など）と会話連動の詳細は [`RENTAL_FILTERS.md`](RENTAL_FILTERS.md) を参照してください。

`js/nagaroom-data.js` の **`GAS_PROPERTIES_GET_URL`** に、Web アプリの `doGet` 用 URL（`.../exec`）を設定すると、`rental.html` がブラウザから `fetch`（GET、`cache: 'no-store'`）で JSON を読み込みます。失敗時は従来どおり `data/properties.json` にフォールバックします。

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

## property.html（物件詳細・1ページ）

[`property.html`](../property.html) は **`?id=物件ID`** で開き、**同じ `GAS_PROPERTIES_GET_URL`** から一覧 JSON を1回 `fetch` し、配列内で `id` が一致する行だけ表示します。

- **URL の貼り場所は rental と同じ**: [`js/nagaroom-data.js`](../js/nagaroom-data.js) の `GAS_PROPERTIES_GET_URL` のみ（`property.html` 内には URL を書きません）。
- **件数**: 100件・1000件でも、1リクエストで一覧を受け取りメモリ上で線形検索するだけなのでそのまま動きます（一覧が極端に大きくなったら GAS 側で id 指定 API に分ける等の別設計を検討）。
- **見つからないとき**: 「物件が見つかりません」と表示します。
