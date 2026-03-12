// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'

const fs   = require('fs')
const path = require('path')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const DATA_FILE = path.join(_BASE, 'guidance.json')
const FILES_DIR = path.join(_BASE, 'guidance/files')

function ensureDir() {
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true })
}

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}

function save(docs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2))
}

function nowISO() { return new Date().toISOString() }

function makeId() {
  return 'guid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

const VALID_CATEGORIES = ['systemhandbuch', 'rollen', 'policy-prozesse', 'soa-audit', 'admin-intern']

const ROLE_RANK = { reader: 1, revision: 1, editor: 2, dept_head: 2, qmb: 2, contentowner: 3, auditor: 3, admin: 4 }

function _roleRank(role) { return ROLE_RANK[(role || '').toLowerCase()] || 1 }

function _visibleFor(doc, userRank) {
  if (!doc.minRole) return true
  return userRank >= (_roleRank(doc.minRole))
}

function getAll(userRank) {
  const rank = userRank != null ? userRank : 1
  return load().filter(d => !d.deletedAt && _visibleFor(d, rank)).map(d => publicDoc(d))
}

function getByCategory(cat, userRank) {
  const rank = userRank != null ? userRank : 1
  return load()
    .filter(d => d.category === cat && !d.deletedAt && _visibleFor(d, rank))
    .sort((a, b) => {
      const ap = a.pinOrder != null ? a.pinOrder : Infinity
      const bp = b.pinOrder != null ? b.pinOrder : Infinity
      if (ap !== bp) return ap - bp
      return new Date(a.createdAt) - new Date(b.createdAt)
    })
    .map(d => publicDoc(d))
}

function getById(id) {
  const doc = load().find(d => d.id === id && !d.deletedAt)
  return doc ? doc : null   // return full doc including filePath
}

function create({ category, title, type, content, filename, filePath, createdBy, minRole, linkedControls }) {
  if (!VALID_CATEGORIES.includes(category)) throw new Error('Invalid category')
  const docs = load()
  const doc = {
    id: makeId(),
    category,
    title: title || 'Ohne Titel',
    type: type || 'markdown',
    content: content || '',
    filename: filename || null,
    filePath: filePath || null,
    linkedControls: Array.isArray(linkedControls) ? linkedControls : [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    createdBy: createdBy || 'system',
    version: 1,
    minRole: minRole || null
  }
  docs.push(doc)
  save(docs)
  return publicDoc(doc)
}

function update(id, fields) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return null
  const doc = docs[idx]
  if (fields.title          !== undefined) doc.title    = fields.title
  if (fields.category       !== undefined && VALID_CATEGORIES.includes(fields.category)) doc.category = fields.category
  if (fields.content        !== undefined) doc.content  = fields.content
  if (fields.filename       !== undefined) doc.filename = fields.filename
  if (fields.filePath       !== undefined) doc.filePath = fields.filePath
  if (fields.linkedControls !== undefined) doc.linkedControls = Array.isArray(fields.linkedControls) ? fields.linkedControls : []
  doc.updatedAt = nowISO()
  doc.version   = (doc.version || 1) + 1
  docs[idx] = doc
  save(docs)
  return publicDoc(doc)
}

function del(id, deletedBy) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return false
  // Soft-Delete: do NOT delete physical file here
  docs[idx].deletedAt = new Date().toISOString()
  docs[idx].deletedBy = deletedBy || null
  save(docs)
  return true
}

function permanentDelete(id) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return false
  const doc = docs[idx]
  // delete physical file if exists (only on hard delete)
  if (doc.filePath && fs.existsSync(doc.filePath)) {
    try { fs.unlinkSync(doc.filePath) } catch {}
  }
  docs.splice(idx, 1)
  save(docs)
  return true
}

function restore(id) {
  const docs = load()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return null
  docs[idx].deletedAt = null
  docs[idx].deletedBy = null
  save(docs)
  return publicDoc(docs[idx])
}

function getDeleted() {
  return load().filter(d => d.deletedAt).map(d => publicDoc(d))
}

function getFilePath(id) {
  const doc = load().find(d => d.id === id)
  return doc ? doc.filePath : null
}

// Strip filePath from public responses (internal path)
function publicDoc(doc) {
  const { filePath, ...rest } = doc
  return rest
}

ensureDir()

// ── Seed: Architekturdokumentation als admin-intern Guidance ─────────────────

const ARCH_DOCS_ROOT = path.join(__dirname, '../../docs/architecture')
const PROJECT_ROOT   = path.join(__dirname, '../../')

const ARCH_SEED = [
  {
    seedId:   'seed_readme',
    title:    { de: 'ISMS Builder – Projektübersicht (README)',             en: 'ISMS Builder – Project Overview (README)',                        fr: 'ISMS Builder – Vue d\'ensemble du projet (README)',        nl: 'ISMS Builder – Projectoverzicht (README)' },
    srcFile:  path.join(PROJECT_ROOT, 'README.md'),
  },
  {
    seedId:   'seed_contributing',
    title:    { de: 'Beitrag leisten – Developer Guide (CONTRIBUTING)',     en: 'Contributing – Developer Guide (CONTRIBUTING)',                   fr: 'Contribuer – Guide développeur (CONTRIBUTING)',           nl: 'Bijdragen – Ontwikkelaarshandleiding (CONTRIBUTING)' },
    srcFile:  path.join(PROJECT_ROOT, 'CONTRIBUTING.md'),
  },
  {
    seedId:   'seed_c4',
    title:    { de: 'Architektur-Diagramme (C4 Model)',                    en: 'Architecture Diagrams (C4 Model)',                                fr: 'Diagrammes d\'architecture (Modèle C4)',                   nl: 'Architectuurdiagrammen (C4-model)' },
    srcFile:  path.join(ARCH_DOCS_ROOT, 'c4-diagrams.md'),
  },
  {
    seedId:   'seed_datamodel',
    title:    { de: 'Datenmodell – JSON-Schemas aller Module',              en: 'Data Model – JSON Schemas of All Modules',                        fr: 'Modèle de données – Schémas JSON de tous les modules',    nl: 'Datamodel – JSON-schema\'s van alle modules' },
    srcFile:  path.join(ARCH_DOCS_ROOT, 'data-model.md'),
  },
  {
    seedId:   'seed_openapi',
    title:    { de: 'API-Referenz (OpenAPI 3.0)',                           en: 'API Reference (OpenAPI 3.0)',                                      fr: 'Référence API (OpenAPI 3.0)',                              nl: 'API-referentie (OpenAPI 3.0)' },
    srcFile:  path.join(ARCH_DOCS_ROOT, 'openapi.yaml'),
    wrapCode: 'yaml',   // wrap non-markdown files in fenced code block
  },
  {
    seedId:   'seed_isms_build_documentation',
    title:    { de: 'ISMS Builder – Vollständige Architekturdokumentation', en: 'ISMS Builder – Full Architecture Documentation',                  fr: 'ISMS Builder – Documentation d\'architecture complète',   nl: 'ISMS Builder – Volledige architectuurdocumentatie' },
    srcFile:  path.join(PROJECT_ROOT, 'docs/ISMS-build-documentation.md'),
  },
]

function seedArchitectureDocs() {
  const lang = _getDemoLang()
  const docs = load()
  let changed = false

  for (const entry of ARCH_SEED) {
    const title = typeof entry.title === 'object' ? (entry.title[lang] || entry.title.en) : entry.title
    const existing = docs.find(d => d.seedId === entry.seedId && !d.deletedAt)

    if (existing) {
      // Update title and seedLang if language changed
      if (existing.seedLang !== lang) {
        existing.title   = title
        existing.seedLang = lang
        existing.updatedAt = new Date().toISOString()
        changed = true
      }
      continue
    }

    if (!fs.existsSync(entry.srcFile)) continue

    let content = fs.readFileSync(entry.srcFile, 'utf8')
    if (entry.wrapCode) {
      content = `\`\`\`${entry.wrapCode}\n${content}\n\`\`\``
    }

    docs.push({
      id:          'guid_arch_' + entry.seedId,
      seedId:      entry.seedId,
      seedLang:    lang,
      category:    'admin-intern',
      title,
      type:        'markdown',
      content,
      minRole:     'admin',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      deletedAt:   null,
      deletedBy:   null,
      createdBy:   'system',
      linkedControls: [],
      linkedPolicies: [],
    })
    changed = true
  }

  if (changed) save(docs)
}

const DEMO_GUIDE_SEED_ID = 'seed_demo_overview'
const DEMO_GUIDE_CONTENT = `# Demo-Betrieb – Übersicht & Übergabe in den Produktivbetrieb

> Dieser Beitrag erscheint automatisch, solange das System im Demo-Modus betrieben wird.
> Er erklärt die vorhandenen Demo-Daten, Zugangsdaten und den Weg in den Produktivbetrieb.

---

## Demo-Zugangsdaten

| Benutzername | E-Mail              | Passwort    | Rolle         | Domäne | Besonderheiten                      |
|---|---|---|---|---|---|
| admin        | admin@example.com   | adminpass   | Administrator | Global | Voller Zugriff, CISO + DSO-Funktion |
| alice        | alice@it.example    | alicepass   | Abteilungsleiter | IT  | Zugriff auf Guidance & Risiken      |
| bob          | bob@hr.example      | bobpass     | Leser         | HR     | Nur-Lese-Zugriff                    |

> **Sicherheitshinweis:** Diese Passwörter sind öffentlich bekannt. Vor dem Produktiveinsatz müssen alle Passwörter geändert werden.

---

## Vorhandene Demo-Daten

Das System enthält realistische Beispieldaten für folgende Module:

| Modul | Demo-Inhalt |
|---|---|
| **Richtlinien (Templates)** | Informationssicherheitsrichtlinie, Passwort-Policy, BYOD-Richtlinie, Backup-Policy, Zugangskontroll-Policy (je als Draft / Review / Approved) |
| **SoA** | 313 Controls über 8 Frameworks (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — alle bearbeitbar |
| **Risikomanagement** | 12 realistische Risiken mit Multi-Framework-Verlinkung (Ransomware, Phishing, Insider-Threat, Supply-Chain-Angriff u.a.) |
| **GDPR & Datenschutz** | Verarbeitungsverzeichnis (VVT), Auftragsverarbeitungsverträge (AV), TOMs, DSFA-Einträge, 72h-Timer-Demo |
| **Assets** | 8 Unternehmens-Assets (Server, Workstations, ERP, Cloud-Services, Netzwerkinfrastruktur) mit Klassifizierung |
| **Lieferketten** | 6 Lieferanten (Microsoft, DATEV, SAP, Cisco, AWS EMEA, Hetzner) inkl. NIS2/EUCS-Verlinkung |
| **BCM / BCP** | 8 Business-Impact-Analysen, 7 Continuity-Pläne, 6 Übungen |
| **Governance** | 3 Management-Reviews mit Maßnahmen und Meetingprotokollen |
| **Training** | 3 Schulungsmaßnahmen (ISO-Awareness, DSGVO, Phishing-Simulation) |
| **Rechtliches (Legal)** | 3 Verträge, 2 NDAs, 2 Datenschutzrichtlinien |
| **Sicherheitsziele** | 4 KPI-Ziele mit Fortschrittsbalken (Vulnerability-Response, Patch-Compliance, Phishing-Rate, Awareness) |
| **Vorfälle (Inbox)** | 10 Demo-Meldungen aus dem öffentlichen Vorfall-Meldeformular |
| **Guidance** | Systemhandbuch, Rollen-Dokumentation, Policy-Prozesse, SoA-Audit-Guide |

---

## Übergang in den Produktivbetrieb

### Schritt-für-Schritt

1. **Admin-Konsole öffnen** → Tab **Wartung**
2. **Demo-Reset durchführen:**
   - Sektion "Demo-Reset" anklicken
   - Im Bestätigungs-Dialog das Wort \`RESET\` eintippen
   - Das System exportiert automatisch alle Demo-Daten als JSON-Download (Backup)
   - Alle Moduldaten werden geleert, alle Benutzer außer \`admin\` gelöscht
   - Admin-Passwort wird auf \`adminpass\` zurückgesetzt, 2FA deaktiviert
3. **Auf die Login-Seite weitergeleitet** — der gelbe Banner bestätigt den erfolgreich abgeschlossenen Reset
4. **Mit \`admin@example.com\` / \`adminpass\` anmelden** — Banner verschwindet, System ist produktionsbereit
5. **Sofort Passwort ändern:** Einstellungen → Passwort ändern
6. **2FA einrichten:** Einstellungen → 2FA aktivieren
7. **Eigene Benutzer anlegen:** Admin-Konsole → Tab Benutzer
8. **Eigene Inhalte erstellen:** alle Module sind leer und einsatzbereit

### Was bleibt nach dem Reset erhalten?

| Erhalten | Geleert |
|---|---|
| SoA-Controls (alle 313) | Templates / Policies |
| Dropdown-Listen | Risiken |
| Organisations-Einstellungen | Assets, BCM, Governance |
| (Admin-User) | Lieferanten, Legal, Training |
| | GDPR-Daten, Guidance |
| | Audit-Log, Sicherheitsziele |

---

## Demo-Daten wiederherstellen

Falls die Demo erneut gezeigt werden soll:

1. **Admin-Konsole → Wartung → "Demo-Daten importieren"**
2. Die beim Demo-Reset heruntergeladene JSON-Datei auswählen
3. Alle Moduldaten werden wiederhergestellt
4. alice (alice@it.example / alicepass) und bob (bob@hr.example / bobpass) werden ohne 2FA neu angelegt
5. Der admin-Account bleibt unverändert

---

## Weitere Informationen

- **Architekturdokumentation & API-Referenz:** Guidance → Admin-intern
- **Rollenbeschreibungen:** Guidance → Rollen & Verantwortlichkeiten
- **Projektseite:** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Lizenz:** GNU Affero General Public License v3.0 (AGPL-3.0)
`

function seedDemoDoc() {
  const docs = load()
  let changed = false
  const existing = docs.find(d => d.seedId === DEMO_GUIDE_SEED_ID && !d.deletedAt)
  if (!existing) {
    docs.unshift({
      id:             'guid_demo_overview',
      seedId:         DEMO_GUIDE_SEED_ID,
      category:       'systemhandbuch',
      title:          'Demo-Betrieb – Übersicht & Übergabe in den Produktivbetrieb',
      type:           'markdown',
      content:        DEMO_GUIDE_CONTENT,
      pinOrder:       1,
      minRole:        null,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
      deletedAt:      null,
      deletedBy:      null,
      createdBy:      'system',
      linkedControls: [],
      linkedPolicies: [],
    })
    changed = true
  } else if (existing.pinOrder == null) {
    existing.pinOrder = 1
    changed = true
  }
  // pinOrder 5 für bestehenden Systemhandbuch-Beitrag setzen (falls noch nicht gesetzt)
  const sysDoc = docs.find(d => d.id === 'guid_system_001' && !d.deletedAt)
  if (sysDoc && sysDoc.pinOrder == null) { sysDoc.pinOrder = 5; changed = true }
  if (changed) save(docs)
}

// ── Rollen-Bedienungsanleitungen ─────────────────────────────────────────────

