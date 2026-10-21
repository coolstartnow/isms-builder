'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Geheime Links (GHSA-vf3w-pmvj-x8mc): Tokens aus kryptografischem Zufall; die öffentliche Seite nimmt nur ein sauberes Format an.
const { randomToken, isTokenFormat } = require('../server/secureToken')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

describe('randomToken', () => {
  test('URL-sicheres Format, 192 Bit', () => {
    const t = randomToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/)   // 24 Byte → 32 Zeichen base64url
  })
  test('einmalig: 5000 Tokens ohne Doppelte', () => {
    const set = new Set(Array.from({ length: 5000 }, () => randomToken()))
    expect(set.size).toBe(5000)
  })
  test('hängt weder von Math.random noch von Date.now ab', () => {
    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0.5)
    const now = jest.spyOn(Date, 'now').mockReturnValue(1700000000000)
    try {
      const a = randomToken(), b = randomToken()
      expect(a).not.toBe(b)             // bei festem Math.random und Date.now sind alte Tokens identisch (Befund des Melders)
      expect(rnd).not.toHaveBeenCalled()
    } finally { rnd.mockRestore(); now.mockRestore() }
  })
  test('Zeichenverteilung: alle 64 Zeichen kommen vor (grobe Plausibilität)', () => {
    const seen = new Set(); for (let i = 0; i < 400; i++) for (const c of randomToken()) seen.add(c)
    expect(seen.size).toBe(64)
  })
})

describe('isTokenFormat', () => {
  test.each([
    [randomToken(), true],
    ['lx3k8fab2c-1a2b3c4d-5e6f7g8h', true],      // altes Format: bereits versandte Links bleiben gültig
    ['abc', false], ['', false], [undefined, false], [null, false], [123456789, false],
    ['a'.repeat(129), false],
    ['<img src=x onerror=alert(1)>', false], ['a b c d e f g h', false], ['../../etc/passwd', false], ['abc"onmouseover="x', false],
  ])('%j → %s', (t, ok) => expect(isTokenFormat(t)).toBe(ok))
})

describe('öffentliche Seite /ack/:token', () => {
  let dataDir, app, request
  beforeAll(() => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-secure-token-secret-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    app = require('../server/index.js'); request = require('supertest')
  })
  afterAll(() => removeTestDataDir(dataDir))

  test('Token mit Sonderzeichen: 404, der Wert wird nicht in die Seite gespiegelt', async () => {
    const bad = encodeURIComponent('"><img src=x onerror=alert(1)>')
    for (const method of ['get', 'post']) {
      const r = await request(app)[method](`/ack/${bad}`)
      expect(r.status).toBe(404)
      expect(r.text).not.toContain('onerror')
    }
  })
  test('gültig aussehendes, unbekanntes Token: 404', async () => {
    expect((await request(app).get(`/ack/${randomToken()}`)).status).toBe(404)
    expect((await request(app).get('/ack/lx3k8fab2c-1a2b3c4d-5e6f7g8h')).status).toBe(404)
  })
})
