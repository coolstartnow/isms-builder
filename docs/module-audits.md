# Modul: Audit-Management

> Audits planen, durchführen und nachverfolgen — von der Prüfcheckliste über die Feststellungen
> bis zum Jahres-Auditprogramm (ISO 27001 Kapitel 9.2, ISO 19011).

---

## Wozu Audit-Management?

ISO 27001 verlangt interne Audits in geplanten Abständen und ein Auditprogramm, das Häufigkeit,
Methoden, Verantwortlichkeiten und Berichte festlegt. Das Modul bündelt das an einer Stelle:
das **Audit** als Objekt, **Prüfpunkte** mit Ergebnis, daraus entstehende **Feststellungen**
(Findings) und das **Auditprogramm** als Jahresplan.

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Audits und Auditprogramme ansehen | `reader` |
| Audits, Prüfpunkte, Auditprogramme anlegen und bearbeiten | `auditor` oder `contentowner` |
| Auditprogramm freigeben / zurück in den Entwurf | `auditor` oder `contentowner` |
| Endgültig löschen oder aus dem Papierkorb wiederherstellen | `admin` |

Der Menüpunkt **Audits** ist ab `contentowner` sichtbar sowie für die Funktionen CISO, Revision und QMB.
Administratoren können das Modul unter **Admin → System** abschalten.

---

## Audit anlegen

**Audits → „Neues Audit“**

- **Titel**, **Art des Audits** (intern, extern, Lieferantenaudit, Zertifizierung) und **Status**
  (geplant, laufend, abgeschlossen, abgebrochen).
- **Standard / Norm** und **Auditumfang**, betroffene **Gesellschaften**, bei Lieferantenaudits der **Lieferant**.
- **Leitender Auditor** und **Auditteam**.
- **Geplanter Beginn / Ende**, **tatsächlicher Beginn / Ende** und eine **Wiedervorlage**.
- **Auditprogramm**: Zuordnung zu einem Jahresplan (optional).
- **Fazit / Ergebnis**.

Jedes Audit bekommt eine Referenz **AUD-JJJJ-NNNN**. Die Liste lässt sich nach Status, Art und Jahr filtern.

---

## Prüfpunkte

Im Audit-Detail liegt die **Prüfcheckliste**. Jeder Prüfpunkt hat

- einen **Control-Bezug** (Auswahl aus dem SoA, optional),
- die **Prüffrage / Anforderung**,
- ein **Ergebnis**: offen, konform, **Abweichung** oder nicht anwendbar,
- **Nachweis** und **Anmerkungen**.

Das Ergebnis lässt sich direkt in der Zeile umstellen. Bei einer **Abweichung** erscheint die Schaltfläche
**„Finding erzeugen“**: Sie legt eine Feststellung an und füllt sie vor (Prüffrage als SOLL-Zustand,
Anmerkungen als IST-Zustand, Auditor, Audit-Zeitraum, Control-Verknüpfung). Pro Prüfpunkt entsteht nur ein Finding;
es ist anschließend im Prüfpunkt verlinkt.

---

## Feststellungen einem Audit zuordnen

Findings, die aus einem Prüfpunkt entstehen, gehören automatisch zum Audit. Bereits vorhandene Findings lassen
sich im Findings-Formular über **Audit** zuordnen (oder wieder lösen). Das Audit-Detail listet alle
zugeordneten Feststellungen.

---

## Auditprogramm (Jahresplan)

**Audits → Reiter „Auditprogramm“ → „Neues Auditprogramm“**

Ein Programm hat **Jahr**, **Ziele** und **Umfang** und bekommt die Referenz **AP-JJJJ-NNNN**. Audits werden über das
Audit-Formular zugeordnet (oder direkt im Programm über **„Audit zu diesem Programm anlegen“**). Die Programmansicht
zeigt die Audits **nach Quartal** des geplanten Beginns; Audits ohne Termin stehen in einer eigenen Gruppe.

**Freigabe:** Mit **„Freigeben“** wird das Programm mit Benutzer und Datum festgehalten und gesperrt. Zum
Überarbeiten setzt man es mit **„Zurück in den Entwurf“** wieder frei.

---

## Kalender und Dashboard

Im **Kalender** erscheinen für jedes Audit der geplante Beginn, das geplante Ende (solange nicht abgeschlossen)
und die Wiedervorlage. Das **Dashboard** zeigt die Kennzahlen Audits gesamt, überfällig, in den nächsten 30 Tagen
und offene Abweichungen. Überfällig ist ein geplantes oder laufendes Audit, dessen geplantes Ende verstrichen ist.

---

## Export

- **Auditliste:** CSV und PDF (berücksichtigt die aktiven Filter).
- **Auditbericht:** im Audit-Detail über **„Auditbericht“** — Stammdaten, Prüfpunkte, Feststellungen und Fazit als PDF.
- **Auditprogramm:** CSV und PDF mit dem Quartalsplan.

Das PDF entsteht über den Druckdialog des Browsers.

---

## Papierkorb

Gelöschte Audits und Auditprogramme liegen 30 Tage im Papierkorb (**Admin → Papierkorb**) und können von
Administratoren wiederhergestellt oder endgültig gelöscht werden.

---

## Audit-Hinweis

Alle Änderungen werden im Audit-Log protokolliert. Das Audit-Management ersetzt keinen Auditbericht im Sinne
einer Zertifizierungsstelle, liefert aber die Nachweise für Planung, Durchführung und Nachverfolgung nach ISO 27001 Kapitel 9.2.
