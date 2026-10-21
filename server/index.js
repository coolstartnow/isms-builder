// ISMS Builder V 1.29 – API Server (Node.js / Express)
// © 2026 Claude Hecker — AGPL-3.0

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const { requireAuth, authorize, signToken, getSessionFromReq } = require('./auth')
const PORT = process.env.PORT || 3000

// ── Reverse-Proxy-Vertrauen (aus, solange nicht bewusst aktiviert) ──────────
// Ohne dies vertraut Express keinem X-Forwarded-*-Header — req.ip/req.protocol/
// req.hostname spiegeln dann immer die tatsaechliche TCP-Verbindung wider, ein
// Client kann sie nicht faelschen. Wer die App hinter einem Reverse-Proxy
// betreibt (typisch in segmentierten Netzen/DMZ-Aufbauten), muss das bewusst
// per TRUST_PROXY aktivieren, sonst koennte ein Client X-Forwarded-For selbst
// mitschicken und damit die im Audit-Trail gespeicherte IP-Adresse einer
// Richtlinien-Bestaetigung faelschen, oder per X-Forwarded-Host den Link in
// Bestaetigungs-Mails auf eine falsche Domain umleiten.
// TRUST_PROXY=1 fuer "genau ein Reverse-Proxy davor" (Standardfall), eine
// hoehere Zahl fuer mehrere Hops, oder ein Express-kompatibler Wert
// (z.B. eine IP/Subnetz-Liste) — siehe Express-Doku zu `trust proxy`.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY)
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops)
}

// Fehlertexte der API in der Sprache der Oberfläche (X-Lang) bzw. der Organisations-Standardsprache.
// Vor den Body-Parsern, damit auch deren Fehler (zu groß, ungültiges JSON) übersetzt werden (#98); die Middleware braucht den Body nicht.
require('./i18n').installMiddleware(app)

// Sync-Pushes können groß sein: eigener Parser VOR dem globalen (der sonst bei 100 kB mit 413 abweist)
app.use('/sync', express.json({ limit: '20mb' }))
// Demo-Import: Bundles sind groß; der eigene Parser (50 MB, wie in der Route) muss VOR dem globalen stehen, sonst gilt dessen 100-kB-Grenze (#98)
app.use('/admin/demo-import', express.json({ limit: '50mb' }))
app.use(express.json())

// ── UI-Dateien: Login-Seite öffentlich, alles andere nur mit gültigem JWT ──
const uiDir    = path.join(__dirname, '../ui')
const docsDir  = path.join(__dirname, '../docs')
const uiStatic = express.static(uiDir)

const PUBLIC_UI_FILES = new Set([
  'login.html',
  'style.css',
  'logincheck.js',
  'login-submit.js',
  'qr2fa.js',
  'isms-builder-banner.png'
])

app.use('/ui', (req, res, next) => {
  const filename = path.basename(req.path)
  if (filename === 'login.html') {
    // ACHTUNG: clearCookie NUR wenn KEINE gültige Session existiert.
    // Ein bedingungsloses clearCookie löscht die Session auch bei eingeloggten
    // Nutzern (z.B. bfcache-Rückkehr, SPA-Navigation) → alle API-Calls 401.
    // Regressionstest: tests/auth.test.js → "Session-Persistenz"
    const sess = getSessionFromReq(req)
    if (!sess) res.clearCookie('sm_session', { path: '/' })
    res.setHeader('Cache-Control', 'no-store')
    return uiStatic(req, res, next)
  }
  // vendor/ and i18n/ assets are public — required by login page before auth
  if (req.path.startsWith('/vendor/')) return uiStatic(req, res, next)
  if (req.path.startsWith('/i18n/'))   return uiStatic(req, res, next)
  // docs/ served from project root (screenshots, badges etc. referenced in seeded README)
  if (req.path.startsWith('/docs/')) {
    const sess = getSessionFromReq(req)
    if (!sess) return res.redirect('/ui/login.html')
    req.url = req.path.slice('/docs'.length)
    return express.static(docsDir)(req, res, next)
  }
  if (PUBLIC_UI_FILES.has(filename)) return uiStatic(req, res, next)
  const sess = getSessionFromReq(req)
  if (!sess) return res.redirect('/ui/login.html')
  uiStatic(req, res, next)
})

const storage = require('./storage')
const rbacStore = require('./rbacStore')
rbacStore.init()

