# NAGA ROOM 運用メモ

## 役割分担

- 物件管理: `admin.html` から Firestore / Firebase Storage に登録
- 公開表示: `/api/properties` から公開物件だけを取得
- 閲覧数: `/api/properties/view` で公開物件のみ加算
- 相談・リード記録: `/api/sheet` 経由でスプレッドシートへ送信
- Dify チャット: `/api/chat` 経由で中継

## 本番環境変数

| 変数名 | 用途 |
|--------|------|
| `FIREBASE_PROJECT_ID` | Firestore 読み取り |
| `FIREBASE_CLIENT_EMAIL` | Firestore 読み取り |
| `FIREBASE_PRIVATE_KEY` | Firestore 読み取り |
| `GAS_SHEET_WEBHOOK_URL` | 相談・リード記録の送信先 |
| `DIFY_API_URL` / `DIFY_API_KEY` | 相談チャット |
| `DIFY_PROPERTY_API_URL` / `DIFY_PROPERTY_API_KEY` | 物件検索チャット |
| `ALLOWED_ORIGINS` | 任意。API 呼び出し元を本番ドメインに制限 |

`ALLOWED_ORIGINS` はカンマ区切りで指定します。

```txt
https://example.com,https://www.example.com
```

未設定の場合は従来どおり許可します。公開後は設定を推奨します。

## 物件データの運用

1. `admin.html` で物件を登録
2. 画像は Firebase Storage へアップロード
3. 公開状態を `公開` にする
4. `/api/properties` のキャッシュ反映を待つ（最大約2分）
5. `rental.html` / `listings.html` / `property.html?id=...` で確認

API が失敗した場合だけ `data/properties.json` をフォールバックとして読みます。通常運用では Firestore が正本です。

## 残しているスプレッドシート連携

スプレッドシートは物件管理には使いません。`rental.html` の会話で取得した名前、条件、LINE遷移、相談開始などの記録だけに使います。

シート側は `lead_id` を主キーにして、1人1行で更新する運用を推奨します。詳細は `GAS_SHEET_UPSERT.md` を参照してください。

## 次の改善候補

- `rental.html` の巨大なインラインJSを `js/rental-chat.js` などへ分割
- `rental.html` と `listings.html` の物件カード描画を共通化
- `/api/chat` と `/api/sheet` にレート制限を追加
- Firestore の公開物件クエリに合わせてインデックス・ステータス運用を固定
