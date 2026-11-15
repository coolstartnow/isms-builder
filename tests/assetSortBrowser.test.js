'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Diskussion #111: Asset-Liste ist sortiert (Kategorie → Typ → Name), Spaltenköpfe sortieren, der Reiter „Nach Kategorie“ ist bearbeitbar (echter Chrome).
const fs = require('fs')
const path = require('path')
const http = require('http')
const request = require('supertest')
const { execFile } = require('child_process')

const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
;(CHROME ? describe : describe.skip)('Asset-Verwaltung: Sortierung (Chrome)', () => {
  const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
  const { loginAs } = require('./setup/authHelper')
  let dataDir, server, base
  jest.setTimeout(240000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-assetsort-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = 'json'
    delete process.env.DEMO_HOSTING
    fs.writeFileSync(path.join(dataDir, '.demo_lang_set'), JSON.stringify({ lang: 'skip' }))
    const app = require('../server/index.js'); server = http.createServer(app)
    await new Promise(r => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`
    const ad = await loginAs(app, 'admin')
    // absichtlich NICHT in sortierter Reihenfolge angelegt (Anlagereihenfolge = Reihenfolge des Servers)
    for (const [name, category, type] of [['Zeta Server', 'hardware', 'hardware_server'], ['Wiki', 'software', 'software_saas'], ['Laptop 10', 'hardware', 'hardware_laptop'], ['x\'); window.__pwn=1;//<img src=x onerror=window.__pwn=2>', 'data', ''], ['Laptop 2', 'hardware', 'hardware_laptop'], ['Alpha Server', 'hardware', 'hardware_server']]) {
      const r = await request(app).post('/assets').set('Cookie', ad).send({ name, category, type, classification: 'internal', criticality: 'medium', status: 'active' }); expect([name, r.status, r.body.error]).toEqual([name, 201, undefined])
    }
  })
  afterAll(async () => { await new Promise(r => server.close(r)); removeTestDataDir(dataDir) })
  const run = (email, password, mode) => new Promise(resolve => {
    execFile(process.execPath, [path.join(__dirname, 'setup', 'assetSortBrowser.js'), CHROME, base, email, password, mode], { encoding: 'utf8', timeout: 200000 }, (err, stdout, stderr) => {
      if (err && err.code === 3) return resolve(null)
      expect([err ? err.code : 0, err ? stderr : '']).toEqual([0, ''])
      resolve(JSON.parse(stdout))
    })
  })

  test('Administrator: Standardsortierung, Spaltenköpfe, Reiter „Nach Kategorie“ bearbeitbar, neues Asset an seinem Platz', async () => {
    const out = await run('admin@test.local', 'adminpass', 'voll')
    if (!out) return
    const HOSTILE = "x'); window.__pwn=1;//<img src=x onerror=window.__pwn=2>"
    expect(out.standard).toEqual([HOSTILE, 'Laptop 2', 'Laptop 10', 'Alpha Server', 'Zeta Server', 'Wiki'])   // Kategorien alphabetisch (Daten < Hardware < Software), darin Typ (Laptop < Server) → Name, „Laptop 2“ vor „Laptop 10“
    expect(out.headers).toEqual(['name:none', 'type:none', 'prot:none', 'class:none', 'crit:none', 'owner:none', 'status:none', 'eol:none'])
    expect(out.nameAsc[0]).toBe('Alpha Server'); expect(out.ariaAsc).toBe('ascending')
    expect(out.nameDesc[0]).toBe('Zeta Server')
    expect(JSON.parse(out.stored)).toEqual({ key: 'name', dir: 'desc' })
    expect(out.reset).toEqual(out.standard); expect(out.storedAfterReset).toBeNull()               // dritter Klick: Standard
    expect(out.catOrder.slice(0, 3).join('|')).toBe([...out.catOrder.slice(0, 3)].sort((a, b) => a.localeCompare(b, 'de')).join('|'))   // Kategorien alphabetisch
    expect(out.byCat.find(g => g.cat.startsWith('Hardware') || g.rows.includes('Laptop 2')).rows).toEqual(['Laptop 2', 'Laptop 10', 'Alpha Server', 'Zeta Server'])
    expect(out.editBtns).toBeGreaterThan(0); expect(out.deleteBtns).toBeGreaterThan(0)              // „Nach Kategorie“ ist bearbeitbar
    expect(out.strayImgs).toBe(0)                                                                    // Name mit HTML bleibt Text
    expect(out.afterSave).toMatchObject({ tab: 'by-category', byCatVisible: true })                  // Speichern kehrt in den Ausgangsreiter zurück …
    expect(out.afterSave.flashed).toBeGreaterThan(0)                                                 // … und hebt die Zeile hervor
    expect(out.afterNew.filter).toBe('hardware')                                                     // der Filter blieb erhalten
    expect(out.afterNew.names).toEqual(['Bürorechner 03', 'Laptop 2', 'Laptop 10', 'Alpha Server', 'Zeta Server'])   // das neue Laptop-Asset steht unter den Laptops nach Name („Bürorechner“ vor „Laptop“), nicht unten in der Liste
    expect(out.afterNew.flashed).toBeGreaterThan(0)
    expect(out.errors).toEqual([])
  })

  test('Editor: sortierte Liste; im Reiter „Nach Kategorie“ Bearbeiten, aber kein Löschen (nur Administratoren)', async () => {
    const out = await run('editor@test.local', 'editorpass', 'ansicht')
    if (!out) return
    expect(out.standard.filter(n => n.startsWith('Laptop'))).toEqual(['Laptop 2', 'Laptop 10'])   // natürliche Zahlenfolge (das vom Administrator-Test angelegte Asset steht zusätzlich in der Liste)
    expect(out.editBtns).toBeGreaterThan(0); expect(out.deleteBtns).toBe(0)
  })
})
