// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'bcm.json')

function makeId(prefix) {
  return `${prefix}_${require('crypto').randomBytes(4).toString('hex')}`
}
function nowISO() { return new Date().toISOString() }

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return {
      bia:       Array.isArray(raw.bia)       ? raw.bia       : [],
      plans:     Array.isArray(raw.plans)     ? raw.plans     : [],
      exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
      requirements: Array.isArray(raw.requirements) ? raw.requirements : [],
      assessments:  Array.isArray(raw.assessments)  ? raw.assessments  : [],
    }
  } catch { return { bia: [], plans: [], exercises: [], requirements: [], assessments: [] } }
}

function save(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) }

// ─── BIA (Business Impact Analysis) ─────────────────────────────────────────

function getBia() {
  return load().bia.filter(b => !b.deletedAt)
}

function getBiaById(id) {
  return load().bia.find(b => b.id === id && !b.deletedAt) || null
}

function createBia(fields, { createdBy } = {}) {
  const data = load()
  const item = {
    id:               makeId('bia'),
    title:            fields.title            || 'Ohne Titel',
    processOwner:     fields.processOwner     || '',
    department:       fields.department       || '',
    criticality:      fields.criticality      || 'medium',
    rto:              typeof fields.rto === 'number'  ? fields.rto  : (parseFloat(fields.rto)  || 0),
    rpo:              typeof fields.rpo === 'number'  ? fields.rpo  : (parseFloat(fields.rpo)  || 0),
    mtpd:             typeof fields.mtpd === 'number' ? fields.mtpd : (parseFloat(fields.mtpd) || 0),
    dependencies:     Array.isArray(fields.dependencies)     ? fields.dependencies     : [],
    affectedSystems:  Array.isArray(fields.affectedSystems)  ? fields.affectedSystems  : [],
    status:           fields.status           || 'draft',
    lastReviewDate:   fields.lastReviewDate   || '',
    notes:            fields.notes            || '',
    entityId:         fields.entityId         || '',
    linkedControls:   Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies:   Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdAt:        nowISO(),
    updatedAt:        nowISO(),
    createdBy:        createdBy || 'system',
    deletedAt:        null,
  }
  data.bia.push(item)
  save(data)
  return item
}

function updateBia(id, patch, { changedBy } = {}) {
  const data = load()
  const idx  = data.bia.findIndex(b => b.id === id && !b.deletedAt)
  if (idx < 0) return null
  const allowed = ['title','processOwner','department','criticality','rto','rpo','mtpd',
    'dependencies','affectedSystems','status','lastReviewDate','notes','entityId',
    'linkedControls','linkedPolicies']
  for (const k of allowed) {
    if (patch[k] !== undefined) data.bia[idx][k] = patch[k]
  }
  data.bia[idx].updatedAt = nowISO()
  if (changedBy) data.bia[idx].updatedBy = changedBy
  save(data)
  return data.bia[idx]
}

function deleteBia(id) {
  const data = load()
  const idx  = data.bia.findIndex(b => b.id === id && !b.deletedAt)
  if (idx < 0) return false
  data.bia[idx].deletedAt = nowISO()
  save(data)
  return true
}

// ─── Plans (BCP/DRP) ─────────────────────────────────────────────────────────

function getPlans() {
  return load().plans.filter(p => !p.deletedAt)
}

function getPlanById(id) {
  return load().plans.find(p => p.id === id && !p.deletedAt) || null
}

function createPlan(fields, { createdBy } = {}) {
  const data = load()
  const item = {
    id:            makeId('bcp'),
    title:         fields.title         || 'Ohne Titel',
    type:          fields.type          || 'bcp',
    scope:         fields.scope         || '',
    planOwner:     fields.planOwner     || '',
    status:        fields.status        || 'draft',
    version:       fields.version       || '1.0',
    lastTested:    fields.lastTested    || '',
    nextTest:      fields.nextTest      || '',
    testResult:    fields.testResult    || 'not_tested',
    linkedBiaIds:  Array.isArray(fields.linkedBiaIds) ? fields.linkedBiaIds : [],
    procedures:    fields.procedures    || '',
    entityId:      fields.entityId      || '',
    linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdAt:     nowISO(),
    updatedAt:     nowISO(),
    createdBy:     createdBy || 'system',
    deletedAt:     null,
  }
  data.plans.push(item)
  save(data)
  return item
}

function updatePlan(id, patch, { changedBy } = {}) {
  const data = load()
  const idx  = data.plans.findIndex(p => p.id === id && !p.deletedAt)
  if (idx < 0) return null
  const allowed = ['title','type','scope','planOwner','status','version','lastTested',
    'nextTest','testResult','linkedBiaIds','procedures','entityId',
    'linkedControls','linkedPolicies']
  for (const k of allowed) {
    if (patch[k] !== undefined) data.plans[idx][k] = patch[k]
  }
  data.plans[idx].updatedAt = nowISO()
  if (changedBy) data.plans[idx].updatedBy = changedBy
  save(data)
  return data.plans[idx]
}

function deletePlan(id) {
  const data = load()
  const idx  = data.plans.findIndex(p => p.id === id && !p.deletedAt)
  if (idx < 0) return false
  data.plans[idx].deletedAt = nowISO()
  save(data)
  return true
}

// ─── Exercises ───────────────────────────────────────────────────────────────

function getExercises() {
  return load().exercises.filter(e => !e.deletedAt)
}

function getExerciseById(id) {
  return load().exercises.find(e => e.id === id && !e.deletedAt) || null
}

