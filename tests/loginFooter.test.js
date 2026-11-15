'use strict'
const LANG_REG = require('../ui/i18n/languages.js')
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Anmeldeseite nennt die abgedeckten Normen und Rahmenwerke, auch ISO 22301 (BCM).
const fs = require('fs')
const path = require('path')
test('Fußzeile der Anmeldeseite nennt ISO 22301 — im HTML und in allen fünf Sprachen', () => {
  const html = fs.readFileSync(path.join(__dirname, '../ui/login.html'), 'utf8')
  expect(html).toMatch(/ISMS Builder · ISO 27001 · ISO 22301 · BSI · NIS2 · EUCS · EU AI Act/)
  const tr = fs.readFileSync(path.join(__dirname, '../ui/i18n/translations.js'), 'utf8')
  const line = tr.split('\n').find(l => l.trim().startsWith('loginFooter:'))
  for (const l of LANG_REG.completeCodes()) expect(line).toMatch(new RegExp(`${l}: 'ISMS Builder · ISO 27001 · ISO 22301 · BSI`))
})
