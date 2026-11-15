'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess: Sprachauswahl (Organisationssprachen), Ansprechpartner, PDF-Download und Erfassen der Antworten im echten Chrome.
// Aufruf: node supplierFormBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--lang=de-DE', '--accept-lang=de-DE,de'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 1000 })
    const dialogs = []
    let acceptDialogs = true
    page.on('dialog', d => { dialogs.push(d.message()); acceptDialogs ? d.accept() : d.dismiss() })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => { document.getElementById('splashOverlay')?.remove(); window.__pwned = 0; localStorage.setItem('isms_lang', 'de'); window.LANG = 'de' })
    await page.evaluate(() => renderSuppliers()); await sleep(1500)
    const out = {}
    const supId = await page.evaluate(async () => {
      const r = await fetch('/suppliers', { method: 'POST', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '<img src=x onerror="window.__pwned=1">Formular-Lieferant', type: 'software', criticality: 'high', status: 'active', country: 'DE' }) })
      return (await r.json()).id
    })
    await page.evaluate(id => openCreateAssessment(id), supId); await sleep(1800)
    out.lang = await page.evaluate(() => { const s = document.getElementById('assLanguage'); return { options: [...s.options].map(o => o.value), selected: s.value, hidden: getComputedStyle(s).display === 'none', title: document.getElementById('assTitle').value } })
    out.contact = await page.evaluate(() => ({ name: document.getElementById('assContactName').value, email: document.getElementById('assContactEmail').value }))
    if (out.lang.options.length > 1) {
      await page.select('#assLanguage', 'en'); await sleep(300)
      out.titleEn = await page.evaluate(() => document.getElementById('assTitle').value)
    }
    // klein halten: nur wenige Fragen
    await page.select('#assTemplate', 'builtin:nis2'); await sleep(400)
    await page.evaluate(() => { document.getElementById('assAdjust').open = true })
    await page.evaluate(() => document.querySelector('#assPicker [data-kind=none]').click()); await sleep(300)
    for (let i = 0; i < 2; i++) { await page.evaluate(() => document.querySelector('#assPicker [data-kind=ask]:not(:checked)').click()); await sleep(300) }   // nach jedem Klick wird neu gezeichnet
    await page.evaluate(id => createAssessment(id), supId); await sleep(1800)
    await page.evaluate(id => openSupplierAssessments(id), supId); await sleep(1500)
    out.list = await page.evaluate(() => ({ pdfBtn: !!document.querySelector('#suppliersTabContent button[title="PDF-Formular"]'), manualBtn: !!document.querySelector('#suppliersTabContent button[title="Antworten erfassen"]'), imgs: document.querySelectorAll('#suppliersTabContent img').length }))
    // PDF-Download im Browser (Cookie-Anmeldung)
    out.pdf = await page.evaluate(async () => {
      const a = (await (await fetch('/assessments', { headers: apiHeaders() })).json()).find(x => x.status === 'pending')
      const r = await fetch(`/assessments/${a.id}/form.pdf`, { headers: apiHeaders() })
      const b = new Uint8Array(await r.arrayBuffer())
      return { status: r.status, type: r.headers.get('Content-Type'), magic: String.fromCharCode(...b.slice(0, 5)), cd: r.headers.get('Content-Disposition') }
    })
    // Antworten erfassen: erst ohne Pflichtantwort (Rückfrage), dann ausfüllen
    const assId = await page.evaluate(async () => (await (await fetch('/assessments', { headers: apiHeaders() })).json()).find(x => x.status === 'pending').id)
    await page.evaluate((id, s) => openAssessmentManual(id, s), assId, supId); await sleep(1200)
    out.manual = await page.evaluate(() => ({ questions: document.querySelectorAll('#manualForm .manual-q').length, stars: document.querySelectorAll('#manualForm [data-qid] span[style*=danger]').length, notes: document.querySelectorAll('#manualForm [data-note]').length }))
    acceptDialogs = false                                  // Rückfrage „trotzdem übernehmen?“ ablehnen: nichts wird gespeichert
    await page.click('#manualSave'); await sleep(1000)
    acceptDialogs = true
    out.dialogAfterEmpty = dialogs.length
    out.stillPending = await page.evaluate(async id => (await (await fetch('/assessments/' + id, { headers: apiHeaders() })).json()).status, assId)
    await page.evaluate((id, s) => openAssessmentManual(id, s), assId, supId); await sleep(1000)
    await page.evaluate(() => { document.querySelectorAll('#manualForm input[type=radio][value=yes]').forEach(r => r.click()); const n = document.querySelector('#manualForm [data-note]'); if (n) n.value = 'https://example.org/iso.pdf' })
    await page.click('#manualSave'); await sleep(1500)
    out.after = await page.evaluate(async id => { const a = await (await fetch('/assessments/' + id, { headers: apiHeaders() })).json(); return { status: a.status, via: a.answeredVia, note: (a.answers.find(x => x.note) || {}).note, score: a.score } }, assId)
    out.listAfter = await page.evaluate(() => document.querySelector('#suppliersTabContent tbody')?.textContent.replace(/\s+/g, ' '))
    out.pwned = await page.evaluate(() => window.__pwned)
    process.stdout.write(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
