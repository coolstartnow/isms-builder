'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

function nowISO() { return new Date().toISOString() }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }
function _addDays(isoStr, days) { const d = new Date(isoStr); d.setDate(d.getDate() + days); return d.toISOString() }

const VVT_LEGAL_BASES = ['consent','contract','legal_obligation','vital_interests','public_task','legitimate_interest']
const VVT_STATUSES = ['draft','approved','archived']
const AV_STATUSES = ['draft','negotiation','signed','active','terminated']
const DSFA_STATUSES = ['draft','review','approved','archived']
const RESIDUAL_RISKS = ['low','medium','high','critical']
const DSFA_DECISIONS = ['proceed','modify','reject','']
const INCIDENT_TYPES = ['unauthorized_access','loss','deletion','theft','ransomware','other']
const INCIDENT_STATUSES = ['detected','contained','reported','closed']
const INCIDENT_RISKS = ['low','medium','high']
const DSAR_TYPES = ['access','rectification','erasure','restriction','portability','objection','review_automated']
const DSAR_STATUSES = ['received','in_progress','extended','completed','refused']
const { TOM_CATEGORIES, TOM_STATUSES } = require('../measuresCommon')

function rowToItem(row) {
  if (!row) return null
  return { id: row.id, ..._json(row.data, {}), createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at || null }
}

function _makeSubStore(type) {
  return {
    getAll: async ({ entity } = {}) => {
      const q = getDb()('gdpr_entries').where('gdpr_type', type).whereNull('deleted_at')
      let list = (await q).map(rowToItem)
      if (entity) list = list.filter(v => !v.applicableEntities?.length || v.applicableEntities.includes(entity))
      return list
    },
    getById: async (id) => {
      const row = await getDb()('gdpr_entries').where('id', id).where('gdpr_type', type).whereNull('deleted_at').first()
      return rowToItem(row)
    },
    _createEntry: async (id, item, createdBy) => {
      const now = nowISO()
      await getDb()('gdpr_entries').insert({ id, gdpr_type: type, data: JSON.stringify(item), created_by: createdBy || 'system', created_at: now, updated_at: now })
      return item
    },
    _updateEntry: async (id, fields, updatableKeys) => {
      const row = await getDb()('gdpr_entries').where('id', id).where('gdpr_type', type).first()
      if (!row) return null
      const item = rowToItem(row)
      for (const k of updatableKeys) { if (fields[k] !== undefined) item[k] = fields[k] }
      item.updatedAt = nowISO()
      await getDb()('gdpr_entries').where('id', id).update({ data: JSON.stringify(item), updated_at: item.updatedAt })
      return item
    },
    _deleteEntry: async (id, deletedBy) => {
      const row = await getDb()('gdpr_entries').where('id', id).where('gdpr_type', type).first()
      if (!row) return false
      const item = rowToItem(row)
      item.deletedAt = new Date().toISOString()
      item.deletedBy = deletedBy || null
      await getDb()('gdpr_entries').where('id', id).update({ deleted_at: nowISO(), data: JSON.stringify(item) })
      return true
    },
    _permanentDelete: async (id) => {
      const affected = await getDb()('gdpr_entries').where('id', id).where('gdpr_type', type).del()
      return affected > 0
    },
    _restore: async (id) => {
      const row = await getDb()('gdpr_entries').where('id', id).first()
      if (!row) return null
      const item = rowToItem(row)
      delete item.deletedAt
      delete item.deletedBy
      await getDb()('gdpr_entries').where('id', id).update({ deleted_at: null, data: JSON.stringify(item) })
      return rowToItem({ ...row, deleted_at: null })
    },
    _getDeleted: async () => {
      const rows = await getDb()('gdpr_entries').where('gdpr_type', type).whereNotNull('deleted_at')
      return rows.map(rowToItem)
    },
  }
}

