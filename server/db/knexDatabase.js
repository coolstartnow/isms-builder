// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'

const knex = require('knex')
const path = require('path')
const fs = require('fs')

let _knex = null
let _initPromise = null

function getDb() {
  if (!_initPromise) throw new Error('[knexDatabase] Not initialized. Call init() first.')
  if (!_knex) throw new Error('[knexDatabase] Still initializing. Await init() first.')
  return _knex
}

function clientType() {
  return _knex ? _knex.client.config.client : null
}

function _buildConfig() {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

  if (backend === 'sqlite') {
    const dbDir = process.env.DATA_DIR || path.join(__dirname, '../../data')
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
    return {
      client: 'better-sqlite3',
      connection: { filename: path.join(dbDir, 'isms.db') },
      useNullAsDefault: true,
    }
  }

  if (backend === 'mariadb' || backend === 'mysql') {
    return {
      client: 'mysql2',
      connection: process.env.DATABASE_URL || {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'isms',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'isms_builder',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      },
      pool: { min: 0, max: 10 },
    }
  }

  if (backend === 'postgres' || backend === 'pg') {
    return {
      client: 'pg',
      connection: process.env.DATABASE_URL || {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'isms',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'isms_builder',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      },
      pool: { min: 0, max: 10 },
    }
  }

  throw new Error(`[knexDatabase] Unsupported STORAGE_BACKEND: ${backend}`)
}

function autoId(t) {
  if (clientType() === 'pg') {
    t.specificType('id', 'INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY')
  } else {
    t.increments('id').primary()
  }
}

