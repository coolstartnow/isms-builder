#!/usr/bin/env node
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
/**
 * Screenshots für die Doku des Maßnahmen-Registers (docs/images/measures/*.png).
 * Echtes Chrome gegen eine laufende Demo-Instanz mit dem deutschen Demo-Bundle (fiktive Daten); nichts wird verändert.
 *
 *   Demo-Instanz starten (leeres Datenverzeichnis, reines HTTP) und Bundle laden:
 *     DATA_DIR=/tmp/isms-demo PORT=3999 JWT_SECRET=demo SSL_CERT_FILE= SSL_KEY_FILE= node server/index.js
 *     (Login admin@example.com / adminpass, dann POST /admin/demo-load-bundle {"lang":"de"})
 *   Aufruf:  BASE=http://localhost:3999 node tools/make-measures-screenshots.js
 */
'use strict'
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const puppeteer = require('puppeteer-core')

const BASE = (process.env.BASE || 'http://localhost:3999').replace(/\/$/, '')
const OUT = path.join(__dirname, '..', 'docs', 'images', 'measures')
const CHROME = process.env.CHROME_BIN || ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p))
if (!CHROME) { console.error('FEHLER: kein Chrome gefunden (CHROME_BIN)'); process.exit(1) }
fs.mkdirSync(OUT, { recursive: true })

