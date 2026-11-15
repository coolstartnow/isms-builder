// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Vorlagen für Lieferanten-Fragebögen — Verwaltung (Rolle Editor)
'use strict'
const express   = require('express')
const router    = express.Router()
const { requireAuth, authorize } = require('../auth')
const catalogs  = require('../db/assessmentCatalogs')
const templates = require('../db/assessmentTemplateStore')
const auditStore = require('../db/auditStore')

const lang = req => (typeof req.query.lang === 'string' ? req.query.lang : 'de')

// Kataloge mit allen Fragen (für die Auswahloberfläche)
router.get('/assessment-templates/catalogs', requireAuth, authorize('reader'), (req, res) => {
  res.json(catalogs.listCatalogs(lang(req)))
})

router.get('/assessment-templates', requireAuth, authorize('reader'), (req, res) => {
  res.json(templates.getAll(lang(req)))
})

router.get('/assessment-templates/:id', requireAuth, authorize('reader'), (req, res) => {
  const t = templates.getById(req.params.id, lang(req))
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json(t)
})

router.post('/assessment-templates', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const r = templates.create(req.body || {}, { createdBy: req.user })
    if (!r.ok) return res.status(r.status || 400).json({ error: r.error })
    await auditStore.append({ user: req.user, action: 'create', resource: 'assessment-template', detail: r.value.name })
    res.status(201).json(r.value)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/assessment-templates/:id', requireAuth, authorize('editor'), async (req, res) => {
  try {
    if (req.params.id.startsWith('builtin:')) return res.status(403).json({ error: 'Built-in templates cannot be changed' })
    const r = templates.update(req.params.id, req.body || {}, { updatedBy: req.user })
    if (!r.ok) return res.status(r.status || 400).json({ error: r.error })
    await auditStore.append({ user: req.user, action: 'update', resource: 'assessment-template', detail: r.value.name })
    res.json(r.value)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/assessment-templates/:id', requireAuth, authorize('editor'), async (req, res) => {
  try {
    if (req.params.id.startsWith('builtin:')) return res.status(403).json({ error: 'Built-in templates cannot be deleted' })
    const t = templates.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    templates.remove(req.params.id, { deletedBy: req.user })
    await auditStore.append({ user: req.user, action: 'delete', resource: 'assessment-template', detail: t.name })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
