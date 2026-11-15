'use strict'

const { getDb, init: initDb } = require('../knexDatabase')
const trainingFiles = require('../../trainingFiles')

function nowISO() { return new Date().toISOString() }
function makeId() { return `training_${Date.now()}_${Math.random().toString(36).slice(2,6)}` }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

const CATEGORIES = ['security_awareness','iso27001','gdpr','technical','management','other']
const STATUSES   = ['planned','in_progress','completed','cancelled']

function isOverdue(item) {
  if (item.status === 'completed' || item.status === 'cancelled') return false
  if (!item.dueDate) return false
  return new Date(item.dueDate) < new Date()
}

function rowToTraining(row) {
  if (!row) return null
  const d = _json(row.data, {})
  return {
    id: row.id, title: row.title, description: row.description,
    category: row.category, status: row.status,
    dueDate: row.due_date, completedDate: row.completed_date,
    instructor: row.instructor, assignees: row.assignees,
    applicableEntities: _json(row.applicable_entities, []),
    evidence: row.evidence, mandatory: !!row.mandatory,
    linkedControls: d.linkedControls || [],
    linkedPolicies: d.linkedPolicies || [],
    attachments: trainingFiles.publicAttachments(d.attachments),
    deletedBy: d.deletedBy || '',
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at || null,
    overdue: isOverdue({ status: row.status, dueDate: row.due_date }),
  }
}

