// © 2026 Claude Hecker — ISMS Builder V 1.30 — AGPL-3.0
'use strict'
const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const { requireAuth, authorize } = require('../auth')
const soaStore = require('../db/soaStore')
const soaFrameworkStore = require('../db/soaFrameworkStore')
const soaFrameworkDefs = require('../soaFrameworkDefs')
const crossmapStore = require('../db/crossmapStore')
const orgSettingsStore = require('../db/orgSettingsStore')
const auditStore = require('../db/auditStore')
const storage = require('../storage')

// Der Typ steckt in der Kennung nur als bereinigter Präfix (Leerzeichen → „-“): zuerst im Bestand nachsehen
async function templateTypeOf(tid) {
  const all = (await storage.getTemplates?.({})) || []
  const hit = all.find(x => x.id === tid)
  return hit ? hit.type : String(tid).split('_')[0]
}
const { localizeControls, localizeCrossmapGroup } = require('../i18n/catalog')
const i18n = require('../i18n')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')

// Verfügbare Frameworks auflisten
router.get('/soa/frameworks', requireAuth, authorize('reader'), async (req, res) => {
  const activeFw = (await orgSettingsStore.get()).soaFrameworks || {}
  const all = await soaStore.getFrameworks()
  const hasConfig = Object.values(activeFw).some(v => v === false)
  res.json(hasConfig ? all.filter(fw => activeFw[fw.id] !== false) : all)
})

// Alle Controls
router.get('/soa', requireAuth, authorize('reader'), async (req, res) => {
  const { framework, theme } = req.query
  res.json(localizeControls(await soaStore.getAll({ framework, theme }), i18n.langOf(req)))
})

// Zusammenfassung
router.get('/soa/summary', requireAuth, authorize('reader'), async (req, res) => {
  const { framework } = req.query
  const activeFw = (await orgSettingsStore.get()).soaFrameworks || {}
  const hasConfig = Object.values(activeFw).some(v => v === false)
  const full = await soaStore.getSummary(framework || null)
  if (!framework && hasConfig) {
    const filtered = {}
    for (const [k, v] of Object.entries(full)) {
      if (activeFw[k] !== false) filtered[k] = v
    }
    return res.json(filtered)
  }
  res.json(full)
})

// Framework-Selektion lesen
router.get('/admin/soa-frameworks', requireAuth, authorize('reader'), async (req, res) => {
  res.json((await orgSettingsStore.get()).soaFrameworks || {})
})

// Framework-Selektion speichern
router.put('/admin/soa-frameworks', requireAuth, authorize('admin'), async (req, res) => {
  const updated = await orgSettingsStore.update({ soaFrameworks: req.body })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'soa-frameworks', detail: 'SoA Framework-Auswahl aktualisiert' })
  res.json(updated.soaFrameworks)
})

// ─────────────────────────────────────────────────────────────────
// Eigene Gruppen (nutzerdefinierte Frameworks, z. B. NEN 7510, TISAX, Kundenanforderung)
// Definition: data/soa-frameworks.json (db/soaFrameworkStore.js); Controls: wie alle anderen (soa.json / soa_controls).
// Es werden keine Normtexte ausgeliefert; die Firma importiert, was sie verwenden darf. Anlegen/Ändern/Import nur Administratoren.
// ─────────────────────────────────────────────────────────────────
const FW_ERRORS = {
  invalid_id: 'Invalid group ID (2–50 characters: A–Z, 0–9, "_" or "-")',
  reserved_id: 'This group ID is reserved for a built-in framework',
  invalid_label: 'Invalid group name (1–120 characters)',
  invalid_color: 'Invalid color (use #RRGGBB)',
}
const isBuiltinFramework = id => soaFrameworkDefs.RESERVED_IDS.includes(id)

// Verwaltung: alle eigenen Gruppen (auch ausgeblendete) mit der Zahl ihrer Controls
router.get('/soa/frameworks/custom', requireAuth, authorize('admin'), async (req, res) => {
  const out = []
  for (const f of await soaFrameworkStore.getAll()) out.push({ ...f, custom: true, count: await soaStore.countControls(f.id) })
  res.json(out)
})

