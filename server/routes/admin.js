// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const productionState = require('../productionState')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { requireAuth, authorize, ROLE_RANK } = require('../auth')
const { langOf } = require('../i18n')
const orgSettingsStore = require('../db/orgSettingsStore')
const twoFactorPolicy = require('../twoFactorPolicy')
const auditStore       = require('../db/auditStore')
const customListsStore = require('../db/customListsStore')
const assetStore       = require('../db/assetStore')
const storage          = require('../storage')
const mailer           = require('../mailer')
const orgLogo          = require('../orgLogo')

function nowISO() { return new Date().toISOString() }

// Konten des Demosets (öffentlich bekannte Demo-Passwörter, nur für Demo). carla (CISO) und dana (DSB) sind getrennte Personen ohne Administratorrechte.
const DEMO_USERS = [
  { username: 'alice', email: 'alice@it.example',       domain: 'IT',       role: 'dept_head',    functions: [],         password: 'alicepass' },
  { username: 'bob',   email: 'bob@hr.example',         domain: 'HR',       role: 'reader',       functions: [],         password: 'bobpass' },
  { username: 'carla', email: 'carla@security.example', domain: 'Security', role: 'contentowner', functions: ['ciso'],   password: 'carlapass' },
  { username: 'dana',  email: 'dana@privacy.example',   domain: 'Privacy',  role: 'contentowner', functions: ['dso'],    password: 'danapass' },
]

const DATA_DIR        = require('../paths').dataDir()
const FLAG_FILE       = path.join(DATA_DIR, '.demo_reset_done')
const DEMO_LANG_FILE  = path.join(DATA_DIR, '.demo_lang_set')
const BUNDLES_DIR     = require('../paths').staticDataPath('demo-bundles')   // mitgelieferte Demo-Bundles (Programmstand)

/**
 * Dateinamen aus Import-Bundles: nur einfache *.json-Namen, ohne Pfadanteile.
 * Sonst könnte ein manipuliertes Bundle ("../…") außerhalb von data/ schreiben.
 */
function isSafeJsonName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(name) && !name.includes('..')
}

const { redactOrgSettings, prepareOrgPatch, sanitizeExportFile } = require('../orgSecrets')

