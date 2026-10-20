// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// TOMs (technisch-organisatorische Maßnahmen, Art. 32 DSGVO) als Sicht auf das Maßnahmen-Register:
// eine TOM ist eine Maßnahme mit dem Kennzeichen `tom: true`. Die bisherige Schnittstelle des DSGVO-Moduls
// (gdprStore.toms, /gdpr/toms, Papierkorb, Dashboard-Zahlen) bleibt dadurch unverändert, ohne einen zweiten Bestand zu führen.
// Unter dem JSON-Speicher sind die Aufrufe synchron, unter SQL liefern sie Promises (wie der jeweilige Store).
const C = require('./measuresCommon')
const store = require('./measuresStore')

const when = (v, f) => (v && typeof v.then === 'function' ? v.then(f) : f(v))
const TOM_STATUSES = C.TOM_STATUSES

// Maßnahme → TOM (Form wie bisher; `owner` = Verantwortlicher)
function toTom(m) {
  if (!m || !m.tom) return null
  return {
    id: m.id, ref: m.ref, title: m.title, category: m.category, description: m.description, implementation: m.implementation,
    status: m.status, owner: m.responsible, evidenceNote: m.evidenceNote, retentionRule: m.retentionRule, linkedVvt: m.linkedVvt,
    riskLevel: m.riskLevel, reviewDate: m.reviewDate, applicableEntities: m.applicableEntities, linkedControls: m.linkedControls,
    linkedPolicies: m.linkedPolicies, linkedFindings: m.linkedFindings,
    createdAt: m.createdAt, updatedAt: m.updatedAt, createdBy: m.createdBy, deletedAt: m.deletedAt || null, deletedBy: m.deletedBy || null,
  }
}

const UPDATABLE = ['title', 'category', 'description', 'implementation', 'status', 'owner', 'evidenceNote', 'retentionRule',
  'linkedVvt', 'riskLevel', 'reviewDate', 'applicableEntities', 'linkedControls', 'linkedPolicies']

// TOM-Felder → Maßnahme (nur übergebene Felder; `owner` wird zu `responsible`)
function toMeasureFields(fields) {
  const out = {}
  for (const k of UPDATABLE) {
    if (fields[k] === undefined) continue
    if (k === 'owner') out.responsible = fields[k]
    else if (k === 'status') { if (TOM_STATUSES.includes(fields[k])) out.status = fields[k] }   // ungültige Status ändern nichts
    else out[k] = fields[k]
  }
  return out
}

module.exports = {
  getAll: ({ entity, category } = {}) => when(store.getAll({ tom: true, entity: entity || undefined, category: category || undefined }), l => l.map(toTom)),
  getById: id => when(store.getById(id), toTom),
  create: (fields, createdBy) => {
    const f = fields || {}
    const patch = toMeasureFields(f)
    patch.title = f.title || 'Ohne Titel'
    patch.tom = true
    return when(store.create(patch, createdBy), toTom)
  },
  update: (id, fields, updatedBy) => when(store.getById(id), m => (!m || !m.tom ? null : when(store.update(id, toMeasureFields(fields || {}), updatedBy), toTom))),
  delete: (id, deletedBy) => when(store.getById(id), m => (!m || !m.tom ? false : store.delete(id, deletedBy))),
  permanentDelete: id => when(store.getAnyById(id), m => (!m || !m.tom ? false : store.permanentDelete(id))),
  restore: id => when(store.getAnyById(id), m => (!m || !m.tom || !m.deletedAt ? null : when(store.restore(id), toTom))),
  getDeleted: () => when(store.getDeleted(), l => l.filter(m => m.tom).map(toTom)),
}
