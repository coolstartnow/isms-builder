<!-- © 2026 Claude Hecker — ISMS Builder V 1.28 — AGPL-3.0 -->
![ISMS Builder Banner](../docs/isms-builder-banner.png)

# ISMS Builder – Dokumentation & Architektur

Stand: 2026-03-09 | Version: V 1.28 (Lieferkettenmodul + Risikomanagement Multi-Framework, GDPR in SPA, Copyright-Header)

---

## Inhaltsverzeichnis

1. Überblick
2. Verzeichnisstruktur
3. Umgebungskonfiguration (.env)
4. Start & Stop
5. SSL/TLS einrichten
6. Backup & Deployment
7. Automatisierte Tests
8. Workspace neu einrichten
9. UI-Zugriffsschutz
10. RBAC & Benutzer
11. Reports & Compliance
12. Statement of Applicability (SoA)
13. Admin-Panel
14. Einstellungen (rollenspezifisch)
15. Öffentliche Vorfallmeldung & Incident Inbox
16. Audit-Log
17. GDPR-Modul
18. Storage-Backend wechseln
19. Troubleshooting
20. Legal & Privacy Modul
21. Dashboard (ISMS-Übersicht)
22. Sicherheitsziele (ISO 27001 Kap. 6.2)
23. Space Hierarchy – Confluence-ähnliche Seitenhierarchie
24. Chrome-Rendering – Bugfixes & Browser-Kompatibilität
25. Papierkorb & Soft-Delete-System
26. Asset Management (ISO 27001 A.5.9–5.12)
27. Governance & Management-Review (ISO 27001 Kap. 9.3)
28. Business Continuity Management (BCM/BCP)
29. Code-Architektur & Refactoring
30. E-Mail-Benachrichtigungen
31. Storage-Backends & Migration (JSON → SQLite → PostgreSQL)
32. Open-Source-Dokumentation & Architektur-Artefakte
33. Lieferkettenmanagement – Multi-Framework
34. Mehrfach-Funktionen pro Benutzer
35. Präsentation
36. Geplante Erweiterungen & offene TODOs
37. Risikomanagement – Multi-Framework

---

## 1. Überblick

Der ISMS Builder ist eine eigenständige Node.js/Express-Anwendung mit Vanilla-JS-SPA zur Erstellung, Verwaltung und Versionierung von ISMS-Dokumenten. Unterstützt werden mehrere Compliance-Frameworks sowie GDPR, Risikomanagement, Training und Reporting.

**Tech-Stack:** Node.js ≥18, Express, JWT, bcryptjs, multer, better-sqlite3
**Persistenz:** JSON-Dateien (Standard) oder SQLite (via `STORAGE_BACKEND=sqlite`)
**Auth:** JWT-Cookie (`sm_session`), bcrypt-Passwörter, optionale TOTP-2FA
**RBAC:** `reader`/`revision`(1) < `editor`/`dept_head`/`qmb`(2) < `contentowner`/`auditor`(3) < `admin`(4)
**UI-Schutz:** Alle UI-Seiten außer `login.html` und ihren Abhängigkeiten sind serverseitig durch JWT-Prüfung geschützt. Unauthentifizierte Anfragen werden mit `302 → /ui/login.html` umgeleitet — unabhängig vom Client-seitigen `logincheck.js`.

---

## 2. Verzeichnisstruktur

```
Confluence_ISMS_build/
├── server/
│   ├── index.js              – Express-Setup, UI-Middleware, Router-Einbindung (~180 Zeilen)
│   ├── auth.js               – JWT-Auth, requireAuth, authorize()
│   ├── rbacStore.js          – Benutzer/Passwort-Store (bcrypt)
│   ├── storage.js            – Backend-Façade (json/sqlite)
│   ├── reports.js            – Report-Logik
│   ├── 2faSetup.js           – TOTP-Setup
│   ├── totp.js               – TOTP-Verifikation
│   ├── routes/               – Express-Router (je Modul eine Datei)
│   │   ├── auth.js           – Login, Logout, Whoami, /me/password, 2FA
│   │   ├── templates.js      – Templates + Anhänge + Hierarchie + Entities
│   │   ├── soa.js            – SoA, Crossmap, Frameworks
│   │   ├── risks.js          – Risk & Compliance
│   │   ├── goals.js          – Sicherheitsziele
│   │   ├── assets.js         – Asset Management
│   │   ├── governance.js     – Governance + Dokument-Upload
│   │   ├── bcm.js            – BCM + Dokument-Upload
│   │   ├── calendar.js       – Aggregierter Kalender
│   │   ├── guidance.js       – Guidance + Datei-Upload
│   │   ├── gdpr.js           – GDPR & Datenschutz
│   │   ├── reports.js        – Reports + CSV-Export
│   │   ├── legal.js          – Legal & Privacy
│   │   ├── training.js       – Training & Schulungen
│   │   ├── admin.js          – Admin-Routen + Dashboard
│   │   ├── public.js         – Öffentliche Incident-Meldung
│   │   └── trash.js          – Papierkorb + Export
│   └── db/
│       ├── jsonStore.js      – Template-Store (JSON)
│       ├── sqliteStore.js    – Template-Store (SQLite)
│       ├── database.js       – SQLite-Verbindung + Schema
│       ├── soaStore.js       – SoA-Store (alle Frameworks)
│       ├── entityStore.js    – Konzernstruktur
│       ├── crossmapStore.js  – Cross-Mapping-Gruppen
│       ├── gdprStore.js      – GDPR-Store (8 Sub-Module)
│       ├── riskStore.js      – Risikomanagement
│       ├── guidanceStore.js  – Guidance-Dokumente
│       ├── trainingStore.js  – Schulungen
│       ├── legalStore.js          – Legal-Store (contracts/ndas/privacyPolicies)
│       ├── goalsStore.js          – Sicherheitsziele + KPI-Tracking
│       ├── publicIncidentStore.js – Öffentliche Vorfallmeldungen
│       ├── orgSettingsStore.js    – Organisationseinstellungen
│       ├── auditStore.js          – Audit-Log (append-only)
│       └── customListsStore.js    – Editierbare Dropdown-Listen
├── ui/
│   ├── index.html            – Haupt-SPA
│   ├── app.js                – SPA-Logik (alle Sections)
│   ├── style.css             – Atlassian Dark Theme
│   ├── login.html            – Login + öffentl. Incident-Formular
│   └── logincheck.js         – Auth-Guard für Standalone-Seiten
├── data/
│   ├── templates.json        – Templates
│   ├── soa.json              – SoA-Controls (alle Frameworks)
│   ├── risks.json            – Risikoregister
│   ├── entities.json         – Konzernstruktur
│   ├── rbac_users.json       – Benutzer (bcrypt-Hashes)
│   ├── guidance.json         – Guidance-Metadaten
│   ├── training.json         – Schulungen
│   ├── public-incidents.json – Öffentlich gemeldete Vorfälle
│   ├── org-settings.json     – Organisationseinstellungen
│   ├── custom-lists.json     – Angepasste Dropdown-Listen
│   ├── audit-log.json        – Audit-Log (max. 2000 Einträge)
│   ├── crossmap.json         – Cross-Mapping-Daten
│   ├── gdpr/                 – GDPR-Daten (vvt, av, dsfa, ...)
│   ├── legal/                – Legal-Daten (contracts.json, ndas.json, privacy-policies.json)
│   │   └── files/            – Legal-Datei-Uploads
│   ├── guidance/files/       – Guidance-Uploads (PDF/DOCX)
│   ├── governance-files/     – Governance-Dokument-Uploads
│   ├── bcm-files/            – BCM-Dokument-Uploads
│   ├── assets.json           – Asset-Register
│   ├── governance.json       – Governance (Reviews/Maßnahmen/Sitzungen)
│   ├── bcm.json              – BCM (BIA/Pläne/Übungen)
│   └── template-files/       – Template-Anhänge
├── scripts/
│   ├── clone-clean-workspace.sh  – Workspace einrichten (npm, .env, SSL, Start)
│   ├── backup-and-deploy.sh      – Backup + Deployment-Paket erstellen
│   ├── setup-ssl.sh              – SSL-Modus wählen (HTTP/Self-signed/LE)
│   └── letsencrypt.sh            – Let's Encrypt einrichten/erneuern/Status
├── ssl/                      – Zertifikatsdateien (cert.pem, key.pem)
├── Dockerfile                – Multi-stage Docker-Build
├── docker-compose.yml        – Docker Compose (Bind-Mounts für data/ und ssl/)
├── .env                      – Umgebungskonfiguration (nicht im Git)
├── .env.docker               – Docker-Vorlage
├── start.sh                  – Server starten (PID-Datei, Logging)
└── stop.sh                   – Server stoppen (inkl. Port-Bereinigung)
```

---

## 3. Umgebungskonfiguration (.env)

```env
JWT_SECRET=<min. 32 zufällige Zeichen>   # openssl rand -hex 32
JWT_EXPIRES_IN=8h
PORT=3000
DEV_HEADER_AUTH=false
STORAGE_BACKEND=sqlite                    # sqlite (Produktion) | json (nur Entwicklung/Tests)

# SSL (optional – leer lassen für HTTP)
# SSL_CERT_FILE=ssl/cert.pem
# SSL_KEY_FILE=ssl/key.pem

# SMTP / E-Mail (optional – ohne SMTP_HOST keine Benachrichtigungen)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false    # true = TLS (Port 465), false = STARTTLS
# SMTP_USER=isms@example.com
# SMTP_PASS=password
# SMTP_FROM=ISMS Builder <isms@example.com>
```

**Wichtig:** `SSL_CERT_FILE` / `SSL_KEY_FILE` nur eintragen wenn HTTPS gewünscht ist. Sind diese Variablen gesetzt, startet der Server als HTTPS – Browser-URL muss dann `https://` verwenden.

Für E-Mail-Benachrichtigungen `SMTP_HOST` und zugehörige Variablen eintragen. Fehlt `SMTP_HOST`, sind alle Benachrichtigungen automatisch deaktiviert (kein Fehler, keine Auswirkung auf Tests). Die Benachrichtigungstypen werden im Admin-Panel unter **Organisation → E-Mail-Benachrichtigungen** gesteuert.

---

## 4. Start & Stop

```bash
bash start.sh          # startet Server, schreibt PID in .server.pid
bash stop.sh           # stoppt Server, bereinigt auch verwaiste Prozesse auf dem Port
```

`start.sh` erkennt automatisch ob SSL aktiv ist und zeigt die korrekte URL (`http://` oder `https://`).

---

## 5. SSL/TLS einrichten

```bash
bash scripts/setup-ssl.sh       # interaktiv: HTTP / Self-signed / Let's Encrypt
bash scripts/letsencrypt.sh     # dediziertes Let's Encrypt Script
bash scripts/letsencrypt.sh renew   # Zertifikat erneuern
bash scripts/letsencrypt.sh status  # Ablaufdatum prüfen
```

**Validierungsmethoden Let's Encrypt:**
- `standalone` – certbot öffnet kurz Port 80 (Server wird gestoppt/gestartet)
- `webroot` – Challenge-Datei in bestehenden Web-Root
- `dns-01` – TXT-Record manuell setzen (kein offener Port, auch für Wildcard)

---

## 6. Backup & Deployment

```bash
bash scripts/backup-and-deploy.sh            # → ~/isms-backup-*.tar.gz + ~/isms-deploy-full-*.tar.gz
bash scripts/backup-and-deploy.sh /pfad/     # Ausgabe in anderes Verzeichnis
```

- **Backup** (ohne node_modules, ~4 MB): Code + Daten für schnelle Sicherung
- **Deploy-Paket** (vollständig, ~9 MB): alles inkl. node_modules, .env, Daten

**Docker-Deployment:**

Das Docker-Image enthält **keinen** `data/`-Ordner — JSON-Daten und Uploads werden als Bind-Mount bereitgestellt:

```
docker-compose.yml (Bind-Mounts):
  ./data:/app/data        # JSON-Dateien + Uploads (vom Host lesbar/sicherbar)
  # ./ssl:/app/ssl:ro     # Optional: SSL-Zertifikate (read-only)
```

Der Entrypoint (`docker-entrypoint.sh`) legt fehlende Unterverzeichnisse beim Start automatisch an:
```
/app/data/gdpr/files  /app/data/guidance/files
/app/data/template-files  /app/data/legal/files
```

```bash
docker compose up -d --build    # Image bauen und starten
docker compose logs -f          # Logs verfolgen
docker compose down             # stoppen
```

**Backup im Docker-Betrieb** (Host-seitig, kein `docker exec` nötig):
```bash
tar czf ~/isms-data-$(date +%F).tar.gz ./data
```

---

## 7. Automatisierte Tests

