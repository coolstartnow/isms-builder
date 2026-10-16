// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const { langOf, translateLabel } = require('../i18n')
const riskStore = require('../db/riskStore')
const embeddingStore = require('../ai/embeddingStore')

function authorizeAuditor(req, res, next) {
  if (req.roleRank >= 3) return next()
  res.status(403).json({ error: 'Mindestens auditor- oder contentowner-Rolle erforderlich' })
}

router.get('/risks/calendar', requireAuth, authorize('reader'), async (req, res) => {
  const lang = langOf(req)
  res.json((await riskStore.getCalendarEvents()).map(e => ({ ...e, label: translateLabel(e.label, lang) })))
})
router.get('/risks/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await riskStore.getSummary())
})
router.get('/risks/review-pending', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await riskStore.getReviewPending())
})
router.get('/risks', requireAuth, authorize('reader'), async (req, res) => {
  const { category, status, entity, asset, assetType, supplier } = req.query
  res.json(await riskStore.getAll({ category, status, entity, asset, assetType, supplier }))
})
router.get('/risks/:id', requireAuth, authorize('reader'), async (req, res) => {
  const r = await riskStore.getById(req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})
router.post('/risks', requireAuth, authorizeAuditor, async (req, res) => {
  const r = await riskStore.create(req.body, req.user)
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'risk', resourceId: r?.id, detail: req.body.title || '' })
  await embeddingStore.indexDoc(r, 'Risiko', '#risks')
  res.status(201).json(r)
})
router.put('/risks/:id', requireAuth, async (req, res) => {
  const existing = await riskStore.getById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const canManageRisk = (req.roleRank || 0) >= 3
  const isOwner = existing.owner && existing.owner === req.user
  if (!canManageRisk && !isOwner) {
    return res.status(403).json({ error: 'Mindestens auditor- oder contentowner-Rolle oder eingetragener Owner erforderlich' })
  }
  const r = await riskStore.update(req.params.id, req.body)
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'risk', resourceId: req.params.id, detail: existing.title || '' })
  await embeddingStore.indexDoc(r, 'Risiko', '#risks')
  res.json(r)
})
router.delete('/risks/:id', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await riskStore.delete(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'risk', resourceId: req.params.id })
  res.json({ deleted: true })
})

router.delete('/risks/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await riskStore.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'risk', resourceId: req.params.id })
  await embeddingStore.removeDoc(req.params.id)
  res.json({ deleted: true, permanent: true })
})

router.post('/risks/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await riskStore.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'risk', resourceId: req.params.id })
  res.json(item)
})

// ── Review-Queue ──
router.post('/risks/:id/approve', requireAuth, authorizeAuditor, async (req, res) => {
  const r = await riskStore.approve(req.params.id, req.user)
  if (!r) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'approve', resource: 'risk', resourceId: r.id, detail: r.title })
  res.json(r)
})

router.post('/risks/:id/treatments', requireAuth, authorizeAuditor, async (req, res) => {
  const tp = await riskStore.addTreatment(req.params.id, req.body, req.user)
  if (!tp) return res.status(404).json({ error: 'Risk not found' })
  res.status(201).json(tp)
})
router.put('/risks/:id/treatments/:tpId', requireAuth, authorizeAuditor, async (req, res) => {
  const tp = await riskStore.updateTreatment(req.params.id, req.params.tpId, req.body)
  if (!tp) return res.status(404).json({ error: 'Not found' })
  res.json(tp)
})
router.delete('/risks/:id/treatments/:tpId', requireAuth, authorizeAuditor, async (req, res) => {
  const ok = await riskStore.deleteTreatment(req.params.id, req.params.tpId)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'risk_treatment', resourceId: req.params.tpId, detail: `riskId: ${req.params.id}` })
  res.json({ deleted: true })
})

module.exports = router
