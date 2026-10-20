// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Keyword fallback search — works without Ollama.
// Searches title + description + content across all stores, scores by term hits.
'use strict'

/**
 * Score a document against a list of search terms.
 * Returns 0 if no match, otherwise a percentage-like score.
 */
function score(doc, terms) {
  const haystack = [doc.title, doc.name, doc.description, doc.content, doc.scope, doc.notes, doc.threat, doc.vulnerability]
    .filter(Boolean).join(' ').toLowerCase()

  let hits = 0
  for (const t of terms) {
    if (haystack.includes(t)) hits++
  }
  if (!hits) return 0
  // Weight title matches higher
  const titleHay = (doc.title || doc.name || '').toLowerCase()
  const titleHits = terms.filter(t => titleHay.includes(t)).length
  return Math.round(((hits / terms.length) * 70) + (titleHits > 0 ? 30 : 0))
}

// urlOrFn: fester String für die meisten Module (nur Modul-Ebene), oder eine
// Funktion (doc) => url für Module, die auf den konkreten Treffer verlinken
// sollen (siehe Finding unten, #72-Folgefehler).
function collect(items, type, urlOrFn, terms) {
  return items
    .filter(i => !i.deletedAt)
    .map(i => ({ doc: i, s: score(i, terms), type, url: typeof urlOrFn === 'function' ? urlOrFn(i) : urlOrFn }))
    .filter(r => r.s > 0)
}

async function search(query, topK = 8) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2)
  if (!terms.length) return []

  const results = []

  try {
    const storage = require('../storage')
    const types = ['policy','procedure','record','guideline','template']
    for (const t of types) {
      const items = (await storage.getTemplates?.(t)) || []
      results.push(...collect(items, 'Dokument', '#templates', terms))
    }
  } catch {}

  try {
    const riskStore = require('../db/riskStore')
    results.push(...collect((await riskStore.getAll?.()) || [], 'Risiko', '#risks', terms))
  } catch {}

  try {
    const { searchDoc } = require('../db/measuresCommon')
    const measures = (await require('../db/measuresStore').getAll()).map(searchDoc)
    results.push(...collect(measures, 'Maßnahme', '#measures', terms))
  } catch {}

  try {
    const goalsStore = require('../db/goalsStore')
    results.push(...collect((await goalsStore.getAll?.()) || [], 'Sicherheitsziel', '#goals', terms))
  } catch {}

  try {
    const guidanceStore = require('../db/guidanceStore')
    results.push(...collect((await guidanceStore.getAll?.(4)) || [], 'Systemhandbuch', '#guidance', terms))
  } catch {}

  try {
    const trainingStore = require('../db/trainingStore')
    results.push(...collect((await trainingStore.getAll?.()) || [], 'Schulung', '#training', terms))
  } catch {}

  try {
    const assetStore = require('../db/assetStore')
    const assets = ((await assetStore.getAll?.()) || []).map(a => ({ ...a, title: a.name }))
    results.push(...collect(assets, 'Asset', '#assets', terms))
  } catch {}

  try {
    const supplierStore = require('../db/supplierStore')
    const suppliers = ((await supplierStore.getAll?.()) || []).map(s => ({ ...s, title: s.name }))
    results.push(...collect(suppliers, 'Lieferant', '#suppliers', terms))
  } catch {}

  try {
    // #72: gleiche Lücke wie im semantischen Index (embeddingStore.js) — Findings
    // fehlten hier ebenfalls komplett. Deep-Link mit findingId (Folgefehler aus
    // derselben Diskussion): ein Klick auf das Suchergebnis soll das konkrete
    // Finding öffnen, nicht nur das Modul.
    const findingStore = require('../db/findingStore')
    const findings = ((await findingStore.getAll?.()) || []).map(f => ({
      ...f,
      description: [f.observation, f.requirement, f.recommendation, f.auditedArea].filter(Boolean).join(' '),
    }))
    results.push(...collect(findings, 'Finding', f => `#reports?findingId=${f.id}`, terms))
  } catch {}

  try {
    // Audits (Audit-Management): Deep-Link mit auditId öffnet das konkrete Audit
    const auditMgmt = require('../db/auditMgmtStore')
    const audits = (await auditMgmt.getAll()).map(a => ({
      ...a, description: [a.scope, a.standard, a.conclusion, ...(a.checklist || []).map(i => i.question)].filter(Boolean).join(' '),
    }))
    results.push(...collect(audits, 'Audit', a => `#audits?auditId=${a.id}`, terms))
  } catch {}

  return results
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .map(r => ({
      id:    r.doc.id,
      type:  r.type,
      title: r.doc.title || r.doc.name || r.doc.id,
      text:  (r.doc.description || r.doc.content || '').slice(0, 120),
      url:   r.url,
      score: r.s,
    }))
}

module.exports = { search }
