'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Mobile-Sync: eigene SoA-Gruppen (Modul `soaFrameworks`). Lesen darf, wer SoA lesen darf oder das Recht `soaFrameworks` hat;
// schreiben nur mit `soaFrameworks: write`. Gleiche Prüfungen wie in der Verwaltung; Löschen nur leerer Gruppen, als Löschmarkierung.
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let dataDir, app, accounts, writer, soaWriterOnly, soaReader, noSoa, soaReadFwRead
beforeAll(() => {
  dataDir = createTestDataDir()
  fs.writeFileSync(path.join(dataDir, 'soa.json'), JSON.stringify({
    'NEN-1': { id: 'NEN-1', framework: 'NEN7510', title: 'Erfunden', status: 'not_started', updatedAt: '2026-01-01T00:00:00.000Z' },
  }))
  fs.writeFileSync(path.join(dataDir, 'soa-frameworks.json'), JSON.stringify([
    { id: 'NEN7510', label: 'NEN (Demo)', color: '#0ea5e9', createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'admin' },
  ]))
  process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-sync-fw'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  accounts = require('../server/db/syncAccountStore')
  const key = (name, permissions) => accounts.addDevice(accounts.create({ name, permissions }, 'test').id, 'Testgerät').token
  writer        = key('Gruppen schreiben', { soa: 'write', soaFrameworks: 'write' })
  soaWriterOnly = key('Nur SoA schreiben', { soa: 'write' })
  soaReader     = key('SoA lesen', { soa: 'read' })
  noSoa         = key('Nur Risiken', { risks: 'read' })
  soaReadFwRead = key('Nur Gruppen lesen', { soaFrameworks: 'read' })
})
afterAll(() => removeTestDataDir(dataDir))

const get = (t, url) => request(app).get(url).set('Authorization', `Bearer ${t}`)
const push = (t, rec) => request(app).post('/sync/push').set('Authorization', `Bearer ${t}`).send({ protocolVersion: 2, changes: { soaFrameworks: rec } })
const fileList = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'soa-frameworks.json'), 'utf8'))

describe('Lesen', () => {
  test('SoA-Leserecht genügt, Gruppen-Leserecht auch, ohne beides nichts', async () => {
    expect((await get(soaReader, '/sync/pull')).body.modules.soaFrameworks.map(f => f.id)).toEqual(['NEN7510'])
    expect((await get(soaReadFwRead, '/sync/pull')).body.modules.soaFrameworks.map(f => f.id)).toEqual(['NEN7510'])
    expect((await get(noSoa, '/sync/pull')).body.modules.soaFrameworks).toBeUndefined()
    const r = await get(noSoa, '/sync/pull?modules=soaFrameworks'); expect(r.body.denied).toEqual(['soaFrameworks'])
  })
})

describe('Schreiben', () => {
  test('ohne Gruppen-Schreibrecht abgelehnt (auch mit SoA-Schreibrecht)', async () => {
    for (const t of [soaWriterOnly, soaReader, soaReadFwRead]) {
      const r = await push(t, [{ id: 'NEU1', label: 'x', color: '#112233' }])
      expect(r.status).toBe(200); expect(r.body.rejected[0].reason).toMatch(/Schreibrechte/)
    }
    expect(fileList().map(f => f.id)).toEqual(['NEN7510'])
  })
  test('anlegen, ändern (mit baseUpdatedAt), Konflikt ohne Basis', async () => {
    let r = await push(writer, [{ id: 'GRP1', label: 'Beispielgruppe', color: '#AA00FF' }])
    expect(r.body.accepted.soaFrameworks[0]).toMatchObject({ id: 'GRP1', color: '#aa00ff', createdBy: expect.any(String) })
    const base = r.body.accepted.soaFrameworks[0].updatedAt
    r = await push(writer, [{ id: 'GRP1', label: 'Beispielgruppe 2', color: '#aa00ff', baseUpdatedAt: base }])
    expect(r.body.accepted.soaFrameworks[0].label).toBe('Beispielgruppe 2')
    r = await push(writer, [{ id: 'GRP1', label: 'ohne Basis', color: '#aa00ff' }])
    expect(r.body.conflicts.soaFrameworks).toHaveLength(1)
    expect(fileList().find(f => f.id === 'GRP1').label).toBe('Beispielgruppe 2')
  })
  test('ungültig: reservierte Kennung, Farbe, Bezeichnung, Kennung, Prototyp-Name', async () => {
    const bad = [{ id: 'ISO27001', label: 'x', color: '#000000' }, { id: 'ABC', label: 'x', color: 'red; background:url(x)' }, { id: 'ABD', label: '', color: '#000000' }, { id: 'a b', label: 'x' }, { id: '__proto__', label: 'x' }]
    const r = await push(writer, bad)
    expect(r.body.accepted.soaFrameworks).toEqual([]); expect(r.body.rejected).toHaveLength(5)
    expect(fileList().map(f => f.id)).not.toContain('ISO27001')
  })
  test('Löschen nur ohne Controls, als Löschmarkierung; Pull liefert sie; Neuanlage gleicher Kennung geht', async () => {
    const nenBase = (await get(writer, '/sync/pull')).body.modules.soaFrameworks.find(f => f.id === 'NEN7510').createdAt
    let r = await push(writer, [{ id: 'NEN7510', deletedAt: 'x', baseUpdatedAt: nenBase }])
    expect(r.body.rejected[0].reason).toMatch(/Controls/)
    const base = (await get(writer, '/sync/pull')).body.modules.soaFrameworks.find(f => f.id === 'GRP1').updatedAt
    r = await push(writer, [{ id: 'GRP1', deletedAt: 'x', baseUpdatedAt: base }])
    expect(r.body.accepted.soaFrameworks[0].deletedAt).toBeTruthy()
    const pulled = (await get(writer, '/sync/pull')).body.modules.soaFrameworks.find(f => f.id === 'GRP1')
    expect(pulled.deletedAt).toBeTruthy()
    const api = require('../server/db/soaFrameworkStore'); expect(api.getAllSync().map(f => f.id)).not.toContain('GRP1')   // Verwaltung sieht sie nicht mehr
    r = await push(writer, [{ id: 'GRP1', label: 'neu', color: '#112233', baseUpdatedAt: pulled.updatedAt }])
    expect(r.body.accepted.soaFrameworks[0].deletedAt).toBeUndefined(); expect(api.getAllSync().map(f => f.id)).toContain('GRP1')
  })
  test('Löschen in der Verwaltung hinterlässt eine Löschmarkierung, die der Sync weitergibt', async () => {
    const st = require('../server/db/soaFrameworkStore')
    st.createSync({ id: 'TEMP1', label: 'x', color: '#000000' }, { by: 'admin' }); st.removeSync('TEMP1', { by: 'admin' })
    expect(fileList().find(f => f.id === 'TEMP1').deletedAt).toBeTruthy()
    expect((await get(soaReader, '/sync/pull')).body.modules.soaFrameworks.find(f => f.id === 'TEMP1').deletedAt).toBeTruthy()
  })
})
