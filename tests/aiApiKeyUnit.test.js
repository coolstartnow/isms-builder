'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// KI-API-Schlüssel: Einheitentests (Prüfregel, Kopfzeilen, flaches Geheimnis) und statische Wächter. Ohne Server.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

describe('validateApiKey', () => {
  const { validateApiKey } = require('../server/ai/ollamaConfig')
  test.each([['sk-abc123', 'sk-abc123'], ['  getrimmt  ', 'getrimmt'], ['a.b_c-d~e/f+g=h', 'a.b_c-d~e/f+g=h'], ['', '']])('gültig %j', (raw, v) => expect(validateApiKey(raw)).toEqual({ value: v }))
  test.each([['a b'], ['a\nb'], ['a\r\nX: 1'], ['a\tb'], ['ä'], ['a\u0000b'], ['a\u007fb'], ['a b']])('ungültig %j', raw => expect(validateApiKey(raw).code).toBe('invalid_chars'))
  test('zu lang (513) / Grenze (512)', () => { expect(validateApiKey('k'.repeat(513)).code).toBe('too_long'); expect(validateApiKey('k'.repeat(512)).value).toHaveLength(512) })
  test('Nicht-Text wird als leer behandelt, nie als Schlüssel', () => { expect(validateApiKey(undefined)).toEqual({ value: '' }); expect(validateApiKey(123)).toEqual({ value: '' }) })
})

describe('ollamaFetch: Kopfzeilen und Adresse', () => {
  let dir, cfg, original
  beforeAll(() => { dir = createTestDataDir(); Object.assign(process.env, { DATA_DIR: dir, STORAGE_BACKEND: 'json', JWT_SECRET: 'jest-aikey-unit-0123456789abcdef0123456789abcdef', NODE_ENV: 'test' }); delete process.env.OLLAMA_URL; delete process.env.OLLAMA_API_KEY; cfg = require('../server/ai/ollamaConfig') })
  afterAll(() => removeTestDataDir(dir))
  beforeEach(() => { original = global.fetch; global.fetch = jest.fn().mockResolvedValue({ ok: true }) })
  afterEach(() => { global.fetch = original; delete process.env.OLLAMA_API_KEY; delete process.env.OLLAMA_URL })
  const store = () => require('../server/db/orgSettingsStore')
  const call = () => { const [url, init] = global.fetch.mock.calls[0]; return { url, init } }

  test('Standardadresse, nur User-Agent; GET ohne Content-Type und ohne Rumpf; ohne Schlüssel normale Weiterleitung', async () => {
    await store().update({ aiOllamaUrl: '', aiApiKey: '' })
    await cfg.ollamaFetch('/api/tags'); const { url, init } = call()
    expect(url).toBe('http://localhost:11434/api/tags')
    expect(init.headers).toEqual({ 'User-Agent': 'ISMS-Builder/' + require('../package.json').version })
    expect(init.body).toBeUndefined(); expect(init.redirect).toBeUndefined(); expect(init.signal).toBeDefined()
  })
  test('Adresse aus der Einstellung (mit/ohne Schrägstrich am Ende), sonst aus OLLAMA_URL', async () => {
    await store().update({ aiOllamaUrl: 'https://ki.example.org/ollama//' }); await cfg.ollamaFetch('/api/tags'); expect(call().url).toBe('https://ki.example.org/ollama/api/tags')
    global.fetch.mockClear(); await store().update({ aiOllamaUrl: '' }); process.env.OLLAMA_URL = 'http://gw.intern:8080'; await cfg.ollamaFetch('/api/embed'); expect(call().url).toBe('http://gw.intern:8080/api/embed')
  })
  test('POST: JSON-Rumpf und Content-Type; Objekt wird serialisiert, Text bleibt Text', async () => {
    await cfg.ollamaFetch('/api/embed', { method: 'POST', body: { a: 1 } }); let { init } = call()
    expect(init.method).toBe('POST'); expect(init.headers['Content-Type']).toBe('application/json'); expect(init.body).toBe('{"a":1}')
    global.fetch.mockClear(); await cfg.ollamaFetch('/api/embed', { method: 'POST', body: '{"roh":true}' }); expect(call().init.body).toBe('{"roh":true}')
  })
  test('Mit Schlüssel: Authorization: Bearer und redirect: error', async () => {
    await store().update({ aiOllamaUrl: '', aiApiKey: 'sk-unit-1' }); await cfg.ollamaFetch('/api/tags'); const { init } = call()
    expect(init.headers.Authorization).toBe('Bearer sk-unit-1'); expect(init.redirect).toBe('error')
    await store().update({ aiApiKey: '' })
  })
  test('Der Schlüssel aus der Umgebung gilt nur ohne gespeicherten; gespeicherter hat Vorrang', async () => {
    process.env.OLLAMA_API_KEY = 'env-1'; await cfg.ollamaFetch('/api/tags'); expect(call().init.headers.Authorization).toBe('Bearer env-1')
    global.fetch.mockClear(); await store().update({ aiApiKey: 'gespeichert-2' }); await cfg.ollamaFetch('/api/tags'); expect(call().init.headers.Authorization).toBe('Bearer gespeichert-2')
    await store().update({ aiApiKey: '' })
  })
  test('Modelle: Einstellung vor Umgebung vor Standard', async () => {
    await store().update({ aiEmbedModel: '', aiGenModel: '' }); delete process.env.EMBED_MODEL
    expect(await cfg.embedModel()).toBe('nomic-embed-text'); expect(await cfg.genModel()).toBe('llama3.2:3b')
    process.env.EMBED_MODEL = 'env-embed'; expect(await cfg.embedModel()).toBe('env-embed')
    await store().update({ aiEmbedModel: 'ui-embed', aiGenModel: 'ui-gen' }); expect(await cfg.embedModel()).toBe('ui-embed'); expect(await cfg.genModel()).toBe('ui-gen')
    delete process.env.EMBED_MODEL; await store().update({ aiEmbedModel: '', aiGenModel: '' })
  })
  test('ein Einstellungsfehler lässt die KI nicht abstürzen: Standardwerte', async () => {
    const real = store().get; store().get = () => { throw new Error('kaputt') }
    try { expect(await cfg.aiEnabled()).toBe(true); expect(await cfg.ollamaUrl()).toBe('http://localhost:11434'); expect(await cfg.ollamaApiKey()).toBe('') } finally { store().get = real }
  })
})

