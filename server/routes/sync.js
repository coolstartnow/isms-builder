// © 2026 Claude Hecker — ISMS Builder V 1.76 — AGPL-3.0
'use strict'
/**
 * Mobile-Sync (Android-App): Delta-Abgleich der Kernmodule.
 *
 *   POST /sync/enroll                         Gerät einrichten (Einrichtungscode → Geräteschlüssel)
 *   GET  /sync/me                             Name, Rechte und Gültigkeit des Zugangs
 *   GET  /sync/pull?since=<ISO>&modules=a,b   Änderungen seit `since` (inkl. Soft-Deletes)
 *   POST /sync/push                           Änderungen vom Gerät einspielen
 *
 * Zugang: ausschließlich über ein Sync-Konto (Verwaltung → Benutzer → Sync-Konten), Header
 * `Authorization: Bearer <Geräteschlüssel>`; der Schlüssel entsteht bei der Einrichtung des Geräts. Es gibt keinen Zugriff mit Benutzerkonto/Sitzungs-Cookie.
 * Die Rechte (none/read/write) gelten je Modul; Guidance ist nur lesbar.
 *
 * Konfliktregel: Der Client schickt pro Datensatz `baseUpdatedAt` (Stand, auf dem er
 * seine Änderung aufgebaut hat). Wurde der Datensatz serverseitig danach geändert,
 * wird er NICHT überschrieben, sondern als Konflikt samt Serverstand zurückgemeldet.
 * Angenommene Datensätze erhalten `updatedAt` = Serverzeit (Uhrzeit-Drift des Handys
 * spielt keine Rolle, und andere Geräte bekommen die Änderung beim nächsten Pull).
 *
 * Unterstützt wird das JSON-Backend (STORAGE_BACKEND=json, Standard); bei
 * sqlite/mariadb/postgres antworten die Endpunkte mit 501.
 * Anhänge (template-files) werden nicht synchronisiert; `attachments` bleibt serverseitig.
 */
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const syncAccounts = require('../db/syncAccountStore')
const measureAccess = require('../db/measureAccess')
const measuresCommon = require('../db/measuresCommon')
const loginThrottle = require('../loginThrottle')

const SYNC_PROTOCOL = 2   // 2: Maßnahmen (abgeleitete Rechte), Antwort enthält visibleIds
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const MAX_BODY = '20mb'
const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype'])
const ROLE_RANK = { reader: 1, revision: 1, editor: 2, dept_head: 2, qmb: 2, contentowner: 3, auditor: 3, admin: 4 }
const GUIDANCE_RANK = 1   // ein Sync-Konto sieht Guidance wie ein Leser (minRole „reader“)

// kind: 'array' = [{id,…}], 'map' = { "<id>": {id,…} }
const MODULES = {
  templates: { file: 'templates.json', kind: 'array' },
  soa:       { file: 'soa.json',       kind: 'map' },
  risks:     { file: 'risks.json',     kind: 'array' },
  assets:    { file: 'assets.json',    kind: 'array' },
  findings:  { file: 'findings.json',  kind: 'array' },
  guidance:  { file: 'guidance.json',  kind: 'array' },
  // Maßnahmen: kein eigenes Recht im Sync-Konto, Zugriff je Datensatz aus den verknüpften Modulen (db/measureAccess.js)
  measures:  { file: 'measures.json',  kind: 'array', derived: true },
}
const PRESERVE_ON_UPDATE = { templates: ['attachments'] }
// Aus dem Maßnahmen-Register abgeleitete Listen: gehören nicht in Risiko-/Feststellungs-Datensätze und werden verworfen
const DROP_ON_PUSH = { risks: ['treatmentPlans'], findings: ['actions'] }

function jsonBackendOnly(req, res, next) {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  if (backend !== 'json') {
    return res.status(501).json({ error: `Sync supports only STORAGE_BACKEND=json (current: ${backend})`, protocolVersion: SYNC_PROTOCOL })
  }
  next()
}

