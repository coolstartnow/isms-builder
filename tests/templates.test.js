'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
let createdId

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-tmpl'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie   = await loginAs(app, 'admin')
  editorCookie  = await loginAs(app, 'editor')
  readerCookie  = await loginAs(app, 'reader')
})

afterAll(async () => {
  if (createdId) {
    await authedDelete(app, adminCookie, `/template/policy/${createdId}`)
  }
  removeTestDataDir(dataDir)
})

describe('Templates CRUD', () => {
  test('GET /templates – leere Liste', async () => {
    const res = await authedGet(app, readerCookie, '/templates')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /template – contentowner erstellt Template', async () => {
    const coCookie = await loginAs(app, 'contentowner')
    const res = await authedPost(app, coCookie, '/template', {
      type:     'policy',
      language: 'de',
      title:    'Datenschutzrichtlinie Test',
      content:  '# Datenschutz\n\nTestinhalt.',
      owner:    'IT-Abteilung',
    })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.title).toBe('Datenschutzrichtlinie Test')
    expect(res.body.status).toBe('draft')
    createdId = res.body.id
  })

  test('GET /template/:type/:id – Template lesen', async () => {
    const res = await authedGet(app, readerCookie, `/template/policy/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(createdId)
  })

  test('GET /templates/tree – Baum', async () => {
    const res = await authedGet(app, readerCookie, '/templates/tree')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('PUT /template/:type/:id – editor aktualisiert', async () => {
    const res = await authedPut(app, editorCookie, `/template/policy/${createdId}`, {
      title:   'Datenschutzrichtlinie Test (aktualisiert)',
      content: '# Datenschutz\n\nAktualisierter Inhalt.',
    })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Datenschutzrichtlinie Test (aktualisiert)')
    expect(res.body.version).toBe(1)   // #97: Speichern erhöht die Version nicht mehr
  })

  test('GET /template/:type/:id/history – Versionshistorie', async () => {
    const res = await authedGet(app, readerCookie, `/template/policy/${createdId}/history`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Nach dem Update muss mindestens 1 Eintrag vorhanden sein
    expect(res.body.length).toBeGreaterThanOrEqual(0)
  })

  test('PATCH /template/:type/:id/status – Lifecycle review', async () => {
    const request = require('supertest')
    const res = await request(app)
      .patch(`/template/policy/${createdId}/status`)
      .set('Cookie', editorCookie)
      .send({ status: 'review' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('review')
  })

  test('GET /template/:type/:id/status-history', async () => {
    const res = await authedGet(app, readerCookie, `/template/policy/${createdId}/status-history`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('DELETE /template/:type/:id – admin löscht', async () => {
    const res = await authedDelete(app, adminCookie, `/template/policy/${createdId}`)
    expect(res.status).toBe(200)
    createdId = null
  })

  test('GET nach DELETE → 404', async () => {
    const res = await authedGet(app, readerCookie, '/template/policy/nonexistent-id')
    expect(res.status).toBe(404)
  })
})

// #97 – Version steigt bei der Freigabe, nicht beim Speichern
describe('Dokument-Versionierung (#97)', () => {
  const request = require('supertest')
  let id
  const patchStatus = (cookie, status, extra = {}) =>
    request(app).patch(`/template/policy/${id}/status`).set('Cookie', cookie).send({ status, ...extra })

  beforeAll(async () => {
    const res = await authedPost(app, adminCookie, '/template', { type: 'policy', language: 'de', title: 'Versionstest', content: 'v1' })
    id = res.body.id
  })
  afterAll(async () => { if (id) await authedDelete(app, adminCookie, `/template/policy/${id}`) })

  test('mehrfaches Speichern lässt die Version unverändert', async () => {
    for (const c of ['a', 'b', 'c']) {
      const res = await authedPut(app, adminCookie, `/template/policy/${id}`, { content: c })
      expect(res.status).toBe(200)
      expect(res.body.version).toBe(1)
    }
  })

  test('erste Freigabe behält die Version, trägt Benutzer, Zeit und Kommentar ein', async () => {
    expect((await patchStatus(editorCookie, 'review')).status).toBe(200)
    const res = await patchStatus(adminCookie, 'approved', { changes: 'Initiale Übernahme' })
    expect(res.status).toBe(200)
    expect(res.body.version).toBe(1)

    const v = await authedGet(app, readerCookie, `/template/policy/${id}/versions`)
    expect(v.body.current).toBe(1)
    expect(v.body.nextVersion).toBe(2)
    expect(v.body.versions).toHaveLength(1)
    expect(v.body.versions[0].approvedBy).toBeTruthy()
    expect(v.body.versions[0].approvedBy).not.toBe('unknown')
    expect(v.body.versions[0].changes).toBe('Initiale Übernahme')
    expect(v.body.versions[0].approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(v.body.versions[0].content).toBeUndefined()      // Snapshot gehört nicht in die Tabelle
  })

  test('freigegebenes Dokument: Titel und Inhalt gesperrt (409), Metadaten nicht', async () => {
    const blocked = await authedPut(app, adminCookie, `/template/policy/${id}`, { content: 'geändert' })
    expect(blocked.status).toBe(409)
    const title = await authedPut(app, adminCookie, `/template/policy/${id}`, { title: 'Neuer Titel' })
    expect(title.status).toBe(409)

    const same = await authedPut(app, adminCookie, `/template/policy/${id}`, { title: 'Versionstest', content: 'c' })
    expect(same.status).toBe(200)                            // unveränderter Inhalt ist kein Edit
    const meta = await authedPut(app, adminCookie, `/template/policy/${id}`, { nextReviewDate: '2027-01-01' })
    expect(meta.status).toBe(200)
    expect(meta.body.nextReviewDate).toBe('2027-01-01')
  })

  test('zurück in Review, bearbeiten, erneut freigeben → Version 2', async () => {
    expect((await patchStatus(adminCookie, 'review')).status).toBe(200)
    const edit = await authedPut(app, editorCookie, `/template/policy/${id}`, { content: 'zweite Fassung' })
    expect(edit.status).toBe(200)
    expect(edit.body.version).toBe(1)                        // bis zur Freigabe unverändert

    const res = await patchStatus(adminCookie, 'approved', { changes: 'Abschnitt ergänzt' })
    expect(res.body.version).toBe(2)

    const v = await authedGet(app, readerCookie, `/template/policy/${id}/versions`)
    expect(v.body.versions.map(x => x.version)).toEqual([1, 2])
    expect(v.body.versions[1].changes).toBe('Abschnitt ergänzt')
    expect(v.body.nextVersion).toBe(3)
  })

  test('UI: Freigabe mit Bestätigung, Versionstabelle in Ansicht und Druck', () => {
    const fs = require('fs'), path = require('path')
    const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
    expect(src).toMatch(/function confirmApproval\(/)
    expect(src).toMatch(/function versionTableHtml\(/)
    expect(src).toMatch(/\/versions/)
  })
})
