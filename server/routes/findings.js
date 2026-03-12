// © 2026 Claude Hecker — ISMS Builder V 1.32 — AGPL-3.0
// Findings-Routen — Audit-Feststellungen + Maßnahmenpläne
'use strict'
const express = require('express')
const router  = express.Router()
const { requireAuth, authorize } = require('../auth')
const store = require('../db/findingStore')
const audit = require('../db/auditStore')

// ── Listings & Summary ────────────────────────────────────────────────────────
router.get('/findings/summary', requireAuth, authorize('reader'), (req, res) => {
  res.json(store.getSummary())
})

router.get('/findings', requireAuth, authorize('reader'), (req, res) => {
  const { status, severity, auditor } = req.query
  res.json(store.getAll({ status, severity, auditor }))
})

router.get('/findings/:id', requireAuth, authorize('reader'), (req, res) => {
  const f = store.getById(req.params.id)
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json(f)
})

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.post('/findings', requireAuth, authorize('auditor'), (req, res) => {
  const f = store.create(req.body, req.user)
  audit.append({ user: req.user, action: 'create', resource: 'finding', resourceId: f.id })
  res.status(201).json(f)
})

router.put('/findings/:id', requireAuth, authorize('auditor'), (req, res) => {
  const f = store.update(req.params.id, req.body, req.user)
  if (!f) return res.status(404).json({ error: 'Not found' })
  audit.append({ user: req.user, action: 'update', resource: 'finding', resourceId: f.id })
  res.json(f)
})

router.delete('/findings/:id', requireAuth, authorize('auditor'), (req, res) => {
  const ok = store.remove(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  audit.append({ user: req.user, action: 'delete', resource: 'finding', resourceId: req.params.id })
  res.json({ deleted: true })
})

router.delete('/findings/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  const ok = store.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  audit.append({ user: req.user, action: 'permanent_delete', resource: 'finding', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})

router.post('/findings/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const f = store.restore(req.params.id)
  if (!f) return res.status(404).json({ error: 'Not found' })
  audit.append({ user: req.user, action: 'restore', resource: 'finding', resourceId: f.id })
  res.json(f)
})

// ── Maßnahmenplan (Actions) ───────────────────────────────────────────────────
router.post('/findings/:id/actions', requireAuth, authorize('auditor'), (req, res) => {
  const action = store.addAction(req.params.id, req.body, req.user)
  if (!action) return res.status(404).json({ error: 'Finding not found' })
  res.status(201).json(action)
})

router.put('/findings/:id/actions/:actionId', requireAuth, authorize('editor'), (req, res) => {
  const action = store.updateAction(req.params.id, req.params.actionId, req.body, req.user)
  if (!action) return res.status(404).json({ error: 'Not found' })
  res.json(action)
})

router.delete('/findings/:id/actions/:actionId', requireAuth, authorize('auditor'), (req, res) => {
  const ok = store.deleteAction(req.params.id, req.params.actionId)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  res.json({ deleted: true })
})

module.exports = router
