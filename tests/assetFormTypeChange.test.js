'use strict'
// Asset-Formular: Typwechsel aktualisiert die CIA-Werte sofort (#91).
//
// Gemeldet von @jasc76: Beim Wechsel des Asset-Typs wurden die Schutzziel-
// Vorgaben des Typs erst nach Speichern und erneutem Öffnen sichtbar.
//
// ui/app.js ist Browser-Code ohne Export. Die beteiligten Funktionen werden
// deshalb aus dem Quelltext herausgelöst und in einem vm-Kontext mit einem
// minimalen DOM-Ersatz ausgeführt.

const fs   = require('fs')
const path = require('path')
const vm   = require('vm')

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')

/** Quelltext einer Top-Level-Funktion (bis zur schließenden Klammer in Spalte 0). */
function fnSource(name) {
  const start = APP_JS.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`Funktion ${name} nicht gefunden`)
  const end = APP_JS.indexOf('\n}\n', start)
  return APP_JS.slice(start, end + 3)
}

function makeEnv(types) {
  const els = {}
  const el = (value = '', extra = {}) => ({ value, disabled: false, checked: false, style: {}, ...extra })
  els.asType         = el('')
  els.asProt_c       = el('2')
  els.asProt_i       = el('2')
  els.asProt_a       = el('2')
  els.asProt_auth    = el('')
  els.asClass        = el('internal')
  els.asProtOverride = el('', { checked: false })
  els.asProtOverrideRow = el('', { style: { display: 'none' } })

  const ctx = {
    dom: id => els[id] || null,
    ASSET_TYPES: types,
    ASSET_PROT_GOALS: [{ key: 'c' }, { key: 'i' }, { key: 'a' }, { key: 'auth' }],
    ASSET_CLASS_TO_LEVEL: { public: 1, internal: 2, confidential: 3, strictly_confidential: 4 },
    ASSET_LEVEL_TO_CLASS: { 1: 'public', 2: 'internal', 3: 'confidential', 4: 'strictly_confidential' },
  }
  vm.createContext(ctx)
  const code = ['_syncAssetConfidentiality', '_toggleAssetProtOverride', '_selectedAssetTypeProt', '_onAssetTypeChange']
    .map(fnSource).join('\n')
  vm.runInContext(code, ctx)
  return { ctx, els }
}

const TYPES = [
  { id: 'server',  protection: { c: 3, i: 4, a: 4 } },
  { id: 'monitor', protection: null },
]

describe('#91 – Typwechsel im Asset-Formular', () => {
  test('der Typ-Select löst den Handler aus', () => {
    expect(APP_JS).toMatch(/id="asType"[^>]*onchange="_onAssetTypeChange\(\)"/)
  })

  test('der Override-Schalter wird immer gerendert (nur ein-/ausgeblendet)', () => {
    expect(fnSource('_assetProtOverrideToggle')).not.toMatch(/return ''/)
    expect(fnSource('_assetProtOverrideToggle')).toMatch(/id="asProtOverrideRow"/)
  })

  test('Typ mit Vorgabe: Werte werden sofort gesetzt und gesperrt', () => {
    const { ctx, els } = makeEnv(TYPES)
    els.asType.value = 'server'
    ctx._onAssetTypeChange()
    expect([els.asProt_c.value, els.asProt_i.value, els.asProt_a.value]).toEqual(['3', '4', '4'])
    expect(els.asProt_c.disabled).toBe(true)
    expect(els.asProtOverrideRow.style.display).toBe('')
    expect(els.asClass.value).toBe('confidential')   // Vertraulichkeit 3 zieht die Klassifizierung mit
  })

  test('aktive Übersteuerung: Eigenwerte bleiben unangetastet', () => {
    const { ctx, els } = makeEnv(TYPES)
    els.asType.value = 'server'
    els.asProtOverride.checked = true
    els.asProt_c.value = '1'
    ctx._onAssetTypeChange()
    expect(els.asProt_c.value).toBe('1')
  })

  test('Typ ohne Vorgabe: Felder frei, Schalter ausgeblendet und zurückgesetzt', () => {
    const { ctx, els } = makeEnv(TYPES)
    els.asType.value = 'server'
    ctx._onAssetTypeChange()
    els.asType.value = 'monitor'
    ctx._onAssetTypeChange()
    expect(els.asProt_c.disabled).toBe(false)
    expect(els.asProtOverrideRow.style.display).toBe('none')
    expect(els.asProtOverride.checked).toBe(false)
  })

  test('Speichern leitet den Sperrzustand aus dem gewählten Typ ab, nicht aus dem Schalter', () => {
    const src = APP_JS.slice(APP_JS.indexOf('async function saveAsset'))
    expect(src).toMatch(/_selectedAssetTypeProt\(\)/)
  })
})