**Stack:** Jest + Supertest | **Ausführung:** sequenziell (`--runInBand`)

```bash
npm test                # alle Tests einmalig
npm run test:watch      # Watch-Modus
npm run test:coverage   # mit Coverage-Report
```

**Struktur:**

```
tests/
  setup/
    testEnv.js      – Erstellt isoliertes Temp-Datenverzeichnis mit Seed-Nutzern (bcrypt 1 Runde)
    authHelper.js   – loginAs(), authedGet/Post/Put/Delete()
  auth.test.js      – Login (korrekt/falsch/TOTP), JWT-Schutz, Whoami, Logout
  rbac.test.js      – Rollendurchsetzung pro Modul (Templates, Risiken, Guidance, Ziele, Admin)
  templates.test.js – Template CRUD, Lifecycle, Versionshistorie, Anhänge
  soa.test.js       – SoA lesen/filtern/bearbeiten, Cross-Mapping
  risks.test.js     – Risiko CRUD + Behandlungspläne (auditor-Enforcement)
  gdpr.test.js      – VVT, AV, DSFA, Datenpannen, DSAR, TOMs, Dashboard
  goals.test.js     – Sicherheitsziele CRUD, KPI-Progress-Berechnung
  reports.test.js   – Report-Endpunkte Smoke-Test, Dashboard, Kalender
  admin.test.js     – Benutzerverwaltung, Konzernstruktur, Org-Einstellungen, Audit-Log
```

**Datenisolation:** Jede Testdatei bekommt ein eigenes `mkdtemp`-Verzeichnis mit frischen Seed-Daten. `DATA_DIR`-Umgebungsvariable wird vor dem Server-Require gesetzt — alle Stores lesen diesen Pfad beim Laden. Temp-Dirs werden in `afterAll` gelöscht.

**Aktueller Stand:** 109/109 Tests bestehen.

---

## 8. Workspace neu einrichten

```bash
bash scripts/clone-clean-workspace.sh         # interaktiv
bash scripts/clone-clean-workspace.sh --yes   # alle Defaults
```

Schritte: Systemcheck → Verzeichnisse anlegen → .env generieren → npm install → SSL (optional) → Start

---

## 9. UI-Zugriffsschutz

Alle UI-Seiten sind serverseitig durch eine Express-Middleware in `server/index.js` geschützt:

| Datei | Zugang |
|---|---|
| `login.html` | Öffentlich (Login + Incident-Meldeformular) |
| `style.css`, `logincheck.js`, `login-submit.js`, `qr2fa.js` | Öffentlich (Abhängigkeiten der Login-Seite) |
| `index.html`, `app.js` | **Nur mit gültigem JWT-Cookie** |

Unauthentifizierte Anfragen auf geschützte Dateien werden mit `HTTP 302 → /ui/login.html` umgeleitet. Die client-seitige Prüfung in `logincheck.js` bleibt als zusätzliche Schicht erhalten, ist aber nicht der primäre Schutz.

**Stale-Cookie-Schutz (Chrome bfcache):** Beim Abrufen von `login.html` löscht der Server aktiv das `sm_session`-Cookie (`res.clearCookie`). Dies verhindert, dass Chrome einen abgelaufenen JWT aus dem Back/Forward-Cache wiederherstellt und Seiteninhalt aufgrund eines stillen 401 ausgeblendet wird.

---

## 10. RBAC & Benutzer

> **Hinweis – Angepasstes RBAC-Modell:** Die Zugriffssteuerung des ISMS Builders ist eine **maßgeschneiderte Erweiterung** des klassischen rollenbasierten Zugriffsmodells (RBAC). Gegenüber einem Standard-RBAC wurden folgende Anpassungen vorgenommen:
>
> 1. **Zusätzliche Rollen mit spezifischer Normbasis:** Neben den üblichen Rollen `reader`/`editor`/`admin` wurden dedizierte Rollen für den deutschen/europäischen Rechts- und Normkontext eingeführt: `revision` (Interne Revision, weisungsungebunden per IDW/AktG), `qmb` (Qualitätsmanagementbeauftragter, ISO 9001:2015 Kap. 5.3), `dept_head` (Abteilungsleiter) und `auditor` (ICS/OT-Sicherheit, IEC 62443 / NIS2). Diese Rollen existieren in keinem Standard-RBAC-Framework.
>
> 2. **Zweischichtiges Modell (Rang + Funktion):** Zusätzlich zum Zugriffsrang (`role`) trägt jeder Benutzer ein Array organisatorischer Funktionen (`functions[]`), das unabhängig vom Rang gesteuert wird. Dieses zweite Layer löst das reale Problem der **Personalunion** (eine Person ist gleichzeitig CISO und DSB) ohne Duplikation von Rechten oder Schaffung von Sonderrollen. Standard-RBAC-Implementierungen kennen dieses Konzept nicht.
>
> 3. **Normative Begründung:** Die Trennung orientiert sich an ISO 27001:2022 Kap. 5.3 (Rollen und Verantwortlichkeiten) sowie DSGVO Art. 37–39 (Unabhängigkeit des DSB) und NIS2-Umsetzungsgesetz (Sicherheitsverantwortliche).

### Rollenmatrix

| Rolle | Rang | Organisatorische Funktion | Rechte |
|---|---|---|---|
| `reader` | 1 | Allgemeiner Lesezugriff, Management | Lesen aller Module |
| `revision` | 1 | **Interne Revision** – weisungsungebunden, read-only | Identisch mit `reader`; eigene Rollensemantik für Prüfungsnachweise |
| `editor` | 2 | Fachabteilungen, Policy-Autoren | + Templates bearbeiten/Status ändern, SoA-Controls bearbeiten, GDPR VVT + DSAR, Sicherheitsziele, Training, Anhänge |
| `dept_head` | 2 | Abteilungsleiter | Identisch mit `editor` |
| `qmb` | 2 | **Qualitätsmanagementbeauftragter** | Identisch mit `editor`; zuständig für QM-Templates und Training |
| `contentowner` | 3 | **CISO / ISB** und **DSB / GDPO** | + Templates erstellen/genehmigen/verschieben, Guidance, GDPR (AV/DSFA/TOMs/DSB), Legal, Incident-Inbox, **Risiken anlegen und bearbeiten**, alle Einstellungen |
| `auditor` | 3 | **ICS/OT-Sicherheitsverantwortlicher**, Risk-Auditor | Wie `contentowner` + explizit für Risikoverwaltung optimiert; GDPR-Datenpannen |
| `admin` | 4 | Systemadministrator | Alles + Löschen/Papierkorb, Benutzerverwaltung, Admin-Panel |

### Zweischichtiges Rollen-Modell (RBAC-Rang + Organisatorische Funktion)

Das System trennt **Zugriffsrechte** (RBAC-Rang) von **organisatorischen Funktionen** konsequent:

- **RBAC-Rang** (`role`): bestimmt was ein Benutzer im System tun darf — ein einziger Wert
- **Funktionen** (`functions[]`): beschreibt welche organisatorischen Rollen eine Person innehat — beliebig viele

Ein Benutzer kann also gleichzeitig **CISO und DSB** sein (in KMU und Konzernen häufig), ohne dass dafür RBAC-Rechte dupliziert werden müssen.

### Vordefinierte Funktionen

| Funktions-ID | Bezeichnung | Auswirkung |
|---|---|---|
| `ciso` | Chief Information Security Officer / ISB | Menü-Freischaltung (s.u.) + E-Mail-Digest Risiken + BCM; CISO-Einstellungen |
| `dso` | Datenschutzbeauftragter (DSB/DPO) | Menü-Freischaltung (s.u.) + E-Mail-Digest DSAR + GDPR-Vorfälle; DSB-Einstellungen |
| `revision` | Interne Revision | Menü-Freischaltung (s.u.) — weisungsungebunden, read-only |
| `qmb` | Qualitätsmanagementbeauftragter | Menü-Freischaltung (s.u.) + QM-Einstellungen |
| `bcm_manager` | BCM-Manager | — (zukünftige Erweiterung) |
| `dept_head` | Abteilungsleiter | — |
| `auditor` | Interner Auditor | — |
| `admin_notify` | Admin-Benachrichtigung | E-Mail-Digest Verträge + Template-Reviews |

**Mehrfachfunktionen / Personalunion:** Eine Person mit `ciso` + `dso` bekommt beide Digest-E-Mails und sieht die Vereinigungsmenge beider Menüs. Der RBAC-Rang bleibt unabhängig davon.

### Funktionsbasierte Menü-Sichtbarkeit (UI)

Die Sichtbarkeit von Navigationseinträgen folgt einer zweidimensionalen Regel:

> **Sichtbar wenn:** RBAC-Rang ≥ Mindestring des Moduls **ODER** Benutzerfunktion liegt in der erlaubten Funktionsliste des Moduls **ODER** Rolle = admin

**Implementierung:** `canSeeSection(meta)` in `ui/app.js` — wertet `meta.minRole` (Rang-Check) und `meta.functions[]` (Funktions-Check) aus. Die `populateSectionNav()`-Funktion und `loadSection()` nutzen diese Guard.

| Modul | Mindestring | Freischalten auch via Funktion |
|---|---|---|
| Dashboard, SoA, Guidance, Training, Kalender | reader | — (immer sichtbar) |
| Risk & Compliance | editor (rank 2) | `ciso`, `revision`, `qmb` |
| Asset Management | editor (rank 2) | `ciso`, `revision` |
| Sicherheitsziele | contentowner (rank 3) | `ciso`, `dso`, `revision`, `qmb` |
| GDPR & Datenschutz | contentowner (rank 3) | `dso`, `revision` |
| Legal & Privacy | contentowner (rank 3) | `ciso`, `dso` |
| Incident Inbox | contentowner (rank 3) | `ciso` |
| Lieferkette | contentowner (rank 3) | `ciso`, `revision` |
| Business Continuity | contentowner (rank 3) | `ciso`, `revision` |
| Governance | contentowner (rank 3) | `ciso`, `dso`, `revision`, `qmb` |
| Reports | contentowner (rank 3) | `ciso`, `dso`, `revision`, `qmb` |
| Einstellungen | contentowner (rank 3) | `ciso`, `dso`, `revision`, `qmb` |
| Admin-Konsole | admin (rank 4) | — |

**Sonderfälle kombinierter Funktionen (Personalunion):**

| Kombination | Menü-Ergebnis |
|---|---|
| `ciso` + `dso` | Alles außer Admin-Konsole (typisch: KMU-CISO ist gleichzeitig DSB) |
| `ciso` + `revision` | Alles außer GDPR/Legal/Admin |
| `dso` + `qmb` | GDPR, Legal, Governance, SoA, Risiken, Ziele, Training, Reports |
| `dept_head` (Rolle) + `ciso` (Funktion) | Volle CISO-Ansicht trotz Rang 2 |

**Menü-Ansicht nach Demo-Benutzer:**

| User | Rolle | Funktion | Sichtbare Module |
|---|---|---|---|
| admin | admin | ciso, dso | Alle (admin) |
| alice | dept_head | — | Dashboard, SoA, Guidance, Training, Kalender, Risiken, Assets |
| bob | reader | — | Dashboard, SoA, Guidance, Training, Kalender |

### Organisatorische Zuordnung (empfohlen)

| Funktion | Empfohlene Rolle | Norm / Grundlage | Weisungsungebunden? |
|---|---|---|---|
| CISO / ISB | `contentowner` + Funktion `ciso` | ISO 27001 | Nein |
| DSB / GDPO | `contentowner` + Funktion `dso` | DSGVO Art. 37 (Pflicht) | **Ja** |
| ICS/OT-Sicherheitsverantwortlicher | `auditor` | IEC 62443, NIS2 | Nein |
| Interne Revision | `revision` | AktG § 91, IDW PS 321 | **Ja** |
| QMB | `qmb` + Funktion `qmb` | ISO 9001:2015 Kap. 5.3 | Nein |
| Fachabteilungen, Policy-Autoren | `editor` | — | Nein |
| Abteilungsleiter | `dept_head` + Funktion `dept_head` | — | Nein |
| Systemadministration | `admin` | — | Nein |

> **Risikomanagement:** Sowohl `contentowner` (CISO) als auch `auditor` (ICS/OT) dürfen Risiken anlegen und bearbeiten (Rang ≥ 3). `editor` und `reader` haben keinen Schreibzugriff auf das Risikoregister.

> **DSB und Interne Revision** sind per Gesetz/Best Practice weisungsungebunden. Die Rolle `revision` hat Rang 1 (read-only) — sie kann keine Produktionsdaten verändern, nur prüfen und dokumentieren (außerhalb des Systems).

### Technische Umsetzung

