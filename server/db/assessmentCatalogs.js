// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Fragenkataloge der Lieferanten-Selbstauskunft und Zusammenbau der Fragebögen aus Vorlagen.
// Reine Funktionen ohne Dateizugriff (Vorlagen speichert assessmentTemplateStore).
'use strict'

const nis2 = require('./catalogs/nis2.json')
const LANGS = require('../languages').completeCodes()

const CUSTOM_SECTION = {
  de: 'Eigene Fragen', en: 'Additional questions', fr: 'Questions supplémentaires',
  nl: 'Aanvullende vragen', hu: 'Egyéb kérdések', et: 'Täiendavad küsimused',
}
const TYPES = ['yesno', 'text', 'textarea']
const MAX_SECTIONS = 30, MAX_PER_SECTION = 50, MAX_QUESTIONS = 200, MAX_TEXT = 1000

function pick(obj, lang) { return (obj && (obj[lang] || obj.en || obj.de)) || '' }

// Standard-Katalog: kommt aus assessmentStore (dort liegen die Texte je Sprache).
function standardSections(lang) {
  const store = require('./assessmentStore')
  return store.getDefaultQuestions(lang).map((s, i) => ({
    key: 's' + i,
    section: s.section,
    questions: s.questions.map(q => ({ id: q.id, text: q.text, type: q.type, comment: false })),
  }))
}

function nis2Sections(lang) {
  return nis2.sections.map(s => ({
    key: s.key,
    section: pick(s.title, lang),
    questions: s.questions.map(q => ({ id: q.id, text: pick(q, lang), type: q.type, comment: q.comment === true })),
  }))
}

const CATALOGS = {
  standard: { id: 'standard', title: { de: 'Standard (ISO 27001, 19 Fragen)', en: 'Standard (ISO 27001, 19 questions)' }, sections: standardSections },
  nis2:     { id: 'nis2',     title: { de: 'NIS2-Lieferantenprüfung (56 Fragen)', en: 'NIS2 supplier assessment (56 questions)' }, sections: nis2Sections },
}
const CATALOG_IDS = Object.keys(CATALOGS)

function getCatalog(id, lang) {
  const c = CATALOGS[id]
  if (!c) return null
  const l = LANGS.includes(lang) ? lang : 'de'
  return { id: c.id, title: pick(c.title, l), sections: c.sections(l) }
}

function listCatalogs(lang) {
  return CATALOG_IDS.map(id => getCatalog(id, lang))
}

function catalogIndex(id) {
  const idx = new Map()
  const c = getCatalog(id, 'de')
  if (c) c.sections.forEach(s => s.questions.forEach(q => idx.set(q.id, q)))
  return idx
}

// ── Vorlagen prüfen ────────────────────────────────────────────────────────────
// spec = { catalog, selection: [{id, required, comment}], custom: [{id?, text, type, required, comment}] }
function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') return { ok: false, error: 'spec required' }
  if (!CATALOGS[spec.catalog]) return { ok: false, error: 'catalog invalid' }
  const idx = catalogIndex(spec.catalog)
  const sel = Array.isArray(spec.selection) ? spec.selection : []
  const seen = new Set(), selection = []
  for (const it of sel) {
    if (!it || typeof it.id !== 'string' || !idx.has(it.id)) return { ok: false, error: 'selection contains unknown question' }
    if (seen.has(it.id)) return { ok: false, error: 'selection contains duplicates' }
    seen.add(it.id)
    selection.push({ id: it.id, required: it.required === true, comment: it.comment === true })
  }
  const cust = Array.isArray(spec.custom) ? spec.custom : []
  if (cust.length > 50) return { ok: false, error: 'too many custom questions' }
  const custom = []
  const cids = new Set()
  for (const c of cust) {
    if (!c || typeof c.text !== 'string' || !c.text.trim() || c.text.length > MAX_TEXT) return { ok: false, error: 'custom question text invalid' }
    if (!TYPES.includes(c.type)) return { ok: false, error: 'custom question type invalid' }
    let id = typeof c.id === 'string' && /^c_[a-z0-9]{4,20}$/.test(c.id) ? c.id : 'c_' + require('crypto').randomBytes(4).toString('hex')
    if (cids.has(id)) id = 'c_' + require('crypto').randomBytes(4).toString('hex')
    cids.add(id)
    custom.push({ id, text: c.text.trim(), type: c.type, required: c.required === true, comment: c.type === 'yesno' && c.comment === true })
  }
  if (selection.length + custom.length < 1) return { ok: false, error: 'at least one question required' }
  if (selection.length + custom.length > MAX_QUESTIONS) return { ok: false, error: 'too many questions' }
  return { ok: true, value: { catalog: spec.catalog, selection, custom } }
}

// Baut die Abschnitte eines Fragebogens (Reihenfolge und Gliederung des Katalogs bleiben erhalten).
function compose(spec, lang) {
  const l = LANGS.includes(lang) ? lang : 'de'
  const cat = getCatalog(spec.catalog, l)
  const chosen = new Map(spec.selection.map(s => [s.id, s]))
  const out = []
  for (const s of cat.sections) {
    const qs = s.questions.filter(q => chosen.has(q.id)).map(q => {
      const c = chosen.get(q.id)
      return { id: q.id, text: q.text, type: q.type, required: c.required === true, comment: q.type === 'yesno' && c.comment === true }
    })
    if (qs.length) out.push({ section: s.section, questions: qs })
  }
  if (spec.custom && spec.custom.length) {
    out.push({ section: CUSTOM_SECTION[l] || CUSTOM_SECTION.en, questions: spec.custom.map(c => ({ id: c.id, text: c.text, type: c.type, required: c.required === true, comment: c.comment === true })) })
  }
  return out
}

// Standardauswahl: alle Fragen; Ja/Nein-Fragen sind Pflicht (wie bisher), Katalog bestimmt das Bemerkungsfeld.
function defaultSpec(catalogId) {
  const cat = getCatalog(catalogId, 'de')
  return {
    catalog: catalogId,
    selection: cat.sections.flatMap(s => s.questions.map(q => ({ id: q.id, required: q.type === 'yesno', comment: q.comment === true }))),
    custom: [],
  }
}

// Fragen, die ein Client mitschickt (Anpassung je Lieferant), säubern. Ergebnis hat immer die gleiche Form.
function sanitizeQuestions(sections) {
  if (!Array.isArray(sections) || sections.length < 1 || sections.length > MAX_SECTIONS) return null
  const ids = new Set(); let n = 0
  const out = []
  for (const s of sections) {
    if (!s || typeof s.section !== 'string' || s.section.length > 200 || !Array.isArray(s.questions) || s.questions.length < 1 || s.questions.length > MAX_PER_SECTION) return null
    const qs = []
    for (const q of s.questions) {
      if (!q || typeof q.id !== 'string' || !/^[a-z0-9_]{1,40}$/.test(q.id) || ids.has(q.id)) return null
      if (typeof q.text !== 'string' || !q.text.trim() || q.text.length > MAX_TEXT || !TYPES.includes(q.type)) return null
      ids.add(q.id); n++
      qs.push({ id: q.id, text: q.text, type: q.type, required: q.required === true, comment: q.type === 'yesno' && q.comment === true })
    }
    out.push({ section: s.section, questions: qs })
  }
  return n <= MAX_QUESTIONS ? out : null
}

module.exports = { CATALOG_IDS, getCatalog, listCatalogs, validateSpec, compose, defaultSpec, sanitizeQuestions, CUSTOM_SECTION }
