'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gemeinsame Testgruppe des Maßnahmen-Registers für JSON und SQL-Backend (gleiches Verhalten ist Pflicht).
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./authHelper')

function runMeasuresSuite(backend) {
  describe(`Maßnahmen-Register [${backend}]`, () => {
    let dataDir, app, c, soaId, findingId, other

    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-measures-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      app = require('../../server/index.js')
      if (app.bootstrap) await app.bootstrap()        // SQL: Schema und eingebaute SoA-Controls
      c = { admin: await loginAs(app, 'admin'), editor: await loginAs(app, 'editor'), reader: await loginAs(app, 'reader'), contentowner: await loginAs(app, 'contentowner'), auditor: await loginAs(app, 'auditor') }
      soaId = 'BSI-ISMS.1'
      const f = await authedPost(app, c.auditor, '/findings', { title: 'Testfeststellung', severity: 'medium' })
      expect(f.status).toBe(201)
      findingId = f.body.id
    })
    afterAll(async () => {
      if (backend !== 'json') await require('../../server/db/knexDatabase').destroy()
      removeTestDataDir(dataDir)
    })

    test('die eingebauten SoA-Controls sind vorhanden (Voraussetzung für Zuordnungen)', async () => {
      const r = await authedGet(app, c.reader, '/soa')
      expect(r.status).toBe(200)
      const list = Array.isArray(r.body) ? r.body : (r.body.controls || [])
      expect(list.some(x => x.id === soaId)).toBe(true)
    })

    test('Anlegen: Pflichttitel, fortlaufende Referenz, Standardwerte', async () => {
      expect((await authedPost(app, c.editor, '/measures', { description: 'x' })).status).toBe(400)
      expect((await authedPost(app, c.editor, '/measures', { title: '   ' })).status).toBe(400)
      const a = await authedPost(app, c.editor, '/measures', { title: 'Tägliche Sicherung', description: 'Inkrementell auf die Backup-Appliance', responsible: 'IT Operations', dueDate: '2099-01-31' })
      expect(a.status).toBe(201)
      expect(a.body).toMatchObject({ ref: 'M-001', title: 'Tägliche Sicherung', status: 'planned', linkedControls: [], linkedFindings: [], responsible: 'IT Operations', dueDate: '2099-01-31', createdBy: 'editor' })
      const b = await authedPost(app, c.editor, '/measures', { title: 'Phishing-Training', status: 'in_progress' })
      expect(b.body.ref).toBe('M-002')
      other = b.body
    })

    test('Rechte: reader liest nur, editor ändert, Löschen erst contentowner', async () => {
      expect((await authedGet(app, c.reader, '/measures')).status).toBe(200)
      expect((await authedPost(app, c.reader, '/measures', { title: 'nein' })).status).toBe(403)
      expect((await authedPut(app, c.reader, `/measures/${other.id}`, { title: 'nein' })).status).toBe(403)
      expect((await authedDelete(app, c.editor, `/measures/${other.id}`)).status).toBe(403)
    })

    test('Zuordnung zu SoA-Control und Feststellung; unbekannte Verweise werden abgelehnt', async () => {
      expect((await authedPut(app, c.editor, `/measures/${other.id}`, { linkedFindings: [findingId] })).status).toBe(403)   // Feststellungen zuordnen: ab Auditor/Contentowner (wie Feststellungs-Maßnahmen)
      const r = await authedPut(app, c.contentowner, `/measures/${other.id}`, { linkedControls: [soaId, soaId], linkedFindings: [findingId] })
      expect(r.status).toBe(200)
      expect(r.body.linkedControls).toEqual([soaId])                      // doppelte Einträge entfallen
      expect(r.body.linkedFindings).toEqual([findingId])
      const bad1 = await authedPut(app, c.editor, `/measures/${other.id}`, { linkedControls: ['gibt-es-nicht'] })
      expect(bad1.status).toBe(400); expect(bad1.body.error).toMatch(/Unknown SoA control|Unbekanntes SoA-Control/)
      const bad2 = await authedPost(app, c.contentowner, '/measures', { title: 'x', linkedFindings: ['gibt-es-nicht'] })
      expect(bad2.status).toBe(400)
      expect((await authedPut(app, c.editor, `/measures/${other.id}`, { linkedControls: 'kein-array' })).status).toBe(400)
      expect((await authedGet(app, c.reader, `/measures/${other.id}`)).body.linkedControls).toEqual([soaId])   // unverändert
    })

    test('Suche und Filter: Text (alle Wörter), Status, Verantwortlicher, Control, Feststellung, überfällig', async () => {
      await authedPost(app, c.editor, '/measures', { title: 'Überfällige Altlast', status: 'planned', dueDate: '2020-01-01', responsible: 'CISO' })
      const ids = async qs => (await authedGet(app, c.reader, '/measures?' + qs)).body.map(m => m.ref)
      expect(await ids('q=sicherung')).toEqual(['M-001'])
      expect(await ids('q=backup%20appliance')).toEqual(['M-001'])           // Beschreibung, beide Wörter
      expect(await ids('q=m-002')).toEqual(['M-002'])                        // Referenz
      expect(await ids('q=gibtesnicht')).toEqual([])
      expect(await ids('status=in_progress')).toEqual(['M-002'])
      expect(await ids('responsible=ciso')).toEqual(['M-003'])
      expect(await ids(`control=${soaId}`)).toEqual(['M-002'])
      expect(await ids(`finding=${findingId}`)).toEqual(['M-002'])
      expect(await ids('overdue=1')).toEqual(['M-003'])
      expect(await ids('')).toEqual(['M-001', 'M-002', 'M-003'])
    })

    test('Zusammenfassung und Kalender', async () => {
      const s = (await authedGet(app, c.reader, '/measures/summary')).body
      expect(s).toMatchObject({ total: 3, overdue: 1, withoutLinks: 2 })
      expect(s.byStatus).toMatchObject({ planned: 2, in_progress: 1, implemented: 0 })
      const cal = (await authedGet(app, c.reader, '/calendar')).body
      const ev = (Array.isArray(cal) ? cal : cal.events || []).filter(e => e.type === 'measure_due')
      expect(ev.map(e => e.ref).sort()).toEqual(['M-001', 'M-003'])           // nur offene mit Termin
    })

    test('Ändern: Status, Titel; ungültiger Status wird ignoriert; Pflichttitel bleibt', async () => {
      const r = await authedPut(app, c.editor, `/measures/${other.id}`, { status: 'implemented', title: 'Phishing-Training 2026' })
      expect(r.body).toMatchObject({ status: 'implemented', title: 'Phishing-Training 2026', updatedBy: 'editor' })
      expect((await authedPut(app, c.editor, `/measures/${other.id}`, { status: 'quatsch' })).body.status).toBe('implemented')
      expect((await authedPut(app, c.editor, `/measures/${other.id}`, { title: '' })).status).toBe(400)
      expect((await authedPut(app, c.editor, '/measures/gibt-es-nicht', { title: 'x' })).status).toBe(404)
    })

    test('Löschen in den Papierkorb, Wiederherstellen, endgültig löschen; Referenzen werden nie wiederverwendet', async () => {
      const created = (await authedPost(app, c.editor, '/measures', { title: 'Zum Löschen' })).body
      expect(created.ref).toBe('M-004')
      expect((await authedDelete(app, c.contentowner, `/measures/${created.id}`)).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${created.id}`)).status).toBe(404)
      expect((await authedGet(app, c.reader, '/measures')).body.map(m => m.ref)).not.toContain('M-004')
      const trash = (await authedGet(app, c.admin, '/trash')).body
      expect((Array.isArray(trash) ? trash : trash.items).some(t => t.module === 'measure' && t.id === created.id)).toBe(true)
      expect((await authedPost(app, c.editor, `/measures/${created.id}/restore`, {})).status).toBe(403)
      expect((await authedPost(app, c.admin, `/measures/${created.id}/restore`, {})).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${created.id}`)).body.ref).toBe('M-004')
      await authedDelete(app, c.contentowner, `/measures/${created.id}`)
      expect((await authedDelete(app, c.admin, `/measures/${created.id}/permanent`)).status).toBe(200)
      expect((await authedPost(app, c.editor, '/measures', { title: 'Nachfolger' })).body.ref).toBe('M-004')   // frei, weil endgültig gelöscht
    })

    test('TOMs sind Maßnahmen mit Kennzeichen: Rechte wie im DSGVO-Modul, Voreinstellungen, Filter', async () => {
      expect((await authedPost(app, c.editor, '/measures', { title: 'TOM A', tom: true })).status).toBe(403)
      const t = await authedPost(app, c.contentowner, '/measures', { title: 'TOM A', tom: true, responsible: 'DSB' })
      expect(t.status).toBe(201)
      expect(t.body).toMatchObject({ tom: true, category: 'organizational', riskLevel: 'medium', responsible: 'DSB' })   // Vorgaben wie bisher im DSGVO-Modul
      expect((await authedPut(app, c.editor, `/measures/${t.body.id}`, { responsible: 'Editor' })).status).toBe(403)   // Editor ändert keine TOM
      expect((await authedPut(app, c.editor, `/measures/${other.id}`, { tom: true })).status).toBe(403)               // und macht auch keine Maßnahme zur TOM
      expect((await authedPut(app, c.contentowner, `/measures/${t.body.id}`, { responsible: 'DSO', category: 'backup', riskLevel: 'high' })).body)
        .toMatchObject({ responsible: 'DSO', category: 'backup', riskLevel: 'high' })
      const ids = async qs => (await authedGet(app, c.reader, '/measures?' + qs)).body.map(m => m.id)
      expect(await ids('tom=1')).toEqual([t.body.id])
      expect(await ids('tom=0')).not.toContain(t.body.id)
      expect(await ids('category=backup')).toEqual([t.body.id])
      expect((await authedGet(app, c.reader, '/measures/summary')).body.toms).toBe(1)
    })

    test('DSGVO-Schnittstelle /gdpr/toms ist eine Sicht auf das Register (kein zweiter Bestand)', async () => {
      const post = await authedPost(app, c.contentowner, '/gdpr/toms', { title: 'Verschlüsselung der Backups', owner: 'IT', category: 'encryption', status: 'verified', linkedControls: [soaId], riskLevel: 'high' })
      expect(post.status).toBe(201)
      expect(post.body).toMatchObject({ title: 'Verschlüsselung der Backups', owner: 'IT', category: 'encryption', status: 'verified', riskLevel: 'high', linkedControls: [soaId] })
      const tomId = post.body.id
      // erscheint im Register, mit Kennzeichen und Referenz
      const reg = (await authedGet(app, c.reader, `/measures/${tomId}`)).body
      expect(reg).toMatchObject({ tom: true, responsible: 'IT', status: 'verified', category: 'encryption' }); expect(reg.ref).toMatch(/^M-\d{3}$/)
      expect((await authedGet(app, c.reader, `/measures?control=${soaId}&tom=1`)).body.map(m => m.id)).toContain(tomId)
      // Ändern über die DSGVO-Schnittstelle: owner → responsible, ungültiger Status ändert nichts
      const put = await authedPut(app, c.contentowner, `/gdpr/toms/${tomId}`, { owner: 'IT-Leitung', status: 'quatsch' })
      expect(put.body).toMatchObject({ owner: 'IT-Leitung', status: 'verified' })
      expect((await authedGet(app, c.reader, `/measures/${tomId}`)).body.responsible).toBe('IT-Leitung')
      // eine normale Maßnahme ist keine TOM
      expect((await authedGet(app, c.reader, `/gdpr/toms/${other.id}`)).status).toBe(404)
      expect((await authedPut(app, c.contentowner, `/gdpr/toms/${other.id}`, { owner: 'x' })).status).toBe(404)
      expect((await authedGet(app, c.reader, '/gdpr/toms')).body.map(x => x.id)).toContain(tomId)
      expect((await authedGet(app, c.reader, '/gdpr/toms')).body.map(x => x.id)).not.toContain(other.id)
      // Dashboard-Zahlen des DSGVO-Moduls kommen aus dem Register
      const dash = (await authedGet(app, c.reader, '/gdpr/dashboard')).body
      expect(dash.toms.total).toBeGreaterThanOrEqual(2); expect(dash.toms.implemented).toBeGreaterThanOrEqual(1)
      // Papierkorb: TOMs erscheinen als gdpr_toms, nicht zusätzlich als Maßnahme; Wiederherstellen über die DSGVO-Schnittstelle
      expect((await authedDelete(app, c.admin, `/gdpr/toms/${tomId}`)).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${tomId}`)).status).toBe(404)
      const trash = (await authedGet(app, c.admin, '/trash')).body
      const items = (Array.isArray(trash) ? trash : trash.items).filter(i => i.id === tomId)
      expect(items.map(i => i.module)).toEqual(['gdpr_toms'])
      expect((await authedPost(app, c.admin, `/gdpr/toms/${tomId}/restore`, {})).status).toBe(200)
      expect((await authedGet(app, c.reader, `/measures/${tomId}`)).status).toBe(200)
    })

    test('KI-Suche (Stichwortsuche) findet Maßnahmen, auch unter SQL', async () => {
      const r = await authedGet(app, c.reader, '/api/ai/search?q=verschl%C3%BCsselung')
      expect(r.status).toBe(200)
      const hit = r.body.results.find(x => x.type === 'Maßnahme')
      expect(hit).toBeTruthy()
      expect(hit.url).toBe('#measures')
    })

    test('Änderungen stehen im Audit-Log', async () => {
      const log = (await authedGet(app, c.admin, '/admin/audit-log?limit=500')).body
      const entries = (Array.isArray(log) ? log : log.entries || log.items || []).filter(e => e.resource === 'measure')
      expect(entries.map(e => e.action)).toEqual(expect.arrayContaining(['create', 'update', 'delete', 'restore', 'permanent_delete']))
    })
  })
}
module.exports = { runMeasuresSuite }
