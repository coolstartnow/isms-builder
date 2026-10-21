'use strict'
// Mobile-Sync: Maßnahmen haben kein eigenes Recht, der Zugriff folgt den verknüpften Modulen (db/measureAccess.js).
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const A = require('../server/db/measureAccess')

const T0 = '2026-01-01T00:00:00.000Z'
const m = (id, ref, extra = {}) => ({ id, ref, title: id, status: 'planned', linkedRisks: [], linkedFindings: [], linkedControls: [], linkedPolicies: [], linkedVvt: [],
  tom: false, governance: false, attachments: [{ filename: 'beweis.pdf' }], createdAt: T0, updatedAt: T0, deletedAt: null, ...extra })

describe('measureAccess: reine Regeln', () => {
  const perms = { risks: 'write', findings: 'read', soa: 'none', templates: 'write' }
  test('Lesen: ein lesbares Modul genügt', () => {
    expect(A.canRead(m('a', 'M-001', { linkedRisks: ['r'] }), perms)).toBe(true)
    expect(A.canRead(m('a', 'M-001', { linkedRisks: ['r'], linkedControls: ['c'] }), perms)).toBe(true)
    expect(A.canRead(m('a', 'M-001', { linkedControls: ['c'] }), perms)).toBe(false)
    expect(A.canRead(m('a', 'M-001'), perms)).toBe(false)               // ohne Verknüpfung nie
    expect(A.canRead(m('a', 'M-001', { linkedVvt: ['v'] }), perms)).toBe(false)
  })
  test('Schreiben: Schreibrecht auf alle Module (gespeichert ∪ neu)', () => {
    const stored = m('a', 'M-001', { linkedRisks: ['r'] })
    expect(A.canWrite(stored, stored, perms).ok).toBe(true)
    expect(A.canWrite(stored, { ...stored, linkedFindings: ['f'] }, perms).code).toBe('no_write')   // findings nur lesen
    expect(A.canWrite(stored, { ...stored, linkedRisks: [], linkedPolicies: ['p'] }, perms).ok).toBe(true)
    // Verknüpfung entfernen darf man nur, wenn man auch das alte Modul schreiben darf
    expect(A.canWrite(m('b', 'M-002', { linkedFindings: ['f'] }), m('b', 'M-002', { linkedRisks: ['r'] }), perms).code).toBe('no_write')
  })
  test('neue Maßnahme braucht eine Verknüpfung; TOM, Governance und VVT sind gesperrt', () => {
    expect(A.canWrite(null, m('n', 'M-9'), perms).code).toBe('no_link')
    expect(A.canWrite(null, m('n', 'M-9', { linkedRisks: ['r'], tom: true }), perms).code).toBe('locked_tom')
    expect(A.canWrite(m('g', 'M-8', { linkedRisks: ['r'], governance: true }), m('g', 'M-8', { linkedRisks: ['r'] }), perms).code).toBe('locked_governance')
    expect(A.canWrite(null, m('v', 'M-7', { linkedRisks: ['r'], linkedVvt: ['x'] }), perms).code).toBe('locked_vvt')
  })
})

