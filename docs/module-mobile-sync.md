# Modul: Mobile App (Android) & Sync

> Die Android-App ist eine eigenständige, offline nutzbare Variante des ISMS Builders. Sie hält einen
> eigenen Datenbestand auf dem Handy und gleicht ihn bei Bedarf mit dem Hauptsystem ab — per WLAN oder per Datei.

---

## Was die App kann

- **Offline arbeiten:** Die App bringt die Oberfläche und die Server-Logik (Risiko-Bewertung, Asset-Typen, Versionierung, Statuswechsel) mit. Es wird kein Server benötigt.
- **Module:** Dokumente/Vorlagen, SoA (Statement of Applicability), Risiken, Assets, Audit-Feststellungen und Guidance. Alle anderen Module (z. B. GDPR, BCM, Lieferanten, Verwaltung) gibt es in der App nicht.
- **Lokaler Nutzer:** Auf dem Gerät arbeitet man als Administrator des eigenen Bestands. Die Rechte am Hauptsystem gelten erst beim Abgleich.
- **Handy und Tablet:** Die Oberfläche passt sich an (Hoch- und Querformat; im Querformat bleibt die Seitenleiste sichtbar). Einstellungen für Passwort, 2FA und Rollen gibt es lokal nicht; die Sprache wählt man im Sync-Panel unter *Sprache der Oberfläche*.
- **Nicht verfügbar:** Datei-Uploads/Anhänge, WebDAV-Veröffentlichung, KI-Funktionen, PDF-Download vom Server.

## Voraussetzungen am Hauptsystem

- ISMS Builder **ab Version 1.75** (Sync-Protokoll 1, sichtbar unter `GET /api/version` als `syncProtocol`).
- `STORAGE_BACKEND=json` (Standard). Bei sqlite, mariadb oder postgres antworten die Sync-Endpunkte mit `501`.
- **HTTPS:** Der Server muss per `https://` erreichbar sein (Einrichtung: `scripts/setup-ssl.sh`, Abschnitt *SSL/TLS einrichten*). Die Adresse, die in der App steht, muss im Zertifikat enthalten sein.
- **Versionen:** Die App hat eine **eigene Versionsnummer** und ist unabhängig vom Hauptsystem. Verträglich sind beide, wenn das Sync-Protokoll übereinstimmt (aktuell 1) und der Server mindestens Version 1.75 hat. Version und Kompatibilität zeigt die App unter *Server prüfen* und *Info & Voraussetzungen* an.
- Ein Benutzerkonto. Was die App übertragen darf, bestimmt dessen Rolle:

| Modul | Lesen | Schreiben (Push) |
|---|---|---|
| Dokumente/Vorlagen, SoA, Assets | ab `reader` | ab `editor` |
| Risiken, Audit-Feststellungen | ab `reader` | ab `auditor` / `contentowner` |
| Guidance | ab `reader` (nach `minRole` des Dokuments) | nur lesen |

## Zertifikat auf dem Handy

