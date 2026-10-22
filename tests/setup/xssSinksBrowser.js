'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): öffnet als Administrator die Stellen, an denen Texte anderer Konten
// angezeigt werden, und zählt eingeschleuste Elemente. Aufruf: node xssSinksBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <JSON mit Daten>
const [CHROME, BASE, EMAIL, PASSWORD, DATA] = process.argv.slice(2)
const info = JSON.parse(DATA)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    let dialogs = 0
    page.on('dialog', d => { dialogs++; d.dismiss() })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    // eingeschleuste Elemente: <img src="x">, Ereignis-Attribute (onfocus/onerror), eigene Skripte
    const injected = sel => page.evaluate(s => {
      const root = document.querySelector(s) || document.body
      return { imgs: root.querySelectorAll('img[src="x"]').length, handlers: root.querySelectorAll('[onfocus],[onerror],[autofocus]').length, xss: window.__xss || 0, text: root.textContent.includes('xssmarker') }
    }, sel)
    const out = {}
    await page.evaluate(() => { window.__xss = 0 })

    // 1) Berichte → Dokumentenübersicht
    await page.evaluate(() => renderReports()); await sleep(1200)
    await page.evaluate(() => runReport('templates')); await sleep(2500)
    out.report = await injected('#reportResult')

    // 2) Globale Suche
    await page.evaluate(() => { const i = document.getElementById('topbarSearch'); i.focus(); i.value = 'xssmarker'; i.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(2500)
    out.search = await injected('#searchDropdown')

    // 3) Risikoliste (CVE-Kennungen, Titel)
    await page.evaluate(() => { loadSection('risk'); return renderRisk() }); await sleep(2500)
    out.risks = await injected('#riskContainer, .risk-container, main')

    // 4) SoA (Verantwortliche/r, Begründung, Titel und Thema eigener Controls)
    await page.evaluate(fw => { soaActiveFramework = fw; return renderSoa() }, info.soaFramework); await sleep(2500)
    out.soa = await injected('#soaContainer')

    // 5) Anhangsleiste eines Dokuments
    await page.evaluate((type, id) => loadTemplateById(type, id), info.docType, info.docId); await sleep(2500)
    out.attachments = await injected('#tmplAttachmentsBar')
    out.breadcrumb = await injected('#breadcrumb')
    out.page = await injected('body')
    out.dialogs = dialogs
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
