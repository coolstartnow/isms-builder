// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const gdprStore = require('../db/gdprStore')

const gdprUpload = multer({
  dest: path.join(__dirname, '../../data/gdpr/files/'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Nur PDF und DOCX erlaubt'))
  }
})

function authorizeContentOwner(req, res, next) {
  const rank = req.roleRank || 0
  if (rank >= 3) return next()
  res.status(403).json({ error: 'Mindestens contentowner-Rolle erforderlich' })
}
function authorizeAuditorOrAbove(req, res, next) {
  if (req.role === 'auditor' || req.role === 'admin' || (req.roleRank || 0) >= 3) return next()
  res.status(403).json({ error: 'Mindestens auditor-Rolle erforderlich' })
}
function authorizeEditorOrAbove(req, res, next) {
  const rank = req.roleRank || 0
  if (rank >= 2) return next()
  res.status(403).json({ error: 'Mindestens editor-Rolle erforderlich' })
}

// Dashboard
router.get('/gdpr/dashboard', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.getSummary(req.query.entity || null))
})

// DSB (Singleton)
router.get('/gdpr/dsb', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.dsb.get())
})
router.put('/gdpr/dsb', requireAuth, authorizeContentOwner, async (req, res) => {
  res.json(await gdprStore.dsb.update(req.body))
})
router.post('/gdpr/dsb/upload', requireAuth, authorizeContentOwner, (req, res) => {
  gdprUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const updated = await gdprStore.dsb.update({ filePath: req.file.path, filename: req.file.originalname })
    res.json(updated)
  })
})
router.get('/gdpr/dsb/file', requireAuth, authorize('reader'), async (req, res) => {
  const data = await gdprStore.dsb.get()
  if (!data.filePath || !fs.existsSync(data.filePath)) return res.status(404).json({ error: 'File not found' })
  const ext = data.filename ? path.extname(data.filename).toLowerCase() : '.bin'
  const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  if (data.filename) res.setHeader('Content-Disposition', `inline; filename="${data.filename}"`)
  res.sendFile(path.resolve(data.filePath))
})

// Löschprotokoll (Art. 17 DSGVO)
router.get('/gdpr/deletion-log', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.deletionLog.getAll())
})
router.get('/gdpr/deletion-log/due', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.deletionLog.getDue())
})
router.get('/gdpr/deletion-log/upcoming', requireAuth, authorize('reader'), async (req, res) => {
  const days = parseInt(req.query.days) || 90
  res.json(await gdprStore.deletionLog.getUpcoming(days))
})
router.post('/gdpr/deletion-log', requireAuth, authorize('contentowner'), async (req, res) => {
  const entry = await gdprStore.deletionLog.confirm(req.body, req.user)
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_vvt_deletion', resourceId: req.body.vvtId, detail: `Löschung bestätigt: ${req.body.vvtTitle}` })
  res.status(201).json(entry)
})