```json
// data/rbac_users.json – Beispiel CISO + DSB in Personalunion
{
  "max.mustermann": {
    "username": "max.mustermann",
    "email": "max@firma.de",
    "role": "contentowner",
    "functions": ["ciso", "dso"],
    ...
  }
}
```

**Relevante Dateien:**
- `server/rbacStore.js` — `functions[]` in createUser/updateUser; `getUsersByFunction(fn)` für Notifier
- `server/auth.js` — `functions[]` wird aus JWT geladen und als `req.functions` weitergegeben
- `server/routes/auth.js` — `/login` und `/whoami` geben `functions[]` zurück
- `server/notifier.js` — `getRecipients(fn, fallback)` sucht Empfänger per Funktion; Org-Setting ist Fallback
- `ui/app.js` — `getCurrentFunctions()`, `hasFunction(fn)`, Funktions-Badges in Topbar

**Admin-Panel → Benutzer:** Checkbox-Grid mit allen 7 Funktionen; Funktions-Chips in der Benutzertabelle.

**Einstellungen-Panel:** CISO-Sektion erscheint wenn `hasFunction('ciso')` **oder** RBAC-Rang ≥ contentowner; DSB-Sektion analog.

Benutzer werden in `data/rbac_users.json` als bcrypt-Hashes gespeichert. Verwaltung im **Admin-Panel → Benutzer**.

---

## 11. Reports & Compliance

**7 Report-Typen:**

| Typ | Beschreibung | CSV | Entitäts-Filter |
|---|---|---|---|
| `compliance` | Implementierungsrate pro Gesellschaft & Framework | ✓ | ✓ |
| `framework` | Controls pro Framework: applicable / implementiert / Gap | ✓ | — |
| `gap` | Controls ohne verknüpfte Policy-Templates | ✓ | ✓ |
| `templates` | Alle Templates nach Status und Gesellschaft | ✓ | ✓ |
| `reviews` | Überfällige und kommende Template-Reviews | ✓ | — |
| `matrix` | Compliance-Matrix: Control × Gesellschaft (Ampelfarben) | ✓ | Framework |
| `audit` | Status-Änderungen an Templates im Zeitraum | — | — |

**Endpunkte:**
```
GET /reports/compliance     – Compliance pro Gesellschaft
GET /reports/framework      – Framework-Abdeckung
GET /reports/gap            – Gap-Analyse
GET /reports/templates      – Template-Übersicht
GET /reports/reviews        – Fällige Reviews (?days=30)
GET /reports/matrix         – Compliance-Matrix (?framework=)
GET /reports/audit          – Audit-Trail (?from=&to=)
GET /reports/export/csv     – CSV-Export ?type=...&entity=...&framework=...
```

---

## 12. Statement of Applicability (SoA)

**Frameworks (313 Controls gesamt):**

| ID | Name | Controls |
|---|---|---|
| ISO27001 | ISO 27001:2022 Annex A | 93 |
| BSI | BSI IT-Grundschutz | 66 |
| NIS2 | EU NIS2 | 10 |
| EUCS | EU Cloud (EUCS) | 23 |
| EUAI | EU AI Act | 18 |
| ISO9000 | ISO 9000:2015 | 12 |
| ISO9001 | ISO 9001:2015 | 66 |
| CRA | EU Cyber Resilience Act | 33 |

**Merge-Logik:** Neue Frameworks werden beim Serverstart automatisch in bestehende `soa.json` eingetragen (kein Datenverlust, keine manuelle Migration).

**Endpunkte:**
```
GET  /soa/frameworks      – Frameworks (ID, Label, Farbe)
GET  /soa                 – alle Controls (?framework=, ?theme=)
GET  /soa/summary         – Umsetzungsrate pro Framework
PUT  /soa/:id             – Control aktualisieren (editor+)
GET  /soa/export          – JSON-Export
GET  /soa/crossmap        – Cross-Mapping-Gruppen
```

### Modulübergreifende Traceability (Control- & Policy-Verknüpfungen)

Jeder Eintrag in allen Modulen kann mit SoA-Controls und Richtlinien (Templates) verknüpft werden. Dies gewährleistet die **lückenlose Rückverfolgbarkeit** aller ISMS-Maßnahmen auf Compliance-Anforderungen — ein Pflichtbestandteil nach ISO 27001 Kap. 6.1.3 (Statement of Applicability) und für Auditoren.

| Feld | Typ | Bedeutung |
|---|---|---|
| `linkedControls` | Array von Control-IDs | Verknüpfte SoA-Controls (z.B. `["ISO-5.9","BSI-ORP.3"]`) |
| `linkedPolicies` | Array von Template-IDs | Verknüpfte Richtlinien/Policy-Dokumente |

**Unterstützte Module:**

| Modul | linkedControls | linkedPolicies |
|---|---|---|
| Templates (Richtlinien) | ✅ | ✅ (bidirektional mit SoA) |
| SoA-Controls | ✅ | ✅ (bidirektional mit Templates) |
| Risiken | ✅ | ✅ |
| Sicherheitsziele | ✅ | ✅ |
| Assets | ✅ | ✅ |
| BCM (BIA, Pläne, Übungen) | ✅ | ✅ |
| Governance (Reviews, Maßnahmen, Sitzungen) | ✅ | ✅ |
| Training | ✅ | ✅ |
| GDPR (VVT, AV, DSFA, TOMs) | ✅ | ✅ |
| Legal (Verträge, NDAs, Policies) | ✅ | ✅ |
| Guidance | ✅ | — (Guidance-Docs sind selbst Richtlinien) |

**UI:** In jedem Edit-Formular gibt es einen aufklappbaren Abschnitt „🔗 Verknüpfungen" mit:
- Control-Picker: gefilterter `<select multiple>` aller aktiven SoA-Controls mit Freitextsuche
- Policy-Picker: `<select multiple>` aller Templates (nach Typ gruppiert)
- Ausgewählte Verknüpfungen werden als entfernbare Chips angezeigt

**Auswirkung auf Reports:** Der Gap-Report (`GET /reports/gap`) zeigt Controls ohne verknüpfte Policies. Die Compliance-Matrix berücksichtigt `linkedControls` aller Module.

---

## 13. Admin-Panel (minRole: admin)

7 Tabs:

| Tab | Inhalt |
|---|---|
| **Benutzer** | Anlegen, bearbeiten, löschen; Rollen-Badges |
| **Gesellschaften** | Konzernstruktur (Holding + Töchter), Baum-CRUD |
| **Vorhandene Templates** | Alle Templates mit Löschen-Funktion |
| **Listen** | 6 editierbare Dropdown-Listen (Template-Typen, Risikokategorien, Risikobehandlung, GDPR Datenkats, GDPR Betroffene, Vorfallsarten) |
| **Organisation** | Name, ISMS-Scope, CISO/DSB/ICS-Kontakt |
| **Audit-Log** | Filterbar nach User/Aktion/Ressource/Datum, Pagination, löschbar |
| **Wartung** | Vollexport (JSON), Cleanup verwaister Anhänge, **Demo-Reset**, **Demo-Import** |
| **System-Konfiguration** | Modul-Verwaltung: jedes Modul einzeln aktivieren/deaktivieren — systemweit für alle Benutzer. Darunter: **SoA Framework-Selektion** — jedes der 8 Frameworks (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9000, ISO 9001, CRA) einzeln aktivieren/deaktivieren. Deaktivierte Frameworks erscheinen nicht in SoA-Tabs, Dashboard-Compliance und Reports. Mindestens 1 Framework muss aktiv bleiben. |

---

## 14. Einstellungen (rollenspezifisch, minRole: contentowner)

| Abschnitt | Felder |
|---|---|
| **CISO / ISB** | Eskalations-E-Mail, Response-SLA (Std.), Meldepflicht-Schwelle, meldepflichtige Vorfallsarten |
| **DSB / GDPO** | DSAR-Frist (Tage), verlängerte Frist, 72h-Meldepflicht, Datenschutzbehörde, Standard-Antworttext |
| **ICS / OT** | Verantwortlicher, E-Mail, OT-Scope, Standard (IEC 62443/VDI 2182/NAMUR/BSI), NIS2-Sektor, KRITIS-Flag, Netzwerksegmentierungsstatus, Patch-Zyklus (Wochen), Wartungsfenster, Notfallkontakt |
| **Interne Revision** | Revisionsleiter, E-Mail, Prüfungsumfang, Berichtsempfänger (GF/AR/Prüfungsausschuss), Prüfungsrhythmus, letztes/nächstes Audit-Datum, externer WP |
| **QMB / Qualitätsmanagement** | QMB, E-Mail, QMS-Scope, Norm (ISO 9001/IATF 16949/ISO 13485/AS9100), Zertifizierungsstelle, Zertifikat-Gültigkeit, Audit-Termine, Rezertifizierungsdatum |

**Hinweis zu Weisungsungebundenheit:** DSB und Interne Revision sind per Gesetz bzw. Best Practice weisungsungebunden — sie berichten direkt an GF oder Aufsichtsrat, unabhängig von CISO oder Fachabteilungen. Nicht besetzte Positionen werden im UI mit einem Warnhinweis angezeigt.

### Persönliche Einstellungen (Passwort & 2FA)

Jeder Benutzer erreicht seine persönlichen Einstellungen über **Benutzermenü → Einstellungen** (oben rechts) oder über den Sidebar-Eintrag **Einstellungen**. Der Bereich erscheint ganz oben in der Einstellungsseite und umfasst:

| Bereich | Funktion |
|---|---|
| **Passwort ändern** | Aktuelles Passwort eingeben, neues Passwort (min. 6 Zeichen) zweimal bestätigen; `PUT /me/password` |
| **2FA einrichten** | QR-Code wird automatisch geladen (TOTP); Authenticator-App scannen; 6-stelligen Code eingeben → Aktivieren |
| **2FA deaktivieren** | Button erscheint, wenn 2FA bereits aktiv ist; Bestätigungsdialog |

**2FA-Topbar-Chip:** Ist für den angemeldeten Benutzer keine 2FA eingerichtet, erscheint in der Topbar (zwischen Suche und Benutzer-Avatar) ein dauerhafter orangefarbener Chip **„2FA nicht aktiv"**. Dieser verschwindet erst nach erfolgreicher 2FA-Aktivierung — er kann nicht weggeklickt werden.

**API-Endpunkte (persönliche Einstellungen):**
```
PUT /me/password  – eigenes Passwort ändern (requireAuth) → { currentPassword, newPassword }
```

### 2FA-Enforcement (systemweit)

Im Admin-Panel → Tab **Organisation** → Sektion **Sicherheitsrichtlinien** kann der Administrator die Zwei-Faktor-Authentifizierung für alle Benutzer verpflichtend machen:

| Zustand | Verhalten |
|---|---|
| 2FA-Pflicht **deaktiviert** (Standard) | Benutzer ohne 2FA können sich anmelden; in der Topbar erscheint ein persistenter Warnchip mit Link zu den Einstellungen |
| 2FA-Pflicht **aktiviert** | Benutzer ohne eingerichtete 2FA werden beim Login mit Code `ENFORCE_2FA` und erklärendem Hinweis abgewiesen |

**Wichtig:** Vor der Aktivierung der 2FA-Pflicht sicherstellen, dass alle Benutzerkonten bereits 2FA eingerichtet haben — andernfalls werden betroffene Accounts sofort gesperrt.

**API-Endpunkte:**
```
GET  /admin/security   – 2FA-Enforcement-Status lesen (reader+)
PUT  /admin/security   – 2FA-Enforcement setzen (admin) → { require2FA: true/false }
GET  /whoami           – gibt has2FA: true/false zurück
POST /login            – gibt has2FA: true/false zurück; 403 + code: ENFORCE_2FA wenn Pflicht greift
```

---

## 15. Öffentliche Vorfallmeldung & Incident Inbox

Auf der Login-Seite gibt es einen **"Sicherheitsvorfall melden"**-Button (kein Login nötig).

```
POST   /public/incident         – Vorfall melden (anonym, kein Auth)
GET    /public/incidents        – CISO-Inbox (contentowner+)
GET    /public/incident/:id     – Einzelvorfall (contentowner+)
PUT    /public/incident/:id     – Vorfall bearbeiten/zuweisen (contentowner+)
DELETE /public/incident/:id     – Vorfall löschen (admin)
GET    /public/entities         – Gesellschaftsliste für Formular (kein Auth)
```

Referenznummer: `INC-YYYY-NNNN` (automatisch hochgezählt)

**Löschen (Admin):** Der rote Löschen-Button erscheint in der Detail-Ansicht der Inbox **nur für Administratoren**. contentowner/CISO sehen den Button nicht. Jede Löschung wird im Audit-Log protokolliert.

**CISO-Felder (bearbeitbar):**

