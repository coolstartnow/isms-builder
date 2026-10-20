// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const govStore = require('../db/governanceStore')

router.get('/governance/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await govStore.getSummary())
})

// Reviews
router.get('/governance/reviews', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await govStore.getReviews())
})
router.get('/governance/reviews/:id', requireAuth, authorize('reader'), async (req, res) => {
  const r = await govStore.getReviewById(req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})
router.post('/governance/reviews', requireAuth, authorize('editor'), async (req, res) => {
  const r = await govStore.createReview(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'governance_review', detail: r.title })
  res.status(201).json(r)
})
router.put('/governance/reviews/:id', requireAuth, authorize('editor'), async (req, res) => {
  const r = await govStore.updateReview(req.params.id, req.body, { changedBy: req.user })
  if (!r) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'governance_review', detail: r.title })
  res.json(r)
})
router.delete('/governance/reviews/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await govStore.deleteReview(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'governance_review', detail: req.params.id })
  res.json({ ok: true })
})

// Actions
router.get('/governance/actions', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await govStore.getActions())
})
router.get('/governance/actions/:id', requireAuth, authorize('reader'), async (req, res) => {
  const a = await govStore.getActionById(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  res.json(a)
})
router.post('/governance/actions', requireAuth, authorize('editor'), async (req, res) => {
  const a = await govStore.createAction(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'governance_action', detail: a.title })
  res.status(201).json(a)
})
router.put('/governance/actions/:id', requireAuth, authorize('editor'), async (req, res) => {
  const a = await govStore.updateAction(req.params.id, req.body, { changedBy: req.user })
  if (!a) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'governance_action', detail: a.title })
  res.json(a)
})
router.delete('/governance/actions/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await govStore.deleteAction(req.params.id, req.user))) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'governance_action', detail: req.params.id })
  res.json({ ok: true })
})

// Meetings
router.get('/governance/meetings', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await govStore.getMeetings())
})
router.get('/governance/meetings/:id', requireAuth, authorize('reader'), async (req, res) => {
  const m = await govStore.getMeetingById(req.params.id)
  if (!m) return res.status(404).json({ error: 'Not found' })
  res.json(m)
})
router.post('/governance/meetings', requireAuth, authorize('editor'), async (req, res) => {
  const m = await govStore.createMeeting(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'governance_meeting', detail: m.title })
  res.status(201).json(m)
})
router.put('/governance/meetings/:id', requireAuth, authorize('editor'), async (req, res) => {
  const m = await govStore.updateMeeting(req.params.id, req.body, { changedBy: req.user })
  if (!m) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'governance_meeting', detail: m.title })
  res.json(m)
})
router.delete('/governance/meetings/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await govStore.deleteMeeting(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'governance_meeting', detail: req.params.id })
  res.json({ ok: true })
})

// ── Governance – Dokumenten-Upload ──
const GOV_FILES_DIR = path.join(__dirname, '../../data/governance-files')
if (!fs.existsSync(GOV_FILES_DIR)) fs.mkdirSync(GOV_FILES_DIR, { recursive: true })

const govUpload = multer({
  dest: GOV_FILES_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.pptx']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

router.post('/governance/:collection/:id/upload', requireAuth, authorize('editor'), (req, res) => {
  const COLS = { reviews: 'getReviewById', actions: 'getActionById', meetings: 'getMeetingById' }
  const UPDS = { reviews: 'updateReview', actions: 'updateAction', meetings: 'updateMeeting' }
  const col  = req.params.collection
  if (!COLS[col]) return res.status(400).json({ error: 'Invalid collection' })
  govUpload.single('file')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const item = await govStore[COLS[col]](req.params.id)
    if (!item) { fs.unlinkSync(req.file.path); return res.status(404).json({ error: 'Not found' }) }
    const attachment = {
      id:           Date.now().toString(36),
      filename:     req.file.originalname,
      storedName:   req.file.filename,
      size:         req.file.size,
      uploadedBy:   req.user,
      uploadedAt:   new Date().toISOString(),
    }
    const attachments = [...(item.attachments || []), attachment]
    await govStore[UPDS[col]](req.params.id, { attachments })
    res.json({ ok: true, attachment })
  })
})

router.get('/governance/:collection/:id/files/:fileId', requireAuth, authorize('reader'), async (req, res) => {
  const COLS = { reviews: 'getReviewById', actions: 'getActionById', meetings: 'getMeetingById' }
  const col  = req.params.collection
  if (!COLS[col]) return res.status(400).json({ error: 'Invalid collection' })
  const item = await govStore[COLS[col]](req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const att = (item.attachments || []).find(a => a.id === req.params.fileId)
  if (!att) return res.status(404).json({ error: 'Attachment not found' })
  const filePath = path.join(GOV_FILES_DIR, att.storedName)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' })
  res.setHeader('Content-Disposition', `attachment; filename="${att.filename}"`)
  res.sendFile(path.resolve(filePath))
})

router.delete('/governance/:collection/:id/files/:fileId', requireAuth, authorize('editor'), async (req, res) => {
  const COLS = { reviews: 'getReviewById', actions: 'getActionById', meetings: 'getMeetingById' }
  const UPDS = { reviews: 'updateReview', actions: 'updateAction', meetings: 'updateMeeting' }
  const col  = req.params.collection
  if (!COLS[col]) return res.status(400).json({ error: 'Invalid collection' })
  const item = await govStore[COLS[col]](req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const att = (item.attachments || []).find(a => a.id === req.params.fileId)
  if (!att) return res.status(404).json({ error: 'Attachment not found' })
  const filePath = path.join(GOV_FILES_DIR, att.storedName)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  const attachments = (item.attachments || []).filter(a => a.id !== req.params.fileId)
  await govStore[UPDS[col]](req.params.id, { attachments })
  res.json({ ok: true })
})

module.exports = router
