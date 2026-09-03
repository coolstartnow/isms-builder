'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Regressionstest fuer den Brute-Force-Schutz auf POST /login: nach
// wiederholten Fehlversuchen (falsches Passwort ODER falscher 2FA-Code) fuer
// dieselbe Kombination aus Benutzername/E-Mail + Quell-IP muss der Server
// mit 429 antworten, statt den Login-Versuch weiter durchzureichen. Ein
// erfolgreicher Login setzt den Zaehler zurueck; eine andere IP ist von
// Fehlversuchen einer anderen IP nicht betroffen.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

describe('POST /login — Brute-Force-Schutz', () => {
  let app, request, dataDir, loginThrottle

  beforeAll(() => {
    jest.resetModules()
    dataDir = createTestDataDir()
    process.env.DATA_DIR   = dataDir
    process.env.JWT_SECRET = 'jest-test-loginthrottle'
    process.env.NODE_ENV   = 'test'
    process.env.STORAGE_BACKEND = 'json'
    app     = require('../server/index.js')
    request = require('supertest')
    loginThrottle = require('../server/loginThrottle')
  })
  afterAll(() => removeTestDataDir(dataDir))
  beforeEach(() => loginThrottle._resetAll())

  test('nach 3 Fehlversuchen mit falschem Passwort liefert der 4. Versuch 429 statt 401', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await request(app).post('/login').send({ email: 'admin@test.local', password: 'wrong' })
      expect(r.status).toBe(401)
    }
    const blocked = await request(app).post('/login').send({ email: 'admin@test.local', password: 'wrong' })
    expect(blocked.status).toBe(429)
    expect(blocked.body.retryAfterMs).toBeGreaterThan(0)
    expect(blocked.headers['retry-after']).toBeDefined()
  })

  test('Fehlversuche gegen unbekannten Benutzernamen zaehlen ebenfalls (verhindert Enumeration-Bypass)', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await request(app).post('/login').send({ email: 'does-not-exist@test.local', password: 'x' })
      expect(r.status).toBe(401)
    }
    const blocked = await request(app).post('/login').send({ email: 'does-not-exist@test.local', password: 'x' })
    expect(blocked.status).toBe(429)
  })

  test('erfolgreicher Login VOR Erreichen der Sperre setzt den Zaehler zurueck', async () => {
    // 2 Fehlversuche liegen noch unter der Schwelle (3) -> der 3. Versuch mit
    // korrektem Passwort geht noch durch und loescht den Zaehler.
    for (let i = 0; i < 2; i++) {
      const r = await request(app).post('/login').send({ email: 'admin@test.local', password: 'wrong' })
      expect(r.status).toBe(401)
    }
    const ok = await request(app).post('/login').send({ email: 'admin@test.local', password: 'adminpass' })
    expect(ok.status).toBe(200)

    // Zaehler ist wieder bei 0 — nochmal 3 Fehlversuche sind wieder ohne Sperre moeglich
    for (let i = 0; i < 3; i++) {
      const r = await request(app).post('/login').send({ email: 'admin@test.local', password: 'wrong' })
      expect(r.status).toBe(401)
    }
  })

  test('nach Erreichen der Sperre wird auch ein korrektes Passwort vorerst blockiert', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post('/login').send({ email: 'admin@test.local', password: 'wrong' })
    }
    const blockedEvenWithCorrectPassword = await request(app).post('/login')
      .send({ email: 'admin@test.local', password: 'adminpass' })
    expect(blockedEvenWithCorrectPassword.status).toBe(429)

    // recordSuccess() (z.B. nach Ablauf der Wartezeit + korrektem Login) setzt zurueck
    loginThrottle.recordSuccess('admin@test.local', blockedEvenWithCorrectPassword.request?.ip || undefined)
    loginThrottle._resetAll()
    const okAfterReset = await request(app).post('/login').send({ email: 'admin@test.local', password: 'adminpass' })
    expect(okAfterReset.status).toBe(200)
  })

  test('eine gesperrte Kombination blockiert nicht automatisch eine andere IP', async () => {
    for (let i = 0; i < 4; i++) {
      await request(app).post('/login')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({ email: 'admin@test.local', password: 'wrong' })
    }
    // ohne TRUST_PROXY wird der Header ignoriert -> beide Requests kommen
    // effektiv von derselben (Test-)Verbindungs-IP. Zaehler direkt pruefen
    // stattdessen ueber eine echte zweite Instanz mit anderer IP-Simulation
    // waere aufwendiger; hier reicht der Nachweis ueber getRequiredDelayMs.
    const delayA = loginThrottle.getRequiredDelayMs('admin@test.local', '198.51.100.1')
    const delayB = loginThrottle.getRequiredDelayMs('admin@test.local', '198.51.100.2')
    loginThrottle.recordFailure('admin@test.local', '198.51.100.1')
    loginThrottle.recordFailure('admin@test.local', '198.51.100.1')
    loginThrottle.recordFailure('admin@test.local', '198.51.100.1')
    loginThrottle.recordFailure('admin@test.local', '198.51.100.1')
    expect(loginThrottle.getRequiredDelayMs('admin@test.local', '198.51.100.1')).toBeGreaterThan(0)
    expect(loginThrottle.getRequiredDelayMs('admin@test.local', '198.51.100.2')).toBe(0)
  })
})
