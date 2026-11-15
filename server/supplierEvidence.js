// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Nachweis-Link am Lieferanten (z. B. ISO-27001-Zertifikat, SOC-Bericht): nur ein Verweis auf ein Dokument, das der Ersteller selbst verwaltet.
// Der Builder ruft den Link nie ab und prüft weder Erreichbarkeit noch Inhalt. Erlaubt sind ausschließlich http(s)-Adressen,
// weil die Oberfläche den Wert als Verweis ausgibt (javascript:/data: dürfen nie ankommen).
'use strict'

const MAX_URL = 2000
const MAX_LABEL = 120
const FIELDS = ['evidenceUrl', 'evidenceLabel', 'evidenceValidUntil']

function isDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

// Gibt den ersten Fehlertext (Englisch, wird über server/i18n.js übersetzt) oder null zurück. Nicht gesendete Felder werden nicht geprüft.
function validate(body) {
  const b = body || {}
  if (b.evidenceUrl !== undefined && b.evidenceUrl !== null && b.evidenceUrl !== '') {
    if (typeof b.evidenceUrl !== 'string') return 'Evidence link must start with http:// or https://'
    const u = b.evidenceUrl.trim()
    if (u.length > MAX_URL) return 'Evidence link is too long (max 2000 characters)'
    let parsed
    try { parsed = new URL(u) } catch { return 'Evidence link must start with http:// or https://' }
    if (!/^https?:$/.test(parsed.protocol) || /[\s\u0000-\u001f]/.test(u)) return 'Evidence link must start with http:// or https://'
  }
  if (b.evidenceLabel !== undefined && b.evidenceLabel !== null && b.evidenceLabel !== '') {
    if (typeof b.evidenceLabel !== 'string') return 'Evidence label is too long (max 120 characters)'
    if (b.evidenceLabel.trim().length > MAX_LABEL) return 'Evidence label is too long (max 120 characters)'
  }
  if (b.evidenceValidUntil !== undefined && b.evidenceValidUntil !== null && b.evidenceValidUntil !== '') {
    if (typeof b.evidenceValidUntil !== 'string' || !isDate(b.evidenceValidUntil)) return 'Invalid date for "valid until"'
  }
  return null
}

// Gespeicherter Wert: immer Text, ohne Leerraum an den Rändern; leer = nicht gesetzt
function clean(v) { return typeof v === 'string' ? v.trim() : '' }

// Anstehende bzw. bereits abgelaufene Nachweise laufender Lieferanten (nicht „inactive“/„terminated“): gültig bis ≤ heute + days (auch in der Vergangenheit)
function expiring(list, days) {
  const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
  return list.filter(i => !i.deletedAt && !['inactive', 'terminated'].includes(i.status) && i.evidenceValidUntil && i.evidenceValidUntil <= cutoff)
}

module.exports = { validate, clean, expiring, FIELDS, MAX_URL, MAX_LABEL }
