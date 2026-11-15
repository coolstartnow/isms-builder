'use strict'
const csv = require('../server/templateCsv')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./setup/authHelper')

const TYPES = ['Policy', 'Procedure', 'Risk Policy', 'SoA', 'Incident', 'Release']

describe('CSV-Format', () => {
  const doc = { id: 'p1', type: 'Policy', title: '=Böse, "Titel"', language: 'de', status: 'approved', version: 3, owner: 'x', nextReviewDate: '2027-01-31T00:00:00Z', parentId: null, content: '# H\n\nZeile;mit Semikolon\n+Liste\r\nUmlaute äöü' }

  test('Export: BOM, Kopfzeile, jede Zelle in Anführungszeichen, Formelzeichen entschärft', () => {
    const out = csv.toCsv([doc])
    expect(out.charCodeAt(0)).toBe(0xfeff)
    expect(out.slice(1).split('\r\n')[0]).toBe(csv.COLUMNS.map(c => `"${c}"`).join(','))
    expect(out).toContain('"\'=Böse, ""Titel"""')
    expect(out).toContain('"2027-01-31"')
  })
  test('Rundreise: Export → Import liefert Titel, Inhalt und Datum unverändert (auch Zeilenumbrüche, Komma, Anführungszeichen)', () => {
    const r = csv.parseImport(csv.toCsv([doc]), TYPES)
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.records[0]).toMatchObject({ type: 'Policy', title: '=Böse, "Titel"', language: 'de', nextReviewDate: '2027-01-31', content: doc.content })
  })
  test('Semikolon-Dateien (deutsches Excel) und Windows-Zeilenenden werden gelesen', () => {
    const r = csv.parseImport('﻿type;title;language;content\r\nPolicy;Passwort;de;"Zeile 1;\nZeile 2"\r\nProcedure;Patch;en;Text\r\n', TYPES)
    expect(r.records.map(x => [x.type, x.title, x.language, x.content])).toEqual([['Policy', 'Passwort', 'de', 'Zeile 1;\nZeile 2'], ['Procedure', 'Patch', 'en', 'Text']])
  })
  test('Elternbezug wird als Titel ausgegeben', () => {
    const out = csv.toCsv([{ ...doc, id: 'a', title: 'Eltern' }, { ...doc, id: 'b', title: 'Kind', parentId: 'a' }])
    expect(csv.parseImport(out, TYPES).records.find(r => r.title === 'Kind').parent).toBe('Eltern')
  })
})

describe('Prüfung beim Import', () => {
  test('ungültige Zeilen werden mit Grund gemeldet, gültige bleiben', () => {
    const r = csv.parseImport(['type,title,language,content', 'Policy,Gut,de,x', 'Unbekannt,A,de,x', 'Policy,,de,x', 'Policy,B,xx,x', 'Policy,C,de,x', ].join('\n').replace('Policy,C,de,x', 'Policy,C,de,x'), TYPES)
    expect(r.records.map(x => x.title)).toEqual(['Gut', 'C'])
    expect(r.errors.map(e => e.code)).toEqual(['type_unknown', 'title_missing', 'language_unknown'])
  })
  test('Datum, Länge und Pflichtspalten', () => {
    expect(csv.parseImport('type,title,language,content,nextReviewDate\nPolicy,A,de,x,31.01.2027', TYPES).errors[0].code).toBe('date_invalid')
    expect(csv.parseImport('type,title,language,content\nPolicy,' + 'a'.repeat(201) + ',de,x', TYPES).errors[0].code).toBe('title_too_long')
    expect(csv.parseImport('type,title,content\nPolicy,A,x', TYPES)).toMatchObject({ ok: false, code: 'missing_column', column: 'language' })
    expect(csv.parseImport('type,title,language,content', TYPES)).toMatchObject({ ok: false, code: 'empty' })
    expect(csv.parseImport('type,title,language,content\nPolicy,"A,de,x', TYPES)).toMatchObject({ ok: false, code: 'unterminated_quote' })
  })
  test('Zeilenlimit', () => {
    const rows = ['type,title,language,content', ...Array.from({ length: 501 }, (_, i) => `Policy,T${i},de,x`)]
    expect(csv.parseImport(rows.join('\n'), TYPES)).toMatchObject({ ok: false, code: 'too_many_rows' })
  })
  test('plan: vorhandene und doppelte Dokumente werden übersprungen', () => {
    const recs = csv.parseImport('type,title,language,content\nPolicy,Alt,de,x\nPolicy,Neu,de,x\nPolicy, neu ,de,y\nPolicy,Neu,en,z', TYPES).records
    const p = csv.plan(recs, [{ type: 'Policy', title: 'ALT', language: 'de' }])
    expect(p.toCreate.map(r => r.title + r.language)).toEqual(['Neude', 'Neuen'])
    expect(p.skipped.map(s => s.code)).toEqual(['exists', 'duplicate_in_file'])
  })
})

