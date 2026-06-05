/**
 * Firebase Web 設定の解決（ファイル → localStorage）
 * admin.html で firebase-client-config.js の後に読み込む
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'nagaroom_firebase_config';

  function isValid(cfg) {
    if (!cfg || typeof cfg !== 'object') return false;
    var apiKey = String(cfg.apiKey || '').trim();
    var projectId = String(cfg.projectId || '').trim();
    if (!apiKey || !projectId) return false;
    if (/^YOUR_/i.test(apiKey) || /^YOUR_/i.test(projectId)) return false;
    return true;
  }

  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function normalize(cfg) {
    if (!cfg || typeof cfg !== 'object') return null;
    return {
      apiKey: String(cfg.apiKey || '').trim(),
      authDomain: String(cfg.authDomain || '').trim(),
      projectId: String(cfg.projectId || '').trim(),
      storageBucket: String(cfg.storageBucket || '').trim(),
      messagingSenderId: String(cfg.messagingSenderId || '').trim(),
      appId: String(cfg.appId || '').trim()
    };
  }

  function resolve() {
    if (isValid(window.NR_FIREBASE_CONFIG)) {
      return normalize(window.NR_FIREBASE_CONFIG);
    }
    var stored = readStorage();
    if (isValid(stored)) {
      window.NR_FIREBASE_CONFIG = normalize(stored);
      return window.NR_FIREBASE_CONFIG;
    }
    return null;
  }

  function save(cfg) {
    var n = normalize(cfg);
    if (!isValid(n)) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    } catch (e) {
      return false;
    }
    window.NR_FIREBASE_CONFIG = n;
    return true;
  }

  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function parseConfigJson(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (obj && obj.firebaseConfig && typeof obj.firebaseConfig === 'object') {
      obj = obj.firebaseConfig;
    }
    return normalize(obj);
  }

  window.NRFirebaseConfigLoader = {
    STORAGE_KEY: STORAGE_KEY,
    isValid: isValid,
    normalize: normalize,
    resolve: resolve,
    save: save,
    clearStorage: clearStorage,
    parseConfigJson: parseConfigJson,
    needsSetup: function () {
      return !isValid(resolve());
    }
  };

  resolve();
})();
