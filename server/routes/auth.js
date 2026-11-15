// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { requireAuth, authorize, signToken, getSessionFromReq } = require('../auth')
const loginThrottle = require('../loginThrottle')
const productionState = require('../productionState')
const sessionStore = require('../sessionStore')

const DATA_DIR       = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FLAG_FILE      = path.join(DATA_DIR, '.demo_reset_done')
const DEMO_LANG_FILE = path.join(DATA_DIR, '.demo_lang_set')

// ── Demo-Reset-Status (öffentlich, kein Login erforderlich) ──
router.get('/auth/demo-reset-done', (req, res) => {
  const active = fs.existsSync(FLAG_FILE)
  if (!active) return res.json({ active })
  // Das Banner nennt die Anmeldekennung des Admins. Der Reset setzt nur das Passwort zurück, nicht die E-Mail –
  // eine geänderte Adresse würde sonst falsch angezeigt (#98). Nur bei aktivem Flag, wie die Standard-Zugangsdaten selbst.
  let admin = 'admin@example.com'
  try { const u = require('../rbacStore').getUserByUsername('admin'); if (u && u.email) admin = u.email } catch { /* Standardwert */ }
  res.json({ active, admin, logoRequired: require('../orgLogo').info().required })
})

// ── Sicherheitshinweis (öffentlich, ohne Kontonamen): trägt ein Konto im Produktivbetrieb noch ein Demo-Passwort? ──
router.get('/auth/security-notice', async (req, res) => {
  try { res.json({ seedPasswords: (await productionState.seedPasswordAccounts()).length > 0 }) } catch { res.json({ seedPasswords: false }) }
})

// ── Sprach-Konfiguration (öffentlich — wird von Login-Seite benötigt) ──
router.get('/auth/language-config', async (req, res) => {
  try {
    const orgSettings = await require('../db/orgSettingsStore').get()   // await: unter den SQL-Speichern ein Promise
    const cfg = orgSettings.languageConfig || {}
    res.json({
      available: Array.isArray(cfg.available) && cfg.available.length ? cfg.available : require('../languages').listedCodes(),
      default:   cfg.default || 'en',
    })
  } catch {
    res.json({ available: require('../languages').listedCodes(), default: 'en' })
  }
})

// ── Demo-Sprache nötig? (öffentlich) ──
router.get('/auth/demo-lang-needed', (req, res) => {
  res.json({ needed: !fs.existsSync(DEMO_LANG_FILE) })
})

