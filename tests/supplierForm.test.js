// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Lieferanten-Selbstauskunft als PDF-Formular, Ansprechpartner, Anschrift und manuelle Erfassung der Antworten
'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let app, request, dataDir
beforeAll(() => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-supplier-form-0123456789'
  app = require('../server/index'); request = require('supertest')
})
afterAll(() => { removeTestDataDir(dataDir) })

const CREDS = { admin: ['admin@test.local', 'adminpass'], editor: ['editor@test.local', 'editorpass'], reader: ['reader@test.local', 'readerpass'] }
const auth = role => request(app).post('/login').send({ email: CREDS[role][0], password: CREDS[role][1] }).then(r => r.headers['set-cookie'])
const catalogs = require('../server/db/assessmentCatalogs')
const { renderSupplierForm, fileName, latin } = require('../server/supplierForm')

// pdfkit schreibt Text als Hexwerte (<48656c6c6f> Tj): alle Textstücke dekodieren und zusammenfügen, dazu Feldnamen im Klartext
function pdfText(buf) {
  const raw = buf.toString('latin1')
  const hex = [...raw.matchAll(/<([0-9a-f]{2,})>/gi)].map(m => Buffer.from(m[1], 'hex').toString('latin1')).join('')
  return raw + '\n' + hex
}

const ORG = { pdfFont: 'helvetica', orgName: 'Muster Energie GmbH', orgStreet: 'Hauptstraße 1', orgZip: '12345', orgCity: 'Musterstadt', orgCountry: 'Deutschland', orgPhone: '+49 123 456' }

async function make(cookie, extra = {}) {
  const sup = (await request(app).post('/suppliers').set('Cookie', cookie).send({ name: 'Formular-Lieferant', type: 'software', criticality: 'high', status: 'active', country: 'DE' })).body
  const base = catalogs.defaultSpec('nis2')
  const spec = { catalog: 'nis2', selection: [{ id: base.selection[0].id, required: true, comment: true }, { id: base.selection[1].id, required: false, comment: false }], custom: [{ text: 'Freitext?', type: 'text', required: true }] }
  const r = await request(app).post('/assessments').set('Cookie', cookie).send({ supplierId: sup.id, language: 'de', spec, contactName: 'Erika Muster', contactEmail: 'ciso@example.org', dueDate: '2026-12-31', ...extra })
  return r.body
}

describe('Organisationsdaten: Anschrift', () => {
  test('Anschrift wird in den Organisationseinstellungen gespeichert und gelesen', async () => {
    const ad = await auth('admin')
    const put = await request(app).put('/admin/org-settings').set('Cookie', ad).send(ORG)
    expect(put.status).toBe(200)
    const get = await request(app).get('/admin/org-settings').set('Cookie', ad)
    expect(get.body).toMatchObject({ orgStreet: 'Hauptstraße 1', orgZip: '12345', orgCity: 'Musterstadt', orgCountry: 'Deutschland', orgPhone: '+49 123 456' })
  })
})

describe('PDF-Formular', () => {
  let ed, a
  beforeAll(async () => { ed = await auth('editor'); a = await make(ed) })

  test('Ansprechpartner wird am Fragebogen gespeichert', () => {
    expect(a).toMatchObject({ contactName: 'Erika Muster', contactEmail: 'ciso@example.org' })
  })
  test('Editor lädt das PDF; Antwort ist ein PDF mit AcroForm, Dateiname ohne Sonderzeichen', async () => {
    const r = await request(app).get(`/assessments/${a.id}/form.pdf`).set('Cookie', ed).buffer(true).parse((res, cb) => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))) })
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toMatch(/application\/pdf/)
    expect(r.headers['content-disposition']).toMatch(/^attachment; filename="Selbstauskunft-Formular-Lieferant-ass_[0-9a-f]{8}\.pdf"$/)
    expect(r.body.subarray(0, 5).toString()).toBe('%PDF-')
    expect(r.body.toString('latin1')).toContain('/AcroForm')
  })
  test('Reader darf das PDF nicht laden, unbekannte Kennung → 404', async () => {
    expect((await request(app).get(`/assessments/${a.id}/form.pdf`).set('Cookie', await auth('reader'))).status).toBe(403)
    expect((await request(app).get('/assessments/ass_gibtsnicht/form.pdf').set('Cookie', ed)).status).toBe(404)
    expect((await request(app).get(`/assessments/${a.id}/form.pdf`)).status).toBe(401)
  })
  test('Inhalt (unkomprimiert geprüft): Firma, Anschrift, Ansprechpartner, Lieferant, Frist, Referenz, Felder; kein Token', async () => {
    const pdf = pdfText(await renderSupplierForm(a, { org: ORG, compress: false }))
    for (const s of ['Muster Energie GmbH', 'Hauptstra\xdfe 1', '12345 Musterstadt', 'Deutschland', '+49 123 456', 'Erika Muster', 'ciso@example.org', 'Formular-Lieferant', '2026-12-31', a.id, 'Seite 1 von', 'vertraulich']) {
      expect(pdf).toContain(s)
    }
    const qs = a.questions.flatMap(s => s.questions)
    expect(pdf).toContain(`${qs[0].id}__yes`); expect(pdf).toContain(`${qs[0].id}__no`); expect(pdf).toContain(`${qs[0].id}__note`)
    expect(pdf).toContain(qs.at(-1).id)                       // Textfeld der eigenen Frage
    expect(pdf).not.toContain(a.token)                        // das geheime Token gehört nicht ins Formular
    expect(pdf).toMatch(/Hat die Gesch\S*ftsleitung/)         // Fragetext in der Sprache des Fragebogens
  })
  test('Pflichtfragen sind mit * gekennzeichnet, andere nicht', async () => {
    const pdf = pdfText(await renderSupplierForm(a, { org: ORG, compress: false }))
    const qs = a.questions.flatMap(s => s.questions)
    expect(qs[0].required).toBe(true); expect(qs[1].required).toBe(false)
    expect(pdf).toMatch(/1\. Hat die Gesch.ftsleitung[^\n]*genehmigt\? \*/)          // Pflichtfrage mit *
    expect(pdf).toMatch(/2\. .berwacht die Gesch.ftsleitung[^*]*?durch regelm..ige Berichte\)\?(?! \*)/)   // keine Pflicht: ohne *
  })
  test('alle sechs Sprachen erzeugen ein PDF; ungarische Sonderzeichen brechen nichts', async () => {
    for (const l of ['de', 'en', 'fr', 'nl', 'hu', 'et']) {
      const q = catalogs.compose(catalogs.defaultSpec('standard'), l)
      const buf = await renderSupplierForm({ id: 'ass_x', title: 'Önértékelés űrlap őűŐŰ', supplierName: 'Árvíztűrő Kft.', language: l, questions: q }, { org: { orgName: 'Šťastný & Söhne' } })
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    }
    expect(latin('őŰ')).toBe('öÜ')
  })
  test('sehr viele Fragen und lange Texte erzeugen kein kaputtes Dokument (Seitenumbruch)', async () => {
    const q = [{ section: 'S', questions: Array.from({ length: 200 }, (_, i) => ({ id: 'q_' + i, text: 'Langer Text '.repeat(40), type: i % 3 === 0 ? 'textarea' : 'yesno', required: i % 2 === 0, comment: true })) }]
    const buf = await renderSupplierForm({ id: 'ass_y', title: 'T', supplierName: 'X', language: 'de', questions: q }, { org: ORG })
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-'); expect(buf.length).toBeGreaterThan(5000)
  })
  test('fileName ist sicher', () => {
    expect(fileName({ id: 'ass_1', supplierName: '../../etc/pass wd<>"' })).toMatch(/^Selbstauskunft-[\w.-]+-ass_1\.pdf$/)
    expect(fileName({ id: 'ass_1', supplierName: '' })).toBe('Selbstauskunft-Lieferant-ass_1.pdf')
  })
})

