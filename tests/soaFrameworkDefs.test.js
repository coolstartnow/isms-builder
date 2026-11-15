'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Eigene SoA-Gruppen: reine Prüf- und Planfunktionen (server/soaFrameworkDefs.js) und der Definitionsspeicher (db/soaFrameworkStore.js)
const fs = require('fs')
const path = require('path')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const defs = require('../server/soaFrameworkDefs')

describe('validateDefinition', () => {
  test('gültig: Farbe wird klein geschrieben, ohne Farbe gilt Grau', () => {
    expect(defs.validateDefinition({ id: 'NEN7510', label: ' NEN 7510 ', color: '#0EA5E9' }).value).toEqual({ id: 'NEN7510', label: 'NEN 7510', color: '#0ea5e9' })
    expect(defs.validateDefinition({ id: 'AB', label: 'x' }).value.color).toBe('#64748b')
  })
  test.each([
    [{ id: 'a1', label: 'x' }, 'invalid_id'], [{ id: '-AB', label: 'x' }, 'invalid_id'], [{ id: 'A', label: 'x' }, 'invalid_id'], [{ id: 'A'.repeat(51), label: 'x' }, 'invalid_id'],
    [{ id: 'A B', label: 'x' }, 'invalid_id'], [{ id: 'A<B', label: 'x' }, 'invalid_id'], [{ id: 5, label: 'x' }, 'invalid_id'], [null, 'invalid_id'], [[], 'invalid_id'],
    [{ id: 'BSI', label: 'x' }, 'reserved_id'], [{ id: 'CUSTOM', label: 'x' }, 'reserved_id'], [{ id: 'ISO27001', label: 'x' }, 'reserved_id'],
    [{ id: 'AB', label: '' }, 'invalid_label'], [{ id: 'AB', label: 7 }, 'invalid_label'], [{ id: 'AB', label: 'x'.repeat(121) }, 'invalid_label'],
    [{ id: 'AB', label: 'x', color: 'red' }, 'invalid_color'], [{ id: 'AB', label: 'x', color: '#fff' }, 'invalid_color'], [{ id: 'AB', label: 'x', color: '#gggggg' }, 'invalid_color'],
    [{ id: 'AB', label: 'x', color: '#ffffff;x' }, 'invalid_color'], [{ id: 'AB', label: 'x', color: 'url(javascript:1)' }, 'invalid_color'],
  ])('%j → %s', (def, code) => expect(defs.validateDefinition(def).code).toBe(code))
  test('alle acht eingebauten Kennungen und CUSTOM sind reserviert', () => {
    for (const id of [...defs.BUILTIN_IDS, 'CUSTOM']) expect(defs.validateDefinition({ id, label: 'x' }).code).toBe('reserved_id')
    expect(defs.BUILTIN_IDS).toHaveLength(8)
  })
  test('die eingebauten Kennungen stimmen mit soaStore überein (kein Abdriften)', () => {
    const { FRAMEWORKS } = require('../server/db/soaStore')
    expect([...defs.BUILTIN_IDS, 'CUSTOM'].sort()).toEqual(Object.keys(FRAMEWORKS).sort())
  })
})

describe('isValidControlId', () => {
  test.each([['NEN-1', true], ['A.5.1', true], ['5.1(a)', true], ['x:y+z', true], ['a b', false], ['a/b', false], ['a%2Fb', false], ['', false], ['__proto__', false],
    ['constructor', false], ['toString', false], ['hasOwnProperty', false], ['x'.repeat(120), true], ['x'.repeat(121), false], [5, false], ['<b>', false]])('%j → %s', (id, ok) => expect(defs.isValidControlId(id)).toBe(ok))
})

describe('parseImport', () => {
  test('Objekt mit controls; BOM wird entfernt', () => {
    const r = defs.parseImport('﻿' + JSON.stringify({ framework: { id: 'AB', label: 'x' }, controls: [{ id: 'A-1' }] }))
    expect(r.controls).toHaveLength(1); expect(r.framework.id).toBe('AB')
  })
  test('Fehler: kein JSON, Array, ohne controls, zu groß, zu viele Zeilen', () => {
    expect(defs.parseImport('{kaputt').code).toBe('invalid_json')
    expect(defs.parseImport('[]').code).toBe('invalid_format')
    expect(defs.parseImport('{"framework":{}}').code).toBe('invalid_format')
    expect(defs.parseImport('x'.repeat(defs.MAX_BYTES + 1)).code).toBe('too_large')
    expect(defs.parseImport(JSON.stringify({ controls: Array.from({ length: defs.MAX_ROWS + 1 }, () => ({})) })).code).toBe('too_many_rows')
    expect(defs.parseImport(JSON.stringify({ controls: [] })).framework).toBe(null)
  })
})