| Feld | Werte |
|---|---|
| `status` | new → in_review → assigned → closed |
| `assignedTo` | it / datenschutz |
| `reportable` | tbd / yes / no |
| `cisoNotes` | Freitext |

---

## 16. Audit-Log

Schreibgeschützter, append-only Log mit max. 2000 Einträgen (rolling).

**Protokollierte Aktionen:**

| Ressource | Aktionen |
|---|---|
| `template` | create, update, delete, move |
| `risk` | create, update, delete |
| `user` | create, update, delete |
| `public-incident` | delete |
| `guidance`, `training`, `goals`, `legal` | create, update, delete |
| System | export, settings-change |

```
GET    /admin/audit-log   – Abfrage mit Filtern (?user=&action=&resource=&from=&to=, admin)
DELETE /admin/audit-log   – Log leeren (admin)
```

---

## 17. GDPR-Modul

Vollständig in die Haupt-SPA (`index.html` / `app.js`) integriert — kein separates HTML-Dokument.
Aufruf: `loadSection('gdpr')` → `renderGDPR()`, identisch zum Muster aller anderen vollseitigen Module (Risk, BCM, Assets, Legal usw.).
9 Tabs: overview | vvt | av | dsfa | incidents | dsar | toms | deletion | dsb

```
GET /gdpr/dashboard               – KPI-Übersicht
GET/POST/PUT/DELETE /gdpr/vvt/:id
GET                 /gdpr/vvt/export/csv   – CSV-Export VVT
GET/POST/PUT/DELETE /gdpr/av/:id
GET/POST/PUT/DELETE /gdpr/dsfa/:id
GET/POST/PUT/DELETE /gdpr/incidents/:id
GET/POST/PUT/DELETE /gdpr/dsar/:id
GET/POST/PUT/DELETE /gdpr/toms/:id
GET/PUT             /gdpr/dsb
POST                /gdpr/dsb/upload

– Löschprotokoll (Art. 17 DSGVO) –
GET  /gdpr/deletion-log           – Alle protokollierten Löschungen (reader+)
GET  /gdpr/deletion-log/due       – Überfällige Löschfristen
GET  /gdpr/deletion-log/upcoming  – Bald fällige Löschfristen (?days=90)
POST /gdpr/deletion-log           – Löschung bestätigen (contentowner+)
```

**Löschprotokoll-Logik:** VVT-Einträge mit `retentionMonths` erhalten ein automatisches Ablaufdatum. Abgelaufene Einträge erscheinen als Aufgabe im Tab und im globalen Kalender.

---

## 18. Storage-Backend wechseln

**Empfehlung:** SQLite für Produktion, JSON nur für Entwicklung und Tests.
Ausführliche Migrations-Anleitung inkl. PostgreSQL-Roadmap: **→ Abschnitt 31**.

**Schnellübersicht JSON → SQLite:**
```bash
bash stop.sh
STORAGE_BACKEND=sqlite   # in .env setzen
node tools/migrate-json-to-sqlite.js
bash start.sh
```

---

## 19. Troubleshooting

| Problem | Lösung |
|---|---|
| Port 3000 belegt | `bash stop.sh` (bereinigt auch verwaiste Prozesse) |
| UI nicht erreichbar (weiße Seite) | Prüfen ob SSL aktiv: `grep SSL .env` → ggf. `https://` statt `http://` |
| Server startet nicht | `cat .server.log` für Fehlermeldung |
| Seite (Legal, Reports) kurz leer in Chrome | Behoben: Skeleton-First-Pattern + bfcache-Handler in `app.js` |
| Neue SoA-Frameworks fehlen | Server neu starten → Merge-Logik ergänzt fehlende Controls automatisch |

---

## 20. Legal & Privacy Modul

3 Tabs: Verträge | NDAs | Privacy Policies

```
GET  /legal/summary                          – KPI-Übersicht
GET  /legal/contracts                        – Alle Verträge (reader+)
GET  /legal/contracts/expiring               – Bald ablaufende Verträge (?days=60)
GET  /legal/contracts/export/csv             – CSV-Export Verträge (reader+)
POST/PUT/DELETE /legal/contracts/:id
GET  /legal/ndas                             – Alle NDAs (reader+)
GET  /legal/ndas/export/csv                  – CSV-Export NDAs (reader+)
POST/PUT/DELETE /legal/ndas/:id
GET  /legal/policies                         – Alle Privacy Policies (reader+)
GET  /legal/policies/export/csv              – CSV-Export Policies (reader+)
POST/PUT/DELETE /legal/policies/:id
```

**CSV-Export:** Jeder Tab enthält einen „CSV"-Button in der Filter-Bar. Der Export liefert alle aktiven (nicht gelöschten) Einträge des jeweiligen Tabs als UTF-8-CSV mit BOM (Excel-kompatibel).

| Export | Felder |
|---|---|
| Verträge | ID, Titel, Typ, Vertragspartner, Status, Start/Enddatum, Auto-Verlängerung, Kündigungsfrist, Wert, Währung, Owner, Notizen, Erstellt am |
| NDAs | ID, Titel, Typ, Vertragspartner, Status, Unterzeichnet/Läuft ab, Umfang, Owner, Notizen, Erstellt am |
| Policies | ID, Titel, Typ, Status, Version, Veröffentlicht/Nächstes Review, URL, Owner, Notizen, Erstellt am |

**Kalender-Integration:** Ablaufende Verträge (inkl. Kündigungsfrist) erscheinen im globalen Kalender als `contract_expiring`-Chips.

**Datenspeicherung:** `data/legal/contracts.json`, `data/legal/ndas.json`, `data/legal/privacy-policies.json` (werden beim ersten Zugriff angelegt)

---

## 21. Dashboard (ISMS-Übersicht)

Das Dashboard (`GET /dashboard` + diverse Summary-Endpunkte) aggregiert alle Module:

| Bereich | Endpunkt | Anzeige |
|---|---|---|
| Templates | `/dashboard` | Gesamt, Genehmigungsrate, In Prüfung |
| SoA | `/soa/summary` | Ø Framework-Rate, Balken je Framework |
| Risiken | `/risks/summary` | Gesamt, Kritisch, Hoch, Offene Maßnahmen, Top-5 |
| GDPR | `/gdpr/dashboard` | VVT, offene Datenpannen, offene DSARs, TOMs |
| Legal | `/legal/summary` | Aktive Verträge, ablaufende Verträge |
| Schulungen | `/training/summary` | Abschlussrate, überfällige Schulungen |
| Assets | `/assets/summary` | Gesamt, Kritisch, ohne Klassifizierung, EoL in 90 Tagen |
| Governance | `/governance/summary` | Reviews gesamt, offene Maßnahmen, überfällige Maßnahmen, Sitzungen |
| Kalender | `/calendar` | Nächste-14-Tage-Vorschau |

**Handlungsbedarf-Sektion:** Zeigt automatisch kritische Hinweise (Risiken, offene Vorfälle, ablaufende Verträge, überfällige Schulungen) mit Direktlinks in die jeweiligen Module.

---

## 22. Sicherheitsziele (ISO 27001 Kap. 6.2)

Neues Modul für SMART-Sicherheitsziele mit KPI-Tracking.

**Datenspeicherung:** `data/goals.json`

```
GET  /goals/summary        – KPI-Übersicht (total/active/achieved/overdue/avgProgress)
GET  /goals                – Liste (?status=&category=&entity=)
GET  /goals/:id            – Einzelziel
POST /goals                – Erstellen (editor+)
PUT  /goals/:id            – Aktualisieren (editor+)
DELETE /goals/:id          – Löschen (admin)
```

**Felder je Ziel:**

| Feld | Beschreibung |
|---|---|
| `title` | Bezeichnung (Pflicht) |
| `description` | Kontext / Begründung |
| `category` | confidentiality / integrity / availability / compliance / operational / technical / organizational |
| `status` | planned → active → achieved / missed / cancelled |
| `priority` | low / medium / high / critical |
| `owner` | Verantwortlicher |
| `targetDate` | Zieldatum (erscheint im Kalender) |
| `reviewDate` | Review-Datum (erscheint im Kalender) |
| `progress` | Manueller Fortschritt 0–100% |
| `kpis[]` | metric, targetValue, currentValue, unit → Fortschritt wird automatisch berechnet |

**Kalender-Integration:** `goal_due` und `goal_review` Chips erscheinen im globalen Kalender.

---

## 23. Space Hierarchy – Confluence-ähnliche Seitenhierarchie

Templates können beliebig tief verschachtelt werden (parent → child → grandchild …).

### Datenmodell
| Feld | Typ | Beschreibung |
|---|---|---|
| `parentId` | string \| null | ID des Eltern-Templates (null = Root) |
| `sortOrder` | number | Reihenfolge unter Geschwistern (niedrig = weiter oben) |

### API-Endpunkte
```
GET  /templates/tree?type=Policy&language=de  – Vollständiger Baum (rekursiv, sortiert)
PUT  /template/:type/:id/move                 – Eltern wechseln (kein Version-Bump)
POST /templates/reorder                       – Geschwister-Reihenfolge (Batch-Update)
```

**PUT /template/:type/:id/move** (minRole: contentowner)
```json
{ "parentId": "policy_abc123", "sortOrder": 5 }
```
Kreisreferenz-Schutz: Server prüft ob `parentId` ein Nachfahre des Templates ist → 400 bei Verstoß.

### UI-Features (contentowner+)
| Feature | Beschreibung |
|---|---|
| **Breadcrumb-Navigation** | Oberhalb des Editors; klickbare Pfadkette bis zur Root-Seite |
| **"Kind-Seite erstellen"** | Button in Toolbar; öffnet Erstell-Modal mit vorausgefülltem Parent |
| **"Verschieben"-Dialog** | Button in Toolbar; zeigt Baum aller Seiten des gleichen Typs; Ziel-Parent wählen; Self + Descendants sind gesperrt |
| **Drag & Drop** | Zeilen im Baum sind `draggable`; Drop **auf** einen Knoten → wird Kind davon; Drop auf Root-Drop-Zone → wird Root-Element |
| **Drop-Zonen (Geschwister)** | Dünne Drop-Zonen zwischen Baumknoten; Drop dort → Position innerhalb Geschwister neu sortieren |
| **↑ / ↓ Buttons** | Hover-Buttons pro Zeile; tauschen `sortOrder` mit Nachbar → sofortiger Neu-Render |

### Sortier-Logik
- Geschwister werden nach `sortOrder` (aufsteigend) sortiert, dann alphabetisch nach Titel als Tiebreaker.
- Neue Seiten erhalten `sortOrder: 0`; nach manuellem Verschieben werden Zwischenwerte berechnet.

---

## 24. Chrome-Rendering – Bugfixes & Browser-Kompatibilität

### Problem
Async-Render-Funktionen (`renderLegal`, `renderReports`) hängten einen leeren Container ans DOM und machten erst dann einen `await fetch()`. Chrome zeigte 1–2 Sekunden eine leere Seite. Zusätzlich konnte Chrome's Back/Forward Cache (bfcache) abgelaufene JWT-Sessions aus dem Cache wiederherstellen.

### Implementierte Fixes (Stand 2026-03-08)

| Fix | Datei | Beschreibung |
|---|---|---|
| **Skeleton-First** | `ui/app.js` | `renderLegal()` und `renderReports()` setzen `container.innerHTML` sofort mit Platzhaltern; Daten werden im Hintergrund nachgeladen und nur die KPI-Felder aktualisiert |
| **`isConnected`-Guard** | `ui/app.js` | Nach jedem `await fetch()` in `renderDashboard()` und `renderLegal()` wird `container.isConnected` geprüft — verhindert Renders auf bereits entfernten Containern |
| **bfcache-Handler** | `ui/app.js` | `pageshow`-Event mit `persisted: true` löst `loadSection(currentSection)` erneut aus — Chrome zeigt keine veraltete gecachte Version |
| **Cookie-Clearing** | `server/index.js` | Beim Ausliefern von `login.html` wird `sm_session` serverseitig gelöscht (`res.clearCookie`) — verhindert stale JWT aus bfcache |

---

## 25. Papierkorb & Soft-Delete-System

Alle Module (außer Benutzer, Gesellschaften und Audit-Log) verwenden **Soft-Delete** statt sofortiger physischer Löschung. Gelöschte Datensätze bleiben im jeweiligen JSON erhalten und werden erst nach 30 Tagen automatisch bereinigt.

### Soft-Delete-Verhalten

