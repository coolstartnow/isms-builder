// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// RBAC auth für ISMS Build Mode
// Session: JWT-Cookie (sm_session), nicht mehr Base64
// Header-Auth (X-User-Name / X-User-Role) nur wenn DEV_HEADER_AUTH=true

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const DEV_HEADER_AUTH = process.env.DEV_HEADER_AUTH === 'true'

// Unsicheres Secret: in Produktion Abbruch, sonst Warnung (GHSA-vwc3-4j58-wrxc)
require('./secretCheck').enforce({ secret: JWT_SECRET })

const ROLE_RANK = {
  reader:       1,  // Lesezugriff auf alle Module
  revision:     1,  // Interne Revision – read-only, weisungsungebunden (gleicher Rang wie reader, eigene Rollensemantik)
  editor:       2,  // Erstellt und bearbeitet Templates, SoA, Training, Ziele
  dept_head:    2,  // Abteilungsleiter – gleicher Rang wie editor
  qmb:          2,  // Qualitätsmanagementbeauftragter – gleicher Rang wie editor (QM-Templates, Training)
  contentowner: 3,  // CISO/ISB + DSB – genehmigt Templates, verwaltet GDPR, Risiken, Einstellungen
  auditor:      3,  // ICS/OT-Sicherheit, Risk-Auditor – verwaltet Risikoregister und Behandlungen
  admin:        4   // Systemadministrator – alle Aktionen inkl. Benutzerverwaltung und Löschen
}

function normalizeRole(r) {
  if (!r) return 'reader'
  return r.toLowerCase().trim()
}

// JWT-Token ausstellen
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// JWT-Token aus Cookie lesen und verifizieren
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

function getSessionFromReq(req) {
  // Header-Auth: NUR in Entwicklung erlaubt
  if (DEV_HEADER_AUTH && req.headers['x-user-name'] && req.headers['x-user-role']) {
    const role = normalizeRole(req.headers['x-user-role'])
    const domain = req.headers['x-user-domain'] || 'Global'
    return { username: req.headers['x-user-name'], role, domain, roleRank: ROLE_RANK[role] || 0, functions: [] }
  }

  // JWT aus Cookie
  const cookie = req.headers['cookie'] || ''
  const match = cookie.match(/sm_session=([^;]+)(;|$)/)
  if (match) {
    const payload = verifyToken(match[1])
    if (payload) {
      const role = normalizeRole(payload.role)
      return {
        username: payload.username,
        role,
        domain: payload.domain || 'Global',
        roleRank: ROLE_RANK[role] || 0,
        functions: Array.isArray(payload.functions) ? payload.functions : []
      }
    }
  }

  return null
}

// Solange ein Nutzer ein vom Administrator vergebenes Passwort noch ändern muss, sind nur das Ändern des Passworts und das Abmelden erlaubt
// (der Administrator kennt das Anfangs-/Rücksetz-Passwort; die Sperre gilt serverseitig für jede Schnittstelle).
const PASSWORD_CHANGE_ALLOWED = (req) => (req.method === 'PUT' && req.path === '/me/password') || req.path === '/logout'

function requireAuth(req, res, next) {
  const sess = getSessionFromReq(req)
  if (!sess) return res.status(401).json({ error: 'Not authenticated' })
  if (require('./rbacStore').isPasswordChangeRequired(sess.username) && !PASSWORD_CHANGE_ALLOWED(req)) {
    return res.status(403).json({ error: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' })
  }
  req.user = sess.username
  req.role = sess.role
  req.domain = sess.domain
  req.roleRank = sess.roleRank
  req.functions = sess.functions || []
  next()
}

function authorize(minRole) {
  const minRank = ROLE_RANK[minRole.toLowerCase()] || 0
  return (req, res, next) => {
    if (req.roleRank >= minRank) return next()
    res.status(403).json({ error: 'Forbidden: insufficient permissions' })
  }
}

module.exports = { getSessionFromReq, requireAuth, authorize, signToken, ROLE_RANK, normalizeRole }
