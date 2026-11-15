# Moodul: talitluspidevuse juhtimine (BCM)

> BCM tagab, et organisatsioon jääb tõsiste tõrgete ajal töövõimeliseks —
> ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Sissejuhatus: mis on ISO 22301?

> **Oluline märkus — mitte ametlik taasesitus:** See sissejuhatus on ISMS Builderi **oma, lihtsustatud kokkuvõte**. See **ei ole standardi tekst**, **mitte ISO 22301 ametlik ega autoriteetne versioon** ning **ei asenda standardit**. Autoriteetne on ainult **standardi kehtiv väljaanne**; hankige see oma standardimisorganisatsioonilt (Saksamaal DIN/Beuth, rahvusvaheliselt ISO). Tekst **ei ole nõustamine** ega anna kindlust, et selle põhjal tehtud rakendus vastab sertifitseerimisele. Peatükkide numbrid ja mõisted võivad erineda teie organisatsiooni kasutatavast väljaandest.

**ISO 22301** kirjeldab, kuidas organisatsioon ehitab ja käitab **talitluspidevuse juhtimissüsteemi (BCMS)**. Eesmärk on, et olulised teenused jätkavad tõrke (tulekahju, küberrünnak, elektrikatkestus, tarnija tõrge, pandeemia) ajal tööd või on vastuvõetava aja jooksul taas saadaval. Nagu ISO 27001, on see **juhtimissüsteemi standard**: see ütleb, **mida** toimiv süsteem peab saavutama, mitte **kuidas** seda tehniliselt lahendada. Selle vastu saab sertifitseerida. ISO 27001 kaitseb teavet; ISO 22301 tagab tegevuse jätkumise.

Standardil **pole lisa meetmete kataloogiga** (erinevalt ISO 27001-st), vaid nõuded („peab“-väited) punktides 4 kuni 10, järgides kõigile ISO juhtimissüsteemi standarditele ühist mustrit:

| Punkt | Küsimus selle taga | Tugi ISMS Builderis |
|---|---|---|
| **4 Kontekst** | Kus me seisame, mis kuulub süsteemi? | Organisatsioon, kohaldamisala (dokument), kohustused õiguse moodulis |
| **5 Juhtimine** | Kas juhtkond toetab seda? | Pidevuspoliitika poliitikana (dokumendid), rollid ja omanikud |
| **6 Planeerimine** | Millised riskid, millised eesmärgid? | Riskijuhtimine, turvaeesmärgid (nt „kriitiline teenus taas töös 4 tunni jooksul“) |
| **7 Tugi** | Ressursid, teadmised, dokumendid? | Koolitus ja tõendid, poliitikate kinnitused, dokumendikontroll |
| **8 Tegevus** | Kuidas pidevus saavutatakse? | **see moodul**: BIA, kavad, õppused |
| **9 Tulemuslikkuse hindamine** | Kas see tõesti toimib? | Mõõdikud ja töölaud, auditid, juhtkonna ülevaatus (juhtimine) |
| **10 Parendamine** | Kuidas me tõrgetest õpime? | Tähelepanekud ja abinõud, turvaeesmärgid |

### Punkt 8 — Tegevus (tuum, mida see moodul katab)
- **8.2 Talitluspidevuse mõjuanalüüs ja riskihindamine:** Millised tegevused on olulised, kui kiiresti muutub tõrge kulukaks, millest need sõltuvad? → vahekaart **BIA**.
- **8.3 Strateegiad ja lahendused:** Kuidas me tõrget ületame (asendusasukoht, hädaolukorra elekter, teine tarnija, kaugtöö)? → kirjelda strateegiana BIA-s ja kavades.
- **8.4 Kavad ja menetlused:** reageerimisstruktuur, hoiatamine, kommunikatsioon, pidevuskavad ja naasmine tavapärasesse tegevusse. → vahekaart **Talitluspidevuse kavad**.
- **8.5 Õppuste programm:** kavasid harjutatakse kavandatud ajavahemike järel ja pärast olulisi muudatusi, koos aruandega. → vahekaart **Õppused**.
- **8.6 Hindamine:** Kas analüüs, kavad ja menetlused sobivad otstarbeks ja mis järgneb? → õppuste ja auditite tulemused.