const TABLES = {
  templates(t) {
    t.string('id', 120).primary()
    t.string('type', 80).notNullable()
    t.string('language', 10).notNullable().defaultTo('de')
    t.string('title', 512).notNullable().defaultTo('')
    t.text('content').notNullable().defaultTo('')
    t.integer('version').notNullable().defaultTo(1)
    t.string('status', 30).notNullable().defaultTo('draft')
    t.string('owner', 120).nullable()
    t.string('next_review_date', 20).nullable()
    t.string('parent_id', 120).nullable()
    t.integer('sort_order').notNullable().defaultTo(0)
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.text('linked_controls').notNullable().defaultTo('[]')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('attachments').notNullable().defaultTo('[]')
    t.text('history').notNullable().defaultTo('[]')
    t.text('status_history').notNullable().defaultTo('[]')
    t.string('deleted_at', 30).nullable()
    t.string('deleted_by', 120).nullable()
    t.text('webdav_publish').nullable()
    t.index('type', 'idx_template_type')
    t.index('status', 'idx_template_status')
    t.index('parent_id', 'idx_template_parent')
    t.index('deleted_at', 'idx_template_deleted')
  },

  training(t) {
    t.string('id', 120).primary()
    t.string('title', 512).notNullable().defaultTo('')
    t.text('description').notNullable().defaultTo('')
    t.string('category', 80).notNullable().defaultTo('other')
    t.string('status', 30).notNullable().defaultTo('planned')
    t.string('due_date', 20).nullable()
    t.string('completed_date', 20).nullable()
    t.string('instructor', 120).notNullable().defaultTo('')
    t.text('assignees').notNullable().defaultTo('')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('evidence').notNullable().defaultTo('')
    t.boolean('mandatory').notNullable().defaultTo(false)
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  entities(t) {
    t.string('id', 120).primary()
    t.string('name', 256).notNullable()
    t.string('short', 30).notNullable().defaultTo('')
    t.string('type', 50).notNullable().defaultTo('subsidiary')
    t.string('parent_id', 120).nullable()
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
  },

  soa_controls(t) {
    t.string('id', 120).primary()
    t.string('framework', 50).notNullable().defaultTo('ISO27001')
    t.string('control_id', 50).notNullable().defaultTo('')
    t.string('title', 512).notNullable().defaultTo('')
    t.text('description').notNullable().defaultTo('')
    t.string('theme', 80).notNullable().defaultTo('')
    t.boolean('applicable').notNullable().defaultTo(true)
    t.string('status', 50).notNullable().defaultTo('not_started')
    t.text('justification').notNullable().defaultTo('')
    t.text('evidence').notNullable().defaultTo('')
    t.string('owner', 120).notNullable().defaultTo('')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('linked_templates').notNullable().defaultTo('[]')
    t.string('updated_by', 120).notNullable().defaultTo('system')
    t.boolean('is_custom').notNullable().defaultTo(false)
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.index('framework', 'idx_soa_framework')
  },

  guidance(t) {
    t.string('id', 120).primary()
    t.string('title', 512).notNullable().defaultTo('')
    t.string('category', 80).notNullable().defaultTo('systemhandbuch')
    t.string('type', 30).notNullable().defaultTo('markdown')
    t.text('content').notNullable().defaultTo('')
    t.string('file_name', 256).nullable()
    t.string('file_type', 80).nullable()
    t.integer('file_size').nullable()
    t.integer('version').notNullable().defaultTo(1)
    t.string('min_role', 30).nullable()
    t.text('linked_controls').notNullable().defaultTo('[]')
    t.text('linked_policies').notNullable().defaultTo('[]')
    t.integer('pin_order').nullable()
    t.string('seed_id', 120).nullable()
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
    t.string('deleted_by', 120).nullable()
    t.index('category', 'idx_guidance_category')
    t.index('seed_id', 'idx_guidance_seed')
  },

  risks(t) {
    t.string('id', 120).primary()
    t.string('title', 512).notNullable().defaultTo('')
    t.text('description').notNullable().defaultTo('')
    t.string('category', 80).notNullable().defaultTo('other')
    t.integer('likelihood').notNullable().defaultTo(2)
    t.integer('impact').notNullable().defaultTo(2)
    t.integer('risk_score').notNullable().defaultTo(4)
    t.string('status', 30).notNullable().defaultTo('open')
    t.string('owner', 120).notNullable().defaultTo('')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('treatments').notNullable().defaultTo('[]')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  gdpr_entries(t) {
    t.string('id', 120).primary()
    t.string('gdpr_type', 30).notNullable().defaultTo('vvt')
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
    t.index('gdpr_type', 'idx_gdpr_type')
  },

  gdpr_deletion_log(t) {
    t.string('id', 120).primary()
    t.text('data').notNullable().defaultTo('{}')
    t.string('deleted_by', 120).notNullable().defaultTo('system')
    t.string('deleted_at', 30).notNullable()
  },

  rbac_users(t) {
    t.string('id', 120).primary()
    t.string('username', 120).notNullable().unique()
    t.string('email', 256).notNullable()
    t.string('domain', 80).notNullable().defaultTo('Global')
    t.string('role', 30).notNullable().defaultTo('reader')
    t.text('functions').notNullable().defaultTo('[]')
    t.string('password_hash', 256).notNullable()
    t.string('totp_secret', 256).nullable()
    t.boolean('totp_enabled').notNullable().defaultTo(false)
    t.boolean('totp_verified').notNullable().defaultTo(false)
    t.text('sections').notNullable().defaultTo('[]')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.index('username', 'idx_rbac_username')
  },

  org_settings(t) {
    t.string('key_name', 120).primary()
    t.text('value').notNullable()
  },

  audit_log(t) {
    autoId(t)
    t.string('ts', 30).notNullable()
    t.string('user_email', 256).nullable()
    t.string('action', 80).notNullable()
    t.string('resource', 80).nullable()
    t.string('resource_id', 120).nullable()
    t.text('detail').nullable()
    t.index('ts', 'idx_audit_ts')
    t.index('user_email', 'idx_audit_user')
    t.index('resource', 'idx_audit_resource')
  },

  goals(t) {
    t.string('id', 120).primary()
    t.string('title', 512).notNullable().defaultTo('')
    t.text('description').notNullable().defaultTo('')
    t.string('category', 80).notNullable().defaultTo('other')
    t.string('status', 30).notNullable().defaultTo('active')
    t.string('priority', 20).notNullable().defaultTo('medium')
    t.float('target_value').nullable()
    t.float('current_value').nullable()
    t.string('unit', 30).nullable()
    t.string('due_date', 20).nullable()
    t.string('review_date', 20).nullable()
    t.string('owner', 120).notNullable().defaultTo('')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('linked_controls').notNullable().defaultTo('[]')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  assets(t) {
    t.string('id', 120).primary()
    t.string('name', 512).notNullable().defaultTo('')
    t.text('description').notNullable().defaultTo('')
    t.string('category', 80).notNullable().defaultTo('other')
    t.string('classification', 50).notNullable().defaultTo('internal')
    t.string('criticality', 30).notNullable().defaultTo('medium')
    t.string('owner', 120).notNullable().defaultTo('')
    t.string('location', 256).notNullable().defaultTo('')
    t.string('eol_date', 20).nullable()
    t.string('status', 30).notNullable().defaultTo('active')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('linked_controls').notNullable().defaultTo('[]')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  suppliers(t) {
    t.string('id', 120).primary()
    t.string('name', 512).notNullable().defaultTo('')
    t.string('category', 80).notNullable().defaultTo('other')
    t.string('contact', 256).notNullable().defaultTo('')
    t.string('risk_level', 20).notNullable().defaultTo('medium')
    t.string('status', 30).notNullable().defaultTo('active')
    t.string('contract_end', 20).nullable()
    t.string('next_audit', 20).nullable()
    t.text('notes').notNullable().defaultTo('')
    t.text('applicable_entities').notNullable().defaultTo('[]')
    t.text('linked_controls').notNullable().defaultTo('[]')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  bcm_entries(t) {
    t.string('id', 120).primary()
    t.string('bcm_type', 30).notNullable().defaultTo('bia')
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
    t.index('bcm_type', 'idx_bcm_type')
  },

  legal_entries(t) {
    t.string('id', 120).primary()
    t.string('legal_type', 30).notNullable().defaultTo('contract')
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
    t.index('legal_type', 'idx_legal_type')
  },

  governance_entries(t) {
    t.string('id', 120).primary()
    t.string('gov_type', 30).notNullable().defaultTo('review')
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
    t.index('gov_type', 'idx_gov_type')
  },

  public_incidents(t) {
    t.string('id', 120).primary()
    t.string('ref', 30).notNullable()
    t.text('data').notNullable().defaultTo('{}')
    t.string('submitted_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  findings(t) {
    t.string('id', 120).primary()
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  // Audit-Verwaltung (#Audit-Modul): ein Dokument pro Zeile, wie findings
  audits(t) {
    t.string('id', 120).primary()
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  audit_programs(t) {
    t.string('id', 120).primary()
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
    t.string('deleted_at', 30).nullable()
  },

  org_units(t) {
    t.string('id', 120).primary()
    t.text('data').notNullable().defaultTo('{}')
    t.string('created_at', 30).notNullable()
    t.string('updated_at', 30).notNullable()
  },

  custom_lists(t) {
    t.string('list_id', 120).primary()
    t.text('items').notNullable().defaultTo('[]')
  },

  policy_distributions(t) {
    t.string('id', 120).primary()
    t.string('template_id', 120).notNullable().defaultTo('')
    t.string('template_title', 512).notNullable().defaultTo('')
    t.string('template_type', 80).notNullable().defaultTo('Policy')
    t.integer('template_version').notNullable().defaultTo(1)
    t.string('mode', 30).notNullable().defaultTo('manual')
    t.string('target_group', 256).notNullable().defaultTo('')
    t.string('due_date', 20).nullable()
    t.text('email_list').notNullable().defaultTo('[]')
    t.text('notes').notNullable().defaultTo('')
    t.string('status', 30).notNullable().defaultTo('active')
    t.string('created_at', 30).notNullable()
    t.string('created_by', 120).notNullable().defaultTo('system')
    t.string('email_sent_at', 30).nullable()
    t.integer('email_sent_count').notNullable().defaultTo(0)
    t.index('template_id', 'idx_pdistro_template')
    t.index('status', 'idx_pdistro_status')
  },

  policy_acks(t) {
    t.string('id', 120).primary()
    t.string('distribution_id', 120).notNullable()
    t.string('recipient_email', 256).notNullable().defaultTo('')
    t.string('recipient_name', 256).notNullable().defaultTo('')
    t.string('token', 120).nullable()
    t.string('acknowledged_at', 30).nullable()
    t.string('ip_address', 45).nullable()
    t.string('method', 30).notNullable().defaultTo('manual')
    t.text('notes').notNullable().defaultTo('')
    t.string('added_by', 120).notNullable().defaultTo('system')
    t.index('distribution_id', 'idx_pack_dist')
    t.index('token', 'idx_pack_token')
  },
}

async function initSchema(k) {
  for (const [name, builder] of Object.entries(TABLES)) {
    if (!(await k.schema.hasTable(name))) {
      await k.schema.createTable(name, builder)
    }
  }
  if (clientType() === 'mysql2') {
    await _promoteTextToMedium(k)
  }
}

async function _promoteTextToMedium(k) {
  for (const tableName of Object.keys(TABLES)) {
    const info = await k.raw(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND DATA_TYPE = 'text'`, [tableName])
    const cols = (info[0] || info).map(r => r.COLUMN_NAME)
    for (const col of cols) {
      await k.raw(`ALTER TABLE \`${tableName}\` MODIFY \`${col}\` MEDIUMTEXT`)
    }
  }
}

async function ensureColumns(k) {
  const patches = [
    { table: 'soa_controls', col: 'status',     fn: (t) => t.string('status', 50).notNullable().defaultTo('not_started') },
    { table: 'soa_controls', col: 'updated_by',  fn: (t) => t.string('updated_by', 120).notNullable().defaultTo('system') },
    { table: 'soa_controls', col: 'is_custom',   fn: (t) => t.boolean('is_custom').notNullable().defaultTo(false) },
    { table: 'guidance',     col: 'type',          fn: (t) => t.string('type', 30).notNullable().defaultTo('markdown') },
    { table: 'guidance',     col: 'version',       fn: (t) => t.integer('version').notNullable().defaultTo(1) },
    { table: 'guidance',     col: 'min_role',      fn: (t) => t.string('min_role', 30).nullable() },
    { table: 'guidance',     col: 'linked_controls', fn: (t) => t.text('linked_controls').notNullable().defaultTo('[]') },
    { table: 'guidance',     col: 'linked_policies', fn: (t) => t.text('linked_policies').notNullable().defaultTo('[]') },
    { table: 'guidance',     col: 'pin_order',     fn: (t) => t.integer('pin_order').nullable() },
    { table: 'guidance',     col: 'seed_id',       fn: (t) => t.string('seed_id', 120).nullable() },
    { table: 'guidance',     col: 'deleted_by',    fn: (t) => t.string('deleted_by', 120).nullable() },
    { table: 'rbac_users',   col: 'username',      fn: (t) => t.string('username', 120).notNullable().unique() },
    { table: 'rbac_users',   col: 'domain',        fn: (t) => t.string('domain', 80).notNullable().defaultTo('Global') },
    { table: 'rbac_users',   col: 'totp_verified', fn: (t) => t.boolean('totp_verified').notNullable().defaultTo(false) },
    { table: 'rbac_users',   col: 'sections',      fn: (t) => t.text('sections').notNullable().defaultTo('[]') },
    { table: 'assets',      col: 'data',           fn: (t) => t.text('data').notNullable().defaultTo('{}') },
    { table: 'training',    col: 'data',           fn: (t) => t.text('data').notNullable().defaultTo('{}') },
    { table: 'goals',       col: 'data',           fn: (t) => t.text('data').notNullable().defaultTo('{}') },
    { table: 'suppliers',   col: 'data',           fn: (t) => t.text('data').notNullable().defaultTo('{}') },
    { table: 'risks',       col: 'deleted_by',     fn: (t) => t.string('deleted_by', 120).nullable() },
    { table: 'templates',   col: 'webdav_publish', fn: (t) => t.text('webdav_publish').nullable() },
    { table: 'templates',   col: 'version_history', fn: (t) => t.text('version_history').notNullable().defaultTo('[]') },
  ]

  for (const { table, col, fn } of patches) {
    if (await k.schema.hasTable(table) && !(await k.schema.hasColumn(table, col))) {
      await k.schema.alterTable(table, fn)
    }
  }
}

async function init() {
  if (_initPromise) return _initPromise
  _initPromise = _doInit()
  return _initPromise
}

async function _doInit() {
  const config = _buildConfig()
  _knex = knex(config)
  await initSchema(_knex)
  await ensureColumns(_knex)
  return _knex
}

async function destroy() {
  if (_knex) {
    await _knex.destroy()
    _knex = null
  }
  _initPromise = null
}

module.exports = { getDb, init, destroy, clientType }
