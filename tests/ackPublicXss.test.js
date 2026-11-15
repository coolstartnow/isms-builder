'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Öffentliche Bestätigungsseite /ack/:token (ohne Anmeldung erreichbar): Der Richtlinientext stammt aus dem Redaktionssystem, wird aber Empfängern
// ohne Konto angezeigt. Er darf dort nie als Skript wirken — auch nicht über Markdown-Verweise mit verschleierten Schemata.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')
const request = require('supertest')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
const MARKDOWN = [
  '# Richtlinie xssmarker', '',
  '[a](JaVaScRiPt:window.__xss=1)', '[b](&#106;avascript:window.__xss=1)', '[c](data:text/html,<script>window.__xss=1</script>)',
  '[d](   javascript:window.__xss=1)', '![e](x" onerror="window.__xss=1)', '<img src=x onerror=window.__xss=1>', '<script>window.__xss=1</script>',
  '<iframe src="javascript:window.__xss=1"></iframe>', '[f](https://example.org)',
].join('\n')

describe('Quelltext der Seite', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'routes', 'ackPublic.js'), 'utf8')
  test('bereinigt mit DOMPurify statt mit eigener Regel und fällt ohne DOMPurify auf reinen Text zurück', () => {
    expect(src).toContain('/ui/vendor/purify.min.js')
    expect(src).toMatch(/DOMPurify\.sanitize\(marked\.parse\(/)
    expect(src).toMatch(/typeof DOMPurify === 'undefined'/)
    expect(src).not.toMatch(/\.test\(a\.getAttribute\('href'\)/)   // die frühere Einzelregel gegen javascript: ist ersetzt
  })
})

;(CHROME ? describe : describe.skip)('Browser (echtes Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs, authedPost } = require('./setup/authHelper')
  let dataDir, server, url
  jest.setTimeout(120000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-test-secret-ackpublic-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    const app = require('../server/index.js')
    const admin = await loginAs(app, 'admin'), co = await loginAs(app, 'contentowner')
    const tpl = (await authedPost(app, admin, '/template', { type: 'Policy', language: 'de', title: 'Bestätigungstest', content: MARKDOWN })).body
    for (const status of ['review', 'approved']) expect((await request(app).patch(`/template/Policy/${tpl.id}/status`).set('Cookie', admin).send({ status })).status).toBe(200)
    await request(app).put('/admin/ack-settings').set('Cookie', admin).send({ policyAckMode: 'email_campaign' })
    const dist = (await request(app).post('/distributions').set('Cookie', co).send({ templateId: tpl.id, emailList: ['leser@example.test'] })).body
    const acks = (await request(app).get(`/distributions/${dist.id}/acks`).set('Cookie', co)).body
    server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    url = `http://127.0.0.1:${server.address().port}/ack/${acks[0].token}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })

  test('Richtlinientext mit Skripten, Ereignis-Attributen und verschleierten Verweisen bleibt Text oder wird entfernt', async () => {
    const out = await new Promise(resolve => {
      execFile(process.execPath, [path.join(__dirname, 'setup', 'ackPublicBrowser.js'), CHROME, url], { encoding: 'utf8', timeout: 100000 }, (err, stdout, stderr) => {
        if (err && err.code === 3) return resolve(null)
        expect([err ? err.code : 0, stderr]).toEqual([0, ''])
        resolve(JSON.parse(stdout))
      })
    })
    if (!out) return
    expect(out).toMatchObject({ rendered: true, text: true, imgs: 0, handlers: 0, scripts: 0, badLinks: 0, xss: 0, dialogs: 0 })
    expect(out.goodLink).toBe(true)   // gewöhnliche Links bleiben erhalten (neues Fenster, noopener)
  })
})
