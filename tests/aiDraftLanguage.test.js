'use strict'
// KI-Maske: Sprache der Anfrage = Sprache der Oberfläche und Englisch (nicht mehr nur die Standardsprache der Installation)
const fs = require('fs'), path = require('path')
const app = fs.readFileSync(path.join(__dirname, '../ui/app.js'), 'utf8')
const fn = app.slice(app.indexOf('async function aiDraftPolicy('), app.indexOf('async function aiDraftPolicy(') + 6000)

test('Sprachauswahl der KI-Maske folgt den in den Organisationseinstellungen gewählten Sprachen', () => {
  expect(fn).toMatch(/_langConfig\?\.available/)                       // Auswahl aus den Organisationseinstellungen
  expect(fn).toMatch(/filter\(l => cat\.languages\.includes\(l\)\)/)    // nur Sprachen, die der Katalog kennt
  expect(fn).toMatch(/avail\.includes\(uiLang\) \? uiLang : avail\[0\]/) // Vorbelegung: Oberflächensprache
  expect(fn).not.toMatch(/_langConfig\?\.default/)
  expect(fn).toMatch(/langLabel\(l\)/)   // Eigenbezeichnung statt nur Kürzel
})

test('der Katalog bietet Estnisch und Ungarisch an (Titel und Prompt in der Landessprache)', () => {
  const draft = require('../server/ai/safeDraft')
  expect(draft.LANGUAGES).toEqual(expect.arrayContaining(['hu', 'et', 'en']))
  for (const lang of ['hu', 'et']) {
    const e = draft.CATALOG[0]
    const r = draft.buildPrompt({ entry: e.id, language: lang, hint: '' })
    expect(r.ok).toBe(true)
    expect(r.prompt).toContain(lang === 'hu' ? 'Hungarian' : 'Estonian')
  }
})
