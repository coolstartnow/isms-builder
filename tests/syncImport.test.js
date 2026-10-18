'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

let dataDir, server, url, tmp
beforeAll(async () => {
  dataDir = createTestDataDir()
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-import-'))
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-sync-import', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  const app = require('../server/index.js')
  await new Promise(r => { server = app.listen(0, '127.0.0.1', r) })
  url = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => { server.close(); removeTestDataDir(dataDir); fs.rmSync(tmp, { recursive: true, force: true }) })

// asynchron starten: der Server läuft im selben Prozess, ein synchroner Kindprozess würde ihn blockieren
const run = (file, password = 'adminpass') => new Promise(resolve => {
  const cp = require('child_process').spawn(process.execPath, [path.join(__dirname, '../scripts/sync-import.js'), url, 'admin', file], { env: { ...process.env, ISMS_SYNC_PASSWORD: password } })
  let out = ''; cp.stdout.on('data', d => { out += d }); cp.stderr.on('data', d => { out += d })
  cp.on('close', code => resolve({ code, out }))
})
const write = (name, obj) => { const f = path.join(tmp, name); fs.writeFileSync(f, JSON.stringify(obj)); return f }

describe('scripts/sync-import.js', () => {
  test('spielt eine Änderungsdatei der App ein', async () => {
    const f = write('ok.json', { protocolVersion: 1, changes: { risks: [{ id: 'risk_file_1', title: 'Aus Datei', probability: 2, impact: 2 }] } })
    const r = await run(f)
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/risks: 1 übernommen/)
    expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'risks.json'), 'utf8')).some(x => x.id === 'risk_file_1')).toBe(true)
  })
  test('Konflikt wird gemeldet und nicht überschrieben (Exitcode 3)', async () => {
    const f = write('conflict.json', { protocolVersion: 1, changes: { risks: [{ id: 'risk_file_1', title: 'Überschreiben?' }] } })
    const r = await run(f)
    expect(r.code).toBe(3)
    expect(r.out).toMatch(/KONFLIKT risks\/risk_file_1/)
    expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'risks.json'), 'utf8')).find(x => x.id === 'risk_file_1').title).toBe('Aus Datei')
  })
  test('falsches Passwort und falsches Dateiformat brechen sauber ab', async () => {
    expect((await run(write('x.json', { protocolVersion: 1, changes: {} }), 'falsch')).code).toBe(1)
    const bad = await run(write('bundle.json', { format: 'isms-mobile-bundle', modules: {} }))
    expect(bad.code).toBe(2); expect(bad.out).toMatch(/keine Änderungsdatei/)
  })
})
