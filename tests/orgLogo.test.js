'use strict'
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPut, authedDelete, authedPost } = require('./setup/authHelper')

let dataDir, app, admin, reader, orgLogo
const demoPng = fs.readFileSync(path.join(__dirname, '../data/demo-bundles/isms-builder-logo.png'))
const b64 = buf => buf.toString('base64')

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-orglogo'
  process.env.NODE_ENV = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  orgLogo = require('../server/orgLogo')
  admin = await loginAs(app, 'admin')
  reader = await loginAs(app, 'reader')
})
afterAll(() => removeTestDataDir(dataDir))
beforeEach(() => orgLogo.remove())

describe('Firmenlogo – Prüfung', () => {
  test('PNG wird an den Bytes erkannt, mit Größe', () => {
    const v = orgLogo.validate(demoPng)
    expect(v.ok).toBe(true)
    expect(v.info).toMatchObject({ mime: 'image/png', width: 840, height: 400 })
  })
  test('SVG, Text und HTML werden abgelehnt, auch mit Bildendung', () => {
    expect(orgLogo.validate(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')).ok).toBe(false)
    expect(orgLogo.validate(Buffer.from('<html><script>alert(1)</script></html> '.repeat(3))).ok).toBe(false)
  })
  test('zu große Datei und leere Datei werden abgelehnt', () => {
    expect(orgLogo.validate(Buffer.concat([demoPng, Buffer.alloc(orgLogo.MAX_BYTES)])).ok).toBe(false)
    expect(orgLogo.validate(Buffer.alloc(0)).ok).toBe(false)
  })
  test('JPEG wird erkannt', () => {
    // minimales JPEG: SOI, SOF0 (8×6 px), EOI
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x06, 0x00, 0x08, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9, 0x00, 0x00])
    expect(orgLogo.validate(jpg)).toMatchObject({ ok: true, info: { mime: 'image/jpeg', width: 8, height: 6 } })
  })
})

describe('Firmenlogo – Endpunkte', () => {
  test('ohne Logo: Bild 404, Info set=false', async () => {
    const res = await require('supertest')(app).get('/branding/logo')
    expect(res.status).toBe(404)
    expect((await authedGet(app, admin, '/admin/logo')).body.set).toBe(false)
  })
  test('Admin setzt Logo; es ist öffentlich lesbar, mit nosniff und richtigem Typ', async () => {
    const put = await authedPut(app, admin, '/admin/logo', { data: 'data:image/png;base64,' + b64(demoPng) })
    expect(put.status).toBe(200)
    expect(put.body).toMatchObject({ set: true, demo: false, mime: 'image/png' })
    const img = await require('supertest')(app).get('/branding/logo')
    expect(img.status).toBe(200)
    expect(img.headers['content-type']).toMatch(/image\/png/)
    expect(img.headers['x-content-type-options']).toBe('nosniff')
    expect(Buffer.compare(img.body, demoPng)).toBe(0)
  })
  test('Einstellungen nennen das Logo, ohne Bilddaten', async () => {
    await authedPut(app, admin, '/admin/logo', { data: b64(demoPng) })
    const s = await authedGet(app, admin, '/admin/org-settings')
    expect(s.body.logo.set).toBe(true)
    expect(JSON.stringify(s.body)).not.toContain(b64(demoPng).slice(0, 40))
  })
  test('Leser darf nicht ändern; Fremdformat wird mit 400 abgelehnt', async () => {
    expect((await authedPut(app, reader, '/admin/logo', { data: b64(demoPng) })).status).toBe(403)
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')
    expect((await authedPut(app, admin, '/admin/logo', { data: svg })).status).toBe(400)
    expect((await authedPut(app, admin, '/admin/logo', { data: 'kein base64 !!' })).status).toBe(400)
    expect((await authedGet(app, admin, '/admin/logo')).body.set).toBe(false)
  })
  test('Einstellungen speichern kann das Logo nicht über „logo“ im Body setzen', async () => {
    await authedPut(app, admin, '/admin/org-settings', { orgName: 'X', logo: { set: true, demo: false } })
    expect((await authedGet(app, admin, '/admin/logo')).body.set).toBe(false)
  })
  test('Entfernen', async () => {
    await authedPut(app, admin, '/admin/logo', { data: b64(demoPng) })
    expect((await authedDelete(app, admin, '/admin/logo')).body.set).toBe(false)
  })
})

describe('Firmenlogo – Demo und Produktivwechsel', () => {
  test('Demo-Bundle laden bringt das Demo-Logo mit', async () => {
    expect((await authedPost(app, admin, '/admin/demo-load-bundle', { lang: 'en' })).status).toBe(200)
    expect((await authedGet(app, admin, '/admin/logo')).body).toMatchObject({ set: true, demo: true })
  })
  test('ein eigenes Logo wird vom Demo-Bundle nicht überschrieben', async () => {
    await authedPut(app, admin, '/admin/logo', { data: b64(demoPng) })
    await authedPost(app, admin, '/admin/demo-load-bundle', { lang: 'en' })
    expect((await authedGet(app, admin, '/admin/logo')).body.demo).toBe(false)
  })
  test('Produktivwechsel entfernt das Demo-Logo und setzt den Hinweis, bis ein Logo hochgeladen ist', async () => {
    orgLogo.installDemoLogo()
    expect(orgLogo.prepareForProduction()).toBe(true)
    expect(orgLogo.info()).toMatchObject({ set: false, required: true })
    expect((await authedGet(app, admin, '/admin/logo')).body.required).toBe(true)
    await authedPut(app, admin, '/admin/logo', { data: b64(demoPng) })
    expect(orgLogo.info().required).toBe(false)
  })
  test('Produktivwechsel lässt ein eigenes Logo stehen', () => {
    orgLogo.save(demoPng, { demo: false })
    expect(orgLogo.prepareForProduction()).toBe(false)
    expect(orgLogo.info().set).toBe(true)
  })
})

describe('Firmenlogo – PDF', () => {
  test('Richtlinien-PDF mit Logo ist gültig und größer als ohne', async () => {
    const { renderTemplateToPdf } = require('../server/pdfExport')
    const doc = { title: 'Testrichtlinie', content: '# Abschnitt\n\nText', versions: [] }
    const without = await renderTemplateToPdf(doc)
    orgLogo.save(demoPng)
    const withLogo = await renderTemplateToPdf(doc)
    expect(withLogo.subarray(0, 5).toString()).toBe('%PDF-')
    expect(withLogo.length).toBeGreaterThan(without.length)
  })
})
