// © 2026 Claude Hecker — ISMS Builder V 1.32 — AGPL-3.0
'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let app, request, dataDir

beforeAll(() => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  app     = require('../server/index')
  request = require('supertest')
})
afterAll(() => { removeTestDataDir(dataDir) })

function auth(role) {
  const creds = { admin: ['admin@test.local','adminpass'], auditor: ['aud@test.local','auditorpass'],
                  editor: ['editor@test.local','editorpass'], reader: ['reader@test.local','readerpass'] }
  return request(app).post('/login').send({ email: creds[role][0], password: creds[role][1] })
    .then(r => r.headers['set-cookie'])
}

// ── Summary (leer) ────────────────────────────────────────────────────────────
describe('GET /findings/summary', () => {
  test('reader kann Summary abrufen', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/findings/summary').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total', 0)
    expect(res.body).toHaveProperty('bySeverity')
    expect(res.body).toHaveProperty('byStatus')
    expect(res.body).toHaveProperty('openActions', 0)
    expect(res.body).toHaveProperty('overdueActions', 0)
  })
})

// ── Findings CRUD ─────────────────────────────────────────────────────────────
describe('Findings CRUD', () => {
  let cookie, findingId

  beforeAll(async () => { cookie = await auth('auditor') })

  test('POST /findings — Finding anlegen', async () => {
    const res = await request(app).post('/findings').set('Cookie', cookie).send({
      title:          'Test-Feststellung',
      severity:       'high',
      observation:    'IST: Keine Kontrolle vorhanden',
      requirement:    'SOLL: Kontrolle muss lt. Richtlinie vorhanden sein',
      impact:         'Risiko: Datenverlust möglich',
      recommendation: 'Empfehlung: Sofort implementieren',
      auditor:        'auditor',
      auditedArea:    'IT-Security',
    })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('ref')
    expect(res.body.ref).toMatch(/^FIND-\d{4}-\d{4}$/)
    expect(res.body.title).toBe('Test-Feststellung')
    expect(res.body.severity).toBe('high')
    expect(res.body.status).toBe('open')
    expect(res.body.actions).toEqual([])
    findingId = res.body.id
  })

  test('GET /findings — Liste', async () => {
    const res = await request(app).get('/findings').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  test('GET /findings/:id — Einzelabruf', async () => {
    const res = await request(app).get(`/findings/${findingId}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(findingId)
  })

  test('PUT /findings/:id — Aktualisieren', async () => {
    const res = await request(app).put(`/findings/${findingId}`).set('Cookie', cookie)
      .send({ status: 'in_progress', title: 'Aktualisierte Feststellung' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
    expect(res.body.title).toBe('Aktualisierte Feststellung')
  })

  test('reader kann nicht erstellen (403)', async () => {
    const c = await auth('reader')
    const res = await request(app).post('/findings').set('Cookie', c)
      .send({ title: 'X', severity: 'low' })
    expect(res.status).toBe(403)
  })

  test('Filter nach Status', async () => {
    const res = await request(app).get('/findings?status=in_progress').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.every(f => f.status === 'in_progress')).toBe(true)
  })
})

// ── Maßnahmenplan ─────────────────────────────────────────────────────────────
describe('Maßnahmenplan (Actions)', () => {
  let auditorCookie, editorCookie, findingId, actionId

  beforeAll(async () => {
    auditorCookie = await auth('auditor')
    editorCookie  = await auth('editor')
    const r = await request(app).post('/findings').set('Cookie', auditorCookie).send({
      title: 'Finding für Action-Tests', severity: 'medium'
    })
    findingId = r.body.id
  })

  test('POST /findings/:id/actions — Maßnahme anlegen', async () => {
    const res = await request(app).post(`/findings/${findingId}/actions`)
      .set('Cookie', auditorCookie).send({
        description: 'Sofortmaßnahme durchführen',
        responsible: 'IT-Leiter',
        dueDate:     '2026-12-31',
        status:      'open',
      })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.description).toBe('Sofortmaßnahme durchführen')
    expect(res.body.status).toBe('open')
    actionId = res.body.id
  })

  test('PUT /findings/:id/actions/:actionId — Status aktualisieren', async () => {
    const res = await request(app).put(`/findings/${findingId}/actions/${actionId}`)
      .set('Cookie', editorCookie).send({ status: 'done' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('done')
  })

  test('Action im Finding sichtbar', async () => {
    const res = await request(app).get(`/findings/${findingId}`).set('Cookie', auditorCookie)
    expect(res.status).toBe(200)
    expect(res.body.actions.length).toBe(1)
    expect(res.body.actions[0].status).toBe('done')
  })

  test('DELETE /findings/:id/actions/:actionId', async () => {
    const res = await request(app).delete(`/findings/${findingId}/actions/${actionId}`)
      .set('Cookie', auditorCookie)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)
  })
})

// ── Soft-Delete & Restore ─────────────────────────────────────────────────────
describe('Soft-Delete & Restore', () => {
  let auditorCookie, adminCookie, findingId

  beforeAll(async () => {
    auditorCookie = await auth('auditor')
    adminCookie   = await auth('admin')
    const r = await request(app).post('/findings').set('Cookie', auditorCookie)
      .send({ title: 'Zu löschendes Finding', severity: 'low' })
    findingId = r.body.id
  })

  test('DELETE /findings/:id — Soft-Delete', async () => {
    const res = await request(app).delete(`/findings/${findingId}`).set('Cookie', auditorCookie)
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(true)
  })

  test('Nach Soft-Delete nicht mehr in Liste', async () => {
    const res = await request(app).get('/findings').set('Cookie', auditorCookie)
    expect(res.body.every(f => f.id !== findingId)).toBe(true)
  })

  test('POST /findings/:id/restore — Wiederherstellen (admin)', async () => {
    const res = await request(app).post(`/findings/${findingId}/restore`).set('Cookie', adminCookie)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(findingId)
  })

  test('DELETE /findings/:id/permanent — Endgültig löschen (admin)', async () => {
    // Erst wieder löschen
    await request(app).delete(`/findings/${findingId}`).set('Cookie', auditorCookie)
    const res = await request(app).delete(`/findings/${findingId}/permanent`).set('Cookie', adminCookie)
    expect(res.status).toBe(200)
    expect(res.body.permanent).toBe(true)
  })
})

// ── Summary nach Daten ────────────────────────────────────────────────────────
describe('Summary mit Daten', () => {
  test('Summary zählt korrekt', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/findings/summary').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThanOrEqual(1)
    expect(typeof res.body.bySeverity.high).toBe('number')
    expect(typeof res.body.byStatus.open).toBe('number')
  })
})
