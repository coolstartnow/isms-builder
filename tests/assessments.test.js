// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Supplier Self-Assessment Tests
'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let app, request, dataDir

beforeAll(() => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-assessments'
  app     = require('../server/index')
  request = require('supertest')
})
afterAll(() => { removeTestDataDir(dataDir) })

function auth(role) {
  const creds = {
    admin:  ['admin@test.local',  'adminpass'],
    editor: ['editor@test.local', 'editorpass'],
    reader: ['reader@test.local', 'readerpass'],
  }
  return request(app).post('/login').send({ email: creds[role][0], password: creds[role][1] })
    .then(r => r.headers['set-cookie'])
}

// Hilfsfunktion: Supplier anlegen
async function createSupplier(cookie) {
  const res = await request(app).post('/suppliers')
    .set('Cookie', cookie)
    .send({ name: 'Test Lieferant GmbH', type: 'software', criticality: 'high', status: 'active', country: 'DE' })
  return res.body
}

// ── Default Questions ─────────────────────────────────────────────────────────
describe('GET /assessments/questions/default', () => {
  test('reader kann Standardfragen abrufen (DE)', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/assessments/questions/default').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('section')
    expect(res.body[0]).toHaveProperty('questions')
    expect(res.body[0].section).toMatch(/Informationssicherheit/)
  })

  test('Standardfragen auf Englisch (?lang=en)', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/assessments/questions/default?lang=en').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body[0].section).toBe('Information Security Policies')
  })

  test('Standardfragen auf Französisch (?lang=fr)', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/assessments/questions/default?lang=fr').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body[0].section).toMatch(/Politiques/)
  })

  test('Standardfragen auf Niederländisch (?lang=nl)', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/assessments/questions/default?lang=nl').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body[0].section).toMatch(/Informatiebeveiligingsbeleid/)
  })

  test('unbekannte Sprache fällt auf DE zurück', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get('/assessments/questions/default?lang=xx').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body[0].section).toMatch(/Informationssicherheit/)
  })

  test('nicht authentifiziert → 401', async () => {
    const res = await request(app).get('/assessments/questions/default')
    expect(res.status).toBe(401)
  })
})

// ── Assessment erstellen ──────────────────────────────────────────────────────
describe('POST /assessments', () => {
  test('editor kann Assessment-Link erstellen (DE)', async () => {
    const cookie  = await auth('editor')
    const supplier = await createSupplier(cookie)
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie)
      .send({ supplierId: supplier.id, title: 'Testbefragung', dueDate: '2026-12-31', language: 'de' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('token')
    expect(res.body.status).toBe('pending')
    expect(res.body.language).toBe('de')
    expect(res.body.supplierName).toBe('Test Lieferant GmbH')
    expect(res.body.title).toBe('Testbefragung')
    expect(Array.isArray(res.body.questions)).toBe(true)
    expect(res.body.questions[0].section).toMatch(/Informationssicherheit/)
  })

  test('Assessment auf Englisch erstellen', async () => {
    const cookie   = await auth('editor')
    const supplier = await createSupplier(cookie)
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie)
      .send({ supplierId: supplier.id, language: 'en' })
    expect(res.status).toBe(201)
    expect(res.body.language).toBe('en')
    expect(res.body.questions[0].section).toBe('Information Security Policies')
  })

  test('Assessment auf Französisch erstellen', async () => {
    const cookie   = await auth('editor')
    const supplier = await createSupplier(cookie)
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie)
      .send({ supplierId: supplier.id, language: 'fr' })
    expect(res.status).toBe(201)
    expect(res.body.language).toBe('fr')
    expect(res.body.questions[0].section).toMatch(/Politiques/)
  })

  test('Assessment auf Niederländisch erstellen', async () => {
    const cookie   = await auth('editor')
    const supplier = await createSupplier(cookie)
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie)
      .send({ supplierId: supplier.id, language: 'nl' })
    expect(res.status).toBe(201)
    expect(res.body.language).toBe('nl')
    expect(res.body.questions[0].section).toMatch(/Informatiebeveiligingsbeleid/)
  })

  test('ungültige Sprache fällt auf DE zurück', async () => {
    const cookie   = await auth('editor')
    const supplier = await createSupplier(cookie)
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie)
      .send({ supplierId: supplier.id, language: 'it' })
    expect(res.status).toBe(201)
    expect(res.body.language).toBe('de')
  })

  test('reader kann kein Assessment erstellen → 403', async () => {
    const adminCookie  = await auth('admin')
    const supplier = await createSupplier(adminCookie)
    const cookie   = await auth('reader')
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie)
      .send({ supplierId: supplier.id })
    expect(res.status).toBe(403)
  })

  test('fehlende supplierId → 400', async () => {
    const cookie = await auth('editor')
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie).send({})
    expect(res.status).toBe(400)
  })

  test('ungültige supplierId → 404', async () => {
    const cookie = await auth('editor')
    const res = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: 'nonexistent' })
    expect(res.status).toBe(404)
  })
})

