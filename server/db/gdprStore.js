// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')

const DATA_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'gdpr')

function nowISO() { return new Date().toISOString() }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }

function loadFile(name) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')) } catch { return name === 'dsb.json' ? {} : [] }
}
function saveFile(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2))
}

// ── VVT (Verarbeitungsverzeichnis Art. 30) ──────────────────────────

const VVT_LEGAL_BASES = ['consent','contract','legal_obligation','vital_interests','public_task','legitimate_interest']
const VVT_STATUSES    = ['draft','approved','archived']

const vvt = {
  getAll({ entity } = {}) {
    let list = loadFile('vvt.json').filter(v => !v.deletedAt)
    if (entity) list = list.filter(v => !v.applicableEntities?.length || v.applicableEntities.includes(entity))
    return list
  },
  getById(id) {
    return loadFile('vvt.json').find(v => v.id === id && !v.deletedAt) || null
  },
  create(fields, createdBy) {
    const list = loadFile('vvt.json')
    const item = {
      id:                   makeId('vvt'),
      title:                fields.title                || 'Ohne Titel',
      purpose:              fields.purpose              || '',
      legalBasis:           VVT_LEGAL_BASES.includes(fields.legalBasis) ? fields.legalBasis : 'contract',
      legalBasisNote:       fields.legalBasisNote       || '',
      dataCategories:       Array.isArray(fields.dataCategories)    ? fields.dataCategories    : [],
      dataSubjectTypes:     Array.isArray(fields.dataSubjectTypes)  ? fields.dataSubjectTypes  : [],
      recipients:           Array.isArray(fields.recipients)        ? fields.recipients        : [],
      internationalTransfer: !!fields.internationalTransfer,
      transferMechanism:    fields.transferMechanism    || '',
      retentionPeriod:      fields.retentionPeriod      || '',
      retentionMonths:      fields.retentionMonths      ? parseInt(fields.retentionMonths) : null,
      deletionProcedure:    fields.deletionProcedure    || '',
      isHighRisk:           !!fields.isHighRisk,
      automatedDecision:    !!fields.automatedDecision,
      linkedAv:             Array.isArray(fields.linkedAv)    ? fields.linkedAv    : [],
      linkedToms:           Array.isArray(fields.linkedToms)  ? fields.linkedToms  : [],
      applicableEntities:   Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      status:               VVT_STATUSES.includes(fields.status) ? fields.status : 'draft',
      owner:                fields.owner   || '',
      linkedControls:       Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies:       Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      createdAt:            nowISO(),
      updatedAt:            nowISO(),
      createdBy:            createdBy || 'system'
    }
    list.push(item)
    saveFile('vvt.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('vvt.json')
    const idx  = list.findIndex(v => v.id === id)
    if (idx === -1) return null
    const item = list[idx]
    const updatable = ['title','purpose','legalBasis','legalBasisNote','dataCategories','dataSubjectTypes',
                       'recipients','internationalTransfer','transferMechanism','retentionPeriod','retentionMonths',
                       'deletionProcedure','isHighRisk','automatedDecision','linkedAv','linkedToms',
                       'applicableEntities','status','owner','linkedControls','linkedPolicies']
    for (const k of updatable) {
      if (fields[k] !== undefined) item[k] = fields[k]
    }
    item.updatedAt = nowISO()
    list[idx] = item
    saveFile('vvt.json', list)
    return item
  },
  delete(id, deletedBy) {
    const list = loadFile('vvt.json')
    const idx  = list.findIndex(v => v.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('vvt.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('vvt.json')
    const idx  = list.findIndex(v => v.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('vvt.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('vvt.json')
    const idx  = list.findIndex(v => v.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('vvt.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('vvt.json').filter(v => v.deletedAt)
  }
}

// ── AV-Verträge (Art. 28) ──────────────────────────────────────────

const AV_STATUSES = ['draft','negotiation','signed','active','terminated']

const av = {
  getAll({ entity } = {}) {
    let list = loadFile('av.json').filter(a => !a.deletedAt)
    if (entity) list = list.filter(a => !a.applicableEntities?.length || a.applicableEntities.includes(entity))
    return list
  },
  getById(id) {
    return loadFile('av.json').find(a => a.id === id && !a.deletedAt) || null
  },
  create(fields, createdBy) {
    const list = loadFile('av.json')
    const item = {
      id:                   makeId('av'),
      title:                fields.title                || 'Ohne Titel',
      processorName:        fields.processorName        || '',
      processorCountry:     fields.processorCountry     || '',
      processorContactEmail:fields.processorContactEmail|| '',
      processingScope:      fields.processingScope      || '',
      linkedVvt:            Array.isArray(fields.linkedVvt) ? fields.linkedVvt : [],
      signatureDate:        fields.signatureDate        || null,
      effectiveUntil:       fields.effectiveUntil       || null,
      subProcessors:        Array.isArray(fields.subProcessors) ? fields.subProcessors : [],
      status:               AV_STATUSES.includes(fields.status) ? fields.status : 'draft',
      applicableEntities:   Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      transferMechanism:    fields.transferMechanism    || '',
      art28Checklist: {
        instructionsOnly:     !!(fields.art28Checklist?.instructionsOnly),
        confidentiality:      !!(fields.art28Checklist?.confidentiality),
        security:             !!(fields.art28Checklist?.security),
        subProcessorApproval: !!(fields.art28Checklist?.subProcessorApproval),
        assistanceRights:     !!(fields.art28Checklist?.assistanceRights),
        deletionReturn:       !!(fields.art28Checklist?.deletionReturn),
        auditRights:          !!(fields.art28Checklist?.auditRights),
        cooperation:          !!(fields.art28Checklist?.cooperation)
      },
      filePath:             fields.filePath             || null,
      filename:             fields.filename             || null,
      notes:                fields.notes                || '',
      linkedControls:       Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies:       Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      createdAt:            nowISO(),
      updatedAt:            nowISO(),
      createdBy:            createdBy || 'system'
    }
    list.push(item)
    saveFile('av.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('av.json')
    const idx  = list.findIndex(a => a.id === id)
    if (idx === -1) return null
    const item = list[idx]
    const updatable = ['title','processorName','processorCountry','processorContactEmail','processingScope',
                       'linkedVvt','signatureDate','effectiveUntil','subProcessors','status',
                       'applicableEntities','transferMechanism','art28Checklist','notes','filePath','filename',
                       'linkedControls','linkedPolicies']
    for (const k of updatable) {
      if (fields[k] !== undefined) item[k] = fields[k]
    }
    item.updatedAt = nowISO()
    list[idx] = item
    saveFile('av.json', list)
    return item
  },
  delete(id, deletedBy) {
    const list = loadFile('av.json')
    const idx  = list.findIndex(a => a.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('av.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('av.json')
    const idx  = list.findIndex(a => a.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('av.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('av.json')
    const idx  = list.findIndex(a => a.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('av.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('av.json').filter(a => a.deletedAt)
  }
}

// ── DSFA (Art. 35) ─────────────────────────────────────────────────

const DSFA_STATUSES    = ['draft','review','approved','archived']
const RESIDUAL_RISKS   = ['low','medium','high','critical']
const DSFA_DECISIONS   = ['proceed','modify','reject','']

const dsfa = {
  getAll({ entity } = {}) {
    let list = loadFile('dsfa.json').filter(d => !d.deletedAt)
    if (entity) list = list.filter(d => !d.applicableEntities?.length || d.applicableEntities.includes(entity))
    return list
  },
  getById(id) {
    return loadFile('dsfa.json').find(d => d.id === id && !d.deletedAt) || null
  },
  create(fields, createdBy) {
    const list = loadFile('dsfa.json')
    const item = {
      id:                       makeId('dsfa'),
      title:                    fields.title                    || 'Ohne Titel',
      linkedVvtId:              fields.linkedVvtId              || '',
      processingDescription:    fields.processingDescription    || '',
      necessityAssessment:      fields.necessityAssessment      || '',
      risks:                    Array.isArray(fields.risks) ? fields.risks : [],
      existingControls:         fields.existingControls         || '',
      residualRisk:             RESIDUAL_RISKS.includes(fields.residualRisk) ? fields.residualRisk : 'medium',
      dpoConsulted:             !!fields.dpoConsulted,
      dpoOpinion:               fields.dpoOpinion               || '',
      saConsultationRequired:   !!fields.saConsultationRequired,
      decision:                 DSFA_DECISIONS.includes(fields.decision) ? fields.decision : '',
      decisionJustification:    fields.decisionJustification    || '',
      applicableEntities:       Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      status:                   DSFA_STATUSES.includes(fields.status) ? fields.status : 'draft',
      owner:                    fields.owner       || '',
      approvedBy:               fields.approvedBy  || null,
      approvedAt:               fields.approvedAt  || null,
      linkedControls:           Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies:           Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      createdAt:                nowISO(),
      updatedAt:                nowISO(),
      createdBy:                createdBy || 'system'
    }
    list.push(item)
    saveFile('dsfa.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('dsfa.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return null
    const item = list[idx]
    const updatable = ['title','linkedVvtId','processingDescription','necessityAssessment','risks',
                       'existingControls','residualRisk','dpoConsulted','dpoOpinion',
                       'saConsultationRequired','decision','decisionJustification',
                       'applicableEntities','status','owner','approvedBy','approvedAt',
                       'linkedControls','linkedPolicies']
    for (const k of updatable) {
      if (fields[k] !== undefined) item[k] = fields[k]
    }
    item.updatedAt = nowISO()
    list[idx] = item
    saveFile('dsfa.json', list)
    return item
  },
  delete(id, deletedBy) {
    const list = loadFile('dsfa.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('dsfa.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('dsfa.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('dsfa.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('dsfa.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('dsfa.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('dsfa.json').filter(d => d.deletedAt)
  }
}

// ── Incidents (Datenpannen Art. 33/34) ─────────────────────────────

const INCIDENT_TYPES    = ['unauthorized_access','loss','deletion','theft','ransomware','other']
const INCIDENT_STATUSES = ['detected','contained','reported','closed']
const INCIDENT_RISKS    = ['low','medium','high']

const incidents = {
  getAll({ entity } = {}) {
    let list = loadFile('incidents.json').filter(i => !i.deletedAt)
    if (entity) list = list.filter(i => !i.applicableEntities?.length || i.applicableEntities.includes(entity))
    return list
  },
  getById(id) {
    return loadFile('incidents.json').find(i => i.id === id && !i.deletedAt) || null
  },
  create(fields, createdBy) {
    const list = loadFile('incidents.json')
    const item = {
      id:                     makeId('inc'),
      title:                  fields.title                  || 'Datenpanne',
      discoveredAt:           fields.discoveredAt           || nowISO(),
      incidentType:           INCIDENT_TYPES.includes(fields.incidentType) ? fields.incidentType : 'other',
      dataCategories:         Array.isArray(fields.dataCategories)    ? fields.dataCategories    : [],
      dataSubjectTypes:       Array.isArray(fields.dataSubjectTypes)  ? fields.dataSubjectTypes  : [],
      estimatedAffected:      fields.estimatedAffected      ? parseInt(fields.estimatedAffected) : null,
      containmentMeasures:    fields.containmentMeasures    || '',
      rootCause:              fields.rootCause              || '',
      riskLevel:              INCIDENT_RISKS.includes(fields.riskLevel) ? fields.riskLevel : 'medium',
      saNotificationRequired: !!fields.saNotificationRequired,
      saNotifiedAt:           fields.saNotifiedAt           || null,
      saReference:            fields.saReference            || '',
      dsNotificationRequired: !!fields.dsNotificationRequired,
      dsNotifiedAt:           fields.dsNotifiedAt           || null,
      remediationMeasures:    fields.remediationMeasures    || '',
      linkedVvt:              Array.isArray(fields.linkedVvt) ? fields.linkedVvt : [],
      applicableEntities:     Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      status:                 INCIDENT_STATUSES.includes(fields.status) ? fields.status : 'detected',
      reportedBy:             createdBy || 'system',
      createdAt:              nowISO(),
      updatedAt:              nowISO()
    }
    list.push(item)
    saveFile('incidents.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('incidents.json')
    const idx  = list.findIndex(i => i.id === id)
    if (idx === -1) return null
    const item = list[idx]
    const updatable = ['title','discoveredAt','incidentType','dataCategories','dataSubjectTypes',
                       'estimatedAffected','containmentMeasures','rootCause','riskLevel',
                       'saNotificationRequired','saNotifiedAt','saReference',
                       'dsNotificationRequired','dsNotifiedAt','remediationMeasures',
                       'linkedVvt','applicableEntities','status']
    for (const k of updatable) {
      if (fields[k] !== undefined) item[k] = fields[k]
    }
    item.updatedAt = nowISO()
    list[idx] = item
    saveFile('incidents.json', list)
    return item
  },
  delete(id, deletedBy) {
    const list = loadFile('incidents.json')
    const idx  = list.findIndex(i => i.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('incidents.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('incidents.json')
    const idx  = list.findIndex(i => i.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('incidents.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('incidents.json')
    const idx  = list.findIndex(i => i.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('incidents.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('incidents.json').filter(i => i.deletedAt)
  }
}

// ── DSAR (Betroffenenrechte Art. 15-22) ───────────────────────────

const DSAR_TYPES    = ['access','rectification','erasure','restriction','portability','objection','review_automated']
const DSAR_STATUSES = ['received','in_progress','extended','completed','refused']

const dsar = {
  getAll({ entity } = {}) {
    let list = loadFile('dsar.json').filter(d => !d.deletedAt)
    if (entity) list = list.filter(d => !d.applicableEntities?.length || d.applicableEntities.includes(entity))
    return list
  },
  getById(id) {
    return loadFile('dsar.json').find(d => d.id === id && !d.deletedAt) || null
  },
  create(fields, createdBy) {
    const list = loadFile('dsar.json')
    const receivedAt = fields.receivedAt || nowISO()
    const deadline   = _addDays(receivedAt, 30)
    const item = {
      id:               makeId('dsar'),
      requestType:      DSAR_TYPES.includes(fields.requestType) ? fields.requestType : 'access',
      dataSubjectName:  fields.dataSubjectName  || '',
      dataSubjectEmail: fields.dataSubjectEmail || '',
      receivedAt,
      deadline,
      extendedDeadline: null,
      identityVerified: !!fields.identityVerified,
      affectedVvt:      Array.isArray(fields.affectedVvt) ? fields.affectedVvt : [],
      response:         fields.response         || '',
      status:           DSAR_STATUSES.includes(fields.status) ? fields.status : 'received',
      refusalReason:    fields.refusalReason    || '',
      completedAt:      fields.completedAt      || null,
      handledBy:        fields.handledBy        || createdBy || '',
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      createdAt:        nowISO(),
      updatedAt:        nowISO()
    }
    list.push(item)
    saveFile('dsar.json', list)
    return item
  },
  update(id, fields) {
    const list = loadFile('dsar.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return null
    const item = list[idx]
    const updatable = ['requestType','dataSubjectName','dataSubjectEmail','receivedAt','deadline',
                       'extendedDeadline','identityVerified','affectedVvt','response','status',
                       'refusalReason','completedAt','handledBy','applicableEntities']
    for (const k of updatable) {
      if (fields[k] !== undefined) item[k] = fields[k]
    }
    // If status extended, set extendedDeadline +60 days from receivedAt
    if (fields.status === 'extended' && !item.extendedDeadline) {
      item.extendedDeadline = _addDays(item.receivedAt, 90)
    }
    if (fields.status === 'completed' && !item.completedAt) {
      item.completedAt = nowISO()
    }
    item.updatedAt = nowISO()
    list[idx] = item
    saveFile('dsar.json', list)
    return item
  },
  delete(id, deletedBy) {
    const list = loadFile('dsar.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return false
    list[idx].deletedAt = new Date().toISOString()
    list[idx].deletedBy = deletedBy || null
    saveFile('dsar.json', list)
    return true
  },
  permanentDelete(id) {
    const list = loadFile('dsar.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    saveFile('dsar.json', list)
    return true
  },
  restore(id) {
    const list = loadFile('dsar.json')
    const idx  = list.findIndex(d => d.id === id)
    if (idx === -1) return null
    list[idx].deletedAt = null
    list[idx].deletedBy = null
    saveFile('dsar.json', list)
    return list[idx]
  },
  getDeleted() {
    return loadFile('dsar.json').filter(d => d.deletedAt)
  }
}

function _addDays(isoStr, days) {
  const d = new Date(isoStr)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// ── TOMs (Art. 32) ─────────────────────────────────────────────────

// TOMs: Sicht auf das Maßnahmen-Register (Maßnahmen mit Kennzeichen tom) – siehe tomsFacade.js (#Variante C, 1.80)
const toms = require('./tomsFacade')
const { TOM_CATEGORIES, TOM_STATUSES } = require('./measuresCommon')   // weiterhin von hier exportiert

// ── DSB (Singleton) ────────────────────────────────────────────────

const dsb = {
  get() {
    return loadFile('dsb.json')
  },
  update(fields) {
    const current = loadFile('dsb.json')
    const updatable = ['type','name','email','phone','appointmentDate','contractEnd','notes','filePath','filename']
    for (const k of updatable) {
      if (fields[k] !== undefined) current[k] = fields[k]
    }
    current.updatedAt = nowISO()
    saveFile('dsb.json', current)
    return current
  }
}

// ── Summary (Dashboard) ────────────────────────────────────────────

function getSummary(entityId) {
  const vvtList  = vvt.getAll(entityId ? { entity: entityId } : {})
  const avList   = av.getAll(entityId ? { entity: entityId } : {})
  const dsaList  = dsar.getAll(entityId ? { entity: entityId } : {})
  const incList  = incidents.getAll(entityId ? { entity: entityId } : {})
  const tomList  = toms.getAll(entityId ? { entity: entityId } : {})
  const dsbData  = dsb.get()

  const now = new Date()

  // VVT
  const vvtTotal   = vvtList.length
  const vvtHighRisk = vvtList.filter(v => v.isHighRisk).length
  const vvtNoLegal = vvtList.filter(v => !v.legalBasis).length

  // AV
  const avActive   = avList.filter(a => a.status === 'active' || a.status === 'signed').length

  // DSAR
  const dsarOpen   = dsaList.filter(d => !['completed','refused'].includes(d.status)).length
  const dsarOverdue = dsaList.filter(d => {
    if (['completed','refused'].includes(d.status)) return false
    const dl = d.extendedDeadline || d.deadline
    return dl && new Date(dl) < now
  }).length

  // Incidents
  const incOpen    = incList.filter(i => !['closed'].includes(i.status)).length
  const inc72hMissed = incList.filter(i => {
    if (i.status === 'closed' || !i.saNotificationRequired) return false
    if (i.saNotifiedAt) return false
    const disc = new Date(i.discoveredAt)
    return (now - disc) > 72 * 3600 * 1000
  }).length

  // TOMs
  const tomsImplemented = tomList.filter(t => t.status === 'implemented' || t.status === 'verified').length
  const tomsTotal       = tomList.length

  // DSB
  const dsbSet = !!(dsbData.name)

  return {
    vvt:       { total: vvtTotal, highRisk: vvtHighRisk, noLegal: vvtNoLegal },
    av:        { active: avActive, total: avList.length },
    dsar:      { open: dsarOpen, overdue: dsarOverdue },
    incidents: { open: incOpen, missed72h: inc72hMissed },
    toms:      { implemented: tomsImplemented, total: tomsTotal },
    dsbSet
  }
}

// ── Löschprotokoll (Art. 17 DSGVO) ────────────────────────────────

const deletionLog = {
  getAll() {
    return loadFile('deletion-log.json')
  },
  // Alle VVT-Einträge mit abgelaufener Aufbewahrungsfrist (noch nicht gelöscht)
  getDue() {
    const vvtList = loadFile('vvt.json')
    const logged  = new Set(loadFile('deletion-log.json').map(e => e.vvtId))
    const now = new Date()
    return vvtList.filter(v => {
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
  // Alle VVT-Einträge mit bald ablaufender Frist (innerhalb daysAhead Tage)
  getUpcoming(daysAhead = 90) {
    const vvtList = loadFile('vvt.json')
    const logged  = new Set(loadFile('deletion-log.json').map(e => e.vvtId))
    const now = new Date()
    const cutoff = new Date(now.getTime() + daysAhead * 86400000)
    return vvtList.filter(v => {
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
  confirm(fields, confirmedBy) {
    const list = loadFile('deletion-log.json')
    const entry = {
      id:            makeId('del'),
      vvtId:         fields.vvtId,
      vvtTitle:      fields.vvtTitle || '',
      confirmedAt:   nowISO(),
      confirmedBy:   confirmedBy || 'system',
      method:        fields.method    || 'manual',
      evidence:      fields.evidence  || '',
      note:          fields.note      || ''
    }
    list.push(entry)
    saveFile('deletion-log.json', list)
    return entry
  }
}

const _jsonExports = {
  vvt, av, dsfa, incidents, dsar, toms, dsb, deletionLog,
  getSummary,
  VVT_LEGAL_BASES, VVT_STATUSES,
  AV_STATUSES,
  DSFA_STATUSES, RESIDUAL_RISKS,
  INCIDENT_TYPES, INCIDENT_STATUSES,
  DSAR_TYPES, DSAR_STATUSES,
  TOM_CATEGORIES, TOM_STATUSES
}

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/gdprStore')
  _knex.init().catch(e => console.error('[gdprStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
