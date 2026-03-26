/**
 * Vercel Serverless Function — Dify Chatflow への中継（blocking）
 * ルート: POST /api/chat
 *
 * 環境変数（Vercel ダッシュボードで設定）:
 *   - DIFY_API_KEY  … Dify の API キー（必須）
 *   - DIFY_API_URL  … Dify のチャット送信エンドポイントのフルURL（必須）
 *       ▼▼▼ ここに Dify の Chatflow の「API アクセス」に表示されるエンドポイントURLをそのまま貼る想定です。
 *       例: https://api.dify.ai/v1/chat-messages  （お使いのリージョン・パスに合わせてください）
 */

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) {
      chunks.push(chunk);
    });
    req.on('end', function () {
      try {
        var raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function extractAnswerAndConversationId(data) {
  var answer =
    data.answer ||
    (data.data && data.data.answer) ||
    data.output_text ||
    (typeof data.text === 'string' ? data.text : undefined);

  var conversationId =
    data.conversation_id ||
    (data.data && data.data.conversation_id) ||
    (data.message && data.message.conversation_id) ||
    null;

  return { answer: answer != null ? String(answer) : '', conversationId: conversationId };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercelの環境変数は前後に空白が入ることがあるためトリムして扱う
  var difyUrlRaw = process.env.DIFY_API_URL;
  var apiKeyRaw = process.env.DIFY_API_KEY;

  var difyUrl = typeof difyUrlRaw === 'string' ? difyUrlRaw.trim() : difyUrlRaw;
  var apiKey = typeof apiKeyRaw === 'string' ? apiKeyRaw.trim() : apiKeyRaw;

  if (!difyUrl || !apiKey) {
    var missing = {
      DIFY_API_URL: !difyUrl,
      DIFY_API_KEY: !apiKey,
    };
    console.error('[api/chat] Missing env vars (values are hidden):', missing);
    return res.status(500).json({
      error: 'Server configuration error: set DIFY_API_URL and DIFY_API_KEY in Vercel environment variables.',
      missing: missing,
    });
  }

  var body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  var userMessage = body.userMessage;
  var conversationId = body.conversationId;
  var userId = body.userId || 'lp_anonymous_user';

  if (userMessage == null || String(userMessage).trim() === '') {
    return res.status(400).json({ error: 'userMessage is required' });
  }

  var payload = {
    inputs: {},
    query: String(userMessage),
    response_mode: 'blocking',
    user: String(userId),
  };

  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  try {
    var r = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    var text = await r.text();
    var data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      console.error('[api/chat] Dify non-JSON response:', text.slice(0, 800));
      return res.status(500).json({
        error: 'Invalid response from Dify (not JSON)',
        raw: text.slice(0, 300),
      });
    }

    if (!r.ok) {
      console.error('[api/chat] Dify HTTP error', r.status, text.slice(0, 1200));
      return res.status(500).json({
        error: (data.message || data.error || 'Dify API request failed'),
        status: r.status,
        details: data,
      });
    }

    if (process.env.DIFY_DEBUG_LOG === '1') {
      console.log('[api/chat] Dify response keys:', Object.keys(data));
    }

    var extracted = extractAnswerAndConversationId(data);

    if (!extracted.answer && extracted.answer !== '') {
      console.warn('[api/chat] Empty answer; inspect Dify response shape. Sample:', JSON.stringify(data).slice(0, 1500));
    }

    return res.status(200).json({
      answer: extracted.answer,
      conversationId: extracted.conversationId,
    });
  } catch (err) {
    console.error('[api/chat]', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
};
