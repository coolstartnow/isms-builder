// © 2026 Claude Hecker — ISMS Builder V 1.32.0 — AGPL-3.0
// Findings-Routen — Audit-Feststellungen + Maßnahmenpläne
'use strict'
const express = require('express')
const router  = express.Router()
const { requireAuth, authorize } = require('../auth')
const store          = require('../db/findingStore')
const audit          = require('../db/auditStore')
const embeddingStore = require('../ai/embeddingStore')

// ── Listings & Summary ────────────────────────────────────────────────────────
router.get('/findings/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await store.getSummary())
})

router.get('/findings', requireAuth, authorize('reader'), async (req, res) => {
  const { status, severity, auditor, auditId } = req.query
  res.json(await store.getAll({ status, severity, auditor, auditId }))
})

router.get('/findings/:id', requireAuth, authorize('reader'), async (req, res) => {
  const f = await store.getById(req.params.id)
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json(f)
})

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.post('/findings', requireAuth, authorize('auditor'), async (req, res) => {
  const f = await store.create(req.body, req.user)
  await audit.append({ user: req.user, action: 'create', resource: 'finding', resourceId: f.id })
  await embeddingStore.indexDoc(f, 'Audit-Feststellung', `#reports?findingId=${f.id}`)
  res.status(201).json(f)
})

router.put('/findings/:id', requireAuth, authorize('auditor'), async (req, res) => {
  const f = await store.update(req.params.id, req.body, req.user)
  if (!f) return res.status(404).json({ error: 'Not found' })
  await audit.append({ user: req.user, action: 'update', resource: 'finding', resourceId: f.id })
  await embeddingStore.indexDoc(f, 'Audit-Feststellung', `#reports?findingId=${f.id}`)
  res.json(f)
})

router.delete('/findings/:id', requireAuth, authorize('auditor'), async (req, res) => {
  const ok = await store.remove(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await audit.append({ user: req.user, action: 'delete', resource: 'finding', resourceId: req.params.id })
  res.json({ deleted: true })
})

router.delete('/findings/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await store.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await audit.append({ user: req.user, action: 'permanent_delete', resource: 'finding', resourceId: req.params.id })
  await embeddingStore.removeDoc(req.params.id)
  res.json({ deleted: true, permanent: true })
})

router.post('/findings/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const f = await store.restore(req.params.id)
  if (!f) return res.status(404).json({ error: 'Not found' })
  await audit.append({ user: req.user, action: 'restore', resource: 'finding', resourceId: f.id })
  res.json(f)
})

// ── Maßnahmenplan (Actions) ───────────────────────────────────────────────────
router.post('/findings/:id/actions', requireAuth, authorize('auditor'), async (req, res) => {
  const action = await store.addAction(req.params.id, req.body, req.user)
  if (!action) return res.status(404).json({ error: 'Finding not found' })
  res.status(201).json(action)
})

router.put('/findings/:id/actions/:actionId', requireAuth, authorize('editor'), async (req, res) => {
  const action = await store.updateAction(req.params.id, req.params.actionId, req.body, req.user)
  if (!action) return res.status(404).json({ error: 'Not found' })
  res.json(action)
})

router.delete('/findings/:id/actions/:actionId', requireAuth, authorize('auditor'), async (req, res) => {
  const ok = await store.deleteAction(req.params.id, req.params.actionId, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.json({ deleted: true })
})

module.exports = router
