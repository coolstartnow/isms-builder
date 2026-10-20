// © 2026 Claude Hecker — ISMS Builder V 1.30 — AGPL-3.0
// SoA Store – Statement of Applicability
// Multi-Framework: BSI IT-Grundschutz · EU NIS2 · EUCS · EU AI Act · CRA (built-in)
//                  ISO 27001:2022 · ISO 9000:2015 · ISO 9001:2015 (user-supplied via data/iso-controls.json)
//
// NOTE: ISO 27001, ISO 9000, and ISO 9001 controls are NOT included in the distribution.
// ISO standards are copyright-protected by ISO (© ISO). Redistribution of control text
// requires a license. To use ISO framework controls, place a JSON array in data/iso-controls.json.
// See scripts/import-iso-controls.sh for the expected format.
//
// Persistenz: data/soa.json
// Control-IDs sind framework-präfixiert (z.B. ISO-5.1, BSI-ISMS.1, NIS2-a, EUCS-1, EUAI-9)
const STORAGE_BACKEND = (process.env.STORAGE_BACKEND || 'json').toLowerCase()
const fs = require('fs')
const path = require('path')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE = path.join(DATA_DIR, 'soa.json')

const IMPLEMENTATION_STATUSES = ['not_started', 'partial', 'implemented', 'optimized']

const FRAMEWORKS = {
  ISO27001: { id: 'ISO27001', label: 'ISO 27001:2022',      color: '#4f8cff' },
  BSI:      { id: 'BSI',      label: 'BSI IT-Grundschutz',  color: '#f0b429' },
  NIS2:     { id: 'NIS2',     label: 'EU NIS2',             color: '#34d399' },
  EUCS:     { id: 'EUCS',     label: 'EU Cloud (EUCS)',     color: '#a78bfa' },
  EUAI:     { id: 'EUAI',     label: 'EU AI Act',           color: '#fb923c' },
  ISO9000:  { id: 'ISO9000',  label: 'ISO 9000:2015',       color: '#2dd4bf' },
  ISO9001:  { id: 'ISO9001',  label: 'ISO 9001:2015',       color: '#f472b6' },
  CRA:      { id: 'CRA',      label: 'EU Cyber Resilience Act', color: '#e11d48' },
  CUSTOM:   { id: 'CUSTOM',   label: 'Custom Controls',         color: '#64748b' },
}

