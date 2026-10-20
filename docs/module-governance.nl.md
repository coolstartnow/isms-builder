# Module: Governance (ISMS-sturing)

> Governance documenteert de managementactiviteiten die het ISMS draaiende houden —
> beoordelingen, besluiten en maatregelen vanuit de directie.
> ISO 27001 hoofdstuk 9.3 (Directiebeoordeling).

---

## Drie deelgebieden

| Gebied | Doel |
|---|---|
| **Directiebeoordelingen** | Verslagen van de ISMS-beoordeling door de directie |
| **Acties** | Maatregelen en besluiten uit beoordelingen |
| **Vergaderingen** | Vergaderverslagen van het ISMS-comité |

---

## Directiebeoordelingen

ISO 27001 hoofdstuk 9.3 schrijft voor dat de hoogste leiding het ISMS op **geplande
intervallen** beoordeelt. De beoordeling moet bepaalde invoer in aanmerking nemen
(auditresultaten, incidenten, doelbereiking) en leiden tot gedocumenteerde uitvoer
(verbeterbesluiten).

**Governance → Beoordelingen → « + Nieuwe beoordeling »**

Velden:
- **Datum en deelnemers**
- **Invoer** — auditresultaten, KPI-stand, incidenten sinds de laatste beoordeling,
  risicosituatie, middelenbehoefte, verbetervoorstellen
- **Resultaten** — besluiten, verantwoordelijken, termijnen
- **Volgende beoordeling**

---

## Acties (maatregelen)

Maatregelen uit beoordelingen of andere bronnen (audits, incidenten) worden
hier bijgehouden.

**Governance → Maatregelen → « + Nieuwe maatregel »**

Velden:
- **Titel en beschrijving**
- **Bron** — uit welke beoordeling/audit/incident stamt de maatregel?
- **Verantwoordelijke en vervaldatum**
- **Prioriteit** — `low` / `medium` / `high`
- **Status** — `open` / `in_progress` / `completed` / `cancelled`

**Sinds versie 1.80** staan deze maatregelen in het centrale [maatregelenregister](module-measures.nl.md) (kenmerk *Governance*). Aan de bediening hier
verandert niets; in het register verschijnen ze samen met alle andere maatregelen en kunnen ze bovendien aan controls, bevindingen en
risico’s worden toegewezen. Bijlagen blijven in dit onderdeel aan de maatregel hangen. Verwijderen mag nog steeds alleen een beheerder.

---

## Vergaderingen

Verslagen van reguliere ISMS-sturingsbijeenkomsten (bijv. maandelijks
veiligheidscomité).

**Governance → Vergaderingen → « + Nieuwe vergadering »**

Velden: datum, deelnemers, agenda, besluiten, volgende vergadering.

---

## Dashboard

Het governance-overzicht toont:
- Open maatregelen per prioriteit en vervaldatum
- Laatste en volgende geplande directiebeoordeling
- Achterstallige maatregelen (rood gemarkeerd)

---

## Auditremark

ISO 27001 hoofdstuk 9.3 is een van de meest becommentarieerde vereisten bij
eerste audits — veel organisaties hebben geen gedocumenteerde directiebeoordeling.

De auditor controleert:
1. Heeft een directiebeoordeling plaatsgevonden? (minimaal eenmaal per jaar)
2. Is de voorgeschreven invoer in aanmerking genomen?
3. Zijn maatregelen gedocumenteerd en traceerbaar?

Aanbeveling: minimaal één formele directiebeoordeling per jaar, bij voorkeur halfjaarlijks.
