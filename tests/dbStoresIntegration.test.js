'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Backend-uebergreifender Integrationstest fuer die SQL-Umstellung (#42-Umfeld).
// Nicht Teil von `npm test` (siehe jest.config.js testMatch — dieser Datei wird
// gezielt einzeln aufgerufen), weil er echte Datenbank-Server braucht: fuer
// mariadb/pg reicht STORAGE_BACKEND=sqlite nicht, es muss eine laufende
// Instanz per DB_HOST/DB_PORT/... erreichbar sein.
//
// Zweck: nicht nur pruefen, dass Tabellen existieren, sondern dass jeder
// Knex-Store tatsaechlich schreiben und lesen kann — das deckt Spalten- und
// Typ-Fehler auf, die eine reine hasTable()-Pruefung nicht findet. Laeuft
// standardmaessig gegen SQLite (self-contained, ohne externen Service) und
// ist damit auch ohne Extra-Aufruf Teil von `npm test`. Fuer mariadb/pg
// gezielt mit eigenem Env-Namen aufrufen (siehe DB_STORES_TEST_BACKEND unten
// — bewusst NICHT STORAGE_BACKEND, das wuerde mit dem Haupt-CI-Job kollidieren):
//
//   DB_STORES_TEST_BACKEND=mariadb DB_HOST=... DB_PORT=... DB_USER=... DB_PASS=... DB_NAME=... npx jest tests/dbStoresIntegration.test.js --runInBand
//   DB_STORES_TEST_BACKEND=pg      DB_HOST=... DB_PORT=... DB_USER=... DB_PASS=... DB_NAME=... npx jest tests/dbStoresIntegration.test.js --runInBand
'use strict'
const fs   = require('fs')
const os   = require('os')
const path = require('path')

// Eigener Env-Name statt STORAGE_BACKEND: dieser Test muss unabhaengig davon
// laufen, was ein umgebender CI-Job (z.B. der Haupt-Job mit
// STORAGE_BACKEND=json) fuer die uebrigen Testdateien setzt — genau wie jede
// andere Testdatei ihr eigenes STORAGE_BACKEND selbst setzt (s. auth.test.js
// u.a.). 'json' ist fuer knexDatabase kein gueltiges Backend (_buildConfig()
// wirft dann), daher bewusst kein Fallback auf process.env.STORAGE_BACKEND.
const BACKEND = (process.env.DB_STORES_TEST_BACKEND || 'sqlite').toLowerCase()
process.env.STORAGE_BACKEND = BACKEND

