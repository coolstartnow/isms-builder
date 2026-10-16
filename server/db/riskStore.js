// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'risks.json')

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}
function save(risks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(risks, null, 2))
}
function nowISO() { return new Date().toISOString() }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }

const CATEGORIES     = ['technical','organizational','physical','legal']
const TREATMENT_OPTS = ['accept','reduce','avoid','transfer']
const STATUSES       = ['open','in_treatment','accepted','closed']

const { riskLevel, calcScore, optRating, OPTIONAL_RATINGS, derivedRatings } = require('./riskScore')

function publicRisk(r) {
  const score = calcScore(r)
  return { ...r, ...derivedRatings(r), score, riskLevel: riskLevel(score) }
}

function getAll({ category, status, entity } = {}) {
  let list = load().filter(r => !r.deletedAt).map(publicRisk)
  if (category) list = list.filter(r => r.category === category)
  if (status)   list = list.filter(r => r.status   === status)
  if (entity)   list = list.filter(r => !r.applicableEntities?.length || r.applicableEntities.includes(entity))
  return list
}

function getById(id) {
  const r = load().find(r => r.id === id && !r.deletedAt)
  return r ? publicRisk(r) : null
}

function create(fields, createdBy) {
  const risks = load()
  const r = {
    id:                makeId('risk'),
    title:             fields.title             || 'Ohne Titel',
    description:       fields.description       || '',
    category:          CATEGORIES.includes(fields.category) ? fields.category : 'technical',
    threat:            fields.threat            || '',
    vulnerability:     fields.vulnerability     || '',
    probability:       Math.min(5, Math.max(1, parseInt(fields.probability) || 1)),
    impact:            Math.min(5, Math.max(1, parseInt(fields.impact)      || 1)),
    // Inherent- (vor Maßnahmen) und Zielbewertung (nach Maßnahmen), optional (#94)
    inherentProbability: optRating(fields.inherentProbability),
    inherentImpact:      optRating(fields.inherentImpact),
    targetProbability:   optRating(fields.targetProbability),
    targetImpact:        optRating(fields.targetImpact),
    treatmentOption:   TREATMENT_OPTS.includes(fields.treatmentOption) ? fields.treatmentOption : 'reduce',
    mitigationNotes:   fields.mitigationNotes   || '',
    owner:             fields.owner             || '',
    dueDate:           fields.dueDate           || null,
    reviewDate:        fields.reviewDate        || null,
    status:            STATUSES.includes(fields.status) ? fields.status : 'open',
    linkedControls:    Array.isArray(fields.linkedControls)   ? fields.linkedControls   : [],
    linkedTemplates:   Array.isArray(fields.linkedTemplates)  ? fields.linkedTemplates  : [],
    applicableEntities:Array.isArray(fields.applicableEntities)?fields.applicableEntities: [],
    treatmentPlans:    [],
    // Scanner-Import-Felder
    needsReview:       fields.needsReview === true,
    source:            fields.source     || null,
    scanRef:           fields.scanRef    || null,
    cvssScore:         fields.cvssScore  != null ? Number(fields.cvssScore) : null,
    cveIds:            Array.isArray(fields.cveIds) ? fields.cveIds : [],
    createdAt:         nowISO(),
    updatedAt:         nowISO(),
    createdBy:         createdBy || 'system'
  }
  risks.push(r)
  save(risks)
  return publicRisk(r)
}

function update(id, fields) {
  const risks = load()
  const idx = risks.findIndex(r => r.id === id)
  if (idx === -1) return null
  const r = risks[idx]
  const updatable = ['title','description','category','threat','vulnerability','probability',
                     'impact','treatmentOption','mitigationNotes','owner','dueDate','reviewDate','status',
                     'linkedControls','linkedTemplates','applicableEntities',
                     'needsReview','source','scanRef','cvssScore','cveIds']
  for (const k of updatable) {
    if (fields[k] !== undefined) r[k] = fields[k]
  }
  if (fields.probability) r.probability = Math.min(5, Math.max(1, parseInt(fields.probability) || 1))
  if (fields.impact)      r.impact      = Math.min(5, Math.max(1, parseInt(fields.impact)      || 1))
  for (const k of OPTIONAL_RATINGS) {
    if (fields[k] !== undefined) r[k] = optRating(fields[k])
  }
  r.updatedAt = nowISO()
  risks[idx] = r
  save(risks)
  return publicRisk(r)
}

function del(id, deletedBy) {
  const risks = load()
  const idx = risks.findIndex(r => r.id === id)
  if (idx === -1) return false
  risks[idx].deletedAt = nowISO()
  risks[idx].deletedBy = deletedBy || null
  save(risks)
  return true
}

function permanentDelete(id) {
  const risks = load()
  const idx = risks.findIndex(r => r.id === id)
  if (idx === -1) return false
  risks.splice(idx, 1)
  save(risks)
  return true
}

