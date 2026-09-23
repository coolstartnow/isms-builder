'use strict'
// Vollständigkeit der Übersetzungen.
//
// Hintergrund: Rund 30 Label-Maps in ui/app.js trugen ihre Anzeigetexte fest
// verdrahtet in Englisch (in einem Fall in Deutsch) und liefen damit an der
// i18n-Maschinerie vorbei. Sie sind auf `get x() { return t('key') }`
// umgestellt.
//
// Ein fehlender Schlüssel fällt dabei nicht auf: t() gibt den Schlüsselnamen
// zurück, die Oberfläche zeigt dann `govl_prioLow` statt „Niedrig" — kein
// Absturz, keine Fehlermeldung. Genau davor schützt dieser Test.

const fs   = require('fs')
const path = require('path')

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')

const TRANSLATIONS = (() => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'i18n', 'translations.js'), 'utf8')
  const win = {}
  // eslint-disable-next-line no-new-func
  new Function('window', src)(win)
  return win.TRANSLATIONS
})()

const LANGS = ['de', 'en', 'fr', 'nl', 'hu']

/** Alle statisch aufgelösten t('…') / t("…") aus app.js. */
function usedKeys() {
  const keys = new Set()
  for (const m of APP_JS.matchAll(/\bt\(\s*(['"])([A-Za-z0-9_]+)\1\s*[,)]/g)) keys.add(m[2])
  return [...keys].sort()
}

describe('i18n – Vollständigkeit', () => {
  test('jeder in app.js verwendete Schlüssel existiert', () => {
    const missing = usedKeys().filter(k => !TRANSLATIONS[k])
    expect(missing).toEqual([])
  })

  test('jeder verwendete Schlüssel ist in allen vier Sprachen gefüllt', () => {
    const incomplete = []
    for (const k of usedKeys()) {
      const e = TRANSLATIONS[k]
      if (!e) continue
      const fehlt = LANGS.filter(l => typeof e[l] !== 'string' || e[l].trim() === '')
      if (fehlt.length) incomplete.push(`${k}: ${fehlt.join(',')}`)
    }
    expect(incomplete).toEqual([])
  })

  test('kein Wörterbucheintrag ist leer oder unvollständig', () => {
    const bad = []
    for (const [k, e] of Object.entries(TRANSLATIONS)) {
      const fehlt = LANGS.filter(l => typeof e[l] !== 'string' || e[l].trim() === '')
      if (fehlt.length) bad.push(`${k}: ${fehlt.join(',')}`)
    }
    expect(bad).toEqual([])
  })
})

describe('i18n – Label-Maps laufen nicht mehr an t() vorbei', () => {
  // Guard gegen Rückfall: Diese Maps sind umgestellt und müssen es bleiben.
  const UMGESTELLT = [
    'GOV_REVIEW_TYPE_LABELS', 'GOV_REVIEW_STATUS_LABELS', 'GOV_PRIORITY_LABELS',
    'GOV_ACTION_STATUS_LABELS', 'GOV_SOURCE_LABELS', 'GOV_COMMITTEE_LABELS',
    'BCM_CRIT_LABELS', 'BCM_STATUS_LABELS', 'BCM_PLAN_TYPE_LABELS',
    'BCM_RESULT_LABELS', 'BCM_EXERCISE_TYPE_LABELS',
    'SUP_TYPE_LABELS', 'SUP_CRIT_LABELS', 'SUP_STATUS_LABELS', 'SUP_AUDIT_LABELS',
    'TRAINING_CAT_LABELS', 'TRAINING_STATUS_LABELS',
    'LEGAL_CONTRACT_STATUS_LABELS', 'LEGAL_NDA_STATUS_LABELS', 'LEGAL_POLICY_STATUS_LABELS',
    'LEGAL_CONTRACT_TYPE_LABELS', 'LEGAL_NDA_TYPE_LABELS', 'LEGAL_POLICY_TYPE_LABELS',
    'INC_CLEANED_LABELS', 'INC_STATUS_LABELS',
    'STATUS_LABELS', 'ASSET_STATUS_LABELS', 'ASSET_CAT_LABELS',
  ]

  /** Rumpf einer Objektliteral-Konstante, über Klammerzählung statt Regex —
   *  die Maps stehen mal ein-, mal mehrzeilig im Code. */
  function mapBody(name) {
    // Deklarationen sind teils per Leerzeichen ausgerichtet ("const X  = {").
    const decl = new RegExp(`const\\s+${name}\\s*=\\s*\\{`)
    const hit = APP_JS.match(decl)
    if (!hit) return null
    const start = hit.index
    let i = APP_JS.indexOf('{', start), depth = 0
    for (let j = i; j < APP_JS.length; j++) {
      if (APP_JS[j] === '{') depth++
      else if (APP_JS[j] === '}' && --depth === 0) return APP_JS.slice(i + 1, j)
    }
    return null
  }

  test.each(UMGESTELLT)('%s enthält keine fest verdrahteten Anzeigetexte', (name) => {
    const body = mapBody(name)
    expect(body).not.toBeNull()
    expect(body).toMatch(/return\s+t\(/)

    // Kein Eintrag darf einen Klartext als Wert tragen. Zulässig bleiben
    // technische Werte (CSS-Klassen, Farben, Icons) — die sind kleingeschrieben
    // oder beginnen mit # bzw. var(.
    const klartext = [...body.matchAll(/([a-z_][a-z_0-9]*)\s*:\s*'([^']+)'/gi)]
      .filter(([, , val]) => /^[A-Z]/.test(val) && !/^(ph-|var\(|#)/.test(val))
      .map(([, key, val]) => `${key}: '${val}'`)
    expect(klartext).toEqual([])
  })

  test('SoA-Status ist nicht mehr deutsch verdrahtet', () => {
    expect(APP_JS).not.toMatch(/not_started:\s*'Nicht begonnen'/)
  })
})
