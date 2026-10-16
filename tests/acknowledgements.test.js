// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const fs   = require('fs')
const path = require('path')

let app, request, dataDir

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-ack'
  process.env.NODE_ENV = 'test'
  if (process.env.STORAGE_BACKEND && process.env.STORAGE_BACKEND !== 'json') {
    const knexDb = require('../server/db/knexDatabase')
    await knexDb.init()
  }
  app     = require('../server/index')
  request = require('supertest')
})
afterAll(() => { removeTestDataDir(dataDir) })

function auth(role) {
  const creds = {
    admin:        ['admin@test.local',   'adminpass'],
    contentowner: ['co@test.local',      'copass'],
    editor:       ['editor@test.local',  'editorpass'],
    reader:       ['reader@test.local',  'readerpass'],
  }
  return request(app).post('/login').send({ email: creds[role][0], password: creds[role][1] })
    .then(r => r.headers['set-cookie'])
}

// Hilfsfunktion: approved template in DB anlegen
async function createApprovedTemplate(cookie) {
  const cr = await request(app).post('/template')
    .set('Cookie', cookie)
    .send({ type: 'policy', title: 'Test Richtlinie', language: 'de', content: 'Testinhalt.' })
  const id = cr.body.id
  // draft → review → approved (admin hat Rang 4, kann alle Statusübergänge)
  await request(app).patch(`/template/policy/${id}/status`)
    .set('Cookie', cookie).send({ status: 'review' })
  await request(app).patch(`/template/policy/${id}/status`)
    .set('Cookie', cookie).send({ status: 'approved' })
  return id
}

// ── Ack Settings ──────────────────────────────────────────────────────────────
describe('Policy Ack Settings', () => {
  test('admin kann Modus lesen', async () => {
    const cookie = await auth('admin')
    const res = await request(app).get('/admin/ack-settings').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('policyAckMode')
    expect(['email_campaign','manual','distribution_only']).toContain(res.body.policyAckMode)
  })

  test('admin kann Modus ändern', async () => {
    const cookie = await auth('admin')
    const res = await request(app).put('/admin/ack-settings')
      .set('Cookie', cookie).send({ policyAckMode: 'manual' })
    expect(res.status).toBe(200)
    expect(res.body.policyAckMode).toBe('manual')
  })

  test('ungültiger Modus wird abgelehnt', async () => {
    const cookie = await auth('admin')
    const res = await request(app).put('/admin/ack-settings')
      .set('Cookie', cookie).send({ policyAckMode: 'invalid_mode' })
    expect(res.status).toBe(400)
  })

  test('reader kann Modus NICHT ändern', async () => {
    const cookie = await auth('reader')
    const res = await request(app).put('/admin/ack-settings')
      .set('Cookie', cookie).send({ policyAckMode: 'manual' })
    expect(res.status).toBe(403)
  })
})

// ── Summary ───────────────────────────────────────────────────────────────────
describe('GET /distributions/summary', () => {
  test('reader kann Summary abrufen', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/distributions/summary').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('activeDistributions')
    expect(res.body).toHaveProperty('pendingAcks')
  })
})

