/**
 * GET /api/properties — Firestore 公開物件一覧
 * GET /api/properties?id=xxx — 1件
 */
var { getDb, isFirebaseConfigured } = require('../lib/firebase-admin');
var { docToProperty, isPublishedStatus } = require('../lib/property-normalize');

function applyCors(req, res) {
  var origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function setCacheHeaders(res) {
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
}

var PUBLIC_STATUSES = ['公開', '公開中', 'public'];

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isFirebaseConfigured()) {
    return res.status(503).json({
      error: 'Firebase is not configured',
      missing: {
        FIREBASE_PROJECT_ID: !process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !process.env.FIREBASE_PRIVATE_KEY
      }
    });
  }

  var db = getDb();
  if (!db) {
    return res.status(503).json({ error: 'Firestore unavailable' });
  }

  var id =
    req.query && req.query.id != null
      ? String(req.query.id).trim()
      : '';

  try {
    if (id) {
      var doc = await db.collection('properties').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Property not found' });
      }
      var row = docToProperty(doc);
      if (!row || !isPublishedStatus(row.status)) {
        return res.status(404).json({ error: 'Property not found' });
      }
      setCacheHeaders(res);
      return res.status(200).json(row);
    }

    var snap = await db.collection('properties').where('status', 'in', PUBLIC_STATUSES).get();
    var list = [];
    snap.forEach(function (doc) {
      var row = docToProperty(doc);
      if (!row) return;
      if (!isPublishedStatus(row.status)) return;
      list.push(row);
    });
    list.sort(function (a, b) {
      return Number(b.views || 0) - Number(a.views || 0);
    });

    setCacheHeaders(res);
    return res.status(200).json({ properties: list, items: list });
  } catch (err) {
    console.error('[api/properties]', err);
    return res.status(500).json({
      error: err && err.message ? err.message : 'Internal server error'
    });
  }
};
