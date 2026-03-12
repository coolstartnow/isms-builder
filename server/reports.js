// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// Reports module – aggregierte Compliance-Berichte
// Fünf Report-Typen: compliance, framework, gap, templates, audit
const soaStore   = require('./db/soaStore')
const storage    = require('./storage')
const entityStore = require('./db/entityStore')

function resolveApplicable(applicableEntities, entityId) {
  if (!Array.isArray(applicableEntities) || applicableEntities.length === 0) return true
  return applicableEntities.includes(entityId)
}

// 1) Compliance per Gesellschaft: Controls applicable + implementiert pro Entity
async function complianceReport(entityId) {
  const entity = entityId ? entityStore.getById(entityId) : null
  const entities = entityId ? (entity ? [entity] : []) : entityStore.getAll()
  const allControls = soaStore.getAll()

  return entities.map(e => {
    const applicable = allControls.filter(c =>
      c.applicable && resolveApplicable(c.applicableEntities, e.id)
    )
    const implemented = applicable.filter(c => c.status === 'implemented' || c.status === 'optimized')
    const byFw = {}
    for (const c of applicable) {
      if (!byFw[c.framework]) byFw[c.framework] = { applicable: 0, implemented: 0 }
      byFw[c.framework].applicable++
      if (c.status === 'implemented' || c.status === 'optimized') byFw[c.framework].implemented++
    }
    return {
      entity: e,
      totalApplicable: applicable.length,
      totalImplemented: implemented.length,
      implementationRate: applicable.length > 0
        ? Math.round(implemented.length / applicable.length * 100) : 0,
      byFramework: byFw
    }
  })
}

// 2) Framework-Abdeckung: Controls pro Framework mit Implementierungsrate
function frameworkReport(framework) {
  const fw = soaStore.FRAMEWORKS
  const frameworks = framework ? [framework] : Object.keys(fw)
  return frameworks.map(fwId => {
    const controls = soaStore.getAll({ framework: fwId })
    const applicable = controls.filter(c => c.applicable)
    const byStatus = { not_started: 0, partial: 0, implemented: 0, optimized: 0 }
    for (const c of applicable) {
      if (byStatus[c.status] !== undefined) byStatus[c.status]++
    }
    return {
      framework: fwId,
      label: fw[fwId]?.label || fwId,
      color: fw[fwId]?.color || '#888',
      total: controls.length,
      applicable: applicable.length,
      notApplicable: controls.length - applicable.length,
      byStatus,
      implementationRate: applicable.length > 0
        ? Math.round((byStatus.implemented + byStatus.optimized) / applicable.length * 100) : 0
    }
  })
}

// 3) Gap-Analyse: Controls ohne verknüpfte Templates
async function gapReport(entityId) {
  const allControls = soaStore.getAll()
  const gaps = allControls.filter(c => {
    if (!c.applicable) return false
    if (entityId && !resolveApplicable(c.applicableEntities, entityId)) return false
    return !c.linkedTemplates || c.linkedTemplates.length === 0
  })
  return {
    entityId: entityId || null,
    totalGaps: gaps.length,
    gaps: gaps.map(c => ({
      id: c.id,
      framework: c.framework,
      title: c.title,
      status: c.status,
      owner: c.owner || null
    }))
  }
}

// 4) Template-Übersicht nach Gesellschaft
async function templatesReport(entityId) {
  const allTemplates = await storage.getTemplates?.({}) || []
  const filtered = entityId
    ? allTemplates.filter(t => resolveApplicable(t.applicableEntities, entityId))
    : allTemplates
  const byStatus = { draft: 0, review: 0, approved: 0, archived: 0 }
  const byType = {}
  for (const t of filtered) {
    const s = t.status || 'draft'
    if (byStatus[s] !== undefined) byStatus[s]++
    byType[t.type] = (byType[t.type] || 0) + 1
  }
  return {
    entityId: entityId || null,
    total: filtered.length,
    byStatus,
    byType,
    templates: filtered.map(t => ({
      id: t.id, type: t.type, title: t.title, status: t.status,
      version: t.version, updatedAt: t.updatedAt,
      linkedControls: t.linkedControls || [],
      applicableEntities: t.applicableEntities || []
    }))
  }
}

