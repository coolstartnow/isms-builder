'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Regressionstest fuer #70: mehrere Routen in templates.js/assessments.js
// riefen async Knex-Store-Methoden ohne `await` auf. Unter STORAGE_BACKEND=json
// sind die entsprechenden Store-Methoden synchron, der Bug blieb dort unsichtbar
// — jede andere Testdatei in diesem Projekt setzt STORAGE_BACKEND=json und haette
// ihn nie gefunden. Dieser Test laeuft deshalb bewusst gegen ein echtes
// SQL-Backend (Default: sqlite, self-contained, Teil von `npm test`) und prueft
// per HTTP, dass die betroffenen Endpunkte echte Daten statt eines leeren
// serialisierten Promise-Objekts ({}) liefern.
//
// Fuer mariadb/pg gezielt (analog dbStoresIntegration.test.js, eigener
// Env-Name statt STORAGE_BACKEND, um nicht mit dem Haupt-CI-Job zu kollidieren):
//   DB_STORES_TEST_BACKEND=mariadb DB_HOST=... DB_PORT=... DB_USER=... DB_PASS=... DB_NAME=... npx jest tests/dbBackendRoutes.test.js --runInBand
//   DB_STORES_TEST_BACKEND=pg      DB_HOST=... DB_PORT=... DB_USER=... DB_PASS=... DB_NAME=... npx jest tests/dbBackendRoutes.test.js --runInBand
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const BACKEND = (process.env.DB_STORES_TEST_BACKEND || 'sqlite').toLowerCase()
process.env.STORAGE_BACKEND = BACKEND

const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

