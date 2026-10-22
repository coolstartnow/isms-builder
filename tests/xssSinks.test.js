'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gespeichertes XSS (GHSA-m8g6-pq5j-2r9r, weitere Stellen): Texte, die Konten mit Schreibrecht speichern, dürfen in der Oberfläche anderer Konten
// (z. B. Administrator) nie als HTML wirken. Statischer Wächter + Browsertest im echten Chrome.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')
const request = require('supertest')
const ROOT = path.join(__dirname, '..')
const APP = fs.readFileSync(path.join(ROOT, 'ui', 'app.js'), 'utf8')

describe('statischer Wächter', () => {
  const unsafe = [
    ['Bericht Dokumentenübersicht', /<td>\$\{tpl\.title\}<\/td>/],
    ['Bericht: Typ', /<td>\$\{tpl\.type\}<\/td>/],
    ['globale Suche: Titel', /search-result-title">\$\{r\.title\}</],
    ['Anhangsname', /title="\$\{a\.originalName\}"/],
    ['CVE-Kennungen', /\$\{\(r\.cveIds\|\|\[\]\)\.join\(', '\)\|\|'—'\}/],
    ['SoA: Verantwortliche/r', /value="\$\{c\.owner\|\|''\}"/],
    ['SoA: Begründung', /value="\$\{c\.justification\|\|''\}"/],
    ['SoA: Titel und Thema', /\$\{c\.theme\}<\/span>|soa-ctrl-title">\$\{c\.title\}/],
    ['Brotkrumen', /tmpl-breadcrumb-current">\$\{c\.title\}/],
  ]
  test.each(unsafe)('%s steht nicht mehr ungeschützt in einer Vorlage', (name, re) => expect(re.test(APP)).toBe(false))

  test('öffentliche Bewertungsseite maskiert die Fragekennung', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'assessmentPublic.js'), 'utf8')
    expect(src).not.toMatch(/(name|id|for)="\$\{q\.id\}"/)
  })

  // Allgemeiner Wächter: Felder, die Nutzer frei setzen können, stehen in HTML-Vorlagen nur innerhalb von escHtml(...).
  // (Heuristik: reine Feldzugriffe `${x.title}` / `${(x.list||[]).join(...)}`; Zeilen für fetch/textContent/className/... sind ausgenommen.)
  const RISK = new Set(['title', 'name', 'owner', 'desc', 'text', 'theme', 'ref', 'message', 'framework', 'topic', 'role', 'originalName', 'justification', 'notes', 'description', 'url', 'status', 'type', 'version', 'dueDate', 'date', 'reviewDate', 'nextReviewDate', 'completedDate', 'signatureDate', 'effectiveUntil', 'nextTest', 'lastTested', 'nextAuditDate', 'endOfLifeDate', 'code', 'email', 'responsible', 'assignees', 'instructor', 'department', 'processOwner', 'scope', 'author', 'createdBy', 'updatedBy', 'user', 'username', 'domain', 'short', 'shortCode', 'templateTitle', 'supplierName', 'entityName', 'phase', 'severity', 'category', 'kind', 'origin'])
  const SKIP = /fetch\(|textContent|className|location\.|\.value\s*=|alert\(|throw new|console\.|\.href\s*=|document\.title|\.setAttribute|window\.open|classList|dataset\.|\.innerText|URL\(|encodeURIComponent/
  // bewusst ausgenommen (Konstanten oder reine Zahlen/Kennungen aus dem Programm, nicht von Nutzern): Zeile → Begründung
  const EXEMPT = [
    ['auPrint(`${', 'auPrint() maskiert den Titel selbst (escHtml im <title>)'],
    ['• ${u.label', 'Text für alert(), kein HTML'],
    ['const version = tmpl.version', 'Teil eines Dateinamens, kein HTML'],
    ['const status  = tmpl.status', 'Teil eines Dateinamens, kein HTML'],
    ['const label = x => kind', 'Beschriftung für Filter; an den Verwendungsstellen steht escHtml(label(x))'],
  ]
  function findings() {
    const out = []
    APP.split('\n').forEach((line, ln) => {
      if (SKIP.test(line)) return
      let i = 0
      while ((i = line.indexOf('${', i)) !== -1) {
        let d = 1, j = i + 2
        while (j < line.length && d) { if (line[j] === '{') d++; else if (line[j] === '}') d--; j++ }
        const expr = line.slice(i + 2, j - 1).trim(); i = j
        if (EXEMPT.some(([part]) => line.includes(part))) continue
        if (/^(escHtml|escapeHtml|t|Number|_docStatusLabel|_riskStatusLabel|fmtDate)\(/.test(expr)) continue
        const m = expr.match(/^([A-Za-z_$][\w$]*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*)+)(\s*(?:\|\||\?\?)\s*(?:'[^']*'|"[^"]*"|\d+))?$/)
        const join = /^\(\w[\w.?]*\s*\|\|\s*\[\]\)\.join\(/.test(expr)
        // Beschriftung mit Rückfall auf den Rohwert: `labels[x.status] || x.status`
        const fallback = expr.match(/\|\|\s*([A-Za-z_$][\w$]*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*)+)\s*$/)
        if ((m && RISK.has(m[1].split(/\?\.|\./).pop())) || join || (fallback && RISK.has(fallback[1].split(/\?\.|\./).pop()))) out.push(`${ln + 1}: ${expr}`)
      }
    })
    return out
  }
  test('keine ungeschützten Nutzerfelder in HTML-Vorlagen von ui/app.js', () => {
    expect(findings()).toEqual([])
  })
})

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Browser: Texte anderer Konten bleiben Text (echtes Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs, authedPost, authedPut } = require('./setup/authHelper')
  let dataDir, server, base, info
  jest.setTimeout(240000)
  const P_IMG = 'xssmarker <img src=x onerror="window.__xss=1;alert(\'template-title-xss\')">'   // wie im Fund des Melders (mit alert)
  const P_FILE = 'xssmarker<img src=x onerror=window.__xss=1>'
  const P_ATTR = '" autofocus onfocus=window.__xss=1 x="'

  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-secret-xsssinks-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const app = require('../server/index.js')
    const admin = await loginAs(app, 'admin'), editor = await loginAs(app, 'editor'), co = await loginAs(app, 'contentowner')
    // Dokument: Titel wie im Fund des Melders (Editor ändert den Titel eines vorhandenen Dokuments)
    const doc = (await authedPost(app, admin, '/template', { type: 'Policy', language: 'de', title: 'Ausgangstitel', content: '# x' })).body
    expect((await authedPut(app, editor, `/template/Policy/${doc.id}`, { title: P_IMG })).status).toBe(200)
    // Anhang mit Nutzlast im Dateinamen
    const att = await request(app).post(`/template/Policy/${doc.id}/attachments`).set('Cookie', editor).attach('file', Buffer.from('%PDF-1.4\n%%EOF'), { filename: `${P_FILE}.pdf`, contentType: 'application/pdf' })
    expect([201, 400]).toContain(att.status)
    // Risiko mit CVE-Kennung und Titel
    expect((await authedPost(app, co, '/risks', { title: P_IMG, probability: 3, impact: 3, cveIds: [P_IMG] })).status).toBeLessThan(300)
    // SoA: Verantwortliche/r und Begründung einer vorhandenen Anforderung
    const soa = (await request(app).get('/soa').set('Cookie', admin)).body
    const list = Array.isArray(soa) ? soa : soa.controls
    const ctrl = list.find(c => c.id === 'BSI-ISMS.1') || list[0]
    expect((await authedPut(app, editor, `/soa/${encodeURIComponent(ctrl.id)}`, { owner: P_ATTR, justification: P_ATTR, applicable: false })).status).toBeLessThan(300)
    info = { docType: 'Policy', docId: doc.id, soaFramework: ctrl.framework || 'BSI' }
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })

  test('Administrator öffnet Bericht, Suche, Risiken, SoA, Anhänge: nichts wird ausgeführt oder eingeschleust', async () => {
    const out = await new Promise(resolve => {
      execFile(process.execPath, [path.join(__dirname, 'setup', 'xssSinksBrowser.js'), CHROME, base, 'admin@test.local', 'adminpass', JSON.stringify(info)], { encoding: 'utf8', timeout: 200000 }, (err, stdout, stderr) => {
        if (err && err.code === 3) return resolve(null)
        expect([err ? err.code : 0, stderr]).toEqual([0, ''])
        resolve(JSON.parse(stdout))
      })
    })
    if (!out) return
    if (process.env.XSS_DEBUG) console.log(JSON.stringify(out))
    expect(out.dialogs).toBe(0)   // kein alert() ausgelöst
    const { dialogs, ...areas } = out
    const rows = Object.entries(areas).map(([where, r]) => [where, r.imgs, r.handlers, r.xss])
    expect(rows).toEqual(Object.keys(areas).map(where => [where, 0, 0, 0]))   // nichts eingeschleust, nichts ausgeführt
    expect(out.report.text).toBe(true)    // die Nutzlast ist als Text sichtbar (der Bericht wurde wirklich gerendert)
    expect(out.search.text).toBe(true)
    expect(out.attachments.text).toBe(true)
  })
})
