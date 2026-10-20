'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

function nowISO() { return new Date().toISOString() }
function makeId() { return `finding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }
function makeActId() { return `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

const actions = require('../findingActions')   // Maßnahmen der Feststellung = Maßnahmen im Register mit Zuordnung zu ihr (1.80)

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'observation']
const STATUSES   = ['open', 'in_progress', 'resolved', 'accepted']
const ACT_STATUS = ['open', 'in_progress', 'done']

// `acts` = Maßnahmen der Feststellung aus dem Register (siehe findingActions.js). Die in älteren Daten eingebettete Liste wird
// nie gelesen und beim Speichern nicht mehr geschrieben.
function rowToFinding(row, acts) {
  if (!row) return null
  return { id: row.id, ..._json(row.data, {}), actions: acts || [], createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at || null }
}
const packFinding = f => { const { actions: _a, ...rest } = f; return JSON.stringify(rest) }
const forRow = async row => rowToFinding(row, row ? await actions.forFinding(row.id) : [])

async function nextRef() {
  const year = new Date().getFullYear()
  const rows = await getDb()('findings')
  const thisYear = rows.filter(f => { const d = _json(f.data, {}); return d.ref && d.ref.startsWith(`FIND-${year}-`) })
  const nums = thisYear.map(f => parseInt((_json(f.data, {}).ref || '').split('-')[2], 10)).filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `FIND-${year}-${String(next).padStart(4, '0')}`
}

module.exports = {
  init: async () => { await initDb() },
  SEVERITIES, STATUSES, ACT_STATUS,

  getAll: async ({ status, severity, auditor, auditId } = {}) => {
    const rows = await getDb()('findings').whereNull('deleted_at').orderBy('created_at', 'desc')
    const actMap = await actions.groupByFinding()
    let list = rows.map(row => rowToFinding(row, actMap.get(row.id) || []))
    if (status) list = list.filter(f => f.status === status)
    if (severity) list = list.filter(f => f.severity === severity)
    if (auditor) list = list.filter(f => f.auditor === auditor)
    if (auditId) list = list.filter(f => f.auditId === auditId)
    return list
  },

  getById: async (id) => {
    const row = await getDb()('findings').where('id', id).whereNull('deleted_at').first()
    return forRow(row)
  },

  create: async (fields, createdBy) => {
    const id = makeId()
    const ref = await nextRef()
    const now = nowISO()
    const f = {
      ref,
      title: fields.title || 'Neue Feststellung',
      severity: SEVERITIES.includes(fields.severity) ? fields.severity : 'medium',
      status: STATUSES.includes(fields.status) ? fields.status : 'open',
      observation: fields.observation || '', requirement: fields.requirement || '',
      impact: fields.impact || '', recommendation: fields.recommendation || '',
      auditor: fields.auditor || '', auditedArea: fields.auditedArea || '',
      auditPeriodFrom: fields.auditPeriodFrom || null, auditPeriodTo: fields.auditPeriodTo || null,
      linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      linkedRisks: Array.isArray(fields.linkedRisks) ? fields.linkedRisks : [],
      auditId: typeof fields.auditId === 'string' && fields.auditId ? fields.auditId : null,
      sourceItemId: typeof fields.sourceItemId === 'string' && fields.sourceItemId ? fields.sourceItemId : null,
      deletedBy: null,
    }
    await getDb()('findings').insert({
      id, data: packFinding(f), created_by: createdBy || 'system', created_at: now, updated_at: now,
    })
    return { id, ...f, actions: [], createdBy: createdBy || 'system', createdAt: now, updatedAt: now, deletedAt: null }
  },

  update: async (id, fields, updatedBy) => {
    const row = await getDb()('findings').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const f = await forRow(row)
    const allowed = ['title','severity','status','observation','requirement','impact',
      'recommendation','auditor','auditedArea','auditPeriodFrom','auditPeriodTo',
      'linkedControls','linkedPolicies','linkedRisks','auditId']
    for (const k of allowed) { if (fields[k] !== undefined) f[k] = fields[k] }
    if (f.auditId !== null && typeof f.auditId !== 'string') f.auditId = null
    if (f.auditId === '') f.auditId = null
    if (fields.severity && !SEVERITIES.includes(fields.severity)) f.severity = 'medium'
    if (fields.status && !STATUSES.includes(fields.status)) f.status = 'open'
    f.updatedAt = nowISO()
    await getDb()('findings').where('id', id).update({ data: packFinding(f), updated_at: f.updatedAt })
    return f
  },

  remove: async (id, deletedBy) => {
    const row = await getDb()('findings').where('id', id).whereNull('deleted_at').first()
    if (!row) return false
    const f = rowToFinding(row)
    f.deletedAt = nowISO()
    f.deletedBy = deletedBy || 'system'
    await getDb()('findings').where('id', id).update({ deleted_at: nowISO(), data: packFinding(f) })
    return true
  },

  permanentDelete: async (id) => {
    const affected = await getDb()('findings').where('id', id).del()
    if (affected > 0) await actions.onFindingRemoved(id)   // Maßnahmen verschwinden mit der Feststellung (Papierkorb), Zuordnungen entfallen
    return affected > 0
  },

  restore: async (id) => {
    const row = await getDb()('findings').where('id', id).first()
    if (!row) return null
    const f = await forRow(row)
    delete f.deletedAt
    delete f.deletedBy
    f.updatedAt = nowISO()
    await getDb()('findings').where('id', id).update({ deleted_at: null, data: packFinding(f), updated_at: f.updatedAt })
    return f
  },

  getDeleted: async () => {
    const rows = await getDb()('findings').whereNotNull('deleted_at')
    const actMap = await actions.groupByFinding()
    return rows.map(row => rowToFinding(row, actMap.get(row.id) || []))
  },

  addAction: async (findingId, fields, updatedBy) => {
    const row = await getDb()('findings').where('id', findingId).whereNull('deleted_at').first()
    if (!row) return null
    return actions.add(findingId, fields, updatedBy)
  },

  updateAction: async (findingId, actionId, fields, updatedBy) => {
    const row = await getDb()('findings').where('id', findingId).whereNull('deleted_at').first()
    if (!row) return null
    return actions.update(findingId, actionId, fields, updatedBy)
  },

  deleteAction: async (findingId, actionId, deletedBy) => {
    const row = await getDb()('findings').where('id', findingId).whereNull('deleted_at').first()
    if (!row) return false
    return actions.remove(findingId, actionId, deletedBy)
  },

  getSummary: async () => {
    const rows = await getDb()('findings').whereNull('deleted_at')
    const actMap = await actions.groupByFinding()
    const list = rows.map(row => rowToFinding(row, actMap.get(row.id) || []))
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, observation: 0 }
    const byStatus = { open: 0, in_progress: 0, resolved: 0, accepted: 0 }
    for (const f of list) {
      if (bySeverity[f.severity] !== undefined) bySeverity[f.severity]++
      if (byStatus[f.status] !== undefined) byStatus[f.status]++
    }
    const openActions = list.reduce((n, f) => n + (f.actions || []).filter(a => a.status !== 'done').length, 0)
    const now = new Date()
    const overdueActions = list.reduce((n, f) => n + (f.actions || []).filter(a => a.status !== 'done' && a.dueDate && new Date(a.dueDate) < now).length, 0)
    return { total: list.length, bySeverity, byStatus, openActions, overdueActions }
  },

  autopurge: async (days = 30) => {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString()
    const affected = await getDb()('findings').whereNotNull('deleted_at').where('deleted_at', '<', cutoff).del()
    return affected
  },
}
