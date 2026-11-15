# Moodul: tarnijate haldus

> Tarnijaid ja teenusepakkujaid, kellel on juurdepääs infovaradele, tuleb hinnata
> ja jälgida — ISO 27001 A.5.19 kuni A.5.22.

---

## Miks tarnijate haldus?

Paljud turvaintsidendid pärinevad kolmandatelt osapooltelt, kellel on juurdepääs süsteemidele või andmetele
(tarneahela rünnakud, ebaturvalised SaaS-teenused, kontrollimata alltöövõtjad). ISO 27001
nõuab seetõttu süstemaatilist lähenemist tarnijate riskidele.

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Tarnijate vaatamine | `reader` |
| Tarnijate loomine ja muutmine | `editor` |
| Tarnijate kustutamine / taastamine | `admin` |

---

## Tarnija loomine

**Tarnijad → „+ Uus tarnija“**

Väljad:
- **Nimi** — ettevõtte nimi
- **Kategooria** — nt IT-teenusepakkuja, pilveteenuse pakkuja, hooldusettevõte
- **Kontakt** — kontaktisik, e-post
- **Juurdepääsutase** — milliste süsteemide/andmetega on tarnijal juurdepääs?
- **Riskihinnang** — `low` / `medium` / `high` / `critical`
- **Olek** — `active` / `inactive` / `under_review`
- **Järgmine ülevaatus** — millal on järgmine hindamine tähtajaline?
- **Turvanõuded** — milliseid nõudeid on kokku lepitud?
- **Tõendid** — kas ISO sertifikaat, SOC2 aruanne või andmetöötluse leping on olemas?

---

## Tõendi link ja aegumiskuupäev

Tarnija vormis saab salvestada **tõendi lingi**, näiteks tarnija ISO 27001 sertifikaadile või SOC-aruandele, ja märkida, **kuni millal tõend kehtib**.

- **Tõendi link** — dokumendi aadress, mida **te ise haldate** (nt SharePoint või tarnijaportaal). Aktsepteeritakse ainult aadresse, mis algavad `http://` või `https://`.
- **Tõendi nimetus** — lühike tekst lingi jaoks, nt „ISO 27001 sertifikaat“.
- **Tõend kehtib kuni** — kuupäev, mil tõend aegub.

ISMS Builder salvestab ainult lingi. See ei ava linki kunagi ega kontrolli kättesaadavust ega dokumendi sisu või kehtivust; kontroll jääb teie kätte. Aegumiskuupäeval ilmub kalendrisse kirje **„Tarnija tõend aegub“**, alates 60 päeva enne ja ka pärast aegumist, kui tarnija pole „inactive“ ega „terminated“. Tarnijate loendis näitab veerg „Tõend“ linki ja märgib aegunud tõendid.

---

## Tarnija hindamine e-postiga

Kriitiliste tarnijate jaoks saab saata **turvaküsimustiku** ilma, et tarnijal
oleks vaja kontot:

**Ava tarnija → „Saada hindamine“**

Tarnija saab isikustatud lingi ja täidab küsimustiku otse brauseris.
Vastused salvestatakse ja seotakse tarnija profiiliga.

---

## Küsimustiku mallid ja NIS2 kataloog

Menüüs **Tarnijad → Küsimustiku mallid** määrate, millistele küsimustele tarnija peab vastama. See võib tarnijati või teenuse liigi järgi erineda.

