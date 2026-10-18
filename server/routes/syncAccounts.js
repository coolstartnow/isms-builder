// © 2026 Claude Hecker — ISMS Builder V 1.76 — AGPL-3.0
'use strict'
/**
 * Verwaltung der Sync-Konten (nur Admin): Verwaltung → Benutzer → Sync-Konten.
 *
 * Geräte werden per Einrichtungscode eingerichtet (QR-Code): Der Schlüssel des Geräts entsteht erst beim Einlösen in der
 * App und ist dem Administrator nie sichtbar. Für Skripte lässt sich ein Geräteschlüssel direkt erzeugen; er wird nur in
 * der Antwort auf diesen Aufruf ausgegeben.
 */
const express = require('express')
const QRCode = require('qrcode')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const store = require('../db/syncAccountStore')
const auditStore = require('../db/auditStore')

const STATUS_OF = { NAME_TAKEN: 409 }
function fail(res, e) {
  if (e && e.code && ['BAD_NAME', 'NAME_TAKEN', 'BAD_PERMISSIONS', 'NO_PERMISSION', 'BAD_EXPIRY'].includes(e.code)) {
    return res.status(STATUS_OF[e.code] || 400).json({ error: e.message })
  }
  throw e
}
const audit = (req, action, detail) => auditStore.append({ user: req.user, action, resource: 'sync-account', detail })
const nameOf = id => (store.list().find(a => a.id === id) || {}).name || id

router.get('/admin/sync-accounts', requireAuth, authorize('admin'), (req, res) => {
  res.json(store.list())
})

router.post('/admin/sync-accounts', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const account = store.create(req.body || {}, req.user)
    await audit(req, 'create', account.name)
    res.status(201).json({ account })
  } catch (e) { fail(res, e) }
})

router.put('/admin/sync-accounts/:id', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const account = store.update(req.params.id, req.body || {})
    if (!account) return res.status(404).json({ error: 'Not found' })
    await audit(req, 'update', account.name + (account.active ? '' : ' (disabled)'))
    res.json(account)
  } catch (e) { fail(res, e) }
})

router.delete('/admin/sync-accounts/:id', requireAuth, authorize('admin'), async (req, res) => {
  const name = nameOf(req.params.id)
  if (!store.remove(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'delete', name)
  res.json({ deleted: true })
})

// Einrichtungscode + QR-Code für ein neues Gerät. serverUrl = Adresse, unter der die App den Server erreicht.
router.post('/admin/sync-accounts/:id/enrollment', requireAuth, authorize('admin'), async (req, res) => {
  const url = String((req.body && req.body.serverUrl) || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s]+$/i.test(url)) return res.status(400).json({ error: 'Invalid server address' })
  const r = store.startEnrollment(req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  const payload = `isms-sync://enroll?u=${encodeURIComponent(url)}&c=${r.code}`
  const qr = await QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: '#000', light: '#fff' } })
  await audit(req, 'enrollment-start', r.account.name)
  res.json({ code: r.code, expiresAt: r.expiresAt, serverUrl: url, payload, qr })
})

// Geräteschlüssel direkt erzeugen (für Skripte wie scripts/sync-import.js)
router.post('/admin/sync-accounts/:id/devices', requireAuth, authorize('admin'), async (req, res) => {
  const r = store.addDevice(req.params.id, req.body && req.body.name)
  if (!r) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'device-key-create', `${r.account.name}: ${r.device.name}`)
  res.status(201).json(r)
})

router.delete('/admin/sync-accounts/:id/devices/:deviceId', requireAuth, authorize('admin'), async (req, res) => {
  const name = nameOf(req.params.id)
  const dev = (store.list().find(a => a.id === req.params.id) || { devices: [] }).devices.find(d => d.id === req.params.deviceId)
  const account = store.removeDevice(req.params.id, req.params.deviceId)
  if (!account) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'device-remove', `${name}: ${dev ? dev.name : req.params.deviceId}`)
  res.json(account)
})

module.exports = router
