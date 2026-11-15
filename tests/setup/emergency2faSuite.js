'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Notfall-Werkzeug scripts/emergency-2fa.js als echter Prozess gegen Wegwerf-Daten (JSON bzw. SQLite). Aufgerufen von emergency2fa.test.js und
// emergency2faSql.test.js (getrennte Dateien: die Stores legen ihr Backend beim Laden fest).
const fs = require('fs')
const net = require('net')

// Eigener Port je Speicher-Backend: Die Suiten laufen parallel; ein gemeinsamer Port führte dazu, dass der absichtlich
// geöffnete Listener (Test „Server läuft noch“) der einen Suite die Änderungen der anderen abbrechen ließ.
const testPort = backend => ({ json: 39871, sqlite: 39872, mariadb: 39873, postgres: 39874 })[backend] || 39879
const path = require('path')
const { spawnSync } = require('child_process')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')

const ROOT = path.join(__dirname, '../..')
const SECRET = 'JBSWY3DPEHPK3PXP'

function runEmergency2faSuite(backend) {
  describe(`Notfall-Werkzeug 2FA [${backend}]`, () => {
    let dataDir, env
    const run = (args, { input = '', extra = {} } = {}) => spawnSync('node', ['scripts/emergency-2fa.js', ...args], { cwd: ROOT, input, encoding: 'utf8', timeout: 60000, env: { ...env, ...extra } })
    const users = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'rbac_users.json'), 'utf8'))
    const setPolicy = on => {
      if (backend === 'json') { const f = path.join(dataDir, 'org-settings.json'); let o = {}; try { o = JSON.parse(fs.readFileSync(f, 'utf8')) } catch {}; fs.writeFileSync(f, JSON.stringify({ ...o, require2FA: on })) }
      else { const r = spawnSync('node', ['-e', `require('./server/db/knexDatabase').init().then(()=>require('./server/db/orgSettingsStore').update({require2FA:${on}})).then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})`], { cwd: ROOT, env, encoding: 'utf8', timeout: 60000 }); expect(r.status).toBe(0) }
    }
    beforeAll(() => {
      dataDir = createTestDataDir()
      const f = path.join(dataDir, 'rbac_users.json'), u = JSON.parse(fs.readFileSync(f, 'utf8'))
      u.reader.totpSecret = SECRET; u.reader.totpVerified = true     // nur „reader“ hat 2FA; kein Administrator
      fs.writeFileSync(f, JSON.stringify(u))
      env = { ...process.env, DATA_DIR: dataDir, STORAGE_BACKEND: backend, NODE_ENV: 'test', JWT_SECRET: 'jest-emergency-2fa-' + backend + '-0123456789abcdef', PORT: String(testPort(backend)) }
      delete env.DEMO_HOSTING
    })
    afterAll(() => removeTestDataDir(dataDir))

    test('status: zeigt die Aussperrung, Namen ohne 2FA, nie ein Geheimnis, ändert nichts', () => {
      setPolicy(true)
      const r = run(['status'])
      expect(r.status).toBe(0)
      expect(r.stdout).toMatch(/2FA-Pflicht: EINGESCHALTET/); expect(r.stdout).toMatch(/AUSSPERRUNG/); expect(r.stdout).toMatch(/admin \(admin\)/)
      expect(r.stdout + r.stderr).not.toContain(SECRET)
    })

    test('ohne Aufruf-Argumente / unbekannter Befehl / reset-user ohne Namen: Hilfe, Exit 2', () => {
      expect(run([]).status).toBe(2); expect(run(['quatsch']).status).toBe(2); expect(run(['reset-user']).status).toBe(2)
    })

    test('disable-policy: falsche Bestätigung → nichts geändert; läuft ein Server → nichts geändert (ohne --force)', async () => {
      let r = run(['disable-policy'], { input: 'nein\n' })
      expect(r.status).toBe(1); expect(r.stdout).toMatch(/Abgebrochen/)
      expect(run(['status']).stdout).toMatch(/EINGESCHALTET/)
      const srv = net.createServer().listen(testPort(backend), '127.0.0.1'); await new Promise(res => srv.once('listening', res))
      try { r = run(['disable-policy', '--yes']); expect(r.status).toBe(1); expect(r.stderr).toMatch(/Server/) } finally { srv.close() }
      expect(run(['status']).stdout).toMatch(/EINGESCHALTET/)
    })

    test('disable-policy mit JA: Pflicht aus, Sicherungskopie (JSON), danach ist die Anmeldung als Administrator wieder möglich', async () => {
      const r = run(['disable-policy'], { input: 'JA\n' })
      expect(r.status).toBe(0); expect(r.stdout).toMatch(/ausgeschaltet/)
      if (backend === 'json') expect(fs.readdirSync(dataDir).some(n => /^org-settings\.json\.notfall-.*\.bak$/.test(n))).toBe(true)
      expect(run(['status']).stdout).toMatch(/2FA-Pflicht: aus/)
      expect(run(['disable-policy', '--yes']).stdout).toMatch(/bereits aus/)
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: env.JWT_SECRET, NODE_ENV: 'test', STORAGE_BACKEND: backend }); delete process.env.DEMO_HOSTING
      const app = require('../../server/index.js'); if (app.bootstrap) await app.bootstrap()
      const l = await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })
      expect(l.status).toBe(200)
      if (backend !== 'json') await require('../../server/db/knexDatabase').destroy()
    })

    test('reset-user: 2FA des Kontos wird geleert (verified aus), Sicherungskopie, Audit-Eintrag; unbekanntes Konto → Exit 1', () => {
      expect(users().reader.totpSecret).toBe(SECRET)
      let r = run(['reset-user', 'gibtsnicht', '--yes']); expect(r.status).toBe(1); expect(r.stderr).toMatch(/existiert nicht/)
      r = run(['reset-user', 'reader', '--yes'])
      expect(r.status).toBe(0); expect(r.stdout + r.stderr).not.toContain(SECRET)
      expect(users().reader.totpSecret).toBe(''); expect(users().reader.totpVerified).toBe(false)
      expect(fs.readdirSync(dataDir).some(n => /^rbac_users\.json\.notfall-.*\.bak$/.test(n))).toBe(true)
      if (backend === 'json') expect(JSON.stringify(JSON.parse(fs.readFileSync(path.join(dataDir, 'audit-log.json'), 'utf8')))).toMatch(/Notfall: 2FA zurückgesetzt für reader/)
    })
  })
}
module.exports = { runEmergency2faSuite }
