// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
/**
 * pdfExport.js – rendert ein Template-Dokument (Markdown) serverseitig als PDF.
 *
 * Bisher erzeugte jeder PDF-Export im Projekt (_printTemplates, Reports,
 * Guidance, Findings …) die Datei ausschließlich im Browser des Nutzers
 * (window.open + window.print()) — der Server sah nie echte PDF-Bytes.
 * Für den Nextcloud/WebDAV-Publish (#66) braucht es aber eine Datei, die der
 * Server tatsächlich per PUT hochladen kann.
 *
 * Bewusst kein Headless-Chrome (puppeteer): das würde ~300 MB Chromium ins
 * Produktiv-Image ziehen, nur um HTML zu drucken. Stattdessen: pdfkit (reines
 * JS, kein natives Kompilieren) + der ohnehin im Projekt vendorte
 * ui/vendor/marked.min.js (per require() wiederverwendet, keine zweite neue
 * Abhängigkeit) zum Parsen des Markdown-Inhalts in einen Token-Baum, den wir
 * selbst auf die PDFKit-Zeichenbefehle abbilden.
 *
 * Layout ist bewusst einfacher als das Browser-Druck-CSS (_printTemplates) —
 * Ziel ist ein sauber lesbares, korrektes Dokument, kein Pixel-Abgleich.
 */

const PDFDocument = require('pdfkit')
const { marked } = require('../ui/vendor/marked.min.js')
const { versionTable } = require('./db/templateVersioning')
const i18n = require('./i18n')

const PAGE_MARGIN = 56
const FONT_BODY = 'Helvetica'
const FONT_BOLD = 'Helvetica-Bold'
const FONT_ITALIC = 'Helvetica-Oblique'
const FONT_MONO = 'Courier'
const SIZE_BODY = 10.5
const COLOR_TEXT = '#111111'
const COLOR_MUTED = '#666666'
const COLOR_RULE = '#cccccc'
const COLOR_CODE_BG = '#f5f5f5'

function stripHtml(raw) {
  return String(raw || '').replace(/<[^>]*>/g, '')
}

/** Rendert eine Zeile aus Inline-Tokens (text/strong/em/codespan/del/link/html) mit gemischter Formatierung. */
function renderInline(doc, tokens, opts = {}) {
  const runs = []
  const walk = (toks, style) => {
    for (const tok of toks || []) {
      switch (tok.type) {
        case 'strong':
          walk(tok.tokens, { ...style, bold: true })
          break
        case 'em':
          walk(tok.tokens, { ...style, italic: true })
          break
        case 'del':
          walk(tok.tokens, { ...style, strike: true })
          break
        case 'codespan':
          runs.push({ text: tok.text, mono: true })
          break
        case 'link':
          walk(tok.tokens, { ...style, link: tok.href })
          break
        case 'br':
          runs.push({ text: '\n' })
          break
        case 'html':
          runs.push({ text: stripHtml(tok.raw), ...style })
          break
        case 'text':
          if (tok.tokens) walk(tok.tokens, style)
          else runs.push({ text: tok.text, ...style })
          break
        default:
          if (tok.text) runs.push({ text: tok.text, ...style })
      }
    }
  }
  walk(tokens, {})

  if (!runs.length) return
  runs.forEach((run, i) => {
    const font = run.mono ? FONT_MONO : (run.bold ? FONT_BOLD : (run.italic ? FONT_ITALIC : FONT_BODY))
    doc.font(font).fontSize(opts.size || SIZE_BODY).fillColor(run.link ? '#0052cc' : (opts.color || COLOR_TEXT))
    doc.text(run.text, { continued: i < runs.length - 1, underline: !!run.link, strike: !!run.strike })
  })
  doc.fillColor(COLOR_TEXT)
}

/** Extrahiert reinen Text aus Inline-Tokens (PDFKits list() unterstuetzt keine gemischte Formatierung je Eintrag). */
function inlineToPlainText(tokens) {
  let out = ''
  for (const tok of tokens || []) {
    if (tok.type === 'codespan') out += tok.text
    else if (tok.tokens) out += inlineToPlainText(tok.tokens)
    else if (tok.text != null) out += tok.text
  }
  return out
}

/** Baut die verschachtelte Item-Struktur, die PDFKits eingebautes list() erwartet (String | Array). */
function listItemsToArray(token) {
  return (token.items || []).map(item => {
    const textTokens = (item.tokens || []).filter(t => t.type === 'text')
    const label = textTokens.length
      ? textTokens.map(tt => inlineToPlainText(tt.tokens || [{ type: 'text', text: tt.text }])).join('')
      : (item.text || '')
    const nested = (item.tokens || []).filter(t => t.type === 'list')
    if (!nested.length) return label
    return [label, ...nested.map(listItemsToArray).flat()]
  })
}