const ROLE_GUIDES = [
  {
    seedId:   'seed_guide_ciso',
    id:       'guid_guide_ciso',
    pinOrder: 10,
    title:    'Bedienungsanleitung: CISO / Informationssicherheitsbeauftragter (ISB)',
    minRole:  null,
    content: `# Bedienungsanleitung: CISO / ISB

Der CISO (Chief Information Security Officer) bzw. Informationssicherheitsbeauftragte (ISB) trägt die Gesamtverantwortung für das ISMS. Diese Anleitung erklärt die wichtigsten Module und täglichen Aufgaben.

---

## Zuständige Module im Überblick

| Modul | Aufgabe | Wo im System |
|---|---|---|
| **Risikomanagement** | Risiken erfassen, bewerten, behandeln | Menü: Risiken |
| **SoA** | Controls bewerten, Anwendbarkeit & Status pflegen | Menü: SoA |
| **Sicherheitsziele** | KPIs definieren, Fortschritt verfolgen | Menü: Sicherheitsziele |
| **Vorfälle (CISO-Inbox)** | Gemeldete Sicherheitsvorfälle bearbeiten | Menü: Vorfälle |
| **Lieferketten** | Lieferanten überwachen, NIS2-Pflichten | Menü: Lieferketten |
| **BCM / BCP** | Business Impact Analysen, Pläne, Übungen | Menü: BCM |
| **Governance** | Management-Reviews, Maßnahmenpakete | Menü: Governance |
| **Reports** | Compliance-Matrix, Gap-Report, CSV-Export | Menü: Reports |
| **Einstellungen (CISO)** | SLA, Meldepflicht-Schwelle, Eskalations-E-Mail | Menü: Einstellungen |

---

## Tagesgeschäft – Typische Aufgaben

### Risiken bewerten
1. **Risiken → Neue Risiko** — Bedrohung, Wahrscheinlichkeit (1–5), Auswirkung (1–5) eintragen
2. Score = Wahrscheinlichkeit × Auswirkung (automatisch berechnet)
3. **Behandlungsmaßnahmen** per Klick auf einen Risikoeintrag → Tab "Behandlung"
4. Verknüpfung mit SoA-Controls über "🔗 Verknüpfungen" im Bearbeitungsformular

### SoA-Controls pflegen
1. **SoA → Framework-Tab** wählen (ISO 27001, NIS2, EUCS, BSI …)
2. Control anklicken → Status setzen (applicable / not-applicable / partial)
3. Begründung und Maßnahmen eintragen
4. **Inline-Edit:** Doppelklick auf ein Feld für schnelle Änderungen

### NIS2-Meldepflicht (72h-Frist)
- Sicherheitsvorfälle mit "Meldepflichtig"-Status in CISO-Inbox → BSI-Meldung vorbereiten
- Meldepflicht-Schwelle in **Einstellungen → CISO/ISB** konfigurieren
- Timer läuft ab Erfassung; Eskalations-E-Mail automatisch nach SLA

### Management-Review vorbereiten
1. **Governance → Management-Review → Neuer Review**
2. Tagesordnung, Teilnehmer, Beschlüsse eintragen
3. Maßnahmen direkt im Review verknüpfen
4. **Reports → Compliance-Matrix** als Anlage zum Review exportieren (CSV)

---

## CISO-Einstellungen konfigurieren
**Einstellungen → Abschnitt "CISO / ISB":**
- Eskalations-E-Mail (Benachrichtigung bei kritischen Vorfällen)
- Response-SLA in Stunden
- Meldepflicht-Schwelle (ab welchem Risikoscore wird NIS2-Meldung ausgelöst)
- Meldepflichtige Vorfallsarten

---

## Reports & Nachweise
| Report | Aufruf | Format |
|---|---|---|
| Compliance-Matrix | Reports → Compliance-Matrix | Tabelle + CSV |
| Gap-Report (fehlende Controls) | Reports → Gap-Report | Tabelle + CSV |
| Framework-Übersicht | Reports → Framework | Tabelle |
| Risiko-Liste | Risiken → Export (CSV) | CSV |

---

## Hinweise zur Weisungsunabhängigkeit
Der CISO/ISB berichtet direkt an die Geschäftsführung (ISO 27001 Kap. 5.1).
Die Funktion darf nicht in Konflikt mit operativen IT-Aufgaben stehen.
`,
  },
  {
    seedId:   'seed_guide_dsb',
    id:       'guid_guide_dsb',
    pinOrder: 20,
    title:    'Bedienungsanleitung: DSB / Datenschutzbeauftragter (GDPO)',
    minRole:  null,
    content: `# Bedienungsanleitung: DSB / Datenschutzbeauftragter (GDPO)

Der Datenschutzbeauftragte (DSB / GDPO) überwacht die Einhaltung der DSGVO und verwandter Datenschutzvorschriften.

> **Weisungsunabhängigkeit:** Der DSB ist gemäß Art. 38 Abs. 3 DSGVO bei der Ausübung seiner Aufgaben weisungsfrei und darf wegen seiner Aufgabenerfüllung nicht abberufen oder benachteiligt werden. Er berichtet unmittelbar an die höchste Managementebene.

---

## Zuständige Module im Überblick

| Modul | Aufgabe | Wo im System |
|---|---|---|
| **VVT** | Verarbeitungsverzeichnis (Art. 30 DSGVO) | Datenschutz → VVT |
| **AV-Verträge** | Auftragsverarbeitungsverträge prüfen | Datenschutz → AV |
| **DSFA** | Datenschutz-Folgenabschätzung (Art. 35) | Datenschutz → DSFA |
| **TOMs** | Technische & org. Maßnahmen dokumentieren | Datenschutz → TOMs |
| **DSAR** | Betroffenenrechte, Auskunftsersuchen | Datenschutz → DSAR |
| **72h-Timer** | Meldepflicht-Fristenüberwachung | Datenschutz → Vorfälle |
| **Löschprotokoll** | Art. 17 Löschungsnachweis | Datenschutz → Löschprotokoll |
| **Datenschutzrichtlinien** | Aktuelle Policies verwalten | Rechtliches → Policies |
| **Einstellungen (GDPO)** | DSAR-Fristen, DSB-Kontakt, Behörden | Einstellungen |

---

## Tagesgeschäft – Typische Aufgaben

### Verarbeitungsverzeichnis pflegen (VVT)
1. **Datenschutz → VVT → Neuer Eintrag**
2. Pflichtfelder: Bezeichnung, Zweck, Rechtsgrundlage (Art. 6/9), Datenkategorien, Betroffene, Empfänger, Löschfristen
3. Drittlandübermittlung: Land + Garantie (SCCs, BCRs) eintragen
4. CSV-Export über den "CSV"-Button in der Filter-Leiste

### DSFA durchführen (Art. 35 DSGVO)
1. **Datenschutz → DSFA → Neue Abschätzung**
2. Schwellenwert-Prüfung: Risikobewertung für Rechte und Freiheiten
3. Vorgesehene Maßnahmen und Restrisiko dokumentieren
4. Status: Entwurf → In Prüfung → Abgeschlossen

### 72h-Meldepflicht verwalten
1. Datenschutzverletzung in **Datenschutz → Vorfälle** erfassen
2. System startet automatisch 72h-Countdown ab Erfassung
3. Bei Ablauf: Meldung an Aufsichtsbehörde dokumentieren
4. Behörden-Kontakt in **Einstellungen → DSB/GDPO** hinterlegen

### DSAR bearbeiten (Auskunftsersuchen)
1. **Datenschutz → DSAR → Neues Ersuchen**
2. Fristberechnung automatisch nach GDPO-Einstellungen (Standard: 30 Tage, verlängerbar auf 90 Tage)
3. Status: Eingegangen → In Bearbeitung → Abgeschlossen / Abgelehnt

---

## GDPO-Einstellungen konfigurieren
**Einstellungen → Abschnitt "DSB / GDPO":**
- DSAR-Standardfrist (Tage)
- Verlängerte Frist (bei komplexen Ersuchen)
- Zuständige Datenschutzbehörde
- Standard-Antworttext für Betroffene

---

## Nachweise & Dokumentation
| Dokument | Aufruf | Art. DSGVO |
|---|---|---|
| Verarbeitungsverzeichnis (CSV) | VVT → CSV exportieren | Art. 30 |
| DSFA-Bericht | DSFA → Detailansicht | Art. 35 |
| AV-Vertragsübersicht | Datenschutz → AV | Art. 28 |
| TOM-Nachweis | Datenschutz → TOMs | Art. 32 |
| Löschprotokoll | Datenschutz → Löschprotokoll | Art. 17 |
`,
  },
  {
    seedId:   'seed_guide_revision',
    id:       'guid_guide_revision',
    pinOrder: 30,
    title:    'Bedienungsanleitung: Interne Revision',
    minRole:  null,
    content: `# Bedienungsanleitung: Interne Revision

Die Interne Revision prüft die Wirksamkeit des ISMS und der internen Kontrollsysteme unabhängig von operativen Stellen.

> **Weisungsunabhängigkeit:** Die Interne Revision ist gemäß AktG § 91 Abs. 2, IDW PS 321 und IIA-Standard 1100 funktional und organisatorisch unabhängig. Sie untersteht direkt dem Vorstand / der Geschäftsführung bzw. dem Prüfungsausschuss des Aufsichtsrats und ist von operativen Bereichen weisungsfrei.

---

## Zuständige Module im Überblick

| Modul | Prüfgegenstand | Wo im System |
|---|---|---|
| **SoA** | Umsetzungsstatus aller Controls | Menü: SoA |
| **Reports** | Compliance-Matrix, Gap-Bericht, Review-Zyklen | Menü: Reports |
| **Audit-Log** | Nachvollziehbarkeit aller Systemaktionen | Admin-Konsole → Audit-Log |
| **Risikomanagement** | Vollständigkeit Risikoregister, Behandlungsstand | Menü: Risiken |
| **Governance** | Management-Review-Protokolle, Maßnahmenstand | Menü: Governance |
| **Training** | Schulungsnachweis, Abdeckungsgrad | Menü: Training |
| **BCM** | Übungsberichte, BIA-Aktualität | Menü: BCM |
| **Einstellungen (Revision)** | Prüfungsumfang, Rhythmus, Berichtswesen | Einstellungen |

---

## Prüfungshandlungen – Typische Aufgaben

### Compliance-Stand erheben
1. **Reports → Compliance-Matrix:** Ampeldarstellung Control × Gesellschaft
2. Rote Felder = fehlende Umsetzung → Nachfragen beim Modulverantwortlichen
3. **Reports → Gap-Report:** alle Controls mit Status "not applicable" oder ohne Maßnahme
4. CSV-Export als Arbeitspapier

### SoA-Controls prüfen
1. **SoA → Framework auswählen** (ISO 27001, NIS2, BSI …)
2. Filter "not-applicable" setzen → Begründungen auf Plausibilität prüfen
3. Stichproben: Controls "applicable" mit Status "planned/partial" → Umsetzungsnachweis anfordern

### Audit-Log auswerten (Admin-Zugang erforderlich)
1. **Admin-Konsole → Audit-Log**
2. Filter nach Zeitraum, Benutzer oder Aktion
3. Kritische Aktionen: permanent_delete, demo_reset, settings-Änderungen

### Risikobewertung nachvollziehen
1. **Risiken → Liste:** Score, Datum der letzten Bearbeitung, Behandlungsstatus prüfen
2. Unbehandelte Hochrisiken (Score ≥ 15) identifizieren
3. Verknüpfte Controls im Detail-Panel nachvollziehen

### Management-Reviews beurteilen
1. **Governance → Management Reviews:** Vollständigkeit der Tagesordnung, Beschlussfassung
2. Maßnahmenplan: offene Punkte, Verantwortliche, Fälligkeiten
3. Lücken zwischen Review-Beschlüssen und SoA-Umsetzung dokumentieren

---

## Revisions-Einstellungen konfigurieren
**Einstellungen → Abschnitt "Interne Revision":**
- Revisionsleiter, E-Mail
- Prüfungsumfang (Freitext)
- Berichtsempfänger (GF / Aufsichtsrat / Prüfungsausschuss)
- Prüfungsrhythmus, letztes / nächstes Audit-Datum
- Externer Wirtschaftsprüfer

---

## Prüfungsberichte & Arbeitspapiere
| Nachweis | Abruf | Hinweis |
|---|---|---|
| Compliance-Matrix | Reports → Compliance-Matrix + CSV | Stichtag festhalten |
| Gap-Report | Reports → Gap-Report + CSV | Delta zum Vorjahr dokumentieren |
| Risiko-Export | Risiken → CSV | Vollständigkeitsprüfung |
| Audit-Log-Export | Admin → Audit-Log → CSV | Manipulationsschutz beachten |
| Training-Nachweise | Training → Liste | Abdeckungsgrad je Abteilung |
`,
  },
  {
    seedId:   'seed_guide_qmb',
    id:       'guid_guide_qmb',
    pinOrder: 40,
    title:    'Bedienungsanleitung: QMB / Qualitätsmanagementbeauftragter',
    minRole:  null,
    content: `# Bedienungsanleitung: QMB / Qualitätsmanagementbeauftragter

Der Qualitätsmanagementbeauftragte (QMB) koordiniert das QMS nach ISO 9001 bzw. branchenspezifischen Standards (IATF 16949, ISO 13485, AS9100) und stellt die Integration mit dem ISMS sicher.

---

## Zuständige Module im Überblick

| Modul | Aufgabe | Wo im System |
|---|---|---|
| **SoA – ISO 9001** | ISO 9001:2015 Controls bewerten | SoA → Tab "ISO 9001" |
| **Risikomanagement** | Risiken nach ISO 9001 Kap. 6.1 | Menü: Risiken |
| **Governance** | Management-Reviews (ISO 9001 Kap. 9.3) | Menü: Governance |
| **Training** | Schulungsmaßnahmen, Kompetenznachweis | Menü: Training |
| **Sicherheitsziele** | QM-Ziele mit KPI-Tracking | Menü: Sicherheitsziele |
| **Richtlinien** | QM-Handbuch, Verfahrensanweisungen | Menü: Richtlinien |
| **Reports** | Compliance-Matrix ISO 9001, Review-Zyklen | Menü: Reports |
| **Einstellungen (QMB)** | QMS-Scope, Norm, Zertifizierungsdaten | Einstellungen |

---

## Tagesgeschäft – Typische Aufgaben

### ISO 9001 Controls pflegen
1. **SoA → Tab "ISO 9001"** aufrufen
2. Controls nach aktuellem Umsetzungsstand bewerten (applicable / partial / not-applicable)
3. Besonders relevant: Kap. 4 (Kontext), 6.1 (Risiken), 7 (Unterstützung), 8 (Betrieb), 9 (Bewertung), 10 (Verbesserung)
4. Verknüpfung mit Richtlinien über "🔗 Verknüpfungen"

### QM-Risiken verwalten
1. **Risiken → Neue Risiko** — ISO 9001 Controls in "🔗 Verknüpfungen" verknüpfen
2. Qualitätsbezogene Risiken: Lieferantenausfall, Produktfehler, Kompetenzlücken
3. Behandlungsmaßnahmen: FMEA-Ergebnisse als Maßnahmen dokumentieren

### QM-Ziele mit KPIs verfolgen
1. **Sicherheitsziele → Neue Ziel** (gilt für alle ISMS/QM-Ziele)
2. Zielwert, Ist-Wert, Einheit (%, Anzahl, Tage) und Frist definieren
3. Regelmäßig aktualisieren — Fortschrittsbalken zeigt Erreichungsgrad

### Management-Review (ISO 9001 Kap. 9.3)
1. **Governance → Management-Review → Neuer Review**
2. Pflichtthemen ISO 9001: Kundenfeedback, Audit-Ergebnisse, Zielstatus, Ressourcen
3. Beschlüsse als Maßnahmen hinterlegen (Verantwortlicher + Fälligkeitsdatum)
4. Reports → Review-Zyklen als Vorbereitung nutzen

### Schulungsmaßnahmen verwalten
1. **Training → Neue Maßnahme** — Titel, Thema, Zielgruppe, Termin, Pflicht (ja/nein)
2. Abschluss & Teilnahmequote dokumentieren
3. Kompetenznachweis für ISO 9001 Kap. 7.2 sichergestellt

---

## QMB-Einstellungen konfigurieren
**Einstellungen → Abschnitt "QMB / Qualitätsmanagement":**
- QMB-Name und E-Mail
- QMS-Scope (Anwendungsbereich)
- Geltende Norm (ISO 9001 / IATF 16949 / ISO 13485 / AS9100)
- Zertifizierungsstelle, Zertifikat-Gültigkeit
- Audit-Termine, Rezertifizierungsdatum

---

## Reports & Zertifizierungsunterlagen
| Dokument | Abruf | ISO 9001 Kap. |
|---|---|---|
| Compliance-Matrix ISO 9001 | Reports → Compliance-Matrix (Framework: ISO 9001) + CSV | 9.1.3 |
| Zielerreichung | Sicherheitsziele → Übersicht | 9.1 |
| Training-Nachweis | Training → Liste | 7.2 |
| Management-Review-Protokoll | Governance → Review → Detail | 9.3 |
| Risikobewertung | Risiken → Export CSV | 6.1 |
`,
  },
  {
    seedId:   'seed_guide_abtlg',
    id:       'guid_guide_abtlg',
    pinOrder: 50,
    title:    'Bedienungsanleitung: Abteilungsleiter / Fachverantwortlicher',
    minRole:  null,
    content: `# Bedienungsanleitung: Abteilungsleiter / Fachverantwortlicher

Diese Anleitung richtet sich an Abteilungsleiter (dept_head) und Fachverantwortliche, die für ihren Bereich Richtlinien, Risiken und Schulungen pflegen.

---

## Deine Rolle im ISMS

| Aufgabe | Modul | Zugriff |
|---|---|---|
| Richtlinien für deinen Bereich pflegen | Richtlinien | Lesen + Erstellen/Bearbeiten |
| Risiken melden und mitbewerten | Risikomanagement | Lesen + Bearbeiten |
| Schulungsmaßnahmen planen | Training | Lesen + Bearbeiten |
| Assets deines Bereichs verwalten | Asset-Management | Lesen + Bearbeiten |
| SoA-Controls kommentieren | SoA | Lesen (+ Inline-Edit mit contentowner) |
| Vorfälle melden | Öffentl. Meldeformular / Vorfälle | Melden + Lesen |

---

## Tagesgeschäft – Typische Aufgaben

### Richtlinie bearbeiten
1. **Richtlinien** im Menü aufrufen
2. Eigene Richtlinie aus der Baumstruktur auswählen
3. **Bearbeiten**-Button → Inhalt aktualisieren, Datum "Nächstes Review" setzen
4. Status auf **"In Review"** setzen, damit CISO/ISB die Freigabe erteilt
5. Nach Freigabe durch Contentowner erscheint Status **"Approved"**

### Risiko melden
1. **Risiken → Neues Risiko**
2. Bedrohung beschreiben, Eintrittswahrscheinlichkeit und Auswirkung schätzen (1–5)
3. Vorgeschlagene Maßnahme eintragen
4. Eigene Abteilung als "Owner" angeben

### Schulung planen
1. **Training → Neue Maßnahme**
2. Thema, Zielgruppe (Abteilung), Termin, Pflichtschulungs-Flag setzen
3. Nach Durchführung: Abschluss und Teilnehmeranzahl eintragen

### Sicherheitsvorfall melden
- **Von innen (eingeloggt):** Vorfälle → Neuer Vorfall
- **Von außen / anonym:** Login-Seite → "Sicherheitsvorfall melden" (kein Login nötig)
- Pflichtfelder: E-Mail, Art des Vorfalls, Beschreibung

---

## Dashboards & Übersichten nutzen

Das **Dashboard** zeigt dir:
- Aktuelle Risiken in deinem Bereich (Top 5)
- Anstehende Reviews und Fälligkeiten (14-Tage-Vorschau)
- Offene DSAR und 72h-Meldungen (falls GDPR-Zugriff)
- KPI-Karten aller aktiven Module

Der **Kalender** zeigt alle Fälligkeiten:
- Review-Termine für Richtlinien
- Schulungstermine
- Asset-EoL-Termine
- Vertragslaufzeiten

---

## Was du NICHT tun kannst (und warum)

| Gesperrte Aktion | Warum |
|---|---|
| Richtlinien genehmigen (Approved setzen) | Nur Contentowner / Admin (4-Augen-Prinzip) |
| Benutzer anlegen | Nur Admin |
| Richtlinien endgültig löschen | Nur Admin (Papierkorb vorhanden) |
| SoA-Controls genehmigen | Nur CISO / Contentowner |
| Admin-Konsole aufrufen | Nur Admin |

---

## Tipps

- **Namenssuche:** Suchfeld in der Topbar findet Richtlinien, Risiken und Controls global
- **Verknüpfungen:** In jedem Formular unter "🔗 Verknüpfungen" kannst du SoA-Controls und Richtlinien verknüpfen — hilfreich für den Compliance-Nachweis
- **Guidance:** Diese Seite enthält weitere Anleitungen für alle Module
`,
  },
]

function seedRoleGuides() {
  const docs = load()
  let changed = false
  for (const guide of ROLE_GUIDES) {
    const existing = docs.find(d => d.seedId === guide.seedId && !d.deletedAt)
    if (!existing) {
      docs.push({
        id:             guide.id,
        seedId:         guide.seedId,
        category:       'rollen',
        title:          guide.title,
        type:           'markdown',
        content:        guide.content,
        pinOrder:       guide.pinOrder,
        minRole:        guide.minRole,
        createdAt:      new Date().toISOString(),
        updatedAt:      new Date().toISOString(),
        deletedAt:      null,
        deletedBy:      null,
        createdBy:      'system',
        linkedControls: [],
        linkedPolicies: [],
      })
      changed = true
    } else {
      // Migrate: move docs accidentally placed in systemhandbuch to rollen
      if (existing.category === 'systemhandbuch') { existing.category = 'rollen'; changed = true }
      if (existing.pinOrder == null) { existing.pinOrder = guide.pinOrder; changed = true }
    }
  }
  if (changed) save(docs)
}

// ── SoA & Audit Guide ────────────────────────────────────────────────────────

const SOA_GUIDE_SEED_ID = 'seed_soa_audit_guide'

