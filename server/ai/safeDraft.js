// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Sichere KI-Entwürfe: reine Funktionen ohne Dateizugriff und ohne Netzwerk. Server (routes/ai.js) und Mobile App nutzen dieselbe Datei.
//
// Was an eine KI geht, wird ausschließlich hier gebaut und besteht nur aus:
//   - einem Dokument aus der festen Titelliste (Kennung → Typ und Titel in fünf Sprachen),
//   - der Sprache (aus der festen Liste),
//   - optional einem kurzen Hinweis (nur erlaubte Zeichen, höchstens 200, ohne personenbezogene/technische Kennungen).
// Firmen-, Personen- und Systemdaten gehen nie hinaus: Das Modell schreibt mit Platzhaltern ({{COMPANY_NAME}} …), die erst
// danach lokal aus den Organisationsdaten ersetzt werden.
//
// Grenze des Filters: Er erkennt strukturierte Angaben (E-Mail, Telefon, IBAN, IP, URL, Kennungen, Schlüssel). Namen von
// Personen oder Firmen kann er nicht zuverlässig erkennen; deshalb gibt es kein freies Titelfeld und der Hinweis ist kurz.

const LANGUAGES = ['de', 'en', 'fr', 'nl', 'hu']
const LANG_NAMES = { de: 'German', en: 'English', fr: 'French', nl: 'Dutch', hu: 'Hungarian' }
const MAX_HINT = 200

// type → Gliederungsvorgabe (Englisch; das Modell übersetzt die Überschriften in die Zielsprache)
const STRUCTURE = {
  'Policy':      'purpose, scope, principles, responsibilities',
  'Procedure':   'purpose, responsibilities, steps/flow, evidence',
  'Risk Policy': 'purpose, risk approach, assessment criteria, treatment strategies, responsibilities',
  'SoA':         'purpose, scope, relation to controls/frameworks, maintenance process',
  'Incident':    'purpose, reporting channels, immediate actions, escalation, follow-up/lessons learned',
  'Release':     'purpose, release criteria, roles, change/rollback process',
}

