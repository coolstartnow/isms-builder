// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const reports = require('../reports')

router.get('/reports/compliance', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await reports.complianceReport(req.query.entity || null))
})
router.get('/reports/framework', requireAuth, authorize('reader'), (req, res) => {
  res.json(reports.frameworkReport(req.query.framework || null))
})
router.get('/reports/gap', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await reports.gapReport(req.query.entity || null))
})
router.get('/reports/templates', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await reports.templatesReport(req.query.entity || null))
})
router.get('/reports/audit', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await reports.auditReport(req.query.from || null, req.query.to || null))
})
router.get('/reports/reviews', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await reports.reviewsReport(parseInt(req.query.days) || 30))
})
router.get('/reports/matrix', requireAuth, authorize('reader'), async (req, res) => {
  res.json(await reports.complianceMatrixReport(req.query.framework || null))
})
router.get('/reports/findings', requireAuth, authorize('reader'), (req, res) => {
  const { status, severity, auditor } = req.query
  res.json(reports.findingsReport({ status, severity, auditor }))
})
router.get('/reports/export/csv', requireAuth, authorize('reader'), async (req, res) => {
  const { type, entity, framework, from, to } = req.query
  const csv = await reports.exportCsv(type, { entityId: entity, framework, from, to })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().toISOString().slice(0,10)}.csv"`)
  res.send('\uFEFF' + csv)
})

module.exports = router
