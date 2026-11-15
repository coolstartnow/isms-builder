// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'

const { getDb } = require('../knexDatabase')

const VALID_CATEGORIES = ['systemhandbuch', 'rollen', 'policy-prozesse', 'soa-audit', 'admin-intern']

const ROLE_RANK = { reader: 1, revision: 1, editor: 2, dept_head: 2, qmb: 2, contentowner: 3, auditor: 3, admin: 4 }

function nowISO() { return new Date().toISOString() }

function makeId() {
  return 'guid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

function _roleRank(role) { return ROLE_RANK[(role || '').toLowerCase()] || 1 }

function _parse(val, fallback) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToDoc(row) {
  if (!row) return null
  return {
    id:               row.id,
    category:         row.category,
    title:            row.title,
    type:             row.type || 'markdown',
    content:          row.content || '',
    filename:         row.file_name || null,
    filePath:         null,
    version:          row.version || 1,
    minRole:          row.min_role || null,
    linkedControls:   _parse(row.linked_controls, []),
    linkedPolicies:   _parse(row.linked_policies, []),
    pinOrder:         row.pin_order || null,
    seedId:           row.seed_id || null,
    createdBy:        row.created_by || 'system',
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
    deletedAt:        row.deleted_at || null,
    deletedBy:        row.deleted_by || null,
  }
}

function publicDoc(doc) {
  if (!doc) return null
  const { filePath, ...rest } = doc
  return rest
}

function _visibleFor(doc, userRank) {
  if (!doc.minRole) return true
  return userRank >= (_roleRank(doc.minRole))
}

async function init() { await getDb() }

async function getAll(userRank) {
  const rank = userRank != null ? userRank : 1
  const db = getDb()
  const rows = await db('guidance').whereNull('deleted_at')
  return rows.map(rowToDoc).filter(d => _visibleFor(d, rank)).map(publicDoc)
}

async function search(query, userRank) {
  if (!query || !query.trim()) return []
  const rank = userRank != null ? userRank : 1
  const db = getDb()
  const q = query.trim().toLowerCase()
  const rows = await db('guidance').whereNull('deleted_at')
  return rows
    .map(rowToDoc)
    .filter(d => _visibleFor(d, rank))
    .filter(d => {
      if (d.title && d.title.toLowerCase().includes(q)) return true
      if (d.content && d.content.toLowerCase().includes(q)) return true
      return false
    })
    .map(d => {
      const pub = publicDoc(d)
      if (d.content && d.content.toLowerCase().includes(q)) {
        const idx = d.content.toLowerCase().indexOf(q)
        const start = Math.max(0, idx - 60)
        const end = Math.min(d.content.length, idx + q.length + 60)
        pub.excerpt = (start > 0 ? '…' : '') + d.content.slice(start, end).replace(/\n/g, ' ') + (end < d.content.length ? '…' : '')
      }
      return pub
    })
}

async function getByCategory(cat, userRank) {
  const rank = userRank != null ? userRank : 1
  const db = getDb()
  const rows = await db('guidance').where('category', cat).whereNull('deleted_at')
  return rows
    .map(rowToDoc)
    .filter(d => _visibleFor(d, rank))
    .sort((a, b) => {
      const ap = a.pinOrder != null ? a.pinOrder : Infinity
      const bp = b.pinOrder != null ? b.pinOrder : Infinity
      if (ap !== bp) return ap - bp
      return new Date(a.createdAt) - new Date(b.createdAt)
    })
    .map(publicDoc)
}

async function getById(id) {
  const db = getDb()
  const row = await db('guidance').where('id', id).whereNull('deleted_at').first()
  return row ? rowToDoc(row) : null
}

async function create({ category, title, type, content, filename, filePath, createdBy, minRole, linkedControls, seedId, linkedPolicies }) {
  if (!VALID_CATEGORIES.includes(category)) throw new Error('Invalid category')
  const id = makeId()
  const now = nowISO()
  const db = getDb()
  const insertData = {
    id,
    category,
    title: title || 'Ohne Titel',
    type: type || 'markdown',
    content: content || '',
    file_name: filename || null,
    version: 1,
    min_role: minRole || null,
    linked_controls: JSON.stringify(Array.isArray(linkedControls) ? linkedControls : []),
    linked_policies: JSON.stringify(Array.isArray(linkedPolicies) ? linkedPolicies : []),
    seed_id: seedId || null,
    created_by: createdBy || 'system',
    created_at: now,
    updated_at: now,
  }
  await db('guidance').insert(insertData)
  const doc = await getById(id)
  return publicDoc(doc)
}

async function update(id, fields) {
  const db = getDb()
  const existing = await db('guidance').where('id', id).first()
  if (!existing) return null
  const patch = { updated_at: nowISO() }
  if (fields.title !== undefined)             patch.title = fields.title
  if (fields.category !== undefined && VALID_CATEGORIES.includes(fields.category)) patch.category = fields.category
  if (fields.content !== undefined)           patch.content = fields.content
  if (fields.filename !== undefined)          patch.file_name = fields.filename
  if (fields.linkedControls !== undefined)    patch.linked_controls = JSON.stringify(Array.isArray(fields.linkedControls) ? fields.linkedControls : [])
  if (fields.linkedPolicies !== undefined)    patch.linked_policies = JSON.stringify(Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [])
  if (fields.pinOrder !== undefined)          patch.pin_order = fields.pinOrder
  if (fields.minRole !== undefined)           patch.min_role = fields.minRole
  const currentVersion = existing.version || 1
  patch.version = currentVersion + 1
  await db('guidance').where('id', id).update(patch)
  const doc = await getById(id)
  return publicDoc(doc)
}

async function del(id, deletedBy) {
  const db = getDb()
  const existing = await db('guidance').where('id', id).first()
  if (!existing) return false
  await db('guidance').where('id', id).update({
    deleted_at: nowISO(),
    deleted_by: deletedBy || null,
  })
  return true
}

async function permanentDelete(id) {
  const db = getDb()
  const existing = await db('guidance').where('id', id).first()
  if (!existing) return false
  await db('guidance').where('id', id).del()
  return true
}

async function restore(id) {
  const db = getDb()
  const existing = await db('guidance').where('id', id).first()
  if (!existing) return null
  await db('guidance').where('id', id).update({
    deleted_at: null,
    deleted_by: null,
  })
  const doc = await getById(id)
  return publicDoc(doc)
}

async function getDeleted() {
  const db = getDb()
  const rows = await db('guidance').whereNotNull('deleted_at')
  return rows.map(rowToDoc).map(publicDoc)
}

async function getFilePath(id) {
  return null
}

// Inhalt eines angelegten Seed-Artikels mit fn(content) → neuer Inhalt | null ändern (null = nichts tun); → true, wenn geändert
async function patchSeedContent(seedId, fn) {
  const db = getDb()
  const row = await db('guidance').where('seed_id', seedId).whereNull('deleted_at').first()
  if (!row) return false
  const next = fn(row.content)
  if (!next || next === row.content) return false
  await db('guidance').where('id', row.id).update({ content: next, updated_at: nowISO() })
  return true
}

async function upsertSeed(seedId, docData) {
  const db = getDb()
  const lang = docData.seedLang || 'en'
  const existing = await db('guidance').where('seed_id', seedId).whereNull('deleted_at').first()
  if (!existing) {
    const id = makeId()
    const now = nowISO()
    await db('guidance').insert({
      id,
      title: docData.title || '',
      category: docData.category || 'systemhandbuch',
      type: docData.type || 'markdown',
      content: docData.content || '',
      version: 1,
      min_role: docData.minRole || null,
      linked_controls: JSON.stringify(docData.linkedControls || []),
      linked_policies: JSON.stringify(docData.linkedPolicies || []),
      pin_order: docData.pinOrder || null,
      seed_id: seedId,
      created_by: 'system',
      created_at: now,
      updated_at: now,
    })
    return true
  }
  if (existing.seed_id) {
    const existingDoc = rowToDoc(existing)
    if (existingDoc.seedLang !== lang) {
      await db('guidance').where('id', existing.id).update({
        title: docData.title || existing.title,
        content: docData.content || existing.content,
        updated_at: nowISO(),
      })
      return true
    }
  }
  let changed = false
  if ((existing.pin_order == null) && docData.pinOrder != null) {
    await db('guidance').where('id', existing.id).update({ pin_order: docData.pinOrder })
    changed = true
  }
  if (existing.category && docData.category && existing.category !== docData.category) {
    await db('guidance').where('id', existing.id).update({ category: docData.category })
    changed = true
  }
  return changed
}

module.exports = {
  init,
  getAll,
  getByCategory,
  search,
  getById,
  create,
  update,
  delete: del,
  permanentDelete,
  restore,
  getDeleted,
  getFilePath,
  VALID_CATEGORIES,
  upsertSeed,
  patchSeedContent,
}
