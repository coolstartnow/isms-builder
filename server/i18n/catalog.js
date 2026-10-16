// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Übersetzt mitgelieferte Katalogdaten beim Lesen (Overlay je ID). Gespeicherte Daten bleiben unverändert;
// de ist die Quellsprache, unbekannte IDs (eigene/importierte Controls, BSI) bleiben unangetastet.
const soa = require('./catalogSoa')
const nis2 = require('./catalogNis2')

function localizeControl(c, lang) {
  if (!c || !lang || lang === 'de') return c
  const t = soa.titles[c.id]
  const th = soa.themes[c.theme]
  if (!t && !th) return c
  return { ...c, ...(t && t[lang] ? { title: t[lang] } : {}), ...(th && th[lang] ? { theme: th[lang] } : {}) }
}

const localizeControls = (list, lang) => (Array.isArray(list) ? list.map(c => localizeControl(c, lang)) : list)

// NIS2-Governance-Checkliste: Titel/Beschreibung (de → Overlay), Kategorie und Unterabsatz (en → Overlay)
function localizeGovItem(item, lang) {
  if (!item || !lang || item.error) return item
  const out = { ...item }
  const e = nis2.checklist[item.id]
  if (lang !== 'de' && e) {
    if (e.title[lang]) out.title = e.title[lang]
    if (e.description[lang]) out.description = e.description[lang]
  }
  if (lang !== 'en') {
    const c = nis2.categories[item.category]
    if (c && c[lang]) out.category = c[lang]
    const sp = nis2.subParagraphs[item.subParagraph]
    if (sp && sp[lang]) out.subParagraphText = sp[lang]
  }
  return out
}

function localizeCrossmapGroup(g, lang) {
  const e = g && nis2.crossmap[g.id]
  if (!e || !lang || lang === 'de') return g
  return { ...g, ...(e.topic[lang] ? { topic: e.topic[lang] } : {}), ...(e.description[lang] ? { description: e.description[lang] } : {}) }
}

module.exports = { localizeControl, localizeControls, localizeGovItem, localizeCrossmapGroup }
