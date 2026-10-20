'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

function nowISO() { return new Date().toISOString() }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

const CATEGORIES     = ['technical','organizational','physical','legal']
const TREATMENT_OPTS = ['accept','reduce','avoid','transfer']
const STATUSES       = ['open','in_treatment','accepted','closed']

const { riskLevel, calcScore, optRating, OPTIONAL_RATINGS, derivedRatings } = require('../riskScore')
const { LINK_FIELDS, normalizeIds, matchesLinks } = require('../riskLinks')
const treatments = require('../riskTreatments')   // Behandlungen = Maßnahmen im Register mit Zuordnung zu diesem Risiko (1.80)

// `tps` = Behandlungen des Risikos aus dem Register (siehe riskTreatments.js)
function rowToRisk(row, tps) {
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
    linkedAssets:     normalizeIds(extra.linkedAssets),
    linkedAssetTypes: normalizeIds(extra.linkedAssetTypes),
    linkedSuppliers:  normalizeIds(extra.linkedSuppliers),
    applicableEntities: _json(row.applicable_entities, []),
    treatmentPlans: tps || [],
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
    linkedAssets: r.linkedAssets || [], linkedAssetTypes: r.linkedAssetTypes || [], linkedSuppliers: r.linkedSuppliers || [],
    needsReview: r.needsReview || false, source: r.source, scanRef: r.scanRef,
    cvssScore: r.cvssScore, cveIds: r.cveIds || [],
    approvedBy: r.approvedBy, approvedAt: r.approvedAt,
  })
}

module.exports = {
  init: async () => { await initDb() },

  getAll: async ({ category, status, entity, asset, assetType, supplier } = {}) => {
    const q = getDb()('risks').whereNull('deleted_at')
    if (category) q.where('category', category)
    if (status)   q.where('status', status)
    const rows = await q.orderBy('created_at', 'desc')
    const tpMap = await treatments.groupByRisk()
    let list = rows.map(row => rowToRisk(row, tpMap.get(row.id) || []))
    if (entity) list = list.filter(r => !r.applicableEntities?.length || r.applicableEntities.includes(entity))
    if (asset || assetType || supplier) list = list.filter(r => matchesLinks(r, { asset, assetType, supplier }))
    return list
  },

  getById: async (id) => {
    const row = await getDb()('risks').where('id', id).whereNull('deleted_at').first()
    return rowToRisk(row, row ? await treatments.forRisk(id) : [])
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
      linkedAssets: normalizeIds(fields.linkedAssets),
      linkedAssetTypes: normalizeIds(fields.linkedAssetTypes),
      linkedSuppliers: normalizeIds(fields.linkedSuppliers),
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
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
    const r = rowToRisk(row, await treatments.forRisk(id))
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
    for (const k of LINK_FIELDS) {
      if (fields[k] !== undefined) r[k] = normalizeIds(fields[k])
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
    if (affected > 0) await treatments.onRiskRemoved(id)   // Behandlungen verschwinden mit dem Risiko (Papierkorb), Zuordnungen entfallen
    return affected > 0
  },

  restore: async (id) => {
    const row = await getDb()('risks').where('id', id).first()
    if (!row) return null
    await getDb()('risks').where('id', id).update({ deleted_at: null, deleted_by: null, updated_at: nowISO() })
    return rowToRisk({ ...row, deleted_at: null, deleted_by: null }, await treatments.forRisk(id))
  },

  getDeleted: async () => {
    const rows = await getDb()('risks').whereNotNull('deleted_at').orderBy('deleted_at', 'desc')
    const tpMap = await treatments.groupByRisk()
    return rows.map(row => rowToRisk(row, tpMap.get(row.id) || []))
  },

  getReviewPending: async () => {
    const rows = await getDb()('risks').whereNull('deleted_at')
    const tpMap = await treatments.groupByRisk()
    return rows.map(row => rowToRisk(row, tpMap.get(row.id) || [])).filter(r => r.needsReview)
  },

  approve: async (id, approvedBy) => {
    const row = await getDb()('risks').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const r = rowToRisk(row, await treatments.forRisk(id))
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
    return treatments.add(riskId, fields, createdBy)
  },

  updateTreatment: async (riskId, tpId, fields, updatedBy) => {
    const row = await getDb()('risks').where('id', riskId).whereNull('deleted_at').first()
    if (!row) return null
    return treatments.update(riskId, tpId, fields, updatedBy)
  },

  deleteTreatment: async (riskId, tpId, deletedBy) => {
    const row = await getDb()('risks').where('id', riskId).whereNull('deleted_at').first()
    if (!row) return false
    return treatments.remove(riskId, tpId, deletedBy)
  },

  getCalendarEvents: async () => {
    const rows = await getDb()('risks').whereNull('deleted_at')
    const tpMap = await treatments.groupByRisk()
    const events = []
    for (const row of rows) {
      const r = rowToRisk(row, tpMap.get(row.id) || [])
      if (r.dueDate) events.push({ date: r.dueDate, type: 'risk_due', label: `Fälligkeit: ${r.title}`, riskId: r.id, riskTitle: r.title })
      if (r.reviewDate) events.push({ date: r.reviewDate, type: 'risk_review', label: `Review: ${r.title}`, riskId: r.id, riskTitle: r.title })
      for (const tp of r.treatmentPlans || []) {
        if (tp.dueDate && tp.status !== 'completed') events.push({ date: tp.dueDate, type: 'treatment_due', label: `Maßnahme: ${tp.title}`, riskId: r.id, riskTitle: r.title, tpId: tp.id })
      }
    }
    events.sort((a, b) => new Date(a.date) - new Date(b.date))
    return events
  },

  getSummary: async () => {
    const rows = await getDb()('risks').whereNull('deleted_at')
    const tpMap = await treatments.groupByRisk()
    const risks = rows.map(row => rowToRisk(row, tpMap.get(row.id) || []))
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
