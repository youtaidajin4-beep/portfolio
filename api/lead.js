/**
 * Vercel Serverless — LP リードを Notion DB に upsert
 * POST /api/lead
 *
 * 環境変数:
 *   NOTION_TOKEN（インテグレーションシークレット）
 *   NOTION_LEADS_DB_ID（データベース ID）
 *   NOTION_PROP_*（列名の上書き、省略時は docs/LEAD_SCHEMA_AND_PRIVACY.md のデフォルト）
 *   LEAD_API_SECRET（任意）— 設定時は Authorization: Bearer <値> または X-Lead-Secret: <値> が必須
 *   ALLOWED_ORIGINS（任意）— カンマ区切り。設定時は Origin が一致しないと 403
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

function applyCors(req, res) {
  var origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Lead-Secret');
}

function propNames() {
  return {
    leadTitle: process.env.NOTION_PROP_LEAD_TITLE || 'Lead ID',
    chatPurpose: process.env.NOTION_PROP_CHAT_PURPOSE || 'chat_purpose',
    name: process.env.NOTION_PROP_NAME || 'name',
    phone: process.env.NOTION_PROP_PHONE || 'phone',
    email: process.env.NOTION_PROP_EMAIL || 'email',
    intentTags: process.env.NOTION_PROP_INTENT_TAGS || 'intent_tags',
    lastUserMessage: process.env.NOTION_PROP_LAST_USER_MESSAGE || 'last_user_message',
    contextJson: process.env.NOTION_PROP_CONTEXT_JSON || 'context_json',
    lineLinked: process.env.NOTION_PROP_LINE_LINKED || 'line_linked',
    lineUserId: process.env.NOTION_PROP_LINE_USER_ID || 'line_user_id',
  };
}

function richText(val) {
  if (val == null) return undefined;
  var s = String(val).trim();
  if (!s) return undefined;
  return { rich_text: [{ type: 'text', text: { content: s.slice(0, 2000) } }] };
}

function titleValue(val) {
  var s = String(val || '').trim().slice(0, 200);
  if (!s) return undefined;
  return { title: [{ type: 'text', text: { content: s } }] };
}

function checkboxVal(val) {
  if (typeof val !== 'boolean') return undefined;
  return { checkbox: val };
}

function buildNotionProps(body, names, forCreate) {
  var props = {};
  var t = titleValue(body.lead_id);
  if (forCreate && !t) return null;
  if (forCreate && t) props[names.leadTitle] = t;

  var cp = richText(body.chat_purpose);
  if (cp) props[names.chatPurpose] = cp;
  var n = richText(body.name);
  if (n) props[names.name] = n;
  var ph = richText(body.phone);
  if (ph) props[names.phone] = ph;
  var em = richText(body.email);
  if (em) props[names.email] = em;
  var it = richText(body.intent_tags);
  if (it) props[names.intentTags] = it;
  var lu = richText(body.last_user_message);
  if (lu) props[names.lastUserMessage] = lu;
  var cj = richText(body.context_json);
  if (cj) props[names.contextJson] = cj;
  var li = richText(body.line_user_id);
  if (li) props[names.lineUserId] = li;
  var ll = checkboxVal(body.line_linked);
  if (ll !== undefined) props[names.lineLinked] = ll;

  return props;
}

function isValidLeadId(id) {
  return typeof id === 'string' && /^nr_[A-Za-z0-9_-]{8,128}$/.test(id);
}

function checkAllowedOrigin(req) {
  var raw = process.env.ALLOWED_ORIGINS;
  if (!raw || !String(raw).trim()) return true;
  var origin = req.headers.origin;
  if (!origin) return true;
  var list = String(raw)
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  return list.indexOf(origin) !== -1;
}

function checkLeadSecret(req) {
  var secret = process.env.LEAD_API_SECRET;
  if (!secret || !String(secret).trim()) return true;
  var auth = req.headers.authorization || '';
  var bearer = auth.indexOf('Bearer ') === 0 ? auth.slice(7).trim() : '';
  var hdr = req.headers['x-lead-secret'];
  var x = typeof hdr === 'string' ? hdr.trim() : '';
  return bearer === secret || x === secret;
}

async function notionFetch(path, init) {
  var token = process.env.NOTION_TOKEN;
  var opt = init || {};
  var res = await fetch('https://api.notion.com/v1' + path, {
    method: opt.method || 'GET',
    body: opt.body,
    headers: Object.assign(
      {
        Authorization: 'Bearer ' + token,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      opt.headers || {}
    ),
  });
  return res;
}

module.exports = async function handler(req, res) {
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

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_LEADS_DB_ID) {
    return res.status(503).json({
      error: 'Lead sync is not configured',
      hint: 'Set NOTION_TOKEN and NOTION_LEADS_DB_ID on Vercel',
    });
  }

  if (!checkAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (!checkLeadSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!isValidLeadId(body.lead_id)) {
    return res.status(400).json({ error: 'lead_id is required (format: nr_...)' });
  }

  var dbId = process.env.NOTION_LEADS_DB_ID.trim();
  var names = propNames();

  var queryRes = await notionFetch('/databases/' + dbId + '/query', {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: names.leadTitle,
        title: { equals: body.lead_id },
      },
      page_size: 1,
    }),
  });

  if (!queryRes.ok) {
    var qt = await queryRes.text();
    console.error('[api/lead] Notion query failed', queryRes.status, qt.slice(0, 500));
    return res.status(502).json({ error: 'Notion query failed', status: queryRes.status });
  }

  var queryJson = await queryRes.json();
  var existing = queryJson.results && queryJson.results[0];

  if (!existing) {
    var createProps = buildNotionProps(body, names, true);
    if (!createProps || !createProps[names.leadTitle]) {
      return res.status(400).json({ error: 'Cannot create page without Lead ID title' });
    }
    var createRes = await notionFetch('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: createProps,
      }),
    });
    if (!createRes.ok) {
      var ct = await createRes.text();
      console.error('[api/lead] Notion create failed', createRes.status, ct.slice(0, 800));
      return res.status(502).json({ error: 'Notion create failed', status: createRes.status });
    }
    var created = await createRes.json();
    return res.status(200).json({ ok: true, action: 'created', pageId: created.id });
  }

  var updateProps = buildNotionProps(body, names, false);
  delete updateProps[names.leadTitle];

  if (Object.keys(updateProps).length === 0) {
    return res.status(200).json({ ok: true, action: 'noop', pageId: existing.id });
  }

  var patchRes = await notionFetch('/pages/' + existing.id, {
    method: 'PATCH',
    body: JSON.stringify({ properties: updateProps }),
  });

  if (!patchRes.ok) {
    var pt = await patchRes.text();
    console.error('[api/lead] Notion patch failed', patchRes.status, pt.slice(0, 800));
    return res.status(502).json({ error: 'Notion update failed', status: patchRes.status });
  }

  return res.status(200).json({ ok: true, action: 'updated', pageId: existing.id });
};
