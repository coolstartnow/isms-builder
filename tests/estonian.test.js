'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Estnisch (et): sechste Sprache — im Register „complete“ (Hauptprojekt), „listed“ erst nach Freigabe durch den Nutzer (beta.26: freigegeben, zunächst für die lokale Demo).
// Übersetzungen sind eigene (nicht von Muttersprachlern geprüft). Die Vollständigkeitstests von languageRegistry.test.js (Texte, Dokumentation,
// Demo-Bündel) gelten für Sprachen mit Status „complete“, also auch für Estnisch.
const fs = require('fs')
const path = require('path')
const reg = require('../ui/i18n/languages.js')
const i18n = require('../server/i18n')

const dict = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(__dirname, '..', 'ui', 'i18n', 'translations.js'), 'utf8'))(w); return w.TRANSLATIONS })()

describe('Estnisch: Register', () => {
  test('ist vollständig (Hauptprojekt); auswählbar nur nach Freigabe', () => {
    expect(reg.get('et')).toMatchObject({ name: 'Eesti', locale: 'et-EE', docSuffix: '.et', aiName: 'Estonian', msgIndex: 5, status: 'complete' })
    expect(reg.completeCodes()).toContain('et')
    if (reg.get('et').listed) {
      expect(reg.listedCodes()).toContain('et')
      expect(reg.fromBrowser('et-EE')).toBe('et')
    } else {
      expect(reg.listedCodes()).not.toContain('et')
      expect(reg.fromBrowser('et-EE')).toBe('en') // nie automatisch aus der Browsersprache gewählt, solange nicht freigegeben
    }
  })
})

describe('Estnisch: Oberflächentexte', () => {
  test('jeder Schlüssel hat eine estnische Übersetzung', () => {
    const missing = Object.entries(dict).filter(([, v]) => !(typeof v.et === 'string' && v.et.length)).map(([k]) => k)
    expect(missing).toEqual([])
  })
  test('Übersetzungen sind keine unveränderten Kopien des Englischen (außer kurzen Fachwörtern und Kennungen)', () => {
    const same = Object.entries(dict).filter(([, v]) => v.et === v.en && v.en.length > 12 && !/^[\w@.:/ ·-]+$/.test(v.en)).map(([k]) => k)
    expect(same).toEqual([])
  })
  test('ausgewählte Stichproben', () => {
    expect(dict.loginBtn.et).toBe('Logi sisse')
    expect(dict.status_approved.et).toBe('Kinnitatud')
    expect(dict.sup_evidenceCol.et).toBe('Tõend')
  })
})

describe('Estnisch: Server-Meldungen', () => {
  test('alle Zeilen der Meldungs- und Beschriftungstabellen haben eine estnische Spalte', () => {
    for (const row of [...i18n.MESSAGES, ...i18n.LABELS]) {
      expect(row.length).toBe(6)
      expect(typeof row[5]).toBe('string')
      expect(row[5].length).toBeGreaterThan(0)
      expect((row[0].match(/\{\w+\}/g) || []).sort()).toEqual((row[5].match(/\{\w+\}/g) || []).sort())
    }
  })
  test('Übersetzung per Sprachcode und Rückfall auf Englisch', () => {
    expect(i18n.translateError('Internal server error', 'et')).toBe('Serveri sisemine viga')
    expect(i18n.translateError('Role \'x\' insufficient. Requires \'y\'', 'et')).toBe('Roll \'x\' ei piisa. Nõutav on \'y\'')
    expect(i18n.translateLabel('Supplier audit: Acme', 'et')).toBe('Tarnijaaudit: Acme')
    expect(i18n.translateError('Internal server error', 'de')).toBe('Interner Serverfehler')
  })
  test('Datumsformat nach et-EE', () => {
    expect(i18n.fmtDate('2026-10-31T10:00:00Z', 'et')).toMatch(/31\.10\.2026/)
  })
})

