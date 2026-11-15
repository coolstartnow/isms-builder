'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Leser für Inline-Handler (onclick="…" und Verwandte) in den Vorlagenzeichenketten von ui/app.js. Zerlegt jedes Attribut in festen Text und
// eingesetzte ${…}-Ausdrücke und stellt fest, in welchem Zusammenhang ein Ausdruck steht. Grundlage des Wächters
// (tests/inlineHandlerGuard.test.js): escHtml() maskiert & < > " — NICHT den Apostroph; ein Wert innerhalb einer einfach gequoteten JavaScript-
// Zeichenkette im Attribut kann diese also beenden (der Browser entschlüsselt das Attribut zuerst, danach läuft der Rest als Code).
// Sicher ist nur ein JS-Literal, das selbst maskiert wurde: ${jsArg(wert)} (siehe ui/app.js).

const EVENTS = 'click|change|input|submit|keydown|keyup|keypress|blur|focus|mouseover|mouseout|dblclick|dragstart|dragover|dragenter|dragleave|drop|paste|toggle'
const START = new RegExp(`\\bon(?:${EVENTS})\\s*=\\s*"`, 'g')

// i steht auf dem öffnenden Anführungszeichen; Rückgabe: Index hinter dem schließenden
function scanString(src, i) {
  const q = src[i]; i++
  while (i < src.length) { if (src[i] === '\\') { i += 2; continue } if (src[i] === q) return i + 1; i++ }
  return i
}
// i steht auf dem öffnenden Backtick
function scanTemplate(src, i) {
  i++
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue }
    if (src[i] === '`') return i + 1
    if (src[i] === '$' && src[i + 1] === '{') { i = scanExpr(src, i + 2); continue }
    i++
  }
  return i
}
// i steht hinter „${“; Rückgabe: Index hinter der passenden „}“
function scanExpr(src, i) {
  let depth = 1
  while (i < src.length) {
    const c = src[i]
    if ((c === "'" || c === '"') && src[i - 1] === '/' && src[i + 1] === '/') { i += 2; continue }   // Regex-Literal wie /'/g
    if (c === "'" || c === '"') { i = scanString(src, i); continue }
    if (c === '`') { i = scanTemplate(src, i); continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i + 1 }
    i++
  }
  return i
}

// → [{ attr, start, bodyStart, bodyEnd, line, segs: [{ t: 'text'|'expr', s, from, to }] }]
function findHandlers(src) {
  const out = []
  START.lastIndex = 0
  let m
  while ((m = START.exec(src))) {
    const attr = m[0].match(/^on\w+/)[0]
    const bodyStart = START.lastIndex
    const segs = []
    let i = bodyStart, textFrom = i
    while (i < src.length) {
      const c = src[i]
      if (c === '$' && src[i + 1] === '{') {
        if (i > textFrom) segs.push({ t: 'text', s: src.slice(textFrom, i), from: textFrom, to: i })
        const j = scanExpr(src, i + 2)
        segs.push({ t: 'expr', s: src.slice(i + 2, j - 1), from: i, to: j })
        i = j; textFrom = i; continue
      }
      if (c === '\\') { i += 2; continue }
      if (c === '"') break
      i++
    }
    if (i > textFrom) segs.push({ t: 'text', s: src.slice(textFrom, i), from: textFrom, to: i })
    out.push({ attr, start: m.index, bodyStart, bodyEnd: i, line: src.slice(0, m.index).split('\n').length, segs })
    START.lastIndex = Math.max(i, bodyStart)
  }
  return out
}

const SAFE_WRAPPERS = /^(?:jsArg|jsNum)\(/
const SAFE_JSON = /^(?:escHtml|escVal)\(JSON\.stringify\(/    // schon vorhandene sichere Schreibweise (JS-Literal, maskiert)
// feste Zahlen/Zähler und Konstanten (GROSSBUCHSTABEN), und die Verneinung einer Variablen (Wahrheitswert) — kein Datenwert
const NUMERIC = /^(?:i|j|k|idx|index|n|\d+|[\w.]+\.length|Number\([^)]*\)|_?[A-Z][A-Z0-9_]*|![A-Za-z_]\w*)$/

// Zusammengesetzt: `cond ? \`f(${jsArg(x)})\` : 'null'` — jede Schablone im Ausdruck setzt nur jsArg(…)/jsNum(…) ein (die Bedingung wird nicht ausgegeben)
function compositeSafe(e) {
  if (!e.includes('`')) return false
  let i = 0, templates = 0
  while (i < e.length) {
    const c = e[i]
    if (c === "'" || c === '"') { i = scanStringLocal(e, i); continue }
    if (c !== '`') { i++; continue }
    templates++; i++
    while (i < e.length && e[i] !== '`') {
      if (e[i] === '\\') { i += 2; continue }
      if (e[i] === '$' && e[i + 1] === '{') { const j = scanExpr(e, i + 2); if (!SAFE_WRAPPERS.test(e.slice(i + 2, j - 1).trim())) return false; i = j; continue }
      i++
    }
    i++
  }
  return templates > 0
}
function scanStringLocal(src, i) { return scanString(src, i) }

// Für jeden Ausdruck eines Handlers: inQuote = steht er innerhalb einer einfach gequoteten JS-Zeichenkette?
// kind: 'quoted' (UNSICHER), 'safe' (jsArg/jsNum/escHtml(JSON.stringify(…))), 'numeric' (erlaubte Zählervariable), 'raw' (UNSICHER: ungequotet, ungeschützt)
function analyze(handler) {
  let inQuote = false
  const out = []
  for (const seg of handler.segs) {
    // Text steht roh im Quelltext der Vorlage: ein maskiertes Hochkomma (\\') ergibt im Ergebnis ein echtes Hochkomma — es zählt mit
    if (seg.t === 'text') { for (let k = 0; k < seg.s.length; k++) { if (seg.s[k] === '\\') { if (seg.s[k + 1] === "'") inQuote = !inQuote; k++; continue } if (seg.s[k] === "'") inQuote = !inQuote } continue }
    const e = seg.s.trim()
    const kind = inQuote ? 'quoted' : (SAFE_WRAPPERS.test(e) || SAFE_JSON.test(e) || compositeSafe(e)) ? 'safe' : NUMERIC.test(e) ? 'numeric' : 'raw'
    out.push({ expr: e, inQuote, kind, from: seg.from, to: seg.to })
  }
  return out
}

module.exports = { findHandlers, analyze, scanExpr, EVENTS }
