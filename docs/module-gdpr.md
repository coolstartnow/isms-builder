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

> **Ausführlich:** Vorlagen, Vorabprüfung, DSB-Prüfung und Ausdruck stehen im Leitfaden „Modul: Datenschutz-Folgenabschätzung (DSFA)“ (`docs/module-dsfa.md`).

---

## Vorlagen für Einträge

Zu jedem Reiter gibt es Vorlagen, die ein neues Formular mit einem praxisbezogenen Vorschlag vorbelegen: **Verarbeitungstätigkeiten (VVT)**, **AV-Verträge**, **Datenpannen**, **Betroffenenrechte** (Antwortschreiben) und **TOMs**. Für die **DSFA** gibt es eigene Vorlagen, siehe den Leitfaden „Modul: Datenschutz-Folgenabschätzung (DSFA)“.

**So geht es:** Im jeweiligen Reiter auf **Vorlage verwenden** klicken, die Vorlage auswählen und **Vorlage übernehmen**. Das Formular öffnet sich mit dem Vorschlag. Sie prüfen, passen an und speichern. Erst mit dem Speichern entsteht ein Eintrag; die Vorlage selbst wird nie verändert.

> **Wichtig:** Alle Vorlagen sind praxisbezogen, müssen aber **sorgfältig auf das eigene Unternehmen angepasst** werden. Sie sind **keine Rechtsberatung** und dürfen auch nicht als solche verstanden werden. Fristen, Rechtsgrundlagen und Aufbewahrungsdauern sind Vorschläge, die Sie nach dem für Sie geltenden Recht prüfen müssen. Namen, Anbieter, Zahlen und Zuständigkeiten tragen Sie selbst ein.

### Verarbeitungstätigkeiten (VVT) (14)

Vorbelegt werden Zweck, Rechtsgrundlage, Datenkategorien, Betroffene, Empfänger, Aufbewahrung und Löschverfahren; „Hohes Risiko“ ist nur dort gesetzt, wo es meist zutrifft. Die Aufbewahrungsmonate sind nur gesetzt, wo ein kurzer Richtwert üblich ist.

Betrieb der Website und Webanalyse; Bewerbermanagement; Buchhaltung und Rechnungswesen; Hinweisgebersystem (Meldestelle); IT-Betrieb, Protokollierung und Informationssicherheit; Kontaktformular und allgemeine Anfragen; Kundensupport und Ticketsystem; Kundenverwaltung (CRM); Lieferanten- und Geschäftspartnerverwaltung; Newsletter und E-Mail-Marketing; Personalverwaltung und Entgeltabrechnung; Veranstaltungen und Schulungen; Videoüberwachung; Zeiterfassung und Zutrittskontrolle.

### AV-Verträge (12)

Vorbelegt werden Titel und Verarbeitungsumfang. Auftragsverarbeiter, Land, Vertragsdaten und die **Art.-28-Checkliste** bleiben leer; Sie haken nur ab, was der Vertrag tatsächlich enthält.

Aktenvernichtung und Datenträgerentsorgung; Backup- und Archivdienst; Callcenter und Kundenservice-Dienstleister; Cloud-Hosting und Rechenzentrum; CRM- und Marketing-Software; E-Mail-, Kalender- und Kollaborationsdienst; HR- und Lohnabrechnungssoftware (SaaS); IT-Dienstleister, Wartung und Fernwartung; KI-Dienst (z. B. Assistent oder Textverarbeitung); Support- und Ticketsystem; Videoüberwachung und Sicherheitsdienst; Webhosting und Website-Agentur.

### Datenpannen (10)

Vorbelegt werden Typ, Datenkategorien, Betroffene, Sofortmaßnahmen, Folgemaßnahmen, Risiko und ein **Vorschlag**, ob die Aufsichtsbehörde und die Betroffenen zu benachrichtigen sind. Ob eine Meldung erforderlich ist, entscheiden Sie im Einzelfall.

Diebstahl oder Verlust von Papierunterlagen; Fehlkonfiguration: Daten öffentlich oder zu weit freigegeben; Fehlversand einer E-Mail oder eines Dokuments; Missbrauch von Zugriffsrechten durch Beschäftigte; Phishing mit Preisgabe von Zugangsdaten; Ransomware-Angriff; Unbefugter Zugriff durch ein kompromittiertes Konto; Verlust oder Diebstahl eines Laptops, Smartphones oder Datenträgers; Versehentliche Löschung oder Veränderung von Daten; Versehentliche Veröffentlichung personenbezogener Daten.

### Betroffenenrechte, Antwortschreiben (10)

Vorbelegt wird der Antworttext mit Anfangs- und Schlusssatz. Die Platzhalter `{{COMPANY_NAME}}` und `{{DATA_PROTECTION_OFFICER}}` werden aus den Organisationsdaten gefüllt. Zusätzlich gibt es Texte für die Nachforderung eines Identitätsnachweises, die Fristverlängerung und die Ablehnung; offene Stellen stehen in Klammern.

Ablehnung eines Antrags (Art. 12 Abs. 4 und 5); Antwort auf ein Auskunftsersuchen (Art. 15); Antwort auf ein Berichtigungsverlangen (Art. 16); Antwort auf ein Löschverlangen (Art. 17); Antwort auf ein Verlangen auf Datenübertragbarkeit (Art. 20); Antwort auf ein Verlangen auf Einschränkung der Verarbeitung (Art. 18); Antwort auf einen Widerspruch (Art. 21); Antwort zu automatisierten Entscheidungen (Art. 22); Mitteilung über die Fristverlängerung (Art. 12 Abs. 3); Nachforderung eines Identitätsnachweises (Art. 12 Abs. 6).

### TOMs (24)

Vorbelegt werden Titel, Kategorie, Beschreibung und Umsetzungshinweise; der Status ist „Geplant“. Was tatsächlich umgesetzt ist, tragen Sie selbst ein.

Aufbewahrungsfristen und Archivierung; Auswahl und Kontrolle von Auftragsverarbeitern; Clean Desk und Bildschirmsperre; Datenschutz- und Awareness-Schulung; Datenschutzmanagement und Einbindung des DSB; Datensicherung und getestete Wiederherstellung; Eingabekontrolle (Nachvollziehbarkeit von Änderungen); Festplatten- und Geräteverschlüsselung; Firewall und Netzwerksegmentierung; Löschkonzept; Mehrfaktor-Authentifizierung; Notfall- und Wiederanlaufplanung; Patch- und Schwachstellenmanagement; Protokollierung und Auswertung; Prozess für Datenschutzverletzungen; Pseudonymisierung und Anonymisierung; Rollenbasiertes Berechtigungskonzept; Schutz vor Schadsoftware; Sichere Entwicklung und Schutz von Testdaten; Transportverschlüsselung (TLS) und gesicherte Fernzugänge; Trennungskontrolle und Zweckbindung; Verpflichtung zur Vertraulichkeit; Verschlüsselung von Datensicherungen und mobilen Datenträgern; Zutrittskontrolle zu Gebäuden und Serverräumen.

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
