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

// ── Guard: keine neuen fest eingebauten Texte, keine verdeckten t()-Aufrufe ──
describe('i18n – Rückfall-Schutz für ui/app.js', () => {
  /**
   * Sichtbare Literale, die bewusst nicht übersetzt werden: Normen und Produktnamen, Dateiformate,
   * technische Beispielwerte in Platzhaltern, Sprachnamen in der eigenen Sprache.
   */
  const ERLAUBT = new Set([
    'ISO 27001:2022', 'BSI IT-Grundschutz', 'EU NIS2', 'EU Cloud (EUCS)', 'EU AI Act', 'ISO 9000:2015',
    'ISO 9001:2015', 'EU Cyber Resilience Act', 'JSON', 'CSV', 'PDF', 'HTML', 'Markdown', 'CVSS', 'CVEs', 'Ref',
    'NDAs', 'NIS2', 'EoL', 'FIRST.org', 'Global', 'GroupIT', 'ISMS', 'ALP', 'ISO-5.1',
    'IEC 62443', 'VDI/VDE 2182', 'NAMUR NA 163', 'STARTTLS (Port 587)', 'TLS (Port 465)',
    'npm start', 'docker compose restart', '(ISO 27001 A.5.12)', '(ISO 27001 / BSI IT-Grundschutz)',
    '&times;', 'Example Ltd', 'max.mustermann', 'vvt_seed_001', 'email;name;date', 'Alice Müller',
    'ISMS Builder <isms@example.com>', 'http://localhost:11434 (default)', 'nomic-embed-text (default)', 'llama3.2:3b (default)',
    '🇩🇪 Deutsch', '🇬🇧 English', '🇫🇷 Français', '🇳🇱 Nederlands', '🇭🇺 Magyar',
    '## Privacy Policy&#10;&#10;We process your data pursuant to Art. 6 GDPR…',
  ])
  const BEISPIELE = /@|https?:\/\/|&#10;|^\w+\.\w+/          // E-Mail-Adressen, URLs, Dateinamen als Beispielwerte
  const CODEARTIG = /[=&|]{2}|=>|\.replace|window\.|new Date|\.date\b|checked|Math\.|\bi\.|String\(|^' \+ |\+ '$/

  function kandidaten() {
    const out = []
    APP_JS.split('\n').forEach((line, i) => {
      const s = line.trim()
      if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) return
      for (const m of line.matchAll(/>([^<>{}`$\n]{3,})</g)) out.push([i + 1, 'Text', m[1].trim()])
      for (const m of line.matchAll(/\b(placeholder|title|aria-label|alt)="([^"$]{3,})"/g)) out.push([i + 1, m[1], m[2].trim()])
      for (const m of line.matchAll(/\b(alert|confirm|showToast|toast)\(\s*(['"])([^'"$]{3,}?)\2/g)) out.push([i + 1, m[1], m[3].trim()])
      for (const m of line.matchAll(/\b(textContent|innerText)\s*=\s*(['"])([^'"$]{3,}?)\2/g)) out.push([i + 1, m[1], m[3].trim()])
    })
    return out.filter(([, , text]) =>
      /[A-Za-zÄÖÜäöüß]{3}/.test(text) && !ERLAUBT.has(text) && !CODEARTIG.test(text) && !BEISPIELE.test(text))
  }

  test('keine sichtbaren Texte mehr fest in ui/app.js (alles läuft über t())', () => {
    const treffer = kandidaten().map(([zeile, art, text]) => `Zeile ${zeile} [${art}]: ${text.slice(0, 80)}`)
    expect(treffer).toEqual([])
  })

  test('t() wird nirgends von einer lokalen Variable gleichen Namens verdeckt', () => {
    // Aufrufe wie t('key') in einer Funktion mit Parameter/Variable "t" würden zur Laufzeit
    // mit "t is not a function" abbrechen; dort muss window.t(...) stehen.
    const parser   = require('@babel/parser')
    const traverse = require('@babel/traverse').default
    const ast = parser.parse(APP_JS, { sourceType: 'script' })
    const verdeckt = []
    traverse(ast, {
      CallExpression(p) {
        const c = p.node.callee
        if (c.type === 'Identifier' && c.name === 't' && p.scope.getBinding('t')) verdeckt.push(`Zeile ${p.node.loc.start.line}`)
      },
    })
    expect(verdeckt).toEqual([])
  })
})

describe('i18n – statische Seiten (login.html, index.html)', () => {
  const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8')
  const SEITEN = { 'login.html': read('ui', 'login.html'), 'index.html': read('ui', 'index.html') }

  test.each(Object.keys(SEITEN))('%s: alle data-i18n-Schlüssel existieren in allen Sprachen', (name) => {
    const keys = new Set()
    for (const m of SEITEN[name].matchAll(/data-i18n(?:-html|-placeholder|-title)?="([A-Za-z0-9_]+)"/g)) keys.add(m[1])
    const fehlt = [...keys].filter(k => !TRANSLATIONS[k] || LANGS.some(l => !TRANSLATIONS[k][l]))
    expect(fehlt).toEqual([])
  })

  test('login.html: Text im Vorfallformular steht nicht mehr fest im HTML', () => {
    const form = SEITEN['login.html'].slice(SEITEN['login.html'].indexOf('id="incOverlay"'), SEITEN['login.html'].indexOf('<script src="/ui/i18n/t.js">'))
    // jedes Label/Option/Button/Absatz mit Buchstaben braucht data-i18n
    const ohne = []
    for (const m of form.matchAll(/<(label|option|button|h3|h4|p)\b([^>]*)>([^<]*(?:<(?:i|span)\b[^>]*>[^<]*<\/(?:i|span)>[^<]*)*)<\/\1>/g)) {
      const [, tag, attrs, inner] = m
      const text = inner.replace(/<[^>]+>/g, '').replace(/&\w+;/g, '').trim()
      if (!/[A-Za-zÄÖÜäöü]{3}/.test(text) || attrs.includes('data-i18n') || /data-i18n/.test(inner) || attrs.includes('id="iErr"')) continue
      if (/class="inc-err"/.test(attrs)) continue
      ohne.push(`<${tag}> ${text.slice(0, 60)}`)
    }
    expect(ohne).toEqual([])
  })
})