describe('Endpunkte', () => {
  let dataDir, app, admin, editor, reader, contentowner
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-templatecsv'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin'); editor = await loginAs(app, 'editor'); reader = await loginAs(app, 'reader'); contentowner = await loginAs(app, 'contentowner')
  })
  afterAll(() => removeTestDataDir(dataDir))

  const mk = async (title, extra = {}) => (await authedPost(app, contentowner, '/template', { type: 'Policy', language: 'de', title, content: 'Inhalt ' + title, ...extra })).body

  test('Export liefert alle Dokumente als CSV, auch für Leser', async () => {
    await mk('Exportdoc A'); await mk('Exportdoc B')
    const res = await authedGet(app, reader, '/templates/export.csv')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="documents-\d{4}-\d{2}-\d{2}\.csv"/)
    const text = res.text
    expect(text).toContain('Exportdoc A'); expect(text).toContain('Exportdoc B')
  })

  test('Import: Vorschau schreibt nichts, danach werden neue Entwürfe angelegt', async () => {
    const csvText = 'type,title,language,content,nextReviewDate\nPolicy,Import Eins,de,# Eins,2027-05-01\nProcedure,Import Zwei,en,Two,\n'
    const before = (await authedGet(app, admin, '/templates')).body.length
    const dry = await authedPost(app, contentowner, '/templates/import', { csv: csvText, dryRun: true })
    expect(dry.status).toBe(200)
    expect(dry.body).toMatchObject({ created: 2, dryRun: true })
    expect((await authedGet(app, admin, '/templates')).body.length).toBe(before)
    const real = await authedPost(app, contentowner, '/templates/import', { csv: csvText })
    expect(real.status).toBe(201)
    const list = (await authedGet(app, admin, '/templates')).body
    expect(list.length).toBe(before + 2)
    const one = list.find(t => t.title === 'Import Eins')
    expect(one).toMatchObject({ status: 'draft', version: 1, owner: 'contentowner', nextReviewDate: '2027-05-01', content: '# Eins' })
  })

  test('Import überschreibt nichts und legt keine Doppelten an (auch nicht beim zweiten Mal)', async () => {
    const d = await mk('Bestand', { content: 'Original' })
    const res = await authedPost(app, contentowner, '/templates/import', { csv: 'type,title,language,content\nPolicy,Bestand,de,ÜBERSCHRIEBEN\nPolicy,Neu Z,de,x\n' })
    expect(res.body.created).toBe(1); expect(res.body.skipped[0].code).toBe('exists')
    expect((await authedGet(app, admin, `/template/Policy/${d.id}`)).body.content).toBe('Original')
    const again = await authedPost(app, contentowner, '/templates/import', { csv: 'type,title,language,content\nPolicy,Neu Z,de,x\n' })
    expect(again.body.created).toBe(0)
  })

  test('Elternbezug über den Titel', async () => {
    const res = await authedPost(app, contentowner, '/templates/import', { csv: 'type,title,language,content,parent\nPolicy,Wurzel Q,de,x,\nPolicy,Kind Q,de,x,Wurzel Q\nPolicy,Waise Q,de,x,Gibt es nicht\n' })
    expect(res.body.warnings.map(w => w.code)).toEqual(['parent_not_found'])
    const list = (await authedGet(app, admin, '/templates')).body
    const root = list.find(t => t.title === 'Wurzel Q'), kid = list.find(t => t.title === 'Kind Q')
    expect(kid.parentId).toBe(root.id)
  })

  test('Rechte: Editor und Leser dürfen nicht importieren; Fehler werden als 400 gemeldet', async () => {
    const body = { csv: 'type,title,language,content\nPolicy,X,de,x\n' }
    expect((await authedPost(app, editor, '/templates/import', body)).status).toBe(403)
    expect((await authedPost(app, reader, '/templates/import', body)).status).toBe(403)
    const bad = await authedPost(app, contentowner, '/templates/import', { csv: 'title,content\nA,B\n' })
    expect(bad.status).toBe(400); expect(bad.body.code).toBe('missing_column')
  })

  test('Audit-Einträge für Export und Import', async () => {
    const log = JSON.stringify((await authedGet(app, admin, '/admin/audit-log')).body)
    expect(log).toContain('CSV-Export'); expect(log).toContain('CSV-Import')
  })
})

describe('Kennungen und Baum', () => {
  test('mehrere Dokumente in derselben Millisekunde bekommen verschiedene Kennungen', () => {
    const json = require('../server/db/jsonStore')
    const os = require('os'), fs = require('fs'), path = require('path')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ids-'))
    const old = process.env.DATA_DIR
    jest.isolateModules(() => {
      process.env.DATA_DIR = dir
      const store = require('../server/db/jsonStore')
      store.init()
      const realNow = Date.now; Date.now = () => 1700000000000
      try {
        const ids = Array.from({ length: 5 }, (_, i) => store.createTemplate({ type: 'Policy', language: 'de', title: 'T' + i, owner: 'x' }).id)
        expect(new Set(ids).size).toBe(5)
      } finally { Date.now = realNow; process.env.DATA_DIR = old }
    })
    fs.rmSync(dir, { recursive: true, force: true })
  })
  test('doppelte Kennung mit Selbstbezug (Altbestand) bringt den Baum nicht zum Absturz', () => {
    const os = require('os'), fs = require('fs'), path = require('path')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-'))
    const old = process.env.DATA_DIR
    const doc = (title, parentId) => ({ id: 'Policy_1', type: 'Policy', language: 'de', title, content: '', version: 1, status: 'draft', parentId, sortOrder: 0, history: [], versionHistory: [], statusHistory: [], attachments: [], linkedControls: [], applicableEntities: [] })
    fs.writeFileSync(path.join(dir, 'templates.json'), JSON.stringify([doc('Eins', null), doc('Kind', 'Policy_1')]))
    jest.isolateModules(() => {
      process.env.DATA_DIR = dir
      const store = require('../server/db/jsonStore')
      store.init()
      expect(() => store.getTemplateTree('Policy', 'de')).not.toThrow()
      process.env.DATA_DIR = old
    })
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