// VVT
router.get('/gdpr/vvt', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.vvt.getAll({ entity: req.query.entity || null }))
})
router.get('/gdpr/vvt/export/csv', requireAuth, authorize('reader'), async (req, res) => {
  const list = await gdprStore.vvt.getAll({ entity: req.query.entity || null })
  const header = ['ID','Titel','Zweck','Rechtsgrundlage','Status','Verantwortlich','Aufbewahrung (Monate)','Hochrisiko','Erstellt am']
  const rows = list.map(v => [v.id, v.title, v.purpose, v.legalBasis, v.status, v.owner,
    v.retentionMonths || '', v.isHighRisk ? 'Ja' : 'Nein', v.createdAt ? v.createdAt.slice(0,10) : ''])
  const csv = [header, ...rows].map(r => r.map(c => {
    const s = c === null || c === undefined ? '' : String(c)
    return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g,'""') + '"' : s
  }).join(',')).join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="gdpr-vvt-${new Date().toISOString().slice(0,10)}.csv"`)
  res.send('\uFEFF' + csv)
})
router.get('/gdpr/vvt/:id', requireAuth, authorize('reader'), async (req, res) => {
  const item = await gdprStore.vvt.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/gdpr/vvt', requireAuth, authorizeEditorOrAbove, async (req, res) => {
  res.status(201).json(await gdprStore.vvt.create(req.body, req.user))
})
router.put('/gdpr/vvt/:id', requireAuth, authorizeEditorOrAbove, async (req, res) => {
  const item = await gdprStore.vvt.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/gdpr/vvt/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.vvt.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_vvt', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/gdpr/vvt/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.vvt.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'gdpr_vvt', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/gdpr/vvt/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await gdprStore.vvt.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'gdpr_vvt', resourceId: req.params.id })
  res.json(item)
})

// AV-Verträge
router.get('/gdpr/av', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.av.getAll({ entity: req.query.entity || null }))
})
router.get('/gdpr/av/:id', requireAuth, authorize('reader'), async (req, res) => {
  const item = await gdprStore.av.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.get('/gdpr/av/:id/file', requireAuth, authorize('reader'), async (req, res) => {
  const item = await gdprStore.av.getById(req.params.id)
  if (!item || !item.filePath || !fs.existsSync(item.filePath)) return res.status(404).json({ error: 'File not found' })
  const ext = item.filename ? path.extname(item.filename).toLowerCase() : '.bin'
  const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  if (item.filename) res.setHeader('Content-Disposition', `inline; filename="${item.filename}"`)
  res.sendFile(path.resolve(item.filePath))
})
router.post('/gdpr/av/upload', requireAuth, authorizeContentOwner, (req, res) => {
  gdprUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const { avId } = req.body
    if (avId) {
      const updated = await gdprStore.av.update(avId, { filePath: req.file.path, filename: req.file.originalname })
      if (!updated) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'AV not found' }) }
      return res.json(updated)
    }
    res.json({ filePath: req.file.path, filename: req.file.originalname })
  })
})
router.post('/gdpr/av', requireAuth, authorizeContentOwner, async (req, res) => {
  res.status(201).json(await gdprStore.av.create(req.body, req.user))
})
router.put('/gdpr/av/:id', requireAuth, authorizeContentOwner, async (req, res) => {
  const item = await gdprStore.av.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/gdpr/av/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.av.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_av', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/gdpr/av/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.av.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'gdpr_av', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/gdpr/av/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await gdprStore.av.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'gdpr_av', resourceId: req.params.id })
  res.json(item)
})

// DSFA
router.get('/gdpr/dsfa', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.dsfa.getAll({ entity: req.query.entity || null }))
})
router.get('/gdpr/dsfa/:id', requireAuth, authorize('reader'), async (req, res) => {
  const item = await gdprStore.dsfa.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/gdpr/dsfa', requireAuth, authorizeContentOwner, async (req, res) => {
  res.status(201).json(await gdprStore.dsfa.create(req.body, req.user))
})
router.put('/gdpr/dsfa/:id', requireAuth, authorizeContentOwner, async (req, res) => {
  const item = await gdprStore.dsfa.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/gdpr/dsfa/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.dsfa.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_dsfa', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/gdpr/dsfa/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.dsfa.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'gdpr_dsfa', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/gdpr/dsfa/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await gdprStore.dsfa.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'gdpr_dsfa', resourceId: req.params.id })
  res.json(item)
})

// Incidents (Datenpannen)
router.get('/gdpr/incidents', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.incidents.getAll({ entity: req.query.entity || null }))
})
router.get('/gdpr/incidents/:id', requireAuth, authorize('reader'), async (req, res) => {
  const item = await gdprStore.incidents.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/gdpr/incidents', requireAuth, authorizeAuditorOrAbove, async (req, res) => {
  res.status(201).json(await gdprStore.incidents.create(req.body, req.user))
})
router.put('/gdpr/incidents/:id', requireAuth, authorizeAuditorOrAbove, async (req, res) => {
  const item = await gdprStore.incidents.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/gdpr/incidents/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.incidents.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_incident', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/gdpr/incidents/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.incidents.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'gdpr_incident', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/gdpr/incidents/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await gdprStore.incidents.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'gdpr_incident', resourceId: req.params.id })
  res.json(item)
})

// DSAR (Betroffenenrechte)
router.get('/gdpr/dsar', requireAuth, authorizeEditorOrAbove, async (req, res) => {
  res.json(await gdprStore.dsar.getAll({ entity: req.query.entity || null }))
})
router.get('/gdpr/dsar/:id', requireAuth, authorizeEditorOrAbove, async (req, res) => {
  const item = await gdprStore.dsar.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/gdpr/dsar', requireAuth, authorizeEditorOrAbove, async (req, res) => {
  res.status(201).json(await gdprStore.dsar.create(req.body, req.user))
})
router.put('/gdpr/dsar/:id', requireAuth, authorizeEditorOrAbove, async (req, res) => {
  const item = await gdprStore.dsar.update(req.params.id, req.body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/gdpr/dsar/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.dsar.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_dsar', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/gdpr/dsar/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.dsar.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'gdpr_dsar', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/gdpr/dsar/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await gdprStore.dsar.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'gdpr_dsar', resourceId: req.params.id })
  res.json(item)
})

// TOMs
router.get('/gdpr/toms', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await gdprStore.toms.getAll({ entity: req.query.entity || null, category: req.query.category || null }))
})
router.get('/gdpr/toms/:id', requireAuth, authorize('reader'), async (req, res) => {
  const item = await gdprStore.toms.getById(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.post('/gdpr/toms', requireAuth, authorizeContentOwner, async (req, res) => {
  res.status(201).json(await gdprStore.toms.create(req.body, req.user))
})
router.put('/gdpr/toms/:id', requireAuth, authorizeContentOwner, async (req, res) => {
  const item = await gdprStore.toms.update(req.params.id, req.body, req.user)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json(item)
})
router.delete('/gdpr/toms/:id', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.toms.delete(req.params.id, req.user)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'gdpr_toms', resourceId: req.params.id })
  res.json({ deleted: true })
})
router.delete('/gdpr/toms/:id/permanent', requireAuth, authorize('admin'), async (req, res) => {
  if (!await gdprStore.toms.permanentDelete(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'gdpr_toms', resourceId: req.params.id })
  res.json({ deleted: true, permanent: true })
})
router.post('/gdpr/toms/:id/restore', requireAuth, authorize('admin'), async (req, res) => {
  const item = await gdprStore.toms.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'gdpr_toms', resourceId: req.params.id })
  res.json(item)
})

module.exports = router
