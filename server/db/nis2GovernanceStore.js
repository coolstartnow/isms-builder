// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// NIS2 Art. 21 — Governance-Checkliste (30 Items in drei Prioritätsstufen).
//
// Der Katalog steht als Konstante im Code, nur der Bearbeitungsstand (Status,
// Verantwortlicher, Nachweise, Notizen) liegt in der JSON-Datei. Dadurch können
// spätere Versionen den Katalog erweitern oder Formulierungen korrigieren, ohne
// dass gepflegte Bearbeitungsstände verlorengehen.
//
// Die Inhalte sind bewusst EU-weit formuliert. NIS2 ist eine Richtlinie, die
// jeder Mitgliedstaat national umsetzt — Behördennamen, Registrierungsportale
// und Fristen der nationalen Umsetzung unterscheiden sich. Wo das relevant ist,
// verweist die Beschreibung auf "die zuständige nationale Behörde".
'use strict'

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'nis2-governance.json')

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM']
const STATUSES   = ['open', 'in_progress', 'completed', 'na']

// Sub-Paragraphen aus NIS2 Art. 21 Abs. 2
const SUB_PARAGRAPHS = {
  a: 'Risk analysis and information system security policies',
  b: 'Incident handling',
  c: 'Business continuity and crisis management',
  d: 'Supply chain security',
  e: 'Security in acquisition, development and maintenance',
  f: 'Assessing the effectiveness of risk-management measures',
  g: 'Basic cyber hygiene practices and security training',
  h: 'Cryptography and encryption',
  i: 'Human resources security, access control and asset management',
  j: 'Authentication and secured communications',
}