const vvt = (() => {
  const base = _makeSubStore('vvt')
  return {
    getAll: base.getAll, getById: base.getById, getDeleted: base._getDeleted,
    create: async (fields, createdBy) => {
      const id = makeId('vvt')
      const item = {
        id, title: fields.title || 'Ohne Titel', purpose: fields.purpose || '',
        legalBasis: VVT_LEGAL_BASES.includes(fields.legalBasis) ? fields.legalBasis : 'contract',
        legalBasisNote: fields.legalBasisNote || '',
        dataCategories: Array.isArray(fields.dataCategories) ? fields.dataCategories : [],
        dataSubjectTypes: Array.isArray(fields.dataSubjectTypes) ? fields.dataSubjectTypes : [],
        recipients: Array.isArray(fields.recipients) ? fields.recipients : [],
        internationalTransfer: !!fields.internationalTransfer, transferMechanism: fields.transferMechanism || '',
        retentionPeriod: fields.retentionPeriod || '', retentionMonths: fields.retentionMonths ? parseInt(fields.retentionMonths) : null,
        deletionProcedure: fields.deletionProcedure || '',
        isHighRisk: !!fields.isHighRisk, automatedDecision: !!fields.automatedDecision,
        linkedAv: Array.isArray(fields.linkedAv) ? fields.linkedAv : [],
        linkedToms: Array.isArray(fields.linkedToms) ? fields.linkedToms : [],
        applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
        status: VVT_STATUSES.includes(fields.status) ? fields.status : 'draft',
        owner: fields.owner || '',
        linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
        linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
        createdBy: createdBy || 'system', createdAt: nowISO(), updatedAt: nowISO(),
      }
      return base._createEntry(id, item, createdBy)
    },
    update: async (id, fields) => {
      return base._updateEntry(id, fields, ['title','purpose','legalBasis','legalBasisNote','dataCategories','dataSubjectTypes',
        'recipients','internationalTransfer','transferMechanism','retentionPeriod','retentionMonths',
        'deletionProcedure','isHighRisk','automatedDecision','linkedAv','linkedToms',
        'applicableEntities','status','owner','linkedControls','linkedPolicies'])
    },
    delete: base._deleteEntry, permanentDelete: base._permanentDelete, restore: base._restore,
  }
})()

const av = (() => {
  const base = _makeSubStore('av')
  return {
    getAll: base.getAll, getById: base.getById, getDeleted: base._getDeleted,
    create: async (fields, createdBy) => {
      const id = makeId('av')
      const item = {
        id, title: fields.title || 'Ohne Titel',
        processorName: fields.processorName || '', processorCountry: fields.processorCountry || '',
        processorContactEmail: fields.processorContactEmail || '',
        processingScope: fields.processingScope || '',
        linkedVvt: Array.isArray(fields.linkedVvt) ? fields.linkedVvt : [],
        signatureDate: fields.signatureDate || null, effectiveUntil: fields.effectiveUntil || null,
        subProcessors: Array.isArray(fields.subProcessors) ? fields.subProcessors : [],
        status: AV_STATUSES.includes(fields.status) ? fields.status : 'draft',
        applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
        transferMechanism: fields.transferMechanism || '',
        art28Checklist: {
          instructionsOnly: !!(fields.art28Checklist?.instructionsOnly),
          confidentiality: !!(fields.art28Checklist?.confidentiality),
          security: !!(fields.art28Checklist?.security),
          subProcessorApproval: !!(fields.art28Checklist?.subProcessorApproval),
          assistanceRights: !!(fields.art28Checklist?.assistanceRights),
          deletionReturn: !!(fields.art28Checklist?.deletionReturn),
          auditRights: !!(fields.art28Checklist?.auditRights),
          cooperation: !!(fields.art28Checklist?.cooperation),
        },
        filePath: fields.filePath || null, filename: fields.filename || null,
        notes: fields.notes || '',
        linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
        linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
        createdBy: createdBy || 'system', createdAt: nowISO(), updatedAt: nowISO(),
      }
      return base._createEntry(id, item, createdBy)
    },
    update: async (id, fields) => {
      return base._updateEntry(id, fields, ['title','processorName','processorCountry','processorContactEmail','processingScope',
        'linkedVvt','signatureDate','effectiveUntil','subProcessors','status',
        'applicableEntities','transferMechanism','art28Checklist','notes','filePath','filename',
        'linkedControls','linkedPolicies'])
    },
    delete: base._deleteEntry, permanentDelete: base._permanentDelete, restore: base._restore,
  }
})()

