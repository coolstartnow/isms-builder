'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess: PDF-Schrift in Administration → Organisation und die Druckfenster im echten Chrome.
// Aufruf: node pdfFontBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 1000 })
    page.on('dialog', d => d.accept())
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => { document.getElementById('splashOverlay')?.remove(); localStorage.setItem('isms_lang', 'de'); window.LANG = 'de' })
    for (let i = 0; i < 4 && !(await page.$('#adminTabOrg')); i++) { await page.evaluate(() => renderSectionContent('admin')); await sleep(2500) }
    await page.evaluate(() => adminShowTab('org')); await sleep(2500)
    const out = {}
    out.box = await page.evaluate(() => ({
      radios: [...document.querySelectorAll('input[name=pdfFontChoice]')].map(r => ({ v: r.value, checked: r.checked, disabled: r.disabled })),
      preview: document.getElementById('pdfFontPreview')?.getAttribute('href'),
      customFiles: ['regular', 'bold', 'italic', 'mono'].map(s => !!document.getElementById('pdfFontFile_' + s)),
    }))
    // Druckfenster: Schrift ist geladen
    const printCss = async () => page.evaluate(async () => {
      const w = openPrintWindow()
      w.document.write('<html><head><style>body{font-family:Arial}</style></head><body><p>Őrzés űrlap</p><span id="ref" style="font-family:monospace">F-2026-001</span></body></html>')
      const css = w.document.querySelector('style').textContent
      const url = (/url\('([^']+regular[^']*)'\)/.exec(css) || [])[1]
      let status = null, type = null
      if (url) { const r = await fetch(url); status = r.status; type = r.headers.get('content-type') }
      const usesFont = getComputedStyle(w.document.body).fontFamily
      w.close()
      const monoUrl = (/url\('([^']+mono[^']*)'\)/.exec(css) || [])[1]
      let monoStatus = null, monoType = null
      if (monoUrl) { const r = await fetch(monoUrl); monoStatus = r.status; monoType = r.headers.get('content-type') }
      const refFont = getComputedStyle(w.document.getElementById('ref')).fontFamily
      return { hasFace: css.includes('@font-face'), usesFont, status, type, printOverridden: !!url, hasMono: css.includes('ISMS-PDF-Mono'), monoStatus, monoType, refFont }
    })
    out.printDefault = await printCss()
    // Auswahl „Noto Sans“ → gespeichert, Zustand aktualisiert
    await page.click('input[name=pdfFontChoice][value=noto]'); await sleep(1800)
    out.afterNoto = await page.evaluate(async () => ({ active: (await (await fetch('/pdf-font/active', { headers: apiHeaders() })).json()), checked: document.querySelector('input[name=pdfFontChoice]:checked')?.value, previewHref: document.getElementById('pdfFontPreview')?.getAttribute('href') }))
    out.printNoto = await printCss()
    // Helvetica: keine Schrift mehr nachladen
    await page.click('input[name=pdfFontChoice][value=helvetica]'); await sleep(1800)
    out.printHelvetica = await printCss()
    // Eigene Schrift ohne Lizenzhaken → Hinweis, nichts hochgeladen
    await page.evaluate(() => { document.querySelector('#pdfFontBox details').open = true })
    await page.click('#pdfFontUpload'); await sleep(500)
    out.needLicense = await page.evaluate(() => document.getElementById('pdfFontMsg').textContent)
    process.stdout.write(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
