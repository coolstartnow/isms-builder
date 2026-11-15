'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// BCM: Register der Anforderungen (ISO 22301) — Import (CSV/JSON) mit Vorschau, Bearbeitungsstand, Rechte, Export.
// Der Normtext gehört nicht zum Lieferumfang: alle Testdaten sind erfunden.
const fs = require('fs')
const os = require('os')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedPost } = require('./setup/authHelper')
const R = require('../server/bcmRequirements')

const CSV = [
  'framework,id,parent,chapter,title_de,title_en,summary_en,amendment',
  'ISO22301,9,,9,Beispielkapitel,Example chapter,,',
  'ISO22301,9.1,9,9,Beispiel eins,Example one,"Line one',
  'line two, with comma",Amd 1:2024',
  'ISO22301,9.2,9,9,Beispiel zwei,Example two,,',
].join('\n')

describe('Parser und Prüfung (reine Funktionen)', () => {
  test('CSV: Anführungszeichen, Zeilenumbruch im Feld, Komma/Semikolon, BOM', () => {
    const a = R.parseCsv('﻿' + CSV)
    expect(a.rows).toHaveLength(3)
    expect(a.rows[1].summary_en).toBe('Line one\nline two, with comma')
    const b = R.parseCsv('framework;id;title\nISO22301;1;"Ti;tel"\n')
    expect(b.rows[0]).toMatchObject({ id: '1', title: 'Ti;tel' })
  })
  test('JSON: Liste oder { requirements: [...] }; ungültig wird gemeldet', () => {
    expect(R.parse(JSON.stringify([{ framework: 'ISO22301', id: '1', title: 'X' }])).rows).toHaveLength(1)
    expect(R.parse(JSON.stringify({ requirements: [{ framework: 'ISO22301', id: '1', title: 'X' }] })).rows).toHaveLength(1)
    expect(R.parse('{kaputt').code).toBe('invalid_json')
  })
  test('Grenzen: zu große Datei, zu viele Zeilen', () => {
    expect(R.parse('x'.repeat(R.MAX_BYTES + 1)).code).toBe('too_large')
    const many = 'framework,id,title\n' + Array.from({ length: R.MAX_ROWS + 1 }, (_, i) => `ISO22301,${i},T`).join('\n')
    expect(R.parse(many, 'csv').code).toBe('too_many_rows')
  })
  test('Prüfung je Zeile mit Grund', () => {
    const v = R.validate([
      { framework: 'ISO22301', id: '1', title: 'ok' },
      { framework: 'ISO22301', id: '1', title: 'doppelt' },
      { framework: 'ISO9999', id: '2', title: 'x' },
      { framework: 'ISO22301', id: '', title: 'x' },
      { framework: 'ISO22301', id: '3' },
      { framework: 'ISO22301', id: '4', title: 'x'.repeat(600) },
      null,
    ])
    expect(v.accepted).toHaveLength(1)
    expect(v.rejected.map(r => r.reason)).toEqual(['duplicate_id', 'invalid_framework', 'missing_field', 'missing_field', 'too_long', 'not_an_object'])
  })
  test('Elternverweis auf unbekannte Anforderung wird abgelehnt', () => {
    const rej = []
    const ok = R.checkParents([{ framework: 'ISO22301', id: '1.1', parent: '1' }, { framework: 'ISO22301', id: '2.1', parent: '2' }], new Set(['ISO22301:1']), rej)
    expect(ok.map(o => o.id)).toEqual(['1.1']); expect(rej[0]).toMatchObject({ id: '2.1', reason: 'bad_parent' })
  })
  test('Vorlage enthält nur erfundene Beispiele und lässt sich wieder importieren', () => {
    const t = R.templateCsv()
    expect(t).toMatch(/Beispielanforderung/)
    const p = R.parse(t); expect(R.validate(p.rows, p.header).accepted).toHaveLength(2)
  })
  test('Export neutralisiert Formelzeichen', () => {
    const out = R.exportCsv([{ framework: 'ISO22301', id: '1', chapter: '1', title: { en: '=HYPERLINK("x")' } }], [{ framework: 'ISO22301', id: '1', status: 'partial', responsible: '+cmd' }])
    expect(out).toContain("'=HYPERLINK")
    expect(out).toContain("'+cmd")
  })
  test('Bearbeitungsstand: Werte, Begründungspflicht, Grenzen', () => {
    expect(R.cleanAssessment({ status: 'kaputt' }).ok).toBe(false)
    expect(R.cleanAssessment({ status: 'not_applicable' }).ok).toBe(false)
    expect(R.cleanAssessment({ status: 'not_applicable', justification: 'trifft nicht zu' }).ok).toBe(true)
    expect(R.cleanAssessment({ linkedBia: 'x' }).ok).toBe(false)
    expect(R.cleanAssessment({ lastReviewDate: '1.1.2026' }).ok).toBe(false)
    expect(R.cleanAssessment({ responsible: 'x'.repeat(300) }).ok).toBe(false)
  })
  test('Auswertung zählt nur Blätter (ohne Überschriften) und fehlende Nachweise', () => {
    const reqs = [{ framework: 'ISO22301', id: '9', parent: '' }, { framework: 'ISO22301', id: '9.1', parent: '9' }, { framework: 'ISO22301', id: '9.2', parent: '9' }]
    const s = R.summarize(reqs, [{ framework: 'ISO22301', id: '9.1', status: 'implemented', evidenceNote: 'x' }])
    expect(s).toMatchObject({ total: 2, implemented: 1, notStarted: 1, withoutEvidence: 1 })
  })
})

