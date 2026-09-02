'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./setup/authHelper')

let dataDir, app, adminCookie, readerCookie
let createdUsername

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-admin'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')

  adminCookie  = await loginAs(app, 'admin')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(async () => {
  if (createdUsername) {
    await authedDelete(app, adminCookie, `/admin/users/${createdUsername}`)
  }
  removeTestDataDir(dataDir)
})

describe('Benutzerverwaltung', () => {
  test('GET /admin/users – gibt alle Nutzer zurück', async () => {
    const res = await authedGet(app, adminCookie, '/admin/users')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Testnutzer aus Seed vorhanden
    const names = res.body.map(u => u.username)
    expect(names).toContain('admin')
    expect(names).toContain('editor')
  })

  test('POST /admin/users – admin erstellt neuen Nutzer', async () => {
    createdUsername = 'testuser-' + Date.now()
    const res = await authedPost(app, adminCookie, '/admin/users', {
      username: createdUsername,
      email:    `${createdUsername}@test.local`,
      domain:   'IT',
      role:     'reader',
      password: 'testuserpass',
    })
    expect(res.status).toBe(201)
    expect(res.body.username).toBe(createdUsername)
    expect(res.body.role).toBe('reader')
    // Passwort darf NICHT in der Antwort stehen
    expect(res.body.passwordHash).toBeUndefined()
  })

  test('PUT /admin/users/:username – Rolle ändern', async () => {
    const res = await authedPut(app, adminCookie, `/admin/users/${createdUsername}`, {
      role: 'editor',
    })
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('editor')
  })

  test('DELETE /admin/users/:username – Nutzer löschen', async () => {
    const res = await authedDelete(app, adminCookie, `/admin/users/${createdUsername}`)
    expect(res.status).toBe(200)
    createdUsername = null
  })

  test('reader hat KEINEN Zugriff auf Nutzerverwaltung (403)', async () => {
    const res = await authedGet(app, readerCookie, '/admin/users')
    expect(res.status).toBe(403)
  })
})

describe('Konzernstruktur', () => {
  let entityId

  afterAll(async () => {
    if (entityId) await authedDelete(app, adminCookie, `/entities/${entityId}`)
  })

  test('GET /entities – gibt Entitäten zurück', async () => {
    const res = await authedGet(app, readerCookie, '/entities')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('GET /entities/tree – Baumstruktur', async () => {
    const res = await authedGet(app, readerCookie, '/entities/tree')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test('POST /entities – admin erstellt Gesellschaft', async () => {
    const res = await authedPost(app, adminCookie, '/entities', {
      name:      'Test GmbH',
      shortName: 'TG',
      type:      'subsidiary',
      parentId:  'holding-1',
    })
    expect(res.status).toBe(201)
    entityId = res.body.id
  })

  test('reader darf NICHT erstellen (403)', async () => {
    const res = await authedPost(app, readerCookie, '/entities', { name: 'X' })
    expect(res.status).toBe(403)
  })
})

describe('Org-Einstellungen', () => {
  test('GET /admin/org-settings – reader kann lesen', async () => {
    const res = await authedGet(app, readerCookie, '/admin/org-settings')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('companyName')
  })

  test('PUT /admin/org-settings – nur admin', async () => {
    const res = await authedPut(app, adminCookie, '/admin/org-settings', {
      companyName: 'Aktualisierte GmbH',
    })
    expect(res.status).toBe(200)
    expect(res.body.companyName).toBe('Aktualisierte GmbH')
  })

  test('reader darf NICHT schreiben (403)', async () => {
    const res = await authedPut(app, readerCookie, '/admin/org-settings', { companyName: 'X' })
    expect(res.status).toBe(403)
  })

  // GHSA-63xg-pg3x-g36f: GET /admin/org-settings gab SMTP-/WebDAV-Zugangsdaten
  // im Klartext an jede Rolle ab 'reader' zurück. Fix: Felder werden für
  // Nicht-Admins herausgefiltert, der Rest (u. a. navOrder) bleibt lesbar,
  // da alle Rollen ihn beim Login brauchen.
  test('GET /admin/org-settings – reader sieht KEINE Zugangsdaten (GHSA-63xg-pg3x-g36f)', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', {
      smtpSettings:   { host: 'smtp.example.com', user: 'notify@example.com', pass: 'super-secret-smtp' },
      webdavSettings: { enabled: true, baseUrl: 'https://cloud.example.com', username: 'isms', appPassword: 'super-secret-webdav' },
    })

    const res = await authedGet(app, readerCookie, '/admin/org-settings')
    expect(res.status).toBe(200)
    expect(res.body.smtpSettings?.pass).toBeUndefined()
    expect(res.body.webdavSettings?.appPassword).toBeUndefined()
    // Nicht-geheime Felder bleiben für reader sichtbar
    expect(res.body.smtpSettings?.host).toBe('smtp.example.com')
    expect(res.body.webdavSettings?.username).toBe('isms')
  })

  test('GET /admin/org-settings – admin sieht weiterhin die vollen Zugangsdaten', async () => {
    const res = await authedGet(app, adminCookie, '/admin/org-settings')
    expect(res.status).toBe(200)
    expect(res.body.smtpSettings?.pass).toBe('super-secret-smtp')
    expect(res.body.webdavSettings?.appPassword).toBe('super-secret-webdav')
  })
})

describe('Audit-Log', () => {
  test('GET /admin/audit-log – nur admin', async () => {
    const res = await authedGet(app, adminCookie, '/admin/audit-log')
    expect(res.status).toBe(200)
  })

  test('reader hat KEINEN Zugriff (403)', async () => {
    const res = await authedGet(app, readerCookie, '/admin/audit-log')
    expect(res.status).toBe(403)
  })
})
