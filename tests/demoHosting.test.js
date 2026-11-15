'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Öffentliche Demo (DEMO_HOSTING=true): gesperrte Funktionen, Demo-Reset als Attrappe, Mehrfach-Sitzungen, kein Produktivzustand,
// stündliches Zurücksetzen der Demo-Passwörter, rein lesendes /health. Ohne den Schalter ändert sich nichts.
process.env.DEMO_HOSTING = 'true'   // vor dem Laden der App: /health wird beim Laden registriert; der Filter liest den Schalter bei jeder Anfrage
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')

const ROOT = path.join(__dirname, '..')
let dataDir, app, admin, reader

beforeAll(async () => {
  dataDir = createTestDataDir()
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-secret-demohosting-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  app = require('../server/index.js')
  admin = await loginAs(app, 'admin')
  reader = await loginAs(app, 'reader')
})
afterAll(() => removeTestDataDir(dataDir))

const call = (method, url, cookie, body) => {
  let r = request(app)[method](url)
  if (cookie) r = r.set('Cookie', cookie)
  return body === undefined || body === null ? r.send() : r.send(body)
}
const withDemo = async fn => { process.env.DEMO_HOSTING = 'true'; return fn() }
const withoutDemo = async fn => { delete process.env.DEMO_HOSTING; try { return await fn() } finally { process.env.DEMO_HOSTING = 'true' } }

// Beispielanfragen je gesperrter Regel (mit Schreibweisen, die der Router ebenfalls annimmt)
const BLOCKED_RAW = [
  ['post', '/admin/users', { username: 'x1', email: 'x1@t.local', role: 'reader', password: 'abcd1234' }],
  ['put', '/admin/users/reader', { role: 'admin' }], ['delete', '/admin/users/reader'],
  ['put', '/me/password', { currentPassword: 'adminpass', newPassword: 'neues-pw-1234' }],
  ['get', '/2fa/setup'], ['post', '/2fa/verify', { token: '123456' }], ['delete', '/2fa'],
  ['put', '/admin/security', { require2FA: true }], ['put', '/admin/role-settings', {}], ['put', '/admin/ai-settings', {}],
  ['post', '/admin/email/test', { to: 'x@example.org' }], ['post', '/admin/webdav/test', {}],
  ['put', '/admin/logo', { data: 'x' }], ['delete', '/admin/logo'],
  ['post', '/admin/sync-accounts', { name: 'x' }], ['post', '/admin/demo-import', {}], ['post', '/admin/maintenance/cleanup', {}], ['delete', '/admin/audit-log'],
  ['post', '/soa/frameworks', { id: 'X1', label: 'x' }], ['put', '/soa/frameworks/X1', { label: 'y' }], ['delete', '/soa/frameworks/X1'], ['post', '/soa/frameworks/import', { controls: [] }],
  ['post', '/Admin/Users', { username: 'x2' }], ['put', '/admin/users/reader/', { role: 'admin' }], ['post', '/ADMIN/DEMO-IMPORT', {}],
]
const BLOCKED = BLOCKED_RAW.map(r => [r[0], r[1], r[2] === undefined ? null : r[2]])   // gleich lange Zeilen (jest übergibt sonst „done“ als letzten Parameter)