### Punktid 9 ja 10 — Hindamine ja parendamine (saab süsteemiga läbi viia)
- **9.1 Jälgimine ja mõõtmine:** BCM-töölaud (BIA-d kriitilisuse järgi, protsessid ilma kinnitatud kavata, viimane ja järgmine õppus) ja aruanded; turvaeesmärgid mõõdetud väärtustega.
- **9.2 Siseaudit:** tehke BCMS-i audit nagu iga teinegi — moodul **Auditid** (kontrollpunktid, auditikava iga-aastase plaanina, auditiaruanne).
- **9.3 Juhtkonna ülevaatus:** **Juhtimine → Juhtkonna ülevaatused**; registreerige seal sisendid (auditi tulemused, õppused, mõõdikud) ja otsused.
- **10.1 Mittevastavus ja parandustegevus:** registreerige auditite ja õppuste lüngad **tähelepanekutena** ning jälgige neid **abinõudega** (abinõude moodul) kuni tõhususe kontrollini.
- **10.2 Pidev parendamine:** tuletage abinõud, turvaeesmärgid ja järgmised õppused sellest, mida õpite.

### 2024. aasta muudatus
ISO 22301:2019/Amd 1:2024 on väga väike: punktis **4.1** peab organisatsioon otsustama, kas **kliimamuutus** on tema jaoks asjakohane küsimus; punktis **4.2.1** märgib märkus, et huvitatud osapooltel võivad olla kliimaga seotud nõuded. See ei nõua uusi abinõusid, ainult kontrolli ja selle dokumenteerimist (nt kohaldamisala dokumendis või riskiregistris).

### ISO 22313 — kaasnev juhend
**ISO 22313** on ISO 22301 **rakendamise juhenddokument**. See ei sisalda sertifitseeritavaid nõudeid, kuid selgitab üksikasjalikult, kuidas üksikuid nõudeid saab praktikas täita (nõuanded ja näited BIA, strateegiate, kavade ja õppuste kohta). Soovitame hankida see lisaks ISO 22301-le, eriti esimese BIA ja esimeste kavade koostamisel.

> **Märkus:** See sissejuhatus võtab standardi kokku meie oma sõnadega ega asenda standardit ega juhendit. ISO standardid on kaitstud autoriõigusega ja neid ISMS Builderiga kaasa ei anta; autoriteetne on teie litsentsitud väljaande tekst. Seos moodulitega on orientiir, mitte sertifitseerimisavaldus.

---

## Kolm alavaldkonda

BCM-moodul koosneb kolmest tihedalt seotud valdkonnast:

| Valdkond | Eesmärk |
|---|---|
| **BIA** (talitluspidevuse mõjuanalüüs) | Kriitiliste protsesside tuvastamine ja tõrgete mõju hindamine |
| **Talitluspidevuse kavad** | Konkreetsed taastekavad kriitilistele protsessidele |
| **Õppused** | Kavade testide dokumenteerimine ja jälgimine |

---

## Talitluspidevuse mõjuanalüüs (BIA)

BIA vastab küsimusele: **mis juhtub, kui see protsess tõrkub — ja kui kaua me seda endale lubada saame?**

**BCM → BIA → „+ Uus BIA“**

Väljad:
- **Protsessi nimi** — milline äriprotsess?
- **Protsessi omanik ja osakond**
- **Kriitilisus** — `low` / `medium` / `high` / `critical`
- **RTO** (taastamisaja eesmärk) — maksimaalne talutav seisakuaeg (tundides)
- **RPO** (taastepunkti eesmärk) — maksimaalne talutav andmekadu (tundides)
- **MTPD** (maksimaalne talutav katkestuse kestus) — absoluutne maksimaalne tõrkeaeg
- **Sõltuvused** — millistest süsteemidest/tarnijatest see sõltub?
- **Mõjutatud süsteemid**
- **Olek** — `draft` / `reviewed` / `approved`

> **RTO ja RPO** on BIA keskmõõdikud. RTO määrab, kui kiiresti peab
> protsess taastama; RPO määrab, kui vanad võivad andmed taastamise hetkel olla.

---

## Talitluspidevuse kavad (taastekavad)

Iga kriitilise protsessi (BIA kriitilisus `high`/`critical`) jaoks peaks
olema taastekava.

**BCM → Kavad → „+ Uus kava“**

Väljad:
- **Kava nimi** — nt „Tootmise andmebaasi taaste“
- **Seotud BIA** — millise BIA-ga see kava seotud on?
- **Käivitaja** — millal kava aktiveeritakse?
- **Omanik**
- **Sammud** — nummerdatud tegevusjuhised
- **Ressursid** — vajalikud süsteemid, kontaktid, pääsuandmed (krüpteeritud)
- **Olek** — `draft` / `tested` / `approved`

---

## Õppused

BCM-kavad on tõhusad ainult siis, kui neid regulaarselt harjutatakse.
ISO 22301 nõuab tõendeid tehtud testide kohta.

**BCM → Õppused → „+ Uus õppus“**

Väljad:
- **Õppuse liik** — laua taga / simulatsioon / täismahus test
- **Kuupäev ja kestus**
- **Testitud kavad**
- **Osalejad**
- **Tulemus** — mis toimis, mis mitte?
- **Tegevused** — mida tuleb parandada?

