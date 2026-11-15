# Modul: Business Continuity Management (BCM)

> BCM stellt sicher dass die Organisation bei schwerwiegenden Störungen
> handlungsfähig bleibt — ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Einführung: Was ist ISO 22301?

> **Wichtiger Hinweis — keine offizielle Wiedergabe:** Diese Einführung ist eine **eigene, vereinfachte Zusammenfassung** des ISMS Builder. Sie ist **kein Normtext**, **keine amtliche oder offizielle Fassung** der ISO 22301 und **kein Ersatz für die Norm**. Maßgeblich ist allein die **aktuelle Ausgabe der Norm**, zu beziehen beim Normungsinstitut (in Deutschland DIN/Beuth, international ISO). Der Text ist **keine Beratung** und keine Zusicherung, dass eine Umsetzung danach eine Zertifizierung erfüllt. Kapitelnummern und Begriffe können von der Ausgabe abweichen, die Ihr Unternehmen verwendet.

Die **ISO 22301** beschreibt, wie ein Unternehmen ein **Business-Continuity-Managementsystem (BCMS)** aufbaut und betreibt. Ziel ist, dass wichtige Leistungen bei einer Störung (Brand, Cyberangriff, Stromausfall, Lieferantenausfall, Pandemie) weiterlaufen oder innerhalb einer vertretbaren Zeit wieder verfügbar sind. Die Norm ist, wie ISO 27001, eine **Managementsystem-Norm**: Sie sagt, **was** ein funktionierendes System leisten muss, nicht, **wie** es technisch gelöst wird. Man kann sich danach zertifizieren lassen. ISO 27001 schützt Informationen, ISO 22301 sichert, dass der Betrieb weiterläuft.

Die Norm hat **keinen Anhang mit einem Maßnahmenkatalog** (anders als ISO 27001), sondern Anforderungen („muss“-Sätze) in den Kapiteln 4 bis 10. Sie folgen dem Schema, das alle ISO-Managementnormen teilen:

| Kapitel | Frage dahinter | Unterstützung im ISMS Builder |
|---|---|---|
| **4 Kontext** | Wo stehen wir, was gehört zum System? | Organisation, Anwendungsbereich (Dokument), Verträge/Pflichten im Modul Rechtliches |
| **5 Führung** | Steht die Leitung dahinter? | Kontinuitätspolitik als Richtlinie (Dokumente), Rollen und Verantwortliche |
| **6 Planung** | Welche Risiken, welche Ziele? | Risikomanagement, Sicherheitsziele (z. B. „kritische Leistung binnen 4 Stunden wieder verfügbar“) |
| **7 Unterstützung** | Ressourcen, Wissen, Dokumente? | Schulungen und Nachweise, Bestätigung von Richtlinien, Dokumentenlenkung |
| **8 Betrieb** | Wie wird Kontinuität hergestellt? | **dieses Modul**: BIA, Pläne, Übungen |
| **9 Bewertung** | Funktioniert es wirklich? | Kennzahlen und Dashboard, Audits, Management Review (Governance) |
| **10 Verbesserung** | Wie lernen wir aus Fehlern? | Feststellungen und Maßnahmen, Sicherheitsziele |

### Kapitel 8 — Betrieb (das Herzstück, abgebildet in diesem Modul)
- **8.2 Business-Impact-Analyse und Risikobewertung:** Welche Tätigkeiten sind wichtig, wie schnell wird ein Ausfall teuer, wovon hängen sie ab? → Reiter **BIA**.
- **8.3 Strategien und Lösungen:** Wie überbrücken wir einen Ausfall (Ausweichstandort, Notstrom, zweiter Lieferant, Homeoffice)? → als Strategie in BIA und Plänen beschreiben.
- **8.4 Pläne und Verfahren:** Einsatzstruktur, Alarmierung, Kommunikation, Notfallpläne und die Rückkehr in den Normalbetrieb. → Reiter **Continuity Plans**.
- **8.5 Übungsprogramm:** Pläne werden in geplanten Abständen und nach wesentlichen Änderungen geübt, mit Bericht. → Reiter **Exercises**.
- **8.6 Bewertung:** Taugen Analyse, Pläne und Verfahren, und was folgt daraus? → Ergebnisse der Übungen und Audits.

