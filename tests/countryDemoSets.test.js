'use strict'
// Landesbezogene Demosets (beta.27): ungarisch und estnisch laden sich über die API und liefern Lieferanten, Risiken und Assets im Umfang des englischen Sets
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost } = require('./setup/authHelper')

describe.each([
  ['hu', ['Bérfelhő Kft.', 'Tárhelypont Kft.'], 'Budapest'],
  ['et', ['Palgapilv OÜ', 'Nordhost OÜ'], 'Tallinn'],
])('Landes-Demoset %s', (lang, suppliers, city) => {
  let dataDir, app, admin
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-countrysets'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    jest.resetModules()
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin')
  })
  afterAll(() => removeTestDataDir(dataDir))

  test('Bündel lädt (200) und enthält die landesbezogenen Daten im Umfang des englischen Sets', async () => {
    expect((await authedPost(app, admin, '/admin/demo-load-bundle', { lang })).status).toBe(200)
    const sup = (await authedGet(app, admin, '/suppliers')).body
    expect(sup.length).toBe(10)
    expect(sup.map(s => s.name)).toEqual(expect.arrayContaining(suppliers))
    expect((await authedGet(app, admin, '/risks')).body.length).toBe(12)
    const assets = (await authedGet(app, admin, '/assets')).body
    expect(assets.length).toBe(8)
    expect(JSON.stringify(assets)).toContain(city)
    // die Demo-Dokumente tragen die Sprache des Sets (nicht „en“), sonst bietet die KI-Maske die falsche Sprache vor
    const docs = (await authedGet(app, admin, '/templates')).body
    expect(docs.length).toBeGreaterThanOrEqual(4)
    for (const d of docs) expect([d.title, d.language]).toEqual([d.title, lang])
  })
})
