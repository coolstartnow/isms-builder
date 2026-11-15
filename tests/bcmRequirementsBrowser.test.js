'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// BCM → Reiter „Anforderungen“ im echten Chrome (Testdaten erfunden, kein Normtext).
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const request = require('supertest')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('BCM-Anforderungen im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base, csvFile, app
  jest.setTimeout(150000)

  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-bcmreqbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    app = require('../server/index.js')
    csvFile = path.join(os.tmpdir(), `bcm-req-test-${process.pid}.csv`)
    fs.writeFileSync(csvFile, ['framework,id,parent,chapter,title_en,summary_en',
      'ISO22301,9,,9,Beispielkapitel,', 'ISO22301,9.1,9,9,Beispiel eins,Erfundene Beschreibung',
      'ISO22301,9.2,9,9,"<img src=x onerror=window.__xss=1>",<script>window.__xss=1</script>'].join('\n'))
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); fs.rmSync(csvFile, { force: true }); removeTestDataDir(dataDir) })

  const run = (email, password, csv) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'bcmRequirementsBrowser.js'), CHROME, base, email, password, csv], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Leser: Leerzustand ohne Import-Knopf', async () => {
    const out = await run('reader@test.local', 'readerpass', '-')
    if (!out) return
    expect(out.empty.importBtn).toBe(false)
    expect(out.empty.text).toMatch(/\S/)
  })

  test('Administrator: Import mit Vorschau, Baum, Bearbeiten, Filter; Skripte laufen nicht', async () => {
    const out = await run('admin@test.local', 'adminpass', csvFile)
    if (!out) return
    expect(out.empty.importBtn).toBe(true)
    expect(out.preview.applyDisabled).toBe(false)
    expect(out.preview.text).toMatch(/3/)
    expect(out.tree.rows).toBeGreaterThanOrEqual(3)
    expect(out.tree.xss).toBe(0); expect(out.tree.scripts).toBe(0)
    expect(out.dialog.save).toBe(true)
    expect(out.afterSave.dialogOpen).toBe(false)
    expect(out.afterSave.implemented).toBeGreaterThanOrEqual(1)
    expect(out.filtered).toBe(1)
    const reader = (await request(app).post('/login').send({ username: 'reader', password: 'readerpass' })).headers['set-cookie'][0].split(';')[0]
    const list = (await request(app).get('/bcm/requirements').set('Cookie', reader)).body
    expect(list.assessments[0]).toMatchObject({ status: 'implemented', responsible: 'Frau Browser' })
  })

  test('Leser mit Daten: Ansicht ohne Speichern und ohne Import', async () => {
    const out = await run('reader@test.local', 'readerpass', '-')
    if (!out) return
    expect(out.tree.importBtn).toBe(false)
    expect(out.dialog).toMatchObject({ save: false, statusDisabled: true })
  })
})
