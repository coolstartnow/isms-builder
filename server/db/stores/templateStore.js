// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'

const { getDb, init: initDb } = require('../knexDatabase')
const { applyApproval } = require('../templateVersioning')

const VALID_STATUSES = ['draft', 'review', 'approved', 'archived']
const TRANSITIONS = {
  draft:    [{ to: 'review',    minRole: 'editor' }],
  review:   [{ to: 'approved',  minRole: 'contentowner' },
             { to: 'draft',     minRole: 'editor' }],
  approved: [{ to: 'review',    minRole: 'contentowner' },
             { to: 'archived',  minRole: 'contentowner' }],
  archived: [{ to: 'draft',     minRole: 'admin' }],
}
const ROLE_RANK = { reader: 1, revision: 1, editor: 2, dept_head: 2, qmb: 2, contentowner: 3, auditor: 3, admin: 4 }

function nowISO() { return new Date().toISOString() }
function generateId(type) { return `${type}_${Date.now()}` }

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
    owner:              row.owner || null,
    nextReviewDate:     row.next_review_date || null,
    parentId:           row.parent_id || null,
    sortOrder:          row.sort_order || 0,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
    deletedAt:          row.deleted_at || null,
    deletedBy:          row.deleted_by || null,
    linkedControls:     _json(row.linked_controls, []),
    applicableEntities: _json(row.applicable_entities, []),
    attachments:        _json(row.attachments, []),
    history:            _json(row.history, []),
    versionHistory:     _json(row.version_history, []),
    statusHistory:      _json(row.status_history, []),
    webdavPublish:      _json(row.webdav_publish, null),
  }
}

function _json(val, fallback) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