Mit einem öffentlich vertrauten Zertifikat (z. B. Let's Encrypt) ist nichts zu tun. Mit einem **eigenen oder selbstsignierten Zertifikat** muss das Handy ihm vertrauen:

1. Beim Erzeugen mit `scripts/setup-ssl.sh` unter *Weitere Namen/IP-Adressen* den Namen oder die IP eintragen, die in der App verwendet wird (z. B. `192.168.1.20`). Steht die Adresse nicht im Zertifikat, lehnt die App die Verbindung ab.
2. `ssl/cert.pem` aufs Handy kopieren (USB, Nextcloud, E-Mail).
3. Am Handy: *Einstellungen → Sicherheit → Verschlüsselung & Anmeldedaten → Zertifikat installieren → CA-Zertifikat* (der Pfad unterscheidet sich je nach Hersteller). Android warnt dabei vor Zertifikaten Dritter; das ist hier das eigene Zertifikat.
4. In der App *Server prüfen* wählen: Erscheint die Serverversion, vertraut das Handy dem Zertifikat.

Fehlermeldungen: *Server nicht erreichbar* → Adresse, Port, WLAN/VPN und Firewall des Servers prüfen. *Zertifikat … nicht als vertrauenswürdig* → Schritte 1–3.

## Abgleich per WLAN

1. In der App unten rechts auf die Sync-Schaltfläche tippen.
2. Server-Adresse (z. B. `https://isms.example.org:3000`), Benutzer und Passwort eingeben (bei aktivierter 2FA blendet die App ein Feld für den Code ein). **Das Passwort wird nicht gespeichert.**
3. **Jetzt abgleichen.** Die App sendet zuerst lokale Änderungen (Push) und holt danach alles, was am Server neu ist (Pull). Der erste Abgleich lädt den kompletten Grunddatenbestand.

Regeln:

- **Nur Änderungen:** Es wird nur übertragen, was sich seit dem letzten Abgleich geändert hat.
- **Serverzeit:** Der Server vergibt `updatedAt` beim Annehmen. Eine falsch gehende Handy-Uhr stört den Abgleich nicht.
- **Konflikte:** Wurde ein Datensatz am Server geändert, seit das Handy ihn geholt hat, wird er **nicht überschrieben**. Er erscheint in der App unter *Konflikte lösen*, mit den abweichenden Feldern. Pro Datensatz wählt man *Meine Fassung behalten* (wird beim nächsten Abgleich gesendet) oder *Serverstand übernehmen*.
- **Löschen:** Löschen am Handy landet im Papierkorb des Hauptsystems. *Endgültig löschen* am Handy wird dort ebenfalls als gelöschter Datensatz übertragen und nicht aus dem Hauptsystem entfernt.
- **Abgelehnt:** Fehlt die Rolle für ein Modul, meldet die App es als *abgelehnt*; lokale Änderungen gehen nicht verloren.

## Abgleich per Datei

Für Geräte ohne Netzverbindung zum Hauptsystem:

- **Gesamtbestand exportieren** — komplette Sicherung der App-Daten (App → App oder Archiv).
- **Nur Änderungen exportieren** — Datei mit den lokal geänderten Datensätzen. Einspielen am Hauptsystem:

  ```bash
  node scripts/sync-import.js http://localhost:3000 admin isms-mobile-changes-2026-10-18.json
  ```

  Passwort über die Umgebungsvariable `ISMS_SYNC_PASSWORD` oder per Abfrage. Es gilt dieselbe Konfliktregel wie beim WLAN-Abgleich; Exitcode `3` bedeutet Konflikte oder abgelehnte Datensätze.
- **Datei importieren** — nimmt ein App-Bundle oder einen Export des Hauptsystems (*Admin → Export*) entgegen. Vorher zeigt die App eine **Vorschau** (neu / aktualisiert / unverändert / Konflikte). Lokal geänderte Datensätze werden nie stillschweigend überschrieben. Der Export des Hauptsystems enthält nur die Module, die er selbst liefert (z. B. Vorlagen, SoA, Risiken, Guidance); Assets und Feststellungen kommen über den WLAN-Abgleich.

## API

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Änderungen seit `since`, einschließlich gelöschter Datensätze. Antwort enthält `serverTime` für den nächsten Pull. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <modul>: [Datensätze mit baseUpdatedAt] } }` — Antwort: `accepted`, `conflicts`, `rejected`. |

Module: `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Beschreibung in `docs/architecture/openapi.yaml`.

## Sicherheit

- Die Übertragung erfolgt **ausschließlich verschlüsselt (HTTPS)**. Unverschlüsseltes `http://` lehnt die App ab. Außerhalb des eigenen WLANs sollte der Server zusätzlich per VPN oder Reverse-Proxy erreichbar sein.
- Die Daten liegen im geschützten App-Speicher des Geräts, aber **nicht zusätzlich verschlüsselt**. Gerätesperre und Android-Geräteverschlüsselung sind Pflicht.
- Die Sitzung gilt nur für den Abgleich und wird nicht gespeichert.

## Grenzen

- Nur mit dem JSON-Backend; Anhänge werden nicht synchronisiert.
- Konflikte werden pro Datensatz, nicht pro Feld aufgelöst.
- Am Hauptsystem endgültig gelöschte Datensätze erreichen das Handy nicht.
- Die App enthält die Server-Logik des Stands, mit dem sie gebaut wurde. Nach einem Server-Update sollte auch die App neu gebaut werden (`npm run build:www` im Projekt `Confluence_ISMS_android`).
