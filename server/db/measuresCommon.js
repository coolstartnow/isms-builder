// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Gemeinsame Logik des Maßnahmen-Registers für alle Speicher (JSON und Knex): Status, Normalisierung, Filter, Zusammenfassung.
// Die Stores (db/measuresStore.js, db/stores/measuresStore.js) kümmern sich nur um das Lesen und Schreiben.
//
// Das Register ist der einzige Bestand für Maßnahmen. Technisch-organisatorische Maßnahmen nach Art. 32 DSGVO (TOMs) sind
// Maßnahmen mit dem Kennzeichen `tom: true`; für sie gelten zusätzlich Kategorie, Risikostufe, Aufbewahrungsregel usw.

const STATUSES = [
  { id: 'planned',     label: 'Geplant' },
  { id: 'in_progress', label: 'In Umsetzung' },
  { id: 'implemented', label: 'Umgesetzt' },
  { id: 'verified',    label: 'Wirksamkeit geprüft' },
  { id: 'cancelled',   label: 'Abgebrochen' },
]
const STATUS_IDS = STATUSES.map(s => s.id)
const OPEN_STATUSES = ['planned', 'in_progress']   // nur diese können überfällig sein

const TOM_CATEGORIES = ['access', 'encryption', 'logging', 'network', 'application', 'backup', 'organizational', 'training', 'retention']
const TOM_STATUSES   = ['planned', 'in_progress', 'implemented', 'verified']
const TOM_RISKS      = ['low', 'medium', 'high', 'critical']
// Herkunft einer Maßnahme (Governance-Aktionen): Managementbewertung, Audits, Vorfall, Sonstiges
const GOV_SOURCES    = ['management_review', 'internal_audit', 'external_audit', 'incident', 'other']
const PRIORITIES     = ['low', 'medium', 'high', 'critical']

