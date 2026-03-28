/**
 * Vercel Serverless — GAS スプレッドシート Web アプリへの中継
 * POST /api/sheet
 *
 * フロントは application/json（または text/plain の JSON 文字列）で送る想定。
 * 受け取った内容を JSON 文字列に直し、GAS へは text/plain で転送（doPost の postData.contents 互換）。
 *
 * 環境変数（Vercel ダッシュボード）:
 *   GAS_SHEET_WEBHOOK_URL … Apps Script のウェブアプリ URL（.../exec）
 *
 * nagaroom-data.js の GAS_SHEET_WEBHOOK_URL を空にして本 API 経由にすると、
 * GAS の URL を Git にコミットせずに済みます。
 *
 * --- GAS 側の推奨（行が空欄で消える問題の二重対策）---
 * doPost で毎回 rowData をゼロから組み立て、JSON に無いキーを "" にしていると、
 * 古いクライアントの部分 POST で列が消えます。LP 側は累積マージ済みの JSON を送りますが、
 * GAS でも「既存行を読み、data に存在するキーだけ上書き」するマージ実装にすると安全です。
 * 例: const cur = sheet.getRange(targetRow,1,1,numCols).getValues()[0]; と列インデックスでマージ。
 */

function applyCors(req, res) {
  var origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function bodyToRawString(req) {
  if (req.body == null) return '';
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  if (typeof req.body === 'object') return JSON.stringify(req.body);
  return String(req.body);
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var gasUrl = (process.env.GAS_SHEET_WEBHOOK_URL || '').trim();
  if (!gasUrl) {
    console.warn('[api/sheet] GAS_SHEET_WEBHOOK_URL is not set');
    return res.status(503).json({ error: 'GAS_SHEET_WEBHOOK_URL not configured' });
  }

  var raw = bodyToRawString(req);
  if (!raw) {
    return res.status(400).json({ error: 'Empty body' });
  }

  try {
    var gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: raw
    });
    var text = await gasRes.text();
    res.status(gasRes.ok ? 200 : 502);
    res.setHeader('Content-Type', gasRes.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(text);
  } catch (err) {
    console.error('[api/sheet] forward failed', err);
    return res.status(502).json({ error: 'Forward failed', message: String(err && err.message) });
  }
};
