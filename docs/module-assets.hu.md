# Modul: Eszközök (Információs vagyonelemek)

> Az eszköznyilvántartás minden ISMS alapja — az ISO 27001 A.5.9 melléklete megköveteli
> az összes információfeldolgozó eszköz teljes leltárát.

---

## Mi az eszköz?

Az eszköz (információs vagyonelem) bármely, a szervezet számára értékes és védelemre szoruló
erőforrás: szoftver, hardver, adat, személyek, folyamatok, létesítmények.

Tipikus eszközkategóriák:
- **Hardver** — szerverek, laptopok, hálózati eszközök
- **Szoftver** — operációs rendszerek, alkalmazások, SaaS
- **Adat** — adatbázisok, biztonsági mentési adathordozók, konfigurációs adatok
- **Személyek** — kulcspozícióban lévő munkatársak
- **Folyamatok** — kritikus üzleti folyamatok
- **Létesítmények** — adatközpontok, irodaépületek

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Eszközök megtekintése | `reader` |
| Eszközök létrehozása és szerkesztése | `editor` |
| Eszközök törlése / visszaállítása | `admin` |

---

## Eszköz létrehozása

**Eszközök → „+ Új eszköz"**

Mezők:
- **Név** — egyedi azonosító (pl. „Termelési adatbázisszerver")
- **Típus** — pl. Szerver, SaaS alkalmazás, Adatbázis. A lista kategóriák szerint csoportosított (Hardver, Szoftver, Adat, Szolgáltatások, Létesítmények), és testreszabható — lásd alább.
- **Felelős** — ki a felelős?
- **Részleg / Szervezeti egység**
- **Besorolás** — bizalmassági szint: `nyilvános` / `belső` / `bizalmas` / `titkos`
- **Kritikusság** — `alacsony` / `közepes` / `magas` / `kritikus`
- **Leírás** — mi az eszköz, hol található?
- **Kapcsolódó kockázatok** — mely kockázatok érintik ezt az eszközt?

---

## Eszköztípusok testreszabása

**Adminisztráció → Listák → Eszköztípusok** (csak rendszergazdák)

Az alkalmazáshoz mellékelt típusok kiindulópontot jelentenek, nem rögzített listát. Átnevezhetők,
bővíthetők és eltávolíthatók; minden típus az öt kategória valamelyikébe tartozik.

Két biztosíték érvényes:

- **A még használatban lévő típus nem törölhető.** A rendszer megnevezi a típust és az érintett
  eszközök számát. Előbb rendelje hozzá újra, majd törölje.
- **A típus mentéskor kerül ellenőrzésre.** Ismeretlen típust a rendszer visszautasít, hogy
  elírás ne kerüljön az adatokba önálló típusként.

A meglévő eszközök megtartják típusukat akkor is, ha az később eltűnik a listából; az űrlapon
„Ismeretlen típus" felirattal jelenik meg, hogy szerkesztéskor ne vesszen el észrevétlenül.

**Visszaállítás** visszaállítja az alapértelmezett típusokat.

### Védelmi célok beállítása típusonként

Minden típushoz meghatározható a bizalmasság, sértetlenség, rendelkezésre állás és hitelesség
szintje (1–4). Az adott típusú eszközök ezeket az értékeket öröklik, anélkül hogy egyenként
kelljen karbantartani őket.

Három szabály lényeges:

- **Az alapértelmezés célonként érvényes.** Egy „Adatbázis" típus meghatározhatja a bizalmassági
  szintet egyedül 4-re; a sértetlenség és a rendelkezésre állás ekkor az egyes eszköznél marad.
- **A kapcsolat megmarad.** A típuson utólag javított alapértelmezés azonnal érvényes minden olyan
  eszközre, amelyen nincs felülbírálat — nem egyszeri kezdőértékről van szó.
- **Eltérés lehetséges:** az eszközűrlapon elérhető a „Védelmi célok önálló beállítása a típustól
  függetlenül" kapcsoló. Amíg ki van kapcsolva, a négy mező zárolt és a típus értékét mutatja.

**Fontos kölcsönhatás a függőségekkel:** a maximum elvű öröklés továbbra is a típusalapértelmezés
felett érvényesül. Ha egy magas védelmi igényű eszköz egy másiktól függ, az utóbbi értéke megemelkedik
— még ott is, ahol az értéket szándékosan csökkentette egy felülbírálat. Ez szándékos: a kritikus
alkalmazást futtató szerver nem kevésbé védelemre szoruló, mint maga az alkalmazás. Az űrlap
megmutatja, melyik eszköz emeli az értéket.

---

### Nyelvek: mi kerül fordításra és mi nem

Ez tudatos tervezési döntés, nem hiányosság:

- **A 24 beépített típus le van fordítva az összes felületi nyelvre** (DE/EN/FR/NL/HU), és az
  egyes felhasználók által beállított nyelven jelenik meg.
- **Az egyénileg létrehozott típus nincs lefordítva.** Minden felhasználónak pontosan úgy jelenik
  meg, ahogy megadták. Az alkalmazás nem tud fordítást generálni ismeretlen kifejezéshez.
- **A beépített típus átnevezése elveszíti a fordítását.** Ettől kezdve a megadott szöveg
  érvényes — ellenkező esetben az átnevezés más nyelveken némán felülíródna.

Ha többnyelvű munkaerővel rendelkeznek és saját típusokat adnak hozzá, állapodjanak meg a típusnevek
egyetlen nyelvében — általában a vállalati nyelvben. A visszaállítás visszaállítja a fordításokat.

---

## Besorolás és kritikusság

A **besorolás** a bizalmassági védelmi igényt írja le:

| Szint | Jelentés |
|---|---|
| `nyilvános` | Nyilvánosan elérhető, közzétételből nincs kár |
| `belső` | Csak belső használatra, korlátozott hatás |
| `bizalmas` | Bizalmas, jelentős hatás |
| `titkos` | Szigorúan bizalmas, súlyos hatás |

A **kritikusság** azt írja le, hogy az eszköz elérhetetlensége vagy kompromittálása milyen hatással
van az üzleti működésre.

---

## Kapcsolódás kockázatokhoz

A kockázatkezelő modulon keresztül a kockázatok közvetlenül hozzárendelhetők az érintett eszközökhöz.
Az eszköz részletes nézetében az összes kapcsolódó kockázat és azok aktuális állapota megtekinthető.
Ez átláthatóvá teszi az eszköz **kockázati kitettségét**.

---

## Irányítópult

Az eszközáttekintő megmutatja:
- Az eszközök összesített számát típusonként
- Megoszlást besorolás és kritikusság szerint
- Felelős nélküli eszközöket (intézkedés szükséges)

---

## Audit-megjegyzés

Az ISO 27001 A.5.9 megköveteli a karbantartott eszközleltárt tulajdonos-hozzárendelésekkel.
Az A.5.10 megköveteli az elfogadható használatra vonatkozó szabályzatot. Az A.5.12 az
információk besorolását írja elő.
Mindhárom követelményt az eszközmodul és egy megfelelő szabályzat együttesen teljesíti.

Javaslat: az eszköznyilvántartást évente vizsgálják felül, és frissítsék azonnal, ha az IT-
infrastruktúrában jelentős változások következnek be.