// ─────────────────────────────────────────────────────────────────
// ISO 27001 / ISO 9000 / ISO 9001 controls are NOT bundled.
// They are loaded at runtime from data/iso-controls.json if present.
// See: loadUserISOControls() below, and scripts/import-iso-controls.sh
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// BSI IT-Grundschutz – Kern-Bausteine
// ─────────────────────────────────────────────────────────────────
const BSI_CONTROLS = [
  // ISMS
  { id:'BSI-ISMS.1', theme:'ISMS',          title:'Sicherheitsmanagement' },
  // ORP – Organisation und Personal
  { id:'BSI-ORP.1',  theme:'Organisation',  title:'Organisation' },
  { id:'BSI-ORP.2',  theme:'Organisation',  title:'Personal' },
  { id:'BSI-ORP.3',  theme:'Organisation',  title:'Sensibilisierung und Schulung zur Informationssicherheit' },
  { id:'BSI-ORP.4',  theme:'Organisation',  title:'Identitäts- und Berechtigungsmanagement' },
  { id:'BSI-ORP.5',  theme:'Organisation',  title:'Compliance Management (Anforderungsmanagement)' },
  // CON – Konzepte und Vorgehensweisen
  { id:'BSI-CON.1',  theme:'Konzepte',      title:'Kryptokonzept' },
  { id:'BSI-CON.2',  theme:'Konzepte',      title:'Datenschutz' },
  { id:'BSI-CON.3',  theme:'Konzepte',      title:'Datensicherungskonzept' },
  { id:'BSI-CON.6',  theme:'Konzepte',      title:'Löschen und Vernichten' },
  { id:'BSI-CON.7',  theme:'Konzepte',      title:'Informationssicherheit auf Auslandsreisen' },
  { id:'BSI-CON.8',  theme:'Konzepte',      title:'Software-Entwicklung' },
  { id:'BSI-CON.9',  theme:'Konzepte',      title:'Informationsaustausch' },
  { id:'BSI-CON.10', theme:'Konzepte',      title:'Entwicklung von Webanwendungen' },
  // OPS – Betrieb
  { id:'BSI-OPS.1.1.1', theme:'Betrieb',   title:'Allgemeiner IT-Betrieb' },
  { id:'BSI-OPS.1.1.2', theme:'Betrieb',   title:'Ordnungsgemäße IT-Administration' },
  { id:'BSI-OPS.1.1.3', theme:'Betrieb',   title:'Patch- und Änderungsmanagement' },
  { id:'BSI-OPS.1.1.4', theme:'Betrieb',   title:'Schutz vor Schadprogrammen' },
  { id:'BSI-OPS.1.1.5', theme:'Betrieb',   title:'Protokollierung' },
  { id:'BSI-OPS.1.1.6', theme:'Betrieb',   title:'Software-Tests und Freigaben' },
  { id:'BSI-OPS.1.2.2', theme:'Betrieb',   title:'Archivierung' },
  { id:'BSI-OPS.1.2.4', theme:'Betrieb',   title:'Telearbeit' },
  { id:'BSI-OPS.1.2.5', theme:'Betrieb',   title:'Fernwartung' },
  { id:'BSI-OPS.2.1',   theme:'Betrieb',   title:'Outsourcing für Kunden' },
  { id:'BSI-OPS.2.2',   theme:'Betrieb',   title:'Cloud-Nutzung' },
  { id:'BSI-OPS.2.3',   theme:'Betrieb',   title:'Nutzung von Outsourcing' },
  // DER – Detektion und Reaktion
  { id:'BSI-DER.1',   theme:'Detektion',   title:'Detektion von sicherheitsrelevanten Ereignissen' },
  { id:'BSI-DER.2.1', theme:'Detektion',   title:'Behandlung von Sicherheitsvorfällen' },
  { id:'BSI-DER.2.2', theme:'Detektion',   title:'Vorsorge für die IT-Forensik' },
  { id:'BSI-DER.2.3', theme:'Detektion',   title:'Bereinigung weitreichender Sicherheitsvorfälle' },
  { id:'BSI-DER.3.1', theme:'Detektion',   title:'Audits und Revisionen' },
  { id:'BSI-DER.4',   theme:'Detektion',   title:'Notfallmanagement' },
  // APP – Anwendungen
  { id:'BSI-APP.1.1', theme:'Anwendungen', title:'Office-Produkte' },
  { id:'BSI-APP.1.2', theme:'Anwendungen', title:'Webbrowser' },
  { id:'BSI-APP.2.1', theme:'Anwendungen', title:'Allgemeiner Verzeichnisdienst' },
  { id:'BSI-APP.3.1', theme:'Anwendungen', title:'Webanwendungen und Webservices' },
  { id:'BSI-APP.3.2', theme:'Anwendungen', title:'Webserver' },
  { id:'BSI-APP.3.3', theme:'Anwendungen', title:'Fileserver' },
  { id:'BSI-APP.4.3', theme:'Anwendungen', title:'Relationale Datenbanken' },
  { id:'BSI-APP.4.4', theme:'Anwendungen', title:'Kubernetes' },
  { id:'BSI-APP.5.3', theme:'Anwendungen', title:'Allgemeiner E-Mail-Client und -Server' },
  { id:'BSI-APP.6',   theme:'Anwendungen', title:'Allgemeine Software' },
  { id:'BSI-APP.7',   theme:'Anwendungen', title:'Entwicklung von Individualsoftware' },
  // SYS – IT-Systeme
  { id:'BSI-SYS.1.1', theme:'IT-Systeme',  title:'Allgemeiner Server' },
  { id:'BSI-SYS.1.3', theme:'IT-Systeme',  title:'Server unter Linux und Unix' },
  { id:'BSI-SYS.1.5', theme:'IT-Systeme',  title:'Virtualisierung' },
  { id:'BSI-SYS.1.6', theme:'IT-Systeme',  title:'Containerisierung' },
  { id:'BSI-SYS.1.8', theme:'IT-Systeme',  title:'Speicherlösungen' },
  { id:'BSI-SYS.2.1', theme:'IT-Systeme',  title:'Allgemeiner Client' },
  { id:'BSI-SYS.2.2', theme:'IT-Systeme',  title:'Clients unter Windows' },
  { id:'BSI-SYS.2.3', theme:'IT-Systeme',  title:'Clients unter Linux und Unix' },
  { id:'BSI-SYS.3.1', theme:'IT-Systeme',  title:'Laptops' },
  { id:'BSI-SYS.3.2', theme:'IT-Systeme',  title:'Allgemeines Smartphone und Tablet' },
  { id:'BSI-SYS.4.5', theme:'IT-Systeme',  title:'Wechseldatenträger' },
  // NET – Netze und Kommunikation
  { id:'BSI-NET.1.1', theme:'Netze',        title:'Netzarchitektur und -design' },
  { id:'BSI-NET.1.2', theme:'Netze',        title:'Netzmanagement' },
  { id:'BSI-NET.2.1', theme:'Netze',        title:'WLAN-Betrieb' },
  { id:'BSI-NET.3.1', theme:'Netze',        title:'Router und Switches' },
  { id:'BSI-NET.3.2', theme:'Netze',        title:'Firewall' },
  { id:'BSI-NET.3.3', theme:'Netze',        title:'VPN' },
  // INF – Infrastruktur
  { id:'BSI-INF.1',   theme:'Infrastruktur', title:'Allgemeines Gebäude' },
  { id:'BSI-INF.2',   theme:'Infrastruktur', title:'Rechenzentrum sowie Serverraum' },
  { id:'BSI-INF.7',   theme:'Infrastruktur', title:'Büroarbeitsplatz' },
  { id:'BSI-INF.8',   theme:'Infrastruktur', title:'Häuslicher Arbeitsplatz' },
  { id:'BSI-INF.9',   theme:'Infrastruktur', title:'Mobiler Arbeitsplatz' },
  { id:'BSI-INF.12',  theme:'Infrastruktur', title:'Verkabelung' },
].map(c => ({ ...c, framework: 'BSI' }))

