# Modul: Datenschutz-Folgenabschätzung (DSFA)

> Eine DSFA beschreibt eine geplante Verarbeitung, bewertet ihre Risiken für die betroffenen Personen und legt Maßnahmen fest. Der **Verantwortliche erstellt sie selbst**, der **Datenschutzbeauftragte (DSB) prüft** sie und gibt eine Stellungnahme ab. ISMS Builder liefert dafür Vorlagen, eine Vorabprüfung, einen Prüfablauf und einen Ausdruck. Alles Weitere zum Modul steht im Leitfaden „Modul: DSGVO (Datenschutz)“.

> **Hinweis:** Alle Vorlagen und die Vorabprüfung sind praxisbezogen, müssen aber **sorgfältig auf das eigene Unternehmen angepasst** werden. Sie sind **keine Rechtsberatung** und dürfen auch nicht als solche verstanden werden; sie ersetzen weder die Bewertung Ihres Einzelfalls noch die Prüfung durch den DSB. Nationale Listen der Aufsichtsbehörden prüfen Sie selbst.

---

## Wer macht was?

| Rolle | Aufgabe |
|---|---|
| Fachbereich / Verantwortlicher (ab Rolle **Content Owner**) | führt die Vorabprüfung durch, wählt die Vorlage, füllt die DSFA aus und gibt sie zur Prüfung |
| **DSB** (Konto mit der Funktion *DSB* oder Administrator) | prüft die DSFA und trägt die **Stellungnahme** ein |
| Verantwortliche Leitung (Content Owner) | trifft die **Entscheidung**, begründet sie und gibt die DSFA frei |

Der DSB ist **nicht der Verfasser**. Eine Stellungnahme können nur Konten mit der Funktion *DSB* und Administratoren eintragen; der Server speichert Person und Datum.

**Demo:** Im Demoset gibt es dafür zwei getrennte Konten ohne Administratorrechte: **carla** (`carla@security.example` / `carlapass`) mit der Funktion CISO und **dana** (`dana@privacy.example` / `danapass`) mit der Funktion DSB. Prüfablauf testen: mit **carla** die DSFA vorbereiten, mit **dana** die Stellungnahme eintragen, mit **carla** freigeben. **carla** darf die Stellungnahme nicht eintragen.

---

## Ablauf in sechs Schritten

1. **GDPR → DSFA → Vorabprüfung: Braucht es eine DSFA?** Ankreuzen, was auf Ihre Verarbeitung zutrifft (siehe unten). Das Ergebnis wird mit der DSFA gespeichert.
2. **Weiter mit Vorlage**, oder jederzeit **Vorlage verwenden**: die Art der Verarbeitung wählen. Das Formular wird vorbelegt.
3. **Ausfüllen:** Beschreibung (Zweck, Betroffene, Datenarten, Empfänger, Speicherort, Fristen), Notwendigkeit und Verhältnismäßigkeit, vorhandene Maßnahmen, die **Risiken mit ihren Maßnahmen** und das **Restrisiko**. Die Wahrscheinlichkeit und die Auswirkung (1 bis 5) in den Vorlagen sind Vorschläge: Prüfen und ändern Sie sie. Maßnahmen stehen eine je Zeile unter dem Risiko.
4. **Status „Prüfung“** setzen. Der DSB liest die DSFA.
5. **Stellungnahme des DSB:** Der DSB setzt **DSB konsultiert** und trägt die **Stellungnahme** ein.
6. **Entscheidung und Freigabe:** Entscheidung (fortfahren, ändern, ablehnen) wählen und begründen, dann den Status **Freigegeben** setzen.

Danach: mit **PDF** drucken oder ablegen (Firmenlogo im Kopf, DSB-Stellungnahme mit Person und Datum, Freigabe) und die DSFA bei Änderungen der Verarbeitung überprüfen.

---

## Vorabprüfung: Braucht es eine DSFA?

Die Vorabprüfung fragt zuerst die **Fälle nach Art. 35 Abs. 3 DSGVO** ab. Trifft einer zu, ist eine DSFA erforderlich:

- Systematische und umfassende Bewertung persönlicher Aspekte natürlicher Personen auf Grundlage automatisierter Verarbeitung einschließlich Profiling, mit Entscheidungen, die rechtliche Wirkung haben oder die Personen erheblich beeinträchtigen
- Umfangreiche Verarbeitung besonderer Kategorien personenbezogener Daten (Art. 9) oder von Daten über strafrechtliche Verurteilungen und Straftaten (Art. 10)
- Systematische umfangreiche Überwachung öffentlich zugänglicher Bereiche

Dann die **neun Kriterien der Leitlinie WP 248** der europäischen Datenschutzbehörden. Treffen **zwei oder mehr** zu, ist in der Regel eine DSFA nötig:

1. Bewertung oder Scoring (einschließlich Profiling und Vorhersagen)
2. Automatisierte Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung
3. Systematische Überwachung von Personen
4. Sensible oder höchstpersönliche Daten (z. B. Gesundheit, Biometrie, Finanzen, Standort)
5. Verarbeitung in großem Umfang (viele Personen, große Datenmenge, große Fläche oder lange Dauer)
6. Abgleich oder Zusammenführung von Datensätzen aus verschiedenen Quellen
7. Daten schutzbedürftiger Personen (z. B. Beschäftigte, Kinder, Patienten)
8. Einsatz neuer oder innovativer Technik (z. B. KI, Biometrie, Internet der Dinge)
9. Die Verarbeitung hindert Personen an der Ausübung von Rechten oder der Nutzung einer Leistung oder eines Vertrags

