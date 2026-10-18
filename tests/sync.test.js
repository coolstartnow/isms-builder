'use strict'
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')

let dataDir, app, accounts, full, readOnly, risksOnly, adminCookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  fs.writeFileSync(path.join(dataDir, 'soa.json'), JSON.stringify({
    'BSI-ISMS.1': { id: 'BSI-ISMS.1', framework: 'BSI', title: 'Sicherheitsmanagement', status: 'not_started', updatedAt: '2026-01-01T00:00:00.000Z' },
  }))
  fs.writeFileSync(path.join(dataDir, 'templates.json'), JSON.stringify([
    { id: 'tpl_1', type: 'policy', title: 'Alt', attachments: [{ filename: 'a.pdf' }], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ]))
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-sync'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  accounts = require('../server/db/syncAccountStore')
  adminCookie = await loginAs(app, 'admin')

  const key = (name, permissions) => accounts.addDevice(accounts.create({ name, permissions }, 'test').id, 'Testgerät').token
  const all = { templates: 'write', soa: 'write', risks: 'write', assets: 'write', findings: 'write', guidance: 'read' }
  full      = key('Voll', all)
  readOnly  = key('Nur lesen', { templates: 'read', soa: 'read', risks: 'read', assets: 'read', findings: 'read', guidance: 'read' })
  risksOnly = key('Nur Risiken', { risks: 'write' })
})

afterAll(() => { removeTestDataDir(dataDir) })

const get  = (token, url) => request(app).get(url).set('Authorization', `Bearer ${token}`)
const push = (token, changes, protocolVersion = 1) =>
  request(app).post('/sync/push').set('Authorization', `Bearer ${token}`).send({ protocolVersion, changes })

describe('Mobile-Sync: Zugang', () => {
  test('/api/version nennt das Sync-Protokoll', async () => {
    const res = await request(app).get('/api/version')
    expect(res.body.syncProtocol).toBe(1)
  })

  test('ohne Schlüssel, mit falschem Schlüssel und mit Benutzer-Sitzung → 401', async () => {
    expect((await request(app).get('/sync/pull')).status).toBe(401)
    expect((await get('ISMS-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA', '/sync/pull')).status).toBe(401)
    expect((await get('kein-schluessel', '/sync/pull')).status).toBe(401)
    // Ein angemeldeter Admin darf den Sync NICHT über seine Sitzung nutzen
    expect((await request(app).get('/sync/pull').set('Cookie', adminCookie)).status).toBe(401)
  })

  test('/sync/me liefert Name und Rechte', async () => {
    const res = await get(full, '/sync/me')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Voll')
    expect(res.body.device).toBe('Testgerät')
    expect(res.body.permissions.guidance).toBe('read')
    expect(res.body.protocolVersion).toBe(1)
  })

  test('Schlüssel wird tolerant gelesen (Kleinschreibung, ohne Bindestriche)', async () => {
    const loose = full.toLowerCase().replace(/-/g, ' ')
    expect((await get(loose, '/sync/me')).status).toBe(200)
  })
})

describe('Mobile-Sync: Pull', () => {
  test('liefert nur die erlaubten Module, mit Serverzeit', async () => {
    const res = await get(risksOnly, '/sync/pull')
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.modules)).toEqual(['risks'])
    expect(Number.isNaN(Date.parse(res.body.serverTime))).toBe(false)
  })

  test('ausdrücklich angefragtes, nicht erlaubtes Modul steht unter denied', async () => {
    const res = await get(risksOnly, '/sync/pull?modules=risks,soa')
    expect(res.body.denied).toEqual(['soa'])
    expect(res.body.modules.soa).toBeUndefined()
  })

  test('alle Module bei vollem Zugang', async () => {
    const res = await get(full, '/sync/pull')
    expect(Object.keys(res.body.modules).sort()).toEqual(['assets', 'findings', 'guidance', 'risks', 'soa', 'templates'])
  })

  test('unbekanntes Modul / ungültiges since → 400', async () => {
    expect((await get(full, '/sync/pull?modules=gdpr')).status).toBe(400)
    expect((await get(full, '/sync/pull?since=gestern')).status).toBe(400)
  })

  test('Delta: since filtert ältere Datensätze', async () => {
    const future = new Date(Date.now() + 60000).toISOString()
    const res = await get(full, `/sync/pull?modules=risks&since=${encodeURIComponent(future)}`)
    expect(res.body.modules.risks).toEqual([])
  })
})

