'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (Jest kann das ES-Modul-Paket puppeteer-core nicht laden): rendert Nutzlasten mit der echten
// Funktion renderGuidanceMarkdown aus ui/app.js, den echten Bibliotheken marked und DOMPurify in echtem Chrome und gibt JSON aus.
const fs = require('fs')
const path = require('path')
// puppeteer-core ist ein ES-Modul: per dynamischem import() laden (require() scheitert auf Node 18 mit ERR_REQUIRE_ESM).
// Lässt es sich nicht laden, endet der Prozess mit Code 3; der Test überspringt dann den Browserteil.
const ROOT = path.join(__dirname, '..', '..')
const APP_JS = fs.readFileSync(path.join(ROOT, 'ui', 'app.js'), 'utf8')
const CHROME = process.argv[2]
const PAYLOADS = JSON.parse(process.argv[3])

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><html><body></body></html>')
    await page.addScriptTag({ path: path.join(ROOT, 'ui', 'vendor', 'marked.min.js') })
    await page.addScriptTag({ path: path.join(ROOT, 'ui', 'vendor', 'purify.min.js') })
    const start = APP_JS.indexOf('function renderGuidanceMarkdown(md)')
    const src = 'const escHtml = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");\n' + APP_JS.slice(start, APP_JS.indexOf('\nfunction renderMarkdownSafe', start))
    await page.addScriptTag({ content: src + '\nwindow.render = renderGuidanceMarkdown' })
    const results = []
    for (const md of PAYLOADS) {
      results.push(await page.evaluate(async md => {
        window.__x = 0
        const box = document.createElement('div'); box.innerHTML = window.render(md); document.body.appendChild(box)
        await new Promise(r => setTimeout(r, 250))
        // echte Ereignis-Attribute (onerror, onload …) an irgendeinem Element – Text in Attributwerten zählt nicht
        const onAttrs = [...box.querySelectorAll('*')].reduce((n, el) => n + [...el.attributes].filter(a => /^on/i.test(a.name)).length, 0)
        const html = box.innerHTML; box.remove()
        return { md, fired: window.__x, onAttrs, html }
      }, md))
    }
    console.log(JSON.stringify(results))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