describe('Mobile-Sync: Maßnahmen über die Schnittstelle', () => {
  let dataDir, app, accounts, riskWriter, riskReader, findingsWriter, nothing
  beforeAll(() => {
    dataDir = createTestDataDir()
    fs.writeFileSync(path.join(dataDir, 'measures.json'), JSON.stringify([
      m('m_risk', 'M-001', { linkedRisks: ['risk_1'] }),
      m('m_find', 'M-002', { linkedFindings: ['f_1'] }),
      m('m_both', 'M-003', { linkedRisks: ['risk_1'], linkedFindings: ['f_1'] }),
      m('m_ctrl', 'M-004', { linkedControls: ['BSI-ISMS.1'] }),
      m('m_none', 'M-005'),
      m('m_tom', 'M-006', { tom: true, linkedRisks: ['risk_1'] }),
      m('m_gov', 'M-007', { governance: true }),
      m('m_vvt', 'M-008', { linkedVvt: ['v1'] }),
    ]))
    process.env.DATA_DIR = dataDir
    process.env.JWT_SECRET = 'jest-test-secret-sync-measures-0123456789'
    process.env.NODE_ENV = 'test'
    process.env.STORAGE_BACKEND = 'json'
    app = require('../server/index.js')
    accounts = require('../server/db/syncAccountStore')
    const key = (name, permissions) => accounts.addDevice(accounts.create({ name, permissions }, 'test').id, 'Gerät').token
    riskWriter     = key('Risiko schreiben', { risks: 'write' })
    riskReader     = key('Risiko lesen', { risks: 'read' })
    findingsWriter = key('Feststellung schreiben', { findings: 'write' })
    nothing        = key('Nur Assets', { assets: 'write' })
  })
  afterAll(() => removeTestDataDir(dataDir))

  const pull = (t, q = '') => request(app).get('/sync/pull' + q).set('Authorization', `Bearer ${t}`)
  const push = (t, measures, protocolVersion = 2) => request(app).post('/sync/push').set('Authorization', `Bearer ${t}`).send({ protocolVersion, changes: { measures } })
  const stored = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'measures.json'), 'utf8'))
  const ids = res => res.body.modules.measures.map(x => x.id).sort()

  test('Pull: nur Maßnahmen mit lesbarem Modul, TOM mit lesbarer Verknüpfung nur lesbar; visibleIds', async () => {
    const res = await pull(riskReader)
    expect(res.status).toBe(200)
    expect(ids(res)).toEqual(['m_both', 'm_risk', 'm_tom'])
    expect(res.body.visibleIds.measures.sort()).toEqual(['m_both', 'm_risk', 'm_tom'])
    expect(ids(await pull(findingsWriter))).toEqual(['m_both', 'm_find'])
    expect(ids(await pull(nothing))).toEqual([])
  })
  test('Pull mit since filtert die Liste, visibleIds bleibt vollständig', async () => {
    const res = await pull(riskReader, '?since=2030-01-01T00:00:00.000Z')
    expect(ids(res)).toEqual([])
    expect(res.body.visibleIds.measures.length).toBe(3)
  })
  test('Push: ändern mit Schreibrecht; Anhänge, TOM-/Governance-Kennzeichen und Referenz bleiben', async () => {
    const res = await push(riskWriter, [{ ...m('m_risk', 'M-999', { linkedRisks: ['risk_1'] }), title: 'Neu', attachments: [], tom: true, baseUpdatedAt: T0 }])
    expect(res.status).toBe(200)
    expect(res.body.rejected).toEqual([{ module: 'measures', id: 'm_risk', code: 'locked_tom', reason: expect.any(String) }])   // tom:true wird abgewiesen
    const ok = await push(riskWriter, [{ ...m('m_risk', 'M-999', { linkedRisks: ['risk_1'] }), title: 'Neu', attachments: [], baseUpdatedAt: T0 }])
    expect(ok.body.accepted.measures.length).toBe(1)
    const s = stored().find(x => x.id === 'm_risk')
    expect(s.title).toBe('Neu')
    expect(s.ref).toBe('M-001')
    expect(s.attachments).toEqual([{ filename: 'beweis.pdf' }])
    expect(s.updatedBy).toBe('sync:Risiko schreiben')
    expect(s.updatedAt > T0).toBe(true)
  })
  test('Push: ohne Schreibrecht auf alle Module → abgelehnt, Daten unverändert', async () => {
    const before = JSON.stringify(stored())
    const res = await push(riskWriter, [{ ...m('m_both', 'M-003', { linkedRisks: ['risk_1'], linkedFindings: ['f_1'] }), title: 'Hack', baseUpdatedAt: T0 }])
    expect(res.body.rejected[0].code).toBe('no_write')
    const res2 = await push(riskReader, [{ ...m('m_risk', 'M-001', { linkedRisks: ['risk_1'] }), title: 'Hack', baseUpdatedAt: T0 }])
    expect(res2.body.rejected[0].code).toBe('no_write')
    expect(JSON.stringify(stored())).toBe(before)
  })
  test('Push: Verknüpfung auf ein nicht schreibbares Modul hinzufügen ist verboten', async () => {
    const res = await push(riskWriter, [{ ...m('m_risk', 'M-001', { linkedRisks: ['risk_1'], linkedFindings: ['f_1'] }), baseUpdatedAt: stored().find(x => x.id === 'm_risk').updatedAt }])
    expect(res.body.rejected[0].code).toBe('no_write')
  })
  test('Push: TOM, Governance, VVT und unverknüpfte Maßnahmen sind nicht änderbar', async () => {
    const before = JSON.stringify(stored())
    for (const id of ['m_tom', 'm_gov', 'm_vvt', 'm_none']) {
      const r = await push(riskWriter, [{ ...stored().find(x => x.id === id), title: 'Hack', baseUpdatedAt: T0 }])
      expect(r.body.accepted.measures).toEqual([])
      expect(r.body.rejected.length).toBe(1)
    }
    expect(JSON.stringify(stored())).toBe(before)
  })
  test('Push: Löschen nur mit Schreibrecht (Soft-Delete)', async () => {
    const cur = stored().find(x => x.id === 'm_find')
    expect((await push(riskWriter, [{ ...cur, deletedAt: 'x', baseUpdatedAt: cur.updatedAt }])).body.rejected.length).toBe(1)
    const ok = await push(findingsWriter, [{ ...cur, deletedAt: 'x', baseUpdatedAt: cur.updatedAt }])
    expect(ok.body.accepted.measures.length).toBe(1)
    expect(stored().find(x => x.id === 'm_find').deletedAt).toBeTruthy()
  })
  test('Push: neue Maßnahme braucht Verknüpfung; Referenz-Kollision → nächste freie', async () => {
    expect((await push(riskWriter, [{ id: 'm_new0', title: 'ohne Link' }])).body.rejected[0].code).toBe('no_link')
    const res = await push(riskWriter, [{ id: 'm_new1', ref: 'M-001', title: 'Neu', linkedRisks: ['risk_1'], attachments: [{ filename: 'x' }], tom: false }])
    expect(res.body.accepted.measures[0].ref).toBe('M-009')
    expect(res.body.accepted.measures[0].attachments).toEqual([])
    const res2 = await push(riskWriter, [{ id: 'm_new2', ref: 'M-777', title: 'Frei', linkedRisks: ['risk_1'] }])
    expect(res2.body.accepted.measures[0].ref).toBe('M-777')
  })
  test('Push: Konflikt, wenn der Server nach dem Basisstand geändert wurde', async () => {
    const cur = stored().find(x => x.id === 'm_ctrl')
    const k = accounts.addDevice(accounts.create({ name: 'Controls', permissions: { soa: 'write' } }, 'test').id, 'G').token
    const res = await push(k, [{ ...cur, title: 'x', baseUpdatedAt: '2020-01-01T00:00:00.000Z' }])
    expect(res.body.conflicts.measures.length).toBe(1)
  })
  test('Push: eingebettete Behandlungen/Aktionen in Risiken und Feststellungen werden verworfen', async () => {
    const res = await request(app).post('/sync/push').set('Authorization', `Bearer ${riskWriter}`)
      .send({ protocolVersion: 2, changes: { risks: [{ id: 'risk_emb', title: 'R', probability: 2, impact: 2, treatmentPlans: [{ id: 't1', title: 'x' }] }] } })
    expect(res.body.accepted.risks.length).toBe(1)
    expect(res.body.accepted.risks[0].treatmentPlans).toBeUndefined()
  })
  test('altes Sync-Protokoll 1 → 409', async () => {
    expect((await push(riskWriter, [], 1)).status).toBe(409)
  })
})
