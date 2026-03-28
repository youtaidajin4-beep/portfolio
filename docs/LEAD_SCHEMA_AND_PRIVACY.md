# リード収集（Notion）スキーマとプライバシー（ドラフト）

運用前に法務・事業者判断で文言を確定してください。ここは実装のたたき台です。

## Notion データベースのプロパティ（API と一致させる）

Vercel の環境変数 `NOTION_PROP_*` で列名を上書きできます。未設定時は下表の「デフォルト列名」を Notion 側に作成してください。

| デフォルト列名 | Notion 型 | 内容 |
|----------------|-----------|------|
| `Lead ID` | タイトル | `nr_` 始まりの一意 ID（LP・Dify・LINE 突合用） |
| `chat_purpose` | テキスト | `property` / `consult` / 空 |
| `name` | テキスト | 氏名（取得する場合のみ） |
| `phone` | テキスト | 電話（取得する場合のみ） |
| `email` | テキスト | メール（取得する場合のみ） |
| `intent_tags` | テキスト | カンマ区切りタグ（例: `station,budget`） |
| `last_user_message` | テキスト | 直近のユーザー発話（最大 2000 文字にサーバ側で切り詰め） |
| `context_json` | テキスト | 会話コンテキストの JSON 文字列（暮らし方・家賃・エリア等） |
| `line_linked` | チェック | 手動で LINE と突合済みにしたらオン（任意） |
| `line_user_id` | テキスト | Messaging API 連携用（将来・空でよい） |

データベース作成後、インテグレーションを DB に接続し、データベース ID を Vercel の `NOTION_LEADS_DB_ID` に設定します。

## 個人情報の取り扱い（ドラフト）

- **管理者**: 事業者名（正式名称をプライバシーポリシーに記載）。
- **利用目的の例**: お部屋探しの相談対応、提案内容の改善、お問い合わせへの連絡。
- **第三者提供**: クラウドサービス（例: Notion, Inc.）への保存。国外にある場合は個人情報保護法に基づく **第三者提供または委託** の整理が必要です。
- **保管期間**: 取得から〇年、または目的達成後〇か月など、方針を定めて公表。
- **開示・訂正・削除**: 問い合わせ窓口をプライバシーポリシーに記載。

## LP 上の同意文（ドラフト・掲載例）

名前・電話・メールをフォームやチャットで預かる前に、次のような同意取得を検討してください。

> 入力いただいたお名前・お電話番号等は、お部屋探しのご相談およびご連絡のために利用し、当社のプライバシーポリシーに従って管理します。第三者への提供・国外への保存がある場合は、ポリシーに記載のとおりです。

（実際の画面ではチェックボックス＋ポリシーへのリンクが無難です。）

## Vercel 環境変数（`/api/lead`）

| 変数 | 必須 | 説明 |
|------|------|------|
| `NOTION_TOKEN` | はい | Notion インテグレーションの Internal Integration Secret |
| `NOTION_LEADS_DB_ID` | はい | リード用データベースの ID |
| `LEAD_API_SECRET` | いいえ | 設定時は `Authorization: Bearer <値>` または `X-Lead-Secret: <値>` が必須（Dify の HTTP ノードや `nagaroom-data.js` の `LEAD_API_BEARER` に同じ値） |
| `ALLOWED_ORIGINS` | いいえ | カンマ区切り。設定時は `Origin` が一致しない POST を 403 |
| `NOTION_PROP_*` | いいえ | 列名の上記デフォルトからずれる場合のみ（`api/lead.js` 先頭コメント参照） |

未設定時は `POST /api/lead` が 503 を返します。ローカルで HTML だけ開く場合は `NAGA_ROOM.LEAD_SYNC_ENABLED = false` にするとコンソールの失敗を抑えられます。

## Dify からの更新（HTTP ノード）

Dify の **HTTP リクエスト**ノードで、デプロイ先の絶対 URL に `POST /api/lead` します。ボディ例:

```json
{
  "lead_id": "<Dify の user / 会話変数で LP と同じ ID>",
  "name": "{{name}}",
  "phone": "{{phone}}",
  "email": "{{email}}"
}
```

`LEAD_API_SECRET` を Vercel で設定している場合は、ヘッダに `Authorization: Bearer <同じ値>` を付けます。`lead_id` は LP が Dify に送っている `user`（`nr_…`）と一致させる必要があります。
