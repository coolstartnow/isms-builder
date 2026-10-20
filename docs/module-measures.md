# Modul: Maßnahmenregister (Measures)

> Ein zentrales Register für alle Maßnahmen im ISMS — ISO 27001 Kapitel 6.1.3 verlangt, dass
> Risikobehandlungen festgelegt, umgesetzt und nachverfolgt werden; Art. 32 DSGVO verlangt dasselbe für
> technische und organisatorische Maßnahmen (TOMs).

---

## Eine Maßnahme, ein Ort

Maßnahmen entstehen an vielen Stellen: als Behandlung eines Risikos, als Folge einer Audit-Feststellung,
als Beschluss aus einem Management-Review oder als TOM nach Art. 32 DSGVO. Früher führte jedes Modul seine
eigene Liste. Seit Version 1.80 gibt es **einen Bestand**: das Maßnahmenregister. Die Module zeigen ihre
Maßnahmen weiterhin an ihrer gewohnten Stelle an, lesen und schreiben sie aber im Register. Eine Änderung
an einer Stelle gilt deshalb überall, und keine Maßnahme taucht doppelt auf.

| Herkunft | Wo bearbeitet | Kennzeichen im Register |
|---|---|---|
| Risiko-Behandlung | Risk & Compliance → Behandlungspläne | Zuordnung zu einem **Risiko** |
| Maßnahme zu einer Feststellung | Reports → Audit-Feststellungen | Zuordnung zu einer **Feststellung** |
| Governance-Maßnahme | Governance → Maßnahmen | Kennzeichen **Governance** |
| TOM nach Art. 32 DSGVO | GDPR & Datenschutz → TOMs | Kennzeichen **TOM** |
| Eigene Maßnahme | Maßnahmen | Zuordnung zu **SoA-Controls**, oder ohne Zuordnung |

Eine Maßnahme kann mehreres zugleich sein: Eine Maßnahme „MFA für Administratoren“ kann ein Control
umsetzen und zugleich ein Risiko behandeln.

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Maßnahmen einsehen | `reader` |
| Maßnahme anlegen und bearbeiten | `editor` |
| Maßnahme einem **Risiko** oder einer **Feststellung** zuordnen, Maßnahmen mit Risiko-Zuordnung ändern | `auditor` oder `contentowner` |
| TOM anlegen, ändern (Kennzeichen TOM) | `contentowner` |
| Maßnahme löschen | `contentowner` |
| Governance-Maßnahme löschen | `admin` |
| Gelöschte Maßnahme wiederherstellen oder endgültig löschen | `admin` |

Das Register vergibt niemandem mehr Rechte als die Module bisher: Wer Risiko-Behandlungen nur als
Auditor ändern durfte, darf sie auch im Register nur als Auditor ändern.

---

## Das Register

**Maßnahmen** (in der Navigation hinter „SoA – Controls“)

![Maßnahmenregister mit Kennzahlen, Filtern und Liste](images/measures/register-list.png)

*Die Bilder zeigen die deutsche Oberfläche mit dem deutschen Demo-Datenbestand; die Oberfläche steht in
fünf Sprachen zur Verfügung.*

**Kennzahlen** oben: Gesamt, Geplant, In Umsetzung, Umgesetzt (einschließlich „Wirksamkeit geprüft“),
Überfällig und Ohne Zuordnung. *Überfällig* ist eine Maßnahme, deren Termin verstrichen ist und die noch
geplant oder in Umsetzung ist. *Ohne Zuordnung* sind Maßnahmen, die weder einem Control noch einer
Feststellung noch einem Risiko zugeordnet und weder TOM noch Governance-Maßnahme sind — sie fallen bei einer
Prüfung zuerst auf, weil unklar ist, wozu sie dienen.

**Suchen und filtern:** Volltext (Referenz, Titel, Beschreibung, Umsetzung, Verantwortlicher), Status,
Verantwortlicher, „Nur überfällige“ und **Herkunft**.

![Filter „Nur Risiko-Behandlungen“](images/measures/register-filter-risk.png)

Die Filter für Herkunft: *Alle Herkünfte*, *Nur TOMs*, *Nur Governance-Maßnahmen*, *Nur Risiko-Behandlungen*,
*Nur Feststellungs-Maßnahmen*.

**Spalte „Zuordnung“:** Symbole zeigen, womit die Maßnahme verknüpft ist (Control, Feststellung, Risiko), samt Anzahl.

**Export:** **CSV** (mit Schutz vor Formeln in Tabellenkalkulationen) und **PDF** (Druckansicht) enthalten
die aktuell gefilterte Liste.

---

## Maßnahme anlegen und bearbeiten

