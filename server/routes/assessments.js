// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Supplier Assessment — authenticated routes (Admin/Editor)
'use strict'
const express         = require('express')
const router          = express.Router()
const { requireAuth, authorize } = require('../auth')
const assessmentStore = require('../db/assessmentStore')
const supplierStore   = require('../db/supplierStore')
const auditStore      = require('../db/auditStore')
const catalogs        = require('../db/assessmentCatalogs')
const portal          = require('../supplierPortal')
const supplierForm    = require('../supplierForm')
const orgSettingsStore = require('../db/orgSettingsStore')
const templateStore   = require('../db/assessmentTemplateStore')

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

// ── GET /assessments/:id/form.pdf — ausfüllbares PDF-Formular (Logo, Anschrift, Ansprechpartner) ──
router.get('/assessments/:id/form.pdf', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const a = assessmentStore.getById(req.params.id)
    if (!a) return res.status(404).json({ error: 'Not found' })
    const org = await orgSettingsStore.get()
    const pdf = await supplierForm.renderSupplierForm(a, { org })
    await auditStore.append({ user: req.user, action: 'export', resource: 'assessment', detail: a.supplierName + ' (PDF)' })
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${supplierForm.fileName(a)}"`, 'Cache-Control': 'no-store' })
    res.send(pdf)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /assessments/:id/answers — Antworten aus einem zurückgesendeten Formular eintragen ──
router.post('/assessments/:id/answers', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const a = assessmentStore.getById(req.params.id)
    if (!a) return res.status(404).json({ error: 'Not found' })
    if (a.status !== 'pending') return res.status(409).json({ error: 'Questionnaire already answered' })
    const answers = req.body && req.body.answers
    if (!Array.isArray(answers) || answers.length > 300) return res.status(400).json({ error: 'answers invalid' })
    const byId = new Map(answers.filter(x => x && typeof x.id === 'string').map(x => [x.id, x]))
    const missing = a.questions.flatMap(s => s.questions).filter(q => q.required === true && !String((byId.get(q.id) || {}).value || '').trim()).map(q => q.id)
    if (missing.length && req.body.allowIncomplete !== true) return res.status(400).json({ error: 'required answers missing', missing })
    const r = portal.applyAnswer(assessmentStore, { token: a.token }, { token: a.token, answers })
    if (!r.ok) return res.status(400).json({ error: r.reason })
    const updated = assessmentStore.setAnsweredVia(a.id, 'form', req.user)
    await auditStore.append({ user: req.user, action: 'submit', resource: 'assessment', detail: a.supplierName + ' (form)' + (r.missing.length ? ' (incomplete)' : '') })
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /assessments — Assessment-Link erstellen ────────────────────────────
router.post('/assessments', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const { supplierId } = req.body
    if (!supplierId) return res.status(400).json({ error: 'supplierId required' })

    const supplier = await supplierStore.getById(supplierId)
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })

    // Fragen: entweder vom Client angepasst (je Lieferant) oder aus der gewählten Vorlage; sonst Standardkatalog.
    const lang = typeof req.body.language === 'string' ? req.body.language : 'de'
    let questions, templateId = ''
    if (req.body.spec !== undefined) {
      // Auswahl aus der Oberfläche (je Lieferant angepasst): Katalog-Kennungen werden gegen den Katalog geprüft
      const sp = catalogs.validateSpec(req.body.spec)
      if (!sp.ok) return res.status(400).json({ error: sp.error })
      questions = catalogs.compose(sp.value, lang)
    } else if (req.body.questions !== undefined) {
      questions = catalogs.sanitizeQuestions(req.body.questions)
      if (!questions) return res.status(400).json({ error: 'questions invalid' })
    } else if (req.body.templateId) {
      const tpl = templateStore.getById(req.body.templateId, lang)
      if (!tpl) return res.status(404).json({ error: 'Template not found' })
      questions = catalogs.compose(tpl, lang)
    }
    if (req.body.templateId) templateId = String(req.body.templateId).slice(0, 40)
    const { questions: _q, templateId: _t, spec: _s, delivery: _d, ...rest } = req.body
    const viaPortal = req.body.delivery === 'portal'
    if (viaPortal && !portal.publicConfig().enabled) return res.status(409).json({ error: 'Portal not enabled' })
    const cfg = portal.readConfig()
    let item = assessmentStore.create(
      { ...rest, supplierName: supplier.name, templateId, delivery: viaPortal ? 'portal' : 'direct', ...(questions ? { questions } : {}) },
      { createdBy: req.user }
    )
    if (viaPortal) {
      // Fragebogen im Briefkasten ablegen; gelingt das nicht, wird der Datensatz wieder entfernt (kein toter Link)
      try {
        await portal.publish(item)
        item = assessmentStore.setPortalLink(item.id, `${cfg.publicUrl || cfg.url}/q/${item.token}`)
      } catch (e) {
        assessmentStore.remove(item.id, { deletedBy: req.user })
        return res.status(502).json({ error: 'Portal unreachable: ' + e.message })
      }
    }
    await auditStore.append({ user: req.user, action: 'create', resource: 'assessment', detail: supplier.name + (viaPortal ? ' (portal)' : '') })
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
