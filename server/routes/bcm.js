// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const bcmStore = require('../db/bcmStore')
const bcmRequirements = require('../bcmRequirements')
const auditStore = require('../db/auditStore')
const i18n = require('../i18n')

router.get('/bcm/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await bcmStore.getSummary())
})

// ── Vorlagen für BIA, Pläne und Übungen (server/bcmTemplates.js): eigene Texte, vom Unternehmen anzupassen ──
const bcmTemplates = require('../bcmTemplates')
router.get('/bcm/templates/:kind', requireAuth, authorize('reader'), (req, res) => {
  const l = bcmTemplates.list(req.params.kind, req.query.lang || i18n.langOf(req))
  if (!l) return res.status(404).json({ error: 'Not found' })
  res.json(l)
})
router.get('/bcm/templates/:kind/:id', requireAuth, authorize('editor'), async (req, res) => {
  const org = await require('../db/orgSettingsStore').get()
  const t = bcmTemplates.build(req.params.kind, req.params.id, req.query.lang || i18n.langOf(req), org)
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json(t)
})

// ── Register der Anforderungen (z. B. ISO 22301): Definitionen werden importiert, der Normtext wird nicht mitgeliefert ──
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: bcmRequirements.MAX_BYTES, files: 1 } })

// Datei prüfen (ohne zu speichern) → { parsed, accepted, rejected, unknownColumns, added, updated }
async function previewRequirementsImport(text, format) {
  const parsed = bcmRequirements.parse(text, format)
  if (parsed.code) return { code: parsed.code }
  const v = bcmRequirements.validate(parsed.rows, parsed.header)
  const existing = await bcmStore.getRequirements()
  const existingKeys = new Set(existing.map(r => bcmRequirements.keyOf(r.framework, r.id)))
  const rejected = [...v.rejected]
  const accepted = bcmRequirements.checkParents(v.accepted, existingKeys, rejected)
  const rejectedByReason = rejected.reduce((m, r) => (m[r.reason] = (m[r.reason] || 0) + 1, m), {})
  return {
    total: parsed.rows.length, accepted, unknownColumns: v.unknownColumns,
    added: accepted.filter(a => !existingKeys.has(bcmRequirements.keyOf(a.framework, a.id))).length,
    updated: accepted.filter(a => existingKeys.has(bcmRequirements.keyOf(a.framework, a.id))).length,
    rejected: rejected.length, rejectedByReason, rejectedDetails: rejected.slice(0, 50),
  }
}

router.post('/bcm/requirements/import', requireAuth, authorize('admin'), (req, res) => {
  importUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 2 MB)' : err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const name = String(req.file.originalname || '').toLowerCase()
    const format = name.endsWith('.json') ? 'json' : (name.endsWith('.csv') || name.endsWith('.txt') ? 'csv' : undefined)
    const prev = await previewRequirementsImport(req.file.buffer.toString('utf8'), format)
    if (prev.code) return res.status(400).json({ error: prev.code === 'too_large' ? 'File too large (max 2 MB)' : prev.code === 'too_many_rows' ? 'Too many rows (max 2000)' : 'The file could not be read', code: prev.code })
    const { accepted, ...summary } = prev
    const dry = req.query.dryRun === '1' || req.query.dryRun === 'true'
    if (dry) return res.json({ dryRun: true, ...summary })
    if (!accepted.length) return res.status(400).json({ error: 'No valid requirements found', ...summary })
    const { added, updated } = await bcmStore.upsertRequirements(accepted, { importedBy: req.user })
    await auditStore.append({ user: req.user, action: 'import', resource: 'bcm-requirements', detail: `Anforderungen importiert: ${added} neu, ${updated} aktualisiert, ${summary.rejected} abgelehnt` })
    res.json({ dryRun: false, ...summary, added, updated })
  })
})

