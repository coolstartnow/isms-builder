'use strict'
const dsfa = require('../server/dsfaTemplates')
const DOC_LANGS = require('../ui/i18n/languages.js').completeCodes() // Leitfäden (docs/*.md) gibt es für Sprachen mit Status „complete“; Inhalte können früher da sein
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./setup/authHelper')

describe('DSFA-Vorlagen (Katalog)', () => {
  const ids = Object.keys(dsfa.DATA.templates)
  test('neun Verarbeitungsarten, jede in allen fünf Sprachen vollständig', () => {
    expect(ids.length).toBe(9)
    for (const id of ids) for (const l of dsfa.LANGUAGES) {
      const b = dsfa.build(id, l, {})
      expect(b.title.length).toBeGreaterThan(5)
      expect(b.processingDescription.split('\n').length).toBeGreaterThanOrEqual(7)
      expect(b.necessityAssessment.split('\n').length).toBe(3)
      expect(b.risks.length).toBeGreaterThanOrEqual(6)
      for (const r of b.risks) {
        expect(r.description.length).toBeGreaterThan(10)
        expect(r.likelihood).toBeGreaterThanOrEqual(1); expect(r.likelihood).toBeLessThanOrEqual(5)
        expect(r.impact).toBeGreaterThanOrEqual(1); expect(r.impact).toBeLessThanOrEqual(5)
        expect(r.score).toBe(r.likelihood * r.impact)
        expect(r.mitigations.length).toBeGreaterThanOrEqual(2)
      }
    }
  })
  test('Risiko- und Maßnahmenkataloge: alle Verweise gültig, alle Texte in allen Sprachen', () => {
    for (const [rid, r] of Object.entries(dsfa.DATA.risks)) {
      for (const l of dsfa.LANGUAGES) expect(r.text[l]).toBeTruthy()
      for (const m of r.measures) expect(dsfa.DATA.measures[m]).toBeDefined()
    }
    for (const m of Object.values(dsfa.DATA.measures)) for (const l of dsfa.LANGUAGES) expect(m[l]).toBeTruthy()
  })
  test('Vorlage enthält keine Firmendaten, nur den Platzhalter; er wird aus den Organisationsdaten gefüllt', () => {
    expect(dsfa.build('hr_cloud', 'de', {}).processingDescription).toContain('{{COMPANY_NAME}}')
    expect(dsfa.build('hr_cloud', 'de', {}).unresolved).toEqual(['COMPANY_NAME'])
    const b = dsfa.build('hr_cloud', 'en', { orgName: 'Nordlicht AG' })
    expect(b.processingDescription).toContain('Controller: Nordlicht AG')
    expect(b.unresolved).toEqual([])
  })
  test('unbekannte Vorlage → null; unbekannte Sprache → Englisch', () => {
    expect(dsfa.build('gibt-es-nicht', 'de', {})).toBeNull()
    expect(dsfa.build('video', 'xx', {}).title).toBe('Video surveillance')
  })
})

describe('Anwenderleitfaden', () => {
  const fs = require('fs'), path = require('path')
  const suf = Object.fromEntries(require('../ui/i18n/languages.js').list.map(l => [l.code, l.docSuffix]))
  test('jeder Leitfaden nennt jede Vorlage, jeden Fall und jedes Kriterium in seiner Sprache', () => {
    for (const l of dsfa.LANGUAGES.filter(x => DOC_LANGS.includes(x))) {
      const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', `module-dsfa${suf[l]}.md`), 'utf8')
      for (const id of Object.keys(dsfa.DATA.templates)) expect(doc).toContain(dsfa.DATA.templates[id].title[l])
      const c = dsfa.precheckCriteria(l)
      for (const x of [...c.art353, ...c.criteria]) expect(doc).toContain(x.text)
      expect(doc).toContain('{{COMPANY_NAME}}')
    }
  })
  test('der GDPR-Leitfaden verweist auf den DSFA-Leitfaden', () => {
    for (const l of dsfa.LANGUAGES.filter(x => DOC_LANGS.includes(x))) expect(fs.readFileSync(path.join(__dirname, '..', 'docs', `module-gdpr${suf[l]}.md`), 'utf8')).toContain(`docs/module-dsfa${suf[l]}.md`)
  })
})