router.post('/soa/frameworks', requireAuth, authorize('admin'), async (req, res) => {
  const r = await soaFrameworkStore.create(req.body, { by: req.user })
  if (r.code === 'exists') return res.status(409).json({ error: 'A group with this ID already exists', code: r.code })
  if (r.code) return res.status(400).json({ error: FW_ERRORS[r.code], code: r.code })
  await auditStore.append({ user: req.user, action: 'create', resource: 'soa-framework', detail: `${r.framework.id}: ${r.framework.label}` })
  res.status(201).json({ ...r.framework, custom: true })
})

router.put('/soa/frameworks/:id', requireAuth, authorize('admin'), async (req, res) => {
  const { id } = req.params
  if (isBuiltinFramework(id)) return res.status(403).json({ error: 'Built-in frameworks cannot be changed' })
  const r = await soaFrameworkStore.update(id, req.body || {}, { by: req.user })
  if (r.code === 'not_found') return res.status(404).json({ error: 'Group not found' })
  if (r.code) return res.status(400).json({ error: FW_ERRORS[r.code], code: r.code })
  await auditStore.append({ user: req.user, action: 'update', resource: 'soa-framework', detail: `${id}: ${r.framework.label}` })
  res.json({ ...r.framework, custom: true })
})

// Löschen nur, wenn die Gruppe keine Controls mehr hat (keine Kaskade, keine verwaisten Verknüpfungen)
router.delete('/soa/frameworks/:id', requireAuth, authorize('admin'), async (req, res) => {
  const { id } = req.params
  if (isBuiltinFramework(id)) return res.status(403).json({ error: 'Built-in frameworks cannot be changed' })
  if (!(await soaFrameworkStore.getById(id))) return res.status(404).json({ error: 'Group not found' })
  const count = await soaStore.countControls(id)
  if (count > 0) return res.status(409).json({ error: 'The group still contains controls — remove them first', count })
  await soaFrameworkStore.remove(id, { by: req.user })
  await auditStore.append({ user: req.user, action: 'delete', resource: 'soa-framework', detail: id })
  res.json({ ok: true })
})

// Beispieldatei mit erfundenen Controls (kein Normtext)
router.get('/soa/frameworks/import/example', requireAuth, authorize('admin'), (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="soa-custom-framework.example.json"')
  res.json(soaFrameworkDefs.exampleFile())
})

// Import { framework: { id, label, color }, controls: [...] } — mit ?dryRun=1 nur die Vorschau (nichts wird geschrieben).
// Gruppe unbekannt → wird beim echten Import angelegt; Gruppe vorhanden → Bezeichnung/Farbe der Datei werden nicht übernommen.
// Vorhandene Controls derselben Gruppe: nur Titel/Thema/Beschreibung; Status, Verantwortliche, Begründung, Verknüpfungen bleiben. Es wird nichts gelöscht.
router.post('/soa/frameworks/import', requireAuth, authorize('admin'), async (req, res) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.controls)) return res.status(400).json({ error: 'Unexpected file format: expected an object with a "controls" list', code: 'invalid_format' })
  if (body.controls.length > soaFrameworkDefs.MAX_ROWS) return res.status(400).json({ error: 'Too many rows (max 2000)', code: 'too_many_rows' })
  const fwIn = body.framework && typeof body.framework === 'object' && !Array.isArray(body.framework) ? body.framework : {}
  const known = await soaFrameworkStore.getById(typeof fwIn.id === 'string' ? fwIn.id.trim() : '')
  let framework = known
  if (!known) {
    const v = soaFrameworkDefs.validateDefinition(fwIn)
    if (v.code) return res.status(400).json({ error: FW_ERRORS[v.code], code: v.code })
    framework = v.value
  }
  const existing = (await soaStore.getAll()).map(c => ({ id: c.id, framework: c.framework }))
  const plan = soaFrameworkDefs.planImport(body.controls, framework.id, existing)
  const summary = {
    framework: { id: framework.id, label: framework.label, color: framework.color, exists: !!known },
    total: body.controls.length, added: plan.added.length, updated: plan.updated.length,
    rejected: plan.rejected.length, rejectedByReason: plan.rejectedByReason, rejectedDetails: plan.rejected.slice(0, 50),
    preview: plan.accepted.slice(0, 50).map(c => ({ id: c.id, theme: c.theme, title: c.title, state: plan.updated.includes(c.id) ? 'updated' : 'added' })),
  }
  if (req.query.dryRun === '1' || req.query.dryRun === 'true') return res.json({ dryRun: true, ...summary })
  if (!plan.accepted.length) return res.status(400).json({ error: 'No valid controls found', ...summary })
  if (!known) {
    const c = await soaFrameworkStore.create(framework, { by: req.user })
    if (c.code && c.code !== 'exists') return res.status(400).json({ error: FW_ERRORS[c.code] || 'Request could not be processed', code: c.code })
  }
  const r = await soaStore.importControls(framework.id, plan.accepted, { changedBy: req.user })
  await auditStore.append({ user: req.user, action: 'import', resource: 'soa-framework', detail: `${framework.id}: ${r.added} neu, ${r.updated} aktualisiert, ${plan.rejected.length} abgelehnt${known ? '' : ' (Gruppe angelegt)'}` })
  res.json({ dryRun: false, ...summary, added: r.added, updated: r.updated })
})