### Kapitel 9 und 10 — Bewertung und Verbesserung (mit dem System umsetzbar)
- **9.1 Überwachung und Messung:** BCM-Dashboard (BIAs nach Kritikalität, Prozesse ohne genehmigten Plan, letzte und nächste Übung) und Reports; Sicherheitsziele mit Messwerten.
- **9.2 Internes Audit:** Ein Audit zum BCMS wie jedes andere führen — Modul **Audits** (Prüfpunkte, Auditprogramm als Jahresplan, Auditbericht).
- **9.3 Managementbewertung:** Modul **Governance → Management Reviews**; Eingaben (Auditergebnisse, Übungen, Kennzahlen) und Beschlüsse dort festhalten.
- **10.1 Abweichungen und Korrekturmaßnahmen:** Mängel aus Audits und Übungen als **Feststellungen** erfassen und mit **Maßnahmen** (Modul Maßnahmen) bis zur Wirksamkeitsprüfung verfolgen.
- **10.2 Fortlaufende Verbesserung:** Maßnahmen, Sicherheitsziele und die nächsten Übungen aus den Erkenntnissen ableiten.

### Das Addendum 2024
ISO 22301:2019/Amd 1:2024 ist sehr klein: In **4.1** muss die Organisation prüfen, ob der **Klimawandel** für sie ein relevantes Thema ist; in **4.2.1** kommt der Hinweis hinzu, dass interessierte Parteien klimabezogene Anforderungen haben können. Neue Maßnahmen verlangt das nicht, nur die Prüfung und ihre Dokumentation (z. B. im Anwendungsbereichs-Dokument oder im Risikoregister).

### ISO 22313 — der Leitfaden dazu
Die **ISO 22313** ist ein **Leitfaden zur Umsetzung** der ISO 22301. Sie enthält keine zertifizierbaren Anforderungen, erklärt aber ausführlich, wie die einzelnen Anforderungen in der Praxis erfüllt werden können (Hinweise und Beispiele zu BIA, Strategien, Plänen und Übungen). Wir empfehlen, sie zusätzlich zur ISO 22301 zu beschaffen, besonders beim Aufbau der ersten BIA und der ersten Pläne.

> **Hinweis:** Diese Einführung fasst die Norm in eigenen Worten zusammen und ersetzt weder den Normtext noch den Leitfaden. ISO-Normen sind urheberrechtlich geschützt und werden mit dem ISMS Builder nicht ausgeliefert; maßgeblich ist der Text der von Ihnen lizenzierten Ausgabe. Die Zuordnung zu den Modulen ist eine Orientierung, keine Zertifizierungsaussage.

---

## Drei Teilbereiche

Das BCM-Modul besteht aus drei eng verzahnten Bereichen:

| Bereich | Zweck |
|---|---|
| **BIA** (Business Impact Analysis) | Kritische Prozesse identifizieren und Ausfallfolgen bewerten |
| **Continuity Plans** | Konkrete Wiederanlaufpläne für kritische Prozesse |
| **Exercises** | Übungen und Tests der Pläne dokumentieren |

---

## Business Impact Analysis (BIA)

Die BIA beantwortet: **Was passiert wenn dieser Prozess ausfällt — und wie lange
können wir uns das leisten?**

**BCM → BIA → „+ Neue BIA"**