const CHECKLIST = [
  // ── CRITICAL — muss vor den nationalen Umsetzungsfristen stehen ──
  { id: 'nis2_gov_001', priority: 'CRITICAL', subParagraph: 'a', category: 'Scoping & Legal',
    title: 'Scoping-Analyse',
    description: 'Verbindlich feststellen, ob die Organisation als "wesentliche" oder "wichtige" Einrichtung unter die nationale NIS2-Umsetzung fällt (Sektor nach Anhang I/II, Größenschwellen).' },
  { id: 'nis2_gov_002', priority: 'CRITICAL', subParagraph: 'a', category: 'Scoping & Legal',
    title: 'Registrierung bei der zuständigen Behörde',
    description: 'Registrierung bei der national zuständigen Behörde bzw. dem nationalen CSIRT abgeschlossen. Zentrale formale Pflicht mit eigener Frist je Mitgliedstaat.' },
  { id: 'nis2_gov_003', priority: 'CRITICAL', subParagraph: 'a', category: 'Governance',
    title: 'Verantwortung der Leitungsebene',
    description: 'Die Leitungsebene hat die Risikomanagementmaßnahmen förmlich gebilligt und überwacht deren Umsetzung. Persönliche Verantwortlichkeit nach Art. 20 Abs. 1 ist dokumentiert.' },
  { id: 'nis2_gov_004', priority: 'CRITICAL', subParagraph: 'g', category: 'Governance',
    title: 'Schulung der Leitungsebene',
    description: 'Mitglieder der Leitungsebene haben eine Schulung zu Cyberrisiken und Risikomanagement absolviert (Art. 20 Abs. 2), Teilnahme ist nachweisbar.' },
  { id: 'nis2_gov_005', priority: 'CRITICAL', subParagraph: 'j', category: 'Access Control',
    title: 'Mehr-Faktor-Authentifizierung',
    description: 'MFA oder kontinuierliche Authentifizierung ist für alle administrativen Zugänge und Fernzugriffe verpflichtend eingerichtet.' },
  { id: 'nis2_gov_006', priority: 'CRITICAL', subParagraph: 'c', category: 'Business Continuity',
    title: 'Unveränderbare bzw. getrennte Backups',
    description: 'Sicherungen sind gegen Verschlüsselung und Löschung geschützt (Offline, Air-Gap oder unveränderbarer Speicher) und vom produktiven Netz getrennt.' },
  { id: 'nis2_gov_007', priority: 'CRITICAL', subParagraph: 'b', category: 'Incident Management',
    title: 'Meldeverfahren nach Art. 23 (24 h / 72 h / 1 Monat)',
    description: 'Dokumentiertes Verfahren für Frühwarnung binnen 24 Stunden, Meldung binnen 72 Stunden und Abschlussbericht binnen eines Monats, inklusive Zuständigkeiten und Erreichbarkeit außerhalb der Geschäftszeiten.' },
  { id: 'nis2_gov_008', priority: 'CRITICAL', subParagraph: 'i', category: 'Asset Management',
    title: 'Asset-Inventar',
    description: 'Vollständiges, gepflegtes Verzeichnis aller Informationswerte mit Eigentümer und Schutzbedarf. Grundlage jeder Risikoanalyse.' },
  { id: 'nis2_gov_009', priority: 'CRITICAL', subParagraph: 'e', category: 'Operations',
    title: 'Schwachstellenmanagement und Patching',
    description: 'Geregelter Prozess für Erkennung, Bewertung und fristgerechtes Schließen von Schwachstellen, mit definierten Fristen je Kritikalität.' },
  { id: 'nis2_gov_010', priority: 'CRITICAL', subParagraph: 'a', category: 'Governance',
    title: 'Budget und Ressourcen für Cybersicherheit',
    description: 'Für die Umsetzung und den Betrieb der Maßnahmen sind Budget, Personal und Zuständigkeiten verbindlich zugewiesen.' },

  // ── HIGH — Kernprozesse ──
  { id: 'nis2_gov_011', priority: 'HIGH', subParagraph: 'a', category: 'Risk Management',
    title: 'Risikoanalyse',
    description: 'Dokumentierte, regelmäßig wiederholte Risikoanalyse für Netz- und Informationssysteme mit nachvollziehbarer Bewertungsmethodik.' },
  { id: 'nis2_gov_012', priority: 'HIGH', subParagraph: 'a', category: 'Risk Management',
    title: 'Informationssicherheitsleitlinie',
    description: 'Von der Leitungsebene verabschiedete Leitlinie zur Informationssicherheit, veröffentlicht und den Beschäftigten bekannt.' },
  { id: 'nis2_gov_013', priority: 'HIGH', subParagraph: 'd', category: 'Supply Chain',
    title: 'Lieferantenverzeichnis',
    description: 'Verzeichnis aller direkten Lieferanten und Dienstleister mit Bezug zu Netz- und Informationssystemen, inklusive Kritikalitätsbewertung.' },
  { id: 'nis2_gov_014', priority: 'HIGH', subParagraph: 'd', category: 'Supply Chain',
    title: 'Sicherheitsanforderungen in Lieferantenbeziehungen',
    description: 'Vertragliche Sicherheitsanforderungen, Meldepflichten bei Vorfällen und Prüfrechte gegenüber kritischen Lieferanten sind vereinbart.' },
  { id: 'nis2_gov_015', priority: 'HIGH', subParagraph: 'b', category: 'Incident Management',
    title: 'Incident-Response-Plan',
    description: 'Ausgearbeiteter Reaktionsplan mit Rollen, Eskalationswegen, Erreichbarkeiten und Kommunikationsvorlagen.' },
  { id: 'nis2_gov_016', priority: 'HIGH', subParagraph: 'c', category: 'Business Continuity',
    title: 'Notfallplan (BCP)',
    description: 'Business-Continuity-Plan für die kritischen Geschäftsprozesse mit definierten Wiederanlaufzielen (RTO/RPO).' },
  { id: 'nis2_gov_017', priority: 'HIGH', subParagraph: 'c', category: 'Business Continuity',
    title: 'Wiederanlaufplanung und Krisenmanagement',
    description: 'Technische Wiederanlaufverfahren und ein Krisenstab mit klarer Alarmierung sind festgelegt und erprobt.' },
  { id: 'nis2_gov_018', priority: 'HIGH', subParagraph: 'g', category: 'Human Resources',
    title: 'Sensibilisierung der Beschäftigten',
    description: 'Regelmäßige, nachweisbare Awareness-Schulungen für alle Beschäftigten, inklusive Phishing-Erkennung und Meldewegen.' },
  { id: 'nis2_gov_019', priority: 'HIGH', subParagraph: 'c', category: 'Business Continuity',
    title: 'Wiederherstellungstests der Backups',
    description: 'Rückspielen der Sicherungen wird regelmäßig getestet und protokolliert — eine Sicherung ohne erfolgreichen Test gilt als ungeprüft.' },
  { id: 'nis2_gov_020', priority: 'HIGH', subParagraph: 'i', category: 'Access Control',
    title: 'Zugriffskontrolle nach Minimalprinzip',
    description: 'Berechtigungen folgen dem Prinzip der geringsten Rechte, privilegierte Konten sind gesondert geregelt und werden regelmäßig rezertifiziert.' },

  // ── MEDIUM — Optimierung und Hygiene ──
  { id: 'nis2_gov_021', priority: 'MEDIUM', subParagraph: 'e', category: 'Operations',
    title: 'Netzsegmentierung',
    description: 'Netze sind nach Schutzbedarf segmentiert, kritische Systeme und Verwaltungsnetze sind getrennt.' },
  { id: 'nis2_gov_022', priority: 'MEDIUM', subParagraph: 'i', category: 'Human Resources',
    title: 'Ein- und Austrittsprozess',
    description: 'Geregelter Prozess für Vergabe und fristgerechten Entzug von Berechtigungen und Betriebsmitteln bei Ein-, Um- und Austritt.' },
  { id: 'nis2_gov_023', priority: 'MEDIUM', subParagraph: 'h', category: 'Cryptography',
    title: 'Verschlüsselung',
    description: 'Vorgaben zur Verschlüsselung ruhender und übertragener Daten sind festgelegt und umgesetzt.' },
  { id: 'nis2_gov_024', priority: 'MEDIUM', subParagraph: 'h', category: 'Cryptography',
    title: 'Schlüsselmanagement',
    description: 'Erzeugung, Aufbewahrung, Wechsel und Vernichtung kryptografischer Schlüssel sind geregelt und dokumentiert.' },
  { id: 'nis2_gov_025', priority: 'MEDIUM', subParagraph: 'b', category: 'Operations',
    title: 'Protokollierung und Überwachung',
    description: 'Sicherheitsrelevante Ereignisse werden zentral protokolliert, manipulationssicher aufbewahrt und ausgewertet.' },
  { id: 'nis2_gov_026', priority: 'MEDIUM', subParagraph: 'e', category: 'Operations',
    title: 'Sicherheit in Beschaffung und Entwicklung',
    description: 'Sicherheitsanforderungen sind fester Bestandteil von Beschaffung, Entwicklung und Wartung, inklusive Umgang mit gemeldeten Schwachstellen.' },
  { id: 'nis2_gov_027', priority: 'MEDIUM', subParagraph: 'j', category: 'Communications',
    title: 'Gesicherte Sprach-, Video- und Textkommunikation',
    description: 'Für vertrauliche interne Kommunikation stehen gesicherte Kanäle bereit und sind als verbindlich vorgegeben.' },
  { id: 'nis2_gov_028', priority: 'MEDIUM', subParagraph: 'f', category: 'Assurance',
    title: 'Interne Audits',
    description: 'Regelmäßige interne Überprüfung der Wirksamkeit der Maßnahmen mit dokumentierten Feststellungen und Maßnahmenverfolgung.' },
  { id: 'nis2_gov_029', priority: 'MEDIUM', subParagraph: 'f', category: 'Assurance',
    title: 'Schwachstellen-Scans und Penetrationstests',
    description: 'Technische Prüfungen der exponierten Systeme finden regelmäßig statt, Befunde werden nachverfolgt.' },
  { id: 'nis2_gov_030', priority: 'MEDIUM', subParagraph: 'j', category: 'Communications',
    title: 'Gesicherte Notfallkommunikation',
    description: 'Ein vom Regelbetrieb unabhängiges Kommunikationsmittel steht bereit, falls die eigene Infrastruktur ausfällt oder kompromittiert ist.' },
]

