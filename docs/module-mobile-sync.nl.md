# Module: Mobiele app (Android) en synchronisatie

> De Android-app is een zelfstandige, offline bruikbare variant van ISMS Builder. Ze bewaart een eigen gegevensbestand
> op de telefoon en synchroniseert dat op verzoek met het hoofdsysteem — via wifi of via een bestand.

---

## Wat de app doet

- **Offline werken:** de app bevat de gebruikersinterface en de serverlogica (risicoscore, activatypen, versiebeheer, statusovergangen). Een server is niet nodig.
- **Modules:** documenten/sjablonen, SoA (Statement of Applicability), risico's, activa, auditbevindingen en guidance. Alle andere modules (bijv. AVG, BCM, leveranciers, beheer) zitten niet in de app.
- **Lokale gebruiker:** op het apparaat werk je als beheerder van je eigen gegevens. De rechten op het hoofdsysteem gelden pas tijdens de synchronisatie.
- **Telefoon en tablet:** de interface past zich aan (staand en liggend; liggend blijft de zijbalk zichtbaar). Instellingen voor wachtwoord, 2FA en rollen bestaan lokaal niet; de taal kies je in het synchronisatiepaneel onder *Taal van de interface*.
- **Niet beschikbaar:** bestandsuploads/bijlagen, WebDAV-publicatie, AI-functies, pdf-download vanaf de server.

## Vereisten op het hoofdsysteem

- ISMS Builder **versie 1.75 of hoger** (synchronisatieprotocol 1, zichtbaar als `syncProtocol` in `GET /api/version`).
- `STORAGE_BACKEND=json` (standaard). Bij sqlite, mariadb of postgres antwoorden de synchronisatie-eindpunten met `501`.
- **HTTPS:** de server moet bereikbaar zijn via `https://` (inrichting: `scripts/setup-ssl.sh`, sectie *SSL/TLS instellen*). Het adres dat in de app staat, moet in het certificaat voorkomen.
- **Versies:** de app heeft een **eigen versienummer** en is onafhankelijk van het hoofdsysteem. Beide zijn compatibel wanneer het synchronisatieprotocol overeenkomt (nu 1) en de server minstens versie 1.75 is. De app toont versie en compatibiliteit onder *Server controleren* en *Info en vereisten*.
- Een gebruikersaccount. De rol bepaalt wat de app mag overdragen:

| Module | Lezen | Schrijven (push) |
|---|---|---|
| Documenten/sjablonen, SoA, activa | vanaf `reader` | vanaf `editor` |
| Risico's, auditbevindingen | vanaf `reader` | vanaf `auditor` / `contentowner` |
| Guidance | vanaf `reader` (volgens `minRole` van het document) | alleen lezen |

## Certificaat op de telefoon

