# Modul: Assets (Informationswerte)

> Das Asset-Register ist die Grundlage jedes ISMS — ISO 27001 Annex A.5.9 fordert
> eine vollständige Inventarisierung aller informationsverarbeitenden Werte.

---

## Was ist ein Asset?

Ein Asset (Informationswert) ist alles was für die Organisation von Wert ist und
geschützt werden muss: Software, Hardware, Daten, Personen, Prozesse, Räumlichkeiten.

Typische Asset-Kategorien:
- **Hardware** — Server, Laptops, Netzwerkhardware
- **Software** — Betriebssysteme, Applikationen, SaaS
- **Daten** — Datenbanken, Backup-Medien, Konfigurationsdaten
- **Personen** — Mitarbeitende mit Schlüsselrollen
- **Prozesse** — kritische Geschäftsprozesse
- **Einrichtungen** — Rechenzentren, Bürogebäude

---

## Rollen und Berechtigungen

| Aktion | Mindestrolle |
|---|---|
| Assets einsehen | `reader` |
| Asset anlegen und bearbeiten | `editor` |
| Asset löschen / wiederherstellen | `admin` |

---

## Asset anlegen

**Assets → „+ Neues Asset"**

Felder:
- **Name** — eindeutige Bezeichnung (z.B. „Produktions-Datenbankserver")
- **Typ** — z.B. Server, SaaS-Anwendung, Datenbank. Die Auswahl ist nach Kategorie gruppiert (Hardware, Software, Daten, Dienste, Einrichtungen) und lässt sich anpassen — siehe unten.
- **Eigentümer** — wer ist verantwortlich?
- **Abteilung / Organisationseinheit**
- **Klassifizierung** — Vertraulichkeit: `public` / `internal` / `confidential` / `secret`
- **Kritikalität** — `low` / `medium` / `high` / `critical`
- **Beschreibung** — was ist das Asset, wo befindet es sich?
- **Verknüpfte Risiken** — welche Risiken betreffen dieses Asset?

---

## Asset-Typen anpassen

**Administration → Listen → Asset-Typen** (nur Administration)

Die mitgelieferten Typen sind eine Vorgabe, keine feste Liste. Sie lassen sich umbenennen,
ergänzen und entfernen; jeder Typ gehört zu einer der fünf Kategorien.

Zwei Sicherungen greifen dabei:

- **Ein Typ, der noch an Assets hängt, lässt sich nicht entfernen.** Das System nennt Typ und
  Anzahl der betroffenen Assets. Erst umhängen, dann löschen.
- **Beim Speichern eines Assets wird der Typ geprüft.** Ein unbekannter Typ wird abgewiesen,
  damit Tippfehler nicht als eigener Typ in den Daten landen.

Bestehende Assets behalten ihren Typ auch dann, wenn er später aus der Liste verschwindet; im
Formular erscheint er als „Unbekannter Typ", damit er beim Bearbeiten nicht verlorengeht.

Über **Zurücksetzen** kehrt die Liste zur Vorgabe zurück.

### Schutzziele je Typ vorgeben

Jeder Typ kann Vertraulichkeit, Integrität, Verfügbarkeit und Authentizität vorgeben (Stufen 1–4).
Assets dieses Typs übernehmen die Werte, ohne dass jemand sie einzeln pflegen muss.

Drei Regeln sind dabei wichtig:

- **Die Vorgabe wirkt je Schutzziel einzeln.** Ein Typ „Datenbank" kann nur die Vertraulichkeit
  auf 4 setzen; Integrität und Verfügbarkeit bleiben dann beim einzelnen Asset.
- **Der Bezug bleibt bestehen.** Wird die Vorgabe am Typ später korrigiert, gilt der neue Wert
  sofort für alle Assets, die ihn nicht übersteuert haben — es ist kein einmaliger Startwert.
- **Abweichen ist möglich:** Im Asset-Formular gibt es den Schalter „Schutzziele abweichend vom
  Typ festlegen". Solange er aus ist, sind die vier Felder gesperrt und zeigen den Wert des Typs.

**Typwechsel im Formular:** Wechselt man im Asset-Formular den Typ, zeigen die vier Schutzziel-Felder die Vorgabe des neuen Typs sofort an — ohne Speichern und erneutes Öffnen. Das gilt, solange „Schutzziele abweichend vom Typ festlegen“ nicht angehakt ist; ist der Schalter an, bleiben die eigenen Werte unverändert. Hat der neue Typ keine Vorgabe, sind die Felder frei bearbeitbar (der Schalter ist dann ausgeblendet). Bei einem neuen Asset gilt die Vorgabe des vorausgewählten Typs gleich beim Öffnen.

**Wichtig zum Zusammenspiel mit Abhängigkeiten:** Über der Typvorgabe liegt weiterhin die
Vererbung nach dem Maximumprinzip. Hängt ein Asset mit hohem Schutzbedarf von einem anderen ab,
wird dieses angehoben — auch dann, wenn sein Wert per Übersteuerung bewusst niedriger gesetzt
wurde. Das ist beabsichtigt: Ein Serversystem, auf dem eine kritische Anwendung läuft, ist nicht
weniger schützenswert als die Anwendung selbst. Das Formular zeigt in diesem Fall an, welches
Asset den Wert anhebt.

---

### Sprachen: was übersetzt wird und was nicht

Dies ist eine bewusste Festlegung, keine Lücke:

- **Die 24 mitgelieferten Typen sind in alle Oberflächensprachen übersetzt** (DE/EN/FR/NL) und
  erscheinen automatisch in der Sprache, die der jeweilige Benutzer eingestellt hat.
- **Ein selbst angelegter Typ wird nicht übersetzt.** Er erscheint für alle Benutzer genau so,
  wie er eingegeben wurde. Das Programm kann für einen Begriff, den es nicht kennt, keine
  Übersetzung erfinden.
- **Wird ein mitgelieferter Typ umbenannt, entfällt seine Übersetzung ebenfalls.** Ab diesem
  Moment gilt der eingegebene Text — sonst würde die Umbenennung in anderen Sprachen
  stillschweigend überschrieben.

Wer eine mehrsprachige Belegschaft hat und eigene Typen anlegt, sollte deshalb eine Sprache
festlegen, in der Typbezeichnungen gepflegt werden — üblicherweise die Konzernsprache. Ein
Zurücksetzen auf die Vorgabe stellt auch die Übersetzungen wieder her.

---

## Klassifizierung und Kritikalität

Die **Klassifizierung** beschreibt den Schutzbedarf bezüglich Vertraulichkeit:

| Stufe | Bedeutung |
|---|---|
| `public` | Öffentlich zugänglich, kein Schaden bei Bekanntwerden |
| `internal` | Nur intern, begrenzte Auswirkung |
| `confidential` | Vertraulich, erhebliche Auswirkung |
| `secret` | Streng vertraulich, schwerwiegende Auswirkung |

Die **Kritikalität** beschreibt die Auswirkung bei Ausfall oder Kompromittierung
auf die Geschäftstätigkeit.

---

## Verknüpfung mit Risiken

Über das Risiko-Modul können Risiken direkt mit betroffenen Assets verknüpft werden.
Im Asset-Detail sind alle verknüpften Risiken mit aktuellem Status sichtbar.
Dies macht die **Risikoexposition** eines Assets transparent.

---

## Dashboard

Die Asset-Übersicht zeigt:
- Gesamtanzahl Assets nach Typ
- Verteilung nach Klassifizierung und Kritikalität
- Assets ohne Eigentümer (Handlungsbedarf)

---

## Audit-Hinweis

ISO 27001 A.5.9 fordert ein gepflegtes Asset-Inventar mit Eigentümerzuordnung.
A.5.10 fordert eine Richtlinie zur akzeptablen Nutzung. A.5.12 verlangt die
Klassifizierung von Informationen. Alle drei Anforderungen werden durch das
Asset-Modul in Verbindung mit einer entsprechenden Policy abgedeckt.

Empfehlung: Asset-Register jährlich überprüfen und bei wesentlichen Änderungen
der IT-Landschaft sofort aktualisieren.
