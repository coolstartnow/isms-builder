# Modul: Szállítókezelés

> Az információs vagyonelemekhez hozzáféréssel rendelkező szállítókat és
> szolgáltatókat értékelni és nyomon kell követni — ISO 27001 A.5.19–A.5.22.

---

## Miért szükséges a szállítókezelés?

Számos biztonsági incidens harmadik felektől ered, akik hozzáférnek rendszerekhez
vagy adatokhoz (ellátási lánc elleni támadások, nem biztonságos SaaS-szolgáltatások,
ellenőrizetlen alvállalkozók). Az ISO 27001 ezért szisztematikus megközelítést ír elő
a szállítói kockázatok kezelésére.

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Szállítók megtekintése | `reader` |
| Szállítók létrehozása és szerkesztése | `editor` |
| Szállítók törlése / visszaállítása | `admin` |

---

## Szállító létrehozása

**Szállítók → „+ Új szállító"**

Mezők:
- **Név** — cégnév
- **Kategória** — pl. IT-szolgáltató, felhőszolgáltató, karbantartó cég
- **Kapcsolattartó** — kapcsolattartó személy, e-mail
- **Hozzáférési szint** — melyik rendszerekhez/adatokhoz fér hozzá a szállító?
- **Kockázati besorolás** — `alacsony` / `közepes` / `magas` / `kritikus`
- **Státusz** — `aktív` / `inaktív` / `felülvizsgálat_alatt`
- **Következő felülvizsgálat** — mikor esedékes a soron következő értékelés?
- **Biztonsági követelmények** — milyen követelményekben állapodtak meg?
- **Bizonyítékok** — rendelkezésre áll-e ISO-tanúsítvány, SOC 2 jelentés vagy adatfeldolgozói megállapodás (DPA)?

---

## Szállítói értékelés e-mailben

Kritikus szállítók esetén **biztonsági kérdőív** küldhető anélkül, hogy a szállítónak
fiókra lenne szüksége:

**Szállító megnyitása → „Értékelés küldése"**

A szállító személyre szóló hivatkozást kap, és a kérdőívet közvetlenül a böngészőben
tölti ki. A válaszok rögzítésre kerülnek és a szállítói profilhoz rendelődnek.

---

## Kockázati besorolás

A szállító kockázati besorolását a következők határozzák meg:
- Az adathozzáférés típusa és mértéke
- A függő folyamatok kritikussága
- Igazolt biztonsági intézkedések (tanúsítványok, auditok)
- Szerződéses biztosítékok (DPA, titoktartási megállapodás, SLA-k)

A `magas` vagy `kritikus` besorolású szállítókat legalább évente felül kell vizsgálni.

---

## Kapcsolat a GDPR-modulhoz

A személyes adatokat kezelő szállítók a GDPR-modulban is megjelennek az
adatfeldolgozói megállapodások (DPA) alatt. A kapcsolatot manuálisan kell létrehozni
a DPA-bejegyzésnél.

---

## Kapcsolódó kockázatok

A kockázati űrlapon a kockázatok egy vagy több szállítóhoz köthetők („Kapcsolatok” szakasz → **Érintett eszközök, eszköztípusok és szállítók**). A szállító űrlapján (szerkesztéskor) a **Kapcsolódó kockázatok** szakasz az összes kapcsolódó kockázatot mutatja szinttel és állapottal.

---

## Irányítópult

A szállítói áttekintő a következőket mutatja:
- Összes szállító kockázati besorolás szerint
- Lejárt felülvizsgálatú szállítók
- Aktív és inaktív szállítók aránya

---

## Audit-megjegyzés

Az ISO 27001 A.5.19 szabályozást ír elő a szállítói kapcsolatokra. Az A.5.20 biztonsági
követelményeket vár el a szállítói szerződésekben. Az A.5.21 az ellátási lánc kockázataival
foglalkozik. Az A.5.22 a szállítói teljesítmény és biztonság rendszeres nyomon követését írja elő.

A szállítói értékelési funkció dokumentált bizonyítékot tesz lehetővé a biztonsági
felülvizsgálatokról, amelyet az auditornak be lehet mutatni.
