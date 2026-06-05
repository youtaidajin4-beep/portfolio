/**
 * Firebase Admin SDK（Vercel Serverless 用）
 * 環境変数: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
var admin = require('firebase-admin');

function getPrivateKey() {
  var key = process.env.FIREBASE_PRIVATE_KEY || '';
  if (!key) return '';
  if (key.indexOf('\\n') !== -1) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
}

function isFirebaseConfigured() {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    getPrivateKey()
  );
}

function getAdminApp() {
  if (!isFirebaseConfigured()) return null;
  if (admin.apps.length) return admin.app();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey()
    })
  });
  return admin.app();
}

function getDb() {
  var app = getAdminApp();
  if (!app) return null;
  return admin.firestore();
}

function getFieldValue() {
  getAdminApp();
  return admin.firestore.FieldValue;
}

module.exports = {
  isFirebaseConfigured: isFirebaseConfigured,
  getDb: getDb,
  getFieldValue: getFieldValue
};
