# Moodul: IKÜM (isikuandmete kaitse üldmäärus)

> IKÜM-i moodul katab kõik isikuandmete kaitse üldmäärusest tulenevad kesksed
> dokumenteerimiskohustused — töötlemistoimingute registrist andmesubjekti taotlusteni.

---

## Alavaldkondade ülevaade

| Valdkond | Lühend | Õiguslik alus |
|---|---|---|
| Töötlemistoimingute register | RoPA | IKÜM art 30 |
| Volitatud töötleja lepingud | DPA | IKÜM art 28 |
| Andmekaitsealane mõjuhinnang | DPIA | IKÜM art 35 |
| Isikuandmetega seotud rikkumised | — | IKÜM art 33/34 |
| Andmesubjekti taotlused | DSAR | IKÜM art 15–22 |
| Tehnilised ja korralduslikud meetmed | TOM-id | IKÜM art 32 |
| Andmekaitsespetsialist | DPO | IKÜM art 37–39 |
| Kustutuslogi | — | IKÜM art 17 |

---

## Töötlemistoimingute register (RoPA)

RoPA on keskne IKÜM-i register — organisatsiooni tehtavate kõigi isikuandmete
töötlemistoimingute täielik loend.

**Loomine:** IKÜM → RoPA → **„+ Uus töötlemistoiming“**

Kohustuslikud väljad IKÜM art 30 alusel:
- Töötlemise nimi ja eesmärk
- Vastutav(ad) töötleja(d) ja võimalikud ühised vastutavad töötlejad
- Andmesubjektide ja isikuandmete kategooriad
- Saajad (sisesed/välised)
- Edastamine kolmandatesse riikidesse (jah/ei + kaitsemeede)
- Säilitustähtajad
- Seotud TOM-id

**Eksport:** RoPA kirjeid saab eksportida CSV-ina — otse kasutatav lisana
andmekaitseraportile või järelevalveasutusele.

---

## Volitatud töötleja lepingud (DPA)

IKÜM art 28 kohane volitatud töötleja leping on nõutav iga teenusepakkuja jaoks, kes töötleb
isikuandmeid organisatsiooni nimel (pilveteenused, IT-pakkujad, palgaarvestus jne).

**Loomine:** IKÜM → lepingud → **„+ Uus leping“**

Väljad: pakkuja nimi, eesmärk, andmekategooriad, kehtivusaeg, lepingu manus (PDF-i üleslaadimine).

> **Minimaalne roll DPA jaoks:** `contentowner`

> **Üksikasjalikult:** mallid, eelkontroll, andmekaitsespetsialisti ülevaatus ja prindivaade on kirjeldatud juhendis „Moodul: andmekaitsealane mõjuhinnang“ (`docs/module-dsfa.et.md`).

---

## Kirjete mallid

Igal vahekaardil on mallid, mis täidavad uue vormi eelnevalt praktilise soovitusega: **töötlemistoimingud (RoPA)**, **töötlemislepingud**, **isikuandmetega seotud rikkumised**, **andmesubjekti õigused** (vastuskirjad) ja **TOM-id**. **Mõjuhinnangul** on oma mallid, vt juhend „Moodul: andmekaitsealane mõjuhinnang“.

**Kuidas see töötab:** Klõpsa vahekaardil **Kasuta malli**, vali mall ja klõpsa **Rakenda mall**. Vorm avaneb soovitusega. Sa vaatad selle üle, kohandad ja salvestad. Kirje tekib alles salvestamisel; malli ennast ei muudeta kunagi.

> **Oluline:** Kõik mallid on praktikale suunatud, kuid need tuleb **hoolikalt oma ettevõttele kohandada**. Need **ei ole õigusnõu** ja neid ei tohi sellena käsitada. Tähtajad, õiguslikud alused ja säilitusajad on soovitused, mida peate kontrollima enda suhtes kehtiva õiguse vastu. Nimed, pakkujad, arvud ja vastutused sisestate ise.

### Töötlemistoimingud (RoPA) (14)

Eelnevalt on täidetud eesmärk, õiguslik alus, andmekategooriad, andmesubjektid, saajad, säilitus ja kustutamismenetlus; „kõrge risk“ on seatud ainult seal, kus see tavaliselt kehtib. Säilituskuud on seatud ainult seal, kus lühike suunisväärtus on tavaline.