function buildFullExport(dataDir) {
  const jsonFiles = [
    'templates.json','soa.json','soa-frameworks.json','risks.json','entities.json',
    'rbac_users.json','guidance.json','training.json','public-incidents.json',
    'org-settings.json','custom-lists.json','audit-log.json',
    'goals.json','measures.json','assets.json','bcm.json','suppliers.json','governance.json',
    'findings.json','audits.json','audit-programs.json'
  ]
  const bundle = { exportedAt: nowISO(), version: '1.28', files: {}, gdpr: {}, legal: {} }
  for (const f of jsonFiles) {
    try { bundle.files[f] = sanitizeExportFile(f, JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'))) } catch {}
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
  if (!password || password.length < 8) return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' })
  if (productionState.isSeedPassword(password) && productionState.isProduction()) return res.status(400).json({ error: 'Dieses Passwort ist ein bekanntes Demo-Passwort und im Produktivbetrieb nicht erlaubt.', code: 'PASSWORD_KNOWN_DEMO' })
  try {
    // Das Anfangspasswort kennt der Administrator → der neue Nutzer muss es beim ersten Login ändern
    const user = await require('../rbacStore').createUser({ username, email, domain, role, functions, password, mustChangePassword: true })
    const fnStr = (functions||[]).join(', ') || '—'
    await auditStore.append({ user: req.user, action: 'create', resource: 'user', resourceId: username, detail: `Rolle: ${role} | Funktionen: ${fnStr}` })
    res.status(201).json(user)
  } catch (e) {
    res.status(409).json({ error: e.message })
  }
})

// Administratoren: Konten, die im Produktivbetrieb noch ein Demo-Passwort tragen (gesperrt, Passwort muss neu gesetzt werden)
router.get('/admin/security-notice', requireAuth, authorize('admin'), async (req, res) => {
  res.json({ seedAccounts: await productionState.seedPasswordAccounts() })
})

router.put('/admin/users/:username', requireAuth, authorize('admin'), async (req, res) => {
  const { username } = req.params
  const { email, domain, role, functions, password } = req.body || {}
  if (password && password.length < 8) return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' })
  if (password && productionState.isSeedPassword(password) && productionState.isProduction()) return res.status(400).json({ error: 'Dieses Passwort ist ein bekanntes Demo-Passwort und im Produktivbetrieb nicht erlaubt.', code: 'PASSWORD_KNOWN_DEMO' })
  // Ein vom Administrator gesetztes Passwort (Zurücksetzen) muss der Nutzer beim nächsten Login ändern; das eigene nicht
  const updated = await require('../rbacStore').updateUser(username, { email, domain, role, functions, password: password || undefined, mustChangePassword: username !== req.user }, { keepJti: username === req.user ? req.jti : undefined })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  const fnStr = (functions||[]).join(', ') || '—'
  await auditStore.append({ user: req.user, action: 'update', resource: 'user', resourceId: username, detail: role ? `Neue Rolle: ${role} | Funktionen: ${fnStr}` : 'Profil aktualisiert' })
  res.json(updated)
})

router.delete('/admin/users/:username', requireAuth, authorize('admin'), async (req, res) => {
  const { username } = req.params
  if (username === req.user) return res.status(400).json({ error: 'Eigenen Account nicht löschbar' })
  const ok = require('../rbacStore').deleteUser(username)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  await auditStore.append({ user: req.user, action: 'delete', resource: 'user', resourceId: username })
  res.json({ deleted: true })
})

// ── Custom editable lists ──
router.get('/admin/lists', requireAuth, async (req, res) => {
  res.json(await customListsStore.getAll())
})
router.put('/admin/list/:listId', requireAuth, authorize('admin'), async (req, res) => {
  const { listId } = req.params
  const items = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Body must be an array' })

  // Asset-Typen (#64) — Reihenfolge ist wichtig: erst prüfen, ob die Liste
  // überhaupt wohlgeformt ist, dann ob sie etwas Benutztes entfernt. Andersherum
  // meldete eine kaputte Liste "Typ in Verwendung" statt des echten Fehlers.
  if (listId === 'assetTypes') {
    const invalid = customListsStore.validateList(listId, items)
    if (invalid.length) return res.status(400).json({ error: 'Invalid list', details: invalid })

    // Ein Typ, der noch an Assets hängt, darf nicht verschwinden — sonst
    // zeigen bestehende Assets auf einen Typ, den es nicht mehr gibt.
    const inUse = await assetsUsingRemovedTypes(items)
    if (inUse.length) {
      return res.status(409).json({
        error: 'asset types still in use',
        inUse,   // [{ type, label, count }]
      })
    }
  }

  const result = await customListsStore.setList(listId, items)
  if (result === null) return res.status(404).json({ error: 'Unknown list id' })
  if (result && result.errors) return res.status(400).json({ error: 'Invalid list', details: result.errors })
  res.json(result)
})

/**
 * Ermittelt, welche der bisherigen Asset-Typen in der neuen Liste fehlen und
 * noch von Assets verwendet werden. Leeres Array = Speichern ist unbedenklich.
 */
async function assetsUsingRemovedTypes(newItems) {
  const keptIds = new Set((newItems || []).map(i => i && i.id).filter(Boolean))
  const current = await customListsStore.getList('assetTypes') || []
  const removed = current.filter(t => !keptIds.has(t.id))
  if (!removed.length) return []

  const assets = await assetStore.getAll({}) || []
  return removed
    .map(t => ({
      type:  t.id,
      label: t.label,
      count: assets.filter(a => a.type === t.id).length,
    }))
    .filter(r => r.count > 0)
}
router.post('/admin/list/:listId/reset', requireAuth, authorize('admin'), async (req, res) => {
  const result = await customListsStore.resetList(req.params.listId)
  if (result === null) return res.status(404).json({ error: 'Unknown list id' })
  res.json(result)
})

// ── Organisationseinstellungen ──
// GHSA-63xg-pg3x-g36f: alle Rollen brauchen diesen Endpunkt beim Login (navOrder,
// Splash-Settings) — deshalb bleibt er bei 'reader', aber Zugangsdaten werden für
// Nicht-Admins herausgefiltert statt den kompletten Endpunkt zu sperren.
router.get('/admin/org-settings', requireAuth, authorize('reader'), async (req, res) => {
  // Dienst-Zugangsdaten (SMTP-Passwort, WebDAV-App-Passwort) werden nie ausgeliefert, auch nicht an Administratoren:
  // sie sind nur schreibbar; die Ausgabe nennt nur, ob sie gesetzt sind (passSet, appPasswordSet).
  res.json({ ...redactOrgSettings(await orgSettingsStore.get()), logo: orgLogo.info() })
})
router.put('/admin/org-settings', requireAuth, authorize('admin'), async (req, res) => {
  // leeres Geheimnis = unverändert, clearPass/clearAppPassword = entfernen (siehe server/orgSecrets.js)
  const updated = await orgSettingsStore.update(prepareOrgPatch(req.body))
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Organisationseinstellungen aktualisiert' })
  res.json(redactOrgSettings(updated))
})

// Modul-Konfiguration
router.get('/admin/modules', requireAuth, authorize('reader'), async (req, res) => {
  const s = await orgSettingsStore.get()
  res.json(s.modules || {})
})
router.put('/admin/modules', requireAuth, authorize('admin'), async (req, res) => {
  const updated = await orgSettingsStore.update({ modules: req.body })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'modules', detail: 'Modul-Konfiguration aktualisiert' })
  res.json(updated.modules)
})

