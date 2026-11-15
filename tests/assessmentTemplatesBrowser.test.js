'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Fragebogen-Vorlagen im echten Chrome: Liste, Editor, Fragenauswahl je Lieferant; Leser sieht keine Änderungsknöpfe.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Fragebogen-Vorlagen im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-asstplbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'assessmentTemplatesBrowser.js'), CHROME, base, email, password], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })
  test('Editor: Vorlage anlegen, HTML in Name/Frage bleibt Text, Fragenauswahl je Lieferant wirkt', async () => {
    const out = await run('editor@test.local', 'editorpass')
    if (!out) return
    expect(out.list.tab).toBe(true)
    expect(out.list.rows).toHaveLength(2)
    expect(out.nis2.asked).toBe(56)
    expect(out.nis2.summary).toMatch(/56 Fragen gestellt, davon \d+ Pflicht/)
    expect(out.none).toMatch(/^0 Fragen/)
    expect(out.errNoName).toMatch(/Namen/)
    expect(out.after).toHaveLength(3)
    const mine = out.after[2]
    expect(mine.name).toContain('<b onmouseover')            // als Text sichtbar
    expect(mine.html).not.toMatch(/<b onmouseover/)           // nicht als Element
    expect(out.create.options).toHaveLength(3)
    expect(out.created.n).toBe(52)                            // 56 − 4 (Abschnitt „Verantwortung der Leitung“)
    expect(out.created.firstRequired).toBe(false)
    expect(out.created.secondRequired).toBe(true)
    expect(out.created.templateId).toBe('builtin:nis2')
    expect(out.created.linkShown).toBe(true)
    expect(out.pwned).toBe(0)
  })
  test('Leser sieht die Vorlagen, aber keine Änderungsknöpfe', async () => {
    const out = await run('reader@test.local', 'readerpass')
    if (!out) return
    expect(out.list.rows).toHaveLength(3)                    // 2 eingebaute + die Vorlage aus dem vorigen Test
    expect(out.list.hasNew).toBe(false)
    expect(out.pwned).toBe(0)
  })
})
