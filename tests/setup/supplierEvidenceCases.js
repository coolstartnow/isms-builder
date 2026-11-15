'use strict'
// Gemeinsame Fälle für den Nachweis-Link am Lieferanten (GitHub #108); je Speicher-Backend aus einer eigenen Testdatei aufgerufen,
// weil `server/index.js` pro Datei nur einmal mit einem Backend geladen werden kann.
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./authHelper')

const day = off => new Date(Date.now() + off * 86400000).toISOString().slice(0, 10)

module.exports = function supplierEvidenceCases(backend) {
  describe(`Lieferanten-Nachweis-Link [${backend}]`, () => {
    let dataDir, app, editor, reader, id

    beforeAll(async () => {
      dataDir = createTestDataDir()
      process.env.DATA_DIR        = dataDir
      process.env.JWT_SECRET      = 'jest-test-secret-supplier-evidence'
      process.env.NODE_ENV        = 'test'
      process.env.STORAGE_BACKEND = backend
      app = require('../../server/index.js')
      await app.bootstrap?.()
      editor = await loginAs(app, 'editor')
      reader = await loginAs(app, 'reader')
    })
    afterAll(() => removeTestDataDir(dataDir))

    test('Link, Beschriftung und Ablaufdatum werden gespeichert und gelesen', async () => {
      const res = await authedPost(app, editor, '/suppliers', {
        name: 'Zertifiziert AG', type: 'saas', criticality: 'medium',
        evidenceUrl: '  https://example.sharepoint.com/sites/vendors/iso27001.pdf  ', evidenceLabel: ' ISO 27001 Zertifikat ', evidenceValidUntil: day(30),
      })
      expect(res.status).toBe(201)
      id = res.body.id
      expect(res.body.evidenceUrl).toBe('https://example.sharepoint.com/sites/vendors/iso27001.pdf')
      expect(res.body.evidenceLabel).toBe('ISO 27001 Zertifikat')
      const got = await authedGet(app, reader, `/suppliers/${id}`)
      expect(got.body.evidenceValidUntil).toBe(day(30))
      expect(got.body.evidenceUrl).toMatch(/^https:\/\//)
    })

    test.each([
      ['javascript:alert(1)'], ['JaVaScRiPt:alert(1)'], ['data:text/html,<script>alert(1)</script>'], ['ftp://example.org/x'],
      ['//example.org/x'], ['example.org/x'], ['https://exa mple.org/x'], ['https://example.org/\nx'], ['x'.repeat(2001)],
    ])('ungültiger Link %j → 400 (POST und PUT)', async url => {
      const post = await authedPost(app, editor, '/suppliers', { name: 'X', evidenceUrl: url })
      expect(post.status).toBe(400)
      const put = await authedPut(app, editor, `/suppliers/${id}`, { evidenceUrl: url })
      expect(put.status).toBe(400)
      expect((await authedGet(app, reader, `/suppliers/${id}`)).body.evidenceUrl).toMatch(/^https:\/\/example\.sharepoint\.com/)
    })

    test('Zahl/Objekt als Link, zu lange Beschriftung und ungültige Daten → 400', async () => {
      for (const body of [{ evidenceUrl: 5 }, { evidenceUrl: { a: 1 } }, { evidenceLabel: 'x'.repeat(121) }, { evidenceValidUntil: '2026-13-40' }, { evidenceValidUntil: '31.12.2026' }, { evidenceValidUntil: 20261231 }]) {
        const r = await authedPut(app, editor, `/suppliers/${id}`, body)
        expect(r.status).toBe(400)
      }
    })

    test('Fehlermeldung wird in der Sprache der Oberfläche geliefert', async () => {
      const r = await require('supertest')(app).put(`/suppliers/${id}`).set('Cookie', editor).set('X-Lang', 'de').send({ evidenceUrl: 'javascript:1' })
      expect(r.status).toBe(400)
      expect(r.body.error).toMatch(/http:\/\/ oder https:\/\//)
    })

    test('HTML in der Beschriftung wird unverändert gespeichert (Maskierung erfolgt bei der Ausgabe) und Leeren geht', async () => {
      const r = await authedPut(app, editor, `/suppliers/${id}`, { evidenceLabel: '<img src=x onerror=alert(1)>' })
      expect(r.status).toBe(200)
      expect(r.body.evidenceLabel).toBe('<img src=x onerror=alert(1)>')
      const c = await authedPut(app, editor, `/suppliers/${id}`, { evidenceUrl: '', evidenceLabel: '', evidenceValidUntil: '' })
      expect(c.status).toBe(200)
      expect([c.body.evidenceUrl, c.body.evidenceLabel, c.body.evidenceValidUntil]).toEqual(['', '', ''])
    })

    test('Kalender: Ablauf in 30 Tagen und bereits abgelaufene Nachweise erscheinen, laufende Lieferanten ohne Datum und beendete nicht', async () => {
      const mk = (name, extra) => authedPost(app, editor, '/suppliers', { name, type: 'saas', criticality: 'low', ...extra })
      await mk('Läuft bald ab', { evidenceUrl: 'https://example.org/a', evidenceValidUntil: day(30) })
      await mk('Schon abgelaufen', { evidenceUrl: 'https://example.org/b', evidenceValidUntil: day(-5) })
      await mk('Weit entfernt', { evidenceUrl: 'https://example.org/c', evidenceValidUntil: day(400) })
      await mk('Ohne Datum', { evidenceUrl: 'https://example.org/d' })
      await mk('Beendet', { status: 'terminated', evidenceValidUntil: day(10) })
      const cal = await authedGet(app, reader, '/calendar')
      const ev = cal.body.filter(e => e.type === 'supplier_evidence')
      const by = n => ev.find(e => e.title.includes(n))
      expect(by('Läuft bald ab')).toMatchObject({ date: day(30), severity: 'normal' })
      expect(by('Schon abgelaufen')).toMatchObject({ date: day(-5), severity: 'high' })
      expect(by('Weit entfernt')).toBeUndefined()
      expect(by('Ohne Datum')).toBeUndefined()
      expect(by('Beendet')).toBeUndefined()
    })

    test('Kalender-Titel wird in die Sprache des Aufrufers übersetzt', async () => {
      const get = lang => require('supertest')(app).get('/calendar').set('Cookie', reader).set('X-Lang', lang)
      const title = async lang => (await get(lang)).body.find(e => e.type === 'supplier_evidence').title
      expect(await title('en')).toMatch(/^Supplier evidence expires: /)
      expect(await title('de')).toMatch(/^Nachweis läuft ab: /)
      expect(await title('fr')).toMatch(/^Justificatif fournisseur expirant : /)
    })

    test('reader darf den Nachweis nicht ändern (403)', async () => {
      expect((await authedPut(app, reader, `/suppliers/${id}`, { evidenceUrl: 'https://example.org/z' })).status).toBe(403)
    })
  })
}
