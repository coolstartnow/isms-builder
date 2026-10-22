'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Sammelpunkt für die Sicherheitskorrekturen ab 1.80.1: Dieser Test hält die wichtigsten Zusagen an einer Stelle fest, damit ein
// versehentliches Zurücknehmen (z. B. durch einen alten Stand) sofort auffällt. Die Wirkung selbst prüfen die Einzeltests
// (secretCheck, secureToken, loginTiming, passwordChange, guidanceXss, admin). Diesen Test nicht abschwächen oder löschen:
// Ändert sich eine Zusage bewusst, werden Test, CHANGELOG und docs/ISMS-build-documentation.md (Kapitel 56) gemeinsam angepasst.
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const exists = f => fs.existsSync(path.join(ROOT, f))

describe('Die Einzeltests der Sicherheitskorrekturen sind vorhanden', () => {
  test.each(['secretCheck', 'secureToken', 'loginTiming', 'passwordChange', 'guidanceXss', 'xssSinks'])('tests/%s.test.js', name => {
    expect(exists(`tests/${name}.test.js`)).toBe(true)
  })
})

describe('JWT-Secret (GHSA-vwc3-4j58-wrxc)', () => {
  const { weakSecretReason } = require('../server/secretCheck')
  test('server/auth.js prüft das Secret beim Laden', () => {
    expect(read('server/auth.js')).toMatch(/require\('\.\/secretCheck'\)\.enforce\(\{ secret: JWT_SECRET \}\)/)
  })
  test.each(['.env.docker', '.env.example'])('der Platzhalter in %s wird als unsicher erkannt', f => {
    const m = /^JWT_SECRET=(.+)$/m.exec(read(f))
    expect(m).toBeTruthy()
    expect(weakSecretReason(m[1].trim())).not.toBeNull()
  })
  test('das Docker-Image läuft mit NODE_ENV=production (dann verweigert der Server den Start mit schwachem Secret)', () => {
    expect(read('Dockerfile')).toMatch(/NODE_ENV=production/)
    expect(read('docker-compose.yml')).toMatch(/NODE_ENV=production/)
  })
})

describe('Gespeichertes XSS (GHSA-m8g6-pq5j-2r9r)', () => {
  test('DOMPurify wird mitgeliefert und vor app.js geladen; Lizenz ist aufgeführt', () => {
    expect(exists('ui/vendor/purify.min.js')).toBe(true)
    const html = read('ui/index.html')
    expect(html.indexOf('vendor/purify.min.js')).toBeGreaterThan(-1)
    expect(html.indexOf('vendor/purify.min.js')).toBeLessThan(html.indexOf('/ui/app.js'))
    expect(read('THIRD-PARTY-LICENSES.md')).toMatch(/### DOMPurify/)
  })
  test('Guidance wird nur über renderGuidanceMarkdown angezeigt (DOMPurify)', () => {
    const app = read('ui/app.js')
    expect(app).toMatch(/function renderGuidanceMarkdown\(md\)/)
    expect(app).toMatch(/DOMPurify\.sanitize\(/)
    expect(app).not.toMatch(/marked\.parse\(doc\.content/)
  })
})

describe('Login-Timing (GHSA-8w4w-fqgh-c4fq)', () => {
  test('unbekannte Benutzer durchlaufen vor der Absage einen bcrypt-Vergleich', () => {
    const route = read('server/routes/auth.js')
    const iUnknown = route.indexOf('if (!userRaw) {')
    expect(iUnknown).toBeGreaterThan(-1)
    const branch = route.slice(iUnknown, route.indexOf('}', iUnknown))
    expect(branch.indexOf('verifyPassword')).toBeGreaterThan(-1)
    expect(branch.indexOf('verifyPassword')).toBeLessThan(branch.indexOf('recordFailure'))
    expect(read('server/rbacStore.js')).toMatch(/await bcrypt\.compare\([^\n]*dummyHash\(\)\)/)
  })
})

describe('Bestätigungs-Links (GHSA-vf3w-pmvj-x8mc)', () => {
  test.each(['server/db/ackStore.js', 'server/db/stores/ackStore.js'])('%s erzeugt das Token mit randomToken()', f => {
    const src = read(f)
    expect(src).toMatch(/token:\s+randomToken\(\)/)
    expect(src).not.toMatch(/token:\s+uuidv4\(\)/)
  })
  test('die öffentliche Seite akzeptiert nur ein sauberes Token-Format und maskiert es', () => {
    const route = read('server/routes/ackPublic.js')
    expect((route.match(/isTokenFormat\(req\.params\.token\)/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(route).toMatch(/escapeHtml\(req\.params\.token\)/)
  })
})

describe('Auch Administratoren kennen keine Passwörter', () => {
  test('Organisations-Einstellungen: Ausgabe ohne Geheimnisse, Speichern mit „leer = unverändert“', () => {
    const admin = read('server/routes/admin.js')
    expect(admin).toMatch(/res\.json\(redactOrgSettings\(await orgSettingsStore\.get\(\)\)\)/)
    expect(admin).toMatch(/orgSettingsStore\.update\(prepareOrgPatch\(req\.body\)\)/)
  })
  test('Datenexport: beide Stellen bereinigen Nutzer und Einstellungen; Export liest aus DATA_DIR', () => {
    const admin = read('server/routes/admin.js')
    expect((admin.match(/sanitizeExportFile\(/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(admin).toMatch(/const dataDir = DATA_DIR/)
  })
  test('der WebDAV-Test nutzt das gespeicherte Passwort nur für die gespeicherte Adresse', () => {
    expect(read('server/routes/admin.js')).toMatch(/baseUrl === stored\.baseUrl && username === stored\.username/)
  })
  test('vom Administrator vergebene Passwörter müssen beim ersten Login geändert werden', () => {
    const admin = read('server/routes/admin.js')
    expect(admin).toMatch(/createUser\(\{[^}]*mustChangePassword: true/)
    expect(admin).toMatch(/mustChangePassword: username !== req\.user/)
    const auth = read('server/auth.js')
    expect(auth).toMatch(/isPasswordChangeRequired\(sess\.username\)/)
    expect(auth).toMatch(/PASSWORD_CHANGE_REQUIRED/)
    expect(auth).toMatch(/req\.path === '\/me\/password'/)
    expect(exists('ui/change-password.html')).toBe(true)
  })
})

describe('Workflows und Docker', () => {
  const workflows = fs.readdirSync(path.join(ROOT, '.github', 'workflows')).filter(f => /\.ya?ml$/.test(f))
  test.each(workflows)('%s: keine Trigger, die Fremden Zugriff auf Geheimnisse geben', f => {
    expect(read(`.github/workflows/${f}`)).not.toMatch(/pull_request_target|workflow_run|issue_comment/)
  })
  test('das Docker-Image kopiert gezielte Verzeichnisse, nie das ganze Projekt', () => {
    expect(read('Dockerfile')).not.toMatch(/^COPY\s+\.\s+\./m)
  })
})
