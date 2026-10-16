// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// i18n translation engine

(function () {
  'use strict';

  // ── Language storage ─────────────────────────────────────────────────────
  const STORAGE_KEY = 'isms_lang';
  const SUPPORTED   = ['en', 'de', 'fr', 'nl', 'hu'];
  const DEFAULT     = 'en';

  function detectBrowserLang() {
    const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (nav.startsWith('de')) return 'de';
    if (nav.startsWith('fr')) return 'fr';
    if (nav.startsWith('nl')) return 'nl';
    if (nav.startsWith('hu')) return 'hu';
    return 'en';
  }

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || null;
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    localStorage.setItem(STORAGE_KEY, lang);
    window.LANG = lang;
  }

  function initLang() {
    const stored = getLang();
    if (stored) {
      window.LANG = stored;
    } else {
      // First visit: use browser language, but don't persist yet
      // (user will confirm on login page)
      window.LANG = detectBrowserLang();
    }
  }

  // ── Translation function ─────────────────────────────────────────────────
  // Usage: t('save')  →  'Save' (EN) or 'Speichern' (DE)
  // Falls back to key if not found
  function t(key, params) {
    const dict = window.TRANSLATIONS || {};
    const entry = dict[key];
    if (!entry) return key;
    const lang = window.LANG || DEFAULT;
    let str = entry[lang] || entry[DEFAULT] || key;
    // Simple param substitution: t('hello', { name: 'World' }) with 'Hello {name}'
    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return str;
  }

  // ── X-Lang an jeden Request der Oberfläche ───────────────────────────────
  // Der Server übersetzt seine Fehlertexte in diese Sprache (server/i18n.js). Nur Anfragen an den
  // eigenen Server (relative URLs oder gleicher Ursprung) bekommen den Header.
  if (typeof window.fetch === 'function' && !window.fetch.__islang) {
    const origFetch = window.fetch.bind(window)
    const wrapped = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || ''
        const sameOrigin = url.startsWith('/') || url.startsWith(location.origin)
        if (sameOrigin) {
          init = init ? { ...init } : {}
          const h = init.headers instanceof Headers ? new Headers(init.headers) : { ...(init.headers || {}) }
          if (h instanceof Headers) { if (!h.has('X-Lang')) h.set('X-Lang', window.LANG || DEFAULT) }
          else if (!('X-Lang' in h) && !('x-lang' in h)) h['X-Lang'] = window.LANG || DEFAULT
          init.headers = h
        }
      } catch { /* Header ist nur ein Komfort; der Request läuft in jedem Fall */ }
      return origFetch(input, init)
    }
    wrapped.__islang = true
    window.fetch = wrapped
  }

  // ── Expose globals ───────────────────────────────────────────────────────
  window.t       = t;
  window.setLang = setLang;
  window.getLang = getLang;
  window.initLang = initLang;
  window.detectBrowserLang = detectBrowserLang;

  // Init immediately
  initLang();
})();
