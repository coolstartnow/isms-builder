# Module: inloggen, sessies en productiegebruik

> Hoe inloggen is beveiligd: **één sessie per account**, demowachtwoorden **alleen in de demo**, cookie alleen via **HTTPS**. Deze gids is voor beheerders en exploitanten.

---

## Eén gelijktijdige sessie per account

Elk account mag **slechts één sessie tegelijk** hebben. Wanneer iemand met een account inlogt, eindigt de vorige sessie van dat account; bij de volgende klik keert die terug naar de inlogpagina.

**Wie twee sessies tegelijk nodig heeft** (twee personen, twee apparaten of browsers), maakt daarvoor een **apart account** aan. Een account wordt niet gedeeld.

Een sessie eindigt ook: bij **uitloggen** (direct, een gekopieerd token is daarna waardeloos), bij een **wachtwoordwijziging** (uw eigen sessie blijft), wanneer een beheerder **rol, domein of functies wijzigt**, een **wachtwoord reset** of het **account verwijdert**, en na **8 uur** (`JWT_EXPIRES_IN`).

Het wachtwoord heeft **minstens 8 tekens** nodig. De toegangssleutels van de mobiele app (sync) zijn gescheiden en vallen niet onder deze regel.

## Demo en productie

Een nieuwe instantie is een **demo** met de demoaccounts (`admin`, `alice`, `bob`, `carla`, `dana`) en openbaar bekende wachtwoorden (bijv. `adminpass`). De overgang naar **productie** gebeurt via **Beheer → Demo-reset** (of `scripts/prepare-production.js`); het systeem wordt dan blijvend als productief gemarkeerd.

Een klik op **Beheer → Onderhoud → Demo-reset** (en de opdrachtregelroute `node scripts/prepare-production.js`) **opent eerst deze gids** in een apart venster. De bevestigingsknop komt pas vrij nadat u tot het einde hebt gescrold en er minstens 15 seconden zijn verstreken. **De overstap begint pas nadat u hebt bevestigd en het venster hebt gesloten**; wordt het venster anders gesloten of een pop-up geblokkeerd, dan wordt niets gewijzigd. In het auditlog staat bij de vermelding “Demo-reset” dat de gids is getoond en bevestigd. Tijdens normaal demogebruik verschijnt de gids niet.

**Back-up:** voordat iets wordt verwijderd, worden alle demogegevens (modules, gebruikerslijst zonder wachtwoorden, instellingen, logboek, privacy- en juridische gegevens) geëxporteerd als bestand `isms-demo-export-<datum>.json` en **automatisch gedownload**. Bewaar dit bestand — de server slaat geen kopie op. Geüploade bestanden (bijlagen, logo) zijn niet inbegrepen. Via de opdrachtregel maakt `prepare-production.js` in plaats daarvan een back-up van de map `data/` en toont het pad.

![De demo-reset opent eerst deze gids; de overstap begint pas na uw bevestiging.](images/security/sec-04-anleitung-vor-umstellung.png)

In productie zijn de **demowachtwoorden geblokkeerd**: inloggen daarmee wordt geweigerd en ze kunnen niet opnieuw worden toegekend. Enige uitzondering is de **overdracht** direct na de reset: `admin` logt in met het beginwachtwoord en moet **meteen een eigen wachtwoord instellen**; alle andere functies blijven tot dan geblokkeerd.

![Overdracht na de reset: het beginwachtwoord moet meteen worden gewijzigd.](images/security/sec-03-passwortwechsel-pflicht.png)

## Waarschuwing bij demowachtwoorden in productie

Heeft in productie nog een account zijn demowachtwoord, dan waarschuwt het systeem duidelijk — **de waarschuwing kan niet worden weggeklikt** en blijft tot alle wachtwoorden zijn vervangen:

- **Serverlog:** bij het starten en daarna elke 30 minuten een opvallend kader “SICHERHEITSWARNUNG” met de betrokken accounts en het commando om het op te lossen.
- **Inlogpagina:** een rood bericht (zonder accountnamen). Wie het demowachtwoord intypt, krijgt de melding “geblokkeerd”.
- **Ingelogde beheerders:** een vaste rode balk bovenaan met de betrokken accounts.

