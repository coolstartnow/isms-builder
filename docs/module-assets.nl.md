# Module: Assets (Informatiewaarden)

> Het activaregister is de basis van elk ISMS — ISO 27001 Bijlage A.5.9 vereist
> een volledig inventaris van alle informatieverwerkte waarden.

---

## Wat is een asset?

Een asset (informatiewaarde) is alles wat voor de organisatie van waarde is en
beschermd moet worden: software, hardware, gegevens, personen, processen, ruimten.

Typische asset-categorieën:
- **Hardware** — servers, laptops, netwerkapparatuur
- **Software** — besturingssystemen, applicaties, SaaS
- **Gegevens** — databases, back-upmedia, configuratiegegevens
- **Personen** — medewerkers met sleutelrollen
- **Processen** — kritieke bedrijfsprocessen
- **Faciliteiten** — datacenters, kantoorgebouwen

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Assets inzien | `reader` |
| Asset aanmaken en bewerken | `editor` |
| Asset verwijderen / herstellen | `admin` |

---

## Asset aanmaken

**Assets → « + Nieuw asset »**

Velden:
- **Naam** — unieke benaming (bijv. « Productiedatabaseserver »)
- **Type** — bijv. Server, SaaS-toepassing, Database. De lijst is gegroepeerd per categorie (Hardware, Software, Gegevens, Diensten, Faciliteiten) en is aanpasbaar.
- **Eigenaar** — wie is verantwoordelijk?
- **Afdeling / Organisatorische eenheid**
- **Classificatie** — vertrouwelijkheid: `public` / `internal` / `confidential` / `secret`
- **Kritikaliteit** — `low` / `medium` / `high` / `critical`
- **Beschrijving** — wat is dit asset, waar bevindt het zich?
- **Gekoppelde risico's** — welke risico's betreffen dit asset?

---

## Bedrijfsmiddeltypen aanpassen

**Administratie → Lijsten → Bedrijfsmiddeltypen** (alleen beheer)

De meegeleverde typen zijn een uitgangspunt, geen vaste lijst. Ze kunnen worden hernoemd,
aangevuld en verwijderd; elk type hoort bij een van de vijf categorieën.

Er gelden twee waarborgen:

- **Een type dat nog in gebruik is, kan niet worden verwijderd.** Het systeem noemt het type en
  het aantal betrokken bedrijfsmiddelen. Wijs ze eerst opnieuw toe, verwijder daarna.
- **Bij het opslaan van een bedrijfsmiddel wordt het type gecontroleerd.** Een onbekend type
  wordt geweigerd, zodat een typefout niet als eigen type in de gegevens belandt.

Bestaande bedrijfsmiddelen behouden hun type, ook als dat later uit de lijst verdwijnt; in het
formulier verschijnt het als "Onbekend type", zodat het bij bewerken niet stilzwijgend verloren
gaat.

Met **Herstellen** keert de lijst terug naar de standaardwaarden.

### Beschermingsdoelen per type instellen

Elk type kan vertrouwelijkheid, integriteit, beschikbaarheid en authenticiteit vastleggen
(niveaus 1–4). Bedrijfsmiddelen van dat type nemen die waarden over zonder ze afzonderlijk te
onderhouden.

Drie regels zijn daarbij van belang:

- **De standaard werkt per doel.** Een type „Database" kan alleen de vertrouwelijkheid op 4
  zetten; integriteit en beschikbaarheid blijven dan bij het bedrijfsmiddel zelf.
- **De koppeling blijft bestaan.** Een latere correctie op het type geldt onmiddellijk voor alle
  bedrijfsmiddelen die deze niet hebben overschreven — het is geen eenmalige startwaarde.
- **Afwijken kan** met de schakelaar „Beschermingsdoelen los van het type instellen". Zolang die
  uit staat, zijn de vier velden vergrendeld en tonen ze de waarde van het type.

**Type wijzigen in het formulier:** wanneer u in het assetformulier het type wijzigt, tonen de vier beveiligingsvelden meteen de standaardwaarden van het nieuwe type — zonder opslaan en opnieuw openen. Dit geldt zolang „Beschermingsdoelen los van het type instellen” niet is aangevinkt; staat de schakelaar aan, dan blijven uw eigen waarden ongewijzigd. Heeft het nieuwe type geen standaardwaarden, dan zijn de velden vrij bewerkbaar (de schakelaar is dan verborgen). Bij een nieuwe asset gelden de standaardwaarden van het voorgeselecteerde type direct bij het openen.

**Samenspel met afhankelijkheden:** de overerving volgens het maximumprincipe gaat nog steeds
voor. Hangt een bedrijfsmiddel met een hoge beschermingsbehoefte af van een ander, dan wordt dat
andere verhoogd — ook als de waarde daar bewust lager is gezet. Dat is bedoeld: een server waarop
een kritieke toepassing draait, is niet minder beschermenswaardig dan de toepassing zelf. Het
formulier toont dan welk bedrijfsmiddel de waarde verhoogt.

---

### Talen: wat wordt vertaald en wat niet

Dit is een bewuste keuze, geen tekortkoming:

- **De 24 meegeleverde typen zijn vertaald in alle interfacetalen** (DE/EN/FR/NL) en verschijnen
  in de taal die elke gebruiker heeft ingesteld.
- **Een zelf aangemaakt type wordt niet vertaald.** Het verschijnt bij iedere gebruiker precies
  zoals het is ingevoerd. De toepassing kan geen vertaling verzinnen voor een term die zij niet
  kent.
- **Het hernoemen van een meegeleverd type laat ook de vertaling vervallen.** Vanaf dat moment
  geldt de ingevoerde tekst — anders zou uw wijziging in andere talen stilzwijgend worden
  overschreven.

Heeft u een meertalig personeelsbestand en maakt u eigen typen aan, spreek dan één taal af
waarin typebenamingen worden onderhouden — meestal de bedrijfstaal. Herstellen naar de
standaardwaarden zet ook de vertalingen terug.

---

## Classificatie en kritikaliteit

De **classificatie** beschrijft de beschermingsbehoefte met betrekking tot vertrouwelijkheid:

| Niveau | Betekenis |
|---|---|
| `public` | Openbaar toegankelijk, geen schade bij bekendwording |
| `internal` | Alleen intern, beperkte impact |
| `confidential` | Vertrouwelijk, aanzienlijke impact |
| `secret` | Strikt vertrouwelijk, ernstige impact |

De **kritikaliteit** beschrijft de impact van uitval of compromittering
op de bedrijfsactiviteiten.

---

## Koppeling met risico's

Via het Risico-module kunnen risico's direct worden gekoppeld aan betrokken assets.
In het assetdetail zijn alle gekoppelde risico's met hun huidige status zichtbaar.
Dit maakt de **risicoblootstelling** van een asset transparant.

---

## Dashboard

Het assetoverzicht toont:
- Totaal aantal assets per type
- Verdeling per classificatie en kritikaliteit
- Assets zonder eigenaar (actie vereist)

---

## Auditremark

ISO 27001 A.5.9 vereist een bijgehouden activainventaris met eigenaarstoewijzing.
A.5.10 vereist een beleid voor aanvaardbaar gebruik. A.5.12 vereist de classificatie
van informatie. Alle drie vereisten worden gedekt door het Asset-module in combinatie
met een passend beleid.

Aanbeveling: het activaregister jaarlijks controleren en direct bijwerken bij
wezenlijke wijzigingen in het IT-landschap.
