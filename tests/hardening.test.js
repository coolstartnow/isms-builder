'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Wächter gegen selbst verursachte Schwachstellen (interne Sicherheitsprüfung vom 2026-10-24): Test-Routen in Produktion, Header-Login,
// Datenbank-TLS, Geheimnisse im Repository, Workflows, Mindestversionen der Abhängigkeiten, Absturzsicherheit.
// Jede Prüfung ist so gebaut, dass der Rückfall in den alten Zustand sofort rot wird.
const fs = require('fs')
const path = require('path')
const { spawnSync, execFileSync } = require('child_process')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs } = require('./setup/authHelper')

const ROOT = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const STRONG = 'jest-hardening-secret-0123456789abcdef-0123456789'

function runNode(script, env = {}) {
  return spawnSync(process.execPath, ['-e', script], { cwd: ROOT, encoding: 'utf8', timeout: 60000, env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env } })
}
function tracked() {
  try { return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean) } catch { return null }
}

describe('Test-Route /test/users', () => {
  const probe = nodeEnv => {
    const dir = createTestDataDir()
    try {
      const r = runNode("const app=require('./server/index.js');require('supertest')(app).get('/test/users').then(x=>{console.log('STATUS '+x.status);process.exit(0)})",
        { NODE_ENV: nodeEnv, JWT_SECRET: STRONG, DATA_DIR: dir, STORAGE_BACKEND: 'json' })
      const m = /STATUS (\d+)/.exec(r.stdout || '')
      return m ? Number(m[1]) : `kein Ergebnis: ${(r.stderr || '').slice(0, 200)}`
    } finally { removeTestDataDir(dir) }
  }
  test('in Produktion nicht gemountet (404), in der Testumgebung erreichbar (401 ohne Anmeldung)', () => {
    expect(probe('production')).toBe(404)
    expect(probe('test')).toBe(401)
  })
})

describe('Header-Anmeldung (DEV_HEADER_AUTH)', () => {
  const load = env => runNode("require('./server/auth'); console.log('GELADEN')", { JWT_SECRET: STRONG, ...env })
  test('in Produktion verweigert der Start den Header-Login', () => {
    const r = load({ NODE_ENV: 'production', DEV_HEADER_AUTH: 'true' })
    expect(r.status).toBe(1)
    expect(r.stdout).not.toContain('GELADEN')
    expect(r.stderr).toContain('DEV_HEADER_AUTH')
  })
  test('in Entwicklung/Test bleibt er möglich, ohne die Variable ohnehin aus', () => {
    expect(load({ NODE_ENV: 'test', DEV_HEADER_AUTH: 'true' }).stdout).toContain('GELADEN')
    expect(load({ NODE_ENV: 'production' }).stdout).toContain('GELADEN')
  })
  test('Header werden ohne die Variable ignoriert', async () => {
    const dir = createTestDataDir()
    try {
      const r = runNode("const app=require('./server/index.js');require('supertest')(app).get('/admin/users').set('X-User-Name','x').set('X-User-Role','admin').then(x=>{console.log('STATUS '+x.status);process.exit(0)})",
        { NODE_ENV: 'test', JWT_SECRET: STRONG, DATA_DIR: dir, STORAGE_BACKEND: 'json' })
      expect(/STATUS (\d+)/.exec(r.stdout || '')[1]).toBe('401')
    } finally { removeTestDataDir(dir) }
  })
})

