// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
/**
 * art23Watcher.js – Fristenwächter für NIS2 Art. 23
 *
 * Prüft im 15-Minuten-Takt, ob für einen gemeldeten Sicherheitsvorfall eine
 * Meldefrist bevorsteht oder überschritten ist, und verschickt einmalig eine
 * Warnung je Vorfall und Phase.
 *
 *   Frühwarnung      24 h ab Kenntnisnahme   — Warnung ab 4 h vorher
 *   Meldung          72 h ab Kenntnisnahme   — Warnung ab 12 h vorher
 *   Abschlussbericht 1 Monat nach Meldung    — Warnung ab 72 h vorher
 *
 * Empfänger sind die Träger der CISO-Funktion, ersatzweise die Eskalations-
 * bzw. Admin-Adresse aus den Organisationseinstellungen.
 *
 * Ohne SMTP-Konfiguration läuft der Wächter nicht — die Fristen bleiben in der
 * Oberfläche trotzdem sichtbar, sie werden nur nicht aktiv zugestellt.
 */
'use strict'

const { sendMail, isConfigured } = require('./mailer')
const art23        = require('./db/art23')
const orgSettings  = require('./db/orgSettingsStore')
const rbacStore    = require('./rbacStore')
const i18n = require('./i18n')

const INTERVAL_MS = 15 * 60 * 1000
const FIRST_RUN_DELAY_MS = 90_000   // nach dem Start kurz warten, wie beim Notifier

async function recipients() {
  const settings = await orgSettings.get()
  try {
    const emails = rbacStore.getUsersByFunction('ciso').map(u => u.email).filter(Boolean)
    if (emails.length) return [...new Set(emails)]
  } catch {}
  const fallback = settings.cisoSettings?.escalationEmail
    || settings.emailNotifications?.adminEmail
    || ''
  return fallback ? [fallback] : []
}

function buildMail(incident, phases, orgName, lang = 'en') {
  const T    = (key, params) => i18n.tr(lang, key, params)
  const ref  = incident.refNumber || incident.id
  const worst = phases.some(p => p.state === 'overdue') ? T('srv_a23_stateOver') : T('srv_a23_stateSoon')
  const PHASE_KEYS = { earlyWarning: 'srv_a23_phaseEarly', notification: 'srv_a23_phaseNotification', finalReport: 'srv_a23_phaseFinal' }

  const rows = phases.map(p => {
    const when = p.deadline ? i18n.fmtDateTime(p.deadline, lang) : '—'
    const left = p.minutesLeft === null ? ''
      : p.minutesLeft < 0
        ? ` ${T('srv_a23_over', { h: Math.abs(Math.round(p.minutesLeft / 60)) })}`
        : ` ${T('srv_a23_left', { h: Math.round(p.minutesLeft / 60) })}`
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #ddd">${PHASE_KEYS[p.phase] ? T(PHASE_KEYS[p.phase]) : p.label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #ddd">${when}${left}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #ddd">${p.state === 'overdue' ? T('srv_a23_exceeded') : T('srv_a23_dueSoon')}</td>
    </tr>`
  }).join('')

  const html = `
    <p><strong>${T('srv_a23_title', { state: worst })}</strong></p>
    <p>${T('srv_a23_incident', { ref })}${incident.entityName ? ` (${incident.entityName})` : ''}</p>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <thead><tr>
        <th align="left" style="padding:6px 10px;border-bottom:2px solid #999">${T('srv_a23_colPhase')}</th>
        <th align="left" style="padding:6px 10px;border-bottom:2px solid #999">${T('srv_a23_colDeadline')}</th>
        <th align="left" style="padding:6px 10px;border-bottom:2px solid #999">${T('col_status')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#666;font-size:12px">${T('srv_a23_auto', { org: orgName })}</p>`

  return { subject: T('srv_a23_subject', { state: worst, ref }), html }
}

/**
 * Ein Prüflauf. Exportiert, damit er im Test direkt aufgerufen werden kann.
 * @returns Anzahl der Vorfälle, für die eine Warnung verschickt wurde
 */
async function runCheck({ now = new Date(), send = sendMail } = {}) {
  const incidentStore = require('./db/publicIncidentStore')

  const all     = await incidentStore.getAll({})
  const pending = art23.pendingAlerts(all, now)
  if (!pending.length) return 0

  const to      = await recipients()
  const orgName = (await orgSettings.get()).orgName || 'ISMS Builder'
  const lang    = await i18n.orgLang()
  let notified  = 0

  for (const { incident, phases } of pending) {
    const { subject, html } = buildMail(incident, phases, orgName, lang)

    let delivered = false
    for (const address of to) {
      try {
        await send(address, subject, html)
        delivered = true
      } catch (e) {
        console.error('[art23] Versand fehlgeschlagen:', e.message)
      }
    }
    // Nur protokollieren, wenn tatsächlich zugestellt wurde — sonst wird beim
    // nächsten Lauf erneut versucht, statt die Warnung stillschweigend zu verlieren.
    if (!delivered) continue

    let patch = null
    for (const phase of phases) {
      const base = patch ? { ...incident, ...patch } : incident
      patch = art23.recordAlert(base, phase.phase, 'email', to[0], now)
    }
    await incidentStore.update(incident.id, patch, 'system')
    notified++
  }

  return notified
}

async function start() {
  if (!(await isConfigured())) {
    console.log('[art23] SMTP nicht konfiguriert — Fristenwarnungen deaktiviert')
    return
  }
  console.log('[art23] Fristenwächter gestartet (alle 15 Minuten)')

  const tick = () => runCheck().catch(e => console.error('[art23] Fehler:', e.message))
  setTimeout(() => { tick(); setInterval(tick, INTERVAL_MS) }, FIRST_RUN_DELAY_MS)
}

module.exports = { start, runCheck, buildMail }