function restore(id) {
  const risks = load()
  const idx = risks.findIndex(r => r.id === id)
  if (idx === -1) return null
  risks[idx].deletedAt = null
  risks[idx].deletedBy = null
  save(risks)
  return publicRisk(risks[idx])
}

function getDeleted() {
  return load().filter(r => r.deletedAt).map(publicRisk)
}

// ── Scanner-Import: Review-Queue ──

function getReviewPending() {
  return load().filter(r => !r.deletedAt && r.needsReview).map(publicRisk)
}

function approve(id, approvedBy) {
  const risks = load()
  const idx = risks.findIndex(r => r.id === id)
  if (idx === -1) return null
  risks[idx].needsReview  = false
  risks[idx].approvedBy   = approvedBy || 'system'
  risks[idx].approvedAt   = nowISO()
  risks[idx].updatedAt    = nowISO()
  save(risks)
  return publicRisk(risks[idx])
}

// ── Treatment Plans ──

function addTreatment(riskId, fields, createdBy) {
  const risks = load()
  const r = risks.find(r => r.id === riskId)
  if (!r) return null
  const tp = {
    id:          makeId('tp'),
    title:       fields.title       || 'Maßnahme',
    description: fields.description || '',
    responsible: fields.responsible || '',
    dueDate:     fields.dueDate     || null,
    status:      ['open','in_progress','completed'].includes(fields.status) ? fields.status : 'open',
    createdAt:   nowISO(),
    updatedAt:   nowISO(),
    createdBy:   createdBy || 'system'
  }
  r.treatmentPlans = r.treatmentPlans || []
  r.treatmentPlans.push(tp)
  r.updatedAt = nowISO()
  save(risks)
  return tp
}

function updateTreatment(riskId, tpId, fields) {
  const risks = load()
  const r = risks.find(r => r.id === riskId)
  if (!r) return null
  const tp = (r.treatmentPlans || []).find(t => t.id === tpId)
  if (!tp) return null
  if (fields.title       !== undefined) tp.title       = fields.title
  if (fields.description !== undefined) tp.description = fields.description
  if (fields.responsible !== undefined) tp.responsible = fields.responsible
  if (fields.dueDate     !== undefined) tp.dueDate     = fields.dueDate
  if (fields.status      !== undefined) tp.status      = fields.status
  tp.updatedAt = nowISO()
  r.updatedAt  = nowISO()
  save(risks)
  return tp
}

function deleteTreatment(riskId, tpId) {
  const risks = load()
  const r = risks.find(r => r.id === riskId)
  if (!r) return false
  const before = (r.treatmentPlans || []).length
  r.treatmentPlans = (r.treatmentPlans || []).filter(t => t.id !== tpId)
  if (r.treatmentPlans.length === before) return false
  r.updatedAt = nowISO()
  save(risks)
  return true
}

// ── Calendar: all upcoming dates across risks + treatment plans ──
function getCalendarEvents() {
  const risks = load().filter(r => !r.deletedAt)
  const events = []
  for (const r of risks) {
    if (r.dueDate)    events.push({ date: r.dueDate,    type: 'risk_due',    label: `Fälligkeit: ${r.title}`,  riskId: r.id, riskTitle: r.title })
    if (r.reviewDate) events.push({ date: r.reviewDate, type: 'risk_review', label: `Review: ${r.title}`,      riskId: r.id, riskTitle: r.title })
    for (const tp of r.treatmentPlans || []) {
      if (tp.dueDate) events.push({ date: tp.dueDate, type: 'treatment_due', label: `Maßnahme: ${tp.title}`, riskId: r.id, riskTitle: r.title, tpId: tp.id })
    }
  }
  events.sort((a, b) => new Date(a.date) - new Date(b.date))
  return events
}

// ── Summary for reports ──
function getSummary() {
  const risks = load().filter(r => !r.deletedAt).map(publicRisk)
  const byLevel    = { low: 0, medium: 0, high: 0, critical: 0 }
  const byCategory = { technical: 0, organizational: 0, physical: 0, legal: 0 }
  const byStatus   = { open: 0, in_treatment: 0, accepted: 0, closed: 0 }
  let openTreatments = 0

  for (const r of risks) {
    byLevel[r.riskLevel]       = (byLevel[r.riskLevel]       || 0) + 1
    byCategory[r.category]     = (byCategory[r.category]     || 0) + 1
    byStatus[r.status]         = (byStatus[r.status]         || 0) + 1
    openTreatments += (r.treatmentPlans || []).filter(t => t.status !== 'completed').length
  }

  const top5 = [...risks].sort((a,b) => b.score - a.score).slice(0, 5)
  return { total: risks.length, byLevel, byCategory, byStatus, openTreatments, top5 }
}

const _jsonExports = { getAll, getById, create, update, delete: del, permanentDelete, restore, getDeleted, getReviewPending, approve, addTreatment, updateTreatment, deleteTreatment, getCalendarEvents, getSummary, CATEGORIES, TREATMENT_OPTS, STATUSES }

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/riskStore')
  _knex.init().catch(e => console.error('[riskStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
