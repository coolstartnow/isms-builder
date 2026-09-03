// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Leichtgewichtiger, rein In-Memory-basierter Brute-Force-Schutz fuer den
// Login-Endpunkt (Passwort UND 2FA). Bewusst ohne neue Abhaengigkeit
// (kein express-rate-limit o.ae.) — analog zur bestehenden trust-proxy-
// Haertung wird hier auf eine minimale, selbst gewartete Loesung gesetzt.
//
// Schluessel: username (bzw. E-Mail) + Quell-IP kombiniert — so sperrt ein
// Angreifer, der viele Benutzernamen gegen dieselbe IP probiert, nicht
// versehentlich einen anderen legitimen Nutzer von derselben IP aus, und
// umgekehrt schuetzt ein Nutzername-Treffer nicht vor Verteilung ueber
// mehrere IPs — aber jede einzelne Kombination wird nach Fehlversuchen
// zunehmend ausgebremst.
//
// State ist bewusst NUR im Prozessspeicher: bei Neustart oder mehreren
// Instanzen hinter einem Load Balancer geht der Zaehler verloren bzw. wird
// nicht geteilt. Fuer die Zielgruppe (Solo-/Kleinteam-Self-Hosting, i.d.R.
// eine einzelne Instanz) ist das ein akzeptabler Kompromiss gegenueber einer
// zusaetzlichen Abhaengigkeit (Redis o.ae.).

const MAX_FREE_ATTEMPTS = 3        // erste 3 Versuche ohne Verzoegerung
const BASE_DELAY_MS     = 1000     // Basis-Verzoegerung ab dem 4. Fehlversuch
const MAX_DELAY_MS      = 30000    // Deckel, damit die Wartezeit nicht unbegrenzt waechst
const ENTRY_TTL_MS      = 15 * 60 * 1000  // Zaehler verfallen nach 15 Min. Inaktivitaet

const attempts = new Map() // key -> { count, lastAttempt }

function makeKey(identifier, ip) {
  return `${String(identifier || '').toLowerCase()}|${ip || ''}`
}

// Aufraeumen abgelaufener Eintraege (wird bei jedem Zugriff nebenbei erledigt,
// kein eigener Timer noetig)
function sweep(now) {
  for (const [key, entry] of attempts) {
    if (now - entry.lastAttempt > ENTRY_TTL_MS) attempts.delete(key)
  }
}

// Verzoegerung, die aktuell noch abgewartet werden muss (0 = kein Delay).
function getRequiredDelayMs(identifier, ip) {
  const now = Date.now()
  sweep(now)
  const entry = attempts.get(makeKey(identifier, ip))
  if (!entry || entry.count < MAX_FREE_ATTEMPTS) return 0
  const overshoot = entry.count - MAX_FREE_ATTEMPTS + 1
  const delay = Math.min(BASE_DELAY_MS * 2 ** (overshoot - 1), MAX_DELAY_MS)
  const elapsed = now - entry.lastAttempt
  const remaining = delay - elapsed
  return remaining > 0 ? remaining : 0
}

// Nach einem fehlgeschlagenen Versuch (Passwort ODER 2FA) aufrufen.
function recordFailure(identifier, ip) {
  const now = Date.now()
  sweep(now)
  const key = makeKey(identifier, ip)
  const entry = attempts.get(key) || { count: 0, lastAttempt: now }
  entry.count += 1
  entry.lastAttempt = now
  attempts.set(key, entry)
}

// Nach erfolgreichem Login aufrufen — Zaehler fuer diese Kombination loeschen.
function recordSuccess(identifier, ip) {
  attempts.delete(makeKey(identifier, ip))
}

// Nur fuer Tests: kompletten State zuruecksetzen.
function _resetAll() {
  attempts.clear()
}

module.exports = { getRequiredDelayMs, recordFailure, recordSuccess, _resetAll, MAX_FREE_ATTEMPTS }