describe('Vorabprüfung und Freigaberegel', () => {
  test('Fall nach Art. 35 Abs. 3 → erforderlich; zwei Kriterien → wahrscheinlich; sonst → nicht zwingend', () => {
    expect(dsfa.evaluatePrecheck({ art353: ['c'] }).result).toBe('required')
    expect(dsfa.evaluatePrecheck({ criteria: ['monitoring', 'vulnerable'] }).result).toBe('likely')
    expect(dsfa.evaluatePrecheck({ criteria: ['monitoring'] }).result).toBe('optional')
    expect(dsfa.evaluatePrecheck({}).result).toBe('optional')
    expect(dsfa.evaluatePrecheck({ criteria: ['erfunden', 'auch-erfunden'] }).result).toBe('optional')
  })
  test('Kriterien in allen Sprachen: 3 Fälle und 9 Kriterien', () => {
    for (const l of dsfa.LANGUAGES) { const c = dsfa.precheckCriteria(l); expect(c.art353.length).toBe(3); expect(c.criteria.length).toBe(9) }
  })
  test('Freigabe braucht Stellungnahme, Entscheidung und bei hohem Restrisiko Begründung oder Konsultation', () => {
    const ok = { dpoConsulted: true, dpoOpinion: 'Geprüft', decision: 'proceed', residualRisk: 'medium' }
    expect(dsfa.validateApproval(ok).ok).toBe(true)
    expect(dsfa.validateApproval({ ...ok, dpoOpinion: '  ' }).code).toBe('dpo_opinion_missing')
    expect(dsfa.validateApproval({ ...ok, dpoConsulted: false }).code).toBe('dpo_opinion_missing')
    expect(dsfa.validateApproval({ ...ok, decision: '' }).code).toBe('decision_missing')
    expect(dsfa.validateApproval({ ...ok, residualRisk: 'high' }).code).toBe('high_residual_unjustified')
    expect(dsfa.validateApproval({ ...ok, residualRisk: 'critical', decisionJustification: 'Begründet' }).ok).toBe(true)
    expect(dsfa.validateApproval({ ...ok, residualRisk: 'high', saConsultationRequired: true }).ok).toBe(true)
  })
})

