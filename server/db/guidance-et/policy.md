# Poliitikaprotsessid – loomine, ülevaatus ja kinnitamine

See juhend kirjeldab poliitikadokumendi kogu elutsüklit ISMS Builderis — loomisest ülevaatusprotsessi kaudu arhiveerimiseni.

---

## Dokumendiliigid

| Liik | Kirjeldus | Näited |
|---|---|---|
| **Poliitika (Policy)** | Kohustuslik nõue | Infoturbepoliitika, paroolipoliitika |
| **Protseduur (Procedure)** | Protsessi kirjeldus | Intsidentidele reageerimise protseduur, muudatuste haldus |
| **Juhend (Guideline)** | Soovitus | Turvalise kodeerimise juhised |
| **Standard** | Tehniline standard | Krüpteerimisstandard, kõvendamise baastase |
| **SoA** | Kohaldatavuse deklaratsioon | ISO 27001 SoA dokument |
| **Risk** | Riski aktsepteerimise dokument | Riski aktsepteerimise poliitika |
| **Mall (Template)** | Tühi vorm | Andmekaitsealase mõjuhinnangu mall |

---

## Elutsükli olekud

```
mustand  →  ülevaatus  →  kinnitatud  →  arhiveeritud
                ↑_____________|   (uus ülevaatus)
```

| Olek | Tähendus | Kes võib määrata |
|---|---|---|
| **mustand (draft)** | Töös, väljastamata | toimetaja+ |
| **ülevaatus (review)** | Esitatud ülevaatusele | toimetaja+ |
| **kinnitatud (approved)** | Väljastatud, siduv | sisuomanik / admin |
| **arhiveeritud (archived)** | Enam ei kehti, ainult arhiiv | sisuomanik / admin |

---

## Uue poliitika loomine

1. Ava menüüs **Poliitikad**
2. Klõpsa **+ Uus leht** (üleval paremal)
3. Täida kohustuslikud väljad:
   - **Liik** (poliitika / protseduur / …)
   - **Pealkiri** (unikaalne ja kirjeldav)
   - **Keel** (de / en)
   - **Olek** algab automaatselt olekuga **mustand**
4. Sisesta **sisu** redaktoris (Markdown või rikastekst)
5. Määra **järgmise ülevaatuse kuupäev** (nõutav kinnitatud poliitikatele)
6. Lisa **seosed** jaotises „🔗 Seosed“:
   - Seo SoA meetmed (milliseid meetmeid see poliitika katab?)
   - Määra kehtivad üksused
7. **Salvesta** (Ctrl+S või nupp Salvesta)

---

## Ülevaatusprotsess

### Ülevaatusele esitamine
1. Ava poliitika → **Muuda**
2. Sea olekuks **„ülevaatus“**
3. Salvesta → poliitika ilmub töölaual jaotises „Vajab tegutsemist“
4. Ülevaataja (sisuomanik) saab soovi korral e-posti teate (kui see on seadistatud)

### Ülevaatus CISO / sisuomanikuna
1. **Töölaud → Vajab tegutsemist → ülevaatusel olevad poliitikad**
2. Ava poliitika → vaata sisu üle
3. Kinnitamiseks: sea olekuks **„kinnitatud“** + uuenda ülevaatuse kuupäev
4. Tagasi lükkamiseks: sea olek tagasi **„mustand“** + lisa kirjeldusse kommentaar

---

## Versioonihaldus

Iga olekumuutusega salvestamine loob automaatselt uue versiooni:

| Tegevus | Versiooni tõus |
|---|---|
| Sisu muutmine (sama olek) | Väike (nt 1.0 → 1.1) |
| Olekumuutus (nt mustand → ülevaatus) | Väike |
| Uus kinnitamine (→ kinnitatud) | Suur (nt 1.x → 2.0) |

Versiooniajalugu on nähtav üksikasjade paneelil jaotises **„Ajalugu“**.

---

## Lehtede hierarhia (ruumi struktuur)

ISMS Builder toetab Confluence’i stiilis lehtede hierarhiat:

- **Ülemlehe määramine**: ava poliitika → **„Teisalda“** → vali ülemsõlm
- **Alamlehe loomine**: ava poliitika → **„+ Alamleht“**
- **Järjekorra muutmine** lohistamise või puus olevate nuppudega ↑↓
- **Leivapuru** näitab teed praeguse leheni

Soovitatav struktuur:
```
├── Infoturbepoliitika (poliitika)
│   ├── Paroolipoliitika (poliitika)
│   ├── Puhta laua poliitika (poliitika)
│   └── BYOD poliitika (poliitika)
├── Intsidentidele reageerimise protseduur (protseduur)
│   └── Eskaleerimiskava (protseduur)
└── Andmekaitsepoliitika (poliitika)
    └── Privaatsusteade (SoA)
```

---

## Manused

Poliitikatel võivad olla manused (PDF, DOCX, kuni 20 MB):
1. Ava poliitika → vahekaart **„Manused“**
2. Laadi fail üles lohistades või failivalijaga
3. Manused ilmuvad manuseribale ja neid saab alla laadida

---

## Ülevaatuse tsüklid

Süsteem haldab ülevaatuste ajakava automaatselt:

- **nextReviewDate**: nõutav kinnitamisel — millal tuleb see poliitika uuesti üle vaadata?
- **Värvikodeering** redaktori päises:
  - 🟢 Roheline: ülevaatus > 30 päeva pärast
  - 🟡 Kollane: ülevaatus ≤ 30 päeva pärast
  - 🔴 Punane: ülevaatus on tähtaja ületanud
- **Töölaud**: kõik tähtaja ületanud ja eelseisvad ülevaatused jaotises „Vajab tegutsemist“
- **Kalender**: ülevaatuse kuupäevad on nähtavad kalendrikirjetena
- **Aruanded → ülevaatuse tsüklid**: kõigi poliitikate täielik ülevaade tähtaegadega

---

## RACI poliitikate haldamiseks

| Tegevus | CISO | Osakond | Sisuomanik | Audit |
|---|---|---|---|---|
| Poliitika loomine | R | R | — | — |
| Sisu koostamine | A | **R** | — | I |
| Ülevaatusele esitamine | R | **R** | — | — |
| Sisu ülevaatus | A | C | **R** | I |
| Kinnituse andmine | I | — | **R** | I |
| SoA meetmete sidumine | **R** | C | — | I |
| Arhiveerimine | **R** | — | R | I |

---

## Tüüpilised vead poliitikate haldamisel

| Viga | Mõju | Parandus |
|---|---|---|
| Poliitika kinnitatud ilma ülevaatuse kuupäevata | Tähtaega ei jälgita | Sea nextReviewDate enne kinnitamist |
| Olek „mustand“ > 6 kuud | Vananenud mustanddokument | Alusta ülevaatust või arhiveeri |
| SoA meetmete seosed puuduvad | Vastavustõendite lünk | Seo asjakohased meetmed |
| Mitu kattuvat poliitikat | Liiasus, vastuolud | Kasuta lehtede hierarhiat (alamlehti) |
