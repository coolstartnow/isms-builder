# Modul: Üzletmenet-folytonosság-menedzsment (BCM)

> A BCM biztosítja, hogy a szervezet súlyos zavarások idején is működőképes maradjon -
> ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Bevezetés: mi az ISO 22301?

> **Fontos megjegyzés — nem hivatalos közreadás:** ez a bevezetés az ISMS Builder **saját, egyszerűsített összefoglalója**. **Nem a szabvány szövege**, **nem az ISO 22301 hivatalos vagy mértékadó változata**, és **nem helyettesíti a szabványt**. Kizárólag a **szabvány érvényes kiadása** mérvadó; azt a nemzeti szabványügyi szervezettől lehet beszerezni (Németországban DIN/Beuth, nemzetközileg ISO). A szöveg **nem tanácsadás**, és nem garantálja, hogy az ez alapján végzett megvalósítás megfelel egy tanúsításnak. A fejezetszámok és a kifejezések eltérhetnek attól a kiadástól, amelyet az Ön szervezete használ.

Az **ISO 22301** azt írja le, hogyan építi fel és működteti egy szervezet az **üzletmenet-folytonossági irányítási rendszert (BCMS)**. A cél, hogy a fontos szolgáltatások zavar esetén (tűz, kibertámadás, áramkimaradás, beszállítói kiesés, járvány) tovább működjenek, vagy elfogadható időn belül ismét elérhetők legyenek. Az ISO 27001-hez hasonlóan **irányítási rendszer szabvány**: azt mondja meg, **mit** kell tudnia egy működő rendszernek, nem azt, **hogyan** oldják meg technikailag. Tanúsítani lehet. Az ISO 27001 az információt védi, az ISO 22301 azt biztosítja, hogy a működés folytatódjon.

A szabványnak **nincs intézkedéskatalógust tartalmazó melléklete** (az ISO 27001-gyel ellentétben), hanem követelményei („kell” mondatok) vannak a 4–10. fejezetben, az összes ISO irányítási rendszer szabvány közös sémája szerint:

| Fejezet | Mögötte álló kérdés | Támogatás az ISMS Builderben |
|---|---|---|
| **4 Környezet** | Hol állunk, mi tartozik a rendszerhez? | Szervezet, hatály (dokumentum), kötelezettségek a Jogi modulban |
| **5 Vezetés** | Áll-e a vezetés mögötte? | Folytonossági szabályzat mint szabályzat (Dokumentumok), szerepek és felelősök |
| **6 Tervezés** | Mely kockázatok, mely célok? | Kockázatkezelés, biztonsági célok (pl. „kritikus szolgáltatás 4 órán belül újra elérhető”) |
| **7 Támogatás** | Erőforrások, tudás, dokumentumok? | Képzések és bizonyítékok, szabályzatok tudomásulvétele, dokumentumkezelés |
| **8 Működés** | Hogyan jön létre a folytonosság? | **ez a modul**: BIA, tervek, gyakorlatok |
| **9 Teljesítményértékelés** | Valóban működik? | Mutatók és irányítópult, auditok, vezetőségi átvizsgálás (Governance) |
| **10 Fejlesztés** | Hogyan tanulunk a hibákból? | Megállapítások és intézkedések, biztonsági célok |

### 8. fejezet — Működés (a lényeg, ez a modul fedi le)
- **8.2 Üzleti hatáselemzés és kockázatértékelés:** mely tevékenységek fontosak, milyen gyorsan válik drágává a kiesés, mitől függnek? → **BIA** fül.
- **8.3 Stratégiák és megoldások:** hogyan hidaljuk át a kiesést (tartalék telephely, vészáram, második beszállító, otthoni munka)? → stratégiaként leírni a BIA-ban és a tervekben.
- **8.4 Tervek és eljárások:** reagálási struktúra, riasztás, kommunikáció, folytonossági tervek és a visszatérés a normál működéshez. → **Folytonossági tervek** fül.
- **8.5 Gyakorlati program:** a terveket tervezett időközönként és jelentős változások után gyakorolják, jelentéssel. → **Gyakorlatok** fül.
- **8.6 Értékelés:** megfelelnek-e az elemzés, a tervek és az eljárások, és mi következik ebből? → a gyakorlatok és auditok eredményei.

