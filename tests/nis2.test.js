'use strict'
const { createTestDataDir, removeTestDataDir } = require('./setup/testEnv')
const { loginAs, authedGet, authedPost, authedPut } = require('./setup/authHelper')

let dataDir, app, adminCookie, editorCookie, readerCookie
// Erst nach dem Setzen von DATA_DIR laden — Stores lesen den Pfad beim Require.
// Ein require im describe-Rumpf liefe zu früh und griffe auf das echte data/ zu.
let art23, watcher

beforeAll(async () => {
  dataDir = createTestDataDir()
  process.env.DATA_DIR        = dataDir
  process.env.JWT_SECRET      = 'jest-test-secret-nis2'
  process.env.NODE_ENV        = 'test'
  process.env.STORAGE_BACKEND = 'json'
  app     = require('../server/index.js')
  art23   = require('../server/db/art23')
  watcher = require('../server/art23Watcher')

  adminCookie  = await loginAs(app, 'admin')
  editorCookie = await loginAs(app, 'editor')
  readerCookie = await loginAs(app, 'reader')
})

afterAll(async () => {
  removeTestDataDir(dataDir)
})

// ════════════════════════════════════════════════════════════
// Art. 21 — Governance-Checkliste
// ════════════════════════════════════════════════════════════

describe('NIS2 Art. 21 — Governance-Checkliste', () => {
  test('GET /nis2/governance liefert alle 30 Items', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(30)
    expect(res.body.summary.total).toBe(30)
  })

  test('Prioritäten sind 10 / 10 / 10 verteilt', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance')
    const byPriority = res.body.summary.byPriority
    expect(byPriority.CRITICAL.total).toBe(10)
    expect(byPriority.HIGH.total).toBe(10)
    expect(byPriority.MEDIUM.total).toBe(10)
  })

  test('alle zehn Sub-Paragraphen (a–j) sind abgedeckt', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance')
    const covered = new Set(res.body.items.map(i => i.subParagraph))
    expect([...covered].sort().join('')).toBe('abcdefghij')
  })

  test('Item-IDs sind eindeutig', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance')
    const ids = res.body.items.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('Filter nach Priorität', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance?priority=CRITICAL')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(10)
    expect(res.body.items.every(i => i.priority === 'CRITICAL')).toBe(true)
  })

  test('GET /nis2/governance/:id – Einzelitem', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance/nis2_gov_001')
    expect(res.status).toBe(200)
    expect(res.body.article).toBe('21')
    expect(res.body.status).toBe('open')
    expect(res.body.subParagraphText).toBeTruthy()
  })

  test('GET /nis2/governance/:id – 404 bei unbekannter ID', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance/nis2_gov_999')
    expect(res.status).toBe(404)
  })

  test('editor darf nicht ändern (403)', async () => {
    const res = await authedPut(app, editorCookie, '/nis2/governance/nis2_gov_001', { status: 'completed' })
    expect(res.status).toBe(403)
  })

  test('Status setzen, Owner zuweisen und Nachweise hinterlegen', async () => {
    const res = await authedPut(app, adminCookie, '/nis2/governance/nis2_gov_001', {
      status: 'completed',
      ownerEmail: 'ciso@example.com',
      notes: 'Scoping abgeschlossen',
      evidenceUrls: ['https://intranet/scoping.pdf', '  '],
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(res.body.completedAt).toBeTruthy()
    expect(res.body.assignedAt).toBeTruthy()
    expect(res.body.evidenceUrls).toEqual(['https://intranet/scoping.pdf'])  // Leerwert entfernt
  })

  test('Bearbeitungsstand überlebt erneutes Lesen', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance/nis2_gov_001')
    expect(res.body.status).toBe('completed')
    expect(res.body.ownerEmail).toBe('ciso@example.com')
  })

  test('ungültiger Status wird abgelehnt (400)', async () => {
    const res = await authedPut(app, adminCookie, '/nis2/governance/nis2_gov_002', { status: 'erledigt' })
    expect(res.status).toBe(400)
  })

  test('Zurücksetzen auf offen löscht den Abschlusszeitpunkt', async () => {
    await authedPut(app, adminCookie, '/nis2/governance/nis2_gov_003', { status: 'completed' })
    const res = await authedPut(app, adminCookie, '/nis2/governance/nis2_gov_003', { status: 'in_progress' })
    expect(res.body.completedAt).toBeNull()
  })

  test('nicht anwendbare Items zählen nicht gegen die Erfüllungsquote', async () => {
    const before = (await authedGet(app, readerCookie, '/nis2/governance/summary')).body
    await authedPut(app, adminCookie, '/nis2/governance/nis2_gov_030', { status: 'na' })
    const after = (await authedGet(app, readerCookie, '/nis2/governance/summary')).body

    expect(after.na).toBe(before.na + 1)
    // Gleiche Anzahl erfüllter Items, aber kleinere Bezugsmenge → Quote steigt
    expect(after.completed).toBe(before.completed)
    expect(after.completionPct).toBeGreaterThanOrEqual(before.completionPct)
  })

  test('summary meldet offene CRITICAL-Items und nicht zugewiesene Items', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/governance/summary')
    expect(res.status).toBe(200)
    expect(typeof res.body.criticalOpen).toBe('number')
    expect(typeof res.body.unassigned).toBe('number')
    expect(res.body.criticalOpen).toBeLessThanOrEqual(10)
  })

  test('unauthentifizierter Zugriff gesperrt', async () => {
    const request = require('supertest')
    const res = await request(app).get('/nis2/governance')
    expect([401, 403]).toContain(res.status)
  })
})

