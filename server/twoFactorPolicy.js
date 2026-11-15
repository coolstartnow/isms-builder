// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Pflicht-2FA: gemeinsame Hilfen für die Route PUT /admin/security (Schutz vor Selbst-Aussperrung), die Warnung beim Serverstart und das
// Notfall-Werkzeug scripts/emergency-2fa.js.
// Hintergrund: Ist die Pflicht an und hat kein Administrator eine eingerichtete 2FA, kommt niemand mehr hinein (Anmeldung ergibt 403 ENFORCE_2FA,
// die Einrichtung braucht eine Anmeldung). Deshalb lässt der Server das Einschalten nur zu, wenn der handelnde Administrator selbst 2FA hat.

// gleiche Regel wie bei der Anmeldung (routes/auth.js): Geheimnis vorhanden UND bestätigt
const has2FA = u => !!(u && typeof u.totpSecret === 'string' && u.totpSecret.length > 0 && u.totpVerified === true)

// → { total, without2FA: [{ username, role }], admins, adminsWith2FA }  (nur Namen und Rollen, nie Geheimnisse)
function summary(rbac = require('./rbacStore')) {
  const list = rbac.getAllUsers()
  const without2FA = []; let admins = 0, adminsWith2FA = 0
  for (const u of list) {
    const raw = rbac.getUserByUsername(u.username)
    const ok = has2FA(raw)
    if (!ok) without2FA.push({ username: u.username, role: u.role })
    if (u.role === 'admin') { admins++; if (ok) adminsWith2FA++ }
  }
  return { total: list.length, without2FA, admins, adminsWith2FA }
}

// Beim Serverstart: Pflicht an, aber kein Administrator mit 2FA → deutliche Logwarnung mit dem Notfall-Befehl (blockiert nichts)
async function warnAtStart(log = console.warn) {
  let on = false
  try { on = (await require('./db/orgSettingsStore').get()).require2FA === true } catch { return false }
  if (!on) return false
  const s = summary()
  if (s.adminsWith2FA > 0) return false
  log('[2FA] WARNUNG: Die 2FA-Pflicht ist eingeschaltet, aber KEIN Administrator-Konto hat eine eingerichtete 2FA. Niemand kann sich anmelden, ' +
    `die Pflicht lässt sich nur noch auf der Kommandozeile ausschalten: node scripts/emergency-2fa.js status  (siehe docs/module-login-security.md, „Notfall“). Konten ohne 2FA: ${s.without2FA.length} von ${s.total}.`)
  return true
}

module.exports = { has2FA, summary, warnAtStart }
