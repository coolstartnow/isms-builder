// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// PDF-Schrift: Auswahl und eigene Schrift (Administrator); Lesezugriff auf die aktive Schrift für die Druckfenster der Oberfläche.
const express = require('express')
const fs = require('fs')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const auditStore = require('../db/auditStore')
const orgSettingsStore = require('../db/orgSettingsStore')
const pdfFonts = require('../pdfFonts')

const CHOICES = [...Object.keys(pdfFonts.BUNDLED), 'custom', pdfFonts.STANDARD]

// Druckfenster (Browser): aktive Schrift. Nur angemeldet — eine eigene, lizenzierte Schrift soll nicht öffentlich abrufbar sein.
router.get('/pdf-font/active', requireAuth, authorize('reader'), async (req, res) => {
  const r = pdfFonts.resolve((await orgSettingsStore.get()).pdfFont)
  res.set('Cache-Control', 'no-store')
  res.json({ id: r.id, label: r.label, unicode: r.unicode })
})
router.get('/pdf-font/file/:style', requireAuth, authorize('reader'), async (req, res) => {
  if (!pdfFonts.FILE_STYLES.includes(req.params.style)) return res.status(404).json({ error: 'Not found' })
  const r = pdfFonts.resolve((await orgSettingsStore.get()).pdfFont)
  if (!r.unicode || !r.files[req.params.style]) return res.status(404).json({ error: 'Not found' })
  const buf = fs.readFileSync(r.files[req.params.style])
  res.set({ 'Content-Type': buf.toString('latin1', 0, 4) === 'OTTO' ? 'font/otf' : 'font/ttf', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=300' })
  res.send(buf)
})

router.get('/admin/pdf-font', requireAuth, authorize('admin'), async (req, res) => res.json(pdfFonts.info((await orgSettingsStore.get()).pdfFont)))

router.put('/admin/pdf-font', requireAuth, authorize('admin'), async (req, res) => {
  const choice = req.body && req.body.choice
  if (!CHOICES.includes(choice)) return res.status(400).json({ error: 'choice invalid' })
  if (choice === 'custom' && !pdfFonts.readCustom()) return res.status(400).json({ error: 'Custom font missing' })
  await orgSettingsStore.update({ pdfFont: choice })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'PDF-Schrift: ' + choice })
  res.json(pdfFonts.info(choice))
})

// Body: { style: 'regular'|'bold'|'italic', data: <Base64>, label?, licenseConfirmed: true }
router.post('/admin/pdf-font/custom', requireAuth, authorize('admin'), async (req, res) => {
  const b = req.body || {}
  const r = pdfFonts.saveCustom({ style: b.style, data: b.data, label: b.label, licenseConfirmed: b.licenseConfirmed, by: req.user })
  if (!r.ok) return res.status(400).json({ error: r.error })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: `Eigene PDF-Schrift hochgeladen (${b.style}, ${r.family})` })
  res.status(201).json(pdfFonts.info((await orgSettingsStore.get()).pdfFont))
})

router.delete('/admin/pdf-font/custom', requireAuth, authorize('admin'), async (req, res) => {
  pdfFonts.removeCustom()
  const cur = (await orgSettingsStore.get()).pdfFont
  if (cur === 'custom') await orgSettingsStore.update({ pdfFont: pdfFonts.DEFAULT_CHOICE })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Eigene PDF-Schrift entfernt' })
  res.json(pdfFonts.info((await orgSettingsStore.get()).pdfFont))
})

// Vorschau mit allen EU-Sonderbuchstaben; ?choice= zeigt eine noch nicht gewählte Schrift
router.get('/admin/pdf-font/preview.pdf', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const choice = CHOICES.includes(req.query.choice) ? req.query.choice : (await orgSettingsStore.get()).pdfFont
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="pdf-font-preview.pdf"', 'Cache-Control': 'no-store' })
    res.send(await pdfFonts.renderPreview(choice))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