| Modul | Store | Soft-Delete-Felder |
|---|---|---|
| Templates | `jsonStore.js` | `deletedAt`, `deletedBy` |
| Risiken | `riskStore.js` | `deletedAt`, `deletedBy` |
| Sicherheitsziele | `goalsStore.js` | `deletedAt`, `deletedBy` |
| Guidance | `guidanceStore.js` | `deletedAt`, `deletedBy` |
| Schulungen | `trainingStore.js` | `deletedAt`, `deletedBy` |
| Legal (Verträge/NDAs/Policies) | `legalStore.js` | `deletedAt`, `deletedBy` |
| GDPR (vvt/av/dsfa/incidents/dsar/toms) | `gdprStore.js` | `deletedAt`, `deletedBy` |
| Öffentliche Vorfälle | `publicIncidentStore.js` | `deletedAt`, `deletedBy` |
| Assets | `assetStore.js` | `deletedAt` |

**Kein Soft-Delete** (sofortige Löschung): Benutzer (`rbacStore.js`), Gesellschaften (`entityStore.js`), Audit-Log.

### API-Endpunkte

Jedes Modul erhält drei zusätzliche Endpunkte (admin-only):

```
DELETE /<modul>/:id/permanent  – Endgültig löschen (physisch, kein Restore möglich)
POST   /<modul>/:id/restore    – Aus Papierkorb wiederherstellen
GET    /trash                  – Vereinter Papierkorb aller Module (admin)
```

Der `/trash`-Endpunkt aggregiert alle soft-gelöschten Elemente aus allen Modulen, sortiert nach `deletedAt` (neueste zuerst), mit Feldern `_module` und `_moduleLabel` für die Gruppierung.

### Beispiel-URLs

```
DELETE /template/Policy/policy_123/permanent   – Template endgültig löschen
POST   /risk/risk_456/restore                  – Risiko wiederherstellen
DELETE /gdpr/vvt/vvt_789/permanent            – VVT-Eintrag endgültig löschen
GET    /trash                                  – Gesamter Papierkorb (admin)
```

### Admin-Panel: Papierkorb-Tab

Im Admin-Panel gibt es einen neuen Tab **"Papierkorb"** (admin-only):
- Gruppierte Anzeige aller gelöschten Elemente nach Modul
- **"Wiederherstellen"**-Button: stellt den Datensatz im ursprünglichen Modul wieder her
- **"Endgültig löschen"**-Button: physische Löschung, nicht rückgängig zu machen
- Anzeige von Titel/ID, Löschdatum und Löschender Person

### 30-Tage-Autopurge

Beim Serverstart führt `runAutopurge()` in `server/index.js` eine automatische Bereinigung durch: Alle Datensätze mit `deletedAt` älter als 30 Tage werden permanent aus den jeweiligen JSON-Dateien entfernt. Die Bereinigung wird im Audit-Log mit `action: 'autopurge'` protokolliert.

### Physische Dateien bei Guidance

Beim **Soft-Delete** von Guidance-Dokumenten wird die physische Datei (`data/guidance/files/`) **nicht** gelöscht — sie bleibt für eine mögliche Wiederherstellung erhalten. Erst beim **permanentDelete** (manuell oder per Autopurge) wird die Datei physisch entfernt.

### Audit-Logging

Alle Löschoperationen (Soft-Delete und Permanent-Delete) werden im Audit-Log (`data/audit-log.json`) erfasst:

```json
{ "action": "delete",           "resource": "risk",     "resourceId": "risk_123", ... }
{ "action": "permanent-delete", "resource": "template",  "resourceId": "policy_456", ... }
{ "action": "restore",          "resource": "training",  "resourceId": "training_789", ... }
{ "action": "autopurge",        "resource": "system",    "detail": "Purged 3 items",  ... }
```

---

## 26. Asset Management (ISO 27001 A.5.9–5.12)

Inventar aller Informationswerte des Konzerns mit Klassifizierung, Kritikalität, Eigentümer und EoL-Tracking.

**Datenspeicherung:** `data/assets.json`

```
GET  /assets/summary            – KPI-Übersicht (gesamt, kritisch, unklassifiziert, EoL-soon)
GET  /assets                    – Liste (?category=&classification=&criticality=&status=&entityId=)
GET  /assets/:id                – Einzelasset
POST /assets                    – Erstellen (editor+)
PUT  /assets/:id                – Aktualisieren (editor+)
DELETE /assets/:id              – Löschen / Soft-Delete (admin)
```

**Asset-Kategorien:**

| Kategorie | Typen |
|---|---|
| Hardware | Server, Workstation, Laptop, Mobilgerät, Netzwerk-Equipment, ICS/OT-Anlage, Gebäudetechnik (BAS/GLT), Sonstige |
| Software | Anwendungssoftware, Betriebssystem, Cloud-Dienst (IaaS/PaaS), SaaS-Anwendung, Sonstige |
| Daten / Informationen | Datenbank, Dokumentensammlung, Backup/Archiv, Sonstige |
| Dienste | Interner Dienst, Cloud-Service (extern), Externer Dienstleister |
| Einrichtungen | Bürogebäude, Rechenzentrum/Serverraum, Produktionsstätte/Werk, Sonstige |

**Klassifizierungsstufen (ISO 27001 A.5.12):**

| Stufe | Bedeutung |
|---|---|
| Öffentlich | Keine Vertraulichkeitsanforderungen |
| Intern | Nur für Konzernmitarbeiter |
| Vertraulich | Eingeschränkter Personenkreis |
| Streng vertraulich | Höchste Vertraulichkeit, explizite Freigabe erforderlich |

**Felder je Asset:**

| Feld | Beschreibung |
|---|---|
| `name` | Bezeichnung (Pflicht) |
| `category` / `type` | Kategorie + Unterkategorie |
| `classification` | public / internal / confidential / strictly_confidential |
| `criticality` | low / medium / high / critical |
| `status` | active / planned / decommissioned |
| `owner` / `ownerEmail` | Informationseigentümer (ISO 27001 A.5.9) |
| `custodian` | Technischer Verwalter |
| `entityId` | Zugehörige Gesellschaft (Konzernstruktur) |
| `location` | Standort / Raum |
| `vendor` / `version` / `serialNumber` | Technische Details |
| `purchaseDate` / `endOfLifeDate` | Beschaffungs- und EoL-Datum |
| `tags` | Freitags-Schlagwörter |
| `notes` | Freitext-Notizen |

**UI — 3 Tabs:**
- **Alle Assets:** Filtertabelle (Kategorie, Klassifizierung, Kritikalität, Status, Suchfeld) + inline Formular
- **Nach Kategorie:** Assets gruppiert nach Kategorie mit Anzahl je Gruppe
- **Nach Klassifizierung:** KPI-Karten je Klassifizierungsstufe + gruppierte Listen

**Kalender-Integration:** Assets mit `endOfLifeDate` erscheinen als `asset_eol`-Chips im globalen Kalender.

**Dashboard-Integration:** Asset-KPI-Sektion (Gesamt / Kritisch / Unkategorisiert / EoL bald); Handlungsbedarf-Alerts bei kritischen Assets ohne Klassifizierung oder bald ablaufendem EoL.

**RBAC:** reader (lesen), editor+ (erstellen/bearbeiten), admin (löschen).

**Traceability:** Jedes Asset unterstützt `linkedControls` (z.B. ISO-5.9 Inventar, ISO-5.10 Akzeptable Nutzung) und `linkedPolicies` (z.B. Asset-Management-Richtlinie, BYOD-Policy).

---

## 27. Governance & Management-Review (ISO 27001 Kap. 9.3)

Modul für die gesamte Governance-Dokumentation: Management-Reviews nach ISO 27001 Kap. 9.3, Maßnahmen-Tracking aus Audits/Reviews sowie Sitzungsprotokolle für Ausschüsse.

**Datenspeicherung:** `data/governance.json` (drei Collections: reviews, actions, meetings)

```
GET  /governance/summary              – KPI-Übersicht (alle drei Collections)
GET/POST/PUT/DELETE /governance/reviews/:id
GET/POST/PUT/DELETE /governance/actions/:id
GET/POST/PUT/DELETE /governance/meetings/:id
```

### Sub-Modul 1: Management-Reviews (ISO 27001 Kap. 9.3)

| Feld | Beschreibung |
|---|---|
| `type` | annual / interim / extraordinary |
| `status` | planned → completed → approved |
| `chair` | Vorsitzender (i.d.R. CEO / GF) |
| `participants` | Teilnehmerliste |
| **Inputs (9.3.2)** | auditResults, stakeholderFeedback, performance, nonconformities, previousActions, risksOpportunities, externalChanges |
| **Outputs (9.3.3)** | decisions (Beschlüsse), improvements (Verbesserungen), resourceNeeds (Ressourcenbedarf) |
| `nextReviewDate` | Datum nächster Review (erscheint im Kalender) |

### Sub-Modul 2: Maßnahmen-Tracking

| Feld | Beschreibung |
|---|---|
| `source` | management_review / internal_audit / external_audit / incident / other |
| `sourceRef` | Verweis auf Quelldokument |
| `priority` | low / medium / high / critical |
| `status` | open / in_progress / completed / cancelled |
| `progress` | Fortschritt 0–100 % (Fortschrittsbalken in der Tabelle) |
| `dueDate` | Fälligkeitsdatum (erscheint im Kalender als `governance_action`) |
| `owner` / `ownerEmail` | Verantwortlicher |

Überfällige Maßnahmen (dueDate < heute, Status offen/in_progress) werden in der Tabelle rot hervorgehoben und im Dashboard als Alert angezeigt.

### Sub-Modul 3: Sitzungsprotokolle

| Feld | Beschreibung |
|---|---|
| `committee` | isms_committee / ciso_meeting / risk_committee / management / other |
| `agenda` | Tagesordnung (Freitext, zeilenweise) |
| `decisions` | Beschlüsse |
| `approved` / `approvedBy` | Genehmigungsstatus |
| `nextMeetingDate` | Nächster Termin (erscheint im Kalender als `committee_meeting`) |

**Kalender-Integration:** management_review, governance_action (nur offene), committee_meeting

**Dashboard-Integration:** Governance KPI-Sektion (Reviews gesamt, offene Maßnahmen, überfällige Maßnahmen, Sitzungen); Alerts bei überfälligen oder kritischen Maßnahmen.

**RBAC:** reader (lesen), editor+ (erstellen/bearbeiten), admin (löschen).

**Traceability:** Reviews, Maßnahmen und Sitzungsprotokolle unterstützen `linkedControls` (z.B. ISO-9.3 Management-Review) und `linkedPolicies`. Dokument-Upload für alle drei Collections (PDF/DOCX/XLSX, max 20 MB).

---

## 28. Business Continuity Management (BCM/BCP)

**Norm-Referenzen:** ISO 27001 A.5.29 (BCM), A.5.30 (ICT Readiness), NIS2 Art. 21, BSI 200-4

BCM umfasst drei Sub-Module, gemeinsam gespeichert in `data/bcm.json`.

### Sub-Module

| Sub-Modul | Beschreibung |
|---|---|
| **BIA-Register** | Business Impact Analysis — kritische Prozesse mit RTO/RPO/MTPD-Zielen |
| **Kontinuitätspläne** | BCP, DRP, ITP, Krisenkommunikationspläne mit Teststatus |
| **Übungen & Tests** | Tabletop-, Simulations- und Vollübungen mit Ergebnissen |

### BIA-Felder

| Feld | Typ | Beschreibung |
|---|---|---|
| title | string | Prozessname |
| processOwner | string | Prozessverantwortlicher |
| department | string | Abteilung/Bereich |
| criticality | critical/high/medium/low | Geschäftskritikalität |
| rto | number (h) | Recovery Time Objective |
| rpo | number (h) | Recovery Point Objective |
| mtpd | number (h) | Max. Tolerable Period of Disruption |
| dependencies | array | Abhängige Systeme/Prozesse |
| affectedSystems | array | Betroffene IT-Systeme |
| status | draft/reviewed/approved | Freigabestatus |
| entityId | string | Zugeordnete Gesellschaft |

### Plan-Typen

| Typ | Bedeutung |
|---|---|
| bcp | Business Continuity Plan |
| drp | Disaster Recovery Plan |
| itp | IT-Wiederanlaufplan |
| crisis_communication | Krisenkommunikationsplan |

### Test-Ergebnisse

| Wert | Bedeutung |
|---|---|
| pass | Übung erfolgreich bestanden |
| fail | Kritische Mängel festgestellt |
| partial | Teilweise bestanden, Nacharbeiten erforderlich |
| not_tested | Noch nicht getestet |
| planned | Übung geplant (noch nicht durchgeführt) |

### Dashboard-Alerts

| Bedingung | Alert |
|---|---|
| `plans.overdueTest > 0` | Pläne mit überfälligem Testdatum |
| `bia.withoutPlan > 0` | Kritische Prozesse ohne zugehörigen Plan |

### API-Endpunkte

