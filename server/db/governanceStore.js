// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'

const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'governance.json')

function makeId(prefix) {
  return `${prefix}_${require('crypto').randomBytes(4).toString('hex')}`
}
function nowISO() { return new Date().toISOString() }

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return {
      reviews:  Array.isArray(raw.reviews)  ? raw.reviews  : [],
      actions:  Array.isArray(raw.actions)  ? raw.actions  : [],
      meetings: Array.isArray(raw.meetings) ? raw.meetings : [],
    }
  } catch { return { reviews: [], actions: [], meetings: [] } }
}

function save(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) }

// ─── Reviews ────────────────────────────────────────────────────────────────

function getReviews() {
  return load().reviews.filter(r => !r.deletedAt)
}

function getReviewById(id) {
  return load().reviews.find(r => r.id === id && !r.deletedAt) || null
}

function createReview(fields, { createdBy } = {}) {
  const data = load()
  const item = {
    id:                        makeId('mgmt'),
    title:                     fields.title                     || 'Ohne Titel',
    type:                      fields.type                      || 'annual',
    date:                      fields.date                      || '',
    nextReviewDate:            fields.nextReviewDate            || '',
    status:                    fields.status                    || 'planned',
    chair:                     fields.chair                     || '',
    participants:              fields.participants              || '',
    inputAuditResults:         fields.inputAuditResults         || '',
    inputStakeholderFeedback:  fields.inputStakeholderFeedback  || '',
    inputPerformance:          fields.inputPerformance          || '',
    inputNonconformities:      fields.inputNonconformities      || '',
    inputPreviousActions:      fields.inputPreviousActions      || '',
    inputRisksOpportunities:   fields.inputRisksOpportunities   || '',
    inputExternalChanges:      fields.inputExternalChanges      || '',
    decisions:                 fields.decisions                 || '',
    improvements:              fields.improvements              || '',
    resourceNeeds:             fields.resourceNeeds             || '',
    notes:                     fields.notes                     || '',
    linkedControls:            Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies:            Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdAt:                 nowISO(),
    updatedAt:                 nowISO(),
    createdBy:                 createdBy || 'system',
    deletedAt:                 null,
  }
  data.reviews.push(item)
  save(data)
  return item
}

function updateReview(id, patch, { changedBy } = {}) {
  const data = load()
  const idx  = data.reviews.findIndex(r => r.id === id && !r.deletedAt)
  if (idx < 0) return null
  const allowed = ['title','type','date','nextReviewDate','status','chair','participants',
    'inputAuditResults','inputStakeholderFeedback','inputPerformance','inputNonconformities',
    'inputPreviousActions','inputRisksOpportunities','inputExternalChanges',
    'decisions','improvements','resourceNeeds','notes','linkedControls','linkedPolicies']
  for (const k of allowed) {
    if (patch[k] !== undefined) data.reviews[idx][k] = patch[k]
  }
  data.reviews[idx].updatedAt = nowISO()
  if (changedBy) data.reviews[idx].updatedBy = changedBy
  save(data)
  return data.reviews[idx]
}

function deleteReview(id) {
  const data = load()
  const idx  = data.reviews.findIndex(r => r.id === id && !r.deletedAt)
  if (idx < 0) return false
  data.reviews[idx].deletedAt = nowISO()
  save(data)
  return true
}

// ─── Actions ────────────────────────────────────────────────────────────────

// Maßnahmen liegen im zentralen Maßnahmen-Register (1.80), siehe governanceActions.js
const { getActions, getActionById, createAction, updateAction, deleteAction } = require('./governanceActions')

// ─── Meetings ───────────────────────────────────────────────────────────────

function getMeetings() {
  return load().meetings.filter(m => !m.deletedAt)
}

function getMeetingById(id) {
  return load().meetings.find(m => m.id === id && !m.deletedAt) || null
}

