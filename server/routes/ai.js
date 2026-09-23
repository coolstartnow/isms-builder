// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
const express      = require('express')
const router       = express.Router()
const { requireAuth, authorize } = require('../auth')
const embeddingStore = require('../ai/embeddingStore')
const lexicalSearch  = require('../ai/lexicalSearch')
const policyGenerator = require('../ai/policyGenerator')
const auditStore     = require('../db/auditStore')
const { aiEnabled, ollamaUrl } = require('../ai/ollamaConfig')

// ── GET /api/ai/search?q=...  ─────────────────────────────────────────────────
// Keyword-Suche funktioniert immer. Semantische Suche nur wenn KI aktiviert + Ollama erreichbar.
router.get('/api/ai/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json({ results: [] })

  // Semantische Suche nur wenn KI-Toggle aktiv UND Ollama erreichbar
  let semantic = false
  if (aiEnabled()) {
    try {
      const r = await fetch(ollamaUrl() + '/api/tags', { signal: AbortSignal.timeout(1500) })
      semantic = r.ok && embeddingStore.count() > 0
    } catch {}
  }

  try {
    const results = semantic
      ? await embeddingStore.search(q)
      : await lexicalSearch.search(q)

    await auditStore.append({
      user:     req.user,
      action:   'ai_search',
      resource: 'ai',
      detail:   `Suche (${semantic ? 'semantisch' : 'Keyword'}): "${q}" → ${results.length} Treffer`,
    })
    res.json({ results, mode: semantic ? 'semantic' : 'keyword' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/ai/reindex  (admin only) ────────────────────────────────────────
router.post('/api/ai/reindex', requireAuth, authorize('admin'), async (req, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: 'KI-Integration deaktiviert' })
  try {
    const stats = await embeddingStore.reindexAll()
    await auditStore.append({
      user:     req.user,
      action:   'ai_reindex',
      resource: 'ai',
      detail:   `Vektorindex neu aufgebaut: ${stats.indexed} indexiert, ${stats.skipped} übersprungen`,
    })
    res.json({ ok: true, ...stats })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── GET /api/ai/status  ───────────────────────────────────────────────────────
// Status-Abfragen werden nicht geloggt (reines Monitoring, kein Datenzugriff)
router.get('/api/ai/status', requireAuth, async (req, res) => {
  const enabled = aiEnabled()
  let ollamaOk  = false
  if (enabled) {
    try {
      const r = await fetch(ollamaUrl() + '/api/tags', { signal: AbortSignal.timeout(2000) })
      ollamaOk = r.ok
    } catch {}
  }
  const indexed = embeddingStore.count()
  res.json({
    enabled,
    ollama:   ollamaOk,
    model:    process.env.EMBED_MODEL || 'nomic-embed-text',
    indexed,
    mode:     enabled ? (ollamaOk && indexed > 0 ? 'semantic' : 'keyword') : 'disabled',
  })
})

// ── POST /api/ai/generate-policy  (AI Policy Assistant, Discussion #87) ───────
// Erzeugt einen Markdown-Entwurf für ein neues Dokument (Titel + Typ + Sprache).
// Rolle contentowner, weil das dieselbe Berechtigung ist, die zum Anlegen/
// Speichern eines Dokuments nötig ist (POST /template) — wer den Text nicht
// speichern darf, braucht ihn auch nicht zu erzeugen.
router.post('/api/ai/generate-policy', requireAuth, authorize('contentowner'), async (req, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: 'KI-Integration ist deaktiviert (Admin-Einstellung).' })

  const { title, type, language, frameworkHint } = req.body || {}
  if (!title || !type || !language) {
    return res.status(400).json({ error: 'title, type und language sind erforderlich.' })
  }

  try {
    const content = await policyGenerator.generatePolicyContent({ title, type, language, frameworkHint })
    await auditStore.append({
      user:     req.user,
      action:   'ai_generate_policy',
      resource: 'ai',
      detail:   `${type} "${title}" (${language})`,
    })
    res.json({ content })
  } catch (e) {
    // Kein interner Serverfehler, sondern ein externer Dienst der nicht
    // erreichbar/verfügbar war — 502, nicht 500.
    res.status(502).json({ error: e.message })
  }
})

module.exports = router