// Einzelnen Control aktualisieren
router.put('/soa/:id', requireAuth, authorize('editor'), async (req, res) => {
  const { id } = req.params
  const { applicable, status, owner, justification, linkedTemplates, applicableEntities } = req.body

  if (Array.isArray(linkedTemplates)) {
    const existing = await soaStore.getById(id)
    if (existing) {
      const prevTemplates = existing.linkedTemplates || []
      const added   = linkedTemplates.filter(t => !prevTemplates.includes(t))
      const removed = prevTemplates.filter(t => !linkedTemplates.includes(t))
      for (const tid of added) {
        const ttype = await templateTypeOf(tid)
        storage.addLinkedControl?.(ttype, tid, id)
      }
      for (const tid of removed) {
        const ttype = await templateTypeOf(tid)
        storage.removeLinkedControl?.(ttype, tid, id)
      }
    }
  }

  const updated = await soaStore.update(id, { applicable, status, owner, justification, linkedTemplates, applicableEntities }, { changedBy: req.user })
  if (!updated) return res.status(404).json({ error: 'Control not found' })
  res.json(updated)
})

// Cross-Mapping: alle Gruppen
router.get('/soa/crossmap', requireAuth, authorize('reader'), async (req, res) => {
  res.json((await crossmapStore.getAll()).map(g => localizeCrossmapGroup(g, i18n.langOf(req))))
})

// Cross-Mapping: verwandte Controls
router.get('/soa/:id/crossmap', requireAuth, authorize('reader'), async (req, res) => {
  const { id } = req.params
  const lang = i18n.langOf(req)
  res.json((await crossmapStore.getRelated(id)).map(r => {
    const g = localizeCrossmapGroup({ id: r.groupId, topic: r.topic, description: r.description }, lang)
    return { ...r, topic: g.topic, description: g.description }
  }))
})

// JSON-Export
router.get('/soa/export', requireAuth, authorize('reader'), async (req, res) => {
  const all = await soaStore.getAll()
  const summary = await soaStore.getSummary()
  res.setHeader('Content-Disposition', 'attachment; filename="soa-export.json"')
  res.json({ exportedAt: new Date().toISOString(), frameworks: await soaStore.getFrameworks(), summary, controls: localizeControls(all, i18n.langOf(req)) })
})

// ─────────────────────────────────────────────────────────────────
// ISO Controls Import
// ISO 27001 / ISO 9000 / ISO 9001 controls are NOT included in the
// distribution (copyright). Users supply their own JSON file.
// ─────────────────────────────────────────────────────────────────

// Status: check whether iso-controls.json exists and how many controls it has
router.get('/soa/import-controls/status', requireAuth, authorize('reader'), (req, res) => {
  const isoFile = path.join(DATA_DIR, 'iso-controls.json')
  if (!fs.existsSync(isoFile)) {
    return res.json({ present: false, count: 0 })
  }
  try {
    const raw = JSON.parse(fs.readFileSync(isoFile, 'utf8'))
    const count = Array.isArray(raw) ? raw.length : 0
    res.json({ present: true, count })
  } catch (e) {
    res.json({ present: true, count: 0, error: 'Parse error: ' + e.message })
  }
})

// Import: write iso-controls.json and reload the store
// Erlaubte Werte des Feldes `framework` beim ISO-Import (Kennungen, nicht die Bezeichnungen wie „ISO 27001:2022“)
const ISO_IMPORT_FRAMEWORKS = ['ISO27001', 'ISO9000', 'ISO9001']
const isText = (v, max) => typeof v === 'string' && v.trim() !== '' && v.length <= max

