// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// Simple JSON-file backed storage for ISMS templates (Deutsch start)
// Path: data/templates.json
const fs = require('fs')
const path = require('path')
const { applyApproval } = require('./templateVersioning')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE = path.join(DATA_DIR, 'templates.json')

// Gültige Lifecycle-Status
const VALID_STATUSES = ['draft', 'review', 'approved', 'archived']

// Erlaubte Übergänge: { von: [{ to, minRole }] }
const TRANSITIONS = {
  draft:    [{ to: 'review',    minRole: 'editor' }],
  review:   [{ to: 'approved',  minRole: 'contentowner' },
             { to: 'draft',     minRole: 'editor' }],
  approved: [{ to: 'review',    minRole: 'contentowner' },
             { to: 'archived',  minRole: 'contentowner' }],
  archived: [{ to: 'draft',     minRole: 'admin' }]
}

const ROLE_RANK = { reader: 1, revision: 1, editor: 2, dept_head: 2, qmb: 2, contentowner: 3, auditor: 3, admin: 4 }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadAll() {
  ensureDir()
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify([], null, 2))
    return []
  }
  const raw = fs.readFileSync(FILE, 'utf8')
  try { return JSON.parse(raw) } catch { return [] }
}

function saveAll(data) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function nowISO() { return new Date().toISOString() }

let store = loadAll()

function generateId(type) {
  return `${type}_${Date.now()}`
}

function findIndex(type, id) {
  return store.findIndex(t => t.type === type && t.id === id)
}