Felder:
- **Prozessname** — welcher Geschäftsprozess?
- **Prozessverantwortlicher und Abteilung**
- **Kritikalität** — `low` / `medium` / `high` / `critical`
- **RTO** (Recovery Time Objective) — maximale tolerierbare Ausfallzeit (Stunden)
- **RPO** (Recovery Point Objective) — maximaler tolerierbarer Datenverlust (Stunden)
- **MTPD** (Maximum Tolerable Period of Disruption) — absolute Maximalausfallzeit
- **Abhängigkeiten** — von welchen Systemen/Lieferanten abhängig?
- **Betroffene Systeme**
- **Status** — `draft` / `reviewed` / `approved`

> **RTO und RPO** sind die zentralen Kennzahlen der BIA. RTO definiert wie schnell
> der Prozess wiederhergestellt sein muss, RPO wie alt die Daten beim Recovery
> maximal sein dürfen.

---

## Continuity Plans (Wiederanlaufpläne)

Für jeden kritischen Prozess (BIA-Kritikalität `high`/`critical`) sollte ein
Wiederanlaufplan existieren.

**BCM → Pläne → „+ Neuer Plan"**

Felder:
- **Planname** — z.B. „Wiederanlauf Produktionsdatenbank"
- **Verknüpfte BIA** — auf welche BIA bezieht sich der Plan?
- **Auslöser** — wann wird der Plan aktiviert?
- **Verantwortlicher**
- **Schritte** — nummerierte Handlungsanweisungen
- **Ressourcen** — benötigte Systeme, Kontakte, Zugangsdaten (verschlüsselt)
- **Status** — `draft` / `tested` / `approved`

---

## Exercises (Übungen)

BCM-Pläne sind nur wirksam wenn sie regelmäßig geübt werden.
ISO 22301 fordert den Nachweis durchgeführter Tests.

**BCM → Übungen → „+ Neue Übung"**

Felder:
- **Übungstyp** — Tischübung (Tabletop) / Simulationsübung / Volltest
- **Datum und Dauer**
- **Getestete Pläne**
- **Teilnehmer**
- **Ergebnis** — was hat funktioniert, was nicht?
- **Maßnahmen** — was muss verbessert werden?

---

## Vorlagen für BIA, Pläne und Übungen

Zu jedem Reiter (**BIA**, **Pläne**, **Übungen**) gibt es neben „Neu“ den Knopf **„Vorlage verwenden“** (ab Rolle Editor). Er füllt das Formular mit Vorschlagswerten; Sie prüfen und passen sie an, bevor Sie speichern.

- **BIA-Vorlagen** enthalten Kritikalität, RTO/RPO/MTPD (Stunden), typische Abhängigkeiten und Systeme (nur Gattungen) und einen Hinweis. Die Zeiten sind **Vorschläge**: Die Prozessverantwortlichen entscheiden.
- **Plan-Vorlagen** bringen einen gegliederten Text mit: Zweck und Geltungsbereich, Aktivierungskriterien, Rollen, Sofortmaßnahmen, Wiederanlauf, Kommunikation, Rückkehr zum Normalbetrieb, Pflege und Übung. `{{COMPANY_NAME}}` und `{{ISMS_OWNER}}` werden aus den Organisationsdaten gefüllt; fehlende Angaben meldet das System.
- **Übungs-Vorlagen** füllen das Feld **„Szenario und Ablauf“** (neu bei Übungen): Szenario, Ziele, Einspielungen und Bewertungsfragen.

**Enthaltene Vorlagen (Deutsch):**
- BIA: Lohn- und Gehaltsabrechnung; IT-Betrieb und Rechenzentrum; Kundenservice und Support; Auftragsabwicklung und Vertrieb; Produktion und Leistungserbringung; Einkauf und Lieferantenmanagement; Unternehmenskommunikation und Website; Personalgewinnung und Personalbetreuung
- Pläne: Allgemeiner Business-Continuity-Plan; IT-Notfallplan (Disaster Recovery); Cyberangriff und Ransomware; Stromausfall; Gebäude- und Standortausfall; Ausfall eines kritischen Lieferanten; Pandemie und größerer Personalausfall; Krisenkommunikation; Wiederanlauf des Rechenzentrums
- Übungen: Planspiel Ransomware; Wiederherstellungstest der Datensicherung; Räumung und Standortausfall; Lieferantenausfall; Test der Alarmierungskette; Übung Stromausfall