// 5) Audit-Trail: Status-Änderungen in Zeitraum
async function auditReport(from, to) {
  const allTemplates = await storage.getTemplates?.({}) || []
  const fromDate = from ? new Date(from) : null
  const toDate   = to   ? new Date(to)   : null

  const entries = []
  for (const t of allTemplates) {
    for (const sh of (t.statusHistory || [])) {
      const d = new Date(sh.changedAt)
      if (fromDate && d < fromDate) continue
      if (toDate   && d > toDate)   continue
      entries.push({
        templateId: t.id,
        templateTitle: t.title,
        type: t.type,
        status: sh.status,
        changedBy: sh.changedBy,
        changedAt: sh.changedAt
      })
    }
  }
  entries.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
  return { from: from || null, to: to || null, total: entries.length, entries }
}

// ── CSV-Hilfsfunktionen ─────────────────────────────────────────────────────

function csvRow(values) {
  return values.map(v => {
    const s = v === null || v === undefined ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"' : s
  }).join(',')
}

function csvExport(headers, rows) {
  return [csvRow(headers), ...rows.map(r => csvRow(r))].join('\n')
}

// 6) Reviews-Report: fällige + kommende Template-Reviews
async function reviewsReport(daysAhead = 30) {
  const allTemplates = await storage.getTemplates?.({}) || []
  const now = new Date()
  const cutoff = new Date(now.getTime() + daysAhead * 86400000)

  const overdue   = []
  const upcoming  = []
  const noReview  = []

  for (const t of allTemplates) {
    if (t.status === 'archived') continue
    if (!t.nextReviewDate) { noReview.push(t); continue }
    const d = new Date(t.nextReviewDate)
    if (d < now)      overdue.push(t)
    else if (d <= cutoff) upcoming.push(t)
  }

  const fmt = t => ({
    id: t.id, type: t.type, title: t.title, status: t.status,
    owner: t.owner || '', nextReviewDate: t.nextReviewDate || '',
    daysUntil: t.nextReviewDate
      ? Math.round((new Date(t.nextReviewDate) - now) / 86400000)
      : null
  })

  return {
    daysAhead,
    overdue:  overdue.map(fmt),
    upcoming: upcoming.map(fmt),
    noReview: noReview.map(fmt)
  }
}

// 7) Findings-Report: Audit-Feststellungen nach Schweregrad/Status/Auditor
function findingsReport({ status, severity, auditor } = {}) {
  const findingStore = require('./db/findingStore')
  const all = findingStore.getAll({ status, severity, auditor })
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, observation: 0 }
  const byStatus   = { open: 0, in_progress: 0, resolved: 0, accepted: 0 }
  for (const f of all) {
    if (bySeverity[f.severity] !== undefined) bySeverity[f.severity]++
    if (byStatus[f.status]     !== undefined) byStatus[f.status]++
  }
  const openActions    = all.reduce((n, f) => n + (f.actions || []).filter(a => a.status !== 'done').length, 0)
  const overdueActions = all.reduce((n, f) => {
    const today = new Date().toISOString().slice(0, 10)
    return n + (f.actions || []).filter(a => a.status !== 'done' && a.dueDate && a.dueDate < today).length
  }, 0)
  return { total: all.length, bySeverity, byStatus, openActions, overdueActions, findings: all }
}

// 8) Compliance-Matrix: Control × Gesellschaft → Ampel-Status
async function complianceMatrixReport(framework) {
  const entities = entityStore.getAll()
  const allControls = soaStore.getAll(framework ? { framework } : {})
  const applicable = allControls.filter(c => c.applicable)

  const matrix = applicable.map(ctrl => {
    const row = { id: ctrl.id, framework: ctrl.framework, title: ctrl.title, status: ctrl.status }
    for (const e of entities) {
      const applies = resolveApplicable(ctrl.applicableEntities, e.id)
      row[e.id] = applies ? ctrl.status : 'n/a'
    }
    return row
  })

  return { entities, controls: matrix, framework: framework || 'all' }
}

