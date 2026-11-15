// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Fragebogen-Vorlagen, NIS2-Katalog, Pflichtfelder und Bemerkungen der Lieferanten-Selbstauskunft
'use strict'
const fs   = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let app, request, dataDir
beforeAll(() => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-assessment-templates'
  app = require('../server/index')
  request = require('supertest')
})
afterAll(() => { removeTestDataDir(dataDir) })

const CREDS = { admin: ['admin@test.local', 'adminpass'], editor: ['editor@test.local', 'editorpass'], reader: ['reader@test.local', 'readerpass'] }
const auth = role => request(app).post('/login').send({ email: CREDS[role][0], password: CREDS[role][1] }).then(r => r.headers['set-cookie'])
const catalogs = require('../server/db/assessmentCatalogs')

async function supplier(cookie) {
  const r = await request(app).post('/suppliers').set('Cookie', cookie).send({ name: 'Vorlagen-Lieferant', type: 'software', criticality: 'high', status: 'active', country: 'DE' })
  return r.body
}

describe('Kataloge', () => {
  test('NIS2-Katalog: 56 Fragen in 13 Abschnitten, Kennungen eindeutig, alle Typen gültig', () => {
    const c = catalogs.getCatalog('nis2', 'de')
    const qs = c.sections.flatMap(s => s.questions)
    expect(c.sections).toHaveLength(13)
    expect(qs).toHaveLength(56)
    expect(new Set(qs.map(q => q.id)).size).toBe(56)
    expect(qs.every(q => ['yesno', 'text', 'textarea'].includes(q.type) && q.text.length > 10)).toBe(true)
    // Bemerkungsfeld bei jeder Ja/Nein-Frage vorbelegt
    expect(qs.filter(q => q.type === 'yesno').every(q => q.comment === true)).toBe(true)
  })
  test('NIS2-Katalog: Gliederung nach Art. 20, 21 Abs. 2 a–j und 23', () => {
    const titles = catalogs.getCatalog('nis2', 'en').sections.map(s => s.section).join('|')
    for (const k of ['Art. 20', '21(2)(a)', 'Art. 23', '21(2)(d)', '21(2)(e)', '21(2)(j)']) expect(titles).toContain(k)
  })
  test('Fremdsprache ohne Übersetzung fällt auf Englisch zurück', () => {
    const et = catalogs.getCatalog('nis2', 'et').sections[0].section
    expect(et).toBe(catalogs.getCatalog('nis2', 'en').sections[0].section)
  })
  test('Standardkatalog: 19 Fragen, in allen Sprachen gleiche Kennungen', () => {
    for (const l of ['de', 'en', 'fr', 'nl', 'hu', 'et']) {
      expect(catalogs.getCatalog('standard', l).sections.flatMap(s => s.questions)).toHaveLength(19)
    }
  })
})

