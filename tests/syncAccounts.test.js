'use strict'
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, admin, editor, reader, store
const perms = { risks: 'write', soa: 'read' }
const URL_ = 'https://isms.example.org:3000'

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-sync-accounts'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  store = require('../server/db/syncAccountStore')
  admin  = await loginAs(app, 'admin')
  editor = await loginAs(app, 'editor')
  reader = await loginAs(app, 'reader')
})
afterAll(() => { removeTestDataDir(dataDir) })
beforeEach(() => require('../server/loginThrottle')._resetAll())

const syncMe = token => request(app).get('/sync/me').set('Authorization', `Bearer ${token}`)
const create = (body, cookie = admin) => authedPost(app, cookie, '/admin/sync-accounts', body)
const enroll = (id, serverUrl = URL_) => authedPost(app, admin, `/admin/sync-accounts/${id}/enrollment`, { serverUrl })
const redeem = (code, deviceName) => request(app).post('/sync/enroll').send({ code, deviceName })
async function accountWithKey(name, p = perms) {
  const c = await create({ name, permissions: p })
  const d = await authedPost(app, admin, `/admin/sync-accounts/${c.body.account.id}/devices`, { name: 'Skript' })
  return { id: c.body.account.id, token: d.body.token, device: d.body.device }
}

describe('Sync-Konten: Verwaltung', () => {
  test('nur Administratoren', async () => {
    expect((await authedGet(app, editor, '/admin/sync-accounts')).status).toBe(403)
    expect((await create({ name: 'x', permissions: perms }, reader)).status).toBe(403)
    expect((await request(app).get('/admin/sync-accounts')).status).toBe(401)
    expect((await authedPost(app, editor, '/admin/sync-accounts/x/enrollment', { serverUrl: URL_ })).status).toBe(403)
    expect((await authedPost(app, reader, '/admin/sync-accounts/x/devices', {})).status).toBe(403)
  })

  test('anlegen: noch ohne Gerät und ohne Schlüssel', async () => {
    const res = await create({ name: 'CISO', permissions: perms })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeUndefined()
    expect(res.body.account.devices).toEqual([])
    expect(res.body.account.permissions).toEqual({ templates: 'none', soa: 'read', risks: 'write', assets: 'none', findings: 'none', guidance: 'none' })
    expect(res.body.account.active).toBe(true)
  })

  test('Prüfung der Eingaben', async () => {
    expect((await create({ name: '', permissions: perms })).status).toBe(400)
    expect((await create({ name: 'CISO', permissions: perms })).status).toBe(409)           // Name vergeben
    expect((await create({ name: 'ciso', permissions: perms })).status).toBe(409)           // Groß-/Kleinschreibung
    expect((await create({ name: 'B', permissions: { gdpr: 'write' } })).status).toBe(400)  // unbekanntes Modul
    expect((await create({ name: 'C', permissions: { risks: 'admin' } })).status).toBe(400) // unbekannte Stufe
    expect((await create({ name: 'D', permissions: { risks: 'none' } })).status).toBe(400)  // kein Modul freigegeben
    expect((await create({ name: 'E', permissions: perms, expiresAt: '2001-01-01' })).status).toBe(400)
    expect((await create({ name: 'F', permissions: perms, expiresAt: 'bald' })).status).toBe(400)
  })

  test('Guidance bleibt auch bei „write“ nur lesbar', async () => {
    const r = await create({ name: 'Guidance', permissions: { guidance: 'write' } })
    expect(r.body.account.permissions.guidance).toBe('read')
  })

  test('ändern: umbenennen, Rechte, sperren und wieder freigeben', async () => {
    const a = await accountWithKey('Wechsel')
    const r1 = await authedPut(app, admin, `/admin/sync-accounts/${a.id}`, { name: 'Wechsel neu', permissions: { assets: 'read' } })
    expect(r1.body.name).toBe('Wechsel neu'); expect(r1.body.permissions.assets).toBe('read'); expect(r1.body.permissions.risks).toBe('none')
    expect((await syncMe(a.token)).body.permissions.assets).toBe('read')
    await authedPut(app, admin, `/admin/sync-accounts/${a.id}`, { active: false })
    const off = await syncMe(a.token)
    expect(off.status).toBe(401); expect(off.body.reason).toBe('inactive')
    await authedPut(app, admin, `/admin/sync-accounts/${a.id}`, { active: true })
    expect((await syncMe(a.token)).status).toBe(200)
    expect((await authedPut(app, admin, '/admin/sync-accounts/gibtsnicht', { name: 'x' })).status).toBe(404)
  })

  test('abgelaufener Zugang wird abgewiesen', async () => {
    const a = await accountWithKey('Befristet')
    await authedPut(app, admin, `/admin/sync-accounts/${a.id}`, { expiresAt: '2001-01-01T00:00:00Z' })
    const r = await syncMe(a.token)
    expect(r.status).toBe(401); expect(r.body.reason).toBe('expired')
  })

  test('löschen entzieht allen Geräten den Zugang', async () => {
    const a = await accountWithKey('Weg')
    expect((await authedDelete(app, admin, `/admin/sync-accounts/${a.id}`)).status).toBe(200)
    expect((await syncMe(a.token)).status).toBe(401)
    expect((await authedDelete(app, admin, `/admin/sync-accounts/${a.id}`)).status).toBe(404)
  })
})

