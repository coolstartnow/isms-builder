// © 2026 Claude Hecker — ISMS Builder V 1.76 — AGPL-3.0
'use strict'
/**
 * Sync-Konten für die mobile App: eigenständig, ohne Bezug zu den Benutzern (RBAC).
 *
 * Ein Konto steht für eine Rolle/Person (z. B. „CISO“, „DSB“) und hat Name, Rechte je Modul (none/read/write)
 * und optional ein Ablaufdatum. Jedes eingerichtete Gerät des Kontos hat einen eigenen Zugangsschlüssel und lässt sich
 * einzeln sperren.
 *
 * Geräte werden per Einrichtungscode eingerichtet: Der Administrator erzeugt einen einmaligen, kurz gültigen Code
 * (als QR-Code gezeigt); die App löst ihn ein und bekommt dabei ihren Schlüssel. Der Administrator sieht diesen
 * Schlüssel nie. Für Skripte lässt sich zusätzlich ein Geräteschlüssel direkt erzeugen und einmalig anzeigen.
 *
 * Schlüssel und Codes werden nur als SHA-256-Hash gespeichert (bei 160/60 Bit Zufall ist ein schneller Hash
 * ausreichend; bcrypt wäre hier ohne Gewinn); Vergleiche laufen zeitkonstant.
 *   Schlüssel: ISMS-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX  (32 Zeichen aus 31, ohne 0/O/1/I/L)
 *   Code:      XXXX-XXXX-XXXX                                (12 Zeichen, 15 Minuten, einmalig)
 * Die erste Gruppe eines Schlüssels dient als Kennung (keyId) zum Auffinden, verifiziert wird der ganze Schlüssel.
 *
 * Persistenz: data/sync-accounts.json (nur JSON-Backend, wie der Sync selbst).
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MODULES = ['templates', 'soa', 'risks', 'assets', 'findings', 'guidance']
const MAX_LEVEL = { guidance: 'read' }          // Guidance ist nur lesbar
const LEVELS = ['none', 'read', 'write']
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   // 31 Zeichen
const ENROLL_TTL_MS = 15 * 60 * 1000
const TOUCH_INTERVAL_MS = 60 * 1000

function file() { return path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'sync-accounts.json') }
function nowISO() { return new Date().toISOString() }
const err = (message, code) => Object.assign(new Error(message), { code })

function load() {
  try { const d = JSON.parse(fs.readFileSync(file(), 'utf8')); return Array.isArray(d) ? d : [] } catch { return [] }
}
function save(list) {
  const fp = file(), tmp = `${fp}.tmp`
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, fp)
}

function randomChars(n) {
  let out = ''
  for (let i = 0; i < n; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return out
}
const groups = raw => raw.match(/.{4}/g).join('-')
const hash = raw => crypto.createHash('sha256').update(raw).digest('hex')
const sameHash = (a, b) => { const x = Buffer.from(a || '', 'hex'), y = Buffer.from(b || '', 'hex'); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y) }

// Eingaben tolerant lesen: Groß-/Kleinschreibung, Bindestriche, Leerzeichen; beim Schlüssel auch das Präfix ISMS
function normalizeKey(token) {
  const s = String(token || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const raw = s.startsWith('ISMS') ? s.slice(4) : s
  return raw.length === 32 && [...raw].every(c => ALPHABET.includes(c)) ? raw : null
}
function normalizeCode(code) {
  const raw = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.length === 12 && [...raw].every(c => ALPHABET.includes(c)) ? raw : null
}

// Rechte prüfen und vereinheitlichen; wirft bei ungültigen Eingaben
function cleanPermissions(input) {
  const out = {}
  const src = input && typeof input === 'object' ? input : {}
  for (const k of Object.keys(src)) if (!MODULES.includes(k)) throw err('Invalid permissions', 'BAD_PERMISSIONS')
  for (const m of MODULES) {
    const lvl = src[m] === undefined ? 'none' : src[m]
    if (!LEVELS.includes(lvl)) throw err('Invalid permissions', 'BAD_PERMISSIONS')
    out[m] = MAX_LEVEL[m] === 'read' && lvl === 'write' ? 'read' : lvl
  }
  if (!MODULES.some(m => out[m] !== 'none')) throw err('Grant access to at least one module', 'NO_PERMISSION')
  return out
}
function cleanName(name, list, exceptId) {
  const n = String(name == null ? '' : name).trim()
  if (!n || n.length > 80) throw err('Name is required', 'BAD_NAME')
  if (list.some(a => a.id !== exceptId && a.name.toLowerCase() === n.toLowerCase())) throw err('A sync account with this name already exists', 'NAME_TAKEN')
  return n
}
function cleanExpiry(v) {
  if (v === undefined || v === null || v === '') return null
  const t = Date.parse(v)
  if (Number.isNaN(t)) throw err('Invalid expiry date', 'BAD_EXPIRY')
  return new Date(t).toISOString()
}
function cleanDeviceName(n) {
  const s = String(n == null ? '' : n).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60)
  return s || 'Gerät'
}

// Nach außen: ohne Hashes; Geräte ohne Schlüsselmaterial; „zuletzt benutzt“ = jüngste Nutzung eines Geräts
function publicView(a) {
  const devices = (a.devices || []).map(d => ({ id: d.id, name: d.name, createdAt: d.createdAt, lastUsedAt: d.lastUsedAt || null }))
  const lastUsedAt = devices.map(d => d.lastUsedAt).filter(Boolean).sort().pop() || null
  const enrollment = a.enrollment && Date.parse(a.enrollment.expiresAt) > Date.now() ? { expiresAt: a.enrollment.expiresAt } : null
  return { id: a.id, name: a.name, permissions: a.permissions, expiresAt: a.expiresAt, active: a.active, createdAt: a.createdAt, createdBy: a.createdBy, devices, lastUsedAt, enrollment }
}

function allKeyIds(list) { return new Set(list.flatMap(a => (a.devices || []).map(d => d.keyId))) }
function newDeviceKey(list) {
  const used = allKeyIds(list)
  for (let i = 0; i < 20; i++) {
    const raw = randomChars(32)
    if (!used.has(raw.slice(0, 4))) return raw
  }
  throw new Error('Could not generate a unique key')
}
function pushDevice(list, acc, name) {
  const raw = newDeviceKey(list)
  const device = { id: `dev_${Date.now().toString(36)}_${randomChars(4).toLowerCase()}`, name: cleanDeviceName(name), keyId: raw.slice(0, 4), tokenHash: hash(raw), createdAt: nowISO(), lastUsedAt: null }
  acc.devices = [...(acc.devices || []), device]
  return { device, token: 'ISMS-' + groups(raw) }
}

module.exports = {
  MODULES, LEVELS, ENROLL_TTL_MS,

  list() { return load().map(publicView) },

  create({ name, permissions, expiresAt }, createdBy) {
    const list = load()
    const acc = { id: `sync_${Date.now().toString(36)}_${randomChars(4).toLowerCase()}`, name: cleanName(name, list), permissions: cleanPermissions(permissions),
      expiresAt: cleanExpiry(expiresAt), active: true, createdAt: nowISO(), createdBy: createdBy || null, devices: [], enrollment: null }
    if (acc.expiresAt && Date.parse(acc.expiresAt) <= Date.now()) throw err('Invalid expiry date', 'BAD_EXPIRY')
    list.push(acc); save(list)
    return publicView(acc)
  },

  update(id, patch) {
    const list = load(), a = list.find(x => x.id === id)
    if (!a) return null
    if (patch.name !== undefined) a.name = cleanName(patch.name, list, id)
    if (patch.permissions !== undefined) a.permissions = cleanPermissions(patch.permissions)
    if (patch.expiresAt !== undefined) a.expiresAt = cleanExpiry(patch.expiresAt)
    if (patch.active !== undefined) a.active = patch.active === true
    save(list)
    return publicView(a)
  },

  remove(id) {
    const list = load(), i = list.findIndex(a => a.id === id)
    if (i === -1) return false
    list.splice(i, 1); save(list)
    return true
  },

  // ── Geräte ──────────────────────────────────────────────────────────

  /** Einrichtungscode für ein neues Gerät. Ein neuer Code macht den vorherigen ungültig. */
  startEnrollment(id) {
    const list = load(), a = list.find(x => x.id === id)
    if (!a) return null
    const raw = randomChars(12)
    a.enrollment = { codeHash: hash(raw), expiresAt: new Date(Date.now() + ENROLL_TTL_MS).toISOString() }
    save(list)
    return { code: groups(raw), expiresAt: a.enrollment.expiresAt, account: publicView(a) }
  },

  /** Code einlösen (einmalig). Gibt { account, device, token } zurück, sonst { reason: 'invalid'|'inactive'|'expired' }. */
  redeem(code, deviceName) {
    const raw = normalizeCode(code)
    if (!raw) return { reason: 'invalid' }
    const list = load(), given = hash(raw)
    const a = list.find(x => x.enrollment && Date.parse(x.enrollment.expiresAt) > Date.now() && sameHash(x.enrollment.codeHash, given))
    if (!a) return { reason: 'invalid' }
    if (!a.active) return { reason: 'inactive' }
    if (a.expiresAt && Date.parse(a.expiresAt) <= Date.now()) return { reason: 'expired' }
    a.enrollment = null                                  // einmalig
    const { device, token } = pushDevice(list, a, deviceName)
    save(list)
    return { account: publicView(a), device: { id: device.id, name: device.name }, token }
  },

  /** Geräteschlüssel direkt erzeugen (für Skripte); wird einmalig ausgegeben. */
  addDevice(id, name) {
    const list = load(), a = list.find(x => x.id === id)
    if (!a) return null
    const { device, token } = pushDevice(list, a, name || 'Skript')
    save(list)
    return { account: publicView(a), device: { id: device.id, name: device.name }, token }
  },

  removeDevice(id, deviceId) {
    const list = load(), a = list.find(x => x.id === id)
    if (!a) return null
    const n = (a.devices || []).length
    a.devices = (a.devices || []).filter(d => d.id !== deviceId)
    if (a.devices.length === n) return null
    save(list)
    return publicView(a)
  },

  // ── Prüfung ─────────────────────────────────────────────────────────

  /**
   * Schlüssel prüfen. Gibt { account, device, keyId } zurück, oder { reason: 'invalid'|'inactive'|'expired', keyId }.
   * keyId (nur wenn der Schlüssel formal gültig war) dient der Anmeldebremse.
   */
  verify(token) {
    const raw = normalizeKey(token)
    if (!raw) return { reason: 'invalid', keyId: null }
    const keyId = raw.slice(0, 4), given = hash(raw)
    for (const a of load()) {
      const d = (a.devices || []).find(x => x.keyId === keyId && sameHash(x.tokenHash, given))
      if (!d) continue
      if (!a.active) return { reason: 'inactive', keyId }
      if (a.expiresAt && Date.parse(a.expiresAt) <= Date.now()) return { reason: 'expired', keyId }
      return { account: publicView(a), device: { id: d.id, name: d.name }, keyId }
    }
    return { reason: 'invalid', keyId }
  },

  // „zuletzt benutzt“ nur gelegentlich schreiben (kein Schreibzugriff bei jedem Request)
  touch(id, deviceId) {
    const list = load(), a = list.find(x => x.id === id), d = a && (a.devices || []).find(x => x.id === deviceId)
    if (!d) return
    if (d.lastUsedAt && Date.now() - Date.parse(d.lastUsedAt) < TOUCH_INTERVAL_MS) return
    d.lastUsedAt = nowISO(); save(list)
  },

  _normalize: normalizeKey,
  _normalizeCode: normalizeCode,
}
