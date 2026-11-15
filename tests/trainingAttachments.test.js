'use strict'
const LANG_REG = require('../ui/i18n/languages.js')
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Schulungen: Dateianhänge (Nachweise) und Teilnahmebestätigung (PDF).
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedPost, authedPut } = require('./setup/authHelper')

let dataDir, app, admin, reader, editor, trainingId, plannedId
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])

const upload = (cookie, id, buf, name) => request(app).post(`/training/${id}/attachments`).set('Cookie', cookie).attach('file', buf, name)

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-trainingattach-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = process.env.TEST_BACKEND || 'json'
  app = require('../server/index.js')
  if (app.bootstrap) await app.bootstrap()   // SQL: Schema anlegen
  admin = await loginAs(app, 'admin'); reader = await loginAs(app, 'reader'); editor = await loginAs(app, 'editor')
  const a = await authedPost(app, admin, '/training', { title: 'Phishing Q1', category: 'security_awareness', status: 'completed', completedDate: '2026-10-01', instructor: 'Frau Test', assignees: 'Team A', mandatory: true })
  trainingId = a.body.id
  plannedId = (await authedPost(app, admin, '/training', { title: 'Geplant', status: 'planned' })).body.id
})
afterAll(async () => {
  if (process.env.TEST_BACKEND) await require('../server/db/knexDatabase').destroy()
  removeTestDataDir(dataDir)
})

describe('Dateianhänge', () => {
  let att
  test('PDF wird angenommen, Antwort ohne Serverpfad, Datei liegt im Datenverzeichnis', async () => {
    const res = await upload(editor, trainingId, PDF, 'Teilnehmerliste.pdf')
    expect(res.status).toBe(201)
    att = res.body
    expect(att).toMatchObject({ originalName: 'Teilnehmerliste.pdf', mime: 'application/pdf', size: PDF.length })
    expect(att.filename).toBeUndefined(); expect(att.filePath).toBeUndefined()
    const files = fs.readdirSync(path.join(dataDir, 'training-files'))
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^[a-f0-9]{32}\.pdf$/)
  })
  test('Liste der Schulung nennt den Anhang ohne interne Angaben', async () => {
    const res = await request(app).get(`/training/${trainingId}`).set('Cookie', reader)
    expect(res.body.attachments).toHaveLength(1)
    expect(JSON.stringify(res.body)).not.toMatch(/"filename"|filePath/)
  })
  test('Leser darf nicht hochladen (403), aber herunterladen', async () => {
    expect((await upload(reader, trainingId, PDF, 'x.pdf')).status).toBe(403)
    const dl = await request(app).get(`/training/${trainingId}/attachments/${att.id}/file`).set('Cookie', reader)
    expect(dl.status).toBe(200)
    expect(dl.headers['content-type']).toMatch(/application\/pdf/)
    expect(dl.headers['x-content-type-options']).toBe('nosniff')
    expect(dl.headers['content-disposition']).toMatch(/^attachment; filename="Teilnehmerliste\.pdf"/)
  })
  test('falsche Endung, getarnte Datei, leere Datei und Skript werden abgelehnt', async () => {
    expect((await upload(editor, trainingId, PDF, 'evil.html')).status).toBe(400)
    expect((await upload(editor, trainingId, Buffer.from('<script>alert(1)</script>'), 'a.pdf')).status).toBe(400)
    expect((await upload(editor, trainingId, Buffer.from('<script>alert(1)</script>'), 'a.png')).status).toBe(400)
    expect((await upload(editor, trainingId, Buffer.alloc(0), 'leer.pdf')).status).toBe(400)
    expect((await upload(editor, trainingId, Buffer.from('MZ binär'), 'prog.exe')).status).toBe(400)
    expect(fs.readdirSync(path.join(dataDir, 'training-files'))).toHaveLength(1)
  })
  test('Pfad im Dateinamen bleibt wirkungslos; Anzeigename ist bereinigt', async () => {
    const res = await upload(editor, trainingId, PNG, '../../etc/pass"wd.png')
    expect(res.status).toBe(201)
    expect(res.body.originalName).not.toMatch(/[\\/"]/)
    expect(fs.existsSync(path.join(dataDir, 'etc'))).toBe(false)
  })
  test('Anhang gehört zu seiner Schulung (anderer Datensatz → 404)', async () => {
    expect((await request(app).get(`/training/${plannedId}/attachments/${att.id}/file`).set('Cookie', reader)).status).toBe(404)
    expect((await upload(editor, 'training_gibt_es_nicht', PDF, 'a.pdf')).status).toBe(404)
  })
  test('Ändern der Schulung lässt Anhänge unberührt', async () => {
    const put = await authedPut(app, admin, `/training/${trainingId}`, { evidence: 'neu', attachments: [] })
    expect(put.status).toBe(200)
    expect((await request(app).get(`/training/${trainingId}`).set('Cookie', reader)).body.attachments.length).toBe(2)
  })
  test('Entfernen markiert nur: aus der Liste, Datei bleibt auf dem Server', async () => {
    const before = fs.readdirSync(path.join(dataDir, 'training-files')).length
    expect((await request(app).delete(`/training/${trainingId}/attachments/${att.id}`).set('Cookie', reader)).status).toBe(403)
    expect((await request(app).delete(`/training/${trainingId}/attachments/${att.id}`).set('Cookie', editor)).status).toBe(200)
    expect(fs.readdirSync(path.join(dataDir, 'training-files')).length).toBe(before)
    const item = (await request(app).get(`/training/${trainingId}`).set('Cookie', reader)).body
    expect(item.attachments.map(a => a.id)).not.toContain(att.id)
    expect((await request(app).get(`/training/${trainingId}/attachments/${att.id}/file`).set('Cookie', reader)).status).toBe(404)
    if (!process.env.TEST_BACKEND) {   // JSON-Speicher: entfernter Anhang bleibt mit Vermerk am Datensatz
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'training.json'), 'utf8')).find(t => t.id === trainingId)
      expect(raw.attachments.find(a => a.id === att.id)).toMatchObject({ removedBy: expect.any(String) })
    }
  })
  test('Hochladen und Entfernen stehen im Audit-Log', async () => {
    const log = (await request(app).get('/admin/audit-log').set('Cookie', admin)).body
    const entries = Array.isArray(log) ? log : (log.entries || [])
    expect(entries.some(e => e.resource === 'training' && /Anhang:/.test(e.detail || ''))).toBe(true)
    expect(entries.some(e => e.resource === 'training' && /Anhang entfernt/.test(e.detail || ''))).toBe(true)
  })
})

