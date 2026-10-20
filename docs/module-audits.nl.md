# Module: Auditbeheer

> Audits plannen, uitvoeren en opvolgen — van de controlelijst via de bevindingen tot het jaarlijkse
> auditprogramma (ISO 27001 par. 9.2, ISO 19011).

---

## Waarom auditbeheer?

ISO 27001 vereist interne audits met geplande tussenpozen en een auditprogramma dat frequentie, methoden,
verantwoordelijkheden en rapportage vastlegt. De module brengt dit samen: de **audit** als object,
**controlepunten** met resultaat, de daaruit voortkomende **bevindingen** en het **auditprogramma** als jaarplan.

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Audits en auditprogramma's bekijken | `reader` |
| Audits, controlepunten en auditprogramma's aanmaken en bewerken | `auditor` of `contentowner` |
| Auditprogramma goedkeuren / terug naar concept | `auditor` of `contentowner` |
| Definitief verwijderen of herstellen uit de prullenbak | `admin` |

Het menu-item **Audits** is zichtbaar vanaf `contentowner` en voor de functies CISO, Revisie en QMB.
Beheerders kunnen de module uitschakelen onder **Admin → Systeem**.

---

## Een audit aanmaken

**Audits → „Nieuwe audit”**

- **Titel**, **type audit** (intern, extern, leveranciersaudit, certificering) en **status**
  (gepland, lopend, afgerond, geannuleerd).
- **Standaard / norm** en **auditomvang**, betrokken **entiteiten**, bij leveranciersaudits de **leverancier**.
- **Leidend auditor** en **auditteam**.
- **Geplande start / einde**, **werkelijke start / einde** en een **opvolgdatum**.
- **Auditprogramma**: koppeling aan een jaarplan (optioneel).
- **Conclusie / resultaat**.

Elke audit krijgt een referentie **AUD-JJJJ-NNNN**. De lijst is te filteren op status, type en jaar.

---

## Controlepunten

Het auditdetail bevat de **controlelijst**. Elk punt heeft

- een **controlverwijzing** (te kiezen uit de SoA, optioneel),
- de **vraag / vereiste**,
- een **resultaat**: open, conform, **afwijking** of niet van toepassing,
- **bewijs** en **opmerkingen**.

Het resultaat kunt u direct in de rij wijzigen. Bij een **afwijking** verschijnt de knop
**„Bevinding aanmaken”**: die maakt een vooraf ingevulde bevinding (vraag als gewenste situatie,
opmerkingen als huidige situatie, auditor, auditperiode, controlkoppeling). Per punt ontstaat slechts één bevinding;
deze is daarna in het punt gekoppeld.

---

## Bevindingen aan een audit toewijzen

Bevindingen uit een controlepunt horen automatisch bij de audit. Bestaande bevindingen kunt u in het bevindingenformulier
onder **Audit** toewijzen (of losmaken). Het auditdetail toont alle toegewezen bevindingen.

---

## Auditprogramma (jaarplan)

**Audits → tabblad „Auditprogramma” → „Nieuw auditprogramma”**

Een programma heeft een **jaar**, **doelstellingen** en **omvang** en krijgt de referentie **AP-JJJJ-NNNN**. Audits worden toegewezen via
het auditformulier (of direct in het programma via **„Audit aan dit programma toevoegen”**). De programmaweergave toont de audits
**per kwartaal** van de geplande start; audits zonder datum staan in een aparte groep.

**Goedkeuring:** **„Goedkeuren”** legt het programma met gebruiker en datum vast en vergrendelt het. Om het te herzien gebruikt u
**„Terug naar concept”**.

---

## Agenda en dashboard

De **agenda** toont per audit de geplande start, het geplande einde (zolang niet afgerond) en de opvolgdatum.
Het **dashboard** toont het totaal aantal audits, achterstallige, audits binnen 30 dagen en openstaande afwijkingen.
Een geplande of lopende audit is achterstallig wanneer het geplande einde is verstreken.

---

## Export

- **Auditlijst:** CSV en PDF (met de actieve filters).
- **Auditrapport:** in het auditdetail via **„Auditrapport”** — stamgegevens, controlepunten, bevindingen en conclusie als PDF.
- **Auditprogramma:** CSV en PDF met het kwartaalplan.

De PDF ontstaat via het afdrukvenster van de browser.

---

## Acties bij bevindingen

Bij elke bevinding hoort een **actieplan** (Reports → Auditbevindingen → een bevinding openen). `auditor` en `contentowner` mogen een actie aanmaken
of verwijderen; iedereen vanaf `editor` mag de status wijzigen.

**Sinds versie 1.80** zijn deze acties vermeldingen in het centrale [maatregelenregister](module-measures.nl.md): het actieplan van de bevinding toont
ze zoals voorheen, en daaronder somt het blok **“Maatregelen (register)”** ze op met referentie (`M-…`) en status. Dezelfde maatregel kan in het register
bovendien aan controls en risico’s worden toegewezen. Wordt in het actieplan een actie verwijderd die elders nog is toegewezen, dan wordt alleen de
toewijzing aan deze bevinding opgeheven.

---

## Prullenbak

Verwijderde audits en auditprogramma's blijven 30 dagen in de prullenbak (**Admin → Prullenbak**) en kunnen door beheerders worden hersteld of
definitief worden verwijderd.

---

## Auditremark

Alle wijzigingen worden vastgelegd in het auditlogboek. Auditbeheer vervangt geen rapport van een certificeringsinstelling,
maar levert het bewijs voor planning, uitvoering en opvolging volgens ISO 27001 par. 9.2.
