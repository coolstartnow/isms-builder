'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

function nowISO() { return new Date().toISOString() }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

const CATEGORIES     = ['technical','organizational','physical','legal']
const TREATMENT_OPTS = ['accept','reduce','avoid','transfer']
const STATUSES       = ['open','in_treatment','accepted','closed']

const { riskLevel, calcScore, optRating, OPTIONAL_RATINGS, derivedRatings } = require('../riskScore')

function rowToRisk(row) {
  if (!row) return null
  const extra = _json(row.treatments, {})
  const score = calcScore({ probability: row.likelihood, impact: row.impact })
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    threat: extra.threat || '',
    vulnerability: extra.vulnerability || '',
    probability: row.likelihood,
    impact: row.impact,
    inherentProbability: optRating(extra.inherentProbability),
    inherentImpact:      optRating(extra.inherentImpact),
    targetProbability:   optRating(extra.targetProbability),
    targetImpact:        optRating(extra.targetImpact),
    treatmentOption: extra.treatmentOption || 'reduce',
    mitigationNotes: extra.mitigationNotes || '',
    owner: row.owner,
    dueDate: extra.dueDate || null,
    reviewDate: extra.reviewDate || null,
    status: row.status,
    linkedControls: extra.linkedControls || [],
    linkedTemplates: extra.linkedTemplates || [],
    applicableEntities: _json(row.applicable_entities, []),
    treatmentPlans: extra.treatmentPlans || [],
    needsReview: extra.needsReview || false,
    source: extra.source || null,
    scanRef: extra.scanRef || null,
    cvssScore: extra.cvssScore != null ? extra.cvssScore : null,
    cveIds: extra.cveIds || [],
    deletedBy: row.deleted_by || null,
    approvedBy: extra.approvedBy || null,
    approvedAt: extra.approvedAt || null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
    ...derivedRatings({
      inherentProbability: extra.inherentProbability, inherentImpact: extra.inherentImpact,
      targetProbability:   extra.targetProbability,   targetImpact:   extra.targetImpact,
    }),
    score,
    riskLevel: riskLevel(score),
  }
}

function packExtra(r) {
  return JSON.stringify({
    threat: r.threat, vulnerability: r.vulnerability,
    inherentProbability: r.inherentProbability ?? null, inherentImpact: r.inherentImpact ?? null,
    targetProbability: r.targetProbability ?? null, targetImpact: r.targetImpact ?? null,
    treatmentOption: r.treatmentOption, mitigationNotes: r.mitigationNotes,
    dueDate: r.dueDate, reviewDate: r.reviewDate,
    linkedControls: r.linkedControls || [], linkedTemplates: r.linkedTemplates || [],
    treatmentPlans: r.treatmentPlans || [],
    needsReview: r.needsReview || false, source: r.source, scanRef: r.scanRef,
    cvssScore: r.cvssScore, cveIds: r.cveIds || [],
    approvedBy: r.approvedBy, approvedAt: r.approvedAt,
  })
}

