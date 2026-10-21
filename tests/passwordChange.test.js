'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Vom Administrator vergebene Passwörter (Anfangs- und Rücksetz-Passwort) muss der Nutzer beim ersten Login ändern: Der Administrator
// soll kein Passwort eines Nutzers dauerhaft kennen. Die Sperre gilt serverseitig für jede Schnittstelle.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./setup/authHelper')

let dataDir, app, request, adminCookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-password-change-secret-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  app = require('../server/index.js'); request = require('supertest')
  adminCookie = await loginAs(app, 'admin')
})
afterAll(() => removeTestDataDir(dataDir))

const cookieOf = res => res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
const login = (username, password) => request(app).post('/login').send({ username, password })
const createUser = (username, password = 'start-pw-1') => authedPost(app, adminCookie, '/admin/users', { username, email: `${username}@example.test`, role: 'editor', password })

describe('Anfangspasswort', () => {
  test('neu angelegter Nutzer ist als „muss Passwort ändern“ markiert; Login meldet es', async () => {
    const c = await createUser('neu1')
    expect(c.status).toBe(201); expect(c.body.mustChangePassword).toBe(true)
    const l = await login('neu1', 'start-pw-1')
    expect(l.status).toBe(200); expect(l.body.mustChangePassword).toBe(true)
  })

  test('bis zum Wechsel sind alle Schnittstellen gesperrt (403 mit Code), außer Passwort ändern, Abmelden und whoami', async () => {
    await createUser('neu2')
    const cookie = cookieOf(await login('neu2', 'start-pw-1'))
    for (const url of ['/risks', '/templates', '/soa', '/measures', '/admin/org-settings', '/findings', '/guidance']) {
      const r = await authedGet(app, cookie, url)
      expect({ url, status: r.status, code: r.body.code }).toEqual({ url, status: 403, code: 'PASSWORD_CHANGE_REQUIRED' })
    }
    expect((await authedPost(app, cookie, '/risks', { title: 'x', probability: 1, impact: 1 })).status).toBe(403)   // auch schreibend
    const who = await authedGet(app, cookie, '/whoami')
    expect(who.status).toBe(200); expect(who.body.mustChangePassword).toBe(true)
    expect((await request(app).post('/logout').set('Cookie', cookie)).status).toBeLessThan(400)
  })

  test('Passwort ändern: falsches bisheriges → 401, gleiches neues → 400, neues → 200 und alles ist freigeschaltet', async () => {
    await createUser('neu3')
    const cookie = cookieOf(await login('neu3', 'start-pw-1'))
    expect((await authedPut(app, cookie, '/me/password', { currentPassword: 'falsch', newPassword: 'ganz-neu-123' })).status).toBe(401)
    const same = await authedPut(app, cookie, '/me/password', { currentPassword: 'start-pw-1', newPassword: 'start-pw-1' })
    expect(same.status).toBe(400); expect(same.body.code).toBe('PASSWORD_UNCHANGED')
    expect((await authedGet(app, cookie, '/risks')).status).toBe(403)                      // noch gesperrt
    expect((await authedPut(app, cookie, '/me/password', { currentPassword: 'start-pw-1', newPassword: 'ganz-neu-123' })).status).toBe(200)
    expect((await authedGet(app, cookie, '/risks')).status).toBe(200)                      // sofort freigeschaltet, gleiche Sitzung
    expect((await authedGet(app, cookie, '/whoami')).body.mustChangePassword).toBe(false)
    expect((await login('neu3', 'start-pw-1')).status).toBe(401)                           // altes Passwort gilt nicht mehr
    const again = await login('neu3', 'ganz-neu-123')
    expect(again.status).toBe(200); expect(again.body.mustChangePassword).toBe(false)
  })

  test('zu kurzes neues Passwort wird abgelehnt und die Sperre bleibt', async () => {
    await createUser('neu4')
    const cookie = cookieOf(await login('neu4', 'start-pw-1'))
    expect((await authedPut(app, cookie, '/me/password', { currentPassword: 'start-pw-1', newPassword: 'abc' })).status).toBe(400)
    expect((await authedGet(app, cookie, '/risks')).status).toBe(403)
  })
})

describe('Zurücksetzen durch den Administrator', () => {
  test('Rücksetz-Passwort sperrt auch eine bereits laufende Sitzung des Nutzers sofort', async () => {
    await createUser('reset1')
    const cookie = cookieOf(await login('reset1', 'start-pw-1'))
    await authedPut(app, cookie, '/me/password', { currentPassword: 'start-pw-1', newPassword: 'eigenes-pw-123' })
    expect((await authedGet(app, cookie, '/risks')).status).toBe(200)
    const r = await authedPut(app, adminCookie, '/admin/users/reset1', { password: 'vom-admin-999' })
    expect(r.status).toBe(200); expect(r.body.mustChangePassword).toBe(true)
    expect((await authedGet(app, cookie, '/risks')).status).toBe(403)                      // dieselbe Sitzung, jetzt gesperrt
    expect((await authedPut(app, cookie, '/me/password', { currentPassword: 'vom-admin-999', newPassword: 'wieder-eigenes-1' })).status).toBe(200)
    expect((await authedGet(app, cookie, '/risks')).status).toBe(200)
  })

  test('Änderungen ohne Passwort (z. B. Rolle) setzen die Pflicht nicht', async () => {
    await createUser('reset2')
    const cookie = cookieOf(await login('reset2', 'start-pw-1'))
    await authedPut(app, cookie, '/me/password', { currentPassword: 'start-pw-1', newPassword: 'eigenes-pw-123' })
    await authedPut(app, adminCookie, '/admin/users/reset2', { role: 'reader' })
    expect((await authedGet(app, cookie, '/risks')).status).toBe(200)
  })

  test('der Administrator, der sein eigenes Passwort ändert, wird nicht gesperrt', async () => {
    const r = await authedPut(app, adminCookie, '/admin/users/admin', { password: 'neues-admin-pw-1' })
    expect(r.status).toBe(200); expect(r.body.mustChangePassword).toBe(false)
    expect((await authedGet(app, adminCookie, '/risks')).status).toBe(200)
    const back = await authedPut(app, adminCookie, '/me/password', { currentPassword: 'neues-admin-pw-1', newPassword: 'adminpass' })
    expect(back.status).toBe(200)
  })
})

describe('bestehende Konten', () => {
  test('vorhandene Nutzer (Seed) und Konten ohne Kennzeichen sind unverändert nutzbar', async () => {
    for (const role of ['editor', 'reader', 'auditor']) {
      const cookie = await loginAs(app, role)
      expect((await authedGet(app, cookie, '/risks')).status).toBe(200)
      expect((await authedGet(app, cookie, '/whoami')).body.mustChangePassword).toBe(false)
    }
  })
  test('Benutzerliste zeigt den Stand, aber weiterhin keine Hashes oder 2FA-Geheimnisse', async () => {
    await createUser('neu5')
    const list = (await authedGet(app, adminCookie, '/admin/users')).body
    expect(list.find(u => u.username === 'neu5').mustChangePassword).toBe(true)
    expect(JSON.stringify(list)).not.toMatch(/passwordHash|totpSecret|\$2[aby]\$/)
  })
})
