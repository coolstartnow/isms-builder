'use strict'
const LANG_REG = require('../ui/i18n/languages.js')
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Serverseitige Sitzungen, Demo-/Produktivzustand und Seed-Passwörter, Secure-Cookie/HSTS.
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPut } = require('./setup/authHelper')

const SECRET = 'jest-sessions-secret-0123456789abcdef-0123456789'
let dataDir, app, admin

beforeAll(async () => {
  dataDir = createTestDataDir()
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: SECRET, NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  app = require('../server/index.js')
  admin = await loginAs(app, 'admin')
})
afterAll(() => removeTestDataDir(dataDir))

const cookieOf = res => res.headers['set-cookie'][0].split(';')[0]
const login = (u, p) => request(app).post('/login').send({ username: u, password: p })
const mkUser = async (name, password = 'start-pw-1') => {
  const r = await request(app).post('/admin/users').set('Cookie', admin).send({ username: name, email: `${name}@test.local`, domain: 'Global', role: 'editor', password })
  expect(r.status).toBe(201)
}

describe('Sitzungen (AUTH-010)', () => {
  test('Abmelden macht ein kopiertes Token sofort wertlos', async () => {
    const c = await loginAs(app, 'editor')
    expect((await authedGet(app, c, '/whoami')).status).toBe(200)
    await request(app).post('/logout').set('Cookie', c)
    expect((await authedGet(app, c, '/whoami')).status).toBe(401)
  })

  test('Token ohne Sitzungskennung (z. B. vor dem Update ausgestellt) ist ungültig', async () => {
    const legacy = jwt.sign({ username: 'admin', role: 'admin', domain: 'Global', functions: [] }, SECRET, { expiresIn: '8h' })
    expect((await authedGet(app, 'sm_session=' + legacy, '/whoami')).status).toBe(401)
  })

  test('Token mit erfundener Kennung ist ungültig', async () => {
    const forged = jwt.sign({ username: 'admin', role: 'admin', domain: 'Global', functions: [], jti: 'gibt-es-nicht' }, SECRET, { expiresIn: '8h' })
    expect((await authedGet(app, 'sm_session=' + forged, '/whoami')).status).toBe(401)
  })

  test('Kennung eines anderen Kontos lässt sich nicht übernehmen', async () => {
    const c = await loginAs(app, 'reader')
    const payload = jwt.decode(c.split('=')[1])
    const forged = jwt.sign({ username: 'admin', role: 'admin', domain: 'Global', functions: [], jti: payload.jti }, SECRET, { expiresIn: '8h' })
    expect((await authedGet(app, 'sm_session=' + forged, '/whoami')).status).toBe(401)
  })

  test('Passwortwechsel beendet die übrigen Sitzungen, die eigene bleibt', async () => {
    await mkUser('sess1')
    const a = cookieOf(await login('sess1', 'start-pw-1'))
    const b = cookieOf(await login('sess1', 'start-pw-1'))
    expect((await authedPut(app, a, '/me/password', { currentPassword: 'start-pw-1', newPassword: 'neues-pw-12345' })).status).toBe(200)
    expect((await authedGet(app, a, '/whoami')).status).toBe(200)
    expect((await authedGet(app, b, '/whoami')).status).toBe(401)
  })

  test('Löschen eines Kontos beendet seine Sitzungen', async () => {
    await mkUser('sess2')
    const c = cookieOf(await login('sess2', 'start-pw-1'))
    expect((await authedGet(app, c, '/whoami')).status).toBe(200)
    expect((await request(app).delete('/admin/users/sess2').set('Cookie', admin)).status).toBeLessThan(300)
    expect((await authedGet(app, c, '/whoami')).status).toBe(401)
  })

  test('Standardregel außerhalb der Tests: nur eine gleichzeitige Sitzung je Konto; Schalter SESSION_SINGLE=false hebt sie auf', () => {
    const store = require('../server/sessionStore')
    const save = { e: process.env.NODE_ENV, s: process.env.SESSION_SINGLE }
    try {
      delete process.env.SESSION_SINGLE
      process.env.NODE_ENV = 'production'; expect(store.singleSession()).toBe(true)
      process.env.NODE_ENV = 'development'; expect(store.singleSession()).toBe(true)
      process.env.SESSION_SINGLE = 'false'; process.env.NODE_ENV = 'production'; expect(store.singleSession()).toBe(false)
      process.env.SESSION_SINGLE = 'true'; process.env.NODE_ENV = 'test'; expect(store.singleSession()).toBe(true)
    } finally { process.env.NODE_ENV = save.e; if (save.s === undefined) delete process.env.SESSION_SINGLE; else process.env.SESSION_SINGLE = save.s }
  })

  test('mit der Einzelsitzungs-Regel beendet eine neue Anmeldung die vorherige Sitzung des Kontos', async () => {
    await mkUser('sess3')
    process.env.SESSION_SINGLE = 'true'
    try {
      const a = cookieOf(await login('sess3', 'start-pw-1'))
      const b = cookieOf(await login('sess3', 'start-pw-1'))
      expect((await authedGet(app, a, '/whoami')).status).toBe(401)
      expect((await authedGet(app, b, '/whoami')).status).toBe(200)
    } finally { delete process.env.SESSION_SINGLE }
  })

  test('in der Testsuite (ohne ausdrückliches SESSION_SINGLE=true) laufen mehrere Sitzungen desselben Kontos parallel', async () => {
    await mkUser('sess4')
    const a = cookieOf(await login('sess4', 'start-pw-1'))
    const b = cookieOf(await login('sess4', 'start-pw-1'))
    expect((await authedGet(app, a, '/whoami')).status).toBe(200)
    expect((await authedGet(app, b, '/whoami')).status).toBe(200)
  })

  test('die Sitzungsliste übersteht einen Neustart (sessions.json)', async () => {
    const store = require('../server/sessionStore')
    const c = await loginAs(app, 'auditor')
    store.flushNow()
    expect(fs.existsSync(path.join(dataDir, 'sessions.json'))).toBe(true)
    store.reload()
    expect((await authedGet(app, c, '/whoami')).status).toBe(200)
    expect(fs.statSync(path.join(dataDir, 'sessions.json')).mode & 0o077).toBe(0)   // nur der Server-Benutzer darf lesen
  })

  test('/whoami gibt die Sitzungskennung nicht aus', async () => {
    const r = await authedGet(app, await loginAs(app, 'reader'), '/whoami')
    expect(JSON.stringify(r.body)).not.toMatch(/jti/)
  })
})

