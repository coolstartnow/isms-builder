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

// ── KI-Entwürfe (AI Policy Assistant, Discussion #87) ────────────────────────
// Der Prompt wird ausschließlich aus server/ai/safeDraft.js gebaut: Dokument aus der festen Titelliste, Sprache und ein
// kurzer, gefilterter Hinweis. Rolle contentowner, weil das dieselbe Berechtigung ist, die zum Anlegen/Speichern eines
// Dokuments nötig ist (POST /template) — wer den Text nicht speichern darf, braucht ihn auch nicht zu erzeugen.
const safeDraft = require('../ai/safeDraft')

const DRAFT_ERRORS = {
  unknown_entry: 'Unknown document selection.',
  bad_language: 'Unsupported language.',
  hint_too_long: 'The hint is too long (max 200 characters).',
  hint_chars: 'The hint contains characters that are not allowed.',
  pii: 'The hint contains personal or technical data and is not sent.',
}

function orgValues() {
  try { return require('../db/orgSettingsStore').get() } catch { return {} }
}
// Werte, die nie im Hinweis stehen dürfen
function knownValues(org) { return [org.orgName, org.orgShort, org.cisoName, org.gdpoName].filter(Boolean) }

function destination() {
  try { return new URL(require('../ai/ollamaConfig').ollamaUrl()).origin } catch { return '' }
}

function buildChecked(body) {
  const { entry, language, hint } = body || {}
  return safeDraft.buildPrompt({ entry, language, hint, known: knownValues(orgValues()) })
}

function sendBuildError(res, r) {
  return res.status(400).json({ error: DRAFT_ERRORS[r.code] || 'Invalid request.', code: r.code, findings: r.findings })
}

// Titelliste für den Dialog
router.get('/api/ai/draft-catalog', requireAuth, authorize('contentowner'), (req, res) => {
  res.json({
    enabled: aiEnabled(),
    languages: safeDraft.LANGUAGES,
    maxHint: safeDraft.MAX_HINT,
    placeholders: Object.keys(safeDraft.PLACEHOLDERS),
    destination: destination(),
    entries: safeDraft.CATALOG.map(e => ({ id: e.id, type: e.type, title: e.title })),
  })
})

// Zeigt, was gesendet würde (Prompt und Ziel), ohne etwas zu senden
router.post('/api/ai/draft-preview', requireAuth, authorize('contentowner'), (req, res) => {
  const r = buildChecked(req.body)
  if (!r.ok) return sendBuildError(res, r)
  res.json({ prompt: r.prompt, destination: destination(), title: r.entry.title[r.language], type: r.entry.type })
})

router.post('/api/ai/generate-policy', requireAuth, authorize('contentowner'), async (req, res) => {
  if (!aiEnabled()) return res.status(503).json({ error: 'KI-Integration ist deaktiviert (Admin-Einstellung).' })

  const r = buildChecked(req.body)
  if (!r.ok) return sendBuildError(res, r)

  try {
    const raw = await policyGenerator.generateFromPrompt(r.prompt)
    const filled = safeDraft.fillPlaceholders(raw, orgValues())
    await auditStore.append({
      user:     req.user,
      action:   'ai_generate_policy',
      resource: 'ai',
      detail:   `${r.entry.id} (${r.language})${r.hint ? ', mit Hinweis' : ''}`,   // der Hinweistext selbst wird nicht protokolliert
    })
    res.json({ content: filled.text, unresolved: filled.unresolved, title: r.entry.title[r.language], type: r.entry.type })
  } catch (e) {
    // Kein interner Serverfehler, sondern ein externer Dienst der nicht
    // erreichbar/verfügbar war — 502, nicht 500.
    res.status(502).json({ error: e.message })
  }
})

module.exports = router
