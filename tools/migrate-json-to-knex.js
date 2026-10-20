#!/usr/bin/env node
'use strict'

const path = require('path')
const fs = require('fs')

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'))

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const { init, getDb, destroy } = require('../server/db/knexDatabase')

const gdprDir = path.join(DATA_DIR, 'gdpr')

function readJson(file, fallback) {
  const p = path.join(DATA_DIR, file)
  if (!fs.existsSync(p)) return fallback !== undefined ? fallback : []
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback !== undefined ? fallback : [] }
}

function readGdpr(file) { return readJson(path.join('gdpr', file)) }

function arr(v) { return JSON.stringify(Array.isArray(v) ? v : []) }
function str(v) { return v != null ? String(v) : '' }
function num(v) { return v != null ? Number(v) : null }
function now() { return new Date().toISOString() }
function jstr(v) { return v != null ? JSON.stringify(v) : '' }

let migrated = 0
let skipped = 0
let errors = 0

async function batchInsert(knex, table, rows, label) {
  if (!rows.length) { console.log(`  ${label}: 0 records – skipped`); return }
  console.log(`  ${label}: ${rows.length} records`)
  for (const row of rows) {
    try {
      const exists = await knex(table).where({ id: row.id }).first()
      if (exists) { skipped++; continue }
      await knex(table).insert(row)
      migrated++
    } catch (e) {
      if (e.message?.includes('duplicate') || e.message?.includes('UNIQUE') || e.code === 'ER_DUP_ENTRY') {
        skipped++
      } else {
        errors++
        console.error(`    ERROR ${table}/${row.id}: ${e.message?.slice(0, 120)}`)
      }
    }
  }
}

async function batchInsertKey(knex, table, rows, key, label) {
  if (!rows.length) { console.log(`  ${label}: 0 records – skipped`); return }
  console.log(`  ${label}: ${rows.length} records`)
  for (const row of rows) {
    try {
      const exists = await knex(table).where(key(row)).first()
      if (exists) { skipped++; continue }
      await knex(table).insert(row)
      migrated++
    } catch (e) {
      if (e.message?.includes('duplicate') || e.message?.includes('UNIQUE') || e.code === 'ER_DUP_ENTRY') {
        skipped++
      } else {
        errors++
        console.error(`    ERROR ${table}: ${e.message?.slice(0, 120)}`)
      }
    }
  }
}

