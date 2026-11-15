// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Dateianhänge zu Schulungen (Nachweise): Speicherort, Prüfung von Endung UND Dateikopf, Zufallsnamen.
// Reine Datei-Hilfen ohne Express; die Routen stehen in routes/training.js.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MAX_BYTES = 20 * 1024 * 1024

// Endung → { mime, Prüfung des Dateikopfs }
const TYPES = {
  '.pdf':  { mime: 'application/pdf', head: b => b.slice(0, 5).toString('latin1') === '%PDF-' },
  '.png':  { mime: 'image/png', head: b => b.length > 8 && b.readUInt32BE(0) === 0x89504e47 },
  '.jpg':  { mime: 'image/jpeg', head: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.jpeg': { mime: 'image/jpeg', head: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', head: b => b.slice(0, 4).toString('latin1') === 'PK\x03\x04' },
  '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', head: b => b.slice(0, 4).toString('latin1') === 'PK\x03\x04' },
  '.txt':  { mime: 'text/plain; charset=utf-8', head: b => !b.slice(0, 8192).includes(0) },
}
const ALLOWED_LABEL = 'PDF, PNG, JPG, DOCX, XLSX, TXT'

function dir() {
  const d = path.join(process.env.DATA_DIR || path.join(__dirname, '../data'), 'training-files')
  fs.mkdirSync(d, { recursive: true })
  return d
}

// Dateiname für die Anzeige/den Download: keine Pfad-, Steuer- und Anführungszeichen
function cleanName(name) {
  const base = path.basename(String(name || '').replace(/\\/g, '/'))
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>:|?*]/g, '_').replace(/^\.+/, '').trim().slice(0, 150)
  return cleaned || 'Datei'
}

// → { ok: true, ext, mime } | { ok: false, error }
function check(buffer, originalName) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return { ok: false, error: 'Empty file' }
  if (buffer.length > MAX_BYTES) return { ok: false, error: 'File too large (max 20 MB)' }
  const ext = path.extname(cleanName(originalName)).toLowerCase()
  const type = TYPES[ext]
  if (!type) return { ok: false, error: 'File type not allowed (PDF, PNG, JPG, DOCX, XLSX, TXT)' }
  if (!type.head(buffer)) return { ok: false, error: 'File content does not match its type' }
  return { ok: true, ext, mime: type.mime }
}

// Speichert unter Zufallsnamen → Metadaten ohne Pfad
function save(buffer, originalName, uploadedBy) {
  const c = check(buffer, originalName)
  if (!c.ok) return c
  const filename = crypto.randomBytes(16).toString('hex') + c.ext
  fs.writeFileSync(path.join(dir(), filename), buffer, { mode: 0o600 })
  return {
    ok: true,
    meta: {
      id: 'att_' + crypto.randomBytes(8).toString('hex'),
      filename, originalName: cleanName(originalName), size: buffer.length, mime: c.mime,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      uploadedBy: uploadedBy || 'system', uploadedAt: new Date().toISOString(),
      removedAt: null, removedBy: null,
    },
  }
}

// Absoluter Pfad nur für gespeicherte Zufallsnamen
function resolve(filename) {
  if (!/^[a-f0-9]{32}\.[a-z]{3,4}$/.test(String(filename || ''))) return null
  const p = path.join(dir(), filename)
  return fs.existsSync(p) ? p : null
}

function removeFile(filename) {
  const p = resolve(filename)
  if (p) { try { fs.unlinkSync(p) } catch { /* schon weg */ } }
}

// Angaben für die Oberfläche: ohne Dateiname auf dem Server und ohne entfernte Anhänge
function publicAttachments(list) {
  return (Array.isArray(list) ? list : []).filter(a => a && !a.removedAt)
    .map(({ id, originalName, size, mime, sha256, uploadedBy, uploadedAt }) => ({ id, originalName, size, mime, sha256, uploadedBy, uploadedAt }))
}

module.exports = { MAX_BYTES, TYPES, ALLOWED_LABEL, dir, cleanName, check, save, resolve, removeFile, publicAttachments }
