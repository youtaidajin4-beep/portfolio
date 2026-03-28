# スプレッドシート：1人1行（upsert）の GAS 実装メモ

LP からは **同じブラウザ・同じセッション**で不変の `lead_id`（および `session_id`）が毎回送られます。  
**行の追加ではなく「`lead_id` が一致する行があれば上書き、なければ新規行」**にすると、会話のたびに行が増えません。

## LP から届く JSON に含まれる識別子

- **`lead_id`**: 例 `nr_xxxxxxxx-xxxx-...`（`localStorage` の `nr_lead_id`）
- **`session_id`**: セッション用 UUID。主キーは **`lead_id` を推奨**（同一人物のマージに向くため）

次の2経路どちらも、上記を含めて送ります。

1. **`saveSessionToSheet`** … `Content-Type: application/json` のオブジェクト（累積マージ済み）
2. **`saveConsultToSheet`** … `Content-Type: text/plain` の本文が `JSON.stringify(...)`（相談一覧向けオブジェクトにも `lead_id` / `session_id` を含む）

## シート側のおすすめ

- シート「相談一覧」の **1行目に `lead_id` 列を追加**する（表示しなくてもよいが、列として持つと検索しやすい）。
- `doPost` で `JSON.parse(e.postData.contents)` したあと、`data.lead_id` で既存行を検索。

## サンプル（イメージ）

```javascript
function doPost(e) {
  try {
    var raw = e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var leadId = data.lead_id;
    if (!leadId) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'missing lead_id' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById('スプレッドシートID');
    var sheet = ss.getSheetByName('相談一覧');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    function colIndex(name) {
      var i = headers.indexOf(name);
      return i >= 0 ? i + 1 : 0;
    }

    var leadCol = colIndex('lead_id');
    if (!leadCol) {
      throw new Error('lead_id 列を1行目に追加してください');
    }

    var lastRow = sheet.getLastRow();
    var targetRow = 0;
    if (lastRow >= 2) {
      var ids = sheet.getRange(2, leadCol, lastRow, leadCol).getValues();
      for (var r = 0; r < ids.length; r++) {
        if (String(ids[r][0]) === String(leadId)) {
          targetRow = r + 2;
          break;
        }
      }
    }

    var rowObj = normalizeRow_(data, headers); // ヘッダ名→セル値の配列に変換する関数を自前で用意
    var rowValues = headers.map(function (h) {
      return rowObj.hasOwnProperty(h) ? rowObj[h] : '';
    });

    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/** 例: 配列フィールドをシート用に join するなど */
function normalizeRow_(data, headers) {
  var o = {};
  headers.forEach(function (h) {
    if (!h) return;
    var v = data[h];
    if (Array.isArray(v)) v = v.join(',');
    if (v === undefined || v === null) v = '';
    o[h] = v;
  });
  return o;
}
```

`normalizeRow_` は、あなたのシートの列名と LP の JSON キーを一致させてください。  
`budget_max` は LP から **円（数値）** で送ります（例: 60000）。列の表示形式はシート側で調整してください。

## まとめ

| やること | 目的 |
|----------|------|
| シート1行目に `lead_id` 列を足す | 同一人物の行を特定する |
| `doPost` で既存行を検索して `setValues` | 更新＝1人1行を維持 |
| 見つからなければ `appendRow` | 新規のみ行が増える |