describe(`DB-Stores-Integration [${BACKEND}]`, () => {
  let dataDir, knexDatabase

  beforeAll(async () => {
    if (BACKEND === 'sqlite' && !process.env.DATA_DIR) {
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isms-dbstores-'))
      process.env.DATA_DIR = dataDir
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-test-secret-dbstores'
    process.env.NODE_ENV   = 'test'

    knexDatabase = require('../server/db/knexDatabase')
    await knexDatabase.init()
  })

  afterAll(async () => {
    await knexDatabase.destroy()
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true })
  })

  // ── 1. Alle 23 Tabellen + ihre in knexDatabase.js definierten Spalten ──────
  test('alle Tabellen und ihre definierten Spalten existieren', async () => {
    const db = knexDatabase.getDb()
    const expected = {
      templates: ['id','type','language','title','content','version','status','owner','next_review_date','parent_id','sort_order','created_at','updated_at','linked_controls','applicable_entities','attachments','history','status_history','deleted_at','deleted_by'],
      training: ['id','title','description','category','status','due_date','completed_date','instructor','assignees','applicable_entities','evidence','mandatory','created_by','created_at','updated_at','deleted_at','data'],
      entities: ['id','name','short','type','parent_id','created_at','updated_at'],
      soa_controls: ['id','framework','control_id','title','description','theme','applicable','status','justification','evidence','owner','applicable_entities','linked_templates','updated_by','is_custom','created_at','updated_at'],
      guidance: ['id','title','category','type','content','file_name','file_type','file_size','version','min_role','linked_controls','linked_policies','pin_order','seed_id','created_by','created_at','updated_at','deleted_at','deleted_by'],
      risks: ['id','title','description','category','likelihood','impact','risk_score','status','owner','applicable_entities','treatments','created_by','created_at','updated_at','deleted_at','deleted_by'],
      gdpr_entries: ['id','gdpr_type','data','created_by','created_at','updated_at','deleted_at'],
      gdpr_deletion_log: ['id','data','deleted_by','deleted_at'],
      rbac_users: ['id','username','email','domain','role','functions','password_hash','totp_secret','totp_enabled','totp_verified','sections','created_at','updated_at'],
      org_settings: ['key_name','value'],
      audit_log: ['id','ts','user_email','action','resource','resource_id','detail'],
      goals: ['id','title','description','category','status','priority','target_value','current_value','unit','due_date','review_date','owner','applicable_entities','linked_controls','created_by','created_at','updated_at','deleted_at','data'],
      assets: ['id','name','description','category','classification','criticality','owner','location','eol_date','status','applicable_entities','linked_controls','created_by','created_at','updated_at','deleted_at','data'],
      suppliers: ['id','name','category','contact','risk_level','status','contract_end','next_audit','notes','applicable_entities','linked_controls','created_by','created_at','updated_at','deleted_at','data'],
      bcm_entries: ['id','bcm_type','data','created_by','created_at','updated_at','deleted_at'],
      legal_entries: ['id','legal_type','data','created_by','created_at','updated_at','deleted_at'],
      governance_entries: ['id','gov_type','data','created_by','created_at','updated_at','deleted_at'],
      public_incidents: ['id','ref','data','submitted_at','deleted_at'],
      findings: ['id','data','created_by','created_at','updated_at','deleted_at'],
      org_units: ['id','data','created_at','updated_at'],
      custom_lists: ['list_id','items'],
      policy_distributions: ['id','template_id','template_title','template_type','template_version','mode','target_group','due_date','email_list','notes','status','created_at','created_by','email_sent_at','email_sent_count'],
      policy_acks: ['id','distribution_id','recipient_email','recipient_name','token','acknowledged_at','ip_address','method','notes','added_by'],
    }
    for (const [table, cols] of Object.entries(expected)) {
      expect(await db.schema.hasTable(table)).toBe(true)
      for (const col of cols) {
        expect(await db.schema.hasColumn(table, col)).toBe(true)
      }
    }
  })

  // ── 2. Volle CRUD-Runde fuer jeden Store, der von runAutopurge() betroffen ist ──
  describe('Autopurge-relevante Stores: create → find → soft-delete → getDeleted → permanentDelete', () => {
    test('riskStore', async () => {
      const s = require('../server/db/riskStore')
      const r = await s.create({ title: 'Test-Risiko' }, 'tester')
      expect(r.id).toBeTruthy()
      expect((await s.getById(r.id)).title).toBe('Test-Risiko')
      await s.delete(r.id, 'tester')
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(true)
      await s.permanentDelete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(false)
    })

    test('riskStore: Inherent- und Zielbewertung (#94) überstehen Speichern und Laden', async () => {
      const s = require('../server/db/riskStore')
      const r = await s.create({ title: 'Bewertung', probability: 4, impact: 4,
        inherentProbability: 5, inherentImpact: 5, targetProbability: 2, targetImpact: 2 }, 'tester')
      const got = await s.getById(r.id)
      expect([got.inherentProbability, got.inherentImpact, got.targetProbability, got.targetImpact]).toEqual([5, 5, 2, 2])
      expect([got.inherentScore, got.inherentLevel, got.targetScore, got.targetLevel]).toEqual([25, 'critical', 4, 'low'])
      expect(got.score).toBe(16)
      const upd = await s.update(r.id, { targetProbability: null })
      expect(upd.targetProbability).toBeNull()
      expect(upd.targetScore).toBeNull()
      expect((await s.getById(r.id)).inherentScore).toBe(25)
      await s.delete(r.id, 'tester')
      await s.permanentDelete(r.id)
    })

    test('goalsStore', async () => {
      const s = require('../server/db/goalsStore')
      const r = await s.create({ title: 'Test-Ziel' }, 'tester')
      expect(r.id).toBeTruthy()
      await s.delete(r.id, 'tester')
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(true)
      await s.permanentDelete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(false)
    })

    test('guidanceStore', async () => {
      const s = require('../server/db/guidanceStore')
      const doc = await s.create({ category: 'systemhandbuch', title: 'Test-Doc', type: 'markdown', content: 'x', createdBy: 'tester' })
      expect(doc.id).toBeTruthy()
      await s.delete(doc.id, 'tester')
      expect((await s.getDeleted()).some(x => x.id === doc.id)).toBe(true)
      await s.permanentDelete(doc.id)
      expect((await s.getDeleted()).some(x => x.id === doc.id)).toBe(false)
    })

    test('trainingStore', async () => {
      const s = require('../server/db/trainingStore')
      const r = await s.create({ title: 'Test-Schulung' }, 'tester')
      expect(r.id).toBeTruthy()
      await s.delete(r.id, 'tester')
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(true)
      await s.permanentDelete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(false)
    })

    test('legalStore.contracts / ndas / privacyPolicies', async () => {
      const s = require('../server/db/legalStore')
      for (const sub of ['contracts', 'ndas', 'privacyPolicies']) {
        const r = await s[sub].create({ title: 'Test' }, 'tester')
        expect(r.id).toBeTruthy()
        await s[sub].delete(r.id, 'tester')
        expect((await s[sub].getDeleted()).some(x => x.id === r.id)).toBe(true)
        await s[sub].permanentDelete(r.id)
        expect((await s[sub].getDeleted()).some(x => x.id === r.id)).toBe(false)
      }
    })

    test('gdprStore.vvt / av / dsfa / incidents / dsar / toms', async () => {
      const s = require('../server/db/gdprStore')
      for (const sub of ['vvt', 'av', 'dsfa', 'incidents', 'dsar', 'toms']) {
        const r = await s[sub].create({ title: 'Test' }, 'tester')
        expect(r.id).toBeTruthy()
        await s[sub].delete(r.id, 'tester')
        expect((await s[sub].getDeleted()).some(x => x.id === r.id)).toBe(true)
        await s[sub].permanentDelete(r.id)
        expect((await s[sub].getDeleted()).some(x => x.id === r.id)).toBe(false)
      }
    })

    test('publicIncidentStore', async () => {
      const s = require('../server/db/publicIncidentStore')
      const r = await s.create({ description: 'Test' })
      expect(r.id).toBeTruthy()
      await s.delete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(true)
      await s.permanentDelete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(false)
    })

    test('supplierStore', async () => {
      const s = require('../server/db/supplierStore')
      const r = await s.create({ name: 'Test-Lieferant' }, { createdBy: 'tester' })
      expect(r.id).toBeTruthy()
      await s.remove(r.id, 'tester')
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(true)
      await s.permanentDelete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(false)
    })

    test('findingStore', async () => {
      const s = require('../server/db/findingStore')
      const r = await s.create({ title: 'Test-Finding' }, 'tester')
      expect(r.id).toBeTruthy()
      await s.remove(r.id, 'tester')
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(true)
      await s.permanentDelete(r.id)
      expect((await s.getDeleted()).some(x => x.id === r.id)).toBe(false)
    })

    test('storage (templateStore) — getDeletedTemplates()-Pfad aus runAutopurge', async () => {
      const storage = require('../server/storage')
      const t = await storage.createTemplate({ type: 'policy', title: 'Test-Template', content: 'x' })
      expect(t.id).toBeTruthy()
      await storage.deleteTemplate(t.type, t.id, 'tester')
      expect((await storage.getDeletedTemplates()).some(x => x.id === t.id)).toBe(true)
      await storage.permanentDeleteTemplate(t.type, t.id)
      expect((await storage.getDeletedTemplates()).some(x => x.id === t.id)).toBe(false)
    })
  })

  // ── 3. Restliche Stores: leichter Rauchtest (create/get bzw. get/set) ──────
  describe('Weitere Stores (nicht autopurge-relevant)', () => {
    test('assetStore', async () => {
      const s = require('../server/db/assetStore')
      const a = await s.create({ name: 'Test-Asset', category: 'hardware' }, { createdBy: 'tester' })
      expect(a.id).toBeTruthy()
      expect((await s.getById(a.id)).name).toBe('Test-Asset')
      await s.remove(a.id, { changedBy: 'tester' })
    })

    test('entityStore', async () => {
      const s = require('../server/db/entityStore')
      const e = await s.create({ name: 'Test-Entity' })
      expect(e.id).toBeTruthy()
      expect((await s.getById(e.id)).name).toBe('Test-Entity')
      await s.delete(e.id)
    })

    test('soaStore — getFrameworks()/getAll() laufen ohne Fehler', async () => {
      const s = require('../server/db/soaStore')
      await expect(s.getFrameworks()).resolves.toBeDefined()
      await expect(s.getAll()).resolves.toEqual(expect.any(Array))
    })

    test('bcmStore.createBia / createPlan / createExercise', async () => {
      const s = require('../server/db/bcmStore')
      const bia = await s.createBia({ title: 'Test-BIA' }, { createdBy: 'tester' })
      expect(bia.id).toBeTruthy()
      await s.deleteBia(bia.id)
      expect(await s.getBiaById(bia.id)).toBeNull()

      const plan = await s.createPlan({ title: 'Test-Plan' }, { createdBy: 'tester' })
      expect(plan.id).toBeTruthy()
      await s.deletePlan(plan.id)

      const ex = await s.createExercise({ title: 'Test-Uebung' }, { createdBy: 'tester' })
      expect(ex.id).toBeTruthy()
      await s.deleteExercise(ex.id)
    })

    test('governanceStore.createReview / createAction / createMeeting', async () => {
      const s = require('../server/db/governanceStore')
      const rev = await s.createReview({ title: 'Test-Review' }, { createdBy: 'tester' })
      expect(rev.id).toBeTruthy()
      await s.deleteReview(rev.id)

      const act = await s.createAction({ title: 'Test-Massnahme' }, { createdBy: 'tester' })
      expect(act.id).toBeTruthy()
      await s.deleteAction(act.id)

      const mtg = await s.createMeeting({ title: 'Test-Sitzung' }, { createdBy: 'tester' })
      expect(mtg.id).toBeTruthy()
      await s.deleteMeeting(mtg.id)
    })

    test('orgUnitStore', async () => {
      const s = require('../server/db/orgUnitStore')
      const u = await s.create({ name: 'Test-Einheit' })
      expect(u.id).toBeTruthy()
      await s.remove(u.id)
    })

    test('orgSettingsStore — get()/update()', async () => {
      const s = require('../server/db/orgSettingsStore')
      await s.update({ orgName: 'Test GmbH' })
      const settings = await s.get()
      expect(settings.orgName).toBe('Test GmbH')
    })

    test('customListsStore — getList()/setList()', async () => {
      const s = require('../server/db/customListsStore')
      const before = await s.getList('templateTypes')
      expect(Array.isArray(before)).toBe(true)
      await s.setList('templateTypes', [...before, 'Test-Typ'])
      const after = await s.getList('templateTypes')
      expect(after).toContain('Test-Typ')
      await s.resetList('templateTypes')
    })

    test('ackStore — createDistribution()/getDistribution()', async () => {
      const s = require('../server/db/ackStore')
      const d = await s.createDistribution({
        templateId: 'tmpl_test', templateTitle: 'Test', templateType: 'Policy',
        templateVersion: 1, mode: 'manual', targetGroup: 'All Staff',
        dueDate: null, emailList: [], notes: '', createdBy: 'tester',
      })
      expect(d.id).toBeTruthy()
      expect((await s.getDistribution(d.id)).templateTitle).toBe('Test')
      await s.deleteDistribution(d.id)
    })

    test('auditStore — append()/query() (uebt den pg-spezifischen CURRVAL-Pfad aus)', async () => {
      const s = require('../server/db/auditStore')
      await s.append({ user: 'tester', action: 'test.action', resource: 'test', resourceId: '1', detail: 'x' })
      const result = await s.query({ limit: 5 })
      expect(Array.isArray(result.entries)).toBe(true)
      expect(result.entries.some(e => e.action === 'test.action')).toBe(true)
    })
  })
})
