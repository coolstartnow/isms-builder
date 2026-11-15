// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router  = express.Router()
const { requireAuth, authorize } = require('../auth')
const supplierStore = require('../db/supplierStore')
const embeddingStore = require('../ai/embeddingStore')
const supplierTriage = require('../db/supplierTriage')
const supplierEvidence = require('../supplierEvidence')

router.get('/suppliers/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await supplierStore.getSummary())
})

router.get('/suppliers', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await supplierStore.getAll(req.query))
})

router.get('/suppliers/:id', requireAuth, authorize('reader'), async (req, res) => {
  const s = await supplierStore.getById(req.params.id)
  if (!s) return res.status(404).json({ error: 'Not found' })
  res.json(s)
})

router.post('/suppliers', requireAuth, authorize('editor'), async (req, res) => {
  const triageErrors = supplierTriage.validateTriage(req.body.triage)
  if (triageErrors.length) return res.status(400).json({ error: triageErrors.join('; ') })
  const evidenceError = supplierEvidence.validate(req.body)
  if (evidenceError) return res.status(400).json({ error: evidenceError })
  try {
    const item = await supplierStore.create(req.body, { createdBy: req.user })
    await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'supplier', detail: item.name })
    await embeddingStore.indexDoc({ ...item, title: item.name }, 'Lieferant', '#suppliers')
    res.status(201).json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/suppliers/:id', requireAuth, authorize('editor'), async (req, res) => {
  const triageErrors = supplierTriage.validateTriage(req.body.triage)
  if (triageErrors.length) return res.status(400).json({ error: triageErrors.join('; ') })
  const evidenceError = supplierEvidence.validate(req.body)
  if (evidenceError) return res.status(400).json({ error: evidenceError })
  try {
    const updated = await supplierStore.update(req.params.id, req.body, { changedBy: req.user })
    if (!updated) return res.status(404).json({ error: 'Not found' })
    await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'supplier', detail: updated.name })
    await embeddingStore.indexDoc({ ...updated, title: updated.name }, 'Lieferant', '#suppliers')
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/suppliers/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const ok = await supplierStore.permanentDelete(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'supplier', detail: req.params.id })
    await embeddingStore.removeDoc(req.params.id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/suppliers/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const item = await supplierStore.restore(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'supplier', detail: item.name })
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/suppliers/:id', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const ok = await supplierStore.remove(req.params.id, { deletedBy: req.user })
    if (!ok) return res.status(404).json({ error: 'Not found' })
    await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'supplier', detail: req.params.id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
