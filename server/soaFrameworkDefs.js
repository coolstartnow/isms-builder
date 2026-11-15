// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Eigene SoA-Gruppen (nutzerdefinierte Frameworks): Prüfung der Definition und Planung des Datei-Imports.
// Reine Funktionen ohne Dateizugriff; die Definitionen speichert db/soaFrameworkStore.js (data/soa-frameworks.json).
// Es werden KEINE Normtexte ausgeliefert (Urheberrecht): Die Firma importiert die Inhalte, die sie verwenden darf.

// Eingebaute Frameworks (siehe db/soaStore.js) und der Sammel-Tab CUSTOM: ihre Kennungen sind für eigene Gruppen gesperrt
const BUILTIN_IDS = ['ISO27001', 'BSI', 'NIS2', 'EUCS', 'EUAI', 'ISO9000', 'ISO9001', 'CRA']
const RESERVED_IDS = [...BUILTIN_IDS, 'CUSTOM']

const ID_RE = /^[A-Z0-9][A-Z0-9_-]{1,49}$/          // framework-Spalte: 50 Zeichen
const COLOR_RE = /^#[0-9a-fA-F]{6}$/                 // wird als CSS-Wert benutzt → nur dieses Format
const CONTROL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:()+-]*$/

const MAX_BYTES = 2 * 1024 * 1024
const MAX_ROWS = 2000
// theme: 80 = Länge der Spalte soa_controls.theme (PostgreSQL/MariaDB würden längere Werte ablehnen)
const LIMITS = { label: 120, id: 120, theme: 80, title: 512, description: 4000 }

const str = v => (v === undefined || v === null ? '' : typeof v === 'string' ? v : '').trim()
const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v)

// Definition einer Gruppe prüfen. → { value } | { code }
//   code: invalid_id | reserved_id | invalid_label | invalid_color
function validateDefinition(def, { requireId = true } = {}) {
  if (!isPlainObject(def)) return { code: 'invalid_id' }
  const id = str(def.id)
  if (requireId || id) {
    if (!ID_RE.test(id)) return { code: 'invalid_id' }
    if (RESERVED_IDS.includes(id)) return { code: 'reserved_id' }
  }
  const label = str(def.label)
  if (!label || label.length > LIMITS.label) return { code: 'invalid_label' }
  const color = str(def.color) || '#64748b'
  if (!COLOR_RE.test(color)) return { code: 'invalid_color' }
  return { value: { id, label, color: color.toLowerCase() } }
}

// Kennung eines einzelnen Controls (auch für POST /soa/custom mit freier Kennung): URL-sicher und kein Name aus Object.prototype
const controlIdShapeOk = id => typeof id === 'string' && CONTROL_ID_RE.test(id) && !(id in Object.prototype)
const isValidControlId = id => controlIdShapeOk(id) && id.length <= LIMITS.id

// Datei lesen: ein Objekt { framework: { id, label, color }, controls: [...] }. → { framework, controls } | { code }
//   code: too_large | invalid_json | invalid_format
function parseImport(text) {
  const raw = String(text == null ? '' : text)
  if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return { code: 'too_large' }
  let data
  try { data = JSON.parse(raw.replace(/^﻿/, '')) } catch { return { code: 'invalid_json' } }
  if (!isPlainObject(data) || !Array.isArray(data.controls)) return { code: 'invalid_format' }
  if (data.controls.length > MAX_ROWS) return { code: 'too_many_rows' }
  return { framework: isPlainObject(data.framework) ? data.framework : null, controls: data.controls }
}

// Zeilen prüfen und den Import planen.
//   existing: [{ id, framework }] — alle schon vorhandenen Controls (Kennungen sind global eindeutig)
//   → { accepted: [{ id, theme, title, description? }], rejected: [{ index, id, reason }], rejectedByReason, added: [id], updated: [id] }
// Gründe: not_an_object | missing_field | invalid_id | too_long | duplicate_id | id_conflict
function planImport(rows, frameworkId, existing) {
  const have = new Map((existing || []).map(c => [c.id, c.framework]))
  const seen = new Set(), accepted = [], rejected = [], added = [], updated = []
  ;(Array.isArray(rows) ? rows : []).forEach((c, index) => {
    const id = isPlainObject(c) ? str(c.id) : ''
    const bad = reason => rejected.push({ index, id: id || null, reason })
    if (!isPlainObject(c)) return bad('not_an_object')
    const theme = str(c.theme), title = str(c.title), description = str(c.description)
    if (!id || !theme || !title) return bad('missing_field')
    if (!controlIdShapeOk(id)) return bad('invalid_id')
    if (id.length > LIMITS.id || theme.length > LIMITS.theme || title.length > LIMITS.title || description.length > LIMITS.description) return bad('too_long')
    if (seen.has(id)) return bad('duplicate_id')
    if (have.has(id) && have.get(id) !== frameworkId) return bad('id_conflict')   // Kennung gehört schon zu einem anderen Framework
    seen.add(id)
    const item = { id, theme, title }
    if (description) item.description = description
    accepted.push(item)
    ;(have.has(id) ? updated : added).push(id)
  })
  const rejectedByReason = rejected.reduce((m, r) => (m[r.reason] = (m[r.reason] || 0) + 1, m), {})
  return { accepted, rejected, rejectedByReason, added, updated }
}

// Beispiel-Datei mit erfundenen Controls (kein Normtext)
function exampleFile() {
  return {
    framework: { id: 'KUNDE-A', label: 'Kundenanforderung A', color: '#0ea5e9' },
    controls: [
      { id: 'KA-1', theme: 'Zugang', title: 'Zugriffe werden nach Rollen vergeben', description: 'Beispieltext — ersetzen Sie ihn durch Ihre eigene Anforderung.' },
      { id: 'KA-2', theme: 'Zugang', title: 'Privilegierte Konten werden regelmäßig überprüft' },
      { id: 'KA-3', theme: 'Betrieb', title: 'Sicherungen werden getestet' },
    ],
  }
}

module.exports = { BUILTIN_IDS, RESERVED_IDS, ID_RE, COLOR_RE, MAX_BYTES, MAX_ROWS, LIMITS, validateDefinition, isValidControlId, parseImport, planImport, exampleFile }
