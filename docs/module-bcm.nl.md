# Module: Business Continuity Management (BCM)

> BCM zorgt ervoor dat de organisatie operationeel blijft bij ernstige verstoringen —
> ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Inleiding: wat is ISO 22301?

> **Belangrijke opmerking — geen officiële weergave:** deze inleiding is een **eigen, vereenvoudigde samenvatting** van ISMS Builder. Ze is **niet de tekst van de norm**, **geen officiële of gezaghebbende versie** van ISO 22301 en **geen vervanging van de norm**. Alleen de **actuele uitgave van de norm** is bepalend; die is te verkrijgen bij uw normalisatie-instituut (in Duitsland DIN/Beuth, internationaal ISO). De tekst is **geen advies** en geeft geen zekerheid dat een implementatie op basis hiervan aan een certificering voldoet. Hoofdstuknummers en termen kunnen afwijken van de uitgave die uw organisatie gebruikt.

**ISO 22301** beschrijft hoe een organisatie een **business-continuïteitsmanagementsysteem (BCMS)** opzet en gebruikt. Het doel is dat belangrijke diensten bij een verstoring (brand, cyberaanval, stroomuitval, uitval van een leverancier, pandemie) blijven draaien of binnen een aanvaardbare tijd weer beschikbaar zijn. Net als ISO 27001 is het een **managementsysteemnorm**: ze zegt **wat** een werkend systeem moet bereiken, niet **hoe** het technisch wordt opgelost. Certificering is mogelijk. ISO 27001 beschermt informatie, ISO 22301 zorgt dat de bedrijfsvoering doorgaat.

De norm heeft **geen bijlage met een maatregelencatalogus** (anders dan ISO 27001), maar eisen („moet”-zinnen) in hoofdstuk 4 tot en met 10, volgens het schema dat alle ISO-managementsysteemnormen delen:

| Hoofdstuk | Vraag erachter | Ondersteuning in ISMS Builder |
|---|---|---|
| **4 Context** | Waar staan we, wat hoort bij het systeem? | Organisatie, reikwijdte (document), verplichtingen in de module Juridisch |
| **5 Leiderschap** | Staat de leiding erachter? | Continuïteitsbeleid als beleid (Documenten), rollen en verantwoordelijken |
| **6 Planning** | Welke risico's, welke doelen? | Risicobeheer, beveiligingsdoelen (bijv. „kritieke dienst binnen 4 uur terug”) |
| **7 Ondersteuning** | Middelen, kennis, documenten? | Trainingen en bewijs, bevestiging van beleid, documentbeheersing |
| **8 Uitvoering** | Hoe wordt continuïteit bereikt? | **deze module**: BIA, plannen, oefeningen |
| **9 Evaluatie van prestaties** | Werkt het echt? | Indicatoren en dashboard, audits, directiebeoordeling (Governance) |
| **10 Verbetering** | Hoe leren we van fouten? | Bevindingen en maatregelen, beveiligingsdoelen |

### Hoofdstuk 8 — Uitvoering (de kern, gedekt door deze module)
- **8.2 Business impact-analyse en risicobeoordeling:** welke activiteiten tellen, hoe snel wordt een uitval duur, waarvan hangen ze af? → tabblad **BIA**.
- **8.3 Strategieën en oplossingen:** hoe overbruggen we een uitval (uitwijklocatie, noodstroom, tweede leverancier, thuiswerken)? → als strategie beschrijven in de BIA en de plannen.
- **8.4 Plannen en procedures:** responsstructuur, waarschuwing, communicatie, continuïteitsplannen en terugkeer naar normaal bedrijf. → tabblad **Continuïteitsplannen**.
- **8.5 Oefenprogramma:** plannen worden op geplande momenten en na belangrijke wijzigingen geoefend, met een rapport. → tabblad **Oefeningen**.
- **8.6 Evaluatie:** zijn analyse, plannen en procedures geschikt, en wat volgt eruit? → resultaten van oefeningen en audits.

