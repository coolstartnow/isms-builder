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
  dest: require('../paths').dataPath('gdpr', 'files') + path.sep,
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
// ── DSFA: Vorlagen, Vorabprüfung, Prüfablauf (DSB-Stellungnahme vor der Freigabe) ──
const dsfaTemplates = require('../dsfaTemplates')
const DSFA_SERVER_FIELDS = ['approvedBy', 'approvedAt', 'dpoOpinionBy', 'dpoOpinionAt']   // setzt nur der Server
const isDpo = req => req.role === 'admin' || (req.functions || []).includes('dso')

router.get('/gdpr/dsfa-templates', requireAuth, authorize('reader'), (req, res) => {
  res.json(dsfaTemplates.list(require('../i18n').langOf(req)))
})
router.get('/gdpr/dsfa-templates/:id', requireAuth, authorize('reader'), async (req, res) => {
  const org = await require('../db/orgSettingsStore').get()
  const t = dsfaTemplates.build(req.params.id, req.query.lang || require('../i18n').langOf(req), org)
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json(t)
})
router.get('/gdpr/dsfa-precheck', requireAuth, authorize('reader'), (req, res) => {
  res.json(dsfaTemplates.precheckCriteria(req.query.lang || require('../i18n').langOf(req)))
})
router.post('/gdpr/dsfa-precheck', requireAuth, authorize('reader'), (req, res) => {
  res.json(dsfaTemplates.evaluatePrecheck(req.body || {}, req.query.lang || require('../i18n').langOf(req)))
})

// ── Vorlagen für VVT, AV-Verträge, Datenpannen, Betroffenenanfragen und TOMs (server/gdprTemplates.js) ──
const gdprTemplates = require('../gdprTemplates')
router.get('/gdpr/templates/:kind', requireAuth, authorize('reader'), (req, res) => {
  const l = gdprTemplates.list(req.params.kind, req.query.lang || require('../i18n').langOf(req))
  if (!l) return res.status(404).json({ error: 'Not found' })
  res.json(l)
})
router.get('/gdpr/templates/:kind/:id', requireAuth, authorize('reader'), async (req, res) => {
  const org = await require('../db/orgSettingsStore').get()
  const t = gdprTemplates.build(req.params.kind, req.params.id, req.query.lang || require('../i18n').langOf(req), org)
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json(t)
})

// Vorabprüfung aus dem Client übernehmen: Ergebnis wird immer neu berechnet, Person und Zeitpunkt setzt der Server
function dsfaPrecheck(input, existing, user) {
  if (!input || typeof input !== 'object') return undefined
  const r = dsfaTemplates.evaluatePrecheck(input)
  const same = existing && JSON.stringify([existing.art353, existing.criteria]) === JSON.stringify([r.art353, r.criteria])
  return { art353: r.art353, criteria: r.criteria, result: r.result, at: same ? existing.at : nowISOStr(), by: same ? existing.by : user }
}
const nowISOStr = () => new Date().toISOString()

router.post('/gdpr/dsfa', requireAuth, authorizeContentOwner, async (req, res) => {
  const body = { ...req.body }
  for (const k of DSFA_SERVER_FIELDS) delete body[k]
  if (body.status === 'approved') return res.status(400).json({ error: 'A new assessment cannot be approved directly.', code: 'approve_on_create' })
  if (!isDpo(req)) { body.dpoConsulted = false; body.dpoOpinion = '' }
  else if (String(body.dpoOpinion || '').trim()) { body.dpoOpinionBy = req.user; body.dpoOpinionAt = nowISOStr() }
  if (body.precheck !== undefined) body.precheck = dsfaPrecheck(body.precheck, null, req.user) || null
  const item = await gdprStore.dsfa.create(body, req.user)
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'gdpr_dsfa', resourceId: item.id, detail: item.title })
  res.status(201).json(item)
})
router.put('/gdpr/dsfa/:id', requireAuth, authorizeContentOwner, async (req, res) => {
  const existing = await gdprStore.dsfa.getById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const body = { ...req.body }
  for (const k of DSFA_SERVER_FIELDS) delete body[k]

  // Stellungnahme des DSB: nur der DSB oder ein Administrator darf sie eintragen oder ändern
  const opinionChanged = 'dpoOpinion' in body && String(body.dpoOpinion || '') !== String(existing.dpoOpinion || '')
  const consultedChanged = 'dpoConsulted' in body && !!body.dpoConsulted !== !!existing.dpoConsulted
  if ((opinionChanged || consultedChanged) && !isDpo(req)) {
    return res.status(403).json({ error: 'Only the data protection officer or an administrator may enter the DPO opinion.', code: 'dpo_only' })
  }
  if (opinionChanged) { body.dpoOpinionBy = req.user; body.dpoOpinionAt = nowISOStr() }

  // Freigabe: nur mit Stellungnahme des DSB, Entscheidung und (bei hohem Restrisiko) Begründung oder Konsultation der Aufsichtsbehörde
  if (body.status === 'approved' && existing.status !== 'approved') {
    const check = dsfaTemplates.validateApproval({ ...existing, ...body })
    if (!check.ok) {
      const messages = {
        dpo_opinion_missing: 'Approval requires the opinion of the data protection officer.',
        decision_missing: 'Approval requires a decision.',
        high_residual_unjustified: 'With a high residual risk, approval requires a justification or the consultation of the supervisory authority.',
      }
      return res.status(400).json({ error: messages[check.code] || 'Approval is not possible.', code: check.code })
    }
    body.approvedBy = req.user; body.approvedAt = nowISOStr()
  } else if (body.status && body.status !== 'approved' && existing.status === 'approved') {
    body.approvedBy = null; body.approvedAt = null
  }
  if (body.precheck !== undefined) body.precheck = dsfaPrecheck(body.precheck, existing.precheck, req.user) || null

  const item = await gdprStore.dsfa.update(req.params.id, body)
  if (!item) return res.status(404).json({ error: 'Not found' })
  const detail = body.status && body.status !== existing.status ? `${existing.status} → ${body.status}` : 'geändert'
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'gdpr_dsfa', resourceId: item.id, detail: `${item.title}: ${detail}` })
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
