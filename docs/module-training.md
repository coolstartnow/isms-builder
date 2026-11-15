# Modul: Schulungen und Awareness (Training)

> Mitarbeitende sind der wichtigste — und häufig angreifbarste — Faktor im ISMS.
> ISO 27001 Kapitel 7.2 und 7.3 sowie A.6.3 fordern nachweisbare Kompetenz
> und Sicherheitsbewusstsein.

---

## Was wird hier dokumentiert?

Das Training-Modul erfasst alle Schulungsmaßnahmen zur Informationssicherheit:
- Pflichtschulungen (Onboarding, Jahresschulung)
- Phishing-Simulationen
- Workshops und externe Seminare
- E-Learning-Abschlüsse
- Rollenspezifische Trainings (Admin, CISO, DPO)

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Schulungen einsehen | `reader` |
| Schulung anlegen und bearbeiten | `editor` |
| Schulung löschen / wiederherstellen | `admin` |

---

## Schulung anlegen

**Training → „+ Neue Schulung"**

Felder:
- **Titel** — z.B. „Phishing-Awareness Q1 2026"
- **Typ** — Pflichtschulung / Phishing-Simulation / Workshop / E-Learning / Sonstiges
- **Datum** — wann fand die Schulung statt?
- **Dauer** — in Stunden
- **Trainer / Anbieter**
- **Zielgruppe** — alle Mitarbeitenden / IT-Abteilung / Führungskräfte etc.
- **Teilnehmerzahl** — wie viele Personen wurden geschult?
- **Abdeckungsquote** — wie viel Prozent der Zielgruppe wurden erreicht?
- **Ergebnis / Notizen** — Bewertung, Erkenntnisse, Verbesserungspunkte
- **Status** — `planned` / `completed` / `cancelled`

---

## Nachweis erfassen (Reiter „Nachweise“)

Ein Nachweis ist **kein eigener Datensatz**, sondern das Feld **„Nachweis / Notizen“** der Schulung. Der Reiter **„Nachweise“** hat deshalb keinen „Neu“-Knopf: Er zeigt nur alle Schulungen mit Status **Abgeschlossen** und den dort eingetragenen Nachweistext.

So gehen Sie vor:
1. **Reiter „Plan“** → Schulung mit dem Stift-Symbol öffnen (oder mit „+ Neue Schulung" anlegen).
2. **Status** auf *Abgeschlossen* setzen und das Abschlussdatum eintragen.
3. Im Abschnitt **„Nachweise“** das Feld **„Nachweis / Notizen“** ausfüllen: Teilnehmerliste, Zertifikatsnummern, Links (`http`/`https`) auf die abgelegten Dokumente.
4. **Speichern.** Die Schulung erscheint jetzt im Reiter „Nachweise“; ein Klick auf die Karte zeigt die Schulung nur zum Ansehen (Ändern geht ausschließlich im Reiter „Plan“).

Wichtig: Eine Schulung, die noch nicht *Abgeschlossen* ist, erscheint im Reiter „Nachweise“ nicht, auch wenn sie schon einen Nachweistext hat. Dateien hängen Sie im selben Formular unter „Anhänge“ an (siehe unten).

---

## Dateien anhängen und Teilnahmebestätigung

**Anhänge** (Teilnehmerliste, Zertifikat eines Anbieters, Fotos): Reiter „Plan“ → Schulung öffnen → Abschnitt **„Anhänge“** → „Datei hinzufügen“. Das geht erst, wenn die Schulung einmal gespeichert ist.
- Erlaubt sind PDF, PNG, JPG, DOCX, XLSX und TXT bis 20 MB je Datei. Geprüft werden Endung **und** Dateiinhalt; andere oder getarnte Dateien werden abgelehnt.
- Hochladen und Entfernen dürfen Konten ab Editor; Herunterladen darf jedes Konto mit Leserecht. Im Reiter „Nachweise“ stehen die Anhänge als Knöpfe auf der Karte.
- **„Entfernen“ blendet den Anhang nur aus der Liste aus.** Die Datei bleibt als Nachweis auf dem Server (Ordner `training-files/` im Datenverzeichnis). Sichern Sie diesen Ordner mit; er ist nicht Teil des JSON-Datenexports.
- Jedes Hochladen und Entfernen steht im Audit-Log.

**Teilnahmebestätigung (PDF):** Knopf „Teilnahmebestätigung (PDF)“ im Reiter „Nachweise“ (auf der Karte) und im Schulungsformular.
- Sie gibt es **nur für Schulungen mit Status „Abgeschlossen“**. Bei jedem anderen Status meldet das System, dass sie erst nach Abschluss ausgestellt wird.
- **Eine Bestätigung je Schulung** (nicht je Teilnehmer): Titel, Kategorie, Beschreibung, Abschlussdatum, Dozent/Anbieter, Teilnehmende (Feld „Zugewiesen an“), Pflichtschulung ja/nein, verknüpfte Controls, Firmenlogo und Firmenname. Die Akzentfarbe richtet sich nach der Kategorie, die Sprache nach der Standardsprache der Installation.
- **Der Prüfcode** wird aus Kennung, Titel, Abschlussdatum, Dozent und Teilnehmenden berechnet (SHA-256, erste 12 Zeichen). Ändern sich diese Angaben, ändert sich der Code; so erkennen Sie, ob eine ältere Bestätigung noch zum aktuellen Stand der Schulung passt.
- **Es ist ein interner Beleg des Unternehmens, keine Zertifizierung** durch Dritte; das steht auch auf dem Dokument. Es trägt keine Unterschrift.
- Grenze: Die PDF-Schrift kennt keine ungarischen Zeichen ő/ű; sie erscheinen als ö/ü.
- Jedes Ausstellen steht mit dem Prüfcode im Audit-Log.

---

## Fortschritt und Kennzahlen

Die Schulungsübersicht zeigt:
- Abdeckungsquote über alle Schulungen (Ziel: 100 % der Pflichtschulungen)
- Geplante vs. durchgeführte Schulungen
- Schulungen nach Typ und Zeitraum

---

## Verknüpfung mit SoA

Schulungsmaßnahmen können als Umsetzungsnachweis für Controls verknüpft werden,
z.B.:
- ISO A.6.3 (Security Awareness Training) → Jahresschulung
- ISO A.8.7 (Protection against malware) → Phishing-Simulation

---

## Audit-Hinweis

ISO 27001 Kapitel 7.2 fordert den Nachweis dass Mitarbeitende die notwendige
Kompetenz besitzen. Kapitel 7.3 verlangt Bewusstsein für die ISMS-Politik
und ihre persönliche Rolle darin.

Der Auditor erwartet:
1. Einen Schulungsplan für das laufende Jahr
2. Nachweise durchgeführter Schulungen (Teilnehmerlisten, Zertifikate)
3. Eine Abdeckungsquote die alle relevanten Mitarbeitenden erfasst

Empfehlung: Tragen Sie Teilnehmerliste und Links (http/https) im Feld „Nachweis / Notizen“ ein und hängen Sie Zertifikate und Listen als Dateien unter „Anhänge“ an, damit sie beim Audit sofort verfügbar sind. Im Reiter „Nachweise“ zeigt ein Klick auf die Karte die Schulung nur zum Ansehen (Ändern geht im Reiter „Plan“); Links im Nachweistext sind anklickbar.