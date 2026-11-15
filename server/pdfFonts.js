// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Schriften für alle PDF-Ausgaben (Formular, Teilnahmebestätigung, Dokument-Export).
// Die PDF-Standardschrift Helvetica kennt nur westeuropäische Zeichen. Stattdessen wird eine Unicode-Schrift eingebettet:
// eine von drei mitgelieferten (Liberation Sans, Noto Sans, DejaVu Sans — jeweils mit Regular, Bold, Italic und Lizenztext in server/fonts/)
// oder eine eigene, vom Administrator hochgeladene Schrift (Datenverzeichnis, nur Regular ist Pflicht).
// Fehlt die Schriftdatei, fällt alles auf Helvetica zurück und Zeichen außerhalb von WinAnsi werden ersetzt (wie bisher).
const fs   = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { dataPath } = require('./paths')

const FONT_DIR = path.join(__dirname, 'fonts')
const BUNDLED = {
  liberation: { label: 'Liberation Sans', files: { regular: 'LiberationSans-Regular.ttf', bold: 'LiberationSans-Bold.ttf', italic: 'LiberationSans-Italic.ttf' }, license: 'SIL Open Font License 1.1', licenseFile: 'LICENSE-LiberationSans.txt' },
  noto:       { label: 'Noto Sans',       files: { regular: 'NotoSans-Regular.ttf',       bold: 'NotoSans-Bold.ttf',       italic: 'NotoSans-Italic.ttf' },       license: 'SIL Open Font License 1.1', licenseFile: 'LICENSE-NotoSans.txt' },
  dejavu:     { label: 'DejaVu Sans',     files: { regular: 'DejaVuSans-Regular.ttf',     bold: 'DejaVuSans-Bold.ttf',     italic: 'DejaVuSans-Italic.ttf' },     license: 'Bitstream Vera / DejaVu (frei, siehe Lizenztext)', licenseFile: 'LICENSE-DejaVuSans.txt' },
}
// Festbreitenschrift für Code und Referenzen (statt Courier, das nur WinAnsi kennt): Nimbus Mono PS von URW++, ein Courier-Klon mit
// Latein/Griechisch/Kyrillisch. Lizenz: AGPL-3.0 mit PDF-Schriftenausnahme (server/fonts/LICENSE-NimbusMonoPS.txt).
const MONO = { label: 'Nimbus Mono PS', file: 'NimbusMonoPS-Regular.otf', license: 'AGPL-3.0 + PS-or-PDF font exception', licenseFile: 'LICENSE-NimbusMonoPS.txt' }
const DEFAULT_CHOICE = 'liberation'
const STANDARD = 'helvetica'          // Standardschrift des PDF-Formats, nichts eingebettet: kleinste Dateien, aber nur westeuropäische Zeichen
const STYLES = ['regular', 'bold', 'italic']
const CUSTOM_STYLES = [...STYLES, 'mono']          // eigene Schrift: Mono ist optional (sonst Nimbus Mono PS)
const FILE_STYLES = [...STYLES, 'mono']             // abrufbar für die Druckfenster
const MAX_FONT_BYTES = 8 * 1024 * 1024

const customDir  = () => dataPath('pdf-fonts')
const customFile = style => path.join(customDir(), `custom-${style}.ttf`)
const metaFile   = () => path.join(customDir(), 'meta.json')

// ── Ersatzweg ohne Unicode-Schrift (Helvetica kennt nur WinAnsi) ───────────────
function latin(text) {
  return String(text == null ? '' : text)
    .replace(/ő/g, 'ö').replace(/Ő/g, 'Ö').replace(/ű/g, 'ü').replace(/Ű/g, 'Ü')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[^\u0000-ÿ–—‘’‚“”„•…€]/g, '?')
}
// Mit Unicode-Schrift nur Steuerzeichen entfernen
function clean(text) {
  return String(text == null ? '' : text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
}

// ── Eigene Schrift: Metadaten ──────────────────────────────────────────────────
function readCustom() {
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile(), 'utf8'))
    const styles = {}
    for (const s of CUSTOM_STYLES) if (fs.existsSync(customFile(s))) styles[s] = true
    return styles.regular ? { label: meta.label || 'Custom', styles, licenseConfirmed: meta.licenseConfirmed === true, uploadedBy: meta.uploadedBy || '', uploadedAt: meta.uploadedAt || null } : null
  } catch { return null }
}