![Inlogpagina: het demowachtwoord is geblokkeerd, de waarschuwing blijft zichtbaar.](images/security/sec-01-demo-passwort-gesperrt.png)

![Beheerders zien bovenaan een vaste balk met de betrokken accounts.](images/security/sec-02-warnleiste-administrator.png)

### Zo lost u het op

1. **Als andere beheerder:** Beheer → Gebruikers → account openen → nieuw wachtwoord instellen (de gebruiker moet het bij de volgende login wijzigen).
2. **Op de server** (ook als de enige beheerder is getroffen): `node scripts/set-password.js admin` — in de Docker-container: `docker exec -it <container> node scripts/set-password.js admin`. Het wachtwoord wordt zonder echo gevraagd; bestaande sessies van het account eindigen.

## HTTPS

De sessiecookie krijgt de vlag **Secure** en de server stuurt **HSTS** zodra het verzoek via HTTPS binnenkomt: met een eigen certificaat (`SSL_CERT_FILE`/`SSL_KEY_FILE`) of achter een proxy waarvoor **`TRUST_PROXY`** is ingesteld (zonder deze variabele herkent de app HTTPS achter de proxy niet).

Via HTTP blijft het systeem voorlopig werken maar **waarschuwt bij het starten**: cookie en wachtwoorden zijn op het netwerk te lezen. In een latere release is HTTP in productie alleen nog toegestaan met `ALLOW_INSECURE_HTTP=true`. Gebruik het systeem in productie uitsluitend via HTTPS.

## Opmerkingen bij de update

- Na de update **logt iedereen één keer opnieuw in** (oude inlogtokens gelden niet meer).
- Wie in productie nog een **demowachtwoord** gebruikt, wordt buitengesloten — zie “Zo lost u het op”.
- Achter een proxy `TRUST_PROXY` instellen zodat HTTPS wordt herkend.

_De schermafbeeldingen tonen de Duitse interface._

## Nood: buitengesloten door de 2FA-verplichting

Als de **2FA-verplichting** onder *Beheer → Organisatie → Beveiligingsbeleid* is ingeschakeld en **geen enkele beheerder** 2FA heeft ingesteld, kan niemand meer inloggen: het inloggen antwoordt `ENFORCE_2FA`, en 2FA kan pas na het inloggen worden ingesteld.

**Voorkomen.** De server schakelt de verplichting alleen in als de handelende beheerder **zelf** 2FA heeft ingesteld (anders fout `ENFORCE_2FA_SELF`, er wordt niets gewijzigd). Vóór het inschakelen toont de interface hoeveel accounts nog geen 2FA hebben. Stel eerst 2FA in voor minstens twee beheerders. Bij het starten schrijft de server een waarschuwing in het logboek als de verplichting aan staat en geen beheerder 2FA heeft.

**Noodweg op de opdrachtregel** (`scripts/emergency-2fa.js`, alle opslag-backends; **stop eerst de server**, anders overschrijft die de wijziging):

```
node scripts/emergency-2fa.js status                      # toont de toestand, wijzigt niets
node scripts/emergency-2fa.js disable-policy              # schakelt de 2FA-verplichting uit
node scripts/emergency-2fa.js reset-user <gebruikersnaam> # zet de 2FA van een account terug
```

Docker: `docker exec -it <container> node scripts/emergency-2fa.js status`. Het hulpmiddel vraagt vóór elke wijziging bevestiging (typ JA; `--yes` slaat de vraag over), maakt bij JSON-opslag een reservekopie (`*.notfall-<tijd>.bak`), legt de wijziging vast in het auditlogboek (gebruiker `notfall-cli`) en toont nooit geheimen. Draait er nog een server, dan stopt het (`--force` forceert). Daarna: server starten, als beheerder inloggen, **2FA instellen**, en pas dan de verplichting weer inschakelen.

Wie het hulpmiddel kan uitvoeren, heeft toegang tot de gegevens van de server; het is geen omweg langs de toegangsbeveiliging, maar de weg van de beheerder.