module.exports = {
  init: async () => { await initDb() },

  getTemplates: async ({ type, language, status } = {}) => {
    const q = getDb()('templates').whereNull('deleted_at')
    if (type)     q.where('type', type)
    if (language) q.where('language', language)
    if (status)   q.where('status', status)
    q.orderBy('sort_order', 'asc').orderBy('title', 'asc')
    const rows = await q
    return rows.map(rowToTemplate)
  },

  getTemplate: async (type, id) => {
    const row = await getDb()('templates')
      .where('type', type)
      .where('id', id)
      .whereNull('deleted_at')
      .first()
    return rowToTemplate(row)
  },

  createTemplate: async ({ type, language, title, content, owner, parentId }) => {
    const id  = generateId(type)
    const now = nowISO()
    await getDb()('templates').insert({
      id,
      type,
      language: language || 'de',
      title: title || '',
      content: content || '',
      version: 1,
      status: 'draft',
      owner: owner || null,
      next_review_date: null,
      parent_id: parentId || null,
      sort_order: 0,
      created_at: now,
      updated_at: now,
      linked_controls: '[]',
      applicable_entities: '[]',
      attachments: '[]',
      history: JSON.stringify([{ version: 1, content: content || '', updatedAt: now }]),
      version_history: '[]',
      status_history: JSON.stringify([{ status: 'draft', changedBy: owner || 'system', changedAt: now }]),
    })
    return module.exports.getTemplate(type, id)
  },

  updateTemplate: async (type, id, { title, content, owner, applicableEntities, linkedControls, parentId, nextReviewDate }) => {
    const row = await getDb()('templates')
      .where('type', type).where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const t = rowToTemplate(row)

    if (title !== undefined) t.title = title
    if (typeof content === 'string') t.content = content
    if (owner !== undefined) t.owner = owner
    if (Array.isArray(applicableEntities)) t.applicableEntities = applicableEntities
    if (Array.isArray(linkedControls)) t.linkedControls = linkedControls
    if (parentId !== undefined) t.parentId = parentId || null
    if (nextReviewDate !== undefined) t.nextReviewDate = nextReviewDate || null

    // #97: Speichern erhöht die Version nicht mehr — sie steigt erst bei der Freigabe (setStatus).
    t.updatedAt = nowISO()

    await getDb()('templates').where('type', type).where('id', id).update({
      title: t.title,
      content: t.content,
      owner: t.owner,
      next_review_date: t.nextReviewDate,
      parent_id: t.parentId,
      updated_at: t.updatedAt,
      linked_controls: JSON.stringify(t.linkedControls),
      applicable_entities: JSON.stringify(t.applicableEntities),
      status_history: JSON.stringify(t.statusHistory),
    })
    return t
  },

  addLinkedControl: async (templateType, templateId, controlId) => {
    const row = await getDb()('templates')
      .where('type', templateType).where('id', templateId).whereNull('deleted_at').first()
    if (!row) return null
    const t = rowToTemplate(row)
    if (!t.linkedControls.includes(controlId)) {
      t.linkedControls.push(controlId)
      t.updatedAt = nowISO()
      await getDb()('templates').where('type', templateType).where('id', templateId).update({
        linked_controls: JSON.stringify(t.linkedControls),
        updated_at: t.updatedAt,
      })
    }
    return t
  },

  removeLinkedControl: async (templateType, templateId, controlId) => {
    const row = await getDb()('templates')
      .where('type', templateType).where('id', templateId).whereNull('deleted_at').first()
    if (!row) return null
    const t = rowToTemplate(row)
    t.linkedControls = t.linkedControls.filter(c => c !== controlId)
    t.updatedAt = nowISO()
    await getDb()('templates').where('type', templateType).where('id', templateId).update({
      linked_controls: JSON.stringify(t.linkedControls),
      updated_at: t.updatedAt,
    })
    return t
  },

  setStatus: async (type, id, { status: newStatus, changedBy, role, changes }) => {
    const row = await getDb()('templates')
      .where('type', type).where('id', id).whereNull('deleted_at').first()
    if (!row) return { ok: false, error: 'Not found' }
    if (!VALID_STATUSES.includes(newStatus)) return { ok: false, error: 'Invalid status' }

    const t = rowToTemplate(row)
    const currentStatus = t.status || 'draft'
    if (currentStatus === newStatus) return { ok: false, error: 'Already in this status' }

    const allowed = (TRANSITIONS[currentStatus] || []).find(tr => tr.to === newStatus)
    if (!allowed) return { ok: false, error: `Transition ${currentStatus} → ${newStatus} not allowed` }

    const userRank = ROLE_RANK[role?.toLowerCase()] || 0
    const requiredRank = ROLE_RANK[allowed.minRole] || 0
    if (userRank < requiredRank) {
      return { ok: false, error: `Role '${role}' insufficient. Requires '${allowed.minRole}'` }
    }

    const now = nowISO()
    t.status = newStatus
    t.updatedAt = now
    if (!Array.isArray(t.statusHistory)) t.statusHistory = []
    // #97: Die Freigabe vergibt die neue Version und schreibt sie samt Benutzer in die Versionshistorie.
    // Reihenfolge wichtig: erst die Version berechnen, dann den neuen Status in die Historie schreiben
    // (sonst zählt die aktuelle Freigabe schon als frühere).
    const patch = { status: newStatus, updated_at: now }
    if (newStatus === 'approved') {
      applyApproval(t, { approvedBy: changedBy, changes, now })
      patch.version = t.version
      patch.version_history = JSON.stringify(t.versionHistory)
    }
    t.statusHistory.push({ status: newStatus, changedBy: changedBy || 'unknown', changedAt: now })
    patch.status_history = JSON.stringify(t.statusHistory)
    await getDb()('templates').where('type', type).where('id', id).update(patch)
    return { ok: true, template: t }
  },

  deleteTemplate: async (type, id, deletedBy) => {
    const affected = await getDb()('templates')
      .where('type', type).where('id', id).whereNull('deleted_at')
      .update({ deleted_at: nowISO(), deleted_by: deletedBy || null })
    return affected > 0
  },

  permanentDeleteTemplate: async (type, id) => {
    const affected = await getDb()('templates').where('type', type).where('id', id).del()
    return affected > 0
  },

  restoreTemplate: async (type, id) => {
    const row = await getDb()('templates').where('type', type).where('id', id).first()
    if (!row) return null
    await getDb()('templates').where('type', type).where('id', id).update({
      deleted_at: null,
      deleted_by: null,
      updated_at: nowISO(),
    })
    return rowToTemplate({ ...row, deleted_at: null, deleted_by: null })
  },

  getDeletedTemplates: async () => {
    const rows = await getDb()('templates')
      .whereNotNull('deleted_at')
      .orderBy('deleted_at', 'desc')
    return rows.map(rowToTemplate)
  },

  getHistory: async (type, id) => {
    const row = await getDb()('templates').where('type', type).where('id', id)
      .first('history')
    return row ? _json(row.history, []) : null
  },

  getStatusHistory: async (type, id) => {
    const row = await getDb()('templates').where('type', type).where('id', id)
      .first('status_history')
    return row ? _json(row.status_history, []) : null
  },

  getTemplateTree: async (type, language) => {
    const q = getDb()('templates').whereNull('deleted_at')
    if (type)     q.where('type', type)
    if (language) q.where('language', language)
    const list = (await q).map(rowToTemplate)

    const byId = {}
    list.forEach(t => { byId[t.id] = { ...t, children: [] } })
    const roots = []
    list.forEach(t => {
      const pid = t.parentId || null
      if (pid && byId[pid]) byId[pid].children.push(byId[t.id])
      else roots.push(byId[t.id])
    })
    function sortLevel(nodes) {
      nodes.sort((a, b) => ((a.sortOrder || 0) - (b.sortOrder || 0)) || a.title.localeCompare(b.title, 'de'))
      nodes.forEach(n => sortLevel(n.children))
    }
    sortLevel(roots)
    return roots
  },

  moveTemplate: async (type, id, { parentId, sortOrder }) => {
    const row = await getDb()('templates').where('type', type).where('id', id).first()
    if (!row) return null

    if (parentId) {
      let cursor = parentId
      const visited = new Set()
      while (cursor) {
        if (cursor === id) return { error: 'circular' }
        if (visited.has(cursor)) break
        visited.add(cursor)
        const p = await getDb()('templates').where('id', cursor).first('parent_id')
        cursor = p?.parent_id || null
      }
    }
    await getDb()('templates').where('type', type).where('id', id).update({
      parent_id: parentId || null,
      sort_order: sortOrder ?? row.sort_order,
      updated_at: nowISO(),
    })
    return { ok: true }
  },

  reorderTemplates: async (updates) => {
    for (const { id, sortOrder } of updates) {
      await getDb()('templates').where('id', id).update({
        sort_order: sortOrder,
        updated_at: nowISO(),
      })
    }
    return true
  },

  getTemplateBreadcrumb: async (type, id) => {
    const crumbs = []
    let currentId = id
    const visited = new Set()
    while (currentId) {
      if (visited.has(currentId)) break
      visited.add(currentId)
      const row = await getDb()('templates').where('id', currentId)
        .first('id', 'title', 'type', 'parent_id')
      if (!row) break
      crumbs.unshift({ id: row.id, title: row.title, type: row.type })
      currentId = row.parent_id || null
    }
    return crumbs
  },

  addAttachment: async (type, id, attachmentMeta) => {
    const row = await getDb()('templates')
      .where('type', type).where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const t = rowToTemplate(row)
    t.attachments.push(attachmentMeta)
    t.updatedAt = nowISO()
    await getDb()('templates').where('type', type).where('id', id).update({
      attachments: JSON.stringify(t.attachments),
      updated_at: t.updatedAt,
    })
    return t
  },

  removeAttachment: async (type, id, attId) => {
    const row = await getDb()('templates')
      .where('type', type).where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    const t = rowToTemplate(row)
    const att = t.attachments.find(a => a.id === attId) || null
    t.attachments = t.attachments.filter(a => a.id !== attId)
    t.updatedAt = nowISO()
    await getDb()('templates').where('type', type).where('id', id).update({
      attachments: JSON.stringify(t.attachments),
      updated_at: t.updatedAt,
    })
    return { template: t, attachment: att }
  },

  setWebdavPublish: async (type, id, publishState) => {
    const row = await getDb()('templates')
      .where('type', type).where('id', id).whereNull('deleted_at').first()
    if (!row) return null
    await getDb()('templates').where('type', type).where('id', id).update({
      webdav_publish: JSON.stringify(publishState),
    })
    return rowToTemplate({ ...row, webdav_publish: JSON.stringify(publishState) })
  },

  TRANSITIONS,
  VALID_STATUSES,
}