// ─────────────────────────────────────────────────────────────────
// EU NIS2 – Richtlinie 2022/2555, Art. 21 Maßnahmen
// ─────────────────────────────────────────────────────────────────
const NIS2_CONTROLS = [
  { id:'NIS2-a', theme:'Risikomanagement',    title:'Art. 21(2)(a) – Konzepte für Risikoanalyse und Sicherheit der Informationssysteme' },
  { id:'NIS2-b', theme:'Vorfallmanagement',   title:'Art. 21(2)(b) – Bewältigung von Sicherheitsvorfällen (Incident Handling)' },
  { id:'NIS2-c', theme:'Betriebskontinuität', title:'Art. 21(2)(c) – Aufrechterhaltung des Betriebs, Backup, Notfallwiederherstellung, Krisenmanagement' },
  { id:'NIS2-d', theme:'Lieferkette',         title:'Art. 21(2)(d) – Sicherheit der Lieferkette (Supplier & Service Provider)' },
  { id:'NIS2-e', theme:'Entwicklung',         title:'Art. 21(2)(e) – Sicherheit beim Erwerb, Entwicklung und Wartung von Netz- und Informationssystemen, Schwachstellenmanagement' },
  { id:'NIS2-f', theme:'Wirksamkeit',         title:'Art. 21(2)(f) – Konzepte und Verfahren zur Bewertung der Wirksamkeit von Risikomanagementmaßnahmen' },
  { id:'NIS2-g', theme:'Schulung',            title:'Art. 21(2)(g) – Grundlegende Cyberhygiene und Cybersicherheitsschulungen' },
  { id:'NIS2-h', theme:'Kryptografie',        title:'Art. 21(2)(h) – Konzepte und Verfahren für den Einsatz von Kryptografie und Verschlüsselung' },
  { id:'NIS2-i', theme:'Personal',            title:'Art. 21(2)(i) – Personalsicherheit, Konzepte für Zugriffskontrolle und Asset-Management' },
  { id:'NIS2-j', theme:'Authentisierung',     title:'Art. 21(2)(j) – Multi-Faktor-Authentifizierung, gesicherte Kommunikation und Notfallkommunikation' },
].map(c => ({ ...c, framework: 'NIS2' }))

