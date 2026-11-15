// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Zentrale Ollama-Konfiguration — von server/routes/ai.js, server/ai/policyGenerator.js und server/ai/embedder.js gemeinsam
// genutzt: eine Quelle der Wahrheit für „ist KI aktiv“, URL, Modelle und den optionalen API-Schlüssel.
//
// Alles ist asynchron: Die Einstellungen kommen aus orgSettingsStore, dessen get() unter SQLite/MariaDB/PostgreSQL ein Promise
// liefert (unter JSON ein Objekt; await verträgt beides). Früher las dieses Modul synchron — unter den SQL-Speichern galten
// dadurch weder URL und Modelle noch der KI-Schalter aus der Oberfläche.
//
// Jede Anfrage an Ollama geht durch ollamaFetch(): gleiche Kopfzeilen überall, damit sich die Anfragen des ISMS Builders im
// Protokoll eines vorgeschalteten Gateways eindeutig erkennen lassen (User-Agent immer, Authorization: Bearer, wenn ein
// Schlüssel hinterlegt ist). Der Schlüssel steht nur hier im Speicher, nie in einer Antwort, einem Log oder einer Fehlermeldung.

const DEFAULT_URL = 'http://localhost:11434'
const DEFAULT_EMBED_MODEL = 'nomic-embed-text'
const DEFAULT_GEN_MODEL = 'llama3.2:3b'
const MAX_KEY_LENGTH = 512

const text = v => (typeof v === 'string' ? v.trim() : '')

async function settings() {
  try { return (await require('../db/orgSettingsStore').get()) || {} } catch { return {} }
}

async function aiEnabled() { return (await settings()).aiEnabled !== false }

async function ollamaUrl() { return text((await settings()).aiOllamaUrl) || text(process.env.OLLAMA_URL) || DEFAULT_URL }

async function embedModel() { return text((await settings()).aiEmbedModel) || text(process.env.EMBED_MODEL) || DEFAULT_EMBED_MODEL }

async function genModel() { return text((await settings()).aiGenModel) || DEFAULT_GEN_MODEL }

// Einstellung vor Umgebungsvariable (OLLAMA_API_KEY, z. B. aus einem Docker-Secret); leer = kein Schlüssel
async function ollamaApiKey() { return text((await settings()).aiApiKey) || text(process.env.OLLAMA_API_KEY) }

const userAgent = () => `ISMS-Builder/${require('../../package.json').version}`

// Ein Schlüssel muss in eine Kopfzeile passen: sichtbare ASCII-Zeichen ohne Leerraum, höchstens 512 Zeichen.
// → { value } | { code: 'too_long' | 'invalid_chars' }
function validateApiKey(raw) {
  const v = text(raw)
  if (v.length > MAX_KEY_LENGTH) return { code: 'too_long' }
  if (!/^[\x21-\x7e]*$/.test(v)) return { code: 'invalid_chars' }   // keine Leerzeichen, Zeilenumbrüche, Steuer- oder Nicht-ASCII-Zeichen
  return { value: v }
}

/**
 * Anfrage an die konfigurierte Ollama-Adresse. Ruft das globale fetch auf (Tests ersetzen global.fetch).
 * opts: { method, body (Objekt oder Text), timeout (ms) }. Mit Schlüssel werden Weiterleitungen nicht verfolgt, damit der
 * Schlüssel nie an eine andere Adresse geht (die Antwort wäre dann ein Fehler).
 */
async function ollamaFetch(pathname, { method = 'GET', body, timeout = 5000 } = {}) {
  const [base, key] = await Promise.all([ollamaUrl(), ollamaApiKey()])
  const headers = { 'User-Agent': userAgent() }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (key) headers.Authorization = 'Bearer ' + key
  const init = { method, headers, signal: AbortSignal.timeout(timeout) }
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body)
  if (key) init.redirect = 'error'
  return fetch(base.replace(/\/+$/, '') + pathname, init)
}

module.exports = { aiEnabled, ollamaUrl, embedModel, genModel, ollamaApiKey, ollamaFetch, validateApiKey, userAgent, MAX_KEY_LENGTH, DEFAULT_URL, DEFAULT_EMBED_MODEL, DEFAULT_GEN_MODEL }
