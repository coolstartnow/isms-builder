# Module: Gegevensbeschermingseffectbeoordeling (DPIA)

> Een DPIA beschrijft een geplande verwerking, beoordeelt de risico’s voor de betrokkenen en legt maatregelen vast. De **verwerkingsverantwoordelijke stelt hem zelf op**, de **functionaris voor gegevensbescherming (FG) toetst** hem en geeft een advies. ISMS Builder biedt sjablonen, een voortoets, een toetsingsproces en een afdrukweergave. Al het overige over de module staat in de gids “Module: AVG (gegevensbescherming)”.

> **Opmerking:** Alle sjablonen en de voortoets zijn praktijkgericht maar moeten **zorgvuldig op uw eigen bedrijf worden afgestemd**. Ze zijn **geen juridisch advies** en mogen niet als zodanig worden opgevat; ze vervangen noch de beoordeling van uw individuele geval noch de toetsing door de FG. De nationale lijsten van de toezichthouders raadpleegt u zelf.

---

## Wie doet wat?

| Rol | Taak |
|---|---|
| Vakafdeling / verantwoordelijke (vanaf rol **Content Owner**) | voert de voortoets uit, kiest het sjabloon, vult de DPIA in en legt hem ter toetsing voor |
| **FG** (account met de functie *FG* of beheerder) | toetst de DPIA en voert het **advies** in |
| Verantwoordelijke leiding (Content Owner) | neemt de **beslissing**, motiveert haar en keurt de DPIA goed |

De FG is **niet de opsteller**. Alleen accounts met de functie *FG* en beheerders kunnen een advies invoeren; de server legt persoon en datum vast.

**Demo:** de demoset bevat hiervoor twee afzonderlijke accounts zonder beheerdersrechten: **carla** (`carla@security.example` / `carlapass`) met de functie CISO en **dana** (`dana@privacy.example` / `danapass`) met de functie FG. Test het toetsingsproces: bereid de DPIA voor met **carla**, voer het advies in met **dana**, keur goed met **carla**. **carla** mag het advies niet invoeren.

---

## Verloop in zes stappen

1. **AVG → DPIA → Voortoets: is een DPIA nodig?** Vink aan wat voor uw verwerking geldt (zie hieronder). Het resultaat wordt met de DPIA opgeslagen.
2. **Verder met sjabloon**, of op elk moment **Sjabloon gebruiken**: kies het type verwerking. Het formulier wordt vooraf ingevuld.
3. **Invullen:** beschrijving (doel, betrokkenen, gegevenscategorieën, ontvangers, opslaglocatie, termijnen), noodzaak en evenredigheid, bestaande maatregelen, de **risico’s met hun maatregelen** en het **restrisico**. Waarschijnlijkheid en impact (1 tot 5) in de sjablonen zijn suggesties: controleer en wijzig ze. Maatregelen staan één per regel onder het risico.
4. Zet de status op **Toetsing**. De FG leest de DPIA.
5. **Advies van de FG:** de FG zet **FG geraadpleegd** aan en voert het **advies** in.
6. **Beslissing en goedkeuring:** kies de beslissing (doorgaan, wijzigen, afwijzen) en motiveer haar, zet daarna de status op **Goedgekeurd**.

Daarna: afdrukken of archiveren met **PDF** (bedrijfslogo in de kop, advies van de FG met persoon en datum, goedkeuring) en de DPIA herzien als de verwerking verandert.

---

## Voortoets: is een DPIA nodig?

De voortoets vraagt eerst naar de **gevallen van art. 35, lid 3 AVG**. Geldt er een, dan is een DPIA verplicht:

- Systematische en uitgebreide beoordeling van persoonlijke aspecten van natuurlijke personen op basis van geautomatiseerde verwerking, waaronder profilering, met beslissingen die rechtsgevolgen hebben of hen anderszins aanmerkelijk treffen
- Grootschalige verwerking van bijzondere categorieën persoonsgegevens (art. 9) of van gegevens over strafrechtelijke veroordelingen en strafbare feiten (art. 10)
- Stelselmatig grootschalig monitoren van openbaar toegankelijke ruimten

Daarna de **negen criteria van richtsnoer WP 248** van de Europese gegevensbeschermingsautoriteiten. Gelden er **twee of meer**, dan is doorgaans een DPIA nodig:

1. Evaluatie of scoring (inclusief profilering en voorspelling)
2. Geautomatiseerde beslissingen met rechtsgevolg of soortgelijk aanzienlijk effect
3. Stelselmatige bewaking van personen
4. Gevoelige of zeer persoonlijke gegevens (bijv. gezondheid, biometrie, financiën, locatie)
5. Grootschalige verwerking (veel personen, grote hoeveelheid gegevens, groot gebied of lange duur)
6. Koppelen of combineren van gegevensbestanden uit verschillende bronnen
7. Gegevens van kwetsbare personen (bijv. werknemers, kinderen, patiënten)
8. Gebruik van nieuwe of innovatieve technologie (bijv. AI, biometrie, internet der dingen)
9. De verwerking belet personen een recht uit te oefenen of een dienst of overeenkomst te gebruiken

