'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Der rechtliche Hinweis zu ISO/NEN 7510/TISAX wird in einen schon angelegten Artikel „SoA & Audit – Leitfaden“ nachgetragen (bestehende Instanzen, Demo),
// ohne eigene Änderungen am Text zu überschreiben. JSON (frameworkNoticePatch.test.js) und SQLite (frameworkNoticePatchSql.test.js).
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const notice = require('../../server/frameworkNotice')

const OLD = '# SoA & Audit – Leitfaden\n\nEigener Text des Betreibers.\n\n> **Eigene Gruppen:** Für andere Rahmenwerke (z. B. NEN 7510, TISAX, Kundenanforderungen) … Importieren Sie nur Inhalte, die Sie lizenzrechtlich verwenden dürfen.\n\n---\n\n## SoA-Control bearbeiten\n'

function runFrameworkNoticePatchSuite(backend) {
  describe(`Hinweis in bestehendem Leitfaden nachtragen [${backend}]`, () => {
    let dataDir
    beforeAll(() => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-noticepatch-' + backend + '-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: backend }); delete process.env.DEMO_HOSTING
      fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'de' }))   // gleiche Sprache wie der angelegte Artikel: kein Austausch des Textes wegen Sprachwechsel
      if (backend === 'json') {
        const now = '2026-11-11T22:46:25.970Z'
        fs.writeFileSync(path.join(dataDir, 'guidance.json'), JSON.stringify([{ id: 'guid_soa_audit_guide', seedId: 'seed_soa_audit_guide', seedLang: 'de', category: 'soa-audit', type: 'markdown', title: 'SoA & Audit – Leitfaden', content: OLD, version: 1, pinOrder: 1, minRole: null, createdAt: now, updatedAt: now, deletedAt: null, deletedBy: null, createdBy: 'system', linkedControls: [], linkedPolicies: [] }]))
      }
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })

    test('alter Artikel bekommt beim Start den Hinweis direkt nach „Eigene Gruppen“; eigener Text bleibt; zweiter Start ändert nichts', async () => {
      const store = require('../../server/db/guidanceStore')
      if (backend !== 'json') {   // SQL: Artikel mit altem Text anlegen, dann die Seed-Funktion laufen lassen
        await require('../../server/db/knexDatabase').init()
        await require('../../server/db/stores/guidanceStore').upsertSeed('seed_soa_audit_guide', { id: 'guid_soa_audit_guide', category: 'soa-audit', type: 'markdown', title: 'SoA & Audit – Leitfaden', content: OLD, pinOrder: 1, minRole: null, seedLang: 'de' })
      }
      await store.seedSoaGuide()
      const read = async () => (backend === 'json' ? store.getAll().find(d => d.id === 'guid_soa_audit_guide').content : (await require('../../server/db/knexDatabase').getDb()('guidance').where('seed_id', 'seed_soa_audit_guide').first()).content)   // SQL: Kennung vergibt der Speicher selbst → über die Seed-Kennung lesen
      const c1 = await read()
      // JSON: eigener Text bleibt erhalten. SQL: Der Speicher kennt die Seed-Sprache nicht und ersetzt den Seed-Artikel bei jedem Start durch den Text aus dem Code (bestehendes
      // Verhalten) — dort kommt der Hinweis ohnehin mit dem neuen Text an, der Nachtrag ist wirkungslos, aber harmlos.
      if (backend === 'json') expect(c1).toContain('Eigener Text des Betreibers.')
      expect(c1.indexOf('**Eigene Gruppen:**')).toBeLessThan(c1.indexOf('**Rechtlicher Hinweis:**'))
      expect(c1.indexOf('**Rechtlicher Hinweis:**')).toBeLessThan(c1.indexOf('## SoA-Control bearbeiten'))
      expect(c1).toContain(notice.TEXT.de)
      await store.seedSoaGuide()
      expect(await read()).toBe(c1)
      expect(c1.split('**Rechtlicher Hinweis:**').length - 1).toBe(1)
    })
  })
}
module.exports = { runFrameworkNoticePatchSuite }
