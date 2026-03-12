// ISMS Builder V 1.29 – API Server (Node.js / Express)
// © 2026 Claude Hecker — AGPL-3.0

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const { requireAuth, authorize, signToken, getSessionFromReq } = require('./auth')
const PORT = process.env.PORT || 3000

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
    res.clearCookie('sm_session', { path: '/' })
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
app.get('/', (req, res) => {
  res.send('ISMS Templates API')
})

// ── Mount routers ──
app.use(require('./routes/auth'))
app.use(require('./routes/templates'))
app.use(require('./routes/soa'))
app.use(require('./routes/risks'))
app.use(require('./routes/goals'))
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
app.use(require('./routes/ai'))

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
function runAutopurge() {
  const CUTOFF = new Date(Date.now() - 30 * 86400000).toISOString()
  let total = 0

  function purge(label, getDeleted, permanentDeleteFn) {
    try {
      const items = getDeleted() || []
      items.filter(i => i.deletedAt && i.deletedAt < CUTOFF).forEach(i => {
        permanentDeleteFn(i.id)
        total++
      })
    } catch(e) { console.warn(`[autopurge] ${label}: ${e.message}`) }
  }

  // Templates: need type parameter
  try {
    const deletedTmpl = storage.getDeletedTemplates?.() || []
    deletedTmpl.filter(t => t.deletedAt && t.deletedAt < CUTOFF).forEach(t => {
      try { storage.permanentDeleteTemplate?.(t.type, t.id); total++ } catch {}
    })
  } catch(e) { console.warn(`[autopurge] Templates: ${e.message}`) }

  const riskStore     = require('./db/riskStore')
  const goalsStore    = require('./db/goalsStore')
  const guidanceStore = require('./db/guidanceStore')
  const trainingStore = require('./db/trainingStore')
  const legalStore    = require('./db/legalStore')
  const gdprStore     = require('./db/gdprStore')
  const pubStore      = require('./db/publicIncidentStore')

  purge('Risks',              () => riskStore.getDeleted(),                     (id) => riskStore.permanentDelete(id))
  purge('Goals',              () => goalsStore.getDeleted(),                    (id) => goalsStore.permanentDelete(id))
  purge('Guidance',           () => guidanceStore.getDeleted(),                 (id) => guidanceStore.permanentDelete(id))
  purge('Training',           () => trainingStore.getDeleted(),                 (id) => trainingStore.permanentDelete(id))
  purge('Contracts',          () => legalStore.contracts.getDeleted(),          (id) => legalStore.contracts.permanentDelete(id))
  purge('NDAs',               () => legalStore.ndas.getDeleted(),               (id) => legalStore.ndas.permanentDelete(id))
  purge('Policies',           () => legalStore.privacyPolicies.getDeleted(),    (id) => legalStore.privacyPolicies.permanentDelete(id))
  purge('GDPR VVT',           () => gdprStore.vvt.getDeleted(),                 (id) => gdprStore.vvt.permanentDelete(id))
  purge('GDPR AV',            () => gdprStore.av.getDeleted(),                  (id) => gdprStore.av.permanentDelete(id))
  purge('GDPR DSFA',          () => gdprStore.dsfa.getDeleted(),                (id) => gdprStore.dsfa.permanentDelete(id))
  purge('GDPR Incidents',     () => gdprStore.incidents.getDeleted(),           (id) => gdprStore.incidents.permanentDelete(id))
  purge('GDPR DSAR',          () => gdprStore.dsar.getDeleted(),                (id) => gdprStore.dsar.permanentDelete(id))
  purge('GDPR TOMs',          () => gdprStore.toms.getDeleted(),                (id) => gdprStore.toms.permanentDelete(id))
  purge('Public Incidents',   () => pubStore.getDeleted(),                      (id) => pubStore.permanentDelete(id))

  const supplierStore = require('./db/supplierStore')
  purge('Suppliers',          () => supplierStore.getDeleted(),                  (id) => supplierStore.permanentDelete(id))

  const findingStore  = require('./db/findingStore')
  purge('Findings',           () => findingStore.getDeleted(),                   (id) => findingStore.permanentDelete(id))

  if (total > 0) console.log(`[autopurge] ${total} Einträge nach 30 Tagen endgültig gelöscht`)
}

// Autopurge beim Serverstart
runAutopurge()

// Architekturdokumentation in Guidance einspielen (idempotent)
try {
  require('./db/guidanceStore').seedArchitectureDocs()
} catch (e) {
  console.warn('[seed] Architekturdokumentation konnte nicht eingespeist werden:', e.message)
}

// Demo-Übersichts-Beitrag im Systemhandbuch (idempotent, verschwindet nach Demo-Reset)
try {
  require('./db/guidanceStore').seedDemoDoc()
} catch (e) {
  console.warn('[seed] Demo-Beitrag konnte nicht eingespeist werden:', e.message)
}

// Rollen-Bedienungsanleitungen im Systemhandbuch (idempotent)
try {
  require('./db/guidanceStore').seedRoleGuides()
} catch (e) {
  console.warn('[seed] Rollen-Guides konnten nicht eingespeist werden:', e.message)
}

// SoA & Audit Leitfaden (idempotent)
try {
  require('./db/guidanceStore').seedSoaGuide()
} catch (e) {
  console.warn('[seed] SoA-Guide konnte nicht eingespeist werden:', e.message)
}

// Policy-Prozesse Leitfaden (idempotent)
try {
  require('./db/guidanceStore').seedPolicyGuide()
} catch (e) {
  console.warn('[seed] Policy-Guide konnte nicht eingespeist werden:', e.message)
}

// ISO-Controls Rechtlicher Hinweis (idempotent, immer sichtbar)
try {
  require('./db/guidanceStore').seedIsoNotice()
} catch (e) {
  console.warn('[seed] ISO-Hinweis konnte nicht eingespeist werden:', e.message)
}

// ── Export für Tests ──────────────────────────────────────────────────────────
module.exports = app

// ── SSL / HTTPS + Notifier (nur im Produktivbetrieb) ─────────────────────────
if (require.main === module) {
  require('./notifier').start()
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