router.get('/bcm/requirements', requireAuth, authorize('reader'), async (req, res) => {
  const [requirements, assessments] = await Promise.all([bcmStore.getRequirements(), bcmStore.getAssessments()])
  res.json({ requirements, assessments, summary: bcmRequirements.summarize(requirements, assessments), frameworks: bcmRequirements.FRAMEWORKS, statuses: bcmRequirements.STATUSES })
})

router.get('/bcm/requirements/template.csv', requireAuth, authorize('reader'), (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="bcm-requirements-template.csv"')
  res.send(bcmRequirements.templateCsv())
})

router.get('/bcm/requirements/export.csv', requireAuth, authorize('reader'), async (req, res) => {
  const [requirements, assessments] = await Promise.all([bcmStore.getRequirements(), bcmStore.getAssessments()])
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="bcm-requirements-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(bcmRequirements.exportCsv(requirements, assessments, i18n.pickLang(req.query.lang) || await i18n.orgLang()))
})

router.put('/bcm/requirements/:framework/:id/assessment', requireAuth, authorize('editor'), async (req, res) => {
  const { framework, id } = req.params
  const defs = await bcmStore.getRequirements()
  if (!defs.some(r => r.framework === framework && r.id === id)) return res.status(404).json({ error: 'Not found' })
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  // verknüpfte BIA, Pläne und Übungen müssen es geben
  const [bia, plans, exercises] = await Promise.all([bcmStore.getBia(), bcmStore.getPlans(), bcmStore.getExercises()])
  for (const [field, list] of [['linkedBia', bia], ['linkedPlans', plans], ['linkedExercises', exercises]]) {
    if (Array.isArray(body[field]) && body[field].some(x => !list.some(o => o.id === x))) return res.status(400).json({ error: 'Unknown link target', field })
  }
  const current = (await bcmStore.getAssessments()).find(a => a.framework === framework && a.id === id) || {}
  const clean = bcmRequirements.cleanAssessment(body, current)
  if (!clean.ok) return res.status(400).json({ error: clean.error, field: clean.field })
  const rec = await bcmStore.setAssessment(framework, id, clean.value, { changedBy: req.user })
  await auditStore.append({ user: req.user, action: 'update', resource: 'bcm-requirement', resourceId: `${framework}:${id}`, detail: `Status: ${rec.status}` })
  res.json(rec)
})

// BIA
router.get('/bcm/bia', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await bcmStore.getBia())
})
router.get('/bcm/bia/:id', requireAuth, authorize('reader'), async (req, res) => {
  const b = await bcmStore.getBiaById(req.params.id)
  if (!b) return res.status(404).json({ error: 'Not found' })
  res.json(b)
})
router.post('/bcm/bia', requireAuth, authorize('editor'), async (req, res) => {
  const b = await bcmStore.createBia(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'bcm_bia', detail: b.title })
  res.status(201).json(b)
})
router.put('/bcm/bia/:id', requireAuth, authorize('editor'), async (req, res) => {
  const b = await bcmStore.updateBia(req.params.id, req.body, { changedBy: req.user })
  if (!b) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'bcm_bia', detail: b.title })
  res.json(b)
})
router.delete('/bcm/bia/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await bcmStore.deleteBia(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'bcm_bia', detail: req.params.id })
  res.json({ ok: true })
})

// Plans
router.get('/bcm/plans', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await bcmStore.getPlans())
})
router.get('/bcm/plans/:id', requireAuth, authorize('reader'), async (req, res) => {
  const p = await bcmStore.getPlanById(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})
router.post('/bcm/plans', requireAuth, authorize('editor'), async (req, res) => {
  const p = await bcmStore.createPlan(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'bcm_plan', detail: p.title })
  res.status(201).json(p)
})
router.put('/bcm/plans/:id', requireAuth, authorize('editor'), async (req, res) => {
  const p = await bcmStore.updatePlan(req.params.id, req.body, { changedBy: req.user })
  if (!p) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'bcm_plan', detail: p.title })
  res.json(p)
})
router.delete('/bcm/plans/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await bcmStore.deletePlan(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'bcm_plan', detail: req.params.id })
  res.json({ ok: true })
})

