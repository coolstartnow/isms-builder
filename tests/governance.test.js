'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let reviewId, actionId, meetingId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-governance'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie  = await loginAs(app, 'admin')
  editorCookie = await loginAs(app, 'editor')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(async () => {
  removeTestDataDir(dataDir)
})

describe('Governance Module', () => {
  // ── Summary ──────────────────────────────────────────────────────────────

  test('GET /governance/summary → 200 mit korrekter Struktur', async () => {
    const res = await authedGet(app, readerCookie, '/governance/summary')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('reviews')
    expect(res.body).toHaveProperty('actions')
    expect(res.body).toHaveProperty('meetings')
    expect(res.body.reviews).toHaveProperty('total')
    expect(res.body.actions).toHaveProperty('overdue')
    expect(res.body.meetings).toHaveProperty('upcoming')
  })

  // ── Reviews ───────────────────────────────────────────────────────────────

  test('GET /governance/reviews → 200, leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/governance/reviews')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('reader darf NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/governance/reviews', {
      title: 'Test Review', type: 'annual',
    })
    expect(res.status).toBe(403)
  })

  test('unauthentifizierter Zugriff gesperrt (401)', async () => {
    const request = require('supertest')
    const res = await request(app).get('/governance/reviews')
    expect([401, 403]).toContain(res.status)
  })

  test('POST /governance/reviews – editor erstellt Review (201)', async () => {
    const res = await authedPost(app, editorCookie, '/governance/reviews', {
      title:        'Jährlicher Management Review 2025',
      type:         'annual',
      date:         '2025-11-07',
      nextReviewDate: '2026-11-06',
      status:       'planned',
      chair:        'Dr. Müller (CEO)',
      participants: 'CISO, CTO, CFO',
      inputAuditResults: 'Keine wesentlichen Findings.',
      decisions:    'ISMS-Scope bleibt unverändert.',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^mgmt_/)
    expect(res.body.title).toBe('Jährlicher Management Review 2025')
    expect(res.body.type).toBe('annual')
    expect(res.body.status).toBe('planned')
    reviewId = res.body.id
  })

  test('GET /governance/reviews → enthält erstellten Review', async () => {
    const res = await authedGet(app, readerCookie, '/governance/reviews')
    expect(res.status).toBe(200)
    expect(res.body.some(r => r.id === reviewId)).toBe(true)
  })

  test('GET /governance/reviews/:id → 200', async () => {
    const res = await authedGet(app, readerCookie, `/governance/reviews/${reviewId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(reviewId)
    expect(res.body.chair).toBe('Dr. Müller (CEO)')
  })

  test('GET /governance/reviews/:id → 404 bei unbekannter ID', async () => {
    const res = await authedGet(app, readerCookie, '/governance/reviews/mgmt_000000xx')
    expect(res.status).toBe(404)
  })

  test('PUT /governance/reviews/:id → 200', async () => {
    const res = await authedPut(app, editorCookie, `/governance/reviews/${reviewId}`, {
      status: 'completed',
      decisions: 'Budget für 2026 genehmigt.',
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(res.body.decisions).toBe('Budget für 2026 genehmigt.')
  })

  test('editor darf Review NICHT löschen (403)', async () => {
    const res = await authedDelete(app, editorCookie, `/governance/reviews/${reviewId}`)
    expect(res.status).toBe(403)
  })

  test('DELETE /governance/reviews/:id – admin löscht (soft-delete)', async () => {
    const res = await authedDelete(app, adminCookie, `/governance/reviews/${reviewId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('GET /governance/reviews/:id → 404 nach soft-delete', async () => {
    const res = await authedGet(app, readerCookie, `/governance/reviews/${reviewId}`)
    expect(res.status).toBe(404)
  })

  // ── Actions ───────────────────────────────────────────────────────────────

  test('GET /governance/actions → 200, leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/governance/actions')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /governance/actions – editor erstellt Maßnahme (201)', async () => {
    const res = await authedPost(app, editorCookie, '/governance/actions', {
      title:       'Penetrationstest Produktionsnetz',
      description: 'Externer Pentest Q2/2025',
      source:      'internal_audit',
      owner:       'Max Mustermann',
      ownerEmail:  'max@test.de',
      dueDate:     '2025-06-30',
      priority:    'high',
      status:      'open',
      progress:    0,
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^meas_/)   // Maßnahmen liegen seit 1.80 im zentralen Register (früher gact_)
    expect(res.body.title).toBe('Penetrationstest Produktionsnetz')
    expect(res.body.priority).toBe('high')
    actionId = res.body.id
  })

  test('PUT /governance/actions/:id → 200', async () => {
    const res = await authedPut(app, editorCookie, `/governance/actions/${actionId}`, {
      status:   'in_progress',
      progress: 35,
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
    expect(res.body.progress).toBe(35)
  })

  test('DELETE /governance/actions/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/governance/actions/${actionId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  // ── Meetings ──────────────────────────────────────────────────────────────

  test('GET /governance/meetings → 200, leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/governance/meetings')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /governance/meetings – editor erstellt Sitzung (201)', async () => {
    const res = await authedPost(app, editorCookie, '/governance/meetings', {
      title:       'ISMS-Ausschuss Q1/2025',
      committee:   'isms_committee',
      date:        '2025-03-11',
      location:    'Konferenzraum EG',
      chair:       'Claudia Meier (CISO)',
      secretary:   'Anna Fischer',
      participants:'CEO, CTO, CFO',
      agenda:      '1. TOP: Status ISMS\n2. TOP: Maßnahmenplan',
      decisions:   'Alle Maßnahmen bestätigt.',
      approved:    true,
      approvedBy:  'Dr. Müller',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.id).toMatch(/^meet_/)
    expect(res.body.title).toBe('ISMS-Ausschuss Q1/2025')
    expect(res.body.approved).toBe(true)
    meetingId = res.body.id
  })

  test('PUT /governance/meetings/:id → 200', async () => {
    const res = await authedPut(app, editorCookie, `/governance/meetings/${meetingId}`, {
      nextMeetingDate: '2025-06-10',
      notes:           'Protokoll versendet.',
    })
    expect(res.status).toBe(200)
    expect(res.body.nextMeetingDate).toBe('2025-06-10')
  })

  test('DELETE /governance/meetings/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/governance/meetings/${meetingId}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  test('DELETE /governance/meetings/:id – 404 bei unbekannter ID', async () => {
    const res = await authedDelete(app, adminCookie, '/governance/meetings/meet_000000xx')
    expect(res.status).toBe(404)
  })
})