async function main() {
  console.log(`Data dir: ${DATA_DIR}`)
  console.log(`Initializing Knex (${process.env.STORAGE_BACKEND || 'sqlite'})…`)
  const knex = await init()
  console.log('Schema ready.\n')

  try {
    // ── Templates ─────────────────────────────────────────────────────────────
    const templates = readJson('templates.json', [])
    await batchInsert(knex, 'templates', templates.map(t => ({
      id: t.id,
      type: t.type || 'policy',
      language: t.language || 'de',
      title: str(t.title),
      content: str(t.content),
      version: t.version || 1,
      status: t.status || 'draft',
      owner: t.owner || null,
      next_review_date: t.reviewDate || t.nextReviewDate || null,
      parent_id: t.parentId || null,
      sort_order: t.sortOrder || 0,
      created_at: t.createdAt || now(),
      updated_at: t.updatedAt || now(),
      linked_controls: arr(t.linkedControls),
      applicable_entities: arr(t.applicableEntities),
      attachments: arr(t.attachments),
      history: arr(t.history),
      status_history: arr(t.statusHistory),
      deleted_at: t.deletedAt || null,
      deleted_by: t.deletedBy || null,
    })), 'Templates')

    // ── Training ──────────────────────────────────────────────────────────────
    const training = readJson('training.json', [])
    await batchInsert(knex, 'training', training.map(t => ({
      id: t.id,
      title: str(t.title),
      description: str(t.description),
      category: str(t.category),
      status: str(t.status),
      due_date: t.dueDate || null,
      completed_date: t.completedDate || null,
      instructor: str(t.instructor),
      assignees: str(t.assignees),
      applicable_entities: arr(t.applicableEntities),
      evidence: str(t.evidence),
      mandatory: t.mandatory ? 1 : 0,
      created_by: str(t.createdBy),
      created_at: t.createdAt || now(),
      updated_at: t.updatedAt || now(),
      deleted_at: t.deletedAt || null,
    })), 'Training')

    // ── Entities ──────────────────────────────────────────────────────────────
    const entities = readJson('entities.json', [])
    await batchInsert(knex, 'entities', entities.map(e => ({
      id: e.id,
      name: str(e.name),
      short: str(e.short || e.shortCode || ''),
      type: str(e.type),
      parent_id: e.parent || e.parentId || null,
      created_at: e.createdAt || now(),
      updated_at: e.updatedAt || now(),
    })), 'Entities')

    // ── Risks ─────────────────────────────────────────────────────────────────
    const risks = readJson('risks.json', [])
    await batchInsert(knex, 'risks', risks.map(r => ({
      id: r.id,
      title: str(r.title),
      description: str(r.description),
      category: str(r.category),
      likelihood: num(r.probability || r.likelihood) || 2,
      impact: num(r.impact) || 2,
      risk_score: num(r.riskScore) || (num(r.probability || r.likelihood || 2) * num(r.impact || 2)),
      status: str(r.status),
      owner: str(r.owner),
      applicable_entities: arr(r.applicableEntities),
      treatments: jstr(r.treatmentPlans || r.treatments) || '[]',
      created_by: str(r.createdBy),
      created_at: r.createdAt || now(),
      updated_at: r.updatedAt || now(),
      deleted_at: r.deletedAt || null,
    })), 'Risks')

    // ── Goals ─────────────────────────────────────────────────────────────────
    const goals = readJson('goals.json', [])
    await batchInsert(knex, 'goals', goals.map(g => ({
      id: g.id,
      title: str(g.title),
      description: str(g.description),
      category: str(g.category || ''),
      status: str(g.status),
      priority: str(g.priority || 'medium'),
      unit: g.unit || null,
      due_date: g.dueDate || null,
      review_date: g.reviewDate || null,
      owner: str(g.owner),
      applicable_entities: arr(g.applicableEntities),
      linked_controls: arr(g.linkedControls),
      created_by: str(g.createdBy),
      created_at: g.createdAt || now(),
      updated_at: g.updatedAt || now(),
      deleted_at: g.deletedAt || null,
    })), 'Goals')

    // ── Maßnahmen (Register) ─────────────────────────────────────────────────
    const measures = readJson('measures.json', [])
    await batchInsert(knex, 'measures', measures.map((m, i) => ({
      id: m.id,
      ref: str(m.ref) || `M-${String(i + 1).padStart(3, '0')}`,
      title: str(m.title),
      description: str(m.description),
      implementation: str(m.implementation),
      responsible: str(m.responsible),
      due_date: m.dueDate || null,
      review_date: m.reviewDate || null,
      status: str(m.status || 'planned'),
      linked_controls: arr(m.linkedControls),
      linked_findings: arr(m.linkedFindings),
      linked_risks: arr(m.linkedRisks),
      linked_policies: arr(m.linkedPolicies),
      linked_vvt: arr(m.linkedVvt),
      applicable_entities: arr(m.applicableEntities),
      tom: m.tom ? 1 : 0,
      category: str(m.category),
      risk_level: str(m.riskLevel),
      evidence_note: str(m.evidenceNote),
      retention_rule: str(m.retentionRule),
      governance: m.governance ? 1 : 0,
      source: str(m.source),
      source_ref: str(m.sourceRef),
      priority: str(m.priority),
      progress: Number.isFinite(Number(m.progress)) ? Number(m.progress) : 0,
      completed_date: m.completedDate || null,
      notes: str(m.notes),
      owner_email: str(m.ownerEmail),
      entity_id: str(m.entityId),
      attachments: arr(m.attachments),
      created_by: str(m.createdBy || 'system'),
      updated_by: str(m.updatedBy || m.createdBy || 'system'),
      created_at: m.createdAt || now(),
      updated_at: m.updatedAt || now(),
      deleted_at: m.deletedAt || null,
      deleted_by: m.deletedBy || null,
    })), 'Measures')

    // ── Assets ────────────────────────────────────────────────────────────────
    const assets = readJson('assets.json', [])
    await batchInsert(knex, 'assets', assets.map(a => ({
      id: a.id,
      name: str(a.name),
      description: str(a.description),
      category: str(a.category),
      classification: str(a.classification),
      criticality: str(a.criticality),
      owner: str(a.owner),
      location: str(a.location),
      eol_date: a.endOfLifeDate || a.eolDate || null,
      status: str(a.status),
      applicable_entities: arr(a.applicableEntities),
      linked_controls: arr(a.linkedControls),
      created_by: str(a.createdBy),
      created_at: a.createdAt || now(),
      updated_at: a.updatedAt || now(),
      deleted_at: a.deletedAt || null,
    })), 'Assets')

    // ── Suppliers ─────────────────────────────────────────────────────────────
    const suppliers = readJson('suppliers.json', [])
    await batchInsert(knex, 'suppliers', suppliers.map(s => ({
      id: s.id,
      name: str(s.name),
      category: str(s.category || s.type || ''),
      contact: str(s.contact || s.contactName || ''),
      risk_level: str(s.riskLevel || s.criticality || ''),
      status: str(s.status),
      contract_end: s.contractEnd || null,
      next_audit: s.nextAuditDate || s.nextAudit || null,
      notes: str(s.notes),
      applicable_entities: arr(s.applicableEntities),
      linked_controls: arr(s.linkedControls),
      created_by: str(s.createdBy),
      created_at: s.createdAt || now(),
      updated_at: s.updatedAt || now(),
      deleted_at: s.deletedAt || null,
    })), 'Suppliers')

    // ── Guidance ──────────────────────────────────────────────────────────────
    const guidance = readJson('guidance.json', [])
    await batchInsert(knex, 'guidance', guidance.map(g => ({
      id: g.id,
      title: str(g.title),
      category: str(g.category),
      type: str(g.type || ''),
      content: str(g.content),
      file_name: g.fileName || g.file_name || null,
      file_type: g.fileType || g.file_type || null,
      file_size: g.fileSize || g.file_size || null,
      version: g.version || 1,
      min_role: g.minRole || g.min_role || null,
      linked_controls: arr(g.linkedControls || g.linked_controls),
      linked_policies: arr(g.linkedPolicies || g.linked_policies),
      pin_order: g.pinOrder || g.pin_order || 0,
      seed_id: g.seedId || g.seed_id || null,
      created_by: str(g.createdBy || g.created_by),
      created_at: g.createdAt || now(),
      updated_at: g.updatedAt || now(),
      deleted_at: g.deletedAt || null,
      deleted_by: g.deletedBy || null,
    })), 'Guidance')

    // ── SOA Controls ──────────────────────────────────────────────────────────
    const soaData = readJson('soa.json', {})
    const soaRows = []
    for (const [ctrlId, ctrl] of Object.entries(soaData)) {
      if (!ctrl || typeof ctrl !== 'object' || !ctrl.id) continue
      soaRows.push({
        id: ctrl.id || ctrlId,
        framework: str(ctrl.framework || ctrlId.split('-').slice(0, 2).join('-')),
        control_id: ctrlId,
        title: str(ctrl.title || ctrl.name || ''),
        description: str(ctrl.description || ''),
        theme: str(ctrl.theme || ''),
        applicable: ctrl.applicable ? 1 : 0,
        status: str(ctrl.status || ''),
        justification: str(ctrl.justification || ''),
      evidence: jstr(ctrl.evidence) || '',
      owner: str(ctrl.owner || ''),
      applicable_entities: arr(ctrl.applicableEntities),
      linked_templates: arr(ctrl.linkedTemplates || ctrl.templates),
      updated_by: str(ctrl.updatedBy || ''),
      is_custom: ctrl.isCustom ? 1 : 0,
      created_at: ctrl.createdAt || now(),
      updated_at: ctrl.updatedAt || now(),
      })
    }
    await batchInsert(knex, 'soa_controls', soaRows, 'SOA Controls')

    // ── Findings (JSON-blob) ──────────────────────────────────────────────────
    const findings = readJson('findings.json', [])
    await batchInsert(knex, 'findings', findings.map(f => ({
      id: f.id,
      data: JSON.stringify(f),
      created_by: str(f.createdBy),
      created_at: f.createdAt || now(),
      updated_at: f.updatedAt || now(),
      deleted_at: f.deletedAt || null,
    })), 'Findings')

    // ── Public Incidents (JSON-blob) ──────────────────────────────────────────
    const pubIncidents = readJson('public-incidents.json', [])
    await batchInsert(knex, 'public_incidents', pubIncidents.map(i => ({
      id: i.id,
      ref: str(i.refNumber || ''),
      data: JSON.stringify(i),
      submitted_at: i.createdAt || now(),
      deleted_at: i.deletedAt || null,
    })), 'Public Incidents')

    // ── Org Units (JSON-blob) ─────────────────────────────────────────────────
    const orgUnits = readJson('org-units.json', [])
    await batchInsert(knex, 'org_units', orgUnits.map(u => ({
      id: u.id,
      data: JSON.stringify(u),
      created_at: u.createdAt || now(),
      updated_at: u.updatedAt || now(),
    })), 'Org Units')

    // ── BCM (JSON-blob) ───────────────────────────────────────────────────────
    const bcm = readJson('bcm.json', {})
    const bcmRows = []
    for (const bia of (bcm.bia || [])) {
      bcmRows.push({ id: bia.id, bcm_type: 'bia', data: JSON.stringify(bia), created_by: str(bia.createdBy), created_at: bia.createdAt || now(), updated_at: bia.updatedAt || now(), deleted_at: bia.deletedAt || null })
    }
    for (const plan of (bcm.plans || [])) {
      bcmRows.push({ id: plan.id, bcm_type: 'plan', data: JSON.stringify(plan), created_by: str(plan.createdBy), created_at: plan.createdAt || now(), updated_at: plan.updatedAt || now(), deleted_at: plan.deletedAt || null })
    }
    for (const ex of (bcm.exercises || [])) {
      bcmRows.push({ id: ex.id, bcm_type: 'exercise', data: JSON.stringify(ex), created_by: str(ex.createdBy), created_at: ex.createdAt || now(), updated_at: ex.updatedAt || now(), deleted_at: ex.deletedAt || null })
    }
    await batchInsert(knex, 'bcm_entries', bcmRows, 'BCM')

    // ── Governance (JSON-blob) ────────────────────────────────────────────────
    const gov = readJson('governance.json', {})
    const govRows = []
    for (const r of (gov.reviews || [])) {
      govRows.push({ id: r.id, gov_type: 'review', data: JSON.stringify(r), created_by: str(r.createdBy), created_at: r.createdAt || now(), updated_at: r.updatedAt || now(), deleted_at: r.deletedAt || null })
    }
    for (const a of (gov.actions || [])) {
      govRows.push({ id: a.id, gov_type: 'action', data: JSON.stringify(a), created_by: str(a.createdBy), created_at: a.createdAt || now(), updated_at: a.updatedAt || now(), deleted_at: a.deletedAt || null })
    }
    for (const m of (gov.meetings || [])) {
      govRows.push({ id: m.id, gov_type: 'meeting', data: JSON.stringify(m), created_by: str(m.createdBy), created_at: m.createdAt || now(), updated_at: m.updatedAt || now(), deleted_at: m.deletedAt || null })
    }
    await batchInsert(knex, 'governance_entries', govRows, 'Governance')

    // ── GDPR (JSON-blob by type) ──────────────────────────────────────────────
    const gdprMapping = [
      ['vvt', 'vvt'],
      ['av', 'av'],
      ['incidents', 'incident'],
      ['toms', 'tom'],
      ['dsar', 'dsar'],
      ['dsfa', 'dsfa'],
      ['dsb', 'dsb'],
      ['deletionLog', 'deletion_log'],
    ]
    const gdprRows = []
    for (const [file, gdprType] of gdprMapping) {
      const items = readGdpr(`${file}.json`)
      const list = Array.isArray(items) ? items : [items]
      for (const item of list) {
        if (!item || !item.id) continue
        gdprRows.push({
          id: item.id,
          gdpr_type: gdprType,
          data: JSON.stringify(item),
          created_by: str(item.createdBy),
          created_at: item.createdAt || now(),
          updated_at: item.updatedAt || now(),
          deleted_at: item.deletedAt || null,
        })
      }
    }
    await batchInsert(knex, 'gdpr_entries', gdprRows, 'GDPR')

    // ── RBAC Users ────────────────────────────────────────────────────────────
    const rbacData = readJson('rbac_users.json', {})
    const rbacRows = Object.entries(rbacData).map(([key, u]) => ({
      id: key,
      username: u.username || key,
      email: str(u.email),
      domain: str(u.domain || ''),
      role: u.role || 'user',
      functions: jstr(u.functions) || '[]',
      password_hash: u.passwordHash || '',
      totp_secret: u.totpSecret || null,
      totp_enabled: u.totpEnabled ? 1 : 0,
      totp_verified: u.totpVerified ? 1 : 0,
      sections: jstr(u.sections) || '[]',
      created_at: u.createdAt || now(),
      updated_at: u.updatedAt || now(),
    }))
    await batchInsert(knex, 'rbac_users', rbacRows, 'RBAC Users')

    // ── Org Settings (key-value) ──────────────────────────────────────────────
    const orgSettings = readJson('org-settings.json', {})
    const settingsRows = Object.entries(orgSettings).map(([key, value]) => ({
      key_name: key,
      value: JSON.stringify(value),
    }))
    await batchInsertKey(knex, 'org_settings', settingsRows, r => ({ key_name: r.key_name }), 'Org Settings')

    // ── Crossmap ──────────────────────────────────────────────────────────────
    const crossmap = readJson('crossmap.json', [])
    await batchInsertKey(knex, 'custom_lists', crossmap.map(c => ({
      list_id: `crossmap::${c.id}`,
      items: JSON.stringify(c.controls || []),
    })), r => ({ list_id: r.list_id }), 'Crossmap')

    // ── Policy Distributions ──────────────────────────────────────────────────
    const dists = readJson('policy-distributions.json', [])
    await batchInsert(knex, 'policy_distributions', dists.map(d => ({
      id: d.id,
      template_id: d.templateId || '',
      template_title: str(d.templateTitle || ''),
      template_type: str(d.templateType || ''),
      template_version: d.templateVersion || 1,
      mode: d.mode || 'manual',
      target_group: str(d.targetGroup || ''),
      due_date: d.dueDate || null,
      email_list: jstr(d.emailList) || '[]',
      notes: str(d.notes || ''),
      status: d.status || 'active',
      created_at: d.createdAt || now(),
      created_by: str(d.createdBy || ''),
      email_sent_at: d.emailSentAt || null,
      email_sent_count: d.emailSentCount || 0,
    })), 'Policy Distributions')

    // ── Policy Acks ───────────────────────────────────────────────────────────
    const acks = readJson('policy-acks.json', [])
    await batchInsert(knex, 'policy_acks', acks.map(a => ({
      id: a.id,
      distribution_id: a.distributionId || '',
      recipient_email: str(a.recipientEmail || ''),
      recipient_name: str(a.recipientName || ''),
      token: a.token || '',
      acknowledged_at: a.acknowledgedAt || null,
      ip_address: str(a.ipAddress || ''),
      method: str(a.method || ''),
      notes: str(a.notes || ''),
      added_by: str(a.addedBy || ''),
    })), 'Policy Acks')

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`\nMigration complete: ${migrated} inserted, ${skipped} skipped, ${errors} errors.`)
  } finally {
    await destroy()
  }
}

main().catch(e => {
  console.error('Migration failed:', e.message)
  process.exit(1)
})