const t = (de, en, fr, nl, hu) => ({ de, en, fr, nl, hu })
const CATALOG = [
  { id: 'infosec', type: 'Policy', title: t('Informationssicherheitsrichtlinie', 'Information Security Policy', 'Politique de sécurité de l’information', 'Informatiebeveiligingsbeleid', 'Információbiztonsági szabályzat') },
  { id: 'acceptable_use', type: 'Policy', title: t('Richtlinie zur akzeptablen Nutzung', 'Acceptable Use Policy', 'Politique d’utilisation acceptable', 'Beleid voor aanvaardbaar gebruik', 'Elfogadható használati szabályzat') },
  { id: 'access_control', type: 'Policy', title: t('Zugriffssteuerungsrichtlinie', 'Access Control Policy', 'Politique de contrôle d’accès', 'Toegangsbeheerbeleid', 'Hozzáférés-szabályozási szabályzat') },
  { id: 'password', type: 'Policy', title: t('Passwortrichtlinie', 'Password Policy', 'Politique de mots de passe', 'Wachtwoordbeleid', 'Jelszószabályzat') },
  { id: 'backup', type: 'Policy', title: t('Datensicherungsrichtlinie', 'Backup Policy', 'Politique de sauvegarde', 'Back-upbeleid', 'Mentési szabályzat') },
  { id: 'crypto', type: 'Policy', title: t('Kryptografie-Richtlinie', 'Cryptography Policy', 'Politique de cryptographie', 'Cryptografiebeleid', 'Kriptográfiai szabályzat') },
  { id: 'remote_work', type: 'Policy', title: t('Richtlinie für Remote-Arbeit', 'Remote Work Policy', 'Politique de télétravail', 'Beleid voor werken op afstand', 'Távmunka-szabályzat') },
  { id: 'supplier', type: 'Policy', title: t('Lieferantensicherheitsrichtlinie', 'Supplier Security Policy', 'Politique de sécurité des fournisseurs', 'Leveranciersbeveiligingsbeleid', 'Beszállítói biztonsági szabályzat') },
  { id: 'clear_desk', type: 'Policy', title: t('Richtlinie für den aufgeräumten Arbeitsplatz und Bildschirm', 'Clear Desk and Clear Screen Policy', 'Politique de bureau propre et d’écran vide', 'Clear-desk- en clear-screenbeleid', 'Tiszta asztal és tiszta képernyő szabályzat') },
  { id: 'mobile_devices', type: 'Policy', title: t('Richtlinie für mobile Geräte', 'Mobile Device Policy', 'Politique des appareils mobiles', 'Beleid voor mobiele apparaten', 'Mobil eszközök szabályzata') },
  { id: 'classification', type: 'Policy', title: t('Richtlinie zur Informationsklassifizierung', 'Information Classification Policy', 'Politique de classification de l’information', 'Beleid voor informatieclassificatie', 'Információosztályozási szabályzat') },
  { id: 'change_mgmt', type: 'Procedure', title: t('Änderungsmanagement-Verfahren', 'Change Management Procedure', 'Procédure de gestion des changements', 'Procedure voor wijzigingsbeheer', 'Változáskezelési eljárás') },
  { id: 'jml', type: 'Procedure', title: t('Verfahren für Eintritt, Wechsel und Austritt', 'Joiner, Mover, Leaver Procedure', 'Procédure d’arrivée, de mobilité et de départ', 'Procedure voor in-, door- en uitstroom', 'Belépési, áthelyezési és kilépési eljárás') },
  { id: 'patch', type: 'Procedure', title: t('Patch-Management-Verfahren', 'Patch Management Procedure', 'Procédure de gestion des correctifs', 'Procedure voor patchbeheer', 'Javításkezelési eljárás') },
  { id: 'access_review', type: 'Procedure', title: t('Verfahren zur Überprüfung von Zugriffsrechten', 'Access Review Procedure', 'Procédure de revue des accès', 'Procedure voor toegangsreview', 'Hozzáférési jogosultságok felülvizsgálati eljárása') },
  { id: 'restore', type: 'Procedure', title: t('Verfahren zur Wiederherstellung von Daten', 'Data Restore Procedure', 'Procédure de restauration des données', 'Procedure voor gegevensherstel', 'Adat-helyreállítási eljárás') },
  { id: 'risk_mgmt', type: 'Risk Policy', title: t('Risikomanagement-Richtlinie', 'Risk Management Policy', 'Politique de gestion des risques', 'Risicomanagementbeleid', 'Kockázatkezelési szabályzat') },
  { id: 'incident_response', type: 'Incident', title: t('Incident-Response-Verfahren', 'Incident Response Procedure', 'Procédure de réponse aux incidents', 'Procedure voor incidentrespons', 'Incidenskezelési eljárás') },
  { id: 'data_breach', type: 'Incident', title: t('Verfahren bei Datenschutzverletzungen', 'Data Breach Procedure', 'Procédure en cas de violation de données', 'Procedure bij datalekken', 'Adatvédelmi incidens kezelési eljárása') },
  { id: 'release_mgmt', type: 'Release', title: t('Freigabe- und Release-Verfahren', 'Release and Approval Procedure', 'Procédure de validation et de mise en production', 'Release- en goedkeuringsprocedure', 'Kiadási és jóváhagyási eljárás') },
  { id: 'soa_doc', type: 'SoA', title: t('Erklärung zur Anwendbarkeit (SoA)', 'Statement of Applicability (SoA)', 'Déclaration d’applicabilité (SoA)', 'Verklaring van toepasselijkheid (SoA)', 'Alkalmazhatósági nyilatkozat (SoA)') },
]

// Platzhalter → Feld der Organisationsdaten
const PLACEHOLDERS = {
  COMPANY_NAME: 'orgName',
  ISMS_OWNER: 'cisoName',
  DATA_PROTECTION_OFFICER: 'gdpoName',
  ISMS_SCOPE: 'ismsScope',
}

const entryById = id => CATALOG.find(e => e.id === id) || null
const catalogFor = type => CATALOG.filter(e => e.type === type)

