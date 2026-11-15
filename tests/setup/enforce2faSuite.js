'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gemeinsame Testgruppe „Pflicht-2FA und Sprachliste der Anmeldeseite“; aufgerufen von enforce2fa.test.js (JSON) und enforce2faSql.test.js
// (SQLite) — getrennte Dateien, weil die Stores ihren Speicher beim Laden festlegen.
// Hintergrund: routes/auth.js las die Einstellungen früher ohne await; unter SQLite/MariaDB/PostgreSQL ist get() ein Promise, die
// Pflicht-2FA (require2FA) wurde dort nie durchgesetzt und die Sprachliste der Anmeldeseite ignoriert.
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPut } = require('./authHelper')

const TOTP_SECRET = 'JBSWY3DPEHPK3PXP'

function runEnforce2faSuite(backend) {
  describe(`Pflicht-2FA und Sprachliste [${backend}]`, () => {
    let dataDir, app, adminCookie
    const login = (user, password, totp) => request(app).post('/login').send({ username: user, password, ...(totp ? { totp } : {}) })
    beforeAll(async () => {
      dataDir = createTestDataDir()
      // Das Konto „reader“ hat eine eingerichtete 2FA (bestätigt); alle anderen keine
      const f = path.join(dataDir, 'rbac_users.json'), users = JSON.parse(fs.readFileSync(f, 'utf8'))
      users.reader.totpSecret = TOTP_SECRET; users.reader.totpVerified = true
      fs.writeFileSync(f, JSON.stringify(users))
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-enforce2fa-' + backend + '-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: backend })
      delete process.env.DEMO_HOSTING; delete process.env.ISMS_TEST_TOTP_FIXED
      app = require('../../server/index.js'); if (app.bootstrap) await app.bootstrap()
      adminCookie = await loginAs(app, 'admin')   // vor dem Einschalten: die Sitzung bleibt gültig (der Administrator hat selbst keine 2FA)
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })
    const setEnforce = on => authedPut(app, adminCookie, '/admin/security', { require2FA: on })

    test('Standard: 2FA nicht erzwungen — Konto ohne 2FA meldet sich an', async () => {
      const r = await login('editor', 'editorpass')
      expect(r.status).toBe(200); expect((r.headers['set-cookie'] || []).join('')).toMatch(/sm_session=/)
    })

    test('Schutz vor Selbst-Aussperrung: Ein Administrator ohne eigene 2FA kann die Pflicht NICHT einschalten (409 ENFORCE_2FA_SELF)', async () => {
      const r = await setEnforce(true)
      expect([r.status, r.body.code]).toEqual([409, 'ENFORCE_2FA_SELF']); expect(r.body.usersWithout2FA).toBeGreaterThan(0)
      const g = (await authedGet(app, adminCookie, '/admin/security')).body
      expect(g.require2FA).toBe(false); expect(g.usersWithout2FA).toBeGreaterThan(0); expect(g.adminsWith2FA).toBe(0)
      expect((await login('editor', 'editorpass')).status).toBe(200)   // nichts wurde eingeschaltet
    })

    test('Einschalten wird gespeichert und gelesen (der Administrator hat jetzt selbst 2FA); Ausschalten geht immer', async () => {
      const rbac = require('../../server/rbacStore'); rbac.setUserTotpSecret('admin', TOTP_SECRET); rbac.confirmTotpVerified('admin')
      const on = await setEnforce(true)
      expect(on.status).toBe(200); expect(on.body.usersWithout2FA).toBeGreaterThan(0)
      expect((await authedGet(app, adminCookie, '/admin/security')).body).toMatchObject({ require2FA: true, adminsWith2FA: 1 })
    })

    test.each([['editor', 'editorpass'], ['contentowner', 'copass'], ['auditor', 'auditorpass']])('Pflicht 2FA an: %s ohne 2FA wird abgewiesen (403 ENFORCE_2FA), ohne Sitzungs-Cookie', async (user, pw) => {
      const r = await login(user, pw)
      expect([r.status, r.body.code]).toEqual([403, 'ENFORCE_2FA'])
      expect((r.headers['set-cookie'] || []).join('')).not.toMatch(/sm_session=/)
    })

    test('Pflicht 2FA an: der Administrator mit 2FA kommt mit gültigem Code hinein, ohne Code nicht', async () => {
      const a = await login('admin', 'adminpass'); expect([a.status, a.body.twoFactorRequired]).toEqual([401, true])
      const b = await login('admin', 'adminpass', require('../../server/totp').generateTotp(TOTP_SECRET)); expect(b.status).toBe(200)
    })

    test('Pflicht 2FA an: ein Konto mit eingerichteter 2FA meldet sich mit gültigem Code weiterhin an', async () => {
      const code = require('../../server/totp').generateTotp(TOTP_SECRET)
      const r = await login('reader', 'readerpass', code)
      expect(r.status).toBe(200); expect((r.headers['set-cookie'] || []).join('')).toMatch(/sm_session=/)
    })

    test('Pflicht 2FA an: Konto mit 2FA ohne Code → 401 (Code verlangt); mit falschem Code → 401', async () => {
      const a = await login('reader', 'readerpass')
      expect([a.status, a.body.twoFactorRequired]).toEqual([401, true])
      const b = await login('reader', 'readerpass', '000000')
      expect([b.status, b.body.twoFactorRequired]).toEqual([401, true])
    })

    test('Ausschalten: Konto ohne 2FA meldet sich wieder an', async () => {
      expect((await setEnforce(false)).status).toBe(200)
      const r = await login('contentowner', 'copass')
      expect(r.status).toBe(200)
    })

    test('Sprachliste der Anmeldeseite folgt den Einstellungen (nicht nur den Standardwerten)', async () => {
      const before = (await request(app).get('/auth/language-config')).body
      expect(Array.isArray(before.available)).toBe(true)
      expect((await authedPut(app, adminCookie, '/admin/org-settings', { languageConfig: { available: ['de', 'en'], default: 'de' } })).status).toBe(200)
      const after = (await request(app).get('/auth/language-config')).body
      expect(after).toEqual({ available: ['de', 'en'], default: 'de' })
    })
  })
}
module.exports = { runEnforce2faSuite }