describe('Vorlagen-API', () => {
  test('Reader sieht Kataloge und eingebaute Vorlagen, darf aber nichts ändern', async () => {
    const reader = await auth('reader')
    const list = await request(app).get('/assessment-templates?lang=en').set('Cookie', reader)
    expect(list.status).toBe(200)
    expect(list.body.map(t => t.id)).toEqual(expect.arrayContaining(['builtin:standard', 'builtin:nis2']))
    const cat = await request(app).get('/assessment-templates/catalogs').set('Cookie', reader)
    expect(cat.body).toHaveLength(2)
    const spec = catalogs.defaultSpec('nis2')
    expect((await request(app).post('/assessment-templates').set('Cookie', reader).send({ name: 'x', ...spec })).status).toBe(403)
    expect((await request(app).get('/assessment-templates')).status).toBe(401)
  })

  test('Editor legt Vorlage an, ändert und löscht sie; eingebaute sind geschützt', async () => {
    const ed = await auth('editor')
    const base = catalogs.defaultSpec('nis2')
    const sel = base.selection.slice(0, 5).map((s, i) => ({ ...s, required: i < 2 }))
    const c = await request(app).post('/assessment-templates').set('Cookie', ed).send({ name: 'Cloud-Anbieter', description: 'Mit Datenzugriff', catalog: 'nis2', selection: sel, custom: [{ text: 'Eigene Frage?', type: 'yesno', required: true, comment: true }] })
    expect(c.status).toBe(201)
    expect(c.body.id).toMatch(/^tpl_/)
    expect(c.body.custom[0].id).toMatch(/^c_/)
    expect((await request(app).post('/assessment-templates').set('Cookie', ed).send({ name: 'cloud-anbieter', ...base })).status).toBe(409)
    const u = await request(app).put(`/assessment-templates/${c.body.id}`).set('Cookie', ed).send({ name: 'Cloud-Anbieter 2', catalog: 'nis2', selection: sel.slice(0, 3), custom: [] })
    expect(u.status).toBe(200); expect(u.body.selection).toHaveLength(3)
    expect((await request(app).put('/assessment-templates/builtin:nis2').set('Cookie', ed).send({ name: 'x', ...base })).status).toBe(403)
    expect((await request(app).delete('/assessment-templates/builtin:nis2').set('Cookie', ed)).status).toBe(403)
    expect((await request(app).delete(`/assessment-templates/${c.body.id}`).set('Cookie', ed)).status).toBe(200)
    expect((await request(app).get(`/assessment-templates/${c.body.id}`).set('Cookie', ed)).status).toBe(404)
  })

  test('Ungültige Vorlagen werden abgelehnt', async () => {
    const ed = await auth('editor'); const base = catalogs.defaultSpec('standard')
    const bad = [
      { name: '', ...base }, { name: 'x'.repeat(121), ...base }, { name: 'a', catalog: 'gibt-es-nicht', selection: [], custom: [] },
      { name: 'a', catalog: 'standard', selection: [{ id: 'q_unbekannt' }], custom: [] },
      { name: 'a', catalog: 'standard', selection: [base.selection[0], base.selection[0]], custom: [] },
      { name: 'a', catalog: 'standard', selection: [], custom: [] },
      { name: 'a', catalog: 'standard', selection: [], custom: [{ text: 'x', type: 'script' }] },
      { name: 'a', catalog: 'standard', selection: [], custom: [{ text: 'x'.repeat(1001), type: 'text' }] },
    ]
    for (const b of bad) expect((await request(app).post('/assessment-templates').set('Cookie', ed).send(b)).status).toBe(400)
  })

  test('Name mit HTML wird gespeichert, aber nie als HTML ausgegeben (Oberfläche escaped)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
    const block = src.slice(src.indexOf('async function openAssessmentTemplates'), src.indexOf('// SUPPLIER SELF-ASSESSMENTS'))
    expect(block).toContain('escHtml(tp.name)')
    expect(block).not.toMatch(/\$\{tp\.name\}/)
    expect(block).not.toMatch(/\$\{tp\.description\}/)
  })
})

describe('Fragebogen aus Vorlage / Auswahl', () => {
  test('templateId (eingebaut NIS2) → 56 Fragen, Ja/Nein Pflicht, Bemerkung gesetzt', async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', templateId: 'builtin:nis2' })
    expect(r.status).toBe(201)
    const qs = r.body.questions.flatMap(s => s.questions)
    expect(qs).toHaveLength(56)
    expect(qs.filter(q => q.type === 'yesno').every(q => q.required === true && q.comment === true)).toBe(true)
    expect(r.body.templateId).toBe('builtin:nis2')
  })

  test('Anpassung je Lieferant (spec): nur gewählte Fragen, eigene Pflicht, eigene Frage', async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    const base = catalogs.defaultSpec('nis2')
    const spec = { catalog: 'nis2', selection: [{ id: base.selection[0].id, required: false, comment: true }, { id: base.selection[10].id, required: true, comment: false }], custom: [{ text: 'Haben Sie ein Rechenzentrum in der EU?', type: 'yesno', required: true, comment: false }] }
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'en', spec })
    expect(r.status).toBe(201)
    const qs = r.body.questions.flatMap(s => s.questions)
    expect(qs).toHaveLength(3)
    expect(qs[0]).toMatchObject({ required: false, comment: true })
    expect(qs[1]).toMatchObject({ required: true })
    expect(qs[2].text).toMatch(/Rechenzentrum/)
    expect(r.body.questions.at(-1).section).toBe('Additional questions')
  })

  test('Ungültige Auswahl / Vorlage → 400 bzw. 404; client-seitige Fragen werden gesäubert', async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    expect((await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, spec: { catalog: 'nis2', selection: [{ id: 'q_x' }] } })).status).toBe(400)
    expect((await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, templateId: 'tpl_gibtsnicht' })).status).toBe(404)
    expect((await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, questions: [{ section: 'A', questions: [{ id: 'Q 1', text: 'x', type: 'yesno' }] }] })).status).toBe(400)
    const ok = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, questions: [{ section: 'A', extra: 'x', questions: [{ id: 'q_a', text: 'Frage', type: 'text', required: true, evil: '<script>' }] }] })
    expect(ok.status).toBe(201)
    expect(JSON.stringify(ok.body.questions)).not.toContain('evil')
  })

  test('Ohne Angaben bleibt der bisherige Standardfragebogen (19 Fragen)', async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de' })
    expect(r.body.questions.flatMap(s => s.questions)).toHaveLength(19)
  })
})

