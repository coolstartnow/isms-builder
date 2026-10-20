'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Regressionstest für tools/migrate-json-to-knex.js (JSON → sqlite/mariadb/postgres), #98-Umfeld:
//  - Benutzer ohne Felder `functions`/`sections` scheiterten an NOT NULL (die Tabelle rbac_users wird vom Server nicht gelesen,
//    der Lauf meldete aber Fehler) → Standardwerte
//  - Maßnahmen (measures.json) werden übernommen
// Läuft das Werkzeug als eigenen Prozess gegen eine Wegwerf-Instanz (SQLite).
const fs   = require('fs')
const os   = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

describe('Migrationswerkzeug JSON → SQL', () => {
  let dir, out
  const T = '2026-01-01T00:00:00.000Z'

  beforeAll(() => {
    dir = createTestDataDir()
    fs.writeFileSync(path.join(dir, 'risks.json'), JSON.stringify([{ id: 'risk_m1', title: 'Migrationstest', category: 'technical', probability: 3, impact: 3, status: 'open', createdAt: T, updatedAt: T }]))
    fs.writeFileSync(path.join(dir, 'soa.json'), JSON.stringify({ 'BSI-ISMS.1': { id: 'BSI-ISMS.1', framework: 'BSI', theme: 'ISMS', title: 'Sicherheitsmanagement', applicable: true, status: 'implemented', owner: 'CISO', justification: 'x', linkedTemplates: [], updatedAt: T, updatedBy: 't' } }))
    fs.writeFileSync(path.join(dir, 'measures.json'), JSON.stringify([
      { id: 'meas_a', ref: 'M-001', title: 'Sicherung', description: 'täglich', implementation: 'Appliance', responsible: 'IT', dueDate: '2099-01-01', reviewDate: '2099-06-01', status: 'in_progress', linkedControls: ['BSI-ISMS.1'], linkedFindings: [], tom: true, category: 'backup', riskLevel: 'high', evidenceNote: 'Bericht', retentionRule: '1 Jahr', linkedVvt: ['vvt_1'], applicableEntities: ['ent_1'], createdBy: 'x', createdAt: T, updatedAt: T },
      { id: 'meas_b', title: 'Ohne Referenz', createdAt: T, updatedAt: T, deletedAt: T },
      { id: 'meas_g', ref: 'M-009', title: 'Governance', governance: true, source: 'internal_audit', sourceRef: 'IA-7', priority: 'high', progress: 40, completedDate: '2026-03-01', notes: 'n', ownerEmail: 'a@b.de', entityId: 'ent_1', linkedRisks: ['risk_m1'], attachments: [{ id: 'a1', filename: 'x.pdf', storedName: 's1' }], createdAt: T, updatedAt: T },
    ]))
    // Benutzer wie in älteren Instanzen: ohne functions/sections
    fs.writeFileSync(path.join(dir, 'rbac_users.json'), JSON.stringify({ admin: { username: 'admin', email: 'admin@test.local', domain: 'Global', role: 'admin', passwordHash: 'x', totpSecret: '' } }))
    out = execFileSync('node', [path.join(__dirname, '../tools/migrate-json-to-knex.js')], {
      env: { ...process.env, DATA_DIR: dir, STORAGE_BACKEND: 'sqlite', JWT_SECRET: 'jest-migration', NODE_ENV: 'test' }, encoding: 'utf8',
    })
  })
  afterAll(() => removeTestDataDir(dir))

  test('der Lauf meldet keine Fehler', () => {
    expect(out).toMatch(/Migration complete: \d+ inserted, \d+ skipped, 0 errors\./)
  })

  test('Daten sind in der SQLite-Datenbank: Risiko, SoA mit Änderungen, Maßnahmen, Benutzer', async () => {
    jest.resetModules()
    Object.assign(process.env, { DATA_DIR: dir, STORAGE_BACKEND: 'sqlite', JWT_SECRET: 'jest-migration', NODE_ENV: 'test' })
    const k = require('../server/db/knexDatabase')
    await k.init()
    const db = k.getDb()
    try {
      expect((await db('risks').where('id', 'risk_m1').first()).title).toBe('Migrationstest')
      const soa = await db('soa_controls').where('id', 'BSI-ISMS.1').first()
      expect(soa).toMatchObject({ owner: 'CISO', status: 'implemented' })
      const m = await db('measures').orderBy('ref')
      expect(m).toHaveLength(3)
      expect(m[0]).toMatchObject({ id: 'meas_a', ref: 'M-001', responsible: 'IT', status: 'in_progress', implementation: 'Appliance', review_date: '2099-06-01', category: 'backup', risk_level: 'high', evidence_note: 'Bericht', retention_rule: '1 Jahr' })
      expect(!!m[0].tom).toBe(true)
      expect(JSON.parse(m[0].linked_vvt)).toEqual(['vvt_1']); expect(JSON.parse(m[0].applicable_entities)).toEqual(['ent_1'])
      expect(JSON.parse(m[0].linked_controls)).toEqual(['BSI-ISMS.1'])
      const g = m.find(x => x.id === 'meas_g')
      expect(g).toMatchObject({ source: 'internal_audit', source_ref: 'IA-7', priority: 'high', progress: 40, completed_date: '2026-03-01', notes: 'n', owner_email: 'a@b.de', entity_id: 'ent_1' })
      expect(!!g.governance).toBe(true)
      expect(JSON.parse(g.linked_risks)).toEqual(['risk_m1']); expect(JSON.parse(g.attachments)).toEqual([{ id: 'a1', filename: 'x.pdf', storedName: 's1' }])
      expect(m.find(x => x.id === 'meas_b').ref).toMatch(/^M-\d{3}$/)               // fehlende Referenz wird vergeben
      expect(m.find(x => x.id === 'meas_b').deleted_at).toBeTruthy()                 // gelöscht bleibt gelöscht
      const u = await db('rbac_users').where('id', 'admin').first()
      expect(u).toBeTruthy()
      expect(u.functions).toBe('[]'); expect(u.sections).toBe('[]')
    } finally { await k.destroy() }
  })

  test('zweiter Lauf ist idempotent (nichts doppelt, keine Fehler)', () => {
    const again = execFileSync('node', [path.join(__dirname, '../tools/migrate-json-to-knex.js')], {
      env: { ...process.env, DATA_DIR: dir, STORAGE_BACKEND: 'sqlite', JWT_SECRET: 'jest-migration', NODE_ENV: 'test' }, encoding: 'utf8',
    })
    expect(again).toMatch(/Migration complete: 0 inserted, \d+ skipped, 0 errors\./)
  })
})
