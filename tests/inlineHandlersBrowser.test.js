'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Inline-Handler im echten Chrome: gefährliche Titel/Namen (Hochkomma, Rückwärtsschrägstrich, Anführungszeichen) führen nie Code aus,
// die Knöpfe löschen/stellen wieder her mit dem richtigen Datensatz, und jeder gerenderte Handler ist gültiges JavaScript.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Inline-Handler im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(180000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-inlinehandlers-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    delete process.env.DEMO_HOSTING
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'inlineHandlersBrowser.js'), CHROME, base, email, password], { encoding: 'utf8', timeout: 170000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Administrator: Nutzlasten in Vorlagen-Titeln, Organisationseinheit und DSGVO-Liste führen nie Code aus; die Knöpfe wirken auf den richtigen Datensatz', async () => {
    const o = await run('admin@test.local', 'adminpass')
    if (!o) return
    expect([o.create_h1, o.create_h2, o.create_h3, o.createOrgUnit]).toEqual([201, 201, 201, 201])
    // Administration → Vorlagen
    expect(o.adminTemplates.rendered).toBeGreaterThanOrEqual(3)
    expect(o.adminTemplates.compile.bad).toEqual([]); expect(o.adminTemplates.compile.n).toBeGreaterThan(3)
    expect(o.adminDeleteClicked).toBe(true)
    expect(o.afterAdminDelete).toEqual({ pwn: 0, trashed: true })                               // H1 im Papierkorb, nichts ausgeführt
    // Vorlagenverwaltung (Entwurf in den Papierkorb) und Administration → Papierkorb (wiederherstellen, endgültig löschen)
    expect(o.mgmt.compile.bad).toEqual([]); expect(o.mgmt.role).toBe('admin')
    expect(o.softDeleteClicked).toBe(true); expect(o.afterSoftDelete).toEqual({ pwn: 0, h2Trashed: true })
    expect(o.trash.restoreButtons).toBeGreaterThanOrEqual(2); expect(o.trash.compile.bad).toEqual([])
    expect(o.restoreClicked).toBe(true); expect(o.afterRestore).toEqual({ pwn: 0, active: true })      // H1 wiederhergestellt
    expect(o.permDeleteClicked).toBe(true)
    expect(o.afterPermDelete).toEqual({ pwn: 0, h1Active: true, h3Active: true, h2NotInTrash: true })  // H2 endgültig weg, H1/H3 unberührt
    expect(o.h2Permanent).toBe(404)
    // Organisationseinheit
    expect(o.org.compile.bad).toEqual([])
    expect(o.orgDeleteClicked).toBe(true); expect(o.afterOrgDelete).toEqual({ pwn: 0, gone: true })
    // DSGVO-Löschliste: der Titel kommt unverändert im Protokoll an
    expect(o.gdpr.buttons).toBe(1); expect(o.gdpr.compile.bad).toEqual([])
    expect(o.gdprClicked).toBe(true); expect(o.afterGdpr).toEqual({ pwn: 0, logged: true })
    // insgesamt
    expect(o.finalPwn).toBe(0); expect(o.pageErrors).toEqual([])
  })
})
