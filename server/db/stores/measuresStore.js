// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Maßnahmen-Register für sqlite/mariadb/postgres (Knex). Logik für Normalisierung, Filter und Zusammenfassung liegt in
// ../measuresCommon.js und ist mit dem JSON-Speicher identisch. Verknüpfungen stehen als JSON-Text in der Zeile.
const { getDb, init: initDb } = require('../knexDatabase')
const C = require('../measuresCommon')

function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

function rowToMeasure(row) {
  if (!row) return null
  return {
    id: row.id, ref: row.ref, title: row.title, description: row.description || '', implementation: row.implementation || '',
    responsible: row.responsible || '', dueDate: row.due_date || null, reviewDate: row.review_date || null, status: row.status || 'planned',
    linkedControls: _json(row.linked_controls, []), linkedFindings: _json(row.linked_findings, []), linkedRisks: _json(row.linked_risks, []), linkedPolicies: _json(row.linked_policies, []),
    linkedVvt: _json(row.linked_vvt, []), applicableEntities: _json(row.applicable_entities, []),
    tom: !!row.tom, category: row.category || '', riskLevel: row.risk_level || '', evidenceNote: row.evidence_note || '', retentionRule: row.retention_rule || '',
    governance: !!row.governance, source: row.source || '', sourceRef: row.source_ref || '', priority: row.priority || '', progress: row.progress || 0,
    completedDate: row.completed_date || null, notes: row.notes || '', ownerEmail: row.owner_email || '', entityId: row.entity_id || '', attachments: _json(row.attachments, []),
    createdBy: row.created_by, updatedBy: row.updated_by || row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null, deletedBy: row.deleted_by || null,
  }
}
function measureToRow(m) {
  return {
    id: m.id, ref: m.ref, title: m.title, description: m.description || '', implementation: m.implementation || '',
    responsible: m.responsible || '', due_date: m.dueDate || null, review_date: m.reviewDate || null, status: m.status,
    linked_controls: JSON.stringify(m.linkedControls || []), linked_findings: JSON.stringify(m.linkedFindings || []), linked_risks: JSON.stringify(m.linkedRisks || []),
    linked_policies: JSON.stringify(m.linkedPolicies || []), linked_vvt: JSON.stringify(m.linkedVvt || []),
    applicable_entities: JSON.stringify(m.applicableEntities || []),
    tom: !!m.tom, category: m.category || '', risk_level: m.riskLevel || '', evidence_note: m.evidenceNote || '', retention_rule: m.retentionRule || '',
    governance: !!m.governance, source: m.source || '', source_ref: m.sourceRef || '', priority: m.priority || '', progress: m.progress || 0,
    completed_date: m.completedDate || null, notes: m.notes || '', owner_email: m.ownerEmail || '', entity_id: m.entityId || '', attachments: JSON.stringify(m.attachments || []),
    created_by: m.createdBy, updated_by: m.updatedBy, created_at: m.createdAt, updated_at: m.updatedAt,
    deleted_at: m.deletedAt || null, deleted_by: m.deletedBy || null,
  }
}
const live = async () => (await getDb()('measures').whereNull('deleted_at')).map(rowToMeasure)
const nextRefNow = async db => C.nextRef((await db('measures').select('ref')).map(r => r.ref))

module.exports = {
  init: async () => { await initDb() },
  STATUSES: C.STATUSES,

  getAll: async (filter = {}) => C.filterList(await live(), filter).sort((a, b) => a.ref.localeCompare(b.ref)),
  getById: async (id) => rowToMeasure(await getDb()('measures').where('id', id).whereNull('deleted_at').first()),
  getAnyById: async (id) => rowToMeasure(await getDb()('measures').where('id', id).first()),
  allIds: async () => (await getDb()('measures').select('id')).map(r => r.id),

  create: async (fields, createdBy) => {
    const db = getDb()
    const now = C.nowISO()
    const base = { ...C.blank(), ref: await nextRefNow(db) }
    const item = { ...C.normalize(fields, base), createdAt: now, updatedAt: now, createdBy: createdBy || 'system', updatedBy: createdBy || 'system', deletedAt: null, deletedBy: null }
    await db('measures').insert(measureToRow(item))
    return item
  },

  importRecord: async (rec) => {
    const db = getDb()
    if (await db('measures').where('id', rec.id).first()) return false
    const item = { ...C.normalize(rec, { ...C.blank(), id: rec.id, ref: await nextRefNow(db) }),
      createdAt: rec.createdAt, updatedAt: rec.updatedAt, createdBy: rec.createdBy, updatedBy: rec.updatedBy,
      completedDate: rec.completedDate || null,   // beim Import nie automatisch „heute“
      attachments: Array.isArray(rec.attachments) ? rec.attachments : [],
      deletedAt: rec.deletedAt || null, deletedBy: rec.deletedBy || null }
    await db('measures').insert(measureToRow(item))
    return true
  },

  update: async (id, fields, updatedBy) => {
    const db = getDb()
    const existing = rowToMeasure(await db('measures').where('id', id).whereNull('deleted_at').first())
    if (!existing) return null
    const item = { ...C.normalize(fields, existing), updatedAt: C.nowISO(), updatedBy: updatedBy || 'system' }
    await db('measures').where('id', id).update(measureToRow(item))
    return item
  },

  // Anhänge werden nur serverseitig gesetzt (Upload-Routen der Governance); die Eingabe-Bereinigung kennt das Feld bewusst nicht.
  setAttachments: async (id, attachments) => {
    const db = getDb()
    const n = await db('measures').where('id', id).whereNull('deleted_at').update({ attachments: JSON.stringify(Array.isArray(attachments) ? attachments : []), updated_at: C.nowISO() })
    return n ? rowToMeasure(await db('measures').where('id', id).first()) : null
  },

  delete: async (id, deletedBy) => {
    const n = await getDb()('measures').where('id', id).whereNull('deleted_at').update({ deleted_at: C.nowISO(), deleted_by: deletedBy || null })
    return n > 0
  },
  permanentDelete: async (id) => (await getDb()('measures').where('id', id).del()) > 0,
  restore: async (id) => {
    const n = await getDb()('measures').where('id', id).whereNotNull('deleted_at').update({ deleted_at: null, deleted_by: null })
    return n ? rowToMeasure(await getDb()('measures').where('id', id).first()) : null
  },
  getDeleted: async () => (await getDb()('measures').whereNotNull('deleted_at')).map(rowToMeasure),
  getSummary: async () => C.summarize(await live()),
  getCalendarEvents: async () => C.calendarEvents(await live()),
}
