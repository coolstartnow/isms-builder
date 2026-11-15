// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Tiefenbegrenzung für JSON-Eingaben: Sehr tief verschachtelte Objekte (50 000 Ebenen passen in wenige hundert Kilobyte) bringen rekursive
// Verarbeitung (Kopieren, Prüfen, Ausgeben) zum Absturz. Gemessen wird ohne Rekursion; die Anfrage wird mit 400 abgelehnt.
const MAX_DEPTH = 100

function jsonDepth(value, limit = MAX_DEPTH + 1) {
  let max = 0
  const stack = [[value, 1]]
  while (stack.length) {
    const [v, d] = stack.pop()
    if (v === null || typeof v !== 'object') continue
    if (d > max) max = d
    if (max > limit) return max
    for (const k of Array.isArray(v) ? v.keys() : Object.keys(v)) stack.push([v[k], d + 1])
  }
  return max
}

function middleware(req, res, next) {
  if (req.body && typeof req.body === 'object' && jsonDepth(req.body) > MAX_DEPTH) return res.status(400).json({ error: 'Invalid request.' })
  next()
}

module.exports = { jsonDepth, middleware, MAX_DEPTH }