// ─────────────────────────────────────────────────────────────────
// EUCS – EU Cybersecurity Certification Scheme for Cloud Services
// ─────────────────────────────────────────────────────────────────
const EUCS_CONTROLS = [
  { id:'EUCS-GOV.1',  theme:'Governance',         title:'Sicherheitsrichtlinien und Governance-Framework' },
  { id:'EUCS-GOV.2',  theme:'Governance',         title:'Rollen und Verantwortlichkeiten für Informationssicherheit' },
  { id:'EUCS-GOV.3',  theme:'Governance',         title:'Risikomanagement und Risikobewertung' },
  { id:'EUCS-IAM.1',  theme:'Identität & Zugriff', title:'Identitäts- und Zugriffsmanagement' },
  { id:'EUCS-IAM.2',  theme:'Identität & Zugriff', title:'Multi-Faktor-Authentifizierung' },
  { id:'EUCS-IAM.3',  theme:'Identität & Zugriff', title:'Privilegierter Zugriff und Least Privilege' },
  { id:'EUCS-SCM.1',  theme:'Lieferkette',         title:'Lieferkettensicherheit und Abhängigkeitsmanagement' },
  { id:'EUCS-SCM.2',  theme:'Lieferkette',         title:'Sub-Prozessor-Management und Vertragsklauseln' },
  { id:'EUCS-CHM.1',  theme:'Änderungsmanagement', title:'Change Management und Konfigurationskontrolle' },
  { id:'EUCS-CHM.2',  theme:'Änderungsmanagement', title:'Software-Sicherheitstest vor Deployment' },
  { id:'EUCS-BCM.1',  theme:'Betriebskontinuität', title:'Business Continuity und Disaster Recovery' },
  { id:'EUCS-BCM.2',  theme:'Betriebskontinuität', title:'Backup und Wiederherstellbarkeit' },
  { id:'EUCS-INC.1',  theme:'Vorfallmanagement',   title:'Incident Detection und Monitoring' },
  { id:'EUCS-INC.2',  theme:'Vorfallmanagement',   title:'Incident Response und Meldepflichten' },
  { id:'EUCS-CRY.1',  theme:'Kryptografie',        title:'Kryptografie und Schlüsselmanagement' },
  { id:'EUCS-VUL.1',  theme:'Schwachstellen',      title:'Schwachstellenmanagement und Penetrationstests' },
  { id:'EUCS-VUL.2',  theme:'Schwachstellen',      title:'Patch-Management' },
  { id:'EUCS-LOG.1',  theme:'Logging & Monitoring', title:'Logging, Monitoring und Audit-Trails' },
  { id:'EUCS-NET.1',  theme:'Netzwerk',            title:'Netzwerksicherheit und Segmentierung' },
  { id:'EUCS-PHY.1',  theme:'Physisch',            title:'Physische Sicherheit der Rechenzentren' },
  { id:'EUCS-DPR.1',  theme:'Datenschutz',         title:'Datenschutz und Datenklassifizierung' },
  { id:'EUCS-DPR.2',  theme:'Datenschutz',         title:'Datenlöschung und -portabilität' },
  { id:'EUCS-PEN.1',  theme:'Personal',            title:'Mitarbeitersicherheit und Hintergrundprüfungen' },
].map(c => ({ ...c, framework: 'EUCS' }))

