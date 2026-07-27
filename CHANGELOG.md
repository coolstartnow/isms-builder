<!-- © 2026 Claude Hecker — ISMS Builder — AGPL-3.0 -->

# Changelog

All notable changes to ISMS Builder are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.37.0] — 2026-07-27

### Added
- **NIS2 Art. 21 — Governance-Checkliste**: neues Modul mit 30 Maßnahmen zu den Sub-Paragraphen (a)–(j) aus Art. 21 Abs. 2, in drei Prioritätsstufen zu je zehn Items
  - Status je Item (`open` / `in_progress` / `completed` / `na`), Verantwortlicher, Nachweis-URLs, Notizen
  - Auf „nicht anwendbar" gesetzte Items zählen nicht gegen den Erfüllungsgrad
  - Der Katalog steht im Code, nur der Bearbeitungsstand liegt in `data/nis2-governance.json` — spätere Katalogerweiterungen gehen damit nicht zu Lasten gepflegter Stände
  - Kennzahlen: Erfüllungsgrad, offene CRITICAL-Items, Items ohne Verantwortlichen, Items mit Nachweis
  - Filter nach Priorität, Status und Buchstabe (a–j) sowie Volltextsuche
  - Neue Dateien: `server/db/nis2GovernanceStore.js`, `server/routes/nis2.js`
- **NIS2 Art. 23 — Meldefristen**: dreistufige Meldekette für gemeldete Sicherheitsvorfälle
  - Frühwarnung binnen 24 h und Meldung binnen 72 h ab Kenntnisnahme; **Abschlussbericht binnen eines Monats nach Abgabe der Meldung** (Art. 23 Abs. 4 lit. d) — nicht ab Kenntnisnahme. Vor Abgabe wird die Frist vom 72-h-Termin aus vorausberechnet und beim Absenden neu gesetzt
  - Monatsfrist rechnet in Kalendermonaten mit Kappung am Monatsende (31.01. + 1 Monat = 28.02.)
  - Fristenstatus wird berechnet statt gespeichert: `pending` / `due_soon` / `overdue` / `submitted` mit verbleibender Zeit
  - Meldeinhalt je Phase erfassbar, Übersicht aller offenen Fristen nach Dringlichkeit sortiert
  - Behördenneutraler JSON-Export (`GET /nis2/incidents/:id/export`)
  - Neue Dateien: `server/db/art23.js`, `server/art23Watcher.js`
- **Fristenwächter**: prüft alle 15 Minuten und warnt einmalig je Vorfall und Phase per E-Mail (4 h / 12 h / 72 h Vorlauf) an die Träger der CISO-Funktion. Warnungen werden erst nach erfolgreicher Zustellung protokolliert, damit ein fehlgeschlagener Versand nicht verlorengeht. Keine neue Abhängigkeit — `setInterval` wie beim bestehenden Notifier
- Dashboard-Alerts für überschrittene und bald ablaufende Meldefristen sowie offene CRITICAL-Items
- 36 neue Tests in `tests/nis2.test.js` (322 gesamt); NIS2-Übersetzungen für DE/EN/FR/NL

### Fixed
- **Doppelzählung in der Asset-Kennzahl `unclassified`**: Assets ohne Klassifizierung trafen zwei Bedingungen und wurden doppelt gezählt, wodurch der Wert die Gesamtzahl übersteigen konnte. Betraf JSON- und Knex-Backend

### Notes
- Die Inhalte sind bewusst EU-weit formuliert. NIS2 wird national unterschiedlich umgesetzt — zuständige Behörde, Registrierungsportal und Fristen richten sich nach dem jeweiligen Mitgliedstaat, deshalb wird auf „die zuständige nationale Behörde" verwiesen statt auf eine bestimmte Stelle

---

## [1.36.0] — 2026-07-27

