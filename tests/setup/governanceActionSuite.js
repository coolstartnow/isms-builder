'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Governance-Maßnahmen = Maßnahmen im Register mit Kennzeichen `governance` (1.80): Übernahme alter Daten (auch gelöschter, mit
// Anhängen), unveränderte Schnittstelle /governance/actions, Anhänge, Kalender, Zusammenfassung, Rechte.
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./authHelper')

const T1 = '2026-01-10T08:00:00.000Z'
const DELETED = new Date(Date.now() - 86400000).toISOString()
const ATT = { id: 'att1', filename: 'protokoll.pdf', storedName: 'abc123', size: 10, uploadedBy: 'alice', uploadedAt: T1 }
const ACTIONS = [
  { id: 'gact_old1', title: 'Budget klären', description: 'd', source: 'internal_audit', sourceRef: 'IA-1', owner: 'CISO', ownerEmail: 'c@x.de', dueDate: '2099-01-01', completedDate: '', priority: 'critical', status: 'open', progress: 20, notes: 'n', entityId: '', linkedControls: ['BSI-ISMS.1'], linkedPolicies: [], attachments: [ATT], createdAt: T1, updatedAt: T1, createdBy: 'alice', deletedAt: null },
  { id: 'gact_old2', title: 'Erledigt', source: 'incident', owner: 'IT', dueDate: '2026-02-01', completedDate: '2026-02-15', priority: 'low', status: 'completed', progress: 100, createdAt: T1, updatedAt: '2026-02-15T09:00:00.000Z', createdBy: 'bob', deletedAt: null },
  { id: 'gact_old3', title: 'Gelöscht', status: 'open', createdAt: T1, updatedAt: T1, createdBy: 'bob', deletedAt: DELETED },
]

