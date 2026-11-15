'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Beim Wechsel des Dokumenttyps (Policy → Procedure, Release …) muss das geöffnete Dokument verschwinden: Titel, Editor UND Leseansicht
// (Fehler: Bei Typen ohne Dokumente und bei freigegebenen/schreibgeschützten Dokumenten blieb das alte Dokument sichtbar).
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')
const request = require('supertest')
const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')

describe('statische Prüfung', () => {
  const body = name => { const i = APP_JS.indexOf(`function ${name}(`); return APP_JS.slice(i, APP_JS.indexOf('\n}\n', i)) }
  test('selectType leert den Editor sofort, bevor die Liste geladen wird (auch für Typen ohne Dokumente)', () => {
    const fn = body('selectType')
    expect(fn.indexOf('clearEditor()')).toBeGreaterThan(-1)
    expect(fn.indexOf('clearEditor()')).toBeLessThan(fn.indexOf('fetch('))
    expect((fn.match(/clearEditor\(\)/g) || []).length).toBe(1)
  })
  test('clearEditor setzt die Leseansicht zurück', () => {
    const fn = body('clearEditor')
    expect(fn).toContain("dom('contentViewer')")
    expect(fn).toContain('applyTemplateViewMode(null)')
    expect(fn).toContain('_tmplPreviewOn = false')
  })
})

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
const browserDescribe = CHROME ? describe : describe.skip

browserDescribe('Dokumenttyp-Wechsel im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs, authedPost } = require('./setup/authHelper')
  let dataDir, server, base
  jest.setTimeout(120000)

  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-typeswitch-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    // ohne diese Datei zeigt die Anmeldung zuerst die Auswahl der Demo-Sprache und wartet auf eine Eingabe
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const app = require('../server/index.js')
    const admin = await loginAs(app, 'admin')
    const doc = await authedPost(app, admin, '/template', { type: 'Policy', language: 'de', title: 'Wechseltest Freigegeben', content: '# Inhalt des Wechseltests' })
    // freigeben: Entwurf → Prüfung → Freigegeben (dann ist der Titel gesperrt und die Leseansicht aktiv)
    for (const status of ['review', 'approved']) expect((await request(app).patch(`/template/Policy/${doc.body.id}/status`).set('Cookie', admin).send({ status })).status).toBe(200)
    await authedPost(app, admin, '/template', { type: 'Policy', language: 'de', title: 'Wechseltest Entwurf', content: '# Entwurf' })
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })

  // asynchron starten: ein blockierender Aufruf würde den Server im selben Prozess anhalten
  const run = (email, password, title) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'typeSwitchBrowser.js'), CHROME, base, email, password, 'Policy', title, JSON.stringify(['Procedure', 'Release', 'SoA'])], { encoding: 'utf8', timeout: 100000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)   // puppeteer-core nicht ladbar → Browserteil überspringen
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Administrator, Entwurf: Titel, Editor und aktuelles Dokument sind nach dem Wechsel leer', async () => {
    const out = await run('admin@test.local', 'adminpass', 'Wechseltest Entwurf')
    if (!out) return
    expect(out.opened).toMatchObject({ title: 'Wechseltest Entwurf', current: 'Wechseltest Entwurf' })
    for (const [type, st] of Object.entries(out.switched)) expect([type, st]).toEqual([type, expect.objectContaining({ title: '', editor: '', current: null, editorShown: true, viewerShown: false })])
  })

  test('Administrator, freigegebenes Dokument (Leseansicht): nach dem Wechsel kein altes Dokument mehr sichtbar', async () => {
    const out = await run('admin@test.local', 'adminpass', 'Wechseltest Freigegeben')
    if (!out) return
    expect(out.opened).toMatchObject({ viewerShown: true, current: 'Wechseltest Freigegeben' })
    for (const [type, st] of Object.entries(out.switched)) expect([type, st]).toEqual([type, expect.objectContaining({ title: '', current: null, editorShown: true, viewerShown: false })])
  })

  test('Leser (immer Leseansicht): nach dem Wechsel ist die Leseansicht leer', async () => {
    const out = await run('reader@test.local', 'readerpass', 'Wechseltest Freigegeben')
    if (!out) return
    expect(out.opened.viewerText).toContain('Inhalt des Wechseltests')
    for (const [type, st] of Object.entries(out.switched)) { expect(st.current).toBeNull(); expect([type, st.viewerText]).toEqual([type, '']) }
  })
})