describe('Demo- und Produktivzustand (SEC-004)', () => {
  const ps = () => require('../server/productionState')

  test('Markierung .production → Produktivbetrieb', () => {
    const marker = path.join(dataDir, '.production')
    expect(fs.existsSync(marker)).toBe(false)
    ps().markProduction()
    expect(ps().isProduction()).toBe(true)
    fs.unlinkSync(marker)
  })

  test('ohne Markierung: Produktiv, wenn die Demo-Konten alice und bob fehlen (Bestandsinstallation nach Reset)', () => {
    process.env.ISMS_PRODUCTION_INFER = '1'
    try {
      expect(ps().isProduction({ getAllUsers: () => [{ username: 'admin' }, { username: 'chef' }] })).toBe(true)
      expect(ps().isProduction({ getAllUsers: () => [{ username: 'admin' }, { username: 'alice' }, { username: 'bob' }] })).toBe(false)
      expect(ps().isProduction({ getAllUsers: () => [] })).toBe(false)
    } finally { delete process.env.ISMS_PRODUCTION_INFER }
  })

  test('Produktiv: Anmeldung mit Seed-Passwort abgelehnt, mit anderem Passwort möglich', async () => {
    await mkUser('seed1', 'ordentlich-123')
    // Konto mit dem Demo-Passwort anlegen, solange noch Demo ist; danach auf Produktiv umschalten
    await mkUser('seed2', 'alicepass')
    await require('../server/rbacStore').setPasswordHash('seed2', 'alicepass')   // Bestand: Demo-Passwort ohne Wechselpflicht
    ps().markProduction()
    try {
      expect((await login('seed2', 'alicepass')).status).toBe(401)
      expect((await login('seed1', 'ordentlich-123')).status).toBe(200)
    } finally { fs.unlinkSync(path.join(dataDir, '.production')) }
  })

  test('Produktiv: Übergabe — Konto mit mustChangePassword darf sich mit dem Anfangspasswort anmelden und muss es sofort ändern', async () => {
    const rbac = require('../server/rbacStore')
    await mkUser('hand1')
    await rbac.setPasswordHash('hand1', 'adminpass', { mustChange: true })
    ps().markProduction()
    try {
      const r = await login('hand1', 'adminpass')
      expect(r.status).toBe(200); expect(r.body.mustChangePassword).toBe(true)
      const c = cookieOf(r)
      expect((await authedGet(app, c, '/risks')).status).toBe(403)
      expect((await authedPut(app, c, '/me/password', { currentPassword: 'adminpass', newPassword: 'alicepass' })).status).toBe(400)       // Demo-Passwort nicht erlaubt
      expect((await authedPut(app, c, '/me/password', { currentPassword: 'adminpass', newPassword: 'ein-eigenes-pw-1' })).status).toBe(200)
      expect((await login('hand1', 'adminpass')).status).toBe(401)
    } finally { fs.unlinkSync(path.join(dataDir, '.production')) }
  })

  test('Produktiv: der Administrator kann kein Demo-Passwort vergeben', async () => {
    ps().markProduction()
    try {
      const mk = await request(app).post('/admin/users').set('Cookie', admin).send({ username: 'seed3', email: 'seed3@test.local', domain: 'Global', role: 'reader', password: 'alicepass' })
      expect(mk.status).toBe(400)
      await mkUser('seed4', 'ordentlich-456').catch(() => {})
      const up = await request(app).put('/admin/users/seed1').set('Cookie', admin).send({ password: 'danapass' })
      expect(up.status).toBe(400)
    } finally { fs.unlinkSync(path.join(dataDir, '.production')) }
  })

  test('Demo: Seed-Passwörter funktionieren weiterhin', async () => {
    expect((await login('admin', 'adminpass')).status).toBe(200)
  })

  test('der Demo-Reset setzt die Markierung und das Anfangspasswort mit Wechselpflicht (statisch)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../server/routes/admin.js'), 'utf8')
    expect(src).toMatch(/setPasswordHash\('admin', 'adminpass', \{ mustChange: true \}\)/)
    expect(src).toMatch(/productionState\.markProduction\(\)/)
    const prep = fs.readFileSync(path.join(__dirname, '../scripts/prepare-production.js'), 'utf8')
    expect(prep).toMatch(/\{ mustChange: true \}/)
    expect(prep).toMatch(/markProduction\(\)/)
  })
})