// Fallback: provide a minimal setUserTotpSecret if not present in rbacStore
try {
  if (typeof rbacStore.setUserTotpSecret !== 'function') {
    const DB_FILE = path.join(__dirname, '../data', 'rbac_users.json')
    rbacStore.setUserTotpSecret = function(username, secret){
      let data = {}
      try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) } catch {}
      data[username] = data[username] || { username }
      data[username].totpSecret = secret
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
      return { username, totpSecret: secret }
    }
  }
} catch (e) {
  // ignore in environments where file IO is restricted
}

// Initialize storage backend
storage.init?.()

// ── Root route ──
// Leitet zur Login-Seite weiter — die eigentliche App liegt unter /ui/.
// Vorher: res.send('ISMS Templates API') → verwirrte Nutzer die localhost:3000 aufriefen.
// Fix für GitHub Issue #11 (dukefleed66, 2026-03-16).
app.get('/', (req, res) => {
  res.redirect('/ui/login.html')
})

// ── Versionsauskunft (kein Auth erforderlich, auch auf der Login-Seite sichtbar) ──
app.get('/api/version', (req, res) => {
  res.json({ version: require('../package.json').version, syncProtocol: 2 })
})

// ── Health Check (kein Auth erforderlich) ──
// Prüft: Express läuft, SQLite erreichbar, JSON-Datei lesbar
// Für Monitoring / Demo-Server-Cron aktivieren
/*
app.get('/health', (req, res) => {
  const result = { status: 'ok', sqlite: false, json: false, ts: new Date().toISOString() }
  try {
    const db = require('./db/database').getDb()
    db.prepare('SELECT 1').get()
    result.sqlite = true
  } catch {}
  try {
    const orgFile = path.join(__dirname, '../data/org-settings.json')
    fs.readFileSync(orgFile)
    result.json = true
  } catch {}
  if (!result.sqlite || !result.json) result.status = 'degraded'
  res.status(result.status === 'ok' ? 200 : 503).json(result)
})
*/

// ── Mount routers ──
app.use(require('./routes/auth'))
app.use(require('./routes/templates'))
app.use(require('./routes/soa'))
app.use(require('./routes/risks'))
app.use(require('./routes/goals'))
app.use(require('./routes/measures'))
app.use(require('./routes/assets'))
app.use(require('./routes/governance'))
app.use(require('./routes/bcm'))
app.use(require('./routes/calendar'))
app.use(require('./routes/guidance'))
app.use(require('./routes/gdpr'))
app.use(require('./routes/reports'))
app.use(require('./routes/legal'))
app.use(require('./routes/training'))
app.use(require('./routes/admin'))
app.use(require('./routes/public'))
app.use(require('./routes/trash'))
app.use(require('./routes/suppliers'))
app.use(require('./routes/findings'))
app.use(require('./routes/audits'))
app.use(require('./routes/scanImport'))
app.use(require('./routes/ai'))
app.use(require('./routes/orgUnits'))
app.use(require('./routes/acknowledgements'))
app.use(require('./routes/ackPublic'))
app.use(require('./routes/nis2'))
app.use(require('./routes/assessments'))
app.use(require('./routes/assessmentPublic'))
app.use(require('./routes/sync'))
app.use(require('./routes/syncAccounts'))

// Test-user management routes (temporary, test-env only)
try {
  const testUsers = require('./testUsers')
  app.get('/test/users', requireAuth, authorize('admin'), testUsers.listUsers)
  app.post('/test/users', requireAuth, authorize('admin'), testUsers.createUser)
  app.put('/test/users/:username', requireAuth, authorize('admin'), testUsers.updateUser)
  app.delete('/test/users/:username', requireAuth, authorize('admin'), testUsers.deleteUser)
} catch (e) {
  // ignore if testUsers module not available in some builds
}