const SOA_GUIDE_CONTENT = `# SoA & Audit – Leitfaden

Dieses Dokument erklärt die Nutzung des Statement of Applicability (SoA) und die Vorbereitung auf interne und externe Audits mit ISMS Builder.

---

## Was ist das SoA?

Das Statement of Applicability (SoA) ist ein Pflichtdokument nach ISO 27001 Kap. 6.1.3. Es listet alle relevanten Controls auf und begründet:
- **Warum** ein Control anwendbar ist (oder nicht)
- **Welche Maßnahmen** umgesetzt wurden
- **Welchen Umsetzungsstand** das Control hat

---

## Frameworks im Überblick

| Framework | Kürzel | Anzahl Controls | Hinweis |
|---|---|---|---|
| ISO 27001:2022 | ISO | 93 | ISO-Copyright — eigene Kontrolltexte erforderlich |
| BSI IT-Grundschutz | BSI | 88 | Frei verfügbar (bsi.bund.de) |
| NIS2-Richtlinie | NIS2 | 10 | EU-Verordnung, öffentlich |
| EUCS (EU Cloud) | EUCS | 44 | ENISA-Standard |
| EU AI Act | EUAI | 20 | EU-Verordnung, öffentlich |
| ISO 9001:2015 | ISO9001 | 36 | ISO-Copyright |
| ISO 9000:2015 | ISO9000 | 10 | ISO-Copyright |
| Cyber Resilience Act | CRA | 12 | EU-Verordnung, öffentlich |

> **Hinweis:** ISO-Controls sind nicht im Lieferumfang enthalten. Eigene Controls können über \`scripts/import-iso-controls.sh\` importiert werden.

---

## SoA-Control bearbeiten

1. **SoA → Framework-Tab** wählen (z.B. ISO 27001)
2. Control anklicken → Detail-Panel öffnet sich rechts
3. Felder ausfüllen:
   - **Anwendbarkeit:** applicable / not-applicable / partial
   - **Status:** planned / in-progress / implemented / not-applicable
   - **Begründung:** Warum applicable oder ausgeschlossen?
   - **Maßnahmen:** Was wurde konkret umgesetzt?
4. **Inline-Edit:** Doppelklick auf ein Feld für schnelle Änderungen direkt in der Tabelle
5. **Verknüpfungen:** "🔗 Verknüpfungen" → Controls mit Policies und Risiken verbinden

---

## Filter & Suche

| Filter | Beschreibung |
|---|---|
| Status: not-applicable | Alle ausgeschlossenen Controls — Begründungen prüfen |
| Status: planned | Geplante aber nicht umgesetzte Controls — Priorität prüfen |
| Status: partial | Teilweise umgesetzt — Maßnahmenplan vervollständigen |
| Suche | Volltextsuche über Control-ID, Titel und Begründung |

---

## Cross-Mapping

Das Cross-Mapping zeigt thematische Überschneidungen zwischen Frameworks:
- **SoA → Cross-Mapping** (Tab)
- 20 Themengruppen (z.B. "Zugangskontrolle", "Verschlüsselung")
- Zeigt welche Controls aus verschiedenen Frameworks dasselbe Thema abdecken
- Hilft Doppelarbeit zu vermeiden bei gleichzeitiger ISO 27001 + NIS2 + BSI-Compliance

---

## Audit-Vorbereitung

### Interne Vorbereitung
1. **Reports → Compliance-Matrix** aufrufen
   - Spalten: SoA-Controls (nach Framework)
   - Zeilen: Gesellschaften / Tochterunternehmen
   - Ampelfarben: grün = implemented, gelb = partial, rot = not-applicable / planned
2. **Reports → Gap-Report** — alle Controls mit fehlendem Umsetzungsnachweis
3. **Reports → Framework-Übersicht** — Prozentualer Umsetzungsstand je Framework
4. CSV-Export für Arbeitspapiere

### Für externe Zertifizierungsaudits (ISO 27001)

**Stage 1 (Dokumentenprüfung):**
- SoA exportieren (JSON → eigene Aufbereitung)
- Alle "not-applicable"-Begründungen nachvollziehbar dokumentieren
- Policies auf Status "approved" prüfen (kein Entwurf als Nachweis)
- VVT (DSGVO) auf Aktualität prüfen

**Stage 2 (Vor-Ort-Audit):**
- Risikomanagement: Alle Risiken bewertet, Behandlungen dokumentiert
- Training-Nachweise: Abschlussquoten, Zertifikate
- BCM-Übungsberichte: Letzte Übung < 12 Monate
- Audit-Log: Nachvollziehbarkeit aller Änderungen (Admin → Audit-Log)
- Management-Review-Protokoll (Governance → Reviews)

---

## RACI für SoA-Pflege

| Aktivität | CISO | DSB | QMB | Revision | Abtlg. |
|---|---|---|---|---|---|
| Controls bewerten | **R** | C | C | I | C |
| Begründungen schreiben | **R** | A (GDPR-Controls) | A (ISO 9001) | I | — |
| Maßnahmen dokumentieren | A | — | — | — | **R** |
| SoA genehmigen | **A** | — | — | I | — |
| Audit-Vorbereitung | **R** | C | C | **R** | C |

> R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## Häufige Fehler im SoA

| Fehler | Auswirkung | Lösung |
|---|---|---|
| Controls als "not-applicable" ohne Begründung | Audit-Finding | Begründung eintragen |
| Status "planned" seit > 12 Monaten | Non-Conformity | Maßnahmenplan erstellen, Verantwortlichen benennen |
| Keine Verknüpfung Control → Policy | Lücke im Nachweis | "🔗 Verknüpfungen" im Control pflegen |
| SoA nicht an aktuellen Scope angepasst | Certification Risk | Scope in Org-Einstellungen aktualisieren |
`

// ── Language helper ───────────────────────────────────────────────────────────

function _getDemoLang() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(_BASE, '.demo_lang_set'), 'utf8'))
    const l = d.lang
    if (l && l !== 'skip') return ['de', 'en', 'fr', 'nl'].includes(l) ? l : 'en'
  } catch {}
  return 'en'
}

// NOTE: _upsertSeed updates title/content ONLY when the language changes (seedLang mismatch).
// If only the source text is changed (e.g. updated credentials, new wording) but the language
// stays the same, the existing document in guidance.json is NOT updated automatically.
// To force an update after a content-only change:
//   1. Open Guidance in the UI, delete the affected entry (soft-delete)
//   2. Admin → Papierkorb → permanently delete the entry
//   3. Restart the server — the seed function will recreate it with the new content
// This behaviour is intentional to preserve user edits to seed documents.
function _upsertSeed(docs, seedId, docData) {
  const lang = _getDemoLang()
  const existing = docs.find(d => d.seedId === seedId && !d.deletedAt)
  if (!existing) {
    docs.push({ ...docData, seedId, seedLang: lang, createdAt: nowISO(), updatedAt: nowISO(), deletedAt: null, deletedBy: null, createdBy: 'system', linkedControls: [], linkedPolicies: [] })
    return true
  }
  // update content if language changed
  if (existing.seedLang !== lang) {
    existing.title    = docData.title
    existing.content  = docData.content
    existing.seedLang = lang
    existing.updatedAt = nowISO()
    return true
  }
  let changed = false
  if (existing.pinOrder == null && docData.pinOrder != null) { existing.pinOrder = docData.pinOrder; changed = true }
  if (existing.category && docData.category && existing.category !== docData.category) { existing.category = docData.category; changed = true }
  return changed
}

// ── SoA Guide – bilingual ─────────────────────────────────────────────────────

const SOA_GUIDE = {
  de: { title: 'SoA & Audit – Leitfaden', content: SOA_GUIDE_CONTENT },
  en: { title: 'SoA & Audit – Guide', content: `# SoA & Audit – Guide

This document explains how to use the Statement of Applicability (SoA) module and how to prepare for internal and external audits using ISMS Builder.

---

## What is the SoA?

The Statement of Applicability (SoA) is a mandatory document under ISO 27001 clause 6.1.3. It lists all relevant controls and documents:
- **Why** a control is applicable (or excluded)
- **What measures** have been implemented
- **Current implementation status**

---

## Frameworks Overview

| Framework | Code | Controls | Notes |
|---|---|---|---|
| ISO 27001:2022 | ISO | 93 | ISO copyright — supply your own control text |
| BSI IT-Grundschutz | BSI | 88 | Freely available (bsi.bund.de) |
| NIS2 Directive | NIS2 | 10 | EU regulation, public |
| EUCS (EU Cloud) | EUCS | 44 | ENISA standard |
| EU AI Act | EUAI | 20 | EU regulation, public |
| ISO 9001:2015 | ISO9001 | 36 | ISO copyright |
| ISO 9000:2015 | ISO9000 | 10 | ISO copyright |
| Cyber Resilience Act | CRA | 12 | EU regulation, public |

> **Note:** ISO controls are not included. Use \`scripts/import-iso-controls.sh\` to import your own.

---

## Editing a Control

1. **SoA → Framework tab** (e.g. ISO 27001)
2. Click a control → detail panel opens on the right
3. Fill in:
   - **Applicability:** applicable / not-applicable / partial
   - **Status:** planned / in-progress / implemented / not-applicable
   - **Justification:** Why included or excluded?
   - **Measures:** What was specifically implemented?
4. **Inline edit:** Double-click any field for quick in-table edits
5. **Traceability:** "🔗 Links" → link controls to policies and risks

---

## Filters & Search

| Filter | Description |
|---|---|
| Status: not-applicable | All excluded controls — verify justifications |
| Status: planned | Planned but not yet implemented — check priority |
| Status: partial | Partially implemented — complete action plan |
| Search | Full-text over control ID, title and justification |

---

## Cross-Mapping

The cross-mapping shows thematic overlaps between frameworks:
- **SoA → Cross-Mapping** tab
- 20 topic groups (e.g. "Access Control", "Encryption")
- Shows which controls across frameworks cover the same topic
- Helps avoid duplication when targeting ISO 27001 + NIS2 + BSI simultaneously

---

## Audit Preparation

### Internal Preparation
1. **Reports → Compliance Matrix**
   - Columns: SoA controls (by framework)
   - Rows: legal entities / subsidiaries
   - Traffic light: green = implemented, yellow = partial, red = not-applicable / planned
2. **Reports → Gap Report** — all controls without an implementation record
3. **Reports → Framework Overview** — percentage completion per framework
4. CSV export for working papers

### External Certification Audits (ISO 27001)

**Stage 1 (Document review):**
- Export SoA (JSON → own formatting)
- All "not-applicable" justifications must be clear and traceable
- Policies: all must be "approved" (no drafts as evidence)
- VVT/RoPA: verify it is current

**Stage 2 (On-site audit):**
- Risk management: all risks assessed, treatments documented
- Training records: completion rates, certificates
- BCM exercise reports: last exercise < 12 months
- Audit log: full traceability of all changes (Admin → Audit Log)
- Management review minutes (Governance → Reviews)

---

## RACI for SoA Maintenance

| Activity | CISO | DPO | QMO | Audit | Dept |
|---|---|---|---|---|---|
| Assess controls | **R** | C | C | I | C |
| Write justifications | **R** | A (GDPR) | A (ISO 9001) | I | — |
| Document measures | A | — | — | — | **R** |
| Approve SoA | **A** | — | — | I | — |
| Audit preparation | **R** | C | C | **R** | C |

> R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## Common SoA Mistakes

| Mistake | Impact | Fix |
|---|---|---|
| Controls marked "not-applicable" without justification | Audit finding | Enter a justification |
| Status "planned" for > 12 months | Non-conformity | Create action plan, assign owner |
| No control → policy link | Evidence gap | Use "🔗 Links" on the control |
| SoA not aligned with current scope | Certification risk | Update scope in Org Settings |
` },
  fr: { title: 'SoA & Audit – Guide', content: `# SoA & Audit – Guide

Ce document explique comment utiliser le module de la Déclaration d'applicabilité (SoA) et comment préparer les audits internes et externes avec ISMS Builder.

---

## Qu'est-ce que la SoA ?

La Déclaration d'applicabilité (SoA) est un document obligatoire selon la clause 6.1.3 de l'ISO 27001. Elle liste tous les contrôles pertinents et documente :
- **Pourquoi** un contrôle est applicable (ou exclu)
- **Quelles mesures** ont été mises en œuvre
- **Le statut d'implémentation actuel**

---

## Vue d'ensemble des référentiels

| Référentiel | Code | Contrôles | Notes |
|---|---|---|---|
| ISO 27001:2022 | ISO | 93 | Droits d'auteur ISO — fournissez votre propre texte |
| BSI IT-Grundschutz | BSI | 88 | Disponible gratuitement (bsi.bund.de) |
| Directive NIS2 | NIS2 | 10 | Règlement UE, public |
| EUCS (Cloud UE) | EUCS | 44 | Standard ENISA |
| EU AI Act | EUAI | 20 | Règlement UE, public |
| ISO 9001:2015 | ISO9001 | 36 | Droits d'auteur ISO |
| ISO 9000:2015 | ISO9000 | 10 | Droits d'auteur ISO |
| Cyber Resilience Act | CRA | 12 | Règlement UE, public |

> **Note :** Les contrôles ISO ne sont pas inclus. Utilisez \`scripts/import-iso-controls.sh\` pour importer les vôtres.

---

## Modifier un contrôle

1. **SoA → onglet Référentiel** (ex. ISO 27001)
2. Cliquer sur un contrôle → le panneau de détail s'ouvre à droite
3. Remplir :
   - **Applicabilité :** applicable / non-applicable / partiel
   - **Statut :** planifié / en cours / implémenté / non-applicable
   - **Justification :** Pourquoi inclus ou exclu ?
   - **Mesures :** Qu'est-ce qui a été spécifiquement mis en œuvre ?
4. **Édition en ligne :** Double-cliquer sur un champ pour une modification rapide
5. **Traçabilité :** "🔗 Liens" → relier les contrôles aux politiques et aux risques

---

## Filtres & Recherche

| Filtre | Description |
|---|---|
| Statut : non-applicable | Tous les contrôles exclus — vérifier les justifications |
| Statut : planifié | Planifié mais non encore implémenté — vérifier la priorité |
| Statut : partiel | Partiellement implémenté — compléter le plan d'action |
| Recherche | Recherche plein texte sur l'ID, le titre et la justification |

---

## Correspondance croisée

La correspondance croisée montre les recoupements thématiques entre référentiels :
- **SoA → onglet Correspondance croisée**
- 20 groupes thématiques (ex. "Contrôle d'accès", "Chiffrement")
- Montre quels contrôles couvrent le même sujet dans différents référentiels
- Aide à éviter les doublons lors du ciblage simultané ISO 27001 + NIS2 + BSI

---

## Préparation à l'audit

### Préparation interne
1. **Rapports → Matrice de conformité**
   - Colonnes : contrôles SoA (par référentiel)
   - Lignes : entités juridiques / filiales
   - Feux tricolores : vert = implémenté, jaune = partiel, rouge = non-applicable / planifié
2. **Rapports → Rapport d'écarts** — tous les contrôles sans enregistrement d'implémentation
3. **Rapports → Vue d'ensemble référentiel** — taux de complétude par référentiel
4. Export CSV pour les documents de travail

### Audits de certification externe (ISO 27001)

**Étape 1 (Revue documentaire) :**
- Exporter la SoA (JSON → mise en forme personnalisée)
- Toutes les justifications "non-applicable" doivent être claires et traçables
- Politiques : toutes doivent être "approuvées" (pas de brouillons comme preuves)
- VVT/RoPA : vérifier qu'il est à jour

**Étape 2 (Audit sur site) :**
- Gestion des risques : tous les risques évalués, traitements documentés
- Enregistrements de formation : taux de complétion, certificats
- Rapports d'exercices BCM : dernier exercice < 12 mois
- Journal d'audit : traçabilité complète de toutes les modifications
- Procès-verbaux de revue de direction (Gouvernance → Revues)

---

## RACI pour la maintenance SoA

| Activité | CISO | DPO | RQ | Audit | Dept |
|---|---|---|---|---|---|
| Évaluer les contrôles | **R** | C | C | I | C |
| Rédiger les justifications | **R** | A (RGPD) | A (ISO 9001) | I | — |
| Documenter les mesures | A | — | — | — | **R** |
| Approuver la SoA | **A** | — | — | I | — |
| Préparation audit | **R** | C | C | **R** | C |

> R = Responsable, A = Accountable, C = Consulté, I = Informé

---

## Erreurs courantes dans la SoA

| Erreur | Impact | Solution |
|---|---|---|
| Contrôles "non-applicable" sans justification | Constatation d'audit | Saisir une justification |
| Statut "planifié" depuis > 12 mois | Non-conformité | Créer un plan d'action, désigner un responsable |
| Aucun lien contrôle → politique | Lacune dans les preuves | Utiliser "🔗 Liens" sur le contrôle |
| SoA non alignée avec le périmètre actuel | Risque de certification | Mettre à jour le périmètre dans les paramètres |
` },
  nl: { title: 'SoA & Audit – Handleiding', content: `# SoA & Audit – Handleiding

Dit document legt uit hoe u de Verklaring van Toepasselijkheid (SoA) gebruikt en hoe u interne en externe audits voorbereidt met ISMS Builder.

---

## Wat is de SoA?

De Verklaring van Toepasselijkheid (SoA) is een verplicht document onder ISO 27001 clausule 6.1.3. Het vermeldt alle relevante beheersmaatregelen en documenteert:
- **Waarom** een beheersmaatregel van toepassing is (of uitgesloten)
- **Welke maatregelen** zijn geïmplementeerd
- **De huidige implementatiestatus**

---

## Overzicht normen

| Norm | Code | Maatregelen | Opmerkingen |
|---|---|---|---|
| ISO 27001:2022 | ISO | 93 | ISO auteursrecht — lever uw eigen tekst aan |
| BSI IT-Grundschutz | BSI | 88 | Vrij beschikbaar (bsi.bund.de) |
| NIS2-richtlijn | NIS2 | 10 | EU-verordening, openbaar |
| EUCS (EU Cloud) | EUCS | 44 | ENISA-standaard |
| EU AI Act | EUAI | 20 | EU-verordening, openbaar |
| ISO 9001:2015 | ISO9001 | 36 | ISO auteursrecht |
| ISO 9000:2015 | ISO9000 | 10 | ISO auteursrecht |
| Cyber Resilience Act | CRA | 12 | EU-verordening, openbaar |

> **Opmerking:** ISO-maatregelen zijn niet inbegrepen. Gebruik \`scripts/import-iso-controls.sh\` om uw eigen maatregelen te importeren.

---

## Een beheersmaatregel bewerken

1. **SoA → tabblad Norm** (bijv. ISO 27001)
2. Klik op een maatregel → het detailvenster wordt rechts geopend
3. Vul in:
   - **Toepasselijkheid:** van toepassing / niet van toepassing / gedeeltelijk
   - **Status:** gepland / in uitvoering / geïmplementeerd / niet van toepassing
   - **Motivering:** Waarom opgenomen of uitgesloten?
   - **Maatregelen:** Wat is specifiek geïmplementeerd?
4. **Inline bewerken:** Dubbelklik op een veld voor snelle bewerkingen
5. **Traceerbaarheid:** "🔗 Koppelingen" → koppel maatregelen aan beleid en risico's

---

## Filters & Zoeken

| Filter | Omschrijving |
|---|---|
| Status: niet van toepassing | Alle uitgesloten maatregelen — controleer motivering |
| Status: gepland | Gepland maar nog niet geïmplementeerd — controleer prioriteit |
| Status: gedeeltelijk | Gedeeltelijk geïmplementeerd — actieplan afronden |
| Zoeken | Volledige tekst op maatregel-ID, titel en motivering |

---

## Kruisverwijzingen

De kruisverwijzing toont thematische overlappen tussen normen:
- **SoA → tabblad Kruisverwijzing**
- 20 themagroepen (bijv. "Toegangscontrole", "Versleuteling")
- Toont welke maatregelen hetzelfde onderwerp behandelen in verschillende normen
- Helpt duplicatie te vermijden bij gelijktijdige certificering ISO 27001 + NIS2 + BSI

---

## Auditvoorbereiding

### Interne voorbereiding
1. **Rapporten → Compliancematrix**
   - Kolommen: SoA-maatregelen (per norm)
   - Rijen: rechtspersonen / dochterondernemingen
   - Verkeerslichten: groen = geïmplementeerd, geel = gedeeltelijk, rood = niet van toepassing / gepland
2. **Rapporten → Gaprapport** — alle maatregelen zonder implementatieregistratie
3. **Rapporten → Normoverzicht** — voltooiingspercentage per norm
4. CSV-export voor werkdocumenten

### Externe certificeringsaudits (ISO 27001)

**Fase 1 (Documentbeoordeling):**
- Exporteer SoA (JSON → eigen opmaak)
- Alle "niet van toepassing"-motiveringen moeten duidelijk en traceerbaar zijn
- Beleid: alles moet "goedgekeurd" zijn (geen concepten als bewijs)
- Verwerkingsregister/RoPA: controleer of het actueel is

**Fase 2 (Audit ter plaatse):**
- Risicobeheer: alle risico's beoordeeld, behandelingen gedocumenteerd
- Trainingsregistraties: voltooiingspercentages, certificaten
- BCM-oefeningsrapporten: laatste oefening < 12 maanden
- Auditlog: volledige traceerbaarheid van alle wijzigingen
- Notulen directiebeoordeling (Governance → Beoordelingen)

---

## RACI voor SoA-onderhoud

| Activiteit | CISO | FG | KAM | Audit | Afd. |
|---|---|---|---|---|---|
| Maatregelen beoordelen | **R** | C | C | I | C |
| Motiveringen schrijven | **R** | A (AVG) | A (ISO 9001) | I | — |
| Maatregelen documenteren | A | — | — | — | **R** |
| SoA goedkeuren | **A** | — | — | I | — |
| Auditvoorbereiding | **R** | C | C | **R** | C |

> R = Verantwoordelijk, A = Eindverantwoordelijk, C = Geconsulteerd, I = Geïnformeerd

---

## Veelgemaakte fouten in de SoA

| Fout | Impact | Oplossing |
|---|---|---|
| Maatregelen "niet van toepassing" zonder motivering | Auditbevinding | Vul een motivering in |
| Status "gepland" langer dan 12 maanden | Non-conformiteit | Maak een actieplan, wijs een eigenaar aan |
| Geen koppeling maatregel → beleid | Lacune in bewijs | Gebruik "🔗 Koppelingen" op de maatregel |
| SoA niet afgestemd op huidig toepassingsgebied | Certificeringsrisico | Toepassingsgebied bijwerken in instellingen |
` }
}

