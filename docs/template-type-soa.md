# Template-Typ: SoA (Statement of Applicability)

> **Kurzdefinition:** Das SoA ist das Herzstück der ISO-27001-Zertifizierung — eine verbindliche Erklärung darüber, welche Sicherheitsmaßnahmen (Controls) angewendet werden, welche nicht, und warum.

---

## Was ist ein Statement of Applicability?

Das SoA ist kein normales Dokument wie eine Policy. Es ist eine **strukturierte Tabelle** — ein Verzeichnis aller Controls aus einem Sicherheitsrahmenwerk (z.B. ISO 27001 Annex A mit 93 Controls), in dem für jeden Control festgehalten wird:

- **Applicable?** Gilt dieser Control für uns?
- **Status:** Umgesetzt / Teilweise / In Planung / Nicht begonnen
- **Begründung:** Warum gilt er (oder warum nicht)?
- **Umsetzungsnachweis:** Welche Policy/Procedure deckt ihn ab?

**Wer braucht ein SoA zwingend?**
Jede Organisation die eine **ISO 27001-Zertifizierung** anstrebt. Ohne SoA keine Zertifizierung — es ist eine normative Anforderung aus Kapitel 6.1.3d.

---

## SoA im ISMS Builder

Das SoA-Modul ist **nicht** unter den Template-Typen in der Sidebar — es hat eine eigene Sektion in der oberen Navigation (→ **SoA**). Dort werden die Controls direkt bearbeitet.

Der Template-Typ **SoA** in der Sidebar dient für **ergänzende Dokumente** zum SoA-Prozess, z.B.:
- „SoA-Prozessbeschreibung" (Wie pflegen wir das SoA?)
- „SoA-Freigabeverfahren" (Wer genehmigt Änderungen?)
- „SoA-Review-Protokoll" (Nachweis der letzten Überprüfung)

---

## Unterstützte Frameworks im ISMS Builder

| Framework | Controls | Beschreibung |
|-----------|----------|--------------|
| **ISO 27001:2022** | 93 | Internationaler Standard für ISMS |
| **BSI IT-Grundschutz** | variabel | Deutsches Pendant, sehr detailliert |
| **NIS2** | ~30 | EU-Richtlinie für kritische Infrastrukturen |
| **EUCS** | variabel | EU Cloud Security Scheme |
| **EUAI Act** | variabel | KI-Verordnung der EU |
| **ISO 9001** | variabel | Qualitätsmanagement |
| **CRA** | variabel | Cyber Resilience Act |

Weitere Rahmenwerke wie **NEN 7510** (niederländischer Standard für Informationssicherheit im Gesundheitswesen) oder **TISAX** (Prüf- und Austauschmechanismus der Automobilindustrie, Prüfkatalog VDA ISA) gehören **nicht** zum Lieferumfang: Sie lassen sich als **eigene Gruppe** anlegen und aus einer Datei importieren (siehe Abschnitt „Eigene Gruppen“). Auch die ISO-Controls liefert der ISMS Builder nicht mit; sie werden aus der lizenzierten Ausgabe importiert.

> **Rechtlicher Hinweis:** Die Normtexte von ISO 27001/9000/9001, NEN 7510 und der TISAX-Prüfkataloge (VDA ISA) unterliegen den Rechten ihrer Herausgeber (Urheber- und Markenrecht) und werden von ISMS Builder nicht mitgeliefert. Beispiel-Controls in Demo-Daten sind eigene, erfundene Platzhaltertexte ohne Bezug zum Wortlaut der Normen — unvollständig und weder für Zertifizierungen noch für TISAX-Assessments verwendbar. Importieren Sie nur Texte, die Sie lizenzrechtlich verwenden dürfen. Das ist keine Rechtsberatung.

---

## Konkretes Beispiel — ein SoA-Eintrag

> **Control:** ISO 27001 A.8.8 — Management of technical vulnerabilities
> **Applicable:** Ja
> **Status:** Teilweise umgesetzt
> **Begründung:** Wir betreiben eigene Server und müssen Schwachstellen systematisch managen.
> **Umsetzung:** Patch-Management-Procedure vorhanden; automatisches Scanning mit Greenbone läuft; Risiken werden über Scan-Import ins ISMS Builder übertragen.
> **Verknüpfte Templates:** „Patch-Management-Procedure v2.0", „Schwachstellenmanagement-Policy v1.1"
> **Verknüpfte Risiken:** „Ungepatchte Webserver-CVE-2024-1234"

---

## Workflow: SoA erstellen und pflegen

