// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Governance-Maßnahmen (Management-Review, Audit-Folgen, Vorfälle) als Sicht auf das Maßnahmen-Register (Kennzeichen `governance`).
// Die bisherige Schnittstelle (/governance/actions, Anhänge, Kalender, Zusammenfassung) bleibt unverändert, ohne zweiten Bestand.
// Unter JSON sind die Aufrufe synchron, unter SQL liefern sie Promises (wie der jeweilige Store).
const store = require('./measuresStore')

const when = (v, f) => (v && typeof v.then === 'function' ? v.then(f) : f(v))

// Status der Governance-Sicht ↔ Status der Maßnahme
const TO_MEASURE = { open: 'planned', in_progress: 'in_progress', completed: 'implemented', cancelled: 'cancelled' }
const FROM_MEASURE = { planned: 'open', in_progress: 'in_progress', implemented: 'completed', verified: 'completed', cancelled: 'cancelled' }

function toAction(m) {
  return {
    id: m.id, ref: m.ref, title: m.title, description: m.description || '', source: m.source || 'management_review', sourceRef: m.sourceRef || '',
    owner: m.responsible || '', ownerEmail: m.ownerEmail || '', dueDate: m.dueDate || '', completedDate: m.completedDate || '',
    priority: m.priority || 'medium', status: FROM_MEASURE[m.status] || 'open', progress: m.progress || 0, notes: m.notes || '',
    entityId: m.entityId || '', linkedControls: m.linkedControls || [], linkedPolicies: m.linkedPolicies || [],
    attachments: m.attachments || [],
    createdAt: m.createdAt, updatedAt: m.updatedAt, createdBy: m.createdBy, updatedBy: m.updatedBy, deletedAt: m.deletedAt || null,
  }
}

// Eingaben der Governance-Sicht → Felder der Maßnahme (nur übergebene Felder)
function toFields(f) {
  const out = {}
  const map = { title: 'title', description: 'description', source: 'source', sourceRef: 'sourceRef', owner: 'responsible', ownerEmail: 'ownerEmail',
    dueDate: 'dueDate', completedDate: 'completedDate', priority: 'priority', progress: 'progress', notes: 'notes', entityId: 'entityId',
    linkedControls: 'linkedControls', linkedPolicies: 'linkedPolicies' }
  for (const [from, to] of Object.entries(map)) if (f[from] !== undefined) out[to] = f[from]
  if (f.status !== undefined && TO_MEASURE[f.status]) out.status = TO_MEASURE[f.status]
  return out
}

const getActions = () => when(store.getAll({ governance: true }), l => l.map(toAction))
const getActionById = id => when(store.getById(id), m => (m && m.governance ? toAction(m) : null))

const createAction = (fields, { createdBy } = {}) => {
  const f = fields || {}
  return when(store.create({ title: f.title || 'Ohne Titel', ...toFields(f), governance: true }, createdBy), toAction)
}

// `attachments` ist serverseitig verwaltet (Upload-Routen) und läuft nie über die Eingabe-Bereinigung des Registers.
const updateAction = (id, patch, { changedBy } = {}) => when(store.getById(id), m => {
  if (!m || !m.governance) return null
  const p = patch || {}
  const fields = toFields(p)
  const step = Object.keys(fields).length ? store.update(id, fields, changedBy) : m
  return when(step, upd => {
    if (!upd) return null
    return Array.isArray(p.attachments) ? when(store.setAttachments(id, p.attachments), toAction) : toAction(upd)
  })
})

const deleteAction = (id, by) => when(store.getById(id), m => (m && m.governance ? store.delete(id, by || 'system') : false))

module.exports = { getActions, getActionById, createAction, updateAction, deleteAction, toAction, FROM_MEASURE, TO_MEASURE }
