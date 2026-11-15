'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Sprachauswahl nach Organisationssprachen, Ansprechpartner, PDF und Erfassen der Antworten im echten Chrome.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Selbstauskunft: Sprache, PDF und Erfassen im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base, request, cookie
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-formbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const app = require('../server/index.js')
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
    request = require('supertest')(app)
    cookie = (await request.post('/login').send({ email: 'admin@test.local', password: 'adminpass' })).headers['set-cookie']
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const setOrg = body => request.put('/admin/org-settings').set('Cookie', cookie).send(body)
  const run = () => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'supplierFormBrowser.js'), CHROME, base, 'admin@test.local', 'adminpass'], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })
  test('zwei Organisationssprachen: Auswahl nur mit diesen, Vorbelegung Oberflächensprache, Titel folgt der Sprache, Ansprechpartner = CISO; PDF und Erfassen funktionieren', async () => {
    await setOrg({ languageConfig: { available: ['de', 'en'] }, cisoName: 'Erika Muster', cisoEmail: 'ciso@example.org' })
    const out = await run()
    if (!out) return
    expect(out.lang.options).toEqual(['de', 'en']); expect(out.lang.selected).toBe('de'); expect(out.lang.hidden).toBe(false)
    expect(out.lang.title).toBe('Lieferanten-Selbstauskunft'); expect(out.titleEn).toBe('Supplier Self-Assessment')
    expect(out.contact).toEqual({ name: 'Erika Muster', email: 'ciso@example.org' })
    expect(out.list).toMatchObject({ pdfBtn: true, manualBtn: true, imgs: 0 })
    expect(out.pdf).toMatchObject({ status: 200, type: 'application/pdf', magic: '%PDF-' })
    expect(out.pdf.cd).toMatch(/^attachment; filename="Selbstauskunft-/)
    expect(out.manual.questions).toBe(2); expect(out.manual.stars).toBeGreaterThan(0)
    expect(out.dialogAfterEmpty).toBe(1); expect(out.stillPending).toBe('pending')      // Rückfrage kam, abgelehnt → nichts gespeichert
    expect(out.after).toMatchObject({ status: 'submitted', via: 'form', note: 'https://example.org/iso.pdf' })
    expect(out.listAfter).toMatch(/Formular/)
    expect(out.pwned).toBe(0)
  })
  test('nur eine Organisationssprache: Auswahl ist ausgeblendet, Sprache ist festgelegt', async () => {
    await setOrg({ languageConfig: { available: ['fr'] } })
    const out = await run()
    if (!out) return
    expect(out.lang.options).toEqual(['fr']); expect(out.lang.hidden).toBe(true); expect(out.lang.title).toBe('Auto-évaluation fournisseur')
  })
})
