'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gespeichertes XSS (GHSA-m8g6-pq5j-2r9r, Nachtrag 1.81.2): Texte aus dem Redaktionssystem dürfen auf der öffentlichen
// Bestätigungsseite (ohne Login erreichbar) und in der E-Mail-Zusammenfassung nie als HTML oder Skript wirken.
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const ROOT = path.join(__dirname, '..')

let app, dataDir
beforeAll(() => {
  dataDir = createTestDataDir()
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-xss-public-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  app = require('../server/index')
})
afterAll(() => removeTestDataDir(dataDir))

const login = (email, password) => request(app).post('/login').send({ email, password }).then(r => r.headers['set-cookie'])

describe('öffentliche Bestätigungsseite /ack/:token', () => {
  const EVIL = '</script><script>window.__pwned=1</script><img src=x onerror=window.__pwned=1>'
  test('Dokumentinhalt, Titel und Typ verlassen das Skript bzw. die Seite nicht', async () => {
    const admin = await login('admin@test.local', 'adminpass'), co = await login('co@test.local', 'copass')
    const cr = await request(app).post('/template').set('Cookie', admin).send({ type: 'policy', title: EVIL, language: 'de', content: EVIL })
    expect(cr.status).toBeLessThan(300)
    const id = cr.body.id
    for (const status of ['review', 'approved']) await request(app).patch(`/template/policy/${id}/status`).set('Cookie', admin).send({ status })
    await request(app).put('/admin/ack-settings').set('Cookie', admin).send({ policyAckMode: 'email_campaign' })
    const d = await request(app).post('/distributions').set('Cookie', co).send({ templateId: id, targetGroup: 'x', emailList: ['a@test.de'] })
    expect(d.status).toBe(201)
    const token = (await request(app).get(`/distributions/${d.body.id}/acks`).set('Cookie', co)).body[0].token
    const html = (await request(app).get(`/ack/${token}`)).text
    expect(html).not.toContain('</script><script>window.__pwned')           // Inline-Skript nicht verlassen
    expect(html).not.toMatch(/<img src=x onerror/)                           // kein eingeschleustes Element
    expect((html.match(/<script/g) || []).length).toBe(2)                    // nur marked.min.js und das eigene Skript
  })
})

describe('E-Mail-Zusammenfassung', () => {
  test('Titel, Namen und Organisationsname stehen als Text in der Mail', () => {
    const { buildDigest } = require('../server/notifier')
    const evil = '<img src=x onerror=1><b>x</b>'
    const html = buildDigest(evil, [{ heading: evil, items: [{ label: evil, detail: evil }] }])
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;img src=x onerror=1&gt;')
  })
})

describe('statischer Wächter (Server und Oberfläche)', () => {
  const APP = fs.readFileSync(path.join(ROOT, 'ui', 'app.js'), 'utf8')
  const ACK = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'ackPublic.js'), 'utf8')
  test('Inline-Skripte auf Serverseiten nutzen nie rohes JSON.stringify', () => {
    expect(ACK).not.toMatch(/\$\{JSON\.stringify\(/)
  })
  test('onclick enthält nie ein ungeschütztes JSON.stringify des Objekts (Guidance) oder einen Namen in Hochkommas', () => {
    expect(APP).not.toMatch(/onclick="[^"]*\$\{JSON\.stringify\([^)]*\)\.replace\(/)
    expect(APP).not.toMatch(/onclick="adminDeleteUser\('\$\{/)
    expect(APP).not.toMatch(/onclick="submitUserModal\('\$\{isEdit \? user\.username/)
    expect(APP).not.toMatch(/openRiskDetail\('\$\{ev\.riskId\}'\)/)
    expect(APP).not.toMatch(/selectCalDay\('\$\{escHtml\(ev\.date\)\}'\)/)
  })
  test('Verweise aus Daten laufen über safeUrl (kein javascript:)', () => {
    expect(APP).not.toMatch(/href="\$\{escHtml\((p\.url|pub\.shareLink|data\.releaseUrl)\)\}"/)
  })
  test('value/title/placeholder/alt mit eingesetzten Werten sind maskiert (außer Kennungen und feste Beschriftungen)', () => {
    const OK = /escHtml\(|^(escVal|esc|t|window\.t)\(|(\.|^)(id|Id|ID)$|^(sLabel|pri\?\.label|cvssDesc\(info\)|v|g\.key|opt\.val|t\.v)$|^isEdit \? t\(/
    const bad = []
    for (const m of APP.matchAll(/\b(value|title|placeholder|alt)="\$\{([^{}]*)\}"/g)) if (!OK.test(m[2].trim())) bad.push(m[2].trim())
    expect(bad).toEqual([])
  })
  test('Typen-Seitenleiste und Audit-Klassen sind maskiert', () => {
    expect(APP).not.toMatch(/id="tree-\$\{t\}"/)
    expect(APP).not.toMatch(/audit-action-\$\{e\.action\}/)
  })
  test('Ereignisattribute: kein Hochkomma-onclick mit Einsetzung, kein rohes JSON.stringify', () => {
    expect(APP).not.toMatch(/onclick='[^'\n]*\$\{/)
    const bad = [...APP.matchAll(/on[a-z]+="[^"\n]*\$\{JSON\.stringify\((?!String\()/g)].map(m => m[0].slice(0, 80))
    expect(bad).toEqual([])
  })
})
