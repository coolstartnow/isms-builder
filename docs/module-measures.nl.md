# Module: Maatregelenregister

> Eén centraal register voor alle maatregelen in het ISMS — ISO 27001 clausule 6.1.3 eist dat
> risicobehandelingen worden vastgesteld, uitgevoerd en opgevolgd; art. 32 AVG eist hetzelfde voor technische
> en organisatorische maatregelen (TOM’s).

---

## Eén maatregel, één plek

Maatregelen ontstaan op veel plaatsen: als behandeling van een risico, als gevolg van een auditbevinding, als
besluit uit een directiebeoordeling of als TOM op grond van art. 32 AVG. Vroeger hield elke module een eigen
lijst bij. Sinds versie 1.80 is er **één gegevensbestand**: het maatregelenregister. De modules tonen hun
maatregelen nog steeds op de vertrouwde plek, maar lezen en schrijven ze in het register. Een wijziging op
de ene plek geldt daarom overal, en geen enkele maatregel verschijnt dubbel.

| Herkomst | Waar bewerkt | Kenmerk in het register |
|---|---|---|
| Risicobehandeling | Risk & Compliance → Behandelplannen | Toegewezen aan een **risico** |
| Actie bij een bevinding | Reports → Auditbevindingen | Toegewezen aan een **bevinding** |
| Governance-maatregel | Governance → Acties | Kenmerk **Governance** |
| TOM op grond van art. 32 AVG | GDPR → TOM’s | Kenmerk **TOM** |
| Eigen maatregel | Maatregelen | Toegewezen aan **SoA-controls**, of zonder toewijzing |

Een maatregel kan meerdere dingen tegelijk zijn: een maatregel “MFA voor beheerders” kan een control
uitvoeren en tegelijk een risico behandelen.

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Maatregelen bekijken | `reader` |
| Maatregel aanmaken en bewerken | `editor` |
| Maatregel toewijzen aan een **risico** of een **bevinding**; maatregelen met risicotoewijzing wijzigen | `auditor` of `contentowner` |
| TOM aanmaken of wijzigen (kenmerk TOM) | `contentowner` |
| Maatregel verwijderen | `contentowner` |
| Governance-maatregel verwijderen | `admin` |
| Verwijderde maatregel herstellen of definitief verwijderen | `admin` |

Het register geeft niemand meer rechten dan de modules voorheen: wie risicobehandelingen alleen als auditor
mocht wijzigen, mag ze ook in het register alleen als auditor wijzigen.

---

## Het register

**Maatregelen** (in de navigatie, na “SoA – Controls”)

![Maatregelenregister met kerncijfers, filters en lijst](images/measures/register-list.png)

*De schermafbeeldingen tonen de Duitse interface met de Duitse demogegevens; de interface is beschikbaar in
vijf talen.*

**Kerncijfers** bovenaan: Totaal, Gepland, In uitvoering, Uitgevoerd (inclusief “Effectiviteit gecontroleerd”),
Achterstallig en Zonder toewijzing. Een maatregel is *achterstallig* als de vervaldatum is verstreken en hij
nog gepland of in uitvoering is. *Zonder toewijzing* zijn maatregelen die niet aan een control, bevinding of
risico zijn toegewezen en geen TOM of governance-maatregel zijn — ze vallen bij een audit als eerste op,
omdat onduidelijk is waarvoor ze dienen.

**Zoeken en filteren:** volledige tekst (referentie, titel, beschrijving, uitvoering, verantwoordelijke),
status, verantwoordelijke, “Alleen achterstallige” en **herkomst**.

![Filter “Alleen risicobehandelingen”](images/measures/register-filter-risk.png)

De herkomstfilters: *Alle herkomsten*, *Alleen TOM’s*, *Alleen governance-maatregelen*, *Alleen
risicobehandelingen*, *Alleen bevindingsacties*.

**Kolom “Toewijzing”:** pictogrammen tonen waaraan de maatregel is gekoppeld (control, bevinding, risico), met
aantal.

**Export:** **CSV** (beschermd tegen formule-injectie in spreadsheets) en **PDF** (afdrukweergave) bevatten de
momenteel gefilterde lijst.

---

## Maatregel aanmaken en bewerken

