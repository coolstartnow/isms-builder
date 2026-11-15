'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Abgleich der Verknüpfung Dokument ↔ SoA-Control (server/linkReconcile.js), gemeinsam für JSON (linkReconcile.test.js) und SQLite (linkReconcileSql.test.js).
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs } = require('./authHelper')

function runLinkReconcileSuite(backend) {
  describe(`Verknüpfung Dokument ↔ Control abgleichen [${backend}]`, () => {
    let dataDir, app, co, ad, soaStore, reconcile
    const links = async (fw, id) => (await request(app).get(`/soa?framework=${fw}`).set('Cookie', ad)).body.find(c => c.id === id).linkedTemplates
    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-linkreconcile-' + backend + '-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: backend }); delete process.env.DEMO_HOSTING
      app = require('../../server/index.js'); if (app.bootstrap) await app.bootstrap()
      co = await loginAs(app, 'contentowner'); ad = await loginAs(app, 'admin')
      soaStore = require('../../server/db/soaStore'); reconcile = require('../../server/linkReconcile').reconcileDocumentControlLinks
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })
    const mk = async (title, linkedControls = []) => {   // POST legt an (ignoriert Verknüpfungen), verknüpft wird wie in der Oberfläche über PUT
      const id = (await request(app).post('/template').set('Cookie', co).send({ type: 'Policy', language: 'de', title, content: '# x' })).body.id
      if (linkedControls.length) expect((await request(app).put(`/template/Policy/${id}`).set('Cookie', co).send({ title, content: '# x', linkedControls })).status).toBe(200)
      return id
    }

    test('Verknüpfen am Dokument trägt das Dokument am Control ein (beide Seiten)', async () => {
      const id = await mk('Informationssicherheitsrichtlinie', [])
      expect((await request(app).put(`/template/Policy/${id}`).set('Cookie', co).send({ title: 'Informationssicherheitsrichtlinie', content: '# x', linkedControls: ['BSI-ORP.1', 'NIS2-a'] })).status).toBe(200)
      expect(await links('BSI', 'BSI-ORP.1')).toContain(id); expect(await links('NIS2', 'NIS2-a')).toContain(id)
    })

    test('nur die Dokumentseite gefüllt (Demo-Bündel, Import): reconcile trägt am Control nach, ein zweiter Lauf ändert nichts', async () => {
      const id = await mk('Nur Dokumentseite', ['BSI-ORP.1', 'NIS2-a'])
      await soaStore.removeLinkedTemplate('BSI-ORP.1', id); await soaStore.removeLinkedTemplate('NIS2-a', id)   // einseitigen Zustand herstellen
      expect(await links('BSI', 'BSI-ORP.1')).not.toContain(id)
      expect(await reconcile()).toBe(2)
      expect(await links('BSI', 'BSI-ORP.1')).toContain(id); expect(await links('NIS2', 'NIS2-a')).toContain(id)
      expect(await reconcile()).toBe(0)
    })

    test('gelöschte Dokumente und unbekannte Controls: nichts wird eingetragen, nichts bricht ab', async () => {
      const del = await mk('Wird gelöscht', ['BSI-ORP.2'])
      await soaStore.removeLinkedTemplate('BSI-ORP.2', del)
      expect((await request(app).delete(`/template/Policy/${del}`).set('Cookie', co)).status).toBeLessThan(300)
      await mk('Verweist ins Leere', ['GIBT-ES-NICHT'])
      await reconcile()
      expect(await links('BSI', 'BSI-ORP.2')).not.toContain(del)
    })
  })
}
module.exports = { runLinkReconcileSuite }
