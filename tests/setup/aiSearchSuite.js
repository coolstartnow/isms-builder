'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// KI-Suche (Stichwortsuche) findet die Module unter JSON UND SQL. Früher wurden die Stores ohne `await` gelesen: Unter
// sqlite/mariadb/postgres war getAll() ein Promise, der Fehler verschwand in einem leeren catch, und die Suche fand nichts.
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost } = require('./authHelper')

const TOKEN = 'Quarkzebra'
function runAiSearchSuite(backend) {
  describe(`KI-Suche über alle Module [${backend}]`, () => {
    let dataDir, app, c
    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-ai-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      app = require('../../server/index.js')
      if (app.bootstrap) await app.bootstrap()
      c = { admin: await loginAs(app, 'admin'), editor: await loginAs(app, 'editor'), co: await loginAs(app, 'contentowner'), auditor: await loginAs(app, 'auditor') }
      const must = async (p, label) => { const r = await p; if (![200, 201].includes(r.status)) throw new Error(`${label}: HTTP ${r.status} ${JSON.stringify(r.body)}`) }
      await must(authedPost(app, c.co, '/risks', { title: `${TOKEN} Risiko`, probability: 3, impact: 3 }), 'Risiko')
      await must(authedPost(app, c.editor, '/goals', { title: `${TOKEN} Ziel` }), 'Ziel')
      await must(authedPost(app, c.editor, '/assets', { name: `${TOKEN} Server` }), 'Asset')
      await must(authedPost(app, c.editor, '/suppliers', { name: `${TOKEN} GmbH` }), 'Lieferant')
      await must(authedPost(app, c.editor, '/training', { title: `${TOKEN} Schulung` }), 'Schulung')
      await must(authedPost(app, c.auditor, '/findings', { title: `${TOKEN} Feststellung`, severity: 'low' }), 'Feststellung')
      await must(authedPost(app, c.co, '/guidance', { category: 'systemhandbuch', title: `${TOKEN} Handbuch`, content: 'x' }), 'Guidance')
      await must(authedPost(app, c.editor, '/measures', { title: `${TOKEN} Maßnahme`, implementation: 'Umsetzung' }), 'Maßnahme')
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })

    test('Stichwortsuche findet in jedem Modul (Risiko, Ziel, Asset, Lieferant, Schulung, Finding, Systemhandbuch, Maßnahme)', async () => {
      const r = await authedGet(app, c.editor, `/api/ai/search?q=${TOKEN}`)
      expect(r.status).toBe(200)
      const found = r.body.results.map(x => x.type).sort()
      expect(found).toEqual(['Asset', 'Finding', 'Lieferant', 'Maßnahme', 'Risiko', 'Schulung', 'Sicherheitsziel', 'Systemhandbuch'])
    })

    test('Treffer verweisen auf das jeweilige Modul', async () => {
      const r = (await authedGet(app, c.editor, `/api/ai/search?q=${TOKEN}`)).body.results
      const url = type => r.find(x => x.type === type)?.url
      expect(url('Risiko')).toBe('#risks'); expect(url('Sicherheitsziel')).toBe('#goals'); expect(url('Asset')).toBe('#assets')
      expect(url('Lieferant')).toBe('#suppliers'); expect(url('Schulung')).toBe('#training'); expect(url('Maßnahme')).toBe('#measures')
      expect(url('Finding')).toMatch(/^#reports\?findingId=/)
    })

    test('Neuindizierung (semantisch) läuft über alle Module ohne Absturz', async () => {
      const store = require('../../server/ai/embeddingStore')
      const res = await store.reindexAll()          // ohne Ollama werden keine Vektoren erzeugt; wichtig: kein Fehler durch fehlendes await
      expect(res).toEqual(expect.objectContaining({ indexed: expect.any(Number), skipped: expect.any(Number) }))
    })
  })
}
module.exports = { runAiSearchSuite }
