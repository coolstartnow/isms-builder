'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): prüft im echten Chrome, dass „Demo-Reset“ zuerst die Anleitung öffnet und die
// Umstellung erst nach bewusster Bestätigung beginnt. Der Reset-Aufruf selbst wird abgefangen (nie echt ausgeführt, er würde die .env ändern).
// Aufruf: node demoResetGuideBrowser.js <Chrome> <Basis-URL> <Cookie sm_session=…>
const [CHROME, BASE, COOKIE] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))
;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  const out = {}
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 900 })
    const [name, value] = COOKIE.split('=')
    await page.setCookie({ name, value, url: BASE })
    // Reset-Aufruf abfangen (fetch im Seitenkontext überschreiben statt Request-Interception: die würde auch die Bilder des Popups anhalten)
    await page.evaluateOnNewDocument(() => {
      window.__resets = []
      const f = window.fetch
      window.fetch = function (u, o) {
        if (String(u).endsWith('/admin/demo-reset') && o && o.method === 'POST') {
          window.__resets.push((o.headers || {})['X-Guide-Read'] || '')
          return Promise.resolve(new Response('{"error":"abgefangen"}', { status: 500, headers: { 'content-type': 'application/json' } }))
        }
        return f.apply(this, arguments)
      }
    })
    const getResets = () => page.evaluate(() => window.__resets.slice())
    const prompts = []
    page.on('dialog', d => { prompts.push(d.type()); d.accept('RESET') })
    await page.goto(BASE + '/ui/index.html', { waitUntil: 'networkidle0', timeout: 30000 })
    await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    // Testknopf, der wie der echte Knopf triggerDemoReset() aus einem Klick aufruft (echte Nutzeraktivierung für den Popup-Blocker)
    await page.evaluate(() => { const b = document.createElement('button'); b.id = '__t'; b.textContent = 'x'; b.style.cssText = 'position:fixed;top:0;left:0;z-index:99999'; b.onclick = () => triggerDemoReset(); document.body.appendChild(b)
      // Elemente, die die Wartungsseite sonst bereitstellt (triggerDemoReset schreibt Status in sie)
      const r = document.createElement('button'); r.id = 'btnDemoReset'; r.style.display = 'none'; document.body.appendChild(r)
      const m = document.createElement('p'); m.id = 'demoResetResult'; m.style.display = 'none'; document.body.appendChild(m) })
    const nextPopup = () => browser.waitForTarget(t => t.opener() && t.type() === 'page', { timeout: 10000 }).then(t => t.page())

    // A: Klick → Anleitung öffnet, kein Reset, Knopf gesperrt
    let pp = nextPopup(); await page.click('#__t'); let guide = await pp
    await guide.waitForSelector('#ok', { timeout: 10000 }); await sleep(600)
    out.A = await guide.evaluate(() => ({ backup: !!document.querySelector('.backup') && /isms-demo-export/.test(document.querySelector('.backup').textContent), header: !!document.querySelector('header'), text: document.getElementById('guide').textContent.length, disabled: document.getElementById('ok').disabled,
      imgs: [...document.querySelectorAll('#guide img')].length, imgBase: document.querySelector('base') && document.querySelector('base').href }))
    out.A.imgsLoaded = await guide.evaluate(() => Promise.all([...document.querySelectorAll('#guide img')].map(i => i.complete ? i.naturalWidth > 0 : new Promise(r => { i.onload = () => r(true); i.onerror = () => r(false) }))))
    out.A.resets = (await getResets()).length
    // B: ohne Bestätigung schließen → kein Reset
    await guide.close(); await sleep(1500)
    out.B = { resets: (await getResets()).length, prompts: prompts.length }
    // C: Anleitung lesen: Scrollen + Wartezeit → Knopf frei → Klick → Prompt → genau ein Reset-Aufruf mit Header
    pp = nextPopup(); await page.click('#__t'); guide = await pp
    await guide.waitForSelector('#ok', { timeout: 10000 })
    await guide.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await sleep(2000)
    out.C = { earlyDisabled: await guide.evaluate(() => document.getElementById('ok').disabled) }   // nach ~2 s noch gesperrt (Mindestzeit)
    await sleep(15000)
    await guide.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(800)
    out.C.lateDisabled = await guide.evaluate(() => document.getElementById('ok').disabled)
    await guide.click('#ok')
    // danach erscheint die Bestätigung als eigener Dialog (kein window.prompt): ohne Eingabe RESET kein Reset
    await page.waitForSelector('#demoResetConfirmInput', { timeout: 10000 })
    out.C.modalBackup = await page.evaluate(() => /isms-demo-export/.test(document.getElementById('demoResetConfirmModal').textContent))
    out.C.goDisabledEmpty = await page.evaluate(() => document.getElementById('demoResetConfirmGo').disabled)
    await page.type('#demoResetConfirmInput', 'FALSCH'); out.C.goDisabledWrong = await page.evaluate(() => document.getElementById('demoResetConfirmGo').disabled)
    out.C.resetsBefore = (await getResets()).length
    await page.evaluate(() => { document.getElementById('demoResetConfirmInput').value = '' })
    await page.type('#demoResetConfirmInput', 'RESET'); out.C.goDisabledRight = await page.evaluate(() => document.getElementById('demoResetConfirmGo').disabled)
    await page.click('#demoResetConfirmGo'); await sleep(2000)
    out.C.resets = await getResets(); out.C.prompts = prompts.slice()
    // D: Popup blockiert → kein Reset
    await page.evaluate(() => { window.open = () => null })
    const before = (await getResets()).length
    await page.click('#__t'); await sleep(1500)
    out.D = { newResets: (await getResets()).length - before }
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