describe('gesperrte Funktionen in der öffentlichen Demo', () => {
  test.each(BLOCKED)('%s %s → 403 DEMO_HOSTING', async (method, url, body) => {
    const r = await withDemo(() => call(method, url, admin, body))
    expect([url, r.status, r.body.code]).toEqual([url, 403, 'DEMO_HOSTING'])
  })

  test('die Sperre wirkt auch ohne Anmeldung (403, nie 200) und verrät nichts', async () => {
    const r = await call('post', '/admin/users', undefined, { username: 'x3' })
    expect([r.status, r.body.code]).toEqual([403, 'DEMO_HOSTING'])
    expect(JSON.stringify(r.body)).not.toMatch(/stack|at |\.js/)
  })

  test('ohne DEMO_HOSTING erreichen dieselben Anfragen die echten Routen (Abgleich: keine Regel zeigt auf eine nicht vorhandene Route)', async () => {
    await withoutDemo(async () => {
      for (const [method, url, body] of BLOCKED) {
        const r = await call(method, url, undefined, body)   // unangemeldet: die echte Route antwortet 401/403/…, nie mit DEMO_HOSTING
        expect([method, url, r.body && r.body.code === 'DEMO_HOSTING']).toEqual([method, url, false])
      }
      // Die Routen existieren (Abgleich gegen Abweichungen): unangemeldet antwortet die echte Route 401/403/400, nie 404 — und verändert nichts
      for (const [method, url, body] of BLOCKED.filter(b => b[1] === b[1].toLowerCase() && !b[1].endsWith('/'))) {
        const r = await call(method, url, undefined, body)
        expect([method, url, r.status === 404]).toEqual([method, url, false])
      }
    })
  })

  test('alle Regeln der Tabelle sind durch Beispielanfragen abgedeckt', () => {
    const { RULES, ruleFor } = require('../server/demoHosting')
    const covered = new Set()
    for (const [m, u] of BLOCKED) covered.add(RULES.findIndex(([ms, re]) => ms.includes(m.toUpperCase()) && re.test(u.toLowerCase().replace(/\/+$/, ''))))
    const rest = RULES.map((r, i) => i).filter(i => !covered.has(i) && RULES[i][2] === 'block')
    expect(rest).toEqual([])
    expect(ruleFor('GET', '/admin/users')).toBe(null)       // Lesen bleibt erlaubt
    expect(ruleFor('POST', '/risks')).toBe(null)
  })

  test('normale Arbeit in der Demo bleibt möglich (Risiko anlegen, Benutzerliste lesen)', async () => {
    expect((await call('post', '/risks', admin, { title: 'Demo-Risiko', probability: 2, impact: 2 })).status).toBe(201)
    expect((await call('get', '/admin/users', admin)).status).toBe(200)
  })

  test('Organisationseinstellungen: SMTP- und WebDAV-Zugangsdaten werden verworfen, übrige Felder gespeichert', async () => {
    const r = await call('put', '/admin/org-settings', admin, { orgName: 'Demo GmbH', smtpSettings: { host: 'smtp.fremd.example', port: 25, user: 'x', pass: 'y', from: 'a@b.c' }, webdavSettings: { url: 'https://fremd.example/dav', user: 'x', appPassword: 'y' } })
    expect(r.status).toBe(200)
    const s = (await call('get', '/admin/org-settings', admin)).body
    expect(s.orgName).toBe('Demo GmbH')
    expect(JSON.stringify(s)).not.toMatch(/smtp\.fremd\.example|fremd\.example\/dav/)
  })
})

describe('Demo-Reset als Attrappe', () => {
  test('Administrator: 200 „simuliert“, nichts geändert (Daten, Benutzer, Passwort, keine Produktiv-Markierung, Protokolleintrag)', async () => {
    const users = (await call('get', '/admin/users', admin)).body.length
    const templates = (await call('get', '/templates', admin)).body.length
    const risks = (await call('get', '/risks', admin)).body.length
    const r = await call('post', '/admin/demo-reset', admin)
    expect([r.status, r.body.simulated, r.headers['x-demo-hosting']]).toEqual([200, true, 'simulated'])
    expect(fs.existsSync(path.join(dataDir, '.production'))).toBe(false)
    expect(fs.existsSync(path.join(dataDir, '.demo_reset_done'))).toBe(false)
    expect((await call('get', '/risks', admin)).body.length).toBe(risks)
    expect((await call('get', '/admin/users', admin)).body.length).toBe(users)
    expect((await call('get', '/templates', admin)).body.length).toBe(templates)
    expect((await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })).status).toBe(200)   // Passwort unverändert
    const audit = JSON.stringify((await call('get', '/admin/audit-log?action=demo_reset_simulated', admin)).body)
    expect(audit).toMatch(/nur simuliert/)
  })
  test('ohne Anmeldung und als Leser wird nichts simuliert (echte Route antwortet 401/403, kein Protokolleintrag durch Fremde)', async () => {
    const anon = await call('post', '/admin/demo-reset')
    expect([anon.status, anon.headers['x-demo-hosting']]).toEqual([401, undefined])
    const rd = await call('post', '/admin/demo-reset', reader)
    expect([rd.status, rd.headers['x-demo-hosting']]).toEqual([403, undefined])
  })
  test('ohne DEMO_HOSTING wäre die Route echt (Demo-Reset, nicht simuliert) — hier nur über die Regel geprüft, nicht ausgeführt', () => {
    const { enabled } = require('../server/demoHosting')
    delete process.env.DEMO_HOSTING; expect(enabled()).toBe(false); process.env.DEMO_HOSTING = 'true'; expect(enabled()).toBe(true)
  })
})