**Maßnahmen → „+ Neue Maßnahme“**. Die Maßnahme erhält automatisch eine Referenz `M-001`, `M-002`, …

| Feld | Bedeutung |
|---|---|
| Titel, Beschreibung | Was soll erreicht werden |
| Umsetzung (konkret) | Was ist umgesetzt: was, wie, wo, wie oft — der Nachweis für Auditoren |
| Verantwortlich | Wer setzt um |
| Fällig am / Überprüfung am | Umsetzungstermin und Wiedervorlage zur Wirksamkeitsprüfung |
| Status | `Geplant` · `In Umsetzung` · `Umgesetzt` · `Wirksamkeit geprüft` · `Abgebrochen` |

Wird eine Maßnahme auf *Umgesetzt* oder *Wirksamkeit geprüft* gesetzt, trägt das System das Datum
automatisch als „Erledigt am“ ein, wenn keines angegeben ist. Abgebrochene Maßnahmen bleiben im Register
(zur Nachvollziehbarkeit), gelten aber nicht mehr als laufende Behandlung eines Risikos.

### Zuordnungen

Der Abschnitt **Zuordnung** verknüpft die Maßnahme mit **SoA-Controls**, **Feststellungen** und **Risiken**.
Jede Liste hat ein Filterfeld.

![Formular mit den drei Auswahllisten für Controls, Feststellungen und Risiken](images/measures/form-links.png)

Jede Maßnahme mit Risiko-Zuordnung gilt als **Behandlung dieses Risikos** und erscheint unter Risk &
Compliance → Behandlungspläne. Jede Maßnahme mit Feststellungs-Zuordnung erscheint im Maßnahmenplan der
Feststellung. Editoren sehen diese beiden Listen schreibgeschützt (siehe Rollen); Controls können sie frei
zuordnen.

### Governance-Maßnahme

Mit dem Kennzeichen **Governance-Maßnahme** wird die Maßnahme zusätzlich im Bereich Governance geführt. Dafür
gibt es weitere Felder: **Anlass** (Management-Review, internes oder externes Audit, Vorfall, Sonstiges),
**Bezug** (z. B. Audit-Nummer), **Priorität**, **Fortschritt (%)**, E-Mail des Verantwortlichen,
**Erledigt am** und Notizen.

![Formular: Abschnitt Governance-Maßnahme](images/measures/form-governance.png)

Löschen darf eine Governance-Maßnahme nur ein Administrator, auch im Register.

### TOM (Art. 32 DSGVO)

Mit dem Kennzeichen **TOM** erscheint die Maßnahme auch im DSGVO-Modul unter „TOMs“. Weitere Felder:
**Kategorie** (Zugriffskontrolle, Verschlüsselung, Protokollierung, Netzwerksicherheit, Anwendungssicherheit,
Backup & Wiederherstellung, Organisatorisch, Schulung, Datenaufbewahrung), **Risikostufe**, **Aufbewahrungsregel**
und **Nachweis**. Anlegen und ändern dürfen TOMs nur Contentowner, wie im DSGVO-Modul.

---

## Wo Maßnahmen überall erscheinen

**SoA – Controls:** Im aufgeklappten Control zeigt der Block **„Maßnahmen zu diesem Control“** die
zugeordneten Maßnahmen mit Status. Ein Klick öffnet die Maßnahme, **„Maßnahme anlegen“** legt eine neue an und
ordnet sie dem Control gleich zu.

![SoA: Block „Maßnahmen zu diesem Control“](images/measures/soa-block.png)

**Feststellungen:** Der **Maßnahmenplan** einer Feststellung zeigt ihre Maßnahmen wie bisher und führt
dieselben Datensätze wie das Register. Darunter listet der Block **„Maßnahmen (Register)“** sie mit
Referenz und Status.

![Feststellung: Maßnahmenplan und Maßnahmen (Register)](images/measures/finding-block.png)

**Risiken:** Der Reiter **Behandlungspläne** zeigt alle Behandlungen aller Risiken, im Risiko-Detail die
Behandlungen des einzelnen Risikos.

![Risk & Compliance: Behandlungspläne](images/measures/risk-treatments.png)

**Governance:** Der Reiter **Maßnahmen** zeigt die Governance-Maßnahmen mit Anlass, Priorität und Fortschritt.
Anhänge (Protokolle, Nachweise) hängen weiter dort an der Maßnahme.

![Governance: Maßnahmen](images/measures/governance-actions.png)

**DSGVO:** Der Reiter **TOMs** zeigt die Maßnahmen mit dem Kennzeichen TOM.

![GDPR & Datenschutz: TOMs](images/measures/gdpr-toms.png)

