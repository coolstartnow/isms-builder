// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// AI Policy Assistant (README-Roadmap "AI Policy Assistant", Discussion #87)
// Generiert einen Markdown-Entwurf für ein Dokument (Titel + Typ + Sprache),
// den der Nutzer im Editor prüft und manuell speichert. Bewusst KEIN JSON-
// Parsing der Antwort nötig (anders als server/ai/greenobonePdfParser.js) —
// die Ollama-Antwort IST bereits der gewünschte Markdown-Text.
const { ollamaUrl } = require('./ollamaConfig')

const LANG_NAMES = { de: 'Deutsch', en: 'Englisch', fr: 'Französisch', nl: 'Niederländisch' }

// Kurze, feste Struktur-Vorgabe je Dokumenttyp. Bewusst NICHT aus den
// data/demo-bundles/*.json gezogen — deren Typabdeckung ist uneinheitlich
// (nicht jede Sprache hat jeden Typ, "Risk Policy" heißt im EN-Bundle z.B.
// nur "Risk") und wäre damit eine brüchige Quelle. Das Modell übersetzt die
// Abschnittsüberschriften selbst in die Zielsprache (siehe Prompt unten).
const TYPE_STRUCTURE_HINTS = {
  'Policy':       'Zweck, Geltungsbereich, Grundsätze, Verantwortlichkeiten',
  'Procedure':    'Zweck, Verantwortlichkeiten, Schritte/Ablauf, Nachweise',
  'Risk Policy':  'Zweck, Risikoansatz, Bewertungskriterien, Behandlungsstrategien, Verantwortlichkeiten',
  'SoA':          'Zweck, Geltungsbereich, Bezug zu Controls/Frameworks, Pflegeprozess',
  'Incident':     'Zweck, Meldewege, Sofortmaßnahmen, Eskalation, Nachbereitung/Lessons Learned',
  'Release':      'Zweck, Freigabekriterien, Rollen, Änderungs-/Rollback-Prozess',
}
const DEFAULT_STRUCTURE_HINT = 'Zweck, Geltungsbereich, Grundsätze, Verantwortlichkeiten'

function genModel() {
  try {
    const cfg = require('../db/orgSettingsStore').get()
    return (cfg.aiGenModel && cfg.aiGenModel.trim()) || 'llama3.2:3b'
  } catch { return 'llama3.2:3b' }
}

function buildPrompt({ title, type, language, frameworkHint }) {
  const langName = LANG_NAMES[language] || LANG_NAMES.de
  const structureHint = TYPE_STRUCTURE_HINTS[type] || DEFAULT_STRUCTURE_HINT
  const lines = [
    'Du bist ein ISO-27001/NIS2-erfahrener Autor von Informationssicherheits-Dokumenten für ein KMU.',
    `Erstelle den Inhalt für ein Dokument vom Typ "${type}" mit dem Titel "${title}".`,
    `Übliche Gliederung für diesen Dokumenttyp: ${structureHint}.`,
    `Schreibe den gesamten Text inkl. Abschnittsüberschriften auf ${langName}.`,
  ]
  if (frameworkHint && frameworkHint.trim()) {
    lines.push(`Berücksichtige besonders: ${frameworkHint.trim()}.`)
  }
  lines.push('Gib AUSSCHLIESSLICH den Markdown-Inhalt zurück, beginnend mit einer "#"-Überschrift. Keine Erklärungen, keine Code-Fences, kein JSON.')
  return lines.join('\n')
}

/** Entfernt ggf. vom Modell trotz Anweisung hinzugefügte Code-Fences. */
function stripCodeFences(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

/**
 * Generiert einen Markdown-Entwurf per Ollama.
 * @throws Error mit nutzerverständlicher Meldung bei jedem Fehlschlag —
 *   bewusst KEIN stiller Fallback (anders als greenobonePdfParser.js):
 *   der Nutzer hat aktiv geklickt und braucht eine sichtbare Fehlermeldung.
 */
async function generatePolicyContent({ title, type, language, frameworkHint }) {
  const prompt = buildPrompt({ title, type, language, frameworkHint })

  let res
  try {
    res = await fetch(ollamaUrl() + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: genModel(), prompt, stream: false }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (e) {
    throw new Error(`Ollama nicht erreichbar: ${e.message}`)
  }

  if (!res.ok) {
    throw new Error(`Ollama antwortete mit HTTP ${res.status}`)
  }

  const data = await res.json()
  const content = stripCodeFences(String(data.response || ''))
  if (content.length < 20) {
    throw new Error('Ollama lieferte eine leere oder zu kurze Antwort.')
  }
  return content
}

module.exports = { generatePolicyContent, TYPE_STRUCTURE_HINTS }
