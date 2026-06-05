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

function resolveDifyEnvByPurpose(chatPurpose) {
  var urlCandidates;
  var keyCandidates;
  if (chatPurpose === 'property') {
    // 物件検索専用があれば優先。未設定時は従来キーへフォールバック。
    urlCandidates = ['DIFY_PROPERTY_API_URL', 'DIFY_API_URL'];
    keyCandidates = ['DIFY_PROPERTY_API_KEY', 'DIFY_API_KEY'];
  } else if (chatPurpose === 'consult') {
    // 相談専用があれば優先。未設定時は物件検索キーへフォールバック。
    urlCandidates = ['DIFY_API_URL', 'DIFY_PROPERTY_API_URL'];
    keyCandidates = ['DIFY_API_KEY', 'DIFY_PROPERTY_API_KEY'];
  } else {
    urlCandidates = ['DIFY_API_URL', 'DIFY_PROPERTY_API_URL'];
    keyCandidates = ['DIFY_API_KEY', 'DIFY_PROPERTY_API_KEY'];
  }
  return {
    urlEnv: getFirstDefinedEnv(urlCandidates),
    keyEnv: getFirstDefinedEnv(keyCandidates),
  };
}

function normalizeDifyUrl(url) {
  if (!url) return '';
  var trimmed = String(url).trim();
  if (/\/v1\/chat-messages\/?$/.test(trimmed)) return trimmed;
  if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/?$/, '/chat-messages');
  if (/^https?:\/\/[^/]+\/?$/.test(trimmed)) return trimmed.replace(/\/?$/, '/v1/chat-messages');
  return trimmed;
}

function buildConditionExtractionPrompt(userMessage) {
  return [
    'あなたは賃貸条件抽出アシスタントです。',
    '次のユーザー発話から条件を抽出し、JSONのみで返してください。',
    '説明文は不要です。',
    'スキーマ:',
    '{"hard":{"budget":number|null,"layout":"","city":"","areas":[],"features":[],"safetyLevel":"","parking":false},"soft":{"preferences":[],"lifestyleTags":[]},"avoid":{"features":[]}}',
    'features は hard 条件のみ（pet,washstand,separate_bath,supermarket_near,school_near,parking,safe_area）を入れてください。',
    'soft.preferences には quiet,cafe_near,sunlight,station_access,security,corner,newish,reno を使ってください。',
    '不明項目は null または空配列/空文字にしてください。',
    'ユーザー発話:',
    String(userMessage || '')
  ].join('\n');
}

function parseJsonFromText(text) {
  var src = String(text || '').trim();
  if (!src) return null;
  try {
    return JSON.parse(src);
  } catch (e) {}
  var start = src.indexOf('{');
  var end = src.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(src.slice(start, end + 1));
  } catch (e2) {
    return null;
  }
}

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function isOriginAllowed(origin) {
  var allowed = allowedOrigins();
  if (!origin || !allowed.length) return true;
  return allowed.indexOf(origin) !== -1;
}

/** 別オリジンから rental を開く場合の CORS（プリフライト OPTIONS で 405 にならないようにする） */
function applyCors(req, res) {
  var origin = req.headers.origin;
  if (origin) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
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
  if (!isOriginAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
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
  var chatPurpose = body.chatPurpose;
  var mode = body.mode;
  var isExtractMode = mode === 'extract_conditions_json' && chatPurpose === 'property';

  if (userMessage == null || String(userMessage).trim() === '') {
    return res.status(400).json({ error: 'userMessage is required' });
  }

  var resolved = resolveDifyEnvByPurpose(chatPurpose);
  var difyUrlEnv = resolved.urlEnv;
  var apiKeyEnv = resolved.keyEnv;

  var difyUrl = normalizeDifyUrl(difyUrlEnv.value);
  var apiKey = apiKeyEnv.value;

  if (!difyUrl || !apiKey) {
    var missing;
    var errMsg;
    if (chatPurpose === 'property') {
      missing = {
        DIFY_PROPERTY_API_URL_OR_DIFY_API_URL: !difyUrl,
        DIFY_PROPERTY_API_KEY_OR_DIFY_API_KEY: !apiKey,
      };
      errMsg =
        'Server configuration error: for property flow (chatPurpose=property), set DIFY_PROPERTY_API_URL / DIFY_PROPERTY_API_KEY. If not using separate apps, DIFY_API_URL / DIFY_API_KEY can be used as fallback.';
    } else if (chatPurpose === 'consult') {
      missing = {
        DIFY_API_URL_OR_DIFY_PROPERTY_API_URL: !difyUrl,
        DIFY_API_KEY_OR_DIFY_PROPERTY_API_KEY: !apiKey,
      };
      errMsg =
        'Server configuration error: for consult flow (chatPurpose=consult), set DIFY_API_URL / DIFY_API_KEY. If not using separate apps, DIFY_PROPERTY_API_URL / DIFY_PROPERTY_API_KEY can be used as fallback.';
    } else {
      missing = {
        DIFY_API_URL_OR_DIFY_PROPERTY_API_URL: !difyUrl,
        DIFY_API_KEY_OR_DIFY_PROPERTY_API_KEY: !apiKey,
      };
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
    query: isExtractMode ? buildConditionExtractionPrompt(userMessage) : String(userMessage),
    response_mode: isExtractMode ? 'blocking' : 'streaming',
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
        Accept: isExtractMode ? 'application/json' : 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!upstream.ok || (!upstream.body && !isExtractMode)) {
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

    if (isExtractMode) {
      var blockingText = '';
      try {
        blockingText = await upstream.text();
      } catch (e) {}
      var blockingData = {};
      try {
        blockingData = blockingText ? JSON.parse(blockingText) : {};
      } catch (e2) {
        blockingData = {};
      }
      var answerText = blockingData.answer != null ? String(blockingData.answer) : '';
      var parsed = parseJsonFromText(answerText);
      return res.status(200).json({
        extractedConditions: parsed,
        answer: answerText,
        parseError: parsed ? null : 'invalid_json'
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