**Kalender:** Fällige Maßnahmen erscheinen mit ihrem Termin. Behandlungen von Risiken, Maßnahmen von
Feststellungen und Governance-Maßnahmen haben jeweils eine eigene Ereignisart; alle übrigen erscheinen als
Maßnahmen-Termin. Dieselbe Maßnahme wird dabei nicht zusätzlich als allgemeiner Maßnahmen-Termin geführt.
Gehört sie zugleich zu einem Risiko und zu einer Feststellung, erscheint sie für beide Zusammenhänge.

**KI-Suche:** Das Register ist Teil der Suche; Maßnahmen lassen sich per Stichwort oder Frage finden.

---

## Vorhandene Daten (Upgrade auf 1.80)

Beim ersten Start mit Version 1.80 übernimmt das System die bisher in den Modulen eingebetteten Maßnahmen
automatisch ins Register: TOMs, Risiko-Behandlungen, Maßnahmen zu Feststellungen und Governance-Maßnahmen.

- **Kennungen, Zeitstempel und Löschstatus bleiben erhalten**; die Referenzen `M-…` werden nach Anlagedatum vergeben.
- **Der Vorgang ist wiederholbar:** Bereits übernommene Datensätze werden nicht noch einmal angelegt.
- **Die alten Daten bleiben unverändert liegen** (`risks.json`, `findings.json`, `governance.json`,
  `gdpr/toms.json` bzw. die Tabellen der Datenbank). Sie werden nicht mehr gelesen, dienen aber als Sicherung.
- **Statuswerte** werden abgebildet: *offen / in Arbeit / erledigt* der Module entsprechen *Geplant / In Umsetzung / Umgesetzt*.
- **Neue IDs:** Neue Governance-Maßnahmen erhalten IDs der Form `meas_…` (früher `gact_…`); bestehende
  Kennungen ändern sich nicht.

Beim Wechsel von JSON auf eine SQL-Datenbank mit `tools/migrate-json-to-knex.js` wird das Register samt
allen Feldern und Anhängen mitgenommen.

**Demo-Daten:** Die Demo-Bundles (Deutsch, Englisch, Französisch, Niederländisch, Ungarisch) enthalten das
Register mit allen fünf Herkünften. Das erneute Laden eines Bundles ersetzt das Register.

---

## Papierkorb

Gelöschte Maßnahmen liegen im Papierkorb (**Admin → Papierkorb**, ausgenommen TOMs: sie stehen unter den
DSGVO-Einträgen) und können von Administratoren wiederhergestellt oder endgültig gelöscht werden. Wird eine
Behandlung im Risiko oder eine Maßnahme in der Feststellung „gelöscht“, die noch einem Control oder weiteren
Risiken bzw. Feststellungen zugeordnet ist, wird nur die Zuordnung zu diesem Risiko bzw. dieser Feststellung
entfernt; die Maßnahme selbst bleibt im Register.

---

## Programmierschnittstelle

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/measures` | Liste; Filter `q`, `status`, `responsible`, `control`, `finding`, `risk`, `overdue`, `tom`, `governance`, `source`, `priority`, `category` |
| GET | `/measures/summary` | Kennzahlen |
| GET | `/measures/{id}` | Einzelne Maßnahme |
| POST | `/measures` | Anlegen |
| PUT | `/measures/{id}` | Ändern (nur übergebene Felder) |
| DELETE | `/measures/{id}` | Löschen (Papierkorb) |
| POST | `/measures/{id}/restore` | Wiederherstellen (Admin) |
| DELETE | `/measures/{id}/permanent` | Endgültig löschen (Admin) |

Die bisherigen Schnittstellen der Module (`/risks/{id}/treatments`, `/findings/{id}/actions`,
`/governance/actions`, `/gdpr/toms`) bleiben unverändert erhalten und arbeiten auf demselben Bestand.

---

## Audit-Hinweis

Für ISO 27001 sind das Register und seine Einträge der Nachweis zu Kapitel 6.1.3 (Risikobehandlung), 8.3
(Umsetzung der Behandlung) und 10.2 (Korrekturmaßnahmen). Prüfer fragen typischerweise:

1. Gibt es zu jedem Risiko, das nicht akzeptiert wird, eine Maßnahme mit Verantwortlichem und Termin?
2. Sind überfällige Maßnahmen bekannt und begründet?
3. Ist für umgesetzte Maßnahmen ein Nachweis (Umsetzung, Wirksamkeitsprüfung) hinterlegt?
4. Führen Feststellungen aus Audits zu Maßnahmen, und sind diese nachverfolgbar?

Für Art. 32 DSGVO weisen die TOMs mit Kategorie, Risikostufe und Nachweis die Angemessenheit der Maßnahmen nach.
