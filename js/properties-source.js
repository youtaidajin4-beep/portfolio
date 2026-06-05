/**
 * 物件一覧の取得（Firebase API → JSON）
 * rental.html / listings.html / property.html から利用
 */
(function (global) {
  'use strict';

  function parsePropertiesResponse(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.properties)) return data.properties;
    return [];
  }

  function resolveUrl(nr, path) {
    nr = nr || global.NAGA_ROOM || {};
    var base = typeof nr.API_ORIGIN === 'string' ? nr.API_ORIGIN.replace(/\/+$/, '').trim() : '';
    var p = path || nr.PROPERTIES_API_URL || '/api/properties';
    if (!/^\//.test(p)) p = '/' + p;
    return base ? base + p : p;
  }

  function fetchFirebaseProperties(nr) {
    nr = nr || global.NAGA_ROOM || {};
    var url = resolveUrl(nr, nr.PROPERTIES_API_URL || '/api/properties');
    return fetch(url, { method: 'GET', cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Firebase API HTTP ' + res.status);
      return res.json();
    }).then(parsePropertiesResponse);
  }

  function fetchJsonProperties(nr) {
    nr = nr || global.NAGA_ROOM || {};
    var jsonUrl = nr.PROPERTIES_DATA_URL || 'data/properties.json';
    return fetch(jsonUrl, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load properties.json');
        return res.json();
      })
      .then(parsePropertiesResponse);
  }

  /**
   * @param {object} nr NAGA_ROOM 設定
   * @returns {Promise<{ list: Array, source: string }>}
   */
  function loadPropertyListWithFallback(nr) {
    nr = nr || global.NAGA_ROOM || {};
    function finish(list, source) {
      return { list: Array.isArray(list) ? list : [], source: source || 'unknown' };
    }

    if (nr.USE_FIREBASE_PROPERTIES === true) {
      return fetchFirebaseProperties(nr)
        .then(function (list) {
          if (list.length > 0) return finish(list, 'firebase');
          return fetchJsonProperties(nr).then(function (j) { return finish(j, 'json'); });
        })
        .catch(function () {
          return fetchJsonProperties(nr).then(function (j) { return finish(j, 'json'); });
        });
    }

    return fetchJsonProperties(nr).then(function (j) { return finish(j, 'json'); });
  }

  function fetchPropertyById(nr, id) {
    nr = nr || global.NAGA_ROOM || {};
    var wanted = String(id || '').trim();
    if (!wanted) return Promise.resolve(null);
    if (nr.USE_FIREBASE_PROPERTIES === true) {
      var url = resolveUrl(nr, nr.PROPERTIES_API_URL || '/api/properties') + '?id=' + encodeURIComponent(wanted);
      return fetch(url, { cache: 'no-store' })
        .then(function (res) {
          if (res.ok) return res.json();
          if (res.status === 404) return null;
          throw new Error('HTTP ' + res.status);
        })
        .catch(function () {
          return loadPropertyListWithFallback(nr).then(function (r) {
            var list = r.list || [];
            for (var i = 0; i < list.length; i++) {
              if (String(list[i].id || '').trim() === wanted) return list[i];
            }
            return null;
          });
        });
    }
    return loadPropertyListWithFallback(nr).then(function (r) {
      var list = r.list || [];
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id || '').trim() === wanted) return list[i];
      }
      return null;
    });
  }

  global.NR_PROPERTY_LOADER = {
    loadPropertyListWithFallback: loadPropertyListWithFallback,
    fetchPropertyById: fetchPropertyById,
    resolveUrl: resolveUrl
  };
})(typeof window !== 'undefined' ? window : this);