// 2FA-Enforcement
// nur der Administrationsbereich liest die 2FA-Pflicht
router.get('/admin/security', requireAuth, authorize('admin'), async (req, res) => {
  const s = await orgSettingsStore.get()
  const sum = twoFactorPolicy.summary()
  res.json({ require2FA: s.require2FA === true, usersWithout2FA: sum.without2FA.length, usersTotal: sum.total, adminsWith2FA: sum.adminsWith2FA })
})
router.put('/admin/security', requireAuth, authorize('admin'), async (req, res) => {
  const { require2FA } = req.body || {}
  // Schutz vor Selbst-Aussperrung: Die Pflicht lässt sich nur einschalten, wenn der handelnde Administrator selbst eine eingerichtete 2FA hat
  // (sonst kann sich bei der nächsten Anmeldung niemand mehr einloggen, der Notweg ist die Kommandozeile: scripts/emergency-2fa.js). Ausschalten geht immer.
  if (require2FA === true && !twoFactorPolicy.has2FA(require('../rbacStore').getUserByUsername(req.user))) {
    return res.status(409).json({ error: 'Set up two-factor authentication for your own account first; otherwise you would lock yourself out.', code: 'ENFORCE_2FA_SELF', usersWithout2FA: twoFactorPolicy.summary().without2FA.length })
  }
  const updated = await orgSettingsStore.update({ require2FA: !!require2FA })
  await auditStore.append({ user: req.user, action: 'settings', resource: 'security', detail: `2FA-Pflicht: ${updated.require2FA ? 'aktiviert' : 'deaktiviert'}` })
  res.json({ require2FA: updated.require2FA, usersWithout2FA: twoFactorPolicy.summary().without2FA.length })
})

// Rollenspezifische Einstellungen
router.get('/admin/role-settings', requireAuth, authorize('contentowner'), async (req, res) => {
  const s = await orgSettingsStore.get()
  res.json({
    cisoSettings:     s.cisoSettings,
    gdpoSettings:     s.gdpoSettings,
    icsSettings:      s.icsSettings,
    revisionSettings: s.revisionSettings,
    qmSettings:       s.qmSettings,
  })
})
router.put('/admin/role-settings', requireAuth, authorize('contentowner'), async (req, res) => {
  const updated = await orgSettingsStore.update(req.body)
  await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'Rolleneinstellungen aktualisiert' })
  res.json(updated)
})

