// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Teilnahmebestätigung zu einer abgeschlossenen Schulung (PDF, pdfkit).
// Interner Beleg des Unternehmens — keine Zertifizierung durch Dritte. Der Inhalt kommt aus der Schulung,
// das Aussehen (Akzentfarbe) richtet sich nach der Kategorie.
const crypto = require('crypto')
const PDFDocument = require('pdfkit')
const orgLogo = require('./orgLogo')
const pdfFonts = require('./pdfFonts')
const i18n = require('./i18n')

const MARGIN = 56
const ACCENT = {
  security_awareness: '#1f6feb', iso27001: '#0b7a75', gdpr: '#7a3db8',
  technical: '#b45309', management: '#9d2b4a', other: '#475569',
}
const CAT_KEY = {
  security_awareness: 'trnl_catAwareness', iso27001: 'trnl_catIso', gdpr: 'trnl_catGdpr',
  technical: 'trnl_catTechnical', management: 'trnl_catManagement', other: 'trnl_catOther',
}

// Prüfcode: aus den Angaben berechnet, ändert sich mit jeder Änderung daran (nachrechenbar)
function verificationCode(item) {
  const raw = [item.id, item.title, item.completedDate, item.instructor, item.assignees].map(v => String(v || '')).join('|')
  const hex = crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 12).toUpperCase()
  return hex.match(/.{4}/g).join('-')
}

// Standard-PDF-Schrift (Helvetica) kennt nur WinAnsi: ő/ű → ö/ü, übrige unbekannte Zeichen → ?
function latin(text) {
  return String(text == null ? '' : text)
    .replace(/ő/g, 'ö').replace(/Ő/g, 'Ö').replace(/ű/g, 'ü').replace(/Ű/g, 'Ü')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[^\u0000-ÿ–—‘’‚“”„•…€]/g, '?')
}

function fileName(item) {
  const base = String(item.title || 'Schulung').normalize('NFKD').replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Schulung'
  return `Teilnahmebestaetigung-${base}-${String(item.completedDate || '').slice(0, 10) || 'ohne-datum'}.pdf`
}

/**
 * @param {object} item  Schulung (Status muss „completed“ sein, das prüft der Aufrufer)
 * @param {{ lang?: string, orgName?: string, issuedBy?: string, issuedAt?: Date }} opts
 * @returns {Promise<Buffer>}
 */
function renderTrainingConfirmation(item, opts = {}) {
  const lang = i18n.pickLang(opts.lang) || 'en'
  const res = pdfFonts.resolve(opts.fontChoice)
  const latin = res.text                            // mit Unicode-Schrift nur Steuerzeichen entfernen, sonst Ersatz für WinAnsi
  const T = (key, params) => latin(i18n.tr(lang, key, params))
  const accent = ACCENT[item.category] || ACCENT.other
  const issuedAt = opts.issuedAt || new Date()
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: latin(T('trn_cert_title') + ' – ' + item.title), Author: latin(opts.orgName || 'ISMS Builder') } })
    const chunks = []
    pdf.on('data', c => chunks.push(c))
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)
    try {
      const F = pdfFonts.apply(pdf, res)
      const W = pdf.page.width, inner = W - 2 * MARGIN
      pdf.rect(0, 0, W, 14).fill(accent)
      let y = MARGIN
      const logo = orgLogo.read()
      if (logo) {
        try {
          const img = pdf.openImage(logo.buffer)
          const scale = Math.min(180 / img.width, 48 / img.height, 1)
          pdf.image(img, W - MARGIN - img.width * scale, y, { width: img.width * scale, height: img.height * scale })
        } catch { /* defektes Logo: ohne Logo */ }
      }
      pdf.font(F.bold).fontSize(11).fillColor('#444444').text(latin(opts.orgName || ''), MARGIN, y + 4, { width: inner - 200 })
      pdf.moveDown(4)
      pdf.font(F.bold).fontSize(26).fillColor(accent).text(T('trn_cert_title'), MARGIN, 150, { width: inner })
      pdf.font(F.regular).fontSize(11).fillColor('#444444').moveDown(0.6).text(T('trn_cert_intro'), { width: inner })
      pdf.moveDown(1.2)
      pdf.font(F.bold).fontSize(18).fillColor('#111111').text(latin(item.title), { width: inner })
      if (item.description) {
        const d = String(item.description).replace(/\s+/g, ' ').trim()
        pdf.moveDown(0.4).font(F.regular).fontSize(10).fillColor('#555555').text(latin(d.length > 400 ? d.slice(0, 397) + '...' : d), { width: inner })
      }
      pdf.moveDown(1.2)
      const catLabel = i18n.tr(lang, CAT_KEY[item.category] || CAT_KEY.other)
      const rows = [
        [T('trn_cert_category'), latin(catLabel)],
        [T('trn_cert_completed'), latin(i18n.fmtDate(item.completedDate, lang))],
        [T('trn_cert_instructor'), latin(item.instructor || '–')],
        [T('trn_cert_participants'), latin(item.assignees || '–')],
        [T('trn_cert_mandatory'), T(item.mandatory ? 'trn_cert_yes' : 'trn_cert_no')],
      ]
      const links = [...(item.linkedControls || []), ...(item.linkedPolicies || [])]
      if (links.length) rows.push([T('trn_cert_links'), latin(links.join(', '))])
      for (const [k, v] of rows) {
        const top = pdf.y
        pdf.font(F.bold).fontSize(10).fillColor('#333333').text(k, MARGIN, top, { width: 150 })
        const afterKey = pdf.y
        pdf.font(F.regular).fontSize(10).fillColor('#111111').text(v, MARGIN + 160, top, { width: inner - 160 })
        pdf.y = Math.max(afterKey, pdf.y) + 6
        pdf.strokeColor('#e2e2e2').moveTo(MARGIN, pdf.y - 3).lineTo(W - MARGIN, pdf.y - 3).stroke()
      }
      pdf.moveDown(1.2)
      pdf.font(F.regular).fontSize(9).fillColor('#555555')
        .text(`${T('trn_cert_id')}: ${latin(item.id)}`, MARGIN, pdf.y, { width: inner })
        .text(`${T('trn_cert_code')}: ${verificationCode(item)}`, { width: inner })
        .moveDown(0.3).fontSize(8).text(T('trn_cert_codeNote'), { width: inner })
      pdf.moveDown(1.2).font(F.regular).fontSize(10).fillColor('#111111')
        .text(T('trn_cert_issued', { date: i18n.fmtDate(issuedAt, lang), user: latin(opts.issuedBy || '') }), { width: inner })
      // Hinweis am Seitenende
      pdf.strokeColor('#cccccc').moveTo(MARGIN, 760).lineTo(W - MARGIN, 760).stroke()
      pdf.font(F.italic).fontSize(8.5).fillColor('#555555').text(T('trn_cert_note'), MARGIN, 768, { width: inner, height: 50 })
      pdf.end()
    } catch (e) { reject(e) }
  })
}

module.exports = { renderTrainingConfirmation, verificationCode, fileName, latin }