const dsfa = (() => {
  const base = _makeSubStore('dsfa')
  return {
    getAll: base.getAll, getById: base.getById, getDeleted: base._getDeleted,
    create: async (fields, createdBy) => {
      const id = makeId('dsfa')
      const item = {
        id, title: fields.title || 'Ohne Titel', linkedVvtId: fields.linkedVvtId || '',
        processingDescription: fields.processingDescription || '',
        necessityAssessment: fields.necessityAssessment || '',
        risks: Array.isArray(fields.risks) ? fields.risks : [],
        existingControls: fields.existingControls || '',
        residualRisk: RESIDUAL_RISKS.includes(fields.residualRisk) ? fields.residualRisk : 'medium',
        dpoConsulted: !!fields.dpoConsulted, dpoOpinion: fields.dpoOpinion || '',
        saConsultationRequired: !!fields.saConsultationRequired,
        decision: DSFA_DECISIONS.includes(fields.decision) ? fields.decision : '',
        decisionJustification: fields.decisionJustification || '',
        applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
        status: DSFA_STATUSES.includes(fields.status) ? fields.status : 'draft',
        owner: fields.owner || '', approvedBy: fields.approvedBy || null, approvedAt: fields.approvedAt || null,
        linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
        linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
        createdBy: createdBy || 'system', createdAt: nowISO(), updatedAt: nowISO(),
      }
      return base._createEntry(id, item, createdBy)
    },
    update: async (id, fields) => {
      return base._updateEntry(id, fields, ['title','linkedVvtId','processingDescription','necessityAssessment','risks',
        'existingControls','residualRisk','dpoConsulted','dpoOpinion',
        'saConsultationRequired','decision','decisionJustification',
        'applicableEntities','status','owner','approvedBy','approvedAt',
        'linkedControls','linkedPolicies'])
    },
    delete: base._deleteEntry, permanentDelete: base._permanentDelete, restore: base._restore,
  }
})()

const incidents = (() => {
  const base = _makeSubStore('incident')
  return {
    getAll: base.getAll, getById: base.getById, getDeleted: base._getDeleted,
    create: async (fields, createdBy) => {
      const id = makeId('inc')
      const item = {
        id, title: fields.title || 'Datenpanne',
        discoveredAt: fields.discoveredAt || nowISO(),
        incidentType: INCIDENT_TYPES.includes(fields.incidentType) ? fields.incidentType : 'other',
        dataCategories: Array.isArray(fields.dataCategories) ? fields.dataCategories : [],
        dataSubjectTypes: Array.isArray(fields.dataSubjectTypes) ? fields.dataSubjectTypes : [],
        estimatedAffected: fields.estimatedAffected ? parseInt(fields.estimatedAffected) : null,
        containmentMeasures: fields.containmentMeasures || '', rootCause: fields.rootCause || '',
        riskLevel: INCIDENT_RISKS.includes(fields.riskLevel) ? fields.riskLevel : 'medium',
        saNotificationRequired: !!fields.saNotificationRequired,
        saNotifiedAt: fields.saNotifiedAt || null, saReference: fields.saReference || '',
        dsNotificationRequired: !!fields.dsNotificationRequired,
        dsNotifiedAt: fields.dsNotifiedAt || null,
        remediationMeasures: fields.remediationMeasures || '',
        linkedVvt: Array.isArray(fields.linkedVvt) ? fields.linkedVvt : [],
        applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
        status: INCIDENT_STATUSES.includes(fields.status) ? fields.status : 'detected',
        reportedBy: createdBy || 'system', createdAt: nowISO(), updatedAt: nowISO(),
      }
      return base._createEntry(id, item, createdBy)
    },
    update: async (id, fields) => {
      return base._updateEntry(id, fields, ['title','discoveredAt','incidentType','dataCategories','dataSubjectTypes',
        'estimatedAffected','containmentMeasures','rootCause','riskLevel',
        'saNotificationRequired','saNotifiedAt','saReference',
        'dsNotificationRequired','dsNotifiedAt','remediationMeasures',
        'linkedVvt','applicableEntities','status'])
    },
    delete: base._deleteEntry, permanentDelete: base._permanentDelete, restore: base._restore,
  }
})()

