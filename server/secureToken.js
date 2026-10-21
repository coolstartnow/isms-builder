// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Geheime Zufallswerte (Links ohne Anmeldung) kommen aus dem kryptografischen Zufallsgenerator des Betriebssystems, nie aus
// Math.random() (GHSA-vf3w-pmvj-x8mc). IDs ohne Geheimnis dürfen weiter einfach erzeugt werden.
const crypto = require('crypto')

// 24 Byte = 192 Bit, URL-sicher (Buchstaben, Ziffern, '-' und '_')
function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}

// Zulässiges Format eines Tokens in der URL: das neue (base64url) und das alte (a–z, 0–9, '-') — bereits versandte Links bleiben gültig.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{8,128}$/
const isTokenFormat = t => typeof t === 'string' && TOKEN_FORMAT.test(t)

module.exports = { randomToken, isTokenFormat }
