// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// NIS2-Routen:
//   Art. 21 — Governance-Checkliste (30 Items)
//   Art. 23 — Meldefristen für Sicherheitsvorfälle (24 h / 72 h / 1 Monat)
'use strict'

const express = require('express')
const router  = express.Router()

const { requireAuth, authorize } = require('../auth')
const govStore      = require('../db/nis2GovernanceStore')
const art23         = require('../db/art23')
const incidentStore = require('../db/publicIncidentStore')
const auditStore    = require('../db/auditStore')

// ════════════════════════════════════════════════════════════
// Art. 21 — Governance-Checkliste
// ════════════════════════════════════════════════════════════

router.get('/nis2/governance/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(govStore.getSummary())
})

router.get('/nis2/governance', requireAuth, authorize('reader'), (req, res) => {
  res.json({
    items:   govStore.getAll(req.query),
    summary: govStore.getSummary(),
  })
})

router.get('/nis2/governance/:id', requireAuth, authorize('reader'), (req, res) => {
  const item = govStore.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})

router.put('/nis2/governance/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const result = govStore.update(req.params.id, req.body, { changedBy: req.user })
  if (!result) return res.status(404).json({ error: 'Not found' })
  if (result.error) return res.status(400).json(result)
  await auditStore.append({
    user: req.user, action: 'update', resource: 'nis2_governance',
    detail: `${result.id} → ${result.status}`,
  })
  res.json(result)
})

// ════════════════════════════════════════════════════════════
// Art. 23 — Meldefristen
// ════════════════════════════════════════════════════════════

// Muss vor '/nis2/incidents/:id' stehen, sonst greift der Parameter-Match.
router.get('/nis2/incidents/deadlines', requireAuth, authorize('reader'), async (req, res) => {
  const list = await incidentStore.getAll({})
  res.json(art23.upcomingDeadlines(list))
})

router.get('/nis2/incidents/:id', requireAuth, authorize('reader'), async (req, res) => {
  const incident = await incidentStore.getById(req.params.id)
  if (!incident) return res.status(404).json({ error: 'Not found' })
  res.json(art23.annotate(incident))
})

// Art.-23-Verfolgung für einen Vorfall starten (Zeitpunkt der Kenntnisnahme setzt die Fristen)
router.post('/nis2/incidents/:id/init', requireAuth, authorize('contentowner'), async (req, res) => {
  const incident = await incidentStore.getById(req.params.id)
  if (!incident) return res.status(404).json({ error: 'Not found' })

  const patch = art23.initialize(incident, req.body.discoveredAt)
  if (patch.error) return res.status(400).json(patch)

  const updated = await incidentStore.update(req.params.id, patch, req.user)
  await auditStore.append({
    user: req.user, action: 'update', resource: 'nis2_art23',
    detail: `${req.params.id} Fristen gesetzt`,
  })
  res.json(art23.annotate(updated))
})

// Eine Phase als gemeldet markieren
router.post('/nis2/incidents/:id/phase/:phase', requireAuth, authorize('contentowner'), async (req, res) => {
  const incident = await incidentStore.getById(req.params.id)
  if (!incident) return res.status(404).json({ error: 'Not found' })

  const patch = art23.markPhaseSubmitted(incident, req.params.phase, req.body.submittedAt)
  if (patch.error) return res.status(400).json(patch)

  const updated = await incidentStore.update(req.params.id, patch, req.user)
  await auditStore.append({
    user: req.user, action: 'update', resource: 'nis2_art23',
    detail: `${req.params.id} ${req.params.phase} gemeldet`,
  })
  res.json(art23.annotate(updated))
})

// Meldeinhalt einer Phase speichern
router.put('/nis2/incidents/:id/report/:phase', requireAuth, authorize('contentowner'), async (req, res) => {
  const incident = await incidentStore.getById(req.params.id)
  if (!incident) return res.status(404).json({ error: 'Not found' })

  const patch = art23.saveReport(incident, req.params.phase, req.body)
  if (patch.error) return res.status(400).json(patch)

  const updated = await incidentStore.update(req.params.id, patch, req.user)
  res.json(art23.annotate(updated))
})

// Meldung als JSON für die Übermittlung an die zuständige Stelle
router.get('/nis2/incidents/:id/export', requireAuth, authorize('reader'), async (req, res) => {
  const incident = await incidentStore.getById(req.params.id)
  if (!incident) return res.status(404).json({ error: 'Not found' })

  const payload  = art23.buildReportExport(incident)
  const filename = `nis2-art23-${incident.refNumber || incident.id}.json`
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(JSON.stringify(payload, null, 2))
})

module.exports = router
