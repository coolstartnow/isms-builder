'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// JWT-Secret: Platzhalter, fehlende und kurze Secrets werden erkannt; in Produktion bricht der Start ab (GHSA-vwc3-4j58-wrxc).
const path = require('path')
const { spawnSync } = require('child_process')
const { weakSecretReason, enforce } = require('../server/secretCheck')

const STRONG = 'a3f1c9e2b7d84056a3f1c9e2b7d84056a3f1c9e2b7d84056a3f1c9e2b7d84056'

describe('weakSecretReason', () => {
  test.each([
    [undefined, 'missing'], ['', 'missing'], ['   ', 'missing'],
    ['CHANGE_ME_USE_OPENSSL_RAND_HEX_32', 'placeholder'],   // der Platzhalter aus .env.docker / .env.example
    ['change_me_please_change_me_please_1234', 'placeholder'], ['Change-Me-Now-Change-Me-Now-Change-Me', 'placeholder'],
    ['changeme-changeme-changeme-changeme-x', 'placeholder'], ['your-very-long-random-secret-here-xxxxx', 'placeholder'],
    ['secret', 'placeholder'], ['password', 'placeholder'],
    ['kurz-aber-kein-platzhalter', 'short'], ['a'.repeat(31), 'short'],
  ])('%j → %s', (secret, reason) => expect(weakSecretReason(secret)).toBe(reason))

  test.each([[STRONG], ['a'.repeat(32)], ['ci-test-secret-do-not-use-in-production'], ['smoke-test-secret-not-for-production']])('%j ist in Ordnung', secret => {
    expect(weakSecretReason(secret)).toBeNull()
  })
})

describe('enforce', () => {
  const run = (secret, env) => {
    const calls = { exit: [], warn: [], error: [] }
    const reason = enforce({ secret, env, exit: c => calls.exit.push(c), warn: m => calls.warn.push(m), error: m => calls.error.push(m) })
    return { reason, calls }
  }
  test('Produktion + Platzhalter: Fehlermeldung mit Abhilfe und Abbruch', () => {
    const { reason, calls } = run('CHANGE_ME_USE_OPENSSL_RAND_HEX_32', 'production')
    expect(reason).toBe('placeholder'); expect(calls.exit).toEqual([1]); expect(calls.warn).toEqual([])
    expect(calls.error[0]).toMatch(/Platzhalter/); expect(calls.error[0]).toMatch(/openssl rand -hex 32/)
  })
  test('Produktion + fehlend/kurz: Abbruch', () => {
    expect(run(undefined, 'production').calls.exit).toEqual([1])
    expect(run('zu-kurz', 'production').calls.exit).toEqual([1])
  })
  test('Produktion + gutes Secret: weder Abbruch noch Meldung', () => {
    const { reason, calls } = run(STRONG, 'production')
    expect(reason).toBeNull(); expect(calls).toEqual({ exit: [], warn: [], error: [] })
  })
  test('Entwicklung/Test/Demo: nur Warnung, kein Abbruch', () => {
    for (const env of ['development', 'test', undefined]) {
      const { reason, calls } = run('CHANGE_ME_USE_OPENSSL_RAND_HEX_32', env)
      expect(reason).toBe('placeholder'); expect(calls.exit).toEqual([]); expect(calls.warn).toHaveLength(1)
    }
  })
})

describe('Start des Servers (echter Prozess)', () => {
  const load = (env) => spawnSync(process.execPath, ['-e', "require('./server/auth'); console.log('GELADEN')"], {
    cwd: path.join(__dirname, '..'), encoding: 'utf8', env: { PATH: process.env.PATH, ...env },
  })
  test('Produktion mit Platzhalter: Prozess endet mit Code 1 und lädt nicht weiter', () => {
    const r = load({ NODE_ENV: 'production', JWT_SECRET: 'CHANGE_ME_USE_OPENSSL_RAND_HEX_32' })
    expect(r.status).toBe(1); expect(r.stdout).not.toMatch(/GELADEN/); expect(r.stderr).toMatch(/startet in Produktion nicht/)
  })
  test('Produktion mit gutem Secret: lädt', () => {
    const r = load({ NODE_ENV: 'production', JWT_SECRET: STRONG })
    expect(r.status).toBe(0); expect(r.stdout).toMatch(/GELADEN/)
  })
  test('Entwicklung mit Platzhalter: lädt mit Warnung', () => {
    const r = load({ NODE_ENV: 'development', JWT_SECRET: 'CHANGE_ME_USE_OPENSSL_RAND_HEX_32' })
    expect(r.status).toBe(0); expect(r.stdout).toMatch(/GELADEN/); expect(r.stderr + r.stdout).toMatch(/WARNUNG/)
  })
})