Die Vorlagen sind praxisorientierte Vorschläge in eigenen Worten. Sie müssen sorgfältig auf Ihr Unternehmen angepasst werden, sind keine Beratung und enthalten keinen Normtext. FR, NL und HU sind eigene Übersetzungen; eine fachliche Prüfung wird empfohlen. Hilfreich beim Aufbau ist der Leitfaden **ISO 22313**.

---

## KI-Entwürfe für Pläne und Übungen

Im Formular eines **Plans** (Feld „Verfahren“) und einer **Übung** (Feld „Szenario und Ablauf“) gibt es den Knopf **„Mit KI entwerfen“** (ab Rolle Content Owner, wie bei den Dokumenten). Er öffnet denselben sicheren Dialog wie bei den Richtlinien: Sie wählen ein Thema aus der Titelliste (9 Pläne, 6 Übungen), sehen **den genauen Text, der gesendet würde**, und können ihn entweder an die angebundene KI senden oder **kopieren** und in einer KI Ihrer Wahl verwenden. Personenbezogene Angaben im Hinweisfeld werden blockiert, Firmenplatzhalter werden lokal ersetzt. Das Ergebnis steht danach im Textfeld des Formulars (mit Rückfrage, falls dort schon Text steht) und ist ein **Entwurf**, den Sie prüfen und anpassen. Einzelheiten und die Titelliste: Anleitung „KI-Entwürfe“.

---

## Register der ISO-22301-Anforderungen

Der Reiter **„Anforderungen“** zeigt die Anforderungen der ISO 22301 (Kapitel 4 bis 10) und den Stand Ihrer Umsetzung. Sie sehen auf einen Blick, **welche Anforderung wodurch belegt ist** und wo noch Nachweise fehlen.

**Wichtig:** Der **Normtext wird mit dem ISMS Builder nicht ausgeliefert** (Urheberrecht). Ein Administrator importiert ihn aus der von Ihrem Unternehmen **lizenzierten Ausgabe** der Norm. Das Register ist eine Arbeitshilfe, keine Zertifizierungsaussage; maßgeblich ist der Text Ihrer lizenzierten Ausgabe.

### Ablauf
1. **Vorlage laden:** Reiter „Anforderungen“ → „Vorlage (CSV)“. Sie enthält nur erfundene Beispielzeilen.
2. **Eigene Texte eintragen** (Kennung, Titel, Beschreibung) aus Ihrer lizenzierten Norm, oder dieselben Felder als JSON bereitstellen.
3. **Import** (nur Administratoren): Datei wählen. Zuerst gibt es eine **Vorschau** (neu, aktualisiert, abgelehnt mit Grund je Zeile); erst „Übernehmen“ speichert.
4. **Stand pflegen** (ab Rolle Editor): Je Anforderung Status, Verantwortliche/r, Begründung, Nachweis und Verknüpfungen mit BIA, Plänen und Übungen.
5. **Erneuter Import** (z. B. neue Ausgabe oder Addendum) ändert die **Beschreibungen**, nicht den Bearbeitungsstand; nichts wird gelöscht.

Status: *Offen*, *Teilweise*, *Umgesetzt*, *Nicht anwendbar* (dafür ist eine **Begründung Pflicht**). Die Abdeckungsleiste zählt nur die untersten Punkte, nicht die Kapitelüberschriften. Zu 8.2.2, 8.4.4 und 8.5 zeigt das System Hinweise aus vorhandenen Daten (Zahl der BIA, genehmigten Pläne, durchgeführten Übungen); der Status wird **nie automatisch** gesetzt. Export des Stands: „Export (CSV)“.

