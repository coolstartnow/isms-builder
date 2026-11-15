// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Lieferanten-Briefkasten: Einrichtung (Administrator) und Abholen der Antworten (Editor)
'use strict'
const express = require('express')
const router  = express.Router()
const { requireAuth, authorize } = require('../auth')
const portal  = require('../supplierPortal')
const assessmentStore = require('../db/assessmentStore')
const auditStore = require('../db/auditStore')

const fail = (res, e, status = 502) => res.status(status).json({ error: e && e.message ? e.message : String(e) })

// Für alle angemeldeten Rollen: ist der Briefkasten nutzbar? (keine Adressen, kein Schlüssel)
router.get('/supplier-portal/status', requireAuth, authorize('reader'), (req, res) => {
  const c = portal.publicConfig()
  res.json({ enabled: c.enabled, lastPollAt: c.lastPollAt, lastPollResult: c.lastPollResult })
})

router.get('/supplier-portal/config', requireAuth, authorize('admin'), (req, res) => res.json(portal.publicConfig()))

router.put('/supplier-portal/config', requireAuth, authorize('admin'), async (req, res) => {
  const r = portal.saveConfig(req.body || {})
  if (!r.ok) return res.status(400).json({ error: r.error })
  await auditStore.append({ user: req.user, action: 'update', resource: 'supplier-portal', detail: 'config' })
  res.json(portal.publicConfig())
})

router.post('/supplier-portal/key', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const r = portal.generateKey({ replace: req.body && req.body.replace === true })
    if (!r.ok) return res.status(r.status || 400).json({ error: r.error })
    await auditStore.append({ user: req.user, action: 'create', resource: 'supplier-portal', detail: 'key' })
    res.status(201).json(portal.publicConfig())
  } catch (e) { fail(res, e, 500) }
})

router.post('/supplier-portal/test', requireAuth, authorize('admin'), async (req, res) => {
  try { res.json(await portal.testConnection()) } catch (e) { fail(res, e) }
})

router.post('/supplier-portal/poll', requireAuth, authorize('editor'), async (req, res) => {
  try {
    if (!portal.publicConfig().enabled) return res.status(409).json({ error: 'Portal not enabled' })
    res.json(await portal.pollOnce({ assessmentStore, auditStore, by: req.user }))
  } catch (e) { fail(res, e) }
})

// Rückfall ohne Netzverbindung: Antworten aus einer Datei übernehmen ({ answers: [{ token, envelope }] })
router.post('/supplier-portal/import', requireAuth, authorize('editor'), async (req, res) => {
  try {
    const items = req.body && req.body.answers
    if (!Array.isArray(items) || items.length > 200) return res.status(400).json({ error: 'answers invalid' })
    if (!portal.hasKey()) return res.status(409).json({ error: 'Key missing' })
    res.json(await portal.pollOnce({ assessmentStore, auditStore, items, by: req.user }))
  } catch (e) { fail(res, e, 500) }
})

module.exports = router
