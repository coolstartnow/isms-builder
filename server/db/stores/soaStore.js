// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'

const { getDb } = require('../knexDatabase')

const FRAMEWORKS = {
  ISO27001: { id: 'ISO27001', label: 'ISO 27001:2022',      color: '#4f8cff' },
  BSI:      { id: 'BSI',      label: 'BSI IT-Grundschutz',  color: '#f0b429' },
  NIS2:     { id: 'NIS2',     label: 'EU NIS2',             color: '#34d399' },
  EUCS:     { id: 'EUCS',     label: 'EU Cloud (EUCS)',     color: '#a78bfa' },
  EUAI:     { id: 'EUAI',     label: 'EU AI Act',           color: '#fb923c' },
  ISO9000:  { id: 'ISO9000',  label: 'ISO 9000:2015',       color: '#2dd4bf' },
  ISO9001:  { id: 'ISO9001',  label: 'ISO 9001:2015',       color: '#f472b6' },
  CRA:      { id: 'CRA',      label: 'EU Cyber Resilience Act', color: '#e11d48' },
  CUSTOM:   { id: 'CUSTOM',   label: 'Custom Controls',         color: '#64748b' },
}

const IMPLEMENTATION_STATUSES = ['not_started', 'partial', 'implemented', 'optimized']

function _parse(val, fallback) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToObj(row) {
  if (!row) return null
  return {
    id:                 row.id,
    framework:          row.framework,
    controlId:          row.control_id || row.id,
    theme:              row.theme,
    title:              row.title,
    description:        row.description || '',
    applicable:         !!row.applicable,
    status:             row.status || 'not_started',
    owner:              row.owner || '',
    justification:      row.justification || '',
    evidence:           row.evidence || '',
    applicableEntities: _parse(row.applicable_entities, []),
    linkedTemplates:    _parse(row.linked_templates, []),
    updatedAt:          row.updated_at,
    updatedBy:          row.updated_by || 'system',
    isCustom:           !!row.is_custom,
    createdAt:          row.created_at,
  }
}

// Eingebaute Controls (BSI, NIS2, EUCS, EU AI Act, CRA und – falls vorhanden – die eigene data/iso-controls.json).
// Die Liste liefert server/db/soaStore.js (gleiche Quelle wie das JSON-Backend), damit beide Backends dasselbe anlegen (#98).
let _seedControls = []
function setSeedControls(list) { _seedControls = Array.isArray(list) ? list : [] }

async function init() {
  await getDb()
}

// Legt fehlende eingebaute Controls an, ergänzt also auch neue Frameworks nach einem Update. Idempotent und ohne bestehende
// Controls zu verändern (Anpassungen der Nutzer bleiben erhalten) – wie JSON-`load()`. Muss nach knexDatabase.init() laufen
// (server/index.js: bootstrap → seedAll).
async function seedBuiltIn() {
  if (!_seedControls.length) return { added: 0 }
  const db = getDb()
  const have = new Set((await db('soa_controls').select('id')).map(r => r.id))
  const now = new Date().toISOString()
  const rows = _seedControls.filter(c => c && c.id && !have.has(c.id)).map(c => ({
    id: c.id,
    framework: c.framework,
    control_id: c.controlId || c.id,
    title: c.title || '',
    description: c.description || '',
    theme: c.theme || '',
    applicable: true,
    status: 'not_started',
    owner: '',
    justification: '',
    evidence: '',
    applicable_entities: '[]',
    linked_templates: '[]',
    updated_by: 'system',
    is_custom: false,
    created_at: now,
    updated_at: now,
  }))
  // in Blöcken: SQLite erlaubt höchstens 999 Platzhalter je Anweisung (17 Spalten × 40 Zeilen = 680)
  for (let i = 0; i < rows.length; i += 40) await db('soa_controls').insert(rows.slice(i, i + 40))
  return { added: rows.length }
}

async function getFrameworks() {
  return Object.values(FRAMEWORKS)
}

async function getAll({ framework, theme } = {}) {
  const db = getDb()
  let q = db('soa_controls')
  if (framework) q = q.where('framework', framework)
  if (theme)     q = q.where('theme', theme)
  const rows = await q
  return rows.map(rowToObj)
}

async function getById(id) {
  const db = getDb()
  const row = await db('soa_controls').where('id', id).first()
  return row ? rowToObj(row) : null
}

async function update(id, fields, { changedBy } = {}) {
  const db = getDb()
  const existing = await db('soa_controls').where('id', id).first()
  if (!existing) return null
  const patch = { updated_at: new Date().toISOString(), updated_by: changedBy || 'unknown' }
  const allowed = ['applicable', 'status', 'owner', 'justification', 'linkedTemplates', 'applicableEntities']
  if (fields.applicable !== undefined)        patch.applicable = !!fields.applicable
  if (fields.status !== undefined)            patch.status = fields.status
  if (fields.owner !== undefined)             patch.owner = fields.owner
  if (fields.justification !== undefined)     patch.justification = fields.justification
  if (fields.linkedTemplates !== undefined)   patch.linked_templates = JSON.stringify(fields.linkedTemplates)
  if (fields.applicableEntities !== undefined) patch.applicable_entities = JSON.stringify(fields.applicableEntities)
  await db('soa_controls').where('id', id).update(patch)
  return await getById(id)
}

