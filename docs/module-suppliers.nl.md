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

## Bewijslink en vervaldatum

In het leveranciersformulier kunt u een **bewijslink** opslaan, bijvoorbeeld naar het ISO 27001-certificaat of het SOC-rapport van de leverancier, en aangeven **tot wanneer het bewijs geldig is**.

- **Bewijslink** — adres van een document dat **u zelf beheert** (bijv. SharePoint of het leveranciersportaal). Alleen adressen die beginnen met `http://` of `https://` worden geaccepteerd.
- **Label van het bewijs** — korte tekst bij de link, bijv. „ISO 27001-certificaat”.
- **Bewijs geldig tot** — datum waarop het bewijs verloopt.

ISMS Builder slaat alleen de verwijzing op. De link wordt nooit geopend en er wordt niet gecontroleerd of hij bereikbaar is, noch wat de inhoud of geldigheid van het document is; de controle ligt bij u. Op de vervaldatum verschijnt een item **„Bewijs van leverancier verloopt”** in de agenda, vanaf 60 dagen eerder en ook na het verlopen, zolang de leverancier niet „inactive” of „terminated” is. In de leverancierslijst toont de kolom „Bewijs” de link en markeert ze verlopen bewijs.

---

## Leveranciersassessment per e-mail

Voor kritieke leveranciers kan een **beveiligingsvragenlijst** worden verzonden
zonder dat de leverancier een account nodig heeft:

**Leverancier openen → « Assessment verzenden »**

De leverancier ontvangt een gepersonaliseerde link en vult de vragenlijst
rechtstreeks in de browser in. De antwoorden worden opgeslagen en gekoppeld
aan het leveranciersprofiel.

---

## Vragenlijstsjablonen en NIS2-catalogus

Onder **Leveranciers → Vragenlijstsjablonen** bepaalt u welke vragen een leverancier moet beantwoorden. Dat kan per leverancier of type dienstverlening verschillen.

- **Catalogi:** "Standaard" (19 vragen, ISO 27001) en "NIS2-leveranciersbeoordeling" (56 vragen in 13 onderdelen, gestructureerd volgens Richtlijn (EU) 2022/2555, art. 20, art. 21, lid 2, onder a) t/m j) en art. 23). De vragen zijn eigen formuleringen, geen officiële checklist en geen juridisch advies. De NIS2-catalogus is beschikbaar in het Duits en Engels; in andere talen verschijnen de vragen in het Engels.
- **Eigen sjablonen:** kies per vraag of ze wordt **gesteld**, of ze **verplicht** is en of een ja/nee-vraag een **opmerkingsveld** biedt (bijv. voor een link naar bewijs). Onderdelen kunnen als geheel worden aan- of uitgezet; u kunt eigen vragen toevoegen. De ingebouwde sjablonen zijn niet te wijzigen; gebruik "Aanpassen als nieuw sjabloon". Editors maken en wijzigen sjablonen; lezers kunnen ze bekijken.
- **Per leverancier aanpassen:** bij het aanmaken van een beoordelingslink kiest u een sjabloon en kunt u de selectie voor deze leverancier nog wijzigen. De selectie wordt als kopie opgeslagen; latere wijzigingen aan het sjabloon raken uitgegeven vragenlijsten niet.
- **Verplichte vragen** zijn voor de leverancier met * gemarkeerd en worden ook op de server gecontroleerd. Oudere vragenlijsten gedragen zich zoals voorheen.
- Opmerkingen en antwoorden zijn invoer van de leverancier en worden alleen als tekst getoond; de Builder opent nooit een link uit een opmerking.

---

## Leveranciersbrievenbus (de Builder blijft intern)

De Builder is bedoeld voor intern gebruik. Zodat leveranciers toch zelf informatie kunnen aanleveren zonder dat de Builder vanaf internet bereikbaar hoeft te zijn, is er de **leveranciersbrievenbus**: een kleine aparte dienst (project `isms-supplier-portal`) die alleen vragenlijsten en versleutelde antwoorden bevat en geen ISMS-gegevens kent.

