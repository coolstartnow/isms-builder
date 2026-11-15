// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Demo oder Produktivbetrieb? NODE_ENV taugt dafür nicht — das Docker-Image läuft immer mit NODE_ENV=production.
// Gemeint ist der Datenzustand: Eine frische Instanz ist eine Demo (Demo-Konten admin/alice/bob, bekannte Demo-Passwörter). Der Wechsel in
// den Produktivbetrieb (Admin → Demo-Reset oder scripts/prepare-production.js) schreibt eine dauerhafte Markierung. Bestandsinstallationen,
// die vorher zurückgesetzt wurden, haben keine Markierung; sie gelten als produktiv, sobald die Demo-Konten alice und bob fehlen.
// Im Produktivbetrieb gelten die Seed-Passwörter (adminpass …) nie als Anmeldung — Ausnahme: Übergabe direkt nach dem Wechsel
// (Konto mit mustChangePassword, das Passwort muss sofort geändert werden).
const fs = require('fs')
const path = require('path')

const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '../data')
const MARKER = () => path.join(DATA_DIR(), '.production')

// Passwörter der mitgelieferten Demo-Konten (öffentlich dokumentiert, README „Demo accounts“).
const SEED_PASSWORDS = new Set(['adminpass', 'alicepass', 'bobpass', 'carlapass', 'danapass'])
const isSeedPassword = p => typeof p === 'string' && SEED_PASSWORDS.has(p)

function isProduction(rbac) {
  if (process.env.DEMO_HOSTING === 'true') return false   // öffentliche Demo: nie Produktivzustand, keine Passwortsperre/-warnung
  try { if (fs.existsSync(MARKER())) return true } catch { /* ignorieren */ }
  // Die Testsuite benutzt eigene Konten (admin, editor, … mit Klartext-Passwörtern wie adminpass) ohne alice/bob: dort nicht ableiten
  // (die Markierung oben gilt immer; ISMS_PRODUCTION_INFER=1 schaltet die Ableitung im Test ein).
  if (process.env.NODE_ENV === 'test' && process.env.ISMS_PRODUCTION_INFER !== '1') return false
  try {
    const store = rbac || require('./rbacStore')
    const users = store.getAllUsers()
    if (!users.length) return false
    const names = new Set(users.map(u => u.username))
    return !names.has('alice') && !names.has('bob')
  } catch { return false }
}

// Konten, die im Produktivbetrieb noch das Demo-Passwort ihres Namens haben (admin/adminpass …). Angemeldet werden können sie nicht mehr
// (die Anmeldung wird abgelehnt); die Liste dient der Warnung. Geprüft werden nur die fünf Demo-Kontennamen (je ein bcrypt-Vergleich).
// Konten mit mustChangePassword sind die erlaubte Übergabe nach dem Wechsel und zählen nicht.
const SEED_BY_USER = { admin: 'adminpass', alice: 'alicepass', bob: 'bobpass', carla: 'carlapass', dana: 'danapass' }
let _cache = null
async function seedPasswordAccounts(rbac, { force = false } = {}) {
  if (!isProduction(rbac)) return []
  if (_cache && !force && Date.now() - _cache.t < 20000) return _cache.v
  const store = rbac || require('./rbacStore')
  const bcrypt = require('bcryptjs')
  const out = []
  for (const [name, pw] of Object.entries(SEED_BY_USER)) {
    const u = store.getUserByUsername(name)
    if (!u || !u.passwordHash || u.mustChangePassword === true) continue
    try { if (await bcrypt.compare(pw, u.passwordHash)) out.push(name) } catch { /* Hash unlesbar → ignorieren */ }
  }
  _cache = { t: Date.now(), v: out }
  return out
}
function resetCache() { _cache = null }

// Auffällige Warnung im Serverlog (Start und danach alle 30 Minuten, solange ein Konto betroffen ist).
async function warnAtStart(rbac) {
  const log = async () => {
    let names = []
    try { names = await seedPasswordAccounts(rbac, { force: true }) } catch { return }
    if (!names.length) return
    const bar = '█'.repeat(86)
    const lines = [
      '', bar,
      '██  SICHERHEITSWARNUNG — DEMO-PASSWORT IM PRODUKTIVBETRIEB',
      `██  Betroffene Konten: ${names.join(', ')}`,
      '██  Diese Konten tragen das öffentlich bekannte Demo-Passwort. Die Anmeldung damit ist GESPERRT.',
      '██  Neues Passwort setzen:  node scripts/set-password.js <benutzername>',
      '██  Docker:                 docker exec -it <container> node scripts/set-password.js <benutzername>',
      '██  Oder als anderer Administrator: Administration → Benutzer → Passwort setzen.',
      bar, '',
    ]
    console.error(lines.join('\n'))
  }
  await log()
  const t = setInterval(log, 30 * 60 * 1000)
  if (t.unref) t.unref()
}

// Zurück in den Demozustand (Demo-Import stellt die Demo-Konten mit ihren öffentlichen Passwörtern wieder her): Markierung entfernen,
// sonst blieben die Demo-Passwörter im Produktivbetrieb gesperrt.
function clearProduction() {
  try { fs.unlinkSync(MARKER()) } catch (e) { if (e.code !== 'ENOENT') console.error('[production] Markierung konnte nicht entfernt werden:', e.message) }
  resetCache()
}

function markProduction() {
  try { fs.writeFileSync(MARKER(), new Date().toISOString() + '\n') } catch (e) { console.error('[production] Markierung konnte nicht geschrieben werden:', e.message) }
}

module.exports = { isProduction, markProduction, clearProduction, isSeedPassword, SEED_PASSWORDS, seedPasswordAccounts, warnAtStart, resetCache }
