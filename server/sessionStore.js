// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Serverseitige Sitzungsliste: Jedes Anmelde-Token (JWT) trägt eine Kennung `jti`; gültig ist es nur, solange die
// Kennung hier eingetragen ist. Abmelden, Passwortwechsel, Rollen-/Bereichsänderung und Löschen eines Kontos tragen die Sitzungen aus —
// ein kopiertes Token ist danach wertlos. Die Liste liegt in `sessions.json` im Datenverzeichnis (übersteht Neustarts); abgelaufene
// Einträge werden beim Laden und regelmäßig entfernt. Tokens ohne Kennung (vor diesem Stand ausgestellt) sind ungültig.
//
// Regel: pro Konto nur EINE gleichzeitige Sitzung — eine neue Anmeldung beendet die bisherige. Wer zwei Sitzungen gleichzeitig braucht
// (z. B. zwei Geräte oder Personen), legt ein getrenntes Konto an. Ausnahme-Schalter SESSION_SINGLE=false nur für Demo-Hosting und
// Tests; in der Testsuite (NODE_ENV=test) gilt ohne ausdrückliches SESSION_SINGLE=true die Mehrfach-Sitzung, weil die Tests ihre
// Konten wiederverwenden.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data')
const FILE = path.join(DATA_DIR, 'sessions.json')
const MAX_PER_USER = 50   // Obergrenze je Konto (älteste Sitzungen fallen heraus), begrenzt Wachstum durch wiederholte Anmeldungen

let sessions = Object.create(null)   // jti → { u: Benutzername, exp: Ablauf (Sekunden seit 1970) }
let dirty = false
let timer = null

const nowSec = () => Math.floor(Date.now() / 1000)

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    const now = nowSec()
    for (const [jti, s] of Object.entries(raw || {})) {
      if (s && typeof s.u === 'string' && Number.isFinite(s.exp) && s.exp > now) sessions[jti] = { u: s.u, exp: s.exp }
    }
  } catch { /* keine Datei oder unlesbar → leere Liste (alle müssen sich neu anmelden) */ }
}

function flush() {
  timer = null
  if (!dirty) return
  dirty = false
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = FILE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(sessions), { mode: 0o600 })
    fs.renameSync(tmp, FILE)
  } catch (e) { console.error('[sessions] Sitzungsliste konnte nicht gespeichert werden:', e.message) }
}

function touch() {
  dirty = true
  if (!timer) { timer = setTimeout(flush, 300); if (timer.unref) timer.unref() }
}

function prune() {
  const now = nowSec()
  let n = 0
  for (const [jti, s] of Object.entries(sessions)) if (s.exp <= now) { delete sessions[jti]; n++ }
  if (n) touch()
}

function newId() { return crypto.randomBytes(18).toString('base64url') }

function singleSession() {
  const v = process.env.SESSION_SINGLE
  if (v === 'true') return true
  if (v === 'false') return false
  if (process.env.DEMO_HOSTING === 'true') return false   // öffentliche Demo: Konten werden gemeinsam benutzt
  return process.env.NODE_ENV !== 'test'
}

// Trägt eine neue Sitzung ein und gibt ihre Kennung zurück.
function create(username, exp) {
  prune()
  if (singleSession()) revokeUser(username)
  const mine = Object.entries(sessions).filter(([, s]) => s.u === username).sort((a, b) => a[1].exp - b[1].exp)
  while (mine.length >= MAX_PER_USER) delete sessions[mine.shift()[0]]
  const jti = newId()
  sessions[jti] = { u: String(username), exp }
  touch()
  return jti
}

function isActive(jti, username) {
  if (typeof jti !== 'string') return false
  const s = sessions[jti]
  return !!s && s.u === username && s.exp > nowSec()
}

function revoke(jti) {
  if (typeof jti === 'string' && sessions[jti]) { delete sessions[jti]; touch() }
}

// Beendet alle Sitzungen eines Kontos (optional außer einer, z. B. der aktuellen beim Passwortwechsel).
function revokeUser(username, exceptJti) {
  let n = 0
  for (const [jti, s] of Object.entries(sessions)) if (s.u === username && jti !== exceptJti) { delete sessions[jti]; n++ }
  if (n) touch()
  return n
}

function reload() { sessions = Object.create(null); load() }
function flushNow() { if (timer) clearTimeout(timer); flush() }

load()
const sweep = setInterval(prune, 15 * 60 * 1000)
if (sweep.unref) sweep.unref()
process.on('exit', flushNow)

module.exports = { singleSession, create, isActive, revoke, revokeUser, reload, flushNow }