**Resultaat:**

- Een DPIA is verplicht (art. 35, lid 3 AVG).
- Een DPIA is waarschijnlijk verplicht (twee of meer criteria van richtsnoer WP 248 zijn van toepassing). Wie afziet, moet de redenen vastleggen.
- Een DPIA is niet verplicht. Leg het resultaat van deze toets vast en raadpleeg de lijsten van de toezichthouder in uw land.

De lijsten van de toezichthouder in uw land, waarin gevallen staan waarin een DPIA wel of niet vereist is, raadpleegt u zelf. Wie afziet van een DPIA, legt de redenen vast, bijvoorbeeld in een gearchiveerd record.

---

## De sjablonen

Het sjabloon maakt het beschrijvingsraamwerk, rechtsgronden, typische risico’s met maatregelen en voorgestelde waarden aan. Het bevat geen bedrijfsgegevens behalve de plaatshouder `{{COMPANY_NAME}}`, die uit de organisatiegegevens wordt ingevuld (Beheer → Organisatie). Aangeboden typen verwerking:

- **HR-software in de cloud (personeelsadministratie en salarisverwerking)**: Personeelsadministratie, salarisverwerking en personeelsontwikkeling met cloudgebaseerde HR-software.
- **Camerabewaking**: Bescherming van eigendom en personen, opsporing van strafbare feiten in afgebakende ruimten.
- **Medewerkersbewaking en lokalisatie (werktijd, locatie, prestaties)**: Tijdregistratie, voertuig- of apparaatlokalisatie, gebruiks- en prestatieanalyse.
- **AI-dienst met persoonsgegevens (bijv. assistent, chatbot, analyse)**: Inzet van een AI-dienst ter ondersteuning van taken waarbij persoonsgegevens kunnen worden verwerkt.
- **Profilering en scoring van klanten**: Beoordeling van klanten (kredietwaardigheid, koopgedrag, segmentatie) op basis van geautomatiseerde verwerking.
- **Gezondheidsgegevens (re-integratiebegeleiding, bedrijfsarts)**: Omgang met gezondheidsgegevens van medewerkers, bijvoorbeeld terugkeer na ziekte en arbeidsgezondheidskundig onderzoek.
- **Biometrische toegangscontrole en tijdregistratie**: Toegang tot ruimten of systemen of tijdregistratie met vingerafdruk, gezicht of andere biometrische kenmerken.
- **Klokkenluidersysteem (meldkanaal)**: Ontvangst, beoordeling en afhandeling van meldingen van misstanden via een intern of extern meldkanaal.
- **Sollicitantenbeheer (optioneel met AI-voorselectie)**: Ontvangst, selectie en beheer van sollicitaties, eventueel met geautomatiseerde voorselectie.

Wat u moet aanvullen: de concrete gegevens over **uw** verwerking (ontvangers, aanbieders, opslaglocatie, termijnen, rechtsgrond in het individuele geval), de controle van de voorgestelde risico’s en waarden en de maatregelen die u daadwerkelijk hebt getroffen.

---

## Goedkeuringsregels

| Regel | Effect |
|---|---|
| Nieuwe DPIA | kan niet meteen worden goedgekeurd |
| Advies | alleen functie *FG* of beheerder; persoon en datum worden vastgelegd |
| Goedkeuring | alleen met **FG geraadpleegd** en een ingevoerd advies, een **beslissing** en, bij **hoog of kritiek restrisico**, een **motivering** of het vinkje **Raadpleging van de toezichthouder vereist** |
| Goedkeuringsstempel | persoon en datum worden door de server gezet; vervalt bij terugzetten van de status |
| Auditlog | aanmaken, wijzigingen en statuswijzigingen worden vastgelegd |

Al goedgekeurde DPIA’s uit eerdere versies blijven geldig; de regels gelden bij de volgende statuswijziging.

**Foutmeldingen:** “Goedkeuring vereist het advies van de functionaris voor gegevensbescherming” (advies ontbreekt), “Goedkeuring vereist een beslissing”, “Bij een hoog restrisico …” (motivering toevoegen of raadpleging van de toezichthouder aanvinken), “Alleen de functionaris voor gegevensbescherming of een beheerder mag het advies van de FG invoeren”.

---

## Afdrukken

**PDF** (in de lijst en in het formulier) opent een afdrukweergave met bedrijfslogo, beschrijving, noodzaak, risicotabel met maatregelen, restrisico, advies van de FG, beslissing en goedkeuring. In het afdrukvenster kunt u als PDF opslaan.
