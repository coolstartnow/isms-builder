'use strict'
// Server-Meldungen in der Sprache der Oberfläche (server/i18n.js, Header X-Lang).
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')
const { MESSAGES, translateError, langOf, SUPPORTED } = require('../server/i18n')
const request = require('supertest')

describe('server/i18n – Übersetzungstabelle', () => {
  test('jeder Eintrag hat alle fünf Sprachen mit gleichen Platzhaltern', () => {
    for (const e of MESSAGES) {
      expect(e).toHaveLength(5)
      const params = t => (t.match(/\{\w+\}/g) || []).sort().join()
      e.forEach(t => { expect(typeof t).toBe('string'); expect(t.trim()).not.toBe('') })
      expect(new Set(e.map(params)).size).toBe(1)
    }
  })

  test('einfache Texte werden aus jeder Quellsprache in jede Zielsprache übersetzt', () => {
    expect(translateError('Not found', 'de')).toBe('Nicht gefunden')
    expect(translateError('Nicht gefunden', 'en')).toBe('Not found')
    expect(translateError('Keine Datei hochgeladen', 'fr')).toBe('Aucun fichier téléversé')
    expect(translateError('Not found', 'hu')).toBe('Nem található')
    expect(translateError('Not found', 'xx')).toBe('Not found')          // unbekannte Sprache → Quelltext (Englisch)
  })

  test('Texte mit Platzhaltern behalten ihre Werte', () => {
    expect(translateError("Role 'reader' insufficient. Requires 'editor'", 'de'))
      .toBe("Rolle 'reader' reicht nicht aus. Erforderlich: 'editor'")
    expect(translateError('Transition draft → approved not allowed', 'nl')).toBe('Overgang draft → approved niet toegestaan')
    expect(translateError('Parse error: Unexpected token } in JSON', 'de')).toBe('Lesefehler: Unexpected token } in JSON')
    expect(translateError("Demo bundle for 'hu' not found", 'fr')).toBe("Bundle de démonstration pour 'hu' introuvable")
  })

  test('unbekannte Texte (Systemfehler) bleiben unverändert', () => {
    expect(translateError('ENOENT: no such file', 'de')).toBe('ENOENT: no such file')
    expect(translateError('', 'de')).toBe('')
    expect(translateError(undefined, 'de')).toBeUndefined()
  })

  test('langOf: Header vor Standardsprache, ungültiger Header wird ignoriert', () => {
    expect(langOf({ headers: { 'x-lang': 'HU' } })).toBe('hu')
    expect(langOf({ headers: { 'x-lang': 'de-DE' } })).toBe('de')
    expect(SUPPORTED).toEqual(['de', 'en', 'fr', 'nl', 'hu'])
    expect(['de', 'en', 'fr', 'nl', 'hu']).toContain(langOf({ headers: { 'x-lang': 'zz' } }))
  })
})

describe('server/i18n – Antworten der API', () => {
  let dataDir, app, cookie
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir
    process.env.JWT_SECRET = 'jest-test-secret-srvi18n'
    process.env.NODE_ENV = 'test'
    process.env.STORAGE_BACKEND = 'json'
    app = require('../server/index.js')
    cookie = await loginAs(app, 'admin')
  })
  afterAll(() => removeTestDataDir(dataDir))

  const get = (url, lang) => {
    const r = request(app).get(url).set('Cookie', cookie)
    return lang ? r.set('X-Lang', lang) : r
  }

  test('404 kommt in der Sprache aus X-Lang', async () => {
    expect((await get('/audits/gibt-es-nicht', 'de')).body.error).toBe('Nicht gefunden')
    expect((await get('/audits/gibt-es-nicht', 'fr')).body.error).toBe('Introuvable')
    expect((await get('/audits/gibt-es-nicht', 'hu')).body.error).toBe('Nem található')
    expect((await get('/audits/gibt-es-nicht', 'en')).body.error).toBe('Not found')
  })

  test('ohne Header gilt die Standardsprache der Organisation (Englisch)', async () => {
    expect((await get('/audits/gibt-es-nicht')).body.error).toBe('Not found')
  })

  test('Fehlertext mit Platzhaltern: Rollenprüfung', async () => {
    const reader = await loginAs(app, 'reader')
    const res = await request(app).post('/audits').set('Cookie', reader).set('X-Lang', 'de').send({ title: 'x' })
    expect(res.status).toBe(403)
  })

  test('Erfolgsantworten und Arrays bleiben unberührt', async () => {
    const res = await get('/audits', 'de')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('Frontend sendet X-Lang bei jedem Request (t.js)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'ui', 'i18n', 't.js'), 'utf8')
    expect(src).toMatch(/X-Lang/)
    expect(src).toMatch(/window\.fetch = wrapped/)
  })
})

describe('server/i18n – Abdeckung', () => {
  const fs = require('fs'), path = require('path')
  const INTERN = new Set(['circular'])      // interner Code, die Route liefert den eigentlichen Text
  function walk(d, out = []) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f)
      fs.statSync(p).isDirectory() ? walk(p, out) : p.endsWith('.js') && out.push(p)
    }
    return out
  }

  test('jeder feste Fehlertext in server/ steht in der Übersetzungstabelle', () => {
    const fehlt = []
    for (const file of walk(path.join(__dirname, '..', 'server'))) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/error:\s*(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
        const text = m[2].replace(/\\'/g, "'")
        if (INTERN.has(text)) continue
        let probe = text.replace(/\$\{[^}]*\}/g, 'X')
        if (/[\s:]$/.test(probe)) probe += 'X'                // Präfix, an das zur Laufzeit etwas angehängt wird
        const bekannt = MESSAGES.some(e => e.includes(text)) ||
          ['de', 'en', 'fr'].some(l => translateError(probe, l) !== probe)
        if (!bekannt) fehlt.push(`${path.relative(path.join(__dirname, '..'), file)}: ${text}`)
      }
    }
    expect(fehlt).toEqual([])
  })
})
