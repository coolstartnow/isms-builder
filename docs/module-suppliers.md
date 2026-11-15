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

## Nachweis-Link und Ablaufdatum

Im Lieferantenformular können Sie einen **Nachweis-Link** hinterlegen, zum Beispiel auf das ISO-27001-Zertifikat oder den SOC-Bericht des Lieferanten, und angeben, **bis wann der Nachweis gültig ist**.

- **Nachweis-Link** — Adresse eines Dokuments, das **Sie selbst verwalten** (z. B. SharePoint oder das Lieferantenportal). Erlaubt sind nur Adressen mit `http://` oder `https://`.
- **Beschriftung** — kurzer Text zum Link, z. B. „ISO 27001 Zertifikat“.
- **Nachweis gültig bis** — Datum, an dem der Nachweis abläuft.

Der ISMS Builder speichert nur den Verweis. Er ruft den Link nie ab und prüft weder Erreichbarkeit noch Inhalt oder Gültigkeit des Dokuments; die Kontrolle liegt bei Ihnen. Zum Ablaufdatum erscheint ein Eintrag **„Nachweis läuft ab“** im Kalender, 60 Tage vorher und auch nach Ablauf, solange der Lieferant nicht „inactive“ oder „terminated“ ist. In der Lieferantenliste zeigt die Spalte „Nachweis“ den Link und markiert abgelaufene Nachweise.

---

## Lieferanten-Assessment per E-Mail

Für kritische Lieferanten kann ein **Sicherheitsfragebogen** verschickt werden
ohne dass der Lieferant einen Account benötigt:

**Lieferant öffnen → „Assessment senden"**

Der Lieferant erhält einen personalisierten Link und füllt den Fragebogen
direkt im Browser aus. Die Antworten werden gespeichert und dem Lieferantenprofil
zugeordnet.

---

## Fragebogen-Vorlagen und NIS2-Katalog

Welche Fragen ein Lieferant beantworten soll, legen Sie in **Lieferanten → Fragebogen-Vorlagen** fest. Das kann je Lieferant oder Art der Dienstleistung verschieden sein.

- **Kataloge:** „Standard“ (19 Fragen, ISO 27001) und „NIS2-Lieferantenprüfung“ (56 Fragen in 13 Abschnitten, gegliedert nach Richtlinie (EU) 2022/2555, Art. 20, Art. 21 Abs. 2 Buchst. a–j und Art. 23). Die Fragen sind eigene Formulierungen, keine offizielle Checkliste und keine Rechtsberatung. Der NIS2-Katalog liegt auf Deutsch und Englisch vor; in anderen Sprachen erscheinen die Fragen auf Englisch.
- **Eigene Vorlagen:** Wählen Sie je Frage, ob sie **gestellt** wird, ob sie **Pflicht** ist und ob zu einer Ja/Nein-Frage ein **Bemerkungsfeld** (z. B. für einen Nachweis-Link) angeboten wird. Abschnitte lassen sich ganz an- oder abwählen; eigene Fragen können Sie ergänzen. Die eingebauten Vorlagen sind unveränderlich, über „Als neue Vorlage anpassen“ erstellen Sie eine eigene Fassung. Vorlagen anlegen und ändern dürfen Editoren; Leser sehen sie.
- **Je Lieferant anpassen:** Beim Anlegen eines Assessment-Links wählen Sie eine Vorlage und können die Auswahl für diesen Lieferanten noch ändern. Die Auswahl wird als Kopie am Fragebogen gespeichert; spätere Änderungen an der Vorlage ändern laufende Fragebögen nicht.
- **Pflichtfragen** sind für den Lieferanten mit * gekennzeichnet und werden auch auf dem Server geprüft. Ältere Fragebögen verhalten sich wie bisher.
- Bemerkungen und Antworten sind Eingaben des Lieferanten und werden nur als Text angezeigt; ein Link in einer Bemerkung wird vom Builder nicht abgerufen.

---

## Lieferanten-Briefkasten (Builder bleibt intern)

Der Builder ist für den internen Gebrauch gedacht. Damit Lieferanten trotzdem selbst Auskunft geben können, ohne dass der Builder aus dem Internet erreichbar sein muss, gibt es den **Lieferanten-Briefkasten** — einen eigenen kleinen Dienst (Projekt `isms-supplier-portal`), der nur Fragebögen und verschlüsselte Antworten hält und keine ISMS-Daten kennt.

