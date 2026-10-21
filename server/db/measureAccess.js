// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Zugriffsregeln für Maßnahmen im Mobile-Sync (ab Sync-Protokoll 2).
//
// Maßnahmen haben KEIN eigenes Sync-Recht. Wer sie über die App sieht oder ändert, ergibt sich aus den Modulen, mit denen
// sie verknüpft sind:  Risiko → risks, Feststellung → findings, Control → soa, Richtlinie → templates.
// Verarbeitungstätigkeiten (VVT), TOMs und Governance-Maßnahmen haben kein Sync-Modul: Sie sind über die App nie änderbar.
//
//   Lesen:    mindestens ein verknüpftes Modul ist lesbar.
//   Schreiben (ändern, anlegen, löschen): Schreibrecht auf ALLE Module der Maßnahme (gespeicherter ∪ neuer Stand), mindestens
//             eine Verknüpfung, keine VVT-/TOM-/Governance-Kennzeichnung.
//
// Reine Funktionen ohne Dateizugriff: Server (routes/sync.js) und Mobile App nutzen dieselbe Datei.

const LINK_MODULES = {
  linkedRisks: 'risks',
  linkedFindings: 'findings',
  linkedControls: 'soa',
  linkedPolicies: 'templates',
}

const list = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [])

// Module, mit denen die Maßnahme verknüpft ist (sortiert, ohne Doppelte)
function modulesOf(m) {
  const out = new Set()
  for (const [field, mod] of Object.entries(LINK_MODULES)) if (list(m && m[field]).length) out.add(mod)
  return [...out].sort()
}

// Kennzeichen, die eine Änderung über die App ausschließen
function lockedKind(m) {
  if (!m) return null
  if (m.tom) return 'tom'
  if (m.governance) return 'governance'
  if (list(m.linkedVvt).length) return 'vvt'
  return null
}

const hasLevel = (perms, mod, levels) => !!perms && levels.includes(perms[mod])
const readable = (perms, mod) => hasLevel(perms, mod, ['read', 'write'])
const writable = (perms, mod) => hasLevel(perms, mod, ['write'])

// Darf das Konto die Maßnahme lesen?
function canRead(m, perms) {
  return modulesOf(m).some(mod => readable(perms, mod))
}

// Darf das Konto die Maßnahme ändern/löschen/anlegen? `stored` = Stand am Server (oder null bei neuer Maßnahme),
// `incoming` = Stand, den die App senden will. → { ok: true } oder { ok: false, reason, code }
function canWrite(stored, incoming, perms) {
  const kind = lockedKind(stored) || lockedKind(incoming)
  if (kind) return { ok: false, code: 'locked_' + kind, reason: 'Diese Maßnahme (TOM, Governance oder Verarbeitungstätigkeit) ist über die App nicht änderbar' }
  const mods = [...new Set([...modulesOf(stored), ...modulesOf(incoming)])].sort()
  if (!mods.length) return { ok: false, code: 'no_link', reason: 'Eine Maßnahme braucht mindestens eine Verknüpfung (Risiko, Feststellung, Control oder Richtlinie)' }
  const missing = mods.filter(mod => !writable(perms, mod))
  if (missing.length) return { ok: false, code: 'no_write', modules: missing, reason: 'Keine Schreibrechte für: ' + missing.join(', ') }
  return { ok: true, modules: mods }
}

module.exports = { LINK_MODULES, modulesOf, lockedKind, canRead, canWrite }
