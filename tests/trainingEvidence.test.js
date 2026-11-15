'use strict'
const LANG_REG = require('../ui/i18n/languages.js')
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Training → Reiter „Nachweise“: Karte öffnet die Schulung (Leser nur lesend), Links im Nachweistext sind klickbar (nur http/https).
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')
const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
const TRANSLATIONS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'i18n', 'translations.js'), 'utf8')

const fnBody = name => { const i = APP_JS.indexOf(`function ${name}(`); return APP_JS.slice(i, APP_JS.indexOf('\n}\n', i)) }

describe('statische Prüfung', () => {
  test('Karte ist klickbar und per Tastatur bedienbar', () => {
    const fn = fnBody('renderTrainingEvidence')
    expect(fn).toContain('role="button"')
    expect(fn).toContain('tabindex="0"')
    expect(fn).toContain("openTrainingForm(${jsArg(i.id)}, 'evidence')")
    expect(fn).toContain("event.key==='Enter'")
    expect(fn).toContain('linkifyEvidence(i.evidence)')
  })
  test('linkifyEvidence maskiert zuerst und erlaubt nur http(s)', () => {
    const fn = fnBody('linkifyEvidence')
    expect(fn.indexOf('escHtml(')).toBeLessThan(fn.indexOf('.replace('))
    expect(fn).toContain('https?:')
    expect(fn).toContain('noopener noreferrer')
    expect(fn).not.toMatch(/javascript:|data:|mailto:/)
  })
  test('Formular ist für Konten unter „editor“ schreibgeschützt und springt zurück', () => {
    const fn = fnBody('openTrainingForm')
    expect(fn).toContain("userCanTransition('editor')")
    expect(fn).toContain("back === 'evidence'")
    expect(fn).toContain('readOnly')
    expect(fn).toContain('switchTrainingTab(${jsArg(back)})')
    expect(APP_JS).toContain("switchTrainingTab(backTab || 'plan')")
  })
  test('neue Texte gibt es in allen fünf Sprachen', () => {
    for (const key of ['trn_openTrainingHint', 'trn_viewTraining', 'trn_readOnlyNote', 'trn_evidenceHint']) {
      const line = TRANSLATIONS.split('\n').find(l => l.trim().startsWith(key + ':'))
      expect(line).toBeTruthy()
      for (const lang of LANG_REG.completeCodes()) expect([key, lang, new RegExp(`\\b${lang}:\\s*'`).test(line)]).toEqual([key, lang, true])
    }
  })
})

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
const browserDescribe = CHROME ? describe : describe.skip

browserDescribe('Nachweise im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs, authedPost } = require('./setup/authHelper')
  let dataDir, server, base
  const TITLE = 'Nachweistest Schulung'
  jest.setTimeout(120000)

  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-trainingevidence-0123456789abcdef'; process.env.NODE_ENV = 'test'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const app = require('../server/index.js')
    const admin = await loginAs(app, 'admin')
    const r = await authedPost(app, admin, '/training', {
      title: TITLE, category: 'security', status: 'completed', completedDate: '2026-10-01', instructor: 'Frau Test', assignees: 'Team A',
      evidence: 'Liste unter https://example.com/liste.pdf, Zertifikat javascript:window.__xss=1 und <img src=x onerror="window.__xss=1">',
    })
    expect(r.status).toBe(201)
    server = http.createServer(app)
    await new Promise(res => server.listen(0, '127.0.0.1', res))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })

  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'trainingEvidenceBrowser.js'), CHROME, base, email, password, TITLE], { encoding: 'utf8', timeout: 100000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Administrator: Karte öffnet die Schulung nur zum Ansehen (kein Speichern), Link ist sicher, Skripte laufen nicht, Rücksprung zu „Nachweise“', async () => {
    const out = await run('admin@test.local', 'adminpass')
    if (!out) return
    expect(out.card).toMatchObject({ role: 'button', tabindex: '0', injectedImg: 0 })
    expect(out.card.links).toEqual([{ href: 'https://example.com/liste.pdf', rel: 'noopener noreferrer', target: '_blank' }])
    expect(out.card.confirmationBtn).toBe(true)
    expect(out.confirmationStatus).toBe(200)
    expect(out.formOpenedByButton).toBe(false)
    expect(out.card.evidenceText).toContain('javascript:window.__xss=1')
    expect(out.form).toMatchObject({ shown: true, title: TITLE, titleDisabled: true, evidenceDisabled: true, saveButton: 0, readOnlyNote: true })
    expect(out.form.xss).toBe(0)
    expect(out.back.evidenceCards).toBeGreaterThan(0)
  })

  test('Leser: Formular ist schreibgeschützt, ohne „Speichern“', async () => {
    const out = await run('reader@test.local', 'readerpass')
    if (!out) return
    expect(out.form).toMatchObject({ shown: true, title: TITLE, titleDisabled: true, evidenceDisabled: true, saveButton: 0, readOnlyNote: true })
    expect(out.form.xss).toBe(0)
    expect(out.back.evidenceCards).toBeGreaterThan(0)
  })
})