describe('planImport', () => {
  const have = [{ id: 'BSI-ISMS.1', framework: 'BSI' }, { id: 'NEN-1', framework: 'NEN' }]
  test('neu / aktualisiert / abgelehnt, getrennt nach Gründen; Reihenfolge der Datei bleibt', () => {
    const p = defs.planImport([
      { id: 'NEN-1', theme: 'a', title: 'b' }, { id: 'NEN-2', theme: 'a', title: 'b', description: ' d ' }, { id: 'NEN-2', theme: 'a', title: 'zweimal' },
      { id: 'BSI-ISMS.1', theme: 'a', title: 'b' }, { id: 'N 3', theme: 'a', title: 'b' }, { id: 'N-4', theme: '', title: 'b' }, null, 'x',
    ], 'NEN', have)
    expect(p.accepted).toEqual([{ id: 'NEN-1', theme: 'a', title: 'b' }, { id: 'NEN-2', theme: 'a', title: 'b', description: 'd' }])
    expect(p.updated).toEqual(['NEN-1']); expect(p.added).toEqual(['NEN-2'])
    expect(p.rejectedByReason).toEqual({ duplicate_id: 1, id_conflict: 1, invalid_id: 1, missing_field: 1, not_an_object: 2 })
    expect(p.rejected.map(r => r.index)).toEqual([2, 3, 4, 5, 6, 7])
  })
  test('Grenzen: theme 80 (Spalte), title 512, description 4000, id 120', () => {
    const row = o => defs.planImport([{ id: 'A-1', theme: 't', title: 't', ...o }], 'NEN', []).rejectedByReason
    expect(row({ theme: 'x'.repeat(80) })).toEqual({}); expect(row({ theme: 'x'.repeat(81) })).toEqual({ too_long: 1 })
    expect(row({ title: 'x'.repeat(512) })).toEqual({}); expect(row({ title: 'x'.repeat(513) })).toEqual({ too_long: 1 })
    expect(row({ description: 'x'.repeat(4000) })).toEqual({}); expect(row({ description: 'x'.repeat(4001) })).toEqual({ too_long: 1 })
    expect(row({ id: 'x'.repeat(120) })).toEqual({}); expect(row({ id: 'x'.repeat(121) })).toEqual({ too_long: 1 })
  })
  test('Zusatzfelder (evil, __proto__, status, owner) werden nie übernommen', () => {
    const row = JSON.parse('{"id":"A-1","theme":"t","title":"t","evil":"<script>","__proto__":{"x":1},"status":"implemented","owner":"x","isCustom":false,"framework":"BSI"}')
    expect(Object.keys(defs.planImport([row], 'NEN', []).accepted[0]).sort()).toEqual(['id', 'theme', 'title'])
  })
  test('Typen: Zahlen und Objekte als Felder zählen als fehlend, nicht als Absturz', () => {
    expect(() => defs.planImport([{ id: 1, theme: {}, title: [] }, { id: 'A-1', theme: 5, title: 'x' }], 'NEN', [])).not.toThrow()
    expect(defs.planImport([{ id: 1, theme: {}, title: [] }, { id: 'A-1', theme: 5, title: 'x' }], 'NEN', []).rejectedByReason).toEqual({ missing_field: 2 })
    expect(defs.planImport('kein Array', 'NEN', []).accepted).toEqual([])
  })
  test('Beispieldatei: erfundene Controls, besteht die eigene Prüfung ohne Ablehnung', () => {
    const ex = defs.exampleFile()
    expect(defs.validateDefinition(ex.framework).code).toBeUndefined()
    expect(defs.planImport(ex.controls, ex.framework.id, []).rejected).toEqual([])
    expect(JSON.stringify(ex)).not.toMatch(/ISO|27001|NEN 7510|TISAX/i)
  })
})

