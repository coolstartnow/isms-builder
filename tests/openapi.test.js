'use strict'
// Syntax- und Konsistenzprüfung der OpenAPI-Beschreibung (js-yaml kommt transitiv über jest).
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const FILE = path.join(__dirname, '../docs/architecture/openapi.yaml')
let spec

beforeAll(() => { spec = yaml.load(fs.readFileSync(FILE, 'utf8')) })

test('YAML ist gültig und hat die OpenAPI-Grundstruktur', () => {
  expect(spec.openapi).toMatch(/^3\./)
  expect(spec.info && spec.info.title).toBeTruthy()
  expect(Object.keys(spec.paths).length).toBeGreaterThan(20)
})

test('alle $ref-Verweise zeigen auf vorhandene Komponenten', () => {
  const refs = new Set(JSON.stringify(spec).match(/"\$ref":"#\/[^"]+"/g) || [])
  for (const r of refs) {
    const ptr = r.slice(r.indexOf('#/') + 2, -1).split('/')
    let node = spec
    for (const p of ptr) { node = node && node[p]; }
    expect({ ref: r, found: node !== undefined }).toEqual({ ref: r, found: true })
  }
})

test('jede Operation hat Responses, operationIds sind eindeutig, Pfade beginnen mit /', () => {
  const ids = new Set()
  const methods = ['get', 'post', 'put', 'patch', 'delete']
  for (const [p, item] of Object.entries(spec.paths)) {
    expect(p.startsWith('/')).toBe(true)
    for (const m of methods.filter(x => item[x])) {
      expect({ p, m, hasResponses: !!item[m].responses }).toEqual({ p, m, hasResponses: true })
      if (item[m].operationId) { expect(ids.has(item[m].operationId)).toBe(false); ids.add(item[m].operationId) }
    }
  }
})

// js-yaml (YAML 1.2) liest mehr als streng nach YAML 1.1 arbeitende Parser (z. B. PyYAML, viele Python-Werkzeuge, ältere Validatoren):
// ein unquotierter Text mit „?“ oder „&“ in einer Flow-Map („{ … description: … }“) wurde dort abgelehnt (seit 1.76.0 unbemerkt).
// Ist python3 mit PyYAML vorhanden, muss die Datei auch dort lesbar sein; sonst wird der Test übersprungen.
const { spawnSync } = require('child_process')
const hasPyYaml = spawnSync('python3', ['-c', 'import yaml'], { encoding: 'utf8' }).status === 0
;(hasPyYaml ? test : test.skip)('openapi.yaml ist auch mit einem strengen YAML-1.1-Parser (PyYAML) lesbar', () => {
  const r = spawnSync('python3', ['-c', 'import sys, yaml; d = yaml.safe_load(open(sys.argv[1], encoding="utf-8")); print(len(d["paths"]))', FILE], { encoding: 'utf8' })
  expect({ status: r.status, stderr: (r.stderr || '').split('\n').slice(-3).join(' ') }).toEqual({ status: 0, stderr: '' })
  expect(Number(r.stdout.trim())).toBeGreaterThan(100)
})