describe('Öffentliche Seite: Pflicht und Bemerkung', () => {
  let token
  const spec = { catalog: 'nis2', selection: [], custom: [] }
  beforeAll(async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    const base = catalogs.defaultSpec('nis2')
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: { ...spec, selection: [
      { id: base.selection[0].id, required: true, comment: true },
      { id: base.selection[1].id, required: false, comment: false },
    ], custom: [{ text: 'Freitext-Pflicht', type: 'text', required: true }] } })
    token = r.body.token
    spec.ids = r.body.questions.flatMap(s => s.questions).map(q => q.id)
  })

  test('Seite zeigt Pflicht-Sternchen, required nur bei Pflichtfragen, Bemerkungsfeld nur wo gewünscht', async () => {
    const r = await request(app).get(`/supplier-assessment/${token}`)
    expect(r.status).toBe(200)
    const [a, b, c] = spec.ids
    expect(r.text).toMatch(new RegExp(`name="${a}" value="yes" required`))
    expect(r.text).not.toMatch(new RegExp(`name="${b}" value="yes" required`))
    expect(r.text).toContain(`name="${a}__note"`)
    expect(r.text).not.toContain(`name="${b}__note"`)
    expect(r.text).toMatch(new RegExp(`name="${c}" class="q-input" required`))
    expect(r.text).toContain('class="req"')
  })

  test('Server lehnt fehlende Pflichtantworten ab (Browser-Prüfung umgangen) und speichert nichts', async () => {
    const [a, , c] = spec.ids
    const r = await request(app).post(`/supplier-assessment/${token}`).type('form').send({ [a]: 'yes' })
    expect(r.status).toBe(400)
    expect(r.text).toContain('Pflichtfragen')
    const ed = await auth('editor')
    const list = await request(app).get('/assessments').set('Cookie', ed)
    expect(list.body.find(x => x.token === token).status).toBe('pending')
    void c
  })

  test('Vollständige Antwort mit Bemerkung wird gespeichert; Bemerkung bei Frage ohne Feld wird ignoriert', async () => {
    const [a, b, c] = spec.ids
    const r = await request(app).post(`/supplier-assessment/${token}`).type('form')
      .send({ [a]: 'yes', [a + '__note']: 'https://example.org/iso27001.pdf', [b]: 'no', [b + '__note']: 'sollte ignoriert werden', [c]: 'Antwort' })
    expect(r.status).toBe(200)
    const ed = await auth('editor')
    const list = await request(app).get('/assessments').set('Cookie', ed)
    const item = list.body.find(x => x.token === token)
    expect(item.status).toBe('submitted')
    expect(item.answers.find(x => x.id === a).note).toBe('https://example.org/iso27001.pdf')
    expect(item.answers.find(x => x.id === b).note).toBeUndefined()
  })

  test('Bemerkung wird in der eingereichten Ansicht maskiert ausgegeben', async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    const base = catalogs.defaultSpec('nis2')
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: { catalog: 'nis2', selection: [{ id: base.selection[0].id, required: false, comment: true }], custom: [] } })
    const id = r.body.questions[0].questions[0].id
    await request(app).post(`/supplier-assessment/${r.body.token}`).type('form').send({ [id]: 'yes', [id + '__note']: '<img src=x onerror=alert(1)>' })
    const page = await request(app).get(`/supplier-assessment/${r.body.token}`)
    expect(page.text).not.toContain('<img src=x onerror')
    expect(page.text).toContain('&lt;img src=x onerror')
  })

  test('Ältere Fragebögen ohne required-Angabe: Ja/Nein bleibt im Browser Pflicht, Server verlangt nichts', async () => {
    const ed = await auth('editor'); const sup = await supplier(ed)
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de' })
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'assessments.json'), 'utf8'))
    for (const it of raw) if (it.id === r.body.id) it.questions.forEach(s => s.questions.forEach(q => { delete q.required; delete q.comment }))
    fs.writeFileSync(path.join(dataDir, 'assessments.json'), JSON.stringify(raw))
    const page = await request(app).get(`/supplier-assessment/${r.body.token}`)
    expect(page.text).toMatch(/value="yes" required/)
    expect((await request(app).post(`/supplier-assessment/${r.body.token}`).type('form').send({ q_pol_1: 'yes' })).status).toBe(200)
  })
})