IT-käitus, logimine ja infoturve; Kandidaatide haldus; Kliendihaldus (CRM); Klienditugi ja päringusüsteem; Kontaktivorm ja üldised päringud; Personalihaldus ja palgaarvestus; Raamatupidamine ja arvete esitamine; Rikkumisest teavitamise süsteem (teavituskanal); Sündmused ja koolitused; Tarnijate ja äripartnerite haldus; Tööaja arvestus ja juurdepääsukontroll; Uudiskiri ja e-posti turundus; Veebisaidi käitamine ja veebianalüütika; Videovalve.

### Töötlemislepingud (12)

Eelnevalt on täidetud pealkiri ja töötlemise ulatus. Volitatud töötleja, riik, lepingu kuupäevad ja **art 28 kontrollnimekiri** jäävad tühjaks; märgid ainult selle, mida leping tegelikult sisaldab.

CRM- ja turundustarkvara; Dokumentide purustamine ja andmekandjate kõrvaldamine; E-posti, kalendri ja koostöö teenus; IT-teenusepakkuja, hooldus ja kaughooldus; Kõnekeskus ja klienditeenindusteenuse pakkuja; Personali- ja palgatarkvara (SaaS); Pilvemajutus ja andmekeskus; TI-teenus (nt assistent või tekstitöötlus); Tugi- ja päringusüsteem; Varundus- ja arhiiviteenus; Veebimajutus ja veebiagentuur; Videovalve ja turvateenus.

### Isikuandmetega seotud rikkumised (10)

Eelnevalt on täidetud liik, andmekategooriad, andmesubjektid, kohesed abinõud, järeltegevuse abinõud, risk ja **soovitus**, kas järelevalveasutust ja andmesubjekte tuleb teavitada. Kas teavitus on nõutav, otsustate üksikjuhtumi puhul ise.

Andmepüük pääsuandmete avaldamisega; Andmete juhuslik kustutamine või muutmine; Isikuandmete juhuslik avaldamine; Juurdepääsuõiguste kuritarvitamine töötajate poolt; Lunavararünnak; Paberdokumentide vargus või kadu; Sülearvuti, nutitelefoni või andmekandja kaotamine või vargus; Vale seadistus: andmed avalikult nähtavad või liiga laialt jagatud; Valesti adresseeritud e-kiri või dokument; Volitamata juurdepääs kompromiteeritud konto kaudu.

### Andmesubjekti õigused, vastuskirjad (10)

Eelnevalt on täidetud vastusetekst avamis- ja lõpulausega. Kohatäitjad `{{COMPANY_NAME}}` ja `{{DATA_PROTECTION_OFFICER}}` täidetakse organisatsiooni andmetest. Olemas on ka tekstid isikusamasuse tõendi nõudmiseks, tähtaja pikendamiseks ja keeldumiseks; avatud punktid on näidatud sulgudes.

Taotlus isikusamasuse tõendamiseks (art 12 lg 6); Taotluse tagasilükkamine (art 12 lg 4 ja 5); Teade tähtaja pikendamise kohta (art 12 lg 3); Vastus andmete ülekandmise taotlusele (art 20); Vastus automatiseeritud otsuste kohta (art 22); Vastus juurdepääsutaotlusele (art 15); Vastus kustutamistaotlusele (art 17); Vastus parandamistaotlusele (art 16); Vastus töötlemise piiramise taotlusele (art 18); Vastus vastuväitele (art 21).

### TOM-id (24)

Eelnevalt on täidetud pealkiri, kategooria, kirjeldus ja rakendusmärkused; olek on „Planeeritud“. Mida tegelikult on rakendatud, sisestate ise.

Andmekaitse- ja teadlikkuskoolitus; Andmekaitsejuhtimine ja andmekaitsespetsialisti kaasamine; Edastuskrüpteerimine (TLS) ja turvatud kaugjuurdepääs; Eraldatuse kontroll ja eesmärgi piiritlus; Hoonete ja serveriruumide füüsiline juurdepääsukontroll; Hädaolukorra- ja taastekavandamine; Isikuandmetega seotud rikkumiste protsess; Kaitse pahavara eest; Ketta- ja seadmekrüpteerimine; Konfidentsiaalsuskohustus; Kustutamiskontseptsioon; Logimine ja ülevaatus; Mitmefaktoriline autentimine; Paiga- ja haavatavuste haldus; Pseudonümiseerimine ja anonümiseerimine; Puhas laud ja ekraanilukk; Rollipõhine õiguste kontseptsioon; Sisestuskontroll (muudatuste jälgitavus); Säilitustähtajad ja arhiveerimine; Tulemüür ja võrgu segmenteerimine; Turvaline arendus ja testandmete kaitse; Varukoopiate ja teisaldatavate andmekandjate krüpteerimine; Varundus ja testitud taastamine; Volitatud töötlejate valik ja järelevalve.