function seedSoaGuide() {
  const lang = _getDemoLang()
  const data = SOA_GUIDE[lang] || SOA_GUIDE.en
  const docs = load()
  if (_upsertSeed(docs, SOA_GUIDE_SEED_ID, { id: 'guid_soa_audit_guide', category: 'soa-audit', type: 'markdown', pinOrder: 1, minRole: null, ...data })) save(docs)
}

// ── Policy-Prozesse Guide – bilingual ─────────────────────────────────────────

const POLICY_GUIDE_SEED_ID = 'seed_policy_prozesse_guide'

const POLICY_GUIDE = {
  de: {
    title: 'Policy-Prozesse – Erstellen, Prüfen & Freigeben',
    content: `# Policy-Prozesse – Erstellen, Prüfen & Freigeben

Dieser Leitfaden beschreibt den vollständigen Lebenszyklus einer Richtlinie (Policy) in ISMS Builder — von der Erstellung über den Review-Prozess bis zur Archivierung.

---

## Richtlinientypen

| Typ | Beschreibung | Beispiele |
|---|---|---|
| **Policy** | Verbindliche Vorgabe | Informationssicherheitsrichtlinie, Passwort-Policy |
| **Procedure** | Ablaufbeschreibung | Incident-Response-Verfahren, Change-Management |
| **Guideline** | Empfehlung | Sichere Programmierrichtlinien |
| **Standard** | Technische Norm | Verschlüsselungsstandard, Härtungs-Baseline |
| **SoA** | Statement of Applicability | ISO 27001 SoA-Dokument |
| **Risk** | Risikoakzeptanz-Dokument | Risikoannahme-Policy |
| **Template** | Vorlage | Datenschutz-Folgenabschätzungsvorlage |

---

## Lifecycle-Zustände

\`\`\`
draft  →  review  →  approved  →  archived
                ↑_____________|   (Re-Review)
\`\`\`

| Status | Bedeutung | Wer darf setzen |
|---|---|---|
| **draft** | In Bearbeitung, nicht freigegeben | editor+ |
| **review** | Zur Prüfung eingereicht | editor+ |
| **approved** | Freigegeben, verbindlich | contentowner / admin |
| **archived** | Nicht mehr gültig, nur Archiv | contentowner / admin |

---

## Neue Richtlinie erstellen

1. **Richtlinien** im Menü aufrufen
2. **+ Neue Seite** (Button oben rechts) anklicken
3. Pflichtfelder ausfüllen:
   - **Typ** (Policy / Procedure / …)
   - **Titel** (eindeutig und aussagekräftig)
   - **Sprache** (de / en)
   - **Status** beginnt automatisch als **draft**
4. **Inhalt** im Editor eintragen (Markdown oder Rich Text)
5. **Datum "Nächstes Review"** setzen (Pflicht für approved-Richtlinien)
6. **Verknüpfungen** unter "🔗 Verknüpfungen":
   - SoA-Controls verknüpfen (welche Controls deckt diese Policy ab?)
   - Anwendbare Gesellschaften setzen
7. **Speichern** (Strg+S oder Save-Button)

---

## Review-Prozess

### Richtlinie zur Prüfung einreichen
1. Richtlinie öffnen → **Bearbeiten**
2. Status auf **"review"** setzen
3. Speichern → Richtlinie erscheint im Dashboard unter "Handlungsbedarf"
4. Prüfer (contentowner) erhält ggf. E-Mail-Benachrichtigung (wenn konfiguriert)

### Als CISO / Contentowner prüfen
1. **Dashboard → Handlungsbedarf → Richtlinien in Review**
2. Richtlinie öffnen → Inhalt prüfen
3. Bei Freigabe: Status auf **"approved"** setzen + Revisonsdatum aktualisieren
4. Bei Ablehnung: Status zurück auf **"draft"** setzen + Kommentar in Beschreibung

---

## Versionierung

Jedes Speichern mit Status-Änderung erzeugt automatisch eine neue Version:

| Aktion | Versions-Increment |
|---|---|
| Inhalt bearbeiten (gleicher Status) | Minor (z.B. 1.0 → 1.1) |
| Status-Wechsel (z.B. draft → review) | Minor |
| Neue Genehmigung (→ approved) | Major (z.B. 1.x → 2.0) |

Versionsverlauf im Detail-Panel unter **"Verlauf"** einsehbar.

---

## Seitenhierarchie (Space-Struktur)

ISMS Builder unterstützt eine Confluence-ähnliche Seitenhierarchie:

- **Elternseite** festlegen: Richtlinie öffnen → **"Verschieben"** → Elternknoten wählen
- **Unterseite** erstellen: Richtlinie öffnen → **"+ Unterseite"**
- **Reihenfolge** per Drag & Drop oder ↑↓-Buttons im Baum anpassen
- **Breadcrumb** zeigt den Pfad zur aktuellen Seite

Empfohlene Struktur:
\`\`\`
├── Informationssicherheitsrichtlinie (Policy)
│   ├── Passwort-Policy (Policy)
│   ├── Clean-Desk-Policy (Policy)
│   └── BYOD-Richtlinie (Policy)
├── Incident-Response-Verfahren (Procedure)
│   └── Eskalationsplan (Procedure)
└── Datenschutzrichtlinie (Policy)
    └── Datenschutzerklärung (SoA)
\`\`\`

---

## Anhänge

Richtlinien können Anhänge (PDF, DOCX, bis 20 MB) haben:
1. Richtlinie öffnen → Tab **"Anhänge"**
2. Datei per Drag & Drop oder Dateiauswahl hochladen
3. Anhänge erscheinen in der Anhänge-Leiste und sind downloadbar

---

## Überprüfungszyklen (Review-Management)

Das System verwaltet Überprüfungstermine automatisch:

- **nextReviewDate**: Pflichtfeld bei approval — wann muss die Richtlinie erneut geprüft werden?
- **Farbkodierung** im Editor-Header:
  - 🟢 Grün: Review in > 30 Tagen
  - 🟡 Gelb: Review in ≤ 30 Tagen
  - 🔴 Rot: Review überfällig
- **Dashboard**: Alle überfälligen und bald fälligen Reviews unter "Handlungsbedarf"
- **Kalender**: Review-Termine als Kalendereinträge sichtbar
- **Reports → Review-Zyklen**: Vollständige Übersicht aller Richtlinien mit Fälligkeit

---

## RACI für Policy-Management

| Aktivität | CISO | Abtlg. | Contentowner | Revision |
|---|---|---|---|---|
| Richtlinie erstellen | R | R | — | — |
| Inhalt ausarbeiten | A | **R** | — | I |
| Review einreichen | R | **R** | — | — |
| Inhaltliche Prüfung | A | C | **R** | I |
| Freigabe erteilen | I | — | **R** | I |
| SoA-Controls verknüpfen | **R** | C | — | I |
| Archivierung | **R** | — | R | I |

---

## Häufige Fehler im Policy-Management

| Fehler | Auswirkung | Lösung |
|---|---|---|
| Richtlinie ohne Review-Datum freigegeben | Keine Fälligkeitsüberwachung | nextReviewDate vor Approval setzen |
| Status "draft" seit > 6 Monaten | Veraltetes Entwurfsdokument | Review anstoßen oder archivieren |
| Keine SoA-Verlinkung | Lücke im Compliance-Nachweis | Controls verknüpfen |
| Mehrere ähnliche Richtlinien | Redundanz, Widersprüche | Seitenhierarchie nutzen (Unterseiten) |
`
  },
  en: {
    title: 'Policy Processes – Create, Review & Approve',
    content: `# Policy Processes – Create, Review & Approve

This guide describes the complete lifecycle of a policy document in ISMS Builder — from creation through the review process to archiving.

---

## Document Types

| Type | Description | Examples |
|---|---|---|
| **Policy** | Mandatory requirement | Information Security Policy, Password Policy |
| **Procedure** | Process description | Incident Response Procedure, Change Management |
| **Guideline** | Recommendation | Secure Coding Guidelines |
| **Standard** | Technical standard | Encryption Standard, Hardening Baseline |
| **SoA** | Statement of Applicability | ISO 27001 SoA document |
| **Risk** | Risk acceptance document | Risk Acceptance Policy |
| **Template** | Blank form | Data Protection Impact Assessment template |

---

## Lifecycle States

\`\`\`
draft  →  review  →  approved  →  archived
                ↑_____________|   (Re-review)
\`\`\`

| Status | Meaning | Who can set |
|---|---|---|
| **draft** | Work in progress, not released | editor+ |
| **review** | Submitted for review | editor+ |
| **approved** | Released, binding | contentowner / admin |
| **archived** | No longer valid, archive only | contentowner / admin |

---

## Creating a New Policy

1. Open **Policies** in the menu
2. Click **+ New Page** (top right)
3. Fill in required fields:
   - **Type** (Policy / Procedure / …)
   - **Title** (unique and descriptive)
   - **Language** (de / en)
   - **Status** automatically starts as **draft**
4. Enter **content** in the editor (Markdown or rich text)
5. Set **Next Review Date** (required for approved policies)
6. Add **links** under "🔗 Links":
   - Link SoA controls (which controls does this policy cover?)
   - Set applicable entities
7. **Save** (Ctrl+S or Save button)

---

## Review Process

### Submitting for Review
1. Open policy → **Edit**
2. Set status to **"review"**
3. Save → policy appears on Dashboard under "Action Required"
4. Reviewer (contentowner) optionally receives email notification (if configured)

### Reviewing as CISO / Content Owner
1. **Dashboard → Action Required → Policies in Review**
2. Open policy → review content
3. To approve: set status to **"approved"** + update review date
4. To reject: set status back to **"draft"** + add comment to description

---

## Versioning

Every save with a status change automatically creates a new version:

| Action | Version increment |
|---|---|
| Edit content (same status) | Minor (e.g. 1.0 → 1.1) |
| Status change (e.g. draft → review) | Minor |
| New approval (→ approved) | Major (e.g. 1.x → 2.0) |

Version history visible in the detail panel under **"History"**.

---

## Page Hierarchy (Space Structure)

ISMS Builder supports a Confluence-style page hierarchy:

- **Set parent page**: Open policy → **"Move"** → select parent node
- **Create child page**: Open policy → **"+ Sub-page"**
- **Reorder** via drag & drop or ↑↓ buttons in the tree
- **Breadcrumb** shows the path to the current page

Recommended structure:
\`\`\`
├── Information Security Policy (Policy)
│   ├── Password Policy (Policy)
│   ├── Clean Desk Policy (Policy)
│   └── BYOD Policy (Policy)
├── Incident Response Procedure (Procedure)
│   └── Escalation Plan (Procedure)
└── Data Protection Policy (Policy)
    └── Privacy Notice (SoA)
\`\`\`

---

## Attachments

Policies can have attachments (PDF, DOCX, up to 20 MB):
1. Open policy → **"Attachments"** tab
2. Upload file via drag & drop or file picker
3. Attachments appear in the attachment bar and are downloadable

---

## Review Cycles

The system manages review schedules automatically:

- **nextReviewDate**: Required on approval — when does this policy need to be reviewed again?
- **Colour coding** in the editor header:
  - 🟢 Green: review in > 30 days
  - 🟡 Yellow: review in ≤ 30 days
  - 🔴 Red: review overdue
- **Dashboard**: All overdue and upcoming reviews under "Action Required"
- **Calendar**: Review dates visible as calendar entries
- **Reports → Review Cycles**: Full overview of all policies with due dates

---

## RACI for Policy Management

| Activity | CISO | Dept | Content Owner | Audit |
|---|---|---|---|---|
| Create policy | R | R | — | — |
| Draft content | A | **R** | — | I |
| Submit for review | R | **R** | — | — |
| Review content | A | C | **R** | I |
| Grant approval | I | — | **R** | I |
| Link SoA controls | **R** | C | — | I |
| Archive | **R** | — | R | I |

---

## Common Policy Management Mistakes

| Mistake | Impact | Fix |
|---|---|---|
| Policy approved without review date | No due date tracking | Set nextReviewDate before approving |
| Status "draft" for > 6 months | Stale draft document | Initiate review or archive |
| No SoA control links | Compliance evidence gap | Link relevant controls |
| Multiple overlapping policies | Redundancy, contradictions | Use page hierarchy (sub-pages) |
`
  },
  fr: {
    title: 'Processus de politique – Créer, Réviser & Approuver',
    content: `# Processus de politique – Créer, Réviser & Approuver

Ce guide décrit le cycle de vie complet d'un document de politique dans ISMS Builder — de la création au processus de révision jusqu'à l'archivage.

---

## Types de documents

| Type | Description | Exemples |
|---|---|---|
| **Policy** | Exigence obligatoire | Politique de sécurité de l'information, Politique de mots de passe |
| **Procedure** | Description de processus | Procédure de réponse aux incidents, Gestion des changements |
| **Guideline** | Recommandation | Directives de développement sécurisé |
| **Standard** | Norme technique | Norme de chiffrement, Baseline de durcissement |
| **SoA** | Déclaration d'applicabilité | Document SoA ISO 27001 |
| **Risk** | Document d'acceptation des risques | Politique d'acceptation des risques |
| **Template** | Modèle vierge | Modèle d'analyse d'impact sur la protection des données |

---

## États du cycle de vie

\`\`\`
brouillon  →  révision  →  approuvé  →  archivé
                     ↑_____________|   (Re-révision)
\`\`\`

| Statut | Signification | Qui peut définir |
|---|---|---|
| **brouillon** | En cours, non publié | éditeur+ |
| **révision** | Soumis pour révision | éditeur+ |
| **approuvé** | Publié, obligatoire | propriétaire de contenu / admin |
| **archivé** | Plus valide, archive uniquement | propriétaire de contenu / admin |

---

## Créer une nouvelle politique

1. Ouvrir **Politiques** dans le menu
2. Cliquer sur **+ Nouvelle page** (en haut à droite)
3. Remplir les champs obligatoires :
   - **Type** (Policy / Procedure / …)
   - **Titre** (unique et descriptif)
   - **Langue** (de / en)
   - **Statut** commence automatiquement comme **brouillon**
4. Saisir le **contenu** dans l'éditeur (Markdown ou texte enrichi)
5. Définir la **Date de prochaine révision** (obligatoire pour les politiques approuvées)
6. Ajouter des **liens** sous "🔗 Liens" :
   - Relier les contrôles SoA (quels contrôles cette politique couvre-t-elle ?)
   - Définir les entités applicables
7. **Enregistrer** (Ctrl+S ou bouton Enregistrer)

---

## Processus de révision

### Soumettre pour révision
1. Ouvrir la politique → **Modifier**
2. Définir le statut sur **"révision"**
3. Enregistrer → la politique apparaît dans le Tableau de bord sous "Actions requises"
4. Le réviseur (propriétaire de contenu) reçoit éventuellement une notification par e-mail

### Réviser en tant que CISO / Propriétaire de contenu
1. **Tableau de bord → Actions requises → Politiques en révision**
2. Ouvrir la politique → réviser le contenu
3. Pour approuver : définir le statut sur **"approuvé"** + mettre à jour la date de révision
4. Pour rejeter : remettre le statut sur **"brouillon"** + ajouter un commentaire dans la description

---

## Versionnement

Chaque enregistrement avec un changement de statut crée automatiquement une nouvelle version :

| Action | Incrément de version |
|---|---|
| Modifier le contenu (même statut) | Mineure (ex. 1.0 → 1.1) |
| Changement de statut (ex. brouillon → révision) | Mineure |
| Nouvelle approbation (→ approuvé) | Majeure (ex. 1.x → 2.0) |

Historique des versions visible dans le panneau de détail sous **"Historique"**.

---

## Hiérarchie des pages (Structure de l'espace)

ISMS Builder prend en charge une hiérarchie de pages de type Confluence :

- **Définir la page parente** : Ouvrir la politique → **"Déplacer"** → sélectionner le nœud parent
- **Créer une sous-page** : Ouvrir la politique → **"+ Sous-page"**
- **Réorganiser** par glisser-déposer ou boutons ↑↓ dans l'arborescence
- **Fil d'Ariane** affiche le chemin vers la page actuelle

Structure recommandée :
\`\`\`
├── Politique de sécurité de l'information (Policy)
│   ├── Politique de mots de passe (Policy)
│   ├── Politique de bureau propre (Policy)
│   └── Politique BYOD (Policy)
├── Procédure de réponse aux incidents (Procedure)
│   └── Plan d'escalade (Procedure)
└── Politique de protection des données (Policy)
    └── Mentions légales (SoA)
\`\`\`

---

## Pièces jointes

Les politiques peuvent avoir des pièces jointes (PDF, DOCX, jusqu'à 20 Mo) :
1. Ouvrir la politique → onglet **"Pièces jointes"**
2. Télécharger le fichier par glisser-déposer ou sélecteur de fichier
3. Les pièces jointes apparaissent dans la barre et sont téléchargeables

---

## Cycles de révision

Le système gère automatiquement les calendriers de révision :

- **nextReviewDate** : Obligatoire lors de l'approbation — quand cette politique doit-elle être révisée ?
- **Codage couleur** dans l'en-tête de l'éditeur :
  - 🟢 Vert : révision dans > 30 jours
  - 🟡 Jaune : révision dans ≤ 30 jours
  - 🔴 Rouge : révision en retard
- **Tableau de bord** : Toutes les révisions en retard et à venir sous "Actions requises"
- **Calendrier** : Dates de révision visibles comme entrées de calendrier
- **Rapports → Cycles de révision** : Vue d'ensemble complète de toutes les politiques avec échéances

---

## RACI pour la gestion des politiques

| Activité | CISO | Dept | Propriétaire | Audit |
|---|---|---|---|---|
| Créer la politique | R | R | — | — |
| Rédiger le contenu | A | **R** | — | I |
| Soumettre pour révision | R | **R** | — | — |
| Réviser le contenu | A | C | **R** | I |
| Accorder l'approbation | I | — | **R** | I |
| Lier les contrôles SoA | **R** | C | — | I |
| Archiver | **R** | — | R | I |

---

## Erreurs courantes dans la gestion des politiques

| Erreur | Impact | Solution |
|---|---|---|
| Politique approuvée sans date de révision | Pas de suivi d'échéance | Définir nextReviewDate avant approbation |
| Statut "brouillon" depuis > 6 mois | Document brouillon obsolète | Lancer la révision ou archiver |
| Aucun lien vers les contrôles SoA | Lacune dans les preuves de conformité | Lier les contrôles pertinents |
| Plusieurs politiques similaires | Redondance, contradictions | Utiliser la hiérarchie de pages |
`
  },
  nl: {
    title: 'Beleidsprocessen – Aanmaken, Beoordelen & Goedkeuren',
    content: `# Beleidsprocessen – Aanmaken, Beoordelen & Goedkeuren

Deze handleiding beschrijft de volledige levenscyclus van een beleidsdocument in ISMS Builder — van aanmaak via het beoordelingsproces tot archivering.

---

## Documenttypen

| Type | Omschrijving | Voorbeelden |
|---|---|---|
| **Policy** | Verplichte vereiste | Informatiebeveiligingsbeleid, Wachtwoordbeleid |
| **Procedure** | Procesbeschrijving | Incident Response Procedure, Wijzigingsbeheer |
| **Guideline** | Aanbeveling | Richtlijnen voor veilig programmeren |
| **Standard** | Technische norm | Versleutelingsstandaard, Hardening Baseline |
| **SoA** | Verklaring van toepasselijkheid | ISO 27001 SoA-document |
| **Risk** | Document voor risicoaanvaarding | Risicoaanvaardingsbeleid |
| **Template** | Leeg formulier | Sjabloon gegevensbeschermingseffectbeoordeling |

---

## Levenscyclusstatussen

\`\`\`
concept  →  beoordeling  →  goedgekeurd  →  gearchiveerd
                      ↑_______________|   (Herbeoordeling)
\`\`\`

| Status | Betekenis | Wie kan instellen |
|---|---|---|
| **concept** | In bewerking, niet gepubliceerd | redacteur+ |
| **beoordeling** | Ingediend voor beoordeling | redacteur+ |
| **goedgekeurd** | Gepubliceerd, bindend | inhoudseigenaar / admin |
| **gearchiveerd** | Niet meer geldig, alleen archief | inhoudseigenaar / admin |

---

## Een nieuw beleid aanmaken

1. Open **Beleid** in het menu
2. Klik op **+ Nieuwe pagina** (rechtsboven)
3. Vul de verplichte velden in:
   - **Type** (Policy / Procedure / …)
   - **Titel** (uniek en beschrijvend)
   - **Taal** (de / en)
   - **Status** begint automatisch als **concept**
4. Voer de **inhoud** in de editor in (Markdown of rijke tekst)
5. Stel de **Volgende beoordelingsdatum** in (verplicht voor goedgekeurd beleid)
6. Voeg **koppelingen** toe onder "🔗 Koppelingen":
   - Koppel SoA-maatregelen (welke maatregelen dekt dit beleid?)
   - Stel toepasselijke entiteiten in
7. **Opslaan** (Ctrl+S of Opslaan-knop)

---

## Beoordelingsproces

### Indienen ter beoordeling
1. Open beleid → **Bewerken**
2. Stel status in op **"beoordeling"**
3. Opslaan → beleid verschijnt op Dashboard onder "Actie vereist"
4. Beoordelaar (inhoudseigenaar) ontvangt eventueel een e-mailmelding

### Beoordelen als CISO / Inhoudseigenaar
1. **Dashboard → Actie vereist → Beleid in beoordeling**
2. Open beleid → beoordeel inhoud
3. Goedkeuren: stel status in op **"goedgekeurd"** + update beoordelingsdatum
4. Afwijzen: zet status terug op **"concept"** + voeg commentaar toe

---

## Versiebeheer

Elke opslag met een statuswijziging maakt automatisch een nieuwe versie aan:

| Actie | Versie-increment |
|---|---|
| Inhoud bewerken (zelfde status) | Minor (bijv. 1.0 → 1.1) |
| Statuswijziging (bijv. concept → beoordeling) | Minor |
| Nieuwe goedkeuring (→ goedgekeurd) | Major (bijv. 1.x → 2.0) |

Versiegeschiedenis zichtbaar in het detailvenster onder **"Geschiedenis"**.

---

## Paginahiërarchie (Ruimtestructuur)

ISMS Builder ondersteunt een Confluence-achtige paginahiërarchie:

- **Bovenliggende pagina instellen**: Open beleid → **"Verplaatsen"** → selecteer bovenliggend knooppunt
- **Onderliggende pagina aanmaken**: Open beleid → **"+ Subpagina"**
- **Volgorde aanpassen** via slepen en neerzetten of ↑↓-knoppen in de boomstructuur
- **Broodkruimelpad** toont het pad naar de huidige pagina

Aanbevolen structuur:
\`\`\`
├── Informatiebeveiligingsbeleid (Policy)
│   ├── Wachtwoordbeleid (Policy)
│   ├── Clean Desk-beleid (Policy)
│   └── BYOD-beleid (Policy)
├── Incident Response Procedure (Procedure)
│   └── Escalatieplan (Procedure)
└── Gegevensbeschermingsbeleid (Policy)
    └── Privacyverklaring (SoA)
\`\`\`

---

## Bijlagen

Beleid kan bijlagen hebben (PDF, DOCX, tot 20 MB):
1. Open beleid → tabblad **"Bijlagen"**
2. Upload bestand via slepen en neerzetten of bestandskiezer
3. Bijlagen verschijnen in de bijlagenbalk en zijn downloadbaar

---

## Beoordelingscycli

Het systeem beheert beoordelingsschema's automatisch:

- **nextReviewDate**: Verplicht bij goedkeuring — wanneer moet dit beleid opnieuw worden beoordeeld?
- **Kleurcodering** in de editorheader:
  - 🟢 Groen: beoordeling over > 30 dagen
  - 🟡 Geel: beoordeling over ≤ 30 dagen
  - 🔴 Rood: beoordeling achterstallig
- **Dashboard**: Alle achterstallige en aankomende beoordelingen onder "Actie vereist"
- **Kalender**: Beoordelingsdata zichtbaar als kalenderitems
- **Rapporten → Beoordelingscycli**: Volledig overzicht van alle beleidsregels met vervaldatums

---

## RACI voor beleidsbeheer

| Activiteit | CISO | Afd. | Inhoudseigenaar | Audit |
|---|---|---|---|---|
| Beleid aanmaken | R | R | — | — |
| Inhoud opstellen | A | **R** | — | I |
| Indienen ter beoordeling | R | **R** | — | — |
| Inhoud beoordelen | A | C | **R** | I |
| Goedkeuring verlenen | I | — | **R** | I |
| SoA-maatregelen koppelen | **R** | C | — | I |
| Archiveren | **R** | — | R | I |

---

## Veelgemaakte fouten in beleidsbeheer

| Fout | Impact | Oplossing |
|---|---|---|
| Beleid goedgekeurd zonder beoordelingsdatum | Geen vervaldatumtracking | Stel nextReviewDate in voor goedkeuring |
| Status "concept" langer dan 6 maanden | Verouderd conceptdocument | Start beoordeling of archiveer |
| Geen SoA-koppelingen | Lacune in compliance-bewijs | Koppel relevante maatregelen |
| Meerdere overlappende beleidsregels | Redundantie, tegenstrijdigheden | Gebruik paginahiërarchie (subpagina's) |
`
  }
}

function seedPolicyGuide() {
  const lang = _getDemoLang()
  const data = POLICY_GUIDE[lang] || POLICY_GUIDE.en
  const docs = load()
  if (_upsertSeed(docs, POLICY_GUIDE_SEED_ID, { id: 'guid_policy_prozesse_guide', category: 'policy-prozesse', type: 'markdown', pinOrder: 1, minRole: null, ...data })) save(docs)
}

// ── Make existing single-lang seeds language-aware ────────────────────────────

// SoA guide already handled above.
// DemoDoc and RoleGuides: update content on lang change via _upsertSeed wrapper

const DEMO_DOC_EN_TITLE = 'Demo Mode – Overview & Transition to Production'
const DEMO_DOC_EN_CONTENT = `# Demo Mode – Overview & Transition to Production

Welcome to **ISMS Builder** — your self-hosted Information Security Management System.

This document explains the demo environment and guides you through the transition to production.

---

## Demo Credentials

| User | Email | Password | Role | Domain | Access |
|---|---|---|---|---|---|
| admin | admin@example.com | adminpass | Admin | Global | Full access — all modules |
| alice | alice@it.example | alicepass | Department Head | IT | Policies, Risks, Guidance (read+write) |
| bob | bob@hr.example | bobpass | Reader | HR | Read-only |

> **Security notice:** These passwords are publicly known. Change all passwords before going live.

---

## Demo Data Available

The system contains realistic sample data for the following modules:

| Module | Demo Content |
|---|---|
| **Policies** | Information Security Policy, Password Policy, BYOD Policy, Backup Policy, Access Control Policy |
| **SoA** | 313 controls across 8 frameworks (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — all editable |
| **Risk Management** | Realistic risks with multi-framework links (Ransomware, Phishing, Insider Threat, Supply Chain, …) |
| **GDPR & Privacy** | RoPA, DPAs, TOMs, DPIA entries, 72h timer demo |
| **Assets** | Company assets (servers, workstations, ERP, cloud services, network) with classification |
| **Supply Chain** | Suppliers incl. NIS2/EUCS links |
| **BCM / BCP** | Business Impact Analyses, Continuity Plans, Exercises |
| **Governance** | Management Reviews with action items and meeting minutes |
| **Training** | Training measures (ISO Awareness, GDPR, Phishing Simulation) |
| **Legal** | Contracts, NDAs, Privacy Policies |
| **Security Goals** | KPI goals with progress bars |
| **Incident Inbox** | Demo reports from the public incident submission form |
| **Guidance** | System manual, role guides, policy processes, SoA audit guide |

---

## Transition to Production

### Step by Step
1. Open **Admin Console** → tab **Maintenance**
2. **Run Demo Reset:**
   - Click "Demo Reset" section
   - Type \`RESET\` in the confirmation dialog
   - The system exports all demo data as a JSON download (backup)
   - All module data is cleared, all users except \`admin\` are deleted
   - Admin password is reset to \`adminpass\`, 2FA disabled
3. **Redirected to login page** — yellow banner confirms successful reset
4. **Log in with \`admin@example.com\` / \`adminpass\`** — banner disappears, system ready for production
5. **Change password immediately:** Settings → Change Password
6. **Set up 2FA:** Settings → Enable 2FA
7. **Create your users:** Admin Console → Users tab
8. **Create your content:** all modules are empty and ready

### What is preserved after reset?

| Preserved | Cleared |
|---|---|
| SoA controls (all 313) | Policies / Templates |
| Dropdown lists | Risks |
| Organisation settings | Assets, BCM, Governance |
| (Admin user) | Suppliers, Legal, Training |
| | GDPR data, Guidance |
| | Audit log, Security Goals |

---

## Restore Demo Data

To demonstrate the system again:

1. **Admin Console → Maintenance → "Import Demo Data"**
2. Select the JSON file downloaded during Demo Reset
3. All module data is restored
4. alice (alice@it.example / alicepass) and bob (bob@hr.example / bobpass) are recreated without 2FA
5. The admin account remains unchanged

---

## Further Information

- **Architecture & API Reference:** Guidance → Admin Documentation
- **Role Guides:** Guidance → Roles
- **Project Page:** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Licence:** GNU Affero General Public License v3.0 (AGPL-3.0)
`

const DEMO_DOC_FR_TITLE = 'Mode Démo – Vue d\'ensemble & Passage en production'
const DEMO_DOC_FR_CONTENT = `# Mode Démo – Vue d'ensemble & Passage en production

Bienvenue dans **ISMS Builder** — votre système de gestion de la sécurité de l'information auto-hébergé.

Ce document explique l'environnement de démonstration et vous guide à travers la transition vers la production.

---

## Identifiants de démonstration

| Utilisateur | E-mail | Mot de passe | Rôle | Domaine | Accès |
|---|---|---|---|---|---|
| admin | admin@example.com | adminpass | Admin | Global | Accès complet — tous les modules |
| alice | alice@it.example | alicepass | Chef de département | IT | Politiques, Risques, Guidance (lecture+écriture) |
| bob | bob@hr.example | bobpass | Lecteur | RH | Lecture seule |

> **Avertissement de sécurité :** Ces mots de passe sont publiquement connus. Changez tous les mots de passe avant la mise en production.

---

## Données de démonstration disponibles

Le système contient des données d'exemple réalistes pour les modules suivants :

| Module | Contenu de démonstration |
|---|---|
| **Politiques** | Politique de sécurité de l'information, Politique de mots de passe, Politique BYOD, Politique de sauvegarde, Politique de contrôle d'accès |
| **SoA** | 313 contrôles sur 8 référentiels (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — tous modifiables |
| **Gestion des risques** | Risques réalistes avec liens multi-référentiels (Ransomware, Phishing, Menace interne, Chaîne d'approvisionnement, …) |
| **RGPD & Protection des données** | RoPA, DPA, TOMs, AIPD, minuterie 72h démo |
| **Actifs** | Actifs de l'entreprise (serveurs, postes de travail, ERP, services cloud, réseau) avec classification |
| **Chaîne d'approvisionnement** | Fournisseurs dont liens NIS2/EUCS |
| **BCM / PCA** | Analyses d'impact métier, Plans de continuité, Exercices |
| **Gouvernance** | Revues de direction avec plans d'action et procès-verbaux |
| **Formation** | Mesures de formation (Sensibilisation ISO, RGPD, Simulation de phishing) |
| **Juridique** | Contrats, NDA, Politiques de confidentialité |
| **Objectifs de sécurité** | Objectifs KPI avec barres de progression |
| **Boîte de réception incidents** | Rapports de démonstration du formulaire public de signalement |
| **Guidance** | Manuel système, guides de rôles, processus de politique, guide d'audit SoA |

---

## Transition vers la production

### Étape par étape
1. Ouvrir la **Console d'administration** → onglet **Maintenance**
2. **Exécuter la réinitialisation démo :**
   - Cliquer sur la section "Réinitialisation démo"
   - Saisir \`RESET\` dans la boîte de dialogue de confirmation
   - Le système exporte toutes les données de démonstration en téléchargement JSON (sauvegarde)
   - Toutes les données des modules sont effacées, tous les utilisateurs sauf \`admin\` sont supprimés
   - Le mot de passe admin est réinitialisé à \`adminpass\`, 2FA désactivé
3. **Redirigé vers la page de connexion** — la bannière jaune confirme la réinitialisation réussie
4. **Se connecter avec \`admin@example.com\` / \`adminpass\`** — la bannière disparaît, le système est prêt
5. **Changer le mot de passe immédiatement :** Paramètres → Changer le mot de passe
6. **Configurer le 2FA :** Paramètres → Activer le 2FA
7. **Créer vos utilisateurs :** Console d'administration → onglet Utilisateurs
8. **Créer votre contenu :** tous les modules sont vides et prêts

### Qu'est-ce qui est conservé après la réinitialisation ?

| Conservé | Effacé |
|---|---|
| Contrôles SoA (tous les 313) | Politiques / Modèles |
| Listes déroulantes | Risques |
| Paramètres de l'organisation | Actifs, BCM, Gouvernance |
| (Utilisateur Admin) | Fournisseurs, Juridique, Formation |
| | Données RGPD, Guidance |
| | Journal d'audit, Objectifs de sécurité |

---

## Restaurer les données de démonstration

Pour démontrer à nouveau le système :

1. **Console d'administration → Maintenance → "Importer les données de démonstration"**
2. Sélectionner le fichier JSON téléchargé lors de la réinitialisation démo
3. Toutes les données des modules sont restaurées
4. alice (alice@it.example / alicepass) et bob (bob@hr.example / bobpass) sont recréés sans 2FA
5. Le compte admin reste inchangé

---

## Informations complémentaires

- **Architecture & Référence API :** Guidance → Documentation Admin
- **Guides de rôles :** Guidance → Rôles
- **Page du projet :** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Licence :** GNU Affero General Public License v3.0 (AGPL-3.0)
`

const DEMO_DOC_NL_TITLE = 'Demo-modus – Overzicht & Overgang naar productie'
const DEMO_DOC_NL_CONTENT = `# Demo-modus – Overzicht & Overgang naar productie

Welkom bij **ISMS Builder** — uw zelfgehoste Informatiebeveiligingsbeheersysteem.

Dit document legt de demo-omgeving uit en begeleidt u door de overgang naar productie.

---

## Demo-inloggegevens

| Gebruiker | E-mail | Wachtwoord | Rol | Domein | Toegang |
|---|---|---|---|---|---|
| admin | admin@example.com | adminpass | Admin | Globaal | Volledige toegang — alle modules |
| alice | alice@it.example | alicepass | Afdelingshoofd | IT | Beleid, Risico's, Guidance (lezen+schrijven) |
| bob | bob@hr.example | bobpass | Lezer | HR | Alleen lezen |

> **Beveiligingswaarschuwing:** Deze wachtwoorden zijn publiekelijk bekend. Wijzig alle wachtwoorden voordat u live gaat.

---

## Beschikbare demogegevens

Het systeem bevat realistische voorbeeldgegevens voor de volgende modules:

| Module | Demo-inhoud |
|---|---|
| **Beleid** | Informatiebeveiligingsbeleid, Wachtwoordbeleid, BYOD-beleid, Back-upbeleid, Toegangscontrolebeleid |
| **SoA** | 313 maatregelen over 8 normen (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — allemaal bewerkbaar |
| **Risicobeheer** | Realistische risico's met multi-norm-koppelingen (Ransomware, Phishing, Insider Threat, Supply Chain, …) |
| **AVG & Privacy** | Verwerkingsregister, AVG-overeenkomsten, TOMs, DPIA, 72u-timer demo |
| **Activa** | Bedrijfsactiva (servers, werkstations, ERP, clouddiensten, netwerk) met classificatie |
| **Supply Chain** | Leveranciers incl. NIS2/EUCS-koppelingen |
| **BCM / BCP** | Business Impact Analyses, Continuïteitsplannen, Oefeningen |
| **Governance** | Directiebeoordelingen met actiepunten en notulen |
| **Training** | Trainingsmaatregelen (ISO-bewustwording, AVG, Phishing-simulatie) |
| **Juridisch** | Contracten, NDA's, Privacyverklaringen |
| **Beveiligingsdoelstellingen** | KPI-doelstellingen met voortgangsbalken |
| **Incident-inbox** | Demomeldingen via het openbare meldingsformulier |
| **Guidance** | Systeemhandleiding, rolhandleidingen, beleidsprocessen, SoA-audithandleiding |

---

## Overgang naar productie

### Stap voor stap
1. Open de **Beheerconsole** → tabblad **Onderhoud**
2. **Demo-reset uitvoeren:**
   - Klik op de sectie "Demo-reset"
   - Typ \`RESET\` in het bevestigingsdialoogvenster
   - Het systeem exporteert alle demogegevens als JSON-download (back-up)
   - Alle modulegegevens worden gewist, alle gebruikers behalve \`admin\` worden verwijderd
   - Adminwachtwoord wordt gereset naar \`adminpass\`, 2FA uitgeschakeld
3. **Doorgestuurd naar inlogpagina** — gele banner bevestigt geslaagde reset
4. **Inloggen met \`admin@example.com\` / \`adminpass\`** — banner verdwijnt, systeem klaar
5. **Wachtwoord onmiddellijk wijzigen:** Instellingen → Wachtwoord wijzigen
6. **2FA instellen:** Instellingen → 2FA inschakelen
7. **Uw gebruikers aanmaken:** Beheerconsole → tabblad Gebruikers
8. **Uw inhoud aanmaken:** alle modules zijn leeg en klaar

### Wat blijft behouden na de reset?

| Behouden | Gewist |
|---|---|
| SoA-maatregelen (alle 313) | Beleid / Sjablonen |
| Keuzelijsten | Risico's |
| Organisatie-instellingen | Activa, BCM, Governance |
| (Admin-gebruiker) | Leveranciers, Juridisch, Training |
| | AVG-gegevens, Guidance |
| | Auditlog, Beveiligingsdoelstellingen |

---

## Demogegevens herstellen

Om het systeem opnieuw te demonstreren:

1. **Beheerconsole → Onderhoud → "Demogegevens importeren"**
2. Selecteer het JSON-bestand dat tijdens de demo-reset is gedownload
3. Alle modulegegevens worden hersteld
4. alice (alice@it.example / alicepass) en bob (bob@hr.example / bobpass) worden opnieuw aangemaakt zonder 2FA
5. Het admin-account blijft ongewijzigd

---

## Verdere informatie

- **Architectuur & API-referentie:** Guidance → Admin-documentatie
- **Rolhandleidingen:** Guidance → Rollen
- **Projectpagina:** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Licentie:** GNU Affero General Public License v3.0 (AGPL-3.0)
`

const DEMO_DOC = {
  de: { title: 'Demo-Betrieb – Übersicht & Übergabe in den Produktivbetrieb', content: DEMO_GUIDE_CONTENT },
  en: { title: DEMO_DOC_EN_TITLE, content: DEMO_DOC_EN_CONTENT },
  fr: { title: DEMO_DOC_FR_TITLE, content: DEMO_DOC_FR_CONTENT },
  nl: { title: DEMO_DOC_NL_TITLE, content: DEMO_DOC_NL_CONTENT },
}

