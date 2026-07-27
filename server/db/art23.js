// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// NIS2 Art. 23 — Meldepflichten bei erheblichen Sicherheitsvorfällen.
//
// Fristen nach Art. 23 Abs. 4:
//   lit. a  Frühwarnung          — binnen 24 Stunden ab Kenntnisnahme
//   lit. b  Meldung              — binnen 72 Stunden ab Kenntnisnahme
//   lit. d  Abschlussbericht     — binnen eines Monats nach Abgabe der Meldung (lit. b),
//                                  NICHT ab Kenntnisnahme
//
// Solange die 72-h-Meldung nicht abgegeben ist, wird die Frist für den
// Abschlussbericht vom 72-h-Termin aus vorausberechnet und beim tatsächlichen
// Absenden der Meldung neu gesetzt.
//
// Reine Rechenlogik ohne Speicherzugriff: alle Funktionen liefern ein Patch-
// Objekt zurück, das der Aufrufer über den Incident-Store schreibt.
'use strict'

const PHASES = ['earlyWarning', 'notification', 'finalReport']

const HOUR = 3600 * 1000

// Ab wann vor Fristablauf gewarnt wird (je Phase unterschiedlich, weil die
// Fristen sehr verschieden lang sind)
const ALERT_LEAD_MS = {
  earlyWarning:  4  * HOUR,
  notification:  12 * HOUR,
  finalReport:   72 * HOUR,
}

const PHASE_LABELS = {
  earlyWarning: 'Frühwarnung (24 h)',
  notification: 'Meldung (72 h)',
  finalReport:  'Abschlussbericht (1 Monat)',
}

function toDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Kalendermonat, nicht 30 Tage. Monatsüberlauf wird auf den Monatsletzten gekappt. */
function addOneMonth(date) {
  const d   = new Date(date)
  const day = d.getUTCDate()
  d.setUTCMonth(d.getUTCMonth() + 1)
  if (d.getUTCDate() < day) d.setUTCDate(0)   // z. B. 31.01. → 28.02.
  return d
}

/**
 * Berechnet die drei Fristen.
 * @param discoveredAt   Zeitpunkt der Kenntnisnahme
 * @param notificationSentAt  tatsächliche Abgabe der 72-h-Meldung (optional)
 */
function deadlinesFrom(discoveredAt, notificationSentAt) {
  const base = toDate(discoveredAt)
  if (!base) return null

  const earlyWarning = new Date(base.getTime() + 24 * HOUR)
  const notification = new Date(base.getTime() + 72 * HOUR)
  // Abschlussbericht läuft ab der Meldung; vor deren Abgabe ab dem 72-h-Termin
  const finalAnchor  = toDate(notificationSentAt) || notification

  return {
    earlyWarning: earlyWarning.toISOString(),
    notification: notification.toISOString(),
    finalReport:  addOneMonth(finalAnchor).toISOString(),
  }
}

function blankArt23(discoveredAt) {
  return {
    discoveredAt,
    deadlines: deadlinesFrom(discoveredAt, null),
    submitted: { earlyWarning: null, notification: null, finalReport: null },
    reports:   { earlyWarning: null, notification: null, finalReport: null },
    alerts:    [],
  }
}

/** Startet die Fristenverfolgung für einen Vorfall. */
function initialize(incident, discoveredAt) {
  const when = toDate(discoveredAt) || toDate(incident.createdAt)
  if (!when) return { error: 'Kein gültiger Zeitpunkt der Kenntnisnahme' }
  return { art23: blankArt23(when.toISOString()) }
}

/** Markiert eine Phase als abgegeben und zieht abhängige Fristen nach. */
function markPhaseSubmitted(incident, phase, submittedAt) {
  if (!PHASES.includes(phase)) return { error: 'Unbekannte Phase' }

  const current = incident.art23 || blankArt23(incident.createdAt)
  const when    = toDate(submittedAt) || new Date()

  const submitted = { ...current.submitted, [phase]: when.toISOString() }
  // Abgabe der 72-h-Meldung startet die Monatsfrist für den Abschlussbericht neu
  const deadlines = deadlinesFrom(current.discoveredAt, submitted.notification)

  return { art23: { ...current, submitted, deadlines } }
}

/** Speichert den Meldeinhalt einer Phase (Freitextfelder je Phase). */
function saveReport(incident, phase, body) {
  if (!PHASES.includes(phase)) return { error: 'Unbekannte Phase' }

  const current = incident.art23 || blankArt23(incident.createdAt)
  const clean   = {}
  for (const [key, value] of Object.entries(body || {})) {
    if (value === null || value === undefined) continue
    clean[key] = Array.isArray(value) ? value.map(v => String(v)) : String(value)
  }

  return {
    art23: {
      ...current,
      reports: { ...current.reports, [phase]: { ...clean, savedAt: new Date().toISOString() } },
    },
  }
}

/**
 * Zustand einer Phase zum Zeitpunkt `now`.
 * submitted | overdue | due_soon | pending
 */
