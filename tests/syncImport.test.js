'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const fs = require('fs')
const os = require('os')
const path = require('path')

let dataDir, server, url, tmp, key, roKey
beforeAll(async () => {
  dataDir = createTestDataDir()
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-import-'))
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-sync-import', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  const app = require('../server/index.js')
  const accounts = require('../server/db/syncAccountStore')
  const mk = (name, permissions) => accounts.addDevice(accounts.create({ name, permissions }, 'test').id, 'Skript').token
  key   = mk('Import', { risks: 'write' })
  roKey = mk('Import lesend', { risks: 'read' })
  await new Promise(r => { server = app.listen(0, '127.0.0.1', r) })
  url = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => { server.close(); removeTestDataDir(dataDir); fs.rmSync(tmp, { recursive: true, force: true }) })

// asynchron starten: der Server läuft im selben Prozess, ein synchroner Kindprozess würde ihn blockieren
const run = (file, k = key) => new Promise(resolve => {
  const cp = require('child_process').spawn(process.execPath, [path.join(__dirname, '../scripts/sync-import.js'), url, file], { env: { ...process.env, ISMS_SYNC_KEY: k } })
  let out = ''; cp.stdout.on('data', d => { out += d }); cp.stderr.on('data', d => { out += d })
  cp.on('close', code => resolve({ code, out }))
})
const write = (name, obj) => { const f = path.join(tmp, name); fs.writeFileSync(f, JSON.stringify(obj)); return f }

describe('scripts/sync-import.js', () => {
  test('spielt eine Änderungsdatei der App mit einem Sync-Konto ein', async () => {
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
  test('fehlende Schreibrechte werden als abgelehnt gemeldet', async () => {
    const r = await run(write('ro.json', { protocolVersion: 1, changes: { risks: [{ id: 'risk_file_2', title: 'x' }] } }), roKey)
    expect(r.code).toBe(3); expect(r.out).toMatch(/abgelehnt risks/)
  })
  test('falscher Schlüssel und falsches Dateiformat brechen sauber ab', async () => {
    const f = write('x.json', { protocolVersion: 1, changes: {} })
    const bad = await run(f, 'ISMS-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA')
    expect(bad.code).toBe(1); expect(bad.out).toMatch(/ungültig/)
    const fmt = await run(write('bundle.json', { format: 'isms-mobile-bundle', modules: {} }))
    expect(fmt.code).toBe(2); expect(fmt.out).toMatch(/keine Änderungsdatei/)
  })
})
