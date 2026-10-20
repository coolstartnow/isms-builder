'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gemeinsame Testgruppe; aufgerufen von isoImport.test.js (JSON) und isoImportSql.test.js (SQLite) – getrennte Dateien, weil
// die Stores ihren Speicher beim Laden festlegen.
// ISO-Import über die Oberfläche (#45): jede Zeile wird geprüft, Fehler werden gemeldet, die Controls sind sofort sichtbar
// (ohne Neustart) – unter JSON und SQLite.
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost } = require('./authHelper')

function runIsoImportSuite(backend) {
  describe(`ISO-Import [${backend}]`, () => {
    let dataDir, app, admin, editor
    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-iso-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      app = require('../../server/index.js')
      if (app.bootstrap) await app.bootstrap()
      admin = await loginAs(app, 'admin'); editor = await loginAs(app, 'editor')
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })
    const list = async fw => (await authedGet(app, admin, `/soa?framework=${fw}`)).body
    const imp = body => authedPost(app, admin, '/soa/import-controls', body)
    const ok = { id: 'ISO-5.1', theme: 'Organizational', title: 'Policies for information security', framework: 'ISO27001' }

    test('nur Administratoren dürfen importieren', async () => {
      expect((await authedPost(app, editor, '/soa/import-controls', [ok])).status).toBe(403)
    })

    test('ohne Liste: 400', async () => {
      expect((await imp({ not: 'a list' })).status).toBe(400)
    })

    test('falscher Wert im Feld framework („ISO 27001:2022“, wie in #45): klar abgelehnt, nichts geschrieben', async () => {
      const r = await imp([{ ...ok, framework: 'ISO 27001:2022' }, { ...ok, id: 'ISO-5.2', framework: 'ISO 27001:2022' }])
      expect(r.status).toBe(400)
      expect(r.body.error).toMatch(/No valid controls found|Keine gültigen Controls/)
      expect(r.body).toMatchObject({ imported: 0, rejected: 2, rejectedByReason: { invalid_framework: 2 }, allowedFrameworks: ['ISO27001', 'ISO9000', 'ISO9001'] })
      expect(fs.existsSync(path.join(dataDir, 'iso-controls.json'))).toBe(false)
      expect(await list('ISO27001')).toHaveLength(0)
    })

    test('gemischte Datei: gültige werden übernommen und sind sofort sichtbar, ungültige mit Grund gemeldet', async () => {
      const r = await imp([
        ok,
        { ...ok, id: 'ISO-5.2', title: 'Roles', framework: 'ISO9001' },
        { ...ok, id: 'X-1', framework: 'ISO 27001:2022' },        // falsches framework
        { ...ok, id: 'ISO-5.3', title: '' },                       // Pflichtfeld leer
        { ...ok },                                                  // doppelte id
        { id: 'BSI-ISMS.1', theme: 'x', title: 'y', framework: 'ISO27001' },   // Kennung gehört zu BSI
        'kaputt',
      ])
      expect(r.status).toBe(200)
      expect(r.body).toMatchObject({ imported: 2, rejected: 5 })
      expect(r.body.rejectedByReason).toEqual({ invalid_framework: 1, missing_field: 1, duplicate_id: 1, id_conflict: 1, not_an_object: 1 })
      expect((await list('ISO27001')).map(c => c.id)).toEqual(['ISO-5.1'])        // sofort sichtbar, ohne Neustart
      expect((await list('ISO9001')).map(c => c.id)).toEqual(['ISO-5.2'])
      expect((await list('BSI')).find(c => c.id === 'BSI-ISMS.1').framework).toBe('BSI')   // eingebaute Controls bleiben unberührt
      expect(JSON.parse(fs.readFileSync(path.join(dataDir, 'iso-controls.json'), 'utf8')).map(c => c.id)).toEqual(['ISO-5.1', 'ISO-5.2'])   // nur Gültiges gespeichert
    })

    test('Änderungen an importierten Controls überleben einen erneuten Import', async () => {
      await request(app).put('/soa/ISO-5.1').set('Cookie', admin).send({ owner: 'CISO', status: 'implemented' })
      const r = await imp([ok, { ...ok, id: 'ISO-5.9', title: 'Neu' }])
      expect(r.status).toBe(200); expect(r.body.added).toBe(1)
      const c = (await list('ISO27001')).find(x => x.id === 'ISO-5.1')
      expect(c).toMatchObject({ owner: 'CISO', status: 'implemented' })
      expect((await list('ISO27001')).map(x => x.id).sort()).toEqual(['ISO-5.1', 'ISO-5.9'])
    })

    test('unzulässige Zusatzfelder werden nicht gespeichert', async () => {
      await imp([{ ...ok, id: 'ISO-6.1', evil: '<script>', __proto__: { x: 1 } }])
      const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'iso-controls.json'), 'utf8'))
      expect(Object.keys(saved[0]).sort()).toEqual(['framework', 'id', 'theme', 'title'])
    })
  })
}
module.exports = { runIsoImportSuite }
