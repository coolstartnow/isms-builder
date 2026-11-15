'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Zustand der Demo-Daten: Das Dokument kennt seine Controls (`linkedControls`), die Controls kennen das Dokument nicht. Beim Start (seedAll) wird das am Control
// nachgetragen — sonst bleibt im SoA „Verknüpfte Dokumente“ leer (Issue #110).
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')

test('einseitig verknüpfte Daten werden beim Start am Control ergänzt; das Demo-Bündel (alle Sprachen) ist danach konsistent', async () => {
  const dataDir = createTestDataDir()
  const now = '2026-01-01T00:00:00.000Z'
  fs.writeFileSync(path.join(dataDir, 'templates.json'), JSON.stringify([
    { id: 'tmpl_demo_x', type: 'Policy', language: 'de', title: 'Informationssicherheitsrichtlinie', content: '# x', version: 1, status: 'approved', owner: 'admin', linkedControls: ['NIS2-a', 'BSI-ORP.1'], createdAt: now, updatedAt: now },
  ]))
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-linkreconcile-boot-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' }); delete process.env.DEMO_HOSTING
  const app = require('../server/index.js'); await app.bootstrap()
  const ad = await loginAs(app, 'admin')
  const get = async (fw, id) => (await request(app).get(`/soa?framework=${fw}`).set('Cookie', ad)).body.find(c => c.id === id).linkedTemplates
  expect(await get('NIS2', 'NIS2-a')).toEqual(['tmpl_demo_x']); expect(await get('BSI', 'BSI-ORP.1')).toEqual(['tmpl_demo_x'])
  // Das Demo-Bündel selbst: jedes Dokument mit linkedControls auf ein vorhandenes Control wird nach dem Laden am Control angezeigt
  for (const lang of ['de', 'fr']) {   // en/hu/et haben keine Verknüpfungen im Bündel, nl nur auf ISO-Controls (ohne Import nicht vorhanden)
    const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/demo-bundles', lang + '.json'), 'utf8'))
    const raw = bundle.files['templates.json'] || []
    const docs = (Array.isArray(raw) ? raw : Object.values(raw)).filter(d => (d.linkedControls || []).length)
    expect(docs.length).toBeGreaterThan(0)
    const r = await request(app).post('/admin/demo-load-bundle').set('Cookie', ad).send({ lang }); expect(r.status).toBeLessThan(300)
    for (const d of docs) for (const c of d.linkedControls) {
      const fw = c.split('-')[0] === 'NIS2' ? 'NIS2' : c.split('-')[0] === 'BSI' ? 'BSI' : null; if (!fw) continue
      expect([lang, c, (await get(fw, c)).includes(d.id)]).toEqual([lang, c, true])
    }
  }
  removeTestDataDir(dataDir)
}, 120000)