- **Verloop:** de Builder plaatst de vragenlijst *uitgaand* in de brievenbus. De leverancier opent de link van de brievenbus en vult in; zijn browser **versleutelt de antwoorden vóór het verzenden** (AES-256-GCM, sleutel verpakt met RSA-OAEP-256 voor uw publieke sleutel). De Builder haalt de antwoorden *uitgaand* op (elke 5 minuten of via “Antwoorden ophalen”), ontsleutelt ze zelf en verwijdert ze daarna in de brievenbus. De brievenbus kan de antwoorden niet lezen.
- **Instellen (beheerder)** onder **Leveranciers → Vragenlijstsjablonen → Leveranciersbrievenbus:** adres (https), API-sleutel van de brievenbus, sleutelpaar aanmaken, “Brievenbus gebruiken” activeren, verbinding testen. De **privésleutel** staat buiten de gegevensmap (`~/.config/isms-builder/supplier-portal.pem` of `SUPPLIER_PORTAL_KEY_FILE`, rechten 600) en **u moet die back-uppen** — zonder is ontvangen antwoorden niet te lezen. Bij vervanging van het sleutelpaar blijft de oude sleutel als kopie bewaard. Gebruikt de brievenbus een zelfondertekend certificaat, maak de certificeringsinstantie dan bekend via `NODE_EXTRA_CA_CERTS`.
- **Verzendwijze:** kies bij het aanmaken van een beoordelingslink “Via de brievenbus” of “Rechtstreeks”. Vragenlijsten via de brievenbus levert de pagina van de Builder niet meer uit. Kan de vragenlijst niet in de brievenbus worden geplaatst, dan wordt hij niet aangemaakt.
- **Terugval zonder netwerk:** “Bestand importeren” neemt een bestand met antwoorden uit de brievenbus over; het wordt op dezelfde manier gecontroleerd.
- **Grenzen:** de versleuteling beschermt de vertrouwelijkheid tegenover de brievenbus maar bewijst niet van wie een antwoord komt: wie de link kent, kan één keer antwoorden. Antwoorden zijn invoer van de leverancier. Ontbreken uitdrukkelijk verplichte vragen, dan wordt het antwoord overgenomen en met ! gemarkeerd. Bewaartermijnen en verwerkersovereenkomsten voor het beheer van de brievenbus regelt u zelf.

---

## Taal, pdf-formulier en invoeren van antwoorden

- **Taal:** bij het aanmaken van een beoordelingslink zijn alleen de talen beschikbaar die in de **organisatie-instellingen** zijn geactiveerd (en volledig zijn vertaald). De interfacetaal is voorgeselecteerd; is er maar één taal geactiveerd, dan vervalt de keuze. De titel volgt de gekozen taal. Dit geldt voor beide verzendwijzen (brievenbus en rechtstreeks) en voor de pdf.
- **Contactpersoon:** naam en e-mail van de contactpersoon staan op het formulier; de naam en het e-mailadres van de CISO uit de organisatie-instellingen zijn voorgeselecteerd en per vragenlijst aan te passen.
- **Adres:** voer straat, postcode/plaats, land en telefoon in onder **Beheer → Organisatie**; ze verschijnen in de kop van het pdf-formulier naast het bedrijfslogo.
- **Pdf-formulier:** bij een openstaande vragenlijst maakt de knop **PDF-formulier** een **invulbare pdf** met logo, bedrijfsnaam, adres, contactpersoon, leverancier, uiterste datum, referentie, aankruisvakjes (ja/nee), opmerkings- en tekstvelden, verplichte vragen met * en een handtekeningblok. De leverancier vult het op het scherm of met de hand in en stuurt het per e-mail of post terug. De pdf bevat **niet** de geheime link, alleen de referentie van de vragenlijst. De pdf gebruikt het ingesloten **pdf-lettertype** van de organisatie (standaard Liberation Sans; Beheer → Organisatie), zodat speciale letters van alle officiële EU-talen goed worden weergegeven. Uitzondering: wat de leverancier in de formuliervelden typt, tekent zijn pdf-programma met het standaard pdf-lettertype; of speciale tekens daar in elk programma verschijnen, is niet getest.
- **Antwoorden invoeren:** met **Antwoorden invoeren** nemen editors de antwoorden uit het teruggestuurde formulier over in een scherm met dezelfde vragen. Ontbreken verplichte antwoorden, dan vraagt de Builder om bevestiging; ze worden pas na bevestiging opgeslagen en met ! gemarkeerd. De vragenlijst krijgt de aanduiding “Formulier” en een spoor in het auditlog. Alleen een openstaande vragenlijst kan zo worden beantwoord; beoordeel daarna zoals gewoonlijk.

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
