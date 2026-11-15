'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): Administration → KI-Einstellungen → API-Schlüssel.
// Aufruf: node aiApiKeyBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const KEY = 'sk-browser-Test-KEY-0123456789'

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 1000 })
    page.on('dialog', d => d.dismiss())
    const puts = []
    page.on('response', r => { if (r.url().endsWith('/admin/ai-settings') && r.request().method() === 'PUT') puts.push(r.status()) })
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="adminTabPanelMaintenance"></div>') })
    await page.evaluate(() => renderAdminMaintenanceTab()); await page.waitForSelector('#aiApiKeyInput', { timeout: 15000 }); await sleep(1500)
    const state = () => page.evaluate(() => ({ state: document.getElementById('aiApiKeyState').textContent.trim(), clearVisible: document.getElementById('aiApiKeyClear').style.display !== 'none', warnVisible: document.getElementById('aiApiKeyWarn').style.display !== 'none', value: document.getElementById('aiApiKeyInput').value }))
    const out = {}
    out.field = await page.evaluate(() => { const i = document.getElementById('aiApiKeyInput'); return { type: i.type, autocomplete: i.autocomplete, maxlength: i.maxLength } })
    out.initial = await state()

    // ungültiger Schlüssel (Leerzeichen): Server lehnt ab, der Zustand bleibt „nicht gesetzt“
    await page.type('#aiApiKeyInput', 'ungueltig mit leerzeichen'); await page.evaluate(() => document.getElementById('aiApiKeyInput').dispatchEvent(new Event('change', { bubbles: true }))); await sleep(1500)
    out.afterInvalid = await state()
    await page.evaluate(() => { document.getElementById('aiApiKeyInput').value = '' })

    // gültiger Schlüssel: gespeichert, Feld geleert, Schlüssel nirgends im DOM
    await page.type('#aiApiKeyInput', KEY); await page.evaluate(() => document.getElementById('aiApiKeyInput').dispatchEvent(new Event('change', { bubbles: true }))); await sleep(2000)
    out.afterSave = await state()
    out.keyInDom = await page.evaluate(k => document.documentElement.outerHTML.includes(k) || JSON.stringify({ ...localStorage }).includes(k) || JSON.stringify({ ...sessionStorage }).includes(k), KEY)
    out.apiBody = await page.evaluate(async () => { const r = await fetch('/admin/ai-settings', { credentials: 'include' }); return await r.text() })

    // Warnung nur bei http:// zu einem fremden Host
    await page.evaluate(() => { const u = document.getElementById('aiOllamaUrlInput'); u.value = 'http://ki.example.org:11434'; u.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(200)
    out.warnHttp = (await state()).warnVisible
    await page.evaluate(() => { const u = document.getElementById('aiOllamaUrlInput'); u.value = 'http://localhost:11434'; u.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(200)
    out.warnLocal = (await state()).warnVisible
    await page.evaluate(() => { const u = document.getElementById('aiOllamaUrlInput'); u.value = 'https://ki.example.org'; u.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(200)
    out.warnHttps = (await state()).warnVisible
    await page.evaluate(() => { document.getElementById('aiOllamaUrlInput').value = '' })

    // Entfernen
    await page.evaluate(() => clearAiApiKey()); await sleep(2000)
    out.afterClear = await state()
    out.puts = puts
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
