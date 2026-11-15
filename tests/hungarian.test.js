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

describe('Ungarisch – Sprachregister (statt fest eingetragener Listen)', () => {
  const reg = require('../ui/i18n/languages.js')
  test('hu ist im Register vollständig und auswählbar', () => {
    expect(reg.get('hu')).toMatchObject({ name: 'Magyar', flag: '🇭🇺', locale: 'hu-HU', docSuffix: '.hu', aiName: 'Hungarian', browserPrefix: 'hu', status: 'complete', listed: true })
    for (const list of [reg.codes(), reg.listedCodes(), reg.completeCodes()]) expect(list).toContain('hu')
  })
  test.each([
    ['server/routes/admin.js',            /require\('\.\.\/languages'\)\.completeCodes\(\)/, 2],
    ['server/routes/guidance.js',         /require\('\.\.\/languages'\)\.completeCodes\(\)/, 1],
    ['server/db/guidanceStore.js',        /require\('\.\.\/languages'\)\.completeCodes\(\)\.includes\(l\)/, 1],
    ['server/db/assessmentStore.js',      /require\('\.\.\/languages'\)\.completeCodes\(\)/, 1],
    ['server/ai/safeDraft.js',            /reg\.aiName\(language\)/, 1],
    ['server/routes/assessmentPublic.js', /require\('\.\.\/languages'\)\.locale\(a\.language\)/, 2],
    ['server/i18n.js',                    /reg\.list\.map\(l => \[l\.code, l\.locale\]\)/, 1],
    ['ui/login.html',                     /LANGUAGES\.listedCodes\(\)/, 2],
    ['ui/app.js',                         /LANGUAGES\.listedCodes\(\)/, 4],
  ])('%s bezieht die Sprachen aus dem Register', (file, re, min) => {
    const src = read(...file.split('/'))
    expect(src.match(new RegExp(re.source, 'g')).length).toBeGreaterThanOrEqual(min)
  })
  test('Ungarisch wirkt in den abgeleiteten Werten', () => {
    const safeDraft = require('../server/ai/safeDraft')
    expect(safeDraft.LANGUAGES).toContain('hu')
    expect(require('../server/i18n').SUPPORTED).toContain('hu')
    expect(require('../server/i18n').translateError('Internal server error', 'hu')).toBe('Belső kiszolgálóhiba')
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
  const de = load('en'), hu = load('hu')   // seit beta.27: landesbezogenes Set im Umfang des englischen Sets
  const shape = v => Array.isArray(v) ? v.map(shape) : (v && typeof v === 'object')
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v

  test('gleiche Struktur wie das englische Bundle (Dateien, Felder, Anzahl)', () => {
    expect(hu.lang).toBe('hu')
    expect(shape(hu)).toEqual(shape(de))
  })

  test('Texte sind übersetzt, IDs und Verweise bleiben konsistent', () => {
    expect(hu.files['risks.json'][0].title).toBe('Adatvesztés zsarolóvírus miatt')
    const ids = new Set()
    const collect = v => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { if (typeof v.id === 'string') ids.add(v.id); Object.values(v).forEach(collect) } }
    collect(hu)
    expect(JSON.stringify(hu)).not.toMatch(/_de_/)
    for (const link of JSON.stringify(hu).match(/(?:bia|bcp|tom|vvt|av)_demo_hu_\d+/g) || []) expect(ids.has(link)).toBe(true)
    // Enum-Werte unverändert
    expect(hu.files['risks.json'].map(r => r.category)).toEqual(de.files['risks.json'].map(r => r.category))
    expect(hu.files['risks.json'].map(r => r.status)).toEqual(de.files['risks.json'].map(r => r.status))
  })

  test('landesbezogen: ungarische Firmen, Orte, Behörden — keine deutschen Originale', () => {
    const raw = JSON.stringify(hu)
    for (const bad of ['DATEV', 'Hetzner', 'Telekom Security', 'TÜV', 'Lexware', 'Securelink', 'konzern.de', 'sample-gmbh', 'Musterstra', 'BDSG', 'HGB', 'Frankfurt am Main', 'Klaus Müller', 'Claudia Meier', 'Düsseldorf', 'Stuttgart', 'BayLDA'])
      expect([bad, raw.includes(bad)]).toEqual([bad, false])
    const names = hu.files['suppliers.json'].map(s => s.name)
    expect(names).toEqual(expect.arrayContaining(['Bérfelhő Kft.', 'Tárhelypont Kft.', 'Védelemlánc Kft.', 'Tanúsítóközpont Zrt.']))
    expect(hu.files['suppliers.json'].filter(s => s.country === 'HU').length).toBeGreaterThanOrEqual(5)
    expect(raw).toMatch(/NAIH/)
    expect(hu.files['suppliers.json'].map(s => s.id)).toEqual(de.files['suppliers.json'].map(s => s.id))
  })
})
