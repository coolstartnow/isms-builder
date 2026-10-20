'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Übernahme der bisherigen TOMs (DSGVO-Modul) ins Maßnahmen-Register, für JSON und SQL.
const fs   = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet } = require('./authHelper')

const T1 = '2026-01-10T08:00:00.000Z', T2 = '2026-02-10T08:00:00.000Z', T3 = '2026-03-10T08:00:00.000Z'
// Drei alte TOMs wie sie ältere Instanzen enthalten: normal, gelöscht (Papierkorb), mit ungültigen Werten und fehlenden Feldern
const OLD = [
  { id: 'tom_a', title: 'Zugriffskontrolle', category: 'access', description: 'Rollenbasiert', implementation: 'AD-Gruppen, vierteljährliche Rezertifizierung', status: 'verified', owner: 'IT-Sicherheit',
    evidenceNote: 'Revisionsbericht 2025', retentionRule: '10 Jahre', linkedVvt: ['vvt_1'], riskLevel: 'high', reviewDate: '2027-01-01', applicableEntities: ['ent_1'], linkedControls: ['BSI-ISMS.1'], linkedPolicies: ['pol_1'], createdAt: T2, updatedAt: T2, createdBy: 'admin' },
  { id: 'tom_b', title: 'Altes Backup', category: 'backup', status: 'implemented', owner: 'IT', createdAt: T1, updatedAt: T1, createdBy: 'alice', deletedAt: T3, deletedBy: 'admin' },
  { id: 'tom_c', title: 'Unvollständig', category: 'gibt-es-nicht', status: 'quatsch', riskLevel: 'extrem', createdAt: T3 },
]

function runTomMigrationSuite(backend) {
  describe(`Übernahme der TOMs ins Maßnahmen-Register [${backend}]`, () => {
    let dataDir, app, admin, reader, oldHash

    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-tom-mig-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      if (backend === 'json') {
        fs.mkdirSync(path.join(dataDir, 'gdpr'), { recursive: true })
        fs.writeFileSync(path.join(dataDir, 'gdpr', 'toms.json'), JSON.stringify(OLD, null, 2))
        oldHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dataDir, 'gdpr', 'toms.json'))).digest('hex')
      }
      app = require('../../server/index.js')
      if (backend !== 'json') {
        const k = require('../../server/db/knexDatabase'); await k.init()
        for (const t of OLD) {
          const { deletedAt, createdAt, updatedAt, createdBy, ...data } = t
          await k.getDb()('gdpr_entries').insert({ id: t.id, gdpr_type: 'tom', data: JSON.stringify({ ...data, deletedBy: t.deletedBy }), created_by: createdBy || 'system', created_at: createdAt || T3, updated_at: updatedAt || T3, deleted_at: deletedAt || null })
        }
      }
      await app.bootstrap()
      admin = await loginAs(app, 'admin'); reader = await loginAs(app, 'reader')
    })
    afterAll(async () => {
      if (backend !== 'json') await require('../../server/db/knexDatabase').destroy()
      removeTestDataDir(dataDir)
    })

    test('alle TOMs stehen im Register: gleiche Kennung, Kennzeichen, Felder übernommen', async () => {
      const a = (await authedGet(app, reader, '/measures/tom_a')).body
      expect(a).toMatchObject({ id: 'tom_a', tom: true, title: 'Zugriffskontrolle', description: 'Rollenbasiert', implementation: 'AD-Gruppen, vierteljährliche Rezertifizierung',
        responsible: 'IT-Sicherheit', status: 'verified', category: 'access', riskLevel: 'high', evidenceNote: 'Revisionsbericht 2025', retentionRule: '10 Jahre',
        reviewDate: '2027-01-01', linkedVvt: ['vvt_1'], applicableEntities: ['ent_1'], linkedControls: ['BSI-ISMS.1'], linkedPolicies: ['pol_1'], createdBy: 'admin', createdAt: T2 })
      expect(a.ref).toMatch(/^M-\d{3}$/)
    })

    test('ungültige oder fehlende Werte erhalten die bisherigen Vorgaben des DSGVO-Moduls', async () => {
      const c = (await authedGet(app, reader, '/measures/tom_c')).body
      expect(c).toMatchObject({ tom: true, category: 'organizational', status: 'planned', riskLevel: 'medium', responsible: '', title: 'Unvollständig' })
    })

    test('Referenzen folgen dem Anlagedatum; gelöschte TOMs bleiben im Papierkorb', async () => {
      const all = (await authedGet(app, reader, '/gdpr/toms')).body.map(t => t.id)
      expect(all.sort()).toEqual(['tom_a', 'tom_c'])                       // tom_b ist gelöscht
      const trash = (await authedGet(app, admin, '/trash')).body
      const t = (Array.isArray(trash) ? trash : trash.items).filter(i => i.module === 'gdpr_toms')
      expect(t.map(i => i.id)).toEqual(['tom_b'])
      expect(t[0]).toMatchObject({ deletedBy: 'admin' })
      const refs = {}
      for (const id of ['tom_b', 'tom_a', 'tom_c']) refs[id] = (await require('../../server/db/measuresStore').getAnyById(id)).ref
      expect(refs).toEqual({ tom_b: 'M-001', tom_a: 'M-002', tom_c: 'M-003' })   // älteste zuerst (T1 < T2 < T3)
    })

    test('DSGVO-Dashboard zählt die übernommenen TOMs', async () => {
      const dash = (await authedGet(app, reader, '/gdpr/dashboard')).body
      expect(dash.toms).toEqual({ implemented: 1, total: 2 })              // tom_a verifiziert; tom_c geplant; tom_b gelöscht
    })

    test('zweiter Start ist idempotent: nichts doppelt, nichts überschrieben; alte Daten bleiben als Sicherung', async () => {
      const store = require('../../server/db/measuresStore')
      const before = await store.allIds()
      await require('../../server/db/measuresStore').update('tom_a', { responsible: 'Nach der Übernahme geändert' }, 'test')
      const r = await require('../../server/db/tomMigration').run()
      expect(r).toMatchObject({ found: 3, migrated: 0, failed: 0 })
      expect((await store.allIds()).sort()).toEqual(before.sort())
      expect((await store.getById('tom_a')).responsible).toBe('Nach der Übernahme geändert')   // Änderungen gehen nicht verloren
      if (backend === 'json') {
        const now = crypto.createHash('sha256').update(fs.readFileSync(path.join(dataDir, 'gdpr', 'toms.json'))).digest('hex')
        expect(now).toBe(oldHash)                                          // toms.json unverändert
      } else {
        const rows = await require('../../server/db/knexDatabase').getDb()('gdpr_entries').where('gdpr_type', 'tom')
        expect(rows).toHaveLength(3)                                       // Zeilen unverändert vorhanden
      }
    })
  })
}
module.exports = { runTomMigrationSuite }