Met een openbaar vertrouwd certificaat (bijv. Let's Encrypt) hoeft er niets te gebeuren. Met een **eigen of zelfondertekend certificaat** moet de telefoon het vertrouwen:

1. Voer bij het aanmaken met `scripts/setup-ssl.sh` onder *Extra namen/IP-adressen* de naam of het IP in dat in de app wordt gebruikt (bijv. `192.168.1.20`). Staat het adres niet in het certificaat, dan weigert de app de verbinding.
2. Kopieer `ssl/cert.pem` naar de telefoon (USB, Nextcloud, e-mail).
3. Op de telefoon: *Instellingen → Beveiliging → Versleuteling en inloggegevens → Certificaat installeren → CA-certificaat* (het pad verschilt per fabrikant). Android waarschuwt voor certificaten van derden; hier is het uw eigen certificaat.
4. Kies in de app *Server controleren*: verschijnt de serverversie, dan vertrouwt de telefoon het certificaat.

Foutmeldingen: *Server niet bereikbaar* → controleer adres, poort, wifi/VPN en de firewall van de server. *Certificaat … niet vertrouwd* → stappen 1–3.

## Synchroniseren via wifi

1. Tik rechtsonder in de app op de synchronisatieknop.
2. Voer serveradres (bijv. `https://isms.example.org:3000`), gebruiker en wachtwoord in (bij ingeschakelde 2FA toont de app een veld voor de code). **Het wachtwoord wordt niet opgeslagen.**
3. **Nu synchroniseren.** De app verstuurt eerst lokale wijzigingen (push) en haalt daarna alles op wat op de server nieuw is (pull). De eerste synchronisatie laadt het volledige basisbestand.

Regels:

- **Alleen wijzigingen:** alleen wat sinds de laatste synchronisatie is gewijzigd, wordt overgedragen.
- **Servertijd:** de server kent `updatedAt` toe bij acceptatie. Een verkeerd lopende telefoonklok verstoort de synchronisatie niet.
- **Conflicten:** is een record op de server gewijzigd nadat de telefoon het had opgehaald, dan wordt het **niet overschreven**. Het verschijnt in de app onder *Conflicten oplossen*, met de afwijkende velden. Per record kies je *Mijn versie behouden* (verstuurd bij de volgende synchronisatie) of *Serverversie overnemen*.
- **Verwijderen:** verwijderen op de telefoon plaatst het record in de prullenbak van het hoofdsysteem. *Definitief verwijderen* op de telefoon wordt daar eveneens als verwijderd record overgedragen; het wordt niet uit het hoofdsysteem gewist.
- **Geweigerd:** ontbreekt de rol voor een module, dan meldt de app dit als *geweigerd*; lokale wijzigingen gaan niet verloren.

## Synchroniseren via bestand

Voor apparaten zonder netwerkverbinding met het hoofdsysteem:

- **Alles exporteren** — volledige back-up van de appgegevens (app naar app, of archief).
- **Alleen wijzigingen exporteren** — bestand met de lokaal gewijzigde records. Importeren op het hoofdsysteem:

  ```bash
  node scripts/sync-import.js http://localhost:3000 admin isms-mobile-changes-2026-10-18.json
  ```

  Het wachtwoord komt uit de omgevingsvariabele `ISMS_SYNC_PASSWORD` of uit een prompt. Dezelfde conflictregel als bij wifi-synchronisatie geldt; exitcode `3` betekent conflicten of geweigerde records.
- **Bestand importeren** — accepteert een app-bundel of een export van het hoofdsysteem (*Admin → Export*). De app toont eerst een **voorbeeld** (nieuw / bijgewerkt / ongewijzigd / conflicten). Lokaal gewijzigde records worden nooit stilzwijgend overschreven. De export van het hoofdsysteem bevat alleen de modules die het zelf levert (bijv. sjablonen, SoA, risico's, guidance); activa en bevindingen komen via de wifi-synchronisatie.

## API

| Methode | Pad | Doel |
|---|---|---|
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Wijzigingen sinds `since`, inclusief verwijderde records. Het antwoord bevat `serverTime` voor de volgende pull. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <module>: [records met baseUpdatedAt] } }` — antwoord: `accepted`, `conflicts`, `rejected`. |

Modules: `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Beschreven in `docs/architecture/openapi.yaml`.

## Beveiliging

- De overdracht verloopt **uitsluitend versleuteld (HTTPS)**. De app weigert onversleutelde `http://`. Buiten het eigen wifi hoort de server bovendien bereikbaar te zijn via VPN of reverse proxy.
- De gegevens staan in de beschermde opslag van de app op het apparaat, maar zijn **niet extra versleuteld**. Een apparaatvergrendeling en Android-apparaatversleuteling zijn verplicht.
- De sessie geldt alleen voor de synchronisatie en wordt niet opgeslagen.

## Beperkingen

- Alleen met de JSON-backend; bijlagen worden niet gesynchroniseerd.
- Conflicten worden per record opgelost, niet per veld.
- Op het hoofdsysteem definitief verwijderde records bereiken de telefoon niet.
- De app bevat de serverlogica van de versie waarmee ze is gebouwd. Bouw de app na een serverupdate ook opnieuw (`npm run build:www` in het project `isms-builder-mobile`).
