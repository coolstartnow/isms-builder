// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Audit-Verwaltung: Audits mit Prüfpunkten und Auditprogramme (Jahresplan).
//
// Heißt auditMgmtStore, weil auditStore.js schon das Audit-LOG (wer hat was geändert) ist.
//
// Die Geschäftslogik steht einmal hier; die Persistenz ist ein kleiner Adapter (JSON-Datei oder
// Knex-Tabelle, je nach STORAGE_BACKEND). Beide speichern pro Objekt ein Dokument, wie findings.
'use strict'

const fs   = require('fs')
const path = require('path')

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')

const AUDIT_TYPES      = ['internal', 'external', 'supplier', 'certification']
const AUDIT_STATUSES   = ['planned', 'in_progress', 'completed', 'cancelled']
const RESULTS          = ['open', 'conform', 'nonconform', 'not_applicable']
const PROGRAM_STATUSES = ['draft', 'approved']

const COLLECTIONS = {
  audits:   { file: 'audits.json',         table: 'audits',         prefix: 'AUD' },
  programs: { file: 'audit-programs.json', table: 'audit_programs', prefix: 'AP'  },
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
const nowISO = () => new Date().toISOString()
const rid    = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const str    = (v, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf  = (v, list, fallback) => (list.includes(v) ? v : fallback)
/** Nur YYYY-MM-DD, sonst null. */
const date   = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
const idList = v => (Array.isArray(v)
  ? [...new Set(v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()))] : [])

/** Schreibzugriffe nacheinander ausführen, damit parallele Requests keine Änderung überschreiben. */
let _lock = Promise.resolve()
function locked(fn) {
  const run = _lock.then(fn)
  _lock = run.catch(() => {})
  return run
}

// ── Persistenz-Adapter ───────────────────────────────────────────────────────
function jsonAdapter() {
  const fileOf = c => path.join(DATA_DIR, COLLECTIONS[c].file)
  const read   = c => { try { return JSON.parse(fs.readFileSync(fileOf(c), 'utf8')) } catch { return [] } }
  const write  = (c, list) => fs.writeFileSync(fileOf(c), JSON.stringify(list, null, 2))
  return {
    async all(c)       { return read(c) },
    async save(c, doc) {
      const list = read(c)
      const i = list.findIndex(x => x.id === doc.id)
      if (i === -1) list.push(doc); else list[i] = doc
      write(c, list)
    },
    async drop(c, id)  { const list = read(c); const n = list.filter(x => x.id !== id); write(c, n); return list.length - n.length },
    async dropMany(c, pred) { const list = read(c); const n = list.filter(x => !pred(x)); if (n.length < list.length) write(c, n); return list.length - n.length },
  }
}

function knexAdapter() {
  const { getDb, init } = require('./knexDatabase')
  const toDoc = row => ({ ...JSON.parse(row.data || '{}'), id: row.id, deletedAt: row.deleted_at || null })
  return {
    init,
    async all(c) { return (await getDb()(COLLECTIONS[c].table)).map(toDoc) },
    async save(c, doc) {
      const db = getDb()(COLLECTIONS[c].table)
      const row = {
        data: JSON.stringify(doc), created_by: doc.createdBy || 'system',
        updated_at: doc.updatedAt, deleted_at: doc.deletedAt || null,
      }
      const exists = await getDb()(COLLECTIONS[c].table).where('id', doc.id).first()
      if (exists) await getDb()(COLLECTIONS[c].table).where('id', doc.id).update(row)
      else await db.insert({ id: doc.id, created_at: doc.createdAt, ...row })
    },
    async drop(c, id) { return getDb()(COLLECTIONS[c].table).where('id', id).del() },
    async dropMany(c, pred) {
      const ids = (await getDb()(COLLECTIONS[c].table)).map(toDoc).filter(pred).map(d => d.id)
      if (ids.length) await getDb()(COLLECTIONS[c].table).whereIn('id', ids).del()
      return ids.length
    },
  }
}

const adapter = STORAGE_BACKEND === 'json' ? jsonAdapter() : knexAdapter()
if (adapter.init) adapter.init().catch(e => console.error('[auditMgmtStore] Knex init:', e.message))

// ── Referenznummer AUD-JJJJ-NNNN / AP-JJJJ-NNNN ──────────────────────────────
async function nextRef(c) {
  const year = new Date().getFullYear()
  const pre  = `${COLLECTIONS[c].prefix}-${year}-`
  const nums = (await adapter.all(c)).filter(d => d.ref && d.ref.startsWith(pre))
    .map(d => parseInt(d.ref.slice(pre.length), 10)).filter(n => !Number.isNaN(n))
  return `${pre}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`
}

// ── Normalisierung je Objektart ──────────────────────────────────────────────
const AUDIT_FIELDS = {
  title:        v => str(v, 300) || 'Neues Audit',
  type:         v => oneOf(v, AUDIT_TYPES, 'internal'),
  status:       v => oneOf(v, AUDIT_STATUSES, 'planned'),
  standard:     v => str(v, 300),
  scope:        v => str(v, 2000),
  entityIds:    idList,
  supplierId:   v => str(v, 120) || null,
  leadAuditor:  v => str(v, 200),
  team:         v => (Array.isArray(v) ? v.map(x => str(x, 200)).filter(Boolean) : []),
  plannedStart: date, plannedEnd: date, actualStart: date, actualEnd: date,
  followUpDate: date,
  conclusion:   v => str(v, 10000),
  programId:    v => str(v, 120) || null,
}
const PROGRAM_FIELDS = {
  title:      v => str(v, 300) || 'Neues Auditprogramm',
  year:       v => { const n = parseInt(v, 10); return n >= 2000 && n <= 2100 ? n : new Date().getFullYear() },
  objectives: v => str(v, 5000),
  scope:      v => str(v, 5000),
}

function applyFields(doc, spec, fields, { create = false } = {}) {
  for (const [k, norm] of Object.entries(spec)) {
    if (create) doc[k] = norm(fields[k])
    else if (fields[k] !== undefined) doc[k] = norm(fields[k])
  }
}

function normalizeItem(fields, item = {}) {
  const out = { ...item }
  if (!out.id) out.id = rid('item')
  if (fields.controlId !== undefined || !('controlId' in out)) out.controlId = str(fields.controlId, 120) || null
  if (fields.question !== undefined || !('question' in out))   out.question  = str(fields.question, 2000)
  if (fields.result   !== undefined || !('result' in out))     out.result    = oneOf(fields.result, RESULTS, 'open')
  if (fields.evidence !== undefined || !('evidence' in out))   out.evidence  = str(fields.evidence, 5000)
  if (fields.notes    !== undefined || !('notes' in out))      out.notes     = str(fields.notes, 5000)
  if (!('findingId' in out)) out.findingId = null
  return out
}

// ── Allgemeine CRUD-Operationen je Sammlung ──────────────────────────────────
function crud(c, { spec, defaults }) {
  const live = async () => (await adapter.all(c)).filter(d => !d.deletedAt)
  return {
    async getAll() { return (await live()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) },
    async getById(id) { return (await live()).find(d => d.id === id) || null },

    create(fields, createdBy) {
      return locked(async () => {
        const now = nowISO()
        const doc = { id: rid(COLLECTIONS[c].prefix.toLowerCase()), ref: await nextRef(c), ...defaults() }
        applyFields(doc, spec, fields, { create: true })
        Object.assign(doc, { createdAt: now, updatedAt: now, createdBy: createdBy || 'system', deletedAt: null, deletedBy: null })
        await adapter.save(c, doc)
        return doc
      })
    },

    update(id, fields, mutate) {
      return locked(async () => {
        const doc = (await live()).find(d => d.id === id)
        if (!doc) return null
        applyFields(doc, spec, fields)
        if (mutate) mutate(doc)
        doc.updatedAt = nowISO()
        await adapter.save(c, doc)
        return doc
      })
    },

    remove(id, deletedBy) {
      return locked(async () => {
        const doc = (await live()).find(d => d.id === id)
        if (!doc) return false
        doc.deletedAt = nowISO(); doc.deletedBy = deletedBy || 'system'
        await adapter.save(c, doc)
        return true
      })
    },

    permanentDelete(id) { return locked(async () => (await adapter.drop(c, id)) > 0) },

    restore(id) {
      return locked(async () => {
        const doc = (await adapter.all(c)).find(d => d.id === id && d.deletedAt)
        if (!doc) return null
        doc.deletedAt = null; doc.deletedBy = null; doc.updatedAt = nowISO()
        await adapter.save(c, doc)
        return doc
      })
    },

    async getDeleted() { return (await adapter.all(c)).filter(d => d.deletedAt) },

    autopurge(days = 30) {
      const cutoff = Date.now() - days * 86400000
      return locked(() => adapter.dropMany(c, d => d.deletedAt && new Date(d.deletedAt).getTime() < cutoff))
    },
  }
}

const auditCrud = crud('audits', {
  spec: AUDIT_FIELDS,
  defaults: () => ({ checklist: [] }),
})
const programCrud = crud('programs', {
  spec: PROGRAM_FIELDS,
  defaults: () => ({ status: 'draft', approvedBy: null, approvedAt: null }),
})

const yearOf = a => parseInt(String(a.plannedStart || a.plannedEnd || a.createdAt || '').slice(0, 4), 10)

// ── Audits ───────────────────────────────────────────────────────────────────
const audits = {
  ...auditCrud,

  async getAll({ status, type, year, programId } = {}) {
    let list = await auditCrud.getAll()
    if (status)    list = list.filter(a => a.status === status)
    if (type)      list = list.filter(a => a.type === type)
    if (year)      list = list.filter(a => yearOf(a) === parseInt(year, 10))
    if (programId) list = list.filter(a => a.programId === programId)
    return list
  },

  // ── Prüfpunkte ──
  addItem(auditId, fields) {
    let item = null
    return auditCrud.update(auditId, {}, a => {
      item = normalizeItem(fields)
      a.checklist = [...(a.checklist || []), item]
    }).then(a => (a ? item : null))
  },

  updateItem(auditId, itemId, fields) {
    let item = null
    return auditCrud.update(auditId, {}, a => {
      const i = (a.checklist || []).findIndex(x => x.id === itemId)
      if (i === -1) return
      item = normalizeItem(fields, a.checklist[i])
      a.checklist[i] = item
    }).then(a => (a ? item : null))
  },

  deleteItem(auditId, itemId) {
    let removed = false
    return auditCrud.update(auditId, {}, a => {
      const before = (a.checklist || []).length
      a.checklist = (a.checklist || []).filter(x => x.id !== itemId)
      removed = a.checklist.length < before
    }).then(a => !!a && removed)
  },

  /** Trägt das aus einem Prüfpunkt erzeugte Finding im Prüfpunkt ein. */
  setItemFinding(auditId, itemId, findingId) {
    let item = null
    return auditCrud.update(auditId, {}, a => {
      item = (a.checklist || []).find(x => x.id === itemId) || null
      if (item) item.findingId = findingId
    }).then(a => (a ? item : null))
  },

  async getSummary() {
    const list = await auditCrud.getAll()
    const byStatus = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 }
    const today = new Date().toISOString().slice(0, 10)
    const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    let overdue = 0, upcoming = 0, nonconform = 0
    for (const a of list) {
      if (byStatus[a.status] !== undefined) byStatus[a.status]++
      const open = a.status === 'planned' || a.status === 'in_progress'
      if (open && a.plannedEnd && a.plannedEnd < today) overdue++
      if (a.status === 'planned' && a.plannedStart && a.plannedStart >= today && a.plannedStart <= in30) upcoming++
      nonconform += (a.checklist || []).filter(i => i.result === 'nonconform').length
    }
    return { total: list.length, byStatus, overdue, upcoming, nonconform }
  },

  /** Termine für den Kalender (siehe routes/calendar.js). */
  async getCalendarEvents() {
    const events = []
    for (const a of await auditCrud.getAll()) {
      if (a.status === 'cancelled') continue
      if (a.plannedStart) events.push({ date: a.plannedStart, type: 'audit_planned', title: a.title, ref: a.ref, id: a.id })
      if (a.plannedEnd && a.status !== 'completed') events.push({ date: a.plannedEnd, type: 'audit_due', title: a.title, ref: a.ref, id: a.id })
      if (a.followUpDate) events.push({ date: a.followUpDate, type: 'audit_followup', title: a.title, ref: a.ref, id: a.id })
    }
    return events
  },
}

// ── Auditprogramme ───────────────────────────────────────────────────────────
const programs = {
  ...programCrud,

  async getAll({ year, status } = {}) {
    let list = await programCrud.getAll()
    if (year)   list = list.filter(p => p.year === parseInt(year, 10))
    if (status) list = list.filter(p => p.status === status)
    return list.sort((a, b) => b.year - a.year)
  },

  /** Freigabe des Programms; ein freigegebenes Programm lässt sich nicht mehr ändern. */
  approve(id, approvedBy) {
    return programCrud.update(id, {}, p => {
      p.status = 'approved'; p.approvedBy = approvedBy || 'unknown'; p.approvedAt = nowISO()
    })
  },

  /** Zurück in den Entwurf (z. B. zur Überarbeitung). */
  reopen(id) {
    return programCrud.update(id, {}, p => { p.status = 'draft'; p.approvedBy = null; p.approvedAt = null })
  },
}

module.exports = {
  AUDIT_TYPES, AUDIT_STATUSES, RESULTS, PROGRAM_STATUSES,
  ...audits,
  programs,
}