function nowISO() { return new Date().toISOString() }

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return data && typeof data === 'object' && data.items ? data : { items: {} }
  } catch {
    return { items: {} }
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

/** Standardzustand für ein noch nie bearbeitetes Item. */
function blankState() {
  return {
    status:       'open',
    owner:        null,
    ownerEmail:   null,
    assignedAt:   null,
    completedAt:  null,
    evidenceUrls: [],
    notes:        '',
    internalNotes:'',
    updatedAt:    null,
    updatedBy:    null,
  }
}

/** Katalogeintrag + gespeicherter Bearbeitungsstand. */
function merge(entry, state) {
  return {
    ...entry,
    article:          '21',
    subParagraphText: SUB_PARAGRAPHS[entry.subParagraph] || '',
    ...blankState(),
    ...(state || {}),
  }
}

function getAll({ priority, status, subParagraph, category } = {}) {
  const data = load()
  let list = CHECKLIST.map(entry => merge(entry, data.items[entry.id]))
  if (priority)     list = list.filter(i => i.priority     === priority)
  if (status)       list = list.filter(i => i.status       === status)
  if (subParagraph) list = list.filter(i => i.subParagraph === subParagraph)
  if (category)     list = list.filter(i => i.category     === category)
  return list
}

function getById(id) {
  const entry = CHECKLIST.find(e => e.id === id)
  if (!entry) return null
  return merge(entry, load().items[id])
}

/**
 * Aktualisiert ein Item. Nur bekannte Felder werden übernommen.
 * Rückgabe: aktualisiertes Item oder null (unbekannte ID).
 */
function update(id, patch, { changedBy } = {}) {
  const entry = CHECKLIST.find(e => e.id === id)
  if (!entry) return null

  const data  = load()
  const state = { ...blankState(), ...(data.items[id] || {}) }

  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) return { error: 'Ungültiger Status' }
    state.status = patch.status
    // Abschlusszeitpunkt mitführen, damit Nachweise datierbar bleiben
    state.completedAt = patch.status === 'completed' ? (state.completedAt || nowISO()) : null
  }
  if (patch.owner !== undefined)         state.owner         = patch.owner || null
  if (patch.ownerEmail !== undefined) {
    state.ownerEmail = patch.ownerEmail || null
    state.assignedAt = patch.ownerEmail ? nowISO() : null
  }
  if (patch.notes !== undefined)         state.notes         = String(patch.notes || '')
  if (patch.internalNotes !== undefined) state.internalNotes = String(patch.internalNotes || '')
  if (patch.evidenceUrls !== undefined) {
    state.evidenceUrls = Array.isArray(patch.evidenceUrls)
      ? patch.evidenceUrls.map(u => String(u || '').trim()).filter(Boolean)
      : []
  }

  state.updatedAt = nowISO()
  if (changedBy) state.updatedBy = changedBy

  data.items[id] = state
  save(data)
  return merge(entry, state)
}