const wait = ms => new Promise(r => setTimeout(r, ms))
function request(method, url, body, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url), lib = u.protocol === 'https:' ? https : http
    const data = body ? JSON.stringify(body) : null
    const req = lib.request({ method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, rejectUnauthorized: false,
      headers: { ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...(cookie ? { Cookie: cookie } : {}) } }, res => {
      let buf = ''
      res.on('data', d => { buf += d })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: buf }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

;(async () => {
  const login = await request('POST', BASE + '/login', { email: 'admin@example.com', password: 'adminpass' })
  const cookie = (login.headers['set-cookie'] || []).map(c => c.split(';')[0]).find(c => c.startsWith('sm_session='))
  if (login.status !== 200 || !cookie) { console.error('FEHLER: Login fehlgeschlagen (' + login.status + ')'); process.exit(1) }
  const get = async p => JSON.parse((await request('GET', BASE + p, null, cookie)).body)

  // Beispieldatensätze für die Aufnahmen
  const measures = await get('/measures')
  const find = ref => measures.find(m => m.ref === ref)
  const gov = measures.find(m => m.governance && m.status === 'in_progress')
  const withRisk = measures.find(m => m.linkedRisks.length && m.linkedControls.length)
  const findings = await get('/findings')
  if (!gov || !withRisk || !findings.length) { console.error('FEHLER: Demo-Bundle (de) nicht geladen?'); process.exit(1) }
  const finding = findings.find(f => f.ref === 'FIND-2026-0001') || findings[0]

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const u = new URL(BASE)
  await page.setCookie({ name: 'sm_session', value: cookie.slice('sm_session='.length), domain: u.hostname, path: '/', httpOnly: true, secure: u.protocol === 'https:' })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))

  const shot = async (name, label, keepScroll) => {
    if (!keepScroll) await resetScroll()
    await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) if (el.children.length === 0 && /2FA nicht aktiv|2FA not active/.test(el.textContent)) (el.closest('button,a,div') || el).style.display = 'none' })
    await wait(250)
    await page.screenshot({ path: path.join(OUT, name + '.png') })
    console.log('OK  ' + label + ' → docs/images/measures/' + name + '.png')
  }
  const run = (fn, ...args) => page.evaluate(fn, ...args)
  const scrollTo = sel => run(s => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: 'start' }) }, sel)
  const scrollSection = (sel, offset = 90) => run((s, off) => {
    const el = document.querySelector(s); if (!el) return
    el.scrollIntoView({ block: 'start' })
    for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollTop > 0) { p.scrollTop = Math.max(0, p.scrollTop - off); break }
  }, sel, offset)
  const resetScroll = () => run(() => { window.scrollTo(0, 0); for (const el of document.querySelectorAll('*')) if (el.scrollTop > 0) el.scrollTop = 0 })
  const click = sel => run(s => { const el = [...document.querySelectorAll(s)].find(e => e.offsetParent) || document.querySelector(s); if (el) el.click(); return !!el }, sel)
  const clickText = (sel, text) => run((s, t) => { const el = [...document.querySelectorAll(s)].find(e => e.textContent.includes(t)); if (el) el.click(); return !!el }, sel, text)

  await page.goto(BASE + '/ui/index.html', { waitUntil: 'networkidle2', timeout: 30000 })
  await wait(2500)

  // 1 Übersicht des Registers
  await run(() => loadSection('measures')); await wait(2000)
  await shot('register-list', 'Register: Übersicht mit Kennzahlen')

  // 2 Herkunfts-Filter: Risiko-Behandlungen
  await run(() => { _measuresFilter.origin = 'risk'; return loadMeasuresList() }); await wait(1200)
  await shot('register-filter-risk', 'Register: Filter Risiko-Behandlungen')
  await run(() => { _measuresFilter.origin = 'governance'; return loadMeasuresList() }); await wait(1200)
  await shot('register-filter-governance', 'Register: Filter Governance')
  await run(() => { _measuresFilter.origin = ''; return loadMeasuresList() }); await wait(600)

  // 3 Formular: Umsetzung und Governance-Felder
  await run(id => openMeasureForm(id), gov.id); await wait(1800)
  await run(() => { const sec = document.getElementById('msGov').closest('.training-form-section'); sec.id = 'shotGovSection' })
  await scrollSection('#shotGovSection')
  await wait(300)
  await shot('form-governance', 'Formular: Governance-Maßnahme', true)

  // 4 Formular: Zuordnungen (Controls, Feststellungen, Risiken)
  await run(id => openMeasureForm(id), withRisk.id); await wait(1800)
  await run(() => { document.querySelector('.measure-link-cols').closest('.training-form-section').id = 'shotLinkSection' })
  await scrollSection('#shotLinkSection', 120)
  await wait(300)
  await shot('form-links', 'Formular: Zuordnungen', true)

  // 5 SoA: Maßnahmen zum Control
  await run(() => loadSection('soa')); await wait(2500)
  await clickText('.soa-fw-tab', 'BSI IT-Grundschutz')
  await page.waitForSelector('.soa-expand-btn[data-id="BSI-ISMS.1"]', { timeout: 10000 })
  await click('.soa-expand-btn[data-id="BSI-ISMS.1"]')
  await page.waitForFunction(() => { const b = document.getElementById('soa-measures-BSI-ISMS.1'); return b && b.textContent.trim().length > 0 }, { timeout: 10000 })
  await run(() => document.getElementById('soa-measures-BSI-ISMS.1').scrollIntoView({ block: 'center' }))
  await wait(300)
  await shot('soa-block', 'SoA: Maßnahmen zum Control', true)

  // 6 Feststellung: Maßnahmen
  await run(() => { loadSection('reports') }); await wait(1800)
  await click("[onclick*=\"switchReportsMainTab('findings')\"]"); await wait(1500)
  await run(id => openFindingDetail(id), finding.id); await wait(1800)
  await run(id => document.getElementById('finding-measures-' + id).scrollIntoView({ block: 'center' }), finding.id)
  await wait(300)
  await shot('finding-block', 'Feststellung: Maßnahmen', true)

  // 7 Risiko: Behandlungen
  await run(() => loadSection('risk')); await wait(2000)
  await click("[onclick*=\"switchRiskTab('treatments')\"]"); await wait(1800)
  await shot('risk-treatments', 'Risiko: Behandlungen')

  // 8 Governance: Maßnahmen
  await run(() => loadSection('governance')); await wait(1800)
  await click('.training-tab[data-tab="actions"]'); await wait(1500)
  await shot('governance-actions', 'Governance: Maßnahmen')

  // 9 DSGVO: TOMs
  await run(() => loadSection('gdpr')); await wait(1800)
  await click("[onclick*=\"switchGdprTab('toms')\"]"); await wait(1500)
  await shot('gdpr-toms', 'DSGVO: TOMs')

  await browser.close()
  if (errors.length) { console.error('Seitenfehler:', errors.join(' | ')); process.exit(1) }
  console.log('Fertig.')
})().catch(e => { console.error(e); process.exit(1) })
