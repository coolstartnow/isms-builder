# Modul: GDPR (Általános Adatvédelmi Rendelet)

> A GDPR modul az Általános Adatvédelmi Rendelet szerinti valamennyi központi
> dokumentációs kötelezettséget lefedi — az adatkezelési nyilvántartástól az érintetti
> joggyakorlási kérelmekig.

---

## Részterületek áttekintése

| Terület | Rövidítés | Jogalap |
|---|---|---|
| Adatkezelési tevékenységek nyilvántartása | VVT (RoPA) | 30. cikk GDPR |
| Adatfeldolgozói megállapodások | DPA | 28. cikk GDPR |
| Adatvédelmi hatásvizsgálat | DPIA | 35. cikk GDPR |
| Adatvédelmi incidensek | — | 33/34. cikk GDPR |
| Érintetti joggyakorlási kérelmek | DSAR | 15–22. cikk GDPR |
| Technikai és szervezeti intézkedések | TOM | 32. cikk GDPR |
| Adatvédelmi tisztviselő | DPO | 37–39. cikk GDPR |
| Törlési napló | — | 17. cikk GDPR |

---

## Adatkezelési tevékenységek nyilvántartása (VVT / RoPA)

A VVT a GDPR központi nyilvántartása — a szervezet által végzett valamennyi személyes
adatkezelési tevékenység teljes körű listája.

**Létrehozás:** GDPR → VVT → **„+ Új adatkezelési tevékenység"**

A 30. cikk szerinti kötelező mezők:
- Az adatkezelés neve és célja
- Adatkezelő(k) és esetleges közös adatkezelők
- Az érintettek kategóriái és a személyes adatok kategóriái
- Címzettek (belső/külső)
- Harmadik országba irányuló adattovábbítás (igen/nem + biztosíték)
- Megőrzési idők
- Kapcsolódó TOM-ok

**Export:** A VVT bejegyzések CSV-ként exportálhatók — közvetlenül felhasználhatók
adatvédelmi jelentés mellékleteként vagy a felügyeleti hatóság részére.

---

## Adatfeldolgozói megállapodások (DPA)

A GDPR 28. cikke szerinti adatfeldolgozói megállapodás szükséges minden olyan
szolgáltatóhoz, amely a szervezet nevében személyes adatokat kezel (felhőszolgáltatások,
IT-szolgáltatók, bérszámfejtés stb.).

**Létrehozás:** GDPR → DPA → **„+ Új DPA"**

Mezők: szolgáltató neve, cél, adatkategóriák, futamidő, szerződésmelléklet (PDF feltöltés).

> **Minimálisan szükséges szerepkör a DPA-hoz:** `contentowner`

---

## Adatvédelmi hatásvizsgálat (DPIA)

A GDPR 35. cikke szerinti DPIA elvégzése kötelező az olyan adatkezelési
tevékenységeknél, amelyek **valószínűleg magas kockázattal járnak** az érintettek jogaira
nézve. Tipikus kiváltó tényezők: szisztematikus megfigyelés, különleges adatkategóriák
kezelése, automatizált döntéshozatal.

**Létrehozás:** GDPR → DPIA → **„+ Új DPIA"**

Mezők: az adatkezelés leírása, szükségesség és arányosság, azonosított kockázatok,
kockázatcsökkentő intézkedések, jóváhagyás állapota.

> **Minimálisan szükséges szerepkör a DPIA-hoz:** `contentowner`

> **Részletesen:** a sablonok, az előzetes vizsgálat, a DPO általi felülvizsgálat és a nyomtatás a „Modul: Adatvédelmi hatásvizsgálat (DPIA)” útmutatóban találhatók (`docs/module-dsfa.hu.md`).

---

## Sablonok a bejegyzésekhez

Minden fülhöz tartoznak sablonok, amelyek egy új űrlapot gyakorlatias javaslattal töltenek elő: **adatkezelési tevékenységek (nyilvántartás)**, **adatfeldolgozói szerződések**, **adatvédelmi incidensek**, **érintetti jogok** (válaszlevelek) és **TOM-ok**. A **DPIA**-nak saját sablonjai vannak, lásd a „Modul: Adatvédelmi hatásvizsgálat (DPIA)” útmutatót.

**Így működik:** a fülön kattintson a **Sablon használata** gombra, válassza ki a sablont, majd kattintson a **Sablon alkalmazása** gombra. Az űrlap a javaslattal nyílik meg. Ön ellenőrzi, módosítja és menti. Bejegyzés csak mentéskor jön létre; magát a sablont soha nem módosítjuk.

> **Fontos:** Minden sablon gyakorlatias, de **gondosan hozzá kell igazítani a saját vállalkozásához**. **Nem jogi tanácsadás**, és nem is értelmezhető annak. A határidők, jogalapok és megőrzési idők javaslatok, amelyeket az Önre vonatkozó jog szerint kell ellenőriznie. A neveket, szolgáltatókat, számokat és felelősségeket Ön maga adja meg.

