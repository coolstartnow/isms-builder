// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Firmenlogo: Bild öffentlich lesbar (die Login-Seite braucht es), Hochladen und Entfernen nur für Administratoren.
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const auditStore = require('../db/auditStore')
const orgLogo = require('../orgLogo')

router.get('/branding/logo', (req, res) => {
  const logo = orgLogo.read()
  if (!logo) return res.status(404).json({ error: 'No logo set' })
  res.setHeader('Content-Type', logo.mime)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-cache')
  res.send(logo.buffer)
})

router.get('/admin/logo', requireAuth, authorize('reader'), (req, res) => res.json(orgLogo.info()))

// Body: { data: "<Base64 oder data:-URL>" } — Typ und Größe werden aus den Bytes geprüft, nicht aus Angaben des Clients
router.put('/admin/logo', requireAuth, authorize('admin'), express.json({ limit: '1mb' }), async (req, res) => {
  const raw = String((req.body && req.body.data) || '').replace(/^data:[^,]*,/, '')
  if (!raw || !/^[A-Za-z0-9+/=\s]+$/.test(raw)) return res.status(400).json({ error: 'Invalid image data' })
  const result = orgLogo.save(Buffer.from(raw, 'base64'))
  if (!result.ok) return res.status(400).json({ error: result.error })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Firmenlogo gesetzt' })
  res.json(result.info)
})

router.delete('/admin/logo', requireAuth, authorize('admin'), async (req, res) => {
  orgLogo.remove()
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Firmenlogo entfernt' })
  res.json(orgLogo.info())
})

module.exports = router
