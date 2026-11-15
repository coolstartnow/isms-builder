'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Demo-Reset und Demo-Import ohne Neustart und ohne Backend-Wechsel (beta.13): Die Speicher im Prozess lesen ihre Daten neu ein, das
// Speicher-Backend und die .env bleiben unverändert (der Mobile-Sync läuft nur mit STORAGE_BACKEND=json).
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')

const ROOT = path.join(__dirname, '..')
const ENV_FILE = path.join(ROOT, '.env')
const envHash = () => fs.existsSync(ENV_FILE) ? crypto.createHash('sha256').update(fs.readFileSync(ENV_FILE)).digest('hex') : 'keine'

describe('Demo-Reset und Demo-Import: Speicher werden im Prozess neu geladen', () => {
  let dataDir, app, admin, envBefore
  jest.setTimeout(120000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-secret-demoresetreload-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    app = require('../server/index.js')
    await app.bootstrap?.()
    admin = await loginAs(app, 'admin')
    envBefore = envHash()
  })
  afterAll(() => removeTestDataDir(dataDir))

  const asAdmin = async () => {   // nach dem Reset: Anfangspasswort mit Wechselpflicht → neues Passwort → Sitzung
    const l = await request(app).post('/login').send({ username: 'admin', password: 'adminpass' })
    expect([l.status, l.body.mustChangePassword]).toEqual([200, true])
    const cookie = l.headers['set-cookie'][0].split(';')[0]
    expect((await request(app).put('/me/password').set('Cookie', cookie).send({ currentPassword: 'adminpass', newPassword: 'Ein-Neues-Passwort-77' })).status).toBe(200)
    return cookie
  }
  const list = (cookie, u) => request(app).get(u).set('Cookie', cookie)

  test('Reset: kein Backend-Wechsel, .env unverändert, Altdaten verschwinden sofort und kehren nicht zurück; Import macht Daten sofort sichtbar', async () => {
    for (const title of ['Reset-Dokument A', 'Reset-Dokument B']) {
      const r = await request(app).post('/template').set('Cookie', admin).send({ type: 'Policy', language: 'de', title, content: 'x' })
      expect(r.status).toBe(201)
    }
    expect((await request(app).post('/risks').set('Cookie', admin).send({ title: 'Reset-Risiko', probability: 2, impact: 2 })).status).toBe(201)
    expect((await list(admin, '/templates')).body.length).toBe(2)

    const reset = await request(app).post('/admin/demo-reset').set('Cookie', admin).set('X-Guide-Read', '1').send()
    expect(reset.status).toBe(200)
    expect(reset.headers['x-restart-required']).toBeUndefined()
    expect(reset.headers['x-env-switched']).toBeUndefined()
    const bundle = reset.body
    expect(Object.keys(bundle.files['templates.json']).length).toBe(2)         // der Export enthält den Stand vor dem Löschen
    expect(envHash()).toBe(envBefore)                                          // die .env des Projekts wurde nicht angefasst
    expect(fs.existsSync(path.join(dataDir, 'isms.db'))).toBe(false)           // kein SQLite angelegt

    // ohne Neustart: leer, und neue Einträge schreiben nicht den Altstand zurück
    expect((await request(app).get('/templates').set('Cookie', admin)).status).toBe(401)   // alte Sitzung beendet
    const c = await asAdmin()
    expect((await list(c, '/templates')).body).toEqual([])
    expect((await list(c, '/risks')).body).toEqual([])
    const one = await request(app).post('/template').set('Cookie', c).send({ type: 'Policy', language: 'de', title: 'Nach dem Reset', content: 'y' })
    expect(one.status).toBe(201)
    const onDisk = JSON.parse(fs.readFileSync(path.join(dataDir, 'templates.json'), 'utf8'))
    expect(onDisk.map(t => t.title)).toEqual(['Nach dem Reset'])               // kein Wiederaufleben der alten Dokumente

    // Audit-Eintrag mit Hinweis auf die bestätigte Anleitung (nach dem Leeren angehängt)
    const audit = (await list(c, '/admin/audit-log?action=demo_reset')).body
    expect(JSON.stringify(audit)).toMatch(/Anleitung zum Produktivbetrieb angezeigt und bestätigt/)
    expect(JSON.stringify(audit)).toMatch(/Speicher-Backend unverändert/)

    // Demo-Import: Daten sofort sichtbar (ohne Neustart)
    const imp = await request(app).post('/admin/demo-import').set('Cookie', c).send(bundle)
    expect(imp.status).toBe(200)
    expect((await list(c, '/templates')).body.map(t => t.title).sort()).toEqual(['Reset-Dokument A', 'Reset-Dokument B'])
    expect((await list(c, '/risks')).body.length).toBe(1)
    // Der Import ist der Weg zurück in die Demo: Markierung weg, Demo-Konten mit ihren öffentlichen Passwörtern können sich anmelden
    expect(fs.existsSync(path.join(dataDir, '.production'))).toBe(false)
    expect((await request(app).post('/login').send({ username: 'alice', password: 'alicepass' })).status).toBe(200)
  })

  test('Reset ohne Bestätigungs-Header vermerkt „nicht bestätigt“; bei anderem Backend lehnt der Server mit 409 ab (statisch)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server/routes/admin.js'), 'utf8')
    expect(src).toMatch(/Demo reset is only available with STORAGE_BACKEND=json/)
    const reset = src.slice(src.indexOf("router.post('/admin/demo-reset'"), src.indexOf("// ── Demo-Import ──"))
    expect(reset).not.toMatch(/STORAGE_BACKEND=sqlite/)
    expect(reset).not.toMatch(/envFile|'[^']*\.env'/)                                           // der Reset schreibt nie in die .env
    expect(reset).not.toMatch(/isms\.db/)
    expect(src).toMatch(/Anleitung nicht bestätigt \(direkter API-Aufruf\)/)
  })

  test('die Oberfläche kennt keinen „Neustart nötig“-Zweig mehr nach dem Reset', () => {
    const app_ = fs.readFileSync(path.join(ROOT, 'ui/app.js'), 'utf8')
    const fn = app_.slice(app_.indexOf('async function triggerDemoReset()'), app_.indexOf('async function triggerDemoImport'))
    expect(fn).not.toMatch(/restartRequired|X-Restart-Required|X-Env-Switched/)
  })
})