### Adatkezelési tevékenységek (nyilvántartás) (14)

Előre kitöltődik a cél, a jogalap, az adatkategóriák, az érintettek, a címzettek, a megőrzés és a törlési eljárás; a „magas kockázat” csak ott van beállítva, ahol általában fennáll. A megőrzési hónapok csak ott szerepelnek, ahol rövid irányérték szokásos.

A weboldal üzemeltetése és webanalitika; Bejelentési rendszer (visszaélés-bejelentési csatorna); Beszállítók és üzleti partnerek kezelése; Hírlevél és e-mail marketing; IT-üzemeltetés, naplózás és információbiztonság; Kapcsolatfelvételi űrlap és általános megkeresések; Könyvelés és számlázás; Munkaidő-nyilvántartás és beléptetés; Pályázatkezelés; Rendezvények és képzések; Személyügyi nyilvántartás és bérszámfejtés; Videó-megfigyelés; Ügyfélkezelés (CRM); Ügyfélszolgálat és jegykezelő rendszer.

### Adatfeldolgozói szerződések (12)

Előre kitöltődik a cím és az adatkezelés terjedelme. Az adatfeldolgozó, az ország, a szerződéses dátumok és a **28. cikk szerinti ellenőrzőlista** üresen marad; csak azt jelöli be, amit a szerződés ténylegesen tartalmaz.

AI-szolgáltatás (pl. asszisztens vagy szövegfeldolgozás); CRM- és marketingszoftver; E-mail-, naptár- és együttműködési szolgáltatás; Felhőtárhely és adatközpont; HR- és bérszámfejtő szoftver (SaaS); Iratmegsemmisítés és adathordozók ártalmatlanítása; IT-szolgáltató, karbantartás és távkarbantartás; Mentési és archiválási szolgáltatás; Telefonos ügyfélszolgálat és ügyfélszolgálati szolgáltató; Támogatási és jegykezelő rendszer; Videó-megfigyelés és biztonsági szolgálat; Webtárhely és weboldal-ügynökség.

### Adatvédelmi incidensek (10)

Előre kitöltődik a típus, az adatkategóriák, az érintettek, a azonnali intézkedések, a további intézkedések, a kockázat, valamint egy **javaslat** arra, hogy értesíteni kell-e a felügyeleti hatóságot és az érintetteket. Hogy szükséges-e bejelentés, azt az egyedi esetben Ön dönti el.

A hozzáférési jogosultságokkal való visszaélés munkatársak által; Adathalászat a hozzáférési adatok kiszivárgásával; Adatok véletlen törlése vagy módosítása; Hibás konfiguráció: nyilvánosan vagy túl széles körben megosztott adatok; Jogosulatlan hozzáférés feltört fiókon keresztül; Laptop, okostelefon vagy adathordozó elvesztése vagy ellopása; Papíralapú iratok ellopása vagy elvesztése; Személyes adatok véletlen közzététele; Tévesen elküldött e-mail vagy dokumentum; Zsarolóvírus-támadás.

### Érintetti jogok, válaszlevelek (10)

Előre kitöltődik a válasz szövege nyitó és záró mondattal. A `{{COMPANY_NAME}}` és `{{DATA_PROTECTION_OFFICER}}` helyőrzőket a szervezeti adatokból töltjük ki. Vannak szövegek a személyazonosság igazolásának kéréséhez, a határidő meghosszabbításához és az elutasításhoz is; a nyitott pontok zárójelben állnak.

Kérelem elutasítása (12. cikk (4) és (5) bekezdés); Személyazonosság igazolásának kérése (12. cikk (6) bekezdés); Válasz adathordozhatósági kérelemre (20. cikk); Válasz automatizált döntéshozatalról (22. cikk); Válasz az adatkezelés korlátozására irányuló kérelemre (18. cikk); Válasz helyesbítési kérelemre (16. cikk); Válasz hozzáférési kérelemre (15. cikk); Válasz tiltakozásra (21. cikk); Válasz törlési kérelemre (17. cikk); Értesítés a határidő meghosszabbításáról (12. cikk (3) bekezdés).

### TOM-ok (24)

Előre kitöltődik a cím, a kategória, a leírás és a megvalósítási tanács; az állapot „Tervezett”. Azt, ami ténylegesen megvalósult, Ön maga adja meg.

