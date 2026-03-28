# Cursor × Notion MCP でリード DB を参照する

前提: Cursor に Notion ワークスペース用 MCP が有効で、リード用データベースが接続されていること。

## よく使う依頼例（プロンプトの型）

- 「Notion のリード DB で、直近 2 週間で `chat_purpose` が property の行を要約して」
- 「`intent_tags` に `budget` を含む行を列挙し、共通する要望を 3 行でまとめて」
- 「`last_user_message` に『ペット』を含む行は何件か数えて」
- 「`Lead ID` が `nr_` で始まる行のうち、`context_json` に 諫早 が含まれるものをリストして」

## 運用のコツ

- Notion の **ビュー** で「未対応」「物件」「相談」を分けると、人間の運用と MCP の両方が楽になります。
- 列名は [LEAD_SCHEMA_AND_PRIVACY.md](./LEAD_SCHEMA_AND_PRIVACY.md) と Notion 実体を一致させ、リネームしたら Vercel の `NOTION_PROP_*` も更新します。
- LINE 突合後は Notion で `line_linked` をオンにすると、検索時に「LINE 済み」フィルタがしやすくなります。

## LINE と Notion の対応付け

ユーザーが送信する事前入力文に `Lead ID`（例: `nr_xxxxxxxx`）が含まれます。スタッフは Notion でその文字列を検索し、同一レコードを開いてから LINE で返信します。