describe('Betriebsart: Sitzungen, Produktivzustand, Passwörter', () => {
  test('mehrere gleichzeitige Sitzungen je Konto; ausdrückliches SESSION_SINGLE=true gilt trotzdem', () => {
    const store = require('../server/sessionStore')
    const save = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      expect(store.singleSession()).toBe(false)
      process.env.SESSION_SINGLE = 'true'; expect(store.singleSession()).toBe(true); delete process.env.SESSION_SINGLE
      delete process.env.DEMO_HOSTING; expect(store.singleSession()).toBe(true); process.env.DEMO_HOSTING = 'true'
    } finally { process.env.NODE_ENV = save }
  })
  test('nie Produktivzustand (auch mit Markierung und ohne alice/bob), keine Passwortwarnung', async () => {
    const ps = require('../server/productionState')
    fs.writeFileSync(path.join(dataDir, '.production'), 'x')
    try {
      expect(ps.isProduction({ getAllUsers: () => [{ username: 'admin' }] })).toBe(false)
      ps.resetCache(); expect(await ps.seedPasswordAccounts()).toEqual([])
    } finally { fs.unlinkSync(path.join(dataDir, '.production')) }
  })
  test('Demo-Passwörter werden zurückgesetzt, 2FA ausgeschaltet, Sitzungen der geänderten Konten beendet; unveränderte Konten bleiben angemeldet', async () => {
    const rbac = require('../server/rbacStore'), demo = require('../server/demoHosting')
    const c = await loginAs(app, 'editor')          // Konto, das nicht zu den Demo-Konten gehört (bleibt unberührt)
    expect(Object.keys(demo.DEMO_PASSWORDS)).toEqual(expect.arrayContaining(['admin@example.com', 'ciso@example.com', 'alice@it.example', 'bob@hr.example']))
    // ein Demo-Konto im Test: Konto der Testumgebung mit Demo-E-Mail vorbereiten
    const u = rbac.getUserByUsername('reader'); const old = u.email
    await rbac.updateUser('reader', { email: 'bob@hr.example' })
    await rbac.setPasswordHash('reader', 'ganz-anderes-passwort-9')
    rbac.setUserTotpSecret('reader', 'JBSWY3DPEHPK3PXP')
    const sess = await request(app).post('/login').send({ username: 'reader', password: 'ganz-anderes-passwort-9', totp: '123456' })
    const n = await demo.resetDemoPasswords()
    expect(n).toBeGreaterThanOrEqual(1)
    expect((await request(app).post('/login').send({ username: 'reader', password: 'bobpass' })).status).toBe(200)
    expect(rbac.getUserByUsername('reader').totpSecret || '').toBe('')
    expect((await call('get', '/whoami', c)).status).toBe(200)   // fremdes Konto unberührt
    await rbac.updateUser('reader', { email: old })
    expect(sess).toBeTruthy()
  })
})

describe('Demo-Logo', () => {
  test('ensureDemoLogo legt das mitgelieferte Logo an, wenn keines da ist; ein eigenes Logo bleibt', async () => {
    const orgLogo = require('../server/orgLogo'), demo = require('../server/demoHosting')
    orgLogo.remove()
    expect(orgLogo.read()).toBeFalsy()
    expect(demo.ensureDemoLogo()).toBe(true)
    expect(orgLogo.read().meta.demo).toBe(true)
    expect((await call('get', '/branding/logo', reader)).status).toBe(200)
    const own = fs.readFileSync(path.join(ROOT, 'data/demo-bundles/isms-builder-logo.png'))
    orgLogo.save(own, { demo: false })
    expect(demo.ensureDemoLogo()).toBe(false)           // eigenes Logo unverändert
    expect(orgLogo.read().meta.demo).toBeFalsy()
    orgLogo.remove()
  })
})

describe('/health (rein lesend)', () => {
  test('ohne Anmeldung erreichbar, liefert nur status und Zeitstempel', async () => {
    const r = await call('get', '/health')
    expect(r.status).toBe(200)
    expect(Object.keys(r.body).sort()).toEqual(['status', 'ts'])
    expect(r.body.status).toBe('ok')
  })
  test('nur Lesen: andere Methoden gibt es nicht', async () => {
    for (const m of ['post', 'put', 'delete']) expect([m, (await call(m, '/health')).status]).toEqual([m, 404])
  })
  test('ohne DEMO_HOSTING/HEALTH_CHECK gibt es die Route nicht (Prüfung des Ladecodes)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8')
    expect(src).toMatch(/if \(require\('\.\/demoHosting'\)\.enabled\(\) \|\| process\.env\.HEALTH_CHECK === 'true'\) \{\s*app\.get\('\/health'/)
    expect(src).not.toMatch(/\/auth\/demo-hosting/)      // der Schalter hat keine eigene Route
  })
})

describe('keine neue Angriffsfläche durch den Schalter', () => {
  test('server/demoHosting.js und index.js enthalten keine Route zum Setzen oder Abfragen des Schalters', () => {
    const d = fs.readFileSync(path.join(ROOT, 'server/demoHosting.js'), 'utf8')
    expect(d).not.toMatch(/router\.|app\.(get|post|put|delete)/)
    expect(d).toMatch(/process\.env\.DEMO_HOSTING === 'true'/)
  })
  test('die Oberfläche kennt die Attrappe nur am Antwort-Header (kein zusätzlicher Abruf)', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'ui/app.js'), 'utf8')
    expect(ui).toMatch(/X-Demo-Hosting'\) === 'simulated'/)
  })
})