describe('soaFrameworkStore', () => {
  let dir, store
  beforeAll(() => { dir = createTestDataDir(); process.env.DATA_DIR = dir; store = require('../server/db/soaFrameworkStore') })
  afterAll(() => removeTestDataDir(dir))
  const f = () => path.join(dir, 'soa-frameworks.json')

  test('fehlende Datei = leere Liste', async () => { expect(await store.getAll()).toEqual([]); expect(store.getByIdSync('X1')).toBe(null) })
  test('beschädigte Datei = leere Liste, kein Absturz', async () => {
    fs.writeFileSync(f(), '{kaputt'); expect(await store.getAll()).toEqual([])
    fs.writeFileSync(f(), '{"a":1}'); expect(await store.getAll()).toEqual([])
    fs.writeFileSync(f(), JSON.stringify([null, 5, { x: 1 }, { id: 'GUT1', label: 'ok', color: '#111111' }])); expect((await store.getAll()).map(x => x.id)).toEqual(['GUT1'])
    fs.unlinkSync(f())
  })
  test('anlegen, doppelt, ändern (ID unveränderlich), löschen', async () => {
    const a = await store.create({ id: 'AAA', label: 'Erste' }, { by: 'admin' })
    expect(a.framework).toMatchObject({ id: 'AAA', label: 'Erste', createdBy: 'admin' })
    expect((await store.create({ id: 'AAA', label: 'Nochmal' })).code).toBe('exists')
    expect((await store.create({ id: 'BSI', label: 'x' })).code).toBe('reserved_id')
    const u = await store.update('AAA', { id: 'ZZZ', label: 'Neu', color: '#abcdef' }, { by: 'x' })
    expect(u.framework).toMatchObject({ id: 'AAA', label: 'Neu', color: '#abcdef', updatedBy: 'x' })
    expect((await store.update('AAA', { color: 'rot' })).code).toBe('invalid_color')
    expect((await store.update('NIX', { label: 'x' })).code).toBe('not_found')
    expect((await store.getById('AAA')).label).toBe('Neu')
    expect((await store.remove('AAA')).framework.id).toBe('AAA')
    expect((await store.remove('AAA')).code).toBe('not_found')
  })
  test('eine beschädigte Datei wird vor dem Überschreiben gesichert (Kopie .defekt-…), nicht still verworfen', async () => {
    fs.writeFileSync(f(), '{kaputt: Definitionen von früher')
    expect((await store.create({ id: 'NEUDEF', label: 'x' })).framework.id).toBe('NEUDEF')
    const kopien = fs.readdirSync(dir).filter(n => n.startsWith('soa-frameworks.json.defekt-'))
    expect(kopien).toHaveLength(1)
    expect(fs.readFileSync(path.join(dir, kopien[0]), 'utf8')).toBe('{kaputt: Definitionen von früher')
    for (const k of kopien) fs.unlinkSync(path.join(dir, k))
    await store.remove('NEUDEF')
  })
  test('Reihenfolge nach Anlage; atomisches Schreiben hinterlässt keine Temp-Datei; Datei ist gültiges JSON', async () => {
    await store.create({ id: 'ERSTE', label: '1' }); await new Promise(r => setTimeout(r, 5)); await store.create({ id: 'ZWEITE', label: '2' })
    expect((await store.getAll()).map(x => x.id)).toEqual(['ERSTE', 'ZWEITE'])
    expect(JSON.parse(fs.readFileSync(f(), 'utf8')).filter(x => !x.deletedAt)).toHaveLength(2)   // gelöschte Gruppen bleiben als Löschmarkierung (Sync)
    expect(fs.readdirSync(dir).filter(n => n.endsWith('.tmp'))).toEqual([])
  })
  test('der Pfad folgt DATA_DIR bei jedem Zugriff (Tests, Wechsel des Datenverzeichnisses)', async () => {
    const other = createTestDataDir()
    try { process.env.DATA_DIR = other; expect(await store.getAll()).toEqual([]) } finally { process.env.DATA_DIR = dir; removeTestDataDir(other) }
    expect((await store.getAll()).length).toBe(2)
  })
})