describe('DSFA: Endpunkte und Prüfablauf', () => {
  let dataDir, app, admin, owner, reader
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-dsfa'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin'); owner = await loginAs(app, 'contentowner'); reader = await loginAs(app, 'reader')
  })
  afterAll(() => removeTestDataDir(dataDir))

  test('Vorlagenliste und befüllte Vorlage (mit Firmenname aus den Organisationsdaten)', async () => {
    await authedPut(app, admin, '/admin/org-settings', { orgName: 'Nordlicht AG' })
    const list = await authedGet(app, reader, '/gdpr/dsfa-templates')
    expect(list.status).toBe(200); expect(list.body.length).toBe(9)
    const one = await authedGet(app, reader, '/gdpr/dsfa-templates/video?lang=de')
    expect(one.body.title).toBe('Videoüberwachung')
    expect(one.body.processingDescription).toContain('Verantwortlicher: Nordlicht AG')
    expect((await authedGet(app, reader, '/gdpr/dsfa-templates/gibt-es-nicht')).status).toBe(404)
  })

  test('Vorabprüfung über die API', async () => {
    const c = await authedGet(app, reader, '/gdpr/dsfa-precheck?lang=en')
    expect(c.body.criteria.length).toBe(9)
    const r = await authedPost(app, reader, '/gdpr/dsfa-precheck?lang=en', { criteria: ['sensitive', 'large_scale'] })
    expect(r.body.result).toBe('likely')
  })

  const draft = () => authedPost(app, owner, '/gdpr/dsfa', { title: 'DSFA Test', risks: [{ id: 'k1', description: 'R', likelihood: 3, impact: 4, score: 12, mitigations: ['M1', 'M2'] }], precheck: { criteria: ['monitoring', 'vulnerable'] } })

  test('Anlegen: Risiken behalten Maßnahmen, Vorabprüfung wird vom Server berechnet und gestempelt; direkte Freigabe nicht möglich', async () => {
    const res = await draft()
    expect(res.status).toBe(201)
    expect(res.body.risks[0].mitigations).toEqual(['M1', 'M2'])
    expect(res.body.precheck).toMatchObject({ result: 'likely', by: 'contentowner' })
    const bad = await authedPost(app, owner, '/gdpr/dsfa', { title: 'X', status: 'approved' })
    expect(bad.status).toBe(400); expect(bad.body.code).toBe('approve_on_create')
  })

  test('Stellungnahme des DSB: ein Content Owner darf sie nicht eintragen, ein Administrator schon (mit Person und Datum)', async () => {
    const id = (await draft()).body.id
    const denied = await authedPut(app, owner, `/gdpr/dsfa/${id}`, { dpoConsulted: true, dpoOpinion: 'Selbst geschrieben' })
    expect(denied.status).toBe(403); expect(denied.body.code).toBe('dpo_only')
    const okRes = await authedPut(app, admin, `/gdpr/dsfa/${id}`, { dpoConsulted: true, dpoOpinion: 'Maßnahmen sind ausreichend.' })
    expect(okRes.status).toBe(200)
    expect(okRes.body).toMatchObject({ dpoOpinion: 'Maßnahmen sind ausreichend.', dpoOpinionBy: 'admin' })
    expect(okRes.body.dpoOpinionAt).toBeTruthy()
  })

  test('Server-eigene Felder lassen sich nicht über die API setzen', async () => {
    const id = (await draft()).body.id
    const res = await authedPut(app, owner, `/gdpr/dsfa/${id}`, { approvedBy: 'jemand', approvedAt: '2020-01-01', dpoOpinionBy: 'jemand' })
    expect(res.body.approvedBy).toBeFalsy(); expect(res.body.dpoOpinionBy).toBeFalsy()
  })

  test('Freigabe: ohne Stellungnahme 400, ohne Entscheidung 400, bei hohem Restrisiko ohne Begründung 400, dann Freigabe mit Stempel', async () => {
    const id = (await draft()).body.id
    const approve = body => authedPut(app, owner, `/gdpr/dsfa/${id}`, { status: 'approved', ...body })
    expect((await approve({})).body.code).toBe('dpo_opinion_missing')
    await authedPut(app, admin, `/gdpr/dsfa/${id}`, { dpoConsulted: true, dpoOpinion: 'Stellungnahme liegt vor.' })
    expect((await approve({})).body.code).toBe('decision_missing')
    expect((await approve({ decision: 'proceed', residualRisk: 'high' })).body.code).toBe('high_residual_unjustified')
    const done = await approve({ decision: 'proceed', residualRisk: 'high', decisionJustification: 'Restrisiko wird getragen, Aufsichtsbehörde informiert.' })
    expect(done.status).toBe(200)
    expect(done.body).toMatchObject({ status: 'approved', approvedBy: 'contentowner' })
    expect(done.body.approvedAt).toBeTruthy()
    // zurück in die Prüfung: Freigabestempel entfällt
    const back = await authedPut(app, owner, `/gdpr/dsfa/${id}`, { status: 'review' })
    expect(back.body.approvedBy).toBeFalsy()
  })

  test('Audit-Einträge für Anlegen, Änderung und Freigabe', async () => {
    const log = JSON.stringify((await authedGet(app, admin, '/admin/audit-log')).body)
    expect(log).toContain('gdpr_dsfa'); expect(log).toContain('review → approved'.replace('review', 'draft'))
  })
})