function runGovernanceActionSuite(backend) {
  describe(`Governance-Maßnahmen im Register [${backend}]`, () => {
    let dataDir, app, c
    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-ga-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      if (backend === 'json') fs.writeFileSync(path.join(dataDir, 'governance.json'), JSON.stringify({ reviews: [], actions: ACTIONS, meetings: [] }, null, 2))
      app = require('../../server/index.js')
      if (backend !== 'json') {
        const k = require('../../server/db/knexDatabase'); await k.init()
        for (const a of ACTIONS) {
          const { id, createdAt, updatedAt, createdBy, deletedAt, ...data } = a
          await k.getDb()('governance_entries').insert({ id, gov_type: 'action', data: JSON.stringify(data), created_by: createdBy, created_at: createdAt, updated_at: updatedAt, deleted_at: deletedAt })
        }
      }
      await app.bootstrap()
      c = { admin: await loginAs(app, 'admin'), editor: await loginAs(app, 'editor'), co: await loginAs(app, 'contentowner'), reader: await loginAs(app, 'reader') }
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })

    test('alte Aktionen erscheinen unverändert in der Governance-Ansicht', async () => {
      const list = (await authedGet(app, c.reader, '/governance/actions')).body
      expect(list.map(a => a.id).sort()).toEqual(['gact_old1', 'gact_old2'])      // die gelöschte nicht
      expect(list.find(a => a.id === 'gact_old1')).toMatchObject({ title: 'Budget klären', source: 'internal_audit', sourceRef: 'IA-1', owner: 'CISO', ownerEmail: 'c@x.de',
        dueDate: '2099-01-01', priority: 'critical', status: 'open', progress: 20, notes: 'n', linkedControls: ['BSI-ISMS.1'], attachments: [ATT] })
      expect(list.find(a => a.id === 'gact_old2')).toMatchObject({ status: 'completed', completedDate: '2026-02-15', progress: 100 })
    })

    test('im Register: gleiche Kennung, Kennzeichen governance, gelöschte im Papierkorb', async () => {
      expect((await authedGet(app, c.reader, '/measures/gact_old1')).body).toMatchObject({ governance: true, status: 'planned', responsible: 'CISO', priority: 'critical', source: 'internal_audit' })
      expect((await authedGet(app, c.reader, '/measures/gact_old2')).body).toMatchObject({ status: 'implemented', completedDate: '2026-02-15' })
      expect((await authedGet(app, c.reader, '/measures/gact_old3')).status).toBe(404)
      expect((await authedGet(app, c.reader, '/measures?governance=true')).body.length).toBe(2)
      expect((await authedGet(app, c.reader, '/measures?governance=false')).body.some(m => m.governance)).toBe(false)
    })

    test('zweiter Start ist idempotent', async () => {
      const r = await require('../../server/db/measureMigration').run()
      expect(r.governance).toMatchObject({ found: 3, migrated: 0, failed: 0 })
    })

    test('Anlegen, Ändern, Anhänge, Rechte wie bisher', async () => {
      expect((await authedPost(app, c.reader, '/governance/actions', { title: 'x' })).status).toBe(403)
      const r = await authedPost(app, c.editor, '/governance/actions', { title: 'Neu', owner: 'SecOps', dueDate: '2099-03-03', priority: 'high' })
      expect(r.status).toBe(201)
      expect(r.body).toMatchObject({ title: 'Neu', owner: 'SecOps', status: 'open', source: 'management_review', priority: 'high', attachments: [] })
      globalThis.__ga = r.body.id
      expect((await authedGet(app, c.reader, `/measures/${r.body.id}`)).body.governance).toBe(true)
      const u = await authedPut(app, c.editor, `/governance/actions/${r.body.id}`, { status: 'completed', progress: 100 })
      expect(u.body).toMatchObject({ status: 'completed', progress: 100 })
      expect(u.body.completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect((await authedPut(app, c.editor, `/governance/actions/${r.body.id}`, { status: 'quatsch' })).body.status).toBe('completed')
      expect((await authedPut(app, c.editor, '/governance/actions/gibt-es-nicht', { title: 'x' })).status).toBe(404)
      // Anhang-Liste ändern sich nur über den Server-Weg, nicht über /measures
      expect((await authedPut(app, c.co, `/measures/${r.body.id}`, { attachments: [{ id: 'x', storedName: '../../etc/passwd' }] })).status).toBe(200)
      expect((await authedGet(app, c.reader, `/governance/actions/${r.body.id}`)).body.attachments).toEqual([])
      const viaGov = await authedPut(app, c.editor, `/governance/actions/${r.body.id}`, { attachments: [ATT] })
      expect(viaGov.body.attachments).toEqual([ATT])
      expect((await authedGet(app, c.reader, `/governance/actions/gact_old1`)).body.attachments).toEqual([ATT])
    })

    test('eine Maßnahme ohne Kennzeichen ist keine Governance-Aktion', async () => {
      const m = (await authedPost(app, c.co, '/measures', { title: 'Normale Maßnahme' })).body
      expect((await authedGet(app, c.reader, `/governance/actions/${m.id}`)).status).toBe(404)
      expect((await authedPut(app, c.editor, `/governance/actions/${m.id}`, { title: 'x' })).status).toBe(404)
      expect((await authedDelete(app, c.admin, `/governance/actions/${m.id}`)).status).toBe(404)
    })

    test('Kalender und Zusammenfassung: jede offene Aktion einmal', async () => {
      const cal = (await authedGet(app, c.reader, '/calendar')).body
      const events = Array.isArray(cal) ? cal : cal.events
      expect(events.filter(e => e.type === 'governance_action').map(e => e.ref).sort()).toEqual(['gact_old1'].sort())
      expect(events.filter(e => e.type === 'measure_due' && ['gact_old1', globalThis.__ga].includes(e.measureId || e.ref))).toEqual([])
      const s = (await authedGet(app, c.reader, '/governance/summary')).body
      expect(s.actions).toMatchObject({ total: 3, open: 1, completed: 2, critical: 1 })
    })

    test('Löschen: im Governance-Modul nur Admin, im Register ebenfalls; wiederherstellbar', async () => {
      const id = globalThis.__ga
      expect((await authedDelete(app, c.editor, `/governance/actions/${id}`)).status).toBe(403)
      expect((await authedDelete(app, c.co, `/measures/${id}`)).status).toBe(403)
      expect((await authedDelete(app, c.admin, `/governance/actions/${id}`)).status).toBe(200)
      expect((await authedGet(app, c.reader, `/governance/actions/${id}`)).status).toBe(404)
      expect((await authedPost(app, c.admin, `/measures/${id}/restore`, {})).status).toBe(200)
      expect((await authedGet(app, c.reader, `/governance/actions/${id}`)).status).toBe(200)
    })
  })
}
module.exports = { runGovernanceActionSuite }