// Login
router.post('/login', async (req, res) => {
  const { email, username: usernameField, password, totp } = req.body || {}
  // Nur Texte sind gültig (Zahl, Objekt oder Liste als Benutzername/Passwort ließ früher den Serverprozess abstürzen)
  for (const v of [email, usernameField, password]) if (v !== undefined && v !== null && typeof v !== 'string') return res.status(400).json({ error: 'Invalid request.' })
  if (totp !== undefined && totp !== null && typeof totp !== 'string' && typeof totp !== 'number') return res.status(400).json({ error: 'Invalid request.' })
  const rbac = require('../rbacStore')

  // Brute-Force-Schutz: Zaehler pro Kombination aus eingegebenem Identifier
  // (E-Mail/Benutzername, wie eingetippt) + Quell-IP. Bewusst VOR jedem
  // Datenbankzugriff geprueft, damit auch ein Angriff gegen unbekannte
  // Benutzernamen ausgebremst wird.
  const throttleId = (email || usernameField || '').toLowerCase()
  const requiredDelay = loginThrottle.getRequiredDelayMs(throttleId, req.ip)
  if (requiredDelay > 0) {
    res.set('Retry-After', String(Math.ceil(requiredDelay / 1000)))
    return res.status(429).json({
      error: 'Zu viele Fehlversuche. Bitte kurz warten und erneut versuchen.',
      retryAfterMs: requiredDelay,
    })
  }

  let userRaw = null
  if (email) {
    const uname = rbac.getUsernameByEmail(email)
    if (uname) userRaw = rbac.getUserByUsername(uname)
  } else if (usernameField) {
    userRaw = rbac.getUserByUsername(usernameField)
  }
  if (!userRaw) {
    // gleicher Aufwand wie bei einem bekannten Benutzer (kein Timing-Unterschied, GHSA-8w4w-fqgh-c4fq)
    await rbac.verifyPassword('', password || '')
    loginThrottle.recordFailure(throttleId, req.ip)
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const passwordOk = await rbac.verifyPassword(userRaw.username, password || '')
  if (!passwordOk) {
    loginThrottle.recordFailure(throttleId, req.ip)
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Seed-Passwörter (adminpass …) gelten nur in der Demo. Im Produktivbetrieb nur zur Übergabe direkt nach dem Wechsel
  // (Konto mit mustChangePassword → Passwort muss sofort geändert werden); sonst abgelehnt.
  if (productionState.isSeedPassword(password) && productionState.isProduction(rbac) && userRaw.mustChangePassword !== true) {
    console.warn(`[security] Anmeldung von „${userRaw.username}“ mit einem Demo-Passwort im Produktivbetrieb abgelehnt. Neues Passwort: node scripts/set-password.js ${userRaw.username}`)
    loginThrottle.recordFailure(throttleId, req.ip)
    // Deutliche Rückmeldung: Wer das Demo-Passwort eintippt, kennt es ohnehin (öffentlich dokumentiert) — die Meldung verrät nichts Neues
    return res.status(401).json({ error: 'Demo password blocked in production', code: 'SEED_PASSWORD_BLOCKED' })
  }

  const secret = userRaw.totpSecret || ''
  const has2FA = secret.length > 0 && userRaw.totpVerified === true
  if (has2FA) {
    if (!totp) {
      return res.status(401).json({ error: '2FA required', twoFactorRequired: true, domain: userRaw.domain, username: userRaw.username })
    }
    try {
      let valid
      if (process.env.ISMS_TEST_TOTP_FIXED === '1') {
        valid = String(totp) === '123456'
      } else {
        const { verifyTotp } = require('../totp')
        valid = verifyTotp(secret, totp)
      }
      if (!valid) {
        loginThrottle.recordFailure(throttleId, req.ip)
        return res.status(401).json({ error: 'Ungültiger 2FA-Code', twoFactorRequired: true })
      }
    } catch (e) {
      return res.status(500).json({ error: '2FA-Verifizierung fehlgeschlagen' })
    }
  } else {
    // await: unter SQLite/MariaDB/PostgreSQL liefert get() ein Promise — ohne await wurde die 2FA-Pflicht dort nie durchgesetzt
    const orgCfg = await require('../db/orgSettingsStore').get()
    if (orgCfg.require2FA) {
      return res.status(403).json({
        error: '2FA ist für alle Benutzer verpflichtend. Bitte kontaktiere den Administrator, um 2FA für deinen Account einzurichten.',
        code: 'ENFORCE_2FA',
      })
    }
  }

  loginThrottle.recordSuccess(throttleId, req.ip)

  const functions = userRaw.functions || []
  const token = signToken({ username: userRaw.username, role: userRaw.role, domain: userRaw.domain, functions })
  res.cookie('sm_session', token, { httpOnly: true, sameSite: 'strict', path: '/', secure: req.secure })

  // Nach Admin-Login: Demo-Reset-Flag löschen (Banner auf Login-Seite ausblenden)
  if (userRaw.role === 'admin' && fs.existsSync(FLAG_FILE)) {
    try { fs.unlinkSync(FLAG_FILE) } catch {}
  }

  // Admin-Erstlogin: Demo-Sprache noch nicht gewählt?
  const needsDemoLang = userRaw.role === 'admin' && !fs.existsSync(DEMO_LANG_FILE)

  return res.json({ username: userRaw.username, role: userRaw.role, domain: userRaw.domain, functions, has2FA, needsDemoLang, mustChangePassword: rbac.isPasswordChangeRequired(userRaw.username) })
})

// Who am I
router.get('/whoami', (req, res) => {
  const sess = getSessionFromReq(req)
  if (!sess) return res.status(401).json({ error: 'Not authenticated' })
  const rbac = require('../rbacStore')
  const user = rbac.getUserByUsername(sess.username)
  const has2FA = !!(user && user.totpSecret && user.totpSecret.length > 0 && user.totpVerified === true)
  // functions: JWT-Payload ist Source of Truth; falls user-Record neuere Funktionen hat, diese vorziehen
  const functions = (user && user.functions) ? user.functions : (sess.functions || [])
  res.json({ ...sess, functions, has2FA, mustChangePassword: rbac.isPasswordChangeRequired(sess.username) })
})

// Beendet die Sitzung des mitgeschickten Tokens serverseitig (ein kopiertes Token ist danach wertlos).
function endSession(req) {
  try { const s = getSessionFromReq(req); if (s && s.jti) sessionStore.revoke(s.jti) } catch { /* Abmelden gelingt immer */ }
}

// Logout — GET (Legacy) und POST (UI seit app.js fetch-Aufruf)
// Die UI ruft fetch('/logout', { method: 'POST' }) auf. GET bleibt für Direktaufrufe.
router.get('/logout', (req, res) => {
  endSession(req)
  res.clearCookie('sm_session')
  res.json({ ok: true })
})
router.post('/logout', (req, res) => {
  endSession(req)
  res.clearCookie('sm_session')
  res.json({ ok: true })
})

// ── Eigenes Passwort ändern ──
router.put('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich (min. 8 Zeichen).' })
  }
  if (productionState.isSeedPassword(newPassword) && productionState.isProduction()) {
    return res.status(400).json({ error: 'Dieses Passwort ist ein bekanntes Demo-Passwort und im Produktivbetrieb nicht erlaubt.', code: 'PASSWORD_KNOWN_DEMO' })
  }
  const rbac = require('../rbacStore')
  const ok = await rbac.verifyPassword(req.user, currentPassword)
  if (!ok) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' })
  // Ein vom Administrator vergebenes Passwort muss durch ein anderes ersetzt werden
  if (rbac.isPasswordChangeRequired(req.user) && newPassword === currentPassword) {
    return res.status(400).json({ error: 'Das neue Passwort muss sich vom bisherigen unterscheiden.', code: 'PASSWORD_UNCHANGED' })
  }
  await rbac.setPasswordHash(req.user, newPassword, { keepJti: req.jti })   // hebt die Pflicht zum Wechsel auf; andere Sitzungen des Kontos enden
  res.json({ ok: true })
})

