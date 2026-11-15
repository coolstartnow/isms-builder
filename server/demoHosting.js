// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Betriebsart „öffentliche Demo“ (DEMO_HOSTING=true), z. B. für demo.isms-builder.de: Die Zugangsdaten der Demo-Konten sind öffentlich
// (admin/adminpass …), jeder Besucher ist Administrator. Damit er die Demo erkunden kann, ohne den Server, andere Besucher oder Dritte zu
// beeinträchtigen, gilt:
//   • Wechsel in den Produktivbetrieb (Demo-Reset) nur als **Attrappe**: Der Ablauf (Anleitung, Bestätigung) läuft, der Server meldet
//     „simuliert“ und ändert nichts.
//   • Gesperrt (403, Code DEMO_HOSTING): Demo-Import mit beliebigem JSON, Aufräumen/Audit-Log leeren, Benutzer anlegen/ändern/löschen,
//     Passwort- und 2FA-Änderungen, Rollen-/Sicherheits-/KI-Einstellungen, Test-Mail und WebDAV-Test (Mailversand und Verbindungen zu
//     fremden Servern), Logo ändern, Sync-Konten.
//   • SMTP- und WebDAV-Zugangsdaten werden beim Speichern der Organisationseinstellungen verworfen.
//   • Mehrere gleichzeitige Sitzungen je Konto (die Demo-Konten werden gemeinsam benutzt), kein Produktivzustand, keine Passwortwarnung.
//   • Stündlich (und beim Start sowie auf SIGUSR2) werden die Passwörter der Demo-Konten auf die öffentlichen Werte zurückgesetzt und 2FA
//     ausgeschaltet. Das regelmäßige Zurücksetzen der Demodaten richtet der Betreiber der Demo selbst ein (z. B. per Cron).
// Der Schalter wird NUR über die Umgebung gesetzt (.env); es gibt dafür keine Route. Einzige Route ist das rein lesende /health (ok/degraded), siehe unten.
// Sonst keine neue, von außen erreichbare Schnittstelle:
// Er wirkt als Filter vor den vorhandenen Routen (und lässt Anfragen sonst unverändert durch). Ohne DEMO_HOSTING ändert sich nirgends etwas.
const enabled = () => process.env.DEMO_HOSTING === 'true'

// Öffentliche Demo-Passwörter (README „Demo accounts“); Schlüssel = E-Mail-Adresse
const DEMO_PASSWORDS = {
  'admin@example.com': 'adminpass',
  'ciso@example.com': 'cisopass',
  'dsb@example.com': 'dsbpass',
  'alice@it.example': 'alicepass',
  'bob@hr.example': 'bobpass',
  'carla@security.example': 'carlapass',
  'dana@privacy.example': 'danapass',
}

const ANY = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE']
// [Methoden, Pfad (klein geschrieben, ohne Schrägstrich am Ende), Verhalten]: block = 403, simulate = Attrappe, strip = Zugangsdaten verwerfen
const RULES = [
  [['POST'], /^\/admin\/demo-reset$/, 'simulate'],
  [['POST'], /^\/admin\/demo-import$/, 'block'],
  [['POST'], /^\/admin\/maintenance\/cleanup$/, 'block'],
  [['DELETE'], /^\/admin\/audit-log$/, 'block'],
  [['POST'], /^\/admin\/users$/, 'block'],
  [['PUT', 'DELETE'], /^\/admin\/users\/[^/]+$/, 'block'],
  [['PUT'], /^\/me\/password$/, 'block'],
  [ANY, /^\/2fa(\/.*)?$/, 'block'],
  [['PUT'], /^\/admin\/(security|role-settings|ai-settings)$/, 'block'],
  [['POST'], /^\/admin\/(email|webdav)\/test$/, 'block'],
  [['PUT', 'DELETE'], /^\/admin\/logo$/, 'block'],
  [WRITE, /^\/admin\/sync-accounts(\/.*)?$/, 'block'],
  [WRITE, /^\/soa\/frameworks(\/.*)?$/, 'block'],   // eigene SoA-Gruppen anlegen/ändern/löschen/importieren (das Demo-Admin-Konto ist öffentlich)
  [['PUT'], /^\/admin\/org-settings$/, 'strip'],
]
const STRIP_KEYS = ['smtpSettings', 'webdavSettings']

const normalize = p => String(p || '').toLowerCase().replace(/\/+$/, '') || '/'
function ruleFor(method, reqPath) {
  const p = normalize(reqPath)
  for (const [methods, re, mode] of RULES) if (methods.includes(method) && re.test(p)) return mode
  return null
}

