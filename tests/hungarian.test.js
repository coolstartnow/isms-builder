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

describe('Ungarische Guidance-Seeds', () => {
  test('alle Seed-Texte liegen als Datei vor und sind nicht leer', () => {
    const fs = require('fs'), path = require('path')
    const dir = path.join(__dirname, '../server/db/guidance-hu')
    const files = ['soa.md', 'policy.md', 'demo.md', 'iso.md', 'seed_guide_ciso.md', 'seed_guide_dsb.md',
      'seed_guide_revision.md', 'seed_guide_qmb.md', 'seed_guide_abtlg.md']
    for (const f of files) expect(fs.readFileSync(path.join(dir, f), 'utf8').length).toBeGreaterThan(1000)
  })

  test('Seeds werden bei Sprache hu auf Ungarisch angelegt', () => {
    const fs = require('fs'), path = require('path'), os = require('os')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guid-hu-'))
    fs.writeFileSync(path.join(dir, '.demo_lang_set'), JSON.stringify({ lang: 'hu' }))
    const script = `
      process.env.DATA_DIR=${JSON.stringify(dir)}; process.env.STORAGE_BACKEND='json'
      const g=require(${JSON.stringify(path.join(__dirname, '../server/db/guidanceStore.js'))})
      for (const f of ['seedRoleGuides','seedSoaGuide','seedPolicyGuide','seedIsoNotice','seedDemoDoc']) if (g[f]) g[f]()
      const all=g.getAll({role:'admin'})
      const titles=all.map(d=>d.title)
      console.log(JSON.stringify(titles))`
    const out = require('child_process').execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })
    const titles = JSON.parse(out.trim().split('\n').pop())
    for (const t of ['SoA és audit – útmutató', 'Felhasználói útmutató: belső audit', 'Szabályzati folyamatok – létrehozás, felülvizsgálat és jóváhagyás'])
      expect(titles).toContain(t)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

describe('Ungarisches Demo-Bundle', () => {
  const fs = require('fs'), path = require('path')
  const load = l => JSON.parse(fs.readFileSync(path.join(__dirname, '../data/demo-bundles', `${l}.json`), 'utf8'))
  const de = load('de'), hu = load('hu')
  const shape = v => Array.isArray(v) ? v.map(shape) : (v && typeof v === 'object')
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v

  test('gleiche Struktur wie das deutsche Bundle (Dateien, Felder, Anzahl)', () => {
    expect(hu.lang).toBe('hu')
    expect(shape(hu)).toEqual(shape(de))
  })

  test('Texte sind übersetzt, IDs und Verweise bleiben konsistent', () => {
    expect(hu.files['risks.json'][0].title).toBe('Zsarolóvírus-támadás a termelési rendszerek ellen')
    const ids = new Set()
    const collect = v => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { if (typeof v.id === 'string') ids.add(v.id); Object.values(v).forEach(collect) } }
    collect(hu)
    expect(JSON.stringify(hu)).not.toMatch(/_de_/)
    for (const link of JSON.stringify(hu).match(/(?:bia|bcp|tom|vvt|av)_demo_hu_\d+/g) || []) expect(ids.has(link)).toBe(true)
    // Enum-Werte unverändert
    expect(hu.files['risks.json'].map(r => r.category)).toEqual(de.files['risks.json'].map(r => r.category))
    expect(hu.files['risks.json'].map(r => r.status)).toEqual(de.files['risks.json'].map(r => r.status))
  })
})
