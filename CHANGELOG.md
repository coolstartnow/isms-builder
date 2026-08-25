<!-- © 2026 Claude Hecker — ISMS Builder — AGPL-3.0 -->

# Changelog

All notable changes to ISMS Builder are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Fixed
- **Fehlendes `await` bei Knex-Store-Aufrufen brach mehrere Routen unter SQL-Backends** ([#70](https://github.com/coolstartnow/isms-builder/issues/70), gemeldet und mit vollständiger Root-Cause-Analyse sowie Fix-Vorschlag eingereicht von @ronnyolesch). Betraf jedes Nicht-`json`-Backend (SQLite, MariaDB, PostgreSQL): mehrere Route-Handler riefen async Knex-Store-Methoden ohne `await` auf und gaben das rohe `Promise`-Objekt direkt an `res.json()` weiter — die JSON-Antwort war praktisch immer `{}` statt der echten Daten. Am sichtbarsten beim Asset-Anlegen (`entities.forEach is not a function`, da `/entities` `{}` statt eines Arrays lieferte) und einer leeren Seite unter Administration → Wartung (die ebenfalls von `/entities` abhängt).

  Der gemeldete Fund betraf den Entities-Block in `server/routes/templates.js` — beim Nachsehen (auf Wunsch des Nutzers **gezielt auch alle anderen Stores und Backends geprüft**, nicht nur den gemeldeten Fall) fanden sich sieben weitere Stellen mit demselben Muster in derselben Datei (`GET /templates/tree`, `POST /templates/reorder`, `PUT /template/:type/:id/move`, `DELETE .../permanent`, `POST .../restore`, sowie Anhänge hinzufügen/entfernen) und eine in `server/routes/assessments.js` (`POST /assessments` — `supplierStore.getById()` ohne `await`, wodurch `supplierName` beim Anlegen einer Lieferanten-Selbstauskunft immer `undefined` wurde). Zusätzlich sämtliche `auditStore.append()`-Aufrufe in beiden Dateien mit `await` versehen — bisher als einzige Routendatei im Projekt inkonsistent zum Rest (Fire-and-forget ohne Fehlerbehandlung, Risiko unbehandelter Rejections und verlorener Audit-Einträge).

  Neuer Regressionstest `tests/dbBackendRoutes.test.js`, der bewusst — anders als der Rest der Suite — gegen ein echtes SQL-Backend läuft (Default: SQLite, self-contained, Teil von `npm test`; auf Wunsch auch gezielt gegen MariaDB/PostgreSQL aufrufbar wie `dbStoresIntegration.test.js`). Grund: Unter `STORAGE_BACKEND=json` sind die entsprechenden Store-Methoden synchron, der Bug ist dort unsichtbar — die reguläre Suite (die ausschließlich mit `json` läuft) hätte ihn nie gefunden. Live gegen alle drei SQL-Backends verifiziert (SQLite, MariaDB 11, PostgreSQL 17 in Docker) — jeweils grün.

## [1.37.5.2] — 2026-08-19

### Added
- **Update-Check** — Admin → Wartung hat jetzt einen Button "Nach Updates suchen", der den neuesten GitHub-Release abfragt und mit der laufenden Version vergleicht. Bewusst **nur ein Hinweis**, kein Auto-Update: Selbstgehostete Software, die selbstständig Code aus dem Internet nachzieht, ist eine der riskantesten Funktionen überhaupt (Supply-Chain-Angriffsfläche — ein kompromittierter Release würde sich sonst automatisch auf jede Installation verteilen, vgl. SolarWinds/xz-Backdoor) und widerspricht dem Betriebsmodell des Projekts ("Betrieb liegt beim Betreiber", siehe bestehende Sicherheitswarnung vor Fake-Repos in der README). Backend-neutrales Modul `server/updateCheck.js`, kein Hintergrund-Cron — die Abfrage läuft nur, wenn ein Admin sie aktiv auslöst; Ergebnis 1h serverseitig gecacht, um GitHubs unauthentifiziertes Rate-Limit zu schonen. Wirft nie (Netzwerkausfall, Rate-Limit, Timeout → sichtbarer Hinweis statt Absturz). 6 neue Tests (`tests/updateCheck.test.js`), Netzwerk gemockt.

- **Versionsanzeige** — nirgends im UI stand bisher, welche Version läuft. Neuer, ungeschützter `GET /api/version`-Endpoint liefert die `package.json`-Version; angezeigt im Sidebar-Footer der Hauptanwendung und im Footer der Login-Seite, direkt neben dem bestehenden Lizenzhinweis. Dabei aufgefallen: `package.json` stand noch auf `1.37.5`, obwohl der zuletzt getaggte Stand `1.37.5.1` war (GDPR-Scrollfix, #67) — mit `scripts/bump-version.sh` korrigiert.

  **Nebenbefund beim Version-Bump, jetzt behoben:** `scripts/bump-version.sh` hatte einen Regex-Bug in seinem README.md-Schritt — `s/V 1\.[0-9][0-9]*/V ${NEW_VERSION}/g` matchte nicht nur die aktuelle Versionszeile, sondern jede „V 1.NN"-Erwähnung im Dokument, inklusive der historischen Versionsangaben in der Roadmap-Tabelle, und korrumpierte sie (z.B. „V 1.37.2.0" → „V 1.37.5.1.2.0"). Ein erster Fix (exaktes Matchen der Vorversion statt fuzzy) traf beim nächsten Bump immer noch fälschlich die Roadmap-Zeile des zuletzt fertiggestellten Punkts, weil deren Versionsangabe zufällig gleich der alten Gesamtversion war. Endgültiger Fix: das Script fasst jetzt ausschließlich Zeile 1 (die Copyright-Kopfzeile) an — die Roadmap-Tabelle ist Historie und bleibt davon grundsätzlich unberührt. Zusätzlicher Nebenbefund, weiterhin offen: die Copyright-Header in den Quelldateien selbst (`// ISMS Builder V 1.29 …`) sind seit Version 1.29 eingefroren — der entsprechende Script-Schritt sucht nach der exakten Vorversion und griff seitdem nie wieder; nicht behoben, da außerhalb des Anlasses und ein größerer separater Aufräumschritt. Gegen ein erneutes Auseinanderlaufen von Tag und `package.json` schützt jetzt zusätzlich ein neuer Schritt in `.github/workflows/release.yml`: schlägt fehl, wenn beim Push eines `v*`-Tags dessen Version nicht mit `package.json` übereinstimmt.

- **Lieferanten-Schnelltriage — PII, ISO 27001 und SOC 2** ([#63](https://github.com/coolstartnow/isms-builder/issues/63), Design gemeinsam mit @jasc76 entwickelt). Drei neue Achsen am Lieferanten (personenbezogene Daten, SOC-2-Status, ISO-27001-Status), aus denen sich per Maximum-Prinzip automatisch eine Triage-Stufe (`low`/`medium`/`high`/`unassessed`) ergibt — nach demselben Muster wie die BSI-Maximum-Vererbung bei Asset-Schutzzielen (`assetProtection.js`, #29): der Wert wird nie gespeichert, sondern bei jedem Lesen aus den drei Rohantworten neu berechnet, damit ein geänderter Input sofort wirkt und kein veralteter Wert persistieren kann.

  Wichtiges Detail aus der Abstimmung mit @jasc76: Ein SOC-2-Bericht, der für diese Art von Lieferant **nicht anwendbar** ist, zählt als `low`, nicht als unbewertet — Abwesenheit einer Anforderung ist kein Mangel. Fehlt dagegen eine Achse komplett, ist das Ergebnis `unassessed`, nicht `low` — Abwesenheit von Information ist kein gutes Ergebnis. Die berechnete Triage-Stufe ist eine Indikation und ersetzt nicht den bestehenden manuellen Risiko-Score, der weiterhin das finale Urteil bleibt; beide werden nebeneinander angezeigt.

  Neue Tabellen-Spalte, Filter (`GET /suppliers?triage=high`) und Zähler in der Zusammenfassung (`byTriageLevel`, `triageUnassessed`). Unbekannte Enum-Werte werden mit HTTP 400 abgelehnt statt gespeichert. Backend-neutrales Modul `server/db/supplierTriage.js`, von JSON- und Knex-Backend gemeinsam genutzt (bei Knex im bereits vorhandenen `data`-JSON-Feld, keine Schema-Migration nötig). 12 neue Tests (`tests/suppliers.test.js`), inkl. Maximum-Prinzip, SOC2-„N/A"-Sonderfall und Validierung; live im Browser gegen die Demo-Daten verifiziert.

- **ownCloud/Nextcloud-Integration — freigegebene Richtlinien automatisch als PDF publizieren** ([#66](https://github.com/coolstartnow/isms-builder/issues/66)). Bei jeder Freigabe eines Templates wird automatisch ein serverseitig gerendertes PDF per WebDAV in einen konfigurierbaren Nextcloud/ownCloud-Ordner hochgeladen; zusätzlich ein manueller Re-Sync-Button im Template-Editor und ein Verbindungstest in der Admin-Oberfläche.

  Vorarbeit ergab eine Lücke im Projekt: serverseitige PDF-Erzeugung gab es bisher nirgends — sämtliche PDF-Exporte (`_printTemplates`, Reports, Findings, Guidance) liefen ausschließlich im Browser über `window.print()`. Für den WebDAV-Upload braucht es aber echte PDF-Bytes auf dem Server. Bewusst **kein** Puppeteer/Chromium dafür (hätte ~300 MB Chromium ins Produktiv-Image gezogen, nur um HTML zu drucken) — stattdessen `pdfkit` (reines JS, keine native Kompilierung) plus der ohnehin im Projekt vendorte `ui/vendor/marked.min.js`, per `require()` serverseitig wiederverwendet statt einer zweiten neuen Markdown-Abhängigkeit. Ein zusätzlich gebauter HTML-Export wurde nach Live-Test wieder verworfen: Nextcloud zeigt HTML-Dateien im Browser nur als Rohtext an (kein Viewer dafür) — totes Gewicht.

  WebDAV-Client (`server/webdav.js`) nutzt Node's eingebautes `fetch` mit Basic Auth für PUT/MKCOL/PROPFIND/PROPPATCH — kein SDK, keine neue Abhängigkeit. Zwei optionale, rein additive Sichtbarkeits-Extras (per `.env` schaltbar, Default aus): `WEBDAV_MARK_FAVORITE` markiert den Zielordner per WebDAV-Property als Favorit (taucht bei Nutzern mit Zugriff unter Dateien > Favoriten weiter oben auf), `WEBDAV_CREATE_SHARE_LINK` legt über die OCS-Share-API einen öffentlichen Lesezugriffs-Link an, sichtbar im Template-Editor. Beide schlagen sie fehl, beeinflusst das den eigentlichen PDF-Upload nicht.

  Durchgehendes Designprinzip aus der Issue-Spezifikation: Ausfall des Remote-Systems darf nie zum ISMS-Problem werden — `publishDocument()` wirft nie, liefert immer `{ok, error}`. Die Freigabe eines Templates bleibt in jedem Fall gültig, auch wenn Nextcloud gerade nicht erreichbar ist; der Fehler landet sichtbar im neuen `webdav_publish`-Feld (JSON- und Knex-Backend) und lässt sich per Re-Sync erneut versuchen, ohne den Freigabezyklus zu wiederholen.

  App-Passwort statt Hauptkonto-Passwort für die Nextcloud-Anmeldedaten ist in der Admin-Oberfläche als Pflicht-Empfehlung mit Begründung hinterlegt (einzeln widerrufbar, begrenzt Schaden bei Kompromittierung). 18 neue Tests gegen einen In-Process-Stub-WebDAV-Server (`tests/webdav.test.js`); zusätzlich live gegen einen echten NextcloudPi-Container verifiziert — Verbindungstest, Auto-Publish bei Freigabe, PDF-Validität (`qpdf --check`/`pdfinfo`/`pdftotext`), manueller Re-Sync, Favoriten-Markierung und öffentlicher Share-Link jeweils am echten Server bestätigt.

## [1.37.5.1] — 2026-08-17

### Fixed
- **GDPR-Modul: Seiten ließen sich nicht bis zum Ende scrollen** ([#67](https://github.com/coolstartnow/isms-builder/issues/67), gemeldet von @VistaMaster). Betraf alle acht GDPR-Tabs (VVT, AV, DSFA, Datenpannen, Betroffenenrechte, TOMs, Löschprotokoll, DSB) — bei Inhalt, der die Fensterhöhe überstieg, war der Save-Button unerreichbar, nur durch Herauszoomen sichtbar. Ursache: `.gdpr-fullpage`/`.gdpr-content` bildeten anders als alle anderen Module (Risk, Admin, Calendar, Incident, Training) keine eigene Scroll-Region — der äußere `#gdprContainer` hat `overflow: hidden`, aber kein Nachfahre hat das mit `flex: 1; overflow-y: auto` aufgefangen, Inhalt lief einfach über den harten Rand hinaus. `.gdpr-fullpage` bekommt jetzt `height: 100%; overflow: hidden`, `.gdpr-content` `flex: 1; overflow-y: auto` — exakt das Muster, das die anderen Module bereits nutzen. Live verifiziert: Bug reproduziert (Save-Button 850px unterhalb des sichtbaren Bereichs, `overflow-y: visible`, nicht scrollbar) und nach dem Fix aufgelöst (Button nach Scrollen vollständig sichtbar).

## [1.37.5] — 2026-08-16

### Fixed
- **`X-Forwarded-*`-Header waren ungeprüft vertrauenswürdig — Host-Header-Injection und fälschbare Audit-IP.** Bei der Prüfung, ob die App mit segmentierten Unternehmensnetzen (DMZ/DB-Netz/Server-Netz, ggf. mit intern genutzten offiziellen IP-Bereichen) zurechtkommt, stellte sich heraus: Die DB-Anbindung selbst ist unkritisch (reines TCP über `DB_HOST:DB_PORT`, keine IP-Range-Annahmen im Code), aber zwei Stellen lasen `X-Forwarded-For`/`-Host`/`-Proto` direkt und ungeprüft — ein Client konnte diese Header selbst mitschicken, unabhängig davon, ob überhaupt ein Reverse-Proxy davorstand:
  - `ackPublic.js`: die im Audit-Trail einer Richtlinien-Bestätigung gespeicherte IP-Adresse war fälschbar.
  - `acknowledgements.js`s `buildTokenUrl`: der Link in Bestätigungs-Mails an Mitarbeitende konnte per `X-Forwarded-Host` auf eine beliebige fremde Domain umgeleitet werden — nachweislich reproduziert (`https://evil.example.com/ack/...` landete tatsächlich im E-Mail-HTML).

  Fix: Express' `trust proxy` ist jetzt **standardmäßig aus** — `req.ip`/`req.protocol`/`req.hostname` spiegeln dann immer die tatsächliche TCP-Verbindung, kein Client kann sie fälschen. Wer die App bewusst hinter einem Reverse-Proxy betreibt (typisch bei Netzsegmentierung), aktiviert das explizit über `TRUST_PROXY` (Anzahl Hops). Zusätzlich optionales `PUBLIC_URL` als zuverlässigere Alternative, wenn der extern sichtbare Host vom intern gesehenen abweicht. Vier neue Regressionstests in `tests/trustProxy.test.js` (beweislich: 3 von 4 schlagen ohne den Fix fehl, inkl. der reproduzierten Domain-Umleitung).

  Übrige Aspekte der Netzsegmentierungs-Frage (Unternehmensnetze mit getrennten Segmenten für DMZ/Anwendung/Datenbank, teils noch mit intern genutzten offiziellen IP-Bereichen aus der Zeit vor RFC 1918): DB-Verbindung über Segmentgrenzen/Firewalls hinweg — unkritisch, reines TCP, keine Range-Annahmen im Code. Legacy-Segmente mit offiziellen IP-Bereichen intern — ebenso unkritisch, TCP/IP unterscheidet nicht zwischen privatem und öffentlichem Adressraum. Verschlüsselung über Segmentgrenzen — vorgesehen (`DB_SSL=true`). Tatsächliches Routing über mehrere Segmente/Firewalls hinweg — nicht getestet (bisher nur ein flaches Netz, Docker-Compose-Standard-Bridge); das ist Infrastruktur-/Firewall-Konfiguration, keine Anwendungsfrage, daraus folgt kein weiterer Code-Änderungsbedarf.
- **#42 — Absturz beim Start unter `STORAGE_BACKEND=sqlite/mariadb/pg` behoben.** Zwei Ursachen in `server/index.js`: (1) `runAutopurge()` rief die async `getDeleted()`-Methoden der Knex-Stores synchron auf und machte sofort `.filter()` auf das zurückgegebene Promise — daher die geloggten `.filter is not a function`-Fehler für jede Entität. (2) Die eigentliche Race: jeder Knex-Store startet seine Schema-Initialisierung fire-and-forget (`_knex.init().catch()`), ohne dass die Startsequenz je darauf wartet. Autopurge und die sechs Guidance-Seeds liefen bisher unbedingt bei jedem Modul-Import — traf eine Query `CREATE TABLE` zuvor, stirbt der Prozess mit einer unbehandelten Rejection (`SqliteError: no such table: templates`), zeitabhängig und daher inkonsistent zwischen Umgebungen (Docker vs. lokal).

  Fix: einzige `bootstrap()`-Schranke vor jedem DB-Zugriff — `await knexDatabase.init()` (No-Op unter `json`), dann `await runAutopurge()` (jetzt async, jeder `getDeleted()`-Aufruf abgewartet), dann die Seeds. Läuft nur noch unter `require.main === module`, nicht mehr bei einem bloßen `require()` — `module.exports = app` bleibt synchron, Tests funktionieren unverändert; ein Test kann `app.bootstrap()` gezielt selbst aufrufen.

  `knexDatabase.js` respektiert jetzt `DATA_DIR` für den SQLite-Dateipfad (vorher hart auf `<repo>/data/isms.db` verdrahtet) — nötig für isolierte Tests, sonst hätte ein SQLite-Testlauf die echte Projekt-Datenbank berührt.

  Neuer Test `tests/dbBootstrapSqlite.test.js` (4 Tests, erste SQL-CI überhaupt): beweist nach `bootstrap()` (a) alle zentralen Tabellen existieren, (b) `getDeleted()` jedes Stores liefert ein Array statt einer rejected Promise, (c) kein `unhandledRejection` während des Starts, und (d) mehrere parallele `init()`-Aufrufe auf derselben DB-Datei (simuliert Pod-Neustart/Rolling-Update mitten in der Init-Phase) stürzen nicht ab — letzteres auf Wunsch von Muhammad Asadullah Zahid, der den Fix in seiner eigenen Kubernetes/PostgreSQL-Umgebung validieren wird. Eigener CI-Job `test-sqlite` in `ci.yml` (nicht Teil der Node-Version-Matrix, da jede bestehende Testdatei `STORAGE_BACKEND=json` selbst setzt und einen Matrix-Wert überschreiben würde).

  PostgreSQL/MariaDB nicht Teil der automatisierten CI-Matrix (die validieren pg/MariaDB in ihrer eigenen Umgebung) — aber lokal vor dem Commit einmal vollständig gegen alle drei SQL-Backends verifiziert, siehe unten. Die projektweite Standardempfehlung bleibt vorerst bei `json` (siehe #42-Diskussion); ob `sqlite` wieder empfohlen wird, ist eine separate Entscheidung.

- **Vollständige Tabellen-/Store-Verifikation gegen alle drei SQL-Backends.** Auf Nachfrage nochmals nachgeprüft, ob wirklich jede der 23 in `knexDatabase.js` definierten Tabellen inklusive aller Spalten vorhanden ist und jeder der 20 Knex-Stores tatsächlich schreiben und lesen kann — eine reine `hasTable()`-Prüfung deckt Spalten-/Typ-Fehler nicht auf. Neuer Test `tests/dbStoresIntegration.test.js` (21 Tests): prüft alle 23 Tabellen mit vollständiger Spaltenliste, dann für jeden autopurge-relevanten Store (Risks, Goals, Guidance, Training, Legal ×3, GDPR ×6, Public Incidents, Suppliers, Findings, Templates) eine echte Runde create → find → soft-delete → getDeleted → permanentDelete, für die restlichen Stores (Assets, Entities, SoA, BCM, Governance, Org-Units, Org-Settings, Custom-Lists, Ack, Audit-Log) einen Rauchtest. Läuft standardmäßig gegen SQLite und ist damit Teil von `npm test` (468 statt 447 Tests); für MariaDB/PostgreSQL gezielt mit `DB_STORES_TEST_BACKEND=mariadb|pg` aufrufbar.

  Lokal einmal alle drei Backends komplett durchgespielt: `tests/dbStoresIntegration.test.js` (21/21) gegen SQLite, gegen MariaDB 11 (Docker) und gegen PostgreSQL 17 (Docker) — jeweils grün, inklusive des Postgres-spezifischen `CURRVAL`-Zweigs in `auditStore.append()`, der unter SQLite/MariaDB nie durchlaufen wird. Zusätzlich den echten Server (`node server/index.js`) je einmal gegen MariaDB und PostgreSQL gestartet und eingeloggt — bootet sauber, kein Crash, keine unbehandelte Rejection.

  **Nebenbefund, nicht behoben:** Die Tabelle `rbac_users` ist im Schema korrekt definiert, wird aber von keinem aktiven Code-Pfad benutzt — `server/rbacStore.js` speichert Benutzer/Rollen unabhängig von `STORAGE_BACKEND` immer in `rbac_users.json`. Unter `sqlite`/`mariadb`/`pg` bleibt die Tabelle dauerhaft leer; das ist kein Regressionsrisiko (kein Code liest oder schreibt sie), aber eine Lücke in der SQL-Umstellung — Benutzerverwaltung auf SQL zu heben ist ein eigenes, hier nicht angefasstes Vorhaben.

  Native Build von `better-sqlite3` musste dafür freigegeben werden (`npm install-scripts approve better-sqlite3`, mit Zustimmung) — `allowScripts`-Eintrag in `package.json`, wirkt identisch in CI (`npm ci`).

- **Zusätzlich den vollen Docker-Weg getestet und dabei einen echten Fehler in der Guidance-Seed-Logik gefunden und behoben.** Auf Hinweis, dass "App im Container + DB im Container" (die eigentliche Zielumgebung, s. `docker-compose.yml`) noch gar nicht geprüft war — bisherige Tests liefen alle mit der App auf dem Host gegen einen auf `localhost` exponierten DB-Container. Jetzt zusätzlich: `isms-builder`-Image gebaut (`better-sqlite3` zieht dabei `prebuild-install` — kein Compiler im Alpine-Image nötig) und im selben Docker-Netzwerk wie MariaDB- und PostgreSQL-Container betrieben (Container-zu-Container-DNS statt `localhost`), inkl. SQLite mit Bind-Mount wie in `docker-compose.yml`. Alle drei booten sauber, Healthcheck grün, Login funktioniert.

  Dabei mit `NODE_OPTIONS=--trace-deprecation` eine echte `DeprecationWarning: Passing invalid argument types to fs.existsSync` in `_knexSeedArchitectureDocs()` (`server/db/guidanceStore.js`) aufgefallen: die Funktion las nur `entry.srcFile`, nicht `entry.srcFiles` ({de,en,fr,nl} — u.a. bei allen elf Modul-Guides und dem Templates-Nutzung-Leitfaden). `fs.existsSync(undefined)` scheiterte still (nur eine Warnung, kein Fehler), die betroffenen Guidance-Dokumente wurden unter jedem SQL-Backend nie angelegt — die bereits existierende JSON-Variante (`seedArchitectureDocs`) löst `srcFiles` dagegen korrekt auf. Jetzt an die JSON-Variante angeglichen. Regressionstest in `tests/dbBootstrapSqlite.test.js` ergänzt (beweislich: schlägt ohne den Fix fehl, mit Fix grün).

  **Einschränkung beim Docker-Test entdeckt und im Anschluss ebenfalls behoben** (siehe eigener Eintrag unten): Im Runtime-Image fehlten `docs/`, `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md` und `THIRD-PARTY-LICENSES.md` vollständig — die Guidance-Seed-Dokumente blieben im Docker-Image daher unabhängig vom Backend leer.

- **Fehlende Guidance-Dokumentation im Docker-Image nachgezogen.** Die Begründung für den bisherigen Komplettausschluss von `docs/` aus dem Image ("schlankes Image") hielt einer genaueren Prüfung nicht stand: `docs/` ist zwar 45 MB groß, aber 41 MB davon sind `docs/private/` (gitignored, nie im Repo) und weitere ~2,5 MB `docs/community/` (interne Marketing-/Planungsnotizen) sowie `docs/screenshots/` — beides ohnehin nicht zum Ausliefern gedacht. Die tatsächlich von den Guidance-Seeds benötigten Dateien (`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `THIRD-PARTY-LICENSES.md`, `docs/architecture/`, alle `docs/module-*.md`/`docs/template-*.md`) wiegen zusammen unter 1 MB — verschwindend gegenüber den 177 MB `node_modules`, die ohnehin im Image liegen. Der Ausschluss stammte erkennbar aus dem allerersten Scaffolding-Commit, nicht aus einer bewussten Größenabwägung.

  `.dockerignore` jetzt gezielt statt pauschal: `docs/private`, `docs/community`, `docs/screenshots`, `docs/presentation` und die Banner-PNG bleiben außen vor, der Rest von `docs/` sowie die vier Root-Markdown-Dateien werden kopiert. Image-Größe dadurch nur um 2 MB gewachsen (445 MB → 447 MB). End-to-End verifiziert: alle 25 Guidance-Seed-Dokumente (vorher nur 2) erscheinen jetzt korrekt im laufenden Container, in beiden betroffenen Kategorien (`systemhandbuch`, `admin-intern`).

### Added
- **Optionale MariaDB-/PostgreSQL-Services in `docker-compose.yml`** — "App im Container + DB im Container" war zuvor nur über manuelle `docker run`-Befehle möglich, jetzt Teil der Compose-Konfiguration. Zwei neue Services (`mariadb`, `postgres`), beide über Compose-Profile inaktiv im Standardfall (`docker compose up` startet weiterhin nur `isms` mit `STORAGE_BACKEND=json`, unverändertes Verhalten). Aktivierung: `docker compose --env-file .env.docker --profile mariadb up -d` (bzw. `--profile postgres`); `--env-file .env.docker` ist nötig, damit Compose seine eigenen `${DB_USER}`/`${DB_PASS}`/`${DB_NAME}`-Platzhalter aus derselben Datei liest wie die App selbst, statt aus einer separaten `.env`. `DB_PASS` hat bewusst **keinen** Default (`${DB_PASS:?...}`) — Compose bricht ohne gesetztes Passwort mit klarer Fehlermeldung ab, kein unsicherer Default in einem Security-Tool. Persistente Volumes (`mariadb_data`, `postgres_data`). `isms` hat bewusst **kein** `depends_on` auf die DB-Services — das würde den profil-losen Standardstart brechen (Compose verweigert dann den Start); stattdessen greift bei einer noch nicht bereiten DB der `bootstrap()`-Fix aus #42 mit einer sauberen Fehlermeldung statt eines Crashs, und `restart: unless-stopped` versucht es erneut, bis die DB bereit ist — bewusst derselbe Mechanismus wie bei einem Pod-Neustart in Kubernetes. `.env.docker` um einen Beispielblock ergänzt.

  Vollständig End-to-End über `docker compose` (nicht nur `docker run`) gegen frische MariaDB- und PostgreSQL-Volumes verifiziert, inkl. des Restart-bis-DB-bereit-Verhaltens live beobachtet (erster Start schlug bei frischem Postgres-Volume mit `ECONNREFUSED` fehl, sauberer Fehler statt Crash, automatischer Neustart, zweiter Start erfolgreich, Login funktioniert).

  **Lehrreicher Fehltritt beim Testen:** ein erster Verifikationslauf verwendete versehentlich den echten, im Repo eingecheckten Bind-Mount (`./data:/app/data`) statt eines isolierten Testverzeichnisses — Autopurge löschte dabei ein Template und `guidance.json` wurde neu geschrieben. Sofort bemerkt (`git status` nach dem Testlauf), Dateibesitz vom Container-User zurückgesetzt und beide Dateien per `git checkout` wiederhergestellt; `git status` danach sauber bis auf die beabsichtigten Änderungen.

## [1.37.3] — 2026-08-12

### Fixed
- **Doppelt definierte i18n-Schlüssel bereinigt.** `translations.js` enthielt 7 Schlüssel mit je zwei Definitionen (JS-Objektliteral: die zweite gewinnt stillschweigend). Bei `inc_reporterEmail`, `inc_cisoDecision`, `inc_setStatus`, `inc_assignTo`, `inc_cisoNotes` und `inc_saveDecision` (Incidents-Modul) waren beide Definitionen inhaltsgleich bis auf kleinere Wortlaut-Unterschiede — verwaiste erste Definition entfernt, keine Verhaltensänderung. Bei `search_noResultsFor` handelte es sich dagegen um eine echte Namenskollision zwischen zwei unabhängigen Funktionen mit unterschiedlicher Signatur (einmal ohne Parameter für die globale Suche, einmal mit `{query}`-Platzhalter für die Guidance-Volltextsuche) — dadurch zeigte die globale Suche bei keinem Treffer einen buchstäblichen, nicht ersetzten `{query}`-Platzhalter an. Die Guidance-Variante wurde in `guidance_searchNoResults` umbenannt, wodurch beide Aufrufstellen jetzt korrekt funktionieren.

### Changed
- **i18n-Nachzug, Teil 13 (Abschluss): Lieferanten-Selbstauskunft — Review & Assessment-Erstellung.** `openAssessmentReview`, `openAssessmentDetail`, `openCreateAssessment` und die Link-generiert-Ansicht (inkl. `copyAssessmentLink`) waren durchgehend fest verdrahtet — teils Englisch, teils Deutsch, unabhängig von der Spracheinstellung. Rund 15 neue Schlüssel, Rest wiederverwendet (`ui_back`, `ui_cancel`, `col_title`, `col_status`, `ui_score`, `sup_stat*`, `sup_copyLink`). Nebenbei gefunden: die Antwortdarstellung für Ja/Nein-Fragen ("✓ Ja" / "✗ Nein") in `_assessmentAnswersTable` war fest auf Deutsch verdrahtet, unabhängig von der Sprache — jetzt über `yes`/`no` übersetzt. Damit ist die ursprüngliche i18n-Nachzug-Liste (~300 hartcodierte Strings in `ui/app.js`) vollständig abgearbeitet, 13 Module in 13 Commits.
- **i18n-Nachzug, Teil 12: Guidance & Dokumentation.** Übersicht (Header, Suche, Kategorie-Tabs, Dokumentenliste), Dokumenten-Viewer, Editor-Formular und Upload-Formular waren durchgehend fest verdrahtet — teils Deutsch, teils Englisch, unabhängig von der Spracheinstellung (Seitentitel, Kategorienamen und Suchfeld-Platzhalter waren Deutsch; Formular-Labels, Buttons und Leerzustände waren Englisch). Rund 25 neue Schlüssel. Kategorienamen (`GUIDANCE_CATS`) nach dem Getter-Muster umgestellt.
- **Korrektur:** `role_admin` NL-Übersetzung von "Systeembeheerder" auf "Beheerder" vereinfacht (Nutzerkorrektur).
- **i18n-Nachzug, Teil 11: NIS2 (Art. 21-Checkliste & Art. 23-Meldefristen).** Governance-Checkliste (Tabelle, Filter, Formular) und Meldefristen-Tracking (Übersicht, Vorfall-Formular mit Phasen) waren für FR/NL durchgehend englisch. 7 neue Schlüssel, Rest wiederverwendet (`ui_back`, `ui_cancel`, `ui_save`, `ui_priority`, `col_title`, `col_status`, `ui_searchPh`). Nebenbei gefunden: eine mitten im Text eingebettete deutsche Restzeit-Angabe ("noch X h") war unabhängig von der Sprache fest verdrahtet — jetzt als Parameter-Schlüssel `nis2_hoursLeft`. Beim Durchsuchen des Umfelds zwei weitere Fremdfunde aus bereits abgeschlossenen Modulen mitgenommen: das Governance-Modul (Teil 3) hatte noch ein rohes `Error: ...` in `switchGovTab` und ein hartcodiertes "All sources" im Aktionen-Quellenfilter; beide jetzt ebenfalls übersetzt.
- **i18n-Nachzug, Teil 10: Training & modulübergreifender Links-Picker.** Schulungsübersicht (KPI-Karten, Fälligkeitsanzeige), Schulungsplan (Tabelle, "Neue Schulung"-Button) und das komplette Schulungsformular waren für FR/NL durchgehend englisch. Rund 20 neue Schlüssel. Nebenbei gefunden — **größerer Fund:** `renderLinksBlock`, der SoA-Controls/Policies-Verknüpfungs-Picker, der in praktisch jedem Formular quer durchs ganze Tool eingebunden ist (Training, Governance, Legal, GDPR, Risk, BCM, Findings u.a.), war komplett fest verdrahtet (Mix aus Deutsch und Englisch: "Links", "SoA-Controls", "Suche…", "Policies / Templates", "Double-click to add") — unabhängig von der Spracheinstellung, in allen bereits abgeschlossenen Modulen ebenso betroffen. Jetzt über 6 neue `link_*`-Schlüssel übersetzt; wirkt rückwirkend auf alle Formulare, die diesen Picker einbinden. Außerdem `training_noEvidence`-Nachbarbug behoben: der Platzhaltertext "Kein Nachweis hinterlegt." in der Nachweise-Ansicht war unabhängig von der Sprache fest auf Deutsch verdrahtet.
- **i18n-Nachzug, Teil 9: Berichte.** Die Berichtsergebnis-Renderer (`renderReportResult`) für alle neun Berichtstypen (Compliance, Framework-Abdeckung, Gap-Analyse, Template-Übersicht, Fällige Reviews, Compliance-Matrix, Audit-Trail, Audit-Feststellungen, Risikoregister) waren für FR/NL durchgehend englisch — Tabellenköpfe, KPI-Labels und Statuswerte, die direkt aus Rohdaten gerendert wurden statt über `t()`. Rund 7 neue Schlüssel, der Rest wiederverwendet (`riskl_*`, `status_draft/review/approved/archived`, `findings_*`, `reports_days`, `ui_score`, `soa_notApplicable`). Nebenbei gefunden: `FINDING_SEVERITY_LABELS`, `FINDING_STATUS_LABELS` und `FINDING_ACT_STATUS_LABELS` waren als einfache Konstanten mit `t()`-Werten zur Ladezeit eingefroren statt live nachzuziehen — nach dem Getter-Muster (RISK_STATUSES) umgestellt, betrifft auch die Feststellungs-Badges außerhalb der Berichte. Außerdem eine Variablenverschattung behoben: `reviewRow`s Parameter hieß `t` und überschattete die globale `t()`-Funktion — umbenannt zu `row`.
- **i18n-Nachzug, Teil 8: Admin & Organisation.** Organisationseinstellungen-Tab (IT-Organisationseinheiten-Tabelle), OE-Formular und Benutzer-Formular (Rollen- und Funktionsdropdowns, Passwort-Platzhalter) waren für FR/NL durchgehend englisch. Rund 20 neue Schlüssel in DE/EN/FR/NL. Nebenbei gefunden: `ROLES_LIST` und `FUNCTIONS_LIST` (die acht RBAC-Rollen- bzw. sieben Organisationsfunktions-Beschreibungen, u.a. im Benutzer-Formular und in den Funktions-Badges der Benutzertabelle) sowie die OE-Typbezeichnungen (CIO/Group/Local/External) waren fest auf Englisch verdrahtet, unabhängig von der Spracheinstellung; Rollen-/Funktionslisten jetzt über Getter wie die übrigen modul-übergreifenden Konstanten.
- **i18n-Nachzug, Teil 7: Risiko & Behandlung.** Übersichtsseite, Risikoregister, Kalender, Berichte, Detailansicht, Risiko-Formular und Maßnahmen-Modal waren für FR/NL durchgehend englisch — sieben Funktionen. Rund 45 neue Schlüssel in DE/EN/FR/NL. Nebenbei gefunden: `RISK_STATUSES` (Open/In Treatment/Accepted/Closed, der Status des Risikos selbst — nicht der Maßnahme) war fest auf Englisch verdrahtet, unabhängig von der Spracheinstellung; jetzt über Getter wie die übrigen Risiko-Konstanten. Die „Verknüpfte Policies"-Überschrift in der Detailansicht war ebenso sprachunabhängig fest auf Deutsch verdrahtet.
- **i18n-Nachzug, Teil 6: BCM (Notfallmanagement).** BIA-Formular und -Register, Notfallpläne (inkl. „Überfällig"-Hinweis) und Übungen/Tests waren für FR/NL durchgehend englisch — sechs Funktionen insgesamt. Rund 60 neue Schlüssel in DE/EN/FR/NL, wiederverwendet u.a. `assets_criticality`, `col_status`, `col_title`, `col_type`, `ui_actions`, `ui_date`, `ui_entity`, `ui_cancel`, `ui_save`, `ui_docsAttachments`.
- **i18n-Nachzug, Teil 5: Assets & Lieferanten.** Das Asset-Formular sowie alle vier Listenansichten (Übersicht, nach Kategorie, nach Klasse, Abhängigkeitsgraph) und die beiden Lieferanten-Bildschirme (Formular, Selbstauskünfte) waren für FR/NL durchgehend englisch — deutlich größer als ursprünglich angenommen, da neben dem Formular fünf weitere Funktionen betroffen waren. Rund 70 neue Schlüssel in DE/EN/FR/NL, mehrere davon wiederverwendet (`assets_classification`, `assets_criticality`, `ui_notes`, `ui_cancel`, `ui_save`, `col_type`, `col_status`). Der Lieferanten-Statusbadge „Link kopieren" war zuvor unabhängig von der gewählten Sprache fest auf Deutsch verdrahtet — jetzt ebenfalls über `t()`.
- **i18n-Nachzug, Teil 4: GDPR-Modul (VVT, AV, DSFA, Datenpannen, DSAR, TOMs, Löschprotokoll, DSB).** Das gesamte GDPR-Modul war für FR/NL durchgehend englisch — Tab-Leiste, alle sieben Formulare/Listenansichten, sowie 12 Dropdown-Konstanten (Rechtsgrundlagen, Statuswerte, Vorfallstypen, DSAR-Typen, TOM-Kategorien, Art.-28-Checkliste). Rund 170 neue Schlüssel in DE/EN/FR/NL, größtes Einzelmodul bisher. Die 12 Konstanten wurden nach dem Getter-Muster umgestellt (siehe Governance-Commit) und nutzen bewusst vorhandene generische Schlüssel (`legl_stDraft`, `govl_statApproved`, `riskl_*` u.a.) statt Duplikate.
- **i18n-Nachzug, Teil 3: Governance-Formulare.** Management-Review, Maßnahmen und Sitzungsprotokolle (`openGovReviewForm`, `openGovActionForm`, `openGovMeetingForm`) waren für FR/NL durchgehend englisch. Jetzt übersetzt — 47 neue Schlüssel in DE/EN/FR/NL, ein guter Teil generisch und modulübergreifend wiederverwendbar (`ui_basicData`, `ui_notes`, `ui_owner`, `ui_dueDate`, `ui_participants`, `ui_docsAttachments` u.a.).
- **i18n-Nachzug, Teil 2: Legal-Formulare.** Die drei Legal-Formulare (Vertrag, NDA, Datenschutzrichtlinie) waren für FR/NL durchgehend englisch. Jetzt übersetzt — 28 neue Schlüssel in DE/EN/FR/NL, mehrere davon modulübergreifend wiederverwendet (`col_title`, `col_type`, `col_status`, `ui_cancel`, `ui_attachments`, `ui_ownerResp`, `ui_internalNotes`).
- **i18n-Nachzug, Teil 1: Einstellungen-Bildschirm.** Der komplette Einstellungen-Bereich (persönliche Einstellungen, Passwort/2FA, CISO-, Datenschutz-, ICS/OT-, Revisions- und QM-Einstellungen, KRITIS-Sektoren, Vorlagenverwaltung, AI-Statuszeile) trug seine Anzeigetexte fest in Englisch verdrahtet und war für FR/NL durchgehend englisch. Jetzt über `t()` gefüllt — rund 80 neue Schlüssel in DE/EN/FR/NL. Erfasst wurden neben `>Text<` auch `placeholder=`, `<h4>`-Überschriften und die dynamisch per `innerHTML` gesetzten Status-Badges.
- **Severity-Wörter (Low/Medium/High/Critical) bleiben in DE und NL englisch** — nur FR wird übersetzt. Bewusste Terminologie-Entscheidung; betrifft alle fünf Schlüsselfamilien (Governance, BCM, Lieferanten, Risk, Assets).

### Added
- **Leseansicht und PDF-Ausgabe für Richtlinien** — schließt [#61](https://github.com/coolstartnow/isms-builder/issues/61), gemeldet von @jasc76. Wer nicht bearbeiten darf, sah bisher dasselbe Autoren-Eingabefeld wie ein Redakteur — also rohen Markdown-Quelltext in einer 240px-Textarea. Jetzt bekommt jede Rolle unterhalb `editor` das **gerenderte Dokument**; Bearbeiter können per Knopf zwischen Bearbeiten und Vorschau umschalten.
- **PDF je Dokument** und **Sammelexport nach Typ und Status** aus dem Listen-Panel, mit generiertem Dateinamen `Titel_vVERSION_STATUS_JJJJ-MM-TT` — genau die Übergabe an ein HR-/Verteilsystem, die @jasc76 beschrieben hat. Aufbau wie der bestehende Guidance-Druck: eigenes Fenster, Druckdialog, keine neue Abhängigkeit. **Kein Word** — das bräuchte eine zusätzliche Abhängigkeit; es bleibt bei PDF.
- `tests/templateReadView.test.js` (20 Tests).

### Fixed
- **Die Bestätigungsseite (`/ack/:token`) zeigte die Richtlinie im Rohformat.** Empfänger bestätigten also, „## Überschrift" und „**fett**" gelesen und verstanden zu haben. Sie wird jetzt als gerendertes Markdown angezeigt — mit der ohnehin vorhandenen Bibliothek im Browser, der Server bleibt ohne zusätzliche Abhängigkeit.
- Markdown-Entschärfung: nur `<` wird zu `&lt;` (kein eingebettetes HTML), `>` bleibt — sonst brechen Blockzitate. `javascript:`-Verweise werden nachträglich entfernt. Gilt für Leseansicht, PDF und Bestätigungsseite gleichermaßen; letztere ist ohne Login erreichbar.
- Die Bestätigungsseite wird mit `Cache-Control: no-store` ausgeliefert — Inhalt und Bestätigungsstand können sich ändern, eine veraltete Fassung darf nicht im Cache hängenbleiben.
- Ein neues High-Advisory in `js-yaml` (transitiv über jest und puppeteer, GHSA-5p4m-2wfm-xmqj) hätte die CI rot gemacht. Behoben mit `npm audit fix`: nur `package-lock.json` ändert sich (3.15.0->3.15.1, 4.3.0->4.3.1), keine Produktivabhängigkeit betroffen, `npm audit` meldet 0 Vulnerabilities.

### Added
- **Oberfläche zu den Schutzzielen je Asset-Typ** — schließt Teil 2 von [#64](https://github.com/coolstartnow/isms-builder/issues/64). Im Typ-Editor (Administration -> Listen -> Asset-Typen) stehen je Typ vier Stufenfelder für C/I/A/Authentizität; leer bedeutet „keine Vorgabe". Im Asset-Formular gibt es den Schalter „Schutzziele abweichend vom Typ festlegen".
- Solange nicht übersteuert wird, sind die vier Felder am Asset **gesperrt** und zeigen den Wert des Typs. Ohne diese Sperre schriebe ein Speichern den Typwert als Eigenwert fest und der Bezug zum Typ ginge unbemerkt verloren — genau das, was die dauerhafte Vererbung verhindern soll.
- Das Formular weist die Herkunft je Schutzziel aus: „Vom Typ übernommen" oder, wenn ein abhängiges Asset den Wert anhebt, dessen Name. Ohne diese Anzeige wirkt eine Hochstufung nach dem Maximumprinzip wie ein Fehler.
- Schutzziele am Typ werden im Knex-Backend im vorhandenen `data`-JSON-Feld mitgeführt — kein Schema-Change.

### Fixed
- Die Kürzel der Schutzziele im Typ-Editor wurden aus dem Label abgeleitet und ergaben auf Deutsch zweimal „V" (Vertraulichkeit und Verfügbarkeit). Sie kommen jetzt aus `ASSET_PROT_GOALS` (C/I/A/Au).

---

## [1.37.2] — 2026-08-10

### Added
- **Asset-Typen sind editierbar** — Teil 1 von [#64](https://github.com/coolstartnow/isms-builder/issues/64). Unter Administration → Listen lassen sich Asset-Typen anlegen, umbenennen, umsortieren und entfernen; jeder Typ trägt seine Kategorie mit. Der Objekt-Editor für Listen hat dafür ein optionales drittes Feld (Auswahlliste) bekommen, statt einen zweiten Editor danebenzustellen.
- Das Typ-Auswahlfeld im Asset-Formular ist nach Kategorie gruppiert. Ein Typ, den es nicht mehr gibt, erscheint als „Unbekannter Typ" — damit er beim Bearbeiten eines Bestandsassets nicht stillschweigend verschwindet.
- **Asset-Typen und -Kategorien sind übersetzt** (DE/EN/FR/NL). Bewusste Festlegung dabei: Übersetzt wird nur, was unverändert ausgeliefert wurde. Ein selbst angelegter Typ und ein umbenannter Vorgabetyp erscheinen in der Sprache, in der sie eingegeben wurden — für sie kann keine Übersetzung existieren, und eine Umbenennung stillschweigend zu überschreiben wäre schlechter als eine englische Bezeichnung. Ein mehrsprachiges Labelfeld je Typ ist ausdrücklich nicht vorgesehen; die Regel steht in `docs/module-assets.md` (alle vier Sprachen) und in der Architekturdokumentation.
- **Schutzziele je Asset-Typ mit dauerhafter Vererbung** — Teil 2 von [#64](https://github.com/coolstartnow/isms-builder/issues/64), Backend. Ein Typ kann C/I/A/Authentizität vorgeben; Assets dieses Typs übernehmen die Werte, solange sie nicht `protectionOverride` setzen. Die Vorgabe wirkt **je Schutzziel einzeln** (ein Typ „Datenbank: C=4" lässt I und A beim Asset) und ist ein **dauerhafter Bezug**: Eine Korrektur am Typ wirkt sofort auf alle Assets, die nicht übersteuern. Die Abhängigkeitsvererbung aus #29 läuft unverändert darüber — das Maximum gewinnt, auch gegen einen bewusst gesenkten Wert.
- Zwei getrennte Herkunftsangaben je Asset, damit in der Oberfläche erklärbar bleibt, warum ein Wert so hoch ist: `protectionOrigins` nennt weiterhin das **Asset**, das den effektiven Wert bestimmt, das neue `protectionSources` je Ziel `own` oder `type`. Wären beide in einem Feld, ginge verloren, über welches Asset ein Wert nach oben gereicht wurde.
- `tests/assetTypeProtection.test.js` (15 Tests) auf beide Vererbungsquellen und ihr Zusammenspiel.
- `tests/i18nKeys.test.js` (32 Tests): prüft, dass jeder in `ui/app.js` statisch verwendete Übersetzungsschlüssel existiert und in allen vier Sprachen gefüllt ist, und wacht darüber, dass die umgestellten Label-Maps nicht wieder auf feste Texte zurückfallen. Ein fehlender Schlüssel fiel bisher nicht auf: `t()` gibt den Schlüsselnamen zurück, die Oberfläche zeigt dann `govl_prioLow` — ohne Fehler und ohne Absturz.
- `tests/assetTypes.test.js` (46 Tests, 423 gesamt), darunter ein Guard gegen den Rückfall in die Mehrfach-Deklaration und einer auf die Invariante, dass der `en`-Wert jedes `assetType_*`-Schlüssels exakt dem Vorgabe-Label entspricht — sonst fiele die Übersetzung still aus.

### Changed
- **Rund 30 Label-Maps liefen an der Übersetzung vorbei** und tragen ihre Anzeigetexte jetzt über `t()`: Governance (6), BCM (5), Lieferanten (4), Legal (6), Training (2), Incident Inbox (2), dazu SoA-Status, Risikostufen sowie Klassifizierung, Kritikalität, Status und Kategorien im Asset-Modul — zusammen 122 neue Schlüssel in DE/EN/FR/NL. Für einen französischen oder niederländischen Nutzer waren diese Module bis dahin durchgehend englisch. Umgesetzt als Getter (`get x() { return t(key) }`) nach dem Muster von `CAL_EVENT_CFG`, damit keine einzige Verwendungsstelle geändert werden musste.
- Der SoA-Status war als einziger **deutsch** fest verdrahtet und erschien so auch in der englischen Oberfläche.
- **Die Asset-Typenliste steht nur noch an einer Stelle**: neu in `server/db/assetTypes.js`, backend-neutral wie `assetProtection.js`. Vorher stand sie dreimal — in `server/db/assetStore.js`, in `server/db/stores/assetStore.js` und als `ASSET_TYPES_MAP` in `ui/app.js` — und war bereits auseinandergelaufen: Die Backend-Kopien führten deutsche Labels („Mobilgerät"), das Frontend englische („Mobile Device"). Konsumiert wurde keine der beiden Backend-Kopien. Das UI holt die Liste jetzt über `/admin/lists`, was ohnehin nötig ist, sobald Typen editierbar sind.

### Fixed
- **Asset-Typen wurden beim Speichern nicht geprüft**: `type` übernahm jeden Wert, auch einen Tippfehler. `POST`/`PUT /assets` weisen einen unbekannten Typ jetzt mit HTTP 400 ab; ein leerer Typ bleibt zulässig, weil Bestandsdaten ihn haben.
- Ein Asset-Typ, der noch an Assets hängt, lässt sich nicht mehr entfernen (HTTP 409 mit Typ und Anzahl). Sonst zeigten bestehende Assets auf einen Typ, den es nicht mehr gibt.
- Lehnte der Server eine Listenänderung ab, zeigte der Admin-Editor weiter den nicht gespeicherten Stand. Er lädt jetzt zurück.
- Ein im Admin neu angelegter Asset-Typ stand im Asset-Formular erst nach einem Neuladen der Seite zur Verfügung.

---

## [1.37.1] — 2026-07-27

### Fixed
- **Navigation blieb im NIS2-Modul hängen**: Nach dem Aufruf von NIS2 blieb dessen Panel beim Wechsel auf ein anderes Modul rechts stehen. Ursache: `removeAllDynamicPanels()` in `ui/app.js` räumt die dynamischen Panels über eine hartcodierte ID-Liste ab, in der `nis2Container` fehlte — jede `render*`-Funktion entfernt nur ihren eigenen Container.
- **Admin → „Vorhandene Templates" blieb dauerhaft auf „lädt…"**: Im Template-Callback von `renderAdminTemplatesTab()` hieß der Parameter `t` und überschattete damit die globale i18n-Funktion `t()`. Das `t('delete')` für den Tooltip des Löschen-Buttons warf `TypeError: t is not a function`, der `innerHTML`-Aufbau brach ab und die Ladeanzeige blieb stehen. Parameter in `tpl` umbenannt; zusätzlich fängt die Funktion Fehler jetzt ab und zeigt eine Fehlermeldung statt endlos „lädt…".
- **Menüreihenfolge zeigte NIS2 und Richtlinien-Bestätigungen nicht**: Unter Administration → Organisation → Menüreihenfolge fehlten beide Module. `_NAV_ORDER_DEFAULT` (UI) und `navOrder` (beide Org-Settings-Stores) waren nicht mitgezogen worden. Da eine einmal gespeicherte Reihenfolge die neuen IDs ohnehin nicht kennt, ergänzt die Sortierliste jetzt fehlende Sections aus `SECTION_META` am Ende — so wie es die Navigation selbst schon tat. Neue Module tauchen damit künftig automatisch auf und lassen sich einsortieren.

### Added
- `tests/uiPanels.test.js`: statische Guards gegen drei Fehlerklassen in `ui/app.js` (8 Tests, 330 gesamt) —
  jeder dynamisch erzeugte Panel-Container muss in `removeAllDynamicPanels()` gelistet sein, kein mehrzeiliger
  Template-Callback darf die i18n-Funktion `t()` überschatten, und die Nav-Default-Reihenfolge muss in UI und
  beiden Stores identisch sein und jede Section aus `SECTION_META` enthalten. Alle drei Fehler fielen bisher erst
  bei der Nutzung der jeweiligen Maske auf.

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