describe('orgSecrets: flaches Geheimnis aiApiKey', () => {
  const o = require('../server/orgSecrets')
  test('Ausgabe: Wert entfernt, nur Kennzeichen; Gruppen-Geheimnisse bleiben wie zuvor', () => {
    const out = o.redactOrgSettings({ orgName: 'x', aiApiKey: 'geheim', smtpSettings: { host: 'h', pass: 'p' } })
    expect(out).toEqual({ orgName: 'x', aiApiKeySet: true, smtpSettings: { host: 'h', passSet: true } })
    expect(o.redactOrgSettings({ aiApiKey: '' }).aiApiKeySet).toBe(false); expect(o.redactOrgSettings({}).aiApiKeySet).toBe(false)
    expect(JSON.stringify(o.redactOrgSettings({ aiApiKey: 'geheim' }))).not.toContain('geheim')
  })
  test('Eingabe über die Einstellungen: Schlüssel, Kennzeichen und Löschen-Kennzeichen werden verworfen (eigener Endpunkt)', () => {
    expect(o.prepareOrgPatch({ aiApiKey: 'x', aiApiKeySet: true, clearAiApiKey: true, orgName: 'y' })).toEqual({ orgName: 'y' })
  })
  test('Datenexport: kein Schlüssel', () => {
    const out = o.sanitizeExportFile('org-settings.json', { aiApiKey: 'geheim', aiOllamaUrl: 'http://x' })
    expect(out).toEqual({ aiOllamaUrl: 'http://x', aiApiKeySet: true })
  })
})