module.exports = {
  init: async () => { await initDb() },

  getAll: async ({ category, status, entity } = {}) => {
    const q = getDb()('risks').whereNull('deleted_at')
    if (category) q.where('category', category)
    if (status)   q.where('status', status)
    const rows = await q.orderBy('created_at', 'desc')
    let list = rows.map(rowToRisk)
    if (entity) list = list.filter(r => !r.applicableEntities?.length || r.applicableEntities.includes(entity))
    return list
  },

  getById: async (id) => {
    const row = await getDb()('risks').where('id', id).whereNull('deleted_at').first()
    return rowToRisk(row)
  },

  create: async (fields, createdBy) => {
    const probability = Math.min(5, Math.max(1, parseInt(fields.probability) || 1))
    const impact = Math.min(5, Math.max(1, parseInt(fields.impact) || 1))
    const r = {
      id: makeId('risk'),
      title: fields.title || 'Ohne Titel',
      description: fields.description || '',
      category: CATEGORIES.includes(fields.category) ? fields.category : 'technical',
      threat: fields.threat || '',
      vulnerability: fields.vulnerability || '',
      probability,
      impact,
      inherentProbability: optRating(fields.inherentProbability),
      inherentImpact:      optRating(fields.inherentImpact),
      targetProbability:   optRating(fields.targetProbability),
      targetImpact:        optRating(fields.targetImpact),
      treatmentOption: TREATMENT_OPTS.includes(fields.treatmentOption) ? fields.treatmentOption : 'reduce',
      mitigationNotes: fields.mitigationNotes || '',
      owner: fields.owner || '',
      dueDate: fields.dueDate || null,
      reviewDate: fields.reviewDate || null,
      status: STATUSES.includes(fields.status) ? fields.status : 'open',
      linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedTemplates: Array.isArray(fields.linkedTemplates) ? fields.linkedTemplates : [],
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      treatmentPlans: [],
      needsReview: fields.needsReview === true,
      source: fields.source || null,
      scanRef: fields.scanRef || null,
      cvssScore: fields.cvssScore != null ? Number(fields.cvssScore) : null,
      cveIds: Array.isArray(fields.cveIds) ? fields.cveIds : [],
      createdBy: createdBy || 'system',
    }
    const score = calcScore(r)
    const now = nowISO()
    await getDb()('risks').insert({
      id: r.id, title: r.title, description: r.description,
      category: r.category, likelihood: r.probability, impact: r.impact,
      risk_score: score, status: r.status, owner: r.owner,
      applicable_entities: JSON.stringify(r.applicableEntities),
      treatments: packExtra(r),
      created_by: r.createdBy, created_at: now, updated_at: now,
    })
    return { ...r, ...derivedRatings(r), score, riskLevel: riskLevel(score), createdAt: now, updatedAt: now }
  },

  update: async (id, fields) => {
    const row = await getDb()('risks').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const r = rowToRisk(row)
    const updatable = ['title','description','category','threat','vulnerability','probability',
      'impact','treatmentOption','mitigationNotes','owner','dueDate','reviewDate','status',
      'linkedControls','linkedTemplates','applicableEntities',
      'needsReview','source','scanRef','cvssScore','cveIds']
    for (const k of updatable) {
      if (fields[k] !== undefined) r[k] = fields[k]
    }
    if (fields.probability) r.probability = Math.min(5, Math.max(1, parseInt(fields.probability) || 1))
    if (fields.impact) r.impact = Math.min(5, Math.max(1, parseInt(fields.impact) || 1))
    for (const k of OPTIONAL_RATINGS) {
      if (fields[k] !== undefined) r[k] = optRating(fields[k])
    }
    const now = nowISO()
    r.updatedAt = now
    const score = calcScore(r)
    await getDb()('risks').where('id', id).update({
      title: r.title, description: r.description, category: r.category,
      likelihood: r.probability, impact: r.impact, risk_score: score,
      status: r.status, owner: r.owner,
      applicable_entities: JSON.stringify(r.applicableEntities || []),
      treatments: packExtra(r), updated_at: now,
    })
    return { ...r, ...derivedRatings(r), score, riskLevel: riskLevel(score) }
  },

  delete: async (id, deletedBy) => {
    const affected = await getDb()('risks').where('id', id).whereNull('deleted_at')
      .update({ deleted_at: nowISO(), deleted_by: deletedBy || null })
    return affected > 0
  },

  permanentDelete: async (id) => {
    const affected = await getDb()('risks').where('id', id).del()
    return affected > 0
  },

  restore: async (id) => {
    const row = await getDb()('risks').where('id', id).first()
    if (!row) return null
    await getDb()('risks').where('id', id).update({ deleted_at: null, deleted_by: null, updated_at: nowISO() })
    return rowToRisk({ ...row, deleted_at: null, deleted_by: null })
  },

  getDeleted: async () => {
    const rows = await getDb()('risks').whereNotNull('deleted_at').orderBy('deleted_at', 'desc')
    return rows.map(rowToRisk)
  },

  getReviewPending: async () => {
    const rows = await getDb()('risks').whereNull('deleted_at')
    return rows.map(rowToRisk).filter(r => r.needsReview)
  },

  approve: async (id, approvedBy) => {
    const row = await getDb()('risks').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const r = rowToRisk(row)
    r.needsReview = false
    r.approvedBy = approvedBy || 'system'
    r.approvedAt = nowISO()
    r.updatedAt = nowISO()
    await getDb()('risks').where('id', id).update({
      treatments: packExtra(r), updated_at: r.updatedAt,
    })
    return r
  },

  addTreatment: async (riskId, fields, createdBy) => {
    const row = await getDb()('risks').where('id', riskId).whereNull('deleted_at').first()
    if (!row) return null
    const r = rowToRisk(row)
    const tp = {
      id: makeId('tp'),
      title: fields.title || 'Maßnahme',
      description: fields.description || '',
      responsible: fields.responsible || '',
      dueDate: fields.dueDate || null,
      status: ['open','in_progress','completed'].includes(fields.status) ? fields.status : 'open',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      createdBy: createdBy || 'system',
    }
    r.treatmentPlans = r.treatmentPlans || []
    r.treatmentPlans.push(tp)
    r.updatedAt = nowISO()
    await getDb()('risks').where('id', riskId).update({
      treatments: packExtra(r), updated_at: r.updatedAt,
    })
    return tp
  },

  updateTreatment: async (riskId, tpId, fields) => {
    const row = await getDb()('risks').where('id', riskId).whereNull('deleted_at').first()
    if (!row) return null
    const r = rowToRisk(row)
    const tp = (r.treatmentPlans || []).find(t => t.id === tpId)
    if (!tp) return null
    if (fields.title !== undefined) tp.title = fields.title
    if (fields.description !== undefined) tp.description = fields.description
    if (fields.responsible !== undefined) tp.responsible = fields.responsible
    if (fields.dueDate !== undefined) tp.dueDate = fields.dueDate
    if (fields.status !== undefined) tp.status = fields.status
    tp.updatedAt = nowISO()
    r.updatedAt = nowISO()
    await getDb()('risks').where('id', riskId).update({
      treatments: packExtra(r), updated_at: r.updatedAt,
    })
    return tp
  },

  deleteTreatment: async (riskId, tpId) => {
    const row = await getDb()('risks').where('id', riskId).whereNull('deleted_at').first()
    if (!row) return false
    const r = rowToRisk(row)
    const before = (r.treatmentPlans || []).length
    r.treatmentPlans = (r.treatmentPlans || []).filter(t => t.id !== tpId)
    if (r.treatmentPlans.length === before) return false
    r.updatedAt = nowISO()
    await getDb()('risks').where('id', riskId).update({
      treatments: packExtra(r), updated_at: r.updatedAt,
    })
    return true
  },

  getCalendarEvents: async () => {
    const rows = await getDb()('risks').whereNull('deleted_at')
    const events = []
    for (const row of rows) {
      const r = rowToRisk(row)
      if (r.dueDate) events.push({ date: r.dueDate, type: 'risk_due', label: `Fälligkeit: ${r.title}`, riskId: r.id, riskTitle: r.title })
      if (r.reviewDate) events.push({ date: r.reviewDate, type: 'risk_review', label: `Review: ${r.title}`, riskId: r.id, riskTitle: r.title })
      for (const tp of r.treatmentPlans || []) {
        if (tp.dueDate) events.push({ date: tp.dueDate, type: 'treatment_due', label: `Maßnahme: ${tp.title}`, riskId: r.id, riskTitle: r.title, tpId: tp.id })
      }
    }
    events.sort((a, b) => new Date(a.date) - new Date(b.date))
    return events
  },

  getSummary: async () => {
    const rows = await getDb()('risks').whereNull('deleted_at')
    const risks = rows.map(rowToRisk)
    const byLevel = { low: 0, medium: 0, high: 0, critical: 0 }
    const byCategory = { technical: 0, organizational: 0, physical: 0, legal: 0 }
    const byStatus = { open: 0, in_treatment: 0, accepted: 0, closed: 0 }
    let openTreatments = 0
    for (const r of risks) {
      byLevel[r.riskLevel] = (byLevel[r.riskLevel] || 0) + 1
      byCategory[r.category] = (byCategory[r.category] || 0) + 1
      byStatus[r.status] = (byStatus[r.status] || 0) + 1
      openTreatments += (r.treatmentPlans || []).filter(t => t.status !== 'completed').length
    }
    const top5 = [...risks].sort((a, b) => b.score - a.score).slice(0, 5)
    return { total: risks.length, byLevel, byCategory, byStatus, openTreatments, top5 }
  },

  CATEGORIES, TREATMENT_OPTS, STATUSES,
}