function createExercise(fields, { createdBy } = {}) {
  const data = load()
  const item = {
    id:            makeId('bex'),
    title:         fields.title         || 'Ohne Titel',
    type:          fields.type          || 'tabletop',
    date:          fields.date          || '',
    conductor:     fields.conductor     || '',
    participants:  Array.isArray(fields.participants) ? fields.participants : [],
    linkedPlanId:  fields.linkedPlanId  || '',
    result:        fields.result        || 'planned',
    scenario:      String(fields.scenario || '').slice(0, 8000),
    findings:      fields.findings      || '',
    actions:       fields.actions       || '',
    nextExercise:  fields.nextExercise  || '',
    linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdAt:     nowISO(),
    updatedAt:     nowISO(),
    createdBy:     createdBy || 'system',
    deletedAt:     null,
  }
  data.exercises.push(item)
  save(data)
  return item
}

function updateExercise(id, patch, { changedBy } = {}) {
  const data = load()
  const idx  = data.exercises.findIndex(e => e.id === id && !e.deletedAt)
  if (idx < 0) return null
  const allowed = ['title','type','date','conductor','participants','linkedPlanId',
    'result','scenario','findings','actions','nextExercise','linkedControls','linkedPolicies']
  for (const k of allowed) {
    if (patch[k] !== undefined) data.exercises[idx][k] = k === 'scenario' ? String(patch[k] || '').slice(0, 8000) : patch[k]
  }
  data.exercises[idx].updatedAt = nowISO()
  if (changedBy) data.exercises[idx].updatedBy = changedBy
  save(data)
  return data.exercises[idx]
}

function deleteExercise(id) {
  const data = load()
  const idx  = data.exercises.findIndex(e => e.id === id && !e.deletedAt)
  if (idx < 0) return false
  data.exercises[idx].deletedAt = nowISO()
  save(data)
  return true
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function getSummary() {
  const data      = load()
  const bia       = data.bia.filter(b => !b.deletedAt)
  const plans     = data.plans.filter(p => !p.deletedAt)
  const exercises = data.exercises.filter(e => !e.deletedAt)

  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  // BIA
  const biaCritical = bia.filter(b => b.criticality === 'critical').length
  const biaIds = new Set(bia.map(b => b.id))
  const linkedBiaIds = new Set(plans.flatMap(p => p.linkedBiaIds || []))
  const withoutPlan = bia.filter(b => !linkedBiaIds.has(b.id)).length

  // Plans
  const plansApproved  = plans.filter(p => p.status === 'approved' || p.status === 'tested').length
  const plansTested    = plans.filter(p => p.status === 'tested' || (p.testResult && p.testResult !== 'not_tested')).length
  const overdueTest    = plans.filter(p => p.nextTest && p.nextTest < today).length
  const nextTestSoon   = plans.filter(p => p.nextTest && p.nextTest >= today && p.nextTest <= in30).length

  // Exercises
  const upcoming    = exercises.filter(e => e.result === 'planned' && e.date && e.date >= today).length
  const pastResults = exercises.filter(e => e.result !== 'planned' && e.date && e.date < today)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const lastResult  = pastResults.length ? pastResults[0].result : null

  return {
    bia: {
      total:       bia.length,
      critical:    biaCritical,
      withoutPlan,
    },
    plans: {
      total:        plans.length,
      approved:     plansApproved,
      tested:       plansTested,
      overdueTest,
      nextTestSoon,
    },
    exercises: {
      total:      exercises.length,
      upcoming,
      lastResult,
    },
    requirements: require('../bcmRequirements').summarize(data.requirements, data.assessments),
  }
}

// ─── Anforderungen (Register einer BCM-Norm, z. B. ISO 22301) ────────────────
// Definitionen (importiert) und Bearbeitungsstand (je Anforderung) liegen getrennt: ein erneuter Import ändert den Stand nicht.
const reqKey = (framework, id) => `${framework}:${id}`

function getRequirements() { return load().requirements }

// Legt Definitionen an oder aktualisiert sie (nichts wird gelöscht). → { added, updated }
function upsertRequirements(rows, { importedBy } = {}) {
  const data = load()
  const index = new Map(data.requirements.map((r, i) => [reqKey(r.framework, r.id), i]))
  let added = 0, updated = 0
  const now = nowISO()
  for (const row of rows) {
    const k = reqKey(row.framework, row.id)
    if (index.has(k)) { data.requirements[index.get(k)] = { ...data.requirements[index.get(k)], ...row, retired: false, updatedAt: now }; updated++ }
    else { data.requirements.push({ ...row, retired: false, importedBy: importedBy || 'system', createdAt: now, updatedAt: now }); index.set(k, data.requirements.length - 1); added++ }
  }
  save(data)
  return { added, updated }
}

function getAssessments() { return load().assessments }

function setAssessment(framework, id, value, { changedBy } = {}) {
  const data = load()
  if (!data.requirements.some(r => r.framework === framework && r.id === id)) return null
  const rec = { ...value, framework, id, updatedAt: nowISO(), updatedBy: changedBy || 'system' }
  const i = data.assessments.findIndex(a => a.framework === framework && a.id === id)
  if (i >= 0) data.assessments[i] = rec; else data.assessments.push(rec)
  save(data)
  return rec
}

const _jsonExports = {
  getRequirements, upsertRequirements, getAssessments, setAssessment,
  getBia, getBiaById, createBia, updateBia, deleteBia,
  getPlans, getPlanById, createPlan, updatePlan, deletePlan,
  getExercises, getExerciseById, createExercise, updateExercise, deleteExercise,
  getSummary,
}

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/bcmStore')
  _knex.init().catch(e => console.error('[bcmStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
