// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Prüft das JWT-Secret. Ein fehlendes, kurzes oder als Platzhalter erkennbares Secret (.env.example, .env.docker) macht Sitzungen
// fälschbar: Wer es kennt, kann sich ein beliebiges Cookie mit beliebiger Rolle ausstellen (GHSA-vwc3-4j58-wrxc).
const MIN_LENGTH = 32
// Platzhalter ohne Rücksicht auf Groß-/Kleinschreibung und Trennzeichen: change_me, change-me, changeme, use_openssl …
const PLACEHOLDER = /change[\s_-]*me|use[\s_-]*openssl|your[\s_-]*(very[\s_-]*)?(long[\s_-]*)?(random[\s_-]*)?secret|replace[\s_-]*me|^secret$|^password$/i

// → null, wenn das Secret in Ordnung ist, sonst der Grund: 'missing' | 'placeholder' | 'short'
function weakSecretReason(secret) {
  const s = typeof secret === 'string' ? secret.trim() : ''
  if (!s) return 'missing'
  if (PLACEHOLDER.test(s)) return 'placeholder'
  if (s.length < MIN_LENGTH) return 'short'
  return null
}

const REASON_TEXT = {
  missing: 'JWT_SECRET ist nicht gesetzt.',
  placeholder: 'JWT_SECRET ist noch der Platzhalter aus .env.example/.env.docker.',
  short: `JWT_SECRET ist zu kurz (mindestens ${MIN_LENGTH} Zeichen).`,
}

// Verhalten beim Start: In Produktion (NODE_ENV=production, z. B. im Docker-Image) bricht der Start ab; sonst nur eine Warnung,
// damit Entwicklung, Demo und Tests weiter laufen. `exit` und `warn` sind für Tests austauschbar.
function enforce({ secret, env = process.env.NODE_ENV, exit = code => process.exit(code), warn = m => console.warn(m), error = m => console.error(m) } = {}) {
  const reason = weakSecretReason(secret)
  if (!reason) return null
  const how = 'Neues Secret erzeugen: openssl rand -hex 32  — und als JWT_SECRET in .env bzw. .env.docker eintragen.'
  if (env === 'production') {
    error(`[AUTH] FEHLER: ${REASON_TEXT[reason]} Der Server startet in Produktion nicht mit einem unsicheren Secret. ${how}`)
    exit(1)
    return reason
  }
  warn(`[AUTH] WARNUNG: ${REASON_TEXT[reason]} Nur für Entwicklung und Demo geeignet; in Produktion startet der Server so nicht. ${how}`)
  return reason
}

// Header-Anmeldung (X-User-Name/X-User-Role) ist nur für Entwicklung gedacht: wer die Header setzen kann, ist beliebiger Benutzer.
// In Produktion (NODE_ENV=production, z. B. Docker-Image) bricht der Start ab; sonst nur eine Warnung.
function enforceDevHeaderAuth({ enabled, env = process.env.NODE_ENV, exit = code => process.exit(code), warn = m => console.warn(m), error = m => console.error(m) } = {}) {
  if (!enabled) return false
  if (env === 'production') {
    error('[AUTH] FEHLER: DEV_HEADER_AUTH=true ist in Produktion nicht erlaubt (Anmeldung per X-User-Header umgeht jede Prüfung). Variable entfernen oder auf false setzen.')
    exit(1)
    return true
  }
  warn('[AUTH] WARNUNG: DEV_HEADER_AUTH=true — Anmeldung per X-User-Header ist aktiv. Nur für Entwicklung und Tests; in Produktion startet der Server so nicht.')
  return true
}

module.exports = { weakSecretReason, enforce, enforceDevHeaderAuth, MIN_LENGTH }