// ─────────────────────────────────────────────────────────────────
// EU AI Act – Verordnung 2024/1689
// Anforderungen für Hochrisiko-KI-Systeme (Titel III, Kapitel 2)
// sowie GPAI-Pflichten (Titel VIII)
// ─────────────────────────────────────────────────────────────────
const EUAI_CONTROLS = [
  // Hochrisiko-KI (Art. 8–15)
  { id:'EUAI-ART9',    theme:'Hochrisiko-KI',  title:'Art. 9 – Risikomanagementsystem für KI-Systeme' },
  { id:'EUAI-ART10',   theme:'Hochrisiko-KI',  title:'Art. 10 – Anforderungen an Daten und Daten-Governance' },
  { id:'EUAI-ART11',   theme:'Hochrisiko-KI',  title:'Art. 11 – Technische Dokumentation' },
  { id:'EUAI-ART12',   theme:'Hochrisiko-KI',  title:'Art. 12 – Aufzeichnungspflichten (Logging)' },
  { id:'EUAI-ART13',   theme:'Hochrisiko-KI',  title:'Art. 13 – Transparenz und Nutzerinformation' },
  { id:'EUAI-ART14',   theme:'Hochrisiko-KI',  title:'Art. 14 – Menschliche Aufsicht (Human Oversight)' },
  { id:'EUAI-ART15',   theme:'Hochrisiko-KI',  title:'Art. 15 – Genauigkeit, Robustheit und Cybersicherheit' },
  // Konformitätsbewertung und Marktüberwachung (Art. 16–27)
  { id:'EUAI-ART16',   theme:'Konformität',    title:'Art. 16 – Pflichten der Anbieter (Provider Obligations)' },
  { id:'EUAI-ART17',   theme:'Konformität',    title:'Art. 17 – Qualitätsmanagementsystem' },
  { id:'EUAI-ART18',   theme:'Konformität',    title:'Art. 18 – Technische Dokumentation aufbewahren' },
  { id:'EUAI-ART43',   theme:'Konformität',    title:'Art. 43 – Konformitätsbewertungsverfahren' },
  // GPAI – General Purpose AI (Titel VIII, Art. 53–55)
  { id:'EUAI-ART53',   theme:'GPAI',           title:'Art. 53 – Pflichten der Anbieter von GPAI-Modellen' },
  { id:'EUAI-ART54',   theme:'GPAI',           title:'Art. 54 – Transparenzpflichten für GPAI mit systemischem Risiko' },
  { id:'EUAI-ART55',   theme:'GPAI',           title:'Art. 55 – Bewertung und Minderung systemischer Risiken' },
  // Verbotene KI-Praktiken (Art. 5)
  { id:'EUAI-ART5',    theme:'Verbote',        title:'Art. 5 – Verbotene KI-Praktiken (Prohibited AI Practices)' },
  // Governance
  { id:'EUAI-GOV.1',   theme:'Governance',     title:'KI-Strategie und interne KI-Governance' },
  { id:'EUAI-GOV.2',   theme:'Governance',     title:'KI-Inventar und Risikoklassifizierung eingesetzter Systeme' },
  { id:'EUAI-GOV.3',   theme:'Governance',     title:'Verantwortliche Stelle und KI-Beauftragter' },
].map(c => ({ ...c, framework: 'EUAI' }))