// Patch seedDemoDoc to be language-aware
// NOTE: same idempotency behaviour as _upsertSeed — content is only refreshed on language change.
// After editing DEMO_GUIDE_CONTENT or DEMO_DOC_EN_CONTENT: manually delete the entry in
// Guidance (soft-delete) → Admin → Papierkorb → permanently delete → restart server.
const _origSeedDemoDoc = seedDemoDoc
function seedDemoDocI18n() {
  const lang = _getDemoLang()
  const { title, content } = DEMO_DOC[lang] || DEMO_DOC.en
  const docs = load()
  let changed = false
  const existing = docs.find(d => d.seedId === DEMO_GUIDE_SEED_ID && !d.deletedAt)
  if (!existing) {
    docs.unshift({
      id: 'guid_demo_overview', seedId: DEMO_GUIDE_SEED_ID, seedLang: lang,
      category: 'systemhandbuch', type: 'markdown',
      title, content,
      pinOrder: 1, minRole: null,
      createdAt: nowISO(), updatedAt: nowISO(), deletedAt: null, deletedBy: null,
      createdBy: 'system', linkedControls: [], linkedPolicies: [],
    })
    changed = true
  } else {
    if (existing.seedLang !== lang) {
      existing.title    = title
      existing.content  = content
      existing.seedLang = lang
      existing.updatedAt = nowISO()
      changed = true
    }
    if (existing.pinOrder == null) { existing.pinOrder = 1; changed = true }
  }
  if (changed) save(docs)
}

// Role guide i18n translations (EN, FR, NL; DE is in ROLE_GUIDES above)
const ROLE_GUIDES_EN = {
  seed_guide_ciso: {
    title: 'User Guide: CISO / Information Security Officer (ISB)',
    content: `# User Guide: CISO / Information Security Officer

The CISO (Chief Information Security Officer) bears overall responsibility for the ISMS. This guide explains the key modules and daily tasks.

---

## Module Overview

| Module | Task | Location |
|---|---|---|
| **Risk Management** | Record, assess and treat risks | Menu: Risks |
| **SoA** | Assess controls, maintain applicability & status | Menu: SoA |
| **Security Goals** | Define KPIs, track progress | Menu: Goals |
| **Incident Inbox** | Process reported security incidents | Menu: Incidents |
| **Supply Chain** | Monitor suppliers, NIS2 obligations | Menu: Suppliers |
| **BCM / BCP** | Business Impact Analyses, plans, exercises | Menu: BCM |
| **Governance** | Management reviews, action packages | Menu: Governance |
| **Reports** | Compliance matrix, gap report, CSV export | Menu: Reports |
| **Settings (CISO)** | SLA, notification threshold, escalation email | Menu: Settings |

---

## Daily Tasks

### Risk Assessment
1. **Risks → New Risk** — enter threat, probability (1–5), impact (1–5)
2. Score = probability × impact (calculated automatically)
3. Add **treatment plans** by clicking a risk entry → "Treatment" tab
4. Link to SoA controls via "🔗 Links" in the edit form

### Maintaining SoA Controls
1. **SoA → Framework tab** (ISO 27001, NIS2, BSI …)
2. Click control → set status (applicable / not-applicable / partial)
3. Enter justification and measures
4. **Inline edit:** double-click any field for quick changes

### NIS2 Reporting Obligation (72h deadline)
- Incidents with "reportable" status in CISO Inbox → prepare BSI/authority report
- Configure reporting threshold in **Settings → CISO/ISB**
- Timer runs from capture; escalation email triggered automatically after SLA

### Preparing Management Review
1. **Governance → Management Review → New Review**
2. Enter agenda, attendees, decisions
3. Link action items directly to the review
4. Export **Reports → Compliance Matrix** as attachment (CSV)

---

## Reports & Evidence

| Report | Access | Format |
|---|---|---|
| Compliance Matrix | Reports → Compliance Matrix | Table + CSV |
| Gap Report | Reports → Gap Report | Table + CSV |
| Framework Overview | Reports → Framework | Table |
| Risk Export | Risks → CSV | CSV |

---

## Notes on Independence
The CISO/ISB reports directly to executive management (ISO 27001 clause 5.1). The role must not conflict with operational IT responsibilities.
`
  },
  seed_guide_dsb: {
    title: 'User Guide: DPO / Data Protection Officer (GDPO)',
    content: `# User Guide: DPO / Data Protection Officer

The Data Protection Officer (DPO / GDPO) monitors compliance with GDPR and related data protection regulations.

> **Independence:** The DPO is free from instructions in performing their tasks (Art. 38(3) GDPR) and may not be dismissed or penalised for performing their duties. They report directly to the highest level of management.

---

## Module Overview

| Module | Task | Location |
|---|---|---|
| **RoPA** | Records of Processing Activities (Art. 30) | Privacy → RoPA |
| **DPA** | Data Processing Agreements | Privacy → DPA |
| **DPIA** | Data Protection Impact Assessment (Art. 35) | Privacy → DPIA |
| **TOMs** | Technical & organisational measures | Privacy → TOMs |
| **DSAR** | Data Subject Access Requests | Privacy → DSAR |
| **72h Timer** | Breach notification deadline tracking | Privacy → Incidents |
| **Deletion Log** | Art. 17 erasure record | Privacy → Deletion Log |
| **Privacy Policies** | Manage current policies | Legal → Policies |
| **Settings (GDPO)** | DSAR deadlines, DPO contact, authorities | Settings |

---

## Daily Tasks

### Maintaining RoPA
1. **Privacy → RoPA → New Entry**
2. Required fields: name, purpose, legal basis (Art. 6/9), data categories, data subjects, recipients, retention periods
3. Third country transfers: enter country + safeguard (SCCs, BCRs)
4. CSV export via the "CSV" button in the filter bar

### Conducting DPIA (Art. 35 GDPR)
1. **Privacy → DPIA → New Assessment**
2. Threshold check: risk assessment for rights and freedoms
3. Document planned measures and residual risk
4. Status: draft → under review → completed

### Managing 72h Breach Notification
1. Record breach in **Privacy → Incidents**
2. System automatically starts 72h countdown from capture
3. On expiry: document authority notification
4. Authority contact details in **Settings → DPO/GDPO**

### Processing DSAR (Subject Access Requests)
1. **Privacy → DSAR → New Request**
2. Deadline calculated automatically per GDPO settings (default: 30 days, extendable to 90)
3. Status: Received → In Progress → Completed / Rejected

---

## Evidence & Documentation

| Document | Access | Art. GDPR |
|---|---|---|
| RoPA (CSV) | RoPA → Export CSV | Art. 30 |
| DPIA Report | DPIA → Detail view | Art. 35 |
| DPA Overview | Privacy → DPA | Art. 28 |
| TOM Evidence | Privacy → TOMs | Art. 32 |
| Deletion Log | Privacy → Deletion Log | Art. 17 |
`
  },
  seed_guide_revision: {
    title: 'User Guide: Internal Audit',
    content: `# User Guide: Internal Audit

Internal Audit independently reviews the effectiveness of the ISMS and internal control systems.

> **Independence:** Internal Audit is functionally and organisationally independent (IIA Standard 1100, IDW PS 321). It reports directly to the Board / Executive Management or Audit Committee and is free from operational management instructions.

---

## Module Overview

| Module | Audit Subject | Location |
|---|---|---|
| **SoA** | Implementation status of all controls | Menu: SoA |
| **Reports** | Compliance matrix, gap report, review cycles | Menu: Reports |
| **Audit Log** | Traceability of all system actions | Admin Console → Audit Log |
| **Risk Management** | Completeness of risk register, treatment status | Menu: Risks |
| **Governance** | Management review minutes, action status | Menu: Governance |
| **Training** | Training records, coverage rate | Menu: Training |
| **BCM** | Exercise reports, BIA currency | Menu: BCM |

---

## Audit Procedures

### Assessing Compliance Status
1. **Reports → Compliance Matrix:** traffic light view Control × Entity
2. Red cells = missing implementation → query module owner
3. **Reports → Gap Report:** all controls with status "not applicable" or no measure
4. CSV export as working paper

### Reviewing SoA Controls
1. **SoA → select framework** (ISO 27001, NIS2, BSI …)
2. Filter "not-applicable" → check justifications for plausibility
3. Sampling: controls "applicable" with status "planned/partial" → request implementation evidence

### Evaluating Audit Log (admin access required)
1. **Admin Console → Audit Log**
2. Filter by period, user or action
3. Critical actions: permanent_delete, demo_reset, settings changes

### Tracing Risk Assessments
1. **Risks → List:** check score, last edit date, treatment status
2. Identify untreated high risks (score ≥ 15)
3. Trace linked controls in the detail panel

---

## Audit Reports & Working Papers

| Evidence | Access | Note |
|---|---|---|
| Compliance Matrix | Reports → Compliance Matrix + CSV | Record reference date |
| Gap Report | Reports → Gap Report + CSV | Document delta vs. prior year |
| Risk Export | Risks → CSV | Completeness check |
| Audit Log Export | Admin → Audit Log → CSV | Note tamper protection |
| Training Records | Training → List | Coverage rate by department |
`
  },
  seed_guide_qmb: {
    title: 'User Guide: QMO / Quality Management Officer',
    content: `# User Guide: QMO / Quality Management Officer

The Quality Management Officer (QMO) coordinates the QMS to ISO 9001 or sector-specific standards (IATF 16949, ISO 13485, AS9100) and ensures integration with the ISMS.

---

## Module Overview

| Module | Task | Location |
|---|---|---|
| **SoA – ISO 9001** | Assess ISO 9001:2015 controls | SoA → "ISO 9001" tab |
| **Risk Management** | Risks per ISO 9001 clause 6.1 | Menu: Risks |
| **Governance** | Management reviews (ISO 9001 clause 9.3) | Menu: Governance |
| **Training** | Training measures, competence records | Menu: Training |
| **Security Goals** | QM goals with KPI tracking | Menu: Goals |
| **Policies** | QM manual, work instructions | Menu: Policies |
| **Reports** | Compliance matrix ISO 9001, review cycles | Menu: Reports |

---

## Daily Tasks

### Maintaining ISO 9001 Controls
1. **SoA → "ISO 9001" tab**
2. Assess controls by current implementation (applicable / partial / not-applicable)
3. Key clauses: 4 (Context), 6.1 (Risks), 7 (Support), 8 (Operation), 9 (Evaluation), 10 (Improvement)
4. Link to policies via "🔗 Links"

### Managing QM Risks
1. **Risks → New Risk** — link ISO 9001 controls via "🔗 Links"
2. Quality-related risks: supplier failure, product defects, competence gaps
3. Treatment measures: document FMEA results as actions

### Tracking QM Goals with KPIs
1. **Goals → New Goal** (applies to all ISMS/QM goals)
2. Define target value, actual value, unit (%, count, days) and deadline
3. Update regularly — progress bar shows achievement

### Management Review (ISO 9001 clause 9.3)
1. **Governance → Management Review → New Review**
2. ISO 9001 mandatory topics: customer feedback, audit results, goal status, resources
3. Record decisions as action items (owner + due date)

---

## Reports & Certification Documents

| Document | Access | ISO 9001 Clause |
|---|---|---|
| Compliance Matrix ISO 9001 | Reports → Compliance Matrix (Framework: ISO 9001) + CSV | 9.1.3 |
| Goal Achievement | Goals → Overview | 9.1 |
| Training Records | Training → List | 7.2 |
| Management Review Minutes | Governance → Review → Detail | 9.3 |
| Risk Assessment | Risks → CSV Export | 6.1 |
`
  },
  seed_guide_abtlg: {
    title: 'User Guide: Department Head / Subject Matter Expert',
    content: `# User Guide: Department Head / Subject Matter Expert

This guide is for department heads (dept_head) and subject matter experts who maintain policies, risks and training for their area.

---

## Your Role in the ISMS

| Task | Module | Access |
|---|---|---|
| Maintain policies for your area | Policies | Read + create/edit |
| Report and assess risks | Risk Management | Read + edit |
| Plan training measures | Training | Read + edit |
| Manage your area's assets | Asset Management | Read + edit |
| Comment on SoA controls | SoA | Read (+ inline edit with contentowner) |
| Report incidents | Public form / Incidents | Submit + read |

---

## Daily Tasks

### Editing a Policy
1. Open **Policies** from the menu
2. Select your policy from the tree
3. Click **Edit** → update content, set "Next Review" date
4. Set status to **"review"** so CISO/content owner can approve
5. After approval by content owner the status becomes **"approved"**

### Reporting a Risk
1. **Risks → New Risk**
2. Describe the threat, estimate probability and impact (1–5)
3. Enter a proposed treatment measure
4. Enter your department as "Owner"

### Planning Training
1. **Training → New Measure**
2. Enter topic, target audience (department), date, mandatory flag
3. After completion: enter results and number of participants

### Reporting a Security Incident
- **From inside (logged in):** Incidents → New Incident
- **From outside / anonymous:** Login page → "Report Security Incident" (no login required)
- Required fields: email, incident type, description

---

## Dashboards & Overviews

The **Dashboard** shows:
- Current risks in your area (Top 5)
- Upcoming reviews and due dates (14-day preview)
- Open DSARs and 72h notifications (if GDPR access)
- KPI cards for all active modules

The **Calendar** shows all due dates:
- Policy review dates
- Training dates
- Asset end-of-life dates
- Contract expiry dates

---

## What You Cannot Do (and Why)

| Blocked Action | Reason |
|---|---|
| Approve policies (set "Approved") | Content owner / admin only (four-eyes principle) |
| Create users | Admin only |
| Permanently delete policies | Admin only (recycle bin available) |
| Approve SoA controls | CISO / content owner only |
| Access Admin Console | Admin only |

---

## Tips

- **Name search:** The search bar in the top bar finds policies, risks and controls globally
- **Links:** In every form under "🔗 Links" you can link SoA controls and policies — helpful for compliance evidence
- **Guidance:** This section contains further guides for all modules
`
  }
}

