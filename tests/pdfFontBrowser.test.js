'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// PDF-Schrift im echten Chrome: Auswahl in Administration → Organisation, Druckfenster laden die gewählte Schrift.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('PDF-Schrift im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-pdffontbrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = () => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'pdfFontBrowser.js'), CHROME, base, 'admin@test.local', 'adminpass'], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })
  test('Einstellung, Vorschau-Link und Druckfenster mit der gewählten Schrift', async () => {
    const out = await run()
    if (!out) return
    expect(out.box.radios.map(r => r.v)).toEqual(['liberation', 'noto', 'dejavu', 'helvetica', 'custom'])
    expect(out.box.radios.find(r => r.v === 'liberation').checked).toBe(true)
    expect(out.box.radios.find(r => r.v === 'custom')).toMatchObject({ disabled: true })      // ohne hochgeladene Schrift nicht wählbar
    expect(out.box.preview).toMatch(/^\/admin\/pdf-font\/preview\.pdf\?choice=liberation$/)
    expect(out.box.customFiles).toEqual([true, true, true, true])
    // Standard (Liberation): Druckfenster lädt die Schrift, Datei ist abrufbar
    expect(out.printDefault).toMatchObject({ hasFace: true, status: 200, type: 'font/ttf', hasMono: true, monoStatus: 200, monoType: 'font/otf' }); expect(out.printDefault.usesFont).toMatch(/ISMS-PDF/)
    expect(out.printDefault.refFont).toMatch(/ISMS-PDF-Mono/)        // Referenz mit Inline-Stil „monospace“ erscheint in der Mono-Schrift
    expect(out.afterNoto.active).toMatchObject({ id: 'noto', unicode: true }); expect(out.afterNoto.checked).toBe('noto')
    expect(out.afterNoto.previewHref).toMatch(/choice=noto$/)
    expect(out.printNoto).toMatchObject({ hasFace: true, status: 200 })
    expect(out.printHelvetica).toMatchObject({ hasFace: false, printOverridden: false, hasMono: false }); expect(out.printHelvetica.usesFont).not.toMatch(/ISMS-PDF/); expect(out.printHelvetica.refFont).not.toMatch(/ISMS-PDF/)
    expect(out.needLicense).toMatch(/Lizenz/)
  })
})
