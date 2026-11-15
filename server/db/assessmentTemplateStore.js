// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Vorlagen für Lieferanten-Fragebögen (welche Fragen, welche Pflicht). JSON-Datei wie assessmentStore.
'use strict'

const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')
const catalogs = require('./assessmentCatalogs')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'assessment-templates.json')

const nowISO = () => new Date().toISOString()
const makeId = () => `tpl_${crypto.randomBytes(4).toString('hex')}`

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [] } }
function save(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  const tmp = FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2))
  fs.renameSync(tmp, FILE)
}

// Eingebaute Vorlagen: unveränderlich, alle Fragen eines Katalogs
function builtins(lang) {
  return catalogs.CATALOG_IDS.map(id => ({
    id: 'builtin:' + id, builtin: true,
    name: catalogs.getCatalog(id, lang).title, description: '',
    ...catalogs.defaultSpec(id),
  }))
}

function getAll(lang) {
  return [...builtins(lang), ...load().filter(t => !t.deletedAt)]
}

function getById(id, lang) {
  if (typeof id === 'string' && id.startsWith('builtin:')) return builtins(lang).find(t => t.id === id) || null
  return load().find(t => t.id === id && !t.deletedAt) || null
}

function checkMeta(fields) {
  const name = typeof fields.name === 'string' ? fields.name.trim() : ''
  if (!name || name.length > 120) return { ok: false, error: 'name required (max 120)' }
  const description = typeof fields.description === 'string' ? fields.description.trim() : ''
  if (description.length > 500) return { ok: false, error: 'description too long (max 500)' }
  return { ok: true, name, description }
}

function create(fields, { createdBy } = {}) {
  const meta = checkMeta(fields); if (!meta.ok) return meta
  const spec = catalogs.validateSpec(fields); if (!spec.ok) return spec
  const list = load()
  if (list.some(t => !t.deletedAt && t.name.toLowerCase() === meta.name.toLowerCase())) return { ok: false, error: 'name already exists', status: 409 }
  const item = { id: makeId(), name: meta.name, description: meta.description, ...spec.value, createdAt: nowISO(), updatedAt: nowISO(), createdBy: createdBy || 'system', deletedAt: null }
  list.push(item); save(list)
  return { ok: true, value: item }
}

function update(id, fields, { updatedBy } = {}) {
  const list = load()
  const idx = list.findIndex(t => t.id === id && !t.deletedAt)
  if (idx < 0) return { ok: false, error: 'not found', status: 404 }
  const meta = checkMeta(fields); if (!meta.ok) return meta
  const spec = catalogs.validateSpec(fields); if (!spec.ok) return spec
  if (list.some((t, i) => i !== idx && !t.deletedAt && t.name.toLowerCase() === meta.name.toLowerCase())) return { ok: false, error: 'name already exists', status: 409 }
  list[idx] = { ...list[idx], name: meta.name, description: meta.description, ...spec.value, updatedAt: nowISO(), updatedBy: updatedBy || '' }
  save(list)
  return { ok: true, value: list[idx] }
}

function remove(id, { deletedBy } = {}) {
  const list = load()
  const idx = list.findIndex(t => t.id === id && !t.deletedAt)
  if (idx < 0) return false
  list[idx].deletedAt = nowISO(); if (deletedBy) list[idx].deletedBy = deletedBy
  save(list)
  return true
}

module.exports = { getAll, getById, create, update, remove, builtins }
