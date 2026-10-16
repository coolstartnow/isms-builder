// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
/**
 * mailer.js – Nodemailer wrapper
 *
 * SMTP-Konfiguration wird in zwei Stufen geladen (höhere Stufe hat Vorrang):
 *   1. Umgebungsvariablen: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   2. Admin-UI: org-settings.json → smtpSettings (wird bei jedem Senden neu gelesen)
 *
 * Sind weder Umgebungsvariablen noch UI-Einstellungen gesetzt, sind alle
 * Operationen stille No-Ops (kein Fehler, Tests unberührt).
 */

const nodemailer = require('nodemailer')
const i18n = require('./i18n')

/**
 * Liest die aktuelle SMTP-Konfiguration.
 * Umgebungsvariablen haben immer Vorrang vor UI-Einstellungen.
 * @returns {{ host, port, secure, user, pass, from } | null}
 */
async function getSmtpConfig() {
  // Stufe 1: Umgebungsvariablen
  if (process.env.SMTP_HOST) {
    return {
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user:   process.env.SMTP_USER   || '',
      pass:   process.env.SMTP_PASS   || '',
      from:   process.env.SMTP_FROM   || 'ISMS Builder <no-reply@isms.local>',
    }
  }

  // Stufe 2: org-settings (Admin-UI, wird dynamisch geladen)
  try {
    const orgSettings = require('./db/orgSettingsStore')
    const s = (await orgSettings.get()).smtpSettings || {}
    if (s.host) {
      return {
        host:   s.host,
        port:   Number(s.port) || 587,
        secure: Boolean(s.secure),
        user:   s.user || '',
        pass:   s.pass || '',
        from:   s.from || 'ISMS Builder <no-reply@isms.local>',
      }
    }
  } catch { /* org-settings nicht verfügbar (z.B. Tests) */ }

  return null
}

/**
 * Erstellt einen frischen Nodemailer-Transport basierend auf aktueller Konfig.
 * Kein Caching, damit Änderungen via Admin-UI sofort wirksam sind.
 */
function createTransport(cfg) {
  return nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  })
}

/**
 * Sendet eine HTML-E-Mail.
 * @param {string} to      – Empfänger
 * @param {string} subject – Betreff
 * @param {string} html    – HTML-Body
 * @returns {Promise<boolean>} true = gesendet, false = übersprungen
 */
async function sendMail(to, subject, html) {
  const cfg = await getSmtpConfig()
  if (!cfg || !to) return false

  try {
    const transport = createTransport(cfg)
    await transport.sendMail({ from: cfg.from, to, subject, html })
    console.log(`[mailer] Gesendet: "${subject}" → ${to}`)
    return true
  } catch (err) {
    console.error(`[mailer] Fehler: "${subject}" → ${to}: ${err.message}`)
    return false
  }
}

/**
 * Sendet eine Test-Mail an die angegebene Adresse.
 * Gibt bei Erfolg true zurück, bei Fehler wirft sie.
 */
async function sendTestMail(to, lang) {
  lang = i18n.pickLang(lang) || await i18n.orgLang()
  const cfg = await getSmtpConfig()
  if (!cfg) throw new Error('SMTP nicht konfiguriert')

  const transport = createTransport(cfg)
  await transport.sendMail({
    from:    cfg.from,
    to,
    subject: i18n.tr(lang, 'srv_smtp_subject'),
    html:    `<p>${i18n.tr(lang, 'srv_smtp_body')}</p>
              <p style="color:#666;font-size:12px">${i18n.tr(lang, 'srv_smtp_sent', { date: i18n.fmtDateTime(new Date(), lang) })}</p>`,
  })
  return true
}

/** Gibt true zurück wenn SMTP konfiguriert ist (env oder org-settings) */
async function isConfigured() {
  return Boolean(await getSmtpConfig())
}

module.exports = { sendMail, sendTestMail, isConfigured, getSmtpConfig }