module.exports = {
  init: () => { store = loadAll() },

  getTemplates: ({ type, language, status }) => {
    let res = store.filter(t => !t.deletedAt)
    if (type) res = res.filter(t => t.type === type)
    if (language) res = res.filter(t => t.language === language)
    if (status) res = res.filter(t => t.status === status)
    return res
  },

  getTemplate: (type, id) => {
    return store.find(t => t.type === type && t.id === id && !t.deletedAt) || null
  },

  createTemplate: ({ type, language, title, content, owner, parentId }) => {
    const id = generateId(type)
    const now = nowISO()
    const t = {
      id,
      type,
      language,
      title,
      content: content || '',
      version: 1,
      status: 'draft',
      owner: owner || null,
      nextReviewDate: null,
      createdAt: now,
      updatedAt: now,
      linkedControls: [],
      applicableEntities: [],
      attachments: [],
      parentId: parentId || null,
      sortOrder: 0,
      history: [{ version: 1, content: content || '', updatedAt: now }],
      versionHistory: [],
      statusHistory: [{ status: 'draft', changedBy: owner || 'system', changedAt: now }]
    }
    store.push(t)
    saveAll(store)
    return t
  },

  updateTemplate: (type, id, { title, content, owner, applicableEntities, linkedControls, parentId, nextReviewDate }) => {
    const idx = findIndex(type, id)
    if (idx < 0) return null
    const t = store[idx]
    if (title !== undefined) t.title = title
    if (typeof content === 'string') t.content = content
    if (owner !== undefined) t.owner = owner
    if (Array.isArray(applicableEntities)) t.applicableEntities = applicableEntities
    if (Array.isArray(linkedControls)) t.linkedControls = linkedControls
    if (parentId !== undefined) t.parentId = parentId || null
    if (nextReviewDate !== undefined) t.nextReviewDate = nextReviewDate || null
    // #97: Speichern erhöht die Version nicht mehr — sie steigt erst bei der Freigabe (setStatus).
    t.updatedAt = nowISO()
    saveAll(store)
    return t
  },

  addLinkedControl: (templateType, templateId, controlId) => {
    const idx = findIndex(templateType, templateId)
    if (idx < 0) return null
    const t = store[idx]
    if (!Array.isArray(t.linkedControls)) t.linkedControls = []
    if (!t.linkedControls.includes(controlId)) {
      t.linkedControls.push(controlId)
      t.updatedAt = nowISO()
      saveAll(store)
    }
    return t
  },

  removeLinkedControl: (templateType, templateId, controlId) => {
    const idx = findIndex(templateType, templateId)
    if (idx < 0) return null
    const t = store[idx]
    if (!Array.isArray(t.linkedControls)) { t.linkedControls = []; return t }
    t.linkedControls = t.linkedControls.filter(c => c !== controlId)
    t.updatedAt = nowISO()
    saveAll(store)
    return t
  },

  // Status-Übergang: gibt { ok, error, template } zurück
  setStatus: (type, id, { status: newStatus, changedBy, role, changes }) => {
    const idx = findIndex(type, id)
    if (idx < 0) return { ok: false, error: 'Not found' }
    if (!VALID_STATUSES.includes(newStatus)) return { ok: false, error: 'Invalid status' }

    const t = store[idx]
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
    if (newStatus === 'approved') {
      t.reviewDate = now
      applyApproval(t, { approvedBy: changedBy, changes, now })
    }
    if (!t.statusHistory) t.statusHistory = []
    t.statusHistory.push({ status: newStatus, changedBy: changedBy || 'unknown', changedAt: now })

    saveAll(store)
    return { ok: true, template: t }
  },

  deleteTemplate: (type, id, deletedBy) => {
    const idx = findIndex(type, id)
    if (idx < 0) return false
    store[idx].deletedAt = nowISO()
    store[idx].deletedBy = deletedBy || null
    saveAll(store)
    return true
  },

  permanentDeleteTemplate: (type, id) => {
    const idx = findIndex(type, id)
    if (idx < 0) return false
    store.splice(idx, 1)
    saveAll(store)
    return true
  },

  restoreTemplate: (type, id) => {
    // Search including soft-deleted ones
    const idx = store.findIndex(t => t.type === type && t.id === id)
    if (idx < 0) return null
    store[idx].deletedAt = null
    store[idx].deletedBy = null
    saveAll(store)
    return store[idx]
  },

  getDeletedTemplates: () => {
    return store.filter(t => t.deletedAt)
  },

  getHistory: (type, id) => {
    const t = store.find(x => x.type === type && x.id === id)
    return t ? t.history : null
  },

  getStatusHistory: (type, id) => {
    const t = store.find(x => x.type === type && x.id === id)
    return t ? (t.statusHistory || []) : null
  },

  // ── Hierarchy: Template-Tree ──────────────────────────────
  getTemplateTree: (type, language) => {
    let list = store.filter(t => !t.deletedAt)
    if (type) list = list.filter(t => t.type === type)
    if (language) list = list.filter(t => t.language === language)
    // Build map
    const byId = {}
    list.forEach(t => { byId[t.id] = { ...t, parentId: t.parentId || null, children: [] } })
    const roots = []
    list.forEach(t => {
      const node = byId[t.id]
      const pid = t.parentId || null
      if (pid && byId[pid]) {
        byId[pid].children.push(node)
      } else {
        roots.push(node)
      }
    })
    // Sort by sortOrder first, then title
    function sortLevel(nodes) {
      nodes.sort((a, b) => ((a.sortOrder || 0) - (b.sortOrder || 0)) || a.title.localeCompare(b.title, 'de'))
      nodes.forEach(n => sortLevel(n.children))
    }
    sortLevel(roots)
    return roots
  },

  // Move template to new parent (no version bump – structural change only)
  moveTemplate: (type, id, { parentId, sortOrder }) => {
    const idx = findIndex(type, id)
    if (idx < 0) return null
    // Circular reference check: walk up from newParent, ensure id is not an ancestor
    if (parentId) {
      let cursor = store.find(x => x.id === parentId)
      const seen = new Set([id])
      while (cursor) {
        if (seen.has(cursor.id)) return { error: 'circular' }
        seen.add(cursor.id)
        cursor = cursor.parentId ? store.find(x => x.id === cursor.parentId) : null
      }
    }
    store[idx].parentId = parentId || null
    if (sortOrder !== undefined) store[idx].sortOrder = sortOrder
    store[idx].updatedAt = nowISO()
    saveAll(store)
    return store[idx]
  },

  // Batch-update sortOrder for multiple templates (sibling reorder)
  reorderTemplates: (updates) => {
    updates.forEach(({ id, sortOrder }) => {
      const idx = store.findIndex(x => x.id === id)
      if (idx >= 0) {
        store[idx].sortOrder = sortOrder
        store[idx].updatedAt = nowISO()
      }
    })
    saveAll(store)
    return true
  },

  getTemplateBreadcrumb: (type, id) => {
    const t = store.find(x => x.type === type && x.id === id)
    if (!t) return null
    const crumbs = []
    let current = t
    const visited = new Set()
    while (current) {
      if (visited.has(current.id)) break
      visited.add(current.id)
      crumbs.unshift({ id: current.id, title: current.title, type: current.type })
      const pid = current.parentId || null
      current = pid ? store.find(x => x.id === pid) : null
    }
    return crumbs
  },

  // ── Attachments ───────────────────────────────────────────
  addAttachment: (type, id, attachmentMeta) => {
    const idx = findIndex(type, id)
    if (idx < 0) return null
    const t = store[idx]
    if (!Array.isArray(t.attachments)) t.attachments = []
    t.attachments.push(attachmentMeta)
    t.updatedAt = nowISO()
    saveAll(store)
    return t
  },

  removeAttachment: (type, id, attId) => {
    const idx = findIndex(type, id)
    if (idx < 0) return null
    const t = store[idx]
    if (!Array.isArray(t.attachments)) { t.attachments = []; return t }
    const att = t.attachments.find(a => a.id === attId)
    t.attachments = t.attachments.filter(a => a.id !== attId)
    t.updatedAt = nowISO()
    saveAll(store)
    return { template: t, attachment: att || null }
  },

  setWebdavPublish: (type, id, publishState) => {
    const idx = findIndex(type, id)
    if (idx < 0) return null
    store[idx].webdavPublish = publishState
    saveAll(store)
    return store[idx]
  },

  TRANSITIONS,
  VALID_STATUSES
}
