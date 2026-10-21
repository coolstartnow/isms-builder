// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
// Policy Acknowledgement Store
// Manages policy distribution campaigns and individual acknowledgements.

const fs   = require('fs')
const path = require('path')

const { randomToken } = require('../secureToken')
function uuidv4() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DIST_FILE = path.join(_BASE, 'policy-distributions.json')
const ACKS_FILE = path.join(_BASE, 'policy-acks.json')

function nowISO() { return new Date().toISOString() }

// ── File I/O ─────────────────────────────────────────────────────────────────

function loadDist() {
  try { if (fs.existsSync(DIST_FILE)) return JSON.parse(fs.readFileSync(DIST_FILE, 'utf8')) } catch {}
  return []
}
function saveDist(data) { fs.writeFileSync(DIST_FILE, JSON.stringify(data, null, 2)) }

function loadAcks() {
  try { if (fs.existsSync(ACKS_FILE)) return JSON.parse(fs.readFileSync(ACKS_FILE, 'utf8')) } catch {}
  return []
}
function saveAcks(data) { fs.writeFileSync(ACKS_FILE, JSON.stringify(data, null, 2)) }

// ── Distributions ─────────────────────────────────────────────────────────────

function getDistributions() {
  return loadDist()
}

function getDistribution(id) {
  return loadDist().find(d => d.id === id) || null
}

/**
 * Create a new distribution campaign.
 * mode is taken from org settings (passed in by the route, not chosen by user).
 */
function createDistribution({ templateId, templateTitle, templateType, templateVersion, mode, targetGroup, dueDate, emailList, notes, createdBy }) {
  const dists = loadDist()
  const dist = {
    id:              uuidv4(),
    templateId,
    templateTitle:   templateTitle || '',
    templateType:    templateType  || 'Policy',
    templateVersion: templateVersion || 1,
    mode,                           // 'email_campaign' | 'manual' | 'distribution_only'
    targetGroup:     targetGroup || '',
    dueDate:         dueDate     || null,
    emailList:       emailList   || [],  // only used for mode=email_campaign
    notes:           notes       || '',
    status:          'active',
    createdAt:       nowISO(),
    createdBy:       createdBy   || 'system',
    emailSentAt:     null,
    emailSentCount:  0,
  }
  dists.push(dist)
  saveDist(dists)
  return dist
}

function updateDistribution(id, patch) {
  const dists = loadDist()
  const idx = dists.findIndex(d => d.id === id)
  if (idx === -1) return null
  dists[idx] = { ...dists[idx], ...patch }
  saveDist(dists)
  return dists[idx]
}

function deleteDistribution(id) {
  const dists = loadDist()
  const idx = dists.findIndex(d => d.id === id)
  if (idx === -1) return false
  dists.splice(idx, 1)
  saveDist(dists)
  // Remove all acks for this distribution
  const acks = loadAcks().filter(a => a.distributionId !== id)
  saveAcks(acks)
  return true
}

/** Enrich a distribution with ack stats */
function withStats(dist) {
  const acks = loadAcks().filter(a => a.distributionId === dist.id)
  const confirmed = acks.filter(a => a.acknowledgedAt)
  const pending   = dist.mode === 'email_campaign'
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

function getDistributionWithStats(id) {
  const dist = getDistribution(id)
  if (!dist) return null
  return withStats(dist)
}

function getAllDistributionsWithStats() {
  return loadDist().map(withStats)
}

// ── Acknowledgements ──────────────────────────────────────────────────────────

function getAcksForDistribution(distributionId) {
  return loadAcks().filter(a => a.distributionId === distributionId)
}

function getAckByToken(token) {
  return loadAcks().find(a => a.token === token) || null
}

/**
 * Prepare ack records for an email campaign (one per email address).
 * Idempotent: skips addresses that already have a record.
 */
function prepareEmailAcks(distributionId, emailList) {
  const acks = loadAcks()
  const existing = acks.filter(a => a.distributionId === distributionId)
  const existingEmails = new Set(existing.map(a => a.recipientEmail))

  let added = 0
  for (const email of emailList) {
    if (existingEmails.has(email)) continue
    acks.push({
      id:              uuidv4(),
      distributionId,
      recipientEmail:  email,
      recipientName:   '',
      token:           randomToken(),   // geheim: kryptografischer Zufall (GHSA-vf3w-pmvj-x8mc)
      acknowledgedAt:  null,
      ipAddress:       null,
      method:          'email_link',
    })
    added++
  }
  saveAcks(acks)
  return added
}

/**
 * Record a confirmation via token link (public, no auth).
 * Returns the updated ack record or null if token not found / already confirmed.
 */
function confirmByToken(token, { recipientName, ipAddress } = {}) {
  const acks = loadAcks()
  const idx = acks.findIndex(a => a.token === token)
  if (idx === -1) return null
  if (acks[idx].acknowledgedAt) return acks[idx]  // already confirmed — return existing
  acks[idx].acknowledgedAt = nowISO()
  acks[idx].ipAddress      = ipAddress || null
  if (recipientName) acks[idx].recipientName = recipientName
  saveAcks(acks)
  return acks[idx]
}

/**
 * Add a manual acknowledgement (mode=manual or mode=distribution_only not needed,
 * used when admin manually records that someone confirmed).
 */
function addManualAck({ distributionId, recipientEmail, recipientName, acknowledgedAt, notes, addedBy }) {
  const dist = getDistribution(distributionId)
  if (!dist) return null
  const acks = loadAcks()
  const ack = {
    id:             uuidv4(),
    distributionId,
    recipientEmail: recipientEmail || '',
    recipientName:  recipientName  || '',
    token:          null,
    acknowledgedAt: acknowledgedAt || nowISO(),
    ipAddress:      null,
    method:         'manual',
    notes:          notes   || '',
    addedBy:        addedBy || 'system',
  }
  acks.push(ack)
  saveAcks(acks)
  return ack
}

/**
 * Bulk import from CSV array: [{ email, name, acknowledgedAt }]
 */
function importAcks(distributionId, rows, addedBy) {
  const dist = getDistribution(distributionId)
  if (!dist) return { imported: 0, skipped: 0 }
  const acks = loadAcks()
  let imported = 0, skipped = 0
  for (const row of rows) {
    if (!row.email) { skipped++; continue }
    acks.push({
      id:             uuidv4(),
      distributionId,
      recipientEmail: row.email,
      recipientName:  row.name || '',
      token:          null,
      acknowledgedAt: row.acknowledgedAt || nowISO(),
      ipAddress:      null,
      method:         'csv_import',
      addedBy:        addedBy || 'system',
    })
    imported++
  }
  saveAcks(acks)
  return { imported, skipped }
}

function deleteAck(id) {
  const acks = loadAcks()
  const idx = acks.findIndex(a => a.id === id)
  if (idx === -1) return false
  acks.splice(idx, 1)
  saveAcks(acks)
  return true
}

/** Summary for dashboard: how many active distributions have pending acks */
function getSummary() {
  const dists = loadDist().filter(d => d.status === 'active')
  const acks  = loadAcks()
  let totalPending = 0
  for (const d of dists) {
    if (d.mode === 'email_campaign') {
      const confirmed = new Set(
        acks.filter(a => a.distributionId === d.id && a.acknowledgedAt).map(a => a.recipientEmail)
      )
      totalPending += d.emailList.filter(e => !confirmed.has(e)).length
    }
  }
  return {
    activeDistributions: dists.length,
    pendingAcks:         totalPending,
  }
}

const _jsonExports = {
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

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/ackStore')
  _knex.init().catch(e => console.error('[ackStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
