// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Policy Acknowledgement Routes (authenticated)

const express  = require('express')
const router   = express.Router()
const { requireAuth, authorize } = require('../auth')
const ackStore    = require('../db/ackStore')
const orgSettings = require('../db/orgSettingsStore')
const mailer      = require('../mailer')
const storage     = require('../storage')
const { tr, fmtDate, fmtDateTime, orgLang, langOf } = require('../i18n')

const PORT = process.env.PORT || 3000

// ── Helper ────────────────────────────────────────────────────────────────────

async function getMode() {
  const settings = await orgSettings.get()
  return settings.policyAckMode || 'manual'
}

function buildTokenUrl(req, token) {
  // PUBLIC_URL ist die zuverlaessigste Quelle (explizite Betreiber-Angabe,
  // unabhaengig von Proxy-Konfiguration) — z.B. hinter einem Reverse-Proxy,
  // dessen extern sichtbarer Host sich vom internen Verbindungs-Host
  // unterscheidet. Ohne PUBLIC_URL: req.protocol/req.hostname respektieren
  // 'trust proxy' (s. server/index.js) statt roher X-Forwarded-*-Header zu
  // vertrauen — ein Client kann sonst den Link in Bestaetigungs-Mails auf
  // eine fremde Domain umleiten. req.hostname liefert keinen Port; ohne
  // aktives TRUST_PROXY (typischer Fall: direkter Zugriff ohne Proxy, z.B.
  // lokale Tests/Demo auf einem Nicht-Standardport) wird er ergaenzt.
  const base = process.env.PUBLIC_URL
  if (base) return `${base.replace(/\/$/, '')}/ack/${token}`
  const proto = req.protocol
  const host  = req.hostname || 'localhost'
  const port  = req.app.get('trust proxy') ? '' : `:${PORT}`
  return `${proto}://${host}${port}/ack/${token}`
}

async function sendCampaignMails(dist, req) {
  const lang = await orgLang()    // Empfänger haben kein Konto: Standardsprache der Organisation
  const acks = await ackStore.getAcksForDistribution(dist.id)
  let sent = 0
  for (const ack of acks) {
    if (ack.acknowledgedAt) continue  // already confirmed — skip
    const url     = buildTokenUrl(req, ack.token)
    const subject = tr(lang, 'srv_ackmail_subject', { title: dist.templateTitle })
    const html    = `
      <p>${tr(lang, 'srv_ackmail_hello')}</p>
      <p>${tr(lang, 'srv_ackmail_ask')}</p>
      <p><strong>${dist.templateTitle}</strong></p>
      ${dist.dueDate ? `<p>${tr(lang, 'srv_ackmail_due')} <strong>${fmtDate(dist.dueDate, lang)}</strong></p>` : ''}
      <p><a href="${url}" style="background:#0052cc;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">
        ${tr(lang, 'srv_ackmail_button')}
      </a></p>
      <p style="color:#666;font-size:12px">
        ${tr(lang, 'srv_ackmail_fallback')}<br>${url}
      </p>
      <hr>
      <p style="color:#888;font-size:11px">${tr(lang, 'srv_ackmail_auto')}</p>
    `
    const ok = await mailer.sendMail(ack.recipientEmail, subject, html)
    if (ok) sent++
  }
  return sent
}

// ── GET /admin/ack-settings — aktueller Modus ─────────────────────────────────
router.get('/admin/ack-settings', requireAuth, authorize('admin'), async (req, res) => {
  res.json({ policyAckMode: await getMode() })
})

// ── PUT /admin/ack-settings — Modus ändern (nur admin) ───────────────────────
router.put('/admin/ack-settings', requireAuth, authorize('admin'), async (req, res) => {
  const { policyAckMode } = req.body
  const VALID = ['email_campaign', 'manual', 'distribution_only']
  if (!VALID.includes(policyAckMode)) return res.status(400).json({ error: 'Ungültiger Modus' })
  await orgSettings.update({ policyAckMode })
  res.json({ ok: true, policyAckMode })
})

// ── GET /distributions — alle Verteilrunden (contentowner+) ──────────────────
router.get('/distributions', requireAuth, authorize('contentowner'), async (req, res) => {
  res.json(await ackStore.getAllDistributionsWithStats())
})

// ── GET /distributions/summary — KPI für Dashboard ───────────────────────────
router.get('/distributions/summary', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await ackStore.getSummary())
})

// ── GET /distributions/:id — Detail + Stats ───────────────────────────────────
router.get('/distributions/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistributionWithStats(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(dist)
})

// ── POST /distributions — neue Verteilrunde anlegen ──────────────────────────
router.post('/distributions', requireAuth, authorize('contentowner'), async (req, res) => {
  const { templateId, dueDate, targetGroup, emailList, notes, mode } = req.body
  if (!templateId) return res.status(400).json({ error: 'templateId fehlt' })

  const effectiveMode = mode || await getMode()

  // Vorlage laden für Titel/Typ/Version
  let templateTitle = '', templateType = 'Policy', templateVersion = 1
  try {
    const all = await storage.getTemplates({}) || []
    const tmpl = all.find(t => t.id === templateId)
    if (tmpl) {
      templateTitle   = tmpl.title || ''
      templateType    = tmpl.type  || 'Policy'
      templateVersion = tmpl.version || 1
      if (tmpl.status !== 'approved') {
        return res.status(400).json({ error: 'Nur freigegebene (approved) Richtlinien können verteilt werden' })
      }
    }
  } catch {}

  const dist = await ackStore.createDistribution({
    templateId,
    templateTitle,
    templateType,
    templateVersion,
    mode:              effectiveMode,
    targetGroup:       targetGroup || '',
    dueDate:           dueDate     || null,
    emailList:         effectiveMode === 'email_campaign' ? (emailList || []) : [],
    notes:             notes       || '',
    createdBy:         req.user?.username || req.user?.email || 'system',
  })

  if (effectiveMode === 'email_campaign' && dist.emailList.length > 0) {
    await ackStore.prepareEmailAcks(dist.id, dist.emailList)
  }

  res.status(201).json(await ackStore.getDistributionWithStats(dist.id))
})

