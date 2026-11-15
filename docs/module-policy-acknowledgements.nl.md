# Module: Policy Acknowledgements (Beleidsbevestiging)

> Aantoonbare verspreiding en bevestiging van beleidsregels door medewerkers —
> een centraal auditdocument voor ISO 27001.

---

## Wat is een Policy Acknowledgement?

ISO 27001 vereist niet alleen dat beleidsregels bestaan, maar ook dat ze aan de
betrokken personen **bekend zijn gemaakt** en dat deze hun **begrip hebben bevestigd**
(vereiste 7.3 en A.6.3). Het klassieke bewijs: een ondertekende ontvangstbevestiging.

De ISMS Builder automatiseert dit proces volledig:
- Beleidsregel selecteren → distributielijst definiëren → link per e-mail versturen
- Ontvanger bevestigt via een gepersonaliseerde link (geen login vereist)
- De ontvanger ziet het beleid **leesbaar opgemaakt** (weergegeven Markdown: koppen, tabellen, lijsten), niet meer als ruwe brontekst
- Volledige bewijsdocumentatie met tijdstempel en CSV-export

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Kerncijfers op het dashboard zien (“Actieve distributierondes”, “Openstaande bevestigingen”) | `reader` |
| Distributieoverzicht en details van de bevestigingen inzien (menu-item “Beleidsbevestigingen”) | `contentowner` |
| Distributie aanmaken en verzenden | `contentowner` |
| Herinnering versturen | `contentowner` |
| Bevestiging handmatig vastleggen of importeren | `contentowner` |
| Distributie verwijderen | `admin` |

Lezers zien alleen de samengevatte cijfers op het dashboard. De ontvangerslijsten met e-mailadres, naam, tijdstip en IP-adres van de bevestiging zijn voorbehouden aan de contentowner, omdat ze persoonsgegevens bevatten.

---

## Werkstroom: beleidsregel distribueren

**Stap 1 — Distributie aanmaken**
Klik in het menu **« Policy Acknowledgements »** op **« + Nieuwe distributie »**.

**Stap 2 — Verplichte velden**
- **Beleidsregel kiezen** — alleen templates met de status `approved` zijn selecteerbaar
- **Titel van de distributie** — bijv. « Wachtwoordbeleid 2026 – Jaardistributie »
- **Vervaldatum** — wanneer moet de bevestiging ontvangen zijn?
- **Ontvangers** — namen en e-mailadressen van te informeren personen

**Stap 3 — Verzenden**
Via **« Verzenden »** ontvangt elke ontvanger een e-mail met een **gepersonaliseerde
bevestigingslink**. De link is gekoppeld aan de persoon en werkt zonder login.

**Stap 4 — Bevestiging door de ontvanger**
De ontvanger opent de link, ziet de volledige beleidstekst en klikt op
**« Ik bevestig deze beleidsregel gelezen en begrepen te hebben »**.
Tijdstempel en IP-adres worden opgeslagen.

**Stap 5 — Status volgen**
In het distributieoverzicht is de stand op elk moment zichtbaar:
- Wie heeft bevestigd (met tijdstempel)
- Wie heeft nog niet bevestigd
- Hoeveel procent is voltooid

---

## Herinneringsfunctie

Via **« Herinnering sturen »** ontvangen alle ontvangers die nog niet bevestigd hebben
opnieuw een e-mail met dezelfde gepersonaliseerde link.

---

## Handmatige bevestiging en import

Voor personen zonder e-mailtoegang (bijv. productiemedewerkers):

**Individueel vastleggen:** Klik in de distributie op **« Bevestiging vastleggen »** — naam,
datum en optionele notitie invullen.

**CSV-import:** Bulkimport via een CSV-bestand met de kolommen
`name, email, confirmedAt` (formaat: ISO 8601).

---

## Export en bewijs

Via **« Exporteren als CSV »** in de distributie wordt een volledige bevestigingslijst
gedownload — geschikt als auditbewijs:

```
name, email, confirmedAt, method
Max Mustermann, m.mustermann@firma.de, 2026-03-15T10:23:00Z, link
Anna Schmidt, a.schmidt@firma.de, 2026-03-16T08:45:00Z, manual
```

---

## Auditremark

De auditor verwacht voor elk veiligheidsgerelateerd beleid het bewijs van bekendmaking.
De CSV-exports van de distributies zijn daarvoor het geschikte document. Aanbeveling:
- Jaarlijkse distributie van alle actieve beleidsregels
- Bij beleidswijzigingen: nieuwe distributie starten
- Exports archiveren in het documentbeheersysteem
