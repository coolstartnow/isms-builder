# Modul: KI-Entwürfe (Policy-Assistent)

> Aus einem Dokument der Titelliste entsteht in Sekunden ein Textentwurf, den Sie prüfen, anpassen und speichern. Es gibt **zwei Wege**:
> den **direkten** über die angebundene KI (Ollama) und den über **Kopieren und Einfügen** mit einer KI Ihrer Wahl. Beide verwenden denselben, geprüften Text,
> und bei beiden werden Platzhalter automatisch mit den Daten Ihrer Organisation gefüllt.

> **Hinweis zu den Vorlagen:** Die Titel der Liste sind praxisbezogene Vorschläge. Jeder Entwurf muss **sorgfältig auf das eigene Unternehmen angepasst** und fachlich geprüft werden. Er ist **keine Rechtsberatung** und darf auch nicht als solche verstanden werden.

---

## Das Wichtigste auf einen Blick

| | Weg A: direkt | Weg B: Kopieren und Einfügen |
|---|---|---|
| Wer erzeugt den Text? | die angebundene KI (Ollama, meist auf dem eigenen Server) | eine KI Ihrer Wahl (Web, App, Firmen-KI) |
| Einrichtung | Administrator: Admin → Wartung → KI-Integration (Ollama) | keine |
| Was Sie tun | **Entwurf erzeugen** klicken | **Text kopieren**, in der KI einfügen, Antwort im Editor einfügen |
| Platzhalter | werden sofort gefüllt | werden beim Einfügen gefüllt (oder mit **Platzhalter füllen**) |
| Wohin geht der Text? | nur zu Ihrer Ollama-Adresse (steht im Dialog) | dorthin, wo Sie ihn einfügen: **dafür sind Sie verantwortlich** |

In beiden Fällen gilt: Der Text ist ein **Entwurf**. Prüfen Sie ihn fachlich, bevor Sie speichern und zur Freigabe geben.

---

## Gemeinsame Grundlagen

### Der Dialog „Mit KI entwerfen“

Öffnen Sie ein Dokument oder legen Sie ein neues an (Erstellen) und klicken Sie in der Werkzeugleiste des Editors auf **Mit KI entwerfen** (ab Rolle **Content Owner**). Im Dialog wählen Sie:

1. **Dokument** aus der Liste. Angeboten werden nur Dokumente, die zum Typ des geöffneten Dokuments passen (z. B. bei *Policy*: Informationssicherheitsrichtlinie, Passwortrichtlinie, Datensicherungsrichtlinie …).
2. **Sprache** des Textes: die **Sprachen, die Ihre Organisation ausgewählt hat** (Admin → Organisation → Sprachkonfiguration; sind alle ausgewählt, stehen alle zur Wahl). Vorbelegt ist die Sprache der Oberfläche. Der Anfragetext entsteht in der gewählten Sprache und muss nicht nachbearbeitet werden. Ist nur eine Sprache ausgewählt, gibt es nur diese eine Möglichkeit, und die Auswahl wird nicht angezeigt.
3. **Hinweis (optional)**, höchstens 200 Zeichen, z. B. „NIS2, Remote-Arbeit“.

Unter den Feldern zeigt der Dialog **genau den Text, der gesendet oder kopiert wird**, und das Ziel. Er ändert sich mit jeder Eingabe.

**Die Titelliste** hat 149 Einträge, geordnet nach Dokumenttyp. Sie deckt die üblichen Dokumente eines ISMS nach ISO 27001 und NIS2 ab und enthält ausdrücklich Vorlagen für **Künstliche Intelligenz** (Nutzung, Kennzeichnung KI-generierter Inhalte nach der Transparenzpflicht des EU AI Act, KI-generierte Bilder, Audio und Video, Governance und Risikoklassifizierung, KI-Kompetenz, vertrauliche Daten in KI-Diensten, Beschaffung von KI-Systemen, menschliche Aufsicht, Vorfälle mit KI). Es gibt bewusst **kein freies Titelfeld**, damit keine Namen oder Firmendaten in die Anfrage gelangen. Fehlt ein Dokument, schlagen Sie es bitte vor.