- **Kataloogid:** „Standard” (19 küsimust, ISO 27001) ja „NIS2 tarnija hindamine” (56 küsimust 13 jaotises, mis on üles ehitatud direktiivi (EL) 2022/2555 artikli 20, artikli 21 lõike 2 punktide a–j ja artikli 23 järgi). Küsimused on meie enda sõnastus, mitte ametlik kontrollnimekiri ega õigusnõu. NIS2 kataloog on saadaval saksa ja inglise keeles; muudes keeltes kuvatakse küsimused inglise keeles.
- **Oma mallid:** valige iga küsimuse puhul, kas see esitatakse, kas see on **kohustuslik** ja kas jah/ei küsimusel on **märkuse väli** (nt tõendi lingi jaoks). Jaotisi saab tervikuna sisse või välja lülitada; saate lisada oma küsimusi. Sisseehitatud malle ei saa muuta; kasutage valikut „Kohanda uue mallina”. Malle loovad ja muudavad toimetajad; lugejad näevad neid.
- **Kohandamine tarnija kaupa:** hindamislingi loomisel valite malli ja saate valikut selle tarnija jaoks veel muuta. Valik salvestatakse koopiana; malli hilisemad muudatused väljastatud küsimustikke ei muuda.
- **Kohustuslikud küsimused** on tarnijale märgitud *-ga ja neid kontrollitakse ka serveris. Vanemad küsimustikud käituvad nagu varem.
- Märkused ja vastused on tarnija sisestatud ning kuvatakse ainult tekstina; Builder ei ava kunagi märkuses toodud linki.

---

## Tarnijate postkast (Builder jääb sisemiseks)

Builder on mõeldud sisemiseks kasutamiseks. Et tarnijad saaksid siiski ise teavet anda ilma, et Builder peaks olema internetist kättesaadav, on olemas **tarnijate postkast** – eraldi väike teenus (projekt `isms-supplier-portal`), mis hoiab ainult küsimustikke ja krüpteeritud vastuseid ega tea ISMS-i andmeid.

- **Kulg:** Builder paneb küsimustiku postkasti *väljaminevalt*. Tarnija avab postkasti lingi ja täidab; tema brauser **krüpteerib vastused enne saatmist** (AES-256-GCM, võti RSA-OAEP-256-ga seotud teie avaliku võtmega). Builder toob vastused *väljaminevalt* (iga 5 minuti järel või nupuga „Too vastused“), dekrüpteerib need ise ja kustutab seejärel postkastist. Postkast ei saa vastuseid lugeda.
- **Seadistamine (administraator):** **Tarnijad → Küsimustiku mallid → Tarnijate postkast:** aadress (https), postkasti API-võti, võtmepaari loomine, „Kasuta postkasti“ sisselülitamine, ühenduse test. **Privaatvõti** asub andmekataloogist väljaspool (`~/.config/isms-builder/supplier-portal.pem` või `SUPPLIER_PORTAL_KEY_FILE`, õigused 600) ja **peate selle ise varundama** – ilma selleta ei saa saabunud vastuseid lugeda. Võtmepaari asendamisel jääb vana võti koopiana alles. Kui postkast kasutab ise allkirjastatud sertifikaati, tehke sertifitseerimiskeskus Builderile teatavaks muutujaga `NODE_EXTRA_CA_CERTS`.
- **Edastusviis:** hindamislingi loomisel valige „Postkasti kaudu“ või „Otse“. Postkasti kaudu käivaid küsimustikke Builderi oma leht enam ei esita. Kui küsimustikku ei saa postkasti panna, seda ei looda.
- **Varuvariant ilma võrguühenduseta:** „Impordi fail“ võtab üle postkastist pärit vastustefaili; seda kontrollitakse samamoodi.
- **Piirangud:** krüpteerimine kaitseb konfidentsiaalsust postkasti suhtes, kuid ei tõesta, kellelt vastus pärineb: igaüks, kes linki teab, saab ühe korra vastata. Vastused on tarnija sisestatud. Kui ilmselgelt nõutud küsimused puuduvad, võetakse vastus vastu ja märgitakse !-ga. Postkasti käitamise säilitustähtajad ja töötlemislepingud lahendate ise.

---

## Keel, PDF-vorm ja vastuste sisestamine

