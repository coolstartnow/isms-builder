// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Register der Anforderungen einer BCM-Norm (derzeit ISO 22301): Import (CSV/JSON), Prüfung, Vorlage, Export, Auswertung.
// Der Normtext wird NICHT mit dem ISMS Builder ausgeliefert (Urheberrecht): Die Firma importiert ihn aus ihrer lizenzierten Ausgabe.
// Reine Funktionen ohne Dateizugriff; Speicherung in db/bcmStore.js.

const FRAMEWORKS = ['ISO22301']
const LANGS = require('./languages').codes()
const STATUSES = ['not_started', 'partial', 'implemented', 'not_applicable']
const MAX_BYTES = 2 * 1024 * 1024
const MAX_ROWS = 2000
const LIMITS = { id: 40, chapter: 40, title: 512, summary: 4000, amendment: 60 }

const COLUMNS = ['framework', 'id', 'parent', 'chapter', 'amendment',
  ...LANGS.map(l => `title_${l}`), ...LANGS.map(l => `summary_${l}`), 'title', 'summary']

const keyOf = (framework, id) => `${framework}:${id}`

// ── CSV ────────────────────────────────────────────────────────────────────
// Trennzeichen Komma oder Semikolon (wird an der Kopfzeile erkannt), Felder in Anführungszeichen, "" als Anführungszeichen, Zeilenumbrüche in Feldern
function parseCsv(text) {
  let s = String(text == null ? '' : text)
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  const firstLine = s.split(/\r?\n/, 1)[0] || ''
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = [], field = '', inQ = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++ } else inQ = false } else field += c
    } else if (c === '"' && field === '') inQ = true
    else if (c === delim) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(v => v !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some(v => v !== '')) rows.push(row)
  if (!rows.length) return { header: [], rows: [] }
  const header = rows[0].map(h => h.trim().toLowerCase())
  const objs = rows.slice(1).map(r => { const o = {}; header.forEach((h, i) => { if (h) o[h] = r[i] === undefined ? '' : r[i] }); return o })
  return { header, rows: objs }
}

function parseJson(text) {
  let data
  try { data = JSON.parse(String(text || '').replace(/^﻿/, '')) } catch { return { code: 'invalid_json' } }
  const list = Array.isArray(data) ? data : (data && Array.isArray(data.requirements) ? data.requirements : null)
  if (!list) return { code: 'invalid_json' }
  return { header: [...new Set(list.flatMap(o => (o && typeof o === 'object' ? Object.keys(o) : [])))].map(k => k.toLowerCase()), rows: list.map(o => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v])) : null)) }
}

