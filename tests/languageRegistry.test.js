'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Sprachregister (ui/i18n/languages.js): einzige Quelle der unterstützten Sprachen.
// Das Register selbst, die Einbindung in Seiten und Server, ein Wächter gegen neu eingetragene feste Sprachlisten
// und die Vollständigkeit der Daten je Sprache mit Status „complete“ (Texte, Dokumentation, Demo-Bündel).
const fs = require('fs')
const path = require('path')
const reg = require('../ui/i18n/languages.js')

const ROOT = path.join(__dirname, '..')
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8')
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (['node_modules', 'vendor', '.git'].includes(e.name)) continue
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) walk(rel, out); else if (/\.(js|html)$/.test(e.name)) out.push(rel)
  }
  return out
}

describe('Sprachregister: Aufbau', () => {
  test('die fünf ausgelieferten Sprachen bleiben enthalten, Englisch ist Standard', () => {
    expect(reg.codes()).toEqual(expect.arrayContaining(['de', 'en', 'fr', 'nl', 'hu']))
    expect(reg.DEFAULT).toBe('en')
    expect(reg.get('en').msgIndex).toBe(0)
  })
  test('jeder Eintrag ist vollständig und eindeutig', () => {
    const codes = reg.list.map(l => l.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(reg.list.map(l => l.msgIndex)).size).toBe(codes.length)
    expect(reg.list.map(l => l.msgIndex).sort((a, b) => a - b)).toEqual(codes.map((_, i) => i))
    for (const l of reg.list) {
      expect(l.code).toMatch(/^[a-z]{2}$/)
      expect(l.name.length).toBeGreaterThan(1)
      expect(l.flag.length).toBeGreaterThan(0)
      expect(l.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
      expect(l.docSuffix).toBe(l.code === 'de' ? '' : '.' + l.code)
      expect(l.aiName).toMatch(/^[A-Z][a-z]+$/)
      expect(l.browserPrefix).toBe(l.code)
      expect(['complete', 'partial']).toContain(l.status)
      expect(typeof l.listed).toBe('boolean')
      if (l.listed) expect(l.status).toBe('complete') // unvollständige Sprachen erscheinen nie in der Auswahl
      if (l.listed) expect(typeof l.demoLabel).toBe('string')
    }
  })
  test('Hilfsfunktionen: Rückfall auf Englisch, Browsersprache, Teilmengen', () => {
    expect(reg.norm('xx')).toBe('en'); expect(reg.norm('hu')).toBe('hu')
    expect(reg.locale('xx')).toBe('en-GB'); expect(reg.docSuffix('de')).toBe(''); expect(reg.docSuffix('fr')).toBe('.fr')
    expect(reg.fromBrowser('de-AT')).toBe('de'); expect(reg.fromBrowser('zz-ZZ')).toBe('en'); expect(reg.fromBrowser(undefined)).toBe('en')
    expect(reg.withData({ en: 1, hu: 2 })).toEqual(['en', 'hu'])
    expect(reg.has('constructor')).toBe(false)
    expect(reg.listedCodes().every(c => reg.completeCodes().includes(c))).toBe(true)
  })
})

describe('Sprachregister: Einbindung', () => {
  test.each(['index.html', 'login.html', 'change-password.html'])('ui/%s lädt das Register vor t.js', file => {
    const src = read('ui', file)
    const a = src.indexOf('/ui/i18n/languages.js'), b = src.indexOf('/ui/i18n/t.js')
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a)
  })
  test('der Server nutzt dieselbe Datei wie die Oberfläche', () => {
    expect(require('../server/languages')).toBe(reg)
  })
  test('Server-Meldungstabelle und Locale-Tabelle folgen dem Register', () => {
    const i18n = require('../server/i18n')
    expect(i18n.SUPPORTED).toEqual(reg.codes())
    for (const l of reg.list) expect(i18n.fmtDate('2026-10-31T10:00:00Z', l.code)).toBeTruthy()
  })
  test('Sprache ohne Übersetzung in der Meldungstabelle fällt auf Englisch zurück', () => {
    const i18n = require('../server/i18n')
    expect(i18n.translateError('Internal server error', 'xx')).toBe('Internal server error')
    expect(i18n.translateError('Internal server error', 'de')).toBe('Interner Serverfehler')
  })
})