describe('Datenbank-TLS', () => {
  const { sslOptions } = require('../server/db/knexDatabase')
  test('ohne DB_SSL kein TLS-Objekt', () => expect(sslOptions({})).toBeUndefined())
  test('mit DB_SSL=true wird das Zertifikat standardmäßig geprüft', () => {
    expect(sslOptions({ DB_SSL: 'true' })).toMatchObject({ rejectUnauthorized: true })
  })
  test('Abschalten nur ausdrücklich per DB_SSL_REJECT_UNAUTHORIZED=false (mit Warnung)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(sslOptions({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' })).toMatchObject({ rejectUnauthorized: false })
    expect(warn).toHaveBeenCalled(); warn.mockRestore()
    expect(sslOptions({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'quatsch' })).toMatchObject({ rejectUnauthorized: true })
  })
  test('eigene Zertifizierungsstelle aus Datei', () => {
    const dir = createTestDataDir(); const f = path.join(dir, 'ca.pem'); fs.writeFileSync(f, '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n')
    try { expect(sslOptions({ DB_SSL: 'true', DB_SSL_CA: f }).ca).toContain('BEGIN CERTIFICATE') } finally { removeTestDataDir(dir) }
  })
  test('weder MariaDB noch PostgreSQL setzen rejectUnauthorized fest auf false', () => {
    expect(read('server/db/knexDatabase.js')).not.toMatch(/rejectUnauthorized:\s*false/)
  })
})