// → { header, rows } | { error }
function parse(text, format) {
  if (Buffer.byteLength(String(text || ''), 'utf8') > MAX_BYTES) return { code: 'too_large' }
  const fmt = format || (/^\s*[\[{]/.test(String(text || '')) ? 'json' : 'csv')
  const out = fmt === 'json' ? parseJson(text) : parseCsv(text)
  if (out.code) return out
  if (out.rows.length > MAX_ROWS) return { code: 'too_many_rows' }
  return out
}

// ── Prüfung ────────────────────────────────────────────────────────────────
const str = v => (v === undefined || v === null ? '' : String(v)).trim()

// rows: Objekte mit kleingeschriebenen Spaltennamen. → { accepted: [...], rejected: [{ index, id, reason }], unknownColumns: [...] }
function validate(rows, header = []) {
  const accepted = [], rejected = [], seen = new Set()
  const unknownColumns = header.filter(h => h && !COLUMNS.includes(h))
  rows.forEach((r, index) => {
    const id = r ? str(r.id) : ''
    const bad = reason => rejected.push({ index, id: id || null, reason })
    if (!r) return bad('not_an_object')
    const framework = str(r.framework)
    if (!framework || !id) return bad('missing_field')
    if (!FRAMEWORKS.includes(framework)) return bad('invalid_framework')
    const titles = {}, summaries = {}
    for (const l of LANGS) { const t = str(r['title_' + l]); if (t) titles[l] = t; const s = str(r['summary_' + l]); if (s) summaries[l] = s }
    const fallbackTitle = str(r.title), fallbackSummary = str(r.summary)
    if (fallbackTitle && !titles.en) titles.en = fallbackTitle
    if (fallbackSummary && !summaries.en) summaries.en = fallbackSummary
    if (!Object.keys(titles).length) return bad('missing_field')
    const chapter = str(r.chapter) || id.split('.')[0]
    const parent = str(r.parent)
    const amendment = str(r.amendment)
    if (id.length > LIMITS.id || chapter.length > LIMITS.chapter || parent.length > LIMITS.id || amendment.length > LIMITS.amendment) return bad('too_long')
    if (Object.values(titles).some(t => t.length > LIMITS.title) || Object.values(summaries).some(t => t.length > LIMITS.summary)) return bad('too_long')
    const key = keyOf(framework, id)
    if (seen.has(key)) return bad('duplicate_id')
    seen.add(key)
    accepted.push({ framework, id, parent, chapter, amendment, title: titles, summary: summaries })
  })
  // Elternverweis muss auf eine Zeile der Datei oder auf schon vorhandene Definitionen zeigen (Prüfung nach dem ersten Durchlauf)
  const ids = new Set(accepted.map(a => keyOf(a.framework, a.id)))
  return { accepted, rejected, unknownColumns, ids }
}

// Elternverweise gegen Datei und Bestand prüfen: unbekannte Eltern → abgelehnt
function checkParents(accepted, existingKeys, rejected) {
  const known = new Set([...accepted.map(a => keyOf(a.framework, a.id)), ...existingKeys])
  const ok = []
  for (const a of accepted) {
    if (a.parent && !known.has(keyOf(a.framework, a.parent))) rejected.push({ index: null, id: a.id, reason: 'bad_parent' })
    else ok.push(a)
  }
  return ok
}

// ── Vorlage und Export ─────────────────────────────────────────────────────
// Zellen, die in Tabellenkalkulationen als Formel gelten, beim Export neutralisieren
const safeCell = v => { const s = v == null ? '' : String(v); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s }
const csvCell = v => { const s = safeCell(v); return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const toCsv = (header, rows) => '﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'

// Vorlage mit ERFUNDENEN Beispielzeilen (kein Normtext)
function templateCsv() {
  const header = COLUMNS
  const rows = [
    ['ISO22301', '9', '', '9', '', 'Beispielkapitel', '', '', '', '', 'Example chapter', '', '', '', '', 'Nur ein Beispiel, bitte ersetzen.', '', '', '', '', 'Example only, please replace.', ''],
    ['ISO22301', '9.9', '9', '9', '', 'Beispielanforderung', '', '', '', '', 'Example requirement', '', '', '', '', 'Hier steht Ihre Beschreibung aus der lizenzierten Norm.', '', '', '', '', 'Your description from the licensed standard goes here.', ''],
  ].map(r => { const o = {}; header.forEach((h, i) => { o[h] = r[i] || '' }); return header.map(h => o[h]) })
  return toCsv(header, rows)
}

function exportCsv(requirements, assessments, lang = 'en') {
  const byKey = new Map(assessments.map(a => [keyOf(a.framework, a.id), a]))
  const pick = (m, l) => (m && (m[l] || m.en || Object.values(m)[0])) || ''
  const header = ['framework', 'id', 'chapter', 'title', 'status', 'responsible', 'justification', 'evidence_note', 'linked_bia', 'linked_plans', 'linked_exercises', 'last_review']
  const rows = requirements.map(r => {
    const a = byKey.get(keyOf(r.framework, r.id)) || {}
    return [r.framework, r.id, r.chapter, pick(r.title, lang), a.status || 'not_started', a.responsible || '', a.justification || '', a.evidenceNote || '',
      (a.linkedBia || []).join(' '), (a.linkedPlans || []).join(' '), (a.linkedExercises || []).join(' '), a.lastReviewDate || '']
  })
  return toCsv(header, rows)
}

// ── Auswertung ─────────────────────────────────────────────────────────────
// Nur Blätter (Anforderungen ohne Unterpunkte) zählen; Kapitel/Oberpunkte sind Überschriften
function summarize(requirements, assessments) {
  const parents = new Set(requirements.filter(r => r.parent).map(r => keyOf(r.framework, r.parent)))
  const byKey = new Map(assessments.map(a => [keyOf(a.framework, a.id), a]))
  const leaves = requirements.filter(r => !r.retired && !parents.has(keyOf(r.framework, r.id)))
  const out = { total: leaves.length, notStarted: 0, partial: 0, implemented: 0, notApplicable: 0, withoutEvidence: 0 }
  for (const r of leaves) {
    const a = byKey.get(keyOf(r.framework, r.id))
    const st = (a && a.status) || 'not_started'
    if (st === 'implemented') out.implemented++
    else if (st === 'partial') out.partial++
    else if (st === 'not_applicable') out.notApplicable++
    else out.notStarted++
    const hasEv = a && (a.evidenceNote || (a.linkedBia || []).length || (a.linkedPlans || []).length || (a.linkedExercises || []).length)
    if (st !== 'not_applicable' && !hasEv) out.withoutEvidence++
  }
  return out
}

// Änderung an einem Bearbeitungsstand prüfen → { ok, value } | { ok: false, error }
function cleanAssessment(patch, current = {}) {
  const out = { ...current }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) return { ok: false, error: 'Invalid status' }
    out.status = patch.status
  }
  for (const [k, max] of [['responsible', 200], ['justification', 2000], ['evidenceNote', 4000]]) {
    if (patch[k] !== undefined) {
      if (typeof patch[k] !== 'string' || patch[k].length > max) return { ok: false, error: 'Invalid value', field: k }
      out[k] = patch[k].trim()
    }
  }
  if (patch.lastReviewDate !== undefined) {
    if (patch.lastReviewDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(patch.lastReviewDate))) return { ok: false, error: 'Invalid value', field: 'lastReviewDate' }
    out.lastReviewDate = patch.lastReviewDate
  }
  for (const k of ['linkedBia', 'linkedPlans', 'linkedExercises']) {
    if (patch[k] !== undefined) {
      if (!Array.isArray(patch[k]) || patch[k].length > 200 || patch[k].some(v => typeof v !== 'string' || v.length > 120)) return { ok: false, error: 'Invalid value', field: k }
      out[k] = [...new Set(patch[k])]
    }
  }
  if (!out.status) out.status = 'not_started'
  if (out.status === 'not_applicable' && !str(out.justification)) return { ok: false, error: 'A justification is required for "not applicable"' }
  return { ok: true, value: out }
}

module.exports = { FRAMEWORKS, LANGS, STATUSES, COLUMNS, MAX_BYTES, MAX_ROWS, LIMITS, keyOf, parse, parseCsv, parseJson, validate, checkParents, templateCsv, exportCsv, summarize, cleanAssessment }
