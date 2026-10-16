// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Audit-Verwaltung — Audits, Prüfpunkte und Auditprogramme (Jahresplan)
'use strict'
const express = require('express')
const router  = express.Router()
const { requireAuth, authorize } = require('../auth')
const store          = require('../db/auditMgmtStore')
const findingStore   = require('../db/findingStore')
const audit          = require('../db/auditStore')
const embeddingStore = require('../ai/embeddingStore')

const log = (req, action, resource, resourceId) =>
  audit.append({ user: req.user, action, resource, resourceId })

// ── Auditprogramme ───────────────────────────────────────────────────────────
// (vor /audits/:id registriert; eigener Pfad, daher keine Kollision)
router.get('/audit-programs', requireAuth, authorize('reader'), async (req, res) => {
  const { year, status } = req.query
  res.json(await store.programs.getAll({ year, status }))
})

router.get('/audit-programs/:id', requireAuth, authorize('reader'), async (req, res) => {
  const p = await store.programs.getById(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json({ ...p, audits: await store.getAll({ programId: p.id }) })
})

router.post('/audit-programs', requireAuth, authorize('auditor'), async (req, res) => {
  const p = await store.programs.create(req.body || {}, req.user)
  await log(req, 'create', 'audit_program', p.id)
  res.status(201).json(p)
})

router.put('/audit-programs/:id', requireAuth, authorize('auditor'), async (req, res) => {
  const existing = await store.programs.getById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.status === 'approved') {
    return res.status(409).json({ error: 'Approved programs cannot be edited. Reopen the program first.' })
  }
  const p = await store.programs.update(req.params.id, req.body || {})
  await log(req, 'update', 'audit_program', p.id)
  res.json(p)
})

router.post('/audit-programs/:id/approve', requireAuth, authorize('contentowner'), async (req, res) => {
  const p = await store.programs.approve(req.params.id, req.user)
  if (!p) return res.status(404).json({ error: 'Not found' })
  await log(req, 'approve', 'audit_program', p.id)
  res.json(p)
})

router.post('/audit-programs/:id/reopen', requireAuth, authorize('contentowner'), async (req, res) => {
  const p = await store.programs.reopen(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  await log(req, 'reopen', 'audit_program', p.id)
  res.json(p)
})

router.delete('/audit-programs/:id', requireAuth, authorize('auditor'), async (req, res) => {
  if (!(await store.programs.remove(req.params.id, req.user))) return res.status(404).json({ error: 'Not found' })
  await log(req, 'delete', 'audit_program', req.params.id)
  res.json({ deleted: true })
})

router.delete('/audit-programs/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await store.programs.permanentDelete(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await log(req, 'permanent_delete', 'audit_program', req.params.id)
  res.json({ deleted: true, permanent: true })
})

router.post('/audit-programs/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const p = await store.programs.restore(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  await log(req, 'restore', 'audit_program', p.id)
  res.json(p)
})

// ── Audits ───────────────────────────────────────────────────────────────────
router.get('/audits/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await store.getSummary())
})

router.get('/audits', requireAuth, authorize('reader'), async (req, res) => {
  const { status, type, year, programId } = req.query
  res.json(await store.getAll({ status, type, year, programId }))
})

router.get('/audits/:id', requireAuth, authorize('reader'), async (req, res) => {
  const a = await store.getById(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  res.json({ ...a, findings: await findingStore.getAll({ auditId: a.id }) })
})

router.post('/audits', requireAuth, authorize('auditor'), async (req, res) => {
  const a = await store.create(req.body || {}, req.user)
  await log(req, 'create', 'audit', a.id)
  await embeddingStore.indexDoc({ ...a, description: a.conclusion }, 'Audit', `#audits?auditId=${a.id}`)
  res.status(201).json(a)
})

router.put('/audits/:id', requireAuth, authorize('auditor'), async (req, res) => {
  const a = await store.update(req.params.id, req.body || {})
  if (!a) return res.status(404).json({ error: 'Not found' })
  await log(req, 'update', 'audit', a.id)
  await embeddingStore.indexDoc({ ...a, description: a.conclusion }, 'Audit', `#audits?auditId=${a.id}`)
  res.json(a)
})

router.delete('/audits/:id', requireAuth, authorize('auditor'), async (req, res) => {
  if (!(await store.remove(req.params.id, req.user))) return res.status(404).json({ error: 'Not found' })
  await log(req, 'delete', 'audit', req.params.id)
  res.json({ deleted: true })
})

router.delete('/audits/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await store.permanentDelete(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await log(req, 'permanent_delete', 'audit', req.params.id)
  await embeddingStore.removeDoc(req.params.id)
  res.json({ deleted: true, permanent: true })
})

router.post('/audits/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const a = await store.restore(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  await log(req, 'restore', 'audit', a.id)
  res.json(a)
})

// ── Prüfpunkte ───────────────────────────────────────────────────────────────
router.post('/audits/:id/checklist', requireAuth, authorize('auditor'), async (req, res) => {
  const item = await store.addItem(req.params.id, req.body || {})
  if (!item) return res.status(404).json({ error: 'Audit not found' })
  await log(req, 'update', 'audit', req.params.id)
  res.status(201).json(item)
})

router.put('/audits/:id/checklist/:itemId', requireAuth, authorize('auditor'), async (req, res) => {
  const item = await store.updateItem(req.params.id, req.params.itemId, req.body || {})
  if (!item) return res.status(404).json({ error: 'Not found' })
  await log(req, 'update', 'audit', req.params.id)
  res.json(item)
})

router.delete('/audits/:id/checklist/:itemId', requireAuth, authorize('auditor'), async (req, res) => {
  if (!(await store.deleteItem(req.params.id, req.params.itemId))) return res.status(404).json({ error: 'Not found' })
  await log(req, 'update', 'audit', req.params.id)
  res.json({ deleted: true })
})

// Aus einem Prüfpunkt ein Finding erzeugen (meist bei Ergebnis „nonconform“)
router.post('/audits/:id/checklist/:itemId/finding', requireAuth, authorize('auditor'), async (req, res) => {
  const a = await store.getById(req.params.id)
  const item = a && (a.checklist || []).find(i => i.id === req.params.itemId)
  if (!item) return res.status(404).json({ error: 'Not found' })
  if (item.findingId) return res.status(409).json({ error: 'A finding already exists for this item', findingId: item.findingId })

  const f = await findingStore.create({
    title:          (item.question || a.title).slice(0, 200),
    severity:       req.body?.severity,
    observation:    item.notes || item.evidence || '',
    requirement:    item.question || '',
    auditor:        a.leadAuditor || req.user,
    auditedArea:    a.scope || a.title,
    auditPeriodFrom: a.actualStart || a.plannedStart,
    auditPeriodTo:   a.actualEnd   || a.plannedEnd,
    linkedControls: item.controlId ? [item.controlId] : [],
    auditId:        a.id,
    sourceItemId:   item.id,
  }, req.user)
  await store.setItemFinding(a.id, item.id, f.id)
  await log(req, 'create', 'finding', f.id)
  await embeddingStore.indexDoc(f, 'Audit-Feststellung', `#reports?findingId=${f.id}`)
  res.status(201).json(f)
})

module.exports = router
