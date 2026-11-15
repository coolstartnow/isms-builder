'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Wächter: Der Notweg bei Aussperrung durch die 2FA-Pflicht muss erhalten bleiben — Werkzeug im Docker-Image, in jeder Sprache dokumentiert,
// Schutz vor Selbst-Aussperrung in der Route, Warnung beim Start, keine Geheimnisse in der Ausgabe.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')
const LANG = ['', '.en', '.fr', '.nl', '.hu', '.et']

describe('Notweg bei 2FA-Aussperrung', () => {
  test('das Docker-Image enthält das Werkzeug (sonst gibt es im Container keinen Notweg)', () => {
    expect(read('Dockerfile')).toMatch(/COPY scripts\/emergency-2fa\.js \.\/scripts\/emergency-2fa\.js/)
  })
  test.each(LANG)('Anleitung module-login-security%s.md nennt Werkzeug, alle Befehle und den Fehlercode', suf => {
    const t = read(`docs/module-login-security${suf}.md`)
    for (const k of ['scripts/emergency-2fa.js', 'disable-policy', 'reset-user', 'status', 'ENFORCE_2FA_SELF', 'docker exec']) expect([suf, k, t.includes(k)]).toEqual([suf, k, true])
  })
  test.each(LANG)('Verwaltungsanleitung admin-console%s.md verweist auf den Notweg', suf => {
    expect(read(`docs/admin-console${suf}.md`)).toMatch(/emergency-2fa\.js disable-policy/)
  })
  test('Route: Einschalten wird ohne eigene 2FA mit 409 abgelehnt; Ausschalten bleibt immer möglich', () => {
    const src = read('server/routes/admin.js'), i = src.indexOf("router.put('/admin/security'"), block = src.slice(i, src.indexOf('\n})', i))
    expect(block).toMatch(/require2FA === true && !twoFactorPolicy\.has2FA\(/); expect(block).toMatch(/409/); expect(block).toMatch(/ENFORCE_2FA_SELF/)
    expect(block.indexOf('ENFORCE_2FA_SELF')).toBeLessThan(block.indexOf('orgSettingsStore.update'))
  })
  test('Serverstart warnt (Pflicht an, kein Administrator mit 2FA)', () => {
    expect(read('server/index.js')).toMatch(/twoFactorPolicy'\)\.warnAtStart\(\)/)
  })
  test('Werkzeug gibt nie ein Geheimnis aus und fragt vor jeder Änderung (JA)', () => {
    const t = read('scripts/emergency-2fa.js')
    expect(t).not.toMatch(/console\.(log|error)\([^)]*totpSecret/); expect(t).toMatch(/JA/); expect(t).toMatch(/--force/)
  })
  test('ROADMAP merkt die Selbsteinrichtung der 2FA bei der Anmeldung vor', () => {
    expect(read('ROADMAP.md')).toMatch(/self-enrolment at sign-in/i)
  })
})
