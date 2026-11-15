// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Anschluss an den Lieferanten-Briefkasten: Einrichtung, Ablegen, Abholen, Entschlüsseln, Datei-Import
'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const crypto = require('crypto')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')

let app, request, dataDir, keyDir, fake, fakeUrl
const API_KEY = 'a'.repeat(40)
const store = { q: new Map(), a: new Map(), calls: [] }

// Nachbau des Briefkastens (nur die drei Endpunkte, die der Builder braucht)
function startFake() {
  return new Promise(resolve => {
    fake = http.createServer((req, res) => {
      let body = ''; req.on('data', c => body += c)
      req.on('end', () => {
        store.calls.push(`${req.method} ${req.url}`)
        const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }
        if (req.headers.authorization !== 'Bearer ' + API_KEY) return send(401, { error: 'no' })
        let m
        if ((m = /^\/api\/q\/([0-9a-f]{48})$/.exec(req.url))) {
          if (req.method === 'PUT') { store.q.set(m[1], JSON.parse(body)); return send(200, { ok: true }) }
          if (req.method === 'DELETE') { store.q.delete(m[1]); store.a.delete(m[1]); return send(200, { ok: true }) }
        }
        if (req.url === '/api/answers' && req.method === 'GET') return send(200, { answers: [...store.a.values()] })
        send(404, {})
      })
    }).listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${fake.address().port}`))
  })
}

// Verschlüsselung wie im Browser des Lieferanten (Format v1)
function encryptLikeBrowser(jwk, token, payload) {
  const pub = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const aes = crypto.randomBytes(32), iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', aes, iv); c.setAAD(Buffer.from(token))
  const ct = Buffer.concat([c.update(JSON.stringify(payload)), c.final(), c.getAuthTag()])
  const ek = crypto.publicEncrypt({ key: pub, oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, aes)
  return { v: 1, ek: ek.toString('base64url'), iv: iv.toString('base64url'), ct: ct.toString('base64url') }
}

beforeAll(async () => {
  dataDir = createTestDataDir(); keyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-key-'))
  process.env.DATA_DIR = dataDir
  process.env.SUPPLIER_PORTAL_KEY_FILE = path.join(keyDir, 'portal.pem')
  process.env.JWT_SECRET = 'jest-test-secret-supplier-portal-0123456789'
  fakeUrl = await startFake()
  app = require('../server/index'); request = require('supertest')
})
afterAll(async () => { await new Promise(r => fake.close(r)); removeTestDataDir(dataDir); fs.rmSync(keyDir, { recursive: true, force: true }) })

const CREDS = { admin: ['admin@test.local', 'adminpass'], editor: ['editor@test.local', 'editorpass'], reader: ['reader@test.local', 'readerpass'] }
const auth = role => request(app).post('/login').send({ email: CREDS[role][0], password: CREDS[role][1] }).then(r => r.headers['set-cookie'])
const catalogs = require('../server/db/assessmentCatalogs')

describe('Einrichtung', () => {
  test('nur Administratoren richten ein; der API-Schlüssel wird nie ausgegeben', async () => {
    const ed = await auth('editor'), ad = await auth('admin')
    expect((await request(app).get('/supplier-portal/config').set('Cookie', ed)).status).toBe(403)
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ed).send({ url: fakeUrl })).status).toBe(403)
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ url: 'ftp://x' })).status).toBe(400)
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ url: 'http://portal.example.org' })).status).toBe(400)   // http nur für localhost
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ url: 'https://user:pw@portal.example.org' })).status).toBe(400)
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ apiKey: 'kurz' })).status).toBe(400)
    const ok = await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ url: fakeUrl, apiKey: API_KEY })
    expect(ok.status).toBe(200)
    expect(JSON.stringify(ok.body)).not.toContain(API_KEY)
    expect(ok.body).toMatchObject({ apiKeySet: true, keyReady: false, enabled: false })
    // ohne Schlüsselpaar nicht aktivierbar
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ enabled: true })).status).toBe(400)
    const k = await request(app).post('/supplier-portal/key').set('Cookie', ad).send({})
    expect(k.status).toBe(201); expect(k.body.keyReady).toBe(true)
    expect(fs.statSync(process.env.SUPPLIER_PORTAL_KEY_FILE).mode & 0o777).toBe(0o600)
    expect((await request(app).post('/supplier-portal/key').set('Cookie', ad).send({})).status).toBe(409)      // nicht versehentlich ersetzen
    expect((await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ enabled: true })).status).toBe(200)
    const cfgFile = fs.readFileSync(path.join(dataDir, 'supplier-portal.json'), 'utf8')
    expect(fs.statSync(path.join(dataDir, 'supplier-portal.json')).mode & 0o777).toBe(0o600)
    void cfgFile
  })
  test('Verbindungstest: richtiger und falscher Schlüssel', async () => {
    const ad = await auth('admin')
    expect((await request(app).post('/supplier-portal/test').set('Cookie', ad)).body).toMatchObject({ ok: true })
    await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ apiKey: 'b'.repeat(40) })
    expect((await request(app).post('/supplier-portal/test').set('Cookie', ad)).body).toMatchObject({ ok: false })
    await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ apiKey: API_KEY })
  })
  test('Reader sieht nur den Status', async () => {
    const rd = await auth('reader')
    const r = await request(app).get('/supplier-portal/status').set('Cookie', rd)
    expect(r.status).toBe(200); expect(r.body.enabled).toBe(true)
    expect(JSON.stringify(r.body)).not.toContain(fakeUrl)
  })
})

describe('Fragebogen ablegen und Antworten abholen', () => {
  let ed, sup, a
  beforeAll(async () => {
    ed = await auth('editor')
    sup = (await request(app).post('/suppliers').set('Cookie', ed).send({ name: 'Portal-Lieferant', type: 'software', criticality: 'high', status: 'active', country: 'DE' })).body
  })
  const base = catalogs.defaultSpec('nis2')
  const spec = () => ({ catalog: 'nis2', selection: [{ id: base.selection[0].id, required: true, comment: true }, { id: base.selection[1].id, required: false, comment: false }], custom: [] })

  test('delivery=portal legt den Fragebogen im Briefkasten ab und liefert den öffentlichen Link', async () => {
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: spec(), delivery: 'portal' })
    expect(r.status).toBe(201); a = r.body
    expect(a.delivery).toBe('portal')
    expect(a.portalLink).toBe(`${fakeUrl}/q/${a.token}`)
    const posted = store.q.get(a.token)
    expect(posted.publicKey.kty).toBe('RSA'); expect(posted.publicKey.d).toBeUndefined()      // nie der private Teil
    expect(posted.questions[0].questions[0].comment).toBe(true)
    expect(posted.questions[0].questions.map(q => q.id)).toEqual(spec().selection.map(s => s.id))
  })
  test('die Seite des Builders liefert Briefkasten-Fragebögen nicht aus', async () => {
    expect((await request(app).get(`/supplier-assessment/${a.token}`)).status).toBe(404)
    expect((await request(app).post(`/supplier-assessment/${a.token}`).type('form').send({})).status).toBe(404)
  })
  test('Briefkasten nicht erreichbar → 502 und kein Datensatz bleibt zurück', async () => {
    const ad = await auth('admin')
    await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ url: 'http://127.0.0.1:9' })
    const before = (await request(app).get(`/assessments?supplierId=${sup.id}`).set('Cookie', ed)).body.length
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', delivery: 'portal' })
    expect(r.status).toBe(502)
    expect((await request(app).get(`/assessments?supplierId=${sup.id}`).set('Cookie', ed)).body.length).toBe(before)
    await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ url: fakeUrl })
  })
  test('Abholen: entschlüsselt, trägt ein, löscht im Briefkasten', async () => {
    const [q1, q2] = spec().selection.map(s => s.id)
    const env = encryptLikeBrowser(store.q.get(a.token).publicKey, a.token, { token: a.token, answers: [{ id: q1, value: 'yes', note: 'https://example.org/iso.pdf' }, { id: q2, value: 'no', note: 'ignoriert' }, { id: 'q_fremd', value: 'x' }] })
    store.a.set(a.token, { token: a.token, submittedAt: new Date().toISOString(), envelope: env })
    const r = await request(app).post('/supplier-portal/poll').set('Cookie', ed)
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ imported: 1, skipped: 0 })
    const item = (await request(app).get(`/assessments/${a.id}`).set('Cookie', ed)).body
    expect(item.status).toBe('submitted')
    const an = Object.fromEntries(item.answers.map(x => [x.id, x]))
    expect(an[q1]).toMatchObject({ value: 'yes', note: 'https://example.org/iso.pdf' })
    expect(an[q2].note).toBeUndefined()                  // Frage ohne Bemerkungsfeld
    expect(an.q_fremd).toBeUndefined()                   // unbekannte Fragen werden verworfen
    expect(store.calls).toContain(`DELETE /api/q/${a.token}`)
    expect(store.a.size).toBe(0)
  })
  test('fehlende Pflichtantwort wird übernommen, aber markiert', async () => {
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: spec(), delivery: 'portal' })
    const t = r.body.token, [q1] = spec().selection.map(s => s.id)
    store.a.set(t, { token: t, submittedAt: new Date().toISOString(), envelope: encryptLikeBrowser(store.q.get(t).publicKey, t, { token: t, answers: [{ id: q1, value: '' }] }) })
    await request(app).post('/supplier-portal/poll').set('Cookie', ed)
    const item = (await request(app).get(`/assessments/${r.body.id}`).set('Cookie', ed)).body
    expect(item.status).toBe('submitted'); expect(item.missingRequired).toEqual([q1])
  })
  test('falsches Token im Umschlag, fremder Schlüssel und kaputte Daten: nichts wird übernommen, nichts gelöscht', async () => {
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: spec(), delivery: 'portal' })
    const t = r.body.token, other = crypto.randomBytes(24).toString('hex'), [q1] = spec().selection.map(s => s.id)
    const pub = store.q.get(t).publicKey
    store.a.set(t, { token: t, submittedAt: 'x', envelope: encryptLikeBrowser(pub, other, { token: other, answers: [] }) })               // AAD passt nicht
    const wrongKey = crypto.generateKeyPairSync('rsa', { modulusLength: 3072 }).publicKey.export({ format: 'jwk' })
    const t2 = (await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: spec(), delivery: 'portal' })).body.token
    store.a.set(t2, { token: t2, submittedAt: 'x', envelope: encryptLikeBrowser(wrongKey, t2, { token: t2, answers: [] }) })               // anderer Schlüssel
    store.a.set('f'.repeat(48), { token: 'f'.repeat(48), envelope: { v: 1, ek: 'a', iv: 'b', ct: 'c' } })                                    // kaputt / unbekannt
    store.a.set('zz', { token: 'zz', envelope: {} })                                                                                          // ungültiges Token
    store.calls.length = 0
    const res = await request(app).post('/supplier-portal/poll').set('Cookie', ed)
    expect(res.body.imported).toBe(0); expect(res.body.skipped).toBe(4)
    expect(store.calls.filter(c => c.startsWith('DELETE'))).toEqual([])
    expect((await request(app).get(`/assessments/${r.body.id}`).set('Cookie', ed)).body.status).toBe('pending')
    void q1; store.a.clear()
  })
  test('Datei-Import (Rückfall): gleiche Prüfung, kein Netz, nichts im Briefkasten gelöscht', async () => {
    const r = await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, language: 'de', spec: spec(), delivery: 'portal' })
    const t = r.body.token, [q1] = spec().selection.map(s => s.id)
    const env = encryptLikeBrowser(store.q.get(t).publicKey, t, { token: t, answers: [{ id: q1, value: 'no' }] })
    store.calls.length = 0
    const imp = await request(app).post('/supplier-portal/import').set('Cookie', ed).send({ answers: [{ token: t, envelope: env }] })
    expect(imp.body).toMatchObject({ imported: 1 })
    expect(store.calls).toEqual([])
    expect((await request(app).post('/supplier-portal/import').set('Cookie', ed).send({ answers: 'x' })).status).toBe(400)
    expect((await request(app).post('/supplier-portal/import').set('Cookie', await auth('reader')).send({ answers: [] })).status).toBe(403)
  })
  test('ohne aktivierten Briefkasten: delivery=portal → 409, Abholen → 409', async () => {
    const ad = await auth('admin')
    await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ enabled: false })
    expect((await request(app).post('/assessments').set('Cookie', ed).send({ supplierId: sup.id, delivery: 'portal' })).status).toBe(409)
    expect((await request(app).post('/supplier-portal/poll').set('Cookie', ed)).status).toBe(409)
    await request(app).put('/supplier-portal/config').set('Cookie', ad).send({ enabled: true })
  })
})

describe('Schlüsselersatz', () => {
  test('beim Ersetzen bleibt der alte Schlüssel als Kopie erhalten', async () => {
    const ad = await auth('admin')
    expect((await request(app).post('/supplier-portal/key').set('Cookie', ad).send({ replace: true })).status).toBe(201)
    expect(fs.readdirSync(keyDir).filter(f => f.endsWith('.alt'))).toHaveLength(1)
  })
})

describe('Schlüsselpfad im Testbetrieb', () => {
  test('ohne SUPPLIER_PORTAL_KEY_FILE liegt der Schlüssel im Datenverzeichnis, nie im Home', () => {
    const saved = process.env.SUPPLIER_PORTAL_KEY_FILE
    const home = path.join(os.homedir(), '.config', 'isms-builder', 'supplier-portal.pem')
    const stat = () => { try { const s = fs.statSync(home); return `${s.size}:${s.mtimeMs}` } catch { return 'fehlt' } }
    const before = stat()                                   // ein echter Schlüssel (z. B. der der lokalen Demo) darf vorhanden sein, muss aber unberührt bleiben
    delete process.env.SUPPLIER_PORTAL_KEY_FILE
    try {
      const portal = require('../server/supplierPortal')
      const r = portal.generateKey({ replace: true })
      expect(r.ok).toBe(true)
      expect(fs.existsSync(path.join(dataDir, 'supplier-portal.pem'))).toBe(true)
      expect(stat()).toBe(before)
    } finally { process.env.SUPPLIER_PORTAL_KEY_FILE = saved }
  })
})
