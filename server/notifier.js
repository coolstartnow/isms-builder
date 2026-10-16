// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
/**
 * notifier.js – Täglicher E-Mail-Benachrichtigungsdienst
 *
 * Sendet einmal täglich Digest-Mails an CISO, GDPO und Admin wenn:
 *   – Hohe/kritische Risiken offen sind          → cisoEmail
 *   – DSAR-Fristen in ≤ 3 Tagen ablaufen         → gdpoEmail
 *   – GDPR-Vorfälle > 48h offen sind              → gdpoEmail
 *   – BCM-Tests in ≤ 14 Tagen fällig sind         → cisoEmail
 *   – Verträge in ≤ 30 Tagen ablaufen             → adminEmail
 *   – Templates-Überprüfung in ≤ 14 Tagen fällig  → adminEmail
 *
 * Konfiguration: emailNotifications in org-settings.json
 * SMTP: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM in .env
 */

const { sendMail, isConfigured } = require('./mailer')
const i18n          = require('./i18n')
const orgSettings   = require('./db/orgSettingsStore')
const rbacStore     = require('./rbacStore')
const riskStore     = require('./db/riskStore')
const gdprStore     = require('./db/gdprStore')
const legalStore    = require('./db/legalStore')
const bcmStore      = require('./db/bcmStore')

let storage = null  // lazy-load to avoid circular deps at startup

