# Modul: Lieferantenbewertung (Suppliers)

> Lieferanten und Dienstleister die Zugang zu Informationswerten haben müssen
> bewertet und überwacht werden — ISO 27001 A.5.19 bis A.5.22.

---

## Warum Lieferantenbewertung?

Viele Sicherheitsvorfälle entstehen durch Dritte mit Zugang zu Systemen oder Daten
(Supply-Chain-Angriffe, unsichere SaaS-Dienste, unkontrollierte Subunternehmer).
ISO 27001 fordert deshalb einen systematischen Umgang mit Lieferantenrisiken.

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Lieferanten einsehen | `reader` |
| Lieferant anlegen und bearbeiten | `editor` |
| Lieferant löschen / wiederherstellen | `admin` |

---

## Lieferant anlegen

**Lieferanten → „+ Neuer Lieferant"**

Felder:
- **Name** — Firmenbezeichnung
- **Kategorie** — z.B. IT-Dienstleister, Cloud-Provider, Wartungsunternehmen
- **Kontakt** — Ansprechpartner, E-Mail
- **Zugriffsebene** — welche Systeme/Daten hat der Lieferant zugänglich?
- **Risikobewertung** — `low` / `medium` / `high` / `critical`
- **Status** — `active` / `inactive` / `under_review`
- **Nächste Überprüfung** — wann ist die nächste Bewertung fällig?
- **Sicherheitsanforderungen** — welche Anforderungen wurden vereinbart?
- **Nachweise** — liegt ein ISO-Zertifikat, SOC2-Report, AV-Vertrag vor?

---

## Lieferanten-Assessment per E-Mail

Für kritische Lieferanten kann ein **Sicherheitsfragebogen** verschickt werden
ohne dass der Lieferant einen Account benötigt:

**Lieferant öffnen → „Assessment senden"**

Der Lieferant erhält einen personalisierten Link und füllt den Fragebogen
direkt im Browser aus. Die Antworten werden gespeichert und dem Lieferantenprofil
zugeordnet.

---

## Risikobewertung

Die Risikobewertung eines Lieferanten richtet sich nach:
- Art und Umfang des Datenzugriffs
- Kritikalität der abhängigen Prozesse
- Nachgewiesene Sicherheitsmaßnahmen (Zertifikate, Audits)
- Vertragliche Absicherung (AV-Vertrag, NDA, SLAs)

Lieferanten mit Bewertung `high` oder `critical` sollten mindestens jährlich
überprüft werden.

---

## Verknüpfung mit DSGVO

Lieferanten die personenbezogene Daten verarbeiten erscheinen auch im
DSGVO-Modul unter Auftragsverarbeitung (AV). Die Verknüpfung erfolgt dort
manuell beim AV-Eintrag.

---

## Verknüpfte Risiken

Im Risikoformular lassen sich Risiken mit einem oder mehreren Lieferanten verknüpfen (Bereich „Verknüpfungen“ → **Betroffene Assets, Asset-Typen und Lieferanten**). Im Lieferantenformular (beim Bearbeiten) zeigt der Abschnitt **Verknüpfte Risiken** alle damit verbundenen Risiken mit Stufe und Status.

---

## Dashboard

Die Lieferantenübersicht zeigt:
- Gesamtanzahl nach Risikobewertung
- Lieferanten mit überfälliger Überprüfung
- Aktive vs. inaktive Lieferanten

---

## Audit-Hinweis

ISO 27001 A.5.19 fordert eine Richtlinie für Lieferantenbeziehungen.
A.5.20 verlangt Sicherheitsanforderungen in Lieferantenverträgen.
A.5.21 adressiert Supply-Chain-Risiken.
A.5.22 fordert die regelmäßige Überwachung von Lieferantenleistung und -sicherheit.

Das Lieferanten-Assessment-Feature ermöglicht den dokumentierten Nachweis
der Sicherheitsüberprüfung gegenüber dem Auditor.