**Richtlinien (Policy)** (38): Informationssicherheitsrichtlinie; Richtlinie zur akzeptablen Nutzung; Zugriffssteuerungsrichtlinie; Passwortrichtlinie; Datensicherungsrichtlinie; Kryptografie-Richtlinie; Richtlinie für Remote-Arbeit; Lieferantensicherheitsrichtlinie; Richtlinie für den aufgeräumten Arbeitsplatz und Bildschirm; Richtlinie für mobile Geräte; Richtlinie zur Informationsklassifizierung; Richtlinie zur Nutzung von Künstlicher Intelligenz; Richtlinie zur Kennzeichnung KI-generierter Inhalte; Richtlinie zu KI-generierten Bildern, Audio- und Videoinhalten; Richtlinie zu KI-Governance und Risikoklassifizierung; Richtlinie zur KI-Kompetenz der Beschäftigten; Richtlinie zum Umgang mit vertraulichen Daten in KI-Diensten; Richtlinie zur Beschaffung und Bewertung von KI-Systemen; Datenschutzrichtlinie; Aufbewahrungs- und Löschrichtlinie; Richtlinie zur physischen Sicherheit; BYOD-Richtlinie (private Geräte); Richtlinie zur E-Mail- und Internetnutzung; Social-Media-Richtlinie; Cloud-Nutzungsrichtlinie; Netzwerksicherheitsrichtlinie; Richtlinie zum Schwachstellenmanagement; Richtlinie zu Protokollierung und Überwachung; Richtlinie zur sicheren Softwareentwicklung; Richtlinie zum Umgang mit Werten (Asset Management); Richtlinie zu Schulung und Sensibilisierung; Richtlinie zur Personalsicherheit; Richtlinie zum Business Continuity Management; Richtlinie für privilegierte Zugänge; Richtlinie für Wechseldatenträger; Richtlinie zu Rollen und Verantwortlichkeiten der Informationssicherheit; Richtlinie zur OT-/ICS-Sicherheit; Richtlinie zur Produktsicherheit (Cyber Resilience Act).

**Verfahren (Procedure)** (63): Änderungsmanagement-Verfahren; Verfahren für Eintritt, Wechsel und Austritt; Patch-Management-Verfahren; Verfahren zur Überprüfung von Zugriffsrechten; Verfahren zur Wiederherstellung von Daten; Schwachstellenmanagement-Verfahren; Verfahren zur koordinierten Schwachstellenmeldung (CVD); Verfahren zur Inventarisierung von Assets; Verfahren zur Auswertung von Protokollen; Verfahren zur Bearbeitung von Betroffenenanfragen; Verfahren für interne Audits; Verfahren für die Managementbewertung; Verfahren zur Lenkung dokumentierter Informationen; Verfahren für Korrekturmaßnahmen und ständige Verbesserung; Verfahren zur Lieferantenbewertung; Verfahren zur sicheren Entsorgung von Datenträgern; Verfahren zur Schlüsselverwaltung; Verfahren zur Risikobewertung und -behandlung; Verfahren zur Business-Impact-Analyse; Notfallwiederherstellungsverfahren (Disaster Recovery); Verfahren zur Erfassung und Risikoklassifizierung von KI-Systemen; Verfahren zur menschlichen Aufsicht über KI-Systeme; Verfahren zur Freigabe von KI-Anwendungsfällen; Konfigurationsmanagement-Verfahren; Verfahren zum Kapazitätsmanagement; Verfahren zum Schutz vor Schadsoftware; Verfahren für Penetrationstests und Sicherheitsprüfungen; Verfahren zur Vergabe und zum Entzug von Zugriffsrechten; Verfahren für privilegierte Zugriffe und Notfallzugänge; Verfahren zum Zurücksetzen von Passwörtern; Verfahren zur Überprüfung von Bewerbern und Beschäftigten; Verfahren zur Rückgabe von Geräten und Zugängen; Verfahren für Besucher und Fremdpersonal; Verfahren zur Zutrittskontrolle; Verfahren für den Umgang mit Datenträgern; Verfahren zur Kennzeichnung und Handhabung von Informationen; Verfahren für die sichere Datenübertragung; Verfahren zur Aufnahme neuer Lieferanten; Verfahren zur Beendigung von Lieferantenbeziehungen; Verfahren zur Datenschutz-Folgenabschätzung; Verfahren zur Pflege des Verzeichnisses von Verarbeitungstätigkeiten; Verfahren zur Einholung und Verwaltung von Einwilligungen; Verfahren zur Löschung personenbezogener Daten; Verfahren zum Abschluss von Auftragsverarbeitungsverträgen; Verfahren zur Meldung und Bewertung von Sicherheitsereignissen; Verfahren zur Beweissicherung (Forensik); Verfahren zur Nachbereitung von Vorfällen (Lessons Learned); Verfahren zur Prüfung von Notfall- und Wiederanlaufplänen; Verfahren zur Prüfung der Datensicherung; Verfahren zur Messung und Berichterstattung der Informationssicherheit; Verfahren zur Ermittlung und Bewertung rechtlicher Anforderungen; Verfahren zur Kompetenzfeststellung und Schulung; Verfahren für Abweichungen und Nichtkonformitäten; Verfahren für Ausnahmegenehmigungen; Verfahren zur Freigabe von Cloud-Diensten; Verfahren zur Freigabe und Installation von Software; Verfahren für Code-Reviews und Sicherheitstests in der Entwicklung; Verfahren zur Verwaltung von Zertifikaten; Verfahren für den Fernzugriff; Verfahren zu Datenqualität und Datenherkunft für KI; Verfahren zur Prüfung und Überwachung von KI-Systemen; Verfahren zur Information Betroffener über den KI-Einsatz; Verfahren zur Kennzeichnung KI-generierter Inhalte.

