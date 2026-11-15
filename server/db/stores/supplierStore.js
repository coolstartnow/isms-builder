'use strict'

const { getDb, init: initDb } = require('../knexDatabase')
const triage = require('../supplierTriage')
const evidence = require('../../supplierEvidence')

function nowISO() { return new Date().toISOString() }
function makeId() { return `sup_${require('crypto').randomBytes(4).toString('hex')}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

function rowToSupplier(row) {
  if (!row) return null
  const d = _json(row.data, {})
  return {
    id: row.id, name: row.name, category: row.category,
    type: d.type || 'other', criticality: row.risk_level,
    status: row.status, contact: row.contact,
    country: d.country || '', contactName: d.contactName || '',
    contactEmail: d.contactEmail || '', website: d.website || '',
    description: d.description || '', products: d.products || '',
    dataAccess: d.dataAccess || false,
    dataCategories: d.dataCategories || [],
    securityRequirements: d.securityRequirements || [],
    lastAuditDate: d.lastAuditDate || '', nextAuditDate: row.next_audit || '',
    evidenceUrl: d.evidenceUrl || '', evidenceLabel: d.evidenceLabel || '', evidenceValidUntil: d.evidenceValidUntil || '',
    auditResult: d.auditResult || 'not_scheduled',
    contractId: d.contractId || '', avContractId: d.avContractId || '',
    riskScore: d.riskScore || 0,
    notes: row.notes, linkedControls: _json(row.linked_controls, []),
    linkedPolicies: d.linkedPolicies || [],
    applicableEntities: _json(row.applicable_entities, []),
    contractEnd: row.contract_end || '',
    deletedBy: d.deletedBy || '', updatedBy: d.updatedBy || '',
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at || null,
    triage: triage.normalizeTriage(d.triage),
  }
}

function _withTriageResult(item) {
  if (!item) return item
  return { ...item, triageResult: triage.computeTriageResult(item.triage) }
}

function packData(s) {
  return JSON.stringify({
    type: s.type, country: s.country, contactName: s.contactName,
    contactEmail: s.contactEmail, website: s.website,
    description: s.description, products: s.products,
    dataAccess: s.dataAccess, dataCategories: s.dataCategories || [],
    securityRequirements: s.securityRequirements || [],
    lastAuditDate: s.lastAuditDate, auditResult: s.auditResult,
    evidenceUrl: s.evidenceUrl || '', evidenceLabel: s.evidenceLabel || '', evidenceValidUntil: s.evidenceValidUntil || '',
    contractId: s.contractId, avContractId: s.avContractId,
    riskScore: s.riskScore, linkedPolicies: s.linkedPolicies || [],
    deletedBy: s.deletedBy || '', updatedBy: s.updatedBy || '',
    triage: s.triage,
  })
}

module.exports = {
  init: async () => { await initDb() },

  getAll: async ({ status, criticality, type, triage: triageFilter } = {}) => {
    const q = getDb()('suppliers').whereNull('deleted_at')
    if (status) q.where('status', status)
    if (criticality) q.where('risk_level', criticality)
    let list = (await q).map(rowToSupplier).map(_withTriageResult)
    if (type) list = list.filter(i => i.type === type)
    if (triageFilter) list = list.filter(i => i.triageResult.level === triageFilter)
    return list
  },

  getById: async (id) => {
    const row = await getDb()('suppliers').where('id', id).whereNull('deleted_at').first()
    return _withTriageResult(rowToSupplier(row))
  },

  create: async (fields, { createdBy } = {}) => {
    const id = makeId()
    const now = nowISO()
    const item = {
      id, name: fields.name || '', type: fields.type || 'other',
      criticality: fields.criticality || 'medium', status: fields.status || 'active',
      country: fields.country || '', contactName: fields.contactName || '',
      contactEmail: fields.contactEmail || '', website: fields.website || '',
      description: fields.description || '', products: fields.products || '',
      dataAccess: typeof fields.dataAccess === 'boolean' ? fields.dataAccess : !!fields.dataAccess,
      dataCategories: Array.isArray(fields.dataCategories) ? fields.dataCategories : [],
      securityRequirements: Array.isArray(fields.securityRequirements) ? fields.securityRequirements : [],
      lastAuditDate: fields.lastAuditDate || '', nextAuditDate: fields.nextAuditDate || '',
      evidenceUrl: evidence.clean(fields.evidenceUrl), evidenceLabel: evidence.clean(fields.evidenceLabel), evidenceValidUntil: evidence.clean(fields.evidenceValidUntil),
      auditResult: fields.auditResult || 'not_scheduled',
      contractId: fields.contractId || '', avContractId: fields.avContractId || '',
      riskScore: typeof fields.riskScore === 'number' ? fields.riskScore : (parseInt(fields.riskScore) || 0),
      notes: fields.notes || '',
      linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      contractEnd: fields.contractEnd || '',
      createdBy: createdBy || 'system',
      triage: triage.normalizeTriage(fields.triage),
    }
    await getDb()('suppliers').insert({
      id, name: item.name, category: item.type,
      contact: item.contactName, risk_level: item.criticality,
      status: item.status, contract_end: item.contractEnd || null,
      next_audit: item.nextAuditDate || null, notes: item.notes,
      applicable_entities: JSON.stringify(item.applicableEntities),
      linked_controls: JSON.stringify(item.linkedControls),
      data: packData(item), created_by: item.createdBy,
      created_at: now, updated_at: now,
    })
    return _withTriageResult({ ...item, createdAt: now, updatedAt: now, deletedAt: null })
  },

  update: async (id, patch, { changedBy } = {}) => {
    const row = await getDb()('suppliers').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const s = rowToSupplier(row)
    const allowed = ['name','type','criticality','status','country','contactName','contactEmail',
      'website','description','products','dataAccess','dataCategories','securityRequirements',
      'lastAuditDate','nextAuditDate','auditResult','contractId','avContractId',
      'riskScore','notes','linkedControls','linkedPolicies','applicableEntities','contractEnd']
    for (const k of allowed) {
      if (patch[k] !== undefined) s[k] = patch[k]
    }
    for (const k of evidence.FIELDS) {
      if (patch[k] !== undefined) s[k] = evidence.clean(patch[k])
    }
    if (patch.triage !== undefined) {
      s.triage = triage.normalizeTriage({ ...s.triage, ...patch.triage })
    }
    s.updatedAt = nowISO()
    if (changedBy) s.updatedBy = changedBy
    await getDb()('suppliers').where('id', id).update({
      name: s.name, category: s.type, contact: s.contactName,
      risk_level: s.criticality, status: s.status,
      contract_end: s.contractEnd || null, next_audit: s.nextAuditDate || null,
      notes: s.notes,
      applicable_entities: JSON.stringify(s.applicableEntities || []),
      linked_controls: JSON.stringify(s.linkedControls || []),
      data: packData(s), updated_at: s.updatedAt,
    })
    return _withTriageResult(s)
  },

  remove: async (id, { deletedBy } = {}) => {
    const row = await getDb()('suppliers').where('id', id).whereNull('deleted_at').first()
    if (!row) return false
    const d = _json(row.data, {})
    d.deletedBy = deletedBy || ''
    await getDb()('suppliers').where('id', id).update({
      deleted_at: nowISO(), data: JSON.stringify(d),
    })
    return true
  },

  permanentDelete: async (id) => {
    const affected = await getDb()('suppliers').where('id', id).del()
    return affected > 0
  },

  restore: async (id) => {
    const row = await getDb()('suppliers').where('id', id).first()
    if (!row) return null
    const d = _json(row.data, {})
    delete d.deletedBy
    await getDb()('suppliers').where('id', id).update({
      deleted_at: null, data: JSON.stringify(d), updated_at: nowISO(),
    })
    return rowToSupplier({ ...row, deleted_at: null })
  },

  getDeleted: async () => {
    const rows = await getDb()('suppliers').whereNotNull('deleted_at')
    return rows.map(rowToSupplier)
  },

  getSummary: async () => {
    const rows = await getDb()('suppliers').whereNull('deleted_at')
    const list = rows.map(rowToSupplier)
    const today = new Date().toISOString().slice(0, 10)
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    return {
      total: list.length,
      critical: list.filter(i => i.criticality === 'critical').length,
      byStatus: {
        active: list.filter(i => i.status === 'active').length,
        under_review: list.filter(i => i.status === 'under_review').length,
        inactive: list.filter(i => i.status === 'inactive').length,
        terminated: list.filter(i => i.status === 'terminated').length,
      },
      withDataAccess: list.filter(i => i.dataAccess).length,
      upcomingAudits: list.filter(i => i.nextAuditDate && i.nextAuditDate >= today && i.nextAuditDate <= in30).length,
      overdueAudits: list.filter(i => i.nextAuditDate && i.nextAuditDate < today).length,
      byTriageLevel: (() => {
        const levels = list.map(i => triage.computeTriageResult(i.triage).level)
        return {
          low: levels.filter(l => l === 'low').length,
          medium: levels.filter(l => l === 'medium').length,
          high: levels.filter(l => l === 'high').length,
        }
      })(),
      triageUnassessed: list.map(i => triage.computeTriageResult(i.triage).level).filter(l => l === 'unassessed').length,
    }
  },

  getUpcomingEvidenceExpiries: async (days = 60) => {
    const rows = await getDb()('suppliers').whereNull('deleted_at')
    return evidence.expiring(rows.map(rowToSupplier), days)
  },

  getUpcomingAudits: async (days = 30) => {
    const today = new Date().toISOString().slice(0, 10)
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
    const rows = await getDb()('suppliers').whereNull('deleted_at')
    return rows.map(rowToSupplier).filter(i => i.nextAuditDate && i.nextAuditDate >= today && i.nextAuditDate <= cutoff)
  },
}