// ── Assessment abrufen ────────────────────────────────────────────────────────
describe('GET /assessments + GET /assessments/:id', () => {
  let cookie, supplierId, assessmentId

  beforeAll(async () => {
    cookie = await auth('editor')
    const s = await createSupplier(cookie)
    supplierId = s.id
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId, title: 'Abruf-Test' })
    assessmentId = cr.body.id
  })

  test('GET /assessments — Liste abrufen', async () => {
    const res = await request(app).get('/assessments').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some(a => a.id === assessmentId)).toBe(true)
  })

  test('GET /assessments?supplierId=xxx — gefiltert', async () => {
    const res = await request(app).get(`/assessments?supplierId=${supplierId}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.every(a => a.supplierId === supplierId)).toBe(true)
  })

  test('GET /assessments/:id — Einzelabruf', async () => {
    const res = await request(app).get(`/assessments/${assessmentId}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(assessmentId)
  })

  test('GET /assessments/:id — nicht gefunden → 404', async () => {
    const res = await request(app).get('/assessments/nonexistent').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })
})

// ── Öffentliches Portal ───────────────────────────────────────────────────────
describe('Public supplier portal', () => {
  let token, assessmentId

  beforeAll(async () => {
    const cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id, title: 'Portal-Test' })
    token = cr.body.token
    assessmentId = cr.body.id
  })

  test('GET /supplier-assessment/:token — HTML-Fragebogen ausliefern (DE)', async () => {
    const res = await request(app).get(`/supplier-assessment/${token}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/html/)
    expect(res.text).toContain('Portal-Test')
    expect(res.text).toContain('ISMS Builder')
    expect(res.text).toContain('Fragebogen absenden')
  })

  test('EN-Assessment: Portal-Seite auf Englisch', async () => {
    const cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id, title: 'EN Test', language: 'en' })
    const res = await request(app).get(`/supplier-assessment/${cr.body.token}`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('Submit questionnaire')
    expect(res.text).toContain('Yes')
    expect(res.text).toContain('No')
  })

  test('FR-Assessment: Portal-Seite auf Französisch', async () => {
    const cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id, title: 'FR Test', language: 'fr' })
    const res = await request(app).get(`/supplier-assessment/${cr.body.token}`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('Soumettre le questionnaire')
    expect(res.text).toContain('Oui')
  })

  test('NL-Assessment: Portal-Seite auf Niederländisch', async () => {
    const cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id, title: 'NL Test', language: 'nl' })
    const res = await request(app).get(`/supplier-assessment/${cr.body.token}`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('Vragenlijst indienen')
    expect(res.text).toContain('Ja')
  })

  test('GET /supplier-assessment/:token — ungültiger Token → 404', async () => {
    const res = await request(app).get('/supplier-assessment/invalid-token-xyz')
    expect(res.status).toBe(404)
  })

  test('POST /supplier-assessment/:token — Antworten einreichen', async () => {
    const res = await request(app)
      .post(`/supplier-assessment/${token}`)
      .type('form')
      .send({ q_pol_1: 'yes', q_pol_2: 'no', q_pol_3: 'yes' })
    expect(res.status).toBe(200)
    expect(res.text).toContain('Vielen Dank')
  })

  test('nach Einreichung: Status ist submitted', async () => {
    const cookie = await auth('reader')
    const res = await request(app).get(`/assessments/${assessmentId}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('submitted')
    expect(res.body.score).not.toBeNull()
  })

  test('nochmaliges Einreichen → 400', async () => {
    const res = await request(app)
      .post(`/supplier-assessment/${token}`)
      .type('form')
      .send({ q_pol_1: 'yes' })
    expect(res.status).toBe(400)
  })

  test('nach Einreichung: HTML zeigt "bereits eingereicht"', async () => {
    const res = await request(app).get(`/supplier-assessment/${token}`)
    expect(res.status).toBe(200)
    expect(res.text).toContain('bereits')
  })
})

