# Templates: Nutzung im ISMS Builder

> Templates sind das zentrale Arbeitsmittel im ISMS Builder. Hier wird erklärt wie man
> Templates anlegt, bearbeitet, durch den Genehmigungsprozess führt und mit anderen
> Modulen verknüpft.

---

## Was ist ein Template?

Ein Template ist ein versioniertes, statusgeführtes Dokument — z.B. eine Policy, eine
Procedure oder ein Release-Dokument. Jedes Template durchläuft einen definierten
Lebenszyklus und kann mit Controls (SoA), Risiken und anderen Templates verknüpft werden.

Die verfügbaren Template-Typen sind:

| Typ | Zweck | Separate Doku |
|---|---|---|
| **policy** | Verbindliche Vorgaben (Was gilt?) | [template-type-policy.md](template-type-policy.md) |
| **procedure** | Arbeitsanweisungen (Wie wird es gemacht?) | [template-type-procedure.md](template-type-procedure.md) |
| **soa** | Begleitdokumente zum SoA-Prozess | [template-type-soa.md](template-type-soa.md) |
| **incident** | Incident-Response-Pläne und Vorlagen | [template-type-incident.md](template-type-incident.md) |
| **release** | Freigabe- und Änderungsdokumente | [template-type-release.md](template-type-release.md) |

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Templates lesen | `reader` |
| Template bearbeiten (Inhalt, Status ändern) | `editor` |
| Template anlegen, verschieben, löschen | `contentowner` |
| Template dauerhaft löschen, wiederherstellen | `admin` |

---

## Template anlegen

