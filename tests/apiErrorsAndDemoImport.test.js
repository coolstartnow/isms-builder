'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Regressionstest für #98 (Punkte 2 und 3 und Banner), Backend json:
//  - zu große bzw. ungültige JSON-Anfragen werden als JSON gemeldet (413/400), nicht als HTML-Seite
//  - der Demo-Import nimmt Bundles bis 50 MB an (der globale 100-kB-Parser stand davor) und sichert Dateinamen ab
//  - das Demo-Reset-Banner nennt die tatsächliche Anmeldekennung des Admins
const fs      = require('fs')
const path    = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost } = require('./setup/authHelper')

let dataDir, app, adminCookie

beforeAll(async () => {
  dataDir = createTestDataDir()
  Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-secret-api-errors', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
  app = require('../server/index.js')
  adminCookie = await loginAs(app, 'admin')
})
afterAll(() => removeTestDataDir(dataDir))

describe('Fehler beim Lesen der Anfrage kommen als JSON (#98)', () => {
  test('zu großer Body (200 kB auf einer normalen Route) → 413 als JSON, keine HTML-Seite', async () => {
    const res = await request(app).post('/risks').set('Cookie', adminCookie).set('Content-Type', 'application/json')
      .send(JSON.stringify({ title: 'x', pad: 'x'.repeat(200 * 1024) }))
    expect(res.status).toBe(413)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body.error).toMatch(/too large|zu groß/i)
    expect(res.text).not.toMatch(/<!DOCTYPE|<html/i)
  })
  test('ungültiges JSON → 400 als JSON', async () => {
    const res = await request(app).post('/risks').set('Cookie', adminCookie).set('Content-Type', 'application/json').send('{kaputt')
    expect(res.status).toBe(400)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body.error).toMatch(/Invalid JSON|Ungültiges JSON/i)
  })
  test('Fehlermeldung folgt der Sprache der Oberfläche (X-Lang)', async () => {
    const send = lang => request(app).post('/risks').set('Cookie', adminCookie).set('X-Lang', lang).set('Content-Type', 'application/json').send('{kaputt')
    expect((await send('en')).body.error).toBe('Invalid JSON in request body')
    expect((await send('de')).body.error).toBe('Ungültiges JSON in der Anfrage')
    expect((await send('hu')).body.error).toBe('Érvénytelen JSON a kérésben')
  })
})

describe('Demo-Import (#98)', () => {
  test('ein Bundle über 100 kB wird angenommen (eigener 50-MB-Parser steht vor dem globalen)', async () => {
    const res = await authedPost(app, adminCookie, '/admin/demo-import', { files: {}, pad: 'x'.repeat(300 * 1024) })
    expect(res.status).toBe(200)
  })
  test('Dateinamen mit Pfadanteilen werden nicht geschrieben', async () => {   // früher in dbBackendRoutes.test.js (#70/H0)
    const outside = path.join(dataDir, '..', 'escape-test.json')
    const bundle = { files: { 'goals.json': [], '../escape-test.json': { x: 1 }, 'sub/dir.json': {}, 'ok-name.json': { a: 1 } },
      gdpr: { '../gdpr-escape.json': {} } }
    const res = await authedPost(app, adminCookie, '/admin/demo-import', bundle)
    expect(res.status).toBe(200)
    expect(fs.existsSync(outside)).toBe(false)
    expect(fs.existsSync(path.join(dataDir, '..', 'gdpr-escape.json'))).toBe(false)
    expect(fs.existsSync(path.join(dataDir, 'sub'))).toBe(false)
    expect(fs.existsSync(path.join(dataDir, 'ok-name.json'))).toBe(true)
  })
})

describe('Demo-Reset-Banner nennt die tatsächliche Anmeldekennung (#98)', () => {
  const flag = () => path.join(dataDir, '.demo_reset_done')
  afterEach(() => { try { fs.unlinkSync(flag()) } catch { /* nicht vorhanden */ } })

  test('ohne Reset-Flag: inaktiv, keine Kennung in der öffentlichen Antwort', async () => {
    const res = await request(app).get('/auth/demo-reset-done')
    expect(res.body).toEqual({ active: false })
  })
  test('mit Flag: Kennung des Admins (E-Mail), auch wenn sie geändert wurde', async () => {
    fs.writeFileSync(flag(), new Date().toISOString())
    expect((await request(app).get('/auth/demo-reset-done')).body).toEqual({ active: true, admin: 'admin@test.local' })
    const rbac = require('../server/rbacStore')
    const u = rbac.getUserByUsername('admin')
    await authedPost(app, adminCookie, '/admin/users', { username: 'tmp-admin-mail', email: 'x@test.local', domain: 'IT', role: 'reader', password: 'tmppass123' })
    const before = u.email
    try {
      await request(app).put('/admin/users/admin').set('Cookie', adminCookie).send({ email: 'ciso@firma.example' })
      const after = (await request(app).get('/auth/demo-reset-done')).body
      expect(after.active).toBe(true)
      expect([before, 'ciso@firma.example']).toContain(after.admin)
    } finally { await request(app).delete('/admin/users/tmp-admin-mail').set('Cookie', adminCookie) }
  })
})