async function addLinkedTemplate(controlId, templateId) {
  const ctrl = await getById(controlId)
  if (!ctrl) return null
  const lt = ctrl.linkedTemplates || []
  if (!lt.includes(templateId)) {
    lt.push(templateId)
    const db = getDb()
    await db('soa_controls').where('id', controlId).update({
      linked_templates: JSON.stringify(lt),
      updated_at: new Date().toISOString(),
    })
  }
  return await getById(controlId)
}

async function removeLinkedTemplate(controlId, templateId) {
  const ctrl = await getById(controlId)
  if (!ctrl) return null
  const lt = (ctrl.linkedTemplates || []).filter(t => t !== templateId)
  const db = getDb()
  await db('soa_controls').where('id', controlId).update({
    linked_templates: JSON.stringify(lt),
    updated_at: new Date().toISOString(),
  })
  return await getById(controlId)
}

async function getSummary(framework) {
  const frameworks = framework ? [framework] : Object.keys(FRAMEWORKS)
  const db = getDb()
  const result = {}
  for (const fw of frameworks) {
    const rows = await db('soa_controls').where('framework', fw)
    const controls = rows.map(rowToObj)
    const applicable = controls.filter(c => c.applicable)
    const byStatus = { not_started: 0, partial: 0, implemented: 0, optimized: 0 }
    for (const c of applicable) {
      if (byStatus[c.status] !== undefined) byStatus[c.status]++
    }
    result[fw] = {
      framework: fw,
      label: FRAMEWORKS[fw]?.label || fw,
      color: FRAMEWORKS[fw]?.color || '#888',
      total: controls.length,
      applicable: applicable.length,
      notApplicable: controls.length - applicable.length,
      byStatus,
      implementationRate: applicable.length > 0
        ? Math.round((byStatus.implemented + byStatus.optimized) / applicable.length * 100)
        : 0,
    }
  }
  return framework ? result[framework] : result
}

async function createCustomControl(body, { changedBy } = {}) {
  const title = (body.title || '').trim()
  if (!title) throw new Error('title required')
  const now = new Date().toISOString()
  const id = 'CUSTOM-' + Date.now()
  const db = getDb()
  await db('soa_controls').insert({
    id,
    framework: 'CUSTOM',
    control_id: id,
    title,
    description: (body.description || '').trim(),
    theme: (body.theme || 'Custom').trim(),
    applicable: true,
    status: 'not_started',
    owner: (body.owner || '').trim(),
    justification: (body.justification || '').trim(),
    evidence: '',
    applicable_entities: '[]',
    linked_templates: '[]',
    updated_by: changedBy || 'unknown',
    is_custom: true,
    created_at: now,
    updated_at: now,
  })
  return await getById(id)
}

async function updateCustomControl(id, body, { changedBy } = {}) {
  const existing = await getById(id)
  if (!existing || !existing.isCustom) return null
  const patch = { updated_at: new Date().toISOString(), updated_by: changedBy || 'unknown' }
  const allowed = ['title', 'theme', 'description', 'owner', 'applicable', 'status', 'justification', 'linkedTemplates', 'applicableEntities']
  if (body.title !== undefined)              patch.title = body.title
  if (body.theme !== undefined)              patch.theme = body.theme
  if (body.description !== undefined)        patch.description = body.description
  if (body.owner !== undefined)              patch.owner = body.owner
  if (body.applicable !== undefined)         patch.applicable = !!body.applicable
  if (body.status !== undefined)             patch.status = body.status
  if (body.justification !== undefined)      patch.justification = body.justification
  if (body.linkedTemplates !== undefined)    patch.linked_templates = JSON.stringify(body.linkedTemplates)
  if (body.applicableEntities !== undefined) patch.applicable_entities = JSON.stringify(body.applicableEntities)
  const db = getDb()
  await db('soa_controls').where('id', id).update(patch)
  return await getById(id)
}

async function deleteCustomControl(id) {
  const ctrl = await getById(id)
  if (!ctrl)           return { ok: false, reason: 'not_found' }
  if (!ctrl.isCustom)  return { ok: false, reason: 'not_custom' }
  if ((ctrl.linkedTemplates || []).length > 0) return { ok: false, reason: 'has_links' }
  const db = getDb()
  await db('soa_controls').where('id', id).del()
  return { ok: true }
}

module.exports = {
  init,
  setSeedControls,
  seedBuiltIn,
  getFrameworks,
  getAll,
  getById,
  update,
  addLinkedTemplate,
  removeLinkedTemplate,
  getSummary,
  createCustomControl,
  updateCustomControl,
  deleteCustomControl,
  FRAMEWORKS,
  IMPLEMENTATION_STATUSES,
}