// ── 2FA-Endpoints ──
try {
  const twofaSetup = require('../2faSetup')
  const { verifyTotp } = require('../totp')

  router.get('/2fa/setup', requireAuth, async (req, res) => {
    const username = req.query.username || req.user
    if (username !== req.user && req.roleRank < 4) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const prov = await twofaSetup.setupForUser(username)
    if (!prov) return res.status(404).json({ error: 'User not found' })
    res.json(prov)
  })

  router.post('/2fa/verify', requireAuth, async (req, res) => {
    const { token } = req.body || {}
    const rbac = require('../rbacStore')
    const user = rbac.getUserByUsername(req.user)
    if (!user || !user.totpSecret) {
      return res.status(400).json({ error: 'Kein 2FA-Secret gefunden. Bitte zuerst /2fa/setup aufrufen.' })
    }
    if (!verifyTotp(user.totpSecret, token)) {
      return res.status(401).json({ error: 'Ungültiger Code' })
    }
    rbac.confirmTotpVerified(req.user)
    res.json({ ok: true, message: '2FA erfolgreich aktiviert' })
  })

  router.delete('/2fa', requireAuth, async (req, res) => {
    const username = req.query.username || req.user
    if (username !== req.user && req.roleRank < 4) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const ok = await twofaSetup.disableForUser(username)
    if (!ok) return res.status(404).json({ error: 'User not found' })
    res.json({ ok: true, message: '2FA deaktiviert' })
  })
} catch (e) {
  console.warn('2FA-Modul nicht verfügbar:', e.message)
}

module.exports = router
