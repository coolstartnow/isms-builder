// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Absturzsicherheit für Express 4: Eine `async`-Routenfunktion, die eine Ausnahme wirft (z. B. `.toLowerCase` auf einer Zahl,
// bcrypt mit Objekt als Passwort, rekursive Verarbeitung tief verschachtelter Eingaben), erzeugt dort eine nicht abgefangene
// Promise-Ablehnung — der Node-Prozess endet, und der Server ist für alle Benutzer weg.
// Dieses Modul hängt sich einmal in die Weitergabe der Anfrage an die Routenfunktion: Rückgabewerte, die Promises sind, werden
// abgefangen und als Fehler an `next(err)` gegeben (→ zentraler Fehlerhandler, Antwort 500 ohne Einzelheiten).
// Muster wie das Paket „express-async-errors“, hier ohne zusätzliche Abhängigkeit.
const Layer = require('express/lib/router/layer')

if (!Layer.prototype.__asyncSafe) {
  const original = Layer.prototype.handle_request
  Layer.prototype.handle_request = function handleRequest(req, res, next) {
    const fn = this.handle
    if (typeof fn !== 'function' || fn.length > 3) return original.call(this, req, res, next)   // Fehlerhandler (4 Parameter) unverändert
    try {
      const result = fn(req, res, next)
      if (result && typeof result.then === 'function') result.then(undefined, next)
    } catch (err) { next(err) }
  }
  Layer.prototype.__asyncSafe = true
}

// Zentrale Fehlerantwort: keine Stacktraces und keine Interna nach außen; Einzelheiten nur im Log.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]}: ${err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err}`)
  const status = err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : (isInputError(err) ? 400 : 500)
  res.status(status).json({ error: status === 500 ? 'Internal server error' : (status === 400 && isInputError(err) ? 'Invalid request.' : 'Request could not be processed') })
}

// Fehler der Datenbank, die durch ungültige Eingaben entstehen (zu langer Text, Nullbyte, Zahl außerhalb des Bereichs, falsches Format):
// MariaDB/MySQL und PostgreSQL lehnen sie ab, SQLite nicht. Sie sind Fehler des Aufrufers (400), nicht des Servers (500).
const INPUT_ERROR_CODES = new Set(['ER_DATA_TOO_LONG', 'ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_DATA_OUT_OF_RANGE',
  'ER_WRONG_VALUE_FOR_TYPE', '22001', '22003', '22021', '22P02', '22P04', '22P05'])
const INPUT_ERROR_TEXT = /data too long|value too long|string data,? right truncat|incorrect (string|integer|decimal) value|invalid byte sequence|null character|\\u0000|invalid input syntax|numeric value out of range|out of range value/i
function isInputError(errOrMessage) {
  if (!errOrMessage) return false
  if (typeof errOrMessage === 'string') return INPUT_ERROR_TEXT.test(errOrMessage)
  return INPUT_ERROR_CODES.has(String(errOrMessage.code)) || INPUT_ERROR_TEXT.test(String(errOrMessage.message || ''))
}

// Viele Routen antworten im catch-Zweig mit `res.status(500).json({ error: e.message })` — bei SQL-Backends steht dann Treibertext
// („Data too long for column …“, Tabellen-/Spaltennamen) in der Antwort. Dieser Filter ersetzt die Fehlermeldung jeder
// 500-Antwort (501/503 mit bewusster Begründung bleiben) durch den Standardtext; die ursprüngliche Meldung kommt nur ins Log.
function maskServerErrors(req, res, next) {
  const json = res.json.bind(res)
  res.json = body => {
    if (res.statusCode === 500 && body && typeof body === 'object' && typeof body.error === 'string' && isInputError(body.error)) {
      console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]}: ungültige Eingabe (${body.error.slice(0, 120)})`)
      res.status(400)
      body = { ...body, error: 'Invalid request.' }
    }
    if (res.statusCode === 500 && body && typeof body === 'object' && typeof body.error === 'string' && body.error !== 'Internal server error') {
      console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]}: ${res.statusCode} ${body.error.slice(0, 200)}`)
      body = { ...body, error: 'Internal server error' }
    }
    return json(body)
  }
  next()
}

// Letzte Absicherung für Ablehnungen, die nicht aus einer Route kommen (Zeitgeber, Hintergrundaufgaben): protokollieren statt beenden.
function installProcessGuards() {
  if (process.__ismsGuards) return
  process.__ismsGuards = true
  process.on('unhandledRejection', reason => console.error('[unhandledRejection]', reason && reason.stack ? reason.stack.split('\n').slice(0, 3).join(' | ') : reason))
}

module.exports = { isInputError, errorHandler, maskServerErrors, installProcessGuards }