function createMeeting(fields, { createdBy } = {}) {
  const data = load()
  const item = {
    id:              makeId('meet'),
    title:           fields.title           || 'Ohne Titel',
    committee:       fields.committee       || 'isms_committee',
    date:            fields.date            || '',
    location:        fields.location        || '',
    chair:           fields.chair           || '',
    secretary:       fields.secretary       || '',
    participants:    fields.participants    || '',
    agenda:          fields.agenda          || '',
    decisions:       fields.decisions       || '',
    nextMeetingDate: fields.nextMeetingDate || '',
    approved:        fields.approved        === true,
    approvedBy:      fields.approvedBy      || '',
    notes:           fields.notes           || '',
    linkedControls:  Array.isArray(fields.linkedControls) ? fields.linkedControls : [],
    linkedPolicies:  Array.isArray(fields.linkedPolicies) ? fields.linkedPolicies : [],
    createdAt:       nowISO(),
    updatedAt:       nowISO(),
    createdBy:       createdBy || 'system',
    deletedAt:       null,
  }
  data.meetings.push(item)
  save(data)
  return item
}

function updateMeeting(id, patch, { changedBy } = {}) {
  const data = load()
  const idx  = data.meetings.findIndex(m => m.id === id && !m.deletedAt)
  if (idx < 0) return null
  const allowed = ['title','committee','date','location','chair','secretary','participants',
    'agenda','decisions','nextMeetingDate','approved','approvedBy','notes',
    'linkedControls','linkedPolicies']
  for (const k of allowed) {
    if (patch[k] !== undefined) data.meetings[idx][k] = patch[k]
  }
  data.meetings[idx].updatedAt = nowISO()
  if (changedBy) data.meetings[idx].updatedBy = changedBy
  save(data)
  return data.meetings[idx]
}

function deleteMeeting(id) {
  const data = load()
  const idx  = data.meetings.findIndex(m => m.id === id && !m.deletedAt)
  if (idx < 0) return false
  data.meetings[idx].deletedAt = nowISO()
  save(data)
  return true
}

// ─── Summary ────────────────────────────────────────────────────────────────

function getSummary() {
  const data    = load()
  const reviews = data.reviews.filter(r => !r.deletedAt)
  const actions = getActions()
  const meetings = data.meetings.filter(m => !m.deletedAt)

  const today = new Date().toISOString().slice(0, 10)
  const in90  = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  // Reviews summary
  const revPlanned   = reviews.filter(r => r.status === 'planned').length
  const revCompleted = reviews.filter(r => r.status === 'completed').length
  const revApproved  = reviews.filter(r => r.status === 'approved').length
  const nextPlanned  = reviews
    .filter(r => r.status === 'planned' && r.date)
    .map(r => r.date)
    .sort()[0] || null

  // Actions summary
  const actOpen       = actions.filter(a => a.status === 'open').length
  const actInProgress = actions.filter(a => a.status === 'in_progress').length
  const actCompleted  = actions.filter(a => a.status === 'completed').length
  const actOverdue    = actions.filter(a =>
    (a.status === 'open' || a.status === 'in_progress') &&
    a.dueDate && a.dueDate < today
  ).length
  const actCritical   = actions.filter(a =>
    a.priority === 'critical' && (a.status === 'open' || a.status === 'in_progress')
  ).length

  // Meetings summary
  const upcomingMeetings = meetings.filter(m => m.date && m.date >= today && m.date <= in90).length
  const pastDates = meetings.filter(m => m.date && m.date < today).map(m => m.date).sort()
  const lastMeeting = pastDates[pastDates.length - 1] || null

  return {
    reviews: {
      total:       reviews.length,
      planned:     revPlanned,
      completed:   revCompleted,
      approved:    revApproved,
      nextPlanned,
    },
    actions: {
      total:      actions.length,
      open:       actOpen,
      inProgress: actInProgress,
      completed:  actCompleted,
      overdue:    actOverdue,
      critical:   actCritical,
    },
    meetings: {
      total:       meetings.length,
      upcoming:    upcomingMeetings,
      lastMeeting,
    },
  }
}

const _jsonExports = {
  getReviews, getReviewById, createReview, updateReview, deleteReview,
  getActions, getActionById, createAction, updateAction, deleteAction,
  getMeetings, getMeetingById, createMeeting, updateMeeting, deleteMeeting,
  getSummary,
}

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/governanceStore')
  _knex.init().catch(e => console.error('[governanceStore] Knex init:', e.message))
  module.exports = _knex
} else {
  module.exports = _jsonExports
}
