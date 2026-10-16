'use strict'
// Audit-Verwaltung: Oberfläche. ui/app.js ist Browser-Code ohne Export; die reinen Hilfsfunktionen
// werden aus dem Quelltext herausgelöst und mit einem minimalen DOM-Ersatz ausgeführt, der Rest wird
// statisch auf die Verdrahtung geprüft.
const fs   = require('fs')
const path = require('path')
const vm   = require('vm')

const APP = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')

function fnSource(name) {
  const a = APP.indexOf(`function ${name}(`)
  if (a < 0) throw new Error(`${name} nicht gefunden`)
  return APP.slice(a, APP.indexOf('\n}\n', a) + 3)
}

function load(role = 'auditor') {
  const slice = APP.slice(APP.indexOf('const AU_TYPES = {'), APP.indexOf('// ── Seite ──'))
  const ctx = {
    t: k => k, dom: () => null, apiHeaders: () => ({}),
    ROLE_RANK: { reader: 1, editor: 2, contentowner: 3, auditor: 3, admin: 4 }, getCurrentRole: () => role,
  }
  vm.createContext(ctx)
  vm.runInContext(fnSource('escHtml'), ctx)
  vm.runInContext(slice, ctx)
  vm.runInContext(fnSource('auQuarters') + fnSource('auItemRows') + fnSource('auItemEditor'), ctx)
  return ctx
}

describe('Audit-UI: Hilfsfunktionen', () => {
  test('Rechte: lesen für alle, schreiben ab Rang 3, endgültig löschen nur admin', () => {
    expect(load('reader').auCanWrite()).toBe(false)
    expect(load('editor').auCanWrite()).toBe(false)
    expect(load('auditor').auCanWrite()).toBe(true)
    expect(load('auditor').auIsAdmin()).toBe(false)
    expect(load('admin').auIsAdmin()).toBe(true)
  })

  test('Quartalsplan: Gruppen nach geplantem Beginn, ohne Datum separat, leere Quartale entfallen', () => {
    const c = load()
    const q = c.auQuarters([
      { id: 'a', plannedStart: '2027-05-10' }, { id: 'b', plannedStart: '2027-01-02' },
      { id: 'c', plannedEnd: '2027-12-31' }, { id: 'd' }, { id: 'e', plannedStart: '2027-03-31' },
    ])
    expect(q.map(g => g.list.map(a => a.id))).toEqual([['b', 'e'], ['a'], ['c'], ['d']])
    expect(q.map(g => g.label)).toEqual(['audit_quarter 1', 'audit_quarter 2', 'audit_quarter 4', 'audit_unscheduled'])
  })

  test('Prüfpunkt-Zeile escaped Eingaben und bietet „Finding erzeugen“ nur bei Abweichung ohne Finding', () => {
    const c = load()
    const audit = { id: 'au1', findings: [] }
    const evil = { id: 'i1', controlId: 'ISO-5.1', question: '<img src=x onerror=alert(1)>', result: 'nonconform', evidence: '"><script>', notes: '', findingId: null }
    const html = c.auItemRows(audit, evil, true)
    expect(html).not.toMatch(/<img src=x/)
    expect(html).not.toMatch(/<script>/)
    expect(html).toMatch(/auCreateFinding\('au1','i1'\)/)

    expect(c.auItemRows(audit, { ...evil, result: 'conform' }, true)).not.toMatch(/auCreateFinding/)
    expect(c.auItemRows({ ...audit, findings: [{ id: 'f1', ref: 'FIND-2026-0001' }] }, { ...evil, findingId: 'f1' }, true)).toMatch(/FIND-2026-0001/)
  })

  test('ohne Schreibrecht keine Bearbeiten-/Löschen-Knöpfe und nur ein Ergebnis-Badge statt Auswahl', () => {
    const c = load('reader')
    const html = c.auItemRows({ id: 'au1', findings: [] }, { id: 'i1', question: 'Q', result: 'conform' }, false)
    expect(html).not.toMatch(/<select/)
    expect(html).not.toMatch(/auDeleteItem/)
    expect(html).toMatch(/au-badge/)
  })

  test('Prüfpunkt-Editor: IDs je Prüfpunkt, Abbrechen nur beim Bearbeiten', () => {
    const c = load()
    expect(c.auItemEditor('au1', null)).toMatch(/id="auiQ_new"/)
    expect(c.auItemEditor('au1', null)).not.toMatch(/ui_cancel/)
    const edit = c.auItemEditor('au1', { id: 'i9', question: 'Frage' })
    expect(edit).toMatch(/id="auiQ_i9"/)
    expect(edit).toMatch(/auSaveItem\('au1','i9'\)/)
    expect(edit).toMatch(/ui_cancel/)
  })
})

describe('Audit-UI: Verdrahtung', () => {
  test('Navigation, Modul-Schalter, Container und Seitenaufbau', () => {
    expect(APP).toMatch(/\{ id:'audits',\s+labelKey:'nav_audits'/)
    expect(APP).toMatch(/audits:true,\n\}/)
    expect(APP).toMatch(/sectionId === 'audits'[\s\S]{0,160}renderAudits\(\)/)
    expect((APP.match(/'auditsContainer'/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(APP).toMatch(/id: 'audits',[^\n]*\n\s+get desc\(\) \{ return t\('modmeta_audits'\) \}/)
  })

  test('Kalender, Papierkorb, Suche, Dashboard', () => {
    for (const k of ['audit_planned', 'audit_due', 'audit_followup']) expect(APP).toMatch(new RegExp(`${k}:\\s+\\{ get label`))
    expect(APP).toMatch(/module === 'audit'\) url = `\/audits\/\$\{id\}\/restore`/)
    expect(APP).toMatch(/module === 'audit_program'\) url = `\/audit-programs\/\$\{id\}\/permanent`/)
    expect(APP).toMatch(/_auPendingId = new URLSearchParams/)
    expect(APP).toMatch(/fetch\('\/audits\/summary'/)
    expect(APP).toMatch(/data-nav="audits"/)
  })

  test('Findings-Formular ordnet einem Audit zu', () => {
    expect(APP).toMatch(/id="fndAudit"/)
    expect(APP).toMatch(/\.\.\.\(dom\('fndAudit'\) \? \{ auditId: dom\('fndAudit'\)\.value \} : \{\}\)/)
  })

  test('Exporte: CSV und PDF für Liste, Bericht und Programm', () => {
    for (const f of ['exportAuditsCsv', 'exportAuditsPdf', 'printAuditReport', 'exportAuditProgramCsv', 'exportAuditProgramPdf']) {
      expect(APP).toMatch(new RegExp(`function ${f}\\(`))
    }
  })
})
