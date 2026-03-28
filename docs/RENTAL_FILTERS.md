# rental.html：物件一覧のフィルタ（初心者向け）

## どこに何を貼るか

| やりたいこと | 場所 |
|--------------|------|
| 物件データ（GAS の JSON）の URL | [`js/nagaroom-data.js`](../js/nagaroom-data.js) の **`GAS_PROPERTIES_GET_URL`**（`.../exec`） |
| フィルタ用のコード変更 | **不要**。URL のクエリと会話から自動で動きます |

CORS や GAS の返却形式は [`GAS_PROPERTIES_GET.md`](GAS_PROPERTIES_GET.md) を参照してください。

## URL パラメータ（自動フィルタ）

ページ読み込み時に `URLSearchParams` で次を読み取り、一覧に反映します。

| パラメータ | 意味 | 例 |
|------------|------|-----|
| `budget` | 予算上限（**円**・数値） | `60000` = 6万円以下 |
| `layout` | 間取り（**完全一致**。空白無しの大文字比較） | `1K`, `1DK`, `1LDK` |
| `features` | こだわり（**カンマ区切り**の英字スラッグ） | `pet,washstand` |

例:

```txt
rental.html?budget=60000&layout=1K&features=pet,washstand
```

「この条件でお部屋を見る」ボタンを押すと、上記形式の URL に遷移します。

## チャット直下の横スライド（この条件で合いそうなお部屋）

`chat-shell`（会話＋入力欄）のすぐ下に、条件に合わせて物件カードが横スクロールで出る帯があります。

### 表示される条件

- **物件検索チャット**に入っているとき（`difyChatPurpose === 'property'`）
- **`budget` / `layout` / `features` のうち 2 つ以上**が `extractedConditions` に入っている（エリア抽出の数は含めません）
- **`PROPERTY_LIST` に 1 件以上**ある

### 中身

- 表示する物件は、ページ下部の一覧と同じ **`applyPropertyFilters`** の結果です。
- カードから **「詳細を見る」** で `property.html?id=…` に遷移します。
- 該当 0 件のときは **「条件に合うお部屋がまだ見つかっていません」** とだけ出ます。

### 仕様でいう `userConditions`

コード上は **`extractedConditions`** がそれに相当します。`budget` は **円**（例: `60000` = 6万円以下）。

### 関連する関数（`rental.html` 内）

- `fetchProperties()` … 実体は `loadPropertyList()` と同じ（二重 fetch しません）
- `filterProperties(conditions)` … `applyPropertyFilters(PROPERTY_LIST, conditions)`
- `renderPropertyCards()` … 横スライド帯の描画
- `properties` / `filteredProperties` … それぞれ `PROPERTY_LIST` / `FILTERED_PROPERTY_LIST` と同期した別名

## features スラッグとスプレッドシート（GAS）列

会話から拾ったスラッグは、物件オブジェクトの次の真偽フィールドと対応します（**両方 true とみなす値**に対応: `true`, `1`, `"TRUE"`, `"はい"` など）。

| スラッグ | GAS フィールド |
|----------|----------------|
| `pet` | `pet_ok` |
| `washstand` | `independent_washstand` |
| `separate_bath` | `bath_toilet_separate` |
| `station` | `super_near` |
| `school_near` | `school_near` |

上記以外のスラッグは **一覧フィルタでは無視**されます（将来 `tags` 連携で拡張可能）。

会話テキストからスラッグを付けるルールは、[`rental.html`](../rental.html) 内の **`FEATURE_RULES`**（正規表現）を参照してください。

## 会話との連動

- ユーザーの発言から **`extractConditionsFromText`** で予算・間取り・features を抽出し、**`extractedConditions`** に蓄積します。
- 条件が更新されるたびに一覧を再描画します。
- **「この条件でお部屋を見る」** は **物件検索チャット**（エントリーで「物件検索」を選んだあと、`difyChatPurpose === 'property'`）かつ、条件カテゴリが **2 つ以上**そろったときだけ表示されます。

## データがない・0 件のとき

- GAS 未設定で JSON も空、かつ URL にフィルタもない → 一覧セクションは非表示のままです。
- フィルタはかかっているが **該当物件 0 件** → セクション内に **「条件に合うお部屋が見つかりません」** と表示します。

## 状態変数（デバッグ用）

[`rental.html`](../rental.html) 内:

- **`PROPERTY_LIST`** … 取得した全物件
- **`FILTERED_PROPERTY_LIST`** … `applyPropertyFilters` 適用後（描画と同じ内容）

## Dify から JSON で条件を渡す（任意・上級）

現状は **ユーザーのメッセージ**からキーワード抽出しています。Dify の返答に `budget` / `layout` / `features` を含む JSON を出させ、クライアントでパースして `mergeExtractedConditions` する拡張は別途可能です。
