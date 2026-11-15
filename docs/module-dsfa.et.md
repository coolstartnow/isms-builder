# Moodul: andmekaitsealane mõjuhinnang (DPIA)

> Mõjuhinnang kirjeldab kavandatud töötlemist, hindab selle riske asjaomastele isikutele ja määrab abinõud. **Vastutav töötleja koostab selle ise**, **andmekaitsespetsialist (DPO) vaatab** selle **üle** ja annab arvamuse. ISMS Builder pakub malle, eelkontrolli, ülevaatuse töövoogu ja prindivaadet. Kõik muu mooduli kohta on juhendis „Moodul: IKÜM (andmekaitse)“.

> **Märkus:** Kõik mallid ja eelkontroll on praktikale suunatud, kuid need tuleb **hoolikalt oma ettevõttele kohandada**. Need **ei ole õigusnõu** ja neid ei tohi sellena käsitada; need ei asenda ei teie üksikjuhtumi hindamist ega andmekaitsespetsialisti ülevaatust. Järelevalveasutuste riiklikke loendeid kontrollite ise.

---

## Kes mida teeb?

| Roll | Ülesanne |
|---|---|
| Üksus / vastutav töötleja (alates rollist **Sisuomanik**) | teeb eelkontrolli, valib malli, täidab mõjuhinnangu ja esitab selle ülevaatusele |
| **Andmekaitsespetsialist** (konto funktsiooniga *DPO* või administraator) | vaatab mõjuhinnangu üle ja sisestab **arvamuse** |
| Vastutav juhtkond (sisuomanik) | teeb **otsuse**, põhjendab seda ja kinnitab mõjuhinnangu |

Andmekaitsespetsialist **ei ole autor**. Arvamust saavad sisestada ainult kontod funktsiooniga *DPO* ja administraatorid; server registreerib isiku ja kuupäeva.

**Demo:** Demoandmestik sisaldab selleks kahte eraldi kontot ilma administraatoriõigusteta: **carla** (`carla@security.example` / `carlapass`) CISO funktsiooniga ja **dana** (`dana@privacy.example` / `danapass`) DPO funktsiooniga. Testi ülevaatuse töövoogu: valmista mõjuhinnang ette **carlaga**, sisesta arvamus **danaga**, kinnita **carlaga**. **carla** ei tohi arvamust sisestada.

---

## Menetlus kuues sammus

1. **IKÜM → mõjuhinnang → Eelkontroll: kas mõjuhinnang on vajalik?** Märgi, mis kehtib teie töötlemise kohta (vt allpool). Tulemus salvestatakse mõjuhinnanguga.
2. **Jätka malliga** või igal ajal **Kasuta malli**: vali töötlemise liik. Vorm täidetakse eelnevalt.
3. **Täida:** kirjeldus (eesmärk, andmesubjektid, andmekategooriad, saajad, salvestuskoht, tähtajad), vajalikkus ja proportsionaalsus, olemasolevad abinõud, **riskid koos nende abinõudega** ja **jääkrisk**. Tõenäosus ja mõju (1 kuni 5) mallides on soovitused: vaata need üle ja muuda. Abinõud lähevad riski all üks real.
4. Sea olek **Ülevaatus**. Andmekaitsespetsialist loeb mõjuhinnangu.
5. **Andmekaitsespetsialisti arvamus:** andmekaitsespetsialist seab **Andmekaitsespetsialisti konsulteeritud** ja sisestab **arvamuse**.
6. **Otsus ja kinnitamine:** vali otsus (jätka, muuda, lükka tagasi) ja põhjenda seda, seejärel sea olek **Kinnitatud**.

Pärast seda: prindi või arhiveeri **PDF-ina** (ettevõtte logo päises, andmekaitsespetsialisti arvamus isiku ja kuupäevaga, kinnitamine) ning vaata mõjuhinnang üle iga kord, kui töötlemine muutub.

---

## Eelkontroll: kas mõjuhinnang on vajalik?

Eelkontroll küsib esmalt **IKÜM art 35 lg 3 juhtumite** kohta. Kui üks kehtib, on mõjuhinnang nõutav:

- Füüsiliste isikute isiklike aspektide süstemaatiline ja ulatuslik hindamine automatiseeritud töötlemise alusel, sh profileerimine, otsustega, millel on õiguslik mõju või mis mõjutavad neid sarnaselt märkimisväärselt
- Isikuandmete eriliikide (art 9) või süüdimõistvate kohtuotsuste ja süütegudega seotud andmete (art 10) ulatuslik töötlemine
- Avalikult juurdepääsetava ala ulatuslik süstemaatiline jälgimine

Seejärel **Euroopa andmekaitseasutuste suuniste WP 248 üheksa kriteeriumi**. Kui kehtib **kaks või enam**, on mõjuhinnang tavaliselt vajalik:

