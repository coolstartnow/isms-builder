// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { requireAuth, authorize } = require('../auth')
const orgSettingsStore = require('../db/orgSettingsStore')
const auditStore       = require('../db/auditStore')
const customListsStore = require('../db/customListsStore')
const storage          = require('../storage')
const mailer           = require('../mailer')

function nowISO() { return new Date().toISOString() }

const DATA_DIR        = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FLAG_FILE       = path.join(DATA_DIR, '.demo_reset_done')
const DEMO_LANG_FILE  = path.join(DATA_DIR, '.demo_lang_set')
const BUNDLES_DIR     = path.join(__dirname, '../../data/demo-bundles')

function buildFullExport(dataDir) {
  const jsonFiles = [
    'templates.json','soa.json','risks.json','entities.json',
    'rbac_users.json','guidance.json','training.json','public-incidents.json',
    'org-settings.json','custom-lists.json','audit-log.json',
    'goals.json','assets.json','bcm.json','suppliers.json','governance.json'
  ]
  const bundle = { exportedAt: nowISO(), version: '1.28', files: {}, gdpr: {}, legal: {} }
  for (const f of jsonFiles) {
    try { bundle.files[f] = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')) } catch {}
  }
  const gdprDir = path.join(dataDir, 'gdpr')
  if (fs.existsSync(gdprDir)) {
    for (const f of fs.readdirSync(gdprDir).filter(x => x.endsWith('.json'))) {
      try { bundle.gdpr[f] = JSON.parse(fs.readFileSync(path.join(gdprDir, f), 'utf8')) } catch {}
    }
  }
  const legalDir = path.join(dataDir, 'legal')
  if (fs.existsSync(legalDir)) {
    for (const f of fs.readdirSync(legalDir).filter(x => x.endsWith('.json'))) {
      try { bundle.legal[f] = JSON.parse(fs.readFileSync(path.join(legalDir, f), 'utf8')) } catch {}
    }
  }
  return bundle
}

// ── Dashboard ──
router.get('/dashboard', requireAuth, authorize('reader'), async (req, res) => {
  const all = await storage.getTemplates?.({}) || []

  const byStatus = { draft: 0, review: 0, approved: 0, archived: 0 }
  const byType = {}
  const recentActivity = []

  for (const t of all) {
    const s = t.status || 'draft'
    if (byStatus[s] !== undefined) byStatus[s]++
    byType[t.type] = (byType[t.type] || 0) + 1

    if (t.statusHistory && t.statusHistory.length > 0) {
      const last = t.statusHistory[t.statusHistory.length - 1]
      recentActivity.push({
        templateId: t.id,
        title: t.title,
        type: t.type,
        status: last.status,
        changedBy: last.changedBy,
        changedAt: last.changedAt
      })
    }
  }

  const total = all.length
  const approvalRate = total > 0 ? Math.round((byStatus.approved / total) * 100) : 0

  recentActivity.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))

  res.json({
    total,
    byStatus,
    byType,
    approvalRate,
    recentActivity: recentActivity.slice(0, 10)
  })
})

