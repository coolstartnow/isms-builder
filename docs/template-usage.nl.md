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


## Concept met AI (optioneel)

In de werkbalk van de editor (vanaf de rol Content Owner, alleen als de AI-integratie is ingeschakeld) maakt **“Concept met AI”** een tekstconcept. U controleert en bewaart het altijd zelf.

- **Kies het document uit de lijst** (bijv. wachtwoordbeleid, procedure voor patchbeheer) en de **taal**. Er is bewust geen vrij titelveld, zodat er geen namen of bedrijfsgegevens in het verzoek terechtkomen.
- **Aanwijzing (optioneel):** maximaal 200 tekens, bijv. “NIS2, werken op afstand”. E-mailadressen, telefoonnummers, IBAN’s, IP-adressen, webadressen, identificaties, sleutels, bedrijfsaanduidingen en de namen uit de organisatiegegevens worden herkend en **blokkeren** het verzenden. Het filter kan willekeurige persoonsnamen niet betrouwbaar herkennen; zet er dus geen in.
- **Het dialoogvenster toont precies wat wordt verzonden en waarheen**, voordat er iets vertrekt. Alleen het gekozen document, de taal en de aanwijzing worden verzonden.
- **Plaatshouders:** het model schrijft `{{COMPANY_NAME}}`, `{{ISMS_OWNER}}`, `{{DATA_PROTECTION_OFFICER}}` en `{{ISMS_SCOPE}}`. Na het antwoord worden ze **lokaal** vervangen uit *Beheer → Organisatie*. Is daar een waarde leeg, dan blijft de plaatshouder staan en krijgt u een melding.
- Bestaande tekst in de editor wordt pas na bevestiging overschreven.

---

Uitgebreid, met beide wegen (direct en kopiëren/plakken), inrichting en probleemoplossing: gids “Module: AI-concepten (beleidsassistent)” in het systeemhandboek (`docs/module-ai-drafts.nl.md`).

## CSV-export en -import

Boven de documentenlijst (“Bestaande documenten”):

- **Exporteren als CSV** (alle rollen): schrijft **alle documenten van alle typen** naar een bestand `documents-<datum>.csv` (UTF-8, komma, opent in Excel en LibreOffice). Kolommen: `id, type, title, language, status, version, owner, nextReviewDate, parent, content`.
- **CSV importeren** (vanaf Content Owner): leest zo’n bestand, ook met een puntkomma als scheidingsteken (Duits Excel). Voordat er iets wordt aangemaakt, toont een dialoogvenster hoeveel documenten worden aangemaakt, overgeslagen of als ongeldig geweigerd, telkens met de reden.
  - De import maakt **alleen nieuwe concepten** aan (versie 1, u bent eigenaar). Zelfde type, titel en taal als een bestaand document: overgeslagen. **Bestaande documenten worden nooit gewijzigd**, ook goedgekeurde niet; goedkeuring en versiebeheer blijven onaangeroerd.
  - Verplichte kolommen: `type`, `title`, `language`, `content`. `type` moet in uw lijst met documenttypen staan, `language` is `de`, `en`, `fr`, `nl` of `hu`. Optioneel: `nextReviewDate` (JJJJ-MM-DD) en `parent` (titel van het bovenliggende document). De kolommen `id`, `status`, `version` en `owner` worden genegeerd.
  - Grenzen: 500 rijen en 5 MB per bestand.
  - Leid eigen bestanden het best af van een export: rijen verwijderen of wijzigen, titels aanpassen, importeren.

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
