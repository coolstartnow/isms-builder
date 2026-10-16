'use strict'
// Audit-Verwaltung: Audits, Prüfpunkte, Auditprogramme, Anbindung an Findings.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, auditorCookie, readerCookie, editorCookie
const request = require('supertest')

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-audits'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  adminCookie   = await loginAs(app, 'admin')
  auditorCookie = await loginAs(app, 'auditor')
  editorCookie  = await loginAs(app, 'editor')
  readerCookie  = await loginAs(app, 'reader')
})
afterAll(() => { removeTestDataDir(dataDir) })

const today = () => new Date().toISOString().slice(0, 10)
const inDays = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

describe('Audits – CRUD und Rollen', () => {
  let id

  test('auditor legt ein Audit an, Referenz AUD-JJJJ-NNNN, Eingaben werden bereinigt', async () => {
    const res = await authedPost(app, auditorCookie, '/audits', {
      title: 'Internes Audit A.8', type: 'internal', standard: 'ISO 27001', scope: 'Zugriffskontrolle',
      plannedStart: inDays(10), plannedEnd: inDays(20), followUpDate: 'kein Datum',
      entityIds: ['e1', 'e1', '', 5], team: ['Alice', '  ', 'Bob'],
    })
    expect(res.status).toBe(201)
    id = res.body.id
    expect(res.body.ref).toMatch(new RegExp(`^AUD-${new Date().getFullYear()}-0001$`))
    expect(res.body.status).toBe('planned')
    expect(res.body.followUpDate).toBeNull()
    expect(res.body.entityIds).toEqual(['e1'])
    expect(res.body.team).toEqual(['Alice', 'Bob'])
    expect(res.body.checklist).toEqual([])
  })

  test('ungültiger Typ/Status fällt auf den Standard zurück', async () => {
    const res = await authedPost(app, auditorCookie, '/audits', { title: 'X', type: 'bogus', status: 'bogus' })
    expect(res.body.type).toBe('internal')
    expect(res.body.status).toBe('planned')
    expect(res.body.ref).toMatch(/-0002$/)
    await authedDelete(app, adminCookie, `/audits/${res.body.id}`)
  })

  test('reader darf lesen, aber nicht schreiben; editor ebenfalls nicht', async () => {
    expect((await authedGet(app, readerCookie, '/audits')).status).toBe(200)
    expect((await authedPost(app, readerCookie, '/audits', { title: 'nein' })).status).toBe(403)
    expect((await authedPost(app, editorCookie, '/audits', { title: 'nein' })).status).toBe(403)
    expect((await authedPut(app, readerCookie, `/audits/${id}`, { title: 'nein' })).status).toBe(403)
  })

  test('GET /audits/:id liefert Prüfpunkte und zugeordnete Findings; unbekannt → 404', async () => {
    const res = await authedGet(app, readerCookie, `/audits/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.findings).toEqual([])
    expect((await authedGet(app, readerCookie, '/audits/gibt-es-nicht')).status).toBe(404)
  })

  test('Filter nach Status, Typ und Jahr', async () => {
    expect((await authedGet(app, readerCookie, '/audits?status=planned')).body.map(a => a.id)).toContain(id)
    expect((await authedGet(app, readerCookie, '/audits?status=completed')).body).toEqual([])
    expect((await authedGet(app, readerCookie, '/audits?type=supplier')).body).toEqual([])
    const year = new Date(inDays(10)).getFullYear()
    expect((await authedGet(app, readerCookie, `/audits?year=${year}`)).body.map(a => a.id)).toContain(id)
    expect((await authedGet(app, readerCookie, '/audits?year=1999')).body).toEqual([])
  })

  test('PUT ändert Felder; Summary zählt', async () => {
    const res = await authedPut(app, auditorCookie, `/audits/${id}`, { status: 'in_progress', actualStart: today() })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
    const sum = await authedGet(app, readerCookie, '/audits/summary')
    expect(sum.body.total).toBe(1)
    expect(sum.body.byStatus.in_progress).toBe(1)
  })

  test('Kalender liefert Beginn und Fälligkeit des Audits', async () => {
    const res = await authedGet(app, readerCookie, '/calendar')
    const types = res.body.filter(e => e.ref === id).map(e => e.type).sort()
    expect(types).toEqual(['audit_due', 'audit_planned'])
  })

  test('Soft-Delete → Papierkorb → Restore → endgültig löschen (nur admin)', async () => {
    expect((await authedDelete(app, auditorCookie, `/audits/${id}`)).status).toBe(200)
    expect((await authedGet(app, readerCookie, `/audits/${id}`)).status).toBe(404)

    const trash = await authedGet(app, adminCookie, '/trash')
    expect(trash.body.some(i => i.module === 'audit' && i.id === id)).toBe(true)

    expect((await authedPost(app, auditorCookie, `/audits/${id}/restore`, {})).status).toBe(403)
    expect((await authedPost(app, adminCookie, `/audits/${id}/restore`, {})).status).toBe(200)
    expect((await authedGet(app, readerCookie, `/audits/${id}`)).status).toBe(200)

    expect((await authedDelete(app, auditorCookie, `/audits/${id}/permanent`)).status).toBe(403)
    await authedDelete(app, auditorCookie, `/audits/${id}`)
    expect((await authedDelete(app, adminCookie, `/audits/${id}/permanent`)).status).toBe(200)
  })
})

describe('Audits – Prüfpunkte und Findings', () => {
  let auditId, itemId, findingId

  beforeAll(async () => {
    const a = await authedPost(app, auditorCookie, '/audits', { title: 'Audit mit Checkliste', scope: 'Betrieb', leadAuditor: 'Alice', plannedStart: '2026-03-01', plannedEnd: '2026-03-05' })
    auditId = a.body.id
  })

  test('Prüfpunkt anlegen, ändern', async () => {
    const add = await authedPost(app, auditorCookie, `/audits/${auditId}/checklist`, { controlId: 'ISO-5.15', question: 'Ist die Zugriffssteuerung dokumentiert?', result: 'bogus' })
    expect(add.status).toBe(201)
    itemId = add.body.id
    expect(add.body.result).toBe('open')
    expect(add.body.findingId).toBeNull()

    const upd = await authedPut(app, auditorCookie, `/audits/${auditId}/checklist/${itemId}`, { result: 'nonconform', notes: 'Rollenkonzept fehlt' })
    expect(upd.body.result).toBe('nonconform')
    expect(upd.body.question).toBe('Ist die Zugriffssteuerung dokumentiert?')   // nicht gesendet → unverändert

    const audit = await authedGet(app, readerCookie, `/audits/${auditId}`)
    expect(audit.body.checklist).toHaveLength(1)
  })

  test('Finding aus dem Prüfpunkt: vorbelegt, mit auditId, im Prüfpunkt verlinkt, nur einmal', async () => {
    const res = await authedPost(app, auditorCookie, `/audits/${auditId}/checklist/${itemId}/finding`, { severity: 'high' })
    expect(res.status).toBe(201)
    findingId = res.body.id
    expect(res.body.auditId).toBe(auditId)
    expect(res.body.sourceItemId).toBe(itemId)
    expect(res.body.severity).toBe('high')
    expect(res.body.observation).toBe('Rollenkonzept fehlt')
    expect(res.body.requirement).toMatch(/Zugriffssteuerung/)
    expect(res.body.linkedControls).toEqual(['ISO-5.15'])
    expect(res.body.auditor).toBe('Alice')
    expect(res.body.auditPeriodFrom).toBe('2026-03-01')

    const audit = await authedGet(app, readerCookie, `/audits/${auditId}`)
    expect(audit.body.checklist[0].findingId).toBe(findingId)
    expect(audit.body.findings.map(f => f.id)).toEqual([findingId])

    const again = await authedPost(app, auditorCookie, `/audits/${auditId}/checklist/${itemId}/finding`, {})
    expect(again.status).toBe(409)
  })

  test('Findings lassen sich nach auditId filtern und einem Audit zuordnen', async () => {
    const byAudit = await authedGet(app, readerCookie, `/findings?auditId=${auditId}`)
    expect(byAudit.body.map(f => f.id)).toEqual([findingId])

    const other = await authedPost(app, auditorCookie, '/findings', { title: 'Lose Feststellung' })
    expect(other.body.auditId).toBeNull()
    const assigned = await authedPut(app, auditorCookie, `/findings/${other.body.id}`, { auditId })
    expect(assigned.body.auditId).toBe(auditId)
    expect((await authedGet(app, readerCookie, `/findings?auditId=${auditId}`)).body).toHaveLength(2)
    const cleared = await authedPut(app, auditorCookie, `/findings/${other.body.id}`, { auditId: '' })
    expect(cleared.body.auditId).toBeNull()
  })

  test('Prüfpunkt löschen; Summary zählt Abweichungen', async () => {
    const sum = await authedGet(app, readerCookie, '/audits/summary')
    expect(sum.body.nonconform).toBe(1)
    expect((await authedDelete(app, auditorCookie, `/audits/${auditId}/checklist/${itemId}`)).status).toBe(200)
    expect((await authedDelete(app, auditorCookie, `/audits/${auditId}/checklist/${itemId}`)).status).toBe(404)
  })
})

describe('Auditprogramme', () => {
  let pid, auditId

  test('Programm anlegen: Jahr, Entwurf, Referenz', async () => {
    const res = await authedPost(app, auditorCookie, '/audit-programs', { title: 'Auditprogramm 2027', year: 2027, objectives: 'Alle Controls in 3 Jahren' })
    expect(res.status).toBe(201)
    pid = res.body.id
    expect(res.body.year).toBe(2027)
    expect(res.body.status).toBe('draft')
    expect(res.body.ref).toMatch(/^AP-\d{4}-0001$/)
    expect((await authedPost(app, auditorCookie, '/audit-programs', { year: 1 })).body.year).toBe(new Date().getFullYear())
  })

  test('Audits werden dem Programm zugeordnet', async () => {
    const a = await authedPost(app, auditorCookie, '/audits', { title: 'Q1-Audit', programId: pid, plannedStart: '2027-02-01' })
    auditId = a.body.id
    const res = await authedGet(app, readerCookie, `/audit-programs/${pid}`)
    expect(res.body.audits.map(x => x.id)).toEqual([auditId])
    expect((await authedGet(app, readerCookie, `/audits?programId=${pid}`)).body).toHaveLength(1)
  })

  test('Freigabe nur ab contentowner/auditor-Rang 3, danach gesperrt (409), reopen hebt auf', async () => {
    expect((await authedPost(app, editorCookie, `/audit-programs/${pid}/approve`, {})).status).toBe(403)
    const ok = await authedPost(app, adminCookie, `/audit-programs/${pid}/approve`, {})
    expect(ok.status).toBe(200)
    expect(ok.body.status).toBe('approved')
    expect(ok.body.approvedBy).toBeTruthy()
    expect(ok.body.approvedAt).toBeTruthy()

    expect((await authedPut(app, auditorCookie, `/audit-programs/${pid}`, { title: 'geändert' })).status).toBe(409)
    expect((await authedPost(app, adminCookie, `/audit-programs/${pid}/reopen`, {})).body.status).toBe('draft')
    expect((await authedPut(app, auditorCookie, `/audit-programs/${pid}`, { title: 'geändert' })).status).toBe(200)
  })

  test('Papierkorb und endgültiges Löschen', async () => {
    expect((await authedDelete(app, auditorCookie, `/audit-programs/${pid}`)).status).toBe(200)
    const trash = await authedGet(app, adminCookie, '/trash')
    expect(trash.body.some(i => i.module === 'audit_program' && i.id === pid)).toBe(true)
    expect((await authedPost(app, adminCookie, `/audit-programs/${pid}/restore`, {})).status).toBe(200)
    await authedDelete(app, auditorCookie, `/audit-programs/${pid}`)
    expect((await authedDelete(app, adminCookie, `/audit-programs/${pid}/permanent`)).status).toBe(200)
  })
})

describe('Suche', () => {
  test('Audit ist per Keyword auffindbar und verlinkt auf das konkrete Audit', async () => {
    const created = await authedPost(app, auditorCookie, '/audits', {
      title: 'Quartalsaudit', scope: 'Xylophonzebra-Prüfung der Zugriffsrechte',
      checklist: [],
    })
    const res = await authedGet(app, readerCookie, '/api/ai/search?q=Xylophonzebra')
    expect(res.status).toBe(200)
    const hit = res.body.results.find(r => r.type === 'Audit')
    expect(hit).toBeTruthy()
    expect(hit.url).toBe(`#audits?auditId=${created.body.id}`)
  })
})