// ── Distributions CRUD ────────────────────────────────────────────────────────
describe('Distributions CRUD', () => {
  let adminCookie, coCookie, distId, templateId

  beforeAll(async () => {
    adminCookie = await auth('admin')
    coCookie    = await auth('contentowner')
    templateId  = await createApprovedTemplate(adminCookie)
  })

  test('contentowner kann Verteilrunde anlegen (manual mode)', async () => {
    // Modus auf manual setzen
    await request(app).put('/admin/ack-settings')
      .set('Cookie', adminCookie).send({ policyAckMode: 'manual' })

    const res = await request(app).post('/distributions')
      .set('Cookie', coCookie)
      .send({ templateId, targetGroup: 'Alle Mitarbeiter', dueDate: '2026-04-30' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.mode).toBe('manual')
    expect(res.body.templateId).toBe(templateId)
    expect(res.body.targetGroup).toBe('Alle Mitarbeiter')
    distId = res.body.id
  })

  test('Verteilrunde ohne templateId wird abgelehnt', async () => {
    const res = await request(app).post('/distributions')
      .set('Cookie', coCookie).send({ targetGroup: 'Test' })
    expect(res.status).toBe(400)
  })

  test('reader kann Verteilrunden NICHT anlegen', async () => {
    const cookie = await auth('reader')
    const res = await request(app).post('/distributions')
      .set('Cookie', cookie).send({ templateId })
    expect(res.status).toBe(403)
  })

  test('contentowner kann alle Verteilrunden abrufen', async () => {
    const res = await request(app).get('/distributions').set('Cookie', coCookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('stats')
  })

  test('reader kann Verteilrunden NICHT abrufen', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/distributions').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  test('Verteilrunde Detail abrufen', async () => {
    const res = await request(app).get(`/distributions/${distId}`).set('Cookie', coCookie)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(distId)
    expect(res.body.stats).toBeDefined()
  })

  test('Status aktualisieren', async () => {
    const res = await request(app).put(`/distributions/${distId}`)
      .set('Cookie', coCookie).send({ status: 'completed' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
  })
})

// ── Manuelle Bestätigungen ────────────────────────────────────────────────────
describe('Manual Acknowledgements', () => {
  let adminCookie, coCookie, distId, templateId, ackId

  beforeAll(async () => {
    adminCookie = await auth('admin')
    coCookie    = await auth('contentowner')
    templateId  = await createApprovedTemplate(adminCookie)

    await request(app).put('/admin/ack-settings')
      .set('Cookie', adminCookie).send({ policyAckMode: 'manual' })

    const dr = await request(app).post('/distributions')
      .set('Cookie', coCookie).send({ templateId, targetGroup: 'IT' })
    distId = dr.body.id
  })

  test('manuelle Bestätigung hinzufügen', async () => {
    const res = await request(app).post(`/distributions/${distId}/acks`)
      .set('Cookie', coCookie)
      .send({ recipientEmail: 'alice@firma.de', recipientName: 'Alice Müller' })
    expect(res.status).toBe(201)
    expect(res.body.recipientEmail).toBe('alice@firma.de')
    expect(res.body.method).toBe('manual')
    ackId = res.body.id
  })

  test('Bestätigungsliste abrufen', async () => {
    const res = await request(app).get(`/distributions/${distId}/acks`).set('Cookie', coCookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  test('CSV Import', async () => {
    const rows = [
      { email: 'bob@firma.de',   name: 'Bob Schmidt', acknowledgedAt: '2026-03-10T10:00:00Z' },
      { email: 'carol@firma.de', name: 'Carol Weber',  acknowledgedAt: null },
      { email: '',               name: 'Kein Email'  },  // soll übersprungen werden
    ]
    const res = await request(app).post(`/distributions/${distId}/acks/import`)
      .set('Cookie', coCookie).send({ rows })
    expect(res.status).toBe(200)
    expect(res.body.imported).toBe(2)
    expect(res.body.skipped).toBe(1)
  })

  test('Bestätigung löschen (admin)', async () => {
    const res = await request(app).delete(`/distributions/${distId}/acks/${ackId}`)
      .set('Cookie', adminCookie)
    expect(res.status).toBe(200)
  })

  test('Bestätigung NICHT löschen (contentowner)', async () => {
    // ackId wurde bereits gelöscht — zuerst neue anlegen
    const addRes = await request(app).post(`/distributions/${distId}/acks`)
      .set('Cookie', coCookie).send({ recipientEmail: 'temp@test.de' })
    const res = await request(app).delete(`/distributions/${distId}/acks/${addRes.body.id}`)
      .set('Cookie', coCookie)
    expect(res.status).toBe(403)
  })
})

// ── CSV Export ────────────────────────────────────────────────────────────────
describe('CSV Export', () => {
  let coCookie, distId, templateId, adminCookie

  beforeAll(async () => {
    adminCookie = await auth('admin')
    coCookie    = await auth('contentowner')
    templateId  = await createApprovedTemplate(adminCookie)

    const dr = await request(app).post('/distributions')
      .set('Cookie', coCookie).send({ templateId, targetGroup: 'Alle' })
    distId = dr.body.id
    await request(app).post(`/distributions/${distId}/acks`)
      .set('Cookie', coCookie).send({ recipientEmail: 'test@test.de', recipientName: 'Test User' })
  })

  test('CSV Export gibt CSV zurück', async () => {
    const res = await request(app).get(`/distributions/${distId}/export/csv`).set('Cookie', coCookie)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('test@test.de')
    expect(res.text).toContain('Test User')
  })
})

// ── Email Campaign Mode ───────────────────────────────────────────────────────
describe('Email Campaign Mode', () => {
  let adminCookie, coCookie, distId, templateId

  beforeAll(async () => {
    adminCookie = await auth('admin')
    coCookie    = await auth('contentowner')
    templateId  = await createApprovedTemplate(adminCookie)

    await request(app).put('/admin/ack-settings')
      .set('Cookie', adminCookie).send({ policyAckMode: 'email_campaign' })
  })

  test('Email-Kampagne anlegen mit E-Mail-Liste', async () => {
    const res = await request(app).post('/distributions')
      .set('Cookie', coCookie)
      .send({
        templateId,
        targetGroup: 'IT-Abteilung',
        emailList: ['alice@test.de', 'bob@test.de'],
      })
    expect(res.status).toBe(201)
    expect(res.body.mode).toBe('email_campaign')
    expect(res.body.emailList).toContain('alice@test.de')
    distId = res.body.id
  })

  test('Ack-Records wurden für E-Mails erstellt', async () => {
    const res = await request(app).get(`/distributions/${distId}/acks`).set('Cookie', coCookie)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body.every(a => a.token)).toBe(true)
    expect(res.body.every(a => a.acknowledgedAt === null)).toBe(true)
  })

  test('Token-Bestätigungs-Seite ist öffentlich erreichbar', async () => {
    const acksRes = await request(app).get(`/distributions/${distId}/acks`).set('Cookie', coCookie)
    const token = acksRes.body[0].token
    const res = await request(app).get(`/ack/${token}`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('ISMS Builder')
  })

  test('Bestätigung per Token speichern', async () => {
    const acksRes = await request(app).get(`/distributions/${distId}/acks`).set('Cookie', coCookie)
    const token = acksRes.body[0].token
    // Sprache der öffentlichen Seite: ?lang= (das Formular der Bestätigungsseite reicht sie durch)
    const res = await request(app).post(`/ack/${token}?lang=de`)
      .type('form').send({ recipientName: 'Alice Testuser' })
    expect(res.status).toBe(200)
    expect(res.text).toContain('Vielen Dank')
  })

  test('Doppelte Bestätigung ist idempotent', async () => {
    const acksRes = await request(app).get(`/distributions/${distId}/acks`).set('Cookie', coCookie)
    const confirmedAck = acksRes.body.find(a => a.acknowledgedAt !== null)
    expect(confirmedAck).toBeDefined()
    // Erneut bestätigen → sollte 200 zurückgeben (nicht Fehler)
    const res = await request(app).post(`/ack/${confirmedAck.token}`)
      .type('form').send({ recipientName: 'Alice nochmal' })
    expect(res.status).toBe(200)
  })

  test('ungültiger Token gibt 404', async () => {
    const res = await request(app).post('/ack/invalid-token-xyz')
      .type('form').send({ recipientName: 'Test' })
    expect(res.status).toBe(404)
  })

  test('Stats zeigen Fortschritt', async () => {
    const res = await request(app).get(`/distributions/${distId}`).set('Cookie', coCookie)
    expect(res.body.stats.confirmed).toBe(1)
    expect(res.body.stats.total).toBe(2)
  })
})

// ── Verteilrunde löschen ──────────────────────────────────────────────────────
describe('Delete Distribution', () => {
  let adminCookie, coCookie, distId, templateId

  beforeAll(async () => {
    adminCookie = await auth('admin')
    coCookie    = await auth('contentowner')
    templateId  = await createApprovedTemplate(adminCookie)

    const dr = await request(app).post('/distributions')
      .set('Cookie', coCookie).send({ templateId })
    distId = dr.body.id
  })

  test('contentowner kann NICHT löschen', async () => {
    const res = await request(app).delete(`/distributions/${distId}`).set('Cookie', coCookie)
    expect(res.status).toBe(403)
  })

  test('admin kann löschen', async () => {
    const res = await request(app).delete(`/distributions/${distId}`).set('Cookie', adminCookie)
    expect(res.status).toBe(200)
  })

  test('nach Löschen nicht mehr abrufbar', async () => {
    const res = await request(app).get(`/distributions/${distId}`).set('Cookie', coCookie)
    expect(res.status).toBe(404)
  })
})
