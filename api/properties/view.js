/**
 * POST /api/properties/view — 閲覧数 increment
 * body: { "propertyId": "nr-001", "area": "浦上" }
 */
var { getDb, isFirebaseConfigured, getFieldValue } = require('../../lib/firebase-admin');
var { isPublishedStatus } = require('../../lib/property-normalize');

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

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isFirebaseConfigured()) {
    return res.status(503).json({ error: 'Firebase is not configured' });
  }

  var db = getDb();
  if (!db) {
    return res.status(503).json({ error: 'Firestore unavailable' });
  }

  var body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  var propertyId = body.propertyId != null ? String(body.propertyId).trim() : '';
  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  try {
    var ref = db.collection('properties').doc(propertyId);
    var doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    var data = doc.data() || {};
    if (!isPublishedStatus(data.status)) {
      return res.status(404).json({ error: 'Property not found' });
    }

    var FieldValue = getFieldValue();
    await ref.update({
      views: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    return res.status(200).json({ ok: true, propertyId: propertyId });
  } catch (err) {
    console.error('[api/properties/view]', err);
    return res.status(500).json({
      error: err && err.message ? err.message : 'Internal server error'
    });
  }
};