// ════════════════════════════════════════════════════════════
// Art. 23 — Meldefristen (reine Rechenlogik)
// ════════════════════════════════════════════════════════════

describe('NIS2 Art. 23 — Fristberechnung', () => {

  test('24 h und 72 h ab Kenntnisnahme', () => {
    const d = art23.deadlinesFrom('2026-07-14T08:00:00.000Z', null)
    expect(d.earlyWarning).toBe('2026-07-15T08:00:00.000Z')
    expect(d.notification).toBe('2026-07-17T08:00:00.000Z')
  })

  test('Abschlussbericht läuft ab der Meldung, nicht ab Kenntnisnahme', () => {
    // Ohne abgegebene Meldung: vorausberechnet ab dem 72-h-Termin
    const planned = art23.deadlinesFrom('2026-07-14T08:00:00.000Z', null)
    expect(planned.finalReport).toBe('2026-08-17T08:00:00.000Z')

    // Meldung erst später abgegeben → Monatsfrist verschiebt sich mit
    const actual = art23.deadlinesFrom('2026-07-14T08:00:00.000Z', '2026-07-16T20:00:00.000Z')
    expect(actual.finalReport).toBe('2026-08-16T20:00:00.000Z')
  })

  test('Monatsfrist rechnet in Kalendermonaten mit Kappung am Monatsende', () => {
    expect(art23.addOneMonth(new Date('2026-01-31T10:00:00.000Z')).toISOString())
      .toBe('2026-02-28T10:00:00.000Z')
    expect(art23.addOneMonth(new Date('2026-03-15T10:00:00.000Z')).toISOString())
      .toBe('2026-04-15T10:00:00.000Z')
  })

  test('ungültiger Zeitpunkt wird abgelehnt', () => {
    expect(art23.deadlinesFrom('kein-datum', null)).toBeNull()
    expect(art23.initialize({ createdAt: null }, 'unsinn').error).toBeTruthy()
  })

  test('Phasenzustände: pending / due_soon / overdue / submitted', () => {
    const incident = { id: 'x', createdAt: '2026-07-14T08:00:00.000Z' }
    const withArt = { ...incident, ...art23.initialize(incident, '2026-07-14T08:00:00.000Z') }

    // 1 h nach Kenntnisnahme — noch nichts fällig
    let s = art23.annotate(withArt, new Date('2026-07-14T09:00:00.000Z')).art23Status
    expect(s.phases.find(p => p.phase === 'earlyWarning').state).toBe('pending')

    // 21 h später — innerhalb der 4-h-Vorwarnzeit
    s = art23.annotate(withArt, new Date('2026-07-15T05:00:00.000Z')).art23Status
    expect(s.phases.find(p => p.phase === 'earlyWarning').state).toBe('due_soon')

    // nach Ablauf
    s = art23.annotate(withArt, new Date('2026-07-15T09:00:00.000Z')).art23Status
    expect(s.phases.find(p => p.phase === 'earlyWarning').state).toBe('overdue')
    expect(s.overdue).toContain('earlyWarning')

    // nach Abgabe
    const submitted = { ...withArt, ...art23.markPhaseSubmitted(withArt, 'earlyWarning', '2026-07-14T20:00:00.000Z') }
    s = art23.annotate(submitted, new Date('2026-07-15T09:00:00.000Z')).art23Status
    expect(s.phases.find(p => p.phase === 'earlyWarning').state).toBe('submitted')
  })

  test('Abgabe der Meldung setzt die Frist für den Abschlussbericht neu', () => {
    const incident = { id: 'x', createdAt: '2026-07-14T08:00:00.000Z' }
    const withArt  = { ...incident, ...art23.initialize(incident, '2026-07-14T08:00:00.000Z') }
    expect(withArt.art23.deadlines.finalReport).toBe('2026-08-17T08:00:00.000Z')

    const after = art23.markPhaseSubmitted(withArt, 'notification', '2026-07-15T12:00:00.000Z')
    expect(after.art23.deadlines.finalReport).toBe('2026-08-15T12:00:00.000Z')
  })

  test('unbekannte Phase wird abgelehnt', () => {
    const incident = { id: 'x', createdAt: '2026-07-14T08:00:00.000Z' }
    expect(art23.markPhaseSubmitted(incident, 'zwischenbericht').error).toBeTruthy()
    expect(art23.saveReport(incident, 'zwischenbericht', {}).error).toBeTruthy()
  })

  test('pendingAlerts meldet jede Phase nur einmal', () => {
    const incident = { id: 'x', createdAt: '2026-07-14T08:00:00.000Z' }
    const withArt  = { ...incident, ...art23.initialize(incident, '2026-07-14T08:00:00.000Z') }
    const now      = new Date('2026-07-15T05:00:00.000Z')

    const first = art23.pendingAlerts([withArt], now)
    expect(first).toHaveLength(1)
    expect(first[0].phases.map(p => p.phase)).toContain('earlyWarning')

    // Nach Protokollierung der Warnung darf sie nicht erneut auftauchen
    const recorded = { ...withArt, ...art23.recordAlert(withArt, 'earlyWarning', 'email', 'ciso@example.com', now) }
    const second = art23.pendingAlerts([recorded], now)
    const phases = second.length ? second[0].phases.map(p => p.phase) : []
    expect(phases).not.toContain('earlyWarning')
  })

  test('upcomingDeadlines sortiert nach knappster Frist', () => {
    const mk = (id, discovered) => {
      const base = { id, createdAt: discovered }
      return { ...base, ...art23.initialize(base, discovered) }
    }
    const now  = new Date('2026-07-15T00:00:00.000Z')
    const rows = art23.upcomingDeadlines([
      mk('spaet', '2026-07-14T20:00:00.000Z'),
      mk('frueh', '2026-07-14T02:00:00.000Z'),
    ], now)

    expect(rows[0].id).toBe('frueh')
    expect(rows[0].soonest).toBeLessThan(rows[1].soonest)
  })

  test('Vorfälle ohne Art.-23-Verfolgung tauchen nicht auf', () => {
    expect(art23.upcomingDeadlines([{ id: 'ohne', createdAt: '2026-07-14T08:00:00.000Z' }])).toEqual([])
    expect(art23.pendingAlerts([{ id: 'ohne', createdAt: '2026-07-14T08:00:00.000Z' }])).toEqual([])
  })

  test('Export enthält alle drei Phasen und die Vorfalldaten', () => {
    const incident = {
      id: 'x', refNumber: 'INC-0001', createdAt: '2026-07-14T08:00:00.000Z',
      entityName: 'Werk 2', incidentType: 'ransomware', description: 'Verschlüsselung',
    }
    let withArt = { ...incident, ...art23.initialize(incident, '2026-07-14T08:00:00.000Z') }
    withArt = { ...withArt, ...art23.saveReport(withArt, 'earlyWarning', { affectedSystems: 'Dateiserver' }) }

    const out = art23.buildReportExport(withArt)
    expect(out.format).toBe('nis2-art23')
    expect(out.incident.reference).toBe('INC-0001')
    expect(out.art23.earlyWarning.affectedSystems).toBe('Dateiserver')
    expect(out.art23).toHaveProperty('notification')
    expect(out.art23).toHaveProperty('finalReport')
    expect(out.art23.deadlines.earlyWarning).toBe('2026-07-15T08:00:00.000Z')
  })
})

