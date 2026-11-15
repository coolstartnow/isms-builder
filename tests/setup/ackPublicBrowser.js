'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): öffnet die öffentliche Bestätigungsseite im echten Chrome und meldet,
// ob eingeschleuste Elemente, Ereignis-Attribute oder gefährliche Verweise vorhanden sind. Aufruf: node ackPublicBrowser.js <Chrome> <URL>
const [CHROME, URL_] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=de-DE', '--accept-lang=de-DE,de'] })
  try {
    const page = await browser.newPage()
    let dialogs = 0
    page.on('dialog', d => { dialogs++; d.dismiss() })
    await page.evaluateOnNewDocument(() => { window.__xss = 0 })
    await page.goto(URL_, { waitUntil: 'networkidle0', timeout: 30000 })
    await sleep(800)
    const out = await page.evaluate(() => {
      const box = document.getElementById('policyContent')
      return {
        rendered: !!box && box.querySelector('h1') !== null,
        text: box ? box.textContent.includes('xssmarker') : false,
        imgs: box ? box.querySelectorAll('img[src="x"], img[onerror]').length : -1,
        handlers: box ? box.querySelectorAll('[onerror],[onload],[onfocus],[onclick]').length : -1,
        scripts: box ? box.querySelectorAll('script,iframe,object,embed,form').length : -1,
        badLinks: box ? [...box.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^\s*(javascript|data|vbscript):/i.test(h)).length : -1,
        goodLink: box ? [...box.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === 'https://example.org' && a.rel.includes('noopener')) : false,
        xss: window.__xss,
      }
    })
    out.dialogs = dialogs
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