const dsar = (() => {
  const base = _makeSubStore('dsar')
  return {
    getAll: base.getAll, getById: base.getById, getDeleted: base._getDeleted,
    create: async (fields, createdBy) => {
      const id = makeId('dsar')
      const receivedAt = fields.receivedAt || nowISO()
      const deadline = _addDays(receivedAt, 30)
      const item = {
        id, requestType: DSAR_TYPES.includes(fields.requestType) ? fields.requestType : 'access',
        dataSubjectName: fields.dataSubjectName || '', dataSubjectEmail: fields.dataSubjectEmail || '',
        receivedAt, deadline, extendedDeadline: null,
        identityVerified: !!fields.identityVerified,
        affectedVvt: Array.isArray(fields.affectedVvt) ? fields.affectedVvt : [],
        response: fields.response || '',
        status: DSAR_STATUSES.includes(fields.status) ? fields.status : 'received',
        refusalReason: fields.refusalReason || '',
        completedAt: fields.completedAt || null,
        handledBy: fields.handledBy || createdBy || '',
        applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
        createdAt: nowISO(), updatedAt: nowISO(),
      }
      return base._createEntry(id, item, createdBy)
    },
    update: async (id, fields) => {
      const row = await getDb()('gdpr_entries').where('id', id).where('gdpr_type', 'dsar').first()
      if (!row) return null
      const item = rowToItem(row)
      const updatable = ['requestType','dataSubjectName','dataSubjectEmail','receivedAt','deadline',
        'extendedDeadline','identityVerified','affectedVvt','response','status',
        'refusalReason','completedAt','handledBy','applicableEntities']
      for (const k of updatable) { if (fields[k] !== undefined) item[k] = fields[k] }
      if (fields.status === 'extended' && !item.extendedDeadline) item.extendedDeadline = _addDays(item.receivedAt, 90)
      if (fields.status === 'completed' && !item.completedAt) item.completedAt = nowISO()
      item.updatedAt = nowISO()
      await getDb()('gdpr_entries').where('id', id).update({ data: JSON.stringify(item), updated_at: item.updatedAt })
      return item
    },
    delete: base._deleteEntry, permanentDelete: base._permanentDelete, restore: base._restore,
  }
})()

// TOMs: Sicht auf das Maßnahmen-Register (Maßnahmen mit Kennzeichen tom) – siehe ../tomsFacade.js (1.80)
const toms = require('../tomsFacade')

const dsb = {
  get: async () => {
    const row = await getDb()('gdpr_entries').where('gdpr_type', 'dsb').first()
    if (!row) return {}
    return _json(row.data, {})
  },
  update: async (fields) => {
    const row = await getDb()('gdpr_entries').where('gdpr_type', 'dsb').first()
    const current = row ? _json(row.data, {}) : {}
    const updatable = ['type','name','email','phone','appointmentDate','contractEnd','notes','filePath','filename']
    for (const k of updatable) { if (fields[k] !== undefined) current[k] = fields[k] }
    current.updatedAt = nowISO()
    if (row) {
      await getDb()('gdpr_entries').where('id', row.id).update({ data: JSON.stringify(current), updated_at: nowISO() })
    } else {
      const id = 'dsb_singleton'
      await getDb()('gdpr_entries').insert({ id, gdpr_type: 'dsb', data: JSON.stringify(current), created_by: 'system', created_at: nowISO(), updated_at: nowISO() })
    }
    return current
  },
}

