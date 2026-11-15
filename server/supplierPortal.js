// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Anschluss an den „Lieferanten-Briefkasten“ (eigenes Projekt isms-supplier-portal).
// Der Builder bleibt intern: Er legt Fragebögen ausgehend im Briefkasten ab und holt die verschlüsselten Antworten
// ausgehend ab. Entschlüsselt wird nur hier; der private Schlüssel liegt außerhalb des Datenverzeichnisses.
'use strict'
const fs     = require('fs')
const os     = require('os')
const path   = require('path')
const crypto = require('crypto')
const { dataPath } = require('./paths')

const CONFIG_FILE = () => dataPath('supplier-portal.json')
// Standard: außerhalb des Datenverzeichnisses. In Tests (NODE_ENV=test) liegt der Schlüssel im Wegwerf-Datenverzeichnis, damit
// kein Test (z. B. die Nutzlast-Prüfung aller schreibenden Routen) je einen Schlüssel im Home des Entwicklers anlegt.
const KEY_FILE = () => process.env.SUPPLIER_PORTAL_KEY_FILE ||
  (process.env.NODE_ENV === 'test' ? dataPath('supplier-portal.pem') : path.join(os.homedir(), '.config', 'isms-builder', 'supplier-portal.pem'))
const MAX_RESPONSE = 25 * 1024 * 1024
const TIMEOUT_MS = 15000

// ── Konfiguration ──────────────────────────────────────────────────────────────
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE(), 'utf8')) } catch { return {} }
}
function writeConfig(cfg) {
  const f = CONFIG_FILE()
  fs.mkdirSync(path.dirname(f), { recursive: true })
  const tmp = f + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), { mode: 0o600 })
  fs.renameSync(tmp, f)
}

// http nur für Rechner im eigenen Rechner (localhost); sonst verlangen wir https
function normalizeUrl(value) {
  if (typeof value !== 'string') return null
  let u
  try { u = new URL(value.trim()) } catch { return null }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && (local || process.env.SUPPLIER_PORTAL_ALLOW_HTTP === '1'))) return null
  if (u.username || u.password) return null
  return u.origin + u.pathname.replace(/\/+$/, '')
}

// Für die Oberfläche: nie den API-Schlüssel ausgeben
function publicConfig() {
  const c = readConfig()
  return {
    enabled: c.enabled === true,
    url: c.url || '',
    publicUrl: c.publicUrl || '',
    apiKeySet: typeof c.apiKey === 'string' && c.apiKey.length > 0,
    keyReady: hasKey(),
    keyCreatedAt: c.keyCreatedAt || null,
    lastPollAt: c.lastPollAt || null,
    lastPollResult: c.lastPollResult || null,
  }
}

function saveConfig(fields) {
  const c = readConfig()
  if (fields.url !== undefined) {
    if (fields.url === '') c.url = ''
    else { const n = normalizeUrl(fields.url); if (!n) return { ok: false, error: 'Portal URL invalid (https required)' }; c.url = n }
  }
  if (fields.publicUrl !== undefined) {
    if (fields.publicUrl === '') c.publicUrl = ''
    else { const n = normalizeUrl(fields.publicUrl); if (!n) return { ok: false, error: 'Portal URL invalid (https required)' }; c.publicUrl = n }
  }
  if (fields.apiKey !== undefined && fields.apiKey !== '') {
    if (typeof fields.apiKey !== 'string' || fields.apiKey.length < 32 || fields.apiKey.length > 200) return { ok: false, error: 'API key invalid (at least 32 characters)' }
    c.apiKey = fields.apiKey
  }
  if (fields.enabled !== undefined) c.enabled = fields.enabled === true
  if (c.enabled && (!c.url || !c.apiKey || !hasKey())) return { ok: false, error: 'Portal not fully configured' }
  writeConfig(c)
  return { ok: true }
}

// ── Schlüsselpaar ──────────────────────────────────────────────────────────────
function hasKey() { try { fs.accessSync(KEY_FILE(), fs.constants.R_OK); return true } catch { return false } }