### Hoofdstuk 9 en 10 — Evaluatie en verbetering (uitvoerbaar met het systeem)
- **9.1 Monitoring en meting:** BCM-dashboard (BIA's naar kritiekheid, processen zonder goedgekeurd plan, laatste en volgende oefening) en rapporten; beveiligingsdoelen met meetwaarden.
- **9.2 Interne audit:** een audit van het BCMS uitvoeren zoals elke andere — module **Audits** (controlepunten, auditprogramma als jaarplan, auditrapport).
- **9.3 Directiebeoordeling:** **Governance → Management Reviews**; invoer (auditresultaten, oefeningen, indicatoren) en besluiten daar vastleggen.
- **10.1 Afwijkingen en corrigerende maatregelen:** tekortkomingen uit audits en oefeningen vastleggen als **bevindingen** en volgen met **maatregelen** (module Maatregelen) tot en met de controle van de werking.
- **10.2 Voortdurende verbetering:** maatregelen, beveiligingsdoelen en de volgende oefeningen afleiden uit wat u leert.

### De wijziging van 2024
ISO 22301:2019/Amd 1:2024 is heel klein: in **4.1** moet de organisatie beoordelen of **klimaatverandering** voor haar een relevant onderwerp is; in **4.2.1** staat een opmerking dat belanghebbenden klimaatgerelateerde eisen kunnen hebben. Nieuwe maatregelen worden niet verlangd, alleen de beoordeling en de vastlegging ervan (bijv. in het reikwijdtedocument of het risicoregister).

### ISO 22313 — de bijbehorende richtlijn
**ISO 22313** is een **richtlijn voor de implementatie** van ISO 22301. Ze bevat geen certificeerbare eisen, maar legt uitvoerig uit hoe de afzonderlijke eisen in de praktijk kunnen worden vervuld (adviezen en voorbeelden over BIA, strategieën, plannen en oefeningen). Wij raden aan haar naast ISO 22301 aan te schaffen, vooral bij de eerste BIA en de eerste plannen.

> **Let op:** deze inleiding vat de norm samen in eigen woorden en vervangt noch de norm noch de richtlijn. ISO-normen zijn auteursrechtelijk beschermd en worden niet met ISMS Builder meegeleverd; de tekst van de door u in licentie genomen uitgave is bepalend. De koppeling met modules is een oriëntatie, geen certificeringsuitspraak.

---

## Drie deelgebieden

Het BCM-module bestaat uit drie nauw verweven gebieden:

| Gebied | Doel |
|---|---|
| **BIA** (Business Impact Analysis — Bedrijfsimpactanalyse) | Kritieke processen identificeren en gevolgen van uitval beoordelen |
| **Continuïteitsplannen** | Concrete herstelplannen voor kritieke processen |
| **Oefeningen** | Oefeningen en tests van plannen documenteren |

---

## Business Impact Analysis (BIA)

De BIA beantwoordt de vraag: **Wat gebeurt er als dit proces uitvalt —
en hoe lang kunnen we dat tolereren?**

**BCM → BIA → « + Nieuwe BIA »**

Velden:
- **Procesnaam** — welk bedrijfsproces?
- **Proceseigenaar en afdeling**
- **Kritikaliteit** — `low` / `medium` / `high` / `critical`
- **RTO** (Recovery Time Objective — Hersteltijddoelstelling) — maximaal tolereerbare uitvalduur (uren)
- **RPO** (Recovery Point Objective — Herstelpuntdoelstelling) — maximaal tolereerbaar gegevensverlies (uren)
- **MTPD** (Maximum Tolerable Period of Disruption — Maximaal tolereerbare verstoringsperiode) — absolute maximale uitvalduur
- **Afhankelijkheden** — van welke systemen/leveranciers is het proces afhankelijk?
- **Betrokken systemen**
- **Status** — `draft` / `reviewed` / `approved`

> **RTO en RPO** zijn de centrale indicatoren van de BIA. RTO definieert hoe snel
> het proces hersteld moet zijn, RPO definieert hoe oud de gegevens bij het herstel
> maximaal mogen zijn.

---

## Continuïteitsplannen (herstelplannen)

Voor elk kritiek proces (BIA-kritikaliteit `high`/`critical`) dient een
herstelplan te bestaan.

**BCM → Plannen → « + Nieuw plan »**

Velden:
- **Plannaam** — bijv. « Herstel productiedatabase »
- **Gekoppelde BIA** — op welke BIA heeft het plan betrekking?
- **Activeringstrigger** — wanneer wordt het plan geactiveerd?
- **Verantwoordelijke**
- **Stappen** — genummerde handelingsinstructies
- **Middelen** — benodigde systemen, contacten, toegangsgegevens (versleuteld)
- **Status** — `draft` / `tested` / `approved`

---

## Oefeningen

BCM-plannen zijn alleen effectief als ze regelmatig worden geoefend.
ISO 22301 vereist het bewijs van uitgevoerde tests.

**BCM → Oefeningen → « + Nieuwe oefening »**

Velden:
- **Type oefening** — tafeloefening (Tabletop) / simulatieoefening / volledige test
- **Datum en duur**
- **Geteste plannen**
- **Deelnemers**
- **Resultaat** — wat werkte wel, wat niet?
- **Maatregelen** — wat moet worden verbeterd?

---

## Sjablonen voor BIA, plannen en oefeningen

Elk tabblad (**BIA**, **Plannen**, **Oefeningen**) heeft naast „Nieuw” de knop **„Sjabloon gebruiken”** (rol Editor en hoger). Die vult het formulier met voorgestelde waarden die u controleert en aanpast voordat u opslaat.

- **BIA-sjablonen** bevatten kritiekheid, RTO/RPO/MTPD (uren), typische afhankelijkheden en systemen (alleen soorten) en een opmerking. De tijden zijn **voorstellen**: de procesverantwoordelijken beslissen.
- **Plansjablonen** brengen een gestructureerde tekst mee: doel en reikwijdte, activeringscriteria, rollen, directe maatregelen, herstel, communicatie, terugkeer naar normaal bedrijf, onderhoud en oefeningen. `{{COMPANY_NAME}}` en `{{ISMS_OWNER}}` worden uit de organisatiegegevens gevuld; ontbrekende waarden meldt het systeem.
- **Oefeningsjablonen** vullen het nieuwe veld **„Scenario en verloop”**: scenario, doelen, injecties en evaluatievragen.

**Meegeleverde sjablonen (Nederlands):**
- BIA: Salarisverwerking; IT-beheer en datacenter; Klantenservice en support; Orderverwerking en verkoop; Productie en dienstverlening; Inkoop en leveranciersmanagement; Bedrijfscommunicatie en website; Werving en personeelszorg
- Plannen: Algemeen bedrijfscontinuïteitsplan; IT-noodplan (disaster recovery); Cyberaanval en ransomware; Stroomuitval; Uitval van gebouw en locatie; Uitval van een kritieke leverancier; Pandemie en groot personeelstekort; Crisiscommunicatie; Herstart van het datacenter
- Oefeningen: Tabletop-oefening: ransomware; Herstelltest van de back-up; Ontruiming en locatie-uitval; Leveranciersuitval; Test van de alarmeringsketen; Oefening stroomuitval

De sjablonen zijn praktijkgerichte voorstellen in eigen woorden. Ze moeten zorgvuldig op uw bedrijf worden afgestemd, vormen geen advies en bevatten geen normtekst. FR, NL en HU zijn eigen vertalingen; een vakinhoudelijke controle wordt aanbevolen. De richtlijn **ISO 22313** helpt bij de opbouw van het systeem.

---

## AI-concepten voor plannen en oefeningen

Het formulier van een **plan** (veld „Procedures”) en van een **oefening** (veld „Scenario en verloop”) heeft de knop **„Met AI opstellen”** (rol Content Owner en hoger, net als bij documenten). Die opent hetzelfde veilige dialoogvenster als bij beleidsdocumenten: u kiest een onderwerp uit de titellijst (9 plannen, 6 oefeningen), ziet **de exacte tekst die zou worden verzonden** en stuurt die naar de gekoppelde AI of **kopieert** hem voor een AI naar keuze. Persoonsgegevens in het hintveld worden geblokkeerd, bedrijfsplaatshouders worden lokaal vervangen. Het resultaat verschijnt daarna in het tekstveld van het formulier (met bevestiging als er al tekst staat) en is een **concept** dat u controleert en aanpast. Details en titellijst: handleiding „AI-concepten”.

---

## Register van de eisen van ISO 22301

Het tabblad **„Eisen”** toont de eisen van ISO 22301 (hoofdstuk 4 tot en met 10) en de stand van uw implementatie. U ziet in één oogopslag **welke eis waardoor wordt aangetoond** en waar bewijs nog ontbreekt.

**Belangrijk:** de **tekst van de norm wordt niet meegeleverd met ISMS Builder** (auteursrecht). Een beheerder importeert hem uit de **gelicentieerde uitgave** van uw bedrijf. Het register is een werkhulp, geen certificeringsuitspraak; de tekst van uw gelicentieerde uitgave is bepalend.

### Werkwijze
1. **Sjabloon downloaden:** tabblad „Eisen” → „Sjabloon (CSV)”. Het bevat alleen verzonnen voorbeeldregels.
2. **Eigen teksten invullen** (id, titel, beschrijving) uit uw gelicentieerde norm, of dezelfde velden als JSON aanleveren.
3. **Importeren** (alleen beheerders): bestand kiezen. Eerst volgt een **voorbeeld** (nieuw, bijgewerkt, afgewezen met reden per regel); pas „Toepassen” slaat op.
4. **Stand bijhouden** (rol Editor en hoger): per eis status, verantwoordelijke, motivering, bewijs en koppelingen met BIA's, plannen en oefeningen.
5. **Opnieuw importeren** (nieuwe uitgave, wijziging) past de **beschrijvingen** aan, niet de uitvoeringsstatus; er wordt niets verwijderd.

Status: *Open*, *Gedeeltelijk*, *Uitgevoerd*, *Niet van toepassing* (hiervoor is een **motivering verplicht**). De dekkingsbalk telt alleen de laagste niveaus, niet de hoofdstukkoppen. Bij 8.2.2, 8.4.4 en 8.5 toont het systeem aanwijzingen uit bestaande gegevens (aantal BIA's, goedgekeurde plannen, uitgevoerde oefeningen); de status wordt **nooit automatisch** gezet. Export van de stand: „Exporteren (CSV)”.

### Opbouw van het importbestand
Eén regel per eis. **CSV** (UTF-8, komma of puntkomma als scheidingsteken, velden met een komma of regeleinde tussen aanhalingstekens) of **JSON** (lijst of `{ "requirements": [ … ] }`). Kolomnamen in kleine letters, volgorde vrij; onbekende kolommen worden gemeld en genegeerd. Maximaal **2 MB** en **2000 regels**.

| Kolom | Verplicht | Betekenis | Limiet |
|---|---|---|---|
| `framework` | ja | Id van de norm, momenteel alleen `ISO22301` | – |
| `id` | ja | Id van de eis, bijv. `9.1` (uniek per bestand) | 40 tekens |
| `parent` | nee | `id` van de bovenliggende eis (in het bestand of al opgeslagen) | 40 |
| `chapter` | nee | Hoofdstuk; anders het getal vóór de eerste punt van de `id` | 40 |
| `title_de`, `title_en`, `title_fr`, `title_nl`, `title_hu` | minstens één titel | Titel per taal; de taal van de interface wordt getoond, anders Engels, anders de eerste beschikbare | 512 |
| `summary_de` … `summary_hu` | nee | Beschrijving per taal | 4000 |
| `title`, `summary` | nee | Titel/beschrijving zonder taal (geldt als Engels als `title_en` ontbreekt) | 512 / 4000 |
| `amendment` | nee | Verwijzing naar een wijziging, bijv. `Amd 1:2024` | 60 |

De voorvertoning noemt afgewezen regels met reden: verplicht veld ontbreekt, onbekend framework, dubbele id, onbekende bovenliggende eis, tekst te lang.

**CSV-voorbeeld** (verzonnen teksten):

```csv
framework,id,parent,chapter,title_en,summary_en
ISO22301,9,,9,Example chapter,
ISO22301,9.9,9,9,Example requirement,Your description from the licensed standard goes here.
```

**JSON-voorbeeld** (verzonnen teksten):

```json
[
  { "framework": "ISO22301", "id": "9",   "chapter": "9", "title_en": "Example chapter" },
  { "framework": "ISO22301", "id": "9.9", "parent": "9", "chapter": "9",
    "title_en": "Example requirement", "summary_en": "Your description from the licensed standard goes here." }
]
```

Teksten worden als gewone tekst opgeslagen en bij weergave ge-escaped. Bij export naar spreadsheets worden cellen die met `=`, `+`, `-` of `@` beginnen, onschadelijk gemaakt.

**Rechten:** bekijken vanaf Lezer, bijhouden vanaf Editor, importeren alleen beheerders. Elke import en wijziging staat in het auditlog. Bij de overgang naar productie (demo-reset) wordt het register net als de overige demogegevens geleegd.

---

## Dashboard

Het BCM-dashboard toont:
- Aantal BIA's per kritikaliteit
- Processen zonder goedgekeurd plan
- Laatste oefening en volgende geplande oefening
- Plannen met status `draft` (actie vereist)

---

## Auditremark

ISO 27001 A.5.29 vereist informatiebeveiliging in de bedrijfscontinuïteit.
A.5.30 behandelt ICT-gereedheid voor bedrijfscontinuïteit.

De auditor controleert doorgaans:
1. Is er een BIA met gedocumenteerde RTO/RPO-waarden?
2. Zijn er goedgekeurde herstelplannen voor kritieke processen?
3. Zijn de plannen getest? (oefeningsbewijzen)
4. Zijn lessen uit oefeningen in de plannen verwerkt?

Aanbeveling: minimaal één tafeloefening per jaar per kritiek plan.
