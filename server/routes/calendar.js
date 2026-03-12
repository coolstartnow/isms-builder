// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const storage = require('../storage')

router.get('/calendar', requireAuth, authorize('reader'), async (req, res) => {
  const events = []

  const riskStore   = require('../db/riskStore')
  const goalsStore  = require('../db/goalsStore')
  const assetStore  = require('../db/assetStore')
  const govStore    = require('../db/governanceStore')
  const bcmStore    = require('../db/bcmStore')

  // Risiken + Behandlungspläne
  try {
    const riskEvts = riskStore.getCalendarEvents()
    events.push(...riskEvts)
  } catch {}

  // Templates
  try {
    const templates = await storage.getTemplates?.({}) || []
    for (const t of templates) {
      if (t.status === 'review' && t.updatedAt) {
        events.push({
          date:       t.updatedAt.slice(0, 10),
          type:       'template_review',
          label:      `Prüfung: ${t.title}`,
          templateId: t.id,
          templateType: t.type,
          title:      t.title
        })
      }
      if (t.nextReviewDate) {
        events.push({
          date:       t.nextReviewDate,
          type:       'template_due',
          label:      `Review fällig: ${t.title}`,
          templateId: t.id,
          templateType: t.type,
          title:      t.title
        })
      }
    }
  } catch {}

  // Legal: ablaufende Verträge
  try {
    const legalStore = require('../db/legalStore')
    const expiring = legalStore.contracts.getExpiring(60)
    for (const c of expiring) {
      events.push({
        date:       c.noticeDate,
        type:       'contract_expiring',
        label:      `Vertrag Kündigungsfrist: ${c.title}`,
        contractId: c.id,
        title:      c.title
      })
    }
  } catch {}

  // GDPR VVT: bald fällige Löschfristen
  try {
    const gdprStore = require('../db/gdprStore')
    const upcoming = gdprStore.deletionLog.getUpcoming(90)
    for (const v of upcoming) {
      events.push({
        date:    v.deletionDue,
        type:    'gdpr_deletion_due',
        label:   `Löschfrist: ${v.title}`,
        vvtId:   v.id,
        title:   v.title
      })
    }
    const overdue = gdprStore.deletionLog.getDue()
    for (const v of overdue) {
      events.push({
        date:    v.deletionDue,
        type:    'gdpr_deletion_overdue',
        label:   `Löschfrist ÜBERFÄLLIG: ${v.title}`,
        vvtId:   v.id,
        title:   v.title
      })
    }
  } catch {}

  // Sicherheitsziele
  try {
    const goalEvts = goalsStore.getCalendarEvents()
    events.push(...goalEvts)
  } catch {}

  // Assets EoL
  try {
    const assets = assetStore.getAll({ status: 'active' })
    for (const a of assets) {
      if (a.endOfLifeDate) events.push({
        date:     a.endOfLifeDate,
        type:     'asset_eol',
        title:    `EoL: ${a.name}`,
        ref:      a.id,
        severity: a.criticality === 'critical' || a.criticality === 'high' ? 'high' : 'normal',
      })
    }
  } catch {}

  // Governance: Management Reviews, Maßnahmen, Sitzungen
  try {
    for (const r of govStore.getReviews()) {
      if (r.date) events.push({ date: r.date, type: 'management_review', title: r.title || 'Management Review', ref: r.id, severity: 'normal' })
      if (r.nextReviewDate) events.push({ date: r.nextReviewDate, type: 'management_review', title: `Nächstes Review: ${r.title || 'Management Review'}`, ref: r.id, severity: 'normal' })
    }
    for (const a of govStore.getActions()) {
      if (a.dueDate && a.status !== 'completed' && a.status !== 'cancelled')
        events.push({ date: a.dueDate, type: 'governance_action', title: `Maßnahme: ${a.title}`, ref: a.id, severity: a.priority === 'critical' || a.priority === 'high' ? 'high' : 'normal' })
    }
    for (const m of govStore.getMeetings()) {
      if (m.date) events.push({ date: m.date, type: 'committee_meeting', title: m.title || 'Ausschusssitzung', ref: m.id, severity: 'normal' })
      if (m.nextMeetingDate) events.push({ date: m.nextMeetingDate, type: 'committee_meeting', title: `Nächste Sitzung: ${m.committee || ''}`, ref: m.id, severity: 'normal' })
    }
  } catch {}

  // BCM: Übungen und Plan-Tests
  try {
    for (const ex of bcmStore.getExercises()) {
      if (ex.result === 'planned' && ex.date)
        events.push({ date: ex.date, type: 'bcm_exercise', title: `BCM-Übung: ${ex.title}`, ref: ex.id, severity: 'normal' })
    }
    for (const pl of bcmStore.getPlans()) {
      if (pl.nextTest)
        events.push({ date: pl.nextTest, type: 'bcm_plan_test', title: `Plan-Test fällig: ${pl.title}`, ref: pl.id, severity: pl.nextTest < new Date().toISOString().slice(0,10) ? 'high' : 'normal' })
    }
  } catch {}

  // Lieferanten: anstehende Audits
  try {
    const supplierStore = require('../db/supplierStore')
    const upcoming = supplierStore.getUpcomingAudits(60)
    for (const s of upcoming) {
      events.push({
        date:     s.nextAuditDate,
        type:     'supplier_audit',
        title:    `Lieferanten-Audit: ${s.name}`,
        ref:      s.id,
        severity: s.criticality === 'critical' || s.criticality === 'high' ? 'high' : 'normal',
      })
    }
  } catch {}

  // Audit-Feststellungen: überfällige und bald fällige Actions
  try {
    const findingStore = require('../db/findingStore')
    const today = new Date().toISOString().slice(0, 10)
    for (const f of findingStore.getAll()) {
      for (const a of (f.actions || [])) {
        if (!a.dueDate || a.status === 'done') continue
        events.push({
          date:      a.dueDate,
          type:      'finding_action_due',
          title:     `Finding-Maßnahme: ${a.description || f.title}`,
          ref:       f.id,
          findingRef: f.ref,
          severity:  a.dueDate < today ? 'high' : 'normal',
        })
      }
    }
  } catch {}

  events.sort((a, b) => new Date(a.date) - new Date(b.date))
  res.json(events)
})

module.exports = router
