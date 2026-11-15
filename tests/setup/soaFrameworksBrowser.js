'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): SoA → „Eigene Gruppe“ in der echten Oberfläche.
// Aufruf: node soaFrameworksBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const fs = require('fs')
const os = require('os')
const path = require('path')
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'soafw-'))
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    const dialogs = []
    page.on('dialog', d => { dialogs.push(d.type()); d.accept() })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    const out = {}
    const openSoa = async () => { await page.evaluate(() => renderSoa()); await page.waitForSelector('.soa-fw-tab', { timeout: 15000 }); await sleep(400) }
    await openSoa()
    out.hasGroupBtn = await page.evaluate(() => !!document.querySelector('button[onclick="openSoaGroupPanel()"]'))
    if (!out.hasGroupBtn) { console.log(JSON.stringify(out)); return }

    // 1) Panel öffnen, Datei wählen (mit HTML und Apostroph in den Texten), Felder werden aus der Datei vorbelegt
    const file = path.join(tmp, 'gruppe.json')
    fs.writeFileSync(file, JSON.stringify({
      framework: { id: 'NEN7510', label: '<img src=x onerror="window.__pwn1=1">NEN', color: '#0EA5E9' },
      controls: [
        { id: 'NEN-1', theme: 'Toegang', title: "x'); window.__pwn2=1;//", description: 'Erfundener Text' },
        { id: 'NEN-2', theme: '<b>Thema</b>', title: '<img src=x onerror="window.__pwn3=1">' },
        { id: 'a/b', theme: 't', title: 'ungültige Kennung' },
      ],
    }))
    await page.click('button[onclick="openSoaGroupPanel()"]'); await page.waitForSelector('#soaGroupPanel')
    out.panelInline = await page.evaluate(() => !!document.querySelector('#soaContainer #soaGroupPanel') && [...document.querySelectorAll('.modal')].every(m => { const c = getComputedStyle(m); return c.visibility === 'hidden' || c.display === 'none' }))
    await (await page.$('#soaGroupPanel input[type=file]')).uploadFile(file); await sleep(800)
    out.prefill = await page.evaluate(() => { const i = [...document.querySelectorAll('#soaGroupPanel input')]; return { id: i[0].value, label: i[1].value, color: i[2].value } })

    // 2) Vorschau: nichts wird geschrieben; abgelehnte Zeile mit Grund
    await page.click('button[onclick="soaGrpPreview()"]'); await page.waitForSelector('.soa-group-summary', { timeout: 15000 })
    out.preview = await page.evaluate(() => ({
      summary: document.querySelector('.soa-group-summary').textContent,
      rows: document.querySelectorAll('.soa-group-table tbody tr').length,
      rejected: document.querySelector('.soa-group-rejected')?.textContent || '',
      imgs: document.querySelectorAll('#soaGroupPanel img').length,
      applyDisabled: document.querySelector('button[onclick="soaGrpApply()"]').disabled,
      tabs: [...document.querySelectorAll('.soa-fw-tab')].map(b => b.dataset.fw),
    }))

    // 3) Übernehmen: neuer Tab sofort da und aktiv; keine Skripte, keine eingeschleusten Elemente
    await page.click('button[onclick="soaGrpApply()"]')
    await page.waitForFunction(() => document.querySelector('.soa-fw-tab.active')?.dataset.fw === 'NEN7510', { timeout: 15000 }); await sleep(500)
    out.applied = await page.evaluate(() => ({
      tabs: [...document.querySelectorAll('.soa-fw-tab')].map(b => b.dataset.fw),
      tabText: document.querySelector('.soa-fw-tab.active').textContent.trim(),
      tabImgs: document.querySelectorAll('.soa-fw-tabs img').length,
      rows: [...document.querySelectorAll('.soa-table tbody tr.soa-row')].map(r => r.dataset.id),
      tableImgs: document.querySelectorAll('.soa-table img, .soa-table b').length,
      panelOpen: !!document.getElementById('soaGroupPanel'),
      newBtn: !!document.querySelector('button[onclick="openCustomControlModal(null)"]'),
      pwned: [window.__pwn1, window.__pwn2, window.__pwn3].filter(Boolean).length,
    }))

    // 4) Einzelnes Control in der Gruppe anlegen (Gruppenwahl und freie Kennung im Formular)
    await page.click('button[onclick="openCustomControlModal(null)"]'); await page.waitForSelector('#customCtrlModal #ccGroup')
    out.modal = await page.evaluate(() => ({ options: [...document.querySelectorAll('#ccGroup option')].map(o => o.value), selected: document.getElementById('ccGroup').value }))
    await page.type('#ccTitle', 'Einzeln angelegt'); await page.type('#ccControlId', 'NEN-EINZEL')
    await page.evaluate(() => submitCustomControlModal('')); await sleep(1500)
    out.single = await page.evaluate(() => ({ active: document.querySelector('.soa-fw-tab.active')?.dataset.fw, rows: [...document.querySelectorAll('.soa-table tbody tr.soa-row')].map(r => r.dataset.id) }))

    // 5) Löschen-Knopf: der Titel mit Apostroph führt keinen Code aus; die Zeile verschwindet
    await page.click('button[onclick^="deleteCustomControl"][data-id="NEN-1"]'); await sleep(1500)
    out.deleted = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.soa-table tbody tr.soa-row')].map(r => r.dataset.id), pwn2: window.__pwn2 === undefined }))

    // 6) Verwaltung (Administration → Module): Karte, Umbenennen, Löschsperre (Gruppe hat noch Controls)
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="adminTabPanelModules"></div>') })
    await page.evaluate(() => renderAdminModulesTab()); await page.waitForSelector('#customGroupGrid .module-card', { timeout: 15000 })
    out.admin = await page.evaluate(() => { const c = document.querySelector('#customGroupGrid .module-card'); return { cards: document.querySelectorAll('#customGroupGrid .module-card').length, title: c.querySelector('.module-card-title').textContent, imgs: c.querySelectorAll('img').length, desc: c.querySelector('.module-card-desc').textContent, hasToggle: !!c.querySelector('input[data-fw="NEN7510"]') } })
    await page.evaluate(() => { const c = document.querySelector('#customGroupGrid .module-card'); c.querySelector('[data-role="label"]').value = 'NEN 7510:2024' })
    await page.evaluate(() => adminGroupSave('NEN7510')); await sleep(1200)
    out.renamed = await page.evaluate(() => document.querySelector('#customGroupGrid .module-card .module-card-title').textContent)
    const dlgBefore = dialogs.length
    await page.evaluate(() => adminGroupDelete(document.querySelector('#customGroupGrid button[data-count]'))); await sleep(800)
    out.deleteBlocked = await page.evaluate(() => ({ stillThere: !!document.querySelector('#customGroupGrid .module-card') }))
    out.deleteBlocked.noConfirm = dialogs.length === dlgBefore

    // 7) Sammel-Tab CUSTOM: Karte mit Schalter in der Liste der Frameworks; ausschalten → Tab weg; einschalten → wieder da
    out.customCard = await page.evaluate(() => { const i = document.querySelector('input[data-fw="CUSTOM"]'); return { exists: !!i, checked: !!(i && i.checked), title: i?.closest('.module-card')?.querySelector('.module-card-title')?.textContent.trim() || '' } })
    const tabsAfter = async () => { await page.evaluate(() => renderSoa()); await page.waitForSelector('.soa-fw-tab', { timeout: 15000 }); await sleep(400); return page.evaluate(() => [...document.querySelectorAll('.soa-fw-tab')].map(b => b.dataset.fw)) }
    await page.evaluate(() => { const i = document.querySelector('input[data-fw="CUSTOM"]'); i.checked = false; fwToggleChange(i) })
    out.customOffCard = await page.evaluate(() => document.querySelector('input[data-fw="CUSTOM"]').closest('.module-card').className)
    await page.evaluate(() => saveModuleConfig()); await sleep(1500)
    out.tabsOff = await tabsAfter()
    await page.evaluate(() => renderAdminModulesTab()); await page.waitForSelector('input[data-fw="CUSTOM"]', { timeout: 15000 })
    out.customStaysOff = await page.evaluate(() => !document.querySelector('input[data-fw="CUSTOM"]').checked)
    await page.evaluate(() => { const i = document.querySelector('input[data-fw="CUSTOM"]'); i.checked = true; fwToggleChange(i) })
    await page.evaluate(() => saveModuleConfig()); await sleep(1500)
    out.tabsOn = await tabsAfter()
    console.log(JSON.stringify(out))
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
