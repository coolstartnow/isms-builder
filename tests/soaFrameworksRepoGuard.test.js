'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Eigene SoA-Gruppen: statische Wächter (Oberfläche, Übersetzungen, Exportlisten, Beispieldatei). Diese Tests laufen ohne Server.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

describe('Oberfläche: keine Werte aus Gruppen/Controls in onclick-Zeichenketten', () => {
  const app = read('ui/app.js')
  test('Bearbeiten/Löschen/Speichern/Auswahl reichen Kennung und Titel über data-Attribute weiter (escHtml maskiert keine Apostrophe)', () => {
    expect(app).not.toMatch(/onclick="deleteCustomControl\('/)
    expect(app).not.toMatch(/onclick="openCustomControlModal\('\$\{/)
    expect(app).not.toMatch(/onclick="submitCustomControlModal\('\$\{/)
    expect(app).not.toMatch(/togglePickerControl\('\$\{/)
    expect(app).toMatch(/onclick="deleteCustomControl\(this\.dataset\.id, this\.dataset\.title\)"/)
    expect(app).toMatch(/onclick="adminGroupDelete\(this\)"/)
  })
  test('Gruppenfunktionen: jeder eingesetzte Wert ist maskiert (escHtml/escVal)', () => {
    const start = app.indexOf('function soaGroupPanelHtml()'), end = app.indexOf('async function soaGrpFile(')
    const block = app.slice(start, end)
    const rohe = [...block.matchAll(/\$\{([^{}]+)\}/g)].map(m => m[1].trim())
      .filter(e => /\b(g|pv|r|f)\.(id|label|color|fileName|theme|title)\b/.test(e) && !/^(escHtml|escVal)\(/.test(e) && !/escHtml\(|escVal\(/.test(e))
    expect(rohe).toEqual([])
  })
  test('Verwaltungskarten: Bezeichnung, Kennung und Farbe nur maskiert', () => {
    const start = app.indexOf('<!-- Eigene Gruppen (nutzerdefinierte Frameworks) -->'), end = app.indexOf('// ── Eigene Gruppen verwalten')
    const block = app.slice(start, end)
    const rohe = [...block.matchAll(/\$\{([^{}]+)\}/g)].map(m => m[1].trim()).filter(e => /^g\.(id|label|color)$/.test(e))
    expect(rohe).toEqual([])
  })
  test('Gruppen werden nie per innerHTML aus Rohdaten gesetzt (nur Vorlagenzeichenketten mit Maskierung)', () => {
    expect(app).not.toMatch(/soaGrp\.(label|id)\s*\}\s*</)
  })
})

describe('Übersetzungen der neuen Schlüssel in allen vollständigen Sprachen', () => {
  const src = read('ui/i18n/translations.js')
  const LANGS = ['de', 'en', 'fr', 'nl', 'hu', 'et']
  const keys = [...src.matchAll(/^\s*((?:soa_group|modules_customGroups|modules_group|soa_ctrl)[A-Za-z_]*):\s*\{(.*)\},?\s*$/gm)]
  test('mindestens 40 neue Schlüssel gefunden', () => expect(keys.length).toBeGreaterThanOrEqual(40))
  test.each(keys.map(m => [m[1], m[2]]))('%s hat alle sechs Sprachen, nicht leer', (key, body) => {
    for (const l of LANGS) expect([key, l, new RegExp(`\\b${l}:\\s*(?:"[^"]+"|'[^']+')`).test(body)]).toEqual([key, l, true])
  })
  test('Platzhalter {…} sind in allen Sprachen gleich', () => {
    for (const [, key, body] of keys) {
      const per = LANGS.map(l => { const m = body.match(new RegExp(`\\b${l}:\\s*("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')`)); return m ? [...m[1].matchAll(/\{(\w+)\}/g)].map(x => x[1]).sort().join(',') : null })
      expect([key, new Set(per).size]).toEqual([key, 1])
    }
  })
  test('die Ablehnungsgründe der Vorschau sind übersetzt (jeder Grund aus planImport)', () => {
    for (const reason of ['not_an_object', 'missing_field', 'invalid_id', 'too_long', 'duplicate_id', 'id_conflict']) expect(src).toMatch(new RegExp(`soa_groupReason_${reason}:`))
  })
})

describe('Leitfaden „SoA & Audit“ nennt die eigenen Gruppen in allen sechs Sprachen', () => {
  const store = read('server/db/guidanceStore.js')
  test.each([['de', '**Eigene Gruppen:**'], ['en', '**Own groups:**'], ['fr', '**Groupes personnalisés :**'], ['nl', '**Eigen groepen:**']])('%s (guidanceStore.js)', (_l, marker) => {
    expect(store.split(marker).length - 1).toBe(1)
  })
  test.each([['hu', '**Saját csoportok:**'], ['et', '**Oma rühmad:**']])('%s (guidance-%s/soa.md)', (lang, marker) => {
    expect(read(`server/db/guidance-${lang}/soa.md`)).toContain(marker)
  })
})

describe('Doku: Administrationskonsole nennt die eigenen Gruppen in allen sechs Sprachen', () => {
  test.each([['md', '**Eigene Gruppen:**'], ['en', '**Own groups:**'], ['fr', '**Groupes personnalisés :**'], ['nl', '**Eigen groepen:**'], ['hu', '**Saját csoportok:**'], ['et', '**Oma rühmad:**']])('admin-console %s', (lang, marker) => {
    const text = read(lang === 'md' ? 'docs/admin-console.md' : `docs/admin-console.${lang}.md`)
    expect(text).toContain(marker)
    expect(text).toContain('soa-frameworks.json')
  })
  test('SoA-Anleitung (nur Deutsch, wie alle template-type-*-Seiten) und Beispieldatei sind vorhanden', () => {
    expect(read('docs/template-type-soa.md')).toContain('## Eigene Gruppen')
    const ex = JSON.parse(read('docs/examples/soa-custom-framework.example.json'))
    expect(require('../server/soaFrameworkDefs').planImport(ex.controls, ex.framework.id, []).rejected).toEqual([])
  })
})

describe('Versionierte SoA-Daten', () => {
  test('die versionierte data/soa.json enthält nur eingebaute Frameworks und keine eigenen Controls', () => {
    const { BUILTIN_IDS } = require('../server/soaFrameworkDefs')
    const controls = Object.values(JSON.parse(read('data/soa.json')))
    expect([...new Set(controls.map(c => c.framework))].filter(f => !BUILTIN_IDS.includes(f))).toEqual([])
    expect(controls.filter(c => c.isCustom)).toEqual([])
  })
})

describe('Custom-Controls-Tab ist ausschaltbar: Doku, README und Texte', () => {
  test.each(['md', 'en', 'fr', 'nl', 'hu', 'et'])('admin-console %s nennt „Custom Controls“ als schaltbar', lang => {
    const text = read(lang === 'md' ? 'docs/admin-console.md' : `docs/admin-console.${lang}.md`)
    expect(text).toMatch(/\*\*Custom Controls\*\*/)
  })
  test('SoA-Anleitung, Architektur-Doku und README beschreiben das Ausschalten (Controls bleiben erhalten)', () => {
    expect(read('docs/template-type-soa.md')).toMatch(/standardmäßig vorhanden[\s\S]*Vorhandene Controls werden dabei nicht gelöscht/)
    expect(read('docs/ISMS-build-documentation.md')).toMatch(/\*\*Ein-\/Ausschalten:\*\* Der Sammel-Tab `CUSTOM`/)
    expect(read('README.md')).toMatch(/Custom Controls\*\* tab and every other framework tab can be switched off/)
  })
  test('Beschreibung fwdesc_CUSTOM in allen sechs Sprachen; Standard CUSTOM: true in beiden Einstellungs-Speichern und in der Oberfläche', () => {
    const line = read('ui/i18n/translations.js').split('\n').find(l => /^\s*fwdesc_CUSTOM\s*:/.test(l)) || ''
    for (const l of ['de', 'en', 'fr', 'nl', 'hu', 'et']) expect([l, new RegExp(`\\b${l}:\\s*"[^"]{20,}"`).test(line)]).toEqual([l, true])
    expect(read('server/db/orgSettingsStore.js')).toMatch(/CUSTOM:\s+true/)
    expect(read('server/db/stores/orgSettingsStore.js')).toMatch(/CUSTOM:\s*true/)
    expect(read('ui/app.js')).toMatch(/\{ id: 'CUSTOM',\s+label: 'Custom Controls'/)
  })
})

describe('Server', () => {
  test('Fehlertexte der neuen Routen stehen im Meldungs-Wörterbuch (alle Sprachen)', () => {
    const i18n = require('../server/i18n')
    for (const text of ['Invalid group ID (2–50 characters: A–Z, 0–9, "_" or "-")', 'This group ID is reserved for a built-in framework', 'Invalid group name (1–120 characters)',
      'Invalid color (use #RRGGBB)', 'A group with this ID already exists', 'Group not found', 'Built-in frameworks cannot be changed',
      'The group still contains controls — remove them first', 'Unexpected file format: expected an object with a "controls" list', 'Invalid framework group', 'Invalid control ID', 'A control with this ID already exists']) {
      for (const lang of ['de', 'fr', 'nl', 'hu', 'et']) expect([text, lang, i18n.translateError(text, lang) !== text]).toEqual([text, lang, true])
    }
  })
  test('Vollexport und geschützte Dateien kennen soa-frameworks.json', () => {
    const admin = read('server/routes/admin.js')
    expect((admin.match(/'soa-frameworks\.json'/g) || []).length).toBeGreaterThanOrEqual(4)   // 2 Exportlisten + 2 geschützte Mengen
  })
  test('Die öffentliche Demo sperrt das Schreiben an eigenen Gruppen', () => {
    const { ruleFor } = require('../server/demoHosting')
    for (const [m, p] of [['POST', '/soa/frameworks'], ['PUT', '/soa/frameworks/X1'], ['DELETE', '/soa/frameworks/X1'], ['POST', '/soa/frameworks/import']]) expect(ruleFor(m, p)).toBe('block')
    expect(ruleFor('GET', '/soa/frameworks')).toBe(null)
  })
  test('Die Routen /soa/frameworks stehen vor PUT /soa/:id; der Import hat einen eigenen JSON-Parser vor dem globalen', () => {
    const soa = read('server/routes/soa.js')
    expect(soa.indexOf("router.post('/soa/frameworks/import'")).toBeGreaterThan(-1)
    expect(soa.indexOf("router.post('/soa/frameworks/import'")).toBeLessThan(soa.indexOf("router.put('/soa/:id'"))
    const index = read('server/index.js')
    expect(index.indexOf("app.use('/soa/frameworks/import'")).toBeGreaterThan(-1)
    expect(index.indexOf("app.use('/soa/frameworks/import'")).toBeLessThan(index.indexOf('const jsonBody = express.json()'))
  })
  test('Die Gruppenkennungen im Prüfmodul entsprechen den eingebauten Frameworks beider Speicher', () => {
    const { BUILTIN_IDS } = require('../server/soaFrameworkDefs')
    for (const f of ['server/db/soaStore.js', 'server/db/stores/soaStore.js']) {
      const ids = [...read(f).match(/const FRAMEWORKS = \{([\s\S]*?)\n\}/)[1].matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]).filter(i => i !== 'CUSTOM')
      expect([f, ids.sort()]).toEqual([f, [...BUILTIN_IDS].sort()])
    }
  })
})
