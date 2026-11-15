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
      entry: 'password', language: 'de',
    })
    expect(res.status).toBe(403)
  })

  test('400 wenn Pflichtfelder fehlen', async () => {
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      language: 'de',
    })
    expect(res.status).toBe(400)
  })

  test('503 wenn KI-Integration deaktiviert ist', async () => {
    await authedPut(app, adminCookie, '/admin/ai-settings', { aiEnabled: false })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      entry: 'password', language: 'de',
    })
    expect(res.status).toBe(503)
    // wieder aktivieren für die folgenden Tests
    await authedPut(app, adminCookie, '/admin/ai-settings', { aiEnabled: true })
  })

  test('Erfolgsfall: liefert generierten Markdown-Content (200)', async () => {
    mockOllamaResponse(200, { response: '# Informationssicherheitsrichtlinie\n\n## Zweck\n\nDient dem Schutz von Informationswerten.' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      entry: 'infosec', language: 'de',
    })
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('# Informationssicherheitsrichtlinie')
  })

  test('Erfolgsfall funktioniert auch für andere Dokumenttypen (z.B. Incident)', async () => {
    mockOllamaResponse(200, { response: '# Vorfallmeldeprozess\n\n## Zweck\n\nRegelt die Meldewege bei Sicherheitsvorfällen.' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      entry: 'incident_response', language: 'en',
    })
    expect(res.status).toBe(200)
    expect(res.body.content).toContain('# Vorfallmeldeprozess')
    expect(res.body.title).toBe('Incident Response Procedure')
  })

  test('502 bei Ollama-Fehler (Netzwerk nicht erreichbar)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      entry: 'password', language: 'de',
    })
    expect(res.status).toBe(502)
    expect(typeof res.body.error).toBe('string')
  })

  test('502 bei HTTP-Fehler von Ollama', async () => {
    mockOllamaResponse(500, {})
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      entry: 'password', language: 'de',
    })
    expect(res.status).toBe(502)
  })

  test('502 bei leerer/zu kurzer Antwort', async () => {
    mockOllamaResponse(200, { response: 'zu kurz' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', {
      entry: 'password', language: 'de',
    })
    expect(res.status).toBe(502)
  })
})

