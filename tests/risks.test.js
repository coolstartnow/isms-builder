'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, auditorCookie, readerCookie
let riskId, treatmentId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-risk'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie   = await loginAs(app, 'admin')
  auditorCookie = await loginAs(app, 'auditor')
  readerCookie  = await loginAs(app, 'reader')
})

afterAll(async () => {
  if (riskId) await authedDelete(app, adminCookie, `/risks/${riskId}`)
  removeTestDataDir(dataDir)
})

describe('Risikomanagement CRUD', () => {
  test('GET /risks – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/risks')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /risks/summary', async () => {
    const res = await authedGet(app, readerCookie, '/risks/summary')
    expect(res.status).toBe(200)
  })

  test('POST /risks – auditor erstellt Risiko', async () => {
    const res = await authedPost(app, auditorCookie, '/risks', {
      title:       'SQL-Injection-Risiko',
      category:    'technical',
      probability: 3,
      impact:      4,
      owner:       'IT-Security',
      description: 'Ungefilterte Datenbankabfragen in Legacy-System',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.score).toBe(12) // 3 × 4
    riskId = res.body.id
  })

  test('GET /risks/:id', async () => {
    const res = await authedGet(app, readerCookie, `/risks/${riskId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(riskId)
    expect(res.body.title).toBe('SQL-Injection-Risiko')
  })

  test('PUT /risks/:id – auditor aktualisiert', async () => {
    const res = await authedPut(app, auditorCookie, `/risks/${riskId}`, {
      probability: 2,
      impact:      4,
    })
    expect(res.status).toBe(200)
    expect(res.body.score).toBe(8)
  })

  test('GET /risks – Filter nach Kategorie', async () => {
    const res = await authedGet(app, readerCookie, '/risks?category=technical')
    expect(res.status).toBe(200)
    expect(res.body.every(r => r.category === 'technical')).toBe(true)
  })

  // ─── Behandlungspläne ────────────────────────────────────────────────────────

  test('POST /risks/:id/treatments – Behandlungsplan anlegen', async () => {
    const res = await authedPost(app, auditorCookie, `/risks/${riskId}/treatments`, {
      measure:  'Input-Validierung implementieren',
      status:   'planned',
      dueDate:  '2026-12-31',
      owner:    'Dev-Team',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    treatmentId = res.body.id
  })

  test('PUT /risks/:id/treatments/:tpId – Behandlungsplan aktualisieren', async () => {
    const res = await authedPut(app, auditorCookie, `/risks/${riskId}/treatments/${treatmentId}`, {
      status: 'in_progress',
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
  })

  test('DELETE /risks/:id/treatments/:tpId', async () => {
    const res = await authedDelete(app, auditorCookie, `/risks/${riskId}/treatments/${treatmentId}`)
    expect(res.status).toBe(200)
    treatmentId = null
  })

  test('DELETE /risks/:id – admin löscht Risiko', async () => {
    const res = await authedDelete(app, adminCookie, `/risks/${riskId}`)
    expect(res.status).toBe(200)
    riskId = null
  })
})

// #93 – Stufe in Report und CSV, Sortierung/Filter nach Stufe im UI
describe('Risiko-Stufe (#93)', () => {
  let levelRiskId

  afterAll(async () => {
    if (levelRiskId) await authedDelete(app, adminCookie, `/risks/${levelRiskId}`)
  })

  test('Report liefert die berechnete Stufe, CSV-Spalte Schweregrad ist gefüllt', async () => {
    const created = await authedPost(app, auditorCookie, '/risks', {
      title: 'Stufen-Test', category: 'technical', probability: 4, impact: 4,
    })
    expect(created.status).toBe(201)
    levelRiskId = created.body.id
    expect(created.body.riskLevel).toBe('critical')

    const rep = await authedGet(app, readerCookie, '/reports/risks')
    expect(rep.status).toBe(200)
    expect(rep.body.byLevel.critical).toBeGreaterThanOrEqual(1)
    const row = rep.body.risks.find(r => r.id === levelRiskId)
    expect(row.level).toBe('critical')

    const csv = await authedGet(app, readerCookie, '/reports/export/csv?type=risks')
    expect(csv.status).toBe(200)
    const line = csv.text.split('\n').find(l => l.includes('Stufen-Test'))
    expect(line).toMatch(/critical/)
  })

  test('UI: Spalte „Stufe“ ist sortierbar, Filter nach Stufe vorhanden', () => {
    const fs = require('fs'), path = require('path')
    const app = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
    expect(app).toMatch(/let _riskFilterLevel/)
    expect(app).toMatch(/let _riskSort/)
    expect(app).toMatch(/class="risk-th-sort"[^>]*onclick="_riskSort=/)
    expect(app).toMatch(/_riskFilterLevel=this\.value/)
  })
})