**Risikorichtlinien (Risk Policy)** (20): Risikomanagement-Richtlinie; Richtlinie zu Risikoakzeptanz und Risikokriterien; Risikomanagement-Richtlinie für KI-Systeme; Richtlinie zum Management von Lieferketten- und Drittparteirisiken; Richtlinie zur Risikobewertungsmethodik; Richtlinie zu Risikobereitschaft und Risikotoleranz; Richtlinie zur Risikobehandlung; Richtlinie zur Führung des Risikoregisters; Richtlinie zu Risikoberichterstattung und Eskalation; Richtlinie zu Risikoverantwortlichen (Risk Owner); Richtlinie zur Risikoüberwachung und -überprüfung; Richtlinie zum Datenschutz-Risikomanagement; Richtlinie zum Management von Cyberrisiken (NIS2); Richtlinie zum Risikomanagement in Projekten; Richtlinie zur Risikobewertung bei Änderungen; Richtlinie zu Betriebskontinuitätsrisiken; Richtlinie zum Umgang mit Insider-Risiken; Richtlinie zu Restrisiken und Risikoausnahmen; Richtlinie zur Folgenabschätzung für KI-Systeme; Richtlinie zur Bewertung von Werten und Schutzbedarf.

**Vorfälle (Incident)** (7): Incident-Response-Verfahren; Verfahren bei Datenschutzverletzungen; Meldeverfahren für erhebliche Sicherheitsvorfälle (NIS2); Notfallverfahren bei Ransomware; Verfahren bei Verlust oder Diebstahl von Geräten; Verfahren bei Vorfällen mit KI-Systemen; Krisenkommunikationsplan.

**Freigaben (Release)** (4): Freigabe- und Release-Verfahren; Verfahren für Notfalländerungen; Freigabeverfahren für KI-Systeme und Modelle; Freigabeverfahren für Software mit Sicherheitsprüfung.

**Anwendbarkeit (SoA)** (2): Erklärung zur Anwendbarkeit (SoA); Verfahren zur Pflege der Erklärung zur Anwendbarkeit.

**BCM-Pläne (BCM Plan)** (9; nur im BCM-Modul, Reiter Pläne, Feld „Verfahren“): Allgemeiner Business-Continuity-Plan; IT-Notfallplan (Disaster Recovery); Cyberangriff und Ransomware; Stromausfall; Gebäude- und Standortausfall; Ausfall eines kritischen Lieferanten; Pandemie und größerer Personalausfall; Krisenkommunikation; Wiederanlauf des Rechenzentrums.

**BCM-Übungen (BCM Exercise)** (6; nur im BCM-Modul, Reiter Übungen, Feld „Szenario und Ablauf“): Planspiel Ransomware; Wiederherstellungstest der Datensicherung; Räumung und Standortausfall; Lieferantenausfall; Test der Alarmierungskette; Übung Stromausfall.

### Was gesendet wird, und was nicht

