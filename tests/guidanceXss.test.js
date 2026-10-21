'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gespeichertes XSS in Guidance (GHSA-m8g6-pq5j-2r9r): Markdown/HTML wird vor Anzeige, Vorschau und Druckfenster bereinigt.
//  · statisch: marked.parse( steht nur in den beiden Hilfsfunktionen, die bereinigen bzw. '<' neutralisieren
//  · echter Browser (Chrome): die Hilfsfunktion renderGuidanceMarkdown aus ui/app.js mit den echten Bibliotheken marked und DOMPurify
const fs = require('fs')
const path = require('path')
const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')
const INDEX = fs.readFileSync(path.join(__dirname, '..', 'ui', 'index.html'), 'utf8')

describe('statische Prüfung', () => {
  test('marked.parse( wird nur in renderGuidanceMarkdown und renderMarkdownSafe aufgerufen', () => {
    const lines = APP_JS.split('\n'); const hits = []
    lines.forEach((l, i) => { if (l.includes('marked.parse(')) hits.push(i) })
    expect(hits.length).toBe(2)
    for (const i of hits) {
      const before = lines.slice(0, i + 1).join('\n')
      const fn = [...before.matchAll(/^function (\w+)\(/gm)].pop()[1]
      expect(['renderGuidanceMarkdown', 'renderMarkdownSafe']).toContain(fn)
    }
  })
  test('Guidance-Anzeige, Druckfenster und Vorschau nutzen renderGuidanceMarkdown', () => {
    expect((APP_JS.match(/renderGuidanceMarkdown\(/g) || []).length).toBeGreaterThanOrEqual(4)   // Definition + 3 Stellen
    expect(APP_JS).toMatch(/pv\.innerHTML = renderGuidanceMarkdown\(txt\)/)
  })
  test('DOMPurify wird vor app.js geladen', () => {
    const iP = INDEX.indexOf('vendor/purify.min.js'), iA = INDEX.indexOf('/ui/app.js')
    expect(iP).toBeGreaterThan(-1); expect(iP).toBeLessThan(iA)
    expect(fs.existsSync(path.join(__dirname, '..', 'ui', 'vendor', 'purify.min.js'))).toBe(true)
  })
  test('DOMPurify ist in THIRD-PARTY-LICENSES.md aufgeführt', () => {
    expect(fs.readFileSync(path.join(__dirname, '..', 'THIRD-PARTY-LICENSES.md'), 'utf8')).toMatch(/### DOMPurify/)
  })
})

const { spawnSync } = require('child_process')
const CHROME = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
const browserDescribe = CHROME ? describe : describe.skip

const PAYLOADS = [
  '<img src=x onerror="window.__x=1">',
  '<script>window.__x=1</script>',
  '<svg onload="window.__x=1"></svg>',
  '<iframe srcdoc="<script>parent.__x=1</script>"></iframe>',
  '<a href="javascript:window.__x=1">klick</a>',
  '<details open ontoggle="window.__x=1"><summary>x</summary></details>',
  '<form action="javascript:window.__x=1"><button formaction="javascript:window.__x=1">go</button></form>',
  '<style>body{display:none}</style>',
  '<div style="position:fixed;inset:0">overlay</div>',
  '[x](javascript:window.__x=1)',
  '![x](x "t\\" onerror=\\"window.__x=1")',
  '<math><mtext><table><mglyph><style><img src=x onerror="window.__x=1">',
  '<object data="javascript:window.__x=1"></object><embed src="javascript:window.__x=1">',
]
const NORMAL = '# Titel\n\nText mit **fett**, `code` und [Link](https://example.org).\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<p>Absatz</p><br><img src="docs/screenshots/01-login.png" alt="Bild">'

browserDescribe('renderGuidanceMarkdown im Browser (Chrome)', () => {
  let results
  beforeAll(() => {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'setup', 'guidanceXssBrowser.js'), CHROME, JSON.stringify([...PAYLOADS, NORMAL])], { encoding: 'utf8', timeout: 90000 })
    if (r.status === 3) { console.warn(`Browser-Test übersprungen: puppeteer-core ist unter Node ${process.version} nicht ladbar`); results = null; return }
    if (r.status !== 0) throw new Error('Browser-Prozess fehlgeschlagen: ' + (r.stderr || r.stdout))
    results = JSON.parse(r.stdout.trim().split('\n').pop())
  }, 120000)

  test.each(PAYLOADS.map((p, i) => [p, i]))('Nutzlast wird entschärft: %s', (p, i) => {
    if (!results) return   // Browser nicht ladbar (siehe beforeAll)
    const r = results[i]
    expect(r.md).toBe(p)
    expect(r.fired).toBe(0)
    expect(r.onAttrs).toBe(0)   // kein Element trägt ein Ereignis-Attribut
    expect(r.html).not.toMatch(/<script|<iframe|<style|<form|<object|<embed|javascript:|srcdoc|formaction|\sstyle=/i)
  })
  test('normales Markdown und harmloses HTML bleiben erhalten', () => {
    if (!results) return
    const html = results[PAYLOADS.length].html
    expect(html).toMatch(/<h1[^>]*>Titel<\/h1>/)
    expect(html).toMatch(/<strong>fett<\/strong>/); expect(html).toMatch(/<table>/); expect(html).toMatch(/<img[^>]+docs\/screenshots\/01-login\.png/)
    expect(html).toMatch(/<a href="https:\/\/example\.org"[^>]*rel="noopener noreferrer"/)
  })
})
