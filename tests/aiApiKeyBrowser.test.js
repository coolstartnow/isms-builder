'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Administration → KI-Einstellungen → API-Schlüssel im echten Chrome: Passwortfeld, Speichern, Schlüssel nie im DOM, Warnung bei http://, Entfernen.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('KI-API-Schlüssel im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-aikeybrowser-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    delete process.env.DEMO_HOSTING; delete process.env.OLLAMA_API_KEY
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'aiApiKeyBrowser.js'), CHROME, base, email, password], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Administrator: Passwortfeld, ungültig abgelehnt, gültig gespeichert, nie im DOM, Warnung, Entfernen', async () => {
    const out = await run('admin@test.local', 'adminpass')
    if (!out) return
    expect(out.field).toEqual({ type: 'password', autocomplete: 'new-password', maxlength: 512 })
    expect(out.initial).toMatchObject({ clearVisible: false, warnVisible: false, value: '' })
    expect(out.initial.state).toMatch(/Kein Schlüssel|No key/)
    expect(out.puts[0]).toBe(400)                                                              // ungültiger Schlüssel: der Server lehnt ab …
    expect(out.afterInvalid.state).toMatch(/Kein Schlüssel|No key/)                           // … und der Zustand bleibt „nicht gesetzt“
    expect(out.puts[1]).toBe(200)
    expect(out.afterSave).toMatchObject({ clearVisible: true, value: '' })                     // gespeichert, Feld geleert, Entfernen-Knopf da
    expect(out.afterSave.state).toMatch(/Schlüssel gesetzt|Key set/)
    expect(out.keyInDom).toBe(false)                                                           // der Schlüssel steht nirgends im DOM oder Browser-Speicher
    expect(out.apiBody).not.toContain('sk-browser'); expect(JSON.parse(out.apiBody).aiApiKeySet).toBe(true)
    expect([out.warnHttp, out.warnLocal, out.warnHttps]).toEqual([true, false, false])         // Warnung nur bei http:// zu fremdem Host
    expect(out.afterClear).toMatchObject({ clearVisible: false })
    expect(out.afterClear.state).toMatch(/Kein Schlüssel|No key/)
    expect(out.puts[out.puts.length - 1]).toBe(200)
  })
})
