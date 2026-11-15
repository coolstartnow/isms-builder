'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// BCM → „Vorlage verwenden“ im echten Chrome: Dialog, Vorbefüllung der Formulare; Leser sieht keinen Knopf.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('BCM-Vorlagen im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-bcmtplbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'bcmTemplatesBrowser.js'), CHROME, base, email, password], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })
  test('Editor: Vorlage füllt BIA, Plan und Übung vor', async () => {
    const out = await run('editor@test.local', 'editorpass')
    if (!out) return
    expect(out.bia).toMatchObject({ hasBtn: true, options: 8 }); expect(out.bia.form.title).not.toBe('')
    expect(out.plans).toMatchObject({ hasBtn: true, options: 9 }); expect(out.plans.form.title).not.toBe(''); expect(out.plans.form.field).toMatch(/^## |^# /m)
    expect(out.exercises).toMatchObject({ hasBtn: true, options: 6 }); expect(out.exercises.form.field).toMatch(/^## /m)
  })
  test('Administrator (ab Content Owner): KI-Entwurf im Plan- und Übungsformular, Dialog mit gesendetem Text, Sperre bei personenbezogenen Daten', async () => {
    const out = await run('admin@test.local', 'adminpass')
    if (!out) return
    expect(out.plans.ai.hasAi).toBe(true); expect(out.exercises.ai.hasAi).toBe(true)
    expect(out.plans.ai.dialog.options).toBe(9); expect(out.exercises.ai.dialog.options).toBe(6)
    expect(out.plans.ai.dialog.prompt).toMatch(/business continuity/)
    expect(out.plans.ai.blocked).toEqual({ warn: true, copyDisabled: true })
    expect(out.exercises.ai.blocked).toEqual({ warn: true, copyDisabled: true })
  })
  test('Editor sieht den KI-Entwurf-Knopf nicht (Rolle wie bei Dokumenten: ab Content Owner)', async () => {
    const out = await run('editor@test.local', 'editorpass')
    if (!out) return
    expect(out.plans.ai.hasAi).toBe(false); expect(out.exercises.ai.hasAi).toBe(false)
  })
  test('Leser sieht keinen Vorlagen-Knopf', async () => {
    const out = await run('reader@test.local', 'readerpass')
    if (!out) return
    for (const tab of ['bia', 'plans', 'exercises']) expect(out[tab].hasBtn).toBe(false)
  })
})
