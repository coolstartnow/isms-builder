'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Demo-Reset: Die Anleitung zum Produktivbetrieb öffnet zuerst, die Umstellung beginnt erst nach bewusster Bestätigung (beta.12).
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const ROOT = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')

describe('Demo-Reset öffnet zuerst die Anleitung (statisch)', () => {
  const app = read('ui/app.js')
  const fn = app.slice(app.indexOf('async function triggerDemoReset()'), app.indexOf('async function triggerDemoImport'))
  const guide = app.slice(app.indexOf('function showDemoResetGuide()'), app.indexOf('async function triggerDemoReset()'))

  test('triggerDemoReset ruft die Anleitung vor Nachfrage und Reset-Aufruf; Abbruch ohne Bestätigung', () => {
    expect(fn.indexOf('showDemoResetGuide()')).toBeGreaterThan(-1)
    expect(fn.indexOf('showDemoResetGuide()')).toBeLessThan(fn.indexOf('askDemoResetConfirmation()'))
    expect(fn.indexOf('askDemoResetConfirmation()')).toBeLessThan(fn.indexOf("fetch('/admin/demo-reset'"))
    expect(fn).not.toMatch(/\bprompt\(/)            // kein window.prompt: Chrome unterdrückt es nach dem Schließen des Anleitungsfensters
    expect(fn).toMatch(/if \(!guide\.ok\) \{[^}]*return \}/)
    expect(fn).toMatch(/'X-Guide-Read': '1'/)
  })

  test('das Fenster entsteht synchron (vor dem ersten await), Nachricht nur von gleichem Ursprung und eigenem Fenster', () => {
    expect(guide.indexOf('window.open(')).toBeGreaterThan(-1)
    expect(guide.indexOf('window.open(')).toBeLessThan(guide.indexOf('await '))
    expect(guide).toMatch(/e\.origin === origin && e\.source === win/)
    expect(guide).toMatch(/win\.closed/)                       // anders geschlossen = nicht bestätigt
    expect(guide).toMatch(/!win\) return Promise\.resolve\(\{ ok: false, blocked: true \}\)/)
    expect(app).toMatch(/DEMO_RESET_GUIDE_SECONDS = 15/)
  })

  test('die Anleitung wird nur über den gesicherten Markdown-Helfer und maskierte Texte geschrieben', () => {
    expect(guide).toMatch(/renderGuidanceMarkdown\(/)
    expect(guide).toMatch(/escHtml\(labels\./)
    expect(guide).not.toMatch(/innerHTML/)
  })

  test('Übersetzungen in fünf Sprachen vorhanden, auch in Beschreibung und Bestätigungstext', () => {
    const tr = read('ui/i18n/translations.js')
    for (const key of ['guide_demoReset_title', 'guide_demoReset_intro', 'guide_demoReset_confirm', 'guide_demoReset_wait', 'guide_demoReset_scroll', 'guide_demoReset_backup', 'guide_demoReset_blocked', 'guide_demoReset_cancelled', 'guide_demoReset_failed']) {
      const line = tr.slice(tr.indexOf(key + ':'), tr.indexOf('\n', tr.indexOf(key + ':')))
      for (const l of ['de:', 'en:', 'fr:', 'nl:', 'hu:']) expect([key, l, line.includes(l)]).toEqual([key, l, true])
    }
    const desc = tr.split('\n').find(l => l.trim().startsWith('maint_demoResetDesc:'))
    expect(desc).toMatch(/Anleitung zum Produktivbetrieb/); expect(desc).toMatch(/guide for production use/)
  })

  test('Server vermerkt im Audit-Eintrag „Demo-Reset“, ob die Anleitung bestätigt wurde', () => {
    const src = read('server/routes/admin.js')
    expect(src).toMatch(/req\.get\('X-Guide-Read'\) === '1' \? 'Anleitung zum Produktivbetrieb angezeigt und bestätigt' : 'Anleitung nicht bestätigt \(direkter API-Aufruf\)'/)
  })

  test('der Kommandozeilenweg verlangt GELESEN, bevor etwas geändert wird', () => {
    const src = read('scripts/prepare-production.js')
    expect(src.indexOf('"GELESEN"')).toBeGreaterThan(-1)
    expect(src.indexOf('GELESEN')).toBeLessThan(src.indexOf("await ask('Fortfahren? [j/N]: ')"))
    expect(src).toMatch(/readIt\.trim\(\) !== 'GELESEN'/)
  })

  test('die Anleitung beschreibt das Verhalten in allen fünf Sprachen; Demo-Betrieb bleibt unberührt', () => {
    for (const suf of ['', '.en', '.fr', '.nl', '.hu']) expect(read(`docs/module-login-security${suf}.md`)).toMatch(/prepare-production\.js/)
    expect(read('docs/module-login-security.md')).toMatch(/In der Demo selbst erscheint die Anleitung nicht/)
    expect(read('docs/ISMS-build-documentation.md')).toMatch(/Anleitung vor der Umstellung \(beta\.12\)/)
    // nichts im Anmelde- und Dashboard-Code ruft die Anleitung auf
    const app = read('ui/app.js')
    expect((app.match(/showDemoResetGuide\(\)/g) || []).length).toBe(2)   // Definition + ein Aufruf in triggerDemoReset
  })
})

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Demo-Reset im echten Chrome', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs } = require('./setup/authHelper')
  let dataDir, server, base, cookie
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-secret-demoresetguide-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    const app = require('../server/index.js')
    cookie = await loginAs(app, 'admin')
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })

  test('Klick öffnet die Anleitung, ohne Bestätigung geschieht nichts, nach Lesen und Bestätigen genau ein Reset mit Header, blockiertes Pop-up verhindert den Reset', async () => {
    const out = await new Promise(resolve => {
      execFile(process.execPath, [path.join(__dirname, 'setup', 'demoResetGuideBrowser.js'), CHROME, base, cookie], { encoding: 'utf8', timeout: 140000 }, (err, stdout, stderr) => {
        if (err && err.code === 3) return resolve(null)
        expect([err ? err.code : 0, stderr.slice(0, 400)]).toEqual([0, ''])
        resolve(JSON.parse(stdout.trim().split('\n').pop()))
      })
    })
    if (!out) return
    expect(out.A).toMatchObject({ header: true, backup: true, disabled: true, resets: 0 })
    expect(out.A.text).toBeGreaterThan(500)
    expect(out.A.imgs).toBe(4)
    expect(out.A.imgsLoaded).toEqual([true, true, true, true])
    expect(out.B).toEqual({ resets: 0, prompts: 0 })
    expect(out.C.earlyDisabled).toBe(true)
    expect(out.C.lateDisabled).toBe(false)
    expect(out.C).toMatchObject({ modalBackup: true, goDisabledEmpty: true, goDisabledWrong: true, goDisabledRight: false, resetsBefore: 0 })
    expect(out.C.prompts).toEqual([])               // kein Browser-Dialog
    expect(out.C.resets).toEqual(['1'])
    expect(out.D.newResets).toBe(0)
  })
})
