// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// CSV-Export und -Import der Dokumente (Richtlinien, Verfahren …). Reine Funktionen ohne Dateizugriff.
//
// Export: UTF-8 mit BOM, Komma, Anführungszeichen um jede Zelle (wie Risiken und Maßnahmen); Zellen, die mit = + - @ Tab oder CR
// beginnen, bekommen ein Hochkomma vorangestellt, damit Tabellenkalkulationen sie nicht als Formel auslesen. Der Import entfernt es wieder.
// Import: erkennt Komma oder Semikolon, Anführungszeichen, Zeilenumbrüche in Zellen und das BOM. Kopfzeile mit festen englischen Namen.

const COLUMNS = ['id', 'type', 'title', 'language', 'status', 'version', 'owner', 'nextReviewDate', 'parent', 'content']
const LANGUAGES = require('./languages').codes()
const LIMITS = { maxBytes: 5 * 1024 * 1024, maxRows: 500, maxTitle: 200, maxContent: 500 * 1024 }

const FORMULA = /^[=+\-@\t\r]/
const escapeCell = v => { let s = v == null ? '' : String(v); if (FORMULA.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }
const unescapeCell = s => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s)

// Dokumente → CSV-Text (mit BOM). `templates`: Liste wie von storage.getTemplates; Elternbezug wird als Titel des übergeordneten Dokuments ausgegeben.
function toCsv(templates) {
  const list = Array.isArray(templates) ? templates : []
  const titleOf = new Map(list.map(t => [t.id, t.title]))
  const rows = list.map(t => [t.id, t.type, t.title, t.language, t.status, t.version, t.owner, t.nextReviewDate ? String(t.nextReviewDate).slice(0, 10) : '', t.parentId ? (titleOf.get(t.parentId) || '') : '', t.content])
  return '﻿' + [COLUMNS, ...rows].map(r => r.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}

// CSV-Text → Zeilen (Arrays von Zellen). Trennzeichen wird an der Kopfzeile erkannt.
function parseRows(text) {
  let s = String(text == null ? '' : text)
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  const firstLine = s.split(/\r\n|\n|\r/, 1)[0] || ''
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = [], cell = '', inQ = false, i = 0
  const endCell = () => { row.push(cell); cell = '' }
  const endRow = () => { endCell(); if (row.some(c => c !== '')) rows.push(row); row = [] }
  while (i < s.length) {
    const ch = s[i]
    if (inQ) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i += 2; continue } inQ = false; i++; continue }
      cell += ch; i++; continue
    }
    if (ch === '"' && cell === '') { inQ = true; i++; continue }
    if (ch === delim) { endCell(); i++; continue }
    if (ch === '\r') { endRow(); i += s[i + 1] === '\n' ? 2 : 1; continue }
    if (ch === '\n') { endRow(); i++; continue }
    cell += ch; i++
  }
  if (inQ) return { ok: false, code: 'unterminated_quote' }
  if (cell !== '' || row.length) endRow()
  return { ok: true, rows }
}

// CSV-Text prüfen → { ok, records: [{ line, type, title, language, content, nextReviewDate, parent }], errors: [{ line, code }] }
// `allowedTypes`: erlaubte Dokumenttypen (Liste der Installation). Ungültige Zeilen werden gemeldet, gültige trotzdem geliefert.
function parseImport(text, allowedTypes) {
  if (Buffer.byteLength(String(text || ''), 'utf8') > LIMITS.maxBytes) return { ok: false, code: 'too_large' }
  const parsed = parseRows(text)
  if (!parsed.ok) return parsed
  if (parsed.rows.length < 2) return { ok: false, code: 'empty' }
  const head = parsed.rows[0].map(h => h.trim())
  const idx = Object.fromEntries(COLUMNS.map(c => [c, head.indexOf(c)]))
  for (const need of ['type', 'title', 'language', 'content']) if (idx[need] < 0) return { ok: false, code: 'missing_column', column: need }
  const body = parsed.rows.slice(1)
  if (body.length > LIMITS.maxRows) return { ok: false, code: 'too_many_rows', max: LIMITS.maxRows }
  const types = new Set(allowedTypes || [])
  const records = [], errors = []
  body.forEach((r, n) => {
    const line = n + 2
    const cell = c => unescapeCell(idx[c] >= 0 ? String(r[idx[c]] == null ? '' : r[idx[c]]) : '')
    const type = cell('type').trim(), title = cell('title').trim(), language = cell('language').trim().toLowerCase()
    const content = cell('content'), parent = cell('parent').trim()
    const review = cell('nextReviewDate').trim()
    if (!title) return errors.push({ line, code: 'title_missing' })
    if (title.length > LIMITS.maxTitle) return errors.push({ line, title: title.slice(0, 40), code: 'title_too_long' })
    if (!types.has(type)) return errors.push({ line, title, code: 'type_unknown', value: type.slice(0, 40) })
    if (!LANGUAGES.includes(language)) return errors.push({ line, title, code: 'language_unknown', value: language.slice(0, 10) })
    if (content.length > LIMITS.maxContent) return errors.push({ line, title, code: 'content_too_long' })
    if (review && !/^\d{4}-\d{2}-\d{2}$/.test(review)) return errors.push({ line, title, code: 'date_invalid', value: review.slice(0, 20) })
    records.push({ line, type, title, language, content, nextReviewDate: review || null, parent })
  })
  return { ok: true, records, errors }
}

const key = (type, title, language) => [type, String(title).trim().toLowerCase(), language].join('\u0001')

// Prüfergebnis gegen die vorhandenen Dokumente abgleichen → { toCreate: [...], skipped: [{ line, title, code: 'exists'|'duplicate_in_file' }] }
function plan(records, existing) {
  const seen = new Set((existing || []).map(t => key(t.type, t.title, t.language)))
  const toCreate = [], skipped = []
  for (const r of records) {
    const k = key(r.type, r.title, r.language)
    if (seen.has(k)) { skipped.push({ line: r.line, title: r.title, code: toCreate.some(c => key(c.type, c.title, c.language) === k) ? 'duplicate_in_file' : 'exists' }); continue }
    seen.add(k); toCreate.push(r)
  }
  return { toCreate, skipped }
}

module.exports = { COLUMNS, LANGUAGES, LIMITS, toCsv, parseRows, parseImport, plan }
