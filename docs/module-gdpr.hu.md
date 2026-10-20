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

---

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