### 9. és 10. fejezet — Értékelés és fejlesztés (a rendszerrel megvalósítható)
- **9.1 Monitorozás és mérés:** BCM-irányítópult (BIA-k kritikusság szerint, jóváhagyott terv nélküli folyamatok, utolsó és következő gyakorlat) és jelentések; biztonsági célok mért értékekkel.
- **9.2 Belső audit:** a BCMS auditja mint bármely más — **Auditok** modul (ellenőrzési pontok, auditprogram éves tervként, auditjelentés).
- **9.3 Vezetőségi átvizsgálás:** **Governance → Management Reviews**; itt rögzítse a bemeneteket (auditeredmények, gyakorlatok, mutatók) és a döntéseket.
- **10.1 Eltérések és korrekciós intézkedések:** az auditok és gyakorlatok hiányosságait **megállapításként** rögzítse, és **intézkedésekkel** (Intézkedések modul) kövesse a hatékonyság ellenőrzéséig.
- **10.2 Folyamatos fejlesztés:** a tanulságokból vezesse le az intézkedéseket, a biztonsági célokat és a következő gyakorlatokat.

### A 2024-es kiegészítés
Az ISO 22301:2019/Amd 1:2024 nagyon rövid: a **4.1** pontban a szervezetnek el kell döntenie, hogy az **éghajlatváltozás** releváns téma-e számára; a **4.2.1** pontban megjegyzés szerint az érdekelt felek éghajlattal kapcsolatos követelményeket támaszthatnak. Új intézkedést nem kér, csak a vizsgálatot és annak dokumentálását (pl. a hatálydokumentumban vagy a kockázati nyilvántartásban).

### ISO 22313 — a hozzá tartozó útmutató
Az **ISO 22313** az ISO 22301 **bevezetési útmutatója**. Nem tartalmaz tanúsítható követelményeket, de részletesen elmagyarázza, hogyan teljesíthetők a követelmények a gyakorlatban (tanácsok és példák a BIA-hoz, stratégiákhoz, tervekhez és gyakorlatokhoz). Javasoljuk, hogy az ISO 22301 mellett szerezze be, különösen az első BIA és az első tervek elkészítésekor.

> **Megjegyzés:** ez a bevezetés saját szavainkkal foglalja össze a szabványt, és sem a szabványt, sem az útmutatót nem pótolja. Az ISO szabványok szerzői jogi védelem alatt állnak, az ISMS Builder nem szállítja őket; az Ön által licencelt kiadás szövege az irányadó. A modulokhoz rendelés tájékoztató jellegű, nem tanúsítási kijelentés.

---

## Három részterület

A BCM modul három szorosan kapcsolódó területből áll:

| Terület | Cél |
|---|---|
| **BIA** (Üzleti hatáselemzés) | Kritikus folyamatok azonosítása és a kiesés hatásának felmérése |
| **Folytonossági tervek** | Konkrét helyreállítási tervek kritikus folyamatokhoz |
| **Gyakorlatok** | A tervek tesztelésének dokumentálása és nyomon követése |

---

## Üzleti hatáselemzés (BIA)

A BIA megválaszolja: **Mi történik, ha ez a folyamat kiesik - és meddig engedhető meg ez?**

**BCM → BIA → „+ Új BIA"**

