// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const storage = require('../storage')

router.get('/trash', requireAuth, authorize('admin'), (req, res) => {
  const riskStore       = require('../db/riskStore')
  const goalsStore      = require('../db/goalsStore')
  const guidanceStore   = require('../db/guidanceStore')
  const trainingStore   = require('../db/trainingStore')
  const legalStore      = require('../db/legalStore')
  const gdprStore       = require('../db/gdprStore')
  const pubStore        = require('../db/publicIncidentStore')

  const items = []

  // Templates
  try {
    const deletedTmpl = storage.getDeletedTemplates?.() || []
    deletedTmpl.forEach(t => items.push({
      module: 'template', moduleLabel: 'Template',
      id: t.id, title: t.title || t.id,
      deletedAt: t.deletedAt, deletedBy: t.deletedBy,
      expiresAt: new Date(new Date(t.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: { type: t.type }
    }))
  } catch {}

  // Risks
  try {
    const deletedRisks = riskStore.getDeleted?.() || []
    deletedRisks.forEach(r => items.push({
      module: 'risk', moduleLabel: 'Risiko',
      id: r.id, title: r.title || r.id,
      deletedAt: r.deletedAt, deletedBy: r.deletedBy,
      expiresAt: new Date(new Date(r.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Goals
  try {
    const deletedGoals = goalsStore.getDeleted?.() || []
    deletedGoals.forEach(g => items.push({
      module: 'goal', moduleLabel: 'Sicherheitsziel',
      id: g.id, title: g.title || g.id,
      deletedAt: g.deletedAt, deletedBy: g.deletedBy,
      expiresAt: new Date(new Date(g.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Guidance
  try {
    const deletedGuidance = guidanceStore.getDeleted?.() || []
    deletedGuidance.forEach(d => items.push({
      module: 'guidance', moduleLabel: 'Guidance-Dokument',
      id: d.id, title: d.title || d.id,
      deletedAt: d.deletedAt, deletedBy: d.deletedBy,
      expiresAt: new Date(new Date(d.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Training
  try {
    const deletedTraining = trainingStore.getDeleted?.() || []
    deletedTraining.forEach(t => items.push({
      module: 'training', moduleLabel: 'Schulung',
      id: t.id, title: t.title || t.id,
      deletedAt: t.deletedAt, deletedBy: t.deletedBy,
      expiresAt: new Date(new Date(t.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Legal: Contracts
  try {
    const deletedContracts = legalStore.contracts.getDeleted?.() || []
    deletedContracts.forEach(c => items.push({
      module: 'legal_contract', moduleLabel: 'Vertrag',
      id: c.id, title: c.title || c.id,
      deletedAt: c.deletedAt, deletedBy: c.deletedBy,
      expiresAt: new Date(new Date(c.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Legal: NDAs
  try {
    const deletedNdas = legalStore.ndas.getDeleted?.() || []
    deletedNdas.forEach(n => items.push({
      module: 'legal_nda', moduleLabel: 'NDA',
      id: n.id, title: n.title || n.id,
      deletedAt: n.deletedAt, deletedBy: n.deletedBy,
      expiresAt: new Date(new Date(n.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Legal: Privacy Policies
  try {
    const deletedPolicies = legalStore.privacyPolicies.getDeleted?.() || []
    deletedPolicies.forEach(p => items.push({
      module: 'legal_policy', moduleLabel: 'Datenschutzrichtlinie',
      id: p.id, title: p.title || p.id,
      deletedAt: p.deletedAt, deletedBy: p.deletedBy,
      expiresAt: new Date(new Date(p.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // GDPR: VVT
  try {
    const deletedVvt = gdprStore.vvt.getDeleted?.() || []
    deletedVvt.forEach(v => items.push({
      module: 'gdpr_vvt', moduleLabel: 'VVT-Eintrag',
      id: v.id, title: v.title || v.id,
      deletedAt: v.deletedAt, deletedBy: v.deletedBy,
      expiresAt: new Date(new Date(v.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // GDPR: AV
  try {
    const deletedAv = gdprStore.av.getDeleted?.() || []
    deletedAv.forEach(a => items.push({
      module: 'gdpr_av', moduleLabel: 'AV-Vertrag',
      id: a.id, title: a.title || a.id,
      deletedAt: a.deletedAt, deletedBy: a.deletedBy,
      expiresAt: new Date(new Date(a.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // GDPR: DSFA
  try {
    const deletedDsfa = gdprStore.dsfa.getDeleted?.() || []
    deletedDsfa.forEach(d => items.push({
      module: 'gdpr_dsfa', moduleLabel: 'DSFA',
      id: d.id, title: d.title || d.id,
      deletedAt: d.deletedAt, deletedBy: d.deletedBy,
      expiresAt: new Date(new Date(d.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // GDPR: Incidents
  try {
    const deletedIncidents = gdprStore.incidents.getDeleted?.() || []
    deletedIncidents.forEach(i => items.push({
      module: 'gdpr_incident', moduleLabel: 'GDPR-Datenpanne',
      id: i.id, title: i.title || i.id,
      deletedAt: i.deletedAt, deletedBy: i.deletedBy,
      expiresAt: new Date(new Date(i.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // GDPR: DSAR
  try {
    const deletedDsar = gdprStore.dsar.getDeleted?.() || []
    deletedDsar.forEach(d => items.push({
      module: 'gdpr_dsar', moduleLabel: 'DSAR-Anfrage',
      id: d.id, title: `${d.requestType}: ${d.dataSubjectName || d.id}`,
      deletedAt: d.deletedAt, deletedBy: d.deletedBy,
      expiresAt: new Date(new Date(d.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // GDPR: TOMs
  try {
    const deletedToms = gdprStore.toms.getDeleted?.() || []
    deletedToms.forEach(t => items.push({
      module: 'gdpr_toms', moduleLabel: 'TOM',
      id: t.id, title: t.title || t.id,
      deletedAt: t.deletedAt, deletedBy: t.deletedBy,
      expiresAt: new Date(new Date(t.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Public Incidents
  try {
    const deletedPub = pubStore.getDeleted?.() || []
    deletedPub.forEach(i => items.push({
      module: 'public_incident', moduleLabel: 'Öff. Vorfall-Meldung',
      id: i.id, title: `${i.refNumber}: ${i.incidentType}`,
      deletedAt: i.deletedAt, deletedBy: i.deletedBy,
      expiresAt: new Date(new Date(i.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  // Suppliers
  try {
    const supplierStore = require('../db/supplierStore')
    const deletedSuppliers = supplierStore.getDeleted?.() || []
    deletedSuppliers.forEach(s => items.push({
      module: 'supplier', moduleLabel: 'Lieferant',
      id: s.id, title: s.name || s.id,
      deletedAt: s.deletedAt, deletedBy: s.deletedBy,
      expiresAt: new Date(new Date(s.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: { type: s.type, criticality: s.criticality }
    }))
  } catch {}

  // Findings
  try {
    const findingStore = require('../db/findingStore')
    const deletedFindings = findingStore.getDeleted?.() || []
    deletedFindings.forEach(f => items.push({
      module: 'finding', moduleLabel: 'Audit-Feststellung',
      id: f.id, title: `${f.ref}: ${f.title || f.id}`,
      deletedAt: f.deletedAt, deletedBy: f.deletedBy,
      expiresAt: new Date(new Date(f.deletedAt).getTime() + 30*86400000).toISOString(),
      meta: {}
    }))
  } catch {}

  items.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''))
  res.json(items)
})

module.exports = router