// ─────────────────────────────────────────────────────────────────
// EU Cyber Resilience Act (CRA) – Anforderungen an Produkte mit digitalen Elementen
// Basis: Verordnung (EU) 2024/2847, in Kraft seit Okt. 2024
// ─────────────────────────────────────────────────────────────────
const CRA_CONTROLS = [
  // Artikel 6 – Grundlegende Cybersicherheitsanforderungen (Anhang I, Teil I)
  { id:'CRA-1.1',  theme:'Produktanforderungen', title:'Keine bekannten ausnutzbaren Schwachstellen bei Inverkehrbringen' },
  { id:'CRA-1.2',  theme:'Produktanforderungen', title:'Sicherheit durch Voreinstellungen (Security by Default)' },
  { id:'CRA-1.3',  theme:'Produktanforderungen', title:'Schutz vor unbefugtem Zugriff (Authentisierung, Autorisierung)' },
  { id:'CRA-1.4',  theme:'Produktanforderungen', title:'Schutz der Vertraulichkeit gespeicherter und übertragener Daten' },
  { id:'CRA-1.5',  theme:'Produktanforderungen', title:'Schutz der Integrität von Daten, Konfiguration und Befehlen' },
  { id:'CRA-1.6',  theme:'Produktanforderungen', title:'Minimierung der Angriffsfläche' },
  { id:'CRA-1.7',  theme:'Produktanforderungen', title:'Begrenzung der Auswirkungen von Sicherheitsvorfällen' },
  { id:'CRA-1.8',  theme:'Produktanforderungen', title:'Protokollierung sicherheitsrelevanter Ereignisse' },
  { id:'CRA-1.9',  theme:'Produktanforderungen', title:'Sicherheitsupdates und Patch-Fähigkeit' },
  { id:'CRA-1.10', theme:'Produktanforderungen', title:'Sicheres Löschen und Zurücksetzen von Daten' },
  { id:'CRA-1.11', theme:'Produktanforderungen', title:'Schutz gegen physische und elektromagnetische Angriffe' },
  // Anhang I, Teil II – Anforderungen an Schwachstellenmanagement
  { id:'CRA-2.1',  theme:'Schwachstellenmanagement', title:'Identifizierung und Dokumentation von Schwachstellen und Komponenten (SBOM)' },
  { id:'CRA-2.2',  theme:'Schwachstellenmanagement', title:'Umgehende Behebung von Schwachstellen' },
  { id:'CRA-2.3',  theme:'Schwachstellenmanagement', title:'Regelmäßige Tests und Überprüfungen der Sicherheit' },
  { id:'CRA-2.4',  theme:'Schwachstellenmanagement', title:'Koordinierte Offenlegung von Schwachstellen (CVD-Richtlinie)' },
  { id:'CRA-2.5',  theme:'Schwachstellenmanagement', title:'Bereitstellung von Sicherheitspatches ohne Kosten für den Nutzer' },
  { id:'CRA-2.6',  theme:'Schwachstellenmanagement', title:'Sicherheitsunterstützungszeitraum (Mindest 5 Jahre)' },
  // Artikel 13 / 14 – Pflichten der Hersteller
  { id:'CRA-3.1',  theme:'Herstellerpflichten', title:'Konformitätsbewertung vor Inverkehrbringen' },
  { id:'CRA-3.2',  theme:'Herstellerpflichten', title:'EU-Konformitätserklärung (DoC) und CE-Kennzeichnung' },
  { id:'CRA-3.3',  theme:'Herstellerpflichten', title:'Technische Dokumentation (Anhang VII)' },
  { id:'CRA-3.4',  theme:'Herstellerpflichten', title:'Meldung aktiv ausgenutzter Schwachstellen an ENISA (24h-Frühwarnung)' },
  { id:'CRA-3.5',  theme:'Herstellerpflichten', title:'Meldung schwerwiegender Sicherheitsvorfälle an ENISA' },
  { id:'CRA-3.6',  theme:'Herstellerpflichten', title:'Informierung betroffener Nutzer über Schwachstellen und Patches' },
  // Artikel 13 – Sicherheitsdokumentation und Benutzerinformation
  { id:'CRA-4.1',  theme:'Dokumentation & Transparenz', title:'Sicherheitsdokumentation für Nutzer (Anhang II)' },
  { id:'CRA-4.2',  theme:'Dokumentation & Transparenz', title:'Klare Informationen über Supportzeitraum und End-of-Life' },
  { id:'CRA-4.3',  theme:'Dokumentation & Transparenz', title:'Anleitung zur sicheren Konfiguration und Nutzung' },
  { id:'CRA-4.4',  theme:'Dokumentation & Transparenz', title:'Kontaktstelle für Schwachstellenmeldungen (Security Contact)' },
  // Artikel 20 – Importeure; Artikel 23 – Händler
  { id:'CRA-5.1',  theme:'Lieferkette', title:'Sorgfaltspflichten der Importeure (Konformitätsprüfung)' },
  { id:'CRA-5.2',  theme:'Lieferkette', title:'Sorgfaltspflichten der Händler' },
  { id:'CRA-5.3',  theme:'Lieferkette', title:'Sicherheit von Open-Source-Komponenten in der Lieferkette' },
].map(c => ({ ...c, framework: 'CRA' }))

