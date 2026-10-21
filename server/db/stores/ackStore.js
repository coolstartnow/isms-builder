// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'

const { getDb } = require('../knexDatabase')

const { randomToken } = require('../../secureToken')
function uuidv4() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

function nowISO() { return new Date().toISOString() }

function _parse(val, fallback) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToDist(row) {
  if (!row) return null
  return {
    id:              row.id,
    templateId:      row.template_id,
    templateTitle:   row.template_title || '',
    templateType:    row.template_type  || 'Policy',
    templateVersion: row.template_version || 1,
    mode:            row.mode || 'manual',
    targetGroup:     row.target_group || '',
    dueDate:         row.due_date || null,
    emailList:       _parse(row.email_list, []),
    notes:           row.notes || '',
    status:          row.status || 'active',
    createdAt:       row.created_at,
    createdBy:       row.created_by || 'system',
    emailSentAt:     row.email_sent_at || null,
    emailSentCount:  row.email_sent_count || 0,
  }
}

function rowToAck(row) {
  if (!row) return null
  return {
    id:              row.id,
    distributionId:  row.distribution_id,
    recipientEmail:  row.recipient_email || '',
    recipientName:   row.recipient_name  || '',
    token:           row.token || null,
    acknowledgedAt:  row.acknowledged_at || null,
    ipAddress:       row.ip_address || null,
    method:          row.method || 'manual',
    notes:           row.notes || '',
    addedBy:         row.added_by || 'system',
  }
}

async function init() { await getDb() }

async function getDistributions() {
  const db = getDb()
  const rows = await db('policy_distributions').orderBy('created_at', 'desc')
  return rows.map(rowToDist)
}

async function getDistribution(id) {
  const db = getDb()
  const row = await db('policy_distributions').where('id', id).first()
  return row ? rowToDist(row) : null
}

async function _withStats(dist) {
  const db = getDb()
  const acks = (await db('policy_acks').where('distribution_id', dist.id)).map(rowToAck)
  const confirmed = acks.filter(a => a.acknowledgedAt)
  const pending = dist.mode === 'email_campaign'
    ? dist.emailList.filter(e => !acks.find(a => a.recipientEmail === e && a.acknowledgedAt))
    : []
  return {
    ...dist,
    stats: {
      total:     dist.mode === 'email_campaign' ? dist.emailList.length : acks.length,
      confirmed: confirmed.length,
      pending:   pending.length,
    },
  }
}

async function getDistributionWithStats(id) {
  const dist = await getDistribution(id)
  if (!dist) return null
  return await _withStats(dist)
}

async function getAllDistributionsWithStats() {
  const dists = await getDistributions()
  const result = []
  for (const d of dists) result.push(await _withStats(d))
  return result
}

async function createDistribution({ templateId, templateTitle, templateType, templateVersion, mode, targetGroup, dueDate, emailList, notes, createdBy }) {
  const id = uuidv4()
  const now = nowISO()
  const db = getDb()
  await db('policy_distributions').insert({
    id,
    template_id:       templateId,
    template_title:    templateTitle || '',
    template_type:     templateType  || 'Policy',
    template_version:  templateVersion || 1,
    mode:              mode || 'manual',
    target_group:      targetGroup || '',
    due_date:          dueDate || null,
    email_list:        JSON.stringify(emailList || []),
    notes:             notes || '',
    status:            'active',
    created_at:        now,
    created_by:        createdBy || 'system',
    email_sent_at:     null,
    email_sent_count:  0,
  })
  return await getDistribution(id)
}

async function updateDistribution(id, patch) {
  const db = getDb()
  const existing = await db('policy_distributions').where('id', id).first()
  if (!existing) return null
  const row = {}
  const map = {
    templateTitle:   'template_title',
    templateType:    'template_type',
    templateVersion: 'template_version',
    mode:            'mode',
    targetGroup:     'target_group',
    dueDate:         'due_date',
    notes:           'notes',
    status:          'status',
    emailSentAt:     'email_sent_at',
    emailSentCount:  'email_sent_count',
  }
  for (const [jsKey, dbKey] of Object.entries(map)) {
    if (patch[jsKey] !== undefined) row[dbKey] = patch[jsKey]
  }
  if (patch.emailList !== undefined) row.email_list = JSON.stringify(patch.emailList)
  await db('policy_distributions').where('id', id).update(row)
  return await getDistribution(id)
}

async function deleteDistribution(id) {
  const db = getDb()
  const existing = await db('policy_distributions').where('id', id).first()
  if (!existing) return false
  await db('policy_acks').where('distribution_id', id).del()
  await db('policy_distributions').where('id', id).del()
  return true
}

