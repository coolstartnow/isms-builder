'use strict'
// Vom Server erzeugte Texte in der Sprache der Organisation bzw. des Aufrufers:
// Digest-Mails, Kalender, CSV-Köpfe, öffentliche Bestätigungsseite, Papierkorb, PDF-Kopf.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./setup/authHelper')
const request = require('supertest')

let dataDir, app, admin, auditor, reader

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-srvtexts'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  admin   = await loginAs(app, 'admin')
  auditor = await loginAs(app, 'auditor')
  reader  = await loginAs(app, 'reader')
})
afterAll(() => removeTestDataDir(dataDir))

const withLang = (req, lang) => (lang ? req.set('X-Lang', lang) : req)

describe('Digest-Mails (notifier.collectDigests)', () => {
  // erst nach dem Start der App laden: Die Stores lesen DATA_DIR beim Laden
  let notifier

  beforeAll(async () => {
    notifier = require('../server/notifier')
    await authedPost(app, auditor, '/risks', { title: 'Digest-Risiko', probability: 5, impact: 5 })
    await authedPut(app, admin, '/admin/org-settings', {
      emailNotifications: { enabled: true, adminEmail: 'admin@example.org', risks: true },
      cisoSettings: { escalationEmail: 'ciso@example.org' },
      orgName: 'Testkonzern',
    })
  })

  test.each([
    ['de', 'Tagesübersicht', 'Risikomanagement', 'Kritisch'],
    ['en', 'Daily digest', 'Risk management', 'Critical'],
    ['fr', 'Récapitulatif quotidien', 'Gestion des risques', 'Critique'],
    ['nl', 'Dagoverzicht', 'Risicobeheer', 'Kritiek'],
    ['hu', 'Napi összefoglaló', 'Kockázatkezelés', 'Kritikus'],
  ])('Mail in %s: Betreff, Überschrift und Stufe', async (lang, subj, heading, level) => {
    const mails = await notifier.collectDigests({ lang })
    const ciso = mails.find(m => m.to === 'ciso@example.org')
    expect(ciso).toBeTruthy()
    expect(ciso.subject).toContain(subj)
    expect(ciso.html).toContain(`lang="${lang}"`)
    expect(ciso.html).toContain(heading)
    expect(ciso.html).toContain(level)
    expect(ciso.html).toContain('Digest-Risiko')          // Titel des Datensatzes bleibt unübersetzt
    expect(ciso.html).toContain('Testkonzern')
  })

  test('ohne aktive Benachrichtigungen entstehen keine Mails', async () => {
    await authedPut(app, admin, '/admin/org-settings', { emailNotifications: { enabled: false } })
    expect(await notifier.collectDigests({ lang: 'en' })).toEqual([])
    await authedPut(app, admin, '/admin/org-settings', { emailNotifications: { enabled: true } })
  })
})

describe('Kalender, CSV, Papierkorb', () => {
  test('Kalenderbeschriftung folgt X-Lang, der Titel des Eintrags bleibt', async () => {
    await authedPost(app, auditor, '/risks', { title: 'Kalender-Risiko', dueDate: '2030-01-15' })
    const get = lang => withLang(request(app).get('/calendar').set('Cookie', reader), lang)
    const find = body => body.find(e => (e.label || '').includes('Kalender-Risiko'))
    expect(find((await get('de')).body).label).toBe('Fälligkeit: Kalender-Risiko')
    expect(find((await get('en')).body).label).toBe('Due: Kalender-Risiko')
    expect(find((await get('hu')).body).label).toBe('Határidő: Kalender-Risiko')
  })

  test('CSV-Spaltenköpfe des Berichts folgen X-Lang', async () => {
    const csv = lang => withLang(request(app).get('/reports/export/csv?type=risks').set('Cookie', reader), lang)
    expect((await csv('de')).text).toMatch(/ID,Titel,Kategorie,Schweregrad/)
    expect((await csv('en')).text).toMatch(/ID,Title,Category,Severity/)
    expect((await csv('fr')).text).toMatch(/Gravité/)
    expect((await csv('hu')).text).toMatch(/Súlyosság/)
  })

  test('Papierkorb-Beschriftungen folgen X-Lang', async () => {
    const created = await authedPost(app, auditor, '/audits', { title: 'Papierkorb-Audit' })
    await request(app).delete(`/audits/${created.body.id}`).set('Cookie', auditor)
    const item = lang => withLang(request(app).get('/trash').set('Cookie', admin), lang)
    expect((await item('de')).body.find(i => i.id === created.body.id).moduleLabel).toBe('Audit')
    const risk = await authedPost(app, auditor, '/risks', { title: 'Weg damit' })
    await request(app).delete(`/risks/${risk.body.id}`).set('Cookie', admin)
    expect((await item('de')).body.find(i => i.id === risk.body.id).moduleLabel).toBe('Risiko')
    expect((await item('en')).body.find(i => i.id === risk.body.id).moduleLabel).toBe('Risk')
    expect((await item('hu')).body.find(i => i.id === risk.body.id).moduleLabel).toBe('Kockázat')
  })
})

describe('Öffentliche Bestätigungsseite', () => {
  test('Sprache über ?lang=, ungültiger Link ebenfalls übersetzt', async () => {
    for (const [lang, word] of [['de', 'Link ungültig'], ['en', 'Invalid link'], ['hu', 'Érvénytelen hivatkozás']]) {
      const res = await request(app).get(`/ack/gibt-es-nicht?lang=${lang}`)
      expect(res.status).toBe(404)
      expect(res.text).toContain(word)
      expect(res.text).toContain(`lang="${lang}"`)
    }
  })
})

describe('PDF-Export: Kopf in der Sprache des Dokuments', () => {
  test('liefert ein PDF je Sprache', async () => {
    const { renderTemplateToPdf } = require('../server/pdfExport')
    for (const language of ['de', 'en', 'fr', 'nl', 'hu']) {
      const buf = await renderTemplateToPdf({ title: 'Test', type: 'policy', status: 'approved', version: 2, owner: 'x', language,
        content: 'Text', versions: [{ version: 1, approvedBy: 'a', approvedAt: '2026-01-01T00:00:00Z', changes: '' }] })
      expect(buf.slice(0, 4).toString()).toBe('%PDF')
    }
  })
})
