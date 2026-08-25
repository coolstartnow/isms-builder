// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Supplier Assessment — authenticated routes (Admin/Editor)
'use strict'
const express         = require('express')
const router          = express.Router()
const { requireAuth, authorize } = require('../auth')
const assessmentStore = require('../db/assessmentStore')
const supplierStore   = require('../db/supplierStore')
const auditStore      = require('../db/auditStore')

// ── GET /assessments?supplierId=xxx ──────────────────────────────────────────
router.get('/assessments', requireAuth, authorize('reader'), (req, res) => {
  res.json(assessmentStore.getAll(req.query))
})

// ── GET /assessments/questions/default ───────────────────────────────────────
router.get('/assessments/questions/default', requireAuth, authorize('reader'), (req, res) => {
  res.json(assessmentStore.getDefaultQuestions(req.query.lang))
})

// ── GET /assessments/:id ─────────────────────────────────────────────────────
router.get('/assessments/:id', requireAuth, authorize('reader'), (req, res) => {
  const a = assessmentStore.getById(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  res.json(a)
})

// ── POST /assessments — Assessment-Link erstellen ────────────────────────────
router.post('/assessments', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const { supplierId } = req.body
    if (!supplierId) return res.status(400).json({ error: 'supplierId required' })

    const supplier = await supplierStore.getById(supplierId)
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })

    const item = assessmentStore.create(
      { ...req.body, supplierName: supplier.name },
      { createdBy: req.user }
    )
    await auditStore.append({ user: req.user, action: 'create', resource: 'assessment', detail: supplier.name })
    res.status(201).json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── PUT /assessments/:id/review — Ergebnis bewerten ──────────────────────────
router.put('/assessments/:id/review', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const updated = assessmentStore.review(req.params.id, {
      reviewNote: req.body.reviewNote,
      status:     req.body.status,
      reviewedBy: req.user,
    })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    await auditStore.append({ user: req.user, action: 'review', resource: 'assessment', detail: updated.supplierName })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── DELETE /assessments/:id ──────────────────────────────────────────────────
router.delete('/assessments/:id', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const ok = assessmentStore.remove(req.params.id, { deletedBy: req.user })
    if (!ok) return res.status(404).json({ error: 'Not found' })
    await auditStore.append({ user: req.user, action: 'delete', resource: 'assessment', detail: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