Mezők:
- **Folyamat neve** - melyik üzleti folyamat?
- **Folyamatfelelős és szervezeti egység**
- **Kritikusság** - `alacsony` / `közepes` / `magas` / `kritikus`
- **RTO** (Helyreállítási idő célja) - maximálisan tolerálható leállási idő (óra)
- **RPO** (Visszaállítási pontcél) - maximálisan tolerálható adatveszteség (óra)
- **MTPD** (Maximálisan tolerálható zavarási időszak) - abszolút maximális kiesési idő
- **Függőségek** - mely rendszerektől/szállítóktól függ ez a folyamat?
- **Érintett rendszerek**
- **Státusz** - `tervezet` / `felülvizsgált` / `jóváhagyott`

> Az **RTO és RPO** a BIA központi mutatói. Az RTO meghatározza, milyen gyorsan kell helyreállítani
> a folyamatot; az RPO meghatározza, mekkora adatveszteség fogadható el a helyreállítás pillanatában.

---

## Folytonossági tervek (Helyreállítási tervek)

Minden kritikus folyamathoz (BIA kritikusság: `magas`/`kritikus`) helyreállítási tervnek
kell léteznie.

**BCM → Tervek → „+ Új terv"**

Mezők:
- **Terv neve** - pl. „Termelési adatbázis helyreállítása"
- **Kapcsolódó BIA** - melyik BIA-hoz tartozik ez a terv?
- **Kiváltó esemény** - mikor aktiválják a tervet?
- **Felelős**
- **Lépések** - sorszámozott intézkedési utasítások
- **Erőforrások** - szükséges rendszerek, kapcsolattartók, hozzáférési adatok (titkosítva)
- **Státusz** - `tervezet` / `tesztelt` / `jóváhagyott`

---

## Gyakorlatok

A BCM-tervek csak akkor hatékonyak, ha rendszeresen gyakorolják azokat.
Az ISO 22301 elvárja az elvégzett tesztek dokumentálását.

**BCM → Gyakorlatok → „+ Új gyakorlat"**

Mezők:
- **Gyakorlat típusa** - Asztali (tabletop) / Szimuláció / Teljes körű teszt
- **Időpont és időtartam**
- **Tesztelt tervek**
- **Résztvevők**
- **Eredmény** - mi működött, mi nem?
- **Intézkedések** - mit kell javítani?

---

## Sablonok BIA-hoz, tervekhez és gyakorlatokhoz

Minden fülön (**BIA**, **Tervek**, **Gyakorlatok**) az „Új” mellett ott van a **„Sablon használata”** gomb (Szerkesztő szerepkörtől). Javasolt értékekkel tölti ki az űrlapot, amelyeket mentés előtt ellenőriznie és módosítania kell.

- **A BIA-sablonok** tartalmazzák a kritikusságot, az RTO/RPO/MTPD értékeket (órában), a tipikus függőségeket és rendszereket (csak típusok) és egy megjegyzést. Az időértékek **javaslatok**: a folyamatfelelősök döntenek.
- **A tervsablonok** tagolt szöveget hoznak: cél és hatály, aktiválási feltételek, szerepkörök, azonnali intézkedések, helyreállítás, kommunikáció, visszatérés a normál működéshez, karbantartás és gyakorlatok. A `{{COMPANY_NAME}}` és a `{{ISMS_OWNER}}` a szervezeti adatokból töltődik ki; a hiányzó értékeket a rendszer jelzi.
- **A gyakorlatsablonok** a gyakorlatok új **„Forgatókönyv és menet”** mezőjét töltik ki: forgatókönyv, célok, beillesztések és értékelő kérdések.

**Mellékelt sablonok (magyar):**
- BIA: Bérszámfejtés; Informatikai üzemeltetés és adatközpont; Ügyfélszolgálat és támogatás; Megrendelés-feldolgozás és értékesítés; Termelés és szolgáltatásnyújtás; Beszerzés és beszállítókezelés; Vállalati kommunikáció és weboldal; Toborzás és munkatársi támogatás
- Tervek: Általános üzletmenet-folytonossági terv; Informatikai katasztrófa-helyreállítási terv; Kibertámadás és zsarolóvírus; Áramkimaradás; Épület- és telephely-kiesés; Kritikus beszállító kiesése; Járvány és jelentős munkaerőhiány; Válságkommunikáció; Az adatközpont újraindítása
- Gyakorlatok: Asztali gyakorlat: zsarolóvírus; Az adatmentés visszaállítási tesztje; Kitelepítés és telephely-kiesés; Beszállítói kiesés; A riasztási lánc tesztje; Áramkimaradás-gyakorlat

