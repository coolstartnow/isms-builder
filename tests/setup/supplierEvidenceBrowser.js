'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess: Lieferantenliste und -formular im echten Chrome mit Nachweis-Link.
// Aufruf: node supplierEvidenceBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=de-DE', '--accept-lang=de-DE,de'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 950 })
    const dialogs = []
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss() })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => { document.getElementById('splashOverlay')?.remove(); window.__pwned = 0 })
    await page.evaluate(() => renderSuppliers()); await sleep(1800)
    const rows = await page.evaluate(() => [...document.querySelectorAll('#suppliersContainer tbody tr')].map(tr => {
      const cells = tr.querySelectorAll('td'); const a = tr.querySelector('a[target=_blank]')
      return { name: cells[0]?.textContent.trim().split('\n')[0].trim(), evidenceCell: cells[7]?.textContent.replace(/\s+/g, ' ').trim(), href: a ? a.getAttribute('href') : null, rel: a ? a.getAttribute('rel') : null,
        imgs: cells[7]?.querySelectorAll('img, script').length || 0, expiredMark: !!cells[7]?.querySelector('.bcm-overdue') }
    }))
    const header = await page.evaluate(() => [...document.querySelectorAll('#suppliersContainer thead th')].map(th => th.textContent.trim()))
    // Formular eines Lieferanten mit Nachweis
    await page.evaluate(() => openSupplierForm('sup_ok')); await sleep(1200)
    const form = await page.evaluate(() => ({ url: document.getElementById('supEvidenceUrl')?.value, label: document.getElementById('supEvidenceLabel')?.value, until: document.getElementById('supEvidenceValidUntil')?.value }))
    const pwned = await page.evaluate(() => window.__pwned)
    process.stdout.write(JSON.stringify({ header, rows, form, pwned, dialogs }))
  } finally { await browser.close() }
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
