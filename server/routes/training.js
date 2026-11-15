// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const trainingStore = require('../db/trainingStore')
const embeddingStore = require('../ai/embeddingStore')
const multer = require('multer')
const trainingFiles = require('../trainingFiles')
const trainingCertificate = require('../trainingCertificate')
const auditStore = require('../db/auditStore')
const orgSettingsStore = require('../db/orgSettingsStore')
const i18n = require('../i18n')

// Anhänge: im Speicher puffern, Endung und Dateikopf prüfen, erst dann unter Zufallsnamen schreiben
const attachUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: trainingFiles.MAX_BYTES, files: 1 } })

router.get('/training/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await trainingStore.getSummary())
})
router.get('/training', requireAuth, authorize('reader'), async (req, res) => {
  const { status, category, entity } = req.query
  res.json(await trainingStore.getAll({ status, category, entity }))
})
router.get('/training/:id', requireAuth, authorize('reader'), async (req, res) => {
  const item = await trainingStore.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
// ── Dateianhänge (Nachweise) ──
router.post('/training/:id/attachments', requireAuth, authorize('editor'), (req, res) => {
  attachUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 20 MB)' : err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    if (!await trainingStore.getById(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const saved = trainingFiles.save(req.file.buffer, req.file.originalname, req.user)
    if (!saved.ok) return res.status(400).json({ error: saved.error })
    const meta = await trainingStore.addAttachment(req.params.id, saved.meta)
    if (!meta) { trainingFiles.removeFile(saved.meta.filename); return res.status(404).json({ error: 'Not found' }) }
    await auditStore.append({ user: req.user, action: 'create', resource: 'training', resourceId: req.params.id, detail: `Anhang: ${saved.meta.originalName} (${saved.meta.sha256.slice(0, 12)})` })
    res.status(201).json(trainingFiles.publicAttachments([meta])[0])
  })
})
router.get('/training/:id/attachments/:attId/file', requireAuth, authorize('reader'), async (req, res) => {
  const att = await trainingStore.getAttachment(req.params.id, req.params.attId)
  const file = att && trainingFiles.resolve(att.filename)
  if (!file) return res.status(404).json({ error: 'Not found' })
  const safe = trainingFiles.cleanName(att.originalName)
  res.setHeader('Content-Type', att.mime || 'application/octet-stream')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Disposition', `attachment; filename="${safe.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(safe)}`)
  res.sendFile(file)
})
// Entfernen markiert den Anhang nur; die Datei bleibt auf dem Server erhalten (Nachweise werden nicht vernichtet)
router.delete('/training/:id/attachments/:attId', requireAuth, authorize('editor'), async (req, res) => {
  const att = await trainingStore.removeAttachment(req.params.id, req.params.attId, req.user)
  if (!att) return res.status(404).json({ error: 'Not found' })
  await auditStore.append({ user: req.user, action: 'delete', resource: 'training', resourceId: req.params.id, detail: `Anhang entfernt: ${att.originalName} (${String(att.sha256 || '').slice(0, 12)})` })
  res.json({ removed: true })
})

// ── Teilnahmebestätigung (PDF) — nur für abgeschlossene Schulungen; interner Beleg, keine Zertifizierung ──
router.get('/training/:id/confirmation.pdf', requireAuth, authorize('reader'), async (req, res) => {
  const item = await trainingStore.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  if (item.status !== 'completed') return res.status(409).json({ error: 'A confirmation is only issued for completed trainings', code: 'not_completed' })
  try {
    const org = await orgSettingsStore.get()
    const lang = i18n.pickLang(req.query.lang) || await i18n.orgLang()
    const pdf = await trainingCertificate.renderTrainingConfirmation(item, { lang, orgName: org && org.orgName, fontChoice: org && org.pdfFont, issuedBy: req.user, issuedAt: new Date() })
    await auditStore.append({ user: req.user, action: 'export', resource: 'training', resourceId: req.params.id, detail: `Teilnahmebestätigung (Prüfcode ${trainingCertificate.verificationCode(item)})` })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${trainingCertificate.fileName(item)}"`)
    res.send(pdf)
  } catch (e) {
    console.error('[training] confirmation:', e.message)
    res.status(500).json({ error: 'PDF could not be created' })
  }
})

router.post('/training', requireAuth, authorize('editor'), async (req, res) => {
  const item = await trainingStore.create(req.body, req.user)
  await embeddingStore.indexDoc(item, 'Schulung', '#training')
  res.status(201).json(item)
})
router.put('/training/:id', requireAuth, authorize('editor'), async (req, res) => {
  const item = await trainingStore.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await embeddingStore.indexDoc(item, 'Schulung', '#training')
  res.json(item)
})
router.delete('/training/:id', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await trainingStore.delete(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'training', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/training/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await trainingStore.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'training', resourceId: req.params.id })
  await embeddingStore.removeDoc(req.params.id)
  res.json({ deleted: true, permanent: true })
})
router.post('/training/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await trainingStore.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'training', resourceId: req.params.id })
  res.json(item)
})

module.exports = router
