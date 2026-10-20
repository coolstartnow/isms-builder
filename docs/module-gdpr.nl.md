# Module: AVG (Algemene Verordening Gegevensbescherming)

> Het AVG-module dekt alle centrale bewijsverplichtingen van de Algemene Verordening
> Gegevensbescherming — van het verwerkingsregister over verwerkersovereenkomsten
> tot verzoeken van betrokkenen.

---

## Overzicht van deelgebieden

| Gebied | Afkorting | Juridische grondslag |
|---|---|---|
| Verwerkingsregister | VR | Art. 30 AVG |
| Verwerkersovereenkomsten (DPA) | VO | Art. 28 AVG |
| Gegevensbeschermingseffectbeoordeling | DPIA | Art. 35 AVG |
| Datalekken | — | Art. 33/34 AVG |
| Inzageverzoeken (DSR) | DSR | Art. 15–22 AVG |
| Technische en organisatorische maatregelen | TOM | Art. 32 AVG |
| Functionaris voor gegevensbescherming | FG | Art. 37–39 AVG |
| Verwijderingsplan | — | Art. 17 AVG |

---

## Verwerkingsregister (VR)

Het VR is het kernregister van de AVG — een volledige lijst van alle
gegevensverwerkingsactiviteiten van de organisatie.

**Aanmaken:** AVG → VR → **« + Nieuwe verwerking »**

Verplichte velden conform art. 30 AVG:
- Benaming en doel van de verwerking
- Verwerkingsverantwoordelijke(n) en eventueel gezamenlijke verantwoordelijken
- Groepen van betrokkenen en categorieën van gegevens
- Ontvangers (intern/extern)
- Doorgifte naar derde landen (ja/nee + beschermingsmaatregel)
- Bewaartermijnen
- Gekoppelde TOM's

**Export:** VR-vermeldingen kunnen als CSV worden geëxporteerd — direct bruikbaar
als bijlage bij het privacyrapport of voor de toezichthouder.

---

## Verwerkersovereenkomsten (VO — ook: DPA, Data Processing Agreement)

Voor elke dienstverlener die persoonsgegevens in opdracht verwerkt
(clouddiensten, IT-dienstverleners, loonadministratie, enz.) is een
verwerkersovereenkomst (VO) vereist conform art. 28 AVG.

**Aanmaken:** AVG → VO → **« + Nieuwe VO »**

Velden: naam dienstverlener, doel, gegevenscategorieën, looptijd, contractbijlage
(PDF-upload mogelijk).

> **Minimale rol voor VO:** `contentowner`

---

## Gegevensbeschermingseffectbeoordeling (DPIA)

Voor verwerkingen met een **hoog risico** voor de rechten van betrokkenen is een
DPIA verplicht conform art. 35 AVG. Typische aanleidingen: systematische monitoring,
verwerking van gevoelige categorieën, geautomatiseerde besluitvorming.

**Aanmaken:** AVG → DPIA → **« + Nieuwe DPIA »**

Velden: beschrijving van de verwerking, noodzakelijkheid en evenredigheid,
geïdentificeerde risico's, corrigerende maatregelen, goedkeuringsstatus.

> **Minimale rol voor DPIA:** `contentowner`

---

## Datalekken

Datalekken met risico voor betrokkenen moeten binnen **72 uur** worden gemeld bij
de toezichthouder (art. 33 AVG).

**Vastleggen:** AVG → Datalekken → **« + Nieuw datalek »**

Velden: tijdstip, aard van het lek, betrokken gegevenscategorieën en aantal personen,
waarschijnlijke gevolgen, genomen maatregelen, meldingsplicht (ja/nee).

> **Minimale rol:** `auditor` of hoger

---

## Inzageverzoeken van betrokkenen (DSR — Data Subject Request)

Betrokkenen hebben het recht op inzage, rectificatie, verwijdering en overdraagbaarheid
(art. 15–22 AVG). De termijn bedraagt **één maand** (verlengbaar tot drie maanden).

**Vastleggen:** AVG → DSR → **« + Nieuw verzoek »**

Velden: type verzoek (inzage/verwijdering/rectificatie/overdracht), ontvangstdatum,
termijn, status (open/in behandeling/afgerond), notities.

> **Minimale rol:** `editor` of hoger — DSR's zijn vertrouwelijk

---

## Technische en organisatorische maatregelen (TOM)

TOM's documenteren de beveiligingsmaatregelen conform art. 32 AVG — zowel technisch
(versleuteling, toegangscontrole) als organisatorisch (trainingen, beleid).

**Aanmaken:** AVG → TOM → **« + Nieuwe TOM »**

Velden: categorie (toegangscontrole, versleuteling, logging, netwerkbeveiliging, applicatiebeveiliging,
back-up en herstel, organisatorisch, training, gegevensbewaring), risiconiveau, beschrijving, implementatiestatus,
gekoppelde VR-vermeldingen, bewijs.

**Sinds versie 1.80** staan de TOM’s in het centrale [maatregelenregister](module-measures.nl.md) (kenmerk *TOM*). Ze verschijnen
daar samen met alle andere maatregelen, zijn te filteren op herkomst “Alleen TOM’s” en kunnen bovendien aan
SoA-controls worden toegewezen. De rechten blijven zoals hier beschreven: aanmaken en wijzigen alleen vanaf `contentowner`.

---

## Functionaris voor gegevensbescherming (FG)

Onder AVG → FG kunnen de contactgegevens en het benoemingsdocument van de
functionaris voor gegevensbescherming worden opgeslagen (PDF-upload). De gegevens
verschijnen automatisch in het AVG-dashboard.

---

## Verwijderingsplan

Het verwijderingslogboek documenteert de daadwerkelijk uitgevoerde verwijderingen —
wanneer welke gegevenscategorie is verwijderd en na welke termijn.

**AVG → Verwijderingslogboek → « + Vermelding »**

Vervallen verwijderingen (op basis van de in het VR vastgelegde termijnen) verschijnen
als melding in het dashboard.

---

## Dashboard

Het AVG-dashboard geeft een snel overzicht:
- Aantal VR-vermeldingen, open DSR's, actieve datalekken
- TOM's per categorie
- Vervallen verwijderingen
- Contactgegevens FG

---

## Auditremark

Bij een AVG-controle door de toezichthouder worden doorgaans gecontroleerd:
volledigheid van het VR, VO's voor alle relevante dienstverleners, DPIA voor
hoog-risicoverwerkingen, bewijs van behandeling van DSR's binnen de termijn,
en de TOM-documentatie. Het AVG-module dekt al deze punten.