// ── Admin Users ──
router.get('/admin/users', requireAuth, authorize('admin'), async (req, res) => {
  const all = require('../rbacStore').getAllUsers()
  if (req.role === 'admin') {
    res.json(all)
  } else {
    const domain = req.domain || 'Global'
    const filtered = all.filter(u => (u.domain || 'Global') === domain)
    res.json(filtered)
  }
})
router.get('/admin/user/:username', requireAuth, authorize('admin'), async (req, res) => {
  const { username } = req.params
  const all = require('../rbacStore').getAllUsers()
  const target = all.find(u => u.username === username)
  if (!target) return res.status(404).json({ error: 'Not found' })
  if (req.role !== 'admin' && (target.domain !== req.domain)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const sections = require('../rbacStore').getUserSections(username) || []
  res.json({ username, sections, domain: target.domain, role: target.role })
})
router.put('/admin/user/:username', requireAuth, authorize('admin'), async (req, res) => {
  const { username } = req.params
  const { sections } = req.body
  if (!Array.isArray(sections)) return res.status(400).json({ error: 'sections must be an array' })
  const all = require('../rbacStore').getAllUsers()
  const target = all.find(u => u.username === username)
  if (!target) return res.status(404).json({ error: 'Not found' })
  if (req.role !== 'admin' && (target.domain !== req.domain)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const updated = require('../rbacStore').setUserSections(username, sections)
  res.json(updated)
})

router.post('/admin/users', requireAuth, authorize('admin'), async (req, res) => {
  const { username, email, domain, role, functions, password } = req.body || {}
  if (!username || !email || !role) return res.status(400).json({ error: 'username, email und role sind erforderlich' })
  if (!password || password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' })
  try {
    const user = await require('../rbacStore').createUser({ username, email, domain, role, functions, password })
    const fnStr = (functions||[]).join(', ') || '—'
    auditStore.append({ user: req.user, action: 'create', resource: 'user', resourceId: username, detail: `Rolle: ${role} | Funktionen: ${fnStr}` })
    res.status(201).json(user)
  } catch (e) {
    res.status(409).json({ error: e.message })
  }
})

router.put('/admin/users/:username', requireAuth, authorize('admin'), async (req, res) => {
  const { username } = req.params
  const { email, domain, role, functions, password } = req.body || {}
  if (password && password.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' })
  const updated = await require('../rbacStore').updateUser(username, { email, domain, role, functions, password: password || undefined })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  const fnStr = (functions||[]).join(', ') || '—'
  auditStore.append({ user: req.user, action: 'update', resource: 'user', resourceId: username, detail: role ? `Neue Rolle: ${role} | Funktionen: ${fnStr}` : 'Profil aktualisiert' })
  res.json(updated)
})

router.delete('/admin/users/:username', requireAuth, authorize('admin'), (req, res) => {
  const { username } = req.params
  if (username === req.user) return res.status(400).json({ error: 'Eigenen Account nicht löschbar' })
  const ok = require('../rbacStore').deleteUser(username)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  auditStore.append({ user: req.user, action: 'delete', resource: 'user', resourceId: username })
  res.json({ deleted: true })
})

// ── Custom editable lists ──
router.get('/admin/lists', requireAuth, (req, res) => {
  res.json(customListsStore.getAll())
})
router.put('/admin/list/:listId', requireAuth, authorize('admin'), (req, res) => {
  const { listId } = req.params
  const items = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Body must be an array' })
  const result = customListsStore.setList(listId, items)
  if (result === null) return res.status(404).json({ error: 'Unknown list id' })
  res.json(result)
})
router.post('/admin/list/:listId/reset', requireAuth, authorize('admin'), (req, res) => {
  const result = customListsStore.resetList(req.params.listId)
  if (result === null) return res.status(404).json({ error: 'Unknown list id' })
  res.json(result)
})

// ── Organisationseinstellungen ──
router.get('/admin/org-settings', requireAuth, authorize('reader'), (req, res) => {
  res.json(orgSettingsStore.get())
})
router.put('/admin/org-settings', requireAuth, authorize('admin'), (req, res) => {
  const updated = orgSettingsStore.update(req.body)
  auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Organisationseinstellungen aktualisiert' })
  res.json(updated)
})

// Modul-Konfiguration
router.get('/admin/modules', requireAuth, authorize('reader'), (req, res) => {
  res.json(orgSettingsStore.get().modules || {})
})
router.put('/admin/modules', requireAuth, authorize('admin'), (req, res) => {
  const updated = orgSettingsStore.update({ modules: req.body })
  auditStore.append({ user: req.user, action: 'settings', resource: 'modules', detail: 'Modul-Konfiguration aktualisiert' })
  res.json(updated.modules)
})

// 2FA-Enforcement
router.get('/admin/security', requireAuth, authorize('reader'), (req, res) => {
  const s = orgSettingsStore.get()
  res.json({ require2FA: s.require2FA === true })
})
router.put('/admin/security', requireAuth, authorize('admin'), (req, res) => {
  const { require2FA } = req.body
  const updated = orgSettingsStore.update({ require2FA: !!require2FA })
  auditStore.append({ user: req.user, action: 'settings', resource: 'security', detail: `2FA-Pflicht: ${updated.require2FA ? 'aktiviert' : 'deaktiviert'}` })
  res.json({ require2FA: updated.require2FA })
})

// Rollenspezifische Einstellungen
router.get('/admin/role-settings', requireAuth, authorize('contentowner'), (req, res) => {
  const s = orgSettingsStore.get()
  res.json({
    cisoSettings:     s.cisoSettings,
    gdpoSettings:     s.gdpoSettings,
    icsSettings:      s.icsSettings,
    revisionSettings: s.revisionSettings,
    qmSettings:       s.qmSettings,
  })
})
router.put('/admin/role-settings', requireAuth, authorize('contentowner'), (req, res) => {
  const updated = orgSettingsStore.update(req.body)
  auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Rolleneinstellungen aktualisiert' })
  res.json(updated)
})

// ── Audit-Log ──
router.get('/admin/audit-log', requireAuth, authorize('admin'), (req, res) => {
  const { user, action, resource, from, to, limit, offset } = req.query
  res.json(auditStore.query({
    user, action, resource, from, to,
    limit:  limit  ? parseInt(limit)  : 200,
    offset: offset ? parseInt(offset) : 0,
  }))
})
router.delete('/admin/audit-log', requireAuth, authorize('admin'), (req, res) => {
  auditStore.clear()
  auditStore.append({ user: req.user, action: 'delete', resource: 'audit', detail: 'Audit-Log geleert' })
  res.json({ ok: true })
})

// ── E-Mail Test ──
router.post('/admin/email/test', requireAuth, authorize('admin'), async (req, res) => {
  const { to } = req.body
  if (!to) return res.status(400).json({ error: 'Empfängeradresse fehlt' })
  try {
    await mailer.sendTestMail(to)
    auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: `Test-Mail an ${to} gesendet` })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── E-Mail SMTP-Status ──
router.get('/admin/email/status', requireAuth, authorize('admin'), (req, res) => {
  const cfg = mailer.getSmtpConfig()
  res.json({
    configured: Boolean(cfg),
    source:     process.env.SMTP_HOST ? 'env' : (cfg ? 'ui' : 'none'),
    host:       cfg?.host || '',
    envOverride: Boolean(process.env.SMTP_HOST),
  })
})

// ── Storage-Backend-Info (für Wartungs-Tab) ──
router.get('/api/storage-info', requireAuth, authorize('admin'), (req, res) => {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  // Prüfen ob .env bereits sqlite enthält aber Prozess noch mit json läuft
  let envBackend = backend
  try {
    const envFile = path.join(__dirname, '../../.env')
    const content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
    const match = content.match(/^\s*STORAGE_BACKEND\s*=\s*(\w+)/m)
    if (match) envBackend = match[1].toLowerCase()
  } catch {}
  res.json({
    backend,
    envBackend,
    restartPending: envBackend !== backend,
  })
})

// ── KI-Einstellungen ──
router.get('/admin/ai-settings', requireAuth, authorize('admin'), (req, res) => {
  const cfg = orgSettingsStore.get()
  res.json({
    aiEnabled:    cfg.aiEnabled    ?? true,
    aiOllamaUrl:  cfg.aiOllamaUrl  || '',
    aiEmbedModel: cfg.aiEmbedModel || '',
  })
})

router.put('/admin/ai-settings', requireAuth, authorize('admin'), async (req, res) => {
  const { aiEnabled, aiOllamaUrl, aiEmbedModel } = req.body || {}
  const patch = {}
  if (typeof aiEnabled    === 'boolean') patch.aiEnabled    = aiEnabled
  if (typeof aiOllamaUrl  === 'string')  patch.aiOllamaUrl  = aiOllamaUrl.trim()
  if (typeof aiEmbedModel === 'string')  patch.aiEmbedModel = aiEmbedModel.trim()
  const updated = orgSettingsStore.update(patch)
  auditStore.append({ user: req.user, action: 'update', resource: 'ai-settings', detail: `aiEnabled=${updated.aiEnabled}` })
  res.json({ ok: true, aiEnabled: updated.aiEnabled, aiOllamaUrl: updated.aiOllamaUrl, aiEmbedModel: updated.aiEmbedModel })
})

// ── Daten & Wartung ──
router.get('/admin/export', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../../data')
    const jsonFiles = ['templates.json','soa.json','risks.json','entities.json',
      'rbac_users.json','guidance.json','training.json','public-incidents.json',
      'org-settings.json','custom-lists.json','audit-log.json']
    const bundle = { exportedAt: nowISO(), files: {} }
    for (const f of jsonFiles) {
      const fp = path.join(dataDir, f)
      try { bundle.files[f] = JSON.parse(fs.readFileSync(fp, 'utf8')) } catch {}
    }
    const gdprDir = path.join(dataDir, 'gdpr')
    bundle.gdpr = {}
    if (fs.existsSync(gdprDir)) {
      for (const f of fs.readdirSync(gdprDir).filter(x => x.endsWith('.json'))) {
        try { bundle.gdpr[f] = JSON.parse(fs.readFileSync(path.join(gdprDir, f), 'utf8')) } catch {}
      }
    }
    auditStore.append({ user: req.user, action: 'export', resource: 'org', detail: 'Vollexport durchgeführt' })
    res.setHeader('Content-Disposition', `attachment; filename="isms-export-${new Date().toISOString().slice(0,10)}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(bundle)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/admin/maintenance/cleanup', requireAuth, authorize('admin'), (req, res) => {
  const results = { removed: [], errors: [] }
  try {
    const attachDir = path.join(__dirname, '../../data/template-files')
    if (fs.existsSync(attachDir)) {
      const store = require('../db/jsonStore')
      const allTemplates = store.getAll ? store.getAll() : []
      const knownFiles = new Set()
      allTemplates.forEach(t => (t.attachments || []).forEach(a => knownFiles.add(a.filename)))
      fs.readdirSync(attachDir).forEach(f => {
        if (!knownFiles.has(f)) {
          try { fs.unlinkSync(path.join(attachDir, f)); results.removed.push(f) }
          catch (e) { results.errors.push(f) }
        }
      })
    }
  } catch (e) { results.errors.push('template-files: ' + e.message) }
  auditStore.append({ user: req.user, action: 'delete', resource: 'org', detail: `Bereinigung: ${results.removed.length} Dateien entfernt` })
  res.json(results)
})

// ── Demo-Reset ──
router.post('/admin/demo-reset', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const dataDir = DATA_DIR
    const bundle = buildFullExport(dataDir)

    // Clear all module data files (keep soa.json, custom-lists.json, org-settings.json)
    const filesToClear = [
      { file: 'templates.json',       empty: [] },
      { file: 'risks.json',           empty: [] },
      { file: 'entities.json',        empty: [] },
      { file: 'guidance.json',        empty: [] },
      { file: 'training.json',        empty: [] },
      { file: 'public-incidents.json',empty: [] },
      { file: 'audit-log.json',       empty: [] },
      { file: 'goals.json',           empty: [] },
      { file: 'assets.json',          empty: [] },
      { file: 'bcm.json',             empty: { bia: [], plans: [], exercises: [] } },
      { file: 'suppliers.json',       empty: [] },
      { file: 'governance.json',      empty: { reviews: [], actions: [], meetings: [] } },
    ]
    for (const { file, empty } of filesToClear) {
      const fp = path.join(dataDir, file)
      if (fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(empty, null, 2))
    }

    // Clear GDPR files
    const gdprDir = path.join(dataDir, 'gdpr')
    if (fs.existsSync(gdprDir)) {
      for (const f of fs.readdirSync(gdprDir).filter(x => x.endsWith('.json'))) {
        const fp = path.join(gdprDir, f)
        let content
        try { content = JSON.parse(fs.readFileSync(fp, 'utf8')) } catch { content = [] }
        fs.writeFileSync(fp, JSON.stringify(Array.isArray(content) ? [] : {}, null, 2))
      }
    }

    // Clear Legal files
    const legalDir = path.join(dataDir, 'legal')
    if (fs.existsSync(legalDir)) {
      for (const f of fs.readdirSync(legalDir).filter(x => x.endsWith('.json'))) {
        fs.writeFileSync(path.join(legalDir, f), JSON.stringify([], null, 2))
      }
    }

    // Reset users: delete all except admin, reset admin to adminpass with no 2FA
    const rbac = require('../rbacStore')
    for (const u of rbac.getAllUsers()) {
      if (u.username !== 'admin') rbac.deleteUser(u.username)
    }
    await rbac.setPasswordHash('admin', 'adminpass')
    rbac.setUserTotpSecret('admin', null)

    // Write demo-reset flag; remove demo-lang flag so next admin login can pick language again
    fs.writeFileSync(FLAG_FILE, nowISO())
    if (fs.existsSync(DEMO_LANG_FILE)) try { fs.unlinkSync(DEMO_LANG_FILE) } catch {}

    // Auf SQLite-Backend umstellen (falls noch nicht gesetzt)
    const envFile = path.join(__dirname, '../../.env')
    let envSwitched = false
    let restartRequired = false
    try {
      let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
      const currentBackend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()

      // Ersetze oder ergänze STORAGE_BACKEND=sqlite
      if (/^#?\s*STORAGE_BACKEND\s*=/m.test(envContent)) {
        envContent = envContent.replace(/^#?\s*STORAGE_BACKEND\s*=.*/m, 'STORAGE_BACKEND=sqlite')
      } else {
        envContent += '\nSTORAGE_BACKEND=sqlite\n'
      }
      fs.writeFileSync(envFile, envContent)
      envSwitched = true

      // SQLite-DB löschen damit sie sauber neu angelegt wird
      const dbFile = path.join(dataDir, 'isms.db')
      if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile)

      // Neustart nötig wenn aktuell JSON läuft
      restartRequired = currentBackend !== 'sqlite'
    } catch (e) {
      console.warn('[demo-reset] .env konnte nicht auf SQLite umgestellt werden:', e.message)
    }

    auditStore.append({ user: req.user, action: 'demo_reset', resource: 'org', detail: 'Demo-Reset — alle Moduldaten geleert, Benutzer zurückgesetzt, STORAGE_BACKEND=sqlite gesetzt' })
    res.setHeader('Content-Disposition', `attachment; filename="isms-demo-export-${new Date().toISOString().slice(0,10)}.json"`)
    res.setHeader('Content-Type', 'application/json')
    // restartRequired im Header mitgeben damit das Frontend informieren kann
    res.setHeader('X-Restart-Required', restartRequired ? '1' : '0')
    res.setHeader('X-Env-Switched', envSwitched ? '1' : '0')
    res.json(bundle)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Demo-Import ──
router.post('/admin/demo-import', requireAuth, authorize('admin'), express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const bundle = req.body
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({ error: 'Ungültiges Bundle-Format' })
    }
    const dataDir = DATA_DIR
    const protectedFiles = new Set(['soa.json', 'custom-lists.json', 'org-settings.json', 'rbac_users.json'])

    // Restore module data files
    if (bundle.files && typeof bundle.files === 'object') {
      for (const [filename, content] of Object.entries(bundle.files)) {
        if (protectedFiles.has(filename)) continue
        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Restore GDPR files
    const gdprDir = path.join(dataDir, 'gdpr')
    if (bundle.gdpr && typeof bundle.gdpr === 'object') {
      if (!fs.existsSync(gdprDir)) fs.mkdirSync(gdprDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.gdpr)) {
        fs.writeFileSync(path.join(gdprDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Restore Legal files
    const legalDir = path.join(dataDir, 'legal')
    if (bundle.legal && typeof bundle.legal === 'object') {
      if (!fs.existsSync(legalDir)) fs.mkdirSync(legalDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.legal)) {
        fs.writeFileSync(path.join(legalDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Recreate alice and bob with original demo passwords (2FA cleared by default)
    const rbac = require('../rbacStore')
    const demoUsers = [
      { username: 'alice', email: 'alice@it.example', domain: 'IT',  role: 'dept_head', functions: [], password: 'alicepass', sections: ['Guidance','Risk'] },
      { username: 'bob',   email: 'bob@hr.example',   domain: 'HR',  role: 'reader',    functions: [], password: 'bobpass',   sections: [] },
    ]
    for (const du of demoUsers) {
      if (rbac.getUserByUsername(du.username)) rbac.deleteUser(du.username)
      await rbac.createUser({ username: du.username, email: du.email, domain: du.domain, role: du.role, functions: du.functions, password: du.password })
      rbac.setUserTotpSecret(du.username, null)
    }

    // Remove demo-reset flag if present
    if (fs.existsSync(FLAG_FILE)) fs.unlinkSync(FLAG_FILE)

    // Re-seed guidance docs (architecture, demo-overview, role guides, soa-guide, policy-guide)
    try {
      const gs = require('../db/guidanceStore')
      gs.seedArchitectureDocs()
      gs.seedDemoDoc()
      gs.seedRoleGuides()
      gs.seedSoaGuide()
      gs.seedPolicyGuide()
      gs.seedIsoNotice()
    } catch {}

    auditStore.append({ user: req.user, action: 'demo_import', resource: 'org', detail: 'Demo-Daten importiert — alice/bob wiederhergestellt' })
    res.json({ ok: true, restoredAt: nowISO() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Seed-Sprache aktualisieren (ohne Bundle-Import) ──────────────────────────
router.put('/admin/seed-lang', requireAuth, authorize('admin'), express.json(), (req, res) => {
  const { lang } = req.body || {}
  const SUPPORTED = ['de', 'en', 'fr', 'nl']
  if (!SUPPORTED.includes(lang)) return res.status(400).json({ error: 'Unsupported language' })
  fs.writeFileSync(DEMO_LANG_FILE, JSON.stringify({ lang, setAt: nowISO() }))
  // Re-run all seed functions so guidance docs are immediately updated
  const gs = require('../db/guidanceStore')
  try { gs.seedDemoDoc() }           catch {}
  try { gs.seedRoleGuides() }        catch {}
  try { gs.seedSoaGuide() }          catch {}
  try { gs.seedPolicyGuide() }       catch {}
  try { gs.seedIsoNotice() }         catch {}
  try { gs.seedArchitectureDocs() }  catch {}
  res.json({ ok: true, lang })
})

// ── Demo-Bundle aus Server-Datei laden (First-Login-Sprachauswahl) ──
router.post('/admin/demo-load-bundle', requireAuth, authorize('admin'), express.json(), async (req, res) => {
  try {
    const { lang } = req.body || {}
    const SUPPORTED = ['de', 'en', 'fr', 'nl']

    // Mark lang as set regardless of whether data is loaded (skip = no data, just flag)
    fs.writeFileSync(DEMO_LANG_FILE, JSON.stringify({ lang: lang || 'skip', setAt: nowISO() }))

    if (!lang || lang === 'skip') {
      return res.json({ ok: true, skipped: true })
    }
    if (!SUPPORTED.includes(lang)) {
      return res.status(400).json({ error: 'Unsupported language. Use: de, en, fr, nl' })
    }

    const bundleFile = path.join(BUNDLES_DIR, `${lang}.json`)
    if (!fs.existsSync(bundleFile)) {
      return res.status(404).json({ error: `Demo bundle for '${lang}' not found` })
    }

    const bundle = JSON.parse(fs.readFileSync(bundleFile, 'utf8'))
    const dataDir = DATA_DIR
    const protectedFiles = new Set(['soa.json', 'custom-lists.json', 'org-settings.json', 'rbac_users.json'])

    if (bundle.files && typeof bundle.files === 'object') {
      for (const [filename, content] of Object.entries(bundle.files)) {
        if (protectedFiles.has(filename)) continue
        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(content, null, 2))
      }
    }

    const gdprDir = path.join(dataDir, 'gdpr')
    if (bundle.gdpr && typeof bundle.gdpr === 'object') {
      if (!fs.existsSync(gdprDir)) fs.mkdirSync(gdprDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.gdpr)) {
        fs.writeFileSync(path.join(gdprDir, filename), JSON.stringify(content, null, 2))
      }
    }

    const legalDir = path.join(dataDir, 'legal')
    if (bundle.legal && typeof bundle.legal === 'object') {
      if (!fs.existsSync(legalDir)) fs.mkdirSync(legalDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.legal)) {
        fs.writeFileSync(path.join(legalDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Recreate demo users alice and bob
    const rbac = require('../rbacStore')
    const demoUsers = [
      { username: 'alice', email: 'alice@it.example', domain: 'IT', role: 'dept_head', functions: [], password: 'alicepass', sections: ['Guidance','Risk'] },
      { username: 'bob',   email: 'bob@hr.example',   domain: 'HR', role: 'reader',   functions: [], password: 'bobpass',   sections: [] },
    ]
    for (const du of demoUsers) {
      if (rbac.getUserByUsername(du.username)) rbac.deleteUser(du.username)
      await rbac.createUser({ username: du.username, email: du.email, domain: du.domain, role: du.role, functions: du.functions, password: du.password })
      rbac.setUserTotpSecret(du.username, null)
    }

    // Re-seed guidance docs (architecture, demo-overview, role guides, soa-guide, policy-guide)
    try {
      const gs = require('../db/guidanceStore')
      gs.seedArchitectureDocs()
      gs.seedDemoDoc()
      gs.seedRoleGuides()
      gs.seedSoaGuide()
      gs.seedPolicyGuide()
      gs.seedIsoNotice()
    } catch {}

    auditStore.append({ user: req.user, action: 'demo_import', resource: 'org', detail: `Demo-Bundle '${lang}' geladen` })
    res.json({ ok: true, lang, loadedAt: nowISO() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
