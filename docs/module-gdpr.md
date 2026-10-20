# Modul: DSGVO (Datenschutz-Grundverordnung)

> Das DSGVO-Modul deckt alle zentralen Nachweispflichten der Datenschutz-Grundverordnung ab —
> vom Verarbeitungsverzeichnis über Auftragsverarbeitung bis zu Betroffenenanfragen.

---

## Übersicht der Teilbereiche

| Bereich | Abkürzung | Rechtliche Grundlage |
|---|---|---|
| Verarbeitungsverzeichnis | VVT | Art. 30 DSGVO |
| Auftragsverarbeitungsverträge | AV | Art. 28 DSGVO |
| Datenschutz-Folgenabschätzung | DSFA | Art. 35 DSGVO |
| Datenpannen | — | Art. 33/34 DSGVO |
| Betroffenenanfragen | DSAR | Art. 15–22 DSGVO |
| Technisch-organisatorische Maßnahmen | TOMs | Art. 32 DSGVO |
| Datenschutzbeauftragter | DSB | Art. 37–39 DSGVO |
| Löschkonzept | — | Art. 17 DSGVO |

---

## Verarbeitungsverzeichnis (VVT)

Das VVT ist das Kernregister der DSGVO — eine vollständige Liste aller
Datenverarbeitungstätigkeiten der Organisation.

**Anlegen:** DSGVO → VVT → **„+ Neue Verarbeitung"**

Pflichtfelder nach Art. 30 DSGVO:
- Bezeichnung und Zweck der Verarbeitung
- Verantwortliche(r) und ggf. gemeinsam Verantwortliche
- Betroffenengruppen und Datenkategorien
- Empfänger (intern/extern)
- Drittlandübermittlung (ja/nein + Schutzmaßnahme)
- Löschfristen
- Verknüpfte TOMs

**Export:** VVT-Einträge können als CSV exportiert werden — direkt verwendbar
als Anlage zum Datenschutzbericht oder für die Aufsichtsbehörde.

---

## Auftragsverarbeitungsverträge (AV)

Für jeden Dienstleister der personenbezogene Daten im Auftrag verarbeitet
(Cloud-Dienste, IT-Dienstleister, Lohnbuchhaltung etc.) ist ein AV-Vertrag
nach Art. 28 DSGVO erforderlich.

**Anlegen:** DSGVO → AV → **„+ Neuer AV"**

Felder: Dienstleistername, Zweck, Datenkategorien, Laufzeit, Vertragsanhang
(PDF-Upload möglich).

> **Mindestrolle für AV:** `contentowner`

---

## Datenschutz-Folgenabschätzung (DSFA)

Für Verarbeitungen mit **hohem Risiko** für die Rechte Betroffener ist eine DSFA
nach Art. 35 DSGVO zwingend. Typische Auslöser: systematische Überwachung,
Verarbeitung sensibler Kategorien, automatisierte Entscheidungen.

**Anlegen:** DSGVO → DSFA → **„+ Neue DSFA"**

Felder: Verarbeitungsbeschreibung, Notwendigkeit und Verhältnismäßigkeit,
identifizierte Risiken, Abhilfemaßnahmen, Genehmigungsstatus.

> **Mindestrolle für DSFA:** `contentowner`

---

## Datenpannen

Datenpannen mit Risiko für Betroffene müssen innerhalb von **72 Stunden** der
Aufsichtsbehörde gemeldet werden (Art. 33 DSGVO).

**Erfassen:** DSGVO → Datenpannen → **„+ Neue Datenpanne"**

Felder: Zeitpunkt, Art der Panne, betroffene Datenkategorien und Personenzahl,
wahrscheinliche Folgen, ergriffene Maßnahmen, Meldepflicht (ja/nein).

> **Mindestrolle:** `auditor` oder höher

---

## Betroffenenanfragen (DSAR)

Betroffene haben das Recht auf Auskunft, Berichtigung, Löschung und Übertragbarkeit
(Art. 15–22 DSGVO). Die Frist beträgt **einen Monat** (verlängerbar auf drei Monate).

**Erfassen:** DSGVO → DSAR → **„+ Neue Anfrage"**

Felder: Anfragetyp (Auskunft/Löschung/Berichtigung/Übertragung), Eingang, Frist,
Status (offen/in Bearbeitung/abgeschlossen), Notizen.

> **Mindestrolle:** `editor` oder höher — DSAR sind vertraulich

---

## Technisch-organisatorische Maßnahmen (TOMs)

TOMs dokumentieren die Schutzmaßnahmen nach Art. 32 DSGVO — sowohl technisch
(Verschlüsselung, Zugangskontrolle) als auch organisatorisch (Schulungen, Policies).

**Anlegen:** DSGVO → TOMs → **„+ Neue TOM"**

Felder: Kategorie (Zugriffskontrolle, Verschlüsselung, Protokollierung, Netzwerksicherheit, Anwendungssicherheit,
Backup & Wiederherstellung, Organisatorisch, Schulung, Datenaufbewahrung), Risikostufe, Beschreibung, Umsetzungsstand,
verknüpfte VVT-Einträge, Nachweis.

**Seit Version 1.80** liegen die TOMs im zentralen [Maßnahmenregister](module-measures.md) (Kennzeichen *TOM*). Sie erscheinen
dort zusammen mit allen anderen Maßnahmen, lassen sich nach Herkunft „Nur TOMs“ filtern und können zusätzlich
SoA-Controls zugeordnet werden. Die Rechte bleiben wie hier: Anlegen und Ändern nur ab `contentowner`.

---

## Datenschutzbeauftragter (DSB)

Unter DSGVO → DSB können die Kontaktdaten und das Bestellungsdokument des
Datenschutzbeauftragten hinterlegt werden (PDF-Upload). Die Angaben erscheinen
automatisch im DSGVO-Dashboard.

---

## Löschkonzept

Das Löschprotokoll dokumentiert die tatsächlich durchgeführten Löschungen —
wann welche Datenkategorie gelöscht wurde und nach welcher Frist.

**DSGVO → Löschprotokoll → „+ Eintrag"**

Fällige Löschungen (basierend auf den im VVT hinterlegten Fristen) erscheinen
als Hinweis im Dashboard.

---

## Dashboard

Das DSGVO-Dashboard gibt einen schnellen Überblick:
- Anzahl VVT-Einträge, offene DSAR, aktive Datenpannen
- TOMs nach Kategorie
- Fällige Löschungen
- DSB-Kontaktinfo

---

## Audit-Hinweis

Bei einer DSGVO-Prüfung durch die Aufsichtsbehörde werden typischerweise abgefragt:
VVT-Vollständigkeit, AV-Verträge für alle relevanten Dienstleister, DSFA für
Hochrisikoverarbeitungen, Nachweis der DSAR-Bearbeitung innerhalb der Frist,
und die TOM-Dokumentation. Das DSGVO-Modul deckt alle diese Punkte ab.
