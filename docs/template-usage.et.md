# Mallid: kasutamine ISMS Builderis

> Mallid on ISMS Builderi keskne tööriist. See juhend selgitab, kuidas
> malle luua, muuta, viia kinnitamise elutsükli kaudu ja siduda teiste moodulitega.

---

## Mis on mall?

Mall on versioonitud, olekuga hallatav dokument — näiteks poliitika, protseduur
või väljalaskedokument. Iga mall järgib määratletud elutsüklit ja seda saab siduda
meetmetega (SoA), riskidega ja teiste mallidega.

Saadaolevad mallide liigid:

| Liik | Eesmärk | Eraldi dokumendid |
|---|---|---|
| **policy** | Siduvad reeglid (mis kehtib?) | [template-type-policy.md](template-type-policy.md) |
| **procedure** | Töötamisjuhised (kuidas tehakse?) | [template-type-procedure.md](template-type-procedure.md) |
| **soa** | SoA protsessi tugidokumendid | [template-type-soa.md](template-type-soa.md) |
| **incident** | Intsidentidele reageerimise kavad ja mallid | [template-type-incident.md](template-type-incident.md) |
| **release** | Muudatuste ja väljalaskete dokumentatsioon | [template-type-release.md](template-type-release.md) |

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Mallide lugemine | `reader` |
| Malli muutmine (sisu, olek) | `editor` |
| Mallide loomine, teisaldamine, kustutamine | `contentowner` |
| Mallide jäädav kustutamine, taastamine | `admin` |

---

## Malli loomine

**1. samm — liigi valimine**
Klõpsake külgribal soovitud malliliigi (nt „Policy“) all nupul **„+ Uus“** või
kasutage külgriba ülaosas nuppu „Loo“ ja valige liik.

**2. samm — kohustuslike väljade täitmine**
- **Pealkiri** — unikaalne nimi (nt „Paroolipoliitika v1.0“)
- **Omanik** — vastutav isik või roll
- **Kehtib alates / Järgmine ülevaatus** — kuupäevaväljad elutsükli haldamiseks
- **Seotud ISO meetmed** — valikuline seos SoA meetmetega

**3. samm — sisu sisestamine**
Sisuala toetab **Markdowni**. Pealkirjad, loendid, tabelid ja koodiplokid
renderdatakse. Struktureeritud poliitikate jaoks soovitatakse järgmist kavandit:

```
# Pealkiri
## 1. Eesmärk
## 2. Kohaldamisala
## 3. Reeglid
## 4. Vastutused
## 5. Rikkumised ja tagajärjed
## 6. Ülevaatus ja uuendused
```

**4. samm — salvestamine**
Mall salvestatakse olekuga `draft` ja see on nähtav ainult sisselogitud kasutajatele
rolliga `reader` või kõrgem.


## Koosta TI-ga mustand (valikuline)

Redaktori tööriistaribal (alates rollist Sisuomanik, ainult kui TI-integratsioon on sisse lülitatud) loob **„Koosta TI-ga mustand“** tekstimustandi. Vaatate selle alati ise üle ja salvestate.

- **Valige dokument loendist** (nt paroolipoliitika, paigahalduse protseduur) ja **keel**. Vaba pealkirjavälja tahtlikult pole, et päringusse ei satuks nimesid ega ettevõtte andmeid.
- **Vihje (valikuline):** kuni 200 märki, nt „NIS2, kaugtöö“. E-posti aadressid, telefoninumbrid, IBAN-id, IP-aadressid, veebiaadressid, identifikaatorid, võtmed, ettevõtte nimetused ja organisatsiooni andmetes olevad nimed tuvastatakse ja need **blokeerivad** saatmise. Filter ei suuda suvalisi isikunimesid usaldusväärselt tuvastada, seega ärge neid sisestage.
- **Dialoog näitab täpselt, mis saadetakse ja kuhu**, enne kui miski lahkub. Saadetakse ainult valitud dokument, keel ja vihje.
- **Kohatäitjad:** mudel kirjutab `{{COMPANY_NAME}}`, `{{ISMS_OWNER}}`, `{{DATA_PROTECTION_OFFICER}}` ja `{{ISMS_SCOPE}}`. Pärast vastust asendatakse need **kohapeal** jaotisest *Haldus → Organisatsioon*. Kui seal on väärtus tühi, jääb kohatäitja alles ja teid teavitatakse.
- Redaktoris olev olemasolev tekst kirjutatakse üle ainult pärast kinnitust.

