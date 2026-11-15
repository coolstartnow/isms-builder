// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// AI Policy Assistant (README-Roadmap "AI Policy Assistant", Discussion #87)
// Erzeugt einen Markdown-Entwurf per Ollama. Der Prompt kommt ausschließlich aus ./safeDraft.js: Dokument aus der festen
// Titelliste, Sprache, optional ein kurzer, gefilterter Hinweis. Keine Firmen-, Personen- oder Systemdaten gehen hinaus;
// das Modell schreibt mit Platzhaltern, die der Aufrufer danach lokal füllt (safeDraft.fillPlaceholders).
const { ollamaFetch, genModel } = require('./ollamaConfig')
const safeDraft = require('./safeDraft')

/**
 * Sendet einen bereits geprüften Prompt an Ollama und liefert den bereinigten Markdown-Text.
 * @throws Error mit nutzerverständlicher Meldung bei jedem Fehlschlag — bewusst KEIN stiller Fallback:
 *   der Nutzer hat aktiv geklickt und braucht eine sichtbare Fehlermeldung.
 */
async function generateFromPrompt(prompt) {
  let res
  try {
    res = await ollamaFetch('/api/generate', { method: 'POST', body: { model: await genModel(), prompt, stream: false }, timeout: 60_000 })
  } catch (e) {
    // Mit API-Schlüssel werden Weiterleitungen nicht verfolgt (der Schlüssel soll nie an eine andere Adresse gehen) → klare Meldung
    if (/redirect/i.test(String((e && e.cause && e.cause.message) || ''))) throw new Error('Ollama leitet auf eine andere Adresse weiter; mit API-Schlüssel werden Weiterleitungen nicht verfolgt. Bitte die Adresse in den KI-Einstellungen anpassen.')
    throw new Error(`Ollama nicht erreichbar: ${e.message}`)
  }

  if (!res.ok) {
    throw new Error(`Ollama antwortete mit HTTP ${res.status}`)
  }

  const data = await res.json()
  const content = safeDraft.stripCodeFences(String(data.response || ''))
  if (content.length < 20) {
    throw new Error('Ollama lieferte eine leere oder zu kurze Antwort.')
  }
  return content
}

module.exports = { generateFromPrompt, genModel }