- **Keel:** hindamislingi loomisel pakutakse ainult neid keeli, mis on **organisatsiooni seadetes** lubatud (ja millel on täielik tõlge). Eelvalitud on liidese keel; kui lubatud on ainult üks keel, valik peidetakse. Pealkiri järgib valitud keelt. See kehtib mõlemale edastusviisile (postkast ja otse) ning PDF-ile.
- **Kontaktisik:** kontaktisiku nimi ja e-post on vormil; eelvalitud on organisatsiooni seadetest pärit CISO nimi ja e-post ning neid saab küsimustiku kaupa muuta.
- **Aadress:** sisestage tänav, postiindeks/linn, riik ja telefon menüüs **Haldus → Organisatsioon**; need kuvatakse PDF-vormi päises ettevõtte logo kõrval.
- **PDF-vorm:** avatud küsimustiku juures loob nupp **PDF-vorm** **täidetava PDF-i** koos logo, ettevõtte nime, aadressi, kontaktisiku, tarnija, tähtaja, viite, märkeruutude (jah/ei), märkuse- ja tekstiväljade, *-ga märgitud kohustuslike küsimuste ja allkirjaplokiga. Tarnija täidab selle ekraanil või käsitsi ja saadab e-posti või postiga tagasi. PDF **ei sisalda** salajast linki, ainult küsimustiku viidet. PDF kasutab organisatsiooni manustatud **PDF-kirjatüüpi** (vaikimisi Liberation Sans; Haldus → Organisatsioon), nii et kõigi ELi ametlike keelte erimärgid kuvatakse õigesti. Erand: mida tarnija vormiväljadele kirjutab, joonistab tema PDF-programm PDF-vormingu vaikekirjatüübiga; kas erimärgid kuvatakse seal igas programmis, pole kontrollitud.
- **Vastuste sisestamine:** nupuga **Sisesta vastused** kannavad toimetajad tagastatud vormi vastused samade küsimustega vormile. Kui kohustuslikud vastused puuduvad, küsib Builder kinnitust; need salvestatakse alles pärast kinnitust ja märgitakse !-ga. Küsimustik saab märke „Vorm“ ja jälje auditilogisse. Nii saab vastata ainult avatud küsimustikule; seejärel vaadake see läbi nagu tavaliselt.

---

## Riskihinnang

Tarnija riskihinnangu määravad:
- Andmetele juurdepääsu liik ja ulatus
- Sõltuvate protsesside kriitilisus
- Tõendatud turvaabinõud (sertifikaadid, auditid)
- Lepingulised kaitsemeetmed (andmetöötluse leping, NDA, SLA-d)

Tarnijaid hinnanguga `high` või `critical` tuleks üle vaadata vähemalt kord aastas.

---

## Seos IKÜM-iga

Tarnijad, kes töötlevad isikuandmeid, ilmuvad ka IKÜM-i moodulis jaotises
volitatud töötleja lepingud. Seos luuakse käsitsi volitatud töötleja lepingu kirjes.

---

## Seotud riskid

Riskivormis saab riske siduda ühe või mitme tarnijaga (jaotis „Seosed“ → **Mõjutatud varad, varaliigid ja tarnijad**). Tarnija vormis (muutmisel) loetleb jaotis **Seotud riskid** kõik seotud riskid koos taseme ja olekuga.

---

## Töölaud

Tarnijate ülevaade näitab:
- Koguarvu riskihinnangu järgi
- Tarnijaid tähtaja ületanud ülevaatusega
- Aktiivseid ja mitteaktiivseid tarnijaid

---

## Märkus auditiks

ISO 27001 A.5.19 nõuab poliitikat tarnijasuhete jaoks. A.5.20 nõuab
turvanõudeid tarnijalepingutes. A.5.21 käsitleb tarneahela riske.
A.5.22 nõuab tarnijate toimivuse ja turvalisuse regulaarset jälgimist.

Tarnijate hindamise funktsioon võimaldab esitada audiitorile dokumenteeritud
tõendeid turvaülevaatuste kohta.
