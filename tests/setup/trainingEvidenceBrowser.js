'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): meldet sich an, öffnet Training → Nachweise, klickt die Karte an und
// gibt den Zustand von Karte, Formular und Links als JSON aus.
// Aufruf: node trainingEvidenceBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <Titel der Schulung>
const [CHROME, BASE, EMAIL, PASSWORD, TITLE] = process.argv.slice(2)
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
    await page.evaluate(() => { window.__xss = 0; renderTraining() }); await sleep(1200)
    await page.evaluate(() => switchTrainingTab('evidence')); await sleep(1200)
    const cards = await page.evaluate(title => {
      const card = [...document.querySelectorAll('.training-evidence-card')].find(c => c.textContent.includes(title))
      if (!card) return null
      return {
        role: card.getAttribute('role'), tabindex: card.getAttribute('tabindex'),
        links: [...card.querySelectorAll('.training-evidence-text a')].map(a => ({ href: a.getAttribute('href'), rel: a.getAttribute('rel'), target: a.getAttribute('target') })),
        evidenceText: card.querySelector('.training-evidence-text')?.textContent || '',
        injectedImg: card.querySelectorAll('img, script').length,
        confirmationBtn: !!card.querySelector('[data-testid=confirmationBtn]'),
        attachmentButtons: [...card.querySelectorAll('.training-attach-link')].map(b => b.textContent.trim()),
      }
    }, TITLE)
    if (!cards) { console.log(JSON.stringify({ card: null })); return }
    // Knopf „Teilnahmebestätigung“ lädt das PDF, ohne die Karte zu öffnen
    const dl = page.waitForResponse(r => r.url().includes('/confirmation.pdf'), { timeout: 15000 }).then(r => r.status()).catch(() => null)
    await page.evaluate(title => { [...document.querySelectorAll('.training-evidence-card')].find(c => c.textContent.includes(title)).querySelector('[data-testid=confirmationBtn]').click() }, TITLE)
    const confirmationStatus = await dl
    await sleep(600)
    const formOpenedByButton = await page.evaluate(() => !!document.querySelector('.training-form-body'))
    await page.evaluate(title => { [...document.querySelectorAll('.training-evidence-card')].find(c => c.textContent.includes(title)).click() }, TITLE)
    await sleep(1200)
    const form = await page.evaluate(() => {
      const body = document.querySelector('.training-form-body')
      return {
        shown: !!body,
        title: document.getElementById('tmTitel')?.value || '',
        titleDisabled: !!document.getElementById('tmTitel')?.disabled,
        evidenceDisabled: !!document.getElementById('tmEvidence')?.disabled,
        saveButton: [...document.querySelectorAll('.training-form-footer .btn-primary')].length,
        readOnlyNote: !!document.querySelector('.training-readonly-note'),
        xss: window.__xss,
      }
    })
    // zurück: Rücksprung in den Reiter „Nachweise“
    await page.evaluate(() => document.querySelector('.training-form-header button').click()); await sleep(1000)
    const back = await page.evaluate(() => ({ evidenceCards: document.querySelectorAll('.training-evidence-card').length }))
    console.log(JSON.stringify({ card: cards, confirmationStatus, formOpenedByButton, form, back }))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
