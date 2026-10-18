'use strict'
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie, auditorCookie

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

  adminCookie   = await loginAs(app, 'admin')
  editorCookie  = await loginAs(app, 'editor')
  readerCookie  = await loginAs(app, 'reader')
  auditorCookie = await loginAs(app, 'auditor')
})

afterAll(() => { removeTestDataDir(dataDir) })

const push = (cookie, changes, protocolVersion = 1) =>
  authedPost(app, cookie, '/sync/push', { protocolVersion, changes })

describe('Mobile-Sync', () => {
  test('/api/version nennt das Sync-Protokoll', async () => {
    const res = await require('supertest')(app).get('/api/version')
    expect(res.body.syncProtocol).toBe(1)
  })

  test('Pull ohne Login → 401', async () => {
    const res = await require('supertest')(app).get('/sync/pull')
    expect(res.status).toBe(401)
  })

  test('Pull liefert alle Module mit Servierzeit', async () => {
    const res = await authedGet(app, readerCookie, '/sync/pull')
    expect(res.status).toBe(200)
    expect(res.body.protocolVersion).toBe(1)
    expect(Object.keys(res.body.modules).sort()).toEqual(['assets', 'findings', 'guidance', 'risks', 'soa', 'templates'])
    expect(Number.isNaN(Date.parse(res.body.serverTime))).toBe(false)
  })

  test('Pull mit unbekanntem Modul / ungültigem since → 400', async () => {
    expect((await authedGet(app, readerCookie, '/sync/pull?modules=gdpr')).status).toBe(400)
    expect((await authedGet(app, readerCookie, '/sync/pull?since=gestern')).status).toBe(400)
  })

  test('Push: neuer Datensatz behält die Client-ID und bekommt Serverzeit', async () => {
    const res = await push(auditorCookie, { risks: [{ id: 'risk_mobile_1', title: 'Handy-Risiko', probability: 2, impact: 3, status: 'open', updatedAt: '1999-01-01T00:00:00.000Z' }] })
    expect(res.status).toBe(200)
    const acc = res.body.accepted.risks[0]
    expect(acc.id).toBe('risk_mobile_1')
    expect(acc.updatedAt > '2000').toBe(true) // Client-Zeit wird überschrieben
    const pull = await authedGet(app, readerCookie, '/sync/pull?modules=risks')
    expect(pull.body.modules.risks.some(r => r.id === 'risk_mobile_1')).toBe(true)
  })

  test('Delta-Pull: since filtert ältere Datensätze', async () => {
    const future = new Date(Date.now() + 60000).toISOString()
    const res = await authedGet(app, readerCookie, `/sync/pull?modules=risks&since=${encodeURIComponent(future)}`)
    expect(res.body.modules.risks).toEqual([])
  })

  test('Push: Update mit passendem baseUpdatedAt wird angenommen', async () => {
    const cur = (await authedGet(app, readerCookie, '/sync/pull?modules=risks')).body.modules.risks.find(r => r.id === 'risk_mobile_1')
    const res = await push(auditorCookie, { risks: [{ ...cur, title: 'Geändert', baseUpdatedAt: cur.updatedAt }] })
    expect(res.body.accepted.risks[0].title).toBe('Geändert')
    expect(res.body.conflicts.risks).toEqual([])
    expect(res.body.accepted.risks[0].createdAt).toBe(cur.createdAt)
  })

  test('Push: veraltetes baseUpdatedAt → Konflikt, Serverstand bleibt', async () => {
    const res = await push(auditorCookie, { risks: [{ id: 'risk_mobile_1', title: 'Überschreibversuch', baseUpdatedAt: '2000-01-01T00:00:00.000Z' }] })
    expect(res.body.accepted.risks).toEqual([])
    expect(res.body.conflicts.risks).toHaveLength(1)
    expect(res.body.conflicts.risks[0].server.title).toBe('Geändert')
  })

  test('Push: vorhandene ID ohne baseUpdatedAt → Konflikt', async () => {
    const res = await push(auditorCookie, { risks: [{ id: 'risk_mobile_1', title: 'ohne Basis' }] })
    expect(res.body.conflicts.risks).toHaveLength(1)
  })

  test('Push: Soft-Delete wird als Tombstone gezogen', async () => {
    const cur = (await authedGet(app, readerCookie, '/sync/pull?modules=risks')).body.modules.risks.find(r => r.id === 'risk_mobile_1')
    const del = await push(auditorCookie, { risks: [{ ...cur, deletedAt: 'x', baseUpdatedAt: cur.updatedAt }] })
    expect(del.body.accepted.risks[0].deletedAt).toBeTruthy()
    const pull = await authedGet(app, readerCookie, `/sync/pull?modules=risks&since=${encodeURIComponent(cur.updatedAt)}`)
    expect(pull.body.modules.risks.find(r => r.id === 'risk_mobile_1').deletedAt).toBeTruthy()
  })

  test('SoA (Map-Modul): vorhandene Kontrolle ändern', async () => {
    const soa = (await authedGet(app, readerCookie, '/sync/pull?modules=soa')).body.modules.soa
    expect(soa.length).toBeGreaterThan(0)
    const c = soa[0]
    const res = await push(editorCookie, { soa: [{ ...c, status: 'implemented', baseUpdatedAt: c.updatedAt }] })
    expect(res.body.accepted.soa[0].status).toBe('implemented')
  })

  test('Template-Anhänge bleiben serverseitig erhalten', async () => {
    const t = (await authedGet(app, readerCookie, '/sync/pull?modules=templates')).body.modules.templates[0]
    const res = await push(editorCookie, { templates: [{ ...t, title: 'Neu', attachments: [{ filename: 'evil' }], baseUpdatedAt: changeTimeOf(t) }] })
    expect(res.body.accepted.templates[0].attachments).toEqual(t.attachments || [])
  })

  test('Rollen: reader darf nicht pushen, editor nicht in risks, guidance nur lesbar', async () => {
    expect((await push(readerCookie, { assets: [] })).status).toBe(403)
    const r = await push(editorCookie, { risks: [{ id: 'risk_x', title: 'x' }], guidance: [{ id: 'g_x', title: 'x' }] })
    expect(r.status).toBe(200)
    expect(r.body.rejected.map(x => x.module).sort()).toEqual(['guidance', 'risks'])
  })

  test('Schutz: Prototype-Pollution-IDs und falsches Protokoll', async () => {
    const r = await push(editorCookie, { soa: [{ id: '__proto__', polluted: true }] })
    expect(r.body.rejected).toHaveLength(1)
    expect({}.polluted).toBeUndefined()
    expect((await push(editorCookie, {}, 99)).status).toBe(409)
    expect((await push(editorCookie, { gdpr: [] })).status).toBe(400)
  })
})

function changeTimeOf(r) { return [r.updatedAt, r.deletedAt, r.createdAt].filter(Boolean).sort().pop() }
