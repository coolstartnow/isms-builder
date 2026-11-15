'use strict'
// Nachweis-Link am Lieferanten (GitHub #108): Ausgabe in der Oberfläche und Vollständigkeit der Texte.
const fs = require('fs')
const path = require('path')
const evidence = require('../server/supplierEvidence')
const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8')

describe('Nachweis-Link: Prüffunktion', () => {
  test('erlaubt nur http(s), gültige Daten und Längen', () => {
    expect(evidence.validate({})).toBeNull()
    expect(evidence.validate({ evidenceUrl: 'https://a.example/x?y=1#z' })).toBeNull()
    expect(evidence.validate({ evidenceUrl: 'http://a.example' })).toBeNull()
    expect(evidence.validate({ evidenceUrl: 'javascript:alert(1)' })).toMatch(/http/)
    expect(evidence.validate({ evidenceValidUntil: '2026-02-30' })).toMatch(/date/i)
    expect(evidence.validate({ evidenceValidUntil: '2028-02-29' })).toBeNull()
    expect(evidence.validate({ evidenceLabel: 'x'.repeat(121) })).toMatch(/120/)
  })
  test('expiring: nur laufende Lieferanten, auch Vergangenheit, Grenze = heute + Tage', () => {
    const d = o => new Date(Date.now() + o * 86400000).toISOString().slice(0, 10)
    const list = [
      { name: 'a', status: 'active', evidenceValidUntil: d(60) }, { name: 'b', status: 'active', evidenceValidUntil: d(61) },
      { name: 'c', status: 'under_review', evidenceValidUntil: d(-1) }, { name: 'd', status: 'inactive', evidenceValidUntil: d(1) },
      { name: 'e', status: 'terminated', evidenceValidUntil: d(1) }, { name: 'f', status: 'active', evidenceValidUntil: '' },
      { name: 'g', status: 'active', evidenceValidUntil: d(1), deletedAt: '2026-01-01' },
    ]
    expect(evidence.expiring(list, 60).map(x => x.name)).toEqual(['a', 'c'])
  })
})

describe('Nachweis-Link: Oberfläche', () => {
  const app = read('ui', 'app.js')
  const cell = app.slice(app.indexOf('function supEvidenceCell'), app.indexOf('function supStatusBadge'))
  test('Link nur bei http(s), über escHtml, mit noopener noreferrer', () => {
    expect(cell).toMatch(/\/\^https\?:\\\/\\\//)
    expect(cell).toMatch(/href="\$\{escHtml\(safeUrl\)\}"/)
    expect(cell).toMatch(/rel="noopener noreferrer"/)
    expect(cell).toMatch(/escHtml\(label\)/)
    expect(cell).not.toMatch(/\.evidenceUrl\}/) // der Rohwert gelangt nie direkt ins HTML
  })
  test('Formularfelder werden mit escHtml befüllt und beim Speichern gesendet', () => {
    expect(app).toMatch(/id="supEvidenceUrl"[^>]*value="\$\{escHtml\(item\?\.evidenceUrl/)
    expect(app).toMatch(/id="supEvidenceLabel"[^>]*value="\$\{escHtml\(item\?\.evidenceLabel/)
    expect(app).toMatch(/evidenceUrl:\s+dom\('supEvidenceUrl'\)/)
  })
  test('Texte in allen Sprachen; Kalendertyp eingetragen', () => {
    const w = {}
    new Function('window', read('ui', 'i18n', 'translations.js'))(w)
    const keys = Object.keys(w.TRANSLATIONS).filter(k => /^sup_evidence|^cal_supplierEvidence$/.test(k))
    expect(keys.length).toBeGreaterThanOrEqual(10)
    for (const k of keys) for (const l of require('../ui/i18n/languages.js').completeCodes()) expect(`${k}.${l}:${(w.TRANSLATIONS[k][l] || '').length > 0}`).toBe(`${k}.${l}:true`)
    expect(app).toMatch(/supplier_evidence:\s+\{/)
  })
})