// ── Autopurge: Einträge nach 30 Tagen endgültig löschen ──────────────────────
// Async, weil die Knex-Backends (sqlite/mariadb/pg) async sind — muss vom
// Aufrufer abgewartet werden, damit keine Query vor abgeschlossenem
// Datenbank-Init laufen kann (siehe bootstrap()/#42).
async function runAutopurge() {
  const CUTOFF = new Date(Date.now() - 30 * 86400000).toISOString()
  let total = 0

  async function purge(label, getDeleted, permanentDeleteFn) {
    try {
      const items = (await getDeleted()) || []
      for (const i of items.filter(i => i.deletedAt && i.deletedAt < CUTOFF)) {
        await permanentDeleteFn(i.id)
        total++
      }
    } catch(e) { console.warn(`[autopurge] ${label}: ${e.message}`) }
  }

  // Templates: need type parameter
  try {
    const deletedTmpl = (await storage.getDeletedTemplates?.()) || []
    for (const t of deletedTmpl.filter(t => t.deletedAt && t.deletedAt < CUTOFF)) {
      try { await storage.permanentDeleteTemplate?.(t.type, t.id); total++ } catch {}
    }
  } catch(e) { console.warn(`[autopurge] Templates: ${e.message}`) }

  const riskStore     = require('./db/riskStore')
  const goalsStore    = require('./db/goalsStore')
  const guidanceStore = require('./db/guidanceStore')
  const trainingStore = require('./db/trainingStore')
  const legalStore    = require('./db/legalStore')
  const gdprStore     = require('./db/gdprStore')
  const pubStore      = require('./db/publicIncidentStore')

  await purge('Risks',              () => riskStore.getDeleted(),                     (id) => riskStore.permanentDelete(id))
  await purge('Goals',              () => goalsStore.getDeleted(),                    (id) => goalsStore.permanentDelete(id))
  const measuresStore = require('./db/measuresStore')
  await purge('Measures',           () => measuresStore.getDeleted(),                 (id) => measuresStore.permanentDelete(id))
  await purge('Guidance',           () => guidanceStore.getDeleted(),                 (id) => guidanceStore.permanentDelete(id))
  await purge('Training',           () => trainingStore.getDeleted(),                 (id) => trainingStore.permanentDelete(id))
  await purge('Contracts',          () => legalStore.contracts.getDeleted(),          (id) => legalStore.contracts.permanentDelete(id))
  await purge('NDAs',               () => legalStore.ndas.getDeleted(),               (id) => legalStore.ndas.permanentDelete(id))
  await purge('Policies',           () => legalStore.privacyPolicies.getDeleted(),    (id) => legalStore.privacyPolicies.permanentDelete(id))
  await purge('GDPR VVT',           () => gdprStore.vvt.getDeleted(),                 (id) => gdprStore.vvt.permanentDelete(id))
  await purge('GDPR AV',            () => gdprStore.av.getDeleted(),                  (id) => gdprStore.av.permanentDelete(id))
  await purge('GDPR DSFA',          () => gdprStore.dsfa.getDeleted(),                (id) => gdprStore.dsfa.permanentDelete(id))
  await purge('GDPR Incidents',     () => gdprStore.incidents.getDeleted(),           (id) => gdprStore.incidents.permanentDelete(id))
  await purge('GDPR DSAR',          () => gdprStore.dsar.getDeleted(),                (id) => gdprStore.dsar.permanentDelete(id))
  await purge('GDPR TOMs',          () => gdprStore.toms.getDeleted(),                (id) => gdprStore.toms.permanentDelete(id))
  await purge('Public Incidents',   () => pubStore.getDeleted(),                      (id) => pubStore.permanentDelete(id))

  const supplierStore = require('./db/supplierStore')
  await purge('Suppliers',          () => supplierStore.getDeleted(),                  (id) => supplierStore.permanentDelete(id))

  const findingStore  = require('./db/findingStore')
  await purge('Findings',           () => findingStore.getDeleted(),                   (id) => findingStore.permanentDelete(id))

  const auditMgmt = require('./db/auditMgmtStore')
  await purge('Audits',             () => auditMgmt.getDeleted(),                      (id) => auditMgmt.permanentDelete(id))
  await purge('Audit Programs',     () => auditMgmt.programs.getDeleted(),             (id) => auditMgmt.programs.permanentDelete(id))

  if (total > 0) console.log(`[autopurge] ${total} Einträge nach 30 Tagen endgültig gelöscht`)
}