describe('Startwarnung bei Demo-Passwort im Produktivbetrieb (SEC-004)', () => {
  const ps = () => require('../server/productionState')
  afterEach(() => { try { fs.unlinkSync(path.join(dataDir, '.production')) } catch {}; ps().resetCache() })

  test('Demo: keine Warnung', async () => {
    ps().resetCache()
    expect(await ps().seedPasswordAccounts()).toEqual([])
    expect((await request(app).get('/auth/security-notice')).body).toEqual({ seedPasswords: false })
  })

  test('Produktiv: Konto mit Demo-Passwort wird erkannt; öffentlich nur Ja/Nein, Administratoren sehen die Namen', async () => {
    ps().markProduction(); ps().resetCache()
    expect(await ps().seedPasswordAccounts()).toContain('admin')
    const pub = await request(app).get('/auth/security-notice')
    expect(pub.body).toEqual({ seedPasswords: true })                       // keine Kontonamen für Unangemeldete
    expect((await request(app).get('/admin/security-notice')).status).toBe(401)
    expect((await request(app).get('/admin/security-notice').set('Cookie', await loginAs(app, 'reader'))).status).toBe(403)
    const adm = await request(app).get('/admin/security-notice').set('Cookie', admin)
    expect(adm.body.seedAccounts).toContain('admin')
  })

  test('Anmeldung mit dem Demo-Passwort liefert den eindeutigen Code SEED_PASSWORD_BLOCKED', async () => {
    ps().markProduction(); ps().resetCache()
    const r = await login('admin', 'adminpass')
    expect(r.status).toBe(401)
    expect(r.body.code).toBe('SEED_PASSWORD_BLOCKED')
    expect((await login('admin', 'falsches-passwort-1')).body.code).toBeUndefined()   // falsches Passwort bleibt allgemein
  })

  test('nach dem Setzen eines eigenen Passworts verschwindet die Warnung', async () => {
    ps().markProduction()
    await require('../server/rbacStore').setPasswordHash('admin', 'ein-eigenes-pw-77')
    ps().resetCache()
    expect(await ps().seedPasswordAccounts()).toEqual([])
    expect((await request(app).get('/auth/security-notice')).body.seedPasswords).toBe(false)
    await require('../server/rbacStore').setPasswordHash('admin', 'adminpass')        // Ausgangszustand für die übrigen Tests
  })

  test('Oberfläche: Login-Banner und Leiste für Administratoren sind nicht wegklickbar, Meldungen in fünf Sprachen', () => {
    const login = fs.readFileSync(path.join(__dirname, '../ui/login.html'), 'utf8')
    const block = login.slice(login.indexOf('id="seedWarnBanner"'), login.indexOf('id="demoResetBanner"'))
    expect(block).toMatch(/set-password\.js/)
    expect(block).not.toMatch(/<button|onclick|close/i)
    const submit = fs.readFileSync(path.join(__dirname, '../ui/login-submit.js'), 'utf8')
    expect(submit).toMatch(/SEED_PASSWORD_BLOCKED/)
    const app = fs.readFileSync(path.join(__dirname, '../ui/app.js'), 'utf8')
    const fn = app.slice(app.indexOf('async function showSeedPasswordNotice'), app.indexOf('async function showLogoRequiredNotice'))
    expect(fn).toMatch(/position:fixed/)
    expect(fn).toMatch(/--topbar-h/)
    expect(fn).not.toMatch(/<button|onclick|remove\(\)\s*\}\)/)
    const tr = fs.readFileSync(path.join(__dirname, '../ui/i18n/translations.js'), 'utf8')
    for (const key of ['seedWarnTitle', 'seedWarnText', 'seedWarnCmd', 'seedAdminText', 'lg_seedBlocked']) {
      const line = tr.slice(tr.indexOf(key + ':'), tr.indexOf('\n', tr.indexOf(key + ':')))
      for (const l of ['de:', 'en:', 'fr:', 'nl:', 'hu:']) expect([key, l, line.includes(l)]).toEqual([key, l, true])
    }
  })

  test('der Start schreibt eine auffällige Logwarnung mit dem Befehl zum Beheben', async () => {
    ps().markProduction(); ps().resetCache()
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await ps().warnAtStart()
      const out = err.mock.calls.map(c => c.join(' ')).join('\n')
      expect(out).toMatch(/SICHERHEITSWARNUNG/)
      expect(out).toMatch(/admin/)
      expect(out).toMatch(/node scripts\/set-password\.js/)
    } finally { err.mockRestore() }
  })
})