function publicJwk() {
  const pem = fs.readFileSync(KEY_FILE(), 'utf8')
  const pub = crypto.createPublicKey(crypto.createPrivateKey(pem))
  return { ...pub.export({ format: 'jwk' }), alg: 'RSA-OAEP-256', ext: true, key_ops: ['encrypt'] }
}

function generateKey({ replace = false } = {}) {
  if (hasKey() && !replace) return { ok: false, error: 'Key already exists', status: 409 }
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072, publicExponent: 0x10001 })
  const f = KEY_FILE()
  fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 })
  if (hasKey()) fs.copyFileSync(f, `${f}.${new Date().toISOString().replace(/[:.]/g, '-')}.alt`)   // alte Antworten bleiben mit dem alten Schlüssel lesbar
  fs.writeFileSync(f, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
  const c = readConfig(); c.keyCreatedAt = new Date().toISOString(); writeConfig(c)
  return { ok: true }
}

// ── Umschlag entschlüsseln (Format v1, siehe isms-supplier-portal/lib/envelope.js) ─
const unb64u = s => Buffer.from(s, 'base64url')
function decryptEnvelope(token, env, pem = fs.readFileSync(KEY_FILE(), 'utf8')) {
  if (!env || env.v !== 1 || typeof env.ek !== 'string' || typeof env.iv !== 'string' || typeof env.ct !== 'string') throw new Error('envelope invalid')
  const aes = crypto.privateDecrypt({ key: crypto.createPrivateKey(pem), oaepHash: 'sha256', padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, unb64u(env.ek))
  const ct = unb64u(env.ct)
  if (aes.length !== 32 || ct.length < 17) throw new Error('envelope invalid')
  const d = crypto.createDecipheriv('aes-256-gcm', aes, unb64u(env.iv))
  d.setAAD(Buffer.from(token, 'utf8'))
  d.setAuthTag(ct.subarray(ct.length - 16))
  return JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString('utf8'))
}

