'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Risiko-Behandlungen sind Maßnahmen im Register mit Zuordnung zum Risiko (Variante „ein Bestand“, 1.80):
//  · alte, im Risiko eingebettete Behandlungen werden beim Start übernommen (gleiche Kennung, alte Daten bleiben liegen)
//  · die bisherige Schnittstelle /risks/:id/treatments und die Risiko-Ansicht (treatmentPlans) funktionieren unverändert
//  · Kalender, Zusammenfassung, Rechte und Papierkorb verhalten sich wie vorher – ohne Doppelungen
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./authHelper')

const T1 = '2026-01-10T08:00:00.000Z', T2 = '2026-02-10T08:00:00.000Z', T3 = '2026-03-10T08:00:00.000Z'
const DELETED_RECENTLY = new Date(Date.now() - 86400000).toISOString()   // gestern: der Autopurge entfernt erst nach 30 Tagen
const TPS = [
  { id: 'tp_old1', title: 'Backups prüfen', description: 'Restore-Test', responsible: 'IT', dueDate: '2099-01-01', status: 'open', createdAt: T1, updatedAt: T1, createdBy: 'alice' },
  { id: 'tp_old2', title: 'Netz segmentieren', description: '', responsible: 'NetOps', dueDate: '2026-02-01', status: 'completed', createdAt: T2, updatedAt: '2026-02-20T10:00:00.000Z', createdBy: 'bob' },
]
const RISK = (id, extra) => ({ id, title: 'Ransomware ' + id, description: '', category: 'technical', probability: 3, impact: 4, status: 'open', owner: 'CISO', createdAt: T1, updatedAt: T1, createdBy: 'admin', ...extra })

