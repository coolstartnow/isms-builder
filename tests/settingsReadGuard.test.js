'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Wächter: Die Einstellungen (orgSettingsStore.get()) werden im Server NIE synchron gelesen. Unter SQLite/MariaDB/PostgreSQL liefert get() ein
// Promise; ein Zugriff ohne await liest `undefined` — dadurch galt dort die Pflicht-2FA (require2FA) nicht, und die KI-Einstellungen,
// Organisationsdaten der KI-Entwürfe und die Sprachliste der Anmeldeseite wurden ignoriert. Schlägt dieser Test an, fehlt ein await.
const fs = require('fs')
const path = require('path')
const SERVER = path.join(__dirname, '..', 'server')

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? jsFiles(path.join(dir, e.name)) : (e.name.endsWith('.js') ? [path.join(dir, e.name)] : []))
}
const rel = p => path.relative(SERVER, p).split(path.sep).join('/')
const SELF = ['db/orgSettingsStore.js', 'db/stores/orgSettingsStore.js']

function calls() {
  const out = []
  for (const file of jsFiles(SERVER)) {
    if (SELF.includes(rel(file))) continue
    const code = fs.readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '')
    const aliases = [...code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*require\('[^']*orgSettingsStore'\)/g)].map(m => m[1])
    const pats = [/require\('[^']*orgSettingsStore'\)\.get\(\)/g, ...aliases.map(a => new RegExp(`\\b${a}\\.get\\(\\)`, 'g'))]
    for (const re of pats) for (const m of code.matchAll(re)) {
      const before = code.slice(Math.max(0, m.index - 14), m.index), after = code.slice(m.index + m[0].length, m.index + m[0].length + 8)
      out.push({ file: rel(file), line: code.slice(0, m.index).split('\n').length, ok: /await\s*\(?\s*$/.test(before) || /return\s+$/.test(before) || /^\s*\.(then|catch)\(/.test(after) })
    }
  }
  return out
}

describe('Einstellungen werden im Server nie synchron gelesen', () => {
  const found = calls()
  test('es gibt Lesezugriffe (der Wächter sieht die Dateien)', () => expect(found.length).toBeGreaterThanOrEqual(25))
  test('jeder get() wird mit await (oder .then/return in einer Promise-Kette) gelesen', () => {
    expect(found.filter(c => !c.ok).map(c => `${c.file}:${c.line}`)).toEqual([])
  })
  test('die Pflicht-2FA wird in routes/auth.js mit await gelesen', () => {
    const t = fs.readFileSync(path.join(SERVER, 'routes/auth.js'), 'utf8')
    expect(t).toMatch(/const orgCfg = await require\('\.\.\/db\/orgSettingsStore'\)\.get\(\)/)
    expect(t).toMatch(/router\.get\('\/auth\/language-config', async/)
  })
})
