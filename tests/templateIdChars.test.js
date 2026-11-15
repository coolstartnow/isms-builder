'use strict'
// Kennungen neuer Dokumente: der Mobile-Sync nimmt nur Buchstaben, Ziffern und _ . : - an.
// Typen mit Leerzeichen („Risk Policy“) dürfen daher nicht unverändert in die Kennung wandern.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedPost, authedGet } = require('./setup/authHelper')

let dataDir, app, cookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-tmplid'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  cookie = await loginAs(app, 'contentowner')
})

afterAll(() => removeTestDataDir(dataDir))

describe('Kennung neuer Dokumente', () => {
  test('Typ mit Leerzeichen ergibt eine syncfähige Kennung und bleibt abrufbar', async () => {
    const res = await authedPost(app, cookie, '/template', { type: 'Risk Policy', language: 'de', title: 'Risikorichtlinie', content: 'x', owner: 'a' })
    expect(res.status).toBe(201)
    expect(res.body.id).toMatch(/^[A-Za-z0-9_.:-]+$/)
    expect(res.body.id.startsWith('Risk-Policy_')).toBe(true)
    const list = await authedGet(app, cookie, '/templates')
    const hit = list.body.find(t => t.id === res.body.id)
    expect(hit && hit.type).toBe('Risk Policy')
    const one = await authedGet(app, cookie, `/template/${encodeURIComponent('Risk Policy')}/${res.body.id}`)
    expect(one.status).toBe(200)
  })
  test('Typ „Policy“ behält das gewohnte Format', async () => {
    const res = await authedPost(app, cookie, '/template', { type: 'Policy', language: 'de', title: 'Richtlinie', content: 'x', owner: 'a' })
    expect(res.body.id).toMatch(/^Policy_\d+$/)
  })
})
