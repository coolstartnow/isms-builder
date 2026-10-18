// © 2026 Claude Hecker — ISMS Builder V 1.75 — AGPL-3.0
'use strict'
/**
 * Mobile-Sync (Android-App): Delta-Abgleich der Kernmodule.
 *
 *   GET  /sync/pull?since=<ISO>&modules=a,b   Änderungen seit `since` (inkl. Soft-Deletes)
 *   POST /sync/push                           Änderungen vom Gerät einspielen
 *
 * Konfliktregel: Der Client schickt pro Datensatz `baseUpdatedAt` (Stand, auf dem er
 * seine Änderung aufgebaut hat). Wurde der Datensatz serverseitig danach geändert,
 * wird er NICHT überschrieben, sondern als Konflikt samt Serverstand zurückgemeldet.
 * Angenommene Datensätze erhalten `updatedAt` = Serverzeit (Uhrzeit-Drift des Handys
 * spielt keine Rolle, und andere Geräte bekommen die Änderung beim nächsten Pull).
 *
 * Unterstützt wird das JSON-Backend (STORAGE_BACKEND=json, Standard); bei
 * sqlite/mariadb/postgres antworten beide Endpunkte mit 501.
 * Anhänge (template-files) werden nicht synchronisiert; `attachments` bleibt serverseitig.
 */
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const { requireAuth, authorize, ROLE_RANK } = require('../auth')

const SYNC_PROTOCOL = 1
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const MAX_BODY = '20mb'
const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype'])

// kind: 'array' = [{id,…}], 'map' = { "<id>": {id,…} }; push: Mindest-Rollenrang (null = nur Pull)
const MODULES = {
  templates: { file: 'templates.json', kind: 'array', push: 2 },
  soa:       { file: 'soa.json',       kind: 'map',   push: 2 },
  risks:     { file: 'risks.json',     kind: 'array', push: 3 },
  assets:    { file: 'assets.json',    kind: 'array', push: 2 },
  findings:  { file: 'findings.json',  kind: 'array', push: 3 },
  guidance:  { file: 'guidance.json',  kind: 'array', push: null },
}
const PRESERVE_ON_UPDATE = { templates: ['attachments'] }

function jsonBackendOnly(req, res, next) {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  if (backend !== 'json') {
    return res.status(501).json({ error: `Sync supports only STORAGE_BACKEND=json (current: ${backend})`, protocolVersion: SYNC_PROTOCOL })
  }
  next()
}

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

router.get('/sync/pull', requireAuth, authorize('reader'), jsonBackendOnly, (req, res) => {
  const { wanted, unknown } = parseModules(req.query.modules)
  if (unknown.length) return res.status(400).json({ error: `Unknown modules: ${unknown.join(', ')}` })
  const since = typeof req.query.since === 'string' ? req.query.since : ''
  if (since && Number.isNaN(Date.parse(since))) return res.status(400).json({ error: 'since is not a valid ISO timestamp' })

  const serverTime = nowISO() // vor dem Lesen erfasst: nichts geht zwischen zwei Pulls verloren
  const out = {}
  for (const mod of wanted) {
    let list = asList(mod, loadRecords(mod)).filter(r => r && validId(r.id))
    if (mod === 'guidance') {
      list = list.filter(d => (ROLE_RANK[(d.minRole || 'reader').toLowerCase()] || 1) <= req.roleRank)
    }
    if (since) list = list.filter(r => changeTime(r) > since)
    out[mod] = list
  }
  res.json({ protocolVersion: SYNC_PROTOCOL, serverTime, modules: out })
})

router.post('/sync/push', requireAuth, authorize('editor'), jsonBackendOnly, express.json({ limit: MAX_BODY }), async (req, res) => {
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
    if (def.push === null || req.roleRank < def.push) {
      result.rejected.push({ module: mod, reason: def.push === null ? 'Modul ist nur lesbar' : 'Rolle reicht nicht aus' })
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
      detail: `Push: ${total} Datensätze angenommen, ${Object.values(result.conflicts).reduce((n, c) => n + c.length, 0)} Konflikte`,
    })
  } catch { /* Audit-Fehler darf den bereits geschriebenen Sync nicht verwerfen */ }

  res.json(result)
})

module.exports = router
