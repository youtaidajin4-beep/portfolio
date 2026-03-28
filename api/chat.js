/**
 * Vercel Serverless Function — Dify chat-messages への中継（streaming）
 * ルート: POST /api/chat
 *
 * Dify へは response_mode: "streaming" でリクエストし、
 * 返ってきた text/event-stream をそのままクライアントへ転送します。
 *
 * 環境変数（Vercel）:
 *   相談アプリ（chatPurpose: consult）: DIFY_API_URL / DIFY_API_KEY
 *   物件検索アプリ（chatPurpose: property）: DIFY_PROPERTY_API_URL / DIFY_PROPERTY_API_KEY
 *   chatPurpose なし（後方互換）: DIFY_API_* を優先し、無ければ DIFY_PROPERTY_*
 *
 * 切り分け（HTTP 405）:
 *   - DevTools Network で /api/chat の Request Method が POST か確認（GET だと 405）。
 *   - PC とスマホで開いている本番 URL が完全一致しているか確認。
 *   - DIFY_DEBUG_LOG=1 でサーバログに method が出ます。
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

function getFirstDefinedEnv(names) {
  for (var i = 0; i < names.length; i++) {
    var key = names[i];
    var val = process.env[key];
    if (typeof val === 'string' && val.trim()) {
      return { key: key, value: val.trim() };
    }
  }
  return { key: null, value: '' };
}

function normalizeDifyUrl(url) {
  if (!url) return '';
  var trimmed = String(url).trim();
  if (/\/v1\/chat-messages\/?$/.test(trimmed)) return trimmed;
  if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/?$/, '/chat-messages');
  if (/^https?:\/\/[^/]+\/?$/.test(trimmed)) return trimmed.replace(/\/?$/, '/v1/chat-messages');
  return trimmed;
}

/** 別オリジンから rental を開く場合の CORS（プリフライト OPTIONS で 405 にならないようにする） */
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

module.exports = async function handler(req, res) {
  if (process.env.DIFY_DEBUG_LOG === '1') {
    console.log('[api/chat] method=', req.method);
  }

  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    applyCors(req, res);
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  applyCors(req, res);

  var body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  var userMessage = body.userMessage;
  var conversationId = body.conversationId;
  var userId = body.userId || 'lp_anonymous_user';
  var chatPurpose = body.chatPurpose;

  if (userMessage == null || String(userMessage).trim() === '') {
    return res.status(400).json({ error: 'userMessage is required' });
  }

  var difyUrlEnv;
  var apiKeyEnv;
  if (chatPurpose === 'property') {
    difyUrlEnv = getFirstDefinedEnv(['DIFY_PROPERTY_API_URL']);
    apiKeyEnv = getFirstDefinedEnv(['DIFY_PROPERTY_API_KEY']);
  } else if (chatPurpose === 'consult') {
    difyUrlEnv = getFirstDefinedEnv(['DIFY_API_URL']);
    apiKeyEnv = getFirstDefinedEnv(['DIFY_API_KEY']);
  } else {
    difyUrlEnv = getFirstDefinedEnv(['DIFY_API_URL', 'DIFY_PROPERTY_API_URL']);
    apiKeyEnv = getFirstDefinedEnv(['DIFY_API_KEY', 'DIFY_PROPERTY_API_KEY']);
  }

  var difyUrl = normalizeDifyUrl(difyUrlEnv.value);
  var apiKey = apiKeyEnv.value;

  if (!difyUrl || !apiKey) {
    var missing;
    var errMsg;
    if (chatPurpose === 'property') {
      missing = { DIFY_PROPERTY_API_URL: !difyUrl, DIFY_PROPERTY_API_KEY: !apiKey };
      errMsg =
        'Server configuration error: for property flow (chatPurpose=property), set DIFY_PROPERTY_API_URL and DIFY_PROPERTY_API_KEY.';
    } else if (chatPurpose === 'consult') {
      missing = { DIFY_API_URL: !difyUrl, DIFY_API_KEY: !apiKey };
      errMsg =
        'Server configuration error: for consult flow (chatPurpose=consult), set DIFY_API_URL and DIFY_API_KEY.';
    } else {
      missing = { DIFY_API_URL: !difyUrl, DIFY_API_KEY: !apiKey };
      errMsg =
        'Server configuration error: set DIFY_API_URL and DIFY_API_KEY (or DIFY_PROPERTY_*) in Vercel environment variables.';
    }
    var resolvedFrom = {
      urlEnv: difyUrlEnv.key,
      keyEnv: apiKeyEnv.key,
      chatPurpose: chatPurpose == null ? null : String(chatPurpose),
    };
    console.error('[api/chat] Missing env vars (values hidden):', { missing: missing, resolvedFrom: resolvedFrom });
    return res.status(500).json({
      error: errMsg,
      missing: missing,
      resolvedFrom: resolvedFrom,
    });
  }

  var payload = {
    inputs: {},
    query: String(userMessage),
    response_mode: 'streaming',
    user: String(userId),
  };

  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  var abortController = new AbortController();
  req.on('close', function () {
    try {
      abortController.abort();
    } catch (e) {}
  });

  try {
    var upstream = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!upstream.ok || !upstream.body) {
      var errText = '';
      try {
        errText = await upstream.text();
      } catch (e) {}
      console.error('[api/chat] Dify HTTP error', upstream.status, errText.slice(0, 1200));
      var errJson;
      try {
        errJson = errText ? JSON.parse(errText) : {};
      } catch (e) {
        errJson = {};
      }
      return res.status(500).json({
        error: errJson.message || errJson.error || 'Dify API request failed',
        status: upstream.status,
        details: errJson,
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    var reader = upstream.body.getReader();

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value) {
        res.write(Buffer.from(chunk.value));
      }
    }

    return res.end();
  } catch (err) {
    var message = err && err.name === 'AbortError' ? 'Request aborted' : (err && err.message ? err.message : 'Internal server error');
    console.error('[api/chat]', message);
    if (!res.headersSent) {
      return res.status(500).json({ error: message });
    }
    try {
      res.write('event: error\n');
      res.write('data: ' + JSON.stringify({ error: message }) + '\n\n');
    } catch (e) {}
    return res.end();
  }
};
