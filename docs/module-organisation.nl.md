# Module: Organisatie & bedrijfslogo

> Hier bepalen beheerders wie de organisatie is: naam, verantwoordelijkheden, talen, meldingen,
> diensten en het **bedrijfslogo**, dat op de aanmeldpagina, in beleids-PDF’s en in afdrukweergaven verschijnt.

---

## Waar vind ik de instellingen?

**Beheer → Organisatie.** Dit gedeelte is alleen zichtbaar voor beheerders. Wijzigingen worden toegepast met **Opslaan** rechtsboven; het bedrijfslogo wordt daarentegen **direct bij het uploaden** opgeslagen.

| Sectie | Inhoud |
|---|---|
| **Algemene informatie** | Naam van de organisatie, afkorting, logotekst, **bedrijfslogo**, reikwijdte van het ISMS |
| **Verantwoordelijkheden** | CISO, functionaris gegevensbescherming (GDPO) en ICS-contact met naam en e-mail |
| **Beveiligingsbeleid** | 2FA voor het hele systeem afdwingen (aanmelden zonder TOTP wordt dan geblokkeerd) |
| **Taalconfiguratie** | Ingeschakelde talen (DE, EN, FR, NL, HU) en standaardtaal van de aanmeldpagina |
| **E-mailmeldingen** | Algemene schakelaar en de afzonderlijke soorten meldingen |
| **SMTP-configuratie** | Mailserver voor meldingen en bevestigingen van beleid |
| **WebDAV-publicatie** | Goedgekeurd beleid automatisch in Nextcloud/ownCloud plaatsen |
| **Menuvolgorde** | Volgorde van de menu-items in de zijbalk |
| **Organisatie-eenheden** | IT-structuur (CIO, groep/centraal, lokaal) voor verantwoordelijkheden in alle modules |

Wachtwoorden voor SMTP en WebDAV zijn **alleen schrijfbaar**: de server toont ze nooit meer, ook niet aan beheerders. Een leeg veld laat het opgeslagen wachtwoord ongewijzigd; verwijderen kan met een aparte keuze.

---

## Bedrijfslogo

Het bedrijfslogo geeft officiële documenten de uitstraling van uw organisatie.

### Uploaden

1. **Beheer → Organisatie → Algemene informatie**, rij **Bedrijfslogo**.
2. Kies een bestand. Het wordt direct opgeslagen en als voorbeeld getoond.
3. Kies een nieuw bestand om te vervangen; klik op **Logo verwijderen** om het te verwijderen.

| Regel | Waarde |
|---|---|
| Indelingen | **PNG** of **JPEG** |
| Grootte | maximaal **512 kB** en **4000 pixels** per zijde |
| Niet toegestaan | SVG en alle andere indelingen. SVG kan scripts bevatten en wordt daarom bewust geweigerd |

Het bestandstype wordt gecontroleerd aan de inhoud van het bestand, niet aan de extensie of de opgave van de browser. Een **liggend logo met transparante of witte achtergrond** past het best; tot ongeveer 840 × 400 pixels volstaat voor alle uitvoer.

### Waar het logo verschijnt

| Plaats | Weergave |
|---|---|
| **Aanmeldpagina** | boven het aanmeldformulier, op een lichte tegel (zodat donkere logo’s leesbaar blijven) |
| **Beleids-PDF** | klein rechtsboven op de eerste pagina, de titel begint eronder |
| **Afdrukweergaven** | rechtsboven in de afdrukvensters van rapporten, risico-, bevindingen- en maatregeloverzichten, auditoutput en de documentexport |

Niet beïnvloed: de kop van de app en de mobiele app. Zonder logo blijft alle uitvoer zoals voorheen, alleen zonder afbeelding.

Wie het logo mag **zien**: iedereen die de aanmeldpagina bereikt (die toont het). Wie het mag **wijzigen**: alleen beheerders; elke wijziging staat in het auditlog.

### Demo en productie

- In de **demomodus** levert ISMS Builder een eigen logo mee. Het wordt ingesteld bij het laden van de demogegevens, maar alleen als er nog geen eigen logo is.
- Bij de **overstap naar productie** (Beheer → Onderhoud → Demo-reset) wordt het demologo verwijderd. Een zelf geüpload logo blijft staan.
- Daarna herinnert ISMS Builder u eraan **het bedrijfslogo in te stellen**: in het resultaat van de reset, in de melding op de aanmeldpagina, bovenaan het dashboard (voor beheerders) en in de instellingen. De melding verdwijnt zodra een logo is geüpload.

### Back-up

Het logo is een bestand in de gegevensmap (`org-logo.png` of `org-logo.jpg` met `org-logo.json`), onafhankelijk van de gekozen opslag-backend. Het maakt **geen** deel uit van de JSON-gegevensexport; een back-up van de gegevensmap bevat het wel.

---

## Tips

- Upload het logo **vóór** de eerste beleids-PDF. Al gemaakte PDF’s veranderen niet.
- Ziet het logo er in de PDF onscherp uit, gebruik dan een groter bestand (tot 4000 pixels) van nog steeds maximaal 512 kB.
- Laad de pagina na het uploaden opnieuw als een geopend tabblad nog het oude logo toont.