// ── PUT /distributions/:id — bearbeiten (status, dueDate, notes) ─────────────
router.put('/distributions/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const allowed = ['status', 'dueDate', 'targetGroup', 'notes']
  const patch = {}
  for (const k of allowed) { if (req.body[k] !== undefined) patch[k] = req.body[k] }
  const updated = await ackStore.updateDistribution(req.params.id, patch)
  if (!updated) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(await ackStore.getDistributionWithStats(updated.id))
})

// ── DELETE /distributions/:id — löschen (admin) ──────────────────────────────
router.delete('/distributions/:id', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await ackStore.deleteDistribution(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json({ ok: true })
})

// ── POST /distributions/:id/send — E-Mails versenden (email_campaign) ─────────
router.post('/distributions/:id/send', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  if (dist.mode !== 'email_campaign') return res.status(400).json({ error: 'Nur für E-Mail-Kampagnen' })

  // Ggf. neue E-Mail-Adressen aus Anfrage hinzufügen
  if (Array.isArray(req.body.emailList) && req.body.emailList.length > 0) {
    const merged = [...new Set([...dist.emailList, ...req.body.emailList])]
    await ackStore.updateDistribution(dist.id, { emailList: merged })
    await ackStore.prepareEmailAcks(dist.id, merged)
  } else {
    await ackStore.prepareEmailAcks(dist.id, dist.emailList)
  }

  const fresh = await ackStore.getDistribution(dist.id)
  const sent  = await sendCampaignMails(fresh, req)
  await ackStore.updateDistribution(dist.id, { emailSentAt: new Date().toISOString(), emailSentCount: (fresh.emailSentCount || 0) + sent })
  res.json({ ok: true, sent })
})

// ── POST /distributions/:id/remind — Erinnerung an nicht bestätigte ───────────
router.post('/distributions/:id/remind', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  if (dist.mode !== 'email_campaign') return res.status(400).json({ error: 'Nur für E-Mail-Kampagnen' })
  const sent = await sendCampaignMails(dist, req)
  res.json({ ok: true, sent })
})

// ── GET /distributions/:id/acks — alle Bestätigungen ─────────────────────────
router.get('/distributions/:id/acks', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(await ackStore.getAcksForDistribution(req.params.id))
})

// ── POST /distributions/:id/acks — manuelle Bestätigung hinzufügen ─────────────
router.post('/distributions/:id/acks', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  const { recipientEmail, recipientName, acknowledgedAt, notes } = req.body
  const ack = await ackStore.addManualAck({
    distributionId: req.params.id,
    recipientEmail:  recipientEmail || '',
    recipientName:   recipientName  || '',
    acknowledgedAt:  acknowledgedAt || null,
    notes:           notes          || '',
    addedBy:         req.user?.username || req.user?.email || 'system',
  })
  res.status(201).json(ack)
})

// ── POST /distributions/:id/acks/import — CSV-Import ─────────────────────────
router.post('/distributions/:id/acks/import', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistribution(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  const { rows } = req.body  // [{ email, name, acknowledgedAt }]
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows[] erwartet' })
  const result = await ackStore.importAcks(
    req.params.id,
    rows,
    req.user?.username || req.user?.email || 'system'
  )
  res.json(result)
})

// ── DELETE /distributions/:id/acks/:ackId — einzelne Bestätigung löschen ──────
router.delete('/distributions/:id/acks/:ackId', requireAuth, authorize('admin'), async (req, res) => {
  const ok = await ackStore.deleteAck(req.params.ackId)
  if (!ok) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json({ ok: true })
})

// ── GET /distributions/:id/export/csv — CSV-Export ───────────────────────────
router.get('/distributions/:id/export/csv', requireAuth, authorize('contentowner'), async (req, res) => {
  const dist = await ackStore.getDistributionWithStats(req.params.id)
  if (!dist) return res.status(404).json({ error: 'Nicht gefunden' })
  const acks = await ackStore.getAcksForDistribution(req.params.id)

  const lang   = langOf(req)
  const header = [tr(lang, 'admin_email'), tr(lang, 'col_name'), tr(lang, 'srv_ackcsv_confirmedOn'), tr(lang, 'srv_ackcsv_method')].join(';') + '\n'
  const rows = acks.map(a =>
    [
      a.recipientEmail || '',
      a.recipientName  || '',
      a.acknowledgedAt ? fmtDateTime(a.acknowledgedAt, lang) : tr(lang, 'gdpr_pending'),
      a.method         || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')
  ).join('\n')

  const filename = `Bestaetigungen_${dist.templateTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + header + rows)
})

module.exports = router