A sablonok saját szavainkkal írt, gyakorlatorientált javaslatok. Gondosan hozzá kell igazítani őket a vállalathoz, nem minősülnek tanácsadásnak, és szabványszöveget nem tartalmaznak. Az FR, NL és HU változat saját fordításunk; szakmai átnézés ajánlott. A rendszer felépítésében segít az **ISO 22313** útmutató.

---

## MI-vázlatok tervekhez és gyakorlatokhoz

A **terv** („Eljárások” mező) és a **gyakorlat** („Forgatókönyv és menet” mező) űrlapján ott van a **„Vázlat MI-vel”** gomb (Tartalomgazda szerepkörtől, mint a dokumentumoknál). Ugyanazt a biztonságos párbeszédablakot nyitja meg, mint a szabályzatoknál: kiválaszt egy témát a címlistából (9 terv, 6 gyakorlat), látja **a pontos elküldendő szöveget**, és vagy elküldi a csatlakoztatott MI-nek, vagy **kimásolja** egy tetszőleges MI-hez. A megjegyzés mezőben szereplő személyes adatokat blokkoljuk, a vállalati helyőrzőket helyben cseréljük. Az eredmény ezután az űrlap szövegmezőjében jelenik meg (megerősítéssel, ha már van benne szöveg), és **vázlat**, amelyet ellenőriznie és módosítania kell. Részletek és címlista: „MI-vázlatok” útmutató.

---

## Az ISO 22301 követelményeinek nyilvántartása

A **„Követelmények”** fül az ISO 22301 követelményeit (4–10. fejezet) és a megvalósítás állását mutatja. Egy pillantásra látja, **melyik követelményt mi igazolja**, és hol hiányzik még bizonyíték.

**Fontos:** a **szabvány szövegét az ISMS Builder nem szállítja** (szerzői jog). Egy adminisztrátor importálja a vállalata **licencelt kiadásából**. A nyilvántartás munkaeszköz, nem tanúsítási kijelentés; a licencelt kiadás szövege az irányadó.

### Menete
1. **Sablon letöltése:** „Követelmények” fül → „Sablon (CSV)”. Csak kitalált mintasorokat tartalmaz.
2. **Saját szövegek megadása** (azonosító, cím, leírás) a licencelt szabványból, vagy ugyanezek a mezők JSON-ban.
3. **Importálás** (csak adminisztrátoroknak): válassza ki a fájlt. Először **előnézet** jelenik meg (új, frissített, elutasított sorok okkal); csak az „Alkalmaz” ment.
4. **Állapot vezetése** (Szerkesztő szerepkörtől): követelményenként állapot, felelős, indoklás, bizonyíték és kapcsolatok a BIA-kkal, tervekkel és gyakorlatokkal.
5. **Újraimportálás** (új kiadás, kiegészítés) a **leírásokat** módosítja, a megvalósítási állapotot nem; semmi sem törlődik.

Állapotok: *Nyitott*, *Részben*, *Megvalósítva*, *Nem alkalmazható* (ehhez **indoklás kötelező**). A lefedettségi sáv csak a legalsó szintű pontokat számolja, a fejezetcímeket nem. A 8.2.2, 8.4.4 és 8.5 pontnál a rendszer a meglévő adatokból ad tájékoztatást (BIA-k, jóváhagyott tervek, lefolytatott gyakorlatok száma); az állapotot **soha nem állítja be automatikusan**. Az állapot exportja: „Exportálás (CSV)”.