// Exercises
router.get('/bcm/exercises', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await bcmStore.getExercises())
})
router.get('/bcm/exercises/:id', requireAuth, authorize('reader'), async (req, res) => {
  const e = await bcmStore.getExerciseById(req.params.id)
  if (!e) return res.status(404).json({ error: 'Not found' })
  res.json(e)
})
router.post('/bcm/exercises', requireAuth, authorize('editor'), async (req, res) => {
  const e = await bcmStore.createExercise(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'bcm_exercise', detail: e.title })
  res.status(201).json(e)
})
router.put('/bcm/exercises/:id', requireAuth, authorize('editor'), async (req, res) => {
  const e = await bcmStore.updateExercise(req.params.id, req.body, { changedBy: req.user })
  if (!e) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'bcm_exercise', detail: e.title })
  res.json(e)
})
router.delete('/bcm/exercises/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!(await bcmStore.deleteExercise(req.params.id))) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'bcm_exercise', detail: req.params.id })
  res.json({ ok: true })
})

// ── BCM – Dokumenten-Upload ──
const BCM_FILES_DIR = require('../paths').dataPath('bcm-files')
if (!fs.existsSync(BCM_FILES_DIR)) fs.mkdirSync(BCM_FILES_DIR, { recursive: true })

const bcmUpload = multer({
  dest: BCM_FILES_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.pptx']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

router.post('/bcm/:collection/:id/upload', requireAuth, authorize('editor'), (req, res) => {
  const GETTERS = { bia: 'getBiaById', plans: 'getPlanById', exercises: 'getExerciseById' }
  const UPDATERS = { bia: 'updateBia', plans: 'updatePlan', exercises: 'updateExercise' }
  const col = req.params.collection
  if (!GETTERS[col]) return res.status(400).json({ error: 'Invalid collection' })
  bcmUpload.single('file')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const item = await bcmStore[GETTERS[col]](req.params.id)
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
    await bcmStore[UPDATERS[col]](req.params.id, { attachments })
    res.json({ ok: true, attachment })
  })
})

router.get('/bcm/:collection/:id/files/:fileId', requireAuth, authorize('reader'), async (req, res) => {
  const GETTERS = { bia: 'getBiaById', plans: 'getPlanById', exercises: 'getExerciseById' }
  const col = req.params.collection
  if (!GETTERS[col]) return res.status(400).json({ error: 'Invalid collection' })
  const item = await bcmStore[GETTERS[col]](req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const att = (item.attachments || []).find(a => a.id === req.params.fileId)
  if (!att) return res.status(404).json({ error: 'Attachment not found' })
  const filePath = path.join(BCM_FILES_DIR, att.storedName)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' })
  res.setHeader('Content-Disposition', `attachment; filename="${att.filename}"`)
  res.sendFile(path.resolve(filePath))
})

router.delete('/bcm/:collection/:id/files/:fileId', requireAuth, authorize('editor'), async (req, res) => {
  const GETTERS  = { bia: 'getBiaById', plans: 'getPlanById', exercises: 'getExerciseById' }
  const UPDATERS = { bia: 'updateBia', plans: 'updatePlan', exercises: 'updateExercise' }
  const col = req.params.collection
  if (!GETTERS[col]) return res.status(400).json({ error: 'Invalid collection' })
  const item = await bcmStore[GETTERS[col]](req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const att = (item.attachments || []).find(a => a.id === req.params.fileId)
  if (!att) return res.status(404).json({ error: 'Attachment not found' })
  const filePath = path.join(BCM_FILES_DIR, att.storedName)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  const attachments = (item.attachments || []).filter(a => a.id !== req.params.fileId)
  await bcmStore[UPDATERS[col]](req.params.id, { attachments })
  res.json({ ok: true })
})

module.exports = router
