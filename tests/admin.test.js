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
  // herausgefiltert (inzwischen für alle Rollen, auch admin: Geheimnisse sind nur schreibbar), der Rest (u. a. navOrder) bleibt lesbar,
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

  // Geheimnisse sind nur schreibbar: auch der Administrator bekommt sie nie ausgeliefert, auch nicht im Datenexport.
  const rawSettings = async () => require('../server/db/orgSettingsStore').get()

  test('GET /admin/org-settings – auch admin sieht KEINE Zugangsdaten, nur ob sie gesetzt sind', async () => {
    const res = await authedGet(app, adminCookie, '/admin/org-settings')
    expect(res.status).toBe(200)
    expect(res.body.smtpSettings?.pass).toBeUndefined()
    expect(res.body.webdavSettings?.appPassword).toBeUndefined()
    expect(res.body.smtpSettings?.passSet).toBe(true)
    expect(res.body.webdavSettings?.appPasswordSet).toBe(true)
    expect(JSON.stringify(res.body)).not.toMatch(/super-secret/)
    expect(res.body.smtpSettings?.host).toBe('smtp.example.com')   // übrige Felder bleiben sichtbar
  })

  test('PUT mit leerem Geheimnis lässt den gespeicherten Wert unverändert (Antwort ohne Geheimnis)', async () => {
    const res = await authedPut(app, adminCookie, '/admin/org-settings', {
      smtpSettings: { host: 'smtp2.example.com', pass: '' }, webdavSettings: { username: 'isms2', appPassword: '' },
    })
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toMatch(/super-secret/)
    expect(res.body.smtpSettings.passSet).toBe(true)
    const raw = await rawSettings()
    expect(raw.smtpSettings.host).toBe('smtp2.example.com')
    expect(raw.smtpSettings.pass).toBe('super-secret-smtp')
    expect(raw.webdavSettings.appPassword).toBe('super-secret-webdav')
  })

  test('PUT ohne smtpSettings/webdavSettings lässt die Geheimnisse unverändert', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', { orgName: 'Acme' })
    const raw = await rawSettings()
    expect(raw.smtpSettings.pass).toBe('super-secret-smtp'); expect(raw.webdavSettings.appPassword).toBe('super-secret-webdav')
  })

  test('PUT mit neuem Wert ersetzt das Geheimnis; die Nur-Lese-Kennzeichen werden nie gespeichert', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', { smtpSettings: { pass: 'neu-smtp', passSet: false, clearPass: false }, webdavSettings: { appPasswordSet: false } })
    const raw = await rawSettings()
    expect(raw.smtpSettings.pass).toBe('neu-smtp')
    expect(raw.smtpSettings).not.toHaveProperty('passSet'); expect(raw.smtpSettings).not.toHaveProperty('clearPass')
    expect(raw.webdavSettings).not.toHaveProperty('appPasswordSet')
    expect(raw.webdavSettings.appPassword).toBe('super-secret-webdav')
  })

  test('clearPass / clearAppPassword entfernen das Geheimnis', async () => {
    const res = await authedPut(app, adminCookie, '/admin/org-settings', { smtpSettings: { clearPass: true }, webdavSettings: { clearAppPassword: true } })
    expect(res.body.smtpSettings.passSet).toBe(false); expect(res.body.webdavSettings.appPasswordSet).toBe(false)
    const raw = await rawSettings()
    expect(raw.smtpSettings.pass).toBe(''); expect(raw.webdavSettings.appPassword).toBe('')
    expect(raw.smtpSettings).not.toHaveProperty('clearPass')
  })

  test('Datenexport enthält weder Passwort-Hashes, 2FA-Geheimnisse noch Dienst-Passwörter', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', { smtpSettings: { pass: 'export-smtp-geheim' }, webdavSettings: { appPassword: 'export-webdav-geheim' } })
    const res = await authedGet(app, adminCookie, '/admin/export')
    expect(res.status).toBe(200)
    const text = JSON.stringify(res.body)
    // geprüft wird auf die echten Werte (die Guidance enthält Beispieltext mit dem Wort „passwordHash“)
    const rbac = require('../server/rbacStore')
    const realHashes = ['admin', 'editor', 'reader'].map(u => (rbac.getUserByUsername(u) || {}).passwordHash).filter(Boolean)
    expect(realHashes.length).toBeGreaterThan(0)
    for (const h of realHashes) expect(text).not.toContain(h)
    expect(text).not.toMatch(/export-smtp-geheim|export-webdav-geheim/)
    expect(JSON.stringify(res.body.files['rbac_users.json'])).not.toMatch(/passwordHash|totpSecret/)
    expect(res.body.files['rbac_users.json']).toBeTruthy()                           // Benutzer sind enthalten, nur ohne Geheimnisse
    expect(Object.values(res.body.files['rbac_users.json']).every(u => u.username && !('passwordHash' in u))).toBe(true)
    expect(res.body.files['org-settings.json'].smtpSettings.passSet).toBe(true)
  })

  test('WebDAV-Verbindungstest: leeres Passwortfeld nutzt das gespeicherte – aber nur für die gespeicherte Adresse (kein Auslesen)', async () => {
    await authedPut(app, adminCookie, '/admin/org-settings', { webdavSettings: { baseUrl: 'https://cloud.example.com/dav', username: 'isms', appPassword: 'webdav-test-geheim' } })
    const webdav = require('../server/webdav')
    const spy = jest.spyOn(webdav, 'testConnection').mockResolvedValue({ ok: false, error: 'mock' })
    try {
      // gleiche Adresse und gleicher Benutzer, Passwortfeld leer → gespeichertes Passwort
      await authedPost(app, adminCookie, '/admin/webdav/test', { baseUrl: 'https://cloud.example.com/dav', username: 'isms', appPassword: '' })
      expect(spy.mock.calls[0][0].appPassword).toBe('webdav-test-geheim')
      // fremde Adresse oder anderer Benutzer → das gespeicherte Passwort wird NICHT mitgeschickt
      await authedPost(app, adminCookie, '/admin/webdav/test', { baseUrl: 'https://angreifer.example.org/dav', username: 'isms', appPassword: '' })
      expect(spy.mock.calls[1][0].appPassword).toBeFalsy()
      await authedPost(app, adminCookie, '/admin/webdav/test', { baseUrl: 'https://cloud.example.com/dav', username: 'anderer', appPassword: '' })
      expect(spy.mock.calls[2][0].appPassword).toBeFalsy()
      // ausdrücklich eingegebenes Passwort wird verwendet
      await authedPost(app, adminCookie, '/admin/webdav/test', { baseUrl: 'https://x.example.org', username: 'u', appPassword: 'eingegeben' })
      expect(spy.mock.calls[3][0].appPassword).toBe('eingegeben')
    } finally { spy.mockRestore() }
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