**Maatregelen → “+ Nieuwe maatregel”**. De maatregel krijgt automatisch een referentie `M-001`, `M-002`, …

| Veld | Betekenis |
|---|---|
| Titel, beschrijving | Wat moet worden bereikt |
| Uitvoering (concreet) | Wat is gedaan: wat, hoe, waar, hoe vaak — het bewijs voor auditors |
| Verantwoordelijke | Wie voert uit |
| Vervaldatum / Beoordeling op | Uitvoeringstermijn en vervolgdatum voor de effectiviteitscontrole |
| Status | `Gepland` · `In uitvoering` · `Uitgevoerd` · `Effectiviteit gecontroleerd` · `Geannuleerd` |

Wordt een maatregel op *Uitgevoerd* of *Effectiviteit gecontroleerd* gezet, dan vult het systeem de datum
automatisch in als “Afgerond op”, als er geen is opgegeven. Geannuleerde maatregelen blijven in het register
(voor de traceerbaarheid), maar tellen niet meer als lopende behandeling van een risico.

### Toewijzingen

De sectie **Toewijzing** koppelt de maatregel aan **SoA-controls**, **bevindingen** en **risico’s**. Elke lijst
heeft een filterveld.

![Formulier met de drie keuzelijsten voor controls, bevindingen en risico’s](images/measures/form-links.png)

Elke maatregel die aan een risico is toegewezen, geldt als **behandeling van dat risico** en verschijnt onder
Risk & Compliance → Behandelplannen. Elke maatregel die aan een bevinding is toegewezen, verschijnt in het
actieplan van de bevinding. Editors zien deze twee lijsten alleen-lezen (zie rollen); controls kunnen ze vrij
toewijzen.

### Governance-maatregel

Met het kenmerk **Governance-maatregel** wordt de maatregel ook in het onderdeel Governance beheerd. Daarbij
horen extra velden: **Aanleiding** (managementreview, interne of externe audit, incident, overig),
**Verwijzing** (bijv. auditnummer), **Prioriteit**, **Voortgang (%)**, e-mail van de verantwoordelijke,
**Afgerond op** en notities.

![Formulier: sectie Governance-maatregel](images/measures/form-governance.png)

Een governance-maatregel mag alleen een beheerder verwijderen, ook in het register.

### TOM (art. 32 AVG)

Met het kenmerk **TOM** verschijnt de maatregel ook in de AVG-module onder “TOM’s”. Extra velden:
**Categorie** (toegangsbeheer, versleuteling, logging, netwerkbeveiliging, applicatiebeveiliging, back-up en
herstel, organisatorisch, training, gegevensbewaring), **Risiconiveau**, **Bewaarregel** en **Bewijs**.
Alleen contentowners mogen TOM’s aanmaken en wijzigen, zoals in de AVG-module.

---

## Waar maatregelen verschijnen

**SoA – Controls:** in een uitgeklapte control toont het blok **“Maatregelen voor deze control”** de
toegewezen maatregelen met status. Een klik opent de maatregel; **“Maatregel toevoegen”** maakt een nieuwe aan
en wijst die meteen aan de control toe.

![SoA: blok “Maatregelen voor deze control”](images/measures/soa-block.png)

**Bevindingen:** het **actieplan** van een bevinding toont zijn maatregelen zoals voorheen en werkt met
dezelfde records als het register. Daaronder somt het blok **“Maatregelen (register)”** ze op met
referentie en status.

![Bevinding: actieplan en maatregelen (register)](images/measures/finding-block.png)

**Risico’s:** het tabblad **Behandelplannen** toont alle behandelingen van alle risico’s; het risicodetail
toont de behandelingen van het afzonderlijke risico.

![Risk & Compliance: Behandelplannen](images/measures/risk-treatments.png)

**Governance:** het tabblad **Acties** toont de governance-maatregelen met aanleiding, prioriteit en voortgang.
Bijlagen (notulen, bewijs) blijven daar aan de maatregel hangen.

![Governance: Acties](images/measures/governance-actions.png)

**AVG:** het tabblad **TOM’s** toont de maatregelen met het kenmerk TOM.

![GDPR: TOM’s](images/measures/gdpr-toms.png)

