// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Zentrale Ollama-Konfiguration — von server/routes/ai.js und
// server/ai/policyGenerator.js gemeinsam genutzt, damit es nur eine
// Quelle der Wahrheit für "ist KI aktiv" / "welche URL" gibt (statt wie
// server/ai/greenobonePdfParser.js eigene, unabhängige Env-Variablen zu lesen).

function aiEnabled() {
  try { return require('../db/orgSettingsStore').get().aiEnabled !== false } catch { return true }
}

function ollamaUrl() {
  try {
    const cfg = require('../db/orgSettingsStore').get()
    return (cfg.aiOllamaUrl && cfg.aiOllamaUrl.trim()) || process.env.OLLAMA_URL || 'http://localhost:11434'
  } catch { return process.env.OLLAMA_URL || 'http://localhost:11434' }
}

module.exports = { aiEnabled, ollamaUrl }
