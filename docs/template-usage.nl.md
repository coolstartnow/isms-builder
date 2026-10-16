# Sjablonen: Gebruik in ISMS Builder

> Sjablonen zijn het centrale werkinstrument van ISMS Builder. Deze gids legt uit hoe
> u sjablonen aanmaakt, bewerkt, door de goedkeuringscyclus begeleidt en koppelt
> aan andere modules.

---

## Wat is een sjabloon?

Een sjabloon is een geversioneerd, statusbeheerd document — bijvoorbeeld een beleid,
een procedure of een vrijgavedocument. Elk sjabloon volgt een gedefinieerde levenscyclus
en kan worden gekoppeld aan controls (SoA), risico's en andere sjablonen.

Beschikbare sjabloontypen:

| Type | Doel |
|---|---|
| **policy** | Bindende regels (Wat geldt er?) |
| **procedure** | Werkinstructies (Hoe wordt het gedaan?) |
| **soa** | Begeleidende documenten bij het SoA-proces |
| **incident** | Incidentresponsplannen en sjablonen |
| **release** | Wijzigings- en vrijgavedocumentatie |

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Sjablonen lezen | `reader` |
| Sjabloon bewerken (inhoud, status) | `editor` |
| Sjabloon aanmaken, verplaatsen, verwijderen | `contentowner` |
| Definitief verwijderen, herstellen | `admin` |

---

## Een sjabloon aanmaken

**Stap 1 — Type kiezen**
Klik in de zijbalk onder het gewenste sjabloontype op **"+ Nieuw"**.

**Stap 2 — Verplichte velden invullen**
- **Titel** — unieke naam (bijv. "Wachtwoordbeleid v1.0")
- **Eigenaar** — verantwoordelijk persoon of rol
- **Geldig vanaf / Volgende beoordeling** — datumvelden voor levenscyclusbeheer
- **Gekoppelde ISO-controls** — optionele koppeling met SoA-controls

**Stap 3 — Inhoud invoeren**
Het inhoudsgebied ondersteunt **Markdown**. Voor gestructureerde beleidsregels wordt
de volgende indeling aanbevolen:

```
# Titel
## 1. Doel
## 2. Toepassingsgebied
## 3. Regels
## 4. Verantwoordelijkheden
## 5. Overtredingen en gevolgen
## 6. Beoordeling en actualisering
```

**Stap 4 — Opslaan**
Het sjabloon wordt opgeslagen met status `draft` en is alleen zichtbaar voor
ingelogde gebruikers met de rol `reader` of hoger.

---

## Levenscyclus (statusworkflow)

Elk sjabloon doorloopt vier statusfasen:

```
draft  →  review  →  approved  →  archived
```

| Status | Betekenis | Zichtbaar voor |
|---|---|---|
| `draft` | In bewerking, nog niet vrijgegeven | Vanaf `reader` |
| `review` | Wordt beoordeeld, wacht op goedkeuring | Vanaf `reader` |
| `approved` | Officieel geldig, in productiegebruik | Vanaf `reader` |
| `archived` | Vervangen, alleen ter referentie | Vanaf `reader` |

> **Auditopmerking:** De volledige statusgeschiedenis wordt opgeslagen in het auditlogboek.

---

## Versiegeschiedenis

De **versie verandert alleen bij goedkeuring**, niet bij opslaan. U kunt zo vaak opslaan als u wilt zonder het versienummer te wijzigen; een document krijgt zijn versie wanneer het van `review` naar `approved` gaat. De eerste goedkeuring behoudt het bestaande nummer, elke volgende verhoogt het met 1.

**Goedkeuren:** de knop „Goedkeuren” vraagt eerst om bevestiging: **„Goedkeuren als versie X?”**, met een optionele **wijzigingsopmerking**. Pas „Ja, goedkeuren” voert de goedkeuring uit.

**Goedgekeurde documenten zijn vergrendeld:** titel en inhoud kunnen niet worden gewijzigd zolang de status `approved` is (de interface toont de leesweergave en een melding, de server weigert wijzigingen met `409`). De volgende beoordelingsdatum blijft bewerkbaar. Om verder te werken zet u het document terug naar `review` (rol `contentowner`), bewerkt u het en keurt u het opnieuw goed — daarbij ontstaat de volgende versie.

**Versiegeschiedenis in de documentkop:** boven het document staat (uitklapbaar, ook via het **klokpictogram**) de tabel

| Versie | Goedgekeurd door | Goedgekeurd op | Wijzigingen |
|---|---|---|---|

met gebruikersnaam, tijdstip en wijzigingsopmerking van elke goedkeuring. Dezelfde tabel staat in de afdruk/PDF en in de PDF voor de Nextcloud-publicatie. Bij elke goedkeuring wordt ook een momentopname van de inhoud bewaard. Documenten die vóór deze functie al waren goedgekeurd, tonen de laatste goedkeuring uit de statushistorie als eerste regel.

---

## Bijlagen

Sjablonen kunnen bestanden als bijlage ontvangen (PDF, DOCX — max. 25 MB).
Minimale rol voor toevoegen: `editor`.

---

## Koppelingen naar andere modules

- **→ SoA-controls:** Selecteer de ISO-controls die door dit document worden gedekt.
- **→ Risico's:** Koppel beleidsregels aan risico's als risicobeperkende maatregelen.
- **→ Beleidsbevestiging:** Verstuur goedgekeurde beleidsregels ter bevestiging aan medewerkers.

---

## Beoordelingstermijnen

Het veld **"Volgende beoordeling"** wordt actief bewaakt:
- Sjablonen waarvan de beoordeling ≤ 14 dagen verschuldigd is, verschijnen in de **kalender**
- De beheerder ontvangt een **e-mailmelding** (als SMTP is geconfigureerd)

Aanbeveling: beleidsregels jaarlijks beoordelen, procedures elk half jaar.
