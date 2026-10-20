// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Maßnahmen-Register: zentral, durchsuchbar, zugeordnet zu SoA-Controls und Feststellungen.
// Lesen: reader · Anlegen/Ändern: editor · Löschen (Papierkorb): contentowner · Wiederherstellen/endgültig löschen: admin
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const measuresStore = require('../db/measuresStore')
const auditStore = require('../db/auditStore')
const embeddingStore = require('../ai/embeddingStore')
const { searchDoc } = require('../db/measuresCommon')

// TOMs (Art. 32 DSGVO) bearbeiten und löschen wie im DSGVO-Modul nur Contentowner; Editoren dürfen sie weder ändern noch anlegen
const TOM_MIN_RANK = 3
const ADMIN_RANK = require('../auth').ROLE_RANK.admin
const tomDenied = (req, res) => { res.status(403).json({ error: 'Mindestens contentowner-Rolle erforderlich' }); return true }
const indexSafe = async m => { try { await embeddingStore.indexDoc(searchDoc(m), 'Maßnahme', '#measures') } catch { /* KI-Index optional */ } }

// Verknüpfungen müssen auf vorhandene SoA-Controls bzw. Feststellungen zeigen (keine hängenden Verweise)
async function checkLinks(body) {
  if (body.linkedRisks !== undefined) {
    if (!Array.isArray(body.linkedRisks)) return 'linkedRisks must be a list'
    const riskStore = require('../db/riskStore')
    for (const id of body.linkedRisks) if (typeof id !== 'string' || !(await riskStore.getById(id))) return `Unknown risk: ${id}`
  }
  if (body.linkedControls !== undefined) {
    if (!Array.isArray(body.linkedControls)) return 'linkedControls must be a list'
    const soaStore = require('../db/soaStore')
    for (const id of body.linkedControls) if (typeof id !== 'string' || !(await soaStore.getById(id))) return `Unknown SoA control: ${id}`
  }
  if (body.linkedFindings !== undefined) {
    if (!Array.isArray(body.linkedFindings)) return 'linkedFindings must be a list'
    const findingStore = require('../db/findingStore')
    for (const id of body.linkedFindings) if (typeof id !== 'string' || !(await findingStore.getById(id))) return `Unknown finding: ${id}`
  }
  return null
}
// Die Zuordnung zu Risiken und Feststellungen sowie Behandlungen von Risiken verlangen wie in den Risiko- und Feststellungs-Routen
// mindestens die Rolle Auditor/Contentowner – das Register gibt niemandem mehr Rechte als vorher.
const sameIds = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort())
function linkRightsDenied(req, res, existing, body) {
  if ((req.roleRank || 0) >= 3) return false
  const changes = k => body[k] !== undefined && !sameIds(body[k], existing ? existing[k] : [])
  if (changes('linkedRisks') || changes('linkedFindings') || (existing && (existing.linkedRisks || []).length)) {
    res.status(403).json({ error: 'Mindestens auditor- oder contentowner-Rolle erforderlich' })
    return true
  }
  return false
}
const audit = (req, action, m, detail) => auditStore.append({ user: req.user, action, resource: 'measure', resourceId: m.id, detail: detail || `${m.ref} ${m.title}` })

router.get('/measures/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await measuresStore.getSummary())
})

router.get('/measures', requireAuth, authorize('reader'), async (req, res) => {
  const { q, status, responsible, control, finding, risk, overdue, tom, governance, category, source, priority } = req.query
  res.json(await measuresStore.getAll({ q, status, responsible, control, finding, risk, overdue, tom, governance, category, source, priority }))
})

router.get('/measures/:id', requireAuth, authorize('reader'), async (req, res) => {
  const m = await measuresStore.getById(req.params.id)
  if (!m) return res.status(404).json({ error: 'Not found' })
  res.json(m)
})

router.post('/measures', requireAuth, authorize('editor'), async (req, res) => {
  const body = req.body || {}
  if (!String(body.title || '').trim()) return res.status(400).json({ error: 'Title is required' })
  if (body.tom === true && (req.roleRank || 0) < TOM_MIN_RANK) return tomDenied(req, res)
  if (linkRightsDenied(req, res, null, body)) return
  const bad = await checkLinks(body)
  if (bad) return res.status(400).json({ error: bad })
  const m = await measuresStore.create(body, req.user)
  await audit(req, 'create', m)
  await indexSafe(m)
  res.status(201).json(m)
})

router.put('/measures/:id', requireAuth, authorize('editor'), async (req, res) => {
  const body = req.body || {}
  if (body.title !== undefined && !String(body.title).trim()) return res.status(400).json({ error: 'Title is required' })
  const existing = await measuresStore.getById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if ((existing.tom || body.tom === true) && (req.roleRank || 0) < TOM_MIN_RANK) return tomDenied(req, res)
  if (linkRightsDenied(req, res, existing, body)) return
  const bad = await checkLinks(body)
  if (bad) return res.status(400).json({ error: bad })
  const m = await measuresStore.update(req.params.id, body, req.user)
  if (!m) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'update', m)
  await indexSafe(m)
  res.json(m)
})

router.delete('/measures/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const m = await measuresStore.getById(req.params.id)
  if (m && m.governance && (req.roleRank || 0) < ADMIN_RANK) return res.status(403).json({ error: 'Forbidden: insufficient permissions' })   // wie im Governance-Modul: Löschen nur Admin
  if (!m || !(await measuresStore.delete(req.params.id, req.user))) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'delete', m)
  res.json({ deleted: true })
})

router.post('/measures/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const m = await measuresStore.restore(req.params.id)
  if (!m) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'restore', m)
  res.json(m)
})

router.delete('/measures/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await measuresStore.permanentDelete(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await auditStore.append({ user: req.user, action: 'permanent_delete', resource: 'measure', resourceId: req.params.id })
  try { embeddingStore.removeDoc(req.params.id) } catch { /* KI-Index optional */ }
  res.json({ deleted: true, permanent: true })
})

module.exports = router
