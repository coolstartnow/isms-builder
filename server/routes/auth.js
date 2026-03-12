// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { requireAuth, authorize, signToken, getSessionFromReq } = require('../auth')

const DATA_DIR       = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FLAG_FILE      = path.join(DATA_DIR, '.demo_reset_done')
const DEMO_LANG_FILE = path.join(DATA_DIR, '.demo_lang_set')

// ── Demo-Reset-Status (öffentlich, kein Login erforderlich) ──
router.get('/auth/demo-reset-done', (req, res) => {
  res.json({ active: fs.existsSync(FLAG_FILE) })
})

// ── Sprach-Konfiguration (öffentlich — wird von Login-Seite benötigt) ──
router.get('/auth/language-config', (req, res) => {
  try {
    const orgSettings = require('../db/orgSettingsStore').get()
    const cfg = orgSettings.languageConfig || {}
    res.json({
      available: Array.isArray(cfg.available) && cfg.available.length ? cfg.available : ['de', 'en', 'fr', 'nl'],
      default:   cfg.default || 'en',
    })
  } catch {
    res.json({ available: ['de', 'en', 'fr', 'nl'], default: 'en' })
  }
})

// ── Demo-Sprache nötig? (öffentlich) ──
router.get('/auth/demo-lang-needed', (req, res) => {
  res.json({ needed: !fs.existsSync(DEMO_LANG_FILE) })
})

// Login
router.post('/login', async (req, res) => {
  const { email, username: usernameField, password, totp } = req.body || {}
  const rbac = require('../rbacStore')

  let userRaw = null
  if (email) {
    const uname = rbac.getUsernameByEmail(email)
    if (uname) userRaw = rbac.getUserByUsername(uname)
  } else if (usernameField) {
    userRaw = rbac.getUserByUsername(usernameField)
  }
  if (!userRaw) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const passwordOk = await rbac.verifyPassword(userRaw.username, password || '')
  if (!passwordOk) {
    return res.status(401).json({ error: 'Invalid credentials' })
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
        return res.status(401).json({ error: 'Ungültiger 2FA-Code', twoFactorRequired: true })
      }
    } catch (e) {
      return res.status(500).json({ error: '2FA-Verifizierung fehlgeschlagen' })
    }
  } else {
    const orgCfg = require('../db/orgSettingsStore').get()
    if (orgCfg.require2FA) {
      return res.status(403).json({
        error: '2FA ist für alle Benutzer verpflichtend. Bitte kontaktiere den Administrator, um 2FA für deinen Account einzurichten.',
        code: 'ENFORCE_2FA',
      })
    }
  }

  const functions = userRaw.functions || []
  const token = signToken({ username: userRaw.username, role: userRaw.role, domain: userRaw.domain, functions })
  res.cookie('sm_session', token, { httpOnly: true, sameSite: 'strict', path: '/' })

  // Nach Admin-Login: Demo-Reset-Flag löschen (Banner auf Login-Seite ausblenden)
  if (userRaw.role === 'admin' && fs.existsSync(FLAG_FILE)) {
    try { fs.unlinkSync(FLAG_FILE) } catch {}
  }

  // Admin-Erstlogin: Demo-Sprache noch nicht gewählt?
  const needsDemoLang = userRaw.role === 'admin' && !fs.existsSync(DEMO_LANG_FILE)

  return res.json({ username: userRaw.username, role: userRaw.role, domain: userRaw.domain, functions, has2FA, needsDemoLang })
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
  res.json({ ...sess, functions, has2FA })
})

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('sm_session')
  res.json({ ok: true })
})

// ── Eigenes Passwort ändern ──
router.put('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich (min. 6 Zeichen).' })
  }
  const rbac = require('../rbacStore')
  const ok = await rbac.verifyPassword(req.user, currentPassword)
  if (!ok) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' })
  await rbac.setPasswordHash(req.user, newPassword)
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
