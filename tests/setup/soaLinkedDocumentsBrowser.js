'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Läuft als eigener Node-Prozess (puppeteer-core ist ein ES-Modul): SoA-Control → verknüpftes Dokument öffnen (Issue #110).
// Aufruf: node soaLinkedDocumentsBrowser.js <Chrome> <Basis-URL> <E-Mail> <Passwort> <Control> <Framework> <Dokument1> <Dokument2(feindlicher Titel)> <Dokument3(gelöscht)> <voll|ansicht>
const [CHROME, BASE, EMAIL, PASSWORD, CTRL, FW, DOC1, DOC2, DOC3, MODE] = process.argv.slice(2)
const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  let puppeteer
  try { const mod = await import('puppeteer-core'); puppeteer = mod.default || mod } catch (e) { console.error('puppeteer-core nicht ladbar: ' + e.message); process.exit(3) }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 950 })
    page.on('dialog', d => d.accept())
    const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)))
    await page.goto(`${BASE}/ui/login.html`)
    await page.type('#email', EMAIL); await page.type('#password', PASSWORD)
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}), page.click('#loginBtn')])
    await page.waitForFunction(() => location.pathname.endsWith('index.html'), { timeout: 25000 })
    await sleep(1500); await page.evaluate(() => document.getElementById('splashOverlay')?.remove())
    const out = {}
    const openControl = async () => {
      await page.waitForSelector('#dashboardContainer', { timeout: 20000 }).catch(() => {}); await sleep(2500)   // den Start (Dashboard) zur Ruhe kommen lassen, wie ein Benutzer
      await page.evaluate(fw => { soaActiveFramework = fw; loadSection('soa') }, FW)   // über die Navigation, nicht über renderSoa()
      await page.waitForSelector('.soa-fw-tab', { timeout: 15000 }); await sleep(500)
      await page.waitForSelector(`.soa-expand-btn[data-id="${CTRL}"]`, { timeout: 15000 })
      // Aufklappen per Skript, mit Wiederholung (der Container kann direkt nach dem Aufbau noch einmal ersetzt werden)
      for (let k = 0; k < 4; k++) {
        await page.evaluate(c => document.querySelector(`.soa-expand-btn[data-id="${c}"]`)?.click(), CTRL); await sleep(900)
        if (await page.evaluate(c => document.querySelector(`.soa-detail-row[data-for="${c}"]`)?.style.display !== 'none', CTRL)) break
      }
      try { await page.waitForSelector(`[id="soa-detail-${CTRL}"] .soa-tmpl-tag`, { timeout: 15000 }) } catch (e) {
        const info = await page.evaluate(c => ({ detail: (document.getElementById('soa-detail-' + c) || {}).innerHTML?.slice(0, 400), rowDisplay: document.querySelector(`.soa-detail-row[data-for="${c}"]`)?.style.display, ctrls: [...document.querySelectorAll('.soa-expand-btn')].slice(0, 3).map(b => b.dataset.id) }), CTRL).catch(() => ({}))
        throw new Error('Control-Detail nicht gerendert: ' + JSON.stringify(info) + ' | Seitenfehler: ' + errors.join(' / '))
      }
      await sleep(300)
    }
    // Klick wie von Hand, aber erst nach sofortigem Scrollen (sanftes Scrollen der Seite verschiebt sonst den Klickpunkt)
    const fallbacks = []
    const clickLink = async (sel, expectId) => {
      // erst abwarten, bis der SoA-Bereich 800 ms lang unverändert ist (spätes Neuzeichnen würde den Anker unter der Maus ersetzen), dann scrollen und klicken
      await page.evaluate(() => new Promise(res => { const root = document.getElementById('soaContainer') || document.body; let t = setTimeout(() => { o.disconnect(); res() }, 800); const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { o.disconnect(); res() }, 800) }); o.observe(root, { childList: true, subtree: true, characterData: true }); setTimeout(() => { o.disconnect(); res() }, 6000) }))
      await page.evaluate(q => document.querySelector(q)?.scrollIntoView({ block: 'center', behavior: 'instant' }), sel); await sleep(400)
      await page.click(sel)
      await sleep(1500)
      const reacted = await page.evaluate(id => !!document.getElementById('soaBackBar') && typeof currentTemplate !== 'undefined' && !!currentTemplate && currentTemplate.id === id, expectId)
      if (!reacted) { fallbacks.push(sel); await page.evaluate(q => document.querySelector(q)?.click(), sel) }   // Klick per Skript (derselbe Handler)
    }
    const links = () => page.evaluate(() => [...document.querySelectorAll('.soa-tmpl-tag')].map(t => ({
      text: t.textContent.replace('×', '').trim(), open: !!t.querySelector('a.soa-tmpl-open'), href: t.querySelector('a.soa-tmpl-open')?.getAttribute('href') || '',
      newtab: t.querySelector('a.soa-tmpl-newtab') ? { target: t.querySelector('a.soa-tmpl-newtab').target, rel: t.querySelector('a.soa-tmpl-newtab').rel } : null, tid: t.querySelector('a.soa-tmpl-open')?.dataset.tid || '' })))
    await openControl()
    out.tags = await links()
    const state = () => page.evaluate(() => ({
      title: typeof currentTemplate !== 'undefined' && currentTemplate ? currentTemplate.title : null, id: typeof currentTemplate !== 'undefined' && currentTemplate ? currentTemplate.id : null,
      backBar: document.getElementById('soaBackBar')?.textContent.trim() || null, soaVisible: !!document.getElementById('soaContainer'),
      pwn: [window.__pwn1, window.__pwn2], strayImgs: document.querySelectorAll('img[src="x"]').length, hash: location.hash,
    }))
    // 1) Dokument 1 öffnen (gleiche Ansicht) → Rückweg → Control wieder aufgeklappt, gleicher Reiter
    await page.evaluate(() => {   // Protokoll für die Fehlersuche: Meldungen und Abrufe unter /template/
      window.__log = []; document.addEventListener('click', e => window.__log.push('click auf ' + e.target.tagName + '.' + e.target.className + ' defaultPrevented=' + e.defaultPrevented + ' button=' + e.button), true); document.addEventListener('click', e => window.__log.push('  nach Handlern: defaultPrevented=' + e.defaultPrevented), false)
      const ot = window.showToast; if (typeof ot === 'function') window.showToast = (m, k) => { window.__log.push('toast: ' + m); return ot(m, k) }
      const of = window.fetch.bind(window); window.fetch = async (u, o) => { const r = await of(u, o); if (String(u).includes('/template')) window.__log.push(`fetch ${String(u).slice(0, 60)} → ${r.status}`); return r }
    })
    await clickLink(`[id="soa-detail-${CTRL}"] a.soa-tmpl-open[data-tid="${DOC1}"]`, DOC1)
    try { await page.waitForSelector('#soaBackBar', { timeout: 15000 }) } catch (e) {
      const info = await page.evaluate(() => ({ cur: typeof currentTemplate !== 'undefined' && currentTemplate ? currentTemplate.id : null, ret: typeof _soaReturn !== 'undefined' ? _soaReturn : 'n/a', section: typeof currentSection !== 'undefined' ? currentSection : 'n/a', toast: [...document.querySelectorAll('[class*=toast]')].map(x => x.textContent.trim()).join('|').slice(0, 200), editor: document.getElementById('editorCard')?.style.display, soa: !!document.getElementById('soaContainer'), role: typeof getCurrentRole === 'function' ? getCurrentRole() : null, hash: location.hash, bound: [...document.querySelectorAll('a.soa-tmpl-open')].map(x => typeof x.onclick), anchors: document.querySelectorAll('a.soa-tmpl-open').length })).catch(() => ({}))
      info.log = await page.evaluate(() => window.__log).catch(() => null)
      info.hit = await page.evaluate(d => { const el = document.querySelector(`a.soa-tmpl-open[data-tid="${d}"]`); if (!el) return 'kein Anker'; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], top: top ? (top.tagName + '.' + top.className + '#' + top.id) : null, same: top === el || el.contains(top) } }, DOC1).catch(e => String(e))
      info.replay = await page.evaluate(async (c, d) => { try { await openLinkedDocument('Policy', d, c); return { ok: true, cur: currentTemplate ? currentTemplate.id : null, ret: _soaReturn, section: currentSection, bar: !!document.getElementById('soaBackBar'), body: document.body.innerText.slice(0, 160).replace(/\n/g, ' | ') } } catch (e) { return { err: String(e && e.stack || e).slice(0, 400) } } }, CTRL, DOC1).catch(e => ({ evalErr: String(e).slice(0, 200) }))
      throw new Error('Rück-Leiste fehlt: ' + JSON.stringify(info) + ' | Seitenfehler: ' + errors.join(' / '))
    }
    await sleep(500)
    out.opened = await state()
    await page.evaluate(() => document.getElementById('soaBackBtn').click())
    await page.waitForSelector('.soa-fw-tab', { timeout: 15000 }); await page.waitForSelector(`[id="soa-detail-${CTRL}"] .soa-tmpl-tag`, { timeout: 15000 }); await sleep(500)
    out.back = await page.evaluate((c) => ({ detailVisible: document.querySelector(`.soa-detail-row[data-for="${c}"]`)?.style.display !== 'none', activeTab: document.querySelector('.soa-fw-tab.active')?.dataset.fw, backBar: !!document.getElementById('soaBackBar') }), CTRL)
    // 2) Dokument mit feindlichem Titel: nichts wird ausgeführt
    await clickLink(`[id="soa-detail-${CTRL}"] a.soa-tmpl-open[data-tid="${DOC2}"]`, DOC2)
    await page.waitForSelector('#soaBackBar', { timeout: 15000 }); await sleep(600)
    out.hostile = await state()
    await page.evaluate(() => document.getElementById('soaBackBtn').click()); await page.waitForSelector(`[id="soa-detail-${CTRL}"] .soa-tmpl-tag`, { timeout: 15000 }); await sleep(400)
    out.afterHostile = await state()
    // Klick auf den Titel der Zeile klappt die Details zu und wieder auf (nicht nur das kleine ▸); der Zähler in der Zeile ist lokalisiert
    const rowOpen = () => page.evaluate(c => document.querySelector(`.soa-detail-row[data-for="${c}"]`)?.style.display !== 'none', CTRL)
    const titleSel = `.soa-row[data-id="${CTRL}"] .soa-ctrl-title`
    await page.evaluate(q => document.querySelector(q)?.scrollIntoView({ block: 'center', behavior: 'instant' }), titleSel); await sleep(400)
    const tb = await (await page.$(titleSel + ' .soa-ctrl-title, ' + titleSel)).boundingBox()
    await page.mouse.click(tb.x + 6, tb.y + tb.height / 2); await sleep(800); const afterClose = await rowOpen()
    await page.mouse.click(tb.x + 6, tb.y + tb.height / 2); await sleep(1500); const afterOpen = await rowOpen()
    out.rowClick = { afterClose, afterOpen, badge: await page.evaluate(q => document.querySelector(q + ' .soa-linked-badge')?.textContent.trim() || null, titleSel) }
    if (MODE === 'voll') {
      // 3) Verweis in neuem Tab (gleiche Sitzung): öffnet das Dokument, entfernt den Verweis aus der Adresse, keine Rück-Leiste
      const p2 = await browser.newPage(); await p2.setViewport({ width: 1500, height: 950 }); p2.on('dialog', d => d.accept())
      await p2.goto(`${BASE}/ui/index.html#doc=Policy/${encodeURIComponent(DOC1)}`, { waitUntil: 'domcontentloaded' })
      await p2.waitForFunction(() => typeof currentTemplate !== 'undefined' && currentTemplate && currentTemplate.id, { timeout: 25000 }); await sleep(500)
      out.deepLink = await p2.evaluate(() => ({ id: currentTemplate.id, hash: location.hash, backBar: !!document.getElementById('soaBackBar'), editor: document.getElementById('editorCard')?.style.display !== 'none' }))
      // 4) ungültige / unbekannte Verweise: kein Absturz, kein Dokument
      for (const [k, h] of [['invalid', '#doc=Policy/..%2F..%2Fx'], ['unknown', '#doc=Policy/gibt-es-nicht'], ['badtype', '#doc=%3Cimg%3E/abc']]) {
        const p3 = await browser.newPage(); p3.on('dialog', d => d.accept()); const errs = []; p3.on('pageerror', e => errs.push(String(e.message)))
        await p3.goto(`${BASE}/ui/index.html${h}`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
        out['deep_' + k] = await p3.evaluate(() => ({ cur: typeof currentTemplate !== 'undefined' && currentTemplate ? currentTemplate.id : null, hash: location.hash, appBody: !!document.querySelector('.app-body') })); out['deep_' + k].errors = errs.length
        await p3.close()
      }
    }
    out.fallbacks = fallbacks
    console.log(JSON.stringify(out))
  } finally { await browser.close() }
})().catch(e => { console.error(e && e.stack || String(e)); process.exit(1) })