## Andmekaitsealane mõjuhinnang (DPIA)

IKÜM art 35 kohane mõjuhinnang on kohustuslik töötlemistoimingute puhul, mis **tõenäoliselt
põhjustavad suure riski** andmesubjektide õigustele. Tüüpilised käivitajad: süstemaatiline
jälgimine, eriliikide töötlemine, automatiseeritud otsuste tegemine.

**Loomine:** IKÜM → mõjuhinnang → **„+ Uus mõjuhinnang“**

Väljad: töötlemise kirjeldus, vajalikkus ja proportsionaalsus, tuvastatud riskid,
parandusabinõud, kinnitamise olek.

> **Minimaalne roll mõjuhinnangu jaoks:** `contentowner`

---

## Isikuandmetega seotud rikkumised

Isikuandmetega seotud rikkumistest, mis kätkevad riski andmesubjektidele, tuleb teavitada
järelevalveasutust **72 tunni** jooksul (IKÜM art 33).

**Registreerimine:** IKÜM → rikkumised → **„+ Uus rikkumine“**

Väljad: kuupäev ja kellaaeg, rikkumise laad, mõjutatud andmesubjektide kategooriad ja arv,
tõenäolised tagajärjed, võetud abinõud, teavituskohustus (jah/ei).

> **Minimaalne roll:** `auditor` või kõrgem

---

## Andmesubjekti taotlused (DSAR)

Andmesubjektidel on õigus juurdepääsule, parandamisele, kustutamisele ja ülekantavusele
(IKÜM art 15–22). Tähtaeg on **üks kuu** (pikendatav kolme kuuni).

**Registreerimine:** IKÜM → taotlused → **„+ Uus taotlus“**

Väljad: taotluse liik (juurdepääs/kustutamine/parandamine/ülekantavus), laekumise kuupäev,
tähtaeg, olek (avatud/töös/lõpetatud), märkused.

> **Minimaalne roll:** `editor` või kõrgem — andmesubjekti taotlused on konfidentsiaalsed

---

## Tehnilised ja korralduslikud meetmed (TOM-id)

TOM-id dokumenteerivad IKÜM art 32 kohaseid turvaabinõusid — nii tehnilisi
(krüpteerimine, juurdepääsukontroll) kui ka korralduslikke (koolitus, poliitikad).

**Loomine:** IKÜM → TOM-id → **„+ Uus TOM“**

Väljad: kategooria (juurdepääsukontroll, krüpteerimine, logimine, võrguturve, rakenduste turve,
varundus ja taaste, korralduslik, koolitus, andmete säilitamine), riskitase, kirjeldus, rakendamise olek,
seotud RoPA kirjed, tõend.

**Alates versioonist 1.80** hoitakse TOM-e keskses [abinõude registris](module-measures.et.md) (märge *TOM*). Need ilmuvad
seal koos kõigi teiste abinõudega, neid saab filtreerida päritolu „Ainult TOM-id“ järgi ja neid saab lisaks siduda
SoA meetmetega. Õigused jäävad nagu siin kirjeldatud: loomine ja muutmine ainult alates rollist `contentowner`.

---

## Andmekaitsespetsialist (DPO)

Jaotises IKÜM → andmekaitsespetsialist saab salvestada andmekaitsespetsialisti kontaktandmed ja määramisdokumendi
(PDF-i üleslaadimine). Teave ilmub automaatselt IKÜM-i
töölaual.

---

## Kustutuslogi

Kustutuslogi dokumenteerib tegelikult tehtud kustutamised — millal milline andmekategooria
kustutati ja mis säilitustähtaja alusel.

**IKÜM → kustutuslogi → „Lisa kirje“**

Tähtaja ületanud kustutamised (RoPA-s salvestatud säilitustähtaegade alusel) ilmuvad
teavitusena töölaual.

---

## Töölaud

IKÜM-i töölaud pakub kiiret ülevaadet:
- RoPA kirjete arv, avatud andmesubjekti taotlused, aktiivsed rikkumised
- TOM-id kategooria järgi
- Tähtaja ületanud kustutamised
- Andmekaitsespetsialisti kontaktandmed

---

## Märkus auditiks

Järelevalveasutuse IKÜM-i auditil nõutakse tavaliselt:
RoPA täielikkus, DPA-d kõigile asjakohastele volitatud töötlejatele, mõjuhinnangud kõrge riskiga
töötlemisele, tõendid andmesubjekti taotluste menetlemisest tähtaja jooksul ja TOM-ide dokumentatsioon.
IKÜM-i moodul katab kõik need punktid.