describe('Wächter: jede Anfrage an Ollama geht durch ollamaFetch; Einstellungen werden erwartet', () => {
  const files = [...fs.readdirSync(path.join(root, 'server/ai')).filter(f => f.endsWith('.js')).map(f => 'server/ai/' + f), 'server/routes/ai.js']
  test('kein direkter fetch( außerhalb von ollamaConfig.js', () => {
    for (const f of files) { if (f.endsWith('ollamaConfig.js')) continue; expect([f, /\bfetch\(/.test(read(f).replace(/\/\/.*$/gm, ''))]).toEqual([f, false]) }
    expect((read('server/ai/ollamaConfig.js').match(/\bfetch\(/g) || []).length).toBe(1)
  })
  test('kein synchrones orgSettingsStore.get() in den KI-Dateien (unter SQL ein Promise): vor jedem get() steht await', () => {
    let gefunden = 0
    for (const f of files) {
      const code = read(f).replace(/\/\/.*$/gm, '')
      for (const m of code.matchAll(/require\('[^']*orgSettingsStore'\)\.get\(\)/g)) {
        gefunden++
        expect([f, /await\s*\(?\s*$/.test(code.slice(Math.max(0, m.index - 12), m.index))]).toEqual([f, true])
      }
    }
    expect(gefunden).toBeGreaterThanOrEqual(2)   // ollamaConfig.settings() und routes/ai.js orgValues()
  })
  test('alle Verbraucher warten auf die Konfiguration (await aiEnabled/ollamaUrl/embedModel/genModel)', () => {
    for (const f of files) { if (f.endsWith('ollamaConfig.js')) continue; expect([f, /(?<!await )(?<![.\w])(aiEnabled|ollamaUrl|embedModel|genModel)\(\)/.test(read(f).replace(/\/\/.*$/gm, '').replace(/^.*function .*$/gm, ''))]).toEqual([f, false]) }
  })
  test('der Schlüssel taucht in keiner Fehlermeldung der KI-Dateien auf (kein Verketten von ollamaApiKey in Texte)', () => {
    for (const f of files) { if (f.endsWith('ollamaConfig.js')) continue; expect([f, /ollamaApiKey|aiApiKey/.test(read(f))]).toEqual([f, false]) }
  })
  test('.env.example nennt OLLAMA_API_KEY, die Oberflächentexte existieren in allen sechs Sprachen', () => {
    expect(read('.env.example')).toMatch(/OLLAMA_API_KEY/)
    const tr = read('ui/i18n/translations.js')
    for (const k of ['maint_aiApiKey', 'maint_aiApiKeyPlaceholder', 'maint_aiApiKeyDesc', 'maint_aiApiKeySet', 'maint_aiApiKeyNotSet', 'maint_aiApiKeyEnv', 'maint_aiApiKeyRemove', 'maint_aiApiKeySaved', 'maint_aiApiKeyRemoved', 'maint_aiApiKeyInsecure']) {
      const line = tr.split('\n').find(l => new RegExp('^\\s*' + k + '\\s*:').test(l)) || ''
      for (const l of ['de', 'en', 'fr', 'nl', 'hu', 'et']) expect([k, l, new RegExp('\\b' + l + ':\\s*"[^"]{3,}"').test(line)]).toEqual([k, l, true])
    }
  })
})

describe('Doku: API-Schlüssel der KI-Anbindung in allen Fassungen', () => {
  test.each(['md', 'en', 'fr', 'nl', 'hu', 'et'])('admin-console %s nennt Schlüssel, OLLAMA_API_KEY und Authorization: Bearer', lang => {
    const t = read(lang === 'md' ? 'docs/admin-console.md' : `docs/admin-console.${lang}.md`)
    expect(t).toContain('OLLAMA_API_KEY'); expect(t).toContain('Authorization: Bearer'); expect(t).toContain('ISMS-Builder/')
  })
  test.each(['md', 'en', 'fr', 'nl', 'hu', 'et'])('module-ai-drafts %s hat den Einrichtungsschritt 5 (API-Schlüssel)', lang => {
    const t = read(lang === 'md' ? 'docs/module-ai-drafts.md' : `docs/module-ai-drafts.${lang}.md`)
    expect(t).toMatch(/^5\. .*(API-Schlüssel|API key|clé d’API|API-sleutel|API-kulcs|API-võti)/mi)
  })
  test('Architektur-Doku, README, OpenAPI und .env.example nennen den Schlüssel', () => {
    expect(read('docs/ISMS-build-documentation.md')).toMatch(/KI-Anbindung: Konfiguration, API-Schlüssel, Kopfzeilen/)
    expect(read('README.md')).toMatch(/optional API key/)
    expect(read('docs/architecture/openapi.yaml')).toMatch(/\/admin\/ai-settings:[\s\S]*aiApiKey/)
    expect(read('.env.example')).toMatch(/OLLAMA_API_KEY/)
  })
})
