'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Vorlagen für die Einträge des GDPR-Moduls (VVT, AV-Verträge, Datenpannen, Betroffenenanfragen, TOMs)
const fs = require('fs')
const path = require('path')
const g = require('../server/gdprTemplates')
const DOC_LANGS = require('../ui/i18n/languages.js').completeCodes() // Leitfäden (docs/*.md) gibt es für Sprachen mit Status „complete“; Inhalte können früher da sein
const store = require('../server/db/gdprStore')
const { TOM_CATEGORIES, TOM_STATUSES } = require('../server/db/measuresCommon')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPut } = require('./setup/authHelper')
const suf = Object.fromEntries(require('../ui/i18n/languages.js').list.map(l => [l.code, l.docSuffix]))

const DATA_CATS = ['name', 'email', 'phone', 'address', 'health', 'biometric', 'financial', 'location', 'other']   // wie GDPR_DATA_CATS in ui/app.js
const SUBJECTS = ['customers', 'employees', 'contractors', 'website_visitors', 'minors']                          // wie GDPR_SUBJECT_TYPES
const LEGAL = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interest']
const INCIDENT_TYPES = ['unauthorized_access', 'loss', 'deletion', 'theft', 'ransomware', 'other']
const DSAR_TYPES = ['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection', 'review_automated']

describe('Katalog', () => {
  test('fünf Arten mit den erwarteten Mengen; Kennungen eindeutig', () => {
    expect(g.KINDS).toEqual(['vvt', 'av', 'incident', 'dsar', 'tom'])
    expect(Object.fromEntries(g.KINDS.map(k => [k, g.list(k, 'de').length]))).toEqual({ vvt: 14, av: 12, incident: 10, dsar: 10, tom: 24 })
  })
  test('jede Vorlage ist in allen fünf Sprachen vollständig und baut ein Formularobjekt', () => {
    for (const kind of g.KINDS) for (const { id } of g.list(kind, 'en')) for (const l of g.LANGUAGES) {
      const b = g.build(kind, id, l, {})
      expect(b).toBeTruthy(); expect(b.title.length).toBeGreaterThan(4)
      for (const v of Object.values(b)) if (typeof v === 'string') expect(v).not.toMatch(/undefined|\[object/)
    }
  })
  test('Werte passen zu den Auswahllisten der Oberfläche und des Speichers', () => {
    for (const { id } of g.list('vvt', 'en')) { const b = g.build('vvt', id, 'de', {}); expect(LEGAL).toContain(b.legalBasis); for (const c of b.dataCategories) expect(DATA_CATS).toContain(c); for (const s of b.dataSubjectTypes) expect(SUBJECTS).toContain(s); expect(b.recipients.length).toBeGreaterThan(0) }
    for (const { id } of g.list('incident', 'en')) { const b = g.build('incident', id, 'de', {}); expect(INCIDENT_TYPES).toContain(b.incidentType); expect(['low', 'medium', 'high']).toContain(b.riskLevel); for (const c of b.dataCategories) expect(DATA_CATS).toContain(c); for (const s of b.dataSubjectTypes) expect(SUBJECTS).toContain(s) }
    for (const { id } of g.list('dsar', 'en')) expect(DSAR_TYPES).toContain(g.build('dsar', id, 'de', {}).requestType)
    for (const { id } of g.list('tom', 'en')) { const b = g.build('tom', id, 'de', {}); expect(TOM_CATEGORIES).toContain(b.category); expect(TOM_STATUSES).toContain(b.status) }
    expect(store.TOM_CATEGORIES).toEqual(TOM_CATEGORIES)
  })
  test('AV-Vorlage lässt Auftragsverarbeiter und die Art.-28-Checkliste leer (nur der Nutzer hakt ab)', () => {
    const b = g.build('av', 'cloud_hosting', 'de', {})
    expect(b.processorName).toBe(''); expect(Object.values(b.art28Checklist).every(v => v === false)).toBe(true)
  })
  test('Antwortschreiben: Platzhalter werden aus den Organisationsdaten gefüllt, fehlende bleiben stehen', () => {
    const b = g.build('dsar', 'access', 'en', { orgName: 'Nordlicht AG' })
    expect(b.response).toContain('Kind regards, Nordlicht AG'); expect(b.unresolved).toEqual(['DATA_PROTECTION_OFFICER'])
  })
  test('unbekannte Art oder Vorlage → null; unbekannte Sprache → Englisch', () => {
    expect(g.list('gibtsnicht', 'de')).toBeNull(); expect(g.build('vvt', 'gibtsnicht', 'de', {})).toBeNull()
    expect(g.build('tom', 'rbac', 'xx', {}).title).toBe('Role-based permission concept')
  })
})

describe('Anleitung', () => {
  test('der GDPR-Leitfaden nennt jede Vorlage in seiner Sprache und den Hinweis zur Rechtsberatung', () => {
    for (const l of g.LANGUAGES.filter(x => DOC_LANGS.includes(x))) {
      const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', `module-gdpr${suf[l]}.md`), 'utf8')
      for (const kind of g.KINDS) for (const { title } of g.list(kind, l)) expect([l, title, doc.includes(title)]).toEqual([l, title, true])
    }
  })
  test('DSFA-, KI-Entwurfs- und GDPR-Leitfaden sagen: praxisbezogen, sorgfältig anpassen, keine Rechtsberatung', () => {
    const needle = { de: 'sorgfältig auf das eigene Unternehmen angepasst', en: 'carefully adapted to your own company', fr: 'soigneusement adaptés à votre propre entreprise|soigneusement adapté à votre propre entreprise', nl: 'zorgvuldig op uw eigen bedrijf worden afgestemd', hu: 'gondosan hozzá kell igazítani a saját vállalkozás', et: 'hoolikalt oma ettevõttele kohandada' }
    for (const l of g.LANGUAGES.filter(x => DOC_LANGS.includes(x))) for (const f of ['module-gdpr', 'module-dsfa', 'module-ai-drafts']) {
      const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', `${f}${suf[l]}.md`), 'utf8')
      expect([f, l, new RegExp(needle[l]).test(doc)]).toEqual([f, l, true])
    }
  })
})

describe('Endpunkte', () => {
  let dataDir, app, admin, reader
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-gdprtpl'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin'); reader = await loginAs(app, 'reader')
  })
  afterAll(() => removeTestDataDir(dataDir))
  test('Liste und Vorlage je Art (ab Leser); Platzhalter aus den Organisationsdaten', async () => {
    await authedPut(app, admin, '/admin/org-settings', { orgName: 'Nordlicht AG', gdpoName: 'Dana Beispiel' })
    for (const [kind, n] of [['vvt', 14], ['av', 12], ['incident', 10], ['dsar', 10], ['tom', 24]]) expect((await authedGet(app, reader, `/gdpr/templates/${kind}?lang=de`)).body.length).toBe(n)
    const one = await authedGet(app, reader, '/gdpr/templates/dsar/erasure?lang=de')
    expect(one.status).toBe(200); expect(one.body.response).toContain('Nordlicht AG'); expect(one.body.response).toContain('Dana Beispiel'); expect(one.body.unresolved).toEqual([])
    expect((await authedGet(app, reader, '/gdpr/templates/vvt/gibtsnicht')).status).toBe(404)
    expect((await authedGet(app, reader, '/gdpr/templates/unbekannt')).status).toBe(404)
  })
})
