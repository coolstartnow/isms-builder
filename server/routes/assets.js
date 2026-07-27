// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const assetStore = require('../db/assetStore')
const embeddingStore = require('../ai/embeddingStore')

// Abhängigkeiten prüfen (unbekannte Ziele / Zyklen). Muss vor dem Schreiben
// passieren — Express 4 fängt Fehler aus async-Handlern nicht selbst ab.
async function checkDependencies(req, res, id) {
  if (req.body.dependsOn === undefined) return true
  const check = await assetStore.validateDependencies(id, req.body.dependsOn)
  if (!check.ok) {
    res.status(400).json({ error: check.error, unknown: check.unknown })
    return false
  }
  req.body.dependsOn = check.dependsOn
  return true
}

router.get('/assets/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await assetStore.getSummary())
})

// Knoten + Kanten für die Abhängigkeitsvisualisierung.
// Muss vor '/assets/:id' stehen, sonst greift der Parameter-Match.
router.get('/assets/graph', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await assetStore.getGraph())
})

router.get('/assets', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await assetStore.getAll(req.query))
})

router.get('/assets/:id', requireAuth, authorize('reader'), async (req, res) => {
  const a = await assetStore.getById(req.params.id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  res.json(a)
})

router.post('/assets', requireAuth, authorize('editor'), async (req, res) => {
  if (!await checkDependencies(req, res, null)) return
  const asset = await assetStore.create(req.body, { createdBy: req.user })
  await require('../db/auditStore').append({ user: req.user, action: 'create', resource: 'asset', detail: asset.name })
  embeddingStore.indexDoc({ ...asset, title: asset.name }, 'Asset', '#assets').catch(() => {})
  res.status(201).json(asset)
})

router.put('/assets/:id', requireAuth, authorize('editor'), async (req, res) => {
  if (!await checkDependencies(req, res, req.params.id)) return
  const updated = await assetStore.update(req.params.id, req.body, { changedBy: req.user })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'update', resource: 'asset', detail: updated.name })
  embeddingStore.indexDoc({ ...updated, title: updated.name }, 'Asset', '#assets').catch(() => {})
  res.json(updated)
})

router.delete('/assets/:id', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await assetStore.remove(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'asset', detail: req.params.id })
  res.json({ ok: true })
})

module.exports = router
