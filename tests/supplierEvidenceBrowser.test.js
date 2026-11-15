'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Nachweis-Link am Lieferanten (GitHub #108) im echten Chrome: Verweis nur bei http(s), Beschriftung maskiert, kein Skript aus Altdaten.
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
const day = off => new Date(Date.now() + off * 86400000).toISOString().slice(0, 10)
;(CHROME ? describe : describe.skip)('Lieferanten-Nachweis im Browser (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  let dataDir, server, base
  jest.setTimeout(150000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-supevidence-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const base0 = { type: 'saas', criticality: 'medium', status: 'active', triage: {}, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null }
    // Altdaten/Handbearbeitung: so etwas lässt der Server nicht mehr zu, die Oberfläche muss es trotzdem sicher ausgeben
    fs.writeFileSync(path.join(dataDir, 'suppliers.json'), JSON.stringify([
      { ...base0, id: 'sup_ok', name: 'Ordentlich', evidenceUrl: 'https://example.org/iso.pdf?a=1&b="2"', evidenceLabel: 'ISO 27001 <b>Zertifikat</b>', evidenceValidUntil: day(200) },
      { ...base0, id: 'sup_exp', name: 'Abgelaufen', evidenceUrl: 'http://example.org/old', evidenceLabel: '', evidenceValidUntil: day(-3) },
      { ...base0, id: 'sup_js', name: 'Boese', evidenceUrl: 'javascript:window.__pwned=1', evidenceLabel: '<img src=x onerror=window.__pwned=1>', evidenceValidUntil: '' },
      { ...base0, id: 'sup_none', name: 'Ohne' },
    ]))
    server = http.createServer(require('../server/index.js'))
    await new Promise(r => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = () => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'supplierEvidenceBrowser.js'), CHROME, base, 'admin@test.local', 'adminpass'], { encoding: 'utf8', timeout: 120000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, stderr]).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })
  test('Liste: Spalte „Nachweis“, sichere Verweise, abgelaufen markiert, bösartige Altdaten wirkungslos', async () => {
    const out = await run()
    if (!out) return
    expect(out.header).toContain('Nachweis')
    const by = n => out.rows.find(r => r.name === n)
    expect(by('Ordentlich')).toMatchObject({ href: 'https://example.org/iso.pdf?a=1&b="2"', rel: 'noopener noreferrer', imgs: 0 })
    expect(by('Ordentlich').evidenceCell).toContain('ISO 27001 <b>Zertifikat</b>') // als Text, nicht als HTML
    expect(by('Abgelaufen')).toMatchObject({ href: 'http://example.org/old', expiredMark: true })
    expect(by('Boese').href).toBeNull()
    expect(by('Boese').imgs).toBe(0)
    expect(by('Ohne').evidenceCell).toBe('—')
    expect(out.pwned).toBe(0)
    expect(out.dialogs).toEqual([])
  })
  test('Formular zeigt die gespeicherten Werte unverfälscht', async () => {
    const out = await run()
    if (!out) return
    expect(out.form).toEqual({ url: 'https://example.org/iso.pdf?a=1&b="2"', label: 'ISO 27001 <b>Zertifikat</b>', until: day(200) })
  })
})