// ─────────────────────────────────────────────────────────────────
// Load user-supplied ISO controls from data/iso-controls.json
// ISO standards are copyright-protected by ISO (© ISO).
// This function returns an empty array when the file is absent.
// ─────────────────────────────────────────────────────────────────
function loadUserISOControls() {
  const isoFile = path.join(DATA_DIR, 'iso-controls.json')
  try {
    if (fs.existsSync(isoFile)) {
      const raw = JSON.parse(fs.readFileSync(isoFile, 'utf8'))
      if (Array.isArray(raw)) return raw
    }
  } catch (e) {
    console.error('[soaStore] iso-controls.json load error:', e.message)
  }
  return []
}

// ─────────────────────────────────────────────────────────────────
// Alle Controls zusammenführen
// ISO 27001 / ISO 9000 / ISO 9001 werden aus data/iso-controls.json
// geladen (falls vorhanden) — nicht aus dem Quellcode.
// ─────────────────────────────────────────────────────────────────
let USER_ISO_CONTROLS = loadUserISOControls()
let ALL_SEED_CONTROLS = [
  ...BSI_CONTROLS,
  ...NIS2_CONTROLS,
  ...EUCS_CONTROLS,
  ...EUAI_CONTROLS,
  ...CRA_CONTROLS,
  ...USER_ISO_CONTROLS,   // loaded from data/iso-controls.json if present
]

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function buildSeed() {
  const now = new Date().toISOString()
  const data = {}
  for (const c of ALL_SEED_CONTROLS) {
    data[c.id] = {
      id: c.id,
      framework: c.framework,
      theme: c.theme,
      title: c.title,
      applicable: true,
      status: 'not_started',
      owner: '',
      justification: '',
      linkedTemplates: [],
      updatedAt: now,
      updatedBy: 'system'
    }
  }
  return data
}

function load() {
  ensureDir()
  if (!fs.existsSync(FILE)) {
    const seed = buildSeed()
    fs.writeFileSync(FILE, JSON.stringify(seed, null, 2))
    return seed
  }
  try {
    const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    // Merge any new seed controls not yet present (e.g. after adding a new framework)
    const seed = buildSeed()
    let changed = false
    for (const [id, ctrl] of Object.entries(seed)) {
      if (!existing[id]) { existing[id] = ctrl; changed = true }
    }
    if (changed) fs.writeFileSync(FILE, JSON.stringify(existing, null, 2))
    return existing
  } catch { return buildSeed() }
}

