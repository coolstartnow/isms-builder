'use strict'
const LANG_REG = require('../ui/i18n/languages.js')
// Demo-Konten: carla (CISO) und dana (DSB) gehören zum Demoset; beide ohne Administratorrechte
const request = require('supertest')
const fs = require('fs'), path = require('path'), os = require('os')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./setup/authHelper')
const root = p => path.join(__dirname, '..', p)
const suf = Object.fromEntries(LANG_REG.completeCodes().map(c => [c, LANG_REG.docSuffix(c)]))

test('frische Installation legt carla (ciso) und dana (dso) als getrennte Content Owner an', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbac-'))
  const old = process.env.DATA_DIR
  jest.isolateModules(() => {
    process.env.DATA_DIR = dir
    const rbac = require('../server/rbacStore')
    expect(rbac.getUserByUsername('carla')).toMatchObject({ role: 'contentowner', email: 'carla@security.example', functions: ['ciso'] })
    expect(rbac.getUserByUsername('dana')).toMatchObject({ role: 'contentowner', email: 'dana@privacy.example', functions: ['dso'] })
    expect(rbac.getUserByUsername('alice')).toBeTruthy(); expect(rbac.getUserByUsername('bob')).toBeTruthy()
    process.env.DATA_DIR = old
  })
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('mit geladenem Demo-Bundle', () => {
  let dataDir, app, admin, carla, dana
  const login = async (username, password) => {
    const res = await request(app).post('/login').send({ username, password })
    expect(res.status).toBe(200)
    return res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')
  }
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-demoaccounts'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin')
    expect((await authedPost(app, admin, '/admin/demo-load-bundle', { lang: 'en' })).status).toBe(200)
    carla = await login('carla', 'carlapass'); dana = await login('dana', 'danapass')
  })
  afterAll(() => removeTestDataDir(dataDir))

  test('das Demo-Bundle legt beide Konten an; keines ist Administrator', async () => {
    const users = (await authedGet(app, admin, '/admin/users')).body
    expect(users.find(u => u.username === 'carla')).toMatchObject({ role: 'contentowner', functions: ['ciso'] })
    expect(users.find(u => u.username === 'dana')).toMatchObject({ role: 'contentowner', functions: ['dso'] })
    expect((await authedGet(app, carla, '/admin/users')).status).toBe(403)
    expect((await authedGet(app, dana, '/admin/users')).status).toBe(403)
  })

  test('Prüfablauf mit getrennten Personen: CISO bereitet vor, DSB trägt die Stellungnahme ein, CISO gibt frei', async () => {
    const created = await authedPost(app, carla, '/gdpr/dsfa', { title: 'DSFA Demo', risks: [] })
    expect(created.status).toBe(201)
    const id = created.body.id
    // der CISO darf die Stellungnahme nicht eintragen
    const denied = await authedPut(app, carla, `/gdpr/dsfa/${id}`, { dpoConsulted: true, dpoOpinion: 'Vom CISO geschrieben' })
    expect(denied.status).toBe(403); expect(denied.body.code).toBe('dpo_only')
    // ohne Stellungnahme keine Freigabe
    expect((await authedPut(app, carla, `/gdpr/dsfa/${id}`, { status: 'approved', decision: 'proceed' })).body.code).toBe('dpo_opinion_missing')
    // der DSB trägt sie ein (Person und Datum vom Server)
    const op = await authedPut(app, dana, `/gdpr/dsfa/${id}`, { dpoConsulted: true, dpoOpinion: 'Maßnahmen sind ausreichend.' })
    expect(op.status).toBe(200); expect(op.body.dpoOpinionBy).toBe('dana'); expect(op.body.dpoOpinionAt).toBeTruthy()
    // jetzt gibt der CISO frei
    const approved = await authedPut(app, carla, `/gdpr/dsfa/${id}`, { status: 'approved', decision: 'proceed' })
    expect(approved.status).toBe(200)
    expect(approved.body).toMatchObject({ status: 'approved', approvedBy: 'carla', dpoOpinionBy: 'dana' })
  })
})

test('die Demo-Dokumentation nennt beide Konten: Demo-Leitfaden (fünf Sprachen), ISMS-Doku, README, DSFA-Leitfäden, Demo-Bundle', () => {
  const guidance = fs.readFileSync(root('server/db/guidanceStore.js'), 'utf8')
  for (const a of ['carla@security.example', 'dana@privacy.example']) expect((guidance.match(new RegExp(a.replace('.', '\\.'), 'g')) || []).length).toBeGreaterThanOrEqual(7)   // vier Sprachen: Tabelle + Schrittliste
  const files = ['server/db/guidance-hu/demo.md', 'docs/ISMS-build-documentation.md', 'README.md', ...Object.values(suf).map(s => `docs/module-dsfa${s}.md`)]
  const bundle = fs.readFileSync(root('data/demo-bundles/en.json'), 'utf8')   // Artikel „Demo Mode“: Tabelle ohne E-Mail-Spalte
  expect(bundle).toContain('| carla    | carlapass'); expect(bundle).toContain('| dana     | danapass')
  for (const f of files) { const t = fs.readFileSync(root(f), 'utf8'); expect([f, t.includes('carla@security.example')]).toEqual([f, true]); expect([f, t.includes('dana@privacy.example')]).toEqual([f, true]) }
})

test('die README führt alle fünf Demo-Konten in einer Tabelle auf', () => {
  const readme = fs.readFileSync(root('README.md'), 'utf8')
  expect(readme).toContain('### Demo accounts')
  for (const row of ['| admin | `admin@example.com` | `adminpass`', '| alice | `alice@it.example` | `alicepass`', '| bob | `bob@hr.example` | `bobpass`', '| carla | `carla@security.example` | `carlapass`', '| dana | `dana@privacy.example` | `danapass`']) expect(readme).toContain(row)
})

test('der Demo-Artikel in der Guidance wird bei bestehenden Instanzen auf den aktuellen Text gebracht (zeigt alle fünf Konten)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demodoc-'))
  const old = process.env.DATA_DIR
  fs.writeFileSync(path.join(dir, '.demo_lang_set'), JSON.stringify({ lang: 'de' }))
  fs.writeFileSync(path.join(dir, 'guidance.json'), JSON.stringify([{ id: 'guid_demo_overview', seedId: 'seed_demo_overview', seedLang: 'de', category: 'systemhandbuch', type: 'markdown', title: 'Demo-Betrieb – alt', content: '| alice | alicepass |\n| bob | bobpass |', createdAt: 'x', updatedAt: 'x', deletedAt: null }]))
  jest.isolateModules(() => {
    process.env.DATA_DIR = dir
    const store = require('../server/db/guidanceStore')
    store.seedDemoDoc()
    const doc = JSON.parse(fs.readFileSync(path.join(dir, 'guidance.json'), 'utf8')).find(d => d.id === 'guid_demo_overview')
    for (const who of ['alice@it.example', 'bob@hr.example', 'carla@security.example', 'dana@privacy.example']) expect(doc.content).toContain(who)
    expect(doc.title).not.toContain('alt')
    process.env.DATA_DIR = old
  })
  fs.rmSync(dir, { recursive: true, force: true })
})