---

## BIA, kavade ja õppuste mallid

Igal vahekaardil (**BIA**, **Kavad**, **Õppused**) on nupu „Uus“ kõrval nupp **„Kasuta malli“** (roll Toimetaja ja kõrgem). See täidab vormi soovituslike väärtustega, mis te enne salvestamist üle vaatate ja kohandate.

- **BIA mallid** sisaldavad kriitilisust, RTO/RPO/MTPD (tundides), tüüpilisi sõltuvusi ja süsteeme (ainult liigid) ning märkust. Ajad on **soovitused**: otsustavad protsesside omanikud.
- **Kavade mallid** annavad struktureeritud teksti: eesmärk ja kohaldamisala, aktiveerimiskriteeriumid, rollid, kohesed abinõud, taastamine, kommunikatsioon, naasmine tavapärasesse tegevusse, hooldus ja õppused. `{{COMPANY_NAME}}` ja `{{ISMS_OWNER}}` täidetakse organisatsiooni andmetest; süsteem teatab puuduvatest väärtustest.
- **Õppuste mallid** täidavad uue välja **„Stsenaarium ja kulg“**: stsenaarium, eesmärgid, sisendid ja hindamisküsimused.

**Kaasatud mallid (eesti keeles):**
- BIA: Palgaarvestus; IT-käitus ja andmekeskus; Klienditeenindus ja tugi; Tellimuste töötlemine ja müük; Tootmine ja teenuste osutamine; Hange ja tarnijahaldus; Ettevõtte kommunikatsioon ja veebisait; Värbamine ja töötajate tugi
- Kavad: Üldine talitluspidevuse kava; IT hädaolukorra taastekava; Küberrünnak ja lunavara; Elektrikatkestus; Hoone ja asukoha kadu; Kriitilise tarnija tõrge; Pandeemia ja suur töötajate puudus; Kriisikommunikatsioon; Andmekeskuse taaskäivitus
- Õppused: Laua taga õppus: lunavara; Varukoopia taastetest; Evakueerimine ja asukoha kadu; Tarnija tõrge; Häireahela test; Elektrikatkestuse õppus

Mallid on praktikale suunatud soovitused meie oma sõnadega. Need tuleb hoolikalt teie ettevõttele kohandada, need ei ole nõustamine ja ei sisalda ühegi standardi teksti. FR, NL, HU ja ET on meie oma tõlked; soovitatav on erialane ülevaatus. Juhend **ISO 22313** aitab süsteemi ülesehitamisel.

---

## TI-mustandid kavadele ja õppustele

**Kava** (väli „Menetlused“) ja **õppuse** (väli „Stsenaarium ja kulg“) vormil on nupp **„Koosta TI-ga mustand“** (roll Sisuomanik ja kõrgem, nagu dokumentide puhul). See avab sama turvalise dialoogi nagu poliitikate puhul: valite teema pealkirjaloendist (9 kava, 6 õppust), näete **täpselt saadetavat teksti** ja saadate selle kas ühendatud TI-le või **kopeerite** teie valitud TI jaoks. Vihje väljal olevad isikuandmed blokeeritakse, ettevõtte kohatäitjad asendatakse kohapeal. Tulemus ilmub seejärel vormi tekstiväljale (kinnitusega, kui seal on juba tekst) ja on **mustand**, mille te üle vaatate ja kohandate. Üksikasjad ja pealkirjaloend: juhend „TI-mustandid“.

---

## ISO 22301 nõuete register

Vahekaart **„Nõuded“** näitab ISO 22301 nõudeid (punktid 4 kuni 10) ja teie rakendamise olekut. Näete ühe pilguga, **milline nõue on millega tõendatud** ja kus tõendid veel puuduvad.

**Oluline:** **Standardi teksti ISMS Builderiga kaasa ei anta** (autoriõigus). Administraator impordib selle standardi **litsentsitud väljaandest**, mis teie ettevõttel on. Register on töövahend, mitte sertifitseerimisavaldus; autoriteetne on teie litsentsitud väljaande tekst.

### Töövoog
1. **Laadi mall alla:** vahekaart „Nõuded“ → „Mall (CSV)“. See sisaldab ainult väljamõeldud näideridu.
2. **Sisesta oma tekstid** (ID, pealkiri, kirjeldus) oma litsentsitud standardist või esita samad väljad JSON-ina.
3. **Impordi** (ainult administraatorid): vali fail. Esmalt tuleb **eelvaade** (uued, uuendatud, tagasi lükatud koos põhjusega rea kohta); alles „Rakenda“ salvestab.
4. **Hoia olekut ajakohasena** (roll Toimetaja ja kõrgem): nõude kohta olek, vastutaja, põhjendus, tõend ja seosed BIA-de, kavade ja õppustega.
5. **Uuesti importimine** (nt uus väljaanne või muudatus) muudab **kirjeldusi**, mitte rakendamise olekut; midagi ei kustutata.

