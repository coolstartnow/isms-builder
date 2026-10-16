// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Dokument-Versionierung (#97): Die Version steigt nur bei der Freigabe, nicht beim Speichern.
// Gemeinsam für JSON- und Knex-Store.
'use strict'

/** War das Dokument schon einmal freigegeben? (Auch Altbestand ohne versionHistory.) */
function everApproved(t) {
  if ((t.versionHistory || []).length > 0) return true
  return (t.statusHistory || []).some(h => h.status === 'approved')
}

/**
 * Versionsnummer, die die nächste Freigabe bekommt: die erste Freigabe behält die vorhandene
 * Nummer, jede weitere zählt hoch.
 */
function nextApprovalVersion(t) {
  const v = Number(t.version) || 1
  return everApproved(t) ? v + 1 : v
}

/**
 * Setzt die Freigabe am Dokument (verändert `t`): neue Version, Eintrag in versionHistory
 * inklusive Inhalts-Snapshot. Gibt den Eintrag zurück.
 */
function applyApproval(t, { approvedBy, changes, now }) {
  const version = nextApprovalVersion(t)
  const entry = {
    version,
    approvedBy: approvedBy || 'unknown',
    approvedAt: now,
    changes: typeof changes === 'string' ? changes.trim().slice(0, 1000) : '',
    title: t.title,
    content: t.content,
  }
  t.version = version
  if (!Array.isArray(t.versionHistory)) t.versionHistory = []
  t.versionHistory.push(entry)
  return entry
}

/**
 * Versionstabelle für Anzeige und Export (ohne Inhalts-Snapshot, neueste zuletzt).
 * Altbestand: War ein Dokument vor dieser Funktion schon freigegeben, wird die letzte Freigabe
 * aus der Status-Historie als erste Zeile abgeleitet.
 */
function versionTable(t) {
  const rows = (t.versionHistory || []).map(({ version, approvedBy, approvedAt, changes }) =>
    ({ version, approvedBy, approvedAt, changes: changes || '' }))
  if (rows.length === 0 && t.status === 'approved') {
    const last = [...(t.statusHistory || [])].reverse().find(h => h.status === 'approved')
    if (last) rows.push({ version: t.version, approvedBy: last.changedBy || '', approvedAt: last.changedAt, changes: '', legacy: true })
  }
  return rows
}

/** Freigegebene Dokumente sind in Titel und Inhalt gesperrt; Metadaten bleiben änderbar. */
function contentChangeBlocked(existing, { title, content }) {
  if (existing.status !== 'approved') return false
  const titleChanged   = title !== undefined && title !== existing.title
  const contentChanged = typeof content === 'string' && content !== existing.content
  return titleChanged || contentChanged
}

module.exports = { everApproved, nextApprovalVersion, applyApproval, versionTable, contentChangeBlocked }