function getSummary() {
  const list = getAll()
  const byPriority = {}
  for (const p of PRIORITIES) {
    const items = list.filter(i => i.priority === p)
    byPriority[p] = {
      total:      items.length,
      completed:  items.filter(i => i.status === 'completed').length,
      inProgress: items.filter(i => i.status === 'in_progress').length,
      open:       items.filter(i => i.status === 'open').length,
      na:         items.filter(i => i.status === 'na').length,
    }
  }

  // Nicht anwendbare Items zählen nicht gegen die Erfüllungsquote
  const relevant  = list.filter(i => i.status !== 'na')
  const completed = list.filter(i => i.status === 'completed').length

  const bySubParagraph = {}
  for (const key of Object.keys(SUB_PARAGRAPHS)) {
    const items = list.filter(i => i.subParagraph === key)
    bySubParagraph[key] = {
      total:     items.length,
      completed: items.filter(i => i.status === 'completed').length,
    }
  }

  return {
    total:            list.length,
    completed,
    inProgress:       list.filter(i => i.status === 'in_progress').length,
    open:             list.filter(i => i.status === 'open').length,
    na:               list.filter(i => i.status === 'na').length,
    completionPct:    relevant.length ? Math.round((completed / relevant.length) * 100) : 0,
    criticalOpen:     list.filter(i => i.priority === 'CRITICAL' && i.status !== 'completed' && i.status !== 'na').length,
    unassigned:       list.filter(i => !i.ownerEmail && i.status !== 'na').length,
    withEvidence:     list.filter(i => i.evidenceUrls.length > 0).length,
    byPriority,
    bySubParagraph,
  }
}

module.exports = {
  getAll, getById, update, getSummary,
  PRIORITIES, STATUSES, SUB_PARAGRAPHS,
  CHECKLIST_SIZE: CHECKLIST.length,
}
