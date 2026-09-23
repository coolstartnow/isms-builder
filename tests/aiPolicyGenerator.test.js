'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// AI Policy Assistant (Discussion #87): POST /api/ai/generate-policy.
// Ollama läuft in dieser Testumgebung nicht (kein Platz/keine Leistung dafür) —
// alle Erfolgs-/Fehlerfälle werden über global.fetch gemockt, analog zu
// tests/updateCheck.test.js.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedPost, authedPut } = require('./setup/authHelper')

let dataDir, app, contentownerCookie, editorCookie, adminCookie
let originalFetch

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-aipolicygen'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  contentownerCookie = await loginAs(app, 'contentowner')
  editorCookie       = await loginAs(app, 'editor')
  adminCookie        = await loginAs(app, 'admin')
})

afterAll(() => removeTestDataDir(dataDir))

beforeEach(() => { originalFetch = global.fetch })
afterEach(() => { global.fetch = originalFetch })

function mockOllamaResponse(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('POST /api/ai/generate-policy', () => {
  test('editor darf NICHT zugreifen (403)', async () => {
    const res = await authedPost(app, editorCookie, '/api/ai/generate-policy', {
      title: 'Test', type: 'Policy', language: 'de',
    })
    expect(res.status).toBe(403)
  })

  test('400 wenn Pflichtfelder fehlen', async () => {
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Test',
    })
    expect(res.status).toBe(400)
  })

  test('503 wenn KI-Integration deaktiviert ist', async () => {
    await authedPut(app, adminCookie, '/admin/ai-settings', { aiEnabled: false })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Test', type: 'Policy', language: 'de',
    })
    expect(res.status).toBe(503)
    // wieder aktivieren für die folgenden Tests
    await authedPut(app, adminCookie, '/admin/ai-settings', { aiEnabled: true })
  })

  test('Erfolgsfall: liefert generierten Markdown-Content (200)', async () => {
    mockOllamaResponse(200, { response: '# Informationssicherheitsrichtlinie\n\n## Zweck\n\nDient dem Schutz von Informationswerten.' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Informationssicherheitsrichtlinie', type: 'Policy', language: 'de',
    })
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('# Informationssicherheitsrichtlinie')
  })

  test('Erfolgsfall funktioniert auch für andere Dokumenttypen (z.B. Incident)', async () => {
    mockOllamaResponse(200, { response: '# Vorfallmeldeprozess\n\n## Zweck\n\nRegelt die Meldewege bei Sicherheitsvorfällen.' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Vorfallmeldeprozess', type: 'Incident', language: 'en',
    })
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('# Vorfallmeldeprozess')
  })

  test('502 bei Ollama-Fehler (Netzwerk nicht erreichbar)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Test', type: 'Policy', language: 'de',
    })
    expect(res.status).toBe(502)
    expect(typeof res.body.error).toBe('string')
  })

  test('502 bei HTTP-Fehler von Ollama', async () => {
    mockOllamaResponse(500, {})
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Test', type: 'Policy', language: 'de',
    })
    expect(res.status).toBe(502)
  })

  test('502 bei leerer/zu kurzer Antwort', async () => {
    mockOllamaResponse(200, { response: 'zu kurz' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      title: 'Test', type: 'Policy', language: 'de',
    })
    expect(res.status).toBe(502)
  })
})
