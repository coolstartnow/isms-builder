'use strict'
// Rollen-Anleitungen (Guidance → Rollen) folgen der gewählten Demo-Sprache. Regression: Für Deutsch stand `de: null` in ROLE_GUIDES_I18N,
// ein `|| ROLE_GUIDES_I18N.en` machte daraus Englisch — Deutsch lief mit englischen Rollen-Anleitungen.
// Je Sprache ein eigener Prozess: das Guidance-Modul liest Datenverzeichnis und Demo-Sprache beim Laden.
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const SCRIPT = `
const g = require(${JSON.stringify(path.join(__dirname, '../server/db/guidanceStore.js'))})
g.seedRoleGuides()
console.log(JSON.stringify(g.getAll().filter(d => d.category === 'rollen').map(d => ({ seedId: d.seedId, title: d.title, content: d.content }))))
`
function rolesFor(lang) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-roles-'))
  try {
    fs.writeFileSync(path.join(dir, '.demo_lang_set'), JSON.stringify({ lang }))
    const out = execFileSync(process.execPath, ['-e', SCRIPT], { env: { ...process.env, DATA_DIR: dir, JWT_SECRET: 'jest-roles-secret-0123456789abcdef', NODE_ENV: 'test', STORAGE_BACKEND: 'json' }, encoding: 'utf8' })
    return JSON.parse(out.trim().split('\n').pop())
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

const PREFIX = { de: 'Bedienungsanleitung:', en: 'User Guide:', fr: 'Guide utilisateur', nl: 'Gebruikershandleiding', hu: 'Felhasználói útmutató' }
const contents = {}

describe('Guidance → Rollen: Sprache der Demo-Auswahl', () => {
  for (const lang of Object.keys(PREFIX)) {
    test(`Demo-Sprache ${lang}: alle fünf Rollen-Anleitungen tragen den Titel dieser Sprache`, () => {
      const docs = rolesFor(lang)
      expect(docs).toHaveLength(5)
      for (const d of docs) expect(d.title.startsWith(PREFIX[lang])).toBe(true)
      contents[lang] = docs.map(d => d.content).join('\n')
    })
  }

  test('Deutsch ist nicht der englische Text (Regression des `|| en`)', () => {
    expect(contents.de).toBeTruthy(); expect(contents.en).toBeTruthy()
    expect(contents.de).not.toBe(contents.en)
  })
})
