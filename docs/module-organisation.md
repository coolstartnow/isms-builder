# Modul: Organisation & Firmenlogo

> Hier legen Administratoren fest, wer die Organisation ist: Name, Zuständigkeiten, Sprachen, Benachrichtigungen,
> Dienste und das **Firmenlogo**, das auf Anmeldeseite, Richtlinien-PDFs und Druckansichten erscheint.

---

## Wo finde ich die Einstellungen?

**Admin → Organisation.** Der Bereich ist nur für Administratoren sichtbar. Änderungen werden mit **Speichern** oben rechts übernommen; das Firmenlogo wird dagegen **sofort beim Hochladen** gespeichert.

| Abschnitt | Inhalt |
|---|---|
| **Allgemeine Informationen** | Organisationsname, Kürzel, Logo-Text, **Firmenlogo**, ISMS-Geltungsbereich |
| **Verantwortlichkeiten** | CISO, Datenschutzbeauftragter (GDPO) und ICS-Kontakt mit Name und E-Mail |
| **Sicherheitsrichtlinien** | 2FA systemweit erzwingen (Anmeldung ohne TOTP wird dann blockiert) |
| **Sprachkonfiguration** | Aktivierte Sprachen (DE, EN, FR, NL, HU) und Standardsprache der Anmeldeseite |
| **E-Mail-Benachrichtigungen** | Globaler Schalter und die einzelnen Benachrichtigungsarten |
| **SMTP-Konfiguration** | Mailserver für Benachrichtigungen und Richtlinien-Bestätigungen |
| **WebDAV-Publish** | Freigegebene Richtlinien automatisch in Nextcloud/ownCloud ablegen |
| **Menüreihenfolge** | Reihenfolge der Menüpunkte der Seitenleiste |
| **Organisationseinheiten** | IT-Struktur (CIO, Gruppe/zentral, lokal) für Verantwortlichkeiten in allen Modulen |

Passwörter für SMTP und WebDAV sind **nur schreibbar**: Der Server zeigt sie nie wieder an, auch Administratoren nicht. Ein leeres Feld lässt das gespeicherte Passwort unverändert; zum Entfernen gibt es eine eigene Auswahl.

---

## Firmenlogo

Das Firmenlogo gibt den offiziellen Dokumenten das Aussehen Ihrer Organisation.

### Hochladen

1. **Admin → Organisation → Allgemeine Informationen**, Zeile **Firmenlogo**.
2. Datei wählen. Sie wird sofort gespeichert und als Vorschau angezeigt.
3. Zum Ersetzen einfach eine neue Datei wählen, zum Entfernen **Logo entfernen**.

| Regel | Wert |
|---|---|
| Formate | **PNG** oder **JPEG** |
| Größe | höchstens **512 kB** und **4000 Pixel** je Seite |
| Nicht erlaubt | SVG und alle anderen Formate. SVG kann Skripte enthalten und wird deshalb bewusst abgelehnt |

Der Dateityp wird am Inhalt der Datei geprüft, nicht an Endung oder Angabe des Browsers. Am besten eignet sich ein **querformatiges Logo mit transparentem oder weißem Hintergrund**; bis etwa 840 × 400 Pixel genügt für alle Ausgaben.

### Wo das Logo erscheint

| Stelle | Darstellung |
|---|---|
| **Anmeldeseite** | über dem Anmeldeformular, auf einer hellen Kachel (damit auch dunkle Logos lesbar bleiben) |
| **Richtlinien-PDF** | klein oben rechts im Kopf der ersten Seite, der Titel beginnt darunter |
| **Druckansichten** | oben rechts in den Druckfenstern der Berichte, Risiko-, Feststellungs- und Maßnahmenübersichten, Audit-Ausgaben und beim Dokumentenexport |

Nicht betroffen sind die Kopfzeile der App und die Mobile App. Fehlt das Logo, bleiben alle Ausgaben wie bisher, nur ohne Bild.

Wer das Logo **ansehen** darf: jeder, der die Anmeldeseite erreicht (sie zeigt es). Wer es **ändern** darf: nur Administratoren; jede Änderung steht im Audit-Log.

### Demo und Produktivbetrieb

- Im **Demo-Modus** liefert ISMS Builder sein eigenes Logo mit. Es wird beim Laden der Demodaten gesetzt, aber nur, wenn noch kein eigenes Logo vorhanden ist.
- Beim **Wechsel in den Produktivbetrieb** (Admin → Wartung → Demo-Reset) wird das Demo-Logo entfernt. Ein selbst hochgeladenes Logo bleibt.
- Danach erinnert ISMS Builder daran, **das Firmenlogo zu setzen**: im Ergebnis des Resets, im Hinweisband der Anmeldeseite, oben im Dashboard (für Administratoren) und in den Einstellungen. Der Hinweis verschwindet, sobald ein Logo hochgeladen ist.

### Sicherung

Das Logo liegt als Datei im Datenverzeichnis (`org-logo.png` oder `org-logo.jpg` mit `org-logo.json`), unabhängig vom gewählten Speicher-Backend. Es ist **nicht** im JSON-Datenexport enthalten; eine Sicherung des Datenverzeichnisses enthält es.

---

## Tipps

- Laden Sie das Logo **vor** dem ersten Richtlinien-PDF hoch. Bereits erzeugte PDFs ändern sich nicht.
- Wirkt das Logo im PDF unscharf, nehmen Sie eine größere Datei (bis 4000 Pixel) bei weiterhin höchstens 512 kB.
- Nach dem Hochladen die Seite neu laden, falls ein offener Browser-Tab noch das alte Logo zeigt.
