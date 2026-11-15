'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess: Einrichtung des Lieferanten-Briefkastens und Versandweg im echten Chrome.
// Aufruf: node supplierPortalBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <Briefkasten-URL> <API-Schlüssel>
const [CHROME, BASE, EMAIL, PASSWORD, PORTAL, KEY] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 1000 })
    const dialogs = []
    page.on('dialog', d => { dialogs.push(d.message()); d.accept() })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => { document.getElementById('splashOverlay')?.remove(); window.__pwned = 0; localStorage.setItem('isms_lang', 'de'); window.LANG = 'de' })
    await page.evaluate(() => renderSuppliers()); await sleep(1500)
    await page.evaluate(() => switchSuppliersTab('templates')); await sleep(1800)
    const out = {}
    out.hasSetup = await page.evaluate(() => !!document.getElementById('portUrl'))
    if (out.hasSetup) {
      out.keyBtnBefore = await page.evaluate(() => document.getElementById('portKeyBtn').textContent.trim())
      await page.click('#portKeyBtn'); await sleep(1200)
      await page.type('#portUrl', PORTAL); await page.type('#portApiKey', KEY)
      await page.evaluate(() => { document.getElementById('portEnabled').checked = true })
      await page.click('#portTest'); await sleep(800)
      out.testBeforeSave = await page.evaluate(() => document.getElementById('portMsg').textContent)
      await page.click('#portSave'); await sleep(1500)
      out.afterSave = await page.evaluate(() => ({ enabled: document.getElementById('portEnabled').checked, keyText: document.querySelector('#portalSetup details div div').parentElement.textContent.replace(/\s+/g, ' ').trim().slice(0, 60), keyFieldValue: document.getElementById('portApiKey').value, placeholder: document.getElementById('portApiKey').placeholder }))
      await page.click('#portTest'); await sleep(1000)
      out.test = await page.evaluate(() => document.getElementById('portMsg').textContent)
    }
    // Lieferant + Fragebogen über den Briefkasten
    const supId = await page.evaluate(async () => {
      const r = await fetch('/suppliers', { method: 'POST', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Briefkasten-Lieferant', type: 'software', criticality: 'high', status: 'active', country: 'DE' }) })
      return (await r.json()).id
    })
    await page.evaluate(id => openCreateAssessment(id), supId); await sleep(1500)
    out.deliveryOptions = await page.evaluate(() => [...document.querySelectorAll('#assDelivery option')].map(o => o.value))
    if (out.deliveryOptions.length) {
      await page.select('#assTemplate', 'builtin:nis2'); await sleep(400)
      await page.evaluate(id => createAssessment(id), supId); await sleep(1800)
      out.link = await page.evaluate(() => document.getElementById('assessLinkInput')?.value)
      await page.evaluate(id => openSupplierAssessments(id), supId); await sleep(1500)
      out.list = await page.evaluate(() => ({ badge: document.querySelector('#suppliersTabContent tbody .badge-info')?.textContent.trim(), pollBtn: !![...document.querySelectorAll('#suppliersTabContent button')].find(b => /abholen/i.test(b.textContent)), linkAttr: document.querySelector('#suppliersTabContent [data-link]')?.dataset.link }))
    }
    out.pwned = await page.evaluate(() => window.__pwned)
    out.dialogs = dialogs
    process.stdout.write(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
