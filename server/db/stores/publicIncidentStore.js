'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

const INCIDENT_TYPES = ['malware','phishing','data_theft','ransomware','unauthorized_access','social_engineering','other']
const CLEANED_UP_VALUES = ['yes','no','partial']

function nowISO() { return new Date().toISOString() }
function _json(val, fallback) { if (!val) return fallback; try { return JSON.parse(val) } catch { return fallback } }

function rowToIncident(row) {
  if (!row) return null
  return { id: row.id, refNumber: row.ref, ..._json(row.data, {}), createdAt: row.submitted_at, deletedAt: row.deleted_at || null }
}

async function nextRefNumber() {
  const year = new Date().getFullYear()
  const prefix = `INC-${year}-`
  const rows = await getDb()('public_incidents').where('ref', 'like', `${prefix}%`)
  const maxSeq = rows.map(r => parseInt(r.ref.replace(prefix, ''), 10) || 0).reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

module.exports = {
  init: async () => { await initDb() },
  INCIDENT_TYPES,

  getAll: async ({ status } = {}) => {
    const q = getDb()('public_incidents').whereNull('deleted_at')
    if (status) q.whereRaw("data LIKE ?", [`%"status":"${status}"%`])
    const rows = await q.orderBy('submitted_at', 'desc')
    let list = rows.map(rowToIncident)
    if (status) list = list.filter(i => i.status === status)
    return list
  },

  getById: async (id) => {
    const row = await getDb()('public_incidents').where('id', id).whereNull('deleted_at').first()
    return rowToIncident(row)
  },

  create: async (data) => {
    const { randomUUID } = require('crypto')
    const id = randomUUID()
    const ref = await nextRefNumber()
    const now = nowISO()
    const incident = {
      refNumber: ref, status: 'new',
      email: (data.email || '').trim(), entityName: (data.entityName || '').trim(),
      incidentType: INCIDENT_TYPES.includes(data.incidentType) ? data.incidentType : 'other',
      description: (data.description || '').trim(), measuresTaken: (data.measuresTaken || '').trim(),
      localContact: (data.localContact || '').trim(),
      cleanedUp: CLEANED_UP_VALUES.includes(data.cleanedUp) ? data.cleanedUp : 'no',
      assignedTo: null, reportable: null, cisoNotes: '',
      updatedAt: null, updatedBy: null,
    }
    await getDb()('public_incidents').insert({
      id, ref, data: JSON.stringify(incident), submitted_at: now,
    })
    return { id, ...incident, createdAt: now }
  },

  update: async (id, patch, updatedBy) => {
    const row = await getDb()('public_incidents').where('id', id).first()
    if (!row) return null
    const inc = rowToIncident(row)
    // 'art23' trägt die NIS2-Meldefristen (siehe server/db/art23.js); liegt im data-Blob
    const allowed = ['status','assignedTo','reportable','cisoNotes','art23']
    for (const k of allowed) { if (k in patch) inc[k] = patch[k] }
    inc.updatedAt = nowISO()
    inc.updatedBy = updatedBy || null
    await getDb()('public_incidents').where('id', id).update({ data: JSON.stringify(inc) })
    return inc
  },

  delete: async (id, deletedBy) => {
    const row = await getDb()('public_incidents').where('id', id).first()
    if (!row) return false
    const inc = rowToIncident(row)
    inc.deletedAt = nowISO()
    inc.deletedBy = deletedBy || null
    await getDb()('public_incidents').where('id', id).update({ deleted_at: nowISO(), data: JSON.stringify(inc) })
    return true
  },

  permanentDelete: async (id) => {
    const affected = await getDb()('public_incidents').where('id', id).del()
    return affected > 0
  },

  restore: async (id) => {
    const row = await getDb()('public_incidents').where('id', id).first()
    if (!row) return null
    const inc = rowToIncident(row)
    delete inc.deletedAt
    delete inc.deletedBy
    await getDb()('public_incidents').where('id', id).update({ deleted_at: null, data: JSON.stringify(inc) })
    return rowToIncident({ ...row, deleted_at: null })
  },

  getDeleted: async () => {
    const rows = await getDb()('public_incidents').whereNotNull('deleted_at')
    return rows.map(rowToIncident)
  },

  remove: async (id) => {
    const affected = await getDb()('public_incidents').where('id', id).del()
    return affected > 0
  },
}