### Added
- **Schutzziele für Assets (CIA + Authentizität)** — schließt [#29](https://github.com/coolstartnow/isms-builder/issues/29). Ein einzelnes `classification`-Feld deckte nur die Vertraulichkeit ab und reichte weder für ISO/IEC 27001 noch für BSI IT-Grundschutz:
  - Vier Schutzziele je Asset auf Skala 1–4: Vertraulichkeit, Integrität, Verfügbarkeit sowie optionale Authentizität (`null` = nicht bewertet) für regulierte Umgebungen
  - Neues Feld `protection: { c, i, a, auth }`; `classification` bleibt erhalten und wird bidirektional mit `protection.c` konsistent gehalten (im Formular sind beide Felder gekoppelt)
  - Bestandsdaten werden beim Lesen abgeleitet (`public→1` … `strictly_confidential→4`) — **kein Migrationslauf nötig, kein Datenverlust**
- **Asset-Abhängigkeiten**: `dependsOn` als Liste von Asset-IDs (kein Baum — ein Asset kann von mehreren abhängen). Selbstbezüge und Duplikate werden entfernt, unbekannte Ziele und zirkuläre Abhängigkeiten (auch transitive) mit HTTP 400 abgelehnt
- **Schutzziel-Vererbung nach BSI-Maximumprinzip**: Ein Asset erbt je Schutzziel den höchsten Wert aller Assets, die von ihm abhängen — transitiv über die gesamte Kette. Vererbte Werte werden berechnet statt gespeichert, Änderungen an der Quelle schlagen sofort durch. Neue Antwortfelder `effectiveProtection`, `protectionOrigins` und `requiredBy`
- **Abhängigkeitsgraph** als neuer Tab im Asset-Modul: Canvas-Visualisierung ohne externe Bibliotheken (CSP-konform), Ebenen nach Abhängigkeitsrichtung, Pfeile in Vererbungsrichtung, Klick auf einen Knoten öffnet ein Detailpanel mit Eigenwert, effektivem Wert, Vererbungsquelle und beiden Beziehungsrichtungen
- **Neue Filter** `minC` / `minI` / `minA` / `minAuth` (auf den effektiven, also vererbten Schutzbedarf) und `dependsOn`; neuer Endpoint `GET /assets/graph`
- **Schutzziel-Kennzahlen** in `GET /assets/summary`: `byProtection`, `protectionUnassessed`, `inheritedAssets`, `withDependencies`, `dependencyEdges`, `authAssessed`; neuer Dashboard-Alert für Assets ohne Schutzbedarfsfeststellung
- Neue Datei `server/db/assetProtection.js` — backend-neutrale Schutzziel- und Vererbungslogik, gemeinsam genutzt von JSON- und Knex-Store
- 20 neue Tests in `tests/assets.test.js` (285 gesamt)
- Schutzziel-Übersetzungen für DE/EN/FR/NL

### Changed
- Asset-Tabelle zeigt eine Schutzziel-Spalte; geerbte Werte sind gestrichelt umrandet und mit Pfeil markiert, der Tooltip nennt Eigenwert und Vererbungsquelle
- Asset-Modul hat jetzt vier statt drei Tabs
- Der Knex-Store legt `protection` und `dependsOn` im vorhandenen `data`-JSON-Feld ab — **kein Schema-Change erforderlich**. `STORAGE_BACKEND` bleibt weiterhin auf `json` voreingestellt (siehe [#42](https://github.com/coolstartnow/isms-builder/issues/42))

---

## [1.35.0] — 2026-03-13

### Added
- **Policy Acknowledgement — Richtlinien-Bestätigungssystem**: Mitarbeiter können Richtlinien digital bestätigen, ohne einen ISMS-Account zu benötigen. Drei Betriebsmodi (org-weit durch Admin konfigurierbar):
  - `email_campaign` — Token-Links per E-Mail, öffentliche Bestätigungsseite `/ack/:token` ohne Login
  - `manual` — manuelle Einzel- oder CSV-Massenerfassung durch contentowner
  - `distribution_only` — reine Dokumentenverteilung ohne Bestätigungserfassung
  - Verteilrunden (Distributions) mit templateId, Zielgruppe, Fälligkeitsdatum, Status-Tracking
  - Fortschrittsstatistiken (confirmed / pending / total) pro Verteilrunde
  - CSV-Export (BOM-kodiert für Excel-Kompatibilität) aller Bestätigungen
  - Dashboard-KPI-Karte mit activeDistributions + pendingAcks
  - RBAC: contentowner anlegen/ansehen, admin löschen/Bestätigungen entfernen; reader Summary abrufen
  - Neue Dateien: `server/db/ackStore.js`, `server/routes/acknowledgements.js`, `server/routes/ackPublic.js`, `data/policy-distributions.json`, `data/policy-acks.json`
  - 28 neue Tests in `tests/acknowledgements.test.js`
- **Guidance Suche — Kategorieübergreifend**: Suchfeld im Guidance-Header durchsucht Titel und Inhalt aller Dokumente über alle Kategorien; Ergebnisliste mit Kategorie-Label und Inhaltsexcerpt; Debounce 300 ms; Escape leert das Feld; Kategorie-Wechsel setzt Suche zurück; server-seitig via `GET /guidance?search=`; `guidanceStore.search()` neu
- **Guidance CRUD — Eigene Dokumente erstellen**: contentowner+ können eigene Guidance-Dokumente (Markdown/HTML) anlegen, bearbeiten und Dateien (PDF/DOCX/DOC bis 20 MB) hochladen; Admin kann löschen (Soft-Delete + permanentes Delete)
  - **Neu-Button** und **Upload-Button** in Guidance-Header für contentowner+
  - **Edit-Button** beim Anzeigen eines Dokuments
  - Alle Formulare als Ganzseitige Inline-Forms (training-form-page Pattern, keine Modals)
  - Edit/Preview-Tabs im Markdown-Editor (live-Rendering via marked.js)
  - `linkedControls`-Picker zur Verknüpfung mit SoA-Controls
  - Abgrenzung user-erstellter Dokumente vs. Seed-Dokumente (`seedId`-Feld)
  - Dokumentation: Abschnitt 52 in `docs/ISMS-build-documentation.md`

---

## [1.34.1] — 2026-03-13

### Added
- **MariaDB/MySQL-Backend**: `server/db/mariadbDatabase.js` (Connection-Pool, vollständiges Schema mit 20 Tabellen für utf8mb4) + `server/db/mariadbStore.js` (vollständige async Template-CRUD-Schicht, API-kompatibel zu SQLite-Store); aktiviert via `STORAGE_BACKEND=mariadb` in `.env`; `mysql2` als `optionalDependency` ergänzt
- **Migrationsskript**: `tools/migrate-json-to-mariadb.js` — überträgt Templates, Training, Entities, Risks, Guidance, Goals, Assets, Suppliers sowie alle GDPR-Sub-Stores (VVT/AV/DSFA/Incidents/DSAR/TOMs) idempotent nach MariaDB
- **`.env.example`**: MariaDB-Verbindungsvariablen (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSL`) mit Kommentaren und Setup-Kurzanleitung ergänzt
- **Docs Abschnitt 31**: Backend-Übersichtstabelle um MariaDB erweitert; vollständige Schritt-für-Schritt-Migrations-Anleitung; Backup-Tabelle um `mysqldump`-Befehl ergänzt

### Fixed
- **Admin → Organisation**: Organisationseinheiten (OE) werden jetzt korrekt im Organisations-Tab angezeigt — zuvor wurde die OE-Sektion beim erneuten Tab-Öffnen überschrieben; OE-Tabelle direkt inline in `renderAdminOrgTab()` integriert (Option B)
- **Bezeichnung OE**: „IT Organisational Units" → „Organisational Units" (gilt für gesamte Organisation)
- **GitHub Release-Workflow**: `permissions: contents: write` ergänzt — `softprops/action-gh-release` konnte wegen fehlender Berechtigung keine Releases anlegen (HTTP 403)
- **Chrome / GDPR-Modul**: Ursache für verschwindenden GDPR-Bereich identifiziert — Security-Extensions (Malwarebytes Browser Guard) blockieren Elemente mit `.gdpr-*` CSS-Klassen; Workaround in Troubleshooting-Doku ergänzt
- **Defensive Rendering**: `scrollTop`-Reset beim Sektionswechsel, `isConnected`-Guard in `switchGdprTab`, bfcache-Handler prüft vor Re-Render ob Container bereits vorhanden
- **Findings UI**: Drucken/PDF-Button in Finding-Detail-Ansicht; Status-Fortschrittsbalken für Maßnahmen (done/total); `printFindingDetail(id)` via `window.open + window.print()`
- **Findings Listenexport**: JSON-, CSV- und PDF-Export-Buttons auf der Findings-Übersicht (`exportFindingsJson()`, `exportFindingsCsv()`, `exportFindingsPdf()`)

### Added (continued)
- **Favicon**: Shield-Check-Icon (16/32/48 px) aus Login-Logo generiert, in `index.html` und `login.html` eingebunden
- **Systemhandbuch ISMS Build** (`data/guidance.json`, `guid_demo_de_001`): Inhalt von leerem Platzhalter zu vollständiger Admin-Schnellreferenz ausgebaut — 9 Abschnitte: Modulübersicht, RBAC-Rollen, Template-Lifecycle, häufige Admin-Aufgaben, Storage-Backends, E-Mail-Benachrichtigungen, Öffentliche Vorfallmeldung, 2FA-Richtlinien, Semantische Suche

---

## [1.33.2] — 2026-03-12

### Changed
- **npm update**: all minor and patch dependencies updated (38 added, 29 removed, 64 changed); 0 vulnerabilities
- **`PINNED-DEPS.md`** extended: pending major-version migrations documented (express 4→5, bcryptjs 2→3, dotenv 16→17) with rationale and migration checklist; `pdf-parse` section unchanged

---

## [1.33.1] — 2026-03-12

### Added
- **Dependabot** (`.github/dependabot.yml`): weekly automated PRs for npm and GitHub Actions updates; major-version upgrades excluded (manual review required); labels `dependencies` + `security`
- **`npm audit` hard fail in CI**: `--audit-level=high` no longer uses `continue-on-error`; critical and high vulnerabilities now break the build; moderate level remains informational; full JSON audit report uploaded as CI artefact (30-day retention)
- **`scripts/security-check.sh`**: local security and patch status check covering Node.js LTS version, npm audit (critical/high/moderate/low), outdated packages with security-relevance marker, pinned dependency verification, Ollama service reachability and version, `.env` hygiene (JWT_SECRET length, DEV_HEADER_AUTH, SSL certificate expiry)
- **npm scripts**: `npm run security:check`, `npm run security:audit`, `npm run security:outdated`
- **`PINNED-DEPS.md`**: machine- and human-readable register of intentionally pinned dependencies with rationale, affected files, and migration instructions
- **`pdf-parse` pin enforcement**: `pdf-parse` pinned to exact version `1.1.1` (no `^`); Dependabot permanently ignores `>= 1.1.2`; CI step `Verify pinned dependencies` breaks the build if installed version deviates; `security-check.sh` checks locally — reason: v2 has an incompatible API (class-based instead of function export), see `PINNED-DEPS.md`

---

## [1.33.0] — 2026-03-12

### Added
- **Scanner → Risk Import**: Greenbone/OpenVAS scan results (XML and PDF) can be imported as risk drafts requiring auditor approval before entering normal workflow
  - `server/ai/greenboneXmlParser.js` — GMP XML parser (`<get_reports_response>` and direct `<report>`)
  - `server/ai/greenobonePdfParser.js` — PDF extraction via regex; Ollama LLM fallback (`llama3.2:3b`)
  - `server/ai/scanImporter.js` — clusters by NVT-OID, deduplicates, maps CVSS → probability/impact, creates drafts with `needsReview: true, source: 'greenbone-scan'`
  - `POST /admin/scan-import/upload` (multer, max 20 MB, .xml/.pdf) and `GET /admin/scan-import/status`
  - Admin → Maintenance: Scan-Import section with file picker, entity selector and result display
- **Risk Review Workflow**: Scan-imported risks require explicit approval before entering normal workflow
  - `needsReview` flag, `getReviewPending()` and `approve(id, approvedBy)` in riskStore
  - `GET /risks/review-pending` and `POST /risks/:id/approve` (auditor+)
  - Dashboard: amber alert card when review-pending risks exist
  - Risk detail: review banner with inline "Freigeben" button
- **CVSS v3.1 Severity**: Full FIRST.org CVSS v3.1 severity bands surfaced in the Risk module
  - Colour-coded badges in the risk list table
  - CVSS detail card in risk detail view (score bar, description, CVE chips, FIRST.org attribution)
  - Helper functions `cvssInfo()`, `cvssBadgeHtml()`, `cvssBarHtml()`
- **Risk Register Report**: New report type `risks` (`GET /reports/risks`) — all approved risks with CVSS scores, CVE IDs, source and KPI row; CSV export included
- **CHANGELOG in Guidance**: CHANGELOG.md is now seeded as a `admin-intern` Guidance entry (`seed_changelog`) and updated on every server start

### Changed
- **Risk Detail**: Rewritten as inline full-page form (training-form-page pattern) — no overlay modal
- **Entity names in Risk Detail**: Applicable entity IDs resolved to display names via `entityMap`

### Fixed
- `GET /risks/review-pending` was matched by Express as `GET /risks/:id`; fixed by moving the route before the wildcard
- Entity selector in Admin Maintenance tab referenced undefined `ENTITIES_CACHE`; fixed by local fetch

---

## [1.32.0] — 2026-03-12

### Added
- **Findings → Calendar**: Finding action due dates appear as `finding_action_due` calendar events; overdue actions are marked as `severity: high`
- **Findings → Semantic Search**: Findings are automatically indexed via Ollama embeddings (`embeddingStore.indexDoc`) on create/update and removed on permanent delete
- **Findings → Reports**: New *Audit Findings* report type (`GET /reports/findings`) with KPI row (total, by severity, by status, open actions, overdue actions) and filterable table (Ref / Title / Severity / Status / Auditor / Area / Observation / Requirement / Open Actions)
- **Scanner → Risk Import**: Greenbone/OpenVAS scan results can be imported as risk drafts
  - `server/ai/greenboneXmlParser.js` — parses GMP XML (`<get_reports_response>` and direct `<report>`) into a normalised finding array
  - `server/ai/greenobonePdfParser.js` — extracts findings from Greenbone PDF reports via regex; falls back to Ollama LLM (`llama3.2:3b`) if regex yields no results
  - `server/ai/scanImporter.js` — clusters findings by NVT-OID, deduplicates against existing scan references, maps CVSS → probability/impact, creates risk drafts with `needsReview: true` and `source: 'greenbone-scan'`
  - `server/routes/scanImport.js` — `POST /admin/scan-import/upload` (multer memoryStorage, max 20 MB, .xml/.pdf); `GET /admin/scan-import/status`; requires auditor role
  - Admin → Maintenance: Scan-Import section with file picker, entity selector and result display
- **Risk Review Workflow**: Scan-imported risks require explicit approval before entering normal workflow
  - `needsReview` flag on risk records; `getReviewPending()` and `approve(id, approvedBy)` in riskStore
  - `GET /risks/review-pending` — lists all risks pending approval
  - `POST /risks/:id/approve` — sets `needsReview: false`, records `approvedBy`/`approvedAt` (auditor+)
  - Dashboard alert: amber warning card when review-pending risks exist, with direct link to Risks module
  - Risk detail view: prominent review banner with "Freigeben" button when `needsReview: true`
- **CVSS v3.1 Severity in Risk module**: Full FIRST.org CVSS v3.1 severity bands (Critical/High/Medium/Low/None) surfaced throughout the Risk module
  - Colour-coded CVSS badges in the risk list table
  - CVSS detail card in risk detail view: score bar, severity label, textual description, CVE chips, FIRST.org attribution
  - `cvssInfo(score)`, `cvssBadgeHtml(score)`, `cvssBarHtml(score)` helper functions; CSS classes `.cvss-badge`, `.cvss-bar-*`, `.cvss-detail-card`
- **Risk Register report**: New report type `risks` (`GET /reports/risks`) showing all approved risks with CVSS scores, CVE IDs, source (scan vs. manual), KPI row by severity level and origin
  - CSV export via `GET /reports/export/csv?type=risks`
- **PDF Export for Reports**: PDF export button in the reports filter bar — generates a print-ready page in a new browser tab via `window.print()`

### Changed
- **Risk Detail**: Rewritten as inline full-page form (training-form-page pattern) inside `#riskTabContent` — no overlay modal; includes two-column detail grid, CVSS card, treatment plans, linked controls and applicable entities
- **Entity names in Risk Detail**: Applicable entity IDs are resolved to display names via a parallel `/entities` fetch and `entityMap` lookup

### Fixed
- Reports filter panel was hidden entirely for report types that don't require an entity selection (`needsEntity: false`); fixed by wrapping the entity selector in a dedicated `<div id="reportEntityWrap">`
- `GET /risks/review-pending` was matched as `GET /risks/:id` (Express wildcard) — fixed by moving the route before the wildcard route in `server/routes/risks.js`
- Entity selector in Admin Maintenance tab referenced undefined `ENTITIES_CACHE`; fixed by fetching `/entities` locally at render time

---

## [1.31.80] — 2026-03-12

### Added
- **Audit Findings module**: Track audit findings, observations, and non-conformities with full CRUD and lifecycle
- **FR/NL Guidance translations**: French and Dutch seed documents in Guidance module
- **Admin Language Config**: Admin panel option to configure default application language per deployment

---

## [1.31.0] — 2026-03-09 / 2026-03-11

### Added
- **ISO Controls import button in SoA**: One-click import of ISO 27001 controls into Statement of Applicability
- **ISO Notice in Guidance**: Informational notice linking Guidance entries to applicable ISO controls
- **Login Splash Screen**: Configurable splash/welcome screen on login page (toggle in Admin panel)
- **EN presentation**: English-language slide deck for stakeholder presentations
- **EN/DE Demo Bundles**: Separate demo data bundles for English and German installations
- **Multi-function per user**: Users can hold multiple organisational functions (ciso, dso, qmb, bcm_manager, dept_head, auditor, admin_notify) independently of RBAC role
  - `functions[]` array in user records, JWT payload and `req.functions`
  - `getUsersByFunction(fn)` in rbacStore.js
  - `getCurrentFunctions()`, `hasFunction(fn)`, `renderFunctionBadges()` in app.js
  - Function badges in topbar (`#topbarFnBadges`) and admin user table
  - Checkbox grid in user edit modal
- **SMTP configuration in Admin UI**: SMTP settings editable in Admin → Organisation; Test-Mail button; `.env`-override banner; `POST /admin/email/test` and `GET /admin/email/status`
- **Nav order management**: Drag & drop + ↑↓ buttons to reorder sidebar navigation in Admin → Organisation; `navOrder[]` stored in orgSettingsStore; `saveNavOrder()` / `resetNavOrder()`
- **Architecture docs seeded into Guidance**: `guidanceStore.seedArchitectureDocs()` seeds README, CONTRIBUTING, C4 diagrams, data model and OpenAPI spec as admin-internal Guidance entries (idempotent)

### Changed
- `notifier.js`: `getRecipients(fn, fallback)` resolves recipients by function rather than by role alone; a user holding both ciso and dso receives both digest types
- `renderSettingsPanel()`: CISO / DSB sections shown when user has matching function OR matching role

---

## [1.30.0] — 2026-03-10

### Added
- **Full i18n coverage in app.js**: ~350 `t()` calls covering all render functions (Risk, Goals, Legal, Training, BCM, Assets, Suppliers, Governance, Calendar, Admin)
- **Vendor assets local**: All third-party JS/CSS assets vendored locally; no external CDN dependencies at runtime

### Changed
- **English demo data**: All seed data sets available in English; demo import bundles ship EN content
- Language switcher on login page functional for all UI strings

---

## [1.29.0] — 2026-03-09

### Added
- **i18n DE/EN system**:
  - `ui/i18n/t.js` — translation engine
  - `ui/i18n/translations.js` — 200+ keys in DE and EN
  - Language persisted in `localStorage` (`isms_lang`)
  - `SECTION_META.labelKey` and `LIFECYCLE_TRANSITIONS.labelKey` for translated nav and lifecycle labels
  - Login page: DE/EN toggle buttons, `data-i18n` attributes, `applyLoginLang()` / `switchLoginLang()`
  - Settings: Language switcher section; `switchAppLang()` triggers reload
- **Semantic search (Ollama, local, GDPR-compliant)**:
  - `server/ai/embedder.js` — Ollama `/api/embed` wrapper with cosine similarity; graceful fallback when Ollama is unavailable
  - `server/ai/embeddingStore.js` — JSON vector index (`data/embeddings.json`); `indexDoc` / `removeDoc` / `search` / `reindexAll`
  - `server/routes/ai.js` — `GET /api/ai/search`, `POST /api/ai/reindex` (admin), `GET /api/ai/status`
  - Fire-and-forget embedding hooks in: risks, guidance, goals, assets, training, suppliers
  - Frontend: `_initSemanticSearch()` with keyboard navigation (↑↓ Enter Esc) and 320 ms debounce
  - Model: `nomic-embed-text` (768 dimensions)
- **Release workflow**: `scripts/bump-version.sh`, `.github/workflows/release.yml`
- **Open-source README**: Full README with CI badge, tests badge, feature table, roadmap table, Docker + SSL quick-start

### Changed
- `package.json` version field now managed by `bump-version.sh`

---

## [1.28.0] — 2026-03-08

### Added
- **Demo Reset & Demo Import**:
  - `POST /admin/demo-reset` — exports all data, wipes all modules, removes all users except admin (no 2FA), writes `data/.demo_reset_done` flag
  - `POST /admin/demo-import` — restores bundle, recreates alice/bob (alicepass/bobpass), removes flag
  - `GET /auth/demo-reset-done` — public endpoint; returns `{ active: bool }`
  - Login page: yellow banner when flag is active; auto-cleared on first admin login
  - Admin Maintenance tab: Demo Reset (red, requires "RESET" prompt) + Demo Import (orange, JSON picker)
- **Public Incident Reporting**: Login-page "Report Security Incident" button (no auth required); 7-field modal; `POST /public/incident`; CISO inbox under `incident` section (minRole: contentowner); `DELETE /public/incident/:id` (admin); `server/db/publicIncidentStore.js`; INC-YYYY-NNNN reference numbers; 10 demo entries
- **Papierkorb & Soft-Delete**: Soft-delete with `deletedAt` / `deletedBy` across all 8 modules (templates, risks, goals, guidance, training, legal, gdpr, public-incidents); `GET /trash` aggregates all deleted items; `DELETE /:id/permanent` and `POST /:id/restore` (admin) per module; Admin panel "Papierkorb" tab; 30-day autopurge on server start (`runAutopurge()`); guidance files preserved on soft-delete, removed only on permanent delete; all deletions logged to audit log
- **Supplier / Supply Chain module**:
  - `server/db/supplierStore.js` — CRUD, `getSummary`, `getUpcomingAudits(days)`
  - `server/routes/suppliers.js` — REST + soft-delete + restore
  - `data/suppliers.json` — 10 seed entries (Microsoft, DATEV, SAP, Hetzner, AWS EMEA, …)
  - Calendar events: `supplier_audit` (60-day window)
  - Notifier: `checkSupplierAudits()` in CISO digest; `emailNotifications.supplierAudits` toggle
  - UI: 3 tabs, inline form, KPI block, dashboard card + alert
- **Email notifications (notifier.js)**:
  - `server/mailer.js` — Nodemailer wrapper; no-op when SMTP_HOST is absent
  - `server/notifier.js` — `runDailyChecks()` + `start()` via `setInterval`; only active under `require.main` guard
  - 6 notification types: risks → CISO, DSAR + GDPR incidents → GDPO, contracts + templates → admin
  - SMTP env vars: `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`
  - Admin → Organisation → Email Notifications: global toggle + per-type toggles + adminEmail field
- **Admin panel consolidated** (7 tabs): Users / Entities / Templates / Lists / Organisation / Audit-Log / Maintenance
  - Custom lists (`templateTypes`, `riskCategories`, `riskTreatments`, `gdprDataCategories`, `gdprSubjectTypes`, `incidentTypes`); `server/db/customListsStore.js`; `GET /admin/lists`; `PUT /admin/list/:listId` + `POST /admin/list/:listId/reset` (admin)
  - Organisation tab: Org name, ISMS scope, CISO/DSB contact; `GET/PUT /admin/org-settings`; `GET/PUT /admin/role-settings` (contentowner+)
  - Audit-Log tab: filterable (user/action/resource/date), pagination, delete; `server/db/auditStore.js`; `GET/DELETE /admin/audit-log`
  - Maintenance tab: full export (`GET /admin/export`), orphaned-attachment cleanup (`POST /admin/maintenance/cleanup`)
  - System configuration: `MODULE_CONFIG` (10 modules) + `SOA_FW_CONFIG` (8 frameworks); loaded in `init()` via `GET /admin/modules` + `GET /admin/soa-frameworks`; `saveModuleConfig()` persists both; dashboard skips fetch and KPIs for disabled modules; minimum 1 active framework enforced client-side
- **2FA Enforcement**: `orgSettingsStore.require2FA`; `GET/PUT /admin/security`; login checks enforcement → 403 + `code:'ENFORCE_2FA'`; `_show2FABanner()` shows sticky yellow banner when user has no 2FA; Admin → Org → Security Policies toggle

### Changed
- SQLite set as default storage backend (`STORAGE_BACKEND=sqlite` in `.env.example` and `.env.docker`)

---

## [1.27.0]

### Added
- **Asset Management**:
  - `assetStore.js`; `data/assets.json` (8 seed entries)
  - `GET/POST/PUT/DELETE /assets` + `/assets/summary`
  - 5 categories (hardware/software/data/service/facility), 4 classification levels (ISO 27001 A.5.12), 4 criticality levels
  - Calendar integration (`asset_eol`); dashboard KPIs + alerts
  - 3 UI tabs (List / Category / Classification); `openAssetForm()` inline form
  - RBAC: reader read-only; editor+ CRUD; admin delete
- **BCM/BCP module**:
  - `bcmStore.js` — BIA / Plans / Exercises in `data/bcm.json`
  - 15 API routes under `/bcm/*`; 21 seed entries; 29 tests
  - Calendar events: `bcm_exercise`, `bcm_plan_test`
  - `renderBcm()` — 3 tabs + inline forms
- **Governance module**
- **Cross-module Traceability**: All modules carry `linkedControls` (SoA control IDs) and `linkedPolicies` (template IDs); collapsible "Verknüpfungen" `<details>` block in every edit form with Control Picker and Policy Picker

---

## [1.26.0]

### Added
- **Legal & Privacy module**:
  - `legalStore.js` (contracts / NDAs / privacy policies); `data/legal/`
  - `GET/POST/PUT/DELETE /legal/contracts|ndas|policies`
  - Contract expiry events in Calendar (`contract_expiring`)
- **SQLite backend**:
  - `server/db/database.js` — WAL mode, foreign keys, full schema
  - `server/db/sqliteStore.js` — API-compatible drop-in for jsonStore
  - `STORAGE_BACKEND=sqlite` env switch; `tools/migrate-json-to-sqlite.js`
- **SSL/HTTPS**: `server/index.js` reads `SSL_CERT_FILE` + `SSL_KEY_FILE` from `.env` → HTTPS; falls back to HTTP on missing or unreadable certificate files

---

## [1.25.0]

### Added
- **GDPR & Data Protection module** (complete):
  - `gdprStore.js` — 9 sub-modules including deletion log
  - `data/gdpr/`; 9 UI tabs; 72h incident timer; Art. 17 deletion log; CSV export VVT
  - All GDPR forms rendered as full-page inline forms (`openVvtForm`, `openAvForm`, `openDsfaForm`, `openIncidentForm`, `openDsarForm`, `openTomForm`)
- **Risk & Compliance module**:
  - `riskStore.js`; `GET/POST/PUT/DELETE /risks` + `/risks/:id/treatments`
  - `auditor` role (rank 3); 5 UI tabs; `data/risks.json`
- **Calendar module**: `GET /calendar`; monthly view; chip display; navigation; day detail; agenda sidebar; `SECTION_META 'calendar'`
- **Personal Settings**: Change password (`PUT /me/password`) and 2FA setup/deactivation directly in `renderSettingsPanel()`; `_renderTwofaSettingsBlock()` loads QR code or deactivation button based on `has2FA`
- **2FA topbar chip**: `_show2FAHint(show)` controls `#topbar2faHint`; orange chip; disappears after `verify2FA()` success; reappears after `disable2FA()`

---

## [1.24.0]

### Added
- **Guidance module**: 4 categories (systemhandbuch / rollen / policy-prozesse / soa-audit); Markdown editor + preview; PDF/DOCX upload (multer, max 20 MB); `GET/POST/PUT/DELETE /guidance` + `POST /guidance/upload`; `guidanceStore.js`; 4 seed docs including GDPR guide; `data/guidance/files/`
- **Training & Schulungen module**: `trainingStore.js`; `GET/POST/PUT/DELETE /training` + `/training/summary`; 3 tabs; full-page inline form (`openTrainingForm`); `data/training.json` (3 seed entries)
- **Reports module**: `server/reports.js` — compliance, framework, gap, templates, reviews, matrix, audit report types; `GET /reports/*` + `GET /reports/export/csv`; JSON and CSV export; compliance matrix Control × Entity (traffic-light colours); review-cycle report (overdue / due soon)
- Audit-log hooks in Template, Risk, and User routes

---

## [1.23.0]

### Added
- **SoA Multi-Framework support**: 313 controls across ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9000, ISO 9001, CRA; framework tabs; inline edit; filter; JSON export
- **Cross-Mapping**: 20 topic groups; `crossmapStore.js`
- **Bidirectional Template ↔ Control linking**: `linkedControls` on templates, `linkedTemplates` on controls; sync on `PUT` of both sides; Control Picker modal in template editor

---

## [1.22.0]

### Added
- **Space Hierarchy (complete)**:
  - `parentId` / `sortOrder` on templates
  - `GET /templates/tree` (sorted by `sortOrder`)
  - `PUT /template/:type/:id/move` (no version bump; circular-reference check)
  - `POST /templates/reorder` (batch `sortOrder`)
  - Breadcrumb navigation; child-page button
  - Move dialog (modal with tree picker; descendants locked)
  - Drag & drop (drop on node = child; drop on drop zone = sibling reorder; root drop zone)
  - ↑↓ buttons per tree row

---

## [1.21.0]

### Added
- **Template attachments**: `attachments[]` on templates; multer in `data/template-files/`; `renderAttachmentsBar()`
- **nextReviewDate**: Date field in template editor (`tmpl-review-bar`); colour-coded hint; saved by `saveCurrent()`
- **User management UI**: Table UI for create / edit / delete users; `POST/PUT/DELETE /admin/users`; bcrypt-hashed passwords; role badges; `createUser` / `updateUser` / `deleteUser` in `rbacStore.js`
- **Entity modal**: `openEntityModal()` replaces `prompt()` dialogs; fields: Name, Abbreviation, Type

---

## [1.20.0]

### Added
- **Lifecycle management**: `draft → review → approved → archived` (role-gated, `statusHistory` recorded)
- **Dashboard (complete)**: Full ISMS overview with action-required section; aggregates templates / SoA / risks / GDPR / legal / training / calendar; Top-5 risks; 14-day preview; all modules as KPI cards with direct links
- **Konzernstruktur (entity hierarchy)**:
  - `entityStore.js`; `data/entities.json`
  - `GET/POST/PUT/DELETE /entities`; `GET /entities/tree`
  - Admin UI — Entities tab with tree CRUD
- **Applicability model**: `applicableEntities[]` on templates and SoA controls; Entity Picker in template editor and SoA detail panel

---

*Versions prior to 1.20 are not individually documented. The project began as a Node.js/Express REST API + Vanilla-JS SPA with JWT authentication (cookie `sm_session`), bcryptjs passwords, JSON-file persistence, and a basic template CRUD with versioning.*
