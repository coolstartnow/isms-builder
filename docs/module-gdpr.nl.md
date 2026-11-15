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

> **Uitgebreid:** sjablonen, voortoets, toetsing door de FG en afdrukken staan in de gids “Module: Gegevensbeschermingseffectbeoordeling (DPIA)” (`docs/module-dsfa.nl.md`).

---

## Sjablonen voor items

Elk tabblad heeft sjablonen die een nieuw formulier vooraf invullen met een praktisch voorstel: **verwerkingsactiviteiten (register)**, **verwerkersovereenkomsten**, **datalekken**, **rechten van betrokkenen** (antwoordbrieven) en **TOM’s**. De **DPIA** heeft eigen sjablonen, zie de gids “Module: Gegevensbeschermingseffectbeoordeling (DPIA)”.

**Zo werkt het:** klik in het tabblad op **Sjabloon gebruiken**, kies het sjabloon en klik op **Sjabloon toepassen**. Het formulier opent met het voorstel. U controleert, past aan en slaat op. Pas bij het opslaan ontstaat een item; het sjabloon zelf wordt nooit gewijzigd.

> **Belangrijk:** Alle sjablonen zijn praktijkgericht maar moeten **zorgvuldig op uw eigen bedrijf worden afgestemd**. Ze zijn **geen juridisch advies** en mogen niet als zodanig worden opgevat. Termijnen, rechtsgronden en bewaartermijnen zijn voorstellen die u moet toetsen aan het recht dat voor u geldt. Namen, aanbieders, cijfers en verantwoordelijkheden vult u zelf in.

### Verwerkingsactiviteiten (register) (14)

Vooraf ingevuld worden doel, rechtsgrond, gegevenscategorieën, betrokkenen, ontvangers, bewaring en verwijderprocedure; “hoog risico” is alleen gezet waar dat meestal geldt. De bewaarmaanden zijn alleen ingevuld waar een korte richtwaarde gebruikelijk is.

Beheer van de website en webanalyse; Beheer van leveranciers en zakelijke partners; Boekhouding en facturering; Camerabewaking; Contactformulier en algemene vragen; Evenementen en trainingen; IT-beheer, logging en informatiebeveiliging; Klantenbeheer (CRM); Klantondersteuning en ticketsysteem; Klokkenluidersysteem (meldkanaal); Nieuwsbrief en e-mailmarketing; Personeelsadministratie en salarisverwerking; Sollicitantenbeheer; Tijdregistratie en toegangscontrole.

### Verwerkersovereenkomsten (12)

Vooraf ingevuld worden de titel en de omvang van de verwerking. Verwerker, land, contractdata en de **checklist van art. 28** blijven leeg; u vinkt alleen af wat de overeenkomst werkelijk bevat.

AI-dienst (bijv. assistent of tekstverwerking); Back-up- en archiefdienst; Callcenter en klantenservicedienstverlener; Camerabewaking en beveiligingsdienst; Cloudhosting en datacenter; CRM- en marketingsoftware; Documentvernietiging en verwijdering van gegevensdragers; E-mail-, agenda- en samenwerkingsdienst; HR- en salarissoftware (SaaS); IT-dienstverlener, onderhoud en onderhoud op afstand; Support- en ticketsysteem; Webhosting en websitebureau.

### Datalekken (10)

Vooraf ingevuld worden type, gegevenscategorieën, betrokkenen, directe maatregelen, vervolgmaatregelen, risico en een **voorstel** of de toezichthouder en de betrokkenen moeten worden geïnformeerd. Of een melding nodig is, beslist u per geval.

Diefstal of verlies van papieren documenten; Misbruik van toegangsrechten door medewerkers; Onbedoeld verwijderen of wijzigen van gegevens; Onbedoelde publicatie van persoonsgegevens; Onbevoegde toegang via een gecompromitteerd account; Phishing met prijsgave van inloggegevens; Ransomware-aanval; Verkeerd verzonden e-mail of document; Verkeerde configuratie: gegevens openbaar of te ruim gedeeld; Verlies of diefstal van een laptop, smartphone of gegevensdrager.

### Rechten van betrokkenen, antwoordbrieven (10)

Vooraf ingevuld wordt de antwoordtekst met openings- en slotzin. De plaatshouders `{{COMPANY_NAME}}` en `{{DATA_PROTECTION_OFFICER}}` worden uit de organisatiegegevens ingevuld. Er zijn ook teksten voor het opvragen van een identiteitsbewijs, de verlenging van de termijn en de afwijzing; open punten staan tussen haakjes.

Afwijzing van een verzoek (art. 12, lid 4 en 5); Antwoord op een bezwaar (art. 21); Antwoord op een inzageverzoek (art. 15); Antwoord op een verzoek om beperking van de verwerking (art. 18); Antwoord op een verzoek om gegevensoverdraagbaarheid (art. 20); Antwoord op een verzoek om rectificatie (art. 16); Antwoord op een verzoek om wissing (art. 17); Antwoord over geautomatiseerde besluitvorming (art. 22); Mededeling over verlenging van de termijn (art. 12, lid 3); Verzoek om identiteitsbewijs (art. 12, lid 6).

### TOM’s (24)

Vooraf ingevuld worden titel, categorie, beschrijving en uitvoeringstips; de status is “Gepland”. Wat daadwerkelijk is uitgevoerd, vult u zelf in.

Back-up en geteste herstelprocedure; Bescherming tegen malware; Bewaartermijnen en archivering; Clear desk en schermvergrendeling; Firewall en netwerksegmentatie; Fysieke toegangscontrole tot gebouwen en serverruimten; Gegevensbeschermingsbeheer en betrokkenheid van de FG; Geheimhoudingsverklaring; Invoercontrole (naspeurbaarheid van wijzigingen); Logging en beoordeling; Meerfactorauthenticatie; Nood- en herstelplanning; Patch- en kwetsbaarhedenbeheer; Proces voor datalekken; Pseudonimisering en anonimisering; Rolgebaseerd autorisatieconcept; Scheidingscontrole en doelbinding; Schijf- en apparaatversleuteling; Selectie en controle van verwerkers; Training gegevensbescherming en bewustwording; Transportversleuteling (TLS) en beveiligde toegang op afstand; Veilige ontwikkeling en bescherming van testgegevens; Versleuteling van back-ups en verwijderbare gegevensdragers; Verwijderconcept.

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