```
GET    /bcm/summary           – Zusammenfassung (reader+)
GET    /bcm/bia               – Alle BIA-Einträge (reader+)
POST   /bcm/bia               – BIA anlegen (editor+)
PUT    /bcm/bia/:id           – BIA bearbeiten (editor+)
DELETE /bcm/bia/:id           – BIA löschen (admin)

GET    /bcm/plans             – Alle Pläne (reader+)
POST   /bcm/plans             – Plan anlegen (editor+)
PUT    /bcm/plans/:id         – Plan bearbeiten (editor+)
DELETE /bcm/plans/:id         – Plan löschen (admin)

GET    /bcm/exercises         – Alle Übungen (reader+)
POST   /bcm/exercises         – Übung anlegen (editor+)
PUT    /bcm/exercises/:id     – Übung bearbeiten (editor+)
DELETE /bcm/exercises/:id     – Übung löschen (admin)
```

### Kalender-Events

| Event-Typ | Quelle |
|---|---|
| bcm_exercise | Geplante Übung (result: planned) |
| bcm_plan_test | Fälliger Plan-Test (nextTest-Datum) |

### Seed-Daten (21 Einträge)

8 BIA-Einträge (SAP ERP, Produktionslinie, M365, Payroll, Buchhaltung, Gebäudeleittechnik, CRM, Lieferkettenportal), 7 Pläne (ITP SAP, BCP Produktion, Ransomware-Notfallplan, Krisenkommunikation, Gebäudeevakuierung, Azure DRP, HR-Notfallhandbuch) und 6 Übungen (4 abgeschlossen, 2 geplant).

### Wichtige Dateien

- `server/db/bcmStore.js` — Store (drei Collections, Soft-Delete, getSummary)
- `data/bcm.json` — Persistenz
- `tests/bcm.test.js` — 29 Tests

**Traceability:** BIA-Einträge, Pläne und Übungen unterstützen `linkedControls` (z.B. ISO-5.29 BCM, ISO-5.30 ICT Readiness) und `linkedPolicies`. Dokument-Upload für alle drei Collections (PDF/DOCX/XLSX, max 20 MB), Ablage in `data/bcm-files/`.

## 29. Code-Architektur & Refactoring (Stand 2026-03-09)

### Server-Struktur

`server/index.js` wurde von 2450 auf ~180 Zeilen reduziert. Alle Routen liegen in `server/routes/` als eigenständige Express-Router-Module.

| Router-Datei | Verantwortlich für | Zeilen |
|---|---|---|
| `routes/auth.js` | Login, Logout, Whoami, /me/password, 2FA | ~133 |
| `routes/templates.js` | Templates, Anhänge, Hierarchie, Entities | ~215 |
| `routes/soa.js` | SoA, Crossmap, Frameworks | ~99 |
| `routes/risks.js` | Risk & Compliance | ~82 |
| `routes/goals.js` | Sicherheitsziele | ~49 |
| `routes/assets.js` | Asset Management | ~41 |
| `routes/governance.js` | Governance + Dokument-Upload | ~160 |
| `routes/bcm.js` | BCM + Dokument-Upload | ~160 |
| `routes/calendar.js` | Aggregierter Kalender | ~141 |
| `routes/guidance.js` | Guidance + Datei-Upload | ~118 |
| `routes/gdpr.js` | GDPR & Datenschutz | ~322 |
| `routes/reports.js` | Reports + CSV-Export | ~36 |
| `routes/legal.js` | Legal & Privacy | ~176 |
| `routes/training.js` | Training & Schulungen | ~47 |
| `routes/admin.js` | Admin-Routen, Dashboard | ~253 |
| `routes/public.js` | Öffentliche Incident-Meldung | ~69 |
| `routes/trash.js` | Papierkorb + Vollexport | ~202 |

### Vorteile der Modularisierung
- Jede Route ist unabhängig testbar und wartbar
- Neue Module erfordern nur eine neue Router-Datei + einen `app.use()`-Eintrag in `index.js`
- Community-Beiträge können auf einzelne Router-Dateien beschränkt werden
- `index.js` bleibt dauerhaft schlank

## 30. E-Mail-Benachrichtigungen

Der ISMS Builder sendet täglich eine Digest-Mail an CISO, GDPO und Admin, wenn relevante Handlungsbedarfe vorliegen. Der Dienst ist vollständig optional: Fehlt `SMTP_HOST` in der `.env`, ist alles deaktiviert.

### Architektur

| Datei | Funktion |
|---|---|
| `server/mailer.js` | Nodemailer-Transport, `sendMail(to, subject, html)`, no-op wenn SMTP fehlt |
| `server/notifier.js` | `runDailyChecks()` + `start()`, täglich per `setInterval` |

Der Notifier wird in `server/index.js` nur innerhalb des `require.main === module`-Guards gestartet — Tests bleiben vollständig unberührt.

### Benachrichtigungstypen

| Typ | Schwellwert | Empfänger |
|---|---|---|
| Hohe/kritische Risiken | Score ≥ 10 (hoch) oder ≥ 15 (kritisch), offen | `cisoEmail` |
| BCM-Tests fällig | `nextTest` ≤ 14 Tage | `cisoEmail` |
| DSAR-Fristen | Eingangsdatum + Fristlänge ≤ 3 Tage | `gdpoEmail` |
| GDPR-Vorfälle offen > 48h | Status ≠ closed/notified, Alter ≥ 2 Tage | `gdpoEmail` |
| Ablaufende Verträge | `endDate` ≤ 30 Tage | `adminEmail` |
| Template-Überprüfung fällig | `nextReviewDate` ≤ 14 Tage | `adminEmail` |

- **cisoEmail** / **gdpoEmail**: aus Admin → Organisation → Verantwortlichkeiten
- **adminEmail**: eigene Adresse unter Admin → Organisation → E-Mail-Benachrichtigungen

### Konfiguration

**Schritt 1: SMTP in `.env` eintragen**
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=isms@example.com
SMTP_PASS=geheim
SMTP_FROM=ISMS Builder <isms@example.com>
```

**Schritt 2: Admin → Organisation → E-Mail-Benachrichtigungen**
- Globalen Schalter aktivieren
- Admin-E-Mail eintragen
- Einzelne Benachrichtigungstypen ein-/ausschalten

### E-Mail-Format

Jede E-Mail ist ein HTML-Digest mit:
- Header in ISMS-Blau mit Organisationsname
- Tabellarische Auflistung pro Kategorie (max. 10 Einträge je Kategorie)
- Versandzeit: 1 Minute nach Serverstart, danach alle 24 Stunden

### SMTP-Beispiele

**Gmail (App-Passwort):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=abcd-efgh-ijkl-mnop
```

**Office 365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=isms@yourcompany.com
```

---

## 31. Storage-Backends & Migration (JSON → SQLite → PostgreSQL)

### Übersicht der Backends

| Backend | Aktivierung | Empfehlung |
|---|---|---|
| **JSON** | `STORAGE_BACKEND=json` | Entwicklung, Tests, Quick-Start |
| **SQLite** | `STORAGE_BACKEND=sqlite` | **Produktivbetrieb** (Standard) |
| **PostgreSQL** | `STORAGE_BACKEND=pg` | Multi-Instanz, hohe Last (zukünftig) |

**Warum SQLite für Produktion?** SQLite ist für einen selbst gehosteten ISMS-Dienst mit einer bis wenigen gleichzeitigen Nutzern ideal: keine Serverinfrastruktur, ACID-Transaktionen, WAL-Modus, Foreign Keys, einfaches Backup per `cp data/isms.db backup.db`.

### Migration JSON → SQLite

**Einmaliger Schritt beim Wechsel vom Entwicklungsmodus in den Produktivbetrieb:**

```bash
# 1. Server stoppen
bash stop.sh

# 2. Backup erstellen
bash scripts/backup-and-deploy.sh

# 3. Migration ausführen
node tools/migrate-json-to-sqlite.js

# 4. Backend in .env umschalten
sed -i 's/STORAGE_BACKEND=json/STORAGE_BACKEND=sqlite/' .env

# 5. Server neu starten
bash start.sh
```

Das Migrationsskript (`tools/migrate-json-to-sqlite.js`) überträgt alle Daten aus den JSON-Dateien in `data/isms.db`. Die JSON-Dateien bleiben als Backup erhalten.

**Überprüfung:**
```bash
sqlite3 data/isms.db "SELECT COUNT(*) FROM templates;"
```

### Migration SQLite → PostgreSQL (geplant)

PostgreSQL wird benötigt wenn:
- Mehrere ISMS-Instanzen auf denselben Datensatz zugreifen
- Hochverfügbarkeit / Replikation erforderlich ist
- Lastspitzen durch viele gleichzeitige Nutzer entstehen

**Geplante Umsetzung:**

```bash
# Zukünftiger Ablauf (pgStore.js ist noch in Entwicklung):

# 1. PostgreSQL einrichten
createdb isms_builder
psql isms_builder -c "CREATE USER isms WITH PASSWORD 'secret';"
psql isms_builder -c "GRANT ALL ON DATABASE isms_builder TO isms;"

# 2. .env anpassen
STORAGE_BACKEND=pg
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=isms_builder
PG_USER=isms
PG_PASSWORD=secret

# 3. Schema initialisieren (beim ersten Start automatisch)
npm start