const nowISO = () => new Date().toISOString()
const makeId = () => `meas_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const str = v => (v == null ? '' : String(v)).trim()
const idList = v => [...new Set((Array.isArray(v) ? v : []).filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))]
const dateOrNull = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null)

// Referenz M-001, M-002, … (fortlaufend, auch gelöschte zählen mit, damit Referenzen nie wiederverwendet werden)
function nextRef(existingRefs) {
  let max = 0
  for (const r of existingRefs) { const m = /^M-(\d+)$/.exec(r || ''); if (m) max = Math.max(max, parseInt(m[1], 10)) }
  return 'M-' + String(max + 1).padStart(3, '0')
}

// Ausgangswerte einer neuen Maßnahme
const blank = () => ({
  id: makeId(), ref: '', title: '', description: '', implementation: '', responsible: '', dueDate: null, reviewDate: null, status: 'planned',
  linkedControls: [], linkedFindings: [], linkedRisks: [], linkedPolicies: [], linkedVvt: [], applicableEntities: [],
  tom: false, category: '', riskLevel: '', evidenceNote: '', retentionRule: '',
  governance: false, source: '', sourceRef: '', priority: '', progress: 0, completedDate: null, notes: '', ownerEmail: '', entityId: '', attachments: [],
})
const clampProgress = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 }

// Eingaben bereinigen. `base` = vorhandener Datensatz (Update) oder blank() (Neuanlage). Nur übergebene Felder ändern sich.
function normalize(fields, base = {}) {
  const f = fields || {}
  const has = k => f[k] !== undefined
  const out = { ...base }
  if (has('title'))              out.title = str(f.title)
  if (has('description'))        out.description = str(f.description)
  if (has('implementation'))     out.implementation = str(f.implementation)
  if (has('responsible'))        out.responsible = str(f.responsible)
  if (has('dueDate'))            out.dueDate = dateOrNull(f.dueDate)
  if (has('reviewDate'))         out.reviewDate = dateOrNull(f.reviewDate)
  if (has('status'))             out.status = STATUS_IDS.includes(f.status) ? f.status : (base.status || 'planned')
  if (has('linkedControls'))     out.linkedControls = idList(f.linkedControls)
  if (has('linkedFindings'))     out.linkedFindings = idList(f.linkedFindings)
  if (has('linkedRisks'))        out.linkedRisks = idList(f.linkedRisks)
  if (has('linkedPolicies'))     out.linkedPolicies = idList(f.linkedPolicies)
  if (has('linkedVvt'))          out.linkedVvt = idList(f.linkedVvt)
  if (has('applicableEntities')) out.applicableEntities = idList(f.applicableEntities)
  if (has('tom'))                out.tom = !!f.tom
  if (has('category'))           out.category = str(f.category)
  if (has('riskLevel'))          out.riskLevel = str(f.riskLevel)
  if (has('evidenceNote'))       out.evidenceNote = str(f.evidenceNote)
  if (has('retentionRule'))      out.retentionRule = str(f.retentionRule)
  if (has('governance'))         out.governance = !!f.governance
  if (has('source'))             out.source = str(f.source)
  if (has('sourceRef'))          out.sourceRef = str(f.sourceRef)
  if (has('priority'))           out.priority = str(f.priority)
  if (has('progress'))           out.progress = clampProgress(f.progress)
  if (has('completedDate'))      out.completedDate = dateOrNull(f.completedDate)
  if (has('notes'))              out.notes = str(f.notes)
  if (has('ownerEmail'))         out.ownerEmail = str(f.ownerEmail)
  if (has('entityId'))           out.entityId = str(f.entityId)
  // Wird eine Maßnahme als erledigt markiert und hat noch kein Datum, gilt heute (wie bisher bei Governance-Aktionen)
  if (has('status') && ['implemented', 'verified'].includes(out.status) && !out.completedDate) out.completedDate = nowISO().slice(0, 10)
  // Kategorie und Risikostufe: gültige Werte; bei TOMs gelten die Vorgaben der TOM-Liste (wie bisher im DSGVO-Modul)
  if (!TOM_CATEGORIES.includes(out.category)) out.category = out.tom ? 'organizational' : ''
  if (!TOM_RISKS.includes(out.riskLevel))     out.riskLevel = out.tom ? 'medium' : ''
  // Governance-Aktionen: Herkunft und Priorität haben gültige Werte (Vorgaben wie bisher im Governance-Modul)
  if (!GOV_SOURCES.includes(out.source))      out.source = out.governance ? 'management_review' : ''
  if (!PRIORITIES.includes(out.priority))     out.priority = out.governance ? 'medium' : ''
  return out
}

function isOverdue(m, today = nowISO().slice(0, 10)) {
  return !!m.dueDate && m.dueDate < today && OPEN_STATUSES.includes(m.status)
}

const truthy = v => v === true || v === '1' || v === 'true'
const falsy  = v => v === false || v === '0' || v === 'false'

// Suche und Filter (Text in Referenz, Titel, Beschreibung, Umsetzung, Nachweis, Verantwortlichem; exakt nach Status usw.)
function filterList(list, { q, status, responsible, control, finding, risk, overdue, tom, governance, category, source, priority, entity } = {}, today) {
  let out = list
  if (status)      out = out.filter(m => m.status === status)
  if (category)    out = out.filter(m => m.category === category)
  if (responsible) { const r = responsible.toLowerCase(); out = out.filter(m => (m.responsible || '').toLowerCase().includes(r)) }
  if (control)     out = out.filter(m => (m.linkedControls || []).includes(control))
  if (finding)     out = out.filter(m => (m.linkedFindings || []).includes(finding))
  if (risk)        out = out.filter(m => (m.linkedRisks || []).includes(risk))
  if (source)      out = out.filter(m => m.source === source)
  if (priority)    out = out.filter(m => m.priority === priority)
  if (entity)      out = out.filter(m => !(m.applicableEntities || []).length || m.applicableEntities.includes(entity))   // leer = alle Einheiten
  if (truthy(tom)) out = out.filter(m => m.tom)
  else if (falsy(tom)) out = out.filter(m => !m.tom)
  if (truthy(governance)) out = out.filter(m => m.governance)
  else if (falsy(governance)) out = out.filter(m => !m.governance)
  if (truthy(overdue)) out = out.filter(m => isOverdue(m, today))
  if (q && String(q).trim()) {
    const words = String(q).toLowerCase().split(/\s+/).filter(Boolean)
    out = out.filter(m => {
      const hay = `${m.ref} ${m.title} ${m.description} ${m.implementation} ${m.evidenceNote} ${m.notes} ${m.sourceRef} ${m.responsible}`.toLowerCase()
      return words.every(w => hay.includes(w))   // alle Suchwörter müssen vorkommen
    })
  }
  return out
}

function summarize(list, today) {
  const byStatus = Object.fromEntries(STATUS_IDS.map(id => [id, 0]))
  for (const m of list) if (byStatus[m.status] !== undefined) byStatus[m.status]++
  return {
    total: list.length,
    byStatus,
    overdue: list.filter(m => isOverdue(m, today)).length,
    // TOMs und Governance-Maßnahmen haben ihren Bezug über die Art der Maßnahme, nicht über Controls/Feststellungen/Risiken
    withoutLinks: list.filter(m => !m.tom && !m.governance && !(m.linkedControls || []).length && !(m.linkedFindings || []).length && !(m.linkedRisks || []).length).length,
    toms: list.filter(m => m.tom).length,
  }
}

// Maßnahmen, die einem Risiko, einer Feststellung oder der Governance zugeordnet sind, erscheinen dort mit ihrem eigenen
// Kalenderereignis (treatment_due, finding_action_due, governance_action) – hier nicht noch einmal.
function calendarEvents(list) {
  const own = m => !(m.linkedRisks || []).length && !(m.linkedFindings || []).length && !m.governance
  return list.filter(m => m.dueDate && OPEN_STATUSES.includes(m.status) && own(m)).map(m => ({
    date: m.dueDate, type: 'measure_due', label: `Maßnahme fällig: ${m.title}`, title: m.title, measureId: m.id, ref: m.ref,
  }))
}

// Dokument für die KI-Suche (Titel mit Referenz; Umsetzung, Nachweis und Verantwortlicher als Text)
function searchDoc(m) {
  return { id: m.id, title: `${m.ref} ${m.title}`.trim(), description: m.description,
    content: [m.implementation, m.evidenceNote, m.responsible].filter(Boolean).join(' ') }
}

module.exports = { STATUSES, STATUS_IDS, OPEN_STATUSES, TOM_CATEGORIES, TOM_STATUSES, TOM_RISKS, GOV_SOURCES, PRIORITIES, nowISO, makeId, nextRef, blank, normalize, isOverdue, filterList, summarize, calendarEvents, searchDoc }
