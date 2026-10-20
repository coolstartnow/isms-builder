'use strict'
// Risiko bearbeiten: Nach dem Speichern darf das Formular nicht offen bleiben, sonst legt ein
// zweiter Klick ein Duplikat an. ui/app.js ist nicht in Jest ladbar — statische Prüfung; die
// Wirkung wurde im laufenden Programm verifiziert (8 Risiken vorher/nachher, auch bei zwei
// gleichzeitigen Absendungen).
const fs = require('fs')
const path = require('path')
const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
const start = APP_JS.indexOf('async function submitRiskForm()')
const body = APP_JS.slice(start, APP_JS.indexOf('\nasync function deleteRisk', start))

describe('submitRiskForm', () => {
  test('baut die Risiko-Seite nach dem Speichern neu auf, bevor die Detailansicht geöffnet wird', () => {
    const iRender = body.indexOf('await renderRisk()')
    const iDetail = body.indexOf('await openRiskDetail(saved.id)')
    expect(iRender).toBeGreaterThan(-1)
    expect(iDetail).toBeGreaterThan(iRender)
  })

  test('verhindert doppeltes Absenden', () => {
    expect(body).toMatch(/if \(_riskSaving\) return/)
    expect(body).toMatch(/finally \{[^}]*_riskSaving = false/)
  })

  test('die Bearbeitungs-ID wird erst nach erfolgreichem Speichern zurückgesetzt', () => {
    expect(body.indexOf('_riskEditId = null')).toBeGreaterThan(body.indexOf('if (!res.ok)'))
  })
})
