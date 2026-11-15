// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Vollexport (Admin → Wartung): Der Knopf lädt per fetch und meldet eine beendete Sitzung verständlich,
// statt einen einfachen Download-Link zu verwenden (Browser zeigte bei 401 nur einen Download-Fehler).
const fs = require('fs')
const path = require('path')

const app = fs.readFileSync(path.join(__dirname, '../ui/app.js'), 'utf8')
const tr = fs.readFileSync(path.join(__dirname, '../ui/i18n/translations.js'), 'utf8')
const fnSrc = app.slice(app.indexOf('async function triggerExport()'), app.indexOf('\n}\n', app.indexOf('async function triggerExport()')) + 2)

describe('Vollexport-Knopf', () => {
  test('triggerExport lädt per fetch mit Admin-Kopfzeilen', () => {
    expect(fnSrc).toMatch(/fetch\('\/admin\/export',\s*\{\s*headers:\s*apiHeaders\('admin'\)/)
    expect(fnSrc).not.toMatch(/a\.href\s*=\s*'\/admin\/export'/)
  })
  test('401 führt zu verständlichem Hinweis und zur Anmeldeseite', () => {
    expect(fnSrc).toMatch(/res\.status === 401/)
    expect(fnSrc).toMatch(/maint_exportSessionEnded/)
    expect(fnSrc).toMatch(/login\.html/)
  })
  test('andere Fehler werden gemeldet, Dateiname kommt vom Server', () => {
    expect(fnSrc).toMatch(/maint_exportFailed/)
    expect(fnSrc).toMatch(/Content-Disposition/)
    expect(fnSrc).toMatch(/revokeObjectURL/)
  })
  test('Texte in allen sechs Sprachen', () => {
    for (const key of ['maint_exportSessionEnded', 'maint_exportFailed']) {
      const line = tr.split('\n').find(l => l.trim().startsWith(key + ':'))
      expect(line).toBeTruthy()
      for (const lang of ['de', 'en', 'fr', 'nl', 'hu', 'et']) expect(line).toMatch(new RegExp(`\\b${lang}:\\s*'[^']+`))
    }
  })
})