---

Üksikasjalikult, mõlema teega (otse ja kopeeri/kleebi), seadistuse ja tõrkeotsinguga: juhend „Moodul: TI-mustandid (poliitikaabiline)“ süsteemijuhendis (`docs/module-ai-drafts.et.md`).

## CSV eksport ja import

Dokumentide loendi kohal („Olemasolevad dokumendid“):

- **Ekspordi CSV** (kõik rollid): kirjutab **kõik kõigi liikide dokumendid** faili `documents-<kuupäev>.csv` (UTF-8, koma, avaneb Excelis ja LibreOffice’is). Veerud: `id, type, title, language, status, version, owner, nextReviewDate, parent, content`.
- **Impordi CSV** (alates rollist Sisuomanik): loeb sellise faili, ka semikooloniga eraldajana (saksa Excel). Enne midagi loomist näitab dialoog, mitu dokumenti luuakse, jäetakse vahele või lükatakse kehtetuna tagasi, igaühe põhjusega.
  - Import loob **ainult uusi mustandeid** (versioon 1, teie olete omanik). Sama liik, pealkiri ja keel mis olemasoleval dokumendil: jäetakse vahele. **Olemasolevaid dokumente ei muudeta kunagi**, ka kinnitatuid mitte; kinnitamine ja versioonimine jäävad puutumata.
  - Kohustuslikud veerud: `type`, `title`, `language`, `content`. `type` peab olema teie dokumendiliikide loendis, `language` on `de`, `en`, `fr`, `nl`, `hu` või `et`. Valikulised: `nextReviewDate` (AAAA-KK-PP) ja `parent` (ülemdokumendi pealkiri). Veerge `id`, `status`, `version` ja `owner` ignoreeritakse.
  - Piirangud: 500 rida ja 5 MB faili kohta.
  - Parim on tuletada oma failid ekspordist: kustuta või muuda ridu, kohanda pealkirju, impordi.

## Elutsükkel (olekute töövoog)

Iga mall läbib neli olekuastet:

```
draft  →  review  →  approved  →  archived
```

| Olek | Tähendus | Nähtav |
|---|---|---|
| `draft` | Töös, veel väljastamata | Alates `reader` (sisene) |
| `review` | Ülevaatusel, kinnitust ootamas | Alates `reader` (sisene) |
| `approved` | Ametlikult kehtiv, tootmiskasutuses | Alates `reader` |
| `archived` | Asendatud, hoitakse ainult viitamiseks | Alates `reader` |

**Oleku muutmine:** Kasuta malli üksikasjade vaates olekute rippmenüüd. Iga
olekumuutus logitakse ajatempli ja kasutajaga **olekuajaloos**
(ligipääsetav malli kellaikoonilt).

> **Märkus auditiks:** Täielik olekuajalugu salvestatakse auditilogis ja audiitor saab seda
> üle vaadata. Mall, mis viiakse otse olekust `draft` olekusse `approved`
> ilma `review`-ta, on lubatud, kuid peaks olema teadlik organisatsiooniline otsus.

---

## Versiooniajalugu

**Versioon muutub ainult kinnitamisel**, mitte salvestamisel. Saate salvestada nii tihti kui soovite, muutmata versiooninumbrit; dokument saab oma versiooni, kui see liigub olekust `review` olekusse `approved`. Esimene kinnitus säilitab olemasoleva numbri, iga järgmine kinnitus suurendab seda 1 võrra.