const ROLE_GUIDES_FR = {
  seed_guide_ciso: {
    title: 'Guide utilisateur : CISO / Responsable de la sécurité de l\'information',
    content: `# Guide utilisateur : CISO / Responsable de la sécurité de l'information

Le CISO (Chief Information Security Officer) porte la responsabilité globale du SMSI. Ce guide explique les modules clés et les tâches quotidiennes.

---

## Vue d'ensemble des modules

| Module | Tâche | Emplacement |
|---|---|---|
| **Gestion des risques** | Enregistrer, évaluer et traiter les risques | Menu : Risques |
| **SoA** | Évaluer les contrôles, maintenir l'applicabilité et le statut | Menu : SoA |
| **Objectifs de sécurité** | Définir les KPI, suivre la progression | Menu : Objectifs |
| **Boîte de réception incidents** | Traiter les incidents de sécurité signalés | Menu : Incidents |
| **Chaîne d'approvisionnement** | Surveiller les fournisseurs, obligations NIS2 | Menu : Fournisseurs |
| **BCM / PCA** | Analyses d'impact métier, plans, exercices | Menu : BCM |
| **Gouvernance** | Revues de direction, plans d'action | Menu : Gouvernance |
| **Rapports** | Matrice de conformité, rapport d'écarts, export CSV | Menu : Rapports |
| **Paramètres (CISO)** | SLA, seuil de notification, e-mail d'escalade | Menu : Paramètres |

---

## Tâches quotidiennes

### Évaluation des risques
1. **Risques → Nouveau risque** — saisir la menace, la probabilité (1–5), l'impact (1–5)
2. Score = probabilité × impact (calculé automatiquement)
3. Ajouter des **plans de traitement** en cliquant sur une entrée de risque → onglet "Traitement"
4. Lier aux contrôles SoA via "🔗 Liens" dans le formulaire d'édition

### Maintenance des contrôles SoA
1. **SoA → Onglet référentiel** (ISO 27001, NIS2, BSI …)
2. Cliquer sur un contrôle → définir le statut (applicable / non-applicable / partiel)
3. Saisir la justification et les mesures
4. **Édition en ligne :** double-cliquer sur un champ pour des modifications rapides

### Obligation de déclaration NIS2 (délai 72h)
- Incidents avec statut "à déclarer" dans la boîte CISO → préparer le rapport BSI/autorité
- Configurer le seuil de déclaration dans **Paramètres → CISO/ISB**
- La minuterie démarre à la saisie ; l'e-mail d'escalade se déclenche automatiquement après le SLA

### Préparation de la revue de direction
1. **Gouvernance → Revue de direction → Nouvelle revue**
2. Saisir l'ordre du jour, les participants, les décisions
3. Lier les plans d'action directement à la revue
4. Exporter **Rapports → Matrice de conformité** en pièce jointe (CSV)

---

## Rapports & Preuves

| Rapport | Accès | Format |
|---|---|---|
| Matrice de conformité | Rapports → Matrice de conformité | Tableau + CSV |
| Rapport d'écarts | Rapports → Rapport d'écarts | Tableau + CSV |
| Vue d'ensemble référentiel | Rapports → Référentiel | Tableau |
| Export risques | Risques → CSV | CSV |

---

## Notes sur l'indépendance
Le CISO/ISB rend compte directement à la direction générale (ISO 27001 clause 5.1). Le rôle ne doit pas entrer en conflit avec les responsabilités opérationnelles IT.
`
  },
  seed_guide_dsb: {
    title: 'Guide utilisateur : DPO / Délégué à la Protection des Données',
    content: `# Guide utilisateur : DPO / Délégué à la Protection des Données

Le Délégué à la Protection des Données (DPO) surveille le respect du RGPD et des réglementations connexes sur la protection des données.

> **Indépendance :** Le DPO est libre de toute instruction dans l'exercice de ses fonctions (Art. 38(3) RGPD) et ne peut être révoqué ou pénalisé pour l'exercice de ses fonctions. Il rend compte directement au plus haut niveau de la direction.

---

## Vue d'ensemble des modules

| Module | Tâche | Emplacement |
|---|---|---|
| **RoPA** | Registre des activités de traitement (Art. 30) | Vie privée → RoPA |
| **APD** | Accords de traitement des données | Vie privée → APD |
| **AIPD** | Analyse d'impact relative à la protection des données (Art. 35) | Vie privée → AIPD |
| **TOMs** | Mesures techniques et organisationnelles | Vie privée → TOMs |
| **DSARs** | Demandes d'accès des personnes concernées | Vie privée → DSAR |
| **Minuterie 72h** | Suivi du délai de notification des violations | Vie privée → Incidents |
| **Journal de suppression** | Enregistrement des effacements Art. 17 | Vie privée → Journal de suppression |
| **Politiques de confidentialité** | Gérer les politiques actuelles | Juridique → Politiques |
| **Paramètres (DPO)** | Délais DSAR, contact DPO, autorités | Paramètres |

---

## Tâches quotidiennes

### Maintien du RoPA
1. **Vie privée → RoPA → Nouvelle entrée**
2. Champs obligatoires : nom, finalité, base légale (Art. 6/9), catégories de données, personnes concernées, destinataires, durées de conservation
3. Transferts vers des pays tiers : saisir le pays + garantie (CCT, BCR)
4. Export CSV via le bouton "CSV" dans la barre de filtre

### Réalisation d'une AIPD (Art. 35 RGPD)
1. **Vie privée → AIPD → Nouvelle évaluation**
2. Test de seuil : évaluation des risques pour les droits et libertés
3. Documenter les mesures prévues et le risque résiduel
4. Statut : brouillon → en cours de révision → terminé

### Gestion de la notification de violation 72h
1. Enregistrer la violation dans **Vie privée → Incidents**
2. Le système démarre automatiquement le compte à rebours de 72h à partir de la saisie
3. À l'expiration : documenter la notification à l'autorité
4. Coordonnées de l'autorité dans **Paramètres → DPO**

### Traitement des DSAR
1. **Vie privée → DSAR → Nouvelle demande**
2. Délai calculé automatiquement selon les paramètres DPO (défaut : 30 jours, extensible à 90)
3. Statut : Reçu → En cours → Terminé / Rejeté

---

## Preuves & Documentation

| Document | Accès | Art. RGPD |
|---|---|---|
| RoPA (CSV) | RoPA → Exporter CSV | Art. 30 |
| Rapport AIPD | AIPD → Vue détaillée | Art. 35 |
| Aperçu APD | Vie privée → APD | Art. 28 |
| Preuve TOM | Vie privée → TOMs | Art. 32 |
| Journal de suppression | Vie privée → Journal de suppression | Art. 17 |
`
  },
  seed_guide_revision: {
    title: 'Guide utilisateur : Audit interne',
    content: `# Guide utilisateur : Audit interne

L'audit interne examine de manière indépendante l'efficacité du SMSI et des systèmes de contrôle interne.

> **Indépendance :** L'audit interne est fonctionnellement et organisationnellement indépendant. Il rend compte directement au Conseil d'administration ou au Comité d'audit et est libre des instructions de la direction opérationnelle.

---

## Vue d'ensemble des modules

| Module | Objet de l'audit | Emplacement |
|---|---|---|
| **SoA** | Statut d'implémentation de tous les contrôles | Menu : SoA |
| **Rapports** | Matrice de conformité, rapport d'écarts, cycles de révision | Menu : Rapports |
| **Journal d'audit** | Traçabilité de toutes les actions système | Console Admin → Journal d'audit |
| **Gestion des risques** | Exhaustivité du registre des risques, statut des traitements | Menu : Risques |
| **Gouvernance** | Procès-verbaux de revue de direction, statut des actions | Menu : Gouvernance |
| **Formation** | Enregistrements de formation, taux de couverture | Menu : Formation |
| **BCM** | Rapports d'exercices, actualité des BIA | Menu : BCM |

---

## Procédures d'audit

### Évaluation du statut de conformité
1. **Rapports → Matrice de conformité :** vue en feux tricolores Contrôle × Entité
2. Cases rouges = implémentation manquante → interroger le propriétaire du module
3. **Rapports → Rapport d'écarts :** tous les contrôles avec statut "non-applicable" ou sans mesure
4. Export CSV comme document de travail

### Révision des contrôles SoA
1. **SoA → sélectionner le référentiel** (ISO 27001, NIS2, BSI …)
2. Filtrer "non-applicable" → vérifier la plausibilité des justifications
3. Échantillonnage : contrôles "applicable" avec statut "planifié/partiel" → demander des preuves d'implémentation

### Évaluation du journal d'audit (accès admin requis)
1. **Console Admin → Journal d'audit**
2. Filtrer par période, utilisateur ou action
3. Actions critiques : suppression_permanente, réinitialisation_démo, modifications des paramètres

### Traçage des évaluations des risques
1. **Risques → Liste :** vérifier le score, la date de dernière modification, le statut du traitement
2. Identifier les risques élevés non traités (score ≥ 15)
3. Tracer les contrôles liés dans le panneau de détail

---

## Rapports d'audit & Documents de travail

| Preuve | Accès | Note |
|---|---|---|
| Matrice de conformité | Rapports → Matrice de conformité + CSV | Enregistrer la date de référence |
| Rapport d'écarts | Rapports → Rapport d'écarts + CSV | Documenter le delta vs. année précédente |
| Export risques | Risques → CSV | Vérification de l'exhaustivité |
| Export journal d'audit | Admin → Journal d'audit → CSV | Noter la protection contre la falsification |
| Enregistrements de formation | Formation → Liste | Taux de couverture par département |
`
  },
  seed_guide_qmb: {
    title: 'Guide utilisateur : Responsable qualité (RQ)',
    content: `# Guide utilisateur : Responsable qualité (RQ)

Le Responsable qualité (RQ) coordonne le SMQ selon ISO 9001 ou des normes sectorielles et assure l'intégration avec le SMSI.

---

## Vue d'ensemble des modules

| Module | Tâche | Emplacement |
|---|---|---|
| **SoA – ISO 9001** | Évaluer les contrôles ISO 9001:2015 | SoA → onglet "ISO 9001" |
| **Gestion des risques** | Risques selon clause 6.1 ISO 9001 | Menu : Risques |
| **Gouvernance** | Revues de direction (clause 9.3 ISO 9001) | Menu : Gouvernance |
| **Formation** | Mesures de formation, enregistrements de compétences | Menu : Formation |
| **Objectifs de sécurité** | Objectifs QM avec suivi KPI | Menu : Objectifs |
| **Politiques** | Manuel QM, instructions de travail | Menu : Politiques |
| **Rapports** | Matrice de conformité ISO 9001, cycles de révision | Menu : Rapports |

---

## Tâches quotidiennes

### Maintien des contrôles ISO 9001
1. **SoA → onglet "ISO 9001"**
2. Évaluer les contrôles selon l'implémentation actuelle (applicable / partiel / non-applicable)
3. Clauses clés : 4 (Contexte), 6.1 (Risques), 7 (Support), 8 (Réalisation), 9 (Évaluation), 10 (Amélioration)
4. Lier aux politiques via "🔗 Liens"

### Gestion des risques QM
1. **Risques → Nouveau risque** — lier les contrôles ISO 9001 via "🔗 Liens"
2. Risques liés à la qualité : défaillance fournisseur, défauts produit, lacunes de compétences
3. Mesures de traitement : documenter les résultats AMDEC comme actions

### Suivi des objectifs QM avec KPI
1. **Objectifs → Nouvel objectif**
2. Définir la valeur cible, la valeur actuelle, l'unité (%, nombre, jours) et l'échéance
3. Mettre à jour régulièrement — la barre de progression affiche la réalisation

### Revue de direction (clause 9.3 ISO 9001)
1. **Gouvernance → Revue de direction → Nouvelle revue**
2. Sujets obligatoires ISO 9001 : retours clients, résultats d'audit, statut des objectifs, ressources
3. Enregistrer les décisions comme plans d'action (propriétaire + date d'échéance)

---

## Rapports & Documents de certification

| Document | Accès | Clause ISO 9001 |
|---|---|---|
| Matrice de conformité ISO 9001 | Rapports → Matrice de conformité (Référentiel : ISO 9001) + CSV | 9.1.3 |
| Réalisation des objectifs | Objectifs → Vue d'ensemble | 9.1 |
| Enregistrements de formation | Formation → Liste | 7.2 |
| PV de revue de direction | Gouvernance → Revue → Détail | 9.3 |
| Évaluation des risques | Risques → Export CSV | 6.1 |
`
  },
  seed_guide_abtlg: {
    title: 'Guide utilisateur : Chef de département / Expert métier',
    content: `# Guide utilisateur : Chef de département / Expert métier

Ce guide s'adresse aux chefs de département et aux experts métier qui maintiennent les politiques, les risques et les formations pour leur domaine.

---

## Votre rôle dans le SMSI

| Tâche | Module | Accès |
|---|---|---|
| Maintenir les politiques de votre domaine | Politiques | Lecture + création/édition |
| Signaler et évaluer les risques | Gestion des risques | Lecture + édition |
| Planifier les mesures de formation | Formation | Lecture + édition |
| Gérer les actifs de votre domaine | Gestion des actifs | Lecture + édition |
| Commenter les contrôles SoA | SoA | Lecture (+ édition en ligne avec contentowner) |
| Signaler les incidents | Formulaire public / Incidents | Soumettre + lire |

---

## Tâches quotidiennes

### Modifier une politique
1. Ouvrir **Politiques** dans le menu
2. Sélectionner votre politique dans l'arborescence
3. Cliquer sur **Modifier** → mettre à jour le contenu, définir la date "Prochaine révision"
4. Définir le statut sur **"révision"** pour que le CISO/propriétaire de contenu puisse approuver
5. Après approbation par le propriétaire de contenu, le statut devient **"approuvé"**

### Signaler un risque
1. **Risques → Nouveau risque**
2. Décrire la menace, estimer la probabilité et l'impact (1–5)
3. Saisir une mesure de traitement proposée
4. Saisir votre département comme "Propriétaire"

### Planifier une formation
1. **Formation → Nouvelle mesure**
2. Saisir le sujet, le public cible (département), la date, le caractère obligatoire
3. Après achèvement : saisir les résultats et le nombre de participants

### Signaler un incident de sécurité
- **De l'intérieur (connecté) :** Incidents → Nouvel incident
- **De l'extérieur / anonyme :** Page de connexion → "Signaler un incident de sécurité" (sans connexion)
- Champs obligatoires : e-mail, type d'incident, description

---

## Tableaux de bord & Aperçus

Le **Tableau de bord** affiche :
- Les risques actuels dans votre domaine (Top 5)
- Les révisions à venir et les échéances (aperçu 14 jours)
- Les DSARs ouverts et les notifications 72h (si accès RGPD)
- Les cartes KPI pour tous les modules actifs

Le **Calendrier** affiche toutes les échéances :
- Dates de révision des politiques
- Dates de formation
- Dates de fin de vie des actifs
- Dates d'expiration des contrats

---

## Ce que vous ne pouvez pas faire (et pourquoi)

| Action bloquée | Raison |
|---|---|
| Approuver les politiques (définir "Approuvé") | Propriétaire de contenu / admin uniquement (principe des quatre yeux) |
| Créer des utilisateurs | Admin uniquement |
| Supprimer définitivement les politiques | Admin uniquement (corbeille disponible) |
| Approuver les contrôles SoA | CISO / propriétaire de contenu uniquement |
| Accéder à la console d'administration | Admin uniquement |

---

## Conseils

- **Recherche par nom :** La barre de recherche en haut trouve globalement les politiques, les risques et les contrôles
- **Liens :** Dans chaque formulaire sous "🔗 Liens" vous pouvez lier les contrôles SoA et les politiques — utile pour les preuves de conformité
- **Guidance :** Cette section contient des guides supplémentaires pour tous les modules
`
  }
}

const ROLE_GUIDES_NL = {
  seed_guide_ciso: {
    title: 'Gebruikershandleiding: CISO / Informatiebeveiligingsmanager',
    content: `# Gebruikershandleiding: CISO / Informatiebeveiligingsmanager

De CISO (Chief Information Security Officer) draagt de algehele verantwoordelijkheid voor het ISMS. Deze handleiding legt de belangrijkste modules en dagelijkse taken uit.

---

## Module-overzicht

| Module | Taak | Locatie |
|---|---|---|
| **Risicobeheer** | Risico's registreren, beoordelen en behandelen | Menu: Risico's |
| **SoA** | Maatregelen beoordelen, toepasselijkheid & status bijhouden | Menu: SoA |
| **Beveiligingsdoelstellingen** | KPI's definiëren, voortgang bijhouden | Menu: Doelstellingen |
| **Incident-inbox** | Gerapporteerde beveiligingsincidenten verwerken | Menu: Incidenten |
| **Supply Chain** | Leveranciers bewaken, NIS2-verplichtingen | Menu: Leveranciers |
| **BCM / BCP** | Business Impact Analyses, plannen, oefeningen | Menu: BCM |
| **Governance** | Directiebeoordelingen, actiepakketten | Menu: Governance |
| **Rapporten** | Compliancematrix, gaprapport, CSV-export | Menu: Rapporten |
| **Instellingen (CISO)** | SLA, meldingsdrempel, escalatie-e-mail | Menu: Instellingen |

---

## Dagelijkse taken

### Risicobeoordeling
1. **Risico's → Nieuw risico** — bedreiging, kans (1–5), impact (1–5) invoeren
2. Score = kans × impact (automatisch berekend)
3. **Behandelplannen** toevoegen door op een risico-item te klikken → tabblad "Behandeling"
4. Koppelen aan SoA-maatregelen via "🔗 Koppelingen" in het bewerkingsformulier

### SoA-maatregelen onderhouden
1. **SoA → tabblad Norm** (ISO 27001, NIS2, BSI …)
2. Klik op een maatregel → status instellen (van toepassing / niet van toepassing / gedeeltelijk)
3. Motivering en maatregelen invoeren
4. **Inline bewerken:** dubbelklik op een veld voor snelle wijzigingen

### NIS2-meldingsplicht (72u-deadline)
- Incidenten met status "meldingsplichtig" in CISO-inbox → BSI/autoriteitsrapport voorbereiden
- Meldingsdrempel configureren in **Instellingen → CISO**
- Timer start bij registratie; escalatie-e-mail wordt automatisch getriggerd na SLA

### Directiebeoordeling voorbereiden
1. **Governance → Directiebeoordeling → Nieuwe beoordeling**
2. Agenda, deelnemers, besluiten invoeren
3. Actiepunten direct aan de beoordeling koppelen
4. **Rapporten → Compliancematrix** exporteren als bijlage (CSV)

---

## Rapporten & Bewijs

| Rapport | Toegang | Formaat |
|---|---|---|
| Compliancematrix | Rapporten → Compliancematrix | Tabel + CSV |
| Gaprapport | Rapporten → Gaprapport | Tabel + CSV |
| Normoverzicht | Rapporten → Norm | Tabel |
| Risico-export | Risico's → CSV | CSV |

---

## Opmerkingen over onafhankelijkheid
De CISO rapporteert rechtstreeks aan de directie (ISO 27001 clausule 5.1). De rol mag niet in conflict komen met operationele IT-verantwoordelijkheden.
`
  },
  seed_guide_dsb: {
    title: 'Gebruikershandleiding: FG / Functionaris voor Gegevensbescherming',
    content: `# Gebruikershandleiding: FG / Functionaris voor Gegevensbescherming

De Functionaris voor Gegevensbescherming (FG) bewaakt de naleving van de AVG en aanverwante privacyregelgeving.

> **Onafhankelijkheid:** De FG is vrij van instructies bij het uitvoeren van zijn taken (Art. 38(3) AVG) en mag niet worden ontslagen of bestraft voor het uitvoeren van zijn taken. Hij rapporteert rechtstreeks aan het hoogste bestuursniveau.

---

## Module-overzicht

| Module | Taak | Locatie |
|---|---|---|
| **Verwerkingsregister** | Register van verwerkingsactiviteiten (Art. 30) | Privacy → Verwerkingsregister |
| **AVG-overeenkomst** | Verwerkersovereenkomsten | Privacy → AVG-overeenkomst |
| **DPIA** | Gegevensbeschermingseffectbeoordeling (Art. 35) | Privacy → DPIA |
| **TOMs** | Technische en organisatorische maatregelen | Privacy → TOMs |
| **Inzageverzoeken** | Verzoeken van betrokkenen | Privacy → Inzageverzoek |
| **72u-timer** | Bijhouden van de meldingstermijn voor datalekken | Privacy → Incidenten |
| **Verwijderingslog** | Art. 17-verwijderingsregistratie | Privacy → Verwijderingslog |
| **Privacyverklaringen** | Actueel beleid beheren | Juridisch → Verklaringen |
| **Instellingen (FG)** | DSAR-termijnen, FG-contactgegevens, autoriteiten | Instellingen |

---

## Dagelijkse taken

### Verwerkingsregister bijhouden
1. **Privacy → Verwerkingsregister → Nieuwe invoer**
2. Verplichte velden: naam, doel, rechtsgrond (Art. 6/9), datacategorieën, betrokkenen, ontvangers, bewaartermijnen
3. Doorgifte aan derde landen: land + waarborg invoeren (SCCs, BCR)
4. CSV-export via de "CSV"-knop in de filterbalk

### DPIA uitvoeren (Art. 35 AVG)
1. **Privacy → DPIA → Nieuwe beoordeling**
2. Drempeltoets: risicobeoordeling voor rechten en vrijheden
3. Geplande maatregelen en restrisico documenteren
4. Status: concept → in beoordeling → afgerond

### Datalekmelding 72u beheren
1. Datalek registreren in **Privacy → Incidenten**
2. Systeem start automatisch 72u-aftelling bij registratie
3. Bij afloop: autoriteitsmelding documenteren
4. Contactgegevens autoriteit in **Instellingen → FG**

### Inzageverzoeken verwerken
1. **Privacy → Inzageverzoek → Nieuw verzoek**
2. Termijn automatisch berekend per FG-instellingen (standaard: 30 dagen, uitbreidbaar tot 90)
3. Status: Ontvangen → In behandeling → Afgerond / Afgewezen

---

## Bewijs & Documentatie

| Document | Toegang | Art. AVG |
|---|---|---|
| Verwerkingsregister (CSV) | Verwerkingsregister → CSV exporteren | Art. 30 |
| DPIA-rapport | DPIA → Detailweergave | Art. 35 |
| AVG-overeenkomstenoverzicht | Privacy → AVG-overeenkomst | Art. 28 |
| TOM-bewijs | Privacy → TOMs | Art. 32 |
| Verwijderingslog | Privacy → Verwijderingslog | Art. 17 |
`
  },
  seed_guide_revision: {
    title: 'Gebruikershandleiding: Interne Audit',
    content: `# Gebruikershandleiding: Interne Audit

Interne Audit beoordeelt onafhankelijk de effectiviteit van het ISMS en interne controlesystemen.

> **Onafhankelijkheid:** Interne Audit is functioneel en organisatorisch onafhankelijk. Het rapporteert rechtstreeks aan de Raad van Bestuur of het Auditcomité en is vrij van operationele managementinstructies.

---

## Module-overzicht

| Module | Auditonderwerp | Locatie |
|---|---|---|
| **SoA** | Implementatiestatus van alle maatregelen | Menu: SoA |
| **Rapporten** | Compliancematrix, gaprapport, beoordelingscycli | Menu: Rapporten |
| **Auditlog** | Traceerbaarheid van alle systeemacties | Beheerconsole → Auditlog |
| **Risicobeheer** | Volledigheid risicoregister, behandelingsstatus | Menu: Risico's |
| **Governance** | Notulen directiebeoordeling, actiestatus | Menu: Governance |
| **Training** | Trainingsregistraties, dekkingsgraad | Menu: Training |
| **BCM** | Oefeningsrapporten, actualiteit BIA | Menu: BCM |

---

## Auditprocedures

### Compliancestatus beoordelen
1. **Rapporten → Compliancematrix:** verkeerslichtweergave Maatregel × Entiteit
2. Rode cellen = ontbrekende implementatie → module-eigenaar bevragen
3. **Rapporten → Gaprapport:** alle maatregelen met status "niet van toepassing" of zonder maatregel
4. CSV-export als werkdocument

### SoA-maatregelen beoordelen
1. **SoA → norm selecteren** (ISO 27001, NIS2, BSI …)
2. Filteren op "niet van toepassing" → motiveringen controleren op plausibiliteit
3. Steekproef: maatregelen "van toepassing" met status "gepland/gedeeltelijk" → implementatiebewijs opvragen

### Auditlog evalueren (admin-toegang vereist)
1. **Beheerconsole → Auditlog**
2. Filteren op periode, gebruiker of actie
3. Kritieke acties: permanent_verwijderen, demo_reset, instellingswijzigingen

### Risicobeoordeling traceren
1. **Risico's → Lijst:** score, laatste wijzigingsdatum, behandelingsstatus controleren
2. Onbehandelde hoge risico's identificeren (score ≥ 15)
3. Gekoppelde maatregelen traceren in het detailvenster

---

## Auditrapporten & Werkdocumenten

| Bewijs | Toegang | Opmerking |
|---|---|---|
| Compliancematrix | Rapporten → Compliancematrix + CSV | Referentiedatum vastleggen |
| Gaprapport | Rapporten → Gaprapport + CSV | Delta t.o.v. vorig jaar documenteren |
| Risico-export | Risico's → CSV | Volledigheidscontrole |
| Auditlog-export | Admin → Auditlog → CSV | Manipulatiebeveiliging vermelden |
| Trainingsregistraties | Training → Lijst | Dekkingsgraad per afdeling |
`
  },
  seed_guide_qmb: {
    title: 'Gebruikershandleiding: KAM / Kwaliteitsmanager',
    content: `# Gebruikershandleiding: KAM / Kwaliteitsmanager

De Kwaliteitsmanager (KAM) coördineert het KMS volgens ISO 9001 of sectorspecifieke normen en zorgt voor integratie met het ISMS.

---

## Module-overzicht

| Module | Taak | Locatie |
|---|---|---|
| **SoA – ISO 9001** | ISO 9001:2015 maatregelen beoordelen | SoA → tabblad "ISO 9001" |
| **Risicobeheer** | Risico's per ISO 9001 clausule 6.1 | Menu: Risico's |
| **Governance** | Directiebeoordelingen (ISO 9001 clausule 9.3) | Menu: Governance |
| **Training** | Trainingsmaatregelen, competentieregistraties | Menu: Training |
| **Beveiligingsdoelstellingen** | KM-doelstellingen met KPI-tracking | Menu: Doelstellingen |
| **Beleid** | KM-handboek, werkinstructies | Menu: Beleid |
| **Rapporten** | Compliancematrix ISO 9001, beoordelingscycli | Menu: Rapporten |

---

## Dagelijkse taken

### ISO 9001 maatregelen onderhouden
1. **SoA → tabblad "ISO 9001"**
2. Maatregelen beoordelen op huidige implementatie (van toepassing / gedeeltelijk / niet van toepassing)
3. Sleutelclausules: 4 (Context), 6.1 (Risico's), 7 (Ondersteuning), 8 (Uitvoering), 9 (Evaluatie), 10 (Verbetering)
4. Koppelen aan beleid via "🔗 Koppelingen"

### KM-risico's beheren
1. **Risico's → Nieuw risico** — ISO 9001 maatregelen koppelen via "🔗 Koppelingen"
2. Kwaliteitsgerelateerde risico's: leveranciersfalen, productdefecten, competentiehiaten
3. Behandelmaatregelen: FMEA-resultaten als acties documenteren

### KM-doelstellingen bijhouden met KPI's
1. **Doelstellingen → Nieuwe doelstelling**
2. Streefwaarde, actuele waarde, eenheid (%, aantal, dagen) en deadline definiëren
3. Regelmatig bijwerken — voortgangsbalk toont realisatie

### Directiebeoordeling (ISO 9001 clausule 9.3)
1. **Governance → Directiebeoordeling → Nieuwe beoordeling**
2. ISO 9001 verplichte onderwerpen: klantfeedback, auditresultaten, doelstellingsstatus, middelen
3. Besluiten vastleggen als actiepunten (eigenaar + vervaldatum)

---

## Rapporten & Certificeringsdocumenten

| Document | Toegang | ISO 9001 Clausule |
|---|---|---|
| Compliancematrix ISO 9001 | Rapporten → Compliancematrix (Norm: ISO 9001) + CSV | 9.1.3 |
| Doelstellingenrealisatie | Doelstellingen → Overzicht | 9.1 |
| Trainingsregistraties | Training → Lijst | 7.2 |
| Notulen directiebeoordeling | Governance → Beoordeling → Detail | 9.3 |
| Risicobeoordeling | Risico's → CSV-export | 6.1 |
`
  },
  seed_guide_abtlg: {
    title: 'Gebruikershandleiding: Afdelingshoofd / Vakexpert',
    content: `# Gebruikershandleiding: Afdelingshoofd / Vakexpert

Deze handleiding is bedoeld voor afdelingshoofden en vakexperts die beleid, risico's en trainingen voor hun afdeling beheren.

---

## Uw rol in het ISMS

| Taak | Module | Toegang |
|---|---|---|
| Beleid voor uw afdeling beheren | Beleid | Lezen + aanmaken/bewerken |
| Risico's melden en beoordelen | Risicobeheer | Lezen + bewerken |
| Trainingsmaatregelen plannen | Training | Lezen + bewerken |
| Activa van uw afdeling beheren | Activabeheer | Lezen + bewerken |
| Commentaar geven op SoA-maatregelen | SoA | Lezen (+ inline bewerken met inhoudseigenaar) |
| Incidenten melden | Openbaar formulier / Incidenten | Indienen + lezen |

---

## Dagelijkse taken

### Een beleidsdocument bewerken
1. Open **Beleid** vanuit het menu
2. Selecteer uw beleid uit de boomstructuur
3. Klik op **Bewerken** → inhoud bijwerken, datum "Volgende beoordeling" instellen
4. Status instellen op **"beoordeling"** zodat CISO/inhoudseigenaar kan goedkeuren
5. Na goedkeuring door inhoudseigenaar wordt de status **"goedgekeurd"**

### Een risico melden
1. **Risico's → Nieuw risico**
2. Bedreiging beschrijven, kans en impact schatten (1–5)
3. Een voorgestelde behandelmaatregel invoeren
4. Uw afdeling invoeren als "Eigenaar"

### Training plannen
1. **Training → Nieuwe maatregel**
2. Onderwerp, doelgroep (afdeling), datum, verplicht/niet verplicht invoeren
3. Na afronding: resultaten en aantal deelnemers invoeren

### Een beveiligingsincident melden
- **Van binnenuit (ingelogd):** Incidenten → Nieuw incident
- **Van buiten / anoniem:** Inlogpagina → "Beveiligingsincident melden" (geen login vereist)
- Verplichte velden: e-mail, incidenttype, beschrijving

---

## Dashboards & Overzichten

Het **Dashboard** toont:
- Huidige risico's in uw afdeling (Top 5)
- Aankomende beoordelingen en vervaldatums (14-dagenvooruitblik)
- Open inzageverzoeken en 72u-meldingen (bij AVG-toegang)
- KPI-kaarten voor alle actieve modules

De **Kalender** toont alle vervaldatums:
- Beoordelingsdata beleid
- Trainingsdatums
- Eindedatumsdata activa
- Vervaldatums contracten

---

## Wat u niet kunt doen (en waarom)

| Geblokkeerde actie | Reden |
|---|---|
| Beleid goedkeuren (status "Goedgekeurd" instellen) | Alleen inhoudseigenaar / admin (vier-ogenprincipe) |
| Gebruikers aanmaken | Alleen admin |
| Beleid permanent verwijderen | Alleen admin (prullenbak beschikbaar) |
| SoA-maatregelen goedkeuren | Alleen CISO / inhoudseigenaar |
| Toegang tot beheerconsole | Alleen admin |

---

## Tips

- **Naamzoekopdracht:** De zoekbalk bovenaan vindt globaal beleid, risico's en maatregelen
- **Koppelingen:** In elk formulier onder "🔗 Koppelingen" kunt u SoA-maatregelen en beleid koppelen — handig voor compliancebewijs
- **Guidance:** Dit gedeelte bevat verdere handleidingen voor alle modules
`
  }
}

