// © 2026 Claude Hecker — ISMS Builder V 1.32 — AGPL-3.0
// Finding-Store — Audit-Feststellungen mit Maßnahmenplan
// Datenmodell gemäß internal_audit_report_rules.md (IST/SOLL/Risiko/Empfehlung)
'use strict'

const fs   = require('fs')
const path = require('path')

const _BASE     = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'findings.json')

function load()        { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] } }
function save(list)    { fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2)) }
function nowISO()      { return new Date().toISOString() }
function makeId()      { return `finding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }
function makeActId()   { return `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'observation']
const STATUSES   = ['open', 'in_progress', 'resolved', 'accepted']
const ACT_STATUS = ['open', 'in_progress', 'done']

// ── Referenznummer FIND-YYYY-NNNN ────────────────────────────────────────────
function nextRef() {
  const year = new Date().getFullYear()
  const all  = load()
  const thisYear = all.filter(f => f.ref && f.ref.startsWith(`FIND-${year}-`))
  const nums = thisYear.map(f => parseInt(f.ref.split('-')[2], 10)).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `FIND-${year}-${String(next).padStart(4, '0')}`
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function getAll({ status, severity, auditor } = {}) {
  let list = load().filter(f => !f.deletedAt)
  if (status)   list = list.filter(f => f.status   === status)
  if (severity) list = list.filter(f => f.severity === severity)
  if (auditor)  list = list.filter(f => f.auditor  === auditor)
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function getById(id) {
  return load().find(f => f.id === id && !f.deletedAt) || null
}

function create(fields, createdBy) {
  const list = load()
  const f = {
    id:               makeId(),
    ref:              nextRef(),
    title:            fields.title            || 'Neue Feststellung',
    severity:         SEVERITIES.includes(fields.severity) ? fields.severity : 'medium',
    status:           STATUSES.includes(fields.status)     ? fields.status   : 'open',
    // Feststellungsdetails (Pyramide: IST → SOLL → Risiko → Empfehlung)
    observation:      fields.observation      || '',   // IST-Zustand
    requirement:      fields.requirement      || '',   // SOLL-Zustand
    impact:           fields.impact           || '',   // Risiko/Auswirkung
    recommendation:   fields.recommendation   || '',   // Empfehlung des Auditors
    // Audit-Kontext
    auditor:          fields.auditor          || '',
    auditedArea:      fields.auditedArea      || '',
    auditPeriodFrom:  fields.auditPeriodFrom  || null,
    auditPeriodTo:    fields.auditPeriodTo    || null,
    // Verknüpfungen
    linkedControls:   Array.isArray(fields.linkedControls)  ? fields.linkedControls  : [],
    linkedPolicies:   Array.isArray(fields.linkedPolicies)  ? fields.linkedPolicies  : [],
    linkedRisks:      Array.isArray(fields.linkedRisks)     ? fields.linkedRisks     : [],
    // Maßnahmenplan
    actions:          [],
    // Metadaten
    createdAt:        nowISO(),
    updatedAt:        nowISO(),
    createdBy:        createdBy || 'system',
    deletedAt:        null,
    deletedBy:        null,
  }
  list.push(f)
  save(list)
  return f
}

function update(id, fields, updatedBy) {
  const list = load()
  const idx  = list.findIndex(f => f.id === id && !f.deletedAt)
  if (idx === -1) return null
  const f = list[idx]
  const allowed = ['title','severity','status','observation','requirement','impact',
                   'recommendation','auditor','auditedArea','auditPeriodFrom','auditPeriodTo',
                   'linkedControls','linkedPolicies','linkedRisks']
  for (const k of allowed) {
    if (fields[k] !== undefined) f[k] = fields[k]
  }
  if (fields.severity && !SEVERITIES.includes(fields.severity)) f.severity = 'medium'
  if (fields.status   && !STATUSES.includes(fields.status))     f.status   = 'open'
  f.updatedAt = nowISO()
  save(list)
  return f
}

function remove(id, deletedBy) {
  const list = load()
  const f = list.find(f => f.id === id && !f.deletedAt)
  if (!f) return false
  f.deletedAt = nowISO()
  f.deletedBy = deletedBy || 'system'
  save(list)
  return true
}

function permanentDelete(id) {
  const list = load()
  const idx  = list.findIndex(f => f.id === id)
  if (idx === -1) return false
  list.splice(idx, 1)
  save(list)
  return true
}

function restore(id) {
  const list = load()
  const f = list.find(f => f.id === id && f.deletedAt)
  if (!f) return null
  f.deletedAt = null
  f.deletedBy = null
  f.updatedAt = nowISO()
  save(list)
  return f
}

function getDeleted() {
  return load().filter(f => f.deletedAt)
}

// ── Maßnahmenplan (Actions) ───────────────────────────────────────────────────
function addAction(findingId, fields, updatedBy) {
  const list = load()
  const f    = list.find(f => f.id === findingId && !f.deletedAt)
  if (!f) return null
  const action = {
    id:          makeActId(),
    description: fields.description || '',
    responsible: fields.responsible || '',
    dueDate:     fields.dueDate     || null,
    status:      ACT_STATUS.includes(fields.status) ? fields.status : 'open',
    updatedAt:   nowISO(),
    updatedBy:   updatedBy || 'system',
  }
  f.actions = f.actions || []
  f.actions.push(action)
  f.updatedAt = nowISO()
  save(list)
  return action
}

function updateAction(findingId, actionId, fields, updatedBy) {
  const list = load()
  const f    = list.find(f => f.id === findingId && !f.deletedAt)
  if (!f) return null
  const action = (f.actions || []).find(a => a.id === actionId)
  if (!action) return null
  if (fields.description !== undefined) action.description = fields.description
  if (fields.responsible !== undefined) action.responsible = fields.responsible
  if (fields.dueDate     !== undefined) action.dueDate     = fields.dueDate
  if (fields.status && ACT_STATUS.includes(fields.status)) action.status = fields.status
  action.updatedAt = nowISO()
  action.updatedBy = updatedBy || 'system'
  f.updatedAt = nowISO()
  save(list)
  return action
}

function deleteAction(findingId, actionId) {
  const list = load()
  const f    = list.find(f => f.id === findingId && !f.deletedAt)
  if (!f) return false
  const before = (f.actions || []).length
  f.actions  = (f.actions || []).filter(a => a.id !== actionId)
  f.updatedAt = nowISO()
  save(list)
  return f.actions.length < before
}

// ── Summary für Dashboard/Reports ─────────────────────────────────────────────
function getSummary() {
  const list = load().filter(f => !f.deletedAt)
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, observation: 0 }
  const byStatus   = { open: 0, in_progress: 0, resolved: 0, accepted: 0 }
  for (const f of list) {
    if (bySeverity[f.severity] !== undefined) bySeverity[f.severity]++
    if (byStatus[f.status]     !== undefined) byStatus[f.status]++
  }
  const openActions = list.reduce((n, f) =>
    n + (f.actions || []).filter(a => a.status !== 'done').length, 0)
  const overdueActions = list.reduce((n, f) =>
    n + (f.actions || []).filter(a => a.status !== 'done' && a.dueDate && new Date(a.dueDate) < new Date()).length, 0)
  return {
    total: list.length,
    bySeverity,
    byStatus,
    openActions,
    overdueActions,
  }
}

// ── Autopurge (30-Tage-Regel, konsistent mit anderen Modulen) ─────────────────
function autopurge(days = 30) {
  const list    = load()
  const cutoff  = new Date(Date.now() - days * 86400000)
  const before  = list.length
  const cleaned = list.filter(f => !f.deletedAt || new Date(f.deletedAt) > cutoff)
  if (cleaned.length < before) save(cleaned)
  return before - cleaned.length
}

module.exports = {
  getAll, getById, create, update, remove, permanentDelete, restore, getDeleted,
  addAction, updateAction, deleteAction,
  getSummary, autopurge,
  SEVERITIES, STATUSES, ACT_STATUS,
}
