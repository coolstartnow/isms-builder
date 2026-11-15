// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')
const trainingFiles = require('../trainingFiles')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'training.json')

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}
function save(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2))
}
function nowISO() { return new Date().toISOString() }
function makeId()  { return `training_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }

const CATEGORIES = ['security_awareness','iso27001','gdpr','technical','management','other']
const STATUSES   = ['planned','in_progress','completed','cancelled']

function isOverdue(item) {
  if (item.status === 'completed' || item.status === 'cancelled') return false
  if (!item.dueDate) return false
  return new Date(item.dueDate) < new Date()
}

function publicItem(item) {
  return { ...item, attachments: trainingFiles.publicAttachments(item.attachments), overdue: isOverdue(item) }
}

function getAll({ status, category, entity } = {}) {
  let list = load().filter(i => !i.deletedAt).map(publicItem)
  if (status)   list = list.filter(i => i.status   === status)
  if (category) list = list.filter(i => i.category === category)
  if (entity)   list = list.filter(i => !i.applicableEntities?.length || i.applicableEntities.includes(entity))
  return list
}

function getById(id) {
  const item = load().find(i => i.id === id && !i.deletedAt)
  return item ? publicItem(item) : null
}

function getSummary() {
  const list = load().filter(i => !i.deletedAt).map(publicItem)
  const total     = list.length
  const planned   = list.filter(i => i.status === 'planned').length
  const inProgress= list.filter(i => i.status === 'in_progress').length
  const completed = list.filter(i => i.status === 'completed').length
  const cancelled = list.filter(i => i.status === 'cancelled').length
  const overdue   = list.filter(i => i.overdue).length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, planned, inProgress, completed, cancelled, overdue, completionRate }
}

function create(fields, createdBy) {
  const list = load()
  const item = {
    id:                  makeId(),
    title:               fields.title               || 'Ohne Titel',
    description:         fields.description         || '',
    category:            CATEGORIES.includes(fields.category) ? fields.category : 'other',
    status:              STATUSES.includes(fields.status)     ? fields.status   : 'planned',
    dueDate:             fields.dueDate             || null,
    completedDate:       fields.completedDate       || null,
    instructor:          fields.instructor          || '',
    assignees:           fields.assignees           || '',
    applicableEntities:  Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
    evidence:            fields.evidence            || '',
    mandatory:           fields.mandatory           === true,
    linkedControls:      Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies:      Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdBy:           createdBy || 'system',
    createdAt:           nowISO(),
    updatedAt:           nowISO()
  }
  list.push(item)
  save(list)
  return publicItem(item)
}

function update(id, fields) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx < 0) return null
  const item = list[idx]
  const allowed = ['title','description','category','status','dueDate','completedDate','instructor','assignees','applicableEntities','evidence','mandatory','linkedControls','linkedPolicies']
  for (const k of allowed) {
    if (fields[k] !== undefined) item[k] = fields[k]
  }
  // Auto-set completedDate when status → completed
  if (fields.status === 'completed' && !item.completedDate) {
    item.completedDate = nowISO().slice(0, 10)
  }
  item.updatedAt = nowISO()
  save(list)
  return publicItem(item)
}

function del(id, deletedBy) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx < 0) return false
  list[idx].deletedAt = new Date().toISOString()
  list[idx].deletedBy = deletedBy || null
  save(list)
  return true
}

function permanentDelete(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx < 0) return false
  for (const a of list[idx].attachments || []) trainingFiles.removeFile(a.filename)
  list.splice(idx, 1)
  save(list)
  return true
}

function restore(id) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id)
  if (idx < 0) return null
  list[idx].deletedAt = null
  list[idx].deletedBy = null
  save(list)
  return publicItem(list[idx])
}

function getDeleted() {
  return load().filter(i => i.deletedAt).map(publicItem)
}

// Seed: falls Datei noch nicht existiert
if (!fs.existsSync(DATA_FILE)) {
  const seed = [
    {
      id: makeId(), title: 'Security Awareness Grundlagen', description: 'Jährliche Pflichtschulung für alle Mitarbeitenden.',
      category: 'security_awareness', status: 'planned',
      dueDate: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
      completedDate: null, instructor: 'IT-Security Team', assignees: 'Alle Mitarbeitenden',
      applicableEntities: [], evidence: '', mandatory: true,
      createdBy: 'system', createdAt: nowISO(), updatedAt: nowISO()
    },
    {
      id: makeId(), title: 'DSGVO-Schulung für neue Mitarbeitende', description: 'Einführung in Datenschutzpflichten gem. Art. 39 DSGVO.',
      category: 'gdpr', status: 'completed',
      dueDate: new Date(Date.now() - 10*86400000).toISOString().slice(0,10),
      completedDate: new Date(Date.now() - 12*86400000).toISOString().slice(0,10),
      instructor: 'Datenschutzbeauftragter', assignees: 'HR-Abteilung, neue MA Q1',
      applicableEntities: [], evidence: 'Teilnehmerliste und Attestat im SharePoint abgelegt.', mandatory: true,
      createdBy: 'system', createdAt: nowISO(), updatedAt: nowISO()
    },
    {
      id: makeId(), title: 'ISO 27001 Lead Auditor Zertifizierung', description: 'Externe Zertifizierungsschulung für ISMS-Verantwortliche.',
      category: 'iso27001', status: 'in_progress',
      dueDate: new Date(Date.now() + 60*86400000).toISOString().slice(0,10),
      completedDate: null, instructor: 'TÜV Rheinland', assignees: 'ISMS-Team (3 Personen)',
      applicableEntities: [], evidence: '', mandatory: false,
      createdBy: 'system', createdAt: nowISO(), updatedAt: nowISO()
    }
  ]
  save(seed)
}

// Anhänge: Metadaten am Datensatz; entfernte Anhänge werden nur markiert, die Datei bleibt erhalten (Nachweise)
function addAttachment(id, meta) {
  const list = load()
  const item = list.find(i => i.id === id && !i.deletedAt)
  if (!item) return null
  item.attachments = [...(item.attachments || []), meta]
  item.updatedAt = nowISO()
  save(list)
  return meta
}
function getAttachment(id, attId) {
  const item = load().find(i => i.id === id && !i.deletedAt)
  return (item && (item.attachments || []).find(a => a.id === attId && !a.removedAt)) || null
}
function removeAttachment(id, attId, by) {
  const list = load()
  const item = list.find(i => i.id === id && !i.deletedAt)
  const att = item && (item.attachments || []).find(a => a.id === attId && !a.removedAt)
  if (!att) return null
  att.removedAt = nowISO(); att.removedBy = by || null
  item.updatedAt = nowISO()
  save(list)
  return att
}

const _jsonExports = { addAttachment, getAttachment, removeAttachment, getAll, getById, getSummary, create, update, delete: del, permanentDelete, restore, getDeleted, CATEGORIES, STATUSES }

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/trainingStore')
  _knex.init().catch(e => console.error('[trainingStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
