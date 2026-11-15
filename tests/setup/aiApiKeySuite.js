'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gemeinsame Testgruppe „Optionaler API-Schlüssel der KI-Anbindung“; aufgerufen von aiApiKey.test.js (JSON) und aiApiKeySql.test.js
// (SQLite) — getrennte Dateien, weil die Stores ihren Speicher beim Laden festlegen.
// Geprüft wird auch, dass die KI-Einstellungen der Oberfläche unter ALLEN Speichern gelten (früher las ollamaConfig synchron und bekam
// unter SQLite/MariaDB/PostgreSQL ein Promise: URL, Modelle und der KI-Schalter wurden ignoriert).
const fs = require('fs')
const http = require('http')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./authHelper')

const KEY = 'sk-test-0123456789ABCDEFghij_KEY'
const OTHER = 'sk-zweiter-Schluessel-9876'

function runAiApiKeySuite(backend) {
  describe(`KI-API-Schlüssel [${backend}]`, () => {
    let dataDir, app, admin, editor, owner, stub, base, seen, behaviour
    const reset = () => { seen = []; behaviour = {} }
    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-aikey-' + backend + '-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: backend })
      delete process.env.DEMO_HOSTING; delete process.env.OLLAMA_API_KEY; delete process.env.OLLAMA_URL
      app = require('../../server/index.js'); if (app.bootstrap) await app.bootstrap()
      admin = await loginAs(app, 'admin'); editor = await loginAs(app, 'editor'); owner = await loginAs(app, 'contentowner')
      // Stub-Ollama: protokolliert jede Anfrage (Pfad, Kopfzeilen, Rumpf)
      stub = http.createServer((req, res) => {
        let body = ''; req.on('data', c => { body += c }); req.on('end', () => {
          seen.push({ url: req.url, method: req.method, headers: req.headers, body })
          if (behaviour.redirectTo && req.url === '/api/tags') { res.writeHead(302, { Location: behaviour.redirectTo + '/api/tags' }); return res.end() }
          if (behaviour.status && req.url !== '/api/tags') { res.writeHead(behaviour.status); return res.end('{}') }
          res.setHeader('Content-Type', 'application/json')
          if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [] }))
          if (req.url === '/api/generate') return res.end(JSON.stringify({ response: '# Entwurf\n\nDies ist ein ausreichend langer Beispieltext für den Test.' }))
          if (req.url === '/api/embed') return res.end(JSON.stringify({ embeddings: [[0.1, 0.2, 0.3]] }))
          res.statusCode = 404; res.end('{}')
        })
      })
      await new Promise(r => stub.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${stub.address().port}`
      reset()
    })
    afterAll(async () => { await new Promise(r => stub.close(r)); if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })
    const put = (b, c) => authedPut(app, c || admin, '/admin/ai-settings', b)
    const get = c => authedGet(app, c || admin, '/admin/ai-settings')
    const lastOf = p => [...seen].reverse().find(s => s.url === p)

    describe('Schreiben, Lesen, Ausliefern', () => {
      test('Standard: kein Schlüssel; nur Administratoren', async () => {
        const g = await get()
        expect(g.status).toBe(200); expect(g.body).toMatchObject({ aiApiKeySet: false, aiApiKeyFromEnv: false }); expect(g.body.aiApiKey).toBeUndefined()
        expect((await get(editor)).status).toBe(403)
        expect((await put({ aiApiKey: KEY }, editor)).status).toBe(403)
        expect((await put({ aiApiKey: KEY }, owner)).status).toBe(403)
      })

      test.each([
        ['Zeilenumbruch', 'abc\\ndef'.replace('\\n', '\n'), 'invalid_chars'], ['Wagenrücklauf', 'abc\rdef', 'invalid_chars'], ['Leerzeichen', 'abc def', 'invalid_chars'],
        ['Tabulator', 'abc\tdef', 'invalid_chars'], ['Nicht-ASCII', 'schlüssel', 'invalid_chars'], ['Steuerzeichen', 'abc\u0000def', 'invalid_chars'],
        ['zu lang (513)', 'k'.repeat(513), 'too_long'],
      ])('ungültig: %s → 400', async (_n, value, code) => {
        const r = await put({ aiApiKey: value })
        expect([r.status, r.body.code]).toEqual([400, code])
        expect(typeof r.body.error).toBe('string'); expect(r.body.error).not.toContain(value.slice(0, 20) || 'x')
        expect((await get()).body.aiApiKeySet).toBe(false)               // nichts gespeichert
      })

      test('Grenze: 512 Zeichen sind erlaubt', async () => {
        expect((await put({ aiApiKey: 'k'.repeat(512) })).status).toBe(200)
        expect((await put({ clearAiApiKey: true })).status).toBe(200)
      })

      test('Fehlertexte sind übersetzt (X-Lang)', async () => {
        const r = await require('supertest')(app).put('/admin/ai-settings').set('Cookie', admin).set('X-Lang', 'et').send({ aiApiKey: 'a b' })
        expect(r.status).toBe(400); expect(r.body.error).toMatch(/API-võti/)
      })

      test('Setzen: der Schlüssel kommt nirgends zurück — weder in PUT noch GET, Einstellungen, Export oder Audit-Log', async () => {
        const p = await put({ aiApiKey: KEY })
        expect(p.status).toBe(200); expect(p.body.aiApiKeySet).toBe(true); expect(JSON.stringify(p.body)).not.toContain(KEY)
        const g = await get(); expect(g.body.aiApiKeySet).toBe(true); expect(JSON.stringify(g.body)).not.toContain(KEY)
        const org = await authedGet(app, admin, '/admin/org-settings')
        expect(org.body.aiApiKey).toBeUndefined(); expect(org.body.aiApiKeySet).toBe(true); expect(JSON.stringify(org.body)).not.toContain(KEY)
        const exp = await authedGet(app, admin, '/admin/export')
        expect(JSON.stringify(exp.body)).not.toContain(KEY)
        const log = JSON.stringify((await authedGet(app, admin, '/admin/audit-log')).body)
        expect(log).toContain('API-Schlüssel gesetzt'); expect(log).not.toContain(KEY)
      })

      test('leeres Feld lässt den gespeicherten Schlüssel unverändert (andere Felder speichern ohne ihn zu verlieren)', async () => {
        expect((await put({ aiEmbedModel: 'x-embed', aiApiKey: '' })).status).toBe(200)
        expect((await get()).body).toMatchObject({ aiApiKeySet: true, aiEmbedModel: 'x-embed' })
        expect((await put({ aiEmbedModel: '' })).status).toBe(200)
        expect((await get()).body.aiApiKeySet).toBe(true)
      })

      test('über PUT /admin/org-settings lässt sich der Schlüssel weder setzen noch löschen oder überprüfen (einziger Weg: /admin/ai-settings)', async () => {
        await authedPut(app, admin, '/admin/org-settings', { aiApiKey: 'x\r\nX-Evil: 1', aiApiKeySet: false, clearAiApiKey: true, orgName: 'Wegwerf GmbH' })
        expect((await get()).body.aiApiKeySet).toBe(true)                 // unverändert
        await put({ aiOllamaUrl: base })
        await authedGet(app, admin, '/api/ai/status'); expect(lastOf('/api/tags').headers.authorization).toBe('Bearer ' + KEY)   // der eingeschleuste Wert kam nie an
      })

      test('Ersetzen und Entfernen', async () => {
        expect((await put({ aiApiKey: OTHER })).status).toBe(200)
        await authedGet(app, admin, '/api/ai/status'); expect(lastOf('/api/tags').headers.authorization).toBe('Bearer ' + OTHER)
        const c = await put({ clearAiApiKey: true })
        expect(c.status).toBe(200); expect(c.body.aiApiKeySet).toBe(false)
        expect((await get()).body.aiApiKeySet).toBe(false)
        await authedGet(app, admin, '/api/ai/status'); expect(lastOf('/api/tags').headers.authorization).toBeUndefined()
        expect(JSON.stringify((await authedGet(app, admin, '/admin/audit-log')).body)).toContain('API-Schlüssel entfernt')
      })
    })

    describe('Anfragen an Ollama: Kopfzeilen an allen vier Stellen', () => {
      beforeAll(async () => { await put({ aiOllamaUrl: base, aiEmbedModel: 'meine-embed', aiGenModel: 'mein-gen', aiEnabled: true, clearAiApiKey: true }); reset() })

      test('ohne Schlüssel: User-Agent mit Produktname und Version, keine Authorization', async () => {
        reset()
        await authedGet(app, admin, '/api/ai/status')
        const g = await authedPost(app, owner, '/api/ai/generate-policy', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'en' })
        expect(g.status).toBe(200)
        await require('../../server/ai/embedder').embed('Probe')
        for (const url of ['/api/tags', '/api/generate', '/api/embed']) {
          const s = lastOf(url); expect([url, !!s]).toEqual([url, true])
          expect(s.headers['user-agent']).toBe('ISMS-Builder/' + require('../../package.json').version)
          expect([url, s.headers.authorization]).toEqual([url, undefined])
        }
      })

      test('mit Schlüssel: Authorization: Bearer an Status (tags), Suche (tags), Entwurf (generate) und Einbettung (embed)', async () => {
        await put({ aiApiKey: KEY }); reset()
        await authedGet(app, admin, '/api/ai/status')
        await authedGet(app, admin, '/api/ai/search?q=Test')                // fragt ebenfalls /api/tags
        await authedPost(app, owner, '/api/ai/generate-policy', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'en' })
        await require('../../server/ai/embedder').embed('Probe')
        const urls = seen.map(s => s.url)
        expect(urls.filter(u => u === '/api/tags').length).toBeGreaterThanOrEqual(2)
        expect(urls).toEqual(expect.arrayContaining(['/api/generate', '/api/embed']))
        for (const s of seen) expect([s.url, s.headers.authorization]).toEqual([s.url, 'Bearer ' + KEY])
      })

      test('die Einstellungen der Oberfläche gelten — auch unter SQL: URL (Stub), Generierungs- und Embedding-Modell', async () => {
        reset()
        await authedPost(app, owner, '/api/ai/generate-policy', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'en' })
        await require('../../server/ai/embedder').embed('Probe')
        expect(JSON.parse(lastOf('/api/generate').body).model).toBe('mein-gen')
        expect(JSON.parse(lastOf('/api/embed').body).model).toBe('meine-embed')
        expect((await authedGet(app, admin, '/api/ai/status')).body.model).toBe('meine-embed')
      })

      test('der KI-Schalter aus der Oberfläche wirkt unter allen Speichern (aus → 503, nichts geht hinaus)', async () => {
        await put({ aiEnabled: false }); reset()
        const r = await authedPost(app, owner, '/api/ai/generate-policy', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'en' })
        expect(r.status).toBe(503); expect(seen).toEqual([])
        expect((await authedGet(app, admin, '/api/ai/status')).body).toMatchObject({ enabled: false, mode: 'disabled' })
        await put({ aiEnabled: true })
      })

      test('Umgebungsvariable OLLAMA_API_KEY als Rückfall; ein in der Oberfläche gesetzter Schlüssel hat Vorrang', async () => {
        await put({ clearAiApiKey: true }); process.env.OLLAMA_API_KEY = 'env-key-123'
        try {
          expect((await get()).body).toMatchObject({ aiApiKeySet: false, aiApiKeyFromEnv: true })
          reset(); await authedGet(app, admin, '/api/ai/status'); expect(lastOf('/api/tags').headers.authorization).toBe('Bearer env-key-123')
          await put({ aiApiKey: KEY }); reset(); await authedGet(app, admin, '/api/ai/status'); expect(lastOf('/api/tags').headers.authorization).toBe('Bearer ' + KEY)
        } finally { delete process.env.OLLAMA_API_KEY }
        await put({ clearAiApiKey: true })
      })

      test('Weiterleitungen werden mit Schlüssel nicht verfolgt: der Schlüssel erreicht nie eine andere Adresse', async () => {
        const target = http.createServer((req, res) => { seen.push({ url: 'ZIEL' + req.url, headers: req.headers }); res.end('{}') })
        await new Promise(r => target.listen(0, '127.0.0.1', r))
        try {
          await put({ aiApiKey: KEY }); reset(); behaviour = { redirectTo: `http://127.0.0.1:${target.address().port}` }
          const st = await authedGet(app, admin, '/api/ai/status')
          expect(st.body.ollama).toBe(false)                                   // nicht erreichbar gemeldet
          expect(seen.some(s => String(s.url).startsWith('ZIEL'))).toBe(false)  // das Ziel hat nie eine Anfrage gesehen
          expect(JSON.stringify(st.body)).not.toContain(KEY)
        } finally { await new Promise(r => target.close(r)); behaviour = {} }
      })

      test('Fehlermeldungen enthalten den Schlüssel nie (Fehler von Ollama, Weiterleitung)', async () => {
        await put({ aiApiKey: KEY }); reset(); behaviour = { status: 500 }
        const e1 = await authedPost(app, owner, '/api/ai/generate-policy', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'en' })
        expect(e1.status).toBe(502); expect(JSON.stringify(e1.body)).not.toContain(KEY)
        behaviour = { redirectTo: 'http://127.0.0.1:9' }
        const e2 = await authedPost(app, owner, '/api/ai/generate-policy', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'en' })
        expect(JSON.stringify(e2.body)).not.toContain(KEY)
        behaviour = {}
      })

      test('KI-Entwurfsfilter kennt Firmennamen auch unter SQL (orgValues wird erwartet) und Platzhalter werden gefüllt', async () => {
        await authedPut(app, admin, '/admin/org-settings', { orgName: 'Beispiel Testfirma GmbH' })
        const r = await authedPost(app, owner, '/api/ai/draft-preview', { entry: require('../../server/ai/safeDraft').CATALOG[0].id, language: 'de', hint: 'für die Beispiel Testfirma GmbH' })
        expect(r.status).toBe(400); expect(r.body.code).toBe('pii')           // Firmenname im Hinweis wird blockiert
        const f = await authedPost(app, editor, '/api/ai/fill-placeholders', { text: 'Willkommen bei {{COMPANY_NAME}}' })
        expect(f.body.text).toContain('Beispiel Testfirma GmbH')
      })
    })
  })
}
module.exports = { runAiApiKeySuite }