module.exports = {
  init: async () => {
    await initDb()
    const db = getDb()
    const count = await db('training').count('id as cnt').first()
    if (!count?.cnt) {
      const now = nowISO()
      await db('training').insert([
        {
          id: makeId(), title: 'Security Awareness Grundlagen',
          description: 'Jährliche Pflichtschulung für alle Mitarbeitenden.',
          category: 'security_awareness', status: 'planned',
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          completed_date: null, instructor: 'IT-Security Team',
          assignees: 'Alle Mitarbeitenden', applicable_entities: '[]',
          evidence: '', mandatory: 1, data: '{}',
          created_by: 'system', created_at: now, updated_at: now,
        },
        {
          id: makeId(), title: 'DSGVO-Schulung für neue Mitarbeitende',
          description: 'Einführung in Datenschutzpflichten gem. Art. 39 DSGVO.',
          category: 'gdpr', status: 'completed',
          due_date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
          completed_date: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
          instructor: 'Datenschutzbeauftragter', assignees: 'HR-Abteilung, neue MA Q1',
          applicable_entities: '[]',
          evidence: 'Teilnehmerliste und Attestat im SharePoint abgelegt.',
          mandatory: 1, data: '{}',
          created_by: 'system', created_at: now, updated_at: now,
        },
        {
          id: makeId(), title: 'ISO 27001 Lead Auditor Zertifizierung',
          description: 'Externe Zertifizierungsschulung für ISMS-Verantwortliche.',
          category: 'iso27001', status: 'in_progress',
          due_date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
          completed_date: null, instructor: 'TÜV Rheinland',
          assignees: 'ISMS-Team (3 Personen)', applicable_entities: '[]',
          evidence: '', mandatory: 0, data: '{}',
          created_by: 'system', created_at: now, updated_at: now,
        },
      ])
    }
  },

  getAll: async ({ status, category, entity } = {}) => {
    const q = getDb()('training').whereNull('deleted_at')
    if (status) q.where('status', status)
    if (category) q.where('category', category)
    let list = (await q).map(rowToTraining)
    if (entity) list = list.filter(i => !i.applicableEntities?.length || i.applicableEntities.includes(entity))
    return list
  },

  getById: async (id) => {
    const row = await getDb()('training').where('id', id).whereNull('deleted_at').first()
    return rowToTraining(row)
  },

  getSummary: async () => {
    const rows = await getDb()('training').whereNull('deleted_at')
    const list = rows.map(rowToTraining)
    const total = list.length
    const completed = list.filter(i => i.status === 'completed').length
    return {
      total,
      planned: list.filter(i => i.status === 'planned').length,
      inProgress: list.filter(i => i.status === 'in_progress').length,
      completed,
      cancelled: list.filter(i => i.status === 'cancelled').length,
      overdue: list.filter(i => i.overdue).length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  },

  create: async (fields, createdBy) => {
    const id = makeId()
    const now = nowISO()
    const item = {
      id, title: fields.title || 'Ohne Titel',
      description: fields.description || '',
      category: CATEGORIES.includes(fields.category) ? fields.category : 'other',
      status: STATUSES.includes(fields.status) ? fields.status : 'planned',
      dueDate: fields.dueDate || null,
      completedDate: fields.completedDate || null,
      instructor: fields.instructor || '',
      assignees: fields.assignees || '',
      applicableEntities: Array.isArray(fields.applicableEntities) ? fields.applicableEntities : [],
      evidence: fields.evidence || '',
      mandatory: fields.mandatory === true,
      linkedControls: Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
      linkedPolicies: Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
      createdBy: createdBy || 'system',
    }
    await getDb()('training').insert({
      id, title: item.title, description: item.description,
      category: item.category, status: item.status,
      due_date: item.dueDate, completed_date: item.completedDate,
      instructor: item.instructor, assignees: item.assignees,
      applicable_entities: JSON.stringify(item.applicableEntities),
      evidence: item.evidence, mandatory: item.mandatory ? 1 : 0,
      data: JSON.stringify({ linkedControls: item.linkedControls, linkedPolicies: item.linkedPolicies }),
      created_by: item.createdBy, created_at: now, updated_at: now,
    })
    return { ...item, createdAt: now, updatedAt: now, overdue: isOverdue(item) }
  },

  update: async (id, fields) => {
    const row = await getDb()('training').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const item = rowToTraining(row)
    const d0 = _json(row.data, {})
    const allowed = ['title','description','category','status','dueDate','completedDate',
      'instructor','assignees','applicableEntities','evidence','mandatory','linkedControls','linkedPolicies']
    for (const k of allowed) {
      if (fields[k] !== undefined) item[k] = fields[k]
    }
    if (fields.status === 'completed' && !item.completedDate) {
      item.completedDate = nowISO().slice(0, 10)
    }
    item.updatedAt = nowISO()
    await getDb()('training').where('id', id).update({
      title: item.title, description: item.description,
      category: item.category, status: item.status,
      due_date: item.dueDate, completed_date: item.completedDate,
      instructor: item.instructor, assignees: item.assignees,
      applicable_entities: JSON.stringify(item.applicableEntities || []),
      evidence: item.evidence, mandatory: item.mandatory ? 1 : 0,
      data: JSON.stringify({ ...d0, linkedControls: item.linkedControls || [], linkedPolicies: item.linkedPolicies || [] }),
      updated_at: item.updatedAt,
    })
    return { ...item, overdue: isOverdue(item) }
  },

  delete: async (id, deletedBy) => {
    const row = await getDb()('training').where('id', id).first()
    if (!row) return false
    const d = _json(row.data, {})
    d.deletedBy = deletedBy || ''
    await getDb()('training').where('id', id).update({
      deleted_at: nowISO(), data: JSON.stringify(d),
    })
    return true
  },

  permanentDelete: async (id) => {
    const old = await getDb()('training').where('id', id).first()
    for (const a of (old ? _json(old.data, {}).attachments || [] : [])) trainingFiles.removeFile(a.filename)
    const affected = await getDb()('training').where('id', id).del()
    return affected > 0
  },

  restore: async (id) => {
    const row = await getDb()('training').where('id', id).first()
    if (!row) return null
    const d = _json(row.data, {})
    delete d.deletedBy
    await getDb()('training').where('id', id).update({
      deleted_at: null, data: JSON.stringify(d), updated_at: nowISO(),
    })
    return rowToTraining({ ...row, deleted_at: null })
  },

  getDeleted: async () => {
    const rows = await getDb()('training').whereNotNull('deleted_at')
    return rows.map(rowToTraining)
  },

  // Anhänge: Metadaten im Feld `data`; entfernte Anhänge werden nur markiert, die Datei bleibt erhalten
  addAttachment: async (id, meta) => {
    const row = await getDb()('training').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const d = _json(row.data, {})
    d.attachments = [...(d.attachments || []), meta]
    await getDb()('training').where('id', id).update({ data: JSON.stringify(d), updated_at: nowISO() })
    return meta
  },
  getAttachment: async (id, attId) => {
    const row = await getDb()('training').where('id', id).whereNull('deleted_at').first()
    return (row && (_json(row.data, {}).attachments || []).find(a => a.id === attId && !a.removedAt)) || null
  },
  removeAttachment: async (id, attId, by) => {
    const row = await getDb()('training').where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const d = _json(row.data, {})
    const att = (d.attachments || []).find(a => a.id === attId && !a.removedAt)
    if (!att) return null
    att.removedAt = nowISO(); att.removedBy = by || null
    await getDb()('training').where('id', id).update({ data: JSON.stringify(d), updated_at: nowISO() })
    return att
  },

  CATEGORIES, STATUSES,
}
