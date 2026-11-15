'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// SoA → „Eigene Gruppe“ im echten Chrome: Inline-Panel, Vorschau, Übernehmen, neuer Tab, Verwaltung; Texte mit HTML/Apostroph führen nie Code aus.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Eigene SoA-Gruppen im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-soafwbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    delete process.env.DEMO_HOSTING
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'soaFrameworksBrowser.js'), CHROME, base, email, password], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Editor und Leser sehen den Knopf „Eigene Gruppe“ nicht', async () => {
    for (const [mail, pw] of [['editor@test.local', 'editorpass'], ['reader@test.local', 'readerpass']]) {
      const out = await run(mail, pw)
      if (!out) return
      expect(out.hasGroupBtn).toBe(false)
    }
  })

  test('Administrator: Panel → Datei → Vorschau → Übernehmen → Tab; Verwaltung; keine Skriptausführung', async () => {
    const out = await run('admin@test.local', 'adminpass')
    if (!out) return
    expect(out.hasGroupBtn).toBe(true)
    expect(out.panelInline).toBe(true)                                                      // Inline-Panel, kein Dialog
    expect(out.prefill).toEqual({ id: 'NEN7510', label: '<img src=x onerror="window.__pwn1=1">NEN', color: '#0ea5e9' })   // aus der Datei vorbelegt
    expect(out.preview.rows).toBe(2)                                                        // zwei gültige Zeilen
    expect(out.preview.rejected).toMatch(/Zeile 3/)                                         // Zeile 3 (Kennung a/b) abgelehnt, mit Grund
    expect(out.preview.imgs).toBe(0)
    expect(out.preview.applyDisabled).toBe(false)
    expect(out.preview.tabs).not.toContain('NEN7510')                                       // Vorschau schreibt nichts
    expect(out.applied.tabs[out.applied.tabs.length - 1]).toBe('NEN7510')                   // neuer Tab sofort da
    expect(out.applied.tabText).toContain('<img')                                           // als Text angezeigt …
    expect([out.applied.tabImgs, out.applied.tableImgs, out.applied.pwned]).toEqual([0, 0, 0])   // … nie als Element, nie ausgeführt
    expect(out.applied.rows.sort()).toEqual(['NEN-1', 'NEN-2'])
    expect(out.applied.panelOpen).toBe(false)
    expect(out.applied.newBtn).toBe(true)                                                   // „Neues Control“ auch in eigenen Gruppen
    expect(out.modal.options).toEqual(['CUSTOM', 'NEN7510']); expect(out.modal.selected).toBe('NEN7510')
    expect(out.single).toMatchObject({ active: 'NEN7510' }); expect(out.single.rows).toContain('NEN-EINZEL')
    expect(out.deleted.rows.sort()).toEqual(['NEN-2', 'NEN-EINZEL'])                       // Löschen funktioniert …
    expect(out.deleted.pwn2).toBe(true)                                                     // … Titel mit Apostroph führt keinen Code aus
    expect(out.admin).toMatchObject({ cards: 1, imgs: 0, hasToggle: true }); expect(out.admin.title).toContain('<img')
    expect(out.admin.desc).toMatch(/NEN7510/)
    expect(out.renamed).toBe('NEN 7510:2024')
    expect(out.deleteBlocked).toEqual({ stillThere: true, noConfirm: true })                // Löschsperre: kein Dialog, Karte bleibt
    expect(out.customCard).toEqual({ exists: true, checked: true, title: 'Custom Controls' })   // CUSTOM steht in der Liste, standardmäßig an
    expect(out.customOffCard).toMatch(/module-card-inactive/)                                // Karte zeigt „deaktiviert“
    expect(out.tabsOff).not.toContain('CUSTOM'); expect(out.tabsOff).toContain('NEN7510')   // ausgeschaltet: Tab weg, übrige bleiben
    expect(out.customStaysOff).toBe(true)                                                    // Einstellung ist gespeichert
    expect(out.tabsOn).toContain('CUSTOM')                                                   // wieder eingeschaltet: Tab ist zurück
  })
})
