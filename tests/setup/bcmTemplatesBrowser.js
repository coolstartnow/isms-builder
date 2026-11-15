'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): BCM → „Vorlage verwenden“ in der echten Oberfläche.
// Aufruf: node bcmTemplatesBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort>
const [CHROME, BASE, EMAIL, PASSWORD] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    page.on('dialog', d => d.dismiss())
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    const out = {}
    for (const [tab, sel, sel2] of [['bia', '#biaTitle, #biaTitel, #biaName', '#biaRto'], ['plans', '#planTitle', '#planProcs'], ['exercises', '#exTitle', '#exScenario']]) {
      await page.evaluate(t => { _bcmTab = t; renderBcm() }, tab); await sleep(1200)
      const hasBtn = await page.evaluate(() => !!document.querySelector('[data-testid=bcmTplBtn]'))
      out[tab] = { hasBtn }
      if (!hasBtn) continue
      await page.click('[data-testid=bcmTplBtn]'); await sleep(600)
      out[tab].options = await page.evaluate(() => document.querySelectorAll('#bcmTplSel option').length)
      await page.click('[data-testid=bcmTplUse]'); await sleep(1500)
      out[tab].form = await page.evaluate((a, b) => ({ title: document.querySelector(a)?.value || '', field: document.querySelector(b)?.value || '' }), sel, sel2)
    }
    // KI-Entwurf (ab Content Owner): Dialog, gesendeter Text, Sperre bei personenbezogenen Daten; Ergebnis landet nicht ohne Weiteres im Feld
    for (const [tab, btn, field] of [['plans', 'bcmAiPlan', 'planProcs'], ['exercises', 'bcmAiExercise', 'exScenario']]) {
      await page.evaluate(t => { _bcmTab = t; renderBcm() }, tab); await sleep(1200)
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /openPlanForm|openExerciseForm/.test(x.getAttribute('onclick') || '') && /ph-plus/.test(x.innerHTML)); if (b) b.click() }); await sleep(1200)
      const hasAi = await page.evaluate(b => !!document.querySelector(`[data-testid=${b}]`), btn)
      out[tab].ai = { hasAi }
      if (!hasAi) continue
      await page.click(`[data-testid=${btn}]`); await sleep(1200)
      out[tab].ai.dialog = await page.evaluate(() => ({
        options: document.querySelectorAll('#aiDraftEntry option').length,
        prompt: document.getElementById('aiDraftPrompt')?.textContent.slice(0, 80) || '',
        copyDisabled: !!document.getElementById('aiDraftCopy')?.disabled,
      }))
      await page.type('#aiDraftHint', 'Tel. +49 170 1234567'); await sleep(800)
      out[tab].ai.blocked = await page.evaluate(() => ({ warn: document.getElementById('aiDraftWarn')?.style.display !== 'none', copyDisabled: !!document.getElementById('aiDraftCopy')?.disabled }))
      await page.evaluate(() => document.getElementById('aiDraftModal')?.remove())
      out[tab].ai.fieldTarget = field
    }
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