# 4. Daten aus SQLite übertragen (geplantes Skript)
node tools/migrate-sqlite-to-pg.js
```

**Status:** `server/db/pgStore.js` ist als Stub angelegt. Die vollständige Implementierung folgt in einer späteren Version. Die API-Schnittstelle ist bereits via `server/storage.js` (Façade) abstrahiert — der restliche Code muss nicht geändert werden.

### Backup-Strategien je Backend

| Backend | Backup-Befehl | Empfehlung |
|---|---|---|
| JSON | `tar -czf backup.tar.gz data/` | `scripts/backup-and-deploy.sh` nutzen |
| SQLite | `sqlite3 data/isms.db ".backup data/isms.db.bak"` | Täglich via Cron |
| PostgreSQL | `pg_dump isms_builder > backup.sql` | Täglich via Cron + WAL-Archivierung |

---

## 32. Open-Source-Dokumentation & Architektur-Artefakte

Alle Architekturdokumente liegen unter `docs/architecture/`. Das Projekt folgt Open-Source-Standards mit Lizenz, Beitragsleitfaden und GitHub-Issue-Templates.

### Neue Dateien

| Datei | Inhalt |
|---|---|
| `LICENSE` | GNU Affero General Public License v3.0 (AGPL-3.0), Copyright © 2026 Claude Hecker |
| `CONTRIBUTING.md` | Entwicklungs-Setup, Code-Stil, PR-Richtlinien, Anleitung zum Hinzufügen neuer Module |
| `README.md` | Open-Source-README: Feature-Tabelle, Quick Start, Konfiguration, Architekturüberblick |
| `.github/ISSUE_TEMPLATE/bug_report.md` | GitHub-Issue-Template für Bug Reports |
| `.github/ISSUE_TEMPLATE/feature_request.md` | GitHub-Issue-Template für Feature Requests |
| `.github/ISSUE_TEMPLATE/security.md` | GitHub-Issue-Template für Sicherheitslücken (mit Hinweis auf privaten Kanal) |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR-Checkliste (Tests, escHtml, Soft-Delete, CONTRIBUTING-Konformität) |
| `docs/architecture/c4-diagrams.md` | C4-Architekturdiagramme (Level 1–3 + Deployment) als Mermaid |
| `docs/architecture/data-model.md` | Vollständiges Datenmodell aller JSON-Stores mit Feldtabellen und ER-Übersicht |
| `docs/architecture/openapi.yaml` | OpenAPI 3.0-Spezifikation aller REST-Endpunkte (80+ Endpunkte, alle 17 Router) |

### C4-Diagramme (`docs/architecture/c4-diagrams.md`)

Drei Ebenen nach dem [C4-Modell](https://c4model.com/), gerendert mit Mermaid:

- **Level 1 – System Context:** Akteure (Admin, CISO, DPO, Editor, Auditor, Public) und externe Systeme (Browser, Authenticator-App, E-Mail)
- **Level 2 – Container:** SPA (Vanilla JS), REST API (Node.js/Express), Auth-Modul, JSON-Store, SQLite-Store, File Storage
- **Level 3 – Component:** Alle 17 Router-Module, alle Store-Klassen, Auth-Middleware, Storage-Façade, Reports-Logik

### Datenmodell (`docs/architecture/data-model.md`)

Dokumentiert alle JSON-Datenstrukturen:
- Gemeinsame Felder aller Records (id, createdAt, updatedAt, deletedAt, linkedControls, linkedPolicies)
- User, Templates, SoA Controls, Risks, Assets, BCM, Governance, GDPR, Entities, OrgSettings
- ID-Format (Base36 + 4 Zufallszeichen, ~36-bit Entropie)
- Entity-Relationship-Übersicht (bidirektionale Verknüpfungen)

### OpenAPI-Spezifikation (`docs/architecture/openapi.yaml`)

Vollständige OpenAPI 3.0.3-Spezifikation:
- 80+ dokumentierte Endpunkte
- Cookie-Auth-Security-Schema (`sm_session` JWT)
- Gruppiert nach Tags (auth, templates, soa, risks, goals, assets, governance, bcm, calendar, guidance, gdpr, reports, legal, training, admin, public, trash)
- Inline-Schemas für Request/Response-Bodies
- Verwendbar mit Swagger UI oder Redoc

### Lizenz (AGPL-3.0)

Der ISMS Builder ist unter der **GNU Affero General Public License v3.0** lizenziert. Das bedeutet:
- Nutzung, Modifikation und Weitergabe ist erlaubt
- Wer eine modifizierte Version als Netzwerkdienst betreibt, **muss den vollständigen Quellcode** den Nutzern dieses Dienstes zur Verfügung stellen
- Der ursprüngliche Copyright-Vermerk (Claude Hecker) muss erhalten bleiben

---

## 33. Lieferkettenmanagement – Multi-Framework

Verwaltet Lieferanten und Dienstleister framework-agnostisch. `linkedControls[]` nimmt SoA-Control-IDs beliebiger Frameworks auf.

### Normative Grundlagen

| Norm | Kontrolle | Inhalt |
|---|---|---|
| ISO 27001:2022 | A.5.19 | Informationssicherheit in Lieferantenbeziehungen |
| ISO 27001:2022 | A.5.20 | Informationssicherheit in Lieferantenvereinbarungen |
| ISO 27001:2022 | A.5.21 | Management der Informationssicherheit in der IKT-Lieferkette |
| ISO 27001:2022 | A.5.22 | Überwachung, Überprüfung und Änderungsmanagement von Lieferantenleistungen |
| ISO 27001:2022 | A.5.23 | Informationssicherheit für Cloud-Dienste |
| **NIS2** | **Art. 21(2)(d)** | **Sicherheit der Lieferkette — Pflichtmaßnahme für betroffene Einrichtungen** |
| EUCS | SCM.1 / SCM.2 | Lieferkettensicherheit & Sub-Prozessor-Management für Cloud |
| CRA | Art. 13 (5.1–5.3) | Sorgfaltspflichten Importeure, Open-Source-Komponenten |
| DSGVO | Art. 28 | Auftragsverarbeiter (AV-Vertrag erforderlich) |

**Seed-Daten (10 Einträge):** NIS2-d in kritischen/hohen Lieferanten (Deutsche Telekom, DATEV, SAP, Cisco, Microsoft, AWS), EUCS-SCM.1/2 in Cloud-Anbietern (Microsoft, AWS, Hetzner).

### Datenmodell

```json
{
  "id": "sup_<hex8>",
  "name": "Lieferant GmbH",
  "type": "software|hardware|service|cloud|consulting|other",
  "criticality": "critical|high|medium|low",
  "status": "active|under_review|inactive|terminated",
  "country": "DE",
  "contactName": "", "contactEmail": "", "website": "",
  "description": "", "products": "",
  "dataAccess": false,
  "dataCategories": [],
  "securityRequirements": [],
  "lastAuditDate": "", "nextAuditDate": "",
  "auditResult": "passed|failed|pending|not_scheduled",
  "contractId": "",    // Verknüpfung → Legal/Verträge
  "avContractId": "",  // Verknüpfung → GDPR/AV (wenn Auftragsverarbeiter)
  "riskScore": 0,      // 0–25
  "notes": "",
  "linkedControls": [], "linkedPolicies": [],
  "createdAt": "", "updatedAt": "", "createdBy": "", "deletedAt": null
}
```

### API-Endpunkte

```
GET    /suppliers              – Alle Lieferanten (reader+); ?status=&criticality=&type=
GET    /suppliers/summary      – KPIs: total, critical, byStatus, withDataAccess, overdueAudits
GET    /suppliers/:id          – Einzellieferant (reader+)
POST   /suppliers              – Anlegen (editor+)
PUT    /suppliers/:id          – Bearbeiten (editor+)
DELETE /suppliers/:id          – Soft-Delete (admin+)
DELETE /suppliers/:id/permanent – Endgültig löschen (admin+)
POST   /suppliers/:id/restore  – Wiederherstellen (admin+)
```

### UI-Übersicht

- **3 Tabs:** Liste (alle) | Kritisch (critical+high) | Datenverarbeitung (dataAccess=true)
- **Inline-Formular:** openSupplierForm() — alle Felder inkl. Verknüpfungen
- **Kritikalitäts-Farben:** critical=rot, high=orange, medium=gelb, low=grün
- **KPI-Block:** Gesamt / Kritisch / Audit überfällig / Mit Datenzugriff
- **Dashboard-Integration:** KPI-Karte + Alert bei überfälligen Audits

### Kalender-Integration

Ereignistyp `supplier_audit`: Nächstes Audit-Datum (60-Tage-Vorschau), Severity nach Kritikalität.

### E-Mail-Benachrichtigung

`checkSupplierAudits()` im CISO-Digest: überfällige Audits + Audits in ≤ 14 Tagen. Gesteuert durch `emailNotifications.supplierAudits` (Admin → Organisation).

### Seed-Daten (10 Einträge)

Microsoft 365, DATEV, Telekom, SAP S/4HANA, Hetzner, Securelink, Cisco, AWS EMEA, TÜV Rheinland, Lexware — Mischung aus Typen, Kritikalitäten und Datenzugriff-Status.

### Relevante Dateien

| Datei | Zweck |
|---|---|
| `server/db/supplierStore.js` | Store (CRUD, Summary, getUpcomingAudits) |
| `server/routes/suppliers.js` | REST-Routen |
| `data/suppliers.json` | Persistenz + Seed-Daten |
| `server/routes/calendar.js` | `supplier_audit`-Ereignisse |
| `server/notifier.js` | `checkSupplierAudits()` im CISO-Digest |

---

## 34. Mehrfach-Funktionen pro Benutzer

Trennt **RBAC-Rang** (Zugriffsrechte) von **organisatorischen Funktionen** (Verantwortlichkeiten).

### Zweischichtiges Modell

```
User.role        = 'contentowner'    ← RBAC-Rang: bestimmt Zugriffsrechte (ein Wert)
User.functions[] = ['ciso', 'dso']   ← Org. Funktionen: beliebig viele, unabhängig
```

### Vordefinierte Funktionen

| ID | Bezeichnung | Auswirkung im System |
|---|---|---|
| `ciso` | Chief Information Security Officer | CISO-Digest (Risiken, BCM, Lieferanten); CISO-Einstellungen |
| `dso` | Datenschutzbeauftragter (DSB/DPO) | DSB-Digest (DSAR, GDPR-Vorfälle); DSB-Einstellungen |
| `qmb` | Qualitätsmanagementbeauftragter | Topbar-Badge |
| `bcm_manager` | BCM-Manager | Topbar-Badge |
| `dept_head` | Abteilungsleiter | Topbar-Badge |
| `auditor` | Interner Auditor | Topbar-Badge |
| `admin_notify` | Admin-Benachrichtigung | Admin-Digest (Verträge, Reviews) |

### Technische Umsetzung

- `server/rbacStore.js` — `functions[]` in Seed-Users, createUser, updateUser; `getUsersByFunction(fn)` neu
- `server/auth.js` — `functions[]` aus JWT, `req.functions`
- `server/routes/auth.js` — `/login` + `/whoami` geben `functions[]` zurück
- `server/notifier.js` — Empfänger per `getUsersByFunction(fn)`, Org-Setting als Fallback
- `ui/app.js` — `getCurrentFunctions()`, `hasFunction(fn)`, Topbar-Badges (`#topbarFnBadges`)
- Settings-Panel: Sektionen nach Funktion ODER RBAC-Rang gesteuert

### Admin-UI

Admin → Benutzer: Checkbox-Grid mit allen Funktionen im Benutzer-Modal; Funktions-Chips in der Tabelle.

---

## 35. Präsentation

Die Präsentation ist eine selbst-enthaltene HTML-Datei — kein Internet, kein PowerPoint, kein Build-Step nötig.

**Datei:** `docs/presentation/isms-builder-presentation.html`

### Bedienung

| Aktion | Taste / Geste |
|---|---|
| Nächste Folie | `→` / `Leertaste` / Swipe links |
| Vorherige Folie | `←` / Swipe rechts |
| Erste / letzte Folie | `Home` / `End` |
| Vollbild | `F` |

### Inhalt (19 Folien)

1. Titelfolie — ISMS Builder
2. Agenda
3. Was ist ISMS Builder? (Überblick, Zielgruppen, Vorteile)
4. Compliance-Abdeckung (8 Frameworks, 313 Controls)
5. Architektur & Deployment (Tech-Stack, Sicherheit, Betrieb)
6. Dashboard — ISMS-Überblick (KPIs, Handlungsbedarf, 14-Tage-Vorschau)
7. Statement of Applicability (SoA)
8. Risikomanagement – Multi-Framework (ISO 27001, NIS2, EUCS, EU AI Act, ISO 9001)
9. GDPR & Datenschutz (9 Sub-Module, 72h-Timer, DSAR-Workflow)
10. Lieferkettenmanagement – Multi-Framework (ISO 27001, NIS2, EUCS, CRA)
11. Asset Management & Business Continuity
12. Governance, Legal & Training
13. RBAC & Mehrfach-Funktionen (Personalunion CISO+DSB)
14. E-Mail-Benachrichtigungen (3 Digest-Typen)
15. Betrieb & Deployment (Docker, Migration, SSL)
16. Demo-Modus & Demo-Reset
17. Open-Source-Artefakte (LICENSE, OpenAPI, C4-Diagramme)
18. Roadmap (implementiert / kurzfristig / mittelfristig / KI-Integration)
19. Abschlussfolie

### Technische Details

- **Format:** Single-File HTML (53 KB), vollständig offline nutzbar
- **Theme:** Atlassian Dark (passend zur App-UI)
- **Responsiv:** funktioniert auf Laptop, Beamer und Tablet
- **Kein Framework:** reines HTML/CSS/JS — keine Abhängigkeiten

---

## 36. Geplante Erweiterungen & offene TODOs

### Geplante Features

- **PostgreSQL-Backend** (`pgStore.js` vervollständigen) — für Multi-Instanz / Hochverfügbarkeit
- **EN-Spiegelstruktur** — Mehrsprachigkeit (DE/EN) für Templates und UI
- **CSV-Export Legal-Modul** — Verträge, NDAs und Datenschutzrichtlinien als CSV-Export
- **Datei-Upload für Verträge** — PDF/DOCX-Anhänge direkt im Legal-Modul

### Geplante KI-Integration (Ollama · lokal · DSGVO-konform)