// CSV-Export-Wrapper für alle Report-Typen
async function exportCsv(type, { entityId, framework, from, to } = {}) {
  switch (type) {
    case 'compliance': {
      const data = await complianceReport(entityId)
      const rows = []
      for (const row of data) {
        for (const [fw, v] of Object.entries(row.byFramework || {})) {
          rows.push([row.entity?.name || 'Alle', fw, v.applicable, v.implemented,
            v.applicable > 0 ? Math.round(v.implemented / v.applicable * 100) + '%' : '0%'])
        }
      }
      return csvExport(['Gesellschaft', 'Framework', 'Applicable', 'Implementiert', 'Rate'], rows)
    }
    case 'framework': {
      const data = frameworkReport(framework)
      return csvExport(
        ['Framework', 'Label', 'Controls gesamt', 'Applicable', 'Nicht applicable', 'Implementiert', 'Rate'],
        data.map(f => [f.framework, f.label, f.total, f.applicable, f.notApplicable,
          (f.byStatus?.implemented || 0) + (f.byStatus?.optimized || 0), f.implementationRate + '%'])
      )
    }
    case 'gap': {
      const data = await gapReport(entityId)
      return csvExport(
        ['Control-ID', 'Framework', 'Titel', 'Status', 'Owner'],
        (data.gaps || []).map(g => [g.id, g.framework, g.title, g.status || '', g.owner || ''])
      )
    }
    case 'templates': {
      const data = await templatesReport(entityId)
      return csvExport(
        ['Typ', 'Titel', 'Status', 'Version', 'Verknüpfte Controls', 'Aktualisiert'],
        (data.templates || []).map(t => [t.type, t.title, t.status, t.version,
          t.linkedControls.length, t.updatedAt])
      )
    }
    case 'reviews': {
      const data = await reviewsReport(30)
      const all = [
        ...data.overdue.map(t => ['überfällig', ...Object.values(t)]),
        ...data.upcoming.map(t => ['bald fällig', ...Object.values(t)]),
      ]
      return csvExport(['Fälligkeit', 'ID', 'Typ', 'Titel', 'Status', 'Owner', 'Nächstes Review', 'Tage'], all)
    }
    case 'matrix': {
      const data = await complianceMatrixReport(framework)
      const entityCols = data.entities.map(e => e.name)
      const rows = data.controls.map(ctrl => {
        const cells = data.entities.map(e => ctrl[e.id] || 'n/a')
        return [ctrl.id, ctrl.framework, ctrl.title, ...cells]
      })
      return csvExport(['Control-ID', 'Framework', 'Titel', ...entityCols], rows)
    }
    case 'findings': {
      const data = findingsReport()
      return csvExport(
        ['Ref', 'Titel', 'Schweregrad', 'Status', 'Auditor', 'Prüfbereich', 'Von', 'Bis', 'IST-Zustand', 'SOLL-Zustand', 'Risiko', 'Empfehlung', 'Offene Maßnahmen', 'Erstellt'],
        data.findings.map(f => [
          f.ref, f.title, f.severity, f.status, f.auditor || '', f.auditedArea || '',
          f.auditPeriodFrom || '', f.auditPeriodTo || '',
          f.observation || '', f.requirement || '', f.impact || '', f.recommendation || '',
          (f.actions || []).filter(a => a.status !== 'done').length,
          f.createdAt ? f.createdAt.slice(0, 10) : ''
        ])
      )
    }
    default:
      return 'Unbekannter Report-Typ'
  }
}

module.exports = { complianceReport, frameworkReport, gapReport, templatesReport, auditReport, reviewsReport, complianceMatrixReport, findingsReport, exportCsv }
