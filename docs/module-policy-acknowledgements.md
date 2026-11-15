# Modul: Policy Acknowledgements (Richtlinien-Bestätigung)

> Nachweisbare Verteilung und Bestätigung von Richtlinien durch Mitarbeitende —
> ein zentrales Audit-Dokument für ISO 27001.

---

## Was ist eine Policy Acknowledgement?

ISO 27001 fordert nicht nur dass Richtlinien existieren, sondern dass sie den betroffenen
Personen **bekannt gemacht** wurden und diese ihr **Verständnis bestätigt** haben
(Anforderung 7.3 und A.6.3). Der klassische Nachweis: eine unterschriebene Empfangsbestätigung.

Das ISMS Builder automatisiert diesen Prozess vollständig:
- Richtlinie auswählen → Verteiler definieren → Link per E-Mail versenden
- Empfänger bestätigt über einen personalisierten Link (kein Login erforderlich)
- Der Empfänger sieht die Richtlinie **lesbar formatiert** (gerendertes Markdown: Überschriften, Tabellen, Listen), nicht mehr im Rohformat
- Vollständige Nachweisdokumentation mit Zeitstempel und CSV-Export

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Kennzahlen im Dashboard sehen („Aktive Verteilrunden“, „Ausstehende Bestätigungen“) | `reader` |
| Verteilungsübersicht und Details der Bestätigungen einsehen (Menüpunkt „Richtlinien-Bestätigungen“) | `contentowner` |
| Verteilung anlegen und versenden | `contentowner` |
| Erinnerung verschicken | `contentowner` |
| Bestätigung manuell erfassen oder importieren | `contentowner` |
| Verteilung löschen | `admin` |

Reader sehen nur die zusammengefassten Zahlen im Dashboard. Die Empfängerlisten mit E-Mail-Adresse, Name, Zeitpunkt und IP-Adresse der Bestätigung sind dem Content Owner vorbehalten, weil sie personenbezogene Daten enthalten.

---

## Workflow: Richtlinie verteilen

**Schritt 1 — Verteilung anlegen**
Im Menü **„Policy Acknowledgements"** auf **„+ Neue Verteilung"** klicken.

**Schritt 2 — Pflichtfelder**
- **Richtlinie wählen** — nur Templates mit Status `approved` sind auswählbar
- **Titel der Verteilung** — z.B. „Passwort-Policy 2026 – Jahresverteilung"
- **Fälligkeitsdatum** — bis wann muss die Bestätigung vorliegen?
- **Empfänger** — Namen und E-Mail-Adressen der zu benachrichtigenden Personen

**Schritt 3 — Versenden**
Über **„Versenden"** erhält jeder Empfänger eine E-Mail mit einem **personalisierten
Bestätigungslink**. Der Link ist an die Person gebunden und funktioniert ohne Login.

**Schritt 4 — Bestätigung durch Empfänger**
Der Empfänger öffnet den Link, sieht den vollständigen Policy-Text und klickt
**„Ich bestätige, diese Richtlinie gelesen und verstanden zu haben"**.
Zeitstempel und IP-Adresse werden gespeichert.

**Schritt 5 — Status verfolgen**
In der Verteilungsübersicht ist der Stand jederzeit sichtbar:
- Wer hat bestätigt (mit Zeitstempel)
- Wer hat noch nicht bestätigt
- Wie viel Prozent sind abgeschlossen

---

## Erinnerungsfunktion

Über **„Erinnerung senden"** erhalten alle Empfänger die noch nicht bestätigt haben
eine erneute E-Mail mit demselben personalisierten Link.

---

## Manuelle Bestätigung und Import

Für Personen ohne E-Mail-Zugang (z.B. Produktionsmitarbeitende):

**Einzeln erfassen:** In der Verteilung auf **„Bestätigung erfassen"** — Name,
Datum und optionale Notiz eingeben.

**CSV-Import:** Sammelimport über eine CSV-Datei mit den Spalten
`name, email, confirmedAt` (Format: ISO 8601).

---

## Export und Nachweis

Über **„CSV exportieren"** in der Verteilung wird eine vollständige Bestätigungsliste
heruntergeladen — geeignet als Audit-Nachweis:

```
name, email, confirmedAt, method
Max Mustermann, m.mustermann@firma.de, 2026-03-15T10:23:00Z, link
Anna Schmidt, a.schmidt@firma.de, 2026-03-16T08:45:00Z, manual
```

---

## Audit-Hinweis

Der Auditor erwartet für jede sicherheitsrelevante Policy den Nachweis der Bekanntmachung.
Die CSV-Exports der Verteilungen sind dafür das geeignete Dokument. Empfehlung:
- Jährliche Verteilung aller aktiven Policies
- Bei Policy-Änderungen: neue Verteilung auslösen
- Exports im Dokumentenmanagementsystem archivieren
