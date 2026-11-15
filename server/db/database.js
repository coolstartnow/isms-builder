// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
/**
 * Central SQLite connection + schema initialisation.
 * Uses better-sqlite3 (synchronous).
 * All stores that need SQLite call getDb() to get the shared connection.
 */

const Database = require('better-sqlite3')
const path     = require('path')
const fs       = require('fs')

const DB_DIR  = require('../paths').dataDir()
const DB_FILE = path.join(DB_DIR, 'isms.db')

let _db = null

function getDb() {
  if (_db) return _db
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  _db = new Database(DB_FILE)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
  return _db
}

function initSchema(db) {
  db.exec(`
    -- ── Templates ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS templates (
      id                TEXT PRIMARY KEY,
      type              TEXT NOT NULL,
      language          TEXT NOT NULL DEFAULT 'de',
      title             TEXT NOT NULL DEFAULT '',
      content           TEXT NOT NULL DEFAULT '',
      version           INTEGER NOT NULL DEFAULT 1,
      status            TEXT NOT NULL DEFAULT 'draft',
      owner             TEXT,
      next_review_date  TEXT,
      parent_id         TEXT,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      linked_controls   TEXT NOT NULL DEFAULT '[]',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      attachments       TEXT NOT NULL DEFAULT '[]',
      history           TEXT NOT NULL DEFAULT '[]',
      status_history    TEXT NOT NULL DEFAULT '[]'
    );

    -- ── Training ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS training (
      id                   TEXT PRIMARY KEY,
      title                TEXT NOT NULL DEFAULT '',
      description          TEXT NOT NULL DEFAULT '',
      category             TEXT NOT NULL DEFAULT 'other',
      status               TEXT NOT NULL DEFAULT 'planned',
      due_date             TEXT,
      completed_date       TEXT,
      instructor           TEXT NOT NULL DEFAULT '',
      assignees            TEXT NOT NULL DEFAULT '',
      applicable_entities  TEXT NOT NULL DEFAULT '[]',
      evidence             TEXT NOT NULL DEFAULT '',
      mandatory            INTEGER NOT NULL DEFAULT 0,
      created_by           TEXT NOT NULL DEFAULT 'system',
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );

    -- ── Entities (Konzernstruktur) ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS entities (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      short      TEXT NOT NULL DEFAULT '',
      type       TEXT NOT NULL DEFAULT 'subsidiary',
      parent_id  TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- ── SoA Controls ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS soa_controls (
      id                   TEXT PRIMARY KEY,
      framework            TEXT NOT NULL DEFAULT 'ISO27001',
      control_id           TEXT NOT NULL DEFAULT '',
      title                TEXT NOT NULL DEFAULT '',
      description          TEXT NOT NULL DEFAULT '',
      theme                TEXT NOT NULL DEFAULT '',
      applicable           INTEGER NOT NULL DEFAULT 1,
      implementation_status TEXT NOT NULL DEFAULT 'not_implemented',
      justification        TEXT NOT NULL DEFAULT '',
      evidence             TEXT NOT NULL DEFAULT '',
      owner                TEXT NOT NULL DEFAULT '',
      applicable_entities  TEXT NOT NULL DEFAULT '[]',
      linked_templates     TEXT NOT NULL DEFAULT '[]',
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );

    -- ── Guidance ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS guidance (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL DEFAULT '',
      category    TEXT NOT NULL DEFAULT 'systemhandbuch',
      content     TEXT NOT NULL DEFAULT '',
      file_name   TEXT,
      file_type   TEXT,
      file_size   INTEGER,
      created_by  TEXT NOT NULL DEFAULT 'system',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    -- ── Risks ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS risks (
      id               TEXT PRIMARY KEY,
      title            TEXT NOT NULL DEFAULT '',
      description      TEXT NOT NULL DEFAULT '',
      category         TEXT NOT NULL DEFAULT 'other',
      likelihood       INTEGER NOT NULL DEFAULT 2,
      impact           INTEGER NOT NULL DEFAULT 2,
      risk_score       INTEGER NOT NULL DEFAULT 4,
      status           TEXT NOT NULL DEFAULT 'open',
      owner            TEXT NOT NULL DEFAULT '',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      treatments       TEXT NOT NULL DEFAULT '[]',
      created_by       TEXT NOT NULL DEFAULT 'system',
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );

    -- ── GDPR VVT ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_vvt (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL DEFAULT '',
      purpose            TEXT NOT NULL DEFAULT '',
      legal_basis        TEXT NOT NULL DEFAULT '',
      legal_basis_note   TEXT NOT NULL DEFAULT '',
      data_categories    TEXT NOT NULL DEFAULT '[]',
      data_subjects      TEXT NOT NULL DEFAULT '[]',
      recipients         TEXT NOT NULL DEFAULT '',
      retention          TEXT NOT NULL DEFAULT '',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      created_by         TEXT NOT NULL DEFAULT 'system',
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    -- ── GDPR AV (Auftragsverarbeiter) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_av (
      id                 TEXT PRIMARY KEY,
      processor          TEXT NOT NULL DEFAULT '',
      service            TEXT NOT NULL DEFAULT '',
      contract_date      TEXT,
      review_date        TEXT,
      status             TEXT NOT NULL DEFAULT 'active',
      checklist          TEXT NOT NULL DEFAULT '[]',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      created_by         TEXT NOT NULL DEFAULT 'system',
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    -- ── GDPR DSFA ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_dsfa (
      id                 TEXT PRIMARY KEY,
      title              TEXT NOT NULL DEFAULT '',
      description        TEXT NOT NULL DEFAULT '',
      likelihood         INTEGER NOT NULL DEFAULT 2,
      impact             INTEGER NOT NULL DEFAULT 2,
      risk_score         INTEGER NOT NULL DEFAULT 4,
      measures           TEXT NOT NULL DEFAULT '',
      status             TEXT NOT NULL DEFAULT 'draft',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      created_by         TEXT NOT NULL DEFAULT 'system',
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    -- ── GDPR Incidents (Datenpannen) ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_incidents (
      id                 TEXT PRIMARY KEY,
      title              TEXT NOT NULL DEFAULT '',
      description        TEXT NOT NULL DEFAULT '',
      incident_type      TEXT NOT NULL DEFAULT 'confidentiality',
      discovered_at      TEXT,
      reported_at        TEXT,
      authority_notified INTEGER NOT NULL DEFAULT 0,
      subjects_notified  INTEGER NOT NULL DEFAULT 0,
      status             TEXT NOT NULL DEFAULT 'open',
      measures           TEXT NOT NULL DEFAULT '',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      created_by         TEXT NOT NULL DEFAULT 'system',
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    -- ── GDPR DSAR (Betroffenenrechte) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_dsar (
      id                 TEXT PRIMARY KEY,
      requester          TEXT NOT NULL DEFAULT '',
      request_type       TEXT NOT NULL DEFAULT 'access',
      received_at        TEXT,
      due_date           TEXT,
      extended_due_date  TEXT,
      status             TEXT NOT NULL DEFAULT 'open',
      notes              TEXT NOT NULL DEFAULT '',
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      created_by         TEXT NOT NULL DEFAULT 'system',
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    -- ── GDPR TOMs ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_toms (
      id                 TEXT PRIMARY KEY,
      category           TEXT NOT NULL DEFAULT 'access_control',
      title              TEXT NOT NULL DEFAULT '',
      description        TEXT NOT NULL DEFAULT '',
      status             TEXT NOT NULL DEFAULT 'implemented',
      review_date        TEXT,
      applicable_entities TEXT NOT NULL DEFAULT '[]',
      created_by         TEXT NOT NULL DEFAULT 'system',
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    -- ── GDPR DSB (Datenschutzbeauftragter) ────────────────────────────
    CREATE TABLE IF NOT EXISTS gdpr_dsb (
      id          TEXT PRIMARY KEY DEFAULT 'singleton',
      name        TEXT NOT NULL DEFAULT '',
      email       TEXT NOT NULL DEFAULT '',
      phone       TEXT NOT NULL DEFAULT '',
      external    INTEGER NOT NULL DEFAULT 0,
      appointed_at TEXT,
      file_name   TEXT,
      file_type   TEXT,
      updated_at  TEXT NOT NULL
    );

    -- ── RBAC Users ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS rbac_users (
      id           TEXT PRIMARY KEY,
      email        TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      role         TEXT NOT NULL DEFAULT 'reader',
      password_hash TEXT NOT NULL,
      totp_secret  TEXT,
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `)
}

module.exports = { getDb }