let dataDir, app, admin, editor, reader
beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-bcmreq-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = process.env.TEST_BACKEND || 'json'
  app = require('../server/index.js')
  if (app.bootstrap) await app.bootstrap()
  admin = await loginAs(app, 'admin'); editor = await loginAs(app, 'editor'); reader = await loginAs(app, 'reader')
})
afterAll(async () => {
  if (process.env.TEST_BACKEND) await require('../server/db/knexDatabase').destroy()
  removeTestDataDir(dataDir)
})

const imp = (cookie, buf, name, q = '') => request(app).post(`/bcm/requirements/import${q}`).set('Cookie', cookie).attach('file', Buffer.from(buf), name)

describe('Import und Register (Routen)', () => {
  test('Leerzustand', async () => {
    const r = await request(app).get('/bcm/requirements').set('Cookie', reader)
    expect(r.status).toBe(200); expect(r.body.requirements).toEqual([]); expect(r.body.summary.total).toBe(0)
  })
  test('Import nur für Admin', async () => {
    expect((await imp(editor, CSV, 'a.csv')).status).toBe(403)
    expect((await imp(reader, CSV, 'a.csv')).status).toBe(403)
  })
  test('Vorschau ändert nichts und nennt neu/aktualisiert/abgelehnt', async () => {
    const r = await imp(admin, CSV + '\nISO22301,9.3,9.9,9,x,y,,\nISO22301,9.1,,9,dup,dup,,', 'a.csv', '?dryRun=1')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ dryRun: true, added: 3, updated: 0, rejected: 2 })
    expect(r.body.rejectedByReason).toEqual({ duplicate_id: 1, bad_parent: 1 })
    expect((await request(app).get('/bcm/requirements').set('Cookie', reader)).body.requirements).toHaveLength(0)
  })
  test('Fehlerfälle: leer, kaputtes JSON, keine gültige Zeile', async () => {
    expect((await imp(admin, '', 'a.csv')).status).toBe(400)
    expect((await imp(admin, '{kaputt', 'a.json')).status).toBe(400)
    expect((await imp(admin, 'framework,id,title\nXXX,1,t', 'a.csv')).status).toBe(400)
  })
  test('Import legt an, Antwort und Audit-Eintrag; XSS-Text bleibt Text', async () => {
    const r = await imp(admin, CSV + '\nISO22301,9.4,9,9,"<script>alert(1)</script>",<img src=x onerror=1>,,', 'a.csv')
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ dryRun: false, added: 4, updated: 0, rejected: 0 })
    const list = (await request(app).get('/bcm/requirements').set('Cookie', reader)).body
    expect(list.requirements).toHaveLength(4)
    expect(list.requirements.find(x => x.id === '9.1').summary.en).toBe('Line one\nline two, with comma')
    expect(list.requirements.find(x => x.id === '9.1').amendment).toBe('Amd 1:2024')
    const log = (await request(app).get('/admin/audit-log').set('Cookie', admin)).body
    expect((Array.isArray(log) ? log : log.entries).some(e => e.resource === 'bcm-requirements' && /4 neu/.test(e.detail))).toBe(true)
  })
  test('Bearbeiten: Reader 403, Editor ok, ungültiger Status/Begründung/Ziel abgelehnt', async () => {
    const url = '/bcm/requirements/ISO22301/9.1/assessment'
    const put = (c, b) => request(app).put(url).set('Cookie', c).send(b)
    expect((await put(reader, { status: 'implemented' })).status).toBe(403)
    expect((await put(editor, { status: 'kaputt' })).status).toBe(400)
    expect((await put(editor, { status: 'not_applicable' })).status).toBe(400)
    expect((await put(editor, { linkedBia: ['gibt_es_nicht'] })).status).toBe(400)
    expect((await request(app).put('/bcm/requirements/ISO22301/0.0/assessment').set('Cookie', editor).send({ status: 'partial' })).status).toBe(404)
    const bia = (await authedPost(app, admin, '/bcm/bia', { title: 'Lohnabrechnung', criticality: 'high' })).body
    const ok = await put(editor, { status: 'implemented', responsible: 'Frau Test', evidenceNote: 'Nachweis', linkedBia: [bia.id], lastReviewDate: '2026-10-01' })
    expect(ok.status).toBe(200); expect(ok.body).toMatchObject({ status: 'implemented', linkedBia: [bia.id], updatedBy: expect.any(String) })
  })
  test('erneuter Import ändert Definitionen, nicht den Bearbeitungsstand', async () => {
    const r = await imp(admin, CSV.replace('Example one', 'Example one (neu)'), 'a.csv')
    expect(r.body).toMatchObject({ added: 0, updated: 3 })
    const list = (await request(app).get('/bcm/requirements').set('Cookie', reader)).body
    expect(list.requirements.find(x => x.id === '9.1').title.en).toBe('Example one (neu)')
    expect(list.assessments.find(a => a.id === '9.1')).toMatchObject({ status: 'implemented', responsible: 'Frau Test' })
    expect(list.requirements).toHaveLength(4)   // nichts wird gelöscht
  })
  test('Summary im BCM-Dashboard und Export/Vorlage', async () => {
    const s = (await request(app).get('/bcm/summary').set('Cookie', reader)).body
    expect(s.requirements).toMatchObject({ total: 3, implemented: 1 })   // 9.1, 9.2, 9.4 (9 ist Überschrift)
    const csv = await request(app).get('/bcm/requirements/export.csv').set('Cookie', reader)
    expect(csv.status).toBe(200); expect(csv.headers['content-type']).toMatch(/text\/csv/); expect(csv.text).toContain('implemented')
    expect((await request(app).get('/bcm/requirements/template.csv').set('Cookie', reader)).text).toContain('Beispielanforderung')
  })
  test('JSON-Import mit Sprachspalten', async () => {
    const r = await imp(admin, JSON.stringify([{ framework: 'ISO22301', id: '9.7', parent: '9', title_de: 'Titel', title_fr: 'Titre', summary_hu: 'Leírás' }]), 'b.json')
    expect(r.status).toBe(200)
    const x = (await request(app).get('/bcm/requirements').set('Cookie', reader)).body.requirements.find(q => q.id === '9.7')
    expect(x.title).toEqual({ de: 'Titel', fr: 'Titre' }); expect(x.summary).toEqual({ hu: 'Leírás' })
  })
})

const DEMO_CSV = path.join(os.homedir(), 'Downloads', 'iso22301-demo-requirements.csv')
;(fs.existsSync(DEMO_CSV) ? describe : describe.skip)('Demo-Datei aus ~/Downloads (nicht im Repo)', () => {
  test('alle Zeilen gültig, Elternverweise stimmig', () => {
    const p = R.parse(fs.readFileSync(DEMO_CSV, 'utf8'))
    const v = R.validate(p.rows, p.header); const rej = []
    const ok = R.checkParents(v.accepted, new Set(), rej)
    expect([v.rejected.length, rej.length, ok.length]).toEqual([0, 0, p.rows.length])
  })
})