### Aufbau der Importdatei
Eine Zeile je Anforderung. **CSV** (UTF-8, Trennzeichen Komma oder Semikolon, Felder mit Komma oder Zeilenumbruch in Anführungszeichen) oder **JSON** (Liste oder `{ "requirements": [ … ] }`). Spaltennamen in Kleinbuchstaben, Reihenfolge beliebig, unbekannte Spalten werden gemeldet und ignoriert. Höchstens **2 MB** und **2000 Zeilen**.

| Spalte | Pflicht | Bedeutung | Grenze |
|---|---|---|---|
| `framework` | ja | Kennung der Norm, derzeit nur `ISO22301` | – |
| `id` | ja | Kennung der Anforderung, z. B. `9.1` (je Datei eindeutig) | 40 Zeichen |
| `parent` | nein | `id` der übergeordneten Anforderung (muss in der Datei oder im Bestand vorkommen) | 40 |
| `chapter` | nein | Kapitel; ohne Angabe die Zahl vor dem ersten Punkt der `id` | 40 |
| `title_de`, `title_en`, `title_fr`, `title_nl`, `title_hu` | mind. ein Titel | Titel je Sprache; angezeigt wird die Sprache der Oberfläche, sonst Englisch, sonst die erste vorhandene | 512 |
| `summary_de` … `summary_hu` | nein | Beschreibung je Sprache | 4000 |
| `title`, `summary` | nein | Titel/Beschreibung ohne Sprache (gelten als Englisch, wenn `title_en` fehlt) | 512 / 4000 |
| `amendment` | nein | Hinweis auf ein Addendum, z. B. `Amd 1:2024` | 60 |

Abgelehnte Zeilen nennt die Vorschau mit Grund: Pflichtfeld fehlt, unbekanntes Framework, doppelte Kennung, unbekannte übergeordnete Anforderung, Text zu lang.

**Beispiel CSV** (erfundene Texte):

```csv
framework,id,parent,chapter,title_en,summary_en
ISO22301,9,,9,Example chapter,
ISO22301,9.9,9,9,Example requirement,Your description from the licensed standard goes here.
```

**Beispiel JSON** (erfundene Texte):

```json
[
  { "framework": "ISO22301", "id": "9",   "chapter": "9", "title_en": "Example chapter" },
  { "framework": "ISO22301", "id": "9.9", "parent": "9", "chapter": "9",
    "title_en": "Example requirement", "summary_en": "Your description from the licensed standard goes here." }
]
```

Die Texte werden nur als Text gespeichert und beim Anzeigen maskiert. Zum Export in Tabellenkalkulationen werden Zellen, die mit `=`, `+`, `-` oder `@` beginnen, entschärft.

**Rechte:** Ansehen ab Leser, Pflegen ab Editor, Import nur Administrator. Jeder Import und jede Änderung steht im Audit-Log. Beim Wechsel in den Produktivbetrieb (Demo-Reset) wird das Register wie die übrigen Demo-Daten geleert.

---

## Dashboard

Das BCM-Dashboard zeigt:
- Anzahl BIAs nach Kritikalität
- Prozesse ohne genehmigten Plan
- Letzte Übung und nächste geplante Übung
- Pläne mit Status `draft` (Handlungsbedarf)

---

## Audit-Hinweis

ISO 27001 A.5.29 fordert Informationssicherheit in der Betriebskontinuität.
A.5.30 behandelt IKT-Bereitschaft für Betriebskontinuität.

Der Auditor prüft typischerweise:
1. Existiert eine BIA mit dokumentierten RTO/RPO-Werten?
2. Gibt es genehmigte Wiederanlaufpläne für kritische Prozesse?
3. Wurden die Pläne getestet? (Übungsnachweise)
4. Wurden Erkenntnisse aus Übungen in die Pläne eingearbeitet?

Empfehlung: Mindestens eine Tischübung pro Jahr pro kritischem Plan.