**Kinnitamine:** Nupp „Kinnita“ küsib esmalt: **„Kas kinnitada versioonina X?“**, lisaks valikuline **muudatuse kommentaar**. Ainult „Jah, kinnita“ teostab kinnitamise.

**Kinnitatud dokumendid on lukustatud:** Pealkirja ja sisu ei saa muuta, kui olek on `approved` (kasutajaliides näitab ainult lugemise vaadet ja vihjet, server lükkab muudatused tagasi koodiga `409`). Järgmise ülevaatuse kuupäev jääb muudetavaks. Töö jätkamiseks sea dokument tagasi olekusse `review` (roll `contentowner`), muuda seda ja kinnita uuesti — see loob järgmise versiooni.

**Versiooniajalugu dokumendi päises:** Dokumendi kohal (kokkuklapitav, ka **ajaloo ikooni** kaudu) on tabel

| Versioon | Kinnitaja | Kinnitatud | Muudatused |
|---|---|---|---|

mis näitab iga kinnituse kasutajanime, aega ja muudatuse kommentaari. Sama tabel ilmub prindi/PDF väljundis ja Nextcloudi avaldamiseks kasutatavas PDF-is. Iga kinnitus salvestab ka sisu hetktõmmise. Dokumendid, mis kinnitati enne seda funktsiooni, näitavad oma esimese reana olekuajaloo viimast kinnitust.

See võimaldab täielikku jälgitavust, mida ISO 27001 dokumentidelt nõuab.

---

## Manused

Mallidel võivad olla manustatud failid (PDF, DOCX — kuni 25 MB):

**Manuse lisamine:** Klõpsake malli üksikasjade vaates **„Laadi manus üles“**.
Minimaalne roll: `editor`.

**Manuse allalaadimine:** Nähtav kõigile kasutajatele alates `reader`.

**Manuse kustutamine:** Minimaalne roll: `editor`.

---

## Seosed teiste moodulitega

Malle saab siduda teiste moodulitega:

**→ SoA meetmed:** Valige ISO meetmed, mida see dokument katab. Meede
ilmub seejärel SoA-s viitega mallile („rakendamise tõend“).
See on oluline lüngaanalüüsi ja vastavusaruande jaoks.

**→ Riskid:** Riskimooduli kaudu saab poliitikaid ja protseduure määrata riskile
riski leevendavate abinõudena.

**→ Poliitika kinnitus:** Kinnitatud poliitikaid saab saata töötajatele kinnitamiseks
(moodul „Poliitikate kinnitused“).

---

## Malli teisaldamine

Malli saab teisaldada teise liiki (nt `procedure` liigist `policy` liiki) —
minimaalne roll: `contentowner`. Kõik seosed ja versiooniajalugu säilivad.

---

## Mallide kustutamine ja taastamine

**Pehme kustutamine** (minimaalne roll `contentowner`): Mall märgitakse kustutatuks ja
eemaldatakse vaatest, kuid jääb süsteemi. Seosed meetmete ja riskidega säilivad.

**Taastamine** (minimaalne roll `admin`): Kustutatud malle saab taastada halduspaneelil
jaotises „Prügikast“.

**Jäädav kustutamine** (minimaalne roll `admin`): Eemaldab malli pöördumatult
koos versiooniajaloo ja manustega. Seda ei saa tagasi võtta.

---

## Ülevaatuse tähtajad

Välja **„Järgmine ülevaatus“** jälgitakse aktiivselt:

- Mallid, mille ülevaatus on tähtajaline ≤ 14 päeva pärast, ilmuvad **kalendrisse** (esile tõstetud punasega)
- Administraator saab **e-posti teavituse** (kui SMTP on seadistatud)
- Tähtajalised ülevaatused ilmuvad **töölaual** ülesannetena

Soovitus: vaata poliitikaid üle igal aastal, protseduure iga kuue kuu järel.