router.post('/soa/import-controls', requireAuth, authorize('admin'), express.json({ limit: '10mb' }), async (req, res) => {
  const controls = req.body
  if (!Array.isArray(controls)) return res.status(400).json({ error: 'Expected JSON array of controls' })

  // Jede Zeile einzeln prüfen: gültige werden übernommen, ungültige mit Grund gemeldet (statt still zu verschwinden, #45)
  const existing = new Map((await soaStore.getAll()).map(c => [c.id, c.framework]))
  const seen = new Set(), accepted = [], rejected = []
  controls.forEach((c, index) => {
    const id = c && typeof c.id === 'string' ? c.id.trim() : ''
    const bad = reason => rejected.push({ index, id: id || null, reason })
    if (!c || typeof c !== 'object' || Array.isArray(c)) return bad('not_an_object')
    if (!isText(c.id, 120) || !isText(c.theme, 120) || !isText(c.title, 512)) return bad('missing_field')
    if (!ISO_IMPORT_FRAMEWORKS.includes(c.framework)) return bad('invalid_framework')
    if (seen.has(id)) return bad('duplicate_id')
    if (existing.has(id) && existing.get(id) !== c.framework) return bad('id_conflict')   // Kennung gehört schon zu einem anderen Framework
    seen.add(id)
    const item = { id, theme: c.theme.trim(), title: c.title.trim(), framework: c.framework }
    if (isText(c.description, 4000)) item.description = c.description.trim()
    accepted.push(item)
  })
  const rejectedByReason = rejected.reduce((m, r) => (m[r.reason] = (m[r.reason] || 0) + 1, m), {})   // über alle abgelehnten Zeilen
  const summary = { imported: accepted.length, rejected: rejected.length, rejectedByReason, rejectedDetails: rejected.slice(0, 20), allowedFrameworks: ISO_IMPORT_FRAMEWORKS }
  if (!accepted.length) return res.status(400).json({ error: 'No valid controls found', ...summary })

  fs.writeFileSync(path.join(DATA_DIR, 'iso-controls.json'), JSON.stringify(accepted, null, 2))
  const { added } = await soaStore.reloadIsoControls()   // sofort sichtbar, kein Neustart nötig
  await auditStore.append({ user: req.user, action: 'import', resource: 'iso-controls', detail: `Imported ${accepted.length} ISO controls (${rejected.length} rejected)` })
  res.json({ ...summary, added })
})

// ── Custom Controls ───────────────────────────────────────────────────────────

router.post('/soa/custom', requireAuth, authorize('contentowner'), async (req, res) => {
  try {
    const ctrl = await soaStore.createCustomControl(req.body, { changedBy: req.user })
    await auditStore.append({ user: req.user, action: 'create', resource: 'custom-control', detail: ctrl.title })
    res.status(201).json(ctrl)
  } catch (e) {
    const known = { invalid_framework: [400, 'Invalid framework group'], invalid_control_id: [400, 'Invalid control ID'], id_conflict: [409, 'A control with this ID already exists'] }[e.message]
    res.status(known ? known[0] : 400).json({ error: known ? known[1] : e.message })
  }
})

router.put('/soa/custom/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const updated = await soaStore.updateCustomControl(req.params.id, req.body, { changedBy: req.user })
  if (!updated) return res.status(404).json({ error: 'Not found or not a custom control' })
  await auditStore.append({ user: req.user, action: 'update', resource: 'custom-control', detail: updated.title })
  res.json(updated)
})

router.delete('/soa/custom/:id', requireAuth, authorize('contentowner'), async (req, res) => {
  const result = await soaStore.deleteCustomControl(req.params.id)
  if (!result.ok) {
    if (result.reason === 'not_found')  return res.status(404).json({ error: 'Not found' })
    if (result.reason === 'not_custom') return res.status(403).json({ error: 'Cannot delete built-in controls' })
    if (result.reason === 'has_links')  return res.status(409).json({ error: 'Control is linked to templates — unlink first' })
  }
  await auditStore.append({ user: req.user, action: 'delete', resource: 'custom-control', detail: req.params.id })
  res.json({ ok: true })
})

module.exports = router
