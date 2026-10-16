# Module: Leveranciersbeoordeling (Suppliers)

> Leveranciers en dienstverleners die toegang hebben tot informatiewaarden moeten
> worden beoordeeld en bewaakt — ISO 27001 A.5.19 tot A.5.22.

---

## Waarom leveranciersbeoordeling?

Veel beveiligingsincidenten ontstaan door derden met toegang tot systemen of gegevens
(supply chain-aanvallen, onveilige SaaS-diensten, ongecontroleerde onderaannemers).
ISO 27001 vereist daarom een systematische aanpak van leveranciersrisico's.

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Leveranciers inzien | `reader` |
| Leverancier aanmaken en bewerken | `editor` |
| Leverancier verwijderen / herstellen | `admin` |

---

## Leverancier aanmaken

**Leveranciers → « + Nieuwe leverancier »**

Velden:
- **Naam** — bedrijfsnaam
- **Categorie** — bijv. IT-dienstverlener, Cloud-provider, Onderhoudsbedrijf
- **Contact** — contactpersoon, e-mail
- **Toegangsniveau** — tot welke systemen/gegevens heeft de leverancier toegang?
- **Risicobeoordeling** — `low` / `medium` / `high` / `critical`
- **Status** — `active` / `inactive` / `under_review`
- **Volgende beoordeling** — wanneer is de volgende evaluatie gepland?
- **Beveiligingsvereisten** — welke vereisten zijn overeengekomen?
- **Bewijsstukken** — is er een ISO-certificaat, SOC2-rapport, verwerkersovereenkomst aanwezig?

---

## Leveranciersassessment per e-mail

Voor kritieke leveranciers kan een **beveiligingsvragenlijst** worden verzonden
zonder dat de leverancier een account nodig heeft:

**Leverancier openen → « Assessment verzenden »**

De leverancier ontvangt een gepersonaliseerde link en vult de vragenlijst
rechtstreeks in de browser in. De antwoorden worden opgeslagen en gekoppeld
aan het leveranciersprofiel.

---

## Risicobeoordeling

De risicobeoordeling van een leverancier hangt af van:
- Aard en omvang van de gegevenstoegang
- Kritikaliteit van afhankelijke processen
- Aangetoonde beveiligingsmaatregelen (certificaten, audits)
- Contractuele afdekking (verwerkersovereenkomst, NDA, SLA's)

Leveranciers met beoordeling `high` of `critical` dienen minimaal jaarlijks
te worden beoordeeld.

---

## Koppeling met AVG

Leveranciers die persoonsgegevens verwerken verschijnen ook in het AVG-module
onder Verwerkersovereenkomsten (VO). De koppeling wordt daar handmatig
aangemaakt bij de VO-vermelding.

---

## Gekoppelde risico's

In het risicoformulier kunnen risico's aan een of meer leveranciers worden gekoppeld (sectie „Koppelingen” → **Betrokken assets, assettypen en leveranciers**). In het leveranciersformulier (bij bewerken) toont de sectie **Gekoppelde risico's** alle bijbehorende risico's met niveau en status.

---

## Dashboard

Het leveranciersoverzicht toont:
- Totaal aantal per risicobeoordeling
- Leveranciers met achterstallige beoordeling
- Actieve vs. inactieve leveranciers

---

## Auditremark

ISO 27001 A.5.19 vereist een beleid voor leveranciersrelaties.
A.5.20 vereist beveiligingsvereisten in leverancierscontracten.
A.5.21 adresseert supply chain-risico's.
A.5.22 vereist de periodieke bewaking van leveranciersprestaties en -beveiliging.

De assessment-functionaliteit maakt gedocumenteerd bewijs van de
beveiligingscontrole tegenover de auditor mogelijk.
