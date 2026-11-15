'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): meldet sich in der echten Oberfläche an, öffnet ein Dokument und wechselt
// den Dokumenttyp. Gibt je Wechsel den Zustand von Titel, Editor und Leseansicht als JSON aus.
// Aufruf: node typeSwitchBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <Typ mit Dokument> <Titel> <Zieltypen als JSON>
const [CHROME, BASE, EMAIL, PASSWORD, TYPE, TITLE, TARGETS] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    const log = m => { if (process.env.TS_DEBUG) console.error(Date.now() % 100000, m) }
    page.on('response', async r => { log('HTTP ' + r.status() + ' ' + r.url().replace(BASE, '')); if (r.url().endsWith('/login') && r.request().method() === 'POST') log('login-Antwort ' + (await r.text().catch(() => '')).slice(0, 200)) })
    page.on('pageerror', e => log('pageerror ' + e))
    await page.goto(`${BASE}/ui/login.html`)
    log('login geladen')
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    const state = () => page.evaluate(() => { const v = document.getElementById('contentViewer'), e = document.getElementById('contentEditor'); return { title: document.getElementById('inputTitle').value, editor: e.value, current: currentTemplate ? currentTemplate.title : null, editorShown: e.style.display !== 'none', viewerShown: !!v && v.style.display !== 'none', viewerText: v ? v.innerText.trim() : '' } })
    await page.evaluate(t => selectType(t), TYPE); await sleep(1200)
    await page.evaluate(t => { const el = [...document.querySelectorAll('.tmpl-tree-title')].find(x => x.textContent.trim() === t); el.click() }, TITLE); await sleep(1500)
    const out = { opened: await state(), switched: {} }
    for (const target of JSON.parse(TARGETS)) {
      await page.evaluate(t => selectType(t), target); await sleep(1200)
      out.switched[target] = await state()
      await page.evaluate(t => selectType(t), TYPE); await sleep(900)
      await page.evaluate(t => { [...document.querySelectorAll('.tmpl-tree-title')].find(x => x.textContent.trim() === t).click() }, TITLE); await sleep(1200)
    }
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
