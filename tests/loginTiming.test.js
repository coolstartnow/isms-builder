'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Benutzer-Aufzählung per Timing (GHSA-8w4w-fqgh-c4fq): Für unbekannte und bekannte Benutzer wird gleich viel Arbeit geleistet.
// Der Test misst keine Zeit (wäre selbst unzuverlässig), sondern prüft, dass in beiden Fällen ein bcrypt-Vergleich stattfindet
// und die Antworten gleich aussehen.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let dataDir, app, request, bcrypt

beforeAll(() => {
  dataDir = createTestDataDir()
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-login-timing-secret-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  app = require('../server/index.js')
  request = require('supertest')
  bcrypt = require('bcryptjs')
})
afterAll(() => removeTestDataDir(dataDir))

const comparesDuring = async fn => {
  const spy = jest.spyOn(bcrypt, 'compare')
  try { await fn(); return spy.mock.calls.length } finally { spy.mockRestore() }
}
const loginReset = () => require('../server/loginThrottle')._resetAll()

describe('POST /login: gleicher Aufwand für bekannte und unbekannte Benutzer', () => {
  test('bekannter Benutzer, falsches Passwort: ein bcrypt-Vergleich', async () => {
    loginReset()
    const n = await comparesDuring(() => request(app).post('/login').send({ username: 'admin', password: 'falsch' }))
    expect(n).toBe(1)
  })
  test('unbekannter Benutzername: ebenfalls ein bcrypt-Vergleich', async () => {
    loginReset()
    const n = await comparesDuring(() => request(app).post('/login').send({ username: 'gibt-es-nicht', password: 'falsch' }))
    expect(n).toBe(1)
  })
  test('unbekannte E-Mail-Adresse: ebenfalls ein bcrypt-Vergleich', async () => {
    loginReset()
    const n = await comparesDuring(() => request(app).post('/login').send({ email: 'niemand@example.invalid', password: 'falsch' }))
    expect(n).toBe(1)
  })
  test('Antworten sind nicht zu unterscheiden', async () => {
    loginReset()
    const a = await request(app).post('/login').send({ username: 'admin', password: 'falsch' })
    loginReset()
    const b = await request(app).post('/login').send({ username: 'gibt-es-nicht', password: 'falsch' })
    expect({ status: a.status, body: a.body }).toEqual({ status: b.status, body: b.body })
  })
  test('Sonderfälle ohne Absturz: __proto__, leeres Passwort, kein Passwort', async () => {
    loginReset()
    for (const body of [{ username: '__proto__', password: 'x' }, { username: 'constructor', password: '' }, { username: 'nobody' }]) {
      const r = await request(app).post('/login').send(body)
      expect(r.status).toBe(401)
    }
  })
  test('richtiges Passwort funktioniert weiter', async () => {
    loginReset()
    expect((await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })).status).toBe(200)
  })
})