describe('Mobile-Sync: Push', () => {
  test('neuer Datensatz behält die Client-ID, bekommt Serverzeit und den Namen des Kontos', async () => {
    const res = await push(full, { risks: [{ id: 'risk_mobile_1', title: 'Handy-Risiko', probability: 2, impact: 3, status: 'open', updatedAt: '1999-01-01T00:00:00.000Z' }] })
    expect(res.status).toBe(200)
    const acc = res.body.accepted.risks[0]
    expect(acc.id).toBe('risk_mobile_1')
    expect(acc.updatedAt > '2000').toBe(true)
    expect(acc.createdBy).toBe('sync:Voll')
  })

  test('Update mit passendem baseUpdatedAt wird angenommen', async () => {
    const cur = (await get(full, '/sync/pull?modules=risks')).body.modules.risks.find(r => r.id === 'risk_mobile_1')
    const res = await push(full, { risks: [{ ...cur, title: 'Geändert', baseUpdatedAt: cur.updatedAt }] })
    expect(res.body.accepted.risks[0].title).toBe('Geändert')
    expect(res.body.conflicts.risks).toEqual([])
    expect(res.body.accepted.risks[0].createdAt).toBe(cur.createdAt)
  })

  test('veraltetes baseUpdatedAt oder fehlende Basis → Konflikt, Serverstand bleibt', async () => {
    const a = await push(full, { risks: [{ id: 'risk_mobile_1', title: 'Überschreibversuch', baseUpdatedAt: '2000-01-01T00:00:00.000Z' }] })
    expect(a.body.accepted.risks).toEqual([])
    expect(a.body.conflicts.risks[0].server.title).toBe('Geändert')
    const b = await push(full, { risks: [{ id: 'risk_mobile_1', title: 'ohne Basis' }] })
    expect(b.body.conflicts.risks).toHaveLength(1)
  })

  test('Soft-Delete wird als Tombstone gezogen', async () => {
    const cur = (await get(full, '/sync/pull?modules=risks')).body.modules.risks.find(r => r.id === 'risk_mobile_1')
    const del = await push(full, { risks: [{ ...cur, deletedAt: 'x', baseUpdatedAt: cur.updatedAt }] })
    expect(del.body.accepted.risks[0].deletedAt).toBeTruthy()
    const pull = await get(full, `/sync/pull?modules=risks&since=${encodeURIComponent(cur.updatedAt)}`)
    expect(pull.body.modules.risks.find(r => r.id === 'risk_mobile_1').deletedAt).toBeTruthy()
  })

  test('SoA (Map-Modul): vorhandene Kontrolle ändern', async () => {
    const c = (await get(full, '/sync/pull?modules=soa')).body.modules.soa[0]
    const res = await push(full, { soa: [{ ...c, status: 'implemented', baseUpdatedAt: c.updatedAt }] })
    expect(res.body.accepted.soa[0].status).toBe('implemented')
  })

  test('Template-Anhänge bleiben serverseitig erhalten', async () => {
    const t = (await get(full, '/sync/pull?modules=templates')).body.modules.templates[0]
    const res = await push(full, { templates: [{ ...t, title: 'Neu', attachments: [{ filename: 'evil' }], baseUpdatedAt: [t.updatedAt, t.deletedAt, t.createdAt].filter(Boolean).sort().pop() }] })
    expect(res.body.accepted.templates[0].attachments).toEqual(t.attachments || [])
  })

  test('großer Push (über 100 kB) wird nicht vom globalen Body-Limit abgewiesen', async () => {
    const big = 'x'.repeat(300 * 1024)
    const res = await push(full, { risks: [{ id: 'risk_big', title: 'Groß', description: big }] })
    expect(res.status).toBe(200)
    expect(res.body.accepted.risks).toHaveLength(1)
  })

  test('Rechte je Modul: nur lesen / nur Risiken / Guidance nie schreibbar', async () => {
    const ro = await push(readOnly, { risks: [{ id: 'risk_x', title: 'x' }] })
    expect(ro.status).toBe(200)
    expect(ro.body.rejected.map(r => r.module)).toEqual(['risks'])
    const mixed = await push(risksOnly, { risks: [{ id: 'risk_ok', title: 'ok' }], assets: [{ id: 'asset_x', name: 'x' }], guidance: [{ id: 'g_x', title: 'x' }] })
    expect(mixed.body.accepted.risks).toHaveLength(1)
    expect(mixed.body.rejected.map(r => r.module).sort()).toEqual(['assets', 'guidance'])
  })

  test('Schutz: Prototype-Pollution-IDs, falsches Protokoll, unbekanntes Modul', async () => {
    const r = await push(full, { soa: [{ id: '__proto__', polluted: true }] })
    expect(r.body.rejected).toHaveLength(1)
    expect({}.polluted).toBeUndefined()
    expect((await push(full, {}, 99)).status).toBe(409)
    expect((await push(full, { gdpr: [] })).status).toBe(400)
  })

  test('Audit-Log nennt das Sync-Konto', async () => {
    const log = JSON.parse(fs.readFileSync(path.join(dataDir, 'audit-log.json'), 'utf8'))
    expect(log.some(e => e.action === 'sync' && e.user === 'sync:Voll')).toBe(true)
  })
})