describe('Geheimnisse im Repository', () => {
  const files = tracked()
  const maybe = files ? test : test.skip
  const TEXT = /\.(js|mjs|cjs|json|md|yml|yaml|html|css|sh|toml|txt|env|example|docker)$|(^|\/)(Dockerfile|\.env[\w.]*|\.gitignore|\.trivyignore|\.semgrepignore)$/
  const SKIP = /^(ui\/vendor\/|package-lock\.json$|docs\/screenshots\/|tests\/)|\.min\.js$/
  const PATTERNS = [
    ['privater Schlüssel', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/],
    ['GitHub-Token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/],
    ['AWS-Zugangsschlüssel', /\bAKIA[0-9A-Z]{16}\b/],
    ['Slack-Token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ]
  maybe('keine Schlüssel oder Tokens in versionierten Dateien', () => {
    const hits = []
    for (const f of files) {
      if (!TEXT.test(f) || SKIP.test(f)) continue
      let txt = ''; try { txt = read(f) } catch { continue }
      for (const [name, re] of PATTERNS) if (re.test(txt)) hits.push(`${f}: ${name}`)
    }
    expect(hits).toEqual([])
  })
  maybe('mitgelieferte Daten enthalten keine TOTP-Seeds', () => {
    const bad = []
    for (const f of files.filter(x => /^data\/[^/]+\.json$/.test(x))) {
      let j; try { j = JSON.parse(read(f)) } catch { continue }
      const walk = (o, p) => { if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${p}[${i}]`)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (/totpSecret/i.test(k) && typeof v === 'string' && v.trim()) bad.push(`${f} ${p}.${k}`); else walk(v, `${p}.${k}`) } }
      walk(j, '')
    }
    expect(bad).toEqual([])
  })
  maybe('mitgelieferte Benutzer sind genau die dokumentierten Demo-Konten', () => {
    // Die Demo-Zugänge sind bewusst öffentlich (README „Demo accounts“): Anwender müssen sich anmelden und das System ausprobieren können.
    const DEMO = ['admin', 'ciso', 'dsb', 'alice', 'bob', 'carla', 'dana']
    const j = JSON.parse(read('data/rbac_users.json')); const list = Array.isArray(j) ? j : Object.values(j)
    expect(list.map(u => u.username).filter(n => !DEMO.includes(n))).toEqual([])
  })
  // Jede aktive Zeile einer Ausnahmeliste braucht eine Begründung: Kommentar in der Zeile oder in der Zeile davor
  const withReasons = (file, isEntry) => {
    const lines = read(file).split('\n'); const missing = []
    lines.forEach((l, i) => {
      const t = l.trim(); if (!t || t.startsWith('#') || !isEntry(t)) return
      const prev = (lines.slice(0, i).reverse().find(x => x.trim()) || '').trim()
      if (!(l.includes('#') || prev.startsWith('#'))) missing.push(`${file}:${i + 1}: ${t.slice(0, 60)}`)
    })
    return missing
  }
  test('Scanner-Konfiguration ist vorhanden und jede Ausnahme begründet', () => {
    for (const f of ['.gitleaks.toml', '.trivyignore', '.semgrepignore']) expect([f, fs.existsSync(path.join(ROOT, f))]).toEqual([f, true])
    expect(read('.gitleaks.toml')).toMatch(/\[allowlist\]|\[\[allowlists\]\]/)
    expect([...withReasons('.trivyignore', () => true), ...withReasons('.semgrepignore', () => true), ...withReasons('.gitleaks.toml', t => /^'''/.test(t))]).toEqual([])
  })
})

describe('GitHub-Workflows', () => {
  const dir = path.join(ROOT, '.github', 'workflows')
  const wf = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)) : []
  const SAFE = /\$\{\{\s*(?:matrix\.[\w.-]+|github\.(?:run_id|run_number|sha|repository|server_url|workspace)|runner\.[\w.]+|steps\.[\w.-]+\.outputs\.[\w.-]+|env\.[\w.-]+|secrets\.[\w.-]+|inputs\.[\w.-]+)\s*\}\}/g
  test.each(wf)('%s: keine veränderlichen github.*-Werte direkt in run-Blöcken (über env: übergeben)', f => {
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n'); const bad = []
    for (let i = 0; i < lines.length; i++) {
      const m = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(lines[i]); if (!m) continue
      const indent = m[1].length; const block = [m[2]]
      if (/^[|>][+-]?\s*$/.test(m[2])) { block.length = 0; for (let j = i + 1; j < lines.length && (/^\s*$/.test(lines[j]) || lines[j].search(/\S/) > indent); j++) block.push(lines[j]) }
      const txt = block.join('\n').replace(SAFE, '')
      if (/\$\{\{/.test(txt)) bad.push(`${f}:${i + 1}: ${(txt.match(/\$\{\{[^}]*\}\}/) || [''])[0]}`)
    }
    expect(bad).toEqual([])
  })
  test.each(wf)('%s: alle Actions sind auf einen Commit festgelegt', f => {
    const bad = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /^\s*-?\s*uses:\s*[^.\s]/.test(l) && !/uses:\s*\S+@[0-9a-f]{40}\b/.test(l) && !/uses:\s*docker:\/\//.test(l)).map(([n, l]) => `${f}:${n}: ${l.trim()}`)
    expect(bad).toEqual([])
  })
  test('Dependabot wartet (cooldown) bei jedem Ökosystem', () => {
    const d = read('.github/dependabot.yml')
    expect((d.match(/package-ecosystem:/g) || []).length).toBeGreaterThan(0)
    expect((d.match(/cooldown:/g) || []).length).toBe((d.match(/package-ecosystem:/g) || []).length)
  })
})

describe('Mindestversionen bekannter Lücken (Lockfile)', () => {
  const lock = JSON.parse(read('package-lock.json')).packages
  const cmp = (a, b) => { const A = a.split(/[.-]/).map(x => parseInt(x, 10) || 0), B = b.split(/[.-]/).map(x => parseInt(x, 10) || 0); for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return A[i] - B[i]; return 0 }
  // Paket → erste Version ohne die bekannte Lücke (Stand: Scan vom 2026-10-24)
  test.each([['multer', '2.5.0'], ['body-parser', '1.20.9'], ['nodemailer', '10.1.4']])('%s ≥ %s', (pkg, min) => {
    const entry = lock[`node_modules/${pkg}`]
    expect(entry).toBeTruthy()
    expect(cmp(entry.version, min)).toBeGreaterThanOrEqual(0)
  })
})

describe('Absturzsicherheit (kein Prozessende durch Eingaben)', () => {
  let dataDir, app, admin
  const rejections = []
  const onReject = e => rejections.push(String(e && e.stack || e).split('\n')[0])
  jest.setTimeout(240000)
  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: STRONG, NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin')
    process.on('unhandledRejection', onReject)
  })
  afterAll(() => { process.off('unhandledRejection', onReject); removeTestDataDir(dataDir) })

  const deep = n => { let o = { a: 1 }; for (let i = 0; i < n; i++) o = { a: o }; return o }
  const send = (rq) => new Promise(resolve => { let done = false; const t = setTimeout(() => { if (!done) { done = true; resolve({ status: 0 }) } }, 6000); rq.then(r => { if (!done) { done = true; clearTimeout(t); resolve(r) } }).catch(() => { if (!done) { done = true; clearTimeout(t); resolve({ status: -1 }) } }) })

  test('POST /login mit Zahl, Objekt, Array oder null als Benutzername/Passwort → 400/401, keine ungefangene Ablehnung', async () => {
    const bodies = [{ username: 'admin', password: 123 }, { username: 'admin', password: { a: 1 } }, { username: 'admin', password: ['x'] }, { username: 5, password: 'x' }, { username: { $ne: 1 }, password: 'x' }, { username: null, password: null }, { email: ['a'], password: 'x' }]
    const out = []
    for (const b of bodies) { const r = await send(request(app).post('/login').send(b)); out.push([JSON.stringify(b), r.status]) }
    expect(out.filter(([, s]) => ![400, 401, 422].includes(s))).toEqual([])
    expect(rejections).toEqual([])
  })

  // alle schreibenden Routen des Servers mit unpassenden Nutzlasten (als Administrator)
  function collect(stack, prefix = '', out = []) {
    for (const l of stack) {
      if (l.route) { for (const m of Object.keys(l.route.methods)) if (['post', 'put', 'patch', 'delete'].includes(m) && typeof l.route.path === 'string') out.push([m, prefix + l.route.path]) }
      else if (l.handle && l.handle.stack) collect(l.handle.stack, prefix, out)
    }
    return out
  }
  const SKIP = /demo-reset|demo-import|demo-load|maintenance|audit-log|restore|permanent|logout|\/admin\/users\/|2fa|password|\/login|test\/users/
  test('schreibende Routen überstehen unpassende Nutzlasten: Antwort kommt, Prozess und Server laufen weiter', async () => {
    const routes = collect(app._router.stack).filter(([, p]) => !SKIP.test(p))
    expect(routes.length).toBeGreaterThan(50)
    const payloads = [{ title: 123, name: { a: 1 }, id: null, status: ['x'], text: 5 }, [1, 2, 3], deep(1500), { a: 'x'.repeat(200000) }]
    const failed = []
    for (const [method, p] of routes) {
      const url = p.replace(/:[A-Za-z0-9_]+\??/g, 'lab-x')
      for (const [i, body] of payloads.entries()) {
        const r = await send(request(app)[method](url).set('Cookie', admin).send(body))
        if (r.status <= 0) failed.push(`${method.toUpperCase()} ${p} (Nutzlast ${i + 1}): ${r.status === 0 ? 'keine Antwort' : 'Verbindung abgebrochen'}`)
        if (failed.length > 25) break
      }
      if (failed.length > 25) break
    }
    expect(failed).toEqual([])
    expect(rejections).toEqual([])
    expect((await request(app).get('/api/version')).status).toBeLessThan(500)   // der Server antwortet nach dem Beschuss noch
  })
})

describe('Sicherheits-Header und Passwort-Mindestlänge', () => {
  let dataDir, app, admin
  beforeAll(async () => {
    dataDir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: STRONG, NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    app = require('../server/index.js')
    admin = await loginAs(app, 'admin')
  })
  afterAll(() => removeTestDataDir(dataDir))

  test.each(['/ui/login.html', '/whoami', '/login'])('%s sendet nosniff, SAMEORIGIN und Referrer-Policy, kein X-Powered-By', async p => {
    const r = await request(app).get(p).set('Cookie', admin)
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(r.headers['referrer-policy']).toBe('same-origin')
    expect(r.headers['x-powered-by']).toBeUndefined()
  })
  test('/whoami wird nicht zwischengespeichert', async () => {
    const r = await request(app).get('/whoami').set('Cookie', admin)
    expect(r.headers['cache-control']).toMatch(/no-store/)
  })
  test('Passwörter unter 8 Zeichen werden beim Anlegen, Ändern und Selbständern abgelehnt', async () => {
    const mk = await request(app).post('/admin/users').set('Cookie', admin).send({ username: 'kurz1', email: 'kurz1@test.local', domain: 'Global', role: 'reader', password: 'abc1234' })
    expect(mk.status).toBe(400)
    const ok = await request(app).post('/admin/users').set('Cookie', admin).send({ username: 'lang1', email: 'lang1@test.local', domain: 'Global', role: 'reader', password: 'abcd1234' })
    expect([200, 201]).toContain(ok.status)
    const ch = await request(app).put('/me/password').set('Cookie', admin).send({ currentPassword: 'adminpass', newPassword: 'abc1234' })
    expect(ch.status).toBe(400)
  })
})

describe('Datenpfade und Leserechte', () => {
  const fs2 = require('fs'), path2 = require('path')
  test('kein fester Pfad unter <Projekt>/data außerhalb von DATA_DIR in server/ (gemeinsamer Helfer server/paths.js)', () => {
    const hits = []
    const scan = d => { for (const f of fs2.readdirSync(d, { withFileTypes: true })) { const p = path2.join(d, f.name); if (f.isDirectory()) scan(p); else if (f.name.endsWith('.js')) fs2.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/\.\.\/(\.\.\/)?data/.test(l) && !/DATA_DIR/.test(l) && !/^\s*(\/\/|\*)/.test(l)) hits.push(`${path2.relative(ROOT, p)}:${i + 1}: ${l.trim().slice(0, 90)}`) }) } }
    scan(path2.join(ROOT, 'server'))
    expect(hits).toEqual([])
  })
  test('Uploads und Markierungen landen unter DATA_DIR (Wegwerf-Verzeichnis), nicht im Projektverzeichnis', () => {
    const dir = createTestDataDir()
    try {
      const r = runNode("require('./server/index.js'); const fs=require('fs'); setTimeout(()=>{ console.log('DIRS '+fs.readdirSync(process.env.DATA_DIR).join(',')); process.exit(0) }, 500)", { NODE_ENV: 'test', JWT_SECRET: STRONG, DATA_DIR: dir, STORAGE_BACKEND: 'json' })
      const dirs = (/DIRS (.*)/.exec(r.stdout || '') || [])[1] || ''
      for (const d of ['template-files', 'bcm-files', 'governance-files']) expect([d, dirs.split(',').includes(d)]).toEqual([d, true])
    } finally { removeTestDataDir(dir) }
  })
  test('Leser lesen /admin/security und /admin/scan-import/status nicht mehr; die Start-Routen der Oberfläche bleiben lesbar', async () => {
    const dir = createTestDataDir()
    Object.assign(process.env, { DATA_DIR: dir, JWT_SECRET: STRONG, NODE_ENV: 'test', STORAGE_BACKEND: 'json' })
    const app2 = require('../server/index.js')
    try {
      const reader = await loginAs(app2, 'reader'), auditor = await loginAs(app2, 'auditor'), adm = await loginAs(app2, 'admin')
      const get = (c, u) => request(app2).get(u).set('Cookie', c)
      expect((await get(reader, '/admin/security')).status).toBe(403)
      expect((await get(reader, '/admin/scan-import/status')).status).toBe(403)
      expect((await get(auditor, '/admin/security')).status).toBe(403)
      expect((await get(auditor, '/admin/scan-import/status')).status).toBe(200)
      expect((await get(adm, '/admin/security')).status).toBe(200)
      for (const u of ['/admin/modules', '/admin/lists', '/admin/logo', '/admin/org-settings', '/admin/soa-frameworks']) expect([u, (await get(reader, u)).status]).toEqual([u, 200])
    } finally { removeTestDataDir(dir) }
  })
})
