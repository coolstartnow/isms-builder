'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Der Normtext (ISO 22301 u. a.) darf nie ins Repository: keine Importdateien, keine Titel in Demo-Bündeln, Muster in .gitignore.
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const ROOT = path.join(__dirname, '..')

const tracked = () => { try { return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean) } catch { return null } }

test('.gitignore schließt ISO-Importdateien aus', () => {
  const ig = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
  for (const pattern of ['iso22301*.csv', 'iso22301*.json', '*-demo-requirements.csv', 'iso-controls*.json']) expect(ig).toContain(pattern)
})

test('keine versionierte Datei dieser Muster', () => {
  const files = tracked(); if (!files) return
  expect(files.filter(f => /(^|\/)iso22301[^/]*\.(csv|json)$|-demo-requirements\.csv$|(^|\/)iso-controls[^/]*\.json$/i.test(f))).toEqual([])
})

test('Demo-Bündel enthalten keine ISO-22301-Anforderungen', () => {
  const dir = path.join(ROOT, 'data', 'demo-bundles')
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')) : []) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8')
    expect([f, /"requirements"\s*:\s*\[\s*\{[^}]*ISO22301/.test(text), /ISO22301/.test(text)]).toEqual([f, false, false])
  }
})

test('Demo-Reset leert das Register der Anforderungen', () => {
  const admin = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'admin.js'), 'utf8')
  expect(admin).toMatch(/file: 'bcm\.json',\s+empty: \{[^}]*requirements: \[\][^}]*assessments: \[\]/)
})