// Zugangsschlüssel prüfen. Falsche Schlüssel werden wie falsche Passwörter ausgebremst (Kennung + IP).
function requireSyncAccount(req, res, next) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')
  if (!m) return res.status(401).json({ error: 'Not authenticated' })
  const ident = 'sync:' + (syncAccounts._normalize(m[1]) || '').slice(0, 4)
  const delay = loginThrottle.getRequiredDelayMs(ident, req.ip)
  if (delay > 0) {
    res.set('Retry-After', String(Math.ceil(delay / 1000)))
    return res.status(429).json({ error: 'Too many failed attempts. Please wait a moment and try again.', retryAfterMs: delay })
  }
  const r = syncAccounts.verify(m[1])
  if (!r.account) {
    loginThrottle.recordFailure(ident, req.ip)
    return res.status(401).json({ error: r.reason === 'invalid' ? 'Invalid sync key' : 'Sync key is disabled or expired', reason: r.reason })
  }
  loginThrottle.recordSuccess(ident, req.ip)
  syncAccounts.touch(r.account.id, r.device.id)
  req.syncAccount = r.account
  req.syncDevice = r.device
  req.user = `sync:${r.account.name}`
  next()
}

const canRead  = (acc, mod) => acc.permissions[mod] === 'read' || acc.permissions[mod] === 'write'
const canWrite = (acc, mod) => acc.permissions[mod] === 'write'

function nowISO() { return new Date().toISOString() }

function filePath(mod) { return path.join(DATA_DIR, MODULES[mod].file) }