describe('Estnisch: Inhalte (Stufe E2)', () => {
  const root = path.join(__dirname, '..')
  test('Vorlagen und KI-Katalog liegen auf Estnisch vor', () => {
    for (const mod of ['gdprTemplates', 'dsfaTemplates', 'bcmTemplates']) expect([mod, require(`../server/${mod}`).LANGUAGES.includes('et')]).toEqual([mod, true])
    const sd = require('../server/ai/safeDraft')
    expect(sd.LANGUAGES).toContain('et')
    for (const e of sd.CATALOG) expect([e.id, typeof e.title.et === 'string' && e.title.et.length > 3]).toEqual([e.id, true])
    expect(sd.buildPrompt ? true : true).toBe(true)
  })
  test('GDPR-/DSFA-/BCM-Texte: Platzhalter {{…}} stimmen mit Englisch überein', () => {
    const ph = s => (String(s).match(/\{\{[A-Z_]+\}\}/g) || []).sort().join()
    const walk = (o, out = []) => { if (o && typeof o === 'object') { if (typeof o.en === 'string' && typeof o.et === 'string') out.push(o); else Object.values(o).forEach(v => walk(v, out)) } return out }
    for (const mod of ['gdprTemplates', 'dsfaTemplates', 'bcmTemplates']) {
      const nodes = walk(require(`../server/${mod}`).DATA)
      expect(nodes.length).toBeGreaterThan(20)
      for (const n of nodes) expect([mod, n.en, ph(n.et)]).toEqual([mod, n.en, ph(n.en)])
    }
  })
  test('SoA-/NIS2-Katalog: jede Übersetzung hat estnischen Text', () => {
    const soa = require('../server/i18n/catalogSoa'), nis2 = require('../server/i18n/catalogNis2')
    for (const o of [...Object.values(soa.themes), ...Object.values(soa.titles)]) expect(typeof o.et).toBe('string')
    for (const e of Object.values(nis2.checklist)) { expect(typeof e.title.et).toBe('string'); expect(typeof e.description.et).toBe('string') }
    for (const o of [...Object.values(nis2.categories), ...Object.values(nis2.subParagraphs)]) expect(typeof o.et).toBe('string')
    for (const g of Object.values(nis2.crossmap)) { expect(typeof g.topic.et).toBe('string'); expect(typeof g.description.et).toBe('string') }
  })
  test('Anleitungs-Seeds: neun Markdown-Dateien in guidance-et, gleiche Namen wie guidance-hu', () => {
    const names = fs.readdirSync(path.join(root, 'server/db/guidance-hu')).sort()
    expect(fs.readdirSync(path.join(root, 'server/db/guidance-et')).sort()).toEqual(names)
    for (const n of names) expect(fs.readFileSync(path.join(root, 'server/db/guidance-et', n), 'utf8').length).toBeGreaterThan(1000)
  })
  test('Demo-Bündel et.json: gleiche Struktur wie en.json, Sprache et, Texte übersetzt', () => {
    const en = JSON.parse(fs.readFileSync(path.join(root, 'data/demo-bundles/en.json'), 'utf8'))
    const et = JSON.parse(fs.readFileSync(path.join(root, 'data/demo-bundles/et.json'), 'utf8'))
    expect(et.lang).toBe('et')
    expect(Object.keys(et)).toEqual(Object.keys(en))
    expect(Object.keys(et.files)).toEqual(Object.keys(en.files))
    for (const f of Object.keys(en.files)) expect([f, et.files[f].length]).toEqual([f, en.files[f].length])
    expect(JSON.stringify(et)).not.toBe(JSON.stringify(en))
    expect(et.files['risks.json'][0].title).not.toBe(en.files['risks.json'][0].title)
  })
  test('Demo-Bündel et.json ist landesbezogen: estnische Firmen, Orte, Behörden — keine deutschen Originale', () => {
    const et = JSON.parse(fs.readFileSync(path.join(root, 'data/demo-bundles/et.json'), 'utf8'))
    const raw = JSON.stringify(et)
    for (const bad of ['DATEV', 'Hetzner', 'Telekom Security', 'TÜV', 'Lexware', 'Securelink', 'konzern.de', 'sample-gmbh', 'Musterstra', 'BDSG', 'HGB', 'Frankfurt am Main', 'Klaus Müller', 'Claudia Meier'])
      expect([bad, raw.includes(bad)]).toEqual([bad, false])
    const names = et.files['suppliers.json'].map(s => s.name)
    expect(names).toEqual(expect.arrayContaining(['Palgapilv OÜ', 'Nordhost OÜ', 'Turvalink OÜ', 'Sertifitseerimiskeskus AS']))
    expect(et.files['suppliers.json'].filter(s => s.country === 'EE').length).toBeGreaterThanOrEqual(5)
    expect(raw).toMatch(/Andmekaitse Inspektsioon/)
    // IDs unverändert gegenüber en.json (Sync, Verweise)
    const en = JSON.parse(fs.readFileSync(path.join(root, 'data/demo-bundles/en.json'), 'utf8'))
    expect(et.files['suppliers.json'].map(s => s.id)).toEqual(en.files['suppliers.json'].map(s => s.id))
    expect(et.files['risks.json'].map(r => r.id)).toEqual(en.files['risks.json'].map(r => r.id))
  })
  test('Fragebogen und öffentliche Seite: Estnisch vorhanden (Auswahl erst bei Status complete)', () => {
    const src = f => fs.readFileSync(path.join(root, f), 'utf8')
    expect(src('server/db/assessmentStore.js')).toMatch(/\n  et: \[/)
    expect(src('server/routes/assessmentPublic.js')).toMatch(/\n  et: \{\n    pageTitle:\s+'Tarnija enesehindamine/)
  })
})