describe('Leitfaden in der Anwendung (Guidance)', () => {
  const docs = path.join(__dirname, '../docs')
  test.each(['', '.en', '.fr', '.nl', '.hu'])('docs/module-login-security%s.md existiert, nennt Einzelsitzung und set-password, Bilder sind vorhanden', suf => {
    const md = fs.readFileSync(path.join(docs, `module-login-security${suf}.md`), 'utf8')
    expect(md).toMatch(/set-password\.js/)
    expect(md).toMatch(/TRUST_PROXY/)
    expect(md).toMatch(/ALLOW_INSECURE_HTTP/)
    const imgs = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1])
    expect(imgs.length).toBe(4)
    for (const f of imgs) expect([f, fs.existsSync(path.join(docs, f))]).toEqual([f, true])
  })
  test('deutsche Fassung hält die Regel „eine gleichzeitige Sitzung je Konto, sonst separates Konto“ ausdrücklich fest', () => {
    const md = fs.readFileSync(path.join(docs, 'module-login-security.md'), 'utf8')
    expect(md).toMatch(/nur eine Sitzung gleichzeitig/)
    expect(md).toMatch(/separates Konto/)
  })
  test('der Leitfaden ist als Systemhandbuch-Artikel in fünf Sprachen registriert', () => {
    const src = fs.readFileSync(path.join(__dirname, '../server/db/guidanceStore.js'), 'utf8')
    const block = src.slice(src.indexOf("seedId:        'seed_module_login_security'"), src.indexOf("seedId:        'seed_changelog'"))
    // Dateien je Sprache kommen aus dem Sprachregister (docFiles → docs/module-login-security<Endung>.md); jede Sprache muss die Datei haben
    expect(block).toMatch(/srcFiles:\s+docFiles\('module-login-security'\)/)
    for (const l of LANG_REG.completeCodes()) expect([l, fs.existsSync(path.join(docs, `module-login-security${LANG_REG.docSuffix(l)}.md`))]).toEqual([l, true])
    expect(block).toMatch(/category:\s+'systemhandbuch'/)
  })
})

describe('Secure-Cookie und HSTS (HDR-008/010)', () => {
  test('über HTTP: Cookie ohne Secure, kein HSTS', async () => {
    const r = await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })
    expect(r.headers['set-cookie'][0]).not.toMatch(/;\s*Secure/i)
    expect(r.headers['strict-transport-security']).toBeUndefined()
  })

  test('über HTTPS (Proxy mit TRUST_PROXY): Cookie mit Secure, HSTS gesetzt', async () => {
    app.set('trust proxy', true)
    try {
      const r = await request(app).post('/login').set('X-Forwarded-Proto', 'https').send({ username: 'admin', password: 'adminpass' })
      expect(r.headers['set-cookie'][0]).toMatch(/;\s*Secure/i)
      expect(r.headers['strict-transport-security']).toMatch(/max-age=\d+/)
    } finally { app.set('trust proxy', false) }
  })
})