async function getAcksForDistribution(distributionId) {
  const db = getDb()
  const rows = await db('policy_acks').where('distribution_id', distributionId)
  return rows.map(rowToAck)
}

async function getAckByToken(token) {
  const db = getDb()
  const row = await db('policy_acks').where('token', token).first()
  return row ? rowToAck(row) : null
}

async function prepareEmailAcks(distributionId, emailList) {
  const db = getDb()
  const existing = await db('policy_acks').where('distribution_id', distributionId)
  const existingEmails = new Set(existing.map(a => a.recipient_email))
  let added = 0
  const inserts = []
  for (const email of emailList) {
    if (existingEmails.has(email)) continue
    inserts.push({
      id:              uuidv4(),
      distribution_id: distributionId,
      recipient_email: email,
      recipient_name:  '',
      token:           randomToken(),   // geheim: kryptografischer Zufall (GHSA-vf3w-pmvj-x8mc)
      acknowledged_at: null,
      ip_address:      null,
      method:          'email_link',
    })
    added++
  }
  if (inserts.length > 0) await db('policy_acks').insert(inserts)
  return added
}

async function confirmByToken(token, { recipientName, ipAddress } = {}) {
  const db = getDb()
  const row = await db('policy_acks').where('token', token).first()
  if (!row) return null
  if (row.acknowledged_at) return rowToAck(row)
  const patch = { acknowledged_at: nowISO(), ip_address: ipAddress || null }
  if (recipientName) patch.recipient_name = recipientName
  await db('policy_acks').where('token', token).update(patch)
  return await getAckByToken(token)
}

async function addManualAck({ distributionId, recipientEmail, recipientName, acknowledgedAt, notes, addedBy }) {
  const dist = await getDistribution(distributionId)
  if (!dist) return null
  const id = uuidv4()
  const db = getDb()
  await db('policy_acks').insert({
    id,
    distribution_id: distributionId,
    recipient_email: recipientEmail || '',
    recipient_name:  recipientName  || '',
    token:           null,
    acknowledged_at: acknowledgedAt || nowISO(),
    ip_address:      null,
    method:          'manual',
    notes:           notes   || '',
    added_by:        addedBy || 'system',
  })
  return await getAckByToken(null).then(() => rowToAck({
    id, distribution_id: distributionId,
    recipient_email: recipientEmail || '',
    recipient_name: recipientName || '',
    token: null,
    acknowledged_at: acknowledgedAt || nowISO(),
    ip_address: null,
    method: 'manual',
    notes: notes || '',
    added_by: addedBy || 'system',
  }))
}

async function importAcks(distributionId, rows, addedBy) {
  const dist = await getDistribution(distributionId)
  if (!dist) return { imported: 0, skipped: 0 }
  const db = getDb()
  let imported = 0, skipped = 0
  const inserts = []
  for (const row of rows) {
    if (!row.email) { skipped++; continue }
    inserts.push({
      id:             uuidv4(),
      distribution_id: distributionId,
      recipient_email: row.email,
      recipient_name:  row.name || '',
      token:           null,
      acknowledged_at: row.acknowledgedAt || nowISO(),
      ip_address:      null,
      method:          'csv_import',
      added_by:        addedBy || 'system',
    })
    imported++
  }
  if (inserts.length > 0) await db('policy_acks').insert(inserts)
  return { imported, skipped }
}

async function deleteAck(id) {
  const db = getDb()
  const existing = await db('policy_acks').where('id', id).first()
  if (!existing) return false
  await db('policy_acks').where('id', id).del()
  return true
}

async function getSummary() {
  const db = getDb()
  const dists = (await db('policy_distributions').where('status', 'active')).map(rowToDist)
  let totalPending = 0
  for (const d of dists) {
    if (d.mode === 'email_campaign') {
      const acks = (await db('policy_acks').where('distribution_id', d.id)).map(rowToAck)
      const confirmed = new Set(acks.filter(a => a.acknowledgedAt).map(a => a.recipientEmail))
      totalPending += d.emailList.filter(e => !confirmed.has(e)).length
    }
  }
  return {
    activeDistributions: dists.length,
    pendingAcks:         totalPending,
  }
}

module.exports = {
  init,
  getDistributions,
  getDistribution,
  getDistributionWithStats,
  getAllDistributionsWithStats,
  createDistribution,
  updateDistribution,
  deleteDistribution,
  getAcksForDistribution,
  getAckByToken,
  prepareEmailAcks,
  confirmByToken,
  addManualAck,
  importAcks,
  deleteAck,
  getSummary,
}