// Strukturierte Angaben, die nie an eine KI gehen dürfen → [{ kind, match }]
const PII_RULES = [
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/i],
  ['url', /\b(?:https?|ftp|file):\/\/\S+|\bwww\.\S+/i],
  ['ip', /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/i],
  ['mac', /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i],
  ['iban', /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{3,4}){3,8}\b/],
  ['phone', /(?:\+|\b00)\d[\d\s()/.-]{6,}\d|\b0\d{2,5}[\s/.-]?\d{3,}(?:[\s/.-]?\d+)*\b/],
  ['domain', /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|de|org|net|eu|io|ch|at|fr|nl|hu|info|biz|local|lan|intern|internal|corp|home)\b/i],
  ['uuid', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ['secret', /\b(?:gh[pousr]_|github_pat_|sk-|AKIA|xox[abprs]-)[A-Za-z0-9_-]{8,}|\b[A-Za-z0-9+/_-]{32,}={0,2}/],
  ['number', /\b\d{6,}\b/],
  ['path', /\b[A-Za-z]:\\|\/(?:home|Users|etc|var|root)\/\S+/],
  ['handle', /(?:^|\s)@[A-Za-z0-9_]{2,}/],
  ['company', /\b(?:GmbH|AG|KG|UG|e\.?\s?V\.|Ltd\.?|Inc\.?|LLC|S\.?A\.?R\.?L\.?|B\.?V\.?|Kft\.?|Zrt\.?|Co\.|Corp\.?)(?=\s|$|[,.;)])/],
]
function findPii(text, known = []) {
  const s = String(text || '')
  const out = []
  // Eigene Daten der Organisation (Firmenname, Namen der Verantwortlichen) sind bekannt und werden zusätzlich gesucht
  const low = s.toLowerCase()
  for (const k of known || []) {
    const v = String(k || '').trim().toLowerCase()
    if (v.length >= 3 && low.includes(v)) { out.push({ kind: 'known', match: String(k).trim().slice(0, 40) }); break }
  }
  for (const [kind, re] of PII_RULES) {
    const m = s.match(re)
    if (m) out.push({ kind, match: m[0].trim().slice(0, 40) })
  }
  return out
}

const HINT_CHARS = /^[\p{L}\p{N} ,.;:()/&+\-–]*$/u

// Prompt bauen → { ok: true, prompt, entry, language, hint } oder { ok: false, code, findings? }
// `known`: Werte, die nie im Hinweis stehen dürfen (Firmenname, Namen der Verantwortlichen aus den Organisationsdaten)
function buildPrompt({ entry, language, hint, known } = {}) {
  const e = entryById(entry)
  if (!e) return { ok: false, code: 'unknown_entry' }
  if (!LANGUAGES.includes(language)) return { ok: false, code: 'bad_language' }
  const h = String(hint == null ? '' : hint).trim()
  if (h.length > MAX_HINT) return { ok: false, code: 'hint_too_long' }
  if (h) {
    const findings = findPii(h, known)
    if (findings.length) return { ok: false, code: 'pii', findings }
    if (!HINT_CHARS.test(h)) return { ok: false, code: 'hint_chars' }
  }
  const title = e.title[language]
  const lines = [
    'You are an experienced author of information security documents (ISO 27001 / NIS2) for a small or medium-sized company.',
    `Write the content of a document of type "${e.type}" titled "${title}".`,
    `Usual structure for this document type: ${STRUCTURE[e.type] || STRUCTURE.Policy}.`,
    `Write the whole text, including all headings, in ${LANG_NAMES[language]}.`,
    'Never invent concrete names, addresses, e-mail addresses, phone numbers or other company data. Use exactly these placeholders where such data belongs, written with double curly braces: ' +
      Object.keys(PLACEHOLDERS).map(k => `{{${k}}}`).join(', ') + '.',
  ]
  if (h) lines.push(`Pay particular attention to: ${h}.`)
  lines.push('Return ONLY the Markdown content, starting with a "#" heading. No explanations, no code fences, no JSON.')
  return { ok: true, prompt: lines.join('\n'), entry: e, language, hint: h }
}

function stripCodeFences(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

// Platzhalter lokal ersetzen. `values` = Organisationsdaten (orgName, cisoName, gdpoName, ismsScope).
// Nicht ersetzbare (leerer Wert) bleiben als {{NAME}} stehen und werden in `unresolved` gemeldet.
function fillPlaceholders(text, values) {
  const unresolved = new Set()
  const out = String(text || '').replace(/\{\{\s*([A-Za-z_ ]+?)\s*\}\}|\[\s*(COMPANY_NAME|ISMS_OWNER|DATA_PROTECTION_OFFICER|ISMS_SCOPE)\s*\]/g, (whole, a, b) => {
    const name = String(a || b).trim().toUpperCase().replace(/ +/g, '_')
    if (!(name in PLACEHOLDERS)) return whole
    const v = values && typeof values[PLACEHOLDERS[name]] === 'string' ? values[PLACEHOLDERS[name]].trim() : ''
    if (!v) { unresolved.add(name); return `{{${name}}}` }
    return v
  })
  return { text: out, unresolved: [...unresolved].sort() }
}

module.exports = { LANGUAGES, MAX_HINT, CATALOG, PLACEHOLDERS, entryById, catalogFor, findPii, buildPrompt, stripCodeFences, fillPlaceholders }
