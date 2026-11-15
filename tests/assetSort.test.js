'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Asset-Liste sortieren (Diskussion #111): Standard Kategorie → Typ → Name, natürliche Zahlen, leerer Typ zuletzt, Spalten auf-/absteigend, Leere immer am Ende.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const APP = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
const fn = name => { const a = APP.indexOf(`function ${name}(`); if (a < 0) throw new Error(name); return APP.slice(a, APP.indexOf('\n}\n', a) + 3) }

function load() {
  const ctx = {
    window: { LANG: 'de' }, Intl,
    assetCatLabel: c => ({ hardware: 'Hardware', software: 'Software', data: 'Daten', people: 'Personen' }[c] || c),
    assetTypeLabel: x => ({ laptop: 'Laptop', server: 'Server', crm: 'CRM', erp: 'ERP', ae: 'Äpfel' }[x] || x),
    ASSET_CLASS: { public: 1, internal: 2, confidential: 3, strictly_confidential: 4 }, ASSET_CRIT: { low: 1, medium: 2, high: 3, critical: 4 },
    ASSET_STATUS_LABELS: { active: 'Aktiv', planned: 'Geplant', decommissioned: 'Außer Betrieb' },
    ASSET_PROT_GOALS: [{ key: 'c' }, { key: 'i' }, { key: 'a' }, { key: 'auth' }],
  }
  vm.createContext(ctx); vm.runInContext(fn('sortAssets'), ctx); return ctx.sortAssets
}
const A = (name, category, type, extra = {}) => ({ id: name, name, category, type, ...extra })
const names = l => l.map(a => a.name)

describe('Asset-Liste sortieren', () => {
  const sortAssets = load()
  test('Standard: Kategorie (alphabetisch nach Anzeigename) → Typ → Name; neue Einträge landen an ihrem Platz, nicht unten', () => {
    const list = [A('Zebra', 'software', 'crm'), A('Laptop 10', 'hardware', 'laptop'), A('Server B', 'hardware', 'server'), A('Daten X', 'data', 'crm'), A('Laptop 2', 'hardware', 'laptop'), A('Alpha', 'software', 'crm'), A('Neu-Server', 'hardware', 'server')]
    expect(names(sortAssets(list, null))).toEqual(['Daten X', 'Laptop 2', 'Laptop 10', 'Neu-Server', 'Server B', 'Alpha', 'Zebra'])   // Daten < Hardware < Software; „Laptop 2“ vor „Laptop 10“
  })
  test('leerer Typ steht innerhalb der Kategorie zuletzt; Umlaute werden einsortiert; gleiche Namen bleiben stabil', () => {
    const list = [A('Ohne Typ', 'hardware', ''), A('B', 'hardware', 'server'), A('Ä-Gerät', 'hardware', 'ae'), A('A', 'hardware', 'laptop')]
    expect(names(sortAssets(list, null))).toEqual(['Ä-Gerät', 'A', 'B', 'Ohne Typ'])      // Typen: Äpfel < Laptop < Server, leer zuletzt
  })
  test('Spalte auf- und absteigend; Leere bleiben in beiden Richtungen am Ende; Nebenordnung ist der Standard', () => {
    const list = [A('C', 'hardware', 'laptop', { owner: 'Zoe' }), A('A', 'hardware', 'laptop', { owner: '' }), A('B', 'hardware', 'laptop', { owner: 'Adam' }), A('D', 'hardware', 'laptop', { owner: 'Adam' })]
    expect(names(sortAssets(list, { key: 'owner', dir: 'asc' }))).toEqual(['B', 'D', 'C', 'A'])
    expect(names(sortAssets(list, { key: 'owner', dir: 'desc' }))).toEqual(['C', 'B', 'D', 'A'])
  })
  test('Klassifizierung und Kritikalität nach ihrer Rangfolge, Schutzbedarf nach dem höchsten Wert, Lebensende nach Datum', () => {
    const list = [A('x', 'hardware', 'laptop', { classification: 'confidential', criticality: 'low', effectiveProtection: { c: 2, i: 1 }, endOfLifeDate: '2030-01-01' }),
      A('y', 'hardware', 'laptop', { classification: 'public', criticality: 'critical', effectiveProtection: { c: 4 }, endOfLifeDate: '2027-05-01' }),
      A('z', 'hardware', 'laptop', { classification: 'strictly_confidential', criticality: 'high', protection: { a: 3 }, endOfLifeDate: '' })]
    expect(names(sortAssets(list, { key: 'class', dir: 'asc' }))).toEqual(['y', 'x', 'z'])
    expect(names(sortAssets(list, { key: 'crit', dir: 'desc' }))).toEqual(['y', 'z', 'x'])
    expect(names(sortAssets(list, { key: 'prot', dir: 'desc' }))).toEqual(['y', 'z', 'x'])
    expect(names(sortAssets(list, { key: 'eol', dir: 'asc' }))).toEqual(['y', 'x', 'z'])    // ohne Datum zuletzt
  })
  test('Eingabe bleibt unverändert; unbekannte Spalte fällt auf den Standard zurück', () => {
    const list = [A('b', 'software', 'crm'), A('a', 'hardware', 'laptop')]; const copy = JSON.stringify(list)
    sortAssets(list, { key: 'name', dir: 'asc' }); expect(JSON.stringify(list)).toBe(copy)
    expect(names(sortAssets(list, { key: 'gibtsnicht', dir: 'asc' }))).toEqual(['a', 'b'])
  })
})
