// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Firmenlogo: eine Bilddatei im Datenverzeichnis (unabhängig vom Speicher-Backend) plus kleine Beschreibung.
// Erlaubt sind nur PNG und JPEG (an den Dateianfängen erkannt, nicht am Namen oder angegebenen Typ), höchstens 512 kB.
// SVG wird bewusst nicht angenommen: es kann Skripte enthalten (XSS) und pdfkit zeichnet es nicht.
// `demo: true` kennzeichnet das mitgelieferte Demo-Logo; es wird beim Demo-Reset entfernt, ein eigenes Logo bleibt.

const fs = require('fs')
const path = require('path')

const MAX_BYTES = 512 * 1024
const MAX_PIXELS = 4000
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg' }

const dataDir = () => process.env.DATA_DIR || path.join(__dirname, '../data')
const metaFile = () => path.join(dataDir(), 'org-logo.json')
const imageFile = ext => path.join(dataDir(), 'org-logo.' + ext)
const requiredFlag = () => path.join(dataDir(), '.logo_required')
const DEMO_LOGO = path.join(__dirname, '../data/demo-bundles/isms-builder-logo.png')

// Dateityp und Größe aus den Bytes lesen → { mime, width, height } oder null
function inspect(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return null
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    if (buf.toString('latin1', 12, 16) !== 'IHDR') return null
    return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const marker = buf[i + 1]
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xff) { i += marker === 0xff ? 1 : 2; continue }
      const len = buf.readUInt16BE(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { mime: 'image/jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
      }
      i += 2 + len
    }
  }
  return null
}

// Prüft ein Bild; → { ok: true, info } oder { ok: false, error }
function validate(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return { ok: false, error: 'Empty file' }
  if (buf.length > MAX_BYTES) return { ok: false, error: 'Logo too large (max 512 kB)' }
  const info = inspect(buf)
  if (!info) return { ok: false, error: 'Only PNG and JPEG images are accepted' }
  if (!info.width || !info.height || info.width > MAX_PIXELS || info.height > MAX_PIXELS) {
    return { ok: false, error: 'Image dimensions invalid (max 4000 px)' }
  }
  return { ok: true, info }
}

function readMeta() {
  try { return JSON.parse(fs.readFileSync(metaFile(), 'utf8')) } catch { return null }
}

// Aktuelles Logo: { mime, buffer, meta } oder null
function read() {
  const meta = readMeta()
  if (!meta || !TYPES[meta.mime]) return null
  try {
    const buffer = fs.readFileSync(imageFile(TYPES[meta.mime]))
    const check = validate(buffer)
    if (!check.ok || check.info.mime !== meta.mime) return null
    return { mime: meta.mime, buffer, meta }
  } catch { return null }
}

// Beschreibung ohne Bilddaten, für die Oberfläche
function info() {
  const logo = read()
  if (!logo) return { set: false, required: fs.existsSync(requiredFlag()) }
  return { set: true, demo: !!logo.meta.demo, mime: logo.mime, size: logo.buffer.length, width: logo.meta.width, height: logo.meta.height, updatedAt: logo.meta.updatedAt, required: false }
}

function removeFiles() {
  for (const ext of Object.values(TYPES)) { try { fs.unlinkSync(imageFile(ext)) } catch { /* nicht vorhanden */ } }
  try { fs.unlinkSync(metaFile()) } catch { /* nicht vorhanden */ }
}

// Speichert ein geprüftes Bild (ersetzt das vorhandene); entfernt den Pflicht-Hinweis des Produktivwechsels
function save(buf, { demo = false } = {}) {
  const check = validate(buf)
  if (!check.ok) return check
  removeFiles()
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(imageFile(TYPES[check.info.mime]), buf)
  fs.writeFileSync(metaFile(), JSON.stringify({ mime: check.info.mime, width: check.info.width, height: check.info.height, demo: !!demo, updatedAt: new Date().toISOString() }, null, 2))
  try { fs.unlinkSync(requiredFlag()) } catch { /* kein Hinweis aktiv */ }
  return { ok: true, info: info() }
}

function remove() { removeFiles() }

// Demo-Logo installieren, falls keines (oder nur das Demo-Logo) gesetzt ist; ein eigenes Logo bleibt unangetastet
function installDemoLogo() {
  const cur = read()
  if (cur && !cur.meta.demo) return false
  try { return save(fs.readFileSync(DEMO_LOGO), { demo: true }).ok === true } catch { return false }
}

// Demo→Produktiv: Demo-Logo entfernen und den Hinweis „Firmenlogo setzen“ aktivieren, solange kein eigenes Logo vorliegt
function prepareForProduction() {
  const cur = read()
  if (cur && !cur.meta.demo) return false
  removeFiles()
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(requiredFlag(), new Date().toISOString())
  return true
}

module.exports = { MAX_BYTES, validate, inspect, read, info, save, remove, installDemoLogo, prepareForProduction }