describe(`DB-Backend-Routen [${BACKEND}] — #70 Regression`, () => {
  let dataDir, app, adminCookie, contentownerCookie

  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR   = dataDir
    process.env.JWT_SECRET = 'jest-test-secret-dbbackend-routes'
    process.env.NODE_ENV   = 'test'
    app = require('../server/index.js')
    await app.bootstrap?.()

    adminCookie        = await loginAs(app, 'admin')
    contentownerCookie = await loginAs(app, 'contentowner')
  })

  afterAll(async () => {
    if (BACKEND !== 'json') await require('../server/db/knexDatabase').destroy()
    removeTestDataDir(dataDir)
  })

  test('GET /entities liefert ein Array, kein serialisiertes Promise ({})', async () => {
    const res = await authedGet(app, adminCookie, '/entities')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /entities/tree liefert ein Array', async () => {
    const res = await authedGet(app, adminCookie, '/entities/tree')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /entities legt tatsaechlich einen Datensatz an (kein leeres Promise)', async () => {
    const res = await authedPost(app, adminCookie, '/entities', { name: 'Regressionstest GmbH', type: 'subsidiary' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Regressionstest GmbH')
    expect(res.body.id).toBeTruthy()
  })

  test('GET /templates/tree liefert ein Array', async () => {
    const res = await authedGet(app, adminCookie, '/templates/tree')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  describe('Template-Lifecycle-Routen', () => {
    let templateId

    test('POST /template legt an', async () => {
      const res = await authedPost(app, contentownerCookie, '/template', {
        type: 'policy', language: 'de', title: '#70-Regressionstest', content: '# Test',
      })
      expect(res.status).toBe(201)
      templateId = res.body.id
    })

    test('PUT /template/:type/:id/move liefert ein aufgeloestes Ergebnis, kein {}', async () => {
      const res = await authedPut(app, contentownerCookie, `/template/policy/${templateId}/move`, { parentId: null, sortOrder: 3 })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })

    test('POST /templates/reorder wartet auf den Schreibvorgang', async () => {
      const res = await authedPost(app, contentownerCookie, '/templates/reorder', {
        updates: [{ id: templateId, sortOrder: 7 }],
      })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      const tree = await authedGet(app, contentownerCookie, '/templates/tree')
      const node = tree.body.find(n => n.id === templateId)
      expect(node?.sortOrder).toBe(7)
    })

    test('DELETE + POST restore liefern das echte Objekt, nicht {}', async () => {
      const del = await authedDelete(app, contentownerCookie, `/template/policy/${templateId}`)
      expect(del.status).toBe(200)

      const restore = await authedPost(app, adminCookie, `/template/policy/${templateId}/restore`, {})
      expect(restore.status).toBe(200)
      expect(restore.body.id).toBe(templateId)
      expect(restore.body.deletedAt).toBeNull()
    })

    test('DELETE .../permanent loescht tatsaechlich (kein stets-truthy Promise)', async () => {
      await authedDelete(app, contentownerCookie, `/template/policy/${templateId}`)
      const res = await authedDelete(app, adminCookie, `/template/policy/${templateId}/permanent`)
      expect(res.status).toBe(200)
      expect(res.body.deleted).toBe(true)

      const again = await authedDelete(app, adminCookie, `/template/policy/${templateId}/permanent`)
      expect(again.status).toBe(404)
    })
  })

  test('POST /assessments loest supplierStore.getById auf (supplierName nicht undefined)', async () => {
    const supRes = await authedPost(app, contentownerCookie, '/suppliers', { name: '#70-Lieferant', type: 'saas' })
    expect(supRes.status).toBe(201)

    const res = await authedPost(app, contentownerCookie, '/assessments', { supplierId: supRes.body.id })
    expect(res.status).toBe(201)
    expect(res.body.supplierName).toBe('#70-Lieferant')
  })
  // ── Folgefehler derselben Art (async Knex-Store ohne await) ───────────────
  test('GET /reports/findings und /reports/risks liefern Daten, kein leeres Promise', async () => {
    const f = await authedPost(app, adminCookie, '/findings', { title: 'Report-Test', severity: 'high' })
    expect(f.status).toBe(201)
    const rf = await authedGet(app, adminCookie, '/reports/findings')
    expect(rf.status).toBe(200)
    expect(rf.body.total).toBeGreaterThanOrEqual(1)
    expect(rf.body.bySeverity.high).toBeGreaterThanOrEqual(1)

    const risk = await authedPost(app, adminCookie, '/risks', { title: 'Report-Risiko', probability: 5, impact: 5 })
    expect(risk.status).toBe(201)
    const rr = await authedGet(app, adminCookie, '/reports/risks')
    expect(rr.status).toBe(200)
    expect(rr.body.byLevel.critical).toBeGreaterThanOrEqual(1)

    const csv = await authedGet(app, adminCookie, '/reports/export/csv?type=findings')
    expect(csv.status).toBe(200)
    expect(csv.text).toMatch(/Report-Test/)
  })

  test('Audit-Verwaltung läuft auf dem SQL-Backend (Audit, Prüfpunkt, Finding, Programm)', async () => {
    const a = await authedPost(app, adminCookie, '/audits', { title: 'SQL-Audit', plannedStart: '2026-04-01' })
    expect(a.status).toBe(201)
    const item = await authedPost(app, adminCookie, `/audits/${a.body.id}/checklist`, { question: 'Frage?', result: 'nonconform' })
    expect(item.status).toBe(201)
    const fnd = await authedPost(app, adminCookie, `/audits/${a.body.id}/checklist/${item.body.id}/finding`, {})
    expect(fnd.status).toBe(201)
    const detail = await authedGet(app, adminCookie, `/audits/${a.body.id}`)
    expect(detail.body.findings.map(x => x.id)).toEqual([fnd.body.id])
    expect(detail.body.checklist[0].findingId).toBe(fnd.body.id)

    const p = await authedPost(app, adminCookie, '/audit-programs', { title: 'SQL-Programm', year: 2026 })
    expect((await authedPost(app, adminCookie, `/audit-programs/${p.body.id}/approve`, {})).body.status).toBe('approved')
    expect((await authedGet(app, adminCookie, '/audits/summary')).body.total).toBeGreaterThanOrEqual(1)
  })

  test('Import-Bundle: Dateinamen mit Pfadanteilen werden nicht geschrieben', async () => {
    const outside = path.join(dataDir, '..', 'escape-test.json')
    const bundle = { files: { 'goals.json': [], '../escape-test.json': { x: 1 }, 'sub/dir.json': {}, 'ok-name.json': { a: 1 } },
      gdpr: { '../gdpr-escape.json': {} } }
    const res = await authedPost(app, adminCookie, '/admin/demo-import', bundle)
    expect(res.status).toBe(200)
    expect(fs.existsSync(outside)).toBe(false)
    expect(fs.existsSync(path.join(dataDir, '..', 'gdpr-escape.json'))).toBe(false)
    expect(fs.existsSync(path.join(dataDir, 'sub'))).toBe(false)
    expect(fs.existsSync(path.join(dataDir, 'ok-name.json'))).toBe(true)
  })
})
