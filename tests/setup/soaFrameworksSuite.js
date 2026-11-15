'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Gemeinsame Testgruppe „Eigene SoA-Gruppen“; aufgerufen von soaFrameworks.test.js (JSON) und soaFrameworksSql.test.js (SQLite) —
// getrennte Dateien, weil die Stores ihren Speicher beim Laden festlegen.
const fs = require('fs')
const path = require('path')
const request = require('supertest')
const { createTestDataDir, removeTestDataDir } = require('./testEnv')
const { loginAs, authedGet, authedPost, authedPut, authedDelete } = require('./authHelper')

function runSoaFrameworksSuite(backend) {
  describe(`Eigene SoA-Gruppen [${backend}]`, () => {
    let dataDir, app, admin, editor, owner, reader
    beforeAll(async () => {
      dataDir = createTestDataDir()
      Object.assign(process.env, { DATA_DIR: dataDir, JWT_SECRET: 'jest-soafw-' + backend, NODE_ENV: 'test', STORAGE_BACKEND: backend })
      delete process.env.DEMO_HOSTING
      app = require('../../server/index.js')
      if (app.bootstrap) await app.bootstrap()
      admin = await loginAs(app, 'admin'); editor = await loginAs(app, 'editor'); owner = await loginAs(app, 'contentowner'); reader = await loginAs(app, 'reader')
    })
    afterAll(async () => { if (backend !== 'json') await require('../../server/db/knexDatabase').destroy(); removeTestDataDir(dataDir) })

    const defFile = () => path.join(dataDir, 'soa-frameworks.json')
    const fws = async cookie => (await authedGet(app, cookie || admin, '/soa/frameworks')).body
    const list = async fw => (await authedGet(app, admin, `/soa?framework=${fw}`)).body
    const imp = (body, dry) => authedPost(app, admin, '/soa/frameworks/import' + (dry ? '?dryRun=1' : ''), body)
    const file = (id = 'NEN7510', controls) => ({ framework: { id, label: 'NEN 7510:2024', color: '#0EA5E9' }, controls: controls || [
      { id: 'NEN-1', theme: 'Toegang', title: 'Toegang wordt per rol verleend', description: 'Erfundener Beispieltext' },
      { id: 'NEN-2', theme: 'Toegang', title: 'Bevoorrechte accounts worden gecontroleerd' },
      { id: 'NEN-3', theme: 'Beheer', title: 'Back-ups worden getest' },
    ] })

    describe('Rechte und Anlegen', () => {
      test('eingebaute Gruppen zuerst, noch keine eigene; Leser dürfen lesen', async () => {
        const l = await fws(reader)
        expect(l.map(f => f.id)).toEqual(['ISO27001', 'BSI', 'NIS2', 'EUCS', 'EUAI', 'ISO9000', 'ISO9001', 'CRA', 'CUSTOM'])
        expect(l.some(f => f.custom)).toBe(false)
      })

      test.each([['editor'], ['contentowner'], ['reader']])('%s darf weder anlegen, ändern, löschen noch importieren (403)', async role => {
        const c = { editor, contentowner: owner, reader }[role]
        expect((await authedPost(app, c, '/soa/frameworks', { id: 'X1', label: 'x' })).status).toBe(403)
        expect((await authedPut(app, c, '/soa/frameworks/X1', { label: 'y' })).status).toBe(403)
        expect((await authedDelete(app, c, '/soa/frameworks/X1')).status).toBe(403)
        expect((await authedPost(app, c, '/soa/frameworks/import', file())).status).toBe(403)
        expect((await authedGet(app, c, '/soa/frameworks/import/example')).status).toBe(403)
      })

      test('ohne Anmeldung: 401', async () => {
        expect((await request(app).post('/soa/frameworks').send({ id: 'X1', label: 'x' })).status).toBe(401)
        expect((await request(app).post('/soa/frameworks/import').send(file())).status).toBe(401)
      })

      test.each([
        ['kleingeschriebene Kennung', { id: 'nen7510', label: 'x' }, 400, 'invalid_id'],
        ['Kennung mit Leerzeichen', { id: 'NEN 7510', label: 'x' }, 400, 'invalid_id'],
        ['zu kurze Kennung', { id: 'N', label: 'x' }, 400, 'invalid_id'],
        ['zu lange Kennung', { id: 'N'.repeat(51), label: 'x' }, 400, 'invalid_id'],
        ['reserviert: eingebautes Framework', { id: 'BSI', label: 'x' }, 400, 'reserved_id'],
        ['reserviert: CUSTOM', { id: 'CUSTOM', label: 'x' }, 400, 'reserved_id'],
        ['Bezeichnung leer', { id: 'NEN7510', label: '  ' }, 400, 'invalid_label'],
        ['Bezeichnung zu lang', { id: 'NEN7510', label: 'x'.repeat(121) }, 400, 'invalid_label'],
        ['Farbe kein Hex', { id: 'NEN7510', label: 'x', color: 'red' }, 400, 'invalid_color'],
        ['CSS-Einschleusung über die Farbe', { id: 'NEN7510', label: 'x', color: '#fff; background:url(//evil.example/x)' }, 400, 'invalid_color'],
        ['Farbe mit Ausdruck', { id: 'NEN7510', label: 'x', color: 'expression(alert(1))' }, 400, 'invalid_color'],
      ])('ungültig: %s → %i', async (_n, body, status, code) => {
        const r = await authedPost(app, admin, '/soa/frameworks', body)
        expect([r.status, r.body.code]).toEqual([status, code])
        expect(typeof r.body.error).toBe('string')
      })

      test('Anlegen: 201, Farbe klein geschrieben, in der Liste mit custom:true; Dubletten → 409', async () => {
        const r = await authedPost(app, admin, '/soa/frameworks', { id: 'TISAX', label: 'TISAX', color: '#AA00FF' })
        expect(r.status).toBe(201)
        expect(r.body).toMatchObject({ id: 'TISAX', label: 'TISAX', color: '#aa00ff', custom: true, createdBy: expect.any(String) })
        const l = await fws()
        expect(l[l.length - 1]).toMatchObject({ id: 'TISAX', custom: true, color: '#aa00ff' })
        expect(l.slice(0, 9).every(f => !f.custom)).toBe(true)
        expect((await authedPost(app, admin, '/soa/frameworks', { id: 'TISAX', label: 'andere' })).status).toBe(409)
      })

      test('Bezeichnung mit HTML wird als Text gespeichert (die Oberfläche maskiert) — nicht ausgeführt, nicht abgelehnt', async () => {
        const evil = '<img src=x onerror=alert(1)>'
        expect((await authedPost(app, admin, '/soa/frameworks', { id: 'XSS1', label: evil })).status).toBe(201)
        expect((await fws()).find(f => f.id === 'XSS1').label).toBe(evil)
        expect((await authedDelete(app, admin, '/soa/frameworks/XSS1')).status).toBe(200)
      })

      test('Ändern: nur Bezeichnung und Farbe, die Kennung bleibt; eingebaute und unbekannte Gruppen → 403/404', async () => {
        const r = await authedPut(app, admin, '/soa/frameworks/TISAX', { id: 'ANDERS', label: 'TISAX 6', color: '#112233' })
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ id: 'TISAX', label: 'TISAX 6', color: '#112233' })
        expect((await authedPut(app, admin, '/soa/frameworks/TISAX', { color: 'rot' })).status).toBe(400)
        expect((await authedPut(app, admin, '/soa/frameworks/BSI', { label: 'x' })).status).toBe(403)
        expect((await authedPut(app, admin, '/soa/frameworks/CUSTOM', { label: 'x' })).status).toBe(403)
        expect((await authedPut(app, admin, '/soa/frameworks/GIBTSNICHT', { label: 'x' })).status).toBe(404)
      })

      test('Verwaltungsliste (nur Administratoren): alle eigenen Gruppen mit Anzahl, auch ausgeblendete', async () => {
        expect((await authedGet(app, editor, '/soa/frameworks/custom')).status).toBe(403)
        const l = (await authedGet(app, admin, '/soa/frameworks/custom')).body
        expect(l.find(f => f.id === 'TISAX')).toMatchObject({ label: 'TISAX 6', custom: true, count: 0 })
      })

      test('Definitionsdatei: gültiges JSON, keine Temp-Dateien übrig', () => {
        expect(JSON.parse(fs.readFileSync(defFile(), 'utf8')).map(f => f.id)).toContain('TISAX')
        expect(fs.readdirSync(dataDir).filter(f => f.startsWith('soa-frameworks') && f !== 'soa-frameworks.json')).toEqual([])
      })

      test('leere Gruppe darf gelöscht werden; eingebaute nicht; unbekannte → 404', async () => {
        expect((await authedDelete(app, admin, '/soa/frameworks/TISAX')).status).toBe(200)
        expect((await fws()).some(f => f.id === 'TISAX')).toBe(false)
        expect((await authedDelete(app, admin, '/soa/frameworks/BSI')).status).toBe(403)
        expect((await authedDelete(app, admin, '/soa/frameworks/TISAX')).status).toBe(404)
      })
    })

    describe('Import', () => {
      test('Beispieldatei (erfundene Controls) ist selbst importierbar', async () => {
        const ex = (await authedGet(app, admin, '/soa/frameworks/import/example')).body
        expect(ex.controls.length).toBeGreaterThan(1)
        const r = await imp(ex, true)
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ dryRun: true, rejected: 0, added: ex.controls.length })
      })

      test('Vorschau (dryRun) schreibt nichts: weder Gruppe noch Controls', async () => {
        const r = await imp(file(), true)
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ dryRun: true, framework: { id: 'NEN7510', exists: false, color: '#0ea5e9' }, total: 3, added: 3, updated: 0, rejected: 0 })
        expect(r.body.preview.map(p => [p.id, p.state])).toEqual([['NEN-1', 'added'], ['NEN-2', 'added'], ['NEN-3', 'added']])
        expect((await fws()).some(f => f.id === 'NEN7510')).toBe(false)
        expect(await list('NEN7510')).toHaveLength(0)
      })

      test('Dateiformat: Array, fehlende Liste, zu viele Zeilen → 400', async () => {
        expect((await imp([{ id: 'A-1' }])).status).toBe(400)
        expect((await imp({ framework: { id: 'NEN7510', label: 'x' } })).status).toBe(400)
        const r = await imp({ framework: { id: 'NEN7510', label: 'x' }, controls: Array.from({ length: 2001 }, (_, i) => ({ id: 'N-' + i, theme: 't', title: 't' })) })
        expect([r.status, r.body.code]).toEqual([400, 'too_many_rows'])
      })

      test('Gruppe ungültig oder reserviert: 400, nichts angelegt', async () => {
        expect((await imp(file('bsi'))).body.code).toBe('invalid_id')
        expect((await imp(file('BSI'))).body.code).toBe('reserved_id')
        expect((await imp({ framework: { id: 'NEN7510', label: 'x', color: 'red' }, controls: file().controls })).body.code).toBe('invalid_color')
        expect((await imp({ controls: file().controls })).status).toBe(400)
        expect((await fws()).some(f => f.custom)).toBe(false)
      })

      test('nur ungültige Zeilen: 400 mit Gründen, die Gruppe wird dann nicht angelegt', async () => {
        const r = await imp(file('NEN7510', [{ id: 'a/b', theme: 't', title: 'x' }, 'kaputt', { id: 'N-9', theme: '', title: 'x' }]))
        expect(r.status).toBe(400)
        expect(r.body).toMatchObject({ rejected: 3, rejectedByReason: { invalid_id: 1, not_an_object: 1, missing_field: 1 } })
        expect((await fws()).some(f => f.id === 'NEN7510')).toBe(false)
      })

      test('echter Import legt Gruppe und Controls an; sie sind sofort in Liste, Kennzahlen, Bericht und Export', async () => {
        const r = await imp(file())
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ dryRun: false, added: 3, updated: 0, rejected: 0, framework: { id: 'NEN7510', exists: false } })
        const l = await fws()
        expect(l[l.length - 1]).toMatchObject({ id: 'NEN7510', label: 'NEN 7510:2024', color: '#0ea5e9', custom: true })
        const ctrls = await list('NEN7510')
        expect(ctrls.map(c => c.id).sort()).toEqual(['NEN-1', 'NEN-2', 'NEN-3'])
        expect(ctrls.find(c => c.id === 'NEN-1')).toMatchObject({ framework: 'NEN7510', theme: 'Toegang', applicable: true, status: 'not_started', owner: '', isCustom: true, description: 'Erfundener Beispieltext' })
        const sum = (await authedGet(app, admin, '/soa/summary')).body
        expect(sum.NEN7510).toMatchObject({ total: 3, applicable: 3, label: 'NEN 7510:2024', color: '#0ea5e9' })
        expect((await authedGet(app, admin, '/soa/summary?framework=NEN7510')).body).toMatchObject({ total: 3 })
        const rep = (await authedGet(app, admin, '/reports/framework')).body.find(x => x.framework === 'NEN7510')
        expect(rep).toMatchObject({ total: 3, label: 'NEN 7510:2024', color: '#0ea5e9' })
        const ex = (await authedGet(app, admin, '/soa/export')).body
        expect(ex.frameworks.find(f => f.id === 'NEN7510')).toMatchObject({ custom: true })
        expect(ex.controls.filter(c => c.framework === 'NEN7510')).toHaveLength(3)
        expect(ex.summary.NEN7510.total).toBe(3)
      })

      test('erneuter Import = Zusammenführen: Titel/Thema/Beschreibung werden aufgefrischt, Nutzerangaben bleiben, nichts wird gelöscht', async () => {
        await authedPut(app, admin, '/soa/NEN-1', { owner: 'CISO', status: 'implemented', justification: 'Rollenmodell', applicable: true })
        await authedPut(app, admin, '/soa/NEN-2', { applicable: false, justification: 'nicht im Scope' })
        const r = await imp(file('NEN7510', [
          { id: 'NEN-1', theme: 'Toegang 2', title: 'Neuer Titel' },            // Beschreibung fehlt → alte bleibt
          { id: 'NEN-4', theme: 'Beheer', title: 'Neu' },
        ]))
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ added: 1, updated: 1, rejected: 0, framework: { exists: true } })
        const ctrls = await list('NEN7510')
        expect(ctrls.map(c => c.id).sort()).toEqual(['NEN-1', 'NEN-2', 'NEN-3', 'NEN-4'])   // NEN-2/NEN-3 stehen nicht in der Datei, bleiben aber
        expect(ctrls.find(c => c.id === 'NEN-1')).toMatchObject({ title: 'Neuer Titel', theme: 'Toegang 2', description: 'Erfundener Beispieltext', owner: 'CISO', status: 'implemented', justification: 'Rollenmodell' })
        expect(ctrls.find(c => c.id === 'NEN-2')).toMatchObject({ applicable: false, justification: 'nicht im Scope' })
      })

      test('bei vorhandener Gruppe gelten Bezeichnung und Farbe der Datei nicht', async () => {
        await imp({ framework: { id: 'NEN7510', label: 'Anderer Name', color: '#ff0000' }, controls: [{ id: 'NEN-1', theme: 't', title: 'x' }] })
        expect((await fws()).find(f => f.id === 'NEN7510')).toMatchObject({ label: 'NEN 7510:2024', color: '#0ea5e9' })
      })

      test('Ablehnungsgründe je Zeile: Kennung gehört schon zu anderer Gruppe, doppelt, ungültig, zu lang, Pflichtfeld', async () => {
        const r = await imp(file('NEN7510', [
          { id: 'NEN-9', theme: 'ok', title: 'ok' },
          { id: 'BSI-ISMS.1', theme: 'x', title: 'y' },              // gehört zu BSI → id_conflict
          { id: 'NEN-9', theme: 'ok', title: 'doppelt' },            // duplicate_id
          { id: 'constructor', theme: 'x', title: 'y' },             // invalid_id (Name aus Object.prototype)
          { id: '__proto__', theme: 'x', title: 'y' },               // invalid_id
          { id: 'N 10', theme: 'x', title: 'y' },                    // invalid_id
          { id: 'NEN-10', theme: 'T'.repeat(81), title: 'y' },       // too_long (Spalte theme: 80)
          { id: 'NEN-11', theme: 'x', title: 'T'.repeat(513) },      // too_long
          { id: 'NEN-12', theme: 'x', title: 'y', description: 'D'.repeat(4001) },   // too_long
          { id: 'NEN-13', theme: 'x' },                              // missing_field
          42,                                                         // not_an_object
        ]), true)
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ added: 1, rejected: 10 })
        expect(r.body.rejectedByReason).toEqual({ id_conflict: 1, duplicate_id: 1, invalid_id: 3, too_long: 3, missing_field: 1, not_an_object: 1 })
        expect(r.body.rejectedDetails.find(d => d.reason === 'id_conflict').id).toBe('BSI-ISMS.1')
        expect((await list('BSI')).find(c => c.id === 'BSI-ISMS.1').framework).toBe('BSI')   // eingebaute Controls bleiben unberührt
      })

      test('Grenzwerte gelten (theme 80, title 512, id 120 Zeichen) und werden gespeichert', async () => {
        const id = 'L' + 'x'.repeat(119)
        const r = await imp(file('NEN7510', [{ id, theme: 'T'.repeat(80), title: 'y'.repeat(512), description: 'd'.repeat(4000) }]))
        expect(r.status).toBe(200)
        expect(r.body).toMatchObject({ added: 1, rejected: 0 })
        const c = (await list('NEN7510')).find(x => x.id === id)
        expect([c.theme.length, c.title.length, c.description.length]).toEqual([80, 512, 4000])
      })

      test('zwei Gruppen: dieselbe Kennung in beiden → id_conflict, die erste Gruppe bleibt unverändert', async () => {
        expect((await imp(file('TISAX', [{ id: 'TX-1', theme: 'a', title: 'b' }]))).status).toBe(200)
        const r = await imp(file('NEN7510', [{ id: 'TX-1', theme: 'x', title: 'y' }]), true)
        expect(r.body.rejectedByReason).toEqual({ id_conflict: 1 })
        expect((await list('TISAX')).map(c => c.id)).toEqual(['TX-1'])
      })
    })

    describe('Einzelne Controls, Löschen, Schalter', () => {
      test('POST /soa/custom: eigene Gruppe und freie Kennung', async () => {
        const r = await authedPost(app, owner, '/soa/custom', { title: 'Einzeln', theme: 'Test', framework: 'NEN7510', controlId: 'NEN-EINZEL' })
        expect(r.status).toBe(201)
        expect(r.body).toMatchObject({ id: 'NEN-EINZEL', framework: 'NEN7510', isCustom: true })
        expect((await list('NEN7510')).some(c => c.id === 'NEN-EINZEL')).toBe(true)
        expect((await authedPost(app, owner, '/soa/custom', { title: 'Nochmal', framework: 'NEN7510', controlId: 'NEN-EINZEL' })).status).toBe(409)
        expect((await authedPost(app, owner, '/soa/custom', { title: 'x', controlId: 'BSI-ISMS.1' })).status).toBe(409)
        expect((await authedPost(app, owner, '/soa/custom', { title: 'x', framework: 'GIBTSNICHT' })).status).toBe(400)
        expect((await authedPost(app, owner, '/soa/custom', { title: 'x', controlId: 'a b/c' })).status).toBe(400)
        expect((await authedPost(app, owner, '/soa/custom', { title: 'x', controlId: 'constructor' })).status).toBe(400)
        expect((await authedPost(app, owner, '/soa/custom', { title: 'x', framework: 'BSI' })).status).toBe(400)   // nur CUSTOM oder eigene Gruppen
      })

      test('ohne Angaben bleibt es wie bisher: Gruppe CUSTOM, erzeugte Kennung CUSTOM-…', async () => {
        const r = await authedPost(app, owner, '/soa/custom', { title: 'Wie früher' })
        expect(r.status).toBe(201)
        expect(r.body.framework).toBe('CUSTOM')
        expect(r.body.id).toMatch(/^CUSTOM-\d+/)
      })

      test('Controls einer eigenen Gruppe lassen sich bearbeiten und einzeln löschen (Content Owner)', async () => {
        expect((await authedPut(app, owner, '/soa/custom/NEN-3', { title: 'Back-ups werden jährlich getestet' })).status).toBe(200)
        expect((await list('NEN7510')).find(c => c.id === 'NEN-3').title).toBe('Back-ups werden jährlich getestet')
        expect((await authedDelete(app, owner, '/soa/custom/NEN-3')).status).toBe(200)
      })

      test('Löschsperre: Gruppe mit Controls → 409 mit Anzahl; erst nach dem Entfernen aller Controls möglich', async () => {
        const r = await authedDelete(app, admin, '/soa/frameworks/NEN7510')
        expect(r.status).toBe(409)
        expect(r.body.count).toBeGreaterThan(0)
        expect((await fws()).some(f => f.id === 'NEN7510')).toBe(true)
        for (const c of await list('NEN7510')) expect((await authedDelete(app, owner, `/soa/custom/${encodeURIComponent(c.id)}`)).status).toBe(200)
        expect(await list('NEN7510')).toHaveLength(0)
        expect((await authedDelete(app, admin, '/soa/frameworks/NEN7510')).status).toBe(200)
        expect((await fws()).some(f => f.id === 'NEN7510')).toBe(false)
      })

      test('Controls ohne Definition (Datei gelöscht) gehen aus Kennzahlen und Bericht nicht verloren', async () => {
        expect((await imp(file('KUNDE-A', [{ id: 'KA-1', theme: 'a', title: 'b' }]))).status).toBe(200)
        fs.unlinkSync(defFile())   // der Betreiber löscht die Definitionsdatei
        expect((await fws()).some(f => f.id === 'KUNDE-A')).toBe(false)        // der Tab verschwindet …
        expect((await authedGet(app, admin, '/soa/summary')).body['KUNDE-A']).toMatchObject({ total: 1, label: 'KUNDE-A' })   // … die Controls nicht
        expect((await authedGet(app, admin, '/reports/framework')).body.find(x => x.framework === 'KUNDE-A')).toMatchObject({ total: 1 })
        expect((await list('KUNDE-A'))).toHaveLength(1)
      })

      test('vorhandener Schalter wirkt: ausgeblendete eigene Gruppe fehlt in Liste und Kennzahlen', async () => {
        expect((await authedPost(app, admin, '/soa/frameworks', { id: 'SCHALT', label: 'Schalter' })).status).toBe(201)
        expect((await fws()).some(f => f.id === 'SCHALT')).toBe(true)
        expect((await authedPut(app, admin, '/admin/soa-frameworks', { SCHALT: false })).status).toBe(200)
        expect((await fws()).some(f => f.id === 'SCHALT')).toBe(false)
        expect(Object.keys((await authedGet(app, admin, '/soa/summary')).body)).not.toContain('SCHALT')
        await authedPut(app, admin, '/admin/soa-frameworks', { SCHALT: true })
        expect((await fws()).some(f => f.id === 'SCHALT')).toBe(true)
      })

      test('Sammel-Tab CUSTOM ist wie die übrigen Frameworks ausschaltbar: ausgeblendet in Liste und Kennzahlen, die Controls bleiben', async () => {
        expect((await authedGet(app, admin, '/admin/soa-frameworks')).body.CUSTOM).toBe(true)          // Standard: an (bestehende Installationen unverändert)
        const c = await authedPost(app, owner, '/soa/custom', { title: 'Bleibt erhalten' })
        expect(c.status).toBe(201)
        expect((await fws()).some(f => f.id === 'CUSTOM')).toBe(true)
        expect((await authedPut(app, admin, '/admin/soa-frameworks', { CUSTOM: false })).status).toBe(200)
        expect((await fws()).some(f => f.id === 'CUSTOM')).toBe(false)                                  // Tab weg
        expect((await fws(reader)).some(f => f.id === 'CUSTOM')).toBe(false)                            // für alle Rollen
        expect(Object.keys((await authedGet(app, admin, '/soa/summary')).body)).not.toContain('CUSTOM') // auch in den Kennzahlen
        expect((await list('CUSTOM')).some(x => x.id === c.body.id)).toBe(true)                         // Controls sind nicht gelöscht
        expect((await fws()).some(f => f.id === 'BSI')).toBe(true)                                      // andere unberührt
        expect((await authedPut(app, admin, '/admin/soa-frameworks', { CUSTOM: true })).status).toBe(200)
        expect((await fws()).some(f => f.id === 'CUSTOM')).toBe(true)
        expect(Object.keys((await authedGet(app, admin, '/soa/summary')).body)).toContain('CUSTOM')
        expect((await list('CUSTOM')).some(x => x.id === c.body.id)).toBe(true)
        expect((await authedDelete(app, owner, `/soa/custom/${encodeURIComponent(c.body.id)}`)).status).toBe(200)
      })

      test('Vollexport enthält die Definitionen; ein Demo-Import überschreibt sie nicht (Demo-Import gibt es nur mit JSON)', async () => {
        const bundle = (await authedGet(app, admin, '/admin/export')).body
        expect(bundle.files['soa-frameworks.json'].map(f => f.id)).toContain('SCHALT')
        const before = fs.readFileSync(defFile(), 'utf8')
        const r = await authedPost(app, admin, '/admin/demo-import', { files: { 'soa-frameworks.json': [], 'goals.json': [] } })
        if (backend !== 'json') { expect(r.status).toBe(409); return }
        expect(r.status).toBe(200)                                            // die Route wurde wirklich erreicht …
        expect(fs.readFileSync(defFile(), 'utf8')).toBe(before)               // … und die Definitionen sind geschützt
      })

      test('Audit-Log: Anlegen, Ändern, Import und Löschen werden protokolliert', async () => {
        const log = (await authedGet(app, admin, '/admin/audit-log')).body
        const entries = Array.isArray(log) ? log : (log.entries || [])
        const acts = entries.filter(e => e.resource === 'soa-framework').map(e => e.action)
        for (const a of ['create', 'update', 'import', 'delete']) expect(acts).toContain(a)
      })
    })
  })
}
module.exports = { runSoaFrameworksSuite }
