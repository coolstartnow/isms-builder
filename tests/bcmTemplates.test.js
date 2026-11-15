'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// BCM-Vorlagen (BIA, Pläne, Übungen): Vollständigkeit in fünf Sprachen, gültige Werte, keine Firmendaten, Endpunkte, Übungsfeld „Szenario“.
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedPost, authedPut } = require('./setup/authHelper')
const B = require('../server/bcmTemplates')

const CRIT = ['low', 'medium', 'high', 'critical']
const PLAN_TYPES = ['bcp', 'drp', 'itp', 'crisis_communication']
const EX_TYPES = ['tabletop', 'simulation', 'full_drill', 'walkthrough']
const PLACEHOLDERS = ['COMPANY_NAME', 'ISMS_OWNER', 'DATA_PROTECTION_OFFICER', 'ISMS_SCOPE']

// alle Texte (Objekte mit de/en/fr/nl/hu) einer Vorlagenart einsammeln
function texts(node, out = []) {
  if (!node || typeof node !== 'object') return out
  if (B.LANGUAGES.every(l => typeof node[l] === 'string')) { out.push(node); return out }
  for (const v of Object.values(node)) texts(v, out)
  return out
}

describe('Katalog', () => {
  test('Umfang je Art', () => {
    expect(B.list('bia', 'de')).toHaveLength(8)
    expect(B.list('plan', 'de')).toHaveLength(9)
    expect(B.list('exercise', 'de')).toHaveLength(6)
    expect(B.list('unbekannt', 'de')).toBeNull()
  })
  test('jeder Text ist in allen fünf Sprachen vorhanden, nicht leer und je Sprache verschieden vom Englischen (außer Eigennamen)', () => {
    for (const kind of B.KINDS) {
      const all = texts(B.DATA[kind])
      expect(all.length).toBeGreaterThan(10)
      for (const t of all) {
        for (const l of B.LANGUAGES) expect([kind, l, t.en, typeof t[l] === 'string' && t[l].trim().length > 1]).toEqual([kind, l, t.en, true])
        // Übersetzungen dürfen kurze Bezeichnungen gleich lassen; längere Sätze müssen sich je Sprache unterscheiden
        if (t.en.length > 60) for (const l of ['de', 'fr', 'nl', 'hu']) expect([kind, l, t.en, t[l] !== t.en]).toEqual([kind, l, t.en, true])
      }
    }
  })
  test('Werte passen zu den Auswahllisten und Zeiten sind sinnvoll', () => {
    for (const [id, t] of Object.entries(B.DATA.bia)) {
      expect([id, CRIT.includes(t.criticality)]).toEqual([id, true])
      expect([id, t.rto > 0 && t.rto <= t.mtpd && t.rpo >= 0]).toEqual([id, true])
    }
    for (const [id, t] of Object.entries(B.DATA.plan)) expect([id, PLAN_TYPES.includes(t.type)]).toEqual([id, true])
    for (const [id, t] of Object.entries(B.DATA.exercise)) expect([id, EX_TYPES.includes(t.type)]).toEqual([id, true])
  })
  test('keine Firmen- oder Kontaktdaten, nur erlaubte Platzhalter', () => {
    const bad = /[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/|www\.|\bIBAN\b|\+\d{2}[\d ]{6,}|\b\d{3,}[ -]\d{3,}[ -]\d{3,}\b/
    for (const kind of B.KINDS) for (const t of texts(B.DATA[kind])) for (const l of B.LANGUAGES) {
      expect([t[l], bad.test(t[l])]).toEqual([t[l], false])
      for (const m of t[l].matchAll(/\{\{\s*([A-Za-z_ ]+?)\s*\}\}/g)) expect(PLACEHOLDERS).toContain(m[1])
    }
  })
  test('kein Normzitat: keine Normbezeichnung samt Klauselnummer in den Texten', () => {
    for (const kind of B.KINDS) for (const t of texts(B.DATA[kind])) for (const l of B.LANGUAGES) expect(t[l]).not.toMatch(/ISO\s*22301|ISO\s*22313|\b\d{1,2}\.\d{1,2}(\.\d{1,2})?\s+(shall|muss)/i)
  })
  test('build: Plan und Übung als gegliederter Text, Platzhalter gefüllt, fehlende gemeldet', () => {
    for (const l of B.LANGUAGES) {
      const p = B.build('plan', 'cyber_attack', l, { orgName: 'Muster GmbH', cisoName: 'Frau Muster' })
      expect(p.unresolved).toEqual([]); expect(p.procedures).toContain('Muster GmbH'); expect(p.procedures).toContain('Frau Muster')
      expect((p.procedures.match(/^## /gm) || []).length).toBe(8); expect(p.procedures).not.toMatch(/\{\{/)
      const e = B.build('exercise', 'tabletop_ransomware', l, {})
      expect((e.scenario.match(/^## /gm) || []).length).toBe(4); expect(e.result).toBe('planned')
      const b = B.build('bia', 'payroll', l, {})
      expect(b.dependencies.length).toBeGreaterThan(1); expect(b.status).toBe('draft')
    }
    expect(B.build('plan', 'cyber_attack', 'de', {}).unresolved).toEqual(expect.arrayContaining(['COMPANY_NAME', 'ISMS_OWNER']))
    expect(B.build('plan', 'gibt_es_nicht', 'de', {})).toBeNull()
    expect(B.build('plan', 'bcp_general', 'xx', {}).title).toMatch(/business continuity/i)   // unbekannte Sprache → Englisch
  })
})

let dataDir, app, admin, editor, reader
beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR = dataDir; process.env.JWT_SECRET = 'jest-test-secret-bcmtpl-0123456789abcdef'; process.env.NODE_ENV = 'test'; process.env.STORAGE_BACKEND = process.env.TEST_BACKEND || 'json'
  app = require('../server/index.js')
  if (app.bootstrap) await app.bootstrap()
  admin = await loginAs(app, 'admin'); editor = await loginAs(app, 'editor'); reader = await loginAs(app, 'reader')
})
afterAll(async () => {
  if (process.env.TEST_BACKEND) await require('../server/db/knexDatabase').destroy()
  removeTestDataDir(dataDir)
})

describe('Endpunkte und Übungsfeld „Szenario“', () => {
  test('Liste ab Leser, Vorlage erst ab Editor', async () => {
    const l = await request(app).get('/bcm/templates/plan?lang=de').set('Cookie', reader)
    expect(l.status).toBe(200); expect(l.body).toHaveLength(9)
    expect((await request(app).get('/bcm/templates/plan/cyber_attack').set('Cookie', reader)).status).toBe(403)
    const t = await request(app).get('/bcm/templates/plan/cyber_attack?lang=fr').set('Cookie', editor)
    expect(t.status).toBe(200); expect(t.body.type).toBe('itp'); expect(t.body.procedures).toMatch(/^# Cyberattaque/)
    expect((await request(app).get('/bcm/templates/plan/nope').set('Cookie', editor)).status).toBe(404)
    expect((await request(app).get('/bcm/templates/nope').set('Cookie', reader)).status).toBe(404)
  })
  test('Vorlage lässt sich unverändert als Datensatz speichern (Plan, BIA, Übung)', async () => {
    for (const [kind, url] of [['bia', '/bcm/bia'], ['plan', '/bcm/plans'], ['exercise', '/bcm/exercises']]) {
      const first = B.list(kind, 'de')[0].id
      const { unresolved, ...fields } = (await request(app).get(`/bcm/templates/${kind}/${first}?lang=de`).set('Cookie', editor)).body
      const r = await authedPost(app, editor, url, fields)
      expect([kind, r.status]).toEqual([kind, 201])
      expect(r.body.title).toBe(fields.title)
    }
  })
  test('Szenario: gespeichert, begrenzt auf 8000 Zeichen und beim Ändern anderer Felder erhalten; alte Übungen ohne Feld bleiben lesbar', async () => {
    const e = (await authedPost(app, editor, '/bcm/exercises', { title: 'Mit Szenario', scenario: 'x'.repeat(9000) })).body
    expect(e.scenario).toHaveLength(8000)
    const put = await authedPut(app, editor, `/bcm/exercises/${e.id}`, { conductor: 'Frau Test' })
    expect(put.status).toBe(200); expect(put.body.scenario).toHaveLength(8000)
    const upd = await authedPut(app, editor, `/bcm/exercises/${e.id}`, { scenario: 'neu' })
    expect(upd.body.scenario).toBe('neu')
    const old = (await authedPost(app, editor, '/bcm/exercises', { title: 'Ohne Szenario' })).body
    expect(old.scenario).toBe('')
    const got = await request(app).get(`/bcm/exercises/${old.id}`).set('Cookie', reader)
    expect(got.status).toBe(200)
  })
})