function save(data) {
  ensureDir()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

let store = load()

// Nach einem Import (POST /soa/import-controls): die eigene data/iso-controls.json neu lesen und fehlende Controls ergänzen,
// ohne Neustart. Vorhandene Einträge (und Änderungen der Nutzer daran) bleiben unverändert. → { added }
async function reloadIsoControls() {
  USER_ISO_CONTROLS = loadUserISOControls()
  ALL_SEED_CONTROLS = [...BSI_CONTROLS, ...NIS2_CONTROLS, ...EUCS_CONTROLS, ...EUAI_CONTROLS, ...CRA_CONTROLS, ...USER_ISO_CONTROLS]
  if (STORAGE_BACKEND === 'json') {
    let added = 0
    for (const [id, ctrl] of Object.entries(buildSeed())) if (!store[id]) { store[id] = ctrl; added++ }
    if (added) save(store)
    return { added }
  }
  const knexStore = require('./stores/soaStore')
  knexStore.setSeedControls(ALL_SEED_CONTROLS)
  return knexStore.seedBuiltIn()
}

const _jsonExports = {
  init: () => { store = load() },

  getFrameworks: () => Object.values(FRAMEWORKS),

  getAll: ({ framework, theme } = {}) => {
    let all = Object.values(store)
    if (framework) all = all.filter(c => c.framework === framework)
    if (theme)     all = all.filter(c => c.theme === theme)
    return all
  },

  getById: (id) => store[id] || null,

  update: (id, fields, { changedBy } = {}) => {
    if (!store[id]) return null
    const allowed = ['applicable', 'status', 'owner', 'justification', 'linkedTemplates', 'applicableEntities']
    for (const key of allowed) {
      if (fields[key] !== undefined) store[id][key] = fields[key]
    }
    store[id].updatedAt = new Date().toISOString()
    store[id].updatedBy = changedBy || 'unknown'
    save(store)
    return store[id]
  },

  addLinkedTemplate: (controlId, templateId) => {
    if (!store[controlId]) return null
    if (!Array.isArray(store[controlId].linkedTemplates)) store[controlId].linkedTemplates = []
    if (!store[controlId].linkedTemplates.includes(templateId)) {
      store[controlId].linkedTemplates.push(templateId)
      store[controlId].updatedAt = new Date().toISOString()
      save(store)
    }
    return store[controlId]
  },

  removeLinkedTemplate: (controlId, templateId) => {
    if (!store[controlId]) return null
    if (!Array.isArray(store[controlId].linkedTemplates)) { store[controlId].linkedTemplates = []; return store[controlId] }
    store[controlId].linkedTemplates = store[controlId].linkedTemplates.filter(t => t !== templateId)
    store[controlId].updatedAt = new Date().toISOString()
    save(store)
    return store[controlId]
  },

  getSummary: (framework) => {
    const frameworks = framework ? [framework] : Object.keys(FRAMEWORKS)
    const result = {}
    for (const fw of frameworks) {
      const controls = Object.values(store).filter(c => c.framework === fw)
      const applicable = controls.filter(c => c.applicable)
      const byStatus = { not_started: 0, partial: 0, implemented: 0, optimized: 0 }
      for (const c of applicable) {
        if (byStatus[c.status] !== undefined) byStatus[c.status]++
      }
      result[fw] = {
        framework: fw,
        label: FRAMEWORKS[fw]?.label || fw,
        color: FRAMEWORKS[fw]?.color || '#888',
        total: controls.length,
        applicable: applicable.length,
        notApplicable: controls.length - applicable.length,
        byStatus,
        implementationRate: applicable.length > 0
          ? Math.round((byStatus.implemented + byStatus.optimized) / applicable.length * 100)
          : 0
      }
    }
    return framework ? result[framework] : result
  },

  createCustomControl: (body, { changedBy } = {}) => {
    const title = (body.title || '').trim()
    if (!title) throw new Error('title required')
    const now = new Date().toISOString()
    const id   = 'CUSTOM-' + Date.now()
    store[id] = {
      id,
      framework:        'CUSTOM',
      theme:            (body.theme || 'Custom').trim(),
      title,
      description:      (body.description || '').trim(),
      applicable:       true,
      status:           'not_started',
      owner:            (body.owner || '').trim(),
      justification:    (body.justification || '').trim(),
      linkedTemplates:  [],
      createdAt:        now,
      updatedAt:        now,
      updatedBy:        changedBy || 'unknown',
      isCustom:         true,
    }
    save(store)
    return store[id]
  },

  updateCustomControl: (id, body, { changedBy } = {}) => {
    if (!store[id] || !store[id].isCustom) return null
    const allowed = ['title', 'theme', 'description', 'owner', 'applicable', 'status', 'justification', 'linkedTemplates', 'applicableEntities']
    for (const key of allowed) {
      if (body[key] !== undefined) store[id][key] = body[key]
    }
    store[id].updatedAt = new Date().toISOString()
    store[id].updatedBy = changedBy || 'unknown'
    save(store)
    return store[id]
  },

  deleteCustomControl: (id) => {
    const ctrl = store[id]
    if (!ctrl)           return { ok: false, reason: 'not_found' }
    if (!ctrl.isCustom)  return { ok: false, reason: 'not_custom' }
    if ((ctrl.linkedTemplates || []).length > 0) return { ok: false, reason: 'has_links' }
    delete store[id]
    save(store)
    return { ok: true }
  },

  FRAMEWORKS,
  IMPLEMENTATION_STATUSES
}

if (STORAGE_BACKEND !== 'json') {
  const _knex = require('./stores/soaStore')
  _knex.setSeedControls(ALL_SEED_CONTROLS)   // dieselben eingebauten Controls wie im JSON-Backend (#98)
  _knex.reloadIsoControls = reloadIsoControls
  _knex.init().catch(e => console.error('[soaStore] Knex init:', e.message))
  module.exports = _knex
} else {
  _jsonExports.seedBuiltIn = async () => ({ added: 0 })   // JSON legt die Controls beim Laden selbst an (load())
  _jsonExports.reloadIsoControls = reloadIsoControls
  module.exports = _jsonExports
}