Der Text besteht nur aus: einer festen Anweisung an die KI, dem Typ und Titel aus der Liste, einer Gliederungsvorgabe je Typ, der Zielsprache, der Bitte, **Platzhalter statt erfundener Angaben** zu verwenden, und Ihrem Hinweis. **Firmennamen, Personennamen, Adressen und Systemdaten Ihrer Installation sind nie enthalten.**

Der **Hinweis** ist das einzige Freitextfeld und wird geprüft:

- Erlaubt sind Buchstaben, Ziffern, Leerzeichen und `, . ; : ( ) / & + -`. Zeilenumbrüche und Anführungszeichen sind nicht möglich.
- **Blockiert** (nichts wird gesendet oder kopiert, der Dialog nennt den Fund) werden: E-Mail-Adressen, Internet- und Domainnamen, IP- und MAC-Adressen, IBAN, Telefonnummern, lange Zahlen (ab sechs Ziffern, z. B. Kundennummern), UUIDs, Schlüssel und Token, Dateipfade, @Namen, Firmenbezeichnungen wie GmbH, AG oder Ltd und **die Werte Ihrer Organisationsdaten** (Organisationsname, Kürzel, Namen von CISO und DSB).
- **Grenze:** Beliebige Personen- oder Firmennamen kann der Filter nicht erkennen. Schreiben Sie deshalb keine Namen in den Hinweis.

### Platzhalter

Statt Firmendaten zu erfinden, schreibt die KI Platzhalter. Sie werden aus den Organisationsdaten ersetzt:

| Platzhalter | Wird ersetzt durch | Wo Sie den Wert pflegen |
|---|---|---|
| `{{COMPANY_NAME}}` | Organisationsname | Admin → Organisation → Allgemeine Informationen → *Organisationsname* |
| `{{ISMS_OWNER}}` | Name der ISMS-Verantwortlichen Person | Admin → Organisation → Verantwortlichkeiten → *CISO / ISB Name* |
| `{{DATA_PROTECTION_OFFICER}}` | Name der Datenschutzbeauftragten Person | Admin → Organisation → Verantwortlichkeiten → *DSB / GDPO Name* |
| `{{ISMS_SCOPE}}` | ISMS-Geltungsbereich | Admin → Organisation → Allgemeine Informationen → *ISMS-Geltungsbereich* |

- Erkannt werden auch die Schreibweisen `[COMPANY_NAME]`, Klein- und Großschreibung sowie Leerzeichen innerhalb der Klammern (`{{ company name }}`).
- **Ist der Wert in den Organisationsdaten leer, bleibt der Platzhalter im Text stehen**, und ein Hinweis nennt ihn. Tragen Sie den Wert ein und klicken Sie auf **Platzhalter füllen**.
- Andere Klammern im Text (`{x}`, `[hier]`) bleiben unberührt. Nur diese vier Platzhalter werden ersetzt.

---

## Weg A: direkt über die angebundene KI

### Einrichtung (einmalig, Administrator)

1. **Admin → Wartung → KI-Integration (Ollama).**
2. Den Schalter **KI-Suche aktivieren** einschalten. Er ist der globale Schalter für alle KI-Funktionen, auch für die Entwürfe.
3. **Ollama-URL** eintragen. Leer bedeutet `http://localhost:11434`.
4. **Generierungs-Modell (AI Policy Assistant)** eintragen. Leer bedeutet `llama3.2:3b`. Das Modell muss auf dem Ollama-Server vorhanden sein.
5. Optional den **API-Schlüssel** eintragen, wenn die KI-Adresse einen verlangt oder wenn Sie die Anfragen im Protokoll eines vorgeschalteten Gateways erkennen wollen (Einzelheiten: Administrationskonsole → KI-Integration). Der Schlüssel wird nie wieder angezeigt.

### Ablauf

1. Dialog **Mit KI entwerfen** öffnen, Dokument, Sprache und optional einen Hinweis wählen.
2. Den angezeigten Text und das Ziel prüfen. Bei einem Fund im Hinweis ist **Entwurf erzeugen** gesperrt, bis er behoben ist.
3. **Entwurf erzeugen** klicken. Enthält der Editor schon Text, fragt ISMS Builder vor dem Überschreiben nach.
4. Der Entwurf steht im Editor, die Platzhalter sind gefüllt. Ist das Titelfeld leer, wird der Titel der Liste übernommen. Offene Platzhalter werden gemeldet.
5. Prüfen, anpassen, **Speichern**. Das Dokument bleibt im Status *Entwurf*.

