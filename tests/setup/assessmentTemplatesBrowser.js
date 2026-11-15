'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess: Fragebogen-Vorlagen und Fragenauswahl im echten Chrome.
// Aufruf: node assessmentTemplatesBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
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
    await page.evaluate(() => switchSuppliersTab('templates')); await sleep(1500)
    const out = {}
    out.list = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('#suppliersTabContent tbody tr')].map(tr => tr.querySelector('td').textContent.trim().replace(/\s+/g, ' ')),
      hasNew: !!document.querySelector('#suppliersTabContent [data-act=new]'),
      tab: !!document.querySelector('.training-tab[data-tab=templates]'),
    }))
    if (out.list.hasNew) {
      await page.click('#suppliersTabContent [data-act=new]'); await sleep(800)
      // Katalog NIS2 wählen, alles gestellt; dann Abschnitt 1 abwählen und eine Pflicht entfernen
      await page.select('#tplCatalog', 'nis2'); await sleep(500)
      out.nis2 = await page.evaluate(() => ({ asked: document.querySelectorAll('#tplPicker [data-kind=ask]:checked').length, summary: document.querySelector('.qp-summary').textContent }))
      await page.click('#tplPicker [data-kind=sec][data-sec="0"]'); await sleep(300)
      await page.click('#tplPicker [data-kind=none]'); await sleep(300)
      out.none = await page.evaluate(() => document.querySelector('.qp-summary').textContent)
      await page.evaluate(() => document.querySelector('#tplPicker [data-kind=sec][data-sec="2"]').click()); await sleep(300)  // Abschnitt "Vorfälle"
      await page.click('#tplPicker [data-kind=cadd]'); await sleep(300)
      await page.type('#tplPicker [data-kind=ctext]', '<img src=x onerror="window.__pwned=1">Eigene Frage')
      await page.click('#tplSave'); await sleep(300)
      out.errNoName = await page.evaluate(() => document.getElementById('tplErr').textContent)
      await page.type('#tplName', '<b onmouseover="window.__pwned=2">Cloud</b>')
      await page.click('#tplSave'); await sleep(1500)
      out.after = await page.evaluate(() => [...document.querySelectorAll('#suppliersTabContent tbody tr')].map(tr => ({ name: tr.querySelector('td').textContent.trim().replace(/\s+/g, ' '), cells: [...tr.querySelectorAll('td')].slice(2, 4).map(c => c.textContent.trim()), html: tr.querySelector('td').innerHTML })))
      // Lieferant anlegen und Fragebogen mit Vorlage erzeugen, Fragen je Lieferant anpassen
      const supId = await page.evaluate(async () => {
        const r = await fetch('/suppliers', { method: 'POST', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Browser-Lieferant', type: 'software', criticality: 'high', status: 'active', country: 'DE' }) })
        return (await r.json()).id
      })
      await page.evaluate(id => openCreateAssessment(id), supId); await sleep(1500)
      out.create = await page.evaluate(() => ({ options: [...document.querySelectorAll('#assTemplate option')].map(o => o.textContent), summary: document.querySelector('#assPicker .qp-summary')?.textContent }))
      await page.select('#assTemplate', 'builtin:nis2'); await sleep(500)
      await page.evaluate(() => { document.getElementById('assAdjust').open = true })
      // Abschnitt 1 abwählen (4 Fragen weniger), bei der ersten verbleibenden Frage Pflicht entfernen
      await page.evaluate(() => document.querySelector('#assPicker [data-kind=sec][data-sec="0"]').click()); await sleep(300)
      await page.evaluate(() => document.querySelector('#assPicker [data-kind=req]:not([disabled])').click()); await sleep(300)
      out.adjusted = await page.evaluate(() => document.querySelector('#assPicker .qp-summary').textContent)
      await page.evaluate(id => createAssessment(id), supId); await sleep(1500)
      out.created = await page.evaluate(async id => {
        const r = await fetch('/assessments?supplierId=' + id, { headers: apiHeaders() }); const l = await r.json()
        const a = l[0]; const qs = a.questions.flatMap(s => s.questions)
        return { n: qs.length, firstRequired: qs[0].required, secondRequired: qs[1].required, templateId: a.templateId, linkShown: !!document.getElementById('assessLinkInput') }
      }, supId)
    }
    out.pwned = await page.evaluate(() => window.__pwned)
    out.dialogs = dialogs
    process.stdout.write(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
