// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Risiko-Behandlungen (treatmentPlans) als Sicht auf das Maßnahmen-Register: eine Behandlung ist eine Maßnahme, die dem Risiko
// zugeordnet ist (linkedRisks). Die bisherige Schnittstelle (riskStore.addTreatment/…, /risks/:id/treatments, Risiko-Detail,
// Kalender, Berichte) bleibt unverändert, ohne einen zweiten Bestand zu führen. Unter JSON sind die Aufrufe synchron, unter SQL
// liefern sie Promises (wie der jeweilige Store).
const store = require('./measuresStore')

const when = (v, f) => (v && typeof v.then === 'function' ? v.then(f) : f(v))

// Status der Risiko-Sicht (open, in_progress, completed) ↔ Status der Maßnahme
const TO_MEASURE = { open: 'planned', in_progress: 'in_progress', completed: 'implemented' }
const FROM_MEASURE = { planned: 'open', in_progress: 'in_progress', implemented: 'completed', verified: 'completed' }
const visible = m => m.status !== 'cancelled'   // abgebrochene Maßnahmen sind keine laufende Behandlung (bleiben im Register sichtbar)

function toTp(m) {
  return { id: m.id, ref: m.ref, title: m.title, description: m.description, responsible: m.responsible, dueDate: m.dueDate,
    status: FROM_MEASURE[m.status] || 'open', createdAt: m.createdAt, updatedAt: m.updatedAt, createdBy: m.createdBy }
}

// Behandlungen eines Risikos
const forRisk = riskId => when(store.getAll({ risk: riskId }), l => l.filter(visible).map(toTp))

// Alle Behandlungen, nach Risiko-Kennung gruppiert (ein Lesevorgang für Listen)
const groupByRisk = () => when(store.getAll({}), list => {
  const map = new Map()
  for (const m of list) {
    if (!visible(m)) continue
    for (const rid of m.linkedRisks || []) { if (!map.has(rid)) map.set(rid, []); map.get(rid).push(toTp(m)) }
  }
  return map
})

const add = (riskId, fields, createdBy) => {
  const f = fields || {}
  return when(store.create({
    title: f.title || 'Maßnahme', description: f.description, responsible: f.responsible, dueDate: f.dueDate,
    status: TO_MEASURE[f.status] || 'planned', linkedRisks: [riskId],
  }, createdBy), toTp)
}

const update = (riskId, tpId, fields, updatedBy) => when(store.getById(tpId), m => {
  if (!m || !(m.linkedRisks || []).includes(riskId)) return null
  const f = fields || {}, patch = {}
  for (const k of ['title', 'description', 'responsible', 'dueDate']) if (f[k] !== undefined) patch[k] = f[k]
  if (f.status !== undefined && TO_MEASURE[f.status]) patch.status = TO_MEASURE[f.status]   // ungültige Status ändern nichts
  return when(store.update(tpId, patch, updatedBy), toTp)
})

// „Behandlung löschen“: Gehört die Maßnahme nur diesem Risiko, kommt sie in den Papierkorb (wiederherstellbar). Hängt sie noch an
// Controls, Feststellungen oder weiteren Risiken, wird nur die Zuordnung zu diesem Risiko entfernt.
const remove = (riskId, tpId, by) => when(store.getById(tpId), m => {
  if (!m || !(m.linkedRisks || []).includes(riskId)) return false
  const onlyHere = m.linkedRisks.length === 1 && !(m.linkedControls || []).length && !(m.linkedFindings || []).length && !m.tom && !m.governance
  if (onlyHere) return store.delete(tpId, by)
  return when(store.update(tpId, { linkedRisks: m.linkedRisks.filter(x => x !== riskId) }, by), () => true)
})

// Ein Risiko wird endgültig gelöscht: Die Zuordnung zu ihm entfällt. Maßnahmen, die sonst nirgends hängen (kein Control, keine
// Feststellung, kein weiteres Risiko, keine TOM/Governance), gehen wie früher die eingebetteten Behandlungen mit dem Risiko weg –
// als Papierkorb-Eintrag, nicht endgültig.
const onRiskRemoved = (riskId, by) => when(store.getAll({ risk: riskId }), list => {
  const steps = list.map(m => {
    const rest = (m.linkedRisks || []).filter(x => x !== riskId)
    const orphan = !rest.length && !(m.linkedControls || []).length && !(m.linkedFindings || []).length && !m.tom && !m.governance
    return () => (orphan ? store.delete(m.id, by || 'system') : store.update(m.id, { linkedRisks: rest }, by || 'system'))
  })
  const next = i => (i >= steps.length ? true : when(steps[i](), () => next(i + 1)))
  return next(0)
})

module.exports = { forRisk, groupByRisk, add, update, remove, onRiskRemoved, toTp, TO_MEASURE }