### Az importfájl felépítése
Egy sor egy követelmény. **CSV** (UTF-8, elválasztó vessző vagy pontosvessző, a vesszőt vagy sortörést tartalmazó mezők idézőjelben) vagy **JSON** (lista vagy `{ "requirements": [ … ] }`). Az oszlopnevek kisbetűsek, a sorrend szabad; az ismeretlen oszlopokat jelezzük és figyelmen kívül hagyjuk. Legfeljebb **2 MB** és **2000 sor**.

| Oszlop | Kötelező | Jelentés | Korlát |
|---|---|---|---|
| `framework` | igen | A szabvány azonosítója, jelenleg csak `ISO22301` | – |
| `id` | igen | A követelmény azonosítója, pl. `9.1` (fájlonként egyedi) | 40 karakter |
| `parent` | nem | A szülő követelmény `id`-ja (a fájlban vagy már tárolva) | 40 |
| `chapter` | nem | Fejezet; üresen az `id` első pontja előtti szám | 40 |
| `title_de`, `title_en`, `title_fr`, `title_nl`, `title_hu` | legalább egy cím | Cím nyelvenként; a felület nyelve jelenik meg, különben angol, különben az első elérhető | 512 |
| `summary_de` … `summary_hu` | nem | Leírás nyelvenként | 4000 |
| `title`, `summary` | nem | Cím/leírás nyelv nélkül (angolnak számít, ha nincs `title_en`) | 512 / 4000 |
| `amendment` | nem | Kiegészítésre utaló megjegyzés, pl. `Amd 1:2024` | 60 |

Az előnézet megnevezi az elutasított sorokat és az okot: hiányzó kötelező mező, ismeretlen keretrendszer, duplikált azonosító, ismeretlen szülő követelmény, túl hosszú szöveg.

**CSV-példa** (kitalált szövegek):

```csv
framework,id,parent,chapter,title_en,summary_en
ISO22301,9,,9,Example chapter,
ISO22301,9.9,9,9,Example requirement,Your description from the licensed standard goes here.
```

**JSON-példa** (kitalált szövegek):

```json
[
  { "framework": "ISO22301", "id": "9",   "chapter": "9", "title_en": "Example chapter" },
  { "framework": "ISO22301", "id": "9.9", "parent": "9", "chapter": "9",
    "title_en": "Example requirement", "summary_en": "Your description from the licensed standard goes here." }
]
```

A szövegeket egyszerű szövegként tároljuk, és megjelenítéskor kódoljuk. A táblázatkezelőbe exportáláskor a `=`, `+`, `-` vagy `@` jellel kezdődő cellákat hatástalanítjuk.

**Jogosultságok:** megtekintés Olvasótól, vezetés Szerkesztőtől, importálás csak adminisztrátornak. Minden importálás és módosítás bekerül az auditnaplóba. Éles üzemre váltáskor (demó-visszaállítás) a nyilvántartás a többi demóadathoz hasonlóan kiürül.

---

## Irányítópult

A BCM irányítópult mutatja:
- BIA-k száma kritikusság szerint
- Jóváhagyott terv nélküli folyamatok
- Utolsó gyakorlat és a következő tervezett gyakorlat
- `Tervezet` státuszú tervek (intézkedést igényelnek)

---

## Auditmegjegyzés

Az ISO 27001 A.5.29 az információbiztonságot követeli meg az üzletmenet-folytonosság keretében.
Az A.5.30 az IKT-felkészültséget szabályozza az üzletmenet-folytonosság szempontjából.

Az auditor jellemzően az alábbiakat ellenőrzi:
1. Létezik-e dokumentált RTO/RPO értékekkel rendelkező BIA?
2. Vannak-e jóváhagyott helyreállítási tervek a kritikus folyamatokhoz?
3. Tesztelték-e a terveket? (gyakorlati feljegyzések)
4. A gyakorlatokból levont tanulságokat beépítették-e a tervekbe?

Ajánlás: legalább évi egy asztali gyakorlat (tabletop) minden kritikus tervhez.