describe('Sichere KI-Entwürfe: was gesendet wird', () => {
  const ollamaBody = () => JSON.parse(global.fetch.mock.calls[0][1].body)

  test('der gesendete Prompt enthält nur Titel aus der Liste, Sprache und Hinweis, keine Organisationsdaten', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', { orgName: 'Geheimfirma Nordlicht', cisoName: 'Erika Beispiel', gdpoName: 'Hans Muster' })
    mockOllamaResponse(200, { response: '# Passwortrichtlinie\n\n{{COMPANY_NAME}} regelt Passwörter.' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', { entry: 'password', language: 'de', hint: 'NIS2, Remote-Arbeit' })
    expect(res.status).toBe(200)
    const sent = ollamaBody().prompt
    expect(sent).toContain('Passwortrichtlinie')
    expect(sent).toContain('NIS2, Remote-Arbeit')
    for (const secret of ['Geheimfirma', 'Nordlicht', 'Erika', 'Beispiel', 'Hans', 'Muster']) expect(sent).not.toContain(secret)
  })

  test('Platzhalter werden nach der Antwort lokal aus den Organisationsdaten ersetzt', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', { orgName: 'Geheimfirma Nordlicht', cisoName: 'Erika Beispiel', gdpoName: '' })
    mockOllamaResponse(200, { response: '# Titel\n\n{{COMPANY_NAME}} / {{ISMS_OWNER}} / {{DATA_PROTECTION_OFFICER}}' })
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', { entry: 'infosec', language: 'de' })
    expect(res.body.content).toContain('Geheimfirma Nordlicht / Erika Beispiel / {{DATA_PROTECTION_OFFICER}}')
    expect(res.body.unresolved).toEqual(['DATA_PROTECTION_OFFICER'])
  })

  test('Hinweis mit personenbezogenen oder technischen Angaben wird blockiert, es geht nichts an Ollama', async () => {
    global.fetch = jest.fn()
    for (const hint of ['mail an hans@firma.de', 'Tel +49 170 1234567', 'Server 10.0.0.12', 'https://intern.example/wiki', 'Schulze GmbH', 'Geheimfirma Nordlicht']) {
      const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', { entry: 'infosec', language: 'de', hint })
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('pii')
    }
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('freier Titel und Typ werden nicht angenommen, nur Kennung aus der Liste', async () => {
    global.fetch = jest.fn()
    const res = await authedPost(app, contentownerCookie, '/api/ai/generate-policy', { title: 'Vertrag mit Kunde Meier', type: 'Policy', language: 'de' })
    expect(res.status).toBe(400)
    expect((await authedPost(app, contentownerCookie, '/api/ai/generate-policy', { entry: 'gibt-es-nicht', language: 'de' })).body.code).toBe('unknown_entry')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('Vorschau zeigt Prompt und Ziel ohne etwas zu senden; Liste enthält nur Titel', async () => {
    global.fetch = jest.fn()
    const pv = await authedPost(app, contentownerCookie, '/api/ai/draft-preview', { entry: 'backup', language: 'en' })
    expect(pv.status).toBe(200)
    expect(pv.body.prompt).toContain('Backup Policy')
    expect(pv.body.destination).toMatch(/^http/)
    const cat = await require('./setup/authHelper').authedGet(app, contentownerCookie, '/api/ai/draft-catalog')
    expect(cat.status).toBe(200)
    expect(cat.body.entries.length).toBeGreaterThan(10)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('Audit-Eintrag nennt die Auswahl, aber nicht den Hinweistext', async () => {
    mockOllamaResponse(200, { response: '# Titel\n\nInhalt des Entwurfs mit genug Zeichen.' })
    await authedPost(app, contentownerCookie, '/api/ai/generate-policy', { entry: 'crypto', language: 'de', hint: 'Besonderer Hinweistext' })
    const log = await require('./setup/authHelper').authedGet(app, adminCookie, '/admin/audit-log')
    const text = JSON.stringify(log.body)
    expect(text).toContain('crypto (de), mit Hinweis')
    expect(text).not.toContain('Besonderer Hinweistext')
  })
})

describe('POST /api/ai/fill-placeholders (von Hand eingefügte Texte)', () => {
  test('ersetzt Platzhalter aus den Organisationsdaten und meldet offene; Editor darf, Leser nicht', async () => {
    const { authedPut: put } = require('./setup/authHelper')
    await put(app, adminCookie, '/admin/org-settings', { orgName: 'Nordlicht AG', cisoName: 'Erika Beispiel', gdpoName: '', ismsScope: 'Gesamtunternehmen' })
    const body = { text: '# Titel\n\n{{COMPANY_NAME}}, [ISMS_OWNER], {{ isms scope }}, {{DATA_PROTECTION_OFFICER}}, {{ANDERES}} und [Firmenname]' }
    const res = await authedPost(app, editorCookie, '/api/ai/fill-placeholders', body)
    expect(res.status).toBe(200)
    expect(res.body.text).toBe('# Titel\n\nNordlicht AG, Erika Beispiel, Gesamtunternehmen, {{DATA_PROTECTION_OFFICER}}, {{ANDERES}} und [Firmenname]')
    expect(res.body.replaced).toBe(3)
    expect(res.body.unresolved).toEqual(['DATA_PROTECTION_OFFICER'])
    const readerCookie = await loginAs(app, 'reader')
    expect((await authedPost(app, readerCookie, '/api/ai/fill-placeholders', body)).status).toBe(403)
  })
  test('400 ohne Text; Text ohne Platzhalter bleibt unverändert', async () => {
    expect((await authedPost(app, editorCookie, '/api/ai/fill-placeholders', {})).status).toBe(400)
    const res = await authedPost(app, editorCookie, '/api/ai/fill-placeholders', { text: 'Nichts {zu} ersetzen [hier]' })
    expect(res.body).toMatchObject({ text: 'Nichts {zu} ersetzen [hier]', replaced: 0, unresolved: [] })
  })
})
