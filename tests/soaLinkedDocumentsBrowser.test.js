'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Issue #110: Verknüpfte Dokumente im SoA-Control sind klickbar (echter Chrome): gleiche Ansicht mit Rückweg, neuer Tab per Verweis, nur für vorhandene Dokumente,
// Titel mit HTML/Apostroph führen nie Code aus.
const fs = require('fs')
const path = require('path')
const http = require('http')
const request = require('supertest')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('SoA: verknüpfte Dokumente öffnen (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs } = require('./setup/authHelper')
  const HOSTILE = `Leitlinie x'); window.__pwn1=1;//<img src=x onerror="window.__pwn2=1">`
  let dataDir, server, base, ids = {}, control
  jest.setTimeout(240000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-soalinkdocs-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    delete process.env.DEMO_HOSTING
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const app = require('../server/index.js')
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
    const co = await loginAs(app, 'contentowner'), ad = await loginAs(app, 'admin')
    const mk = async title => { const r = await request(app).post('/template').set('Cookie', co).send({ type: 'Policy', language: 'de', title, content: '# Inhalt\n\nText' }); expect(r.status).toBeLessThan(300); return r.body.id || r.body.template?.id }
    ids.d1 = await mk('Informationssicherheitsleitlinie'); ids.d2 = await mk(HOSTILE); ids.d3 = await mk('Wird gelöscht')
    const list = await request(app).get('/soa?framework=BSI').set('Cookie', ad); control = list.body[0].id
    const put = await request(app).put('/soa/' + encodeURIComponent(control)).set('Cookie', ad).send({ linkedTemplates: [ids.d1, ids.d2, ids.d3] }); expect(put.status).toBe(200)
    expect((await request(app).delete(`/template/Policy/${ids.d3}`).set('Cookie', co)).status).toBeLessThan(300)   // d3 ist danach gelöscht, bleibt aber am Control verknüpft
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password, mode) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'soaLinkedDocumentsBrowser.js'), CHROME, base, email, password, control, 'BSI', ids.d1, ids.d2, ids.d3, mode], { encoding: 'utf8', timeout: 200000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, err ? stderr : '']).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Administrator: Klick öffnet das Dokument, Rückweg zum aufgeklappten Control, neuer Tab per Verweis, feindlicher Titel bleibt Text', async () => {
    const out = await run('admin@test.local', 'adminpass', 'voll')
    if (!out) return
    const byText = t => out.tags.find(x => x.text.includes(t))
    expect(out.tags).toHaveLength(3)
    expect(byText('Informationssicherheitsleitlinie')).toMatchObject({ open: true, newtab: { target: '_blank', rel: 'noopener noreferrer' } })
    expect(byText('Informationssicherheitsleitlinie').href).toMatch(new RegExp(`#doc=Policy/${ids.d1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
    expect(out.tags.filter(t => !t.open)).toHaveLength(1)                                    // das gelöschte Dokument bleibt Text (kein Link)
    expect(out.tags.find(t => !t.open).text).toMatch(new RegExp(ids.d3))                    // … mit seiner Kennung wie bisher
    expect(out.opened).toMatchObject({ title: 'Informationssicherheitsleitlinie', id: ids.d1, soaVisible: false })
    expect(out.opened.backBar).toContain(control)                                           // „Zurück zu Control …“
    expect(out.back).toMatchObject({ detailVisible: true, activeTab: 'BSI', backBar: false })   // Control wieder aufgeklappt, gleicher Reiter, Leiste weg
    expect(out.hostile.title).toBe(HOSTILE)                                                 // der Titel kommt unverändert an …
    expect([out.hostile.pwn, out.hostile.strayImgs, out.afterHostile.pwn, out.afterHostile.strayImgs]).toEqual([[null, null], 0, [null, null], 0])   // … führt nie Code aus
    expect(out.rowClick).toEqual({ afterClose: false, afterOpen: true, badge: '3 Dokumente' })     // Klick auf den Titel klappt zu/auf; Zähler lokalisiert
    expect(out.deepLink).toMatchObject({ id: ids.d1, hash: '', backBar: false, editor: true })
    for (const k of ['invalid', 'unknown', 'badtype']) expect([k, out['deep_' + k]]).toEqual([k, { cur: null, hash: '', appBody: true, errors: 0 }])
  })

  test('Leser: Verknüpfungen sind ebenfalls klickbar und öffnen das Dokument', async () => {
    const out = await run('reader@test.local', 'readerpass', 'ansicht')
    if (!out) return
    expect(out.tags.filter(t => t.open)).toHaveLength(2)
    expect(out.opened).toMatchObject({ title: 'Informationssicherheitsleitlinie', id: ids.d1 })
    expect(out.back.detailVisible).toBe(true)
  })

  test('statisch: Verweise nur über data-Attribute und encodeURIComponent, kein Handler mit Wert', () => {
    const src = fs.readFileSync(path.join(__dirname, '../ui/app.js'), 'utf8'), i = src.indexOf('const DOC_LINK_TYPE')
    const block = src.slice(i, src.indexOf('async function saveSoaLinkedTemplates', i))
    expect(block).toMatch(/encodeURIComponent\(type\)\}\/\$\{encodeURIComponent\(id\)/); expect(block).not.toMatch(/onclick=/); expect(block).not.toMatch(/innerHTML = .*\$\{(?!escHtml)/)
    expect(src).toMatch(/class="soa-tmpl-open" href="\$\{escVal\(docDeepLink/)
  })
})