describe('Teilnahmebestätigung', () => {
  const get = (cookie, id, q = '') => request(app).get(`/training/${id}/confirmation.pdf${q}`).set('Cookie', cookie).buffer(true).parse((res, cb) => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))) })
  test('nicht abgeschlossen → 409 mit Code', async () => {
    const res = await request(app).get(`/training/${plannedId}/confirmation.pdf`).set('Cookie', reader)
    expect(res.status).toBe(409); expect(res.body.code).toBe('not_completed')
  })
  test('abgeschlossen → PDF zum Herunterladen, auch für Leser', async () => {
    const res = await get(reader, trainingId, '?lang=de')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
    expect(res.headers['content-disposition']).toMatch(/Teilnahmebestaetigung-Phishing-Q1-2026-10-01\.pdf/)
    expect(res.body.slice(0, 5).toString()).toBe('%PDF-')
  })
  test('Prüfcode: stabil bei gleichen, anders bei geänderten Angaben', () => {
    const { verificationCode } = require('../server/trainingCertificate')
    const base = { id: 't1', title: 'A', completedDate: '2026-10-01', instructor: 'X', assignees: 'Y' }
    expect(verificationCode(base)).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/)
    expect(verificationCode(base)).toBe(verificationCode({ ...base }))
    for (const k of ['title', 'completedDate', 'instructor', 'assignees']) expect(verificationCode({ ...base, [k]: base[k] + '!' })).not.toBe(verificationCode(base))
  })
  test('alle fünf Sprachen und Sonderzeichen ergeben ein PDF; ő/ű werden ersetzt', async () => {
    const { renderTrainingConfirmation, latin } = require('../server/trainingCertificate')
    expect(latin('Árvíztűrő tükörfúrógép Ő Ű')).toBe('Árvíztürö tükörfúrógép Ö Ü')
    for (const lang of LANG_REG.completeCodes()) {
      const buf = await renderTrainingConfirmation({ id: 'x', title: 'Zażółć ✓ <b>"&"</b>', description: 'd'.repeat(900), category: 'gdpr', completedDate: '2026-10-01', instructor: 'Ő', assignees: 'A\nB', mandatory: false, linkedControls: ['A.6.3'], linkedPolicies: [] }, { lang, orgName: 'Muster & Söhne GmbH', issuedBy: 'carla' })
      expect(buf.slice(0, 5).toString()).toBe('%PDF-')
    }
  })
  test('Teilnahmebestätigung wird protokolliert', async () => {
    const log = (await request(app).get('/admin/audit-log').set('Cookie', admin)).body
    const entries = Array.isArray(log) ? log : (log.entries || [])
    expect(entries.some(e => e.resource === 'training' && /Teilnahmebest/.test(e.detail || ''))).toBe(true)
  })
})
