'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Regressionstest für #98 (Punkt 1): Unter STORAGE_BACKEND=sqlite/mariadb/postgres blieb die SoA leer, weil nur das
// JSON-Backend die eingebauten Frameworks anlegte. Läuft gegen SQLite (self-contained, Teil von `npm test`).
//  - frische Instanz: alle eingebauten Controls vorhanden (gleiche Menge wie im JSON-Backend)
//  - ISO-Controls werden NIE mitgeliefert: ohne data/iso-controls.json gibt es keine ISO-Frameworks
//  - wiederholtes Anlegen (Neustart) ändert nichts: keine Doppelten, Änderungen der Nutzer bleiben erhalten
//  - eigene data/iso-controls.json wird wie im JSON-Backend übernommen
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const BUILTIN = ['BSI', 'NIS2', 'EUCS', 'EUAI', 'CRA']

async function freshInstance(isoControls) {
  jest.resetModules()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isms-soaseed-'))
  if (isoControls) fs.writeFileSync(path.join(dir, 'iso-controls.json'), JSON.stringify(isoControls))
  Object.assign(process.env, { DATA_DIR: dir, JWT_SECRET: 'jest-soa-seed', NODE_ENV: 'test', STORAGE_BACKEND: 'sqlite' })
  const knex = require('../server/db/knexDatabase')
  await knex.init()
  const store = require('../server/db/soaStore')
  return { dir, knex, store }
}
const cleanup = async ({ dir, knex }) => { await knex.destroy(); fs.rmSync(dir, { recursive: true, force: true }) }
const byFramework = list => list.reduce((m, c) => (m[c.framework] = (m[c.framework] || 0) + 1, m), {})

describe('SoA-Controls unter SQL-Backends (#98)', () => {
  test('frische SQLite-Instanz: alle eingebauten Frameworks vorhanden, keine ISO-Controls', async () => {
    const inst = await freshInstance()
    try {
      expect((await inst.store.getAll()).length).toBe(0)           // vor dem Anlegen leer (so war es der Fehler)
      const r = await inst.store.seedBuiltIn()
      const all = await inst.store.getAll()
      expect(r.added).toBe(all.length)
      expect(all.length).toBeGreaterThanOrEqual(140)
      const fw = byFramework(all)
      for (const f of BUILTIN) expect(fw[f]).toBeGreaterThan(0)
      for (const iso of ['ISO27001', 'ISO9000', 'ISO9001']) expect(fw[iso]).toBeUndefined()   // ISO wird nie mitgeliefert
      const c = await inst.store.getById('BSI-ISMS.1')
      expect(c).toMatchObject({ applicable: true, status: 'not_started', owner: '', isCustom: false, updatedBy: 'system' })
      expect(c.title).toBeTruthy()
    } finally { await cleanup(inst) }
  })

  test('Neustart: erneutes Anlegen erzeugt nichts doppelt und überschreibt keine Änderungen', async () => {
    const inst = await freshInstance()
    try {
      await inst.store.seedBuiltIn()
      const before = (await inst.store.getAll()).length
      await inst.store.update('BSI-ISMS.1', { owner: 'CISO', status: 'implemented', justification: 'Begründung', applicable: false }, { changedBy: 'test' })
      const again = await inst.store.seedBuiltIn()
      expect(again.added).toBe(0)
      expect((await inst.store.getAll()).length).toBe(before)
      expect(await inst.store.getById('BSI-ISMS.1')).toMatchObject({ owner: 'CISO', status: 'implemented', justification: 'Begründung', applicable: false })
    } finally { await cleanup(inst) }
  })

  test('eigene data/iso-controls.json wird übernommen (wie im JSON-Backend), nachträglich neue Controls werden ergänzt', async () => {
    const iso = [{ id: 'ISO27001-A.5.1', framework: 'ISO27001', theme: 'Organizational', title: 'Policies for information security (eigene Fassung)' }]
    const inst = await freshInstance(iso)
    try {
      await inst.store.seedBuiltIn()
      expect(byFramework(await inst.store.getAll()).ISO27001).toBe(1)
      expect((await inst.store.getById('ISO27001-A.5.1')).title).toContain('eigene Fassung')
    } finally { await cleanup(inst) }
  })

  test('JSON-Backend: seedBuiltIn ist ein No-Op (Store legt beim Laden selbst an)', async () => {
    jest.resetModules()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isms-soaseed-json-'))
    Object.assign(process.env, { DATA_DIR: dir, JWT_SECRET: 'jest-soa-seed', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    try {
      const store = require('../server/db/soaStore')
      expect(await store.seedBuiltIn()).toEqual({ added: 0 })
      expect(store.getAll().length).toBeGreaterThanOrEqual(140)
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  })
})