// ── Audit-Log ──
router.get('/admin/audit-log', requireAuth, authorize('admin'), async (req, res) => {
  const { user, action, resource, from, to, limit, offset } = req.query
  res.json(await auditStore.query({
    user, action, resource, from, to,
    limit:  limit  ? parseInt(limit)  : 200,
    offset: offset ? parseInt(offset) : 0,
  }))
})
router.delete('/admin/audit-log', requireAuth, authorize('admin'), async (req, res) => {
  await auditStore.clear()
  await auditStore.append({ user: req.user, action: 'delete', resource: 'audit', detail: 'Audit-Log geleert' })
  res.json({ ok: true })
})

// ── E-Mail Test ──
router.post('/admin/email/test', requireAuth, authorize('admin'), async (req, res) => {
  const { to } = req.body
  if (!to) return res.status(400).json({ error: 'Empfängeradresse fehlt' })
  try {
    await mailer.sendTestMail(to, langOf(req))
    await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: `Test-Mail an ${to} gesendet` })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── E-Mail SMTP-Status ──
router.get('/admin/email/status', requireAuth, authorize('admin'), async (req, res) => {
  const cfg = await mailer.getSmtpConfig()
  res.json({
    configured: Boolean(cfg),
    source:     process.env.SMTP_HOST ? 'env' : (cfg ? 'ui' : 'none'),
    host:       cfg?.host || '',
    envOverride: Boolean(process.env.SMTP_HOST),
  })
})

// ── Update-Check (nur Hinweis, kein automatisches Anwenden) ──
router.get('/admin/update-check', requireAuth, authorize('admin'), async (req, res) => {
  const result = await require('../updateCheck').checkForUpdate(req.query.force === 'true')
  res.json(result)
})

// ── WebDAV-Verbindungstest (Nextcloud/ownCloud-Publish, #66) ──
router.post('/admin/webdav/test', requireAuth, authorize('admin'), async (req, res) => {
  const webdav = require('../webdav')
  const { baseUrl, username, appPassword, folder } = req.body || {}
  // Das Passwort ist nur schreibbar: Bleibt das Feld leer, wird das gespeicherte benutzt – aber nur für genau die gespeicherte
  // Adresse und denselben Benutzer. Sonst ließe sich das gespeicherte Passwort an eine fremde Adresse schicken und so auslesen.
  let pw = appPassword
  if (!pw) {
    const stored = (await orgSettingsStore.get()).webdavSettings || {}
    if (stored.appPassword && baseUrl === stored.baseUrl && username === stored.username) pw = stored.appPassword
  }
  const cfg = { baseUrl, username, appPassword: pw, folder: folder || 'ISMS-Richtlinien' }
  const result = await webdav.testConnection(cfg)
  if (result.ok) {
    await auditStore.append({ user: req.user, action: 'settings', resource: 'org', detail: 'WebDAV-Verbindungstest erfolgreich' })
  }
  res.json(result)
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
router.get('/admin/ai-settings', requireAuth, authorize('admin'), async (req, res) => {
  const cfg = await orgSettingsStore.get()
  res.json({
    aiEnabled:    cfg.aiEnabled    ?? true,
    aiOllamaUrl:  cfg.aiOllamaUrl  || '',
    aiEmbedModel: cfg.aiEmbedModel || '',
    aiGenModel:   cfg.aiGenModel   || '',
    aiApiKeySet:  typeof cfg.aiApiKey === 'string' && cfg.aiApiKey.length > 0,          // der Schlüssel selbst wird nie ausgeliefert
    aiApiKeyFromEnv: !!(process.env.OLLAMA_API_KEY || '').trim(),                      // Rückfall aus der Umgebung (OLLAMA_API_KEY) aktiv
  })
})

router.put('/admin/ai-settings', requireAuth, authorize('admin'), async (req, res) => {
  const { aiEnabled, aiOllamaUrl, aiEmbedModel, aiGenModel, aiApiKey, clearAiApiKey } = req.body || {}
  const patch = {}
  if (typeof aiEnabled    === 'boolean') patch.aiEnabled    = aiEnabled
  if (typeof aiOllamaUrl  === 'string')  patch.aiOllamaUrl  = aiOllamaUrl.trim()
  if (typeof aiEmbedModel === 'string')  patch.aiEmbedModel = aiEmbedModel.trim()
  if (typeof aiGenModel   === 'string')  patch.aiGenModel   = aiGenModel.trim()
  // API-Schlüssel: leer = unverändert; neuer Wert ersetzt; clearAiApiKey entfernt. Muss in eine Kopfzeile passen (kein Zeilenumbruch).
  let keyAction = ''
  if (clearAiApiKey === true) { patch.aiApiKey = ''; keyAction = 'entfernt' }
  else if (typeof aiApiKey === 'string' && aiApiKey.trim() !== '') {
    const v = require('../ai/ollamaConfig').validateApiKey(aiApiKey)
    if (v.code) return res.status(400).json({ error: v.code === 'too_long' ? 'The API key is too long (max 512 characters)' : 'The API key may only contain visible ASCII characters (no spaces or line breaks)', code: v.code })
    patch.aiApiKey = v.value; keyAction = 'gesetzt'
  }
  const updated = await orgSettingsStore.update(patch)
  await auditStore.append({ user: req.user, action: 'update', resource: 'ai-settings', detail: `aiEnabled=${updated.aiEnabled}${keyAction ? `, API-Schlüssel ${keyAction}` : ''}` })   // nie der Wert
  res.json({ ok: true, aiEnabled: updated.aiEnabled, aiOllamaUrl: updated.aiOllamaUrl, aiEmbedModel: updated.aiEmbedModel, aiGenModel: updated.aiGenModel, aiApiKeySet: typeof updated.aiApiKey === 'string' && updated.aiApiKey.length > 0 })
})

// ── Daten & Wartung ──
router.get('/admin/export', requireAuth, authorize('admin'), async (req, res) => {
  try {
    const dataDir = DATA_DIR   // (früher fest ../../data: ignorierte DATA_DIR)
    const jsonFiles = ['templates.json','soa.json','soa-frameworks.json','risks.json','entities.json',
      'rbac_users.json','guidance.json','training.json','public-incidents.json',
      'org-settings.json','custom-lists.json','audit-log.json']
    const bundle = { exportedAt: nowISO(), files: {} }
    for (const f of jsonFiles) {
      const fp = path.join(dataDir, f)
      try { bundle.files[f] = sanitizeExportFile(f, JSON.parse(fs.readFileSync(fp, 'utf8'))) } catch {}
    }
    const gdprDir = path.join(dataDir, 'gdpr')
    bundle.gdpr = {}
    if (fs.existsSync(gdprDir)) {
      for (const f of fs.readdirSync(gdprDir).filter(x => x.endsWith('.json'))) {
        try { bundle.gdpr[f] = JSON.parse(fs.readFileSync(path.join(gdprDir, f), 'utf8')) } catch {}
      }
    }
    await auditStore.append({ user: req.user, action: 'export', resource: 'org', detail: 'Vollexport durchgeführt' })
    res.setHeader('Content-Disposition', `attachment; filename="isms-export-${new Date().toISOString().slice(0,10)}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(bundle)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/admin/maintenance/cleanup', requireAuth, authorize('admin'), async (req, res) => {
  const results = { removed: [], errors: [] }
  try {
    const attachDir = require('../paths').dataPath('template-files')
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
  await auditStore.append({ user: req.user, action: 'delete', resource: 'org', detail: `Bereinigung: ${results.removed.length} Dateien entfernt` })
  res.json(results)
})

// ── Demo-Reset ──
router.post('/admin/demo-reset', requireAuth, authorize('admin'), async (req, res) => {
  try {
    // Der Reset leert die JSON-Dateien. Unter sqlite/mariadb/postgres wären die Daten in der Datenbank nicht betroffen — klar ablehnen (wie der Demo-Import).
    const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
    if (backend !== 'json') {
      return res.status(409).json({ error: `Demo reset is only available with STORAGE_BACKEND=json (current: ${backend}). It is a demo function; for other backends use scripts/prepare-production.js or empty the database.` })
    }
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
      { file: 'measures.json',        empty: [] },
      { file: 'assets.json',          empty: [] },
      { file: 'bcm.json',             empty: { bia: [], plans: [], exercises: [], requirements: [], assessments: [] } },
      { file: 'suppliers.json',       empty: [] },
      { file: 'audits.json',          empty: [] },
      { file: 'audit-programs.json',  empty: [] },
      { file: 'governance.json',      empty: { reviews: [], actions: [], meetings: [] } },
    ]
    for (const { file, empty } of filesToClear) {
      const fp = path.join(dataDir, file)
      if (fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(empty, null, 2))
    }

    // Dateianhänge der Schulungen gehören zu den Demo-Daten (training.json ist geleert) — sonst blieben verwaiste Dateien zurück
    const trainingFilesDir = path.join(dataDir, 'training-files')
    if (fs.existsSync(trainingFilesDir)) {
      for (const f of fs.readdirSync(trainingFilesDir)) { try { fs.unlinkSync(path.join(trainingFilesDir, f)) } catch { /* schon weg */ } }
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
    // Übergabe: Das Anfangspasswort gilt nur für die erste Anmeldung und muss sofort geändert werden (mustChange); danach ist es gesperrt.
    await rbac.setPasswordHash('admin', 'adminpass', { mustChange: true })
    rbac.setUserTotpSecret('admin', null)
    productionState.markProduction()   // dauerhafte Markierung „Produktivbetrieb“ (Seed-Passwörter gelten nie wieder)

    // Demo-Logo entfernen; der Hinweis „Firmenlogo setzen“ bleibt aktiv, bis ein eigenes Logo hochgeladen ist
    const logoRequired = orgLogo.prepareForProduction()

    // Write demo-reset flag; remove demo-lang flag so next admin login can pick language again
    fs.writeFileSync(FLAG_FILE, nowISO())
    if (fs.existsSync(DEMO_LANG_FILE)) try { fs.unlinkSync(DEMO_LANG_FILE) } catch {}

    // Das Speicher-Backend und die .env bleiben unverändert (der Mobile-Sync läuft nur mit STORAGE_BACKEND=json); die Speicher im Prozess
    // lesen ihre Daten neu ein, ein Neustart des Servers ist nicht nötig.
    await require('../reloadStores').reloadAll()

    await auditStore.append({ user: req.user, action: 'demo_reset', resource: 'org', detail: 'Demo-Reset — alle Moduldaten geleert, Benutzer zurückgesetzt, Speicher-Backend unverändert | ' + (req.get('X-Guide-Read') === '1' ? 'Anleitung zum Produktivbetrieb angezeigt und bestätigt' : 'Anleitung nicht bestätigt (direkter API-Aufruf)') })
    res.setHeader('Content-Disposition', `attachment; filename="isms-demo-export-${new Date().toISOString().slice(0,10)}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Logo-Required', logoRequired ? '1' : '0')
    res.json(bundle)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Demo-Import ──
router.post('/admin/demo-import', requireAuth, authorize('admin'), express.json({ limit: '50mb' }), async (req, res) => {
  try {
    // Demo-Funktion, kein Backup/Restore: schreibt JSON-Dateien. Unter sqlite/mariadb/postgres würden sie nie gelesen –
    // deshalb klar ablehnen statt still ins Leere zu schreiben (#98).
    const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
    if (backend !== 'json') {
      return res.status(409).json({ error: `Demo import is only available with STORAGE_BACKEND=json (current: ${backend}). It is a demo function and not a backup or migration tool.` })
    }
    const bundle = req.body
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({ error: 'Ungültiges Bundle-Format' })
    }
    const dataDir = DATA_DIR
    const protectedFiles = new Set(['soa.json', 'soa-frameworks.json', 'custom-lists.json', 'org-settings.json', 'rbac_users.json'])

    // Restore module data files
    if (bundle.files && typeof bundle.files === 'object') {
      for (const [filename, content] of Object.entries(bundle.files)) {
        if (!isSafeJsonName(filename)) continue
        if (protectedFiles.has(filename)) continue
        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Restore GDPR files
    const gdprDir = path.join(dataDir, 'gdpr')
    if (bundle.gdpr && typeof bundle.gdpr === 'object') {
      if (!fs.existsSync(gdprDir)) fs.mkdirSync(gdprDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.gdpr)) {
        if (!isSafeJsonName(filename)) continue
        fs.writeFileSync(path.join(gdprDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Restore Legal files
    const legalDir = path.join(dataDir, 'legal')
    if (bundle.legal && typeof bundle.legal === 'object') {
      if (!fs.existsSync(legalDir)) fs.mkdirSync(legalDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.legal)) {
        if (!isSafeJsonName(filename)) continue
        fs.writeFileSync(path.join(legalDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Demo-Konten (alice, bob, carla, dana) mit den bekannten Demo-Passwörtern neu anlegen (2FA zurückgesetzt)
    const rbac = require('../rbacStore')
    for (const du of DEMO_USERS) {
      if (rbac.getUserByUsername(du.username)) rbac.deleteUser(du.username)
      await rbac.createUser({ username: du.username, email: du.email, domain: du.domain, role: du.role, functions: du.functions, password: du.password })
      rbac.setUserTotpSecret(du.username, null)
    }

    // Remove demo-reset flag if present
    if (fs.existsSync(FLAG_FILE)) fs.unlinkSync(FLAG_FILE)
    // Der Import stellt die Demo wieder her (Demo-Konten mit öffentlichen Passwörtern): zurück in den Demozustand
    productionState.clearProduction()

    // Re-seed guidance docs (architecture, demo-overview, role guides, soa-guide, policy-guide)
    try {
      const gs = require('../db/guidanceStore')
      await gs.seedArchitectureDocs()
      await gs.seedDemoDoc()
      await gs.seedRoleGuides()
      await gs.seedSoaGuide()
      await gs.seedPolicyGuide()
      await gs.seedIsoNotice()
    } catch {}

    await adoptRegisterData()
    await auditStore.append({ user: req.user, action: 'demo_import', resource: 'org', detail: 'Demo-Daten importiert — alice/bob wiederhergestellt' })
    await require('../reloadStores').reloadAll()   // Daten sofort sichtbar, kein Neustart nötig
    res.json({ ok: true, restoredAt: nowISO() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Seed-Sprache aktualisieren (ohne Bundle-Import) ──────────────────────────
router.put('/admin/seed-lang', requireAuth, authorize('admin'), express.json(), async (req, res) => {
  const { lang } = req.body || {}
  const SUPPORTED = require('../languages').completeCodes()
  if (!SUPPORTED.includes(lang)) return res.status(400).json({ error: 'Unsupported language' })
  fs.writeFileSync(DEMO_LANG_FILE, JSON.stringify({ lang, setAt: nowISO() }))
  // Re-run all seed functions so guidance docs are immediately updated
  const gs = require('../db/guidanceStore')
  try { await gs.seedDemoDoc() }           catch {}
  try { await gs.seedRoleGuides() }        catch {}
  try { await gs.seedSoaGuide() }          catch {}
  try { await gs.seedPolicyGuide() }       catch {}
  try { await gs.seedIsoNotice() }         catch {}
  try { await gs.seedArchitectureDocs() }  catch {}
  res.json({ ok: true, lang })
})


// Nach dem Laden von Demo-Daten (Bundle, Import): Maßnahmen, die in den geladenen Dateien noch eingebettet sind (TOMs, Risiko-Behandlungen,
// Feststellungs- und Governance-Maßnahmen), sofort ins Maßnahmen-Register übernehmen – nicht erst beim nächsten Serverstart.
async function adoptRegisterData() {
  try { await require('../db/measureMigration').run() } catch (e) { console.warn('[migration] Übernahme nach Demo-Import fehlgeschlagen:', e.message) }
}
// ── Demo-Bundle aus Server-Datei laden (First-Login-Sprachauswahl) ──
router.post('/admin/demo-load-bundle', requireAuth, authorize('admin'), express.json(), async (req, res) => {
  try {
    const { lang } = req.body || {}
    const SUPPORTED = require('../languages').completeCodes()

    // Mark lang as set regardless of whether data is loaded (skip = no data, just flag)
    fs.writeFileSync(DEMO_LANG_FILE, JSON.stringify({ lang: lang || 'skip', setAt: nowISO() }))

    if (!lang || lang === 'skip') {
      return res.json({ ok: true, skipped: true })
    }
    if (!SUPPORTED.includes(lang)) {
      return res.status(400).json({ error: 'Unsupported language. Use: de, en, fr, nl, hu' })
    }

    let bundleFile = path.join(BUNDLES_DIR, `${lang}.json`)
    if (!fs.existsSync(bundleFile)) bundleFile = path.join(BUNDLES_DIR, 'en.json')   // Sprache ohne eigenes Demo-Bundle
    if (!fs.existsSync(bundleFile)) {
      return res.status(404).json({ error: `Demo bundle for '${lang}' not found` })
    }

    const bundle = JSON.parse(fs.readFileSync(bundleFile, 'utf8'))
    const dataDir = DATA_DIR
    const protectedFiles = new Set(['soa.json', 'soa-frameworks.json', 'custom-lists.json', 'org-settings.json', 'rbac_users.json'])
    // Das Register gehört zu den Demo-Daten: ein neu geladenes Bundle ersetzt es (sonst blieben Maßnahmen zu verschwundenen Risiken stehen)
    if ((process.env.STORAGE_BACKEND || 'json').toLowerCase() === 'json' && !(bundle.files && bundle.files['measures.json'])) fs.writeFileSync(path.join(dataDir, 'measures.json'), '[]')

    if (bundle.files && typeof bundle.files === 'object') {
      for (const [filename, content] of Object.entries(bundle.files)) {
        if (!isSafeJsonName(filename)) continue
        if (protectedFiles.has(filename)) continue
        fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(content, null, 2))
      }
    }

    const gdprDir = path.join(dataDir, 'gdpr')
    if (bundle.gdpr && typeof bundle.gdpr === 'object') {
      if (!fs.existsSync(gdprDir)) fs.mkdirSync(gdprDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.gdpr)) {
        if (!isSafeJsonName(filename)) continue
        fs.writeFileSync(path.join(gdprDir, filename), JSON.stringify(content, null, 2))
      }
    }

    const legalDir = path.join(dataDir, 'legal')
    if (bundle.legal && typeof bundle.legal === 'object') {
      if (!fs.existsSync(legalDir)) fs.mkdirSync(legalDir, { recursive: true })
      for (const [filename, content] of Object.entries(bundle.legal)) {
        if (!isSafeJsonName(filename)) continue
        fs.writeFileSync(path.join(legalDir, filename), JSON.stringify(content, null, 2))
      }
    }

    // Mitgeliefertes ISMS-Builder-Logo (ein eigenes Logo bleibt)
    orgLogo.installDemoLogo()

    // Demo-Konten (alice, bob, carla, dana) neu anlegen
    const rbac = require('../rbacStore')
    for (const du of DEMO_USERS) {
      if (rbac.getUserByUsername(du.username)) rbac.deleteUser(du.username)
      await rbac.createUser({ username: du.username, email: du.email, domain: du.domain, role: du.role, functions: du.functions, password: du.password })
      rbac.setUserTotpSecret(du.username, null)
    }

    // Re-seed guidance docs (architecture, demo-overview, role guides, soa-guide, policy-guide)
    try {
      const gs = require('../db/guidanceStore')
      await gs.seedArchitectureDocs()
      await gs.seedDemoDoc()
      await gs.seedRoleGuides()
      await gs.seedSoaGuide()
      await gs.seedPolicyGuide()
      await gs.seedIsoNotice()
    } catch {}

    await adoptRegisterData()
    await auditStore.append({ user: req.user, action: 'demo_import', resource: 'org', detail: `Demo-Bundle '${lang}' geladen` })
    await require('../reloadStores').reloadAll()
    res.json({ ok: true, lang, loadedAt: nowISO() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
