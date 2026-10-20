// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Maßnahmen zu Feststellungen (actions) als Sicht auf das Maßnahmen-Register: eine Maßnahme ist einer Feststellung zugeordnet
// (linkedFindings). Die bisherige Schnittstelle (findingStore.addAction/…, /findings/:id/actions, Detailansicht, Kalender,
// Berichte) bleibt unverändert, ohne einen zweiten Bestand zu führen. Unter JSON sind die Aufrufe synchron, unter SQL liefern
// sie Promises (wie der jeweilige Store).
const store = require('./measuresStore')

const when = (v, f) => (v && typeof v.then === 'function' ? v.then(f) : f(v))

// Status der Feststellungs-Sicht (open, in_progress, done) ↔ Status der Maßnahme
const TO_MEASURE = { open: 'planned', in_progress: 'in_progress', done: 'implemented' }
const FROM_MEASURE = { planned: 'open', in_progress: 'in_progress', implemented: 'done', verified: 'done' }
const visible = m => m.status !== 'cancelled'   // abgebrochene Maßnahmen sind keine laufende Maßnahme der Feststellung (bleiben im Register)

// Eine Feststellungs-Maßnahme hatte nur eine Beschreibung; die Maßnahme im Register braucht einen Titel: erste Zeile, gekürzt
const titleOf = description => {
  const line = String(description || '').split('\n').map(s => s.trim()).find(Boolean) || ''
  return line ? (line.length > 120 ? line.slice(0, 119) + '…' : line) : 'Maßnahme'
}

function toAction(m) {
  return { id: m.id, ref: m.ref, description: m.description || m.title, responsible: m.responsible, dueDate: m.dueDate,
    status: FROM_MEASURE[m.status] || 'open', updatedAt: m.updatedAt, updatedBy: m.updatedBy }
}

const forFinding = findingId => when(store.getAll({ finding: findingId }), l => l.filter(visible).map(toAction))

const groupByFinding = () => when(store.getAll({}), list => {
  const map = new Map()
  for (const m of list) {
    if (!visible(m)) continue
    for (const fid of m.linkedFindings || []) { if (!map.has(fid)) map.set(fid, []); map.get(fid).push(toAction(m)) }
  }
  return map
})

const add = (findingId, fields, updatedBy) => {
  const f = fields || {}
  const description = f.description || ''
  return when(store.create({
    title: titleOf(description), description, responsible: f.responsible, dueDate: f.dueDate,
    status: TO_MEASURE[f.status] || 'planned', linkedFindings: [findingId],
  }, updatedBy), toAction)
}

const update = (findingId, actionId, fields, updatedBy) => when(store.getById(actionId), m => {
  if (!m || !(m.linkedFindings || []).includes(findingId)) return null
  const f = fields || {}, patch = {}
  if (f.description !== undefined) { patch.description = f.description; patch.title = titleOf(f.description) }
  for (const k of ['responsible', 'dueDate']) if (f[k] !== undefined) patch[k] = f[k]
  if (f.status && TO_MEASURE[f.status]) patch.status = TO_MEASURE[f.status]   // ungültige Status ändern nichts
  return when(store.update(actionId, patch, updatedBy), toAction)
})

// „Maßnahme löschen“: Gehört sie nur dieser Feststellung, kommt sie in den Papierkorb (wiederherstellbar); hängt sie noch an Controls,
// Risiken oder weiteren Feststellungen, wird nur die Zuordnung zu dieser Feststellung entfernt.
const remove = (findingId, actionId, by) => when(store.getById(actionId), m => {
  if (!m || !(m.linkedFindings || []).includes(findingId)) return false
  const onlyHere = m.linkedFindings.length === 1 && !(m.linkedControls || []).length && !(m.linkedRisks || []).length && !m.tom && !m.governance
  if (onlyHere) return store.delete(actionId, by)
  return when(store.update(actionId, { linkedFindings: m.linkedFindings.filter(x => x !== findingId) }, by), () => true)
})

// Eine Feststellung wird endgültig gelöscht: Zuordnung entfällt; Maßnahmen ohne weitere Zuordnung gehen wie früher mit ihr weg
// (als Papierkorb-Eintrag).
const onFindingRemoved = (findingId, by) => when(store.getAll({ finding: findingId }), list => {
  const steps = list.map(m => {
    const rest = (m.linkedFindings || []).filter(x => x !== findingId)
    const orphan = !rest.length && !(m.linkedControls || []).length && !(m.linkedRisks || []).length && !m.tom && !m.governance
    return () => (orphan ? store.delete(m.id, by || 'system') : store.update(m.id, { linkedFindings: rest }, by || 'system'))
  })
  const next = i => (i >= steps.length ? true : when(steps[i](), () => next(i + 1)))
  return next(0)
})

module.exports = { forFinding, groupByFinding, add, update, remove, onFindingRemoved, toAction, titleOf, TO_MEASURE }
