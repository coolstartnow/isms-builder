'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): BCM → Reiter „Anforderungen“ in der echten Oberfläche.
// Aufruf: node bcmRequirementsBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <CSV-Datei oder -> 
const [CHROME, BASE, EMAIL, PASSWORD, CSV] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    page.on('dialog', d => d.dismiss())
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    await page.evaluate(() => { window.__xss = 0; _bcmTab = 'requirements'; renderBcm() }); await sleep(1500)
    const out = {}
    out.empty = await page.evaluate(() => ({ importBtn: !!document.querySelector('[data-testid=bcmrImportBtn]'), text: document.getElementById('bcmTabContent')?.textContent.slice(0, 60) || '' }))
    if (CSV !== '-') {
      await page.click('[data-testid=bcmrImportBtn]'); await sleep(400)
      const input = await page.$('#bcmrFile'); await input.uploadFile(CSV); await sleep(1500)
      out.preview = await page.evaluate(() => ({ text: document.getElementById('bcmrPreview')?.textContent || '', applyDisabled: document.getElementById('bcmrApply')?.disabled }))
      await page.click('[data-testid=bcmrApply]'); await sleep(2000)
    }
    out.tree = await page.evaluate(() => ({ rows: document.querySelectorAll('.bcmr-row').length, opens: document.querySelectorAll('[data-testid=bcmrOpen]').length, importBtn: !!document.querySelector('[onclick="openBcmReqImport()"]'), xss: window.__xss, scripts: document.querySelectorAll('#bcmrTree script, #bcmrTree img').length }))
    if (out.tree.opens) {
      await page.evaluate(() => document.querySelector('[data-testid=bcmrOpen]').click()); await sleep(500)
      out.dialog = await page.evaluate(() => ({ save: !!document.querySelector('[data-testid=bcmrSave]'), statusDisabled: document.getElementById('bcmrfStatus')?.disabled }))
      if (out.dialog.save) {
        await page.select('#bcmrfStatus', 'implemented'); await page.type('#bcmrfResp', 'Frau Browser'); await page.type('#bcmrfEv', 'aus dem Browsertest')
        await page.click('[data-testid=bcmrSave]'); await sleep(1500)
        out.afterSave = await page.evaluate(() => ({ implemented: document.querySelectorAll('.bcm-badge.approved').length, dialogOpen: !!document.getElementById('bcmReqDialog') }))
      }
    }
    // Filter
    await page.evaluate(() => { _bcmReq.status = 'implemented'; renderBcmReqTree() }); await sleep(300)
    out.filtered = await page.evaluate(() => document.querySelectorAll('[data-testid=bcmrOpen]').length)
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