// ── Auswahl auflösen ───────────────────────────────────────────────────────────
// choice: 'liberation' | 'noto' | 'dejavu' | 'custom'; Unbekanntes → Standard. Ergebnis: { id, label, unicode, files, text }
function resolve(choice) {
  if (choice === STANDARD) return { id: STANDARD, label: 'Helvetica', unicode: false, files: null, text: latin }
  const monoOf = custom => (custom && custom.styles.mono) ? customFile('mono') : path.join(FONT_DIR, MONO.file)
  let id = (choice === 'custom' || BUNDLED[choice]) ? choice : DEFAULT_CHOICE
  let files = null, label = ''
  if (id === 'custom') {
    const c = readCustom()
    if (c) { files = { regular: customFile('regular'), bold: c.styles.bold ? customFile('bold') : customFile('regular'), italic: c.styles.italic ? customFile('italic') : customFile('regular'), mono: monoOf(c) }; label = c.label }
    else id = DEFAULT_CHOICE                                  // eigene Schrift gewählt, aber nicht (mehr) vorhanden
  }
  if (!files) {
    const b = BUNDLED[id]; label = b.label
    files = Object.fromEntries(STYLES.map(s => [s, path.join(FONT_DIR, b.files[s])]))
    files.mono = monoOf(null)
  }
  const ok = STYLES.every(s => { try { return fs.statSync(files[s]).isFile() } catch { return false } })
  // Fehlt nur die Mono-Datei, bleibt die Unicode-Schrift erhalten und Code erscheint in Courier
  try { if (!fs.statSync(files.mono).isFile()) files.mono = null } catch { files.mono = null }
  if (!ok) return { id: 'helvetica', label: 'Helvetica', unicode: false, files: null, text: latin }
  return { id, label, unicode: true, files, text: clean }
}

// Schriften im Dokument anmelden; Rückgabe: Namen für regular/bold/italic (Standardschrift, wenn kein Unicode-Font)
function apply(pdf, resolved) {
  if (!resolved.unicode) return { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique', mono: 'Courier', unicode: false }
  const reg = new Map()
  for (const s of STYLES) {
    const f = resolved.files[s]
    if (!reg.has(f)) reg.set(f, `Body-${s}`)
    pdf.registerFont(reg.get(f), f)
  }
  let mono = 'Courier'
  if (resolved.files.mono) { pdf.registerFont('Body-mono', resolved.files.mono); mono = 'Body-mono' }
  return { regular: reg.get(resolved.files.regular), bold: reg.get(resolved.files.bold), italic: reg.get(resolved.files.italic), mono, unicode: true }
}

// ── Eigene Schrift prüfen und speichern ────────────────────────────────────────
// Prüft Dateityp (TrueType/OpenType), Größe, Lesbarkeit, Einbettungsrecht (OS/2 fsType) und Grundzeichen.
function inspectFont(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 1000) return { ok: false, error: 'Font file invalid' }
  if (buf.length > MAX_FONT_BYTES) return { ok: false, error: 'Font file too large (max 8 MB)' }
  const magic = buf.toString('latin1', 0, 4)
  if (!(buf.readUInt32BE(0) === 0x00010000 || magic === 'true' || magic === 'OTTO')) return { ok: false, error: 'Font file invalid' }   // keine .ttc/.woff/Sonstiges
  let fk
  try {
    const d = new PDFDocument()
    d.font(buf)
    fk = d._font && d._font.font
    d.on('data', () => {}); d.end()
  } catch { return { ok: false, error: 'Font file invalid' } }
  if (!fk) return { ok: false, error: 'Font file invalid' }
  // OS/2 fsType: „Restricted License“ (noEmbedding) verbietet das Einbetten, ebenso „nur Bitmaps“ und „kein Zerlegen in Teilmengen“ (wir betten Teilmengen ein).
  // „Preview & Print“ (viewOnly) und „Editable“ erlauben das Einbetten in Dokumente, die angesehen/gedruckt werden — genau unser Fall.
  const fsType = fk['OS/2'] && fk['OS/2'].fsType
  if (fsType && (fsType.noEmbedding || fsType.bitmapOnly || fsType.noSubsetting)) return { ok: false, error: 'Font does not allow embedding' }
  for (const ch of ['A', 'a', '0']) if (!fk.hasGlyphForCodePoint(ch.codePointAt(0))) return { ok: false, error: 'Font lacks basic characters' }
  return { ok: true, family: String(fk.familyName || '').slice(0, 80) }
}

function saveCustom({ style, data, label, licenseConfirmed, by }) {
  if (!CUSTOM_STYLES.includes(style)) return { ok: false, error: 'style invalid' }
  if (licenseConfirmed !== true) return { ok: false, error: 'License confirmation required' }
  let buf
  try { buf = Buffer.from(String(data || ''), 'base64') } catch { return { ok: false, error: 'Font file invalid' } }
  const info = inspectFont(buf)
  if (!info.ok) return info
  fs.mkdirSync(customDir(), { recursive: true, mode: 0o700 })
  fs.writeFileSync(customFile(style), buf, { mode: 0o600 })
  let meta = {}
  try { meta = JSON.parse(fs.readFileSync(metaFile(), 'utf8')) } catch {}
  meta.label = String(label || '').trim().slice(0, 80) || meta.label || info.family || 'Custom'
  meta.licenseConfirmed = true; meta.uploadedBy = by || ''; meta.uploadedAt = new Date().toISOString()
  fs.writeFileSync(metaFile(), JSON.stringify(meta, null, 2), { mode: 0o600 })
  return { ok: true, family: info.family }
}

