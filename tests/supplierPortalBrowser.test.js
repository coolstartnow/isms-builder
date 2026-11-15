'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Lieferanten-Briefkasten im echten Chrome: Einrichtung (Administrator), Versandweg beim Anlegen, Anzeige; Editor sieht keine Einrichtung.
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
const API_KEY = 'k'.repeat(40)
;(CHROME ? describe : describe.skip)('Lieferanten-Briefkasten im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, keyDir, server, fake, base, portalUrl
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir(); keyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-key-br-'))
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-portalbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    process.env.SUPPLIER_PORTAL_KEY_FILE = path.join(keyDir, 'portal.pem')
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    fake = http.createServer((req, res) => {
      let b = ''; req.on('data', c => b += c); req.on('end', () => {
        const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }
        if (req.headers.authorization !== 'Bearer ' + API_KEY) return send(401, {})
        if (req.method === 'PUT' && /^\/api\/q\//.test(req.url)) return send(200, { ok: true })
        if (req.url === '/api/answers') return send(200, { answers: [] })
        send(404, {})
      })
    })
    await new Promise(r => fake.listen(0, '127.0.0.1', r)); portalUrl = `http://127.0.0.1:${fake.address().port}`
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); await new Promise(r => fake.close(r)); removeTestDataDir(dataDir); fs.rmSync(keyDir, { recursive: true, force: true }) })
  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'supplierPortalBrowser.js'), CHROME, base, email, password, portalUrl, API_KEY], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })
  test('Editor: keine Einrichtung, Briefkasten noch nicht aktiv → nur direkter Versandweg', async () => {
    const out = await run('editor@test.local', 'editorpass')
    if (!out) return
    expect(out.hasSetup).toBe(false)
    expect(out.deliveryOptions).toEqual([])
  })
  test('Administrator: Schlüsselpaar, Einrichtung, Verbindungstest; danach Versandweg „Briefkasten“', async () => {
    const out = await run('admin@test.local', 'adminpass')
    if (!out) return
    expect(out.hasSetup).toBe(true)
    expect(out.keyBtnBefore).toMatch(/erzeugen/)
    expect(out.afterSave.enabled).toBe(true)
    expect(out.afterSave.keyFieldValue).toBe('')                   // der Schlüssel wird nie zurück in das Feld geschrieben
    expect(out.afterSave.placeholder).toMatch(/gesetzt/)
    expect(out.test).toMatch(/Verbindung in Ordnung/)
    expect(out.deliveryOptions).toEqual(['portal', 'direct'])
    expect(out.link).toBe(`${portalUrl}/q/${out.link.split('/q/')[1]}`)
    expect(out.list.badge).toMatch(/Briefkasten/)
    expect(out.list.pollBtn).toBe(true)
    expect(out.list.linkAttr).toBe(out.link)
    expect(out.pwned).toBe(0)
  })
})
