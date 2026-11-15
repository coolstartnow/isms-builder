'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Rechtlicher Hinweis zu ISO, NEN 7510 und TISAX: Die Normtexte unterliegen den Rechten ihrer Herausgeber und werden nicht mitgeliefert; Demo-Controls sind erfunden.
// Der Hinweis muss in der SoA-Anleitung, den Audit-Leitfäden (alle Sprachen), den Anleitungen in der App und in der README stehen — und beide Rahmenwerke nennen.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')
const SUF = { de: '', en: '.en', fr: '.fr', nl: '.nl', hu: '.hu', et: '.et' }
const HEAD = { de: 'Rechtlicher Hinweis', en: 'Legal notice', fr: 'Avis juridique', nl: 'Juridische kennisgeving', hu: 'Jogi megjegyzés', et: 'Õiguslik märkus' }
// Kernaussagen je Sprache (kein Normtext im Lieferumfang, Demo-Controls erfunden, keine Rechtsberatung)
const CORE = { de: ['nicht mitgeliefert', 'erfundene', 'keine Rechtsberatung'], en: ['not shipped', 'invented', 'not legal advice'], fr: ['ne sont pas fournis', 'fictifs', "pas un conseil juridique"], nl: ['niet met ISMS Builder meegeleverd', 'verzonnen', 'geen juridisch advies'], hu: ['nem szállítja', 'kitalált', 'nem jogi tanács'], et: ['kaasa ei anna', 'väljamõeldud', 'ei ole õigusnõustamine'] }
const block = (text, lang) => { const i = text.indexOf(`**${HEAD[lang]}:**`); return i < 0 ? '' : text.slice(i, text.indexOf('\n', i)) }
const ok = (b, lang) => ['ISO 27001', 'NEN 7510', 'TISAX', ...CORE[lang]].every(k => b.includes(k))

describe('Rechtlicher Hinweis zu ISO, NEN 7510 und TISAX', () => {
  test.each(Object.keys(SUF))('Audit-Leitfaden module-audits%s.md: Abschnitt mit Hinweis, nennt NEN 7510 und TISAX', lang => {
    const t = read(`docs/module-audits${SUF[lang]}.md`)
    expect(ok(block(t, lang), lang)).toBe(true)
    expect(t).toMatch(/^## .*NEN 7510.*TISAX/m)
  })
  test('SoA-Anleitung (de): Hinweis in „Unterstützte Frameworks“ und in „Eigene Gruppen“; keine Behauptung, die Rahmenwerke seien mitgeliefert', () => {
    const t = read('docs/template-type-soa.md')
    expect(t.split('**Rechtlicher Hinweis:**').length - 1).toBe(2)
    expect(ok(block(t, 'de'), 'de')).toBe(true)
    expect(t).toMatch(/NEN 7510[^\n]*TISAX[^\n]*\*\*nicht\*\* zum Lieferumfang/)
  })
  test.each([['de', 'server/db/guidanceStore.js'], ['en', 'server/db/guidanceStore.js'], ['fr', 'server/db/guidanceStore.js'], ['nl', 'server/db/guidanceStore.js'], ['hu', 'server/db/guidance-hu/soa.md'], ['et', 'server/db/guidance-et/soa.md']])('Anleitung in der App (%s): Hinweis steht', (lang, file) => {
    const t = read(file)
    expect(ok(block(t, lang), lang)).toBe(true)
  })
  test('README (Englisch): Hinweis bei „Other frameworks“', () => {
    const t = read('README.md')
    expect(ok(block(t.replace(/^> /gm, ''), 'en'), 'en')).toBe(true)
  })
})

describe('frameworkNotice.js (Nachtrag in bestehende Anleitungen)', () => {
  const notice = require('../server/frameworkNotice')
  const old = { de: '> **Eigene Gruppen:** …', en: '> **Own groups:** …', fr: '> **Groupes personnalisés :** …', nl: '> **Eigen groepen:** …', hu: '> **Saját csoportok:** …', et: '> **Oma rühmad:** …' }
  test.each(Object.keys(old))('%s: Hinweis wird nach dem Absatz „Eigene Gruppen“ eingefügt, ein zweiter Lauf ändert nichts', lang => {
    const text = `# T\n\n${old[lang]}\n\n---\nRest`
    const out = notice.patchContent(text)
    expect(out).toContain(notice.line(lang)); expect(out.indexOf(old[lang])).toBeLessThan(out.indexOf(notice.line(lang))); expect(out.endsWith('---\nRest')).toBe(true)
    expect(notice.patchContent(out)).toBeNull()
  })
  test('ohne den Absatz „Eigene Gruppen“ (eigener, geänderter Text) und bei Nicht-Text bleibt alles unberührt', () => {
    expect(notice.patchContent('# Eigener Leitfaden ohne den bekannten Absatz')).toBeNull()
    for (const v of [null, undefined, 5, {}]) expect(notice.patchContent(v)).toBeNull()
  })
  test('die Texte im Modul sind in den Anleitungen des Programmstands und in der README wortgleich', () => {
    const guide = read('server/db/guidanceStore.js') + read('server/db/guidance-hu/soa.md') + read('server/db/guidance-et/soa.md')
    for (const lang of Object.keys(old)) expect([lang, guide.includes(notice.line(lang))]).toEqual([lang, true])
    expect(read('README.md').replace(/^> /gm, '')).toContain(notice.TEXT.en)
  })
})