**Schritt 1 — Framework wählen**
In der SoA-Sektion das gewünschte Framework aktivieren (Admin → System-Konfiguration → Frameworks).

**Schritt 2 — Applicability festlegen**
Für jeden Control entscheiden: Gilt er? Falls nein → Begründung eintragen (z.B. „nicht applicable, da kein Rechenzentrum betrieben").

**Schritt 3 — Status pflegen**
Für applicable Controls den Umsetzungsstand erfassen: `not_started` → `partial` → `implemented` → `optimized`.

**Schritt 4 — Verknüpfen**
Jeden Control mit den umsetzenden Policies und Procedures verknüpfen.

**Verknüpfte Dokumente direkt öffnen.** Ein Klick auf Kennung, Titel oder den Zähler („2 Dokumente“) in der Zeile klappt die Details des Controls auf (ebenso das kleine ▸). Im aufgeklappten Control sind die verknüpften Dokumente unter „Verknüpfte Dokumente / Policies“ **klickbar**: Ein Klick auf den Namen öffnet das Dokument in derselben Ansicht, oben steht der Knopf **„Zurück zu Control …“** — er führt ins SoA zurück, in denselben Reiter, mit dem Control wieder aufgeklappt. Das kleine Symbol daneben (oder Strg-/Mittelklick auf den Namen) öffnet das Dokument in einem **neuen Tab**, sodass das SoA geöffnet bleibt. So lässt sich beim Prüfen eines Controls sofort nachlesen, ob die verknüpfte Policy die Anforderung wirklich abdeckt. Ist das verknüpfte Dokument gelöscht oder für Ihr Konto nicht lesbar, steht nur seine Kennung als Text da.
Jeden Control mit den relevanten Risiken verknüpfen.

**Schritt 5 — Review und Export**
Reports → Compliance: automatische Berechnung der Implementierungsrate.
Reports → Gap Analysis: welche Controls haben noch keine verknüpfte Policy?
JSON-Export des SoA für externe Tools.

---

## SoA und Audit

Der ISO-27001-Auditor prüft das SoA als erstes Dokument. Er erwartet:

1. **Vollständigkeit:** Alle Controls des Annex A müssen bewertet sein.
2. **Konsistenz:** Applicable Controls müssen einen Umsetzungsnachweis haben.
3. **Nachvollziehbarkeit:** Ausschlüsse müssen begründet sein.
4. **Aktualität:** Das SoA muss regelmäßig reviewed werden.

```
Audit-Frage: "Zeigen Sie mir Ihr SoA."
  ↓
SoA-Sektion → Framework ISO 27001 → alle 93 Controls sichtbar
  ↓
Audit-Frage: "Warum ist A.11 (Physical Security) als 'not applicable' markiert?"
  ↓
Begründung im SoA: "Alle Systeme in der Cloud, kein eigenes Rechenzentrum."
  ↓
Audit-Frage: "Und A.8.8 (Vulnerability Management)?"
  ↓
SoA zeigt: Status 'partial', verknüpft mit Procedure + 3 Risiken aus Greenbone-Scan.
```

---

## Eigene Controls (CUSTOM-Framework)

Neben den integrierten Frameworks (ISO 27001, BSI, NIS2 etc.) bietet das SoA-Modul ein
**CUSTOM-Framework** für organisationsspezifische Controls — also Maßnahmen, die in keinem
Standardrahmenwerk enthalten sind, aber trotzdem nachweispflichtig sein sollen.

**Typische Anwendungsfälle:**
- Interne Sicherheitsrichtlinien die über ISO Annex A hinausgehen
- Branchenspezifische Anforderungen (z.B. Bankaufsicht, Medizinprodukte)
- Vertragliche Verpflichtungen gegenüber Kunden oder Lieferanten
- Eigene Best Practices die dauerhaft im ISMS verankert werden sollen

**Voraussetzung:** Rolle `contentowner` oder höher.

**Workflow:**

**Schritt 1 — CUSTOM-Tab öffnen**
In der SoA-Sektion den Tab **„Custom Controls"** anklicken. Der Tab ist **standardmäßig vorhanden**.
Nutzt Ihre Organisation keine eigenen Controls — der Tab wäre dann nur eine leere Liste —, schaltet ein Administrator ihn
unter **Administration → Module → Aktive Compliance-Frameworks → „Custom Controls“** aus, wie jedes andere Framework
(Konfiguration speichern & anwenden). Der Tab verschwindet dann in der SoA, im Dashboard und in den Kennzahlen.
**Vorhandene Controls werden dabei nicht gelöscht**; sie erscheinen wieder, sobald der Tab eingeschaltet wird. Eigene Gruppen
(siehe unten) sind davon unabhängig und werden einzeln geschaltet.

**Schritt 2 — Eigenen Control anlegen**
Über die Schaltfläche **„+ Neues Control"** (nur für `contentowner`/`admin` sichtbar)
öffnet sich ein Formular mit:
- **Gruppe** — `CUSTOM` oder eine eigene Gruppe (siehe unten)
- **Kennung (optional)** — frei wählbar (z.B. `ORG-01`, `BANK-12`); erlaubt sind A–Z, a–z, 0–9 und `. _ : ( ) + -`.
  Die Kennung ist im ganzen SoA **eindeutig** (eine schon vergebene Kennung wird abgelehnt). Ohne Angabe wird
  eine Kennung wie `CUSTOM-1767225600000` erzeugt.
- **Titel** — kurze Bezeichnung
- **Beschreibung** — was der Control fordert
- **Thema / Kategorie** — thematische Einordnung (höchstens 80 Zeichen)

**Schritt 3 — Wie Standard-Controls behandeln**
Eigene Controls verhalten sich identisch zu integrierten Controls:
- Applicable / Not Applicable markieren
- Umsetzungsstatus pflegen (`not_started` → `partial` → `implemented` → `optimized`)
- Mit Policies, Procedures und Risiken verknüpfen
- Erscheinen im Compliance-Report und in der Gap Analysis

**Schritt 4 — Löschen**
Eigene Controls können über den Löschen-Button entfernt werden — sofern **keine Templates
verknüpft** sind. Integrierte Controls (ISO, BSI etc.) können nicht gelöscht werden.

> **Hinweis für den Audit:** Der Auditor sieht CUSTOM-Controls im JSON-Export des SoA.
> Eine kurze Notiz in der Beschreibung warum dieser Control existiert (z.B. „vertragliche
> Anforderung Kunde XYZ") macht die Nachvollziehbarkeit im Audit deutlich einfacher.

---

## Eigene Gruppen (eigene Frameworks, z. B. NEN 7510, TISAX, Kundenanforderung)

Der **CUSTOM**-Tab sammelt einzelne Controls in einer Liste. Wer ein **ganzes Rahmenwerk** abbilden will — mit eigenem
Tab, eigener Farbe und eigenen Kennzahlen im Dashboard und in den Berichten —, legt eine **eigene Gruppe** an.

> **Keine Normtexte im Lieferumfang.** Der ISMS Builder liefert für eigene Gruppen keine Inhalte mit.
> Importieren Sie nur Texte, die Sie lizenzrechtlich verwenden dürfen (eigene Formulierungen, Kundenanforderungen, lizenzierte Ausgabe).

> **Rechtlicher Hinweis:** Die Normtexte von ISO 27001/9000/9001, NEN 7510 und der TISAX-Prüfkataloge (VDA ISA) unterliegen den Rechten ihrer Herausgeber (Urheber- und Markenrecht) und werden von ISMS Builder nicht mitgeliefert. Beispiel-Controls in Demo-Daten sind eigene, erfundene Platzhaltertexte ohne Bezug zum Wortlaut der Normen — unvollständig und weder für Zertifizierungen noch für TISAX-Assessments verwendbar. Importieren Sie nur Texte, die Sie lizenzrechtlich verwenden dürfen. Das ist keine Rechtsberatung.

**Voraussetzung:** Rolle `admin` (Anlegen, Ändern, Import). Einzelne Controls einer Gruppe legen und bearbeiten
dürfen weiterhin Content Owner.

### Gruppe anlegen und Controls importieren

1. In der SoA oben auf **„＋ Eigene Gruppe“** klicken. Es öffnet sich ein Panel direkt auf der Seite (kein Dialog).
2. **Kennung** (2–50 Zeichen: A–Z, 0–9, `_`, `-`; nicht die eingebauten Kennungen und nicht `CUSTOM`), **Bezeichnung** und
   **Farbe** eintragen — oder eine JSON-Datei wählen, die diese Angaben enthält (sie werden vorbelegt).
3. **Datei (JSON)** wählen. Eine Beispieldatei mit erfundenen Controls lädt der Link **„Beispieldatei herunterladen“**
   (auch im Repository: `docs/examples/soa-custom-framework.example.json`).
4. **Vorschau** zeigt, was passieren würde: wie viele Controls neu sind, wie viele aktualisiert werden, welche Zeilen mit
   welchem Grund abgelehnt werden. **Die Vorschau schreibt nichts.**
5. **Übernehmen** legt die Gruppe (falls neu) und die Controls an. Der neue Tab ist sofort da, ein Neustart ist nicht nötig.
   **„Nur Gruppe anlegen“** erzeugt die Gruppe ohne Controls.

**Dateiaufbau:**

```json
{
  "framework": { "id": "KUNDE-A", "label": "Kundenanforderung A", "color": "#0ea5e9" },
  "controls": [
    { "id": "KA-1", "theme": "Zugang", "title": "Zugriffe werden nach Rollen vergeben", "description": "optional" }
  ]
}
```

| Feld | Pflicht | Grenze |
|---|---|---|
| `id` | ja | 1–120 Zeichen, erlaubt: A–Z, a–z, 0–9 und `. _ : ( ) + -`; **im ganzen SoA eindeutig** |
| `theme` | ja | höchstens **80** Zeichen |
| `title` | ja | höchstens 512 Zeichen |
| `description` | nein | höchstens 4000 Zeichen |

Datei höchstens **2 MB** und **2000 Zeilen**. Weitere Felder in der Datei (z. B. `status`, `owner`) werden **ignoriert**.

**Zusammenführen statt Ersetzen:** Ein erneuter Import ändert vorhandene Controls **derselben Gruppe** nur in
`title`, `theme` und (wenn angegeben) `description`. **Anwendbarkeit, Status, Verantwortliche, Begründung und Verknüpfungen
bleiben unverändert.** Controls, die nicht (mehr) in der Datei stehen, bleiben ebenfalls — es wird **nichts gelöscht**.
Bezeichnung und Farbe einer vorhandenen Gruppe übernimmt der Import nicht aus der Datei (ändern: siehe unten).

**Abgelehnte Zeilen** werden mit Grund gemeldet: `kein Objekt`, `Pflichtfeld fehlt`, `ungültige Kennung`, `Wert zu lang`,
`doppelte Kennung in der Datei`, `Kennung gehört schon zu einer anderen Gruppe` (Kennungen gelten für alle Frameworks gemeinsam,
auch für BSI, NIS2 usw.).

### Gruppe verwalten

**Administration → Module → „Eigene Gruppen“:** Jede Gruppe erscheint als Karte mit Kennung und Anzahl der Controls.
- **Ein-/Ausschalten** wie bei den eingebauten Frameworks (der Schalter gilt für SoA, Dashboard und Berichte; speichern mit dem Knopf unten).
- **Bezeichnung und Farbe ändern** (die Kennung bleibt).
- **Löschen** geht **nur, wenn die Gruppe keine Controls mehr hat** (sonst bleibt sie, mit Hinweis auf die Anzahl).
  Controls löschen Sie einzeln im Tab der Gruppe (Papierkorb-Symbol; nur ohne verknüpfte Dokumente).

### Verhalten und Auswertungen

- Controls einer eigenen Gruppe verhalten sich wie alle anderen: anwendbar/nicht anwendbar, Status, Verantwortliche, Verknüpfung
  mit Richtlinien, Cross-Mapping der Verknüpfungen, Gap-Analyse, JSON-Export.
- Dashboard, `GET /soa/summary` und der Bericht „Framework-Abdeckung“ enthalten die Gruppe.
- **Backup/Export:** Die Gruppendefinitionen liegen in `data/soa-frameworks.json` (für alle Speicher gleich; Teil des Vollexports und
  jeder Sicherung des Datenverzeichnisses). Der **Demo-Reset** und das **Zurückspielen eines Bundles** lassen sie wie `soa.json` unangetastet.
  Fehlt die Datei, verschwinden nur die Tabs — die Controls bleiben und tauchen in Kennzahlen und Bericht weiter auf.
- **Öffentliche Demo:** Anlegen, Ändern, Löschen und Import sind dort gesperrt (wie die übrigen Importe).
- Der **ISO-Import** (`scripts/import-iso-controls.sh`, `POST /soa/import-controls`) bleibt unverändert und gilt weiter nur für ISO 27001, ISO 9000 und ISO 9001.

---

## Abgrenzung: SoA-Modul vs. SoA-Template-Typ

| | SoA-Modul (obere Navigation) | SoA-Template (Sidebar) |
|---|---|---|
| **Was** | Interaktive Control-Datenbank | Begleitdokument zum Prozess |
| **Inhalt** | 93+ Controls mit Status, Verknüpfungen | Freitext: Prozessbeschreibung, Protokolle |
| **Export** | JSON, Compliance-Report | PDF-Druck |
| **Beispiel** | „ISO A.8.8 — partial — verknüpft mit 2 Policies" | „SoA-Freigabeverfahren v1.0" |
