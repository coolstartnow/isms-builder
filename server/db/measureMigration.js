// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Übernimmt die bisher in anderen Modulen eingebetteten Maßnahmen in das Maßnahmen-Register (ein Bestand, keine Doppelanlage):
//   · TOMs des DSGVO-Moduls                      (tomMigration.js)
//   · Risiko-Behandlungen  (risks.treatmentPlans)
// Läuft bei jedem Start (server/index.js → seedAll) und ist idempotent: bereits übernommene Kennungen werden nicht angefasst.
// Kennung, Zeitstempel und Löschstatus bleiben erhalten, die alten Daten werden NICHT verändert oder gelöscht (bleiben als
// Sicherung liegen, werden aber nicht mehr gelesen).
const fs = require('fs')
const path = require('path')
const C = require('./measuresCommon')
const store = require('./measuresStore')

const backend = () => (process.env.STORAGE_BACKEND || 'json').toLowerCase()
const dataDir = () => process.env.DATA_DIR || path.join(__dirname, '../../data')
const readJsonArray = file => { try { const l = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(l) ? l : [] } catch { return [] } }
const parse = v => { try { return v ? JSON.parse(v) : {} } catch { return {} } }
const day = iso => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null)

// ── Risiko-Behandlungen ─────────────────────────────────────────────────────────────────
async function readRiskTreatments() {
  const out = []
  if (backend() === 'json') {
    for (const r of readJsonArray(path.join(dataDir(), 'risks.json'))) for (const tp of (r && r.treatmentPlans) || []) out.push({ tp, risk: r })
    return out
  }
  const { getDb } = require('./knexDatabase')
  for (const row of await getDb()('risks')) {
    const risk = { id: row.id, createdAt: row.created_at, createdBy: row.created_by }
    for (const tp of parse(row.treatments).treatmentPlans || []) out.push({ tp, risk })
  }
  return out
}

// ── Maßnahmen zu Feststellungen ─────────────────────────────────────────────────────────
async function readFindingActions() {
  const out = []
  if (backend() === 'json') {
    for (const f of readJsonArray(path.join(dataDir(), 'findings.json'))) for (const a of (f && f.actions) || []) out.push({ a, finding: f })
    return out
  }
  const { getDb } = require('./knexDatabase')
  for (const row of await getDb()('findings')) {
    const d = parse(row.data)
    const finding = { id: row.id, createdAt: row.created_at, createdBy: row.created_by }
    for (const a of d.actions || []) out.push({ a, finding })
  }
  return out
}

function actionToMeasure({ a, finding }) {
  const status = { open: 'planned', in_progress: 'in_progress', done: 'implemented' }[a.status] || 'planned'
  const created = a.updatedAt || finding.createdAt || C.nowISO()
  const by = a.updatedBy || finding.createdBy || 'system'
  return {
    id: a.id, title: require('./findingActions').titleOf(a.description), description: a.description, responsible: a.responsible,
    dueDate: a.dueDate, status, completedDate: status === 'implemented' ? day(a.updatedAt) : null, linkedFindings: [finding.id],
    createdAt: created, updatedAt: created, createdBy: by, updatedBy: by,
  }
}

// ── Governance-Maßnahmen ────────────────────────────────────────────────────────────────
async function readGovernanceActions() {
  if (backend() === 'json') {
    try { const g = JSON.parse(fs.readFileSync(path.join(dataDir(), 'governance.json'), 'utf8')); return Array.isArray(g && g.actions) ? g.actions : [] } catch { return [] }
  }
  const { getDb } = require('./knexDatabase')
  return (await getDb()('governance_entries').where('gov_type', 'action')).map(row => ({
    ...parse(row.data), id: row.id, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at || null,
  }))
}

function govToMeasure(a) {
  const status = { open: 'planned', in_progress: 'in_progress', completed: 'implemented', cancelled: 'cancelled' }[a.status] || 'planned'
  return {
    id: a.id, title: a.title || 'Ohne Titel', description: a.description, source: a.source, sourceRef: a.sourceRef, responsible: a.owner,
    ownerEmail: a.ownerEmail, dueDate: a.dueDate, completedDate: a.completedDate || null, priority: a.priority, status, progress: a.progress,
    notes: a.notes, entityId: a.entityId, linkedControls: a.linkedControls, linkedPolicies: a.linkedPolicies, governance: true,
    attachments: a.attachments, createdAt: a.createdAt, updatedAt: a.updatedAt || a.createdAt, createdBy: a.createdBy || 'system',
    updatedBy: a.updatedBy || a.createdBy || 'system', deletedAt: a.deletedAt || null, deletedBy: a.deletedBy || (a.deletedAt ? 'system' : null),
  }
}

// Alte Behandlung → Maßnahme: Status offen/in Arbeit/erledigt → geplant/in Umsetzung/umgesetzt; Zuordnung zum Risiko
function treatmentToMeasure({ tp, risk }) {
  const status = { open: 'planned', in_progress: 'in_progress', completed: 'implemented' }[tp.status] || 'planned'
  const created = tp.createdAt || risk.createdAt || C.nowISO()
  return {
    id: tp.id, title: tp.title || 'Maßnahme', description: tp.description, responsible: tp.responsible, dueDate: tp.dueDate,
    status, completedDate: status === 'implemented' ? day(tp.updatedAt) : null, linkedRisks: [risk.id],
    createdAt: created, updatedAt: tp.updatedAt || created, createdBy: tp.createdBy || risk.createdBy || 'system', updatedBy: tp.createdBy || risk.createdBy || 'system',
  }
}

async function importAll(label, old, map, have) {
  let migrated = 0, failed = 0
  const items = old.filter(x => x && map(x).id)
  items.sort((a, b) => String(map(a).createdAt || '').localeCompare(String(map(b).createdAt || '')))   // stabile Referenzen nach Anlagedatum
  for (const x of items) {
    const rec = map(x)
    if (have.has(rec.id)) continue
    try { if (await store.importRecord(rec)) { migrated++; have.add(rec.id) } } catch (e) { failed++; console.warn(`[migration] ${label} ${rec.id} konnte nicht übernommen werden: ${e.message}`) }
  }
  return { found: items.length, migrated, failed }
}

async function run() {
  const result = { toms: await require('./tomMigration').run() }
  const have = new Set(await store.allIds())
  result.risks = await importAll('Risiko-Behandlung', await readRiskTreatments(), treatmentToMeasure, have)
  result.findings = await importAll('Feststellungs-Maßnahme', await readFindingActions(), actionToMeasure, have)
  result.governance = await importAll('Governance-Maßnahme', await readGovernanceActions(), govToMeasure, have)
  result.migrated = Object.values(result).reduce((n, r) => n + (r.migrated || 0), 0)
  result.failed = Object.values(result).reduce((n, r) => n + (r.failed || 0), 0)
  return result
}

module.exports = { run, treatmentToMeasure, actionToMeasure, govToMeasure }
