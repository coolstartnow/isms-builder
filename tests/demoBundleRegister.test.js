'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Die Demo-Bundles bringen das Maßnahmen-Register mit (TOMs, Governance-Aktionen, Feststellungs-Maßnahmen, Risiko-Behandlungen,
// eigene Maßnahmen). Nach dem Laden müssen alle Ansichten sofort stimmen, alle Zuordnungen auf vorhandene Risiken und Feststellungen
// zeigen, und ein erneutes Laden ersetzt das Register, statt Reste zu behalten.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost } = require('./setup/authHelper')

describe('Demo-Bundles und Maßnahmen-Register', () => {
  let dataDir, app, admin
  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-demo-bundle', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    app = require('../server/index.js')
    await app.bootstrap()
    admin = await loginAs(app, 'admin')
  })
  afterAll(() => removeTestDataDir(dataDir))

  const get = async url => (await authedGet(app, admin, url)).body

  test.each(['de', 'en', 'fr', 'nl', 'hu'])('Bundle %s: alle vier Quellen stehen im Register, Zuordnungen sind gültig', async lang => {
    expect((await authedPost(app, admin, '/admin/demo-load-bundle', { lang })).status).toBe(200)
    const reg = await get('/measures')
    const gov = await get('/governance/actions'), toms = await get('/gdpr/toms'), findings = await get('/findings'), risks = await get('/risks')
    // eingebettete Quellen und Register stimmen überein
    expect(reg.filter(m => m.governance).length).toBe(gov.length)
    expect(reg.filter(m => m.tom).length).toBe(toms.length)
    expect(gov.length).toBeGreaterThan(0); expect(toms.length).toBeGreaterThan(0)
    // Feststellungen mit Maßnahmen, Risiken mit Behandlungen
    expect(findings.length).toBe(2)
    expect(findings.every(f => f.actions.length === 2)).toBe(true)
    // jede Maßnahme mit Risiko-Zuordnung ist eine Behandlung dieses Risikos: 3 ursprüngliche Behandlungen + 2 eigene Maßnahmen
    expect(risks.reduce((n, r) => n + r.treatmentPlans.length, 0)).toBe(5)
    expect(reg.filter(m => m.linkedFindings.length).length).toBe(4)
    expect(reg.filter(m => m.linkedRisks.length).length).toBe(5)
    // jede Zuordnung zeigt auf Vorhandenes
    const riskIds = new Set(risks.map(r => r.id)), findingIds = new Set(findings.map(f => f.id))
    for (const m of reg) {
      for (const id of m.linkedRisks) expect(riskIds.has(id)).toBe(true)
      for (const id of m.linkedFindings) expect(findingIds.has(id)).toBe(true)
    }
    // Referenzen eindeutig, eine Maßnahme ohne Zuordnung für die Kennzahl
    expect(new Set(reg.map(m => m.ref)).size).toBe(reg.length)
    expect((await get('/measures/summary')).withoutLinks).toBeGreaterThanOrEqual(1)
  })

  test('erneutes Laden ersetzt das Register: keine Maßnahmen zu verschwundenen Demo-Daten', async () => {
    await authedPost(app, admin, '/admin/demo-load-bundle', { lang: 'de' })
    const before = (await get('/measures')).length
    const extra = (await authedPost(app, admin, '/measures', { title: 'Eigene Maßnahme' })).body
    expect((await get('/measures')).length).toBe(before + 1)
    expect((await authedPost(app, admin, '/admin/demo-load-bundle', { lang: 'de' })).status).toBe(200)
    expect((await authedGet(app, admin, `/measures/${extra.id}`)).status).toBe(404)
    expect((await get('/measures')).length).toBe(before)
  })
})
