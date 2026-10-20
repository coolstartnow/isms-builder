// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Übernimmt die bisherigen TOMs des DSGVO-Moduls in das Maßnahmen-Register (Variante „ein Bestand“).
// Quelle: JSON → <Daten>/gdpr/toms.json · SQL → Tabelle gdpr_entries (gdpr_type = 'tom').
//  - läuft bei jedem Start (server/index.js → seedAll), ist idempotent: bereits übernommene Kennungen werden nicht angefasst
//  - Kennung, Zeitstempel und Löschstatus (Papierkorb) bleiben erhalten, damit Verweise gültig bleiben
//  - die alten Daten werden NICHT gelöscht oder verändert (bleiben als Sicherung liegen, werden aber nicht mehr gelesen)
const fs = require('fs')
const path = require('path')
const C = require('./measuresCommon')
const store = require('./measuresStore')

async function readOldToms() {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  if (backend === 'json') {
    const file = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'gdpr', 'toms.json')
    try { const l = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(l) ? l : [] } catch { return [] }
  }
  const { getDb } = require('./knexDatabase')
  const rows = await getDb()('gdpr_entries').where('gdpr_type', 'tom')
  return rows.map(r => {
    let d = {}; try { d = JSON.parse(r.data) } catch { /* beschädigte Zeile: nur die Spaltenwerte übernehmen */ }
    return { ...d, id: r.id, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at || d.deletedAt || null, deletedBy: d.deletedBy || null }
  })
}

// Alte TOM → Maßnahme (owner → responsible; Kategorie/Risikostufe/Status gültig oder wie bisher voreingestellt)
function tomToMeasure(t) {
  const now = C.nowISO()
  return {
    id: t.id, title: t.title || 'Ohne Titel', description: t.description, implementation: t.implementation, responsible: t.owner,
    status: C.TOM_STATUSES.includes(t.status) ? t.status : 'planned', reviewDate: t.reviewDate,
    linkedControls: t.linkedControls, linkedPolicies: t.linkedPolicies, linkedVvt: t.linkedVvt, applicableEntities: t.applicableEntities,
    tom: true, category: t.category, riskLevel: t.riskLevel, evidenceNote: t.evidenceNote, retentionRule: t.retentionRule,
    createdAt: t.createdAt || now, updatedAt: t.updatedAt || t.createdAt || now, createdBy: t.createdBy || 'system', updatedBy: t.createdBy || 'system',
    deletedAt: t.deletedAt || null, deletedBy: t.deletedBy || null,
  }
}

async function run() {
  const old = (await readOldToms()).filter(t => t && typeof t.id === 'string' && t.id)
  if (!old.length) return { found: 0, migrated: 0, failed: 0 }
  const have = new Set(await store.allIds())
  old.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))   // stabile Referenzen M-001, … nach Anlagedatum
  let migrated = 0, failed = 0
  for (const t of old) {
    if (have.has(t.id)) continue
    try { if (await store.importRecord(tomToMeasure(t))) migrated++ } catch (e) { failed++; console.warn(`[migration] TOM ${t.id} konnte nicht übernommen werden: ${e.message}`) }
  }
  return { found: old.length, migrated, failed }
}

module.exports = { run, tomToMeasure }