function loadRecords(mod) {
  const def = MODULES[mod]
  let data
  try { data = JSON.parse(fs.readFileSync(filePath(mod), 'utf8')) } catch { data = def.kind === 'array' ? [] : {} }
  if (def.kind === 'array') return Array.isArray(data) ? data : []
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

// Atomar schreiben: erst Temp-Datei, dann rename (kein halb geschriebener Stand bei Abbruch)
function saveRecords(mod, data) {
  const fp = filePath(mod)
  const tmp = `${fp}.sync-tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, fp)
}

function asList(mod, data) {
  return MODULES[mod].kind === 'array' ? data : Object.values(data)
}

// Zeitpunkt der letzten Änderung. Soft-Delete setzt nur deletedAt, daher Maximum.
function changeTime(r) {
  return [r.updatedAt, r.deletedAt, r.createdAt].filter(x => typeof x === 'string').sort().pop() || ''
}

function validId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 200 && !FORBIDDEN_IDS.has(id)
}

function parseModules(raw) {
  const wanted = raw ? String(raw).split(',').map(s => s.trim()).filter(Boolean) : Object.keys(MODULES)
  const unknown = wanted.filter(m => !Object.prototype.hasOwnProperty.call(MODULES, m))
  return { wanted, unknown }
}

// Maßnahmen einspielen: Rechte je Datensatz aus den verknüpften Modulen, geschützte Felder bleiben unverändert.
function pushMeasures(incoming, acc, req, result) {
  const mod = 'measures'
  const data = loadRecords(mod)
  const index = new Map(data.map((r, i) => [r && r.id, i]))
  const accepted = [], conflicts = []
  const reject = (rec, code, reason) => result.rejected.push({ module: mod, id: rec && rec.id, code, reason })
  let dirty = false

  for (const rec of incoming) {
    if (!rec || typeof rec !== 'object' || !validId(rec.id)) { reject(rec, 'invalid', 'ungültiger Datensatz/ID'); continue }
    const { baseUpdatedAt, ...fields } = rec
    // Geschützte bzw. abgeleitete Felder kommen nie aus der App
    delete fields.attachments
    const existing = index.has(rec.id) ? data[index.get(rec.id)] : undefined

    if (existing && !measureAccess.modulesOf(existing).length) { reject(rec, 'unlinked', 'Maßnahme ohne Verknüpfung wird nicht synchronisiert'); continue }
    const verdict = measureAccess.canWrite(existing || null, fields, acc.permissions)
    if (!verdict.ok) { reject(rec, verdict.code, verdict.reason); continue }
    if (existing && (typeof baseUpdatedAt !== 'string' || changeTime(existing) > baseUpdatedAt)) {
      conflicts.push({ id: rec.id, server: existing })
      continue
    }

    const stamp = nowISO()
    let merged
    if (existing) {
      merged = { ...measuresCommon.normalize(fields, existing), id: existing.id, ref: existing.ref, attachments: existing.attachments || [], tom: false, governance: false,
        createdAt: existing.createdAt, createdBy: existing.createdBy, updatedAt: stamp, updatedBy: req.user }
    } else {
      // Referenz: die der App behalten, wenn frei; sonst die nächste freie (Kollision mit einer Maßnahme am Server oder Hauptsystem)
      const taken = new Set(data.map(r => r && r.ref))
      const wantRef = typeof fields.ref === 'string' ? fields.ref.trim() : ''
      const ref = wantRef && !taken.has(wantRef) ? wantRef : measuresCommon.nextRef([...taken])
      merged = { ...measuresCommon.normalize(fields, { ...measuresCommon.blank(), id: rec.id, ref }), id: rec.id, ref, attachments: [], tom: false, governance: false,
        createdAt: stamp, createdBy: req.user, updatedAt: stamp, updatedBy: req.user }
    }
    if (rec.deletedAt) { merged.deletedAt = stamp; merged.deletedBy = req.user } else { merged.deletedAt = null; merged.deletedBy = null }

    if (existing) data[index.get(rec.id)] = merged
    else { index.set(rec.id, data.length); data.push(merged) }
    accepted.push(merged)
    dirty = true
  }

  if (dirty) saveRecords(mod, data)
  result.accepted[mod] = accepted
  result.conflicts[mod] = conflicts
}

router.get('/sync/me', requireSyncAccount, (req, res) => {
  const a = req.syncAccount
  res.json({ protocolVersion: SYNC_PROTOCOL, id: a.id, name: a.name, permissions: a.permissions, expiresAt: a.expiresAt, device: req.syncDevice.name })
})

// Gerät einrichten: Einrichtungscode (aus dem QR-Code) gegen einen Geräteschlüssel tauschen. Ohne Anmeldung, aber
// ausgebremst; der Code ist einmalig und nur kurz gültig.
router.post('/sync/enroll', jsonBackendOnly, async (req, res) => {
  const body = req.body || {}
  const ident = 'enroll'
  const delay = loginThrottle.getRequiredDelayMs(ident, req.ip)
  if (delay > 0) {
    res.set('Retry-After', String(Math.ceil(delay / 1000)))
    return res.status(429).json({ error: 'Too many failed attempts. Please wait a moment and try again.', retryAfterMs: delay })
  }
  const r = syncAccounts.redeem(body.code, body.deviceName)
  if (!r.account) {
    loginThrottle.recordFailure(ident, req.ip)
    return res.status(401).json({ error: 'Invalid or expired setup code', reason: r.reason })
  }
  loginThrottle.recordSuccess(ident, req.ip)
  try {
    await require('../db/auditStore').append({ user: `sync:${r.account.name}`, action: 'enroll', resource: 'mobile-sync', detail: `Gerät eingerichtet: ${r.device.name}` })
  } catch { /* Audit-Fehler darf die Einrichtung nicht verhindern */ }
  res.json({ protocolVersion: SYNC_PROTOCOL, key: r.token, device: r.device, account: { id: r.account.id, name: r.account.name, permissions: r.account.permissions, expiresAt: r.account.expiresAt } })
})

router.get('/sync/pull', requireSyncAccount, jsonBackendOnly, (req, res) => {
  const acc = req.syncAccount
  const explicit = !!req.query.modules
  const { wanted, unknown } = parseModules(req.query.modules)
  if (unknown.length) return res.status(400).json({ error: `Unknown modules: ${unknown.join(', ')}` })
  const since = typeof req.query.since === 'string' ? req.query.since : ''
  if (since && Number.isNaN(Date.parse(since))) return res.status(400).json({ error: 'since is not a valid ISO timestamp' })

  const serverTime = nowISO() // vor dem Lesen erfasst: nichts geht zwischen zwei Pulls verloren
  const out = {}, denied = []
  let visibleIds
  for (const mod of wanted) {
    if (MODULES[mod].derived) {
      // Maßnahmen: pro Datensatz nach den verknüpften Modulen filtern; visibleIds = alles, was das Konto sehen darf
      const readableList = asList(mod, loadRecords(mod)).filter(r => r && validId(r.id) && measureAccess.canRead(r, acc.permissions))
      visibleIds = readableList.map(r => r.id)
      out[mod] = since ? readableList.filter(r => changeTime(r) > since) : readableList
      continue
    }
    if (!canRead(acc, mod)) { if (explicit) denied.push(mod); continue }
    let list = asList(mod, loadRecords(mod)).filter(r => r && validId(r.id))
    if (mod === 'guidance') {
      list = list.filter(d => (ROLE_RANK[(d.minRole || 'reader').toLowerCase()] || 1) <= GUIDANCE_RANK)
    }
    if (since) list = list.filter(r => changeTime(r) > since)
    out[mod] = list
  }
  const body = { protocolVersion: SYNC_PROTOCOL, serverTime, modules: out, denied }
  if (visibleIds) body.visibleIds = { measures: visibleIds }
  res.json(body)
})

router.post('/sync/push', requireSyncAccount, jsonBackendOnly, express.json({ limit: MAX_BODY }), async (req, res) => {
  const acc = req.syncAccount
  const body = req.body
  if (!body || typeof body !== 'object' || typeof body.changes !== 'object' || body.changes === null) {
    return res.status(400).json({ error: 'Invalid body: changes object expected' })
  }
  if (body.protocolVersion !== SYNC_PROTOCOL) {
    return res.status(409).json({ error: `Sync protocol ${body.protocolVersion} not supported (server: ${SYNC_PROTOCOL})`, protocolVersion: SYNC_PROTOCOL })
  }
  const { wanted, unknown } = parseModules(Object.keys(body.changes).join(','))
  if (unknown.length) return res.status(400).json({ error: `Unknown modules: ${unknown.join(', ')}` })

  const result = { protocolVersion: SYNC_PROTOCOL, serverTime: nowISO(), accepted: {}, conflicts: {}, rejected: [] }
  let total = 0

  for (const mod of wanted) {
    const def = MODULES[mod]
    const incoming = body.changes[mod]
    if (!Array.isArray(incoming)) { result.rejected.push({ module: mod, reason: 'changes muss ein Array sein' }); continue }
    if (def.derived) { pushMeasures(incoming, acc, req, result); total += (result.accepted[mod] || []).length; continue }
    if (mod === 'guidance' || !canWrite(acc, mod)) {
      result.rejected.push({ module: mod, reason: mod === 'guidance' ? 'Modul ist nur lesbar' : 'Keine Schreibrechte für dieses Modul' })
      continue
    }

    const data = loadRecords(mod)
    const accepted = []
    const conflicts = []
    const index = new Map(def.kind === 'array' ? data.map((r, i) => [r && r.id, i]) : [])
    let dirty = false

    for (const rec of incoming) {
      if (!rec || typeof rec !== 'object' || !validId(rec.id)) {
        result.rejected.push({ module: mod, id: rec && rec.id, reason: 'ungültiger Datensatz/ID' })
        continue
      }
      const { baseUpdatedAt, ...fields } = rec
      for (const k of DROP_ON_PUSH[mod] || []) delete fields[k]
      const existing = def.kind === 'array'
        ? (index.has(rec.id) ? data[index.get(rec.id)] : undefined)
        : (Object.prototype.hasOwnProperty.call(data, rec.id) ? data[rec.id] : undefined)

      if (existing && (typeof baseUpdatedAt !== 'string' || changeTime(existing) > baseUpdatedAt)) {
        conflicts.push({ id: rec.id, server: existing })
        continue
      }

      const stamp = nowISO()
      const merged = { ...fields, id: rec.id, updatedAt: stamp }
      if (existing) {
        merged.createdAt = existing.createdAt || merged.createdAt
        for (const k of PRESERVE_ON_UPDATE[mod] || []) {
          if (existing[k] !== undefined) merged[k] = existing[k]
        }
      } else {
        merged.createdAt = merged.createdAt || stamp
        merged.createdBy = merged.createdBy || req.user
        for (const k of PRESERVE_ON_UPDATE[mod] || []) merged[k] = []
      }
      if (merged.deletedAt) { merged.deletedAt = stamp; merged.deletedBy = merged.deletedBy || req.user }

      if (def.kind === 'array') {
        if (existing) data[index.get(rec.id)] = merged
        else { index.set(rec.id, data.length); data.push(merged) }
      } else {
        data[rec.id] = merged
      }
      accepted.push(merged)
      dirty = true
    }

    if (dirty) saveRecords(mod, data)
    result.accepted[mod] = accepted
    result.conflicts[mod] = conflicts
    total += accepted.length
  }

  try {
    await require('../db/auditStore').append({
      user: req.user, action: 'sync', resource: 'mobile-sync',
      detail: `Push: ${total} Datensätze angenommen, ${Object.values(result.conflicts).reduce((n, c) => n + c.length, 0)} Konflikte, ${result.rejected.length} abgelehnt`,
    })
  } catch { /* Audit-Fehler darf den bereits geschriebenen Sync nicht verwerfen */ }

  res.json(result)
})

module.exports = router
