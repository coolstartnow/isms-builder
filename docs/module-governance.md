# Modul: Governance (ISMS-Steuerung)

> Governance dokumentiert die Managementaktivitäten die das ISMS am Laufen halten —
> Reviews, Beschlüsse und Maßnahmen aus der Leitungsebene.
> ISO 27001 Kapitel 9.3 (Management Review).

---

## Drei Teilbereiche

| Bereich | Zweck |
|---|---|
| **Management Reviews** | Protokolle der ISMS-Überprüfung durch die Leitung |
| **Actions** | Maßnahmen und Beschlüsse aus Reviews |
| **Meetings** | Sitzungsprotokolle des ISMS-Gremiums |

---

## Management Reviews

ISO 27001 Kapitel 9.3 schreibt vor dass die oberste Leitung das ISMS in **geplanten
Abständen** überprüft. Das Review muss bestimmte Eingaben berücksichtigen (Audit-Ergebnisse,
Vorfälle, Zielerreichung) und zu dokumentierten Ausgaben führen (Verbesserungsbeschlüsse).

**Governance → Reviews → „+ Neues Review"**

Felder:
- **Datum und Teilnehmer**
- **Eingaben** — Audit-Ergebnisse, KPI-Stand, Vorfälle seit letztem Review,
  Risikolage, Ressourcenbedarf, Verbesserungsvorschläge
- **Ergebnisse** — Beschlüsse, Verantwortliche, Fristen
- **Nächstes Review**

---

## Actions (Maßnahmen)

Maßnahmen aus Reviews oder anderen Quellen (Audits, Vorfälle) werden hier
nachverfolgt.

**Governance → Maßnahmen → „+ Neue Maßnahme"**

Felder:
- **Titel und Beschreibung**
- **Quelle** — aus welchem Review/Audit/Vorfall stammt die Maßnahme?
- **Verantwortlicher und Fälligkeitsdatum**
- **Priorität** — `low` / `medium` / `high`
- **Status** — `open` / `in_progress` / `completed` / `cancelled`

**Seit Version 1.80** liegen diese Maßnahmen im zentralen [Maßnahmenregister](module-measures.md) (Kennzeichen *Governance*). Hier
ändert sich nichts an der Bedienung; im Register erscheinen sie zusammen mit allen anderen Maßnahmen und lassen sich dort zusätzlich
Controls, Feststellungen und Risiken zuordnen. Anhänge bleiben an der Maßnahme in diesem Bereich. Löschen darf sie weiterhin nur ein
Administrator.

---

## Meetings

Protokolle regulärer ISMS-Steuerungssitzungen (z.B. monatliches
Sicherheitskomitee).

**Governance → Sitzungen → „+ Neue Sitzung"**

Felder: Datum, Teilnehmer, Tagesordnung, Beschlüsse, nächste Sitzung.

---

## Dashboard

Die Governance-Übersicht zeigt:
- Offene Maßnahmen nach Priorität und Fälligkeit
- Letztes und nächstes geplantes Management Review
- Überfällige Maßnahmen (rot markiert)

---

## Audit-Hinweis

ISO 27001 Kapitel 9.3 ist eine der am häufigsten bemängelten Anforderungen in
Erst-Audits — viele Organisationen haben kein dokumentiertes Management Review.

Der Auditor prüft:
1. Hat ein Management Review stattgefunden? (mindestens einmal pro Jahr)
2. Wurden die vorgeschriebenen Eingaben berücksichtigt?
3. Sind Maßnahmen dokumentiert und nachverfolgbar?

Empfehlung: Mindestens ein formales Management Review pro Jahr, besser halbjährlich.
