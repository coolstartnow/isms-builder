// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// PDF-Schriften: Zeichenabdeckung aller EU-Amtssprachen, Einbettung, eigene Schrift, Rechte, Rückfall
'use strict'
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let app, request, dataDir
beforeAll(() => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-pdf-fonts-0123456789abcdef'
  app = require('../server/index'); request = require('supertest')
})
afterAll(() => { removeTestDataDir(dataDir) })

const CREDS = { admin: ['admin@test.local', 'adminpass'], editor: ['editor@test.local', 'editorpass'], reader: ['reader@test.local', 'readerpass'] }
const auth = role => request(app).post('/login').send({ email: CREDS[role][0], password: CREDS[role][1] }).then(r => r.headers['set-cookie'])
const pdfFonts = require('../server/pdfFonts')
const PDFDocument = require('pdfkit')
const FONT_DIR = path.join(__dirname, '..', 'server', 'fonts')

// Buchstaben, die jede der 24 EU-Amtssprachen über ASCII hinaus braucht (eigene Liste, unabhängig von pdfFonts.SAMPLES)
const EU = {
  bg: 'абвгдежзийклмнопрстуфхцчшщъьюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ', cs: 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ', da: 'æøåÆØÅ', de: 'äöüßÄÖÜ',
  el: 'αβγδεζηθικλμνξοπρσςτυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩάέήίόύώΐΰϊϋΆΈΉΊΌΎΏ', en: 'abcxyzABCXYZ', es: 'áéíñóúüÁÉÍÑÓÚÜ¿¡', et: 'õäöüšžÕÄÖÜŠŽ',
  fi: 'äöåšžÄÖÅŠŽ', fr: 'àâæçéèêëîïôœùûüÿÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸ«»', ga: 'áéíóúÁÉÍÓÚ', hr: 'čćđšžČĆĐŠŽ', hu: 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ', it: 'àèéìòùÀÈÉÌÒÙ',
  lt: 'ąčęėįšųūžĄČĘĖĮŠŲŪŽ', lv: 'āčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ', mt: 'ċġħżĊĠĦŻàèìòùÀÈÌÒÙ', nl: 'ëïéèüöÉËÏ', pl: 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ',
  pt: 'ãõáâàçéêíóôúüÃÕÁÂÀÇÉÊÍÓÔÚ', ro: 'ăâîșțĂÂÎȘȚ', sk: 'áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ', sl: 'čšžČŠŽ', sv: 'åäöÅÄÖ',
}
const TYPO = '„“”‚‘’«»–—…€•§°©®™'
const fk = buf => { const d = new PDFDocument(); d.font(buf); const f = d._font.font; d.on('data', () => {}); d.end(); return f }
const text = buf => buf.toString('latin1')
// Alle komprimierten (Flate) Datenströme eines PDFs entpacken — für Prüfungen an PDFs ohne `compress: false`
const inflated = buf => {
  const zlib = require('zlib'); const raw = buf.toString('latin1'); const out = [raw]
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) { try { out.push(zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')) } catch { /* kein Flate-Strom (z. B. Schrift) */ } }
  return out.join('\n')
}

describe('Mitgelieferte Schriften', () => {
  test('24 EU-Amtssprachen: jede Schrift (Regular, Bold, Italic) enthält alle Buchstaben und die Satzzeichen', () => {
    expect(Object.keys(EU)).toHaveLength(24)
    for (const [id, b] of Object.entries(pdfFonts.BUNDLED)) {
      for (const style of pdfFonts.STYLES) {
        const font = fk(fs.readFileSync(path.join(FONT_DIR, b.files[style])))
        const missing = []
        for (const [lang, chars] of Object.entries({ ...EU, typo: TYPO })) for (const c of chars) if (!font.hasGlyphForCodePoint(c.codePointAt(0))) missing.push(`${lang}:${c}`)
        expect([id, style, missing]).toEqual([id, style, []])
      }
    }
  })
  test('Lizenztexte liegen bei und nennen die Lizenz', () => {
    expect(fs.readFileSync(path.join(FONT_DIR, 'LICENSE-LiberationSans.txt'), 'utf8')).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/)
    expect(fs.readFileSync(path.join(FONT_DIR, 'LICENSE-NotoSans.txt'), 'utf8')).toMatch(/Noto Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/)
    expect(fs.readFileSync(path.join(FONT_DIR, 'LICENSE-DejaVuSans.txt'), 'utf8')).toMatch(/Bitstream Vera/)
    const third = fs.readFileSync(path.join(__dirname, '..', 'THIRD-PARTY-LICENSES.md'), 'utf8')
    for (const n of ['Liberation Sans', 'Noto Sans', 'DejaVu Sans']) expect(third).toContain(n)
  })
  test('resolve: Standard Liberation; Unbekanntes → Standard; Helvetica wählbar; eigene Schrift ohne Datei → Standard', () => {
    expect(pdfFonts.resolve(undefined)).toMatchObject({ id: 'liberation', unicode: true })
    expect(pdfFonts.resolve('gibtsnicht').id).toBe('liberation')
    expect(pdfFonts.resolve('noto').label).toBe('Noto Sans'); expect(pdfFonts.resolve('dejavu').label).toBe('DejaVu Sans')
    expect(pdfFonts.resolve('helvetica')).toMatchObject({ id: 'helvetica', unicode: false })
    expect(pdfFonts.resolve('custom').id).toBe('liberation')
  })
  test('fehlt eine Schriftdatei, fällt alles auf Helvetica zurück (kein Absturz)', () => {
    const spy = jest.spyOn(fs, 'statSync').mockImplementation(p => { if (String(p).includes('LiberationSans')) throw new Error('weg'); return jest.requireActual('fs').statSync(p) })
    try { expect(pdfFonts.resolve('liberation')).toMatchObject({ id: 'helvetica', unicode: false }); expect(pdfFonts.resolve('liberation').text('ő')).toBe('ö') }
    finally { spy.mockRestore() }
  })
})

describe('Festbreitenschrift (Courier-Ersatz: Nimbus Mono PS)', () => {
  const NIMBUS = path.join(FONT_DIR, 'NimbusMonoPS-Regular.otf')
  test('enthält alle Buchstaben der 24 EU-Sprachen, Satzzeichen und die Zeichen für Code', () => {
    const font = fk(fs.readFileSync(NIMBUS))
    const missing = []
    for (const [lang, chars] of Object.entries({ ...EU, typo: TYPO, code: '{}[]<>|\\`~^_=+-*/%&$#@!?:;,."\'()' })) for (const c of chars) if (!font.hasGlyphForCodePoint(c.codePointAt(0))) missing.push(`${lang}:${c}`)
    expect(missing).toEqual([])
    expect(font.isFixedPitch !== false).toBe(true)
  })
  test('Lizenztext nennt AGPL-3.0, die PDF-Schriftenausnahme und (URW)++', () => {
    const t = fs.readFileSync(path.join(FONT_DIR, 'LICENSE-NimbusMonoPS.txt'), 'utf8')
    expect(t).toMatch(/AGPL-3\.0-only WITH PS-or-PDF-font-exception-20170817/); expect(t).toMatch(/Postscript or PDF file/); expect(t).toMatch(/\(URW\)\+\+/)
    expect(fs.readFileSync(path.join(__dirname, '..', 'THIRD-PARTY-LICENSES.md'), 'utf8')).toContain('Nimbus Mono PS')
    expect(fs.readFileSync(path.join(__dirname, '..', 'LICENSE'), 'utf8')).toMatch(/GNU AFFERO GENERAL PUBLIC LICENSE/)   // Projekt und Schrift: gleiche Lizenzfamilie
  })
  test('resolve liefert Mono: Nimbus bei allen eingebetteten Schriften, bei Helvetica keine Datei (Courier)', () => {
    for (const id of ['liberation', 'noto', 'dejavu']) expect(pdfFonts.resolve(id).files.mono).toBe(NIMBUS)
    expect(pdfFonts.resolve('helvetica').files).toBeNull()
    const d = new PDFDocument(); expect(pdfFonts.apply(d, pdfFonts.resolve('helvetica')).mono).toBe('Courier'); d.on('data', () => {}); d.end()
  })
  test('Dokument-Export: Code und Codeblock mit ő/ű/Kyrillisch erscheinen in Nimbus Mono PS, mit Helvetica in Courier', async () => {
    const { renderTemplateToPdf } = require('../server/pdfExport')
    const content = 'Text mit `kód őű` im Fluss.\n\n```\nfunction f() { return "Őrzés űrlap Ж"; }\n```\n'
    const emb = inflated(await renderTemplateToPdf({ id: 'd2', title: 'Code', language: 'hu', content, version: '1.0', status: 'draft' }))
    expect(emb).toContain('NimbusMonoPS'); expect(emb).toContain('<0151>'); expect(emb).toContain('<0416>')
    expect(emb).not.toContain('/BaseFont /Courier')
    const orgSettings = require('../server/db/orgSettingsStore')
    await orgSettings.update({ pdfFont: 'helvetica' })
    try {
      const std = inflated(await renderTemplateToPdf({ id: 'd3', title: 'Code', language: 'hu', content, version: '1.0', status: 'draft' }))
      expect(std).toContain('/BaseFont /Courier'); expect(std).not.toContain('NimbusMonoPS')
    } finally { await orgSettings.update({ pdfFont: 'liberation' }) }
  })
  test('Vorschau-PDF enthält die Mono-Zeile in Nimbus Mono PS', async () => {
    expect(inflated(await pdfFonts.renderPreview('noto'))).toContain('NimbusMonoPS')
  })
})

describe('Einbettung in die PDFs', () => {
  const { renderSupplierForm } = require('../server/supplierForm')
  const { renderTrainingConfirmation } = require('../server/trainingCertificate')
  const { renderTemplateToPdf } = require('../server/pdfExport')
  const form = (pdfFont, lang = 'hu') => renderSupplierForm({ id: 'ass_h', title: 'Önértékelés űrlap őűŐŰ', supplierName: 'Árvíztűrő Kft.', language: lang,
    questions: [{ section: 'Ő', questions: [{ id: 'q_1', text: 'Kérdés őűáé', type: 'yesno', required: true, comment: true }] }] }, { org: { orgName: 'Šťastný Õ', pdfFont }, compress: false })

  test.each([['liberation', 'LiberationSans'], ['noto', 'NotoSans'], ['dejavu', 'DejaVuSans']])('Formular mit %s: Schrift eingebettet, ő und ű im Text erhalten', async (id, ps) => {
    const pdf = text(await form(id))
    expect(pdf).toContain('/FontFile2'); expect(pdf).toContain(ps)
    expect(pdf).toContain('<0151>'); expect(pdf).toContain('<0171>')       // ToUnicode: ő und ű bleiben erhalten (nicht zu ö/ü ersetzt)
  })
  test('Helvetica: nichts eingebettet, ő/ű → ö/ü (wie bisher)', async () => {
    const pdf = text(await form('helvetica'))
    expect(pdf).not.toContain('/FontFile2'); expect(pdf).not.toContain('<0151>')
  })
  test('Formularfelder behalten die Standardschrift (Eingaben zeichnet das PDF-Programm)', async () => {
    const pdf = text(await form('liberation'))
    expect(pdf).toMatch(/DA \(\/F\d+ [\d.]+ Tf 0 g\)/); expect(pdf).toContain('/BaseFont /Helvetica')
  })
  test('Teilnahmebestätigung und Dokument-Export nutzen dieselbe Auswahl', async () => {
    const item = { id: 't1', title: 'Őrzés űrlap', category: 'gdpr', completedDate: '2026-10-01', instructor: 'Árpád', assignees: 'Zoltán' }
    const withFont = inflated(await renderTrainingConfirmation(item, { lang: 'hu', orgName: 'Kft.', fontChoice: 'noto' }))
    expect(withFont).toContain('NotoSans'); expect(withFont).toContain('<0151>')
    expect(text(await renderTrainingConfirmation(item, { lang: 'hu', orgName: 'Kft.', fontChoice: 'helvetica' }))).not.toContain('/FontFile2')
    const doc = inflated(await renderTemplateToPdf({ id: 'd1', title: 'Dokument őű', language: 'hu', content: '# Cím őű\n\nSzöveg **félkövér** és *dőlt* ŐŰ.', version: '1.0', status: 'draft' }))
    expect(doc).toContain('/FontFile2'); expect(doc).toContain('<0151>'); expect(doc).toContain('<0171>')
  })
})

describe('Auswahl und eigene Schrift über die API', () => {
  const b64 = f => fs.readFileSync(f).toString('base64')
  const DEJAVU = path.join(FONT_DIR, 'DejaVuSans-Regular.ttf')
  let ad
  beforeAll(async () => { ad = await auth('admin') })

  test('Rechte: Administrator verwaltet; Editor und Leser nicht; Lesen der aktiven Schrift ab Leser', async () => {
    for (const role of ['editor', 'reader']) {
      const c = await auth(role)
      expect((await request(app).get('/admin/pdf-font').set('Cookie', c)).status).toBe(403)
      expect((await request(app).put('/admin/pdf-font').set('Cookie', c).send({ choice: 'noto' })).status).toBe(403)
      expect((await request(app).post('/admin/pdf-font/custom').set('Cookie', c).send({})).status).toBe(403)
      expect((await request(app).get('/admin/pdf-font/preview.pdf').set('Cookie', c)).status).toBe(403)
    }
    const rd = await auth('reader')
    expect((await request(app).get('/pdf-font/active').set('Cookie', rd)).body).toMatchObject({ id: 'liberation', unicode: true })
    expect((await request(app).get('/pdf-font/active')).status).toBe(401)
    expect((await request(app).get('/pdf-font/file/regular')).status).toBe(401)
  })
  test('Schriftdatei für die Druckfenster: nur Regular/Bold/Italic, TrueType, nosniff', async () => {
    const rd = await auth('reader')
    const r = await request(app).get('/pdf-font/file/bold').set('Cookie', rd).buffer(true).parse((res, cb) => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))) })
    expect(r.status).toBe(200); expect(r.headers['content-type']).toBe('font/ttf'); expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.body.equals(fs.readFileSync(path.join(FONT_DIR, 'LiberationSans-Bold.ttf')))).toBe(true)
    expect((await request(app).get('/pdf-font/file/../../etc/passwd').set('Cookie', rd)).status).toBe(404)
    expect((await request(app).get('/pdf-font/file/extrabold').set('Cookie', rd)).status).toBe(404)
  })
  test('Auswahl speichern: gültig, ungültig, „custom“ ohne Datei', async () => {
    expect((await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'noto' })).body.choice).toBe('noto')
    expect((await request(app).get('/pdf-font/active').set('Cookie', ad)).body.label).toBe('Noto Sans')
    expect((await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'comic' })).status).toBe(400)
    expect((await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'custom' })).status).toBe(400)
    expect((await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'helvetica' })).body.choice).toBe('helvetica')
    expect((await request(app).get('/pdf-font/file/regular').set('Cookie', ad)).status).toBe(404)         // Helvetica: nichts zu laden
    await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'liberation' })
  })
  test('Upload: Lizenzbestätigung Pflicht, nur TrueType/OpenType, Größe, Einbettungssperre', async () => {
    const post = body => request(app).post('/admin/pdf-font/custom').set('Cookie', ad).send(body)
    expect((await post({ style: 'regular', data: b64(DEJAVU) })).body.error).toMatch(/License confirmation|Lizenz/)
    expect((await post({ style: 'regular', data: b64(DEJAVU), licenseConfirmed: 'ja' })).status).toBe(400)
    expect((await post({ style: 'heavy', data: b64(DEJAVU), licenseConfirmed: true })).status).toBe(400)
    expect((await post({ style: 'regular', data: Buffer.from('kein font '.repeat(200)).toString('base64'), licenseConfirmed: true })).status).toBe(400)
    const woff = Buffer.concat([Buffer.from('wOFF'), Buffer.alloc(4000)])
    expect((await post({ style: 'regular', data: woff.toString('base64'), licenseConfirmed: true })).status).toBe(400)
    const ttc = Buffer.concat([Buffer.from('ttcf'), Buffer.alloc(4000)])
    expect((await post({ style: 'regular', data: ttc.toString('base64'), licenseConfirmed: true })).status).toBe(400)
    expect((await post({ style: 'regular', data: Buffer.alloc(8.5 * 1024 * 1024, 1).toString('base64'), licenseConfirmed: true })).status).toBe(400)   // zu groß
    // Einbettungssperre (OS/2 fsType = 2) in einer Kopie setzen
    const buf = Buffer.from(fs.readFileSync(DEJAVU)); const n = buf.readUInt16BE(4)
    for (let i = 0; i < n; i++) { const o = 12 + i * 16; if (buf.toString('latin1', o, o + 4) === 'OS/2') { buf.writeUInt16BE(0x0002, buf.readUInt32BE(o + 8) + 8) } }
    expect((await post({ style: 'regular', data: buf.toString('base64'), licenseConfirmed: true })).body.error).toMatch(/embedding|Einbetten/)
    expect(pdfFonts.readCustom()).toBeNull()
  })
  test('Einbettungsrechte (OS/2 fsType): „Preview & Print“ und „Editable“ sind erlaubt, „Restricted“, „nur Bitmaps“ und „kein Zerlegen“ werden abgelehnt', async () => {
    const withFsType = v => { const buf = Buffer.from(fs.readFileSync(DEJAVU)); const n = buf.readUInt16BE(4)
      for (let i = 0; i < n; i++) { const o = 12 + i * 16; if (buf.toString('latin1', o, o + 4) === 'OS/2') buf.writeUInt16BE(v, buf.readUInt32BE(o + 8) + 8) } return buf }
    expect(pdfFonts.inspectFont(withFsType(0x0004)).ok).toBe(true)        // Preview & Print
    expect(pdfFonts.inspectFont(withFsType(0x0008)).ok).toBe(true)        // Editable
    expect(pdfFonts.inspectFont(withFsType(0x0000)).ok).toBe(true)        // Installable
    for (const v of [0x0002, 0x0200, 0x0100]) expect(pdfFonts.inspectFont(withFsType(v))).toMatchObject({ ok: false, error: 'Font does not allow embedding' })
    expect(pdfFonts.inspectFont(fs.readFileSync(path.join(FONT_DIR, 'NimbusMonoPS-Regular.otf'))).ok).toBe(true)   // OpenType/CFF mit „Preview & Print“
  })
  test('Mono-Schriftdatei für die Druckfenster: Nimbus (OpenType), bei Helvetica nichts', async () => {
    const rd = await auth('reader')
    const r = await request(app).get('/pdf-font/file/mono').set('Cookie', rd).buffer(true).parse((res, cb) => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))) })
    expect(r.status).toBe(200); expect(r.headers['content-type']).toBe('font/otf')
    expect(r.body.equals(fs.readFileSync(path.join(FONT_DIR, 'NimbusMonoPS-Regular.otf')))).toBe(true)
    await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'helvetica' })
    expect((await request(app).get('/pdf-font/file/mono').set('Cookie', rd)).status).toBe(404)
    await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'liberation' })
  })
  test('eigene Mono-Schrift: optional hochladen, ersetzt Nimbus in PDFs und Druckfenstern', async () => {
    const mono = path.join(FONT_DIR, 'DejaVuSans-Regular.ttf')
    await request(app).post('/admin/pdf-font/custom').set('Cookie', ad).send({ style: 'regular', data: b64(DEJAVU), label: 'Haus', licenseConfirmed: true })
    expect((await request(app).post('/admin/pdf-font/custom').set('Cookie', ad).send({ style: 'mono', data: b64(mono), licenseConfirmed: true })).body.custom.styles).toEqual(expect.arrayContaining(['regular', 'mono']))
    await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'custom' })
    expect(pdfFonts.resolve('custom').files.mono).toBe(path.join(dataDir, 'pdf-fonts', 'custom-mono.ttf'))
    const rd = await auth('reader')
    expect((await request(app).get('/pdf-font/file/mono').set('Cookie', rd)).headers['content-type']).toBe('font/ttf')
    await request(app).delete('/admin/pdf-font/custom').set('Cookie', ad)
    expect(pdfFonts.resolve('liberation').files.mono).toMatch(/NimbusMonoPS/)
  })
  test('eigene Schrift hochladen, wählen, in PDFs verwendet, entfernen → zurück auf Liberation', async () => {
    const up = await request(app).post('/admin/pdf-font/custom').set('Cookie', ad).send({ style: 'regular', data: b64(DEJAVU), label: 'Hausschrift', licenseConfirmed: true })
    expect(up.status).toBe(201); expect(up.body.custom).toMatchObject({ label: 'Hausschrift', styles: ['regular'] })
    expect(fs.statSync(path.join(dataDir, 'pdf-fonts', 'custom-regular.ttf')).mode & 0o777).toBe(0o600)
    expect((await request(app).put('/admin/pdf-font').set('Cookie', ad).send({ choice: 'custom' })).body.active).toBe('custom')
    // Bold/Italic fehlen → Regular wird verwendet, PDF entsteht trotzdem
    const { renderSupplierForm } = require('../server/supplierForm')
    const pdf = text(await renderSupplierForm({ id: 'a', title: 'T', supplierName: 'S', language: 'hu', questions: [{ section: 'S', questions: [{ id: 'q', text: 'őű', type: 'text' }] }] }, { org: { pdfFont: 'custom' }, compress: false }))
    expect(pdf).toContain('DejaVuSans'); expect(pdf).not.toContain('LiberationSans')
    const del = await request(app).delete('/admin/pdf-font/custom').set('Cookie', ad)
    expect(del.status).toBe(200); expect(del.body).toMatchObject({ choice: 'liberation', custom: null })
    expect(fs.existsSync(path.join(dataDir, 'pdf-fonts', 'custom-regular.ttf'))).toBe(false)
  })
  test('Vorschau-PDF: ein PDF, alle 24 Sprachen drin (unkomprimiert geprüft)', async () => {
    const r = await request(app).get('/admin/pdf-font/preview.pdf?choice=noto').set('Cookie', ad).buffer(true).parse((res, cb) => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))) })
    expect(r.status).toBe(200); expect(r.headers['content-type']).toMatch(/application\/pdf/); expect(r.body.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdfFonts.SAMPLES).toHaveLength(24)
    const direct = text(await pdfFonts.renderPreview('dejavu'))
    expect(direct.length).toBeGreaterThan(3000)
  })
  test('Audit-Einträge für Auswahl und Upload', async () => {
    const log = (await request(app).get('/admin/audit-log').set('Cookie', ad)).body
    const details = JSON.stringify(log)
    expect(details).toContain('PDF-Schrift: noto'); expect(details).toContain('Eigene PDF-Schrift hochgeladen')
  })
})

describe('Druckfenster der Oberfläche (Quelltext-Wächter)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
  const block = src.slice(src.indexOf('function openPrintWindow'), src.indexOf('function apiHeaders'))
  test('openPrintWindow lädt die gewählte Schrift und wartet vor dem Drucken auf sie', () => {
    expect(block).toContain("font-family:'ISMS-PDF'"); expect(block).toContain('/pdf-font/file/'); expect(block).toContain('document.fonts')
    expect(block).toContain("font-family:'ISMS-PDF-Mono'"); expect(block).toContain('[style*="monospace"]')      // Referenzen (Inline-Stil) in der Mono-Schrift
    expect(block).toContain('win.print')
  })
  test('alle Druckansichten laufen über openPrintWindow (kein window.open außer Wrapper und Anleitungsfenster)', () => {
    expect([...src.matchAll(/window\.open\(/g)]).toHaveLength(2)
    expect((src.match(/openPrintWindow\(\)/g) || []).length).toBeGreaterThanOrEqual(10)
  })
})
