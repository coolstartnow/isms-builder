// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// Persistent store for organisation-wide settings and role-specific config.
// Data saved to data/org-settings.json

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE = path.join(_BASE, 'org-settings.json')

const DEFAULTS = {
  // Organisationsdaten
  orgName:    '',
  orgShort:   '',
  ismsScope:  '',
  logoText:   '',

  // Sicherheitsrichtlinien
  require2FA: false,   // 2FA systemweit erzwingen (blockiert Login ohne TOTP)

  // KI-Integration (Ollama)
  aiEnabled:       true,   // Semantische Suche und KI-Features global aktivieren
  aiOllamaUrl:     '',     // Ollama-URL (leer = http://localhost:11434)
  aiEmbedModel:    '',     // Embedding-Modell (leer = nomic-embed-text)

  // Verantwortlichkeiten
  cisoName:   '',
  cisoEmail:  '',
  gdpoName:   '',
  gdpoEmail:  '',
  icsContact: '',

  // CISO-Einstellungen
  cisoSettings: {
    escalationEmail:        '',
    incidentResponseSLA:    24,       // Stunden
    reportableThreshold:    'high',   // low | medium | high | critical
    reportableTypes:        ['ransomware', 'data_theft', 'unauthorized_access'],
  },

  // GDPO-Einstellungen
  gdpoSettings: {
    dsarDeadlineDays:       30,
    dsarExtendedDays:       90,
    timer72hEnabled:        true,
    supervisoryAuthority:   '',       // Name der Datenschutzbehörde
    supervisoryContact:     '',       // Kontakt / URL
    dsarDefaultResponse:    '',       // Standardtext für DSAR-Antwort
  },

  // Modul-Konfiguration (admin-gesteuert, system-weit)
  modules: {
    soa:      true,   // SoA – Statement of Applicability
    guidance: true,   // Guidance & Dokumentation
    goals:    true,   // Sicherheitsziele (ISO 27001 Kap. 6.2)
    risk:     true,   // Risk & Compliance
    legal:    true,   // Legal & Privacy (Verträge, NDAs, Policies)
    incident: true,   // Incident Inbox (CISO-Posteingang)
    gdpr:     true,   // GDPR & Datenschutz
    training: true,   // Training & Schulungen
    reports:  true,   // Reports & Compliance-Berichte
    calendar: true,   // Kalender (aggregierte Terminübersicht)
    assets:      true,   // Asset Management (ISO 27001 A.5.9–5.12)
    governance:  true,   // Governance & Management-Review (ISO 27001 Kap. 9.3)
    bcm:         true,   // Business Continuity Management (ISO 22301)
    suppliers:   true,   // Lieferkettenmanagement (ISO 27001 A.5.21–5.22, NIS2)
  },

  // SoA Framework-Selektion (admin-gesteuert)
  soaFrameworks: {
    ISO27001: true,
    BSI:      true,
    NIS2:     true,
    EUCS:     true,
    EUAI:     true,
    ISO9000:  true,
    ISO9001:  true,
    CRA:      true,
  },

  // ICS/OT-Einstellungen
  icsSettings: {
    otResponsible:          '',
    otResponsibleEmail:     '',
    otScope:                '',
    otStandard:             'iec62443',
    otNis2Sector:           '',
    otKritisRelevant:       false,
    otNetworkSegmentation:  'planned',
    otPatchCycleWeeks:      12,
    otMaintenanceWindow:    '',
    otEmergencyContact:     '',
  },

  // Interne Revision
  revisionSettings: {
    revResponsible:         '',       // Leiter Interne Revision
    revResponsibleEmail:    '',
    revScope:               '',       // Prüfungsumfang (alle Gesellschaften / ausgewählte)
    revCycleMonths:         12,       // Prüfungsrhythmus in Monaten
    revLastAuditDate:       '',       // Datum letztes internes Audit
    revNextAuditDate:       '',       // Datum nächstes geplantes Audit
    revReportsTo:           'gf',     // gf | aufsichtsrat | prüfungsausschuss
    revExternalSupport:     '',       // externer Prüfer / Wirtschaftsprüfer (optional)
  },

  // SMTP-Konfiguration (UI-Einstellung; .env-Variablen haben Vorrang)
  smtpSettings: {
    host:   '',
    port:   587,
    secure: false,   // true = TLS (Port 465), false = STARTTLS
    user:   '',
    pass:   '',      // Achtung: im Klartext in org-settings.json gespeichert
    from:   '',      // z.B. "ISMS Builder <isms@example.com>"
  },

  // Login-Splash-Bildschirm
  splashScreen: {
    enabled:  true,   // Splash nach Login anzeigen
    duration: 7,      // Anzeigedauer in Sekunden (1–30)
  },

  // Sprach-Konfiguration
  languageConfig: {
    available: ['de', 'en', 'fr', 'nl'],   // aktivierte Sprachen
    default:   'en',                        // Standardsprache auf Login-Seite
  },

  // Navigations-Reihenfolge (array der Section-IDs; fehlende landen am Ende)
  navOrder: ['dashboard','soa','guidance','goals','risk','legal','incident','gdpr','training','assets','governance','bcm','suppliers','reports','calendar','settings','admin'],

  // E-Mail-Benachrichtigungen (Digest, täglich)
  emailNotifications: {
    enabled:         false,   // globaler Schalter
    adminEmail:      '',      // Empfänger für Admin-Benachrichtigungen (Verträge, Templates)
    risks:           true,    // offene hohe/kritische Risiken → cisoEmail
    dsar:            true,    // DSAR-Fristen ≤ 3 Tage → gdpoEmail
    gdprIncidents:   true,    // offene GDPR-Vorfälle > 48h → gdpoEmail
    deletionLog:     true,    // Löschprotokoll: überfällige + bald fällige Löschpflichten → gdpoEmail
    bcm:             true,    // BCM-Tests fällig ≤ 14 Tage → cisoEmail
    contracts:       true,    // ablaufende Verträge ≤ 30 Tage → adminEmail
    templateReview:  true,    // Templates-Überprüfung ≤ 14 Tage → adminEmail
    supplierAudits:  true,    // Lieferanten-Audits überfällig / ≤ 14 Tage → cisoEmail
  },

  // Qualitätsmanagement
  qmSettings: {
    qmResponsible:          '',       // QMB – Qualitätsmanagementbeauftragter
    qmResponsibleEmail:     '',
    qmScope:                '',       // Geltungsbereich des QMS
    qmStandard:             'iso9001', // iso9001 | iso9000 | iatf16949 | other
    qmCertBody:             '',       // Zertifizierungsstelle (z.B. TÜV, DQS, Bureau Veritas)
    qmCertValidUntil:       '',       // Zertifikat gültig bis (ISO-Datum)
    qmLastAuditDate:        '',       // Letztes Überwachungsaudit
    qmNextAuditDate:        '',       // Nächstes geplantes Audit
    qmRecertDate:           '',       // Nächste Rezertifizierung
  },
}

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const stored = JSON.parse(fs.readFileSync(FILE, 'utf8'))
      // Deep-merge defaults so new keys are always present
      return {
        ...DEFAULTS,
        ...stored,
        modules:          { ...DEFAULTS.modules,          ...(stored.modules          || {}) },
        soaFrameworks:    { ...DEFAULTS.soaFrameworks,    ...(stored.soaFrameworks    || {}) },
        cisoSettings:     { ...DEFAULTS.cisoSettings,     ...(stored.cisoSettings     || {}) },
        gdpoSettings:     { ...DEFAULTS.gdpoSettings,     ...(stored.gdpoSettings     || {}) },
        icsSettings:      { ...DEFAULTS.icsSettings,      ...(stored.icsSettings      || {}) },
        revisionSettings:   { ...DEFAULTS.revisionSettings,   ...(stored.revisionSettings   || {}) },
        qmSettings:         { ...DEFAULTS.qmSettings,         ...(stored.qmSettings         || {}) },
        emailNotifications: { ...DEFAULTS.emailNotifications, ...(stored.emailNotifications || {}) },
        smtpSettings:       { ...DEFAULTS.smtpSettings,       ...(stored.smtpSettings       || {}) },
        navOrder:           Array.isArray(stored.navOrder) ? stored.navOrder : DEFAULTS.navOrder.slice(),
        languageConfig:     { ...DEFAULTS.languageConfig, ...(stored.languageConfig || {}), available: Array.isArray(stored.languageConfig?.available) ? stored.languageConfig.available : DEFAULTS.languageConfig.available },
      }
    }
  } catch (e) {
    console.error('[orgSettingsStore] load error:', e.message)
  }
  return { ...DEFAULTS, modules: { ...DEFAULTS.modules }, soaFrameworks: { ...DEFAULTS.soaFrameworks }, cisoSettings: { ...DEFAULTS.cisoSettings }, gdpoSettings: { ...DEFAULTS.gdpoSettings }, icsSettings: { ...DEFAULTS.icsSettings }, revisionSettings: { ...DEFAULTS.revisionSettings }, qmSettings: { ...DEFAULTS.qmSettings }, emailNotifications: { ...DEFAULTS.emailNotifications }, smtpSettings: { ...DEFAULTS.smtpSettings }, navOrder: DEFAULTS.navOrder.slice() }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function get() {
  return load()
}

function update(patch) {
  const current = load()
  const updated = {
    ...current,
    ...patch,
    modules:          { ...current.modules,          ...(patch.modules          || {}) },
    soaFrameworks:    { ...current.soaFrameworks,    ...(patch.soaFrameworks    || {}) },
    cisoSettings:     { ...current.cisoSettings,     ...(patch.cisoSettings     || {}) },
    gdpoSettings:     { ...current.gdpoSettings,     ...(patch.gdpoSettings     || {}) },
    icsSettings:      { ...current.icsSettings,      ...(patch.icsSettings      || {}) },
    revisionSettings:   { ...current.revisionSettings,   ...(patch.revisionSettings   || {}) },
    qmSettings:         { ...current.qmSettings,         ...(patch.qmSettings         || {}) },
    emailNotifications: { ...current.emailNotifications, ...(patch.emailNotifications || {}) },
    smtpSettings:       { ...current.smtpSettings,       ...(patch.smtpSettings       || {}) },
    navOrder:           Array.isArray(patch.navOrder) ? patch.navOrder : current.navOrder,
  }
  save(updated)
  return updated
}

module.exports = { get, update, DEFAULTS }
