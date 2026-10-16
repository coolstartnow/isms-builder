'use strict'
// Ungarisch (hu) als gleichwertige Sprache: technische Einbindung außerhalb von translations.js.
const fs   = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedPost } = require('./setup/authHelper')

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8')
let dataDir, app, cookie
const request = require('supertest')

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-hu'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  cookie = await loginAs(app, 'admin')
})
afterAll(() => removeTestDataDir(dataDir))

describe('Ungarisch – Sprachlisten', () => {
  test.each([
    ['server/routes/admin.js',        /const SUPPORTED = \['de', 'en', 'fr', 'nl', 'hu'\]/],
    ['server/routes/guidance.js',     /SUPPORTED_LANGS = \['de', 'en', 'fr', 'nl', 'hu'\]/],
    ['server/db/guidanceStore.js',    /\['de', 'en', 'fr', 'nl', 'hu'\]\.includes\(l\)/],
    ['server/db/assessmentStore.js',  /SUPPORTED_LANGS\s+= \['de', 'en', 'fr', 'nl', 'hu'\]/],
    ['server/ai/policyGenerator.js',  /hu: 'Ungarisch'/],
    ['server/routes/assessmentPublic.js', /hu-HU/],
    ['ui/login.html',                 /loadDemoBundle\('hu'\)/],
    ['ui/app.js',                     /hu: '🇭🇺'/],
  ])('%s kennt hu', (file, re) => {
    expect(read(...file.split('/'))).toMatch(re)
  })

  test('alle Sprachlisten in admin.js enthalten hu', () => {
    const lists = read('server', 'routes', 'admin.js').match(/const SUPPORTED = \[[^\]]*\]/g)
    expect(lists.length).toBeGreaterThanOrEqual(2)
    for (const l of lists) expect(l).toMatch(/'hu'/)
  })
})

describe('Ungarisch – öffentliche Assessment-Seite', () => {
  test('Fragebogen und Texte erscheinen auf Ungarisch', async () => {
    const sup = await authedPost(app, cookie, '/suppliers', { name: 'HU-Lieferant', type: 'saas' })
    const ass = await authedPost(app, cookie, '/assessments', { supplierId: sup.body.id, language: 'hu' })
    expect(ass.status).toBe(201)
    const page = await request(app).get(`/supplier-assessment/${ass.body.token}`)
    expect(page.status).toBe(200)
    expect(page.text).toMatch(/Kérdőív beküldése/)
    expect(page.text).toMatch(/Szállítói önértékelés/)
    expect(page.text).not.toMatch(/Fragebogen absenden/)
  })
})