function renderList(doc, token) {
  doc.font(FONT_BODY).fontSize(SIZE_BODY).fillColor(COLOR_TEXT)
  doc.list(listItemsToArray(token), {
    listType: token.ordered ? 'numbered' : 'bullet',
    bulletRadius: 2,
    textIndent: 0,
  })
}

function renderTable(doc, token) {
  const cols = token.header.length
  const pageWidth = doc.page.width - PAGE_MARGIN * 2
  const colWidth = pageWidth / cols
  const rowHeight = 20
  let x = PAGE_MARGIN
  let y = doc.y

  const drawRow = (cells, opts = {}) => {
    let cx = x
    for (let i = 0; i < cols; i++) {
      const cell = cells[i]
      doc.rect(cx, y, colWidth, rowHeight).stroke(COLOR_RULE)
      doc.font(opts.bold ? FONT_BOLD : FONT_BODY).fontSize(9).fillColor(COLOR_TEXT)
      const text = cell ? (cell.text != null ? String(cell.text) : '') : ''
      doc.text(text, cx + 4, y + 5, { width: colWidth - 8, height: rowHeight - 6, ellipsis: true })
      cx += colWidth
    }
    y += rowHeight
  }

  drawRow(token.header, { bold: true })
  for (const row of token.rows || []) {
    if (y + rowHeight > doc.page.height - PAGE_MARGIN) { doc.addPage(); y = PAGE_MARGIN }
    drawRow(row)
  }
  doc.x = PAGE_MARGIN
  doc.y = y + 8
}

function renderToken(doc, token) {
  switch (token.type) {
    case 'heading': {
      const sizes = { 1: 18, 2: 15, 3: 13, 4: 11.5, 5: 10.5, 6: 10 }
      doc.moveDown(0.6)
      doc.font(FONT_BOLD).fontSize(sizes[token.depth] || 10.5).fillColor(COLOR_TEXT)
      doc.text(token.text || '')
      if (token.depth === 1) {
        doc.moveDown(0.15)
        doc.strokeColor(COLOR_RULE).moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).stroke()
      }
      doc.moveDown(0.4)
      break
    }
    case 'paragraph':
      doc.font(FONT_BODY).fontSize(SIZE_BODY).fillColor(COLOR_TEXT)
      renderInline(doc, token.tokens)
      doc.moveDown(0.5)
      break
    case 'list':
      renderList(doc, token)
      doc.moveDown(0.4)
      break
    case 'table':
      renderTable(doc, token)
      break
    case 'code': {
      doc.moveDown(0.2)
      const width = doc.page.width - PAGE_MARGIN * 2 - 16
      const h = doc.heightOfString(token.text || '', { width, font: FONT_MONO, fontSize: 9 }) + 12
      if (doc.y + h > doc.page.height - PAGE_MARGIN) doc.addPage()
      const top = doc.y
      doc.rect(PAGE_MARGIN, top, doc.page.width - PAGE_MARGIN * 2, h).fill(COLOR_CODE_BG)
      doc.fillColor(COLOR_TEXT).font(FONT_MONO).fontSize(9)
      doc.text(token.text || '', PAGE_MARGIN + 8, top + 6, { width })
      doc.y = top + h
      doc.moveDown(0.5)
      break
    }
    case 'blockquote':
      doc.font(FONT_ITALIC).fontSize(SIZE_BODY).fillColor(COLOR_MUTED)
      for (const t of token.tokens || []) {
        if (t.type === 'paragraph') renderInline(doc, t.tokens, { color: COLOR_MUTED })
      }
      doc.fillColor(COLOR_TEXT)
      doc.moveDown(0.5)
      break
    case 'hr':
      doc.moveDown(0.3)
      doc.strokeColor(COLOR_RULE).moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).stroke()
      doc.moveDown(0.3)
      break
    case 'space':
      break
    case 'html':
      break
    default:
      if (token.text) {
        doc.font(FONT_BODY).fontSize(SIZE_BODY).fillColor(COLOR_TEXT).text(stripHtml(token.text))
        doc.moveDown(0.3)
      }
  }
}

/**
 * Rendert ein Template-Dokument als PDF.
 * @param {{title, type, status, version, owner, nextReviewDate, content}} doc
 * @returns {Promise<Buffer>}
 */