**Ergebnis:**

- Eine DSFA ist erforderlich (Art. 35 Abs. 3 DSGVO).
- Eine DSFA ist wahrscheinlich erforderlich (zwei oder mehr Kriterien der Leitlinie WP 248 treffen zu). Sie muss begründen, wenn Sie darauf verzichten.
- Eine DSFA ist nicht zwingend. Dokumentieren Sie das Ergebnis dieser Prüfung und prüfen Sie die Listen der Aufsichtsbehörde Ihres Landes.

Die Listen der Aufsichtsbehörde Ihres Landes, in denen Fälle benannt sind, in denen eine DSFA verlangt oder nicht verlangt wird, prüfen Sie selbst. Wer auf eine DSFA verzichtet, dokumentiert die Gründe, zum Beispiel in einem archivierten Datensatz.

---

## Die Vorlagen

Die Vorlage legt Beschreibungsgerüst, Rechtsgrundlagen, typische Risiken mit Maßnahmen und Vorschlagswerte an. Sie enthält keine Firmendaten außer dem Platzhalter `{{COMPANY_NAME}}`, der aus den Organisationsdaten gefüllt wird (Admin → Organisation). Angebotene Verarbeitungsarten:

- **HR-Software in der Cloud (Personalverwaltung und Entgeltabrechnung)**: Personalverwaltung, Gehaltsabrechnung und Personalentwicklung mit einer cloudbasierten HR-Software.
- **Videoüberwachung**: Schutz von Eigentum und Personen, Aufklärung von Straftaten in definierten Bereichen.
- **Mitarbeiterüberwachung und Ortung (Arbeitszeit, Standort, Leistung)**: Arbeitszeiterfassung, Fahrzeug- oder Geräteortung, Nutzungs- und Leistungsauswertung.
- **KI-Dienst mit personenbezogenen Daten (z. B. Assistent, Chatbot, Auswertung)**: Einsatz eines KI-Dienstes zur Unterstützung von Aufgaben, bei dem personenbezogene Daten verarbeitet werden können.
- **Profiling und Scoring von Kunden**: Bewertung von Kunden (Bonität, Kaufverhalten, Segmentierung) auf Grundlage automatisierter Verarbeitung.
- **Gesundheitsdaten (betriebliches Eingliederungsmanagement, Betriebsarzt)**: Umgang mit Gesundheitsdaten von Beschäftigten, etwa Wiedereingliederung nach Krankheit und arbeitsmedizinische Vorsorge.
- **Biometrische Zugangskontrolle und Zeiterfassung**: Zutritt zu Räumen oder Systemen bzw. Zeiterfassung mit Fingerabdruck, Gesicht oder anderen biometrischen Merkmalen.
- **Hinweisgebersystem (Meldestelle)**: Entgegennahme, Prüfung und Bearbeitung von Hinweisen auf Verstöße über eine interne oder externe Meldestelle.
- **Bewerbermanagement (optional mit KI-Vorauswahl)**: Entgegennahme, Auswahl und Verwaltung von Bewerbungen, gegebenenfalls mit automatisierter Vorauswahl.

Was Sie ergänzen müssen: die konkreten Angaben zu **Ihrer** Verarbeitung (Empfänger, Anbieter, Speicherort, Fristen, Rechtsgrundlage im Einzelfall), die Prüfung der vorgeschlagenen Risiken und Werte und die Maßnahmen, die Sie tatsächlich umgesetzt haben.

---

## Regeln der Freigabe

| Regel | Wirkung |
|---|---|
| Neue DSFA | kann nicht sofort freigegeben werden |
| Stellungnahme | nur *DSB*-Funktion oder Administrator; Person und Datum werden gespeichert |
| Freigabe | nur mit **DSB konsultiert** und eingetragener Stellungnahme, einer **Entscheidung** und, bei **hohem oder kritischem Restrisiko**, einer **Begründung** oder dem Haken **Konsultation der Aufsichtsbehörde erforderlich** |
| Freigabe-Stempel | Person und Datum setzt der Server; bei Rücksetzen des Status entfällt er |
| Audit-Log | Anlegen, Änderungen und Statuswechsel werden protokolliert |

Bereits freigegebene DSFA aus früheren Versionen bleiben gültig; die Regeln gelten bei der nächsten Statusänderung.

**Fehlermeldungen:** „Freigabe setzt die Stellungnahme des Datenschutzbeauftragten voraus“ (Stellungnahme fehlt), „Freigabe setzt eine Entscheidung voraus“, „Bei hohem Restrisiko …“ (Begründung ergänzen oder Konsultation der Aufsichtsbehörde ankreuzen), „Die Stellungnahme des DSB dürfen nur der DSB oder ein Administrator eintragen“.

---

## Ausdruck

**PDF** (in der Liste und im Formular) öffnet eine Druckansicht mit Firmenlogo, Beschreibung, Notwendigkeit, Risikotabelle mit Maßnahmen, Restrisiko, DSB-Stellungnahme, Entscheidung und Freigabe. Im Druckdialog können Sie als PDF speichern.
