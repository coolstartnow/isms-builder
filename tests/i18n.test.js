'use strict'
// Motor-szintű tesztek a HU lokalizációhoz (ui/i18n/t.js).
//
// A modul böngésző-globálisokra (window/navigator/localStorage) épít, amik
// Jest 'node' testEnvironment-ben nem léteznek -- ugyanúgy stuboljuk be és
// injektáljuk `new Function(...)`-nel, ahogy a tests/i18nKeys.test.js teszi a
// translations.js-szel.

const fs   = require('fs')
const path = require('path')

const T_JS_SRC = fs.readFileSync(path.join(__dirname, '..', 'ui', 'i18n', 't.js'), 'utf8')

function makeLocalStorageMock() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
}

/** Friss t.js-példány saját window/navigator/localStorage stubbal minden híváshoz. */
function loadTjs({ navigatorLanguage = 'en-US', storedLang = null } = {}) {
  const win = {}
  const localStorage = makeLocalStorageMock()
  if (storedLang) localStorage.setItem('isms_lang', storedLang)
  const navigator = { language: navigatorLanguage }
  // eslint-disable-next-line no-new-func
  new Function('window', 'navigator', 'localStorage', T_JS_SRC)(win, navigator, localStorage)
  return { win, localStorage }
}

describe('i18n engine (t.js) – HU támogatás', () => {
  test('detectBrowserLang: hu-HU böngészőnyelv -> hu', () => {
    const { win } = loadTjs({ navigatorLanguage: 'hu-HU' })
    expect(win.detectBrowserLang()).toBe('hu')
  })

  test('detectBrowserLang: egyéb nyelvek változatlanul working (de/fr/nl/en)', () => {
    expect(loadTjs({ navigatorLanguage: 'de-DE' }).win.detectBrowserLang()).toBe('de')
    expect(loadTjs({ navigatorLanguage: 'fr-FR' }).win.detectBrowserLang()).toBe('fr')
    expect(loadTjs({ navigatorLanguage: 'nl-NL' }).win.detectBrowserLang()).toBe('nl')
    expect(loadTjs({ navigatorLanguage: 'es-ES' }).win.detectBrowserLang()).toBe('en')
  })

  test('setLang(\'hu\') elfogadott (SUPPORTED tartalmazza), perzisztálódik és window.LANG frissül', () => {
    const { win, localStorage } = loadTjs()
    win.setLang('hu')
    expect(win.LANG).toBe('hu')
    expect(localStorage.getItem('isms_lang')).toBe('hu')
  })

  test('setLang egy nem támogatott kóddal DEFAULT-ra (en) esik vissza', () => {
    const { win } = loadTjs()
    win.setLang('xx')
    expect(win.LANG).toBe('en')
  })

  test('initLang: tárolt \'hu\' nyelvet respektálja induláskor', () => {
    const { win } = loadTjs({ storedLang: 'hu' })
    win.initLang()
    expect(win.LANG).toBe('hu')
  })

  test('t(): hu bejegyzés visszaadása, ha a szótárban szerepel', () => {
    const { win } = loadTjs()
    win.setLang('hu')
    win.TRANSLATIONS = { save: { en: 'Save', de: 'Speichern', hu: 'Mentés' } }
    expect(win.t('save')).toBe('Mentés')
  })

  test('t(): hiányzó hu mező esetén a DEFAULT (en) értékre esik vissza, nem a kulcsnévre', () => {
    const { win } = loadTjs()
    win.setLang('hu')
    win.TRANSLATIONS = { save: { en: 'Save', de: 'Speichern' } } // nincs hu mező (S1 még nem kész)
    expect(win.t('save')).toBe('Save')
  })

  test('t(): teljesen hiányzó kulcs esetén a kulcsnevet adja vissza (fallback marad a régi viselkedés)', () => {
    const { win } = loadTjs()
    win.setLang('hu')
    win.TRANSLATIONS = {}
    expect(win.t('nonexistent_key')).toBe('nonexistent_key')
  })

  test('t(): paraméteres helyettesítés hu nyelven is működik', () => {
    const { win } = loadTjs()
    win.setLang('hu')
    win.TRANSLATIONS = { greet: { en: 'Hello {name}', hu: 'Szia {name}' } }
    expect(win.t('greet', { name: 'Világ' })).toBe('Szia Világ')
  })
})
