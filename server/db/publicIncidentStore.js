// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

// Public Incident Store – Vorfall-Meldungen ohne Login (Login-Seite)
// Persistenz: data/public-incidents.json


const fs   = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DB_FILE = path.join(_BASE, 'public-incidents.json')

function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) } catch { return [] }
}
function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

function nextRefNumber(list) {
  const year = new Date().getFullYear()
  const prefix = `INC-${year}-`
  const maxSeq = list
    .filter(i => i.refNumber && i.refNumber.startsWith(prefix))
    .map(i => parseInt(i.refNumber.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

const INCIDENT_TYPES = [
  'malware', 'phishing', 'data_theft', 'ransomware',
  'unauthorized_access', 'social_engineering', 'other'
]

const CLEANED_UP_VALUES = ['yes', 'no', 'partial']

function getAll({ status } = {}) {
  let list = load().filter(i => !i.deletedAt)
  if (status) list = list.filter(i => i.status === status)
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function getById(id) {
  return load().find(i => i.id === id && !i.deletedAt) || null
}

function create(data) {
  const list = load()
  const incident = {
    id:           randomUUID(),
    refNumber:    nextRefNumber(list),
    createdAt:    new Date().toISOString(),
    status:       'new',
    // Melder-Felder
    email:        (data.email        || '').trim(),
    entityName:   (data.entityName   || '').trim(),
    incidentType: INCIDENT_TYPES.includes(data.incidentType) ? data.incidentType : 'other',
    description:  (data.description  || '').trim(),
    measuresTaken:(data.measuresTaken|| '').trim(),
    localContact: (data.localContact || '').trim(),
    cleanedUp:    CLEANED_UP_VALUES.includes(data.cleanedUp) ? data.cleanedUp : 'no',
    // CISO-Felder (initial leer)
    assignedTo:   null,   // 'it' | 'datenschutz'
    reportable:   null,   // 'yes' | 'no' | 'tbd'
    cisoNotes:    '',
    updatedAt:    null,
    updatedBy:    null,
  }
  list.push(incident)
  save(list)
  return incident
}

function update(id, patch, updatedBy) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx === -1) return null
  // 'art23' trägt die NIS2-Meldefristen (siehe server/db/art23.js)
  const allowed = ['status', 'assignedTo', 'reportable', 'cisoNotes', 'art23']
  allowed.forEach(k => { if (k in patch) list[idx][k] = patch[k] })
  list[idx].updatedAt = new Date().toISOString()
  list[idx].updatedBy = updatedBy || null
  save(list)
  return list[idx]
}

function del(id, deletedBy) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx === -1) return false
  list[idx].deletedAt = new Date().toISOString()
  list[idx].deletedBy = deletedBy || null
  save(list)
  return true
}

function permanentDelete(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx === -1) return false
  list.splice(idx, 1)
  save(list)
  return true
}

function restore(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx === -1) return null
  list[idx].deletedAt = null
  list[idx].deletedBy = null
  save(list)
  return list[idx]
}

function getDeleted() {
  return load().filter(i => i.deletedAt)
}

// Keep remove as alias for permanentDelete for backward compatibility
const remove = permanentDelete

const _jsonExports = { getAll, getById, create, update, delete: del, permanentDelete, restore, getDeleted, remove, INCIDENT_TYPES }

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/publicIncidentStore')
  _knex.init().catch(e => console.error('[publicIncidentStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
