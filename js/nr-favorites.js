/**
 * 物件お気に入り（localStorage）
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'nr-favorites';

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function write(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) { /* ignore */ }
  }

  function isFavorite(id) {
    if (id == null) return false;
    return read().indexOf(String(id)) !== -1;
  }

  function toggle(id) {
    var sid = String(id);
    var ids = read();
    var i = ids.indexOf(sid);
    if (i === -1) ids.push(sid);
    else ids.splice(i, 1);
    write(ids);
    return i === -1;
  }

  function heartSvg(active) {
    var fill = active ? 'currentColor' : 'none';
    return (
      '<svg viewBox="0 0 24 24" fill="' +
      fill +
      '" stroke="currentColor" stroke-width="1.75" aria-hidden="true">' +
      '<path d="M12 20.5l-1.1-1C5.5 14.8 2 11.6 2 7.5 2 4.9 4 3 6.5 3c1.5 0 3 .9 3.7 2.2C11 3.9 12.5 3 14 3c2.5 0 4.5 1.9 4.5 4.5 0 4.1-3.5 7.3-8.9 11.9L12 20.5z"/>' +
      '</svg>'
    );
  }

  function bindFavButton(btn, id, onChange) {
    if (!btn || id == null) return;
    function sync() {
      var active = isFavorite(id);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', active ? 'お気に入りから外す' : 'お気に入りに追加');
      btn.innerHTML = heartSvg(active);
    }
    sync();
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggle(id);
      sync();
      if (typeof onChange === 'function') onChange(id, isFavorite(id));
    });
  }

  function formatStation(p) {
    if (!p) return '—';
    var s = p.station != null ? String(p.station).trim() : '';
    if (s) return s;
    var area = p.area != null ? String(p.area).trim() : '';
    return area || '—';
  }

  function listingCardHtml(p, escapeHtml, detailUrl) {
    var id = p.id != null ? String(p.id) : '';
    var img = p.image || '';
    var name = p.name != null ? String(p.name) : '物件';
    return (
      '<a class="property-card-hit" href="' +
      escapeHtml(detailUrl) +
      '">' +
      '<div class="property-card-img"><img src="' +
      escapeHtml(img) +
      '" alt="' +
      escapeHtml(name) +
      'のイメージ" loading="lazy" width="320" height="200"></div>' +
      '<div class="property-card-body">' +
      '<p class="property-card-rent">' +
      escapeHtml(p.rent != null ? String(p.rent) : '—') +
      '</p>' +
      '<p class="property-card-layout">' +
      escapeHtml(p.layout != null ? String(p.layout) : '—') +
      '</p>' +
      '<p class="property-card-station">' +
      escapeHtml(formatStation(p)) +
      '</p>' +
      '<p class="property-card-name-sub">' +
      escapeHtml(name) +
      '</p>' +
      '</div></a>' +
      '<div class="property-card-footer-row">' +
      '<span class="property-card-link-hint">詳細を見る</span>' +
      '<button type="button" class="property-card-fav" data-fav-id="' +
      escapeHtml(id) +
      '" aria-pressed="false" aria-label="お気に入りに追加">' +
      heartSvg(false) +
      '</button></div>'
    );
  }

  function wireListingCards(root) {
    if (!root) return;
    root.querySelectorAll('.property-card-fav[data-fav-id]').forEach(function (btn) {
      bindFavButton(btn, btn.getAttribute('data-fav-id'));
    });
  }

  global.NR_FAVORITES = {
    read: read,
    isFavorite: isFavorite,
    toggle: toggle,
    bindFavButton: bindFavButton,
    heartSvg: heartSvg,
    formatStation: formatStation,
    listingCardHtml: listingCardHtml,
    wireListingCards: wireListingCards
  };
})(typeof window !== 'undefined' ? window : this);
