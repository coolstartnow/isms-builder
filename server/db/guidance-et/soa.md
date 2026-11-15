# SoA ja audit – juhend

See dokument selgitab, kuidas kasutada kohaldatavuse deklaratsiooni (SoA) moodulit ning kuidas ISMS Builderiga sise- ja välisauditiks valmistuda.

---

## Mis on SoA?

Kohaldatavuse deklaratsioon (SoA) on standardi ISO 27001 punkti 6.1.3 kohaselt kohustuslik dokument. See loetleb kõik asjakohased meetmed ja dokumenteerib:
- **Miks** meede on kohaldatav (või välistatud)
- **Milliseid abinõusid** on rakendatud
- **Praegune rakendamise olek**

---

## Raamistike ülevaade

| Raamistik | Kood | Meetmeid | Märkused |
|---|---|---|---|
| ISO 27001:2022 | ISO | 93 | ISO autoriõigus — lisa oma meetmete tekst |
| BSI IT-Grundschutz | BSI | 88 | Vabalt kättesaadav (bsi.bund.de) |
| NIS2 direktiiv | NIS2 | 10 | ELi õigusakt, avalik |
| EUCS (ELi pilv) | EUCS | 44 | ENISA standard |
| ELi tehisintellekti määrus | EUAI | 20 | ELi õigusakt, avalik |
| ISO 9001:2015 | ISO9001 | 36 | ISO autoriõigus |
| ISO 9000:2015 | ISO9000 | 10 | ISO autoriõigus |
| Küberkerksuse määrus | CRA | 12 | ELi õigusakt, avalik |

> **Märkus:** ISO meetmeid ei kaasata. Oma meetmete importimiseks kasuta skripti `scripts/import-iso-controls.sh`.

> **Oma rühmad:** Muude raamistike jaoks (nt NEN 7510, TISAX, kliendinõuded) loob administraator SoA-s nupuga **„＋ Oma rühm“** eraldi raamistiku oma sakiga ja impordib meetmed JSON-failist — eelvaatega ja ilma kaasasolevate standardite tekstideta. Importige ainult sisu, mida teil on õigus kasutada.

> **Õiguslik märkus:** ISO 27001/9000/9001, NEN 7510 ja TISAXi hindamiskataloogide (VDA ISA) standarditekstide suhtes kehtivad nende väljaandjate õigused (autoriõigus ja kaubamärgiõigus) ning ISMS Builder neid kaasa ei anna. Demoandmete näidiskontrollid on meie enda väljamõeldud kohatäitetekstid, millel puudub seos standardite sõnastusega — need on puudulikud ning ei sobi ei sertifitseerimiseks ega TISAXi hindamisteks. Importige ainult tekste, mille kasutamiseks teil on õigus. See ei ole õigusnõustamine.

---

## Meetme muutmine

1. **SoA → raamistiku vahekaart** (nt ISO 27001)
2. Klõpsa meetmel → paremal avaneb üksikasjade paneel
3. Täida:
   - **Kohaldatavus:** kohaldatav / ei kohaldu / osaliselt
   - **Olek:** planeeritud / töös / rakendatud / ei kohaldu
   - **Põhjendus:** miks kaasatud või välistatud?
   - **Abinõud:** mida konkreetselt rakendati?
4. **Kohapealne muutmine:** topeltklõps mis tahes väljal kiireks muutmiseks tabelis
5. **Jälgitavus:** „🔗 Seosed“ → seo meetmed poliitikate ja riskidega

---

## Filtrid ja otsing

| Filter | Kirjeldus |
|---|---|
| Olek: ei kohaldu | Kõik välistatud meetmed — kontrolli põhjendusi |
| Olek: planeeritud | Planeeritud, kuid veel rakendamata — kontrolli prioriteeti |
| Olek: osaliselt | Osaliselt rakendatud — täienda tegevuskava |
| Otsing | Täistekstiotsing meetme ID, pealkirja ja põhjenduse järgi |

---

## Võrdlusseosed

Võrdlusseosed näitavad raamistike temaatilisi kattuvusi:
- **SoA → võrdlusseoste** vahekaart
- 20 teemarühma (nt „Juurdepääsukontroll“, „Krüpteerimine“)
- Näitab, millised eri raamistike meetmed katavad sama teemat
- Aitab vältida dubleerimist, kui samal ajal on eesmärgiks ISO 27001 + NIS2 + BSI

---

## Auditiks valmistumine

### Sisemine ettevalmistus
1. **Aruanded → vastavusmaatriks**
   - Veerud: SoA meetmed (raamistiku kaupa)
   - Read: juriidilised isikud / tütarettevõtted
   - Valgusfoor: roheline = rakendatud, kollane = osaliselt, punane = ei kohaldu / planeeritud
2. **Aruanded → lüngaaruanne** — kõik meetmed, millel puudub rakendamise kirje
3. **Aruanded → raamistiku ülevaade** — täidetuse protsent raamistiku kaupa
4. CSV-eksport tööpaberite jaoks

### Välised sertifitseerimisaudited (ISO 27001)

**1. etapp (dokumentide ülevaatus):**
- Ekspordi SoA (JSON → oma vormindus)
- Kõik „ei kohaldu“ põhjendused peavad olema selged ja jälgitavad
- Poliitikad: kõik peavad olema „kinnitatud“ (mustandeid tõendina ei kasutata)
- Töötlemistoimingute register: kontrolli, et see on ajakohane

**2. etapp (kohapealne audit):**
- Riskijuhtimine: kõik riskid hinnatud, käsitlused dokumenteeritud
- Koolituskirjed: läbimise määrad, tunnistused
- Talitluspidevuse õppuste aruanded: viimane õppus < 12 kuud
- Auditilogi: kõigi muudatuste täielik jälgitavus (Haldus → Auditilogi)
- Juhtkonna ülevaatuse protokollid (Juhtimine → ülevaatused)

---

## RACI SoA hoolduseks

| Tegevus | CISO | Andmekaitsespetsialist | QMO | Audit | Osakond |
|---|---|---|---|---|---|
| Meetmete hindamine | **R** | C | C | I | C |
| Põhjenduste kirjutamine | **R** | A (IKÜM) | A (ISO 9001) | I | — |
| Abinõude dokumenteerimine | A | — | — | — | **R** |
| SoA kinnitamine | **A** | — | — | I | — |
| Auditiks valmistumine | **R** | C | C | **R** | C |

> R = vastutab (Responsible), A = lõppvastutaja (Accountable), C = konsulteeritav (Consulted), I = teavitatav (Informed)

---

## Tüüpilised SoA vead

| Viga | Mõju | Parandus |
|---|---|---|
| Meetmed märgitud „ei kohaldu“ ilma põhjenduseta | Auditi tähelepanek | Sisesta põhjendus |
| Olek „planeeritud“ > 12 kuud | Mittevastavus | Koosta tegevuskava, määra vastutaja |
| Meetme ja poliitika vahel pole seost | Tõendite lünk | Kasuta meetmel nuppu „🔗 Seosed“ |
| SoA ei vasta praegusele ulatusele | Sertifitseerimisrisk | Uuenda ulatust organisatsiooni seadetes |
