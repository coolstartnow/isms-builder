'use strict'
// Mitgelieferte Katalogdaten werden beim Lesen übersetzt (Overlay je ID); gespeicherte Daten bleiben unberührt.
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')
const request = require('supertest')

let dataDir, app, reader

beforeAll(async () => {
  dataDir = createTestDataDir()
  // Die Testumgebung legt eine leere crossmap.json an; ohne Datei wird der mitgelieferte Seed verwendet
  try { require('fs').unlinkSync(require('path').join(dataDir, 'crossmap.json')) } catch { /* nicht vorhanden */ }
  process.env.DATA_DIR = dataDir
  process.env.JWT_SECRET = 'jest-test-secret-catalog'
  process.env.NODE_ENV = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app = require('../server/index.js')
  reader = await loginAs(app, 'reader')
})
afterAll(() => removeTestDataDir(dataDir))

const get = (url, lang) => request(app).get(url).set('Cookie', reader).set('X-Lang', lang)

describe('Katalog-Overlay: Vollständigkeit', () => {
  const soa = require('../server/i18n/catalogSoa')
  const nis2 = require('../server/i18n/catalogNis2')
  const langs = ['en', 'fr', 'nl', 'hu']
  test('jeder Eintrag hat alle vier Sprachen, nicht leer', () => {
    const all = [
      ...Object.values(soa.titles), ...Object.values(soa.themes),
      ...Object.values(nis2.categories), ...Object.values(nis2.subParagraphs),
      ...Object.values(nis2.checklist).flatMap(e => [e.title, e.description]),
      ...Object.values(nis2.crossmap).flatMap(e => [e.topic, e.description]),
    ]
    for (const e of all) for (const l of langs) expect(typeof e[l] === 'string' && e[l].trim().length > 0).toBe(true)
  })
})

describe('SoA, NIS2-Checkliste, Crossmap', () => {
  test('SoA: Titel und Thema folgen X-Lang, BSI bleibt deutsch', async () => {
    const find = (list, id) => list.find(c => c.id === id)
    const de = (await get('/soa', 'de')).body
    const en = (await get('/soa', 'en')).body
    const hu = (await get('/soa', 'hu')).body
    expect(find(de, 'NIS2-b').title).toMatch(/Bewältigung von Sicherheitsvorfällen/)
    expect(find(en, 'NIS2-b').title).toBe('Art. 21(2)(b) – Incident handling')
    expect(find(en, 'NIS2-b').theme).toBe('Incident management')
    expect(find(hu, 'CRA-1.6').title).toBe('A támadási felület minimalizálása')
    expect(find(en, 'BSI-ORP.1').title).toBe(find(de, 'BSI-ORP.1').title)
  })

  test('NIS2-Checkliste: Titel, Beschreibung, Kategorie übersetzt, Status/ID unverändert', async () => {
    const en = (await get('/nis2/governance', 'en')).body.items
    const de = (await get('/nis2/governance', 'de')).body.items
    const e1 = en.find(i => i.id === 'nis2_gov_001'), d1 = de.find(i => i.id === 'nis2_gov_001')
    expect(e1.title).toBe('Scoping analysis')
    expect(d1.title).toBe('Scoping-Analyse')
    expect(e1.status).toBe(d1.status)
    const fr = (await get('/nis2/governance/nis2_gov_005', 'fr')).body
    expect(fr.title).toBe('Authentification multifacteur')
    expect(fr.category).toBe('Contrôle d\'accès')
  })

  test('Crossmap: Thema übersetzt, IDs gleich', async () => {
    const en = (await get('/soa/crossmap', 'en')).body.find(g => g.id === 'CG-RISK')
    const nl = (await get('/soa/crossmap', 'nl')).body.find(g => g.id === 'CG-ACCESS')
    expect(en.topic).toBe('Risk management')
    expect(nl.topic).toBe('Toegangsbeheer & identiteitsbeheer')
    expect(en.controls.length).toBeGreaterThan(0)
    const rel = (await get('/soa/NIS2-a/crossmap', 'hu')).body
    expect(rel.length).toBeGreaterThan(0)
    expect(rel.find(r => r.groupId === 'CG-RISK').topic).toBe('Kockázatkezelés')
  })
})
