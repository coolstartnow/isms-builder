// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
/**
 * SQLite-backed template store.
 * Exposes the same interface as jsonStore.js so storage.js can swap it in.
 */

const { getDb } = require('./database')

const VALID_STATUSES = ['draft', 'review', 'approved', 'archived']
const TRANSITIONS = {
  draft:    [{ to: 'review',    minRole: 'editor' }],
  review:   [{ to: 'approved',  minRole: 'contentowner' },
             { to: 'draft',     minRole: 'editor' }],
  approved: [{ to: 'review',    minRole: 'contentowner' },
             { to: 'archived',  minRole: 'contentowner' }],
  archived: [{ to: 'draft',     minRole: 'admin' }]
}
const ROLE_RANK = { reader: 1, editor: 2, dept_head: 2, contentowner: 3, admin: 4 }

function nowISO() { return new Date().toISOString() }
// Eindeutig auch bei mehreren Anlagen in derselben Millisekunde (z. B. CSV-Import): sonst bekämen zwei Dokumente dieselbe Kennung
let _lastIdStamp = 0
function generateId(type) {
  let n = Date.now()
  if (n <= _lastIdStamp) n = _lastIdStamp + 1
  _lastIdStamp = n
  return `${type}_${n}`
}

// ── Row ↔ object conversion ─────────────────────────────────────────────────

function rowToTemplate(row) {
  if (!row) return null
  return {
    id:                 row.id,
    type:               row.type,
    language:           row.language,
    title:              row.title,
    content:            row.content,
    version:            row.version,
    status:             row.status,
    owner:              row.owner,
    nextReviewDate:     row.next_review_date || null,
    parentId:           row.parent_id || null,
    sortOrder:          row.sort_order || 0,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
    linkedControls:     JSON.parse(row.linked_controls     || '[]'),
    applicableEntities: JSON.parse(row.applicable_entities || '[]'),
    attachments:        JSON.parse(row.attachments         || '[]'),
    history:            JSON.parse(row.history             || '[]'),
    statusHistory:      JSON.parse(row.status_history      || '[]'),
  }
}

// ── Store methods ────────────────────────────────────────────────────────────

