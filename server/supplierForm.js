// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Lieferanten-Selbstauskunft als ausfüllbares PDF-Formular (pdfkit, AcroForm) mit Logo, Anschrift und Ansprechpartner der Organisation.
// Für Lieferanten, die per E-Mail/Post antworten; ein Editor trägt die Antworten anschließend im Builder ein.
// Feldnamen: <Fragen-ID>__yes / __no (Ja/Nein), <Fragen-ID> (Text), <Fragen-ID>__note (Bemerkung) — so bleibt ein späterer Import möglich.
// Das Dokument enthält bewusst NICHT das geheime Token des Links, nur die Referenz (Kennung) des Fragebogens.
const PDFDocument = require('pdfkit')
const orgLogo = require('./orgLogo')
const pdfFonts = require('./pdfFonts')
const i18n = require('./i18n')

const MARGIN = 50
const ACCENT = '#1f4e8c'

const { latin: latinFallback } = pdfFonts

function fileName(a) {
  const base = String(a.supplierName || 'Lieferant').normalize('NFKD').replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'Lieferant'
  return `Selbstauskunft-${base}-${a.id}.pdf`
}

/**
 * @param {object} a   Fragebogen (assessmentStore)
 * @param {{ org: object, issuedAt?: Date }} opts   org = Organisationseinstellungen (orgName, orgStreet, orgZip, orgCity, orgCountry, orgPhone)
 * @returns {Promise<Buffer>}
 */