Das Erzeugen kann bis zu 60 Sekunden dauern. Im Audit-Log steht, wer welches Dokument in welcher Sprache erzeugt hat (und ob ein Hinweis verwendet wurde, nicht dessen Text).

### Wenn es nicht klappt

| Meldung | Bedeutung und Abhilfe |
|---|---|
| Die direkte KI-Anbindung ist ausgeschaltet | Der Schalter in Admin → Wartung ist aus. Einschalten oder Weg B nutzen. |
| Ollama nicht erreichbar | Adresse falsch, Ollama läuft nicht oder die Firewall blockiert. Ollama-URL prüfen. |
| Ollama antwortete mit HTTP …  | Ollama hat einen Fehler gemeldet, zum Beispiel weil das Modell dort nicht vorhanden ist. Modellnamen und Ollama prüfen. |
| Leere oder zu kurze Antwort | Das Modell hat nichts Brauchbares geliefert. Erneut versuchen oder ein größeres Modell eintragen. |
| Nicht gesendet, der Hinweis enthält … | Der Filter hat eine personenbezogene oder technische Angabe gefunden. Hinweis ändern oder leeren. |

---

## Weg B: Kopieren und Einfügen mit einer KI Ihrer Wahl

Dieser Weg braucht keine Einrichtung und funktioniert auch, wenn die direkte Anbindung ausgeschaltet ist (der Dialog öffnet sich trotzdem).

1. Dialog **Mit KI entwerfen** öffnen, Dokument, Sprache und optional Hinweis wählen.
2. **Text kopieren** klicken (oder den angezeigten Text selbst markieren und kopieren). Bei einem Fund im Hinweis ist der Knopf gesperrt.
3. In der KI Ihrer Wahl **nur diesen Text** einfügen und absenden. Ergänzen Sie ihn nicht um Firmen- oder Personendaten: Genau dafür gibt es die Platzhalter.
4. Die **Antwort der KI** kopieren, am besten nur den Markdown-Text, **ohne** die Zeilen mit drei Gravis-Zeichen (```), die manche KI um den Text setzt.
5. In den Editor des Dokuments **einfügen** (Strg+V). Enthält der Text Platzhalter, ersetzt ISMS Builder sie sofort und meldet, wie viele ersetzt wurden und welche offen bleiben.
6. Text im Editor, der schon vorher da war? Klicken Sie auf **Platzhalter füllen**, das ersetzt im gesamten Text.
7. Prüfen, anpassen, **Speichern**.

**Datenschutz bei Weg B:** Der kopierte Text enthält keine Daten Ihrer Organisation, und der Filter hat den Hinweis geprüft. Was die KI Ihrer Wahl damit macht, richtet sich nach deren Bedingungen. Verwenden Sie dort Dienste, die Ihre Organisation für solche Inhalte freigegeben hat. Das Einfügen der Antwort in ISMS Builder ersetzt die Platzhalter lokal; der Name Ihrer Organisation geht dabei nirgendwohin.

---

## Fragen und Antworten

**Warum steht in meinem Text noch `{{COMPANY_NAME}}`?** Der Wert fehlt in den Organisationsdaten, oder der Text kam nicht per Einfügen in den Editor (zum Beispiel per Ziehen mit der Maus). Wert eintragen und **Platzhalter füllen** klicken.

**Die KI hat eigene Platzhalter wie `[Firmenname]` verwendet.** Sie werden nicht automatisch ersetzt, weil ISMS Builder nur die vier bekannten Platzhalter kennt. Bitten Sie die KI, genau die Platzhalter aus dem kopierten Text zu verwenden, oder ersetzen Sie die Stellen von Hand.

**Wer darf das?** Der Dialog und der direkte Weg ab Rolle *Content Owner* (dieselbe Berechtigung wie zum Anlegen eines Dokuments). **Platzhalter füllen** und das automatische Ersetzen beim Einfügen ab Rolle *Editor*.

**Kann ich den Titel frei wählen?** Nicht für den Entwurf. Nach dem Einfügen des Textes können Sie das Titelfeld im Editor wie gewohnt ändern.

**Gilt das auch in der Mobile App?** Dort gibt es die direkte Anbindung nicht. Die Übergabe an eine KI-App über das Android-Teilen-Menü ist in Planung.