module.exports = {
  init: () => { getDb() }, // triggers schema creation

  getTemplates: ({ type, language, status } = {}) => {
    const db = getDb()
    let sql = 'SELECT * FROM templates WHERE 1=1'
    const params = []
    if (type)     { sql += ' AND type = ?';     params.push(type) }
    if (language) { sql += ' AND language = ?'; params.push(language) }
    if (status)   { sql += ' AND status = ?';   params.push(status) }
    return db.prepare(sql).all(...params).map(rowToTemplate)
  },

  getTemplate: (type, id) => {
    const row = getDb().prepare('SELECT * FROM templates WHERE type = ? AND id = ?').get(type, id)
    return rowToTemplate(row)
  },

  createTemplate: ({ type, language, title, content, owner, parentId }) => {
    const db  = getDb()
    const id  = generateId(type)
    const now = nowISO()
    const history      = [{ version: 1, content: content || '', updatedAt: now }]
    const statusHistory= [{ status: 'draft', changedBy: owner || 'system', changedAt: now }]
    db.prepare(`
      INSERT INTO templates
        (id, type, language, title, content, version, status, owner, next_review_date,
         parent_id, sort_order, created_at, updated_at,
         linked_controls, applicable_entities, attachments, history, status_history)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, type, language || 'de', title || '', content || '',
      1, 'draft', owner || null, null,
      parentId || null, 0, now, now,
      '[]', '[]', '[]',
      JSON.stringify(history),
      JSON.stringify(statusHistory)
    )
    return rowToTemplate(getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id))
  },

  updateTemplate: (type, id, { title, content, owner, applicableEntities, linkedControls, parentId, nextReviewDate }) => {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM templates WHERE type = ? AND id = ?').get(type, id)
    if (!row) return null
    const t = rowToTemplate(row)

    if (title     !== undefined) t.title     = title
    if (typeof content === 'string') t.content = content
    if (owner     !== undefined) t.owner     = owner
    if (Array.isArray(applicableEntities)) t.applicableEntities = applicableEntities
    if (Array.isArray(linkedControls))     t.linkedControls     = linkedControls
    if (parentId  !== undefined) t.parentId  = parentId || null
    if (nextReviewDate !== undefined) t.nextReviewDate = nextReviewDate || null

    t.version  += 1
    t.updatedAt = nowISO()
    t.history.push({ version: t.version, content: t.content, updatedAt: t.updatedAt })

    db.prepare(`
      UPDATE templates SET
        title=?, content=?, version=?, owner=?, next_review_date=?,
        parent_id=?, updated_at=?, linked_controls=?, applicable_entities=?,
        history=?, status_history=?
      WHERE type=? AND id=?
    `).run(
      t.title, t.content, t.version, t.owner, t.nextReviewDate,
      t.parentId, t.updatedAt,
      JSON.stringify(t.linkedControls),
      JSON.stringify(t.applicableEntities),
      JSON.stringify(t.history),
      JSON.stringify(t.statusHistory),
      type, id
    )
    return t
  },

  addLinkedControl: (templateType, templateId, controlId) => {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM templates WHERE type=? AND id=?').get(templateType, templateId)
    if (!row) return null
    const t = rowToTemplate(row)
    if (!t.linkedControls.includes(controlId)) {
      t.linkedControls.push(controlId)
      t.updatedAt = nowISO()
      db.prepare('UPDATE templates SET linked_controls=?, updated_at=? WHERE type=? AND id=?')
        .run(JSON.stringify(t.linkedControls), t.updatedAt, templateType, templateId)
    }
    return t
  },

  removeLinkedControl: (templateType, templateId, controlId) => {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM templates WHERE type=? AND id=?').get(templateType, templateId)
    if (!row) return null
    const t = rowToTemplate(row)
    t.linkedControls = t.linkedControls.filter(c => c !== controlId)
    t.updatedAt = nowISO()
    db.prepare('UPDATE templates SET linked_controls=?, updated_at=? WHERE type=? AND id=?')
      .run(JSON.stringify(t.linkedControls), t.updatedAt, templateType, templateId)
    return t
  },

  setStatus: (type, id, { status: newStatus, changedBy, role }) => {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM templates WHERE type=? AND id=?').get(type, id)
    if (!row) return { ok: false, error: 'Not found' }
    if (!VALID_STATUSES.includes(newStatus)) return { ok: false, error: 'Invalid status' }

    const t = rowToTemplate(row)
    const currentStatus = t.status || 'draft'
    if (currentStatus === newStatus) return { ok: false, error: 'Already in this status' }

    const allowed = (TRANSITIONS[currentStatus] || []).find(tr => tr.to === newStatus)
    if (!allowed) return { ok: false, error: `Transition ${currentStatus} → ${newStatus} not allowed` }

    const userRank = ROLE_RANK[role?.toLowerCase()] || 0
    const requiredRank = ROLE_RANK[allowed.minRole] || 0
    if (userRank < requiredRank) return { ok: false, error: `Role '${role}' insufficient. Requires '${allowed.minRole}'` }

    const now = nowISO()
    t.status = newStatus
    t.updatedAt = now
    if (!Array.isArray(t.statusHistory)) t.statusHistory = []
    t.statusHistory.push({ status: newStatus, changedBy: changedBy || 'unknown', changedAt: now })

    db.prepare('UPDATE templates SET status=?, updated_at=?, status_history=? WHERE type=? AND id=?')
      .run(newStatus, now, JSON.stringify(t.statusHistory), type, id)

    return { ok: true, template: t }
  },

  deleteTemplate: (type, id) => {
    const info = getDb().prepare('DELETE FROM templates WHERE type=? AND id=?').run(type, id)
    return info.changes > 0
  },

  getHistory: (type, id) => {
    const row = getDb().prepare('SELECT history FROM templates WHERE type=? AND id=?').get(type, id)
    return row ? JSON.parse(row.history || '[]') : null
  },

  getStatusHistory: (type, id) => {
    const row = getDb().prepare('SELECT status_history FROM templates WHERE type=? AND id=?').get(type, id)
    return row ? JSON.parse(row.status_history || '[]') : null
  },

  getTemplateTree: (type, language) => {
    let sql = 'SELECT * FROM templates WHERE 1=1'
    const params = []
    if (type)     { sql += ' AND type=?';     params.push(type) }
    if (language) { sql += ' AND language=?'; params.push(language) }
    const list = getDb().prepare(sql).all(...params).map(rowToTemplate)
    const byId = {}
    list.forEach(t => { byId[t.id] = { ...t, children: [] } })
    const roots = []
    list.forEach(t => {
      const pid = t.parentId || null
      if (pid && pid !== t.id && byId[pid]) byId[pid].children.push(byId[t.id])
      else roots.push(byId[t.id])
    })
    function sortLevel(nodes) {
      nodes.sort((a, b) => a.title.localeCompare(b.title, 'de'))
      nodes.forEach(n => sortLevel(n.children))
    }
    sortLevel(roots)
    return roots
  },

  getTemplateBreadcrumb: (type, id) => {
    const db = getDb()
    const crumbs = []
    let currentId = id
    const visited = new Set()
    while (currentId) {
      if (visited.has(currentId)) break
      visited.add(currentId)
      const row = db.prepare('SELECT id, title, type, parent_id FROM templates WHERE id=?').get(currentId)
      if (!row) break
      crumbs.unshift({ id: row.id, title: row.title, type: row.type })
      currentId = row.parent_id || null
    }
    return crumbs
  },

  addAttachment: (type, id, attachmentMeta) => {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM templates WHERE type=? AND id=?').get(type, id)
    if (!row) return null
    const t = rowToTemplate(row)
    t.attachments.push(attachmentMeta)
    t.updatedAt = nowISO()
    db.prepare('UPDATE templates SET attachments=?, updated_at=? WHERE type=? AND id=?')
      .run(JSON.stringify(t.attachments), t.updatedAt, type, id)
    return t
  },

  removeAttachment: (type, id, attId) => {
    const db  = getDb()
    const row = db.prepare('SELECT * FROM templates WHERE type=? AND id=?').get(type, id)
    if (!row) return null
    const t = rowToTemplate(row)
    const att = t.attachments.find(a => a.id === attId) || null
    t.attachments = t.attachments.filter(a => a.id !== attId)
    t.updatedAt = nowISO()
    db.prepare('UPDATE templates SET attachments=?, updated_at=? WHERE type=? AND id=?')
      .run(JSON.stringify(t.attachments), t.updatedAt, type, id)
    return { template: t, attachment: att }
  },

  TRANSITIONS,
  VALID_STATUSES,
}
