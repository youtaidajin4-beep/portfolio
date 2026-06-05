/**
 * rental.html UI shell — drawer, how-to sheet, toast (no chat logic)
 */
(function () {
  'use strict';

  var NR = window.NAGA_ROOM || {};
  var menuBtn = document.getElementById('nrRentalMenuBtn');
  var drawer = document.getElementById('nrRentalDrawer');
  var overlay = document.getElementById('nrRentalDrawerOverlay');
  var drawerClose = document.getElementById('nrRentalDrawerClose');
  var howTo = document.getElementById('nrRentalHowTo');
  var howToBackdrop = document.getElementById('nrHowToBackdrop');
  var howToClose = document.getElementById('nrHowToClose');
  var toast = document.getElementById('nrRentalToast');
  var toastTimer = null;

  function lineUrl() {
    if (typeof NR.lineMessageUrl === 'function') return NR.lineMessageUrl('相談');
    return NR.LINE_URL || '#';
  }

  function setLineLinks() {
    var url = lineUrl();
    var navLine = document.getElementById('nrNavLine');
    if (navLine) navLine.href = url;
  }

  function openDrawer() {
    if (!drawer || !overlay) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.removeAttribute('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nr-rental-drawer-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function closeDrawer() {
    if (!drawer || !overlay) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('hidden', '');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nr-rental-drawer-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.focus();
    }
  }

  function openHowTo() {
    if (!howTo) return;
    closeDrawer();
    howTo.removeAttribute('hidden');
    howTo.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nr-rental-howto-open');
    if (howToClose) howToClose.focus();
  }

  function closeHowTo() {
    if (!howTo) return;
    howTo.setAttribute('hidden', '');
    howTo.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nr-rental-howto-open');
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message || '現在準備中です';
    toast.removeAttribute('hidden');
    toast.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.setAttribute('hidden', '');
    }, 3000);
  }

  function handleListingsNav(ev) {
    var section = document.getElementById('gasListingSection');
    if (section && !section.hasAttribute('hidden')) {
      ev.preventDefault();
      closeDrawer();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', openDrawer);
  }
  if (drawerClose) {
    drawerClose.addEventListener('click', closeDrawer);
  }
  if (overlay) {
    overlay.addEventListener('click', closeDrawer);
  }
  if (howToBackdrop) {
    howToBackdrop.addEventListener('click', closeHowTo);
  }
  if (howToClose) {
    howToClose.addEventListener('click', closeHowTo);
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (howTo && !howTo.hasAttribute('hidden')) {
      closeHowTo();
      return;
    }
    if (drawer && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  var howToBtn = document.getElementById('nrNavHowTo');
  if (howToBtn) {
    howToBtn.addEventListener('click', function () {
      openHowTo();
    });
  }

  var listingsLink = document.getElementById('nrNavListings');
  if (listingsLink) {
    listingsLink.addEventListener('click', handleListingsNav);
  }

  var savedBtn = document.getElementById('nrNavSaved');
  if (savedBtn) {
    savedBtn.addEventListener('click', function () {
      closeDrawer();
      showToast('現在準備中です');
    });
  }

  var recentBtn = document.getElementById('nrNavRecent');
  if (recentBtn) {
    recentBtn.addEventListener('click', function () {
      closeDrawer();
      showToast('現在準備中です');
    });
  }

  var resetBtn = document.getElementById('nrNavReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      window.location.reload();
    });
  }

  setLineLinks();
})();