// ── Score-Berechnung ──────────────────────────────────────────────────────────
describe('Score calculation', () => {
  test('Score = 100% wenn alle yesno-Fragen mit ja beantwortet', async () => {
    const cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id })
    const { token } = cr.body

    // Alle yesno-Fragen mit 'yes' beantworten
    const defaultQs = await request(app).get('/assessments/questions/default').set('Cookie', cookie)
    const allQs = defaultQs.body.flatMap(sec => sec.questions)
    const formData = {}
    allQs.forEach(q => { formData[q.id] = q.type === 'yesno' ? 'yes' : 'Testantwort' })

    await request(app).post(`/supplier-assessment/${token}`).type('form').send(formData)

    const detail = await request(app).get(`/assessments/${cr.body.id}`).set('Cookie', cookie)
    expect(detail.body.score).toBe(100)
  })

  test('Score = 0% wenn alle yesno-Fragen mit nein beantwortet', async () => {
    const cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id })
    const { token } = cr.body

    const defaultQs = await request(app).get('/assessments/questions/default').set('Cookie', cookie)
    const allQs = defaultQs.body.flatMap(sec => sec.questions)
    const formData = {}
    allQs.forEach(q => { formData[q.id] = q.type === 'yesno' ? 'no' : '' })

    await request(app).post(`/supplier-assessment/${token}`).type('form').send(formData)

    const detail = await request(app).get(`/assessments/${cr.body.id}`).set('Cookie', cookie)
    expect(detail.body.score).toBe(0)
  })
})

// ── Review ────────────────────────────────────────────────────────────────────
describe('PUT /assessments/:id/review', () => {
  let cookie, assessmentId

  beforeAll(async () => {
    cookie = await auth('editor')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id })
    assessmentId = cr.body.id
    // Einreichen
    await request(app).post(`/supplier-assessment/${cr.body.token}`).type('form').send({ q_pol_1: 'yes' })
  })

  test('editor kann Review speichern', async () => {
    const res = await request(app).put(`/assessments/${assessmentId}/review`)
      .set('Cookie', cookie)
      .send({ reviewNote: 'Alles in Ordnung', status: 'accepted' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('accepted')
    expect(res.body.reviewNote).toBe('Alles in Ordnung')
    expect(res.body.reviewedBy).toBeTruthy()
  })

  test('reader kann nicht reviewen → 403', async () => {
    const rCookie = await auth('reader')
    const res = await request(app).put(`/assessments/${assessmentId}/review`)
      .set('Cookie', rCookie).send({ status: 'reviewed' })
    expect(res.status).toBe(403)
  })
})

// ── Löschen ───────────────────────────────────────────────────────────────────
describe('DELETE /assessments/:id', () => {
  test('admin kann Assessment löschen', async () => {
    const cookie = await auth('admin')
    const s = await createSupplier(cookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', cookie).send({ supplierId: s.id })
    const id = cr.body.id

    const del = await request(app).delete(`/assessments/${id}`).set('Cookie', cookie)
    expect(del.status).toBe(200)

    const check = await request(app).get(`/assessments/${id}`).set('Cookie', cookie)
    expect(check.status).toBe(404)
  })

  test('editor kann nicht löschen → 403', async () => {
    const adminCookie = await auth('admin')
    const s = await createSupplier(adminCookie)
    const cr = await request(app).post('/assessments')
      .set('Cookie', adminCookie).send({ supplierId: s.id })

    const eCookie = await auth('editor')
    const res = await request(app).delete(`/assessments/${cr.body.id}`).set('Cookie', eCookie)
    expect(res.status).toBe(403)
  })
})