Adatmentés és tesztelt helyreállítás; Adatvédelmi irányítás és a DPO bevonása; Adatvédelmi és tudatossági képzés; Az adatfeldolgozók kiválasztása és ellenőrzése; Bevitelellenőrzés (a módosítások nyomon követhetősége); Biztonságos fejlesztés és a tesztadatok védelme; Elkülönítési ellenőrzés és célhoz kötöttség; Fizikai beléptetés az épületekbe és a szerverhelyiségekbe; Folyamat adatvédelmi incidensekhez; Javítás- és sérülékenységkezelés; Kártevők elleni védelem; Lemez- és eszköztitkosítás; Megőrzési idők és archiválás; Mentések és hordozható adathordozók titkosítása; Naplózás és elemzés; Szerepköralapú jogosultsági koncepció; Szállítási titkosítás (TLS) és biztonságos távoli hozzáférés; Tiszta asztal és képernyőzár; Titoktartási kötelezettségvállalás; Többfaktoros hitelesítés; Törlési koncepció; Tűzfal és hálózati szegmentálás; Vészhelyzeti és helyreállítási tervezés; Álnevesítés és anonimizálás.

## Adatvédelmi incidensek

Az érintettekre kockázatot jelentő személyes adatvédelmi incidenseket **72 órán belül**
be kell jelenteni a felügyeleti hatóságnak (33. cikk GDPR).

**Rögzítés:** GDPR → Adatvédelmi incidensek → **„+ Új incidens"**

Mezők: az incidens dátuma és időpontja, az incidens jellege, az érintett személyek
kategóriái és száma, várható következmények, megtett intézkedések, bejelentési
kötelezettség (igen/nem).

> **Minimálisan szükséges szerepkör:** `auditor` vagy magasabb

---

## Érintetti joggyakorlási kérelmek (DSAR)

Az érintetteket megilleti a hozzáférés, helyesbítés, törlés és adathordozhatóság joga
(15–22. cikk GDPR). A határidő **egy hónap** (három hónapra meghosszabbítható).

**Rögzítés:** GDPR → DSAR → **„+ Új kérelem"**

Mezők: kérelem típusa (hozzáférés/törlés/helyesbítés/adathordozhatóság), beérkezés
dátuma, határidő, állapot (nyitott/folyamatban/lezárt), megjegyzések.

> **Minimálisan szükséges szerepkör:** `editor` vagy magasabb — a DSAR-ok bizalmasak

---

## Technikai és szervezeti intézkedések (TOM)

A TOM-ok dokumentálják a GDPR 32. cikke szerinti biztonsági intézkedéseket — mind
technikai (titkosítás, hozzáférés-szabályozás), mind szervezeti jellegű (képzés,
szabályzatok) intézkedéseket.

**Létrehozás:** GDPR → TOM-ok → **„+ Új TOM"**

Mezők: kategória (hozzáférés-szabályozás, titkosítás, naplózás, hálózatbiztonság, alkalmazásbiztonság,
biztonsági mentés és helyreállítás, szervezeti, képzés, adatmegőrzés), kockázati szint, leírás, megvalósítás állapota,
kapcsolódó VVT-bejegyzések, bizonyíték.

**Az 1.80-as verzió óta** a TOM-ok a központi [intézkedésnyilvántartásban](module-measures.hu.md) találhatók (*TOM* jelölés). Ott az összes
más intézkedéssel együtt jelennek meg, az „Csak TOM-ok” eredet szerint szűrhetők, és emellett SoA-kontrollokhoz is
hozzárendelhetők. A jogosultságok az itt leírtak szerint maradnak: létrehozás és módosítás csak `contentowner` szerepkörtől.

---

## Adatvédelmi tisztviselő (DPO)

A GDPR → Adatvédelmi tisztviselő menüpont alatt tárolhatók az adatvédelmi tisztviselő
elérhetőségei és kinevezési dokumentuma (PDF feltöltés). Az adatok automatikusan
megjelennek a GDPR irányítópulton.

---

## Törlési napló

A törlési napló dokumentálja a ténylegesen elvégzett törléseket — mikor, melyik
adatkategóriát törölték és milyen megőrzési időszak alapján.

**GDPR → Törlési napló → „Bejegyzés hozzáadása"**

A lejárt törlések (a VVT-ben rögzített megőrzési idők alapján) értesítésként jelennek
meg az irányítópulton.

---

## Irányítópult

A GDPR irányítópult gyors áttekintést nyújt:
- VVT-bejegyzések száma, nyitott DSAR-ok, aktív adatvédelmi incidensek
- TOM-ok kategória szerint
- Lejárt törlések
- Az adatvédelmi tisztviselő elérhetőségei

---

## Audit megjegyzés

Felügyeleti hatóság által végzett GDPR-audit során általában a következőket kérik:
a VVT teljessége, DPA valamennyi releváns adatfeldolgozóhoz, DPIA a magas kockázatú
adatkezelési tevékenységekhez, a DSAR-ok határidőn belüli kezelésének igazolása,
valamint a TOM-dokumentáció. A GDPR modul mindezeket lefedi.
