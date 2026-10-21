// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// Simple JSON-file based store for per-user section permissions (RBAC admin)
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const DB_ROOT = process.env.DATA_DIR || path.join(__dirname, '../data')
const DB_FILE = path.join(DB_ROOT, 'rbac_users.json')

const BCRYPT_ROUNDS = 12

function ensureDir() {
  if (!fs.existsSync(DB_ROOT)) fs.mkdirSync(DB_ROOT, { recursive: true })
}

function createSeed() {
  // Default-Passwörter werden gehasht gespeichert.
  // WICHTIG: Diese Passwörter müssen nach dem ersten Start geändert werden!
  return {
    admin: {
      username: 'admin',
      email: 'admin@example.com',
      domain: 'Global',
      role: 'admin',
      functions: ['ciso', 'dso'],
      passwordHash: bcrypt.hashSync('adminpass', BCRYPT_ROUNDS),
      totpSecret: '',
      sections: ['Guidance','Risk','Admin','Legal','Incident','Privacy','Training','Reports','Settings']
    },
    alice: {
      username: 'alice',
      email: 'alice@it.example',
      domain: 'IT',
      role: 'dept_head',
      functions: [],
      passwordHash: bcrypt.hashSync('alicepass', BCRYPT_ROUNDS),
      totpSecret: '',
      sections: ['Guidance','Risk']
    },
    bob: {
      username: 'bob',
      email: 'bob@hr.example',
      domain: 'HR',
      role: 'reader',
      functions: [],
      passwordHash: bcrypt.hashSync('bobpass', BCRYPT_ROUNDS),
      totpSecret: '',
      sections: []
    }
  }
}

function loadUsers() {
  ensureDir()
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeed()
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2))
    return seed
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  try { return JSON.parse(raw) } catch { return {} }
}

function saveUsers(data) {
  ensureDir()
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

let USERS = loadUsers()

// Passwort eines Benutzers prüfen (async, bcrypt)
// Platzhalter-Hash gleichen Aufwands: Auch für unbekannte Benutzer wird ein bcrypt-Vergleich ausgeführt, damit die Antwortzeit
// nicht verrät, ob ein Konto existiert (Benutzer-Aufzählung per Timing, GHSA-8w4w-fqgh-c4fq). Erst bei Bedarf berechnet.
let _dummyHash = null
const dummyHash = () => _dummyHash || (_dummyHash = bcrypt.hashSync(require('crypto').randomBytes(16).toString('hex'), BCRYPT_ROUNDS))

async function verifyPassword(username, plaintext) {
  const u = Object.prototype.hasOwnProperty.call(USERS, username) ? USERS[username] : null
  if (!u || !u.passwordHash) {
    await bcrypt.compare(String(plaintext == null ? '' : plaintext), dummyHash())
    return false
  }
  return bcrypt.compare(plaintext, u.passwordHash)
}

// Passwort-Hash setzen (z.B. nach Passwortänderung)
// mustChange: Der Administrator kennt dieses Passwort (Anfangs-/Rücksetz-Passwort) → der Nutzer muss es beim nächsten Login ändern.
// Setzt der Nutzer sein Passwort selbst, entfällt die Pflicht.
async function setPasswordHash(username, plaintext, { mustChange = false } = {}) {
  const hash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS)
  if (!USERS[username]) return false
  USERS[username].passwordHash = hash
  if (mustChange) USERS[username].mustChangePassword = true; else delete USERS[username].mustChangePassword
  saveUsers(USERS)
  return true
}

// true, solange der Nutzer ein vom Administrator vergebenes Passwort noch ändern muss
function isPasswordChangeRequired(username) {
  return Object.prototype.hasOwnProperty.call(USERS, username) && USERS[username].mustChangePassword === true
}

function getUserSections(username) {
  return (USERS[username] && USERS[username].sections) || []
}

function setUserSections(username, sections) {
  const u = USERS[username] || { username, domain: 'Global', role: 'reader' }
  const updated = { ...u, username, sections }
  USERS[username] = updated
  saveUsers(USERS)
  return { username, sections, domain: updated.domain, role: updated.role }
}

function getAllUsers() {
  // passwordHash wird NICHT nach außen gegeben
  return Object.values(USERS).map(u => ({
    username: u.username,
    email: u.email,
    sections: u.sections || [],
    domain: u.domain,
    role: u.role,
    functions: u.functions || [],
    mustChangePassword: u.mustChangePassword === true
  }))
}

function getUserByUsername(username) {
  return USERS[username] || null
}

function getUsernameByEmail(email) {
  if (!email) return null
  const found = Object.values(USERS).find(
    u => (u.email || '').toLowerCase() === String(email).toLowerCase()
  )
  return found ? found.username : null
}

// Secret speichern (unverified) — wird von 2faSetup.js aufgerufen
function setUserTotpSecret(username, secret) {
  if (!USERS[username]) return null
  USERS[username].totpSecret = secret
  // Secret leeren → auch verified-Flag zurücksetzen
  if (!secret) USERS[username].totpVerified = false
  saveUsers(USERS)
  return { username, totpSecret: secret }
}

// 2FA als verifiziert markieren — erst nach erfolgreichem Code-Check
function confirmTotpVerified(username) {
  if (!USERS[username]) return false
  USERS[username].totpVerified = true
  saveUsers(USERS)
  return true
}

async function createUser({ username, email, domain, role, functions, password, mustChangePassword }) {
  if (USERS[username]) throw new Error('User already exists')
  const passwordHash = await bcrypt.hash(password || 'changeme', BCRYPT_ROUNDS)
  USERS[username] = {
    username, email: email || '', domain: domain || 'Global',
    role: role || 'reader', functions: Array.isArray(functions) ? functions : [],
    passwordHash, totpSecret: '', sections: [],
    ...(mustChangePassword === true ? { mustChangePassword: true } : {})
  }
  saveUsers(USERS)
  return getAllUsers().find(u => u.username === username)
}

async function updateUser(username, { email, domain, role, functions, password, mustChangePassword }) {
  const u = USERS[username]
  if (!u) return null
  if (email     !== undefined) u.email     = email
  if (domain    !== undefined) u.domain    = domain
  if (role      !== undefined) u.role      = role
  if (functions !== undefined) u.functions = Array.isArray(functions) ? functions : []
  if (password) {
    u.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    if (mustChangePassword === true) u.mustChangePassword = true; else delete u.mustChangePassword
  }
  saveUsers(USERS)
  return getAllUsers().find(uu => uu.username === username)
}

// Alle Benutzer mit einer bestimmten Funktion finden
function getUsersByFunction(fn) {
  return Object.values(USERS)
    .filter(u => Array.isArray(u.functions) && u.functions.includes(fn))
    .map(u => ({ username: u.username, email: u.email, role: u.role, functions: u.functions || [] }))
}

function deleteUser(username) {
  if (!USERS[username]) return false
  delete USERS[username]
  saveUsers(USERS)
  return true
}

module.exports = {
  init: () => { USERS = loadUsers() },
  verifyPassword,
  setPasswordHash,
  isPasswordChangeRequired,
  getUserSections,
  setUserSections,
  getAllUsers,
  getUserByUsername,
  getUsernameByEmail,
  getUsersByFunction,
  setUserTotpSecret,
  confirmTotpVerified,
  createUser,
  updateUser,
  deleteUser
}