1. Hindamine või skoorimine (sh profileerimine ja prognoosimine)
2. Automatiseeritud otsused õigusliku või sarnaselt märkimisväärse mõjuga
3. Isikute süstemaatiline jälgimine
4. Tundlikud või väga isiklikud andmed (nt tervis, biomeetria, rahandus, asukoht)
5. Ulatuslik töötlemine (palju inimesi, suur andmemaht, lai ala või pikk kestus)
6. Eri allikatest pärinevate andmekogumite võrdlemine või kombineerimine
7. Kaitsetute isikute andmed (nt töötajad, lapsed, patsiendid)
8. Uue või innovaatilise tehnoloogia kasutamine (nt TI, biomeetria, asjade internet)
9. Töötlemine takistab inimesi õiguse kasutamisel või teenuse või lepingu kasutamisel

**Tulemus:**

- Mõjuhinnang on nõutav (IKÜM art 35 lg 3).
- Mõjuhinnang on tõenäoliselt nõutav (kohaldub kaks või enam suuniste WP 248 kriteeriumi). Kui sellest loobute, peate põhjused dokumenteerima.
- Mõjuhinnang ei ole kohustuslik. Dokumenteerige selle kontrolli tulemus ja kontrollige oma riigi järelevalveasutuse loendeid.

Oma riigi järelevalveasutuse loendeid, mis nimetavad juhtumeid, mil mõjuhinnang on või ei ole vajalik, kontrollite ise. Kui loobute mõjuhinnangust, dokumenteerige põhjused, näiteks arhiveeritud kirjes.

---

## Mallid

Mall loob kirjelduse kavandi, õiguslikud alused, tüüpilised riskid abinõudega ja soovituslikud väärtused. See ei sisalda ettevõtte andmeid peale kohatäitja `{{COMPANY_NAME}}`, mis täidetakse organisatsiooni andmetest (Haldus → Organisatsioon). Pakutavad töötlemise liigid:

- **Pilvepõhine personalitarkvara (personalihaldus ja palgaarvestus)**: personalihaldus, palgaarvestus ja töötajate arendamine pilvepõhise personalitarkvaraga.
- **Videovalve**: vara ja isikute kaitse, õigusrikkumiste uurimine kindlaksmääratud aladel.
- **Töötajate jälgimine ja jälitamine (tööaeg, asukoht, tulemuslikkus)**: tööaja arvestus, sõidukite või seadmete jälgimine, kasutuse ja tulemuslikkuse analüüs.
- **TI-teenus isikuandmetega (nt assistent, vestlusrobot, analüüs)**: TI-teenuse kasutamine ülesannete toetamiseks, mille käigus võidakse töödelda isikuandmeid.
- **Klientide profileerimine ja skoorimine**: klientide hindamine (krediidivõime, ostukäitumine, segmenteerimine) automatiseeritud töötlemise alusel.
- **Terviseandmed (töölenaasmise haldus, töötervishoiuarst)**: töötajate terviseandmete käsitlemine, näiteks haigusjärgne tööleasumine ja töötervishoiu järelevalve.
- **Biomeetriline juurdepääsukontroll ja tööaja arvestus**: juurdepääs ruumidele või süsteemidele või tööaja arvestus sõrmejälje, näo või muu biomeetrilise tunnuse abil.
- **Rikkumisest teavitamise süsteem (teavituskanal)**: rikkumisteadete vastuvõtmine, läbivaatamine ja menetlemine sisemise või välise teavituskanali kaudu.
- **Kandidaatide haldus (valikuliselt TI-eelvalikuga)**: kandideerimisavalduste vastuvõtmine, valik ja haldus, võimalik automatiseeritud eelvalik.

Mida peate lisama: **teie** töötlemise konkreetsed üksikasjad (saajad, pakkujad, salvestuskoht, tähtajad, õiguslik alus üksikjuhtumi puhul), soovitatud riskide ja väärtuste ülevaatus ning abinõud, mille olete tegelikult rakendanud.

---

## Kinnitamise reeglid

| Reegel | Mõju |
|---|---|
| Uus mõjuhinnang | ei saa kohe kinnitada |
| Arvamus | ainult funktsioon *DPO* või administraator; isik ja kuupäev registreeritakse |
| Kinnitamine | ainult koos **andmekaitsespetsialisti konsulteerimisega** ja sisestatud arvamusega, **otsusega** ning **kõrge või kriitilise jääkriski** korral **põhjenduse** või märkega **Vajalik konsulteerimine järelevalveasutusega** |
| Kinnituse tempel | isiku ja kuupäeva määrab server; see eemaldatakse oleku lähtestamisel |
| Auditilogi | loomine, muudatused ja olekumuutused logitakse |

Mõjuhinnangud, mis olid juba varasemates versioonides kinnitatud, jäävad kehtima; reeglid rakenduvad järgmisel olekumuutusel.

**Veateated:** „Kinnitamiseks on vaja andmekaitsespetsialisti arvamust“ (arvamus puudub), „Kinnitamiseks on vaja otsust“, „Kõrge jääkriski korral …“ (lisa põhjendus või märgi järelevalveasutusega konsulteerimine), „Andmekaitsespetsialisti arvamust võib sisestada ainult andmekaitsespetsialist või administraator“.

---

## Prindivaade

**PDF** (loendis ja vormis) avab prindivaate ettevõtte logo, kirjelduse, vajalikkuse, riskitabeli abinõudega, jääkriski, andmekaitsespetsialisti arvamuse, otsuse ja kinnitusega. Printimisdialoogis saab salvestada PDF-ina.
