'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Folgefehler aus Discussion #72: ein Klick auf ein Finding-Suchergebnis
// landete nur auf dem Reports-Modul statt beim konkreten Finding, weil
// server/ai/lexicalSearch.js und server/ai/embeddingStore.js Findings mit
// einer festen, item-unabhängigen URL ('#reports') indizierten. Fix: beide
// liefern jetzt '#reports?findingId=<id>' — dieser Test prüft den kompletten
// HTTP-Pfad GET /api/ai/search (Keyword-Fallback, da in dieser Umgebung kein
// Ollama läuft und die semantische Suche daher ohnehin immer auf Keyword
// zurückfällt — genau der reale Pfad für diese Testumgebung).
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost } = require('./setup/authHelper')

let dataDir, app, auditorCookie, readerCookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-findingdeeplink'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  auditorCookie = await loginAs(app, 'auditor')
  readerCookie  = await loginAs(app, 'reader')
})

afterAll(() => removeTestDataDir(dataDir))

describe('GET /api/ai/search — Finding-Suchergebnisse verlinken auf das konkrete Finding', () => {
  test('url enthält findingId statt nur "#reports"', async () => {
    const createRes = await authedPost(app, auditorCookie, '/findings', {
      title: 'Xylophonzebra-Testfeststellung',
      observation: 'Xylophonzebra wurde im Audit beobachtet.',
      severity: 'high',
    })
    expect(createRes.status).toBe(201)
    const findingId = createRes.body.id
    expect(findingId).toBeTruthy()

    const searchRes = await authedGet(app, readerCookie, '/api/ai/search?q=Xylophonzebra')
    expect(searchRes.status).toBe(200)
    expect(searchRes.body.mode).toBe('keyword') // kein Ollama in dieser Umgebung

    const hit = searchRes.body.results.find(r => r.type === 'Finding')
    expect(hit).toBeTruthy()
    expect(hit.url).toBe(`#reports?findingId=${findingId}`)
  })
})