function phaseState(deadlineISO, submittedISO, phase, now) {
  if (submittedISO) return 'submitted'
  const deadline = toDate(deadlineISO)
  if (!deadline) return 'pending'
  if (now >= deadline) return 'overdue'
  if (now >= new Date(deadline.getTime() - (ALERT_LEAD_MS[phase] || 0))) return 'due_soon'
  return 'pending'
}

/** Ergänzt einen Vorfall um berechneten Fristenstatus. */
function annotate(incident, now = new Date()) {
  if (!incident) return null
  if (!incident.art23) return { ...incident, art23: null, art23Status: null }

  const { deadlines, submitted } = incident.art23
  const phases = PHASES.map(phase => {
    const deadline = deadlines ? deadlines[phase] : null
    const state    = phaseState(deadline, submitted[phase], phase, now)
    const dl       = toDate(deadline)
    return {
      phase,
      label:       PHASE_LABELS[phase],
      deadline,
      submittedAt: submitted[phase],
      state,
      // Verbleibende Zeit in Minuten; negativ bedeutet überschritten
      minutesLeft: dl && !submitted[phase] ? Math.round((dl - now) / 60000) : null,
      hasReport:   !!(incident.art23.reports && incident.art23.reports[phase]),
    }
  })

  return {
    ...incident,
    art23Status: {
      phases,
      overdue:    phases.filter(p => p.state === 'overdue').map(p => p.phase),
      dueSoon:    phases.filter(p => p.state === 'due_soon').map(p => p.phase),
      // Nächste offene Phase — die, an der als Nächstes gearbeitet werden muss
      nextOpen:   phases.find(p => p.state !== 'submitted') || null,
      complete:   phases.every(p => p.state === 'submitted'),
    },
  }
}

/** Alle Vorfälle mit offenen Fristen, dringlichste zuerst. */
function upcomingDeadlines(incidents, now = new Date()) {
  const rows = []
  for (const incident of incidents || []) {
    if (!incident.art23) continue
    const annotated = annotate(incident, now)
    const open = annotated.art23Status.phases.filter(p => p.state !== 'submitted')
    if (!open.length) continue
    rows.push({
      id:         incident.id,
      refNumber:  incident.refNumber,
      entityName: incident.entityName,
      status:     incident.status,
      phases:     open,
      overdue:    annotated.art23Status.overdue,
      dueSoon:    annotated.art23Status.dueSoon,
      // Sortierschlüssel: knappste offene Frist
      soonest:    Math.min(...open.map(p => (p.minutesLeft === null ? Number.MAX_SAFE_INTEGER : p.minutesLeft))),
    })
  }
  return rows.sort((a, b) => a.soonest - b.soonest)
}

/**
 * Ermittelt fällige, noch nicht verschickte Warnungen.
 * Liefert je Vorfall die Phasen, für die eine Warnung ansteht.
 */
function pendingAlerts(incidents, now = new Date()) {
  const out = []
  for (const incident of incidents || []) {
    if (!incident.art23) continue
    const sent   = new Set((incident.art23.alerts || []).map(a => a.phase))
    const status = annotate(incident, now).art23Status

    const due = status.phases.filter(p =>
      (p.state === 'due_soon' || p.state === 'overdue') && !sent.has(p.phase))

    if (due.length) out.push({ incident, phases: due })
  }
  return out
}

/** Patch, der eine verschickte Warnung protokolliert. */
function recordAlert(incident, phase, channel, recipient, at = new Date()) {
  const current = incident.art23 || blankArt23(incident.createdAt)
  return {
    art23: {
      ...current,
      alerts: [...(current.alerts || []), {
        phase,
        sentAt:    at.toISOString(),
        channel:   channel   || 'email',
        recipient: recipient || null,
      }],
    },
  }
}

/**
 * Meldung als strukturiertes JSON für die Übermittlung an die zuständige
 * nationale Stelle (CSIRT bzw. Aufsichtsbehörde). Bewusst behördenneutral —
 * das konkrete Einreichungsformat legt jeder Mitgliedstaat selbst fest.
 */
function buildReportExport(incident) {
  const art = incident.art23 || null
  return {
    format:      'nis2-art23',
    version:     '1.0',
    generatedAt: new Date().toISOString(),
    incident: {
      reference:    incident.refNumber || incident.id,
      entityName:   incident.entityName || null,
      contact:      incident.localContact || incident.email || null,
      incidentType: incident.incidentType || null,
      description:  incident.description || null,
      status:       incident.status || null,
      reportedAt:   incident.createdAt || null,
    },
    art23: art ? {
      discoveredAt: art.discoveredAt,
      deadlines:    art.deadlines,
      submitted:    art.submitted,
      earlyWarning: art.reports?.earlyWarning || null,
      notification: art.reports?.notification || null,
      finalReport:  art.reports?.finalReport  || null,
    } : null,
  }
}

module.exports = {
  PHASES, PHASE_LABELS, ALERT_LEAD_MS,
  deadlinesFrom, addOneMonth,
  initialize, markPhaseSubmitted, saveReport,
  annotate, upcomingDeadlines, pendingAlerts, recordAlert,
  buildReportExport,
}
