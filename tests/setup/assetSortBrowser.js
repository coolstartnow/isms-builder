'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): Asset-Liste sortieren (Diskussion #111).
// Aufruf: node assetSortBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <voll|ansicht>
const [CHROME, BASE, EMAIL, PASSWORD, MODE] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)))
    page.on('dialog', d => d.accept())
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(3500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    const out = {}
    const openAssets = async () => { await page.evaluate(() => loadSection('assets')); await page.waitForSelector('.asset-table', { timeout: 15000 }); await sleep(800) }
    const names = () => page.evaluate(() => [...document.querySelectorAll('#assetsTableWrap tbody tr')].map(r => r.querySelector('td strong').textContent))
    const clickHead = async key => { await page.evaluate(k => document.querySelector(`th[data-sort="${k}"]`).click(), key); await sleep(1200) }
    await openAssets()
    out.standard = await names()
    out.headers = await page.evaluate(() => [...document.querySelectorAll('th[data-sort]')].map(h => h.dataset.sort + ':' + h.getAttribute('aria-sort')))
    await clickHead('name'); out.nameAsc = await names(); out.ariaAsc = await page.evaluate(() => document.querySelector('th[data-sort="name"]').getAttribute('aria-sort'))
    await clickHead('name'); out.nameDesc = await names()
    out.stored = await page.evaluate(() => localStorage.getItem('isms_asset_sort'))
    await clickHead('name'); out.reset = await names(); out.storedAfterReset = await page.evaluate(() => localStorage.getItem('isms_asset_sort'))
    // Reiter „Nach Kategorie“: Gruppen alphabetisch, darin Typ → Name; Bearbeiten-Knöpfe nur mit Recht
    await page.evaluate(() => document.querySelector('.training-tab[data-tab="by-category"]').click()); await page.waitForSelector('.asset-category-section', { timeout: 15000 }); await sleep(800)
    out.byCat = await page.evaluate(() => [...document.querySelectorAll('.asset-category-section')].map(s => ({ cat: s.querySelector('.asset-category-header span').textContent, rows: [...s.querySelectorAll('tbody tr strong')].map(x => x.textContent) })).filter(g => g.rows.length))
    out.catOrder = await page.evaluate(() => [...document.querySelectorAll('.asset-category-header span:first-of-type')].map(x => x.textContent))
    out.editBtns = await page.evaluate(() => document.querySelectorAll('.asset-category-section button[onclick^="openAssetForm"]').length)
    out.deleteBtns = await page.evaluate(() => document.querySelectorAll('.asset-category-section button[onclick^="deleteAsset"]').length)
    out.strayImgs = await page.evaluate(() => document.querySelectorAll('img[src="x"]').length)
    if (MODE === 'voll') {
      // Bearbeiten im Reiter „Nach Kategorie“ → Speichern kehrt in diesen Reiter zurück, die Zeile ist hervorgehoben
      await page.evaluate(() => document.querySelector('.asset-category-section button[onclick^="openAssetForm"]').click()); await page.waitForSelector('#asName', { timeout: 15000 }); await sleep(600)
      out.formName = await page.evaluate(() => document.getElementById('asName').value)
      await page.evaluate(() => document.querySelector('[onclick^="saveAsset"]').click()); await page.waitForSelector('.asset-category-section', { timeout: 15000 }); await sleep(900)
      out.afterSave = await page.evaluate(() => ({ tab: _assetsTab, flashed: document.querySelectorAll('tr.asset-row-new').length, byCatVisible: !!document.querySelector('.asset-category-section') }))
      // Neues Asset in der Liste: erscheint an seinem sortierten Platz (nicht unten), ist hervorgehoben, ein gesetzter Filter bleibt erhalten
      await page.evaluate(() => document.querySelector('.training-tab[data-tab="list"]').click()); await page.waitForSelector('.asset-table', { timeout: 15000 }); await sleep(800)
      await page.evaluate(() => { const s = document.getElementById('assetFilterCat'); s.value = 'hardware'; _filterAssets() }); await sleep(1200)
      await page.evaluate(() => openAssetForm()); await page.waitForSelector('#asName', { timeout: 15000 }); await sleep(600)
      await page.evaluate(() => { document.getElementById('asName').value = 'Bürorechner 03'; document.getElementById('asCat').value = 'hardware'; const t = document.getElementById('asType'); if (t) t.value = 'hardware_laptop' })
      out.newType = await page.evaluate(() => document.getElementById('asType')?.value ?? null)
      await page.evaluate(() => document.querySelector('[onclick^="saveAsset"]').click()); await page.waitForSelector('.asset-table', { timeout: 15000 }); await sleep(1500)
      out.afterNew = { names: await names(), filter: await page.evaluate(() => document.getElementById('assetFilterCat')?.value), flashed: await page.evaluate(() => document.querySelectorAll('tr.asset-row-new').length) }
    }
    out.errors = errors
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e && e.stack || String(e)); process.exit(1) })