describe('Wächter: keine festen Sprachlisten im Quelltext', () => {
  // Muster, die bei einer neuen Sprache an vielen Stellen von Hand erweitert werden müssten
  const PATTERNS = [
    [/\[\s*'de'\s*,\s*'en'\s*,\s*'fr'\s*,\s*'nl'\s*,\s*'hu'\s*\]/, 'Liste [de, en, fr, nl, hu]'],
    [/\[\s*'en'\s*,\s*'de'\s*,\s*'fr'\s*,\s*'nl'\s*,\s*'hu'\s*\]/, 'Liste [en, de, fr, nl, hu]'],
    [/de:\s*'',\s*en:\s*'\.en',\s*fr:\s*'\.fr'/, 'Dokumentations-Endungen je Sprache'],
    [/de:\s*'de-DE',\s*en:\s*'en-GB'/, 'Locale je Sprache'],
    [/de:\s*'🇩🇪'/, 'Flaggen je Sprache'],
    [/startsWith\('hu'\)/, 'Browsersprache hu'],
    [/loadDemoBundle\('hu'\)/, 'Demo-Knopf hu'],
  ]
  // Inhalte (Texte je Sprache) dürfen Sprachcodes als Schlüssel führen; hier geht es nur um Auflistungen der Sprachen selbst
  const files = [...walk('server'), ...walk('ui')].filter(f => !/translations\.js$|languages\.js$/.test(f))
  test.each(PATTERNS)('%s', (re, label) => {
    const hits = files.filter(f => re.test(read(f)))
    expect([label, hits]).toEqual([label, []])
  })
})

describe('Vollständigkeit der Sprachen mit Status „complete“', () => {
  const dict = (() => { const w = {}; new Function('window', read('ui', 'i18n', 'translations.js'))(w); return w.TRANSLATIONS })()
  test.each(reg.completeCodes())('Oberflächentexte in %s: jeder Schlüssel hat einen Text', code => {
    const missing = Object.entries(dict).filter(([, v]) => !(typeof v[code] === 'string' && v[code].length)).map(([k]) => k)
    expect(missing).toEqual([])
  })
  test.each(reg.codes().filter(c => c !== 'en'))('Platzhalter und HTML-Tags in %s stimmen mit dem Englischen überein (auch bei unvollständigen Sprachen)', code => {
    const ph = s => (String(s).match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(',')
    const tags = s => (String(s).match(/<\/?[a-zA-Z][^>]*>/g) || []).length
    const bad = []
    for (const [k, v] of Object.entries(dict)) {
      if (typeof v[code] !== 'string') continue
      if (ph(v[code]) !== ph(v.en)) bad.push(k + ' (Platzhalter)')
      if (tags(v[code]) !== tags(v.en)) bad.push(k + ' (HTML)')
    }
    expect(bad).toEqual([])
  })
  test('Dokumentation: jede Sprache hat dieselben Dateien wie Ungarisch', () => {
    const bases = fs.readdirSync(path.join(ROOT, 'docs')).filter(f => /\.hu\.md$/.test(f)).map(f => f.replace(/\.hu\.md$/, ''))
    expect(bases.length).toBeGreaterThanOrEqual(18)
    for (const code of reg.completeCodes()) {
      const missing = bases.filter(b => !fs.existsSync(path.join(ROOT, 'docs', `${b}${reg.docSuffix(code)}.md`)))
      expect([code, missing]).toEqual([code, []])
    }
  })
  test('Demo-Bündel: eine Datei je Sprache, gültiges JSON', () => {
    for (const code of reg.completeCodes()) {
      const f = path.join(ROOT, 'data', 'demo-bundles', `${code}.json`)
      expect([code, fs.existsSync(f)]).toEqual([code, true])
      expect(() => JSON.parse(fs.readFileSync(f, 'utf8'))).not.toThrow()
    }
  })
})