const deletionLog = {
  getAll: async () => {
    const rows = await getDb()('gdpr_deletion_log')
    return rows.map(r => _json(r.data, {}))
  },
  getDue: async () => {
    const vvtRows = (await getDb()('gdpr_entries').where('gdpr_type', 'vvt').whereNull('deleted_at')).map(rowToItem)
    const loggedRows = await getDb()('gdpr_deletion_log')
    const logged = new Set(loggedRows.map(r => _json(r.data, {}).vvtId))
    const now = new Date()
    return vvtRows.filter(v => {
      if (!v.retentionMonths || logged.has(v.id)) return false
      const created = new Date(v.createdAt || now)
      const due = new Date(created.getTime() + v.retentionMonths * 30 * 86400000)
      return due <= now
    }).map(v => {
      const created = new Date(v.createdAt || now)
      const due = new Date(created.getTime() + v.retentionMonths * 30 * 86400000)
      return { ...v, deletionDue: due.toISOString().slice(0, 10) }
    })
  },
  getUpcoming: async (daysAhead = 90) => {
    const vvtRows = (await getDb()('gdpr_entries').where('gdpr_type', 'vvt').whereNull('deleted_at')).map(rowToItem)
    const loggedRows = await getDb()('gdpr_deletion_log')
    const logged = new Set(loggedRows.map(r => _json(r.data, {}).vvtId))
    const now = new Date()
    const cutoff = new Date(now.getTime() + daysAhead * 86400000)
    return vvtRows.filter(v => {
      if (!v.retentionMonths || logged.has(v.id)) return false
      const created = new Date(v.createdAt || now)
      const due = new Date(created.getTime() + v.retentionMonths * 30 * 86400000)
      return due > now && due <= cutoff
    }).map(v => {
      const created = new Date(v.createdAt || now)
      const due = new Date(created.getTime() + v.retentionMonths * 30 * 86400000)
      return { ...v, deletionDue: due.toISOString().slice(0, 10) }
    })
  },
  confirm: async (fields, confirmedBy) => {
    const id = makeId('del')
    const now = nowISO()
    const entry = {
      id, vvtId: fields.vvtId, vvtTitle: fields.vvtTitle || '',
      confirmedAt: now, confirmedBy: confirmedBy || 'system',
      method: fields.method || 'manual', evidence: fields.evidence || '', note: fields.note || '',
    }
    await getDb()('gdpr_deletion_log').insert({ id, data: JSON.stringify(entry), deleted_by: confirmedBy || 'system', deleted_at: now })
    return entry
  },
}

async function getSummary(entityId) {
  const opts = entityId ? { entity: entityId } : {}
  const vvtList = await vvt.getAll(opts)
  const avList = await av.getAll(opts)
  const dsaList = await dsar.getAll(opts)
  const incList = await incidents.getAll(opts)
  const tomList = await toms.getAll(opts)
  const dsbData = await dsb.get()
  const now = new Date()
  return {
    vvt: { total: vvtList.length, highRisk: vvtList.filter(v => v.isHighRisk).length, noLegal: vvtList.filter(v => !v.legalBasis).length },
    av: { active: avList.filter(a => a.status === 'active' || a.status === 'signed').length, total: avList.length },
    dsar: {
      open: dsaList.filter(d => !['completed','refused'].includes(d.status)).length,
      overdue: dsaList.filter(d => {
        if (['completed','refused'].includes(d.status)) return false
        const dl = d.extendedDeadline || d.deadline
        return dl && new Date(dl) < now
      }).length,
    },
    incidents: {
      open: incList.filter(i => !['closed'].includes(i.status)).length,
      missed72h: incList.filter(i => {
        if (i.status === 'closed' || !i.saNotificationRequired || i.saNotifiedAt) return false
        return (now - new Date(i.discoveredAt)) > 72 * 3600 * 1000
      }).length,
    },
    toms: { implemented: tomList.filter(t => t.status === 'implemented' || t.status === 'verified').length, total: tomList.length },
    dsbSet: !!(dsbData.name),
  }
}

module.exports = {
  init: async () => { await initDb() },
  vvt, av, dsfa, incidents, dsar, toms, dsb, deletionLog, getSummary,
  VVT_LEGAL_BASES, VVT_STATUSES, AV_STATUSES,
  DSFA_STATUSES, RESIDUAL_RISKS, INCIDENT_TYPES, INCIDENT_STATUSES,
  DSAR_TYPES, DSAR_STATUSES, TOM_CATEGORIES, TOM_STATUSES,
}