function renderSupplierForm(a, opts = {}) {
  const org = opts.org || {}
  const lang = i18n.pickLang(a.language) || 'en'
  const res = pdfFonts.resolve(org.pdfFont)
  const latin = res.text                          // mit Unicode-Schrift nur Steuerzeichen entfernen, sonst Ersatz für WinAnsi
  const T = (key, params) => latin(i18n.tr(lang, key, params))
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true, compress: opts.compress !== false, info: { Title: latin(a.title || 'Self-assessment'), Author: latin(org.orgName || 'ISMS Builder') } })
    const chunks = []
    pdf.on('data', c => chunks.push(c))
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)
    try {
      const W = pdf.page.width, H = pdf.page.height, inner = W - 2 * MARGIN
      const F = pdfFonts.apply(pdf, res)
      pdf.font('Helvetica')                           // Formularfelder behalten die Standardschrift: Eingaben zeichnet das PDF-Programm
      pdf.initForm()
      pdf.font(F.regular)
      // Formularfelder behalten die Standardschrift (pdfkit trägt die gerade aktive Schrift in das Feld ein): Eingaben zeichnet das PDF-Programm,
      // eine eingebettete Teilmenge der Schrift enthielte nur die Zeichen des Formulars selbst.
      const field = (kind, ...args) => { pdf.font('Helvetica'); pdf[kind](...args); pdf.font(F.regular) }
      const bottom = H - 70
      const ensure = need => { if (pdf.y + need > bottom) { pdf.addPage(); pdf.y = MARGIN } }

      // ── Kopf: Name und Anschrift links, Logo rechts ────────────────────────
      pdf.rect(0, 0, W, 10).fill(ACCENT)
      let y = MARGIN - 10
      const logo = orgLogo.read()
      if (logo) {
        try {
          const img = pdf.openImage(logo.buffer)
          const scale = Math.min(170 / img.width, 55 / img.height, 1)
          pdf.image(img, W - MARGIN - img.width * scale, y, { width: img.width * scale, height: img.height * scale })
        } catch { /* defektes Logo: ohne Logo */ }
      }
      pdf.fillColor('#111111').font(F.bold).fontSize(12).text(latin(org.orgName || ''), MARGIN, y, { width: inner - 190 })
      pdf.font(F.regular).fontSize(9.5).fillColor('#444444')
      const addr = [org.orgStreet, [org.orgZip, org.orgCity].filter(Boolean).join(' '), org.orgCountry].filter(x => x && String(x).trim())
      for (const line of addr) pdf.text(latin(line), MARGIN, pdf.y, { width: inner - 190 })
      if (org.orgPhone) pdf.text(`${T('supf_phone')} ${latin(org.orgPhone)}`, MARGIN, pdf.y, { width: inner - 190 })
      pdf.y = Math.max(pdf.y, y + 60) + 14

      // ── Titel und Angaben ──────────────────────────────────────────────────
      pdf.font(F.bold).fontSize(18).fillColor(ACCENT).text(latin(a.title || ''), MARGIN, pdf.y, { width: inner })
      pdf.moveDown(0.5)
      const info = [[T('supf_supplier'), a.supplierName], [T('supf_contact'), [a.contactName, a.contactEmail].filter(Boolean).join(' · ')],
        [T('supf_due'), a.dueDate], [T('supf_ref'), a.id]].filter(([, v]) => v && String(v).trim())
      for (const [k, v] of info) {
        const top = pdf.y
        pdf.font(F.bold).fontSize(10).fillColor('#333333').text(k + ':', MARGIN, top, { width: 130 })
        pdf.font(F.regular).fontSize(10).fillColor('#111111').text(latin(v), MARGIN + 135, top, { width: inner - 135 })
        pdf.y = Math.max(pdf.y, top + 13)
      }
      if (a.note) pdf.moveDown(0.4).font(F.italic).fontSize(9.5).fillColor('#444444').text(latin(a.note), MARGIN, pdf.y, { width: inner })
      pdf.moveDown(0.6).font(F.regular).fontSize(9).fillColor('#555555').text(T('supf_howto'), MARGIN, pdf.y, { width: inner })
      pdf.moveDown(0.8)

      // ── Fragen ─────────────────────────────────────────────────────────────
      const fieldOpts = { borderColor: '#888888', backgroundColor: '#f7f9fc', fontSize: 9 }
      let n = 0
      a.questions.forEach((section, si) => {
        ensure(60)
        pdf.rect(MARGIN, pdf.y, inner, 18).fill('#e8eef7')
        pdf.fillColor(ACCENT).font(F.bold).fontSize(10.5).text(latin(`${si + 1}. ${section.section}`), MARGIN + 6, pdf.y + 4, { width: inner - 12, lineBreak: false })
        pdf.y += 26
        section.questions.forEach(q => {
          n++
          const req = q.required === true
          const text = latin(`${n}. ${q.text}`) + (req ? ' *' : '')
          pdf.font(F.bold).fontSize(9.5)
          const th = pdf.heightOfString(text, { width: inner })
          const needField = q.type === 'textarea' ? 56 : 20
          const need = th + 6 + (q.type === 'yesno' ? 20 + (q.comment ? 22 : 0) : needField) + 10
          ensure(need)
          pdf.fillColor('#111111').text(text, MARGIN, pdf.y, { width: inner })
          let fy = pdf.y + 4
          if (q.type === 'yesno') {
            field('formCheckbox', `${q.id}__yes`, MARGIN + 6, fy, 12, 12, { ...fieldOpts })
            pdf.font(F.regular).fontSize(9.5).fillColor('#111111').text(T('supf_yes'), MARGIN + 24, fy + 1, { lineBreak: false })
            field('formCheckbox', `${q.id}__no`, MARGIN + 80, fy, 12, 12, { ...fieldOpts })
            pdf.text(T('supf_no'), MARGIN + 98, fy + 1, { lineBreak: false })
            fy += 18
            if (q.comment) {
              pdf.font(F.regular).fontSize(8).fillColor('#666666').text(T('supf_comment'), MARGIN + 6, fy, { lineBreak: false })
              field('formText', `${q.id}__note`, MARGIN + 120, fy - 3, inner - 120, 16, { ...fieldOpts })
              fy += 18
            }
          } else {
            const h = q.type === 'textarea' ? 52 : 16
            field('formText', q.id, MARGIN + 6, fy, inner - 6, h, { ...fieldOpts, multiline: q.type === 'textarea' })
            fy += h + 2
          }
          pdf.y = fy + 8
        })
      })

      // ── Abschluss ──────────────────────────────────────────────────────────
      ensure(150)
      pdf.moveDown(0.5).font(F.regular).fontSize(9.5).fillColor('#333333').text(T('supf_confirm'), MARGIN, pdf.y, { width: inner })
      let sy = pdf.y + 10
      pdf.fontSize(8.5).fillColor('#666666').text(T('supf_filledBy'), MARGIN, sy, { lineBreak: false })
      field('formText', 'filled_by', MARGIN + 190, sy - 4, inner - 190, 16, { ...fieldOpts })
      sy += 28
      pdf.text(T('supf_place'), MARGIN, sy, { lineBreak: false })
      field('formText', 'place_date', MARGIN + 190, sy - 4, 150, 16, { ...fieldOpts })
      sy += 36
      pdf.moveTo(MARGIN + 190, sy + 14).lineTo(MARGIN + 190 + 220, sy + 14).strokeColor('#888888').lineWidth(0.6).stroke()
      pdf.text(T('supf_signature'), MARGIN, sy + 8, { lineBreak: false })

      // ── Fußzeile mit Seitenzahl ────────────────────────────────────────────
      const range = pdf.bufferedPageRange()
      for (let i = 0; i < range.count; i++) {
        pdf.switchToPage(range.start + i)
        pdf.page.margins.bottom = 0                     // sonst legt pdfkit für Text unterhalb des Randes eine neue Seite an
        pdf.font(F.regular).fontSize(8).fillColor('#888888')
        pdf.text(latin(`${org.orgName || 'ISMS Builder'} · ${T('supf_confidential')}`), MARGIN, H - 40, { width: inner / 2, lineBreak: false })
        pdf.text(T('supf_page', { n: i + 1, m: range.count }), MARGIN + inner / 2, H - 40, { width: inner / 2, align: 'right', lineBreak: false })
      }
      pdf.end()
    } catch (e) { reject(e) }
  })
}

module.exports = { renderSupplierForm, fileName, latin: latinFallback }