function removeCustom() {
  for (const s of CUSTOM_STYLES) { try { fs.unlinkSync(customFile(s)) } catch {} }
  try { fs.unlinkSync(metaFile()) } catch {}
}

function info(choice) {
  const c = readCustom()
  return {
    choice: choice === STANDARD || (choice === 'custom' && c) || BUNDLED[choice] ? choice : DEFAULT_CHOICE,
    bundled: Object.entries(BUNDLED).map(([id, b]) => ({ id, label: b.label, license: b.license })),
    mono: { label: MONO.label, license: MONO.license },
    custom: c ? { label: c.label, styles: Object.keys(c.styles), licenseConfirmed: c.licenseConfirmed, uploadedAt: c.uploadedAt } : null,
    active: resolve(choice).id,
  }
}

// Buchstaben, die die Amtssprachen der EU über ASCII hinaus brauchen — für die Vorschau (Prüfung, ob die gewählte Schrift sie kennt)
const SAMPLES = [
  ['bg', 'абвгдежзийклмнопрстуфхцчшщъьюя АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ'], ['cs', 'áčďéěíňóřšťúůýž ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ'],
  ['da', 'æøå ÆØÅ'], ['de', 'äöüß ÄÖÜ'], ['el', 'αβγδεζηθικλμνξοπρσςτυφχψω άέήίόύώ ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'],
  ['en', 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ['es', 'áéíñóúü ¿¡'], ['et', 'õäöüšž ÕÄÖÜŠŽ'], ['fi', 'äöåšž ÄÖÅŠŽ'],
  ['fr', 'àâæçéèêëîïôœùûüÿ «» ŒÆ'], ['ga', 'áéíóú ÁÉÍÓÚ'], ['hr', 'čćđšž ČĆĐŠŽ'], ['hu', 'áéíóöőúüű ÁÉÍÓÖŐÚÜŰ'], ['it', 'àèéìòù'],
  ['lt', 'ąčęėįšųūž ĄČĘĖĮŠŲŪŽ'], ['lv', 'āčēģīķļņšūž ĀČĒĢĪĶĻŅŠŪŽ'], ['mt', 'ċġħż ĊĠĦŻ àèìòù'], ['nl', 'ëïéèüö ĳ'], ['pl', 'ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ'],
  ['pt', 'ãõáâàçéêíóôúü'], ['ro', 'ăâîșț ĂÂÎȘȚ'], ['sk', 'áäčďéíĺľňóôŕšťúýž'], ['sl', 'čšž ČŠŽ'], ['sv', 'åäö ÅÄÖ'],
]

// Vorschau-PDF: zeigt Regular/Bold/Italic und die Sonderbuchstaben aller EU-Amtssprachen in der gewählten Schrift
function renderPreview(choice) {
  const res = resolve(choice)
  return new Promise((resolveBuf, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'PDF font preview' } })
    const chunks = []
    pdf.on('data', c => chunks.push(c)); pdf.on('end', () => resolveBuf(Buffer.concat(chunks))); pdf.on('error', reject)
    try {
      const F = apply(pdf, res)
      pdf.font(F.bold).fontSize(16).text(res.text(`PDF font: ${res.label}`))
      pdf.font(F.regular).fontSize(9).fillColor('#555555').text(res.unicode ? 'Embedded Unicode font' : 'Standard PDF font (Helvetica): characters outside Western European are replaced')
      pdf.moveDown(0.8)
      pdf.fillColor('#000000').font(F.regular).fontSize(11).text(res.text('Regular — The quick brown fox jumps over the lazy dog 0123456789'))
      pdf.font(F.bold).text(res.text('Bold — The quick brown fox jumps over the lazy dog 0123456789'))
      pdf.font(F.italic).text(res.text('Italic — The quick brown fox jumps over the lazy dog 0123456789'))
      pdf.font(F.mono).text(res.text('Mono — function render(id) { return "Őrzés űrlap 0O1lI|"; }'))
      pdf.moveDown(0.8)
      for (const [code, letters] of SAMPLES) {
        const y = pdf.y
        pdf.font(F.bold).fontSize(10).text(code.toUpperCase(), 50, y, { width: 36 })
        pdf.font(F.regular).fontSize(11).text(res.text(letters), 90, y, { width: 455 })
        pdf.y = Math.max(pdf.y, y + 14) + 2
      }
      pdf.end()
    } catch (e) { reject(e) }
  })
}

module.exports = { BUNDLED, MONO, DEFAULT_CHOICE, STANDARD, STYLES, CUSTOM_STYLES, FILE_STYLES, resolve, apply, latin, clean, inspectFont, renderPreview, SAMPLES, saveCustom, removeCustom, readCustom, info, FONT_DIR }