**Agenda:** maatregelen met een vervaldatum verschijnen met hun datum. Risicobehandelingen, bevindingsacties
en governance-maatregelen hebben elk een eigen gebeurtenistype; alle overige verschijnen als maatregeltermijn.
Dezelfde maatregel wordt niet daarnaast als algemene maatregeltermijn vermeld. Hoort hij tegelijk bij een
risico en een bevinding, dan verschijnt hij voor beide contexten.

**AI-zoekfunctie:** het register is onderdeel van het zoeken; maatregelen zijn te vinden op trefwoord of vraag.

---

## Bestaande gegevens (upgrade naar 1.80)

Bij de eerste start met versie 1.80 neemt het systeem de tot nu toe in de modules ingebedde maatregelen
automatisch over in het register: TOM’s, risicobehandelingen, bevindingsacties en governance-maatregelen.

- **Kenmerken, tijdstempels en verwijderstatus blijven behouden**; de referenties `M-…` worden toegekend op aanmaakdatum.
- **Het proces is herhaalbaar:** al overgenomen records worden niet opnieuw aangemaakt.
- **De oude gegevens blijven ongewijzigd staan** (`risks.json`, `findings.json`, `governance.json`,
  `gdpr/toms.json` of de databasetabellen). Ze worden niet meer gelezen, maar dienen als back-up.
- **Statussen** worden omgezet: *open / in behandeling / klaar* van de modules komen overeen met *Gepland / In uitvoering / Uitgevoerd*.
- **Nieuwe ID’s:** nieuwe governance-maatregelen krijgen ID’s van de vorm `meas_…` (voorheen `gact_…`);
  bestaande kenmerken veranderen niet.

Bij de overstap van JSON naar een SQL-database met `tools/migrate-json-to-knex.js` gaat het register mee met
alle velden en bijlagen.

**Demogegevens:** de demobundels (Duits, Engels, Frans, Nederlands, Hongaars) bevatten het register met alle
vijf herkomsten. Een bundel opnieuw laden vervangt het register.

---

## Prullenbak

Verwijderde maatregelen staan in de prullenbak (**Admin → Prullenbak**, behalve TOM’s: die staan bij de
AVG-items) en kunnen door beheerders worden hersteld of definitief verwijderd. Wordt een behandeling in een
risico of een actie in een bevinding “verwijderd” terwijl die nog aan een control of aan andere risico’s of
bevindingen is toegewezen, dan wordt alleen de toewijzing aan dat risico of die bevinding opgeheven; de
maatregel zelf blijft in het register.

---

## API

| Methode | Pad | Doel |
|---|---|---|
| GET | `/measures` | Lijst; filters `q`, `status`, `responsible`, `control`, `finding`, `risk`, `overdue`, `tom`, `governance`, `source`, `priority`, `category` |
| GET | `/measures/summary` | Kerncijfers |
| GET | `/measures/{id}` | Eén maatregel |
| POST | `/measures` | Aanmaken |
| PUT | `/measures/{id}` | Wijzigen (alleen de meegegeven velden) |
| DELETE | `/measures/{id}` | Verwijderen (prullenbak) |
| POST | `/measures/{id}/restore` | Herstellen (admin) |
| DELETE | `/measures/{id}/permanent` | Definitief verwijderen (admin) |

De bestaande interfaces van de modules (`/risks/{id}/treatments`, `/findings/{id}/actions`,
`/governance/actions`, `/gdpr/toms`) blijven ongewijzigd en werken op hetzelfde gegevensbestand.

---

## Auditopmerking

Voor ISO 27001 vormen het register en zijn vermeldingen het bewijs voor clausules 6.1.3
(risicobehandeling), 8.3 (uitvoering van de behandeling) en 10.2 (corrigerende maatregelen). Auditors vragen
doorgaans:

1. Is er voor elk risico dat niet wordt geaccepteerd een maatregel met een verantwoordelijke en een termijn?
2. Zijn achterstallige maatregelen bekend en onderbouwd?
3. Is voor uitgevoerde maatregelen bewijs (uitvoering, effectiviteitscontrole) vastgelegd?
4. Leiden auditbevindingen tot maatregelen, en zijn die te volgen?

Voor art. 32 AVG tonen de TOM’s met categorie, risiconiveau en bewijs aan dat de maatregelen passend zijn.