function getStorage() {
  if (!storage) storage = require('./storage')
  return storage
}

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function daysFromNow(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((new Date(dateStr) - Date.now()) / 86400000)
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

// Sprache der Mails: Standardsprache der Organisation. `L` wird pro Lauf gesetzt (collectDigests).
let L = 'en'
const T = (key, params) => i18n.tr(L, key, params)

function fmt(dateStr) {
  return i18n.fmtDate(dateStr, L)
}

// ── HTML-Template ────────────────────────────────────────────────────────────

function buildDigest(orgName, sections) {
  const sectionHtml = sections.map(({ heading, items }) => `
    <h3 style="color:#de350b;margin:20px 0 8px">${heading}</h3>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tbody>
        ${items.map(row => `<tr>
          <td style="padding:6px 12px 6px 0;border-bottom:1px solid #eee;font-weight:600">${row.label}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;color:#666">${row.detail}</td>
        </tr>`).join('')}
      </tbody>
    </table>`).join('')

  return `<!DOCTYPE html>
<html lang="${L}">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:700px;margin:0 auto;padding:24px">
  <div style="background:#0052cc;padding:16px 24px;border-radius:6px 6px 0 0">
    <h2 style="color:#fff;margin:0">${T('srv_dg_title')}</h2>
    <p style="color:#bfdbfe;margin:4px 0 0">${orgName}</p>
  </div>
  <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px">
    ${sectionHtml}
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
    <p style="font-size:12px;color:#9ca3af">
      ${T('srv_dg_footer1')}<br>
      ${T('srv_dg_footer2')}
    </p>
  </div>
</body>
</html>`
}

// ── Einzelne Prüfungen ───────────────────────────────────────────────────────
// Die Stores sind je nach STORAGE_BACKEND synchron (JSON) oder asynchron (SQLite/PostgreSQL/MariaDB);
// deshalb überall `await`. Ohne das lieferte jede Prüfung auf SQL-Backends still nichts.

async function checkRisks(cfg) {
  if (!cfg.risks) return null
  try {
    const all = (await riskStore.getAll()).filter(r => !r.deletedAt)
    const critical = all.filter(r => r.status !== 'closed' && r.score >= 15)
    const high     = all.filter(r => r.status !== 'closed' && r.score >= 10 && r.score < 15)
    if (!critical.length && !high.length) return null

    const detail = (r, level) => T('srv_dg_riskDetail', { score: r.score, level, category: r.category || '–' })
    const items = [
      ...critical.slice(0, 10).map(r => ({ label: `⛔ ${r.title}`, detail: detail(r, T('srv_dg_levelCritical')) })),
      ...high.slice(0, 10).map(r => ({ label: `⚠️ ${r.title}`, detail: detail(r, T('srv_dg_levelHigh')) })),
    ]
    return { heading: T('srv_dg_risksHeading', { critical: critical.length, high: high.length }), items }
  } catch { return null }
}

async function checkDsar(cfg, gdpoSettings) {
  if (!cfg.dsar) return null
  try {
    const deadline = gdpoSettings.dsarDeadlineDays || 30
    const all = (await gdprStore.dsar.getAll({})).filter(r => !r.deletedAt && r.status !== 'closed' && r.status !== 'completed')
    const urgent = all.filter(r => (deadline - daysSince(r.createdAt)) <= 3)
    if (!urgent.length) return null

    return {
      heading: T('srv_dg_dsarHeading', { n: urgent.length }),
      items: urgent.slice(0, 10).map(r => ({
        label: r.title || r.subject || r.id,
        detail: T('srv_dg_dsarDetail', { date: fmt(r.createdAt), status: r.status })
      }))
    }
  } catch { return null }
}

async function checkGdprIncidents(cfg) {
  if (!cfg.gdprIncidents) return null
  try {
    const all = (await gdprStore.incidents.getAll({})).filter(r => !r.deletedAt)
    const overdue = all.filter(r => {
      const isOpen = r.status !== 'closed' && r.status !== 'notified'
      return isOpen && daysSince(r.createdAt) >= 2
    })
    if (!overdue.length) return null

    return {
      heading: T('srv_dg_incHeading', { n: overdue.length }),
      items: overdue.slice(0, 10).map(r => ({
        label: r.title || r.id,
        detail: T('srv_dg_incDetail', { days: daysSince(r.createdAt), status: r.status || '–' })
      }))
    }
  } catch { return null }
}

async function checkBcm(cfg) {
  if (!cfg.bcm) return null
  try {
    const plans = (await bcmStore.getPlans()).filter(r => r.nextTest)
    const due   = plans.filter(r => daysFromNow(r.nextTest) <= 14 && daysFromNow(r.nextTest) >= 0)
    if (!due.length) return null

    return {
      heading: T('srv_dg_bcmHeading', { n: due.length }),
      items: due.slice(0, 10).map(r => ({
        label: r.title,
        detail: T('srv_dg_bcmDetail', { date: fmt(r.nextTest), days: daysFromNow(r.nextTest), status: r.status || '–' })
      }))
    }
  } catch { return null }
}

async function checkContracts(cfg) {
  if (!cfg.contracts) return null
  try {
    const all = (await legalStore.contracts.getAll({})).filter(r => !r.deletedAt && r.endDate)
    const expiring = all.filter(r => daysFromNow(r.endDate) <= 30 && daysFromNow(r.endDate) >= 0)
    if (!expiring.length) return null

    return {
      heading: T('srv_dg_contractHeading', { n: expiring.length }),
      items: expiring.slice(0, 10).map(r => ({
        label: r.title,
        detail: T('srv_dg_contractDetail', { date: fmt(r.endDate), days: daysFromNow(r.endDate), party: r.counterparty || '–' })
      }))
    }
  } catch { return null }
}

async function checkTemplateReviews(cfg) {
  if (!cfg.templateReview) return null
  try {
    const s = getStorage()
    const all = ((await s.getTemplates?.({})) || []).filter(r => !r.deletedAt && r.nextReviewDate)
    const due = all.filter(r => daysFromNow(r.nextReviewDate) <= 14 && daysFromNow(r.nextReviewDate) >= 0)
    if (!due.length) return null

    return {
      heading: T('srv_dg_docHeading', { n: due.length }),
      items: due.slice(0, 10).map(r => ({
        label: r.title,
        detail: T('srv_dg_docDetail', { date: fmt(r.nextReviewDate), days: daysFromNow(r.nextReviewDate), status: r.status })
      }))
    }
  } catch { return null }
}

async function checkSupplierAudits(cfg) {
  if (!cfg.supplierAudits) return null
  try {
    const supplierStore = require('./db/supplierStore')
    const today   = new Date().toISOString().slice(0, 10)
    const upcoming = await supplierStore.getUpcomingAudits(14)
    const overdue  = (await supplierStore.getAll()).filter(s =>
      !s.deletedAt && s.nextAuditDate && s.nextAuditDate < today
    )
    if (!upcoming.length && !overdue.length) return null
    const items = [
      ...overdue.slice(0, 5).map(s => ({
        label:  `⛔ ${s.name}`,
        detail: T('srv_dg_supOverdue', { date: fmt(s.nextAuditDate), crit: s.criticality }),
      })),
      ...upcoming.slice(0, 5).map(s => ({
        label:  `⚠️ ${s.name}`,
        detail: T('srv_dg_supDue', { date: fmt(s.nextAuditDate), days: daysFromNow(s.nextAuditDate), crit: s.criticality }),
      })),
    ]
    return { heading: T('srv_dg_supHeading', { overdue: overdue.length, upcoming: upcoming.length }), items }
  } catch { return null }
}

async function checkDeletionLog(cfg) {
  if (!cfg.deletionLog) return null
  try {
    const overdue  = await gdprStore.deletionLog.getDue()          // Frist bereits abgelaufen
    const upcoming = await gdprStore.deletionLog.getUpcoming(90)   // fällig innerhalb 90 Tage

    if (!overdue.length && !upcoming.length) return null

    const items = [
      ...overdue.slice(0, 10).map(v => ({
        label:  `⛔ ${v.title || v.id}`,
        detail: T('srv_dg_delOverdue', { date: fmt(v.deletionDue), months: v.retentionMonths }),
      })),
      ...upcoming.slice(0, 10).map(v => ({
        label:  `⚠️ ${v.title || v.id}`,
        detail: T('srv_dg_delDue', { date: fmt(v.deletionDue), days: daysFromNow(v.deletionDue), months: v.retentionMonths }),
      })),
    ]

    return { heading: T('srv_dg_delHeading', { overdue: overdue.length, upcoming: upcoming.length }), items }
  } catch { return null }
}

// ── Empfänger-Ermittlung ──────────────────────────────────────────────────────

/**
 * Gibt deduplizierte E-Mail-Adressen aller Nutzer mit einer bestimmten Funktion zurück.
 * Fallback: Org-Setting-Adresse, falls kein Nutzer mit dieser Funktion gefunden wird.
 */
function getRecipients(fn, fallbackEmail) {
  try {
    const users = rbacStore.getUsersByFunction(fn)
    const emails = users.map(u => u.email).filter(Boolean)
    if (emails.length) return [...new Set(emails)]
  } catch {}
  return fallbackEmail ? [fallbackEmail] : []
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

/**
 * Stellt die zu versendenden Digest-Mails zusammen, ohne zu senden (testbar ohne SMTP).
 * @returns {Promise<Array<{to: string, subject: string, html: string}>>}
 */
async function collectDigests({ lang } = {}) {
  const settings = await orgSettings.get()
  const cfg      = settings.emailNotifications || {}
  if (!cfg.enabled) return []

  L = lang || await i18n.orgLang()

  const orgName      = settings.orgName || 'ISMS Builder'
  const gdpoSettings = settings.gdpoSettings || {}

  // Empfänger nach Funktion — mit Org-Setting als Fallback
  const cisoRecipients  = getRecipients('ciso',  settings.cisoSettings?.escalationEmail || '')
  const dsoRecipients   = getRecipients('dso',   '')
  const adminRecipients = getRecipients('admin_notify', cfg.adminEmail || '')

  // Admin-E-Mail immer als letzten Fallback für alle Digest-Typen hinzufügen
  if (cfg.adminEmail && !adminRecipients.includes(cfg.adminEmail)) adminRecipients.push(cfg.adminEmail)

  const today = i18n.fmtDate(new Date(), L)
  const mails = []

  // ── CISO-Digest (Risiken + BCM + Lieferanten) ────────────────────────────
  const cisoSections = (await Promise.all([checkRisks(cfg), checkBcm(cfg), checkSupplierAudits(cfg)])).filter(Boolean)
  if (cisoSections.length) {
    const html = buildDigest(orgName, cisoSections)
    for (const to of new Set(cisoRecipients)) mails.push({ to, subject: T('srv_dg_subjCiso', { date: today }), html })
  }

  // ── DSB/GDPO-Digest (DSAR + GDPR-Vorfälle + Löschprotokoll) ─────────────
  const dsoSections = (await Promise.all([checkDsar(cfg, gdpoSettings), checkGdprIncidents(cfg), checkDeletionLog(cfg)])).filter(Boolean)
  if (dsoSections.length) {
    const html = buildDigest(orgName, dsoSections)
    // Fallback auf CISO-Empfänger, wenn keine DSO-Funktion vergeben ist
    const to = dsoRecipients.length ? dsoRecipients : cisoRecipients
    for (const addr of to) mails.push({ to: addr, subject: T('srv_dg_subjDso', { date: today }), html })
  }

  // ── Admin-Digest (Verträge + Template-Reviews) ────────────────────────────
  const adminSections = (await Promise.all([checkContracts(cfg), checkTemplateReviews(cfg)])).filter(Boolean)
  if (adminSections.length) {
    const html = buildDigest(orgName, adminSections)
    for (const to of adminRecipients) mails.push({ to, subject: T('srv_dg_subjAdmin', { date: today }), html })
  }
  return mails
}

async function runDailyChecks() {
  if (!(await isConfigured())) return
  for (const m of await collectDigests()) await sendMail(m.to, m.subject, m.html)
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

const INTERVAL_MS = 24 * 60 * 60 * 1000   // 24 Stunden

async function start() {
  if (!(await isConfigured())) {
    console.log('[notifier] SMTP nicht konfiguriert — E-Mail-Benachrichtigungen deaktiviert')
    return
  }

  console.log('[notifier] E-Mail-Benachrichtigungsdienst gestartet (täglich)')

  // Erster Lauf nach 1 Minute (nicht sofort beim Start)
  setTimeout(() => {
    runDailyChecks().catch(e => console.error('[notifier] Fehler:', e.message))
    setInterval(() => {
      runDailyChecks().catch(e => console.error('[notifier] Fehler:', e.message))
    }, INTERVAL_MS)
  }, 60_000)
}

module.exports = { start, runDailyChecks, collectDigests }