describe('Geräte und Einrichtung per QR-Code', () => {
  test('Einrichtungscode: Format, QR-Code, Inhalt, Gültigkeit', async () => {
    const a = await accountWithKey('Einrichtung')
    const r = await enroll(a.id)
    expect(r.status).toBe(200)
    expect(r.body.code).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){2}$/)
    expect(r.body.qr).toMatch(/^data:image\/png;base64,/)
    expect(r.body.payload).toBe(`isms-sync://enroll?u=${encodeURIComponent(URL_)}&c=${r.body.code}`)
    const ttl = Date.parse(r.body.expiresAt) - Date.now()
    expect(ttl).toBeGreaterThan(14 * 60 * 1000); expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000)
    expect((await enroll(a.id, 'kein-url')).status).toBe(400)
    expect((await enroll('gibtsnicht')).status).toBe(404)
  })

  test('App löst den Code ein und bekommt Schlüssel, Rechte und Kontoname', async () => {
    const c = await create({ name: 'DSB', permissions: { risks: 'read', findings: 'write' } })
    const e = await enroll(c.body.account.id)
    const r = await redeem(e.body.code.toLowerCase().replace(/-/g, ' '), 'Honor 10')
    expect(r.status).toBe(200)
    expect(r.body.key).toMatch(/^ISMS(-[A-Z0-9]{4}){8}$/)
    expect(r.body.account).toMatchObject({ name: 'DSB', permissions: expect.objectContaining({ risks: 'read', findings: 'write' }) })
    expect(r.body.device.name).toBe('Honor 10')
    const me = await syncMe(r.body.key)
    expect(me.status).toBe(200); expect(me.body.name).toBe('DSB'); expect(me.body.device).toBe('Honor 10')
  })

  test('der Code gilt nur einmal; ein neuer Code macht den alten ungültig', async () => {
    const c = await create({ name: 'Einmalig', permissions: perms }); const id = c.body.account.id
    const e1 = await enroll(id)
    expect((await redeem(e1.body.code, 'A')).status).toBe(200)
    expect((await redeem(e1.body.code, 'B')).status).toBe(401)           // schon eingelöst
    const e2 = await enroll(id), e3 = await enroll(id)
    expect((await redeem(e2.body.code, 'C')).status).toBe(401)           // durch e3 ersetzt
    expect((await redeem(e3.body.code, 'D')).status).toBe(200)
  })

  test('abgelaufener, falscher oder gesperrter Zugang wird abgewiesen', async () => {
    const c = await create({ name: 'Abgelaufen', permissions: perms }); const id = c.body.account.id
    const e = await enroll(id)
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'sync-accounts.json'), 'utf8'))
    raw.find(a => a.id === id).enrollment.expiresAt = new Date(Date.now() - 1000).toISOString()
    fs.writeFileSync(path.join(dataDir, 'sync-accounts.json'), JSON.stringify(raw))
    const late = await redeem(e.body.code, 'X'); expect(late.status).toBe(401); expect(late.body.reason).toBe('invalid')
    expect((await redeem('AAAA-AAAA-AAAA', 'X')).status).toBe(401)
    expect((await redeem('zu kurz', 'X')).status).toBe(401)

    require('../server/loginThrottle')._resetAll()   // die Fehlversuche oben haben die Bremse ausgelöst
    const e2 = await enroll(id)
    await authedPut(app, admin, `/admin/sync-accounts/${id}`, { active: false })
    const off = await redeem(e2.body.code, 'X'); expect(off.status).toBe(401); expect(off.body.reason).toBe('inactive')
  })

  test('falsche Codes werden ausgebremst (429)', async () => {
    let last
    for (let i = 0; i < 5; i++) last = await redeem('AAAA-AAAA-AAAA', 'X')
    expect(last.status).toBe(429)
  })

  test('mehrere Geräte je Konto; ein Gerät lässt sich einzeln sperren', async () => {
    const c = await create({ name: 'Zwei Geräte', permissions: perms }); const id = c.body.account.id
    const k1 = (await redeem((await enroll(id)).body.code, 'Handy')).body
    const k2 = (await redeem((await enroll(id)).body.code, 'Tablet')).body
    expect((await syncMe(k1.key)).status).toBe(200); expect((await syncMe(k2.key)).status).toBe(200)
    const list = (await authedGet(app, admin, '/admin/sync-accounts')).body.find(a => a.id === id)
    expect(list.devices.map(d => d.name).sort()).toEqual(['Handy', 'Tablet'])
    expect(list.lastUsedAt).toBeTruthy()
    expect(JSON.stringify(list)).not.toMatch(/tokenHash|codeHash|ISMS-[A-Z0-9]{4}-/)

    const del = await authedDelete(app, admin, `/admin/sync-accounts/${id}/devices/${k1.device.id}`)
    expect(del.status).toBe(200); expect(del.body.devices.map(d => d.name)).toEqual(['Tablet'])
    expect((await syncMe(k1.key)).status).toBe(401)      // Handy gesperrt
    expect((await syncMe(k2.key)).status).toBe(200)      // Tablet läuft weiter
    expect((await authedDelete(app, admin, `/admin/sync-accounts/${id}/devices/gibtsnicht`)).status).toBe(404)
  })

  test('Geräteschlüssel für Skripte: einmal sichtbar, nie im Klartext gespeichert', async () => {
    const c = await create({ name: 'Skriptkonto', permissions: perms })
    const d = await authedPost(app, admin, `/admin/sync-accounts/${c.body.account.id}/devices`, { name: 'Import-Skript' })
    expect(d.status).toBe(201); expect(d.body.token).toMatch(/^ISMS(-[A-Z0-9]{4}){8}$/)
    const raw = fs.readFileSync(path.join(dataDir, 'sync-accounts.json'), 'utf8')
    expect(raw).not.toContain(d.body.token)
    expect(raw).not.toContain(d.body.token.replace(/-/g, '').slice(4))
    expect((await syncMe(d.body.token)).status).toBe(200)
  })

  test('falsche Schlüssel werden ausgebremst (429), richtige setzen die Bremse zurück', async () => {
    const a = await accountWithKey('Bremse')
    const wrong = a.token.slice(0, 10) + 'AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA'   // formal gültig, gleiche Kennung, falscher Rest
    let last
    for (let i = 0; i < 4; i++) last = await syncMe(wrong)
    expect(last.status).toBe(429); expect(last.headers['retry-after']).toBeDefined()
    require('../server/loginThrottle')._resetAll()
    expect((await syncMe(a.token)).status).toBe(200)
  })

  test('Audit-Log: Verwaltung und Einrichtung werden protokolliert, Schlüssel und Codes nie', async () => {
    const log = fs.readFileSync(path.join(dataDir, 'audit-log.json'), 'utf8')
    expect(log).toMatch(/sync-account/); expect(log).toMatch(/enrollment-start/); expect(log).toMatch(/Gerät eingerichtet/)
    expect(log).not.toMatch(/ISMS-[A-Z0-9]{4}-/)
    // Einrichtungscode „XXXX-XXXX-XXXX“ als eigenständiges Token. Die Randprüfung verhindert Zufallstreffer in UUIDs
    // (deren mittlere Vierergruppen sind bei rund 0,4 % der UUIDs rein numerisch, z. B. 9548-4448-9632).
    const CODE = /(?<![A-Za-z0-9-])[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}(?![A-Za-z0-9-])/
    expect(log).not.toMatch(CODE)
    expect('1566256d-9548-4448-9632-552485566194').not.toMatch(CODE)   // UUID mit rein numerischer Mitte: kein Treffer
    expect('Code ABCD-1234-WXYZ ').toMatch(CODE)                         // echter Code: Treffer
  })
})
