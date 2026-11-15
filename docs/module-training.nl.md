# Module: Trainingen en bewustwording (Training)

> Medewerkers zijn de belangrijkste — en vaak meest kwetsbare — factor in het ISMS.
> ISO 27001 hoofdstukken 7.2 en 7.3 alsmede A.6.3 vereisen aantoonbare competentie
> en beveiligingsbewustzijn.

---

## Wat wordt hier gedocumenteerd?

Het Training-module registreert alle trainingsmaatregelen op het gebied van
informatiebeveiliging:
- Verplichte trainingen (onboarding, jaarlijkse training)
- Phishing-simulaties
- Workshops en externe seminars
- E-learning-voltooiingen
- Rolspecifieke trainingen (Admin, CISO, DPO)

---

## Rollen en rechten

| Actie | Minimale rol |
|---|---|
| Trainingen inzien | `reader` |
| Training aanmaken en bewerken | `editor` |
| Training verwijderen / herstellen | `admin` |

---

## Training aanmaken

**Training → « + Nieuwe training »**

Velden:
- **Titel** — bijv. « Phishing-bewustwording Q1 2026 »
- **Type** — Verplichte training / Phishing-simulatie / Workshop / E-Learning / Overig
- **Datum** — wanneer vond de training plaats?
- **Duur** — in uren
- **Trainer / Aanbieder**
- **Doelgroep** — alle medewerkers / IT-afdeling / leidinggevenden, enz.
- **Aantal deelnemers** — hoeveel personen zijn getraind?
- **Dekkingsgraad** — welk percentage van de doelgroep is bereikt?
- **Resultaat / Notities** — beoordeling, bevindingen, verbeterpunten
- **Status** — `planned` / `completed` / `cancelled`

---

## Bewijs vastleggen (tabblad „Bewijzen”)

Bewijs is **geen apart record**, maar het veld **„Bewijs / notities”** van een training. Het tabblad **„Bewijzen”** heeft daarom geen knop „Nieuw”: het toont alleen trainingen met status **Afgerond** en de daar ingevulde bewijstekst.

Zo gaat u te werk:
1. **Tabblad „Plan”** → open de training met het potlood (of maak ze aan met „+ Nieuwe training”).
2. Zet de **status** op *Afgerond* en vul de afrondingsdatum in.
3. Vul in de sectie **„Bewijzen”** het veld **„Bewijs / notities”** in: presentielijst, certificaatnummers, links (`http`/`https`) naar de opgeslagen documenten.
4. **Opslaan.** De training verschijnt nu in het tabblad „Bewijzen”; een klik op de kaart toont de training alleen ter inzage (wijzigen kan uitsluitend in het tabblad „Plan”).

Let op: een training die nog niet *Afgerond* is, verschijnt niet in het tabblad „Bewijzen”, ook niet met bewijstekst. Bestanden voegt u in hetzelfde formulier toe bij „Bijlagen” (zie hieronder).

---

## Bijlagen en deelnamebevestiging

**Bijlagen** (presentielijst, certificaat van een aanbieder, foto's): tabblad „Plan” → training openen → sectie **„Bijlagen”** → „Bestand toevoegen”. Dat kan zodra de training is opgeslagen.
- Toegestaan: PDF, PNG, JPG, DOCX, XLSX en TXT tot 20 MB per bestand. Zowel de extensie **als** de inhoud worden gecontroleerd; andere of vermomde bestanden worden geweigerd.
- Accounts vanaf Editor mogen uploaden en verwijderen; elk account met leesrecht mag downloaden. In het tabblad „Bewijzen” staan de bijlagen als knoppen op de kaart.
- **„Verwijderen” verbergt de bijlage alleen in de lijst.** Het bestand blijft als bewijs op de server (map `training-files/` in de gegevensmap). Maak ook van deze map een back-up; ze maakt geen deel uit van de JSON-export.
- Elke upload en verwijdering staat in het auditlog.

**Deelnamebevestiging (PDF):** knop „Deelnamebevestiging (PDF)” in het tabblad „Bewijzen” (op de kaart) en in het formulier.
- Ze bestaat **alleen voor trainingen met status „Afgerond”**. Bij elke andere status meldt het systeem dat ze na afronding wordt afgegeven.
- **Eén bevestiging per training** (niet per deelnemer): titel, categorie, beschrijving, afrondingsdatum, docent/aanbieder, deelnemers (veld „Toegewezen aan”), verplicht ja/nee, gekoppelde controls, bedrijfslogo en -naam. De accentkleur volgt de categorie, de taal volgt de standaardtaal van de installatie.
- **De controlecode** wordt berekend uit ID, titel, afrondingsdatum, docent en deelnemers (SHA-256, eerste 12 tekens). Wijzigen deze gegevens, dan verandert de code; zo ziet u of een oudere bevestiging nog bij de huidige stand van de training past.
- **Het is een interne verklaring van het bedrijf, geen certificering** door derden; dat staat ook op het document. Er staat geen handtekening op.
- Beperking: het lettertype van de pdf kent geen Hongaarse tekens ő/ű; ze verschijnen als ö/ü.
- Elke uitgifte staat met de controlecode in het auditlog.

---

## Voortgang en indicatoren

Het trainingsoverzicht toont:
- Dekkingsgraad over alle trainingen (doel: 100% van de verplichte trainingen)
- Geplande vs. uitgevoerde trainingen
- Trainingen per type en periode

---

## Koppeling met SoA

Trainingsmaatregelen kunnen worden gekoppeld als implementatiebewijs voor controls,
bijvoorbeeld:
- ISO A.6.3 (Security Awareness Training) → Jaarlijkse training
- ISO A.8.7 (Protection against malware) → Phishing-simulatie

---

## Auditremark

ISO 27001 hoofdstuk 7.2 vereist het bewijs dat medewerkers de noodzakelijke
competentie bezitten. Hoofdstuk 7.3 vereist bewustzijn van het ISMS-beleid
en hun persoonlijke rol daarin.

De auditor verwacht:
1. Een trainingsplan voor het lopende jaar
2. Bewijzen van uitgevoerde trainingen (presentielijsten, certificaten)
3. Een dekkingsgraad die alle relevante medewerkers omvat

Aanbeveling: vermeld presentielijst en links (http/https) in het veld „Bewijs / notities” en voeg certificaten en lijsten als bestand toe bij „Bijlagen”, zodat ze direct beschikbaar zijn bij de audit. In het tabblad „Bewijzen” toont een klik op een kaart de training alleen ter inzage (wijzigen kan in het tabblad „Plan”); links in de bewijstekst zijn klikbaar.