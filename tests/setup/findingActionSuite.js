'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Maßnahmen zu Feststellungen = Maßnahmen im Register mit Zuordnung zur Feststellung (1.80): Übernahme alter Daten,
// unveränderte Schnittstelle /findings/:id/actions, Kalender, Zusammenfassung, Papierkorb.
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./authHelper')

const T1 = '2026-01-10T08:00:00.000Z'
const ACTS = [
  { id: 'act_old1', description: 'Zugriffsrechte prüfen\nund dokumentieren', responsible: 'IT', dueDate: '2099-01-01', status: 'open', updatedAt: T1, updatedBy: 'alice' },
  { id: 'act_old2', description: 'Schulung durchführen', responsible: 'HR', dueDate: '2026-02-01', status: 'done', updatedAt: '2026-02-20T10:00:00.000Z', updatedBy: 'bob' },
]
const FIND = (id, extra) => ({ id, ref: 'FIND-2026-0001', title: 'Rechte', severity: 'high', status: 'open', observation: '', requirement: '', impact: '', recommendation: '', auditor: '', auditedArea: '', linkedControls: [], linkedPolicies: [], linkedRisks: [], auditId: null, createdAt: T1, updatedAt: T1, createdBy: 'admin', ...extra })

function runFindingActionSuite(backend) {
  describe(`Feststellungs-Maßnahmen im Register [${backend}]`, () => {
    let dataDir, app, c
    const F1 = 'finding_f1'

    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-fa-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      if (backend === 'json') fs.writeFileSync(path.join(dataDir, 'findings.json'), JSON.stringify([FIND(F1, { actions: ACTS })], null, 2))
      app = require('../../server/index.js')
      if (backend !== 'json') {
        const k = require('../../server/db/knexDatabase'); await k.init()
        const { id, createdAt, updatedAt, createdBy, ...data } = FIND(F1, { actions: ACTS })
        await k.getDb()('findings').insert({ id, data: JSON.stringify(data), created_by: createdBy, created_at: createdAt, updated_at: updatedAt })
      }
      await app.bootstrap()
      c = { admin: await loginAs(app, 'admin'), co: await loginAs(app, 'contentowner'), editor: await loginAs(app, 'editor'), reader: await loginAs(app, 'reader') }
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })
    const acts = async () => (await authedGet(app, c.reader, `/findings/${F1}`)).body.actions

    test('alte Maßnahmen stehen im Register und in der Feststellung (gleiche Kennung, Status abgebildet)', async () => {
      const a = await acts()
      expect(a.map(x => x.id).sort()).toEqual(['act_old1', 'act_old2'])
      expect(a.find(x => x.id === 'act_old1')).toMatchObject({ description: 'Zugriffsrechte prüfen\nund dokumentieren', responsible: 'IT', dueDate: '2099-01-01', status: 'open' })
      expect(a.find(x => x.id === 'act_old2').status).toBe('done')
      expect((await authedGet(app, c.reader, '/measures/act_old1')).body).toMatchObject({ title: 'Zugriffsrechte prüfen', linkedFindings: [F1], status: 'planned' })
      expect((await authedGet(app, c.reader, '/measures/act_old2')).body).toMatchObject({ status: 'implemented', completedDate: '2026-02-20' })
    })

    test('zweiter Start ist idempotent', async () => {
      const r = await require('../../server/db/measureMigration').run()
      expect(r.findings).toMatchObject({ found: 2, migrated: 0, failed: 0 })
    })

    test('Anlegen, Ändern, Rechte wie bisher', async () => {
      expect((await authedPost(app, c.editor, `/findings/${F1}/actions`, { description: 'x' })).status).toBe(403)
      const r = await authedPost(app, c.co, `/findings/${F1}/actions`, { description: 'Neue Maßnahme', responsible: 'SecOps', dueDate: '2099-02-02', status: 'in_progress' })
      expect(r.status).toBe(201)
      expect(r.body).toMatchObject({ description: 'Neue Maßnahme', responsible: 'SecOps', status: 'in_progress' })
      globalThis.__fa = r.body.id
      expect((await authedPost(app, c.co, '/findings/gibt-es-nicht/actions', { description: 'x' })).status).toBe(404)
      expect((await authedPut(app, c.editor, `/findings/${F1}/actions/${r.body.id}`, { status: 'done' })).body.status).toBe('done')
      expect((await authedPut(app, c.editor, `/findings/${F1}/actions/${r.body.id}`, { status: 'quatsch' })).body.status).toBe('done')
      expect((await authedPut(app, c.editor, `/findings/${F1}/actions/gibt-es-nicht`, { status: 'open' })).status).toBe(404)
      await authedPut(app, c.editor, `/findings/${F1}/actions/${r.body.id}`, { status: 'open' })
    })

    test('Kalender und Zusammenfassung zählen jede offene Maßnahme einmal', async () => {
      const cal = (await authedGet(app, c.reader, '/calendar')).body
      const events = Array.isArray(cal) ? cal : cal.events
      expect(events.filter(e => e.type === 'finding_action_due').length).toBe(2)   // act_old1, neue Maßnahme; act_old2 erledigt
      expect((await authedGet(app, c.reader, '/findings/summary')).body.openActions).toBe(2)
    })

    test('Löschen: Papierkorb und Wiederherstellung; mit weiterer Zuordnung nur die Zuordnung lösen', async () => {
      const id = globalThis.__fa
      expect((await authedDelete(app, c.co, `/findings/${F1}/actions/${id}`)).status).toBe(200)
      expect((await acts()).map(x => x.id)).not.toContain(id)
      expect((await authedPost(app, c.admin, `/measures/${id}/restore`, {})).status).toBe(200)
      expect((await acts()).map(x => x.id)).toContain(id)
      const both = (await authedPost(app, c.co, '/measures', { title: 'Mit Control', linkedFindings: [F1], linkedControls: ['BSI-ISMS.1'] })).body
      expect((await authedDelete(app, c.co, `/findings/${F1}/actions/${both.id}`)).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${both.id}`)).body).toMatchObject({ linkedFindings: [], linkedControls: ['BSI-ISMS.1'] })
      expect((await authedDelete(app, c.co, `/findings/${F1}/actions/gibt-es-nicht`)).status).toBe(404)
    })

    test('Feststellung endgültig löschen: Maßnahmen ohne weitere Zuordnung gehen in den Papierkorb', async () => {
      const f = (await authedPost(app, c.co, '/findings', { title: 'Temporär' })).body
      const only = (await authedPost(app, c.co, `/findings/${f.id}/actions`, { description: 'Nur hier' })).body
      expect((await authedDelete(app, c.admin, `/findings/${f.id}`)).status).toBe(200)
      expect((await authedDelete(app, c.admin, `/findings/${f.id}/permanent`)).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${only.id}`)).status).toBe(404)
    })
  })
}
module.exports = { runFindingActionSuite }
