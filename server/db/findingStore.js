// © 2026 Claude Hecker — ISMS Builder V 1.32.0 — AGPL-3.0
// Finding-Store — Audit-Feststellungen mit Maßnahmenplan
// Datenmodell gemäß internal_audit_report_rules.md (IST/SOLL/Risiko/Empfehlung)
'use strict'

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')

const _BASE     = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'findings.json')

function load()        { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] } }
function save(list)    { fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2)) }
function nowISO()      { return new Date().toISOString() }
function makeId()      { return `finding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }
function makeActId()   { return `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }

const actions = require('./findingActions')   // Maßnahmen der Feststellung = Maßnahmen im Register mit Zuordnung zu ihr (1.80)

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
// Maßnahmen der Feststellung (`actions`) stammen aus dem Register; ohne Angabe werden sie für diese Feststellung gelesen
const withActions = (f, acts) => (f ? { ...f, actions: acts !== undefined ? acts : actions.forFinding(f.id) } : f)

function getAll({ status, severity, auditor, auditId } = {}) {
  const actMap = actions.groupByFinding()
  let list = load().filter(f => !f.deletedAt).map(f => withActions(f, actMap.get(f.id) || []))
  if (status)   list = list.filter(f => f.status   === status)
  if (severity) list = list.filter(f => f.severity === severity)
  if (auditor)  list = list.filter(f => f.auditor  === auditor)
  if (auditId)  list = list.filter(f => f.auditId  === auditId)
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function getById(id) {
  return withActions(load().find(f => f.id === id && !f.deletedAt) || null)
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
    // Zuordnung zu einem Audit (Audit-Modul); sourceItemId = Prüfpunkt, aus dem das Finding entstand
    auditId:          typeof fields.auditId === 'string' && fields.auditId ? fields.auditId : null,
    sourceItemId:     typeof fields.sourceItemId === 'string' && fields.sourceItemId ? fields.sourceItemId : null,
    // Metadaten
    createdAt:        nowISO(),
    updatedAt:        nowISO(),
    createdBy:        createdBy || 'system',
    deletedAt:        null,
    deletedBy:        null,
  }
  list.push(f)
  save(list)
  return withActions(f, [])
}

function update(id, fields, updatedBy) {
  const list = load()
  const idx  = list.findIndex(f => f.id === id && !f.deletedAt)
  if (idx === -1) return null
  const f = list[idx]
  const allowed = ['title','severity','status','observation','requirement','impact',
                   'recommendation','auditor','auditedArea','auditPeriodFrom','auditPeriodTo',
                   'linkedControls','linkedPolicies','linkedRisks','auditId']
  for (const k of allowed) {
    if (fields[k] !== undefined) f[k] = fields[k]
  }
  if (f.auditId !== null && typeof f.auditId !== 'string') f.auditId = null
  if (f.auditId === '') f.auditId = null
  if (fields.severity && !SEVERITIES.includes(fields.severity)) f.severity = 'medium'
  if (fields.status   && !STATUSES.includes(fields.status))     f.status   = 'open'
  f.updatedAt = nowISO()
  save(list)
  return withActions(f)
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
  actions.onFindingRemoved(id)   // Maßnahmen verschwinden mit der Feststellung (Papierkorb), Zuordnungen entfallen
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
  return withActions(f)
}

function getDeleted() {
  return load().filter(f => f.deletedAt).map(f => withActions(f))
}

// ── Maßnahmenplan (Actions) ───────────────────────────────────────────────────
const liveFinding = id => load().find(f => f.id === id && !f.deletedAt)

function addAction(findingId, fields, updatedBy) {
  if (!liveFinding(findingId)) return null
  return actions.add(findingId, fields, updatedBy)
}

function updateAction(findingId, actionId, fields, updatedBy) {
  if (!liveFinding(findingId)) return null
  return actions.update(findingId, actionId, fields, updatedBy)
}

function deleteAction(findingId, actionId, deletedBy) {
  if (!liveFinding(findingId)) return false
  return actions.remove(findingId, actionId, deletedBy)
}

// ── Summary für Dashboard/Reports ─────────────────────────────────────────────
function getSummary() {
  const actMap = actions.groupByFinding()
  const list = load().filter(f => !f.deletedAt).map(f => withActions(f, actMap.get(f.id) || []))
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

const _jsonExports = {
  getAll, getById, create, update, remove, permanentDelete, restore, getDeleted,
  addAction, updateAction, deleteAction,
  getSummary, autopurge,
  SEVERITIES, STATUSES, ACT_STATUS,
}

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/findingStore')
  _knex.init().catch(e => console.error('[findingStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