// Express-Middleware (nur wirksam mit DEMO_HOSTING=true)
async function guard(req, res, next) {
  if (!enabled()) return next()
  const mode = ruleFor(req.method, req.path)
  if (!mode) return next()
  if (mode === 'strip') {
    if (req.body && typeof req.body === 'object') for (const k of STRIP_KEYS) delete req.body[k]
    return next()
  }
  if (mode === 'simulate') {
    // Nur für angemeldete Administratoren (sonst läuft die Anfrage zur echten Route und wird dort abgewiesen) — kein Eintrag im Protokoll durch Fremde
    const sess = require('./auth').getSessionFromReq(req)
    if (!sess || sess.role !== 'admin') return next()
    // Der Ablauf wird gezeigt, aber nichts geändert; die Oberfläche erkennt die Attrappe am Header
    try { await require('./db/auditStore').append({ user: sess.username, action: 'demo_reset_simulated', resource: 'org', detail: 'Demo-Reset in der öffentlichen Demo nur simuliert — nichts geändert' }) } catch { /* Protokoll ist ergänzend */ }
    res.setHeader('X-Demo-Hosting', 'simulated')
    return res.json({ ok: true, simulated: true })
  }
  res.setHeader('X-Demo-Hosting', 'blocked')
  return res.status(403).json({ error: 'This function is disabled in the public demo.', code: 'DEMO_HOSTING' })
}

// Setzt die Passwörter der Demo-Konten auf die öffentlichen Werte zurück und schaltet 2FA aus. Meldet die Anzahl der geänderten Konten.
async function resetDemoPasswords(rbac = require('./rbacStore'), bcrypt = require('bcryptjs')) {
  let changed = 0
  for (const [email, password] of Object.entries(DEMO_PASSWORDS)) {
    const username = rbac.getUsernameByEmail(email)
    const u = username && rbac.getUserByUsername(username)
    if (!u) continue
    const ok = u.passwordHash && await bcrypt.compare(password, u.passwordHash)
    const has2fa = !!(u.totpSecret && u.totpSecret.length) || u.totpVerified === true
    if (!ok || u.mustChangePassword === true) { await rbac.setPasswordHash(username, password); changed++ }
    if (has2fa) { rbac.setUserTotpSecret(username, null); if (ok) changed++ }
  }
  return changed
}

// Das mitgelieferte Demo-Logo (ISMS-Builder-Logo) sicherstellen: Es liegt als Datei im Datenverzeichnis und fehlt in Snapshots, die ohne es angelegt
// wurden oder aus einem Export stammen (der Export enthält nur JSON). Ein eigenes, hochgeladenes Logo bleibt unangetastet.
function ensureDemoLogo() {
  try { return require('./orgLogo').installDemoLogo() } catch { return false }
}

let timer = null
// Beim Start, stündlich und auf SIGUSR2 (z. B. `systemctl kill -s SIGUSR2 isms-builder`)
function startMaintenance() {
  if (!enabled() || timer) return
  const run = reason => resetDemoPasswords().then(n => console.log(`[demo-hosting] Demo-Passwörter geprüft (${reason}): ${n} zurückgesetzt`)).catch(e => console.error('[demo-hosting] Passwort-Reset fehlgeschlagen:', e.message))
  console.log('[demo-hosting] aktiv: Demo-Reset nur simuliert, Benutzer-/Passwort-/2FA-/Mail-/Import-Funktionen gesperrt, Mehrfach-Sitzungen erlaubt')
  ensureDemoLogo()
  run('Start')
  timer = setInterval(() => run('stündlich'), 60 * 60 * 1000)
  if (timer.unref) timer.unref()
  process.on('SIGUSR2', () => run('SIGUSR2'))
}

// Zustand für die Überwachung (weekly-hardening.sh, Monitoring): rein lesend, nur ok/degraded und Zeitstempel — keine Daten, keine Pfade, kein Backend-Name.
function health() {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  const result = { status: 'ok', ts: new Date().toISOString() }
  try {
    if (backend === 'json') { const fs = require('fs'); fs.accessSync(require('./paths').dataDir(), fs.constants.R_OK | fs.constants.W_OK) }
    else if (backend === 'sqlite') require('./db/database').getDb().prepare('SELECT 1').get()
  } catch { result.status = 'degraded' }
  return result
}

module.exports = { ensureDemoLogo, health, enabled, guard, ruleFor, RULES, STRIP_KEYS, DEMO_PASSWORDS, resetDemoPasswords, startMaintenance }