describe('Antworten aus dem Formular eintragen', () => {
  let ed
  beforeAll(async () => { ed = await auth('editor') })
  test('vollständig: Status submitted, Kanal „form“, Bemerkung nur wo erlaubt, unbekannte Fragen verworfen', async () => {
    const a = await make(ed); const [q1, q2, q3] = a.questions.flatMap(s => s.questions).map(q => q.id)
    const r = await request(app).post(`/assessments/${a.id}/answers`).set('Cookie', ed).send({ answers: [
      { id: q1, value: 'yes', note: 'https://example.org/iso.pdf' }, { id: q2, value: 'no', note: 'ignoriert' }, { id: q3, value: 'Antwort' }, { id: 'q_fremd', value: 'x' }] })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ status: 'submitted', answeredVia: 'form', enteredBy: expect.any(String) })
    const an = Object.fromEntries(r.body.answers.map(x => [x.id, x]))
    expect(an[q1].note).toBe('https://example.org/iso.pdf'); expect(an[q2].note).toBeUndefined(); expect(an.q_fremd).toBeUndefined()
    expect((await request(app).post(`/assessments/${a.id}/answers`).set('Cookie', ed).send({ answers: [] })).status).toBe(409)   // nur einmal
  })
  test('Pflichtantwort fehlt → 400 mit Liste; mit allowIncomplete wird übernommen und markiert', async () => {
    const a = await make(ed); const [q1, q2, q3] = a.questions.flatMap(s => s.questions).map(q => q.id)
    const r = await request(app).post(`/assessments/${a.id}/answers`).set('Cookie', ed).send({ answers: [{ id: q2, value: 'no' }] })
    expect(r.status).toBe(400); expect(r.body.missing).toEqual([q1, q3])
    expect((await request(app).get(`/assessments/${a.id}`).set('Cookie', ed)).body.status).toBe('pending')
    const ok = await request(app).post(`/assessments/${a.id}/answers`).set('Cookie', ed).send({ answers: [{ id: q2, value: 'no' }], allowIncomplete: true })
    expect(ok.status).toBe(200); expect(ok.body.missingRequired).toEqual([q1, q3])
  })
  test('Rechte und Eingabeprüfung', async () => {
    const a = await make(ed)
    expect((await request(app).post(`/assessments/${a.id}/answers`).set('Cookie', await auth('reader')).send({ answers: [] })).status).toBe(403)
    expect((await request(app).post(`/assessments/${a.id}/answers`).set('Cookie', ed).send({ answers: 'x' })).status).toBe(400)
    expect((await request(app).post('/assessments/ass_gibtsnicht/answers').set('Cookie', ed).send({ answers: [] })).status).toBe(404)
  })
  test('Antwort mit HTML wird gespeichert, aber bei der Ausgabe in der Oberfläche maskiert (Quelltext-Wächter)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'ui', 'app.js'), 'utf8')
    const block = src.slice(src.indexOf('async function openAssessmentManual'), src.indexOf('async function openCreateAssessment'))
    expect(block).toContain('escHtml(q.text)'); expect(block).toContain('escHtml(sec.section)')
    expect(block).not.toMatch(/\$\{q\.text\}/)
  })
})