// ── Aufrufe an den Briefkasten ─────────────────────────────────────────────────
async function call(method, p, body) {
  const c = readConfig()
  if (!c.url || !c.apiKey) throw new Error('Portal not configured')
  const res = await fetch(c.url + p, {
    method, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: 'Bearer ' + c.apiKey, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const len = Number(res.headers.get('content-length') || 0)
  if (len > MAX_RESPONSE) throw new Error('Portal response too large')
  const text = await res.text()
  if (text.length > MAX_RESPONSE) throw new Error('Portal response too large')
  let json = null; try { json = JSON.parse(text) } catch {}
  return { status: res.status, json }
}

// Sprache und Texte unverändert; zusätzlich Frist und öffentlicher Schlüssel
async function publish(a, { ttlDays } = {}) {
  const days = ttlDays || (a.dueDate ? Math.min(180, Math.max(1, Math.ceil((Date.parse(a.dueDate) - Date.now()) / 86400000) + 30)) : 60)
  const body = {
    title: a.title, supplierName: a.supplierName, language: a.language, dueDate: a.dueDate || '', ttlDays: days,
    publicKey: publicJwk(),
    questions: a.questions.map(s => ({ section: s.section, questions: s.questions.map(q => ({ id: q.id, text: q.text, type: q.type, comment: q.comment === true })) })),
  }
  const r = await call('PUT', `/api/q/${a.token}`, body)
  if (r.status !== 200) throw new Error(`Portal rejected the questionnaire (${r.status}${r.json && r.json.error ? ': ' + r.json.error : ''})`)
  return r.json
}

async function testConnection() {
  const r = await call('GET', '/api/answers')
  if (r.status === 401) return { ok: false, error: 'Portal rejected the API key' }
  if (r.status !== 200) return { ok: false, error: `Portal answered with status ${r.status}` }
  return { ok: true, waiting: (r.json && r.json.answers || []).length }
}

// ── Antworten übernehmen ───────────────────────────────────────────────────────
// Prüft Form und Zuordnung, trägt die Antworten ein. Rückgabe: { ok, ... } — der Aufrufer löscht im Briefkasten.
function applyAnswer(assessmentStore, item, plain) {
  const a = assessmentStore.getByToken(item.token)
  if (!a) return { ok: false, reason: 'unknown token' }
  if (a.status !== 'pending') return { ok: false, reason: 'already submitted', drop: true }
  if (!plain || plain.token !== item.token || !Array.isArray(plain.answers)) return { ok: false, reason: 'payload invalid' }
  const qs = new Map(a.questions.flatMap(s => s.questions).map(q => [q.id, q]))
  const str = v => (typeof v === 'string' ? v : '').trim().slice(0, 2000)
  const answers = []
  for (const x of plain.answers) {
    if (!x || typeof x.id !== 'string' || !qs.has(x.id)) continue          // unbekannte Fragen werden verworfen
    const q = qs.get(x.id)
    let value = str(x.value)
    if (q.type === 'yesno' && value !== 'yes' && value !== 'no') value = ''
    const ans = { id: x.id, value }
    const note = q.comment === true ? str(x.note) : ''
    if (note) ans.note = note
    answers.push(ans)
  }
  const have = new Map(answers.map(x => [x.id, x]))
  answers.push(...[...qs.keys()].filter(id => !have.has(id)).map(id => ({ id, value: '' })))
  const missing = [...qs.values()].filter(q => q.required === true && !(have.get(q.id) || {}).value).map(q => q.id)
  const updated = assessmentStore.submitAnswers(item.token, answers)
  if (!updated) return { ok: false, reason: 'save failed' }
  if (missing.length) assessmentStore.markIncomplete(item.token, missing)
  return { ok: true, assessment: updated, missing }
}

// Holt alle vorliegenden Antworten ab. `items` kann auch aus einer Datei kommen (Import).
async function pollOnce({ assessmentStore, auditStore, items, by = 'system' } = {}) {
  const result = { imported: 0, skipped: 0, errors: [], at: new Date().toISOString() }
  let list = items
  if (!list) {
    const r = await call('GET', '/api/answers')
    if (r.status !== 200) throw new Error(`Portal answered with status ${r.status}`)
    list = (r.json && r.json.answers) || []
  }
  for (const item of list) {
    try {
      if (!item || typeof item.token !== 'string' || !/^[0-9a-f]{48}$/.test(item.token)) { result.skipped++; continue }
      const plain = decryptEnvelope(item.token, item.envelope)
      const r = applyAnswer(assessmentStore, item, plain)
      if (r.ok) {
        result.imported++
        await auditStore.append({ user: by, action: 'portal-import', resource: 'assessment', detail: r.assessment.supplierName + (r.missing.length ? ' (incomplete)' : '') })
      } else if (!r.drop) { result.skipped++; result.errors.push(`${item.token.slice(0, 8)}: ${r.reason}`); continue }
      if (!items) await call('DELETE', `/api/q/${item.token}`)               // erst nach erfolgreicher Übernahme im Briefkasten löschen
    } catch (e) {
      result.skipped++; result.errors.push(`${String(item && item.token || '').slice(0, 8)}: ${e.message}`)
    }
  }
  if (!items) {
    const c = readConfig(); c.lastPollAt = result.at; c.lastPollResult = { imported: result.imported, skipped: result.skipped, errors: result.errors.slice(0, 5) }; writeConfig(c)
  }
  return result
}

let _timer = null
function startPolling(everyMs = 5 * 60 * 1000) {
  if (_timer) return
  _timer = setInterval(async () => {
    try {
      const c = readConfig()
      if (c.enabled !== true) return
      await pollOnce({ assessmentStore: require('./db/assessmentStore'), auditStore: require('./db/auditStore') })
    } catch (e) { console.error('[supplier-portal] Abholen fehlgeschlagen:', e.message) }
  }, everyMs)
  _timer.unref()
}

module.exports = { readConfig, publicConfig, saveConfig, hasKey, generateKey, publicJwk, decryptEnvelope, publish, testConnection, pollOnce, applyAnswer, startPolling, normalizeUrl }