function runRiskTreatmentSuite(backend) {
  describe(`Risiko-Behandlungen im Register [${backend}]`, () => {
    let dataDir, app, c, oldHash
    const R1 = 'risk_r1', R2 = 'risk_r2'

    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-rt-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      if (backend === 'json') {
        fs.writeFileSync(path.join(dataDir, 'risks.json'), JSON.stringify([RISK(R1, { treatmentPlans: TPS }), RISK(R2, { treatmentPlans: [{ id: 'tp_old3', title: 'Im gelöschten Risiko', status: 'open', createdAt: T3 }], deletedAt: DELETED_RECENTLY, deletedBy: 'admin' })], null, 2))
        oldHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dataDir, 'risks.json'))).digest('hex')
      }
      app = require('../../server/index.js')
      if (backend !== 'json') {
        const k = require('../../server/db/knexDatabase'); await k.init()
        const row = (r, tps, del) => ({ id: r.id, title: r.title, description: '', category: 'technical', likelihood: 3, impact: 4, risk_score: 12, status: 'open', owner: 'CISO',
          applicable_entities: '[]', treatments: JSON.stringify({ treatmentOption: 'reduce', treatmentPlans: tps }), created_by: 'admin', created_at: T1, updated_at: T1, deleted_at: del ? DELETED_RECENTLY : null, deleted_by: del ? 'admin' : null })
        await k.getDb()('risks').insert(row(RISK(R1), TPS, false))
        await k.getDb()('risks').insert(row(RISK(R2), [{ id: 'tp_old3', title: 'Im gelöschten Risiko', status: 'open', createdAt: T3 }], true))
        oldHash = crypto.createHash('sha256').update(JSON.stringify(await k.getDb()('risks').orderBy('id').select('id', 'treatments'))).digest('hex')
      }
      await app.bootstrap()
      c = { admin: await loginAs(app, 'admin'), co: await loginAs(app, 'contentowner'), editor: await loginAs(app, 'editor'), reader: await loginAs(app, 'reader') }
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })
    const risk = async id => (await authedGet(app, c.reader, `/risks/${id}`)).body
    const tpIds = async id => (await risk(id)).treatmentPlans.map(t => t.id)

    test('alte Behandlungen stehen im Register: gleiche Kennung, Zuordnung zum Risiko, Status abgebildet', async () => {
      const r = await risk(R1)
      expect(r.treatmentPlans.map(t => t.id).sort()).toEqual(['tp_old1', 'tp_old2'])
      expect(r.treatmentPlans.find(t => t.id === 'tp_old1')).toMatchObject({ title: 'Backups prüfen', description: 'Restore-Test', responsible: 'IT', dueDate: '2099-01-01', status: 'open', createdBy: 'alice' })
      expect(r.treatmentPlans.find(t => t.id === 'tp_old2').status).toBe('completed')
      const m1 = (await authedGet(app, c.reader, '/measures/tp_old1')).body
      expect(m1).toMatchObject({ linkedRisks: [R1], status: 'planned', title: 'Backups prüfen', responsible: 'IT', createdAt: T1 })
      const m2 = (await authedGet(app, c.reader, '/measures/tp_old2')).body
      expect(m2).toMatchObject({ status: 'implemented', completedDate: '2026-02-20' })      // Erledigt-Datum aus dem alten Änderungsdatum, nicht „heute“
      expect((await authedGet(app, c.reader, `/measures?risk=${R1}`)).body.map(m => m.id).sort()).toEqual(['tp_old1', 'tp_old2'])
    })

    test('die alten Daten bleiben als Sicherung unverändert liegen', async () => {
      if (backend === 'json') expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(dataDir, 'risks.json'))).digest('hex')).toBe(oldHash)
      else {
        const k = require('../../server/db/knexDatabase')
        expect(crypto.createHash('sha256').update(JSON.stringify(await k.getDb()('risks').orderBy('id').select('id', 'treatments'))).digest('hex')).toBe(oldHash)
      }
    })

    test('zweiter Start ist idempotent', async () => {
      const r = await require('../../server/db/measureMigration').run()
      expect(r.risks).toMatchObject({ found: 3, migrated: 0, failed: 0 })
    })

    test('Behandlungen eines gelöschten Risikos kommen mit der Wiederherstellung zurück', async () => {
      expect((await authedGet(app, c.reader, `/risks/${R2}`)).status).toBe(404)
      expect((await authedPost(app, c.admin, `/risks/${R2}/restore`, {})).status).toBe(200)
      expect(await tpIds(R2)).toEqual(['tp_old3'])
    })

    test('Anlegen über /risks/:id/treatments: Rechte wie bisher, Ansicht und Register stimmen überein', async () => {
      expect((await authedPost(app, c.editor, `/risks/${R1}/treatments`, { title: 'x' })).status).toBe(403)
      const r = await authedPost(app, c.co, `/risks/${R1}/treatments`, { title: 'Neue Behandlung', description: 'd', responsible: 'SecOps', dueDate: '2099-02-02', status: 'in_progress' })
      expect(r.status).toBe(201)
      expect(r.body).toMatchObject({ title: 'Neue Behandlung', responsible: 'SecOps', dueDate: '2099-02-02', status: 'in_progress', createdBy: 'contentowner' })
      expect(r.body.ref).toMatch(/^M-\d{3}$/)
      expect(await tpIds(R1)).toContain(r.body.id)
      expect((await authedGet(app, c.reader, `/measures/${r.body.id}`)).body).toMatchObject({ linkedRisks: [R1], status: 'in_progress' })
      expect((await authedPost(app, c.co, '/risks/gibt-es-nicht/treatments', { title: 'x' })).status).toBe(404)
      globalThis.__newTp = r.body.id
    })

    test('Rechte im Register: Maßnahmen mit Risiko-Zuordnung ändert der Editor nicht', async () => {
      expect((await authedPut(app, c.editor, '/measures/tp_old1', { title: 'Editor' })).status).toBe(403)
      expect((await authedPut(app, c.editor, `/measures/${globalThis.__newTp}`, { linkedRisks: [] })).status).toBe(403)
      expect((await authedPost(app, c.editor, '/measures', { title: 'x', linkedRisks: [R1] })).status).toBe(403)
      expect((await authedPost(app, c.co, '/measures', { title: 'x', linkedRisks: ['gibt-es-nicht'] })).status).toBe(400)
    })

    test('Ändern: Status wird abgebildet, ungültige Werte ändern nichts', async () => {
      const id = globalThis.__newTp
      expect((await authedPut(app, c.co, `/risks/${R1}/treatments/${id}`, { status: 'completed', title: 'Umbenannt' })).body).toMatchObject({ status: 'completed', title: 'Umbenannt' })
      expect((await authedGet(app, c.reader, `/measures/${id}`)).body).toMatchObject({ status: 'implemented', title: 'Umbenannt' })
      expect((await authedPut(app, c.co, `/risks/${R1}/treatments/${id}`, { status: 'quatsch' })).body.status).toBe('completed')
      expect((await authedPut(app, c.co, `/risks/${R1}/treatments/gibt-es-nicht`, { title: 'x' })).status).toBe(404)
      expect((await authedPut(app, c.co, `/risks/${R2}/treatments/${id}`, { title: 'x' })).status).toBe(404)   // gehört nicht zu diesem Risiko
      await authedPut(app, c.co, `/risks/${R1}/treatments/${id}`, { status: 'open' })
    })

    test('Kalender und Zusammenfassung: jede offene Behandlung genau einmal, abgeschlossene nicht', async () => {
      const cal = (await authedGet(app, c.reader, '/calendar')).body
      const events = Array.isArray(cal) ? cal : cal.events
      const due = events.filter(e => e.type === 'treatment_due').map(e => e.tpId).sort()
      expect(due).toEqual(['tp_old1', globalThis.__newTp].sort())   // tp_old2 ist erledigt, tp_old3 hat keinen Termin
      expect(events.filter(e => e.type === 'measure_due' && ['tp_old1', globalThis.__newTp].includes(e.measureId))).toEqual([])   // keine zweite Meldung aus dem Register
      const s = (await authedGet(app, c.reader, '/risks/summary')).body
      expect(s.openTreatments).toBe(2 + 1)   // tp_old1, die neue Behandlung und tp_old3 (offen, Risiko wiederhergestellt); tp_old2 ist erledigt
    })

    test('Löschen: Maßnahme kommt in den Papierkorb und ist wiederherstellbar; hängt sie noch woanders, wird nur die Zuordnung gelöst', async () => {
      const id = globalThis.__newTp
      expect((await authedDelete(app, c.co, `/risks/${R1}/treatments/${id}`)).status).toBe(200)
      expect(await tpIds(R1)).not.toContain(id)
      const trash = (await authedGet(app, c.admin, '/trash')).body
      expect((Array.isArray(trash) ? trash : trash.items).some(t => t.module === 'measure' && t.id === id)).toBe(true)
      expect((await authedPost(app, c.admin, `/measures/${id}/restore`, {})).status).toBe(200)
      expect(await tpIds(R1)).toContain(id)
      // Maßnahme mit weiterer Zuordnung (Control): nur Zuordnung zum Risiko entfernen
      const both = (await authedPost(app, c.co, '/measures', { title: 'Mit Control', linkedRisks: [R1], linkedControls: ['BSI-ISMS.1'] })).body
      expect((await authedDelete(app, c.co, `/risks/${R1}/treatments/${both.id}`)).status).toBe(200)
      const after = (await authedGet(app, c.reader, `/measures/${both.id}`)).body
      expect(after).toMatchObject({ linkedRisks: [], linkedControls: ['BSI-ISMS.1'] })
      expect((await authedDelete(app, c.co, `/risks/${R1}/treatments/gibt-es-nicht`)).status).toBe(404)
    })

    test('Risiko endgültig löschen: seine Behandlungen gehen in den Papierkorb, Maßnahmen mit anderer Zuordnung bleiben bestehen', async () => {
      const risk3 = (await authedPost(app, c.co, '/risks', { title: 'Wird gelöscht', probability: 2, impact: 2 })).body
      const only = (await authedPost(app, c.co, `/risks/${risk3.id}/treatments`, { title: 'Nur hier' })).body
      const shared = (await authedPost(app, c.co, '/measures', { title: 'Mit Control', linkedRisks: [risk3.id], linkedControls: ['BSI-ISMS.1'] })).body
      expect((await authedDelete(app, c.admin, `/risks/${risk3.id}`)).status).toBe(200)
      expect(await tpIds(risk3.id).catch(() => [])).toEqual([])
      expect((await authedGet(app, c.reader, `/measures/${only.id}`)).status).toBe(200)   // Soft-Delete des Risikos: Behandlungen bleiben (wiederherstellbar)
      expect((await authedDelete(app, c.admin, `/risks/${risk3.id}/permanent`)).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${only.id}`)).status).toBe(404)   // jetzt im Papierkorb
      expect((await authedGet(app, c.reader, `/measures/${shared.id}`)).body).toMatchObject({ linkedRisks: [], linkedControls: ['BSI-ISMS.1'] })
      const trash = (await authedGet(app, c.admin, '/trash')).body
      expect((Array.isArray(trash) ? trash : trash.items).some(t => t.module === 'measure' && t.id === only.id)).toBe(true)
    })

    test('abgebrochene Maßnahmen sind keine laufende Behandlung, bleiben aber im Register', async () => {
      const m = (await authedPost(app, c.co, '/measures', { title: 'Abgebrochen', linkedRisks: [R1], status: 'cancelled' })).body
      expect(await tpIds(R1)).not.toContain(m.id)
      expect((await authedGet(app, c.reader, `/measures?risk=${R1}&status=cancelled`)).body.map(x => x.id)).toEqual([m.id])
    })
  })
}
module.exports = { runRiskTreatmentSuite }