const ROLE_GUIDES_I18N = {
  de: null,  // DE is in ROLE_GUIDES above
  en: ROLE_GUIDES_EN,
  fr: ROLE_GUIDES_FR,
  nl: ROLE_GUIDES_NL,
}

function seedRoleGuidesI18n() {
  const lang = _getDemoLang()
  const langGuides = ROLE_GUIDES_I18N[lang] || ROLE_GUIDES_I18N.en
  const docs = load()
  let changed = false
  for (const guide of ROLE_GUIDES) {
    const override = langGuides ? langGuides[guide.seedId] : null
    const title   = override ? override.title   : guide.title
    const content = override ? override.content : guide.content
    if (_upsertSeed(docs, guide.seedId, { id: guide.id, category: 'rollen', type: 'markdown', pinOrder: guide.pinOrder, minRole: guide.minRole, title, content })) changed = true
  }
  if (changed) save(docs)
}

// ── Seed: ISO-Controls Rechtlicher Hinweis ──────────────────────────────────
const ISO_NOTICE_SEED_ID = 'seed_iso_controls_notice'

const ISO_NOTICE_DE = `# <span style="color:#FFD700">⚠</span> Rechtlicher Hinweis: ISO-Controls — Manuelle Installation erforderlich

> <span style="color:#FFD700">**⚠ Dieser Hinweis ist verbindlich. Er gilt für alle Administratoren, Betreiber und Nutzer dieser Plattform.**</span>

---

## Was ist zu beachten?

**ISO 27001:2022, ISO 9000:2015 und ISO 9001:2015** sind urheberrechtlich geschützte Normen der
International Organization for Standardization (ISO, © ISO).

Die vollständigen Control-Definitionen — Titel, Beschreibungstexte und Anforderungsinhalte — sind
**nicht Bestandteil dieser Software** und dürfen **ohne gültige ISO-Lizenz weder weitergegeben
noch in einem System gespeichert oder genutzt werden**.

---

## Was muss der Administrator tun?

Die SoA-Module für ISO 27001, ISO 9000 und ISO 9001 werden **ohne Norminhalte** ausgeliefert.
Der Administrator ist verpflichtet, die Controls **eigenhändig** zu importieren:

1. **Lizenzierte Kopie beschaffen** — über [iso.org](https://www.iso.org/) oder einen autorisierten nationalen Händler (z. B. DIN, Beuth)
2. **JSON-Datei vorbereiten** — Format gemäß \`scripts/import-iso-controls.sh\`
3. **Importer ausführen:**
   \`\`\`bash
   bash scripts/import-iso-controls.sh /pfad/zur/iso-controls.json
   \`\`\`
4. **Server neu starten**

---

## Welche Frameworks sind bereits enthalten?

Die folgenden Frameworks basieren auf öffentlich verfügbaren EU-Rechtsakten bzw.
Bundesbehörden-Veröffentlichungen und sind **vollständig vorinstalliert** — keine Lizenz erforderlich:

| Framework | Grundlage |
|---|---|
| **BSI IT-Grundschutz** | Bundesamt für Sicherheit in der Informationstechnik (BSI) |
| **EU NIS2** | EU-Richtlinie 2022/2555 |
| **EUCS** | ENISA European Cybersecurity Certification Scheme for Cloud |
| **EU AI Act** | EU-Verordnung 2024/1689 |
| **CRA** | EU Cyber Resilience Act |

---

## Rechtsgrundlage

ISO-Normen sind nach **§ 2 UrhG** (Sprachwerke) sowie dem
**Berner Übereinkommen über den Schutz von Werken der Literatur und Kunst** urheberrechtlich geschützt.
Unbefugte Vervielfältigung, öffentliche Zugänglichmachung oder Speicherung — auch im internen
Unternehmensbetrieb ohne Lizenz — ist **unzulässig**.

**Die Verantwortung für den lizenzkonformen Betrieb liegt ausschließlich beim Betreiber dieser Installation.**
Die ISMS Builder-Autoren übernehmen keine Haftung für unlizenzierte Nutzung von ISO-geschützten Inhalten.
`

const ISO_NOTICE_EN = `# <span style="color:#FFD700">⚠</span> Legal Notice: ISO Controls — Manual Installation Required

> <span style="color:#FFD700">**⚠ This notice is binding. It applies to all administrators, operators and users of this platform.**</span>

---

## What you need to know

**ISO 27001:2022, ISO 9000:2015, and ISO 9001:2015** are copyright-protected standards published
by the International Organization for Standardization (ISO, © ISO).

The complete control definitions — titles, descriptions, and requirement text — are
**not included in this software** and must **not be stored, distributed or used without a valid ISO licence**.

---

## What must the administrator do?

The SoA modules for ISO 27001, ISO 9000, and ISO 9001 are delivered **without control content**.
The administrator is required to import the controls **manually**:

1. **Obtain a licensed copy** — from [iso.org](https://www.iso.org/) or an authorised national body
2. **Prepare a JSON file** — format documented in \`scripts/import-iso-controls.sh\`
3. **Run the import script:**
   \`\`\`bash
   bash scripts/import-iso-controls.sh /path/to/iso-controls.json
   \`\`\`
4. **Restart the server**

---

## Which frameworks are already included?

The following frameworks are based on publicly available EU legislation or federal publications
and are **fully pre-installed** — no licence required:

| Framework | Legal Basis |
|---|---|
| **BSI IT-Grundschutz** | German Federal Office for Information Security (BSI) |
| **EU NIS2** | EU Directive 2022/2555 |
| **EUCS** | ENISA European Cybersecurity Certification Scheme for Cloud |
| **EU AI Act** | EU Regulation 2024/1689 |
| **CRA** | EU Cyber Resilience Act |

---

## Legal basis

ISO standards are protected under copyright law (Berne Convention, national implementations).
Unauthorised reproduction, public communication or storage — even for internal business use
without a licence — is **not permitted**.

**Responsibility for licence-compliant operation rests solely with the operator of this installation.**
The ISMS Builder authors accept no liability for unlicensed use of ISO-protected content.
`

const ISO_NOTICE_FR = `# <span style="color:#FFD700">⚠</span> Avis juridique : Contrôles ISO — Installation manuelle requise

> <span style="color:#FFD700">**⚠ Cet avis est contraignant. Il s'applique à tous les administrateurs, opérateurs et utilisateurs de cette plateforme.**</span>

---

## Ce que vous devez savoir

**ISO 27001:2022, ISO 9000:2015 et ISO 9001:2015** sont des normes protégées par le droit d'auteur, publiées
par l'Organisation internationale de normalisation (ISO, © ISO).

Les définitions complètes des contrôles — titres, descriptions et textes d'exigences —
**ne sont pas incluses dans ce logiciel** et ne doivent **pas être stockées, distribuées ou utilisées sans une licence ISO valide**.

---

## Que doit faire l'administrateur ?

Les modules SoA pour ISO 27001, ISO 9000 et ISO 9001 sont livrés **sans contenu de contrôle**.
L'administrateur est tenu d'importer les contrôles **manuellement** :

1. **Obtenir une copie sous licence** — sur [iso.org](https://www.iso.org/) ou un organisme national agréé
2. **Préparer un fichier JSON** — format documenté dans \`scripts/import-iso-controls.sh\`
3. **Exécuter le script d'importation :**
   \`\`\`bash
   bash scripts/import-iso-controls.sh /chemin/vers/iso-controls.json
   \`\`\`
4. **Redémarrer le serveur**

---

## Quels référentiels sont déjà inclus ?

Les référentiels suivants sont basés sur des textes législatifs UE publiquement disponibles
et sont **entièrement préinstallés** — aucune licence requise :

| Référentiel | Base légale |
|---|---|
| **BSI IT-Grundschutz** | Office fédéral allemand pour la sécurité de l'information (BSI) |
| **EU NIS2** | Directive UE 2022/2555 |
| **EUCS** | Schéma de certification de cybersécurité cloud ENISA |
| **EU AI Act** | Règlement UE 2024/1689 |
| **CRA** | Cyber Resilience Act UE |

---

## Base juridique

Les normes ISO sont protégées par le droit d'auteur (Convention de Berne, implementations nationales).
La reproduction, communication publique ou stockage non autorisés — même pour un usage professionnel interne
sans licence — est **interdit**.

**La responsabilité du fonctionnement conforme aux licences incombe exclusivement à l'opérateur de cette installation.**
Les auteurs d'ISMS Builder n'acceptent aucune responsabilité pour l'utilisation non licenciée de contenus protégés par ISO.
`

const ISO_NOTICE_NL = `# <span style="color:#FFD700">⚠</span> Juridische kennisgeving: ISO-maatregelen — Handmatige installatie vereist

> <span style="color:#FFD700">**⚠ Deze kennisgeving is bindend. Ze is van toepassing op alle beheerders, exploitanten en gebruikers van dit platform.**</span>

---

## Wat u moet weten

**ISO 27001:2022, ISO 9000:2015 en ISO 9001:2015** zijn auteursrechtelijk beschermde normen, gepubliceerd
door de Internationale Organisatie voor Normalisatie (ISO, © ISO).

De volledige maatregelendefinities — titels, beschrijvingen en vereistentekst —
**zijn niet inbegrepen in deze software** en mogen **niet worden opgeslagen, verspreid of gebruikt zonder een geldige ISO-licentie**.

---

## Wat moet de beheerder doen?

De SoA-modules voor ISO 27001, ISO 9000 en ISO 9001 worden geleverd **zonder maatregel-inhoud**.
De beheerder is verplicht de maatregelen **handmatig** te importeren:

1. **Een gelicentieerde kopie verkrijgen** — via [iso.org](https://www.iso.org/) of een erkend nationaal normalisatie-instituut
2. **Een JSON-bestand voorbereiden** — formaat gedocumenteerd in \`scripts/import-iso-controls.sh\`
3. **Het importscript uitvoeren:**
   \`\`\`bash
   bash scripts/import-iso-controls.sh /pad/naar/iso-controls.json
   \`\`\`
4. **De server opnieuw starten**

---

## Welke normen zijn al inbegrepen?

De volgende normen zijn gebaseerd op publiek beschikbare EU-wetgeving
en zijn **volledig voorgeïnstalleerd** — geen licentie vereist:

| Norm | Rechtsgrondslag |
|---|---|
| **BSI IT-Grundschutz** | Duits Federaal Bureau voor Informatiebeveiliging (BSI) |
| **EU NIS2** | EU-richtlijn 2022/2555 |
| **EUCS** | ENISA Europees certificeringsschema voor cloudcyberveiligheid |
| **EU AI Act** | EU-verordening 2024/1689 |
| **CRA** | EU Cyber Resilience Act |

---

## Juridische grondslag

ISO-normen zijn beschermd door het auteursrecht (Berner Conventie, nationale implementaties).
Onbevoegde reproductie, openbare mededeling of opslag — zelfs voor intern bedrijfsgebruik
zonder licentie — is **niet toegestaan**.

**De verantwoordelijkheid voor licentiemconform gebruik berust uitsluitend bij de exploitant van deze installatie.**
De auteurs van ISMS Builder aanvaarden geen aansprakelijkheid voor ongelicentieerd gebruik van ISO-beschermde inhoud.
`

const ISO_NOTICE = {
  de: { title: '⚠ Rechtlicher Hinweis: ISO-Controls — Manuelle Installation erforderlich', content: ISO_NOTICE_DE },
  en: { title: '⚠ Legal Notice: ISO Controls — Manual Installation Required', content: ISO_NOTICE_EN },
  fr: { title: '⚠ Avis juridique : Contrôles ISO — Installation manuelle requise', content: ISO_NOTICE_FR },
  nl: { title: '⚠ Juridische kennisgeving: ISO-maatregelen — Handmatige installatie vereist', content: ISO_NOTICE_NL },
}

function seedIsoNotice() {
  const lang = _getDemoLang()
  const docs = load()
  const { title, content } = ISO_NOTICE[lang] || ISO_NOTICE.en
  const existing = docs.find(d => d.seedId === ISO_NOTICE_SEED_ID && !d.deletedAt)
  if (!existing) {
    docs.push({ id: 'guid_iso_controls_notice', seedId: ISO_NOTICE_SEED_ID, seedLang: lang,
      category: 'systemhandbuch', type: 'markdown', pinOrder: 2, minRole: null,
      title, content, createdAt: nowISO(), updatedAt: nowISO(),
      deletedAt: null, deletedBy: null, createdBy: 'system',
      linkedControls: [], linkedPolicies: [] })
    save(docs)
  } else {
    // always keep title + content current (language or content changes)
    let changed = false
    if (existing.title !== title)     { existing.title = title; changed = true }
    if (existing.content !== content) { existing.content = content; changed = true }
    if (existing.seedLang !== lang)   { existing.seedLang = lang; changed = true }
    if (existing.pinOrder !== 2)      { existing.pinOrder = 2; changed = true }
    if (changed) { existing.updatedAt = nowISO(); save(docs) }
  }
}

module.exports = {
  getAll, getByCategory, getById, create, update, delete: del,
  permanentDelete, restore, getDeleted, getFilePath, VALID_CATEGORIES,
  seedArchitectureDocs,
  seedDemoDoc:    seedDemoDocI18n,
  seedRoleGuides: seedRoleGuidesI18n,
  seedSoaGuide,
  seedPolicyGuide,
  seedIsoNotice,
}
