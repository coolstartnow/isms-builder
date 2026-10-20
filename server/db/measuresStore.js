// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Maßnahmen (zentrales Register): was konkret umgesetzt wird, mit Verantwortlichem, Termin und Status, zugeordnet zu
// SoA-Controls und Feststellungen; dazu die TOMs nach Art. 32 DSGVO (Kennzeichen `tom`). JSON-Speicher; unter
// sqlite/mariadb/postgres übernimmt stores/measuresStore.js.
const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
const fs   = require('fs')
const path = require('path')
const C    = require('./measuresCommon')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'measures.json')

function load() { try { const l = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return Array.isArray(l) ? l : [] } catch { return [] } }
function save(list) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2))
}

function getAll(filter = {}) { return C.filterList(load().filter(m => !m.deletedAt), filter).sort((a, b) => a.ref.localeCompare(b.ref)) }
function getById(id) { return load().find(m => m.id === id && !m.deletedAt) || null }
const getAnyById = id => load().find(m => m.id === id) || null     // auch gelöschte (Wiederherstellen, endgültig löschen)
const allIds = () => load().map(m => m.id)

function create(fields, createdBy) {
  const list = load()
  const now = C.nowISO()
  const base = { ...C.blank(), ref: C.nextRef(list.map(m => m.ref)) }
  const item = {
    ...C.normalize(fields, base),
    createdAt: now, updatedAt: now, createdBy: createdBy || 'system', updatedBy: createdBy || 'system', deletedAt: null, deletedBy: null,
  }
  list.push(item); save(list)
  return item
}

// Übernahme eines vollständigen Datensatzes (z. B. alte TOMs): Kennung, Zeitstempel und Löschstatus bleiben erhalten.
// Bereits vorhandene Kennungen werden nicht angefasst. → true, wenn neu angelegt.
function importRecord(rec) {
  const list = load()
  if (list.some(m => m.id === rec.id)) return false
  const item = { ...C.normalize(rec, { ...C.blank(), id: rec.id, ref: C.nextRef(list.map(m => m.ref)) }),
    createdAt: rec.createdAt, updatedAt: rec.updatedAt, createdBy: rec.createdBy, updatedBy: rec.updatedBy,
    completedDate: rec.completedDate || null,   // beim Import nie automatisch „heute“
    attachments: Array.isArray(rec.attachments) ? rec.attachments : [],
    deletedAt: rec.deletedAt || null, deletedBy: rec.deletedBy || null }
  list.push(item); save(list)
  return true
}

function update(id, fields, updatedBy) {
  const list = load()
  const i = list.findIndex(m => m.id === id && !m.deletedAt)
  if (i < 0) return null
  list[i] = { ...C.normalize(fields, list[i]), updatedAt: C.nowISO(), updatedBy: updatedBy || 'system' }
  save(list)
  return list[i]
}

// Anhänge werden nur serverseitig gesetzt (Upload-Routen der Governance); die Eingabe-Bereinigung kennt das Feld bewusst nicht.
function setAttachments(id, attachments) {
  const list = load(); const i = list.findIndex(m => m.id === id && !m.deletedAt)
  if (i < 0) return null
  list[i] = { ...list[i], attachments: Array.isArray(attachments) ? attachments : [], updatedAt: C.nowISO() }
  save(list)
  return list[i]
}

function del(id, deletedBy) {
  const list = load(); const i = list.findIndex(m => m.id === id && !m.deletedAt)
  if (i < 0) return false
  list[i].deletedAt = C.nowISO(); list[i].deletedBy = deletedBy || null; save(list)
  return true
}
function permanentDelete(id) {
  const list = load(); const i = list.findIndex(m => m.id === id)
  if (i < 0) return false
  list.splice(i, 1); save(list)
  return true
}
function restore(id) {
  const list = load(); const i = list.findIndex(m => m.id === id && m.deletedAt)
  if (i < 0) return null
  list[i].deletedAt = null; list[i].deletedBy = null; save(list)
  return list[i]
}
const getDeleted = () => load().filter(m => m.deletedAt)
const getSummary = () => C.summarize(load().filter(m => !m.deletedAt))
const getCalendarEvents = () => C.calendarEvents(load().filter(m => !m.deletedAt))

const _jsonExports = { getAll, getById, getAnyById, allIds, create, importRecord, update, setAttachments, delete: del, permanentDelete, restore, getDeleted, getSummary, getCalendarEvents, STATUSES: C.STATUSES }

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/measuresStore')
  _knex.init().catch(e => console.error('[measuresStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
