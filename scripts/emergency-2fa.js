#!/usr/bin/env node
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Notfall-Werkzeug bei Aussperrung durch die 2FA-Pflicht: Ist „2FA für alle Benutzer verpflichtend“ eingeschaltet und hat kein Administrator eine
// eingerichtete 2FA, kann sich niemand mehr anmelden (403 ENFORCE_2FA) und die 2FA lässt sich nur nach einer Anmeldung einrichten.
// Dieses Werkzeug ändert den Zustand direkt im Datenspeicher (alle Backends: JSON, SQLite, MariaDB, PostgreSQL).
//
// Aufruf (Server vorher beenden — er hält die Benutzer im Arbeitsspeicher und würde Änderungen überschreiben):
//   node scripts/emergency-2fa.js status                    Zustand anzeigen (ändert nichts)
//   node scripts/emergency-2fa.js disable-policy            2FA-Pflicht ausschalten
//   node scripts/emergency-2fa.js reset-user <benutzername> 2FA eines Kontos zurücksetzen (Sitzungen des Kontos enden)
// Optionen: --yes (ohne Rückfrage; sonst muss JA getippt werden), --force (auch bei erreichbarem Server)
// Docker:   docker exec -it <container> node scripts/emergency-2fa.js status     (Container-Umgebung liefert DATA_DIR/STORAGE_BACKEND/…)
// Es werden nie Geheimnisse ausgegeben. Vor jeder Änderung entsteht (bei JSON-Speicher) eine Sicherungskopie der Datei; jede Änderung steht im Audit-Log.
'use strict'
const fs = require('fs')
const net = require('net')
const path = require('path')
const readline = require('readline')

const ROOT = path.join(__dirname, '..')
try { require('dotenv').config({ path: path.join(ROOT, '.env') }) } catch { /* dotenv fehlt → nur die Umgebung zählt */ }

const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const flags = new Set(process.argv.slice(2).filter(a => a.startsWith('--')))
const [cmd, target] = args

function usage(code) {
  console.error('Aufruf: node scripts/emergency-2fa.js status | disable-policy | reset-user <benutzername>   [--yes] [--force]')
  process.exit(code)
}
if (!['status', 'disable-policy', 'reset-user'].includes(cmd) || (cmd === 'reset-user' && !target)) usage(2)

// Läuft der Server noch? (Port erreichbar) — dann würde er eigene Daten zurückschreiben bzw. die Änderung nicht sehen
const portOpen = port => new Promise(resolve => {
  const s = net.connect({ port, host: '127.0.0.1' }); const done = v => { s.destroy(); resolve(v) }
  s.setTimeout(1500, () => done(false)); s.once('connect', () => done(true)); s.once('error', () => done(false))
})
const ask = q => new Promise(resolve => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); resolve(a) }) })

function backup(file) {
  if (!fs.existsSync(file)) return null
  const b = `${file}.notfall-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`
  fs.copyFileSync(file, b); try { fs.chmodSync(b, 0o600) } catch {}
  return b
}

;(async () => {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  const dataDir = process.env.DATA_DIR || path.join(ROOT, 'data')
  const readOnly = cmd === 'status'
  const port = Number(process.env.PORT) || 3000
  if (!readOnly && !flags.has('--force') && await portOpen(port)) {
    console.error(`Auf Port ${port} antwortet noch ein Server. Bitte zuerst den ISMS Builder beenden (er überschreibt sonst die Änderung) — oder mit --force fortfahren.`)
    process.exit(1)
  }
  if (backend !== 'json') await require('../server/db/knexDatabase').init()
  const rbac = require('../server/rbacStore')
  const policy = require('../server/twoFactorPolicy')
  const settings = require('../server/db/orgSettingsStore')
  const audit = require('../server/db/auditStore')

  const cfg = await settings.get()
  const sum = policy.summary(rbac)
  console.log(`Speicher: ${backend}   Daten: ${dataDir}`)
  console.log(`2FA-Pflicht: ${cfg.require2FA === true ? 'EINGESCHALTET' : 'aus'}`)
  console.log(`Konten: ${sum.total}, davon ohne 2FA: ${sum.without2FA.length}; Administratoren: ${sum.admins}, davon mit 2FA: ${sum.adminsWith2FA}`)
  if (sum.without2FA.length) console.log('Ohne 2FA: ' + sum.without2FA.map(u => `${u.username} (${u.role})`).join(', '))
  if (cfg.require2FA === true && sum.adminsWith2FA === 0) console.log('→ AUSSPERRUNG: Die Pflicht ist an und kein Administrator hat 2FA. Abhilfe: node scripts/emergency-2fa.js disable-policy')
  if (readOnly) process.exit(0)

  let what
  if (cmd === 'disable-policy') {
    if (cfg.require2FA !== true) { console.log('Die 2FA-Pflicht ist bereits aus — nichts zu tun.'); process.exit(0) }
    what = 'die 2FA-Pflicht für alle Benutzer AUSSCHALTEN'
  } else {
    const raw = rbac.getUserByUsername(target)
    if (!raw) { console.error(`Benutzer „${target}“ existiert nicht.`); process.exit(1) }
    what = `die 2FA des Kontos „${target}“ ZURÜCKSETZEN (Geheimnis wird gelöscht, Sitzungen des Kontos enden)`
  }
  if (!flags.has('--yes')) {
    const a = await ask(`\nAchtung: Es soll ${what}. Zum Fortfahren JA tippen: `)
    if (a.trim() !== 'JA') { console.log('Abgebrochen — nichts wurde geändert.'); process.exit(1) }
  }
  const saved = []
  const b1 = backup(path.join(dataDir, cmd === 'disable-policy' ? 'org-settings.json' : 'rbac_users.json')); if (b1 && (backend === 'json' || cmd === 'reset-user')) saved.push(b1)

  if (cmd === 'disable-policy') {
    await settings.update({ require2FA: false })
    await audit.append({ user: 'notfall-cli', action: 'settings', resource: 'security', detail: 'Notfall: 2FA-Pflicht ausgeschaltet (scripts/emergency-2fa.js)' })
    console.log('✓ 2FA-Pflicht ausgeschaltet. Server starten, als Administrator anmelden und die 2FA einrichten, bevor die Pflicht wieder eingeschaltet wird.')
  } else {
    rbac.setUserTotpSecret(target, '')
    const sessions = require('../server/sessionStore'); sessions.revokeUser(target); sessions.flushNow()
    await audit.append({ user: 'notfall-cli', action: 'settings', resource: '2fa', detail: `Notfall: 2FA zurückgesetzt für ${target} (scripts/emergency-2fa.js)` })
    console.log(`✓ 2FA für „${target}“ zurückgesetzt, Sitzungen des Kontos beendet.` + (cfg.require2FA === true ? ' Achtung: Die Pflicht ist noch an — das Konto kann sich erst anmelden, wenn sie ausgeschaltet ist (disable-policy).' : ''))
  }
  for (const f of saved) console.log('Sicherungskopie: ' + f)
  process.exit(0)
})().catch(e => { console.error('Fehler:', e && e.message ? e.message : e); process.exit(1) })