- **Ablauf:** Der Builder legt den Fragebogen *ausgehend* im Briefkasten ab. Der Lieferant öffnet den Link des Briefkastens und füllt aus; sein Browser **verschlüsselt die Antworten, bevor sie gesendet werden** (AES-256-GCM, Schlüssel per RSA-OAEP-256 an Ihren öffentlichen Schlüssel gebunden). Der Builder holt die Antworten *ausgehend* ab (alle 5 Minuten oder per Knopf „Antworten abholen“), entschlüsselt sie selbst und löscht sie danach im Briefkasten. Der Briefkasten kann die Antworten nicht lesen.
- **Einrichtung (Administrator)** unter **Lieferanten → Fragebogen-Vorlagen → Lieferanten-Briefkasten:** Adresse (https), API-Schlüssel des Briefkastens, Schlüsselpaar erzeugen, „Briefkasten verwenden“ aktivieren, Verbindung testen. Der **private Schlüssel** liegt außerhalb des Datenverzeichnisses (`~/.config/isms-builder/supplier-portal.pem` oder `SUPPLIER_PORTAL_KEY_FILE`, Rechte 600) und **muss von Ihnen gesichert werden** — ohne ihn sind eingegangene Antworten nicht lesbar. Beim Ersetzen des Schlüsselpaars bleibt der alte Schlüssel als Kopie erhalten. Hat der Briefkasten ein selbst signiertes Zertifikat, geben Sie dem Builder die Zertifizierungsstelle über `NODE_EXTRA_CA_CERTS` bekannt.
- **Versandweg:** Beim Anlegen eines Assessment-Links wählen Sie „Über den Briefkasten“ oder „Direkt“. Fragebögen, die über den Briefkasten laufen, liefert die Seite des Builders nicht mehr aus. Lässt sich der Fragebogen nicht im Briefkasten ablegen, wird er nicht angelegt.
- **Rückfall ohne Netzverbindung:** „Datei importieren“ übernimmt eine Datei mit den Antworten aus dem Briefkasten; sie wird genauso geprüft.
- **Grenzen:** Die Verschlüsselung schützt die Vertraulichkeit gegenüber dem Briefkasten, belegt aber nicht, von wem eine Antwort stammt: Wer den Link kennt, kann einmal antworten. Antworten sind Eingaben des Lieferanten. Fehlen ausdrücklich verlangte Pflichtfragen, wird die Antwort übernommen und mit ! markiert. Löschfristen und Auftragsverarbeitung für den Betrieb des Briefkastens klären Sie selbst.

---

## Sprache, PDF-Formular und Erfassen der Antworten

- **Sprache:** Beim Anlegen eines Assessment-Links stehen nur die Sprachen zur Wahl, die in den **Organisationseinstellungen** aktiviert sind (und für die eine vollständige Übersetzung vorliegt). Vorbelegt ist die Sprache der Oberfläche; ist nur eine Sprache aktiviert, entfällt die Auswahl. Der Titel folgt der gewählten Sprache. Das gilt für beide Versandwege (Briefkasten und direkt) und für das PDF.
- **Ansprechpartner:** Name und E-Mail des Ansprechpartners stehen im Formular; vorbelegt sind CISO-Name und -E-Mail aus den Organisationseinstellungen und lassen sich je Fragebogen ändern.
- **Anschrift:** Straße, PLZ/Ort, Land und Telefon tragen Sie unter **Administration → Organisation** ein; sie erscheinen im Kopf des PDF-Formulars neben dem Firmenlogo.
- **PDF-Formular:** Bei einem offenen Fragebogen erzeugt der Knopf **PDF-Formular** ein **ausfüllbares PDF** mit Logo, Firmenname, Anschrift, Ansprechpartner, Lieferant, Frist, Referenz, Ankreuzfeldern (Ja/Nein), Bemerkungs- und Textfeldern, Pflichtfragen mit * und einem Unterschriftsblock. Der Lieferant füllt es am Bildschirm oder von Hand aus und schickt es per E-Mail oder Post zurück. Das PDF enthält **nicht** den geheimen Link, nur die Referenz des Fragebogens. Das PDF nutzt die eingebettete **PDF-Schrift** der Organisation (Standard Liberation Sans; Administration → Organisation), sodass Sonderbuchstaben aller EU-Amtssprachen richtig erscheinen. Ausnahme: Was der Lieferant in die Formularfelder tippt, zeichnet sein PDF-Programm mit der Standardschrift des PDF-Formats; ob Sonderzeichen dort in jedem Programm erscheinen, ist nicht geprüft.
- **Antworten erfassen:** Mit **Antworten erfassen** tragen Editoren die Antworten aus dem zurückgesendeten Formular in einer Maske mit denselben Fragen ein. Fehlen Pflichtantworten, fragt der Builder zurück; übernommen wird nur nach Bestätigung und mit ! markiert. Der Fragebogen erhält den Vermerk „Formular“ und eine Spur im Audit-Log. Nur ein offener Fragebogen lässt sich so beantworten; danach wie gewohnt prüfen.

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