Alle KI-Features laufen vollständig **on-premise** über [Ollama](https://ollama.ai) — keine Cloud-API, keine Datenweitergabe, DSGVO-konform.

#### Priorisierung

| Priorität | Feature | Technologie | Nutzen |
|---|---|---|---|
| 1 | **Semantische Suche** | `nomic-embed-text` + `sqlite-vss` | Suche nach Bedeutung statt Stichwort — größter UX-Gewinn |
| 2 | **Scanner → Risiko-Entwurf** | `llama3.2:3b` / `mistral:7b` | nmap/OpenVAS-Output automatisch in Risiko-Entwürfe (status: draft) |
| 3 | **Audit-Log Anomalieerkennung** | `llama3.2:3b` | Nächtlicher Batch-Cron, Report im Dashboard |
| 4 | **Policy-Lückenanalyse** | `mistral:7b` | Template-Inhalt vs. SoA-Controls, fehlende Abschnitte vorschlagen |

#### Architektur

```
Ollama (localhost:11434)
├── nomic-embed-text    → Embeddings für semantische Suche
├── llama3.2:3b         → Schnelle Batch-Analyse (Audit-Log, Klassifikation)
└── mistral:7b          → Reasoning-Tasks (Risikobewertung, Policy-Analyse)

ISMS Backend (neue API-Endpunkte)
├── POST /api/ai/search         → Semantische Volltextsuche
├── POST /api/ai/analyze-log    → Audit-Log Batch-Analyse
├── POST /api/ai/scan-import    → Scanner-Output → Risiko-Entwürfe
└── POST /api/ai/gap-analysis   → Policy-Lückenanalyse
```

#### Human-in-the-Loop-Prinzip

Alle KI-generierten Inhalte (Risiken, Lücken-Hinweise) erhalten `status: "draft"` und `needsReview: true`. Keine KI-Aktion wird ohne menschliche Freigabe (CISO/Auditor) in den Aktivbestand übernommen. Dieses Prinzip ist für alle KI-Features verbindlich.

#### Hardware-Anforderungen

- **Minimum:** 16 GB RAM + moderne CPU (kein GPU erforderlich für Batch-Tasks)
- **Empfohlen:** 32 GB RAM für parallele Modell-Instanzen
- **Embedding-Modell (`nomic-embed-text`):** läuft bereits auf 4 GB RAM

### Offene TODOs (Architektur / UI)

#### TODO: Template-Editor-UI Konsolidierung
**Stand:** Die Template-Erstellung und -Bearbeitung erfolgt derzeit über zwei UI-Pfade:
1. **Sidebar-Button "Erstellen"** (`#btnNewType`) + Typ-Liste (`#typeList`) + Template-Liste (`#listPanel`) — das ursprüngliche Build-Mode-Interface
2. **Template-Sektion im SPA** — Teil der vollständigen ISMS-Plattform

**Ziel:** Beide Pfade konsolidieren zu einem einheitlichen Template-Management-Interface, ähnlich wie andere Module (Risiken, Assets, Governance). Der Sidebar-"Erstellen"-Button könnte kontextsensitiv werden (zeigt Optionen je nach aktiver Sektion).

**Hinweis:** Keine funktionale Einschränkung — beide Pfade funktionieren korrekt. Die Konsolidierung dient der UX-Konsistenz. Wird in einem späteren Sprint umgesetzt.

**RBAC-Guard (umgesetzt):** Das `.sidebar-create-wrap`-Element (`#btnNewType`) wird in `init()` per JS ausgeblendet wenn `ROLE_RANK[currentRole] < ROLE_RANK['editor']` — reader und revision sehen den Button nicht.

---

## 37. Risikomanagement – Multi-Framework

Das Risikomodul ist framework-agnostisch implementiert. `linkedControls[]` nimmt SoA-Control-IDs beliebiger Frameworks auf — identisch zum Lieferketten- und BCM-Modul.

### Normative Grundlagen

| Norm | Kontrolle | Inhalt |
|---|---|---|
| ISO 27001:2022 | Kap. 6.1 | Risikobeurteilung und Risikobehandlung |
| **NIS2** | **Art. 21(2)(a)** | **Konzepte für Risikoanalyse und Sicherheit — Pflichtmaßnahme** |
| **NIS2** | **Art. 21(2)(f)** | **Konzepte zur Bewertung der Wirksamkeit von Risikomanagementmaßnahmen** |
| EUCS | GOV.3 | Risikomanagement und Risikobewertung für Cloud-Dienste |
| EU AI Act | Art. 9 | Risikomanagementsystem für Hochrisiko-KI-Systeme |
| ISO 9001:2015 | Kap. 6.1 | Maßnahmen zum Umgang mit Risiken und Chancen |
| BSI IT-Grundschutz | ORP.3 u.a. | Sensibilisierung, organisatorische Maßnahmen |

### Datenmodell

```json
{
  "id": "risk_<timestamp>_<hex4>",
  "title": "",
  "description": "",
  "category": "technical|organizational|human|physical|compliance",
  "threat": "", "vulnerability": "",
  "probability": 1,   // 1–5
  "impact": 1,        // 1–5
  "score": 0,         // probability × impact (berechnet)
  "treatmentOption": "reduce|accept|transfer|avoid",
  "owner": "",
  "dueDate": "", "reviewDate": "",
  "status": "open|in_treatment|closed",
  "linkedControls": [],   // SoA-Control-IDs (beliebige Frameworks)
  "linkedPolicies": [],   // Template-IDs
  "applicableEntities": [],
  "treatmentPlans": [],
  "createdAt": "", "updatedAt": "", "createdBy": "", "deletedAt": null
}
```

### API-Endpunkte

```
GET    /risks                     – Alle Risiken (reader+)
GET    /risks/summary             – KPIs: total, critical, high, open, byCategory
GET    /risks/:id                 – Einzelrisiko
POST   /risks                     – Anlegen (contentowner+ / auditor)
PUT    /risks/:id                 – Bearbeiten (contentowner+ / auditor)
DELETE /risks/:id                 – Soft-Delete (admin)
DELETE /risks/:id/permanent       – Endgültig löschen (admin)
POST   /risks/:id/restore         – Wiederherstellen (admin)
GET    /risks/:id/treatments      – Behandlungspläne
POST   /risks/:id/treatments      – Behandlungsplan anlegen (contentowner+ / auditor)
PUT    /risks/:id/treatments/:tid – Behandlungsplan bearbeiten
DELETE /risks/:id/treatments/:tid – Behandlungsplan löschen
```

### RBAC

| Rolle | Rechte |
|---|---|
| `reader`, `editor` | Nur lesen |
| `contentowner` (CISO) | Vollzugriff (anlegen, bearbeiten, Behandlungspläne) |
| `auditor` | Wie contentowner (Rang 3) |
| `admin` | + Löschen, Papierkorb |

### UI

- **5 Tabs:** Risikoregister | Behandlungsplan | Heatmap | Kategorien | Berichte & Export
- **Inline-Formular:** Alle Felder inkl. Control-Picker (Multi-Framework) und Policy-Picker
- **Score-Visualisierung:** Wahrscheinlichkeit × Auswirkung, Farbkodierung (kritisch ≥15 / hoch 10–14)
- **Heatmap:** 5×5-Matrix mit Risikopunkten

### E-Mail-Benachrichtigung

`checkRisks()` im CISO-Digest: Risiken mit Score ≥ 15 (kritisch) und ≥ 10 (hoch). Gesteuert durch `emailNotifications.risks`.

### Seed-Daten (12 Einträge)

Realistische Demo-Risiken mit Multi-Framework-`linkedControls`:

| Risiko | Score | Frameworks |
|---|---|---|
| Ransomware | 20 | ISO · NIS2-a · NIS2-f · EUCS |
| Insider-Bedrohung | 15 | ISO · NIS2-a · EUCS |
| Phishing/CEO-Fraud | 16 | ISO · NIS2-a · BSI |
| Cloud-Ausfall AWS | 10 | ISO · NIS2-a/f · EUCS |
| Open-Source-Schwachstelle | 12 | ISO · NIS2-e · CRA |
| KI-Diskriminierung | 12 | EU AI Act · NIS2-a |
| DSGVO-Datenpanne (Cloud) | 12 | ISO · NIS2-a/f · EUCS |
| Supply-Chain-Angriff | 10 | ISO · NIS2-a/d · CRA |
| NIS2-Meldepflichtverletzung | 12 | NIS2-a · ISO |
| RZ-Ausfall Naturkatastrophe | 10 | ISO · NIS2-a · EUCS |
| Clean-Desk / Zugriffsschutz | 20 | ISO · NIS2-a · EUCS · ISO 9001 |
| Backup nicht validiert (closed) | 9 | ISO · NIS2-a · ISO 9001 |

### Relevante Dateien

| Datei | Zweck |
|---|---|
| `server/db/riskStore.js` | Store (CRUD, Summary, Treatments) |
| `server/routes/risks.js` | REST-Routen |
| `data/risks.json` | Persistenz + 12 Seed-Einträge |
| `tests/risks.test.js` | Jest-Tests |

---

## 38. Demo-Reset & Demo-Import

### Zweck

Der ISMS Builder wird als Demo-System ausgeliefert. Zwei Admin-Wartungsfunktionen ermöglichen den sauberen Übergang vom Demo- in den Produktivbetrieb und zurück.

### Demo-Reset (`POST /admin/demo-reset`)

**Ablauf:**
1. Erstellt einen vollständigen Datenexport aller Module (identisch zu GET /admin/export, aber erweitert um goals, assets, bcm, suppliers, governance, legal)
2. Leert alle Moduldaten-Dateien (templates, risks, entities, guidance, training, public-incidents, audit-log, goals, assets, bcm, suppliers, governance, gdpr/\*, legal/\*)
3. Behält unverändert: `soa.json`, `custom-lists.json`, `org-settings.json`
4. Löscht alle Benutzer außer `admin`; setzt admin-Passwort auf `adminpass`, 2FA deaktiviert
5. **Setzt `STORAGE_BACKEND=sqlite` in `.env`** (überschreibt auskommentierte oder fehlende Zeile)
6. Löscht `data/isms.db` falls vorhanden (SQLite startet beim nächsten Start sauber leer)
7. Schreibt Flag-Datei `data/.demo_reset_done` (Zeitstempel)
8. Gibt den Export-Bundle als JSON-Download zurück
9. Setzt Response-Header `X-Restart-Required: 1` wenn aktuell noch JSON-Backend aktiv ist

**RBAC:** admin only

**Verhalten nach Reset:**
- Login-Seite prüft GET `/auth/demo-reset-done` → zeigt gelben Banner mit Hinweis auf Produktivbetrieb
- Nach erstem Admin-Login: Flag-Datei wird automatisch gelöscht → Banner verschwindet

> **⚠️ Wichtig: Server-Neustart erforderlich**
>
> Der Demo-Reset schreibt `STORAGE_BACKEND=sqlite` in die `.env`, aber `dotenv` liest die Konfiguration nur beim Prozessstart ein. Der laufende Server arbeitet bis zum Neustart noch mit dem alten Backend.
>
> ```bash
> # Neustart (direkt):
> npm start
>
> # Neustart (Docker):
> docker compose restart
> ```
>
> Erst nach dem Neustart ist SQLite aktiv und alle neuen Daten werden in `data/isms.db` gespeichert.
> Die JSON-Dateien bleiben als Fallback-Backup erhalten.

**Admin-UI (Wartung-Tab):**
- **Backend-Anzeige**: Zeigt aktives Backend (JSON = orange Warnung / SQLite = grün)
- **Neustart-Banner**: Erscheint automatisch wenn `.env` bereits `sqlite` enthält, der Prozess aber noch mit `json` läuft — bleibt sichtbar bis zum Neustart

### Demo-Import (`POST /admin/demo-import`)

**Ablauf:**
1. Empfängt exportiertes JSON-Bundle (Limit: 50 MB, Content-Type: application/json)
2. Stellt alle Moduldaten aus dem Bundle wieder her (außer soa.json, custom-lists.json, org-settings.json, rbac_users.json)
3. Erstellt alice und bob mit Original-Demo-Passwörtern neu (`alicepass` / `bobpass`), 2FA deaktiviert
4. admin-Account bleibt vollständig unverändert (Passwort, 2FA, Einstellungen)
5. Löscht Flag-Datei falls vorhanden

**RBAC:** admin only

### Öffentlicher Endpunkt

| Route | Auth | Beschreibung |
|---|---|---|
| `GET /auth/demo-reset-done` | — | Gibt `{ active: true/false }` zurück (Flag-Datei vorhanden?) |

### UI (Admin-Konsole → Wartung)

| Sektion | Farbe | Bestätigung |
|---|---|---|
| Demo-Reset | Rot | Texteingabe `RESET` erforderlich |
| Demo-Import | Orange | `confirm()` Dialog, JSON-Datei-Picker |

### Relevante Dateien

| Datei | Änderung |
|---|---|
| `server/routes/admin.js` | `POST /admin/demo-reset`, `POST /admin/demo-import`, `GET /api/storage-info`, `buildFullExport()`, `FLAG_FILE` |
| `server/routes/auth.js` | `GET /auth/demo-reset-done` (public), Flag-Löschung bei Admin-Login |
| `ui/login.html` | Banner CSS + JS-Check beim Laden |
| `ui/app.js` | `triggerDemoReset()`, `triggerDemoImport()`, Wartungs-Tab HTML |

---

## 39. Bugfixes & UI-Korrekturen (V 1.28)

### Ungültige HTML-Kommentare in UI-Dateien

**Problem:** Copyright-Header wurden in `ui/login.html` und `ui/index.html` als `<\!-- ... -->` (mit Backslash) geschrieben statt als gültiges `<!-- ... -->`. Browser renderten die Zeile als sichtbaren Text auf der Login-Seite.

**Fix:** Beide Dateien auf Zeile 1 korrigiert — `<\!--` → `<!--`. Alle weiteren `.html`-Dateien geprüft, kein weiteres Vorkommen.

### Erstellen-Button für Reader/Revision ausgeblendet

**Problem:** Der Sidebar-Button „Erstellen" (`#btnNewType`, `.sidebar-create-wrap`) war für alle eingeloggten Benutzer sichtbar, obwohl reader und revision keine Templates anlegen dürfen (API-Guard: editor+).

**Fix:** In `init()` (`ui/app.js`) wird `.sidebar-create-wrap` ausgeblendet wenn `ROLE_RANK[currentRole] < ROLE_RANK['editor']`. Der API-seitige Schutz bleibt unverändert — die UI-Änderung ist rein kosmetisch/UX.