// ════════════════════════════════════════════════════════════
// Art. 23 — Routen über einen echten Vorfall
// ════════════════════════════════════════════════════════════

describe('NIS2 Art. 23 — API', () => {
  let incidentId

  beforeAll(async () => {
    const request = require('supertest')
    // Vorfall über das öffentliche Meldeformular anlegen
    const res = await request(app).post('/public/incident').send({
      email: 'melder@example.com',
      entityName: 'Werk 2',
      incidentType: 'ransomware',
      description: 'Verdacht auf Verschlüsselung mehrerer Dateiserver',
      localContact: 'Herr Meier, 0123456',
    })
    expect([200, 201]).toContain(res.status)
    incidentId = res.body.id
  })

  test('Vorfall startet ohne Fristenverfolgung', async () => {
    const res = await authedGet(app, readerCookie, `/nis2/incidents/${incidentId}`)
    expect(res.status).toBe(200)
    expect(res.body.art23).toBeNull()
  })

  test('Fristenverfolgung starten setzt alle drei Termine', async () => {
    const res = await authedPost(app, adminCookie, `/nis2/incidents/${incidentId}/init`, {
      discoveredAt: '2026-07-14T08:00:00.000Z',
    })
    expect(res.status).toBe(200)
    expect(res.body.art23.deadlines.earlyWarning).toBe('2026-07-15T08:00:00.000Z')
    expect(res.body.art23.deadlines.notification).toBe('2026-07-17T08:00:00.000Z')
    expect(res.body.art23Status.phases).toHaveLength(3)
  })

  test('Meldeinhalt speichern und Phase abgeben', async () => {
    const save = await authedPut(app, adminCookie, `/nis2/incidents/${incidentId}/report/earlyWarning`, {
      affectedSystems: 'Dateiserver FS01, FS02',
      businessImpact: 'Dateiablage nicht verfügbar',
    })
    expect(save.status).toBe(200)
    expect(save.body.art23.reports.earlyWarning.affectedSystems).toBe('Dateiserver FS01, FS02')

    const submit = await authedPost(app, adminCookie, `/nis2/incidents/${incidentId}/phase/earlyWarning`, {})
    expect(submit.status).toBe(200)
    expect(submit.body.art23.submitted.earlyWarning).toBeTruthy()
    expect(submit.body.art23Status.phases[0].state).toBe('submitted')
  })

  test('unbekannte Phase wird abgelehnt (400)', async () => {
    const res = await authedPost(app, adminCookie, `/nis2/incidents/${incidentId}/phase/zwischenstand`, {})
    expect(res.status).toBe(400)
  })

  test('editor darf Fristen nicht ändern (403)', async () => {
    const res = await authedPost(app, editorCookie, `/nis2/incidents/${incidentId}/init`, {})
    expect(res.status).toBe(403)
  })

  test('Fristenübersicht listet den Vorfall', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/incidents/deadlines')
    expect(res.status).toBe(200)
    const row = res.body.find(r => r.id === incidentId)
    expect(row).toBeDefined()
    // Frühwarnung ist abgegeben, die beiden übrigen Phasen bleiben offen
    expect(row.phases.map(p => p.phase)).not.toContain('earlyWarning')
  })

  test('Export liefert JSON zum Download', async () => {
    const res = await authedGet(app, readerCookie, `/nis2/incidents/${incidentId}/export`)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment/)
    const body = JSON.parse(res.text)
    expect(body.format).toBe('nis2-art23')
    expect(body.incident.entityName).toBe('Werk 2')
  })

  test('404 bei unbekanntem Vorfall', async () => {
    const res = await authedGet(app, readerCookie, '/nis2/incidents/gibtsnicht')
    expect(res.status).toBe(404)
  })
})

// ════════════════════════════════════════════════════════════
// Fristenwächter
// ════════════════════════════════════════════════════════════

describe('Art.-23-Fristenwächter', () => {

  test('E-Mail nennt Vorfall, Phase und Fristzustand', () => {
    const incident = { refNumber: 'INC-0007', entityName: 'Werk 2' }
    const phases = [{ label: 'Frühwarnung (24 h)', deadline: '2026-07-15T08:00:00.000Z', state: 'overdue', minutesLeft: -120 }]
    const mail = watcher.buildMail(incident, phases, 'Testkonzern')

    expect(mail.subject).toContain('INC-0007')
    expect(mail.subject).toContain('ÜBERSCHRITTEN')
    expect(mail.html).toContain('Frühwarnung (24 h)')
    expect(mail.html).toContain('überschritten')
  })

  test('ohne fällige Fristen wird nichts verschickt', async () => {
    const sent = []
    const count = await watcher.runCheck({
      now: new Date('2020-01-01T00:00:00.000Z'),
      send: async (to, subject) => { sent.push({ to, subject }) },
    })
    expect(count).toBe(0)
    expect(sent).toHaveLength(0)
  })
})
