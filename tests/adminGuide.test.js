'use strict'
// Administrationsleitfaden (docs/admin-console*.md): in allen Sprachen vorhanden, je Reiter ein Kapitel, Reiternamen wie in der Oberfläche, Anleitung nur für Administratoren
const fs = require('fs'), path = require('path')
const LANG_REG = require('../ui/i18n/languages.js')
const root = p => path.join(__dirname, '..', p)

global.window = {}
new Function('window', fs.readFileSync(root('ui/i18n/translations.js'), 'utf8'))(global.window)
const T = global.window.TRANSLATIONS
const TABS = ['admin_users', 'admin_entities', 'admin_templates', 'admin_lists', 'admin_org', 'admin_auditLog', 'admin_maintenance', 'admin_trash', 'admin_sysConfig']

describe.each(LANG_REG.completeCodes())('Administrationsleitfaden (%s)', code => {
  const md = fs.readFileSync(root(`docs/admin-console${LANG_REG.docSuffix(code)}.md`), 'utf8')
  test('neun nummerierte Kapitel, je Reiter eines, mit dem Namen aus der Oberfläche', () => {
    for (let i = 1; i <= 9; i++) expect([i, new RegExp(`^## ${i}\\. `, 'm').test(md)]).toEqual([i, true])
    for (const k of TABS) expect([k, md.includes(T[k][code])]).toEqual([k, true])
  })
  test('nennt die Grundregeln: erste Anmeldung, 2FA-Pflicht, Papierkorb 30 Tage, Demo-Import überschreibt', () => {
    expect(md).toMatch(/2FA/); expect(md).toMatch(/30/); expect(md).toMatch(/adminpass/); expect(md).toMatch(/2000/)
    expect(md).toMatch(/STORAGE_BACKEND=json/)
  })
  test('je Reiter ein Screenshot in der Sprache des Leitfadens; alle Bilddateien vorhanden', () => {
    const imgs = [...md.matchAll(/!\[[^\]]*\]\((images\/admin\/[^)]+)\)/g)].map(m => m[1])
    expect(imgs.length).toBe(9)
    for (const i of imgs) { expect([i, i.startsWith(`images/admin/${code}/`)]).toEqual([i, true]); expect([i, fs.existsSync(root(`docs/${i}`))]).toEqual([i, true]) }
  })
  test('keine fremden Schriftzeichen (Kyrillisch) im Text', () => { expect(md).not.toMatch(/[Ѐ-ӿ]/) })
})

test('Leitfaden ist als Guidance-Seed für Administratoren angelegt (admin-intern, minRole admin, alle Sprachen)', () => {
  const src = fs.readFileSync(root('server/db/guidanceStore.js'), 'utf8')
  const block = src.slice(src.indexOf("seedId:        'seed_admin_console'"), src.indexOf("seedId:        'seed_changelog'"))
  expect(block).toMatch(/srcFiles:\s+docFiles\('admin-console'\)/)
  expect(block).toMatch(/category:\s+'admin-intern'/); expect(block).toMatch(/minRole:\s+'admin'/)
  for (const l of LANG_REG.completeCodes()) expect([l, block.includes(`${l}: "`)]).toEqual([l, true])
})