/** Versionstabelle im Dokumentkopf (#97): Version | Freigegeben von | Freigegeben am | Änderungen. */
function renderVersionTable(pdf, rows, lang = 'de') {
  const T = key => i18n.tr(lang, key)
  if (!rows.length) return
  const x0 = PAGE_MARGIN
  const cols = [
    { label: T('tmpl_version'),     w: 50 },
    { label: T('tmpl_approvedBy'),  w: 110 },
    { label: T('tmpl_approvedOn'),  w: 90 },
    { label: T('tmpl_changes'),     w: pdf.page.width - 2 * PAGE_MARGIN - 250 },
  ]
  const drawRow = (cells, bold) => {
    const font = bold ? FONT_BOLD : FONT_BODY
    pdf.font(font).fontSize(8.5)
    const h = Math.max(...cells.map((c, i) => pdf.heightOfString(String(c), { width: cols[i].w - 8 }))) + 6
    if (pdf.y + h > pdf.page.height - pdf.page.margins.bottom) pdf.addPage()
    const y = pdf.y
    let x = x0
    cells.forEach((c, i) => {
      pdf.fillColor(COLOR_TEXT).text(String(c), x + 4, y + 3, { width: cols[i].w - 8 })
      pdf.strokeColor(COLOR_RULE).rect(x, y, cols[i].w, h).stroke()
      x += cols[i].w
    })
    pdf.y = y + h
  }
  drawRow(cols.map(c => c.label), true)
  rows.forEach(r => drawRow([
    r.version, r.approvedBy || '', r.approvedAt ? String(r.approvedAt).slice(0, 10) : '', r.changes || '',
  ], false))
  pdf.x = PAGE_MARGIN
  pdf.moveDown(0.8)
}

async function renderTemplateToPdf(doc) {
  const lang = i18n.pickLang(doc.language) || await i18n.orgLang()
  const T = key => i18n.tr(lang, key)
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true })
    const chunks = []
    pdf.on('data', c => chunks.push(c))
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)

    try {
      pdf.font(FONT_BOLD).fontSize(18).fillColor(COLOR_TEXT).text(doc.title || '')
      const metaParts = [
        doc.type ? `${T('col_type')}: ${doc.type}` : null,
        doc.status ? `${T('col_status')}: ${doc.status}` : null,
        doc.version ? `${T('tmpl_version')}: ${doc.version}` : null,
        doc.owner ? `${T('col_owner')}: ${doc.owner}` : null,
        doc.nextReviewDate ? `${T('legal_nextReview')}: ${String(doc.nextReviewDate).slice(0, 10)}` : null,
      ].filter(Boolean)
      if (metaParts.length) {
        pdf.moveDown(0.2)
        pdf.font(FONT_BODY).fontSize(9).fillColor(COLOR_MUTED).text(metaParts.join('  ·  '))
      }
      pdf.moveDown(0.3)
      pdf.strokeColor(COLOR_RULE).moveTo(PAGE_MARGIN, pdf.y).lineTo(pdf.page.width - PAGE_MARGIN, pdf.y).stroke()
      pdf.moveDown(0.6)
      renderVersionTable(pdf, doc.versions || versionTable(doc), lang)

      const tokens = marked.lexer(String(doc.content || ''))
      for (const token of tokens) renderToken(pdf, token)

      const range = pdf.bufferedPageRange()
      const bottomMargin = pdf.page.margins.bottom
      for (let i = 0; i < range.count; i++) {
        pdf.switchToPage(range.start + i)
        // Footer-Text liegt bewusst UNTER dem regulaeren Satzspiegel, im
        // Rand-Bereich. PDFKit prueft bei jedem text()-Aufruf, ob die
        // Schreibposition den unteren Rand ueberschreitet, und wuerde sonst
        // automatisch eine neue Seite anhaengen (continueOnNewPage) - genau
        // dafuer ist der Rand ja da. Fuer den Footer selbst muss diese
        // Pruefung kurz aus sein, sonst entsteht pro Seite eine Leerseite
        // und range.count stimmt nicht mehr mit der tatsaechlichen
        // Seitenzahl ueberein.
        pdf.page.margins.bottom = 0
        pdf.font(FONT_BODY).fontSize(8).fillColor(COLOR_MUTED)
        pdf.text(
          `ISMS Builder · ${doc.title || ''} · ${i18n.fmtDate(new Date(), lang)} · ${i + 1}/${range.count}`,
          PAGE_MARGIN, pdf.page.height - PAGE_MARGIN + 18,
          { width: pdf.page.width - PAGE_MARGIN * 2, align: 'center' }
        )
        pdf.page.margins.bottom = bottomMargin
      }

      pdf.end()
    } catch (e) {
      reject(e)
    }
  })
}

module.exports = { renderTemplateToPdf }
