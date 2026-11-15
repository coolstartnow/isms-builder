'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): gefährliche Titel/Namen (Hochkomma, Rückwärtsschrägstrich, Anführungszeichen) in Vorlagen,
// Organisationseinheiten und DSGVO-Löschliste; der Administrator bedient die Knöpfe. Erwartung: nichts wird ausgeführt, die Knöpfe tun das Richtige.
// Aufruf: node inlineHandlersBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const PWN = 'window.__pwn=(window.__pwn||0)+1'
const H1 = `x'); ${PWN};//`
const H2 = `\\'); ${PWN};//`
const H3 = `"); ${PWN};//`

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 1000 })
    const pageErrors = []; page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 160)))
    const dialogs = []; page.on('dialog', d => { dialogs.push(d.type() + ':' + String(d.message()).slice(0, 80)); d.accept() })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    await page.evaluate(() => { window.__pwn = 0 })
    const api = (method, url, body) => page.evaluate(async (m, u, b) => {
      const r = await fetch(u, { method: m, headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })
      return { status: r.status, body: await r.json().catch(() => null) }
    }, method, url, body)
    const pwn = () => page.evaluate(() => window.__pwn || 0)
    const compileAll = () => page.evaluate(() => {   // jeder gerenderte Handler im DOM ist gültiges JavaScript
      let n = 0; const bad = []
      for (const el of document.querySelectorAll('*')) for (const a of el.attributes) if (/^on/.test(a.name)) { n++; try { new Function(a.value) } catch (e) { bad.push(a.name + ': ' + a.value.slice(0, 70) + ' → ' + e.message) } }
      return { n, bad }
    })
    const clickRowButton = (selectorStart, needle) => page.evaluate((sel, nd) => {
      const b = [...document.querySelectorAll(`button[onclick^="${sel}"]`)].find(x => (x.closest('tr') || x.closest('li') || x.parentElement).textContent.includes(nd))
      if (!b) return false; b.click(); return true
    }, selectorStart, needle)
    const out = {}

    // Daten anlegen: drei Vorlagen mit gefährlichen Titeln, eine Organisationseinheit
    const ids = {}
    for (const [k, title] of [['h1', H1], ['h2', H2], ['h3', H3]]) { const r = await api('POST', '/template', { type: 'Policy', language: 'en', title, content: 'x' }); ids[k] = r.body && r.body.id; out['create_' + k] = r.status }
    out.createOrgUnit = (await api('POST', '/org-units', { name: H1 })).status

    // 1) Administration → Vorlagen: Löschen (Papierkorb)
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="adminTabPanelTemplates"></div>') })
    await page.evaluate(() => renderAdminTemplatesTab()); await page.waitForSelector('#adminTabPanelTemplates table', { timeout: 15000 }); await sleep(500)
    out.adminTemplates = { rendered: await page.evaluate(() => document.querySelectorAll('#adminTabPanelTemplates button[onclick^="adminDeleteTemplate"]').length), compile: await compileAll() }
    out.adminDeleteClicked = await clickRowButton('adminDeleteTemplate', H1.slice(0, 20)); await sleep(1500)
    out.afterAdminDelete = { pwn: await pwn(), trashed: (await api('GET', '/templates')).body.every(t => t.title !== H1) }

    // 2) Vorlagenverwaltung: eine Vorlage (Entwurf) in den Papierkorb (H2)
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="tmplMgmtContent"></div>') })
    await page.evaluate(() => loadTmplManagement()); await sleep(1500)
    out.mgmt = { compile: await compileAll(), role: await page.evaluate(() => getCurrentRole()) }
    out.softDeleteClicked = await clickRowButton('tmplMgmtSoftDelete', H2.slice(0, 20)); await sleep(1500)
    out.afterSoftDelete = { pwn: await pwn(), h2Trashed: (await api('GET', '/templates')).body.every(t => t.title !== H2) }

    // 2b) Administration → Papierkorb: H1 wiederherstellen, H2 endgültig löschen
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="adminTabPanelTrash"></div>') })
    await page.evaluate(() => renderAdminTrashTab()); await sleep(2000)
    out.trash = { restoreButtons: await page.evaluate(() => document.querySelectorAll('#adminTabPanelTrash button[onclick^="restoreTrashItem"]').length), compile: await compileAll() }
    out.restoreClicked = await clickRowButton('restoreTrashItem', H1.slice(0, 20)); await sleep(1800)
    out.afterRestore = { pwn: await pwn(), active: (await api('GET', '/templates')).body.some(t => t.title === H1) }
    await page.evaluate(() => renderAdminTrashTab()); await sleep(1800)
    out.permDeleteClicked = await clickRowButton('permanentDeleteTrashItem', H2.slice(0, 20)); await sleep(1800)
    const tpl = (await api('GET', '/templates')).body
    const trashNow = ((await api('GET', '/trash')).body || [])
    out.afterPermDelete = { pwn: await pwn(), h1Active: tpl.some(t => t.title === H1), h3Active: tpl.some(t => t.title === H3), h2NotInTrash: !trashNow.some(x => x.title === H2) }
    out.h2Permanent = (await api('GET', `/template/Policy/${ids.h2}`)).status

    // 3) Administration → Organisation: Organisationseinheit löschen
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="adminTabPanelOrg"></div>') })
    await page.evaluate(() => renderAdminOrgTab()); await sleep(2000)
    out.org = { compile: await compileAll() }
    out.orgDeleteClicked = await clickRowButton('deleteOrgUnit', H1.slice(0, 20)); await sleep(1800)
    out.afterOrgDelete = { pwn: await pwn(), gone: ((await api('GET', '/org-units')).body || []).every(u => u.name !== H1) }

    // 4) DSGVO → Löschliste (Daten der Liste untergeschoben; Titel mit Rückwärtsschrägstrich — den maskierte der frühere Rückfall nicht): Löschung bestätigen übergibt den Titel unverändert
    await page.evaluate(h => {
      const real = window.fetch.bind(window)
      window.fetch = (u, o) => String(u).includes('/gdpr/deletion-log/due')
        ? Promise.resolve(new Response(JSON.stringify([{ id: 'vvt-test-1', title: h, deletionDue: '2020-01-01', retentionMonths: 12 }]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        : real(u, o)
      document.body.insertAdjacentHTML('beforeend', '<div id="gdprDelHost"></div>')
    }, H2)
    await page.evaluate(() => renderGdprDeletion(document.getElementById('gdprDelHost'))); await sleep(1500)
    out.gdpr = { buttons: await page.evaluate(() => document.querySelectorAll('#gdprDelHost button[onclick^="confirmDeletion"]').length), compile: await compileAll() }
    out.gdprClicked = await page.evaluate(() => { const b = document.querySelector('#gdprDelHost button[onclick^="confirmDeletion"]'); if (!b) return false; b.click(); return true }); await sleep(2500)
    const log = (await api('GET', '/gdpr/deletion-log')).body || []
    out.afterGdpr = { pwn: await pwn(), logged: log.some(e => e.vvtTitle === H2 && e.vvtId === 'vvt-test-1') }

    out.finalPwn = await pwn(); out.pageErrors = pageErrors; out.dialogs = dialogs.length
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