// ── Idempotente Guidance-Seeds (Architekturdoku, Demo-Beitrag, Rollen-Guides, …) ──
async function seedAll() {
  // In anderen Modulen eingebettete Maßnahmen (TOMs, Risiko-Behandlungen, …) ins Maßnahmen-Register übernehmen
  // (idempotent, die alten Daten bleiben als Sicherung liegen)
  try {
    const r = await require('./db/measureMigration').run()
    if (r.migrated) console.log(`[migration] ${r.migrated} Maßnahmen in das Register übernommen (TOMs ${r.toms.migrated}, Risiko-Behandlungen ${r.risks.migrated}, Feststellungs-Maßnahmen ${r.findings.migrated}, Governance-Maßnahmen ${r.governance.migrated})`)
    if (r.failed) console.warn(`[migration] ${r.failed} Maßnahmen konnten nicht übernommen werden – siehe Meldungen oben`)
  } catch (e) {
    console.warn('[migration] Übernahme der Maßnahmen fehlgeschlagen:', e.message)
  }

  // SoA: eingebaute Controls unter sqlite/mariadb/postgres anlegen (im JSON-Backend macht das der Store selbst) (#98)
  try {
    const r = await require('./db/soaStore').seedBuiltIn()
    if (r && r.added) console.log(`[seed] ${r.added} SoA-Controls angelegt`)
  } catch (e) {
    console.warn('[seed] SoA-Controls konnten nicht angelegt werden:', e.message)
  }

  const guidanceStore = require('./db/guidanceStore')

  try {
    await guidanceStore.seedArchitectureDocs()
  } catch (e) {
    console.warn('[seed] Architekturdokumentation konnte nicht eingespeist werden:', e.message)
  }

  try {
    await guidanceStore.seedDemoDoc()
  } catch (e) {
    console.warn('[seed] Demo-Beitrag konnte nicht eingespeist werden:', e.message)
  }

  try {
    await guidanceStore.seedRoleGuides()
  } catch (e) {
    console.warn('[seed] Rollen-Guides konnten nicht eingespeist werden:', e.message)
  }

  try {
    await guidanceStore.seedSoaGuide()
  } catch (e) {
    console.warn('[seed] SoA-Guide konnte nicht eingespeist werden:', e.message)
  }

  try {
    await guidanceStore.seedPolicyGuide()
  } catch (e) {
    console.warn('[seed] Policy-Guide konnte nicht eingespeist werden:', e.message)
  }

  try {
    await guidanceStore.seedIsoNotice()
  } catch (e) {
    console.warn('[seed] ISO-Hinweis konnte nicht eingespeist werden:', e.message)
  }
}

// ── Bootstrap: einzige Schranke vor jedem DB-Zugriff (#42) ───────────────────
// Unter STORAGE_BACKEND sqlite/mariadb/pg starten die Knex-Stores ihre
// Schema-Initialisierung fire-and-forget (`_knex.init().catch()`), ohne dass
// je jemand darauf wartet. Trifft eine Query (z.B. Autopurge) vor CREATE
// TABLE, stirbt der Prozess mit einer unbehandelten Rejection — zeitabhängig,
// daher inkonsistent zwischen Umgebungen. `knexDatabase.init()` ist bereits
// idempotent/memoisiert; dieses einzige `await` davor reicht, weil jeder
// Knex-Store (`server/db/stores/*.js`) über dasselbe Singleton initialisiert.
// Unter STORAGE_BACKEND=json ist dieser Await ein No-Op.
async function bootstrap() {
  const backend = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
  if (backend !== 'json') {
    await require('./db/knexDatabase').init()
  }
  await runAutopurge()
  await seedAll()
}

function startListener() {
  const SSL_CERT = process.env.SSL_CERT_FILE
  const SSL_KEY  = process.env.SSL_KEY_FILE

  if (SSL_CERT && SSL_KEY) {
    const https = require('https')
    try {
      const sslOptions = {
        cert: fs.readFileSync(SSL_CERT),
        key:  fs.readFileSync(SSL_KEY),
      }
      https.createServer(sslOptions, app).listen(PORT, () => {
        console.log(`ISMS Builder listening on https://localhost:${PORT}  [SSL]`)
      })
    } catch (e) {
      console.error(`[SSL] Failed to load certificate files: ${e.message}`)
      console.error('[SSL] Falling back to HTTP.')
      app.listen(PORT, () => {
        console.log(`ISMS Builder listening on http://localhost:${PORT}  [HTTP fallback]`)
      })
    }
  } else {
    app.listen(PORT, () => {
      console.log(`ISMS Builder listening on http://localhost:${PORT}`)
    })
  }
}

// ── Fehler beim Lesen der Anfrage als JSON melden (nicht als HTML-Seite) ──────────
// Ohne Fehlerhandler antwortet Express bei zu großem oder ungültigem JSON mit einer HTML-Fehlerseite; die Oberfläche
// scheitert dann an JSON.parse („Unexpected token '<'“) statt die Ursache zu zeigen (#98). Andere Fehler bleiben unverändert.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' })
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON in request body' })
  return next(err)
})

// ── Export für Tests ──────────────────────────────────────────────────────────
// module.exports muss synchron bleiben: Tests machen `require('../server/index.js')`
// und supertest(app) sofort. bootstrap() wird deshalb nur hier angehängt, nicht
// ausgeführt — ein Test kann `await app.bootstrap()` gezielt selbst aufrufen.
module.exports = app
module.exports.bootstrap = bootstrap

// ── SSL / HTTPS + Notifier (nur im Produktivbetrieb) ─────────────────────────
if (require.main === module) {
  bootstrap()
    .then(() => {
      require('./notifier').start()
      require('./art23Watcher').start()
      startListener()
    })
    .catch(e => {
      console.error('[bootstrap] Fataler Fehler beim Start:', e)
      process.exit(1)
    })
}