Olek: *Avatud*, *Osaliselt*, *Rakendatud*, *Ei kohaldu* (**põhjendus on kohustuslik**). Katvuse riba loeb ainult madalaima taseme punkte, mitte peatükkide pealkirju. Punktide 8.2.2, 8.4.4 ja 8.5 puhul näitab süsteem vihjeid olemasolevatest andmetest (BIA-de arv, kinnitatud kavad, läbi viidud õppused); olekut **ei seata kunagi automaatselt**. Oleku eksport: „Ekspordi (CSV)“.

### Impordifaili ülesehitus
Üks rida nõude kohta. **CSV** (UTF-8, eraldajaks koma või semikoolon, väljad, mis sisaldavad koma või reavahetust, jutumärkides) või **JSON** (loend või `{ "requirements": [ … ] }`). Veergude nimed väiketähtedega, mis tahes järjekorras; tundmatutest veergudest teatatakse ja neid ignoreeritakse. Kuni **2 MB** ja **2000 rida**.

| Veerg | Kohustuslik | Tähendus | Piirang |
|---|---|---|---|
| `framework` | jah | Standardi ID, praegu ainult `ISO22301` | – |
| `id` | jah | Nõude ID, nt `9.1` (unikaalne faili piires) | 40 märki |
| `parent` | ei | Ülemnõude `id` (peab olema failis või juba salvestatud) | 40 |
| `chapter` | ei | Peatükk; kui tühi, `id` esimesele punktile eelnev number | 40 |
| `title_de`, `title_en`, `title_fr`, `title_nl`, `title_hu`, `title_et` | vähemalt üks pealkiri | Pealkiri keele kaupa; kuvatakse kasutajaliidese keel, muidu inglise keel, muidu esimene saadaolev | 512 |
| `summary_de` … `summary_et` | ei | Kirjeldus keele kaupa | 4000 |
| `title`, `summary` | ei | Pealkiri/kirjeldus ilma keeleta (käsitletakse inglise keelena, kui `title_en` puudub) | 512 / 4000 |
| `amendment` | ei | Märkus muudatuse kohta, nt `Amd 1:2024` | 60 |

Eelvaade nimetab tagasi lükatud read põhjusega: kohustuslik väli puudub, tundmatu raamistik, korduv ID, tundmatu ülemnõue, tekst liiga pikk.

**CSV näide** (väljamõeldud tekstid):

```csv
framework,id,parent,chapter,title_en,summary_en
ISO22301,9,,9,Example chapter,
ISO22301,9.9,9,9,Example requirement,Your description from the licensed standard goes here.
```

**JSON näide** (väljamõeldud tekstid):

```json
[
  { "framework": "ISO22301", "id": "9",   "chapter": "9", "title_en": "Example chapter" },
  { "framework": "ISO22301", "id": "9.9", "parent": "9", "chapter": "9",
    "title_en": "Example requirement", "summary_en": "Your description from the licensed standard goes here." }
]
```

Tekste salvestatakse lihttekstina ja need maskeeritakse kuvamisel. Tabelarvutustesse ekspordi puhul neutraliseeritakse lahtrid, mis algavad `=`, `+`, `-` või `@`.

**Õigused:** vaatamine alates rollist Lugeja, hooldamine alates rollist Toimetaja, import ainult administraatorid. Iga import ja muudatus on auditilogis. Tootmisse lülitumisel (demo lähtestamine) tühjendatakse register nagu teised demoandmed.

---

## Töölaud

BCM-töölaud näitab:
- BIA-de arvu kriitilisuse järgi
- Protsesse ilma kinnitatud kavata
- Viimast õppust ja järgmist planeeritud õppust
- Kavasid olekuga `draft` (vajab tegutsemist)

---

## Märkus auditiks

ISO 27001 A.5.29 nõuab infoturvet talitluspidevuses.
A.5.30 käsitleb IKT valmisolekut talitluspidevuseks.

Audiitor kontrollib tavaliselt:
1. Kas BIA on olemas dokumenteeritud RTO/RPO väärtustega?
2. Kas kriitilistele protsessidele on kinnitatud taastekavad?
3. Kas kavasid on testitud? (õppuste kirjed)
4. Kas õppustest saadud õppetunnid on kavadesse lõimitud?

Soovitus: vähemalt üks laua taga õppus aastas iga kriitilise kava kohta.