**Schritt 1 — Typ wählen**
In der Sidebar unter dem gewünschten Template-Typ (z.B. „Policy") auf **„+ Neu"** oder
den Erstellen-Button klicken. Alternativ: oben in der Sidebar auf „Erstellen" und dann
den Typ auswählen.

**Schritt 2 — Pflichtfelder ausfüllen**
- **Titel** — eindeutiger Name (z.B. „Passwort-Policy v1.0")
- **Eigentümer** — verantwortliche Person oder Rolle
- **Gültig ab / Nächste Überprüfung** — Datumsfelder für Lifecycle-Management
- **Verknüpfte ISO-Controls** — optionale Verknüpfung mit SoA-Controls

**Schritt 3 — Inhalt erfassen**
Der Inhaltsbereich unterstützt **Markdown**. Überschriften, Listen, Tabellen und
Codeblöcke werden gerendert. Für strukturierte Policies empfiehlt sich folgende Gliederung:

```
# Titel
## 1. Zweck
## 2. Geltungsbereich
## 3. Regelungen
## 4. Verantwortlichkeiten
## 5. Verstöße und Konsequenzen
## 6. Überprüfung und Aktualisierung
```

**Schritt 4 — Speichern**
Das Template wird mit Status `draft` gespeichert und ist nur für eingeloggte Nutzer
ab `reader` sichtbar.

---

## Lebenszyklus (Status-Workflow)

Jedes Template durchläuft vier Status-Stufen:

```
draft  →  review  →  approved  →  archived
```

| Status | Bedeutung | Sichtbar für |
|---|---|---|
| `draft` | In Bearbeitung, noch nicht freigegeben | Ab `reader` (intern) |
| `review` | Wird geprüft, wartet auf Freigabe | Ab `reader` (intern) |
| `approved` | Offiziell gültig, produktiv im Einsatz | Ab `reader` |
| `archived` | Außer Kraft gesetzt, nur noch zur Referenz | Ab `reader` |

**Status ändern:** Im Template-Detailbereich über das Status-Dropdown. Jeder
Statuswechsel wird mit Zeitstempel und Nutzer im **Status-Verlauf** protokolliert
(abrufbar über das Uhr-Icon im Template).

> **Audit-Hinweis:** Der vollständige Statusverlauf ist im Audit-Log gespeichert und
> kann vom Auditor eingesehen werden. Ein Template das direkt von `draft` auf `approved`
> gesetzt wird ohne `review` ist zulässig, sollte aber in der Organisation bewusst
> entschieden werden.

---

## Versionshistorie

Die **Version steigt nur bei der Freigabe**, nicht beim Speichern. Beliebig oft speichern ändert die Versionsnummer nicht; erst wenn ein Dokument von `review` auf `approved` gesetzt wird, bekommt es seine Version. Die erste Freigabe behält die vorhandene Nummer, jede weitere zählt um 1 hoch.

**Freigeben:** Die Schaltfläche „Genehmigen“ fragt zuerst nach: **„Als Version X freigeben?“**, dazu ein optionaler **Änderungskommentar**. Erst „Ja, freigeben“ führt die Freigabe aus.

**Freigegebene Dokumente sind gesperrt:** Titel und Inhalt lassen sich im Status `approved` nicht ändern (die Oberfläche zeigt nur die Leseansicht und einen Hinweis, der Server lehnt Änderungen mit `409` ab). Das nächste Review-Datum bleibt bearbeitbar. Zum Weiterarbeiten setzt man das Dokument zurück auf `review` (Rolle `contentowner`), bearbeitet es und gibt es erneut frei — dabei entsteht die nächste Version.

**Versionshistorie im Dokumentkopf:** Über dem Dokument steht (aufklappbar, auch über das **Verlauf-Icon**) die Tabelle

| Version | Freigegeben von | Freigegeben am | Änderungen |
|---|---|---|---|

mit dem Benutzernamen, dem Zeitpunkt und dem Änderungskommentar jeder Freigabe. Dieselbe Tabelle steht im Ausdruck/PDF und im PDF für den Nextcloud-Publish. Bei jeder Freigabe wird zusätzlich der Inhalt als Schnappschuss gespeichert. Dokumente, die schon vor dieser Funktion freigegeben waren, zeigen die letzte Freigabe aus dem Status-Verlauf als erste Zeile.

Dies ermöglicht die vollständige Nachvollziehbarkeit, die ISO 27001 für Dokumente fordert.

---

## Anhänge

Templates können Dateien als Anhang erhalten (PDF, DOCX — max. 25 MB):

**Anhang hinzufügen:** Im Template-Detailbereich auf **„Anhang hochladen"** klicken.
Mindestrolle: `editor`.

**Anhang herunterladen:** Für alle Nutzer ab `reader` sichtbar.

**Anhang löschen:** Mindestrolle: `editor`.

---

## Verknüpfungen

Templates können mit anderen Modulen verknüpft werden:

**→ SoA-Controls:** Im Template die ISO-Controls auswählen die durch dieses Dokument
abgedeckt werden. Der Control erscheint dann im SoA mit Verweis auf das Template
(„Umsetzungsnachweis"). Dies ist für die Gap-Analyse und den Compliance-Report relevant.

**→ Risiken:** Über das Risiko-Modul können Policies und Procedures als risikomindernde
Maßnahmen einem Risiko zugeordnet werden.

**→ Policy-Bestätigung:** Freigegebene Policies können an Mitarbeiter zur Bestätigung
gesendet werden (Modul „Policy Acknowledgements").

---

## Template verschieben

Ein Template kann in einen anderen Typ verschoben werden (z.B. von `procedure` nach
`policy`) — Mindestrolle: `contentowner`. Alle Verknüpfungen und die Versionshistorie
bleiben dabei erhalten.

---

## Template löschen und wiederherstellen

**Soft-Delete** (Mindestrolle `contentowner`): Das Template wird als gelöscht markiert
und aus der Ansicht entfernt, bleibt aber im System erhalten. Verknüpfungen zu Controls
und Risiken bleiben bestehen.

**Wiederherstellen** (Mindestrolle `admin`): Gelöschte Templates können im Admin-Panel
unter „Papierkorb" wiederhergestellt werden.

**Dauerhaft löschen** (Mindestrolle `admin`): Entfernt das Template unwiderruflich
inklusive Versionshistorie und Anhängen. Nicht rückgängig machbar.

---

## Überprüfungsfälligkeiten

Das Feld **„Nächste Überprüfung"** wird aktiv überwacht:

- Templates deren Überprüfung in ≤ 14 Tagen fällig ist erscheinen im **Kalender** (rot markiert)
- Der Admin erhält eine **E-Mail-Benachrichtigung** (sofern SMTP konfiguriert)
- Im **Dashboard** werden fällige Reviews als Aufgaben angezeigt

Empfehlung: Policies jährlich, Procedures halbjährlich überprüfen.
