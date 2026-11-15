# Modul: Képzés és információbiztonsági tudatosság

> A munkatársak az ISMS legfontosabb – és gyakran legsérülékenyebb – tényezői.
> Az ISO 27001 7.2 és 7.3, valamint az A.6.3 fejezete igazolható kompetenciát
> és biztonsági tudatosságot követel meg.

---

## Mi kerül itt dokumentálásra?

A képzési modul rögzíti az összes biztonsági tudatossági intézkedést:
- Kötelező képzések (onboarding, éves képzés)
- Adathalászat-szimulációk (phishing)
- Műhelymunkák és külső szemináriumok
- E-learning teljesítések
- Szerepkör-specifikus képzések (rendszergazdák, CISO, DPO)

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Képzési nyilvántartások megtekintése | `reader` |
| Képzési nyilvántartások létrehozása és szerkesztése | `editor` |
| Képzési nyilvántartások törlése / visszaállítása | `admin` |

---

## Képzési bejegyzés létrehozása

**Képzés → „+ Új képzés"**

Mezők:
- **Cím** – pl. „Adathalászat-tudatosság Q1 2026"
- **Típus** – Kötelező / Adathalászat-szimuláció / Műhelymunka / E-learning / Egyéb
- **Dátum** – mikor zajlott a képzés?
- **Időtartam** – órában megadva
- **Oktató / Szolgáltató**
- **Célcsoport** – minden munkatárs / IT-osztály / vezetőség stb.
- **Résztvevők száma** – hány fő vett részt?
- **Lefedettségi arány** – a célcsoport hány százalékát sikerült elérni?
- **Eredmény / Megjegyzések** – értékelés, megállapítások, fejlesztendő területek
- **Státusz** – `tervezett` / `teljesített` / `lemondott`

---

## Bizonyíték rögzítése („Bizonyítékok” fül)

A bizonyíték **nem külön rekord**, hanem a képzés **„Bizonyíték / Megjegyzések”** mezője. A **„Bizonyítékok”** fülön ezért nincs „Új” gomb: csak az **Elvégzett** állapotú képzéseket és az ott megadott bizonyíték-szöveget listázza.

Eljárás:
1. **„Terv” fül** → nyissa meg a képzést a ceruza ikonnal (vagy hozza létre az „+ Új képzés” gombbal).
2. Állítsa az **állapotot** *Elvégzett*re, és adja meg a befejezés dátumát.
3. A **„Bizonyítékok”** szakaszban töltse ki a **„Bizonyíték / Megjegyzések”** mezőt: jelenléti ív, tanúsítványszámok, a tárolt dokumentumokra mutató hivatkozások (`http`/`https`).
4. **Mentés.** A képzés megjelenik a „Bizonyítékok” fülön; a kártyára kattintva a képzés csak megtekinthető (módosítani kizárólag a „Terv” fülön lehet).

Fontos: a még nem *Elvégzett* képzés nem jelenik meg a „Bizonyítékok” fülön, akkor sem, ha már van bizonyíték-szövege. Fájlokat ugyanebben az űrlapon, a „Mellékletek” alatt csatolhat (lásd lent).

---

## Mellékletek és részvételi igazolás

**Mellékletek** (jelenléti ív, szolgáltató tanúsítványa, fotók): „Terv” fül → a képzés megnyitása → **„Mellékletek”** szakasz → „Fájl hozzáadása”. Akkor lehetséges, ha a képzés már el van mentve.
- Engedélyezett: PDF, PNG, JPG, DOCX, XLSX és TXT, fájlonként legfeljebb 20 MB. A kiterjesztést **és** a tartalmat is ellenőrizzük; más vagy álcázott fájlokat elutasítunk.
- Feltölteni és eltávolítani a Szerkesztő szinttől felfelé lehet; letölteni minden olvasási joggal rendelkező fiók tud. A „Bizonyítékok” fülön a mellékletek gombként jelennek meg a kártyán.
- **Az „Eltávolítás” csak a listából rejti el a mellékletet.** A fájl bizonyítékként megmarad a kiszolgálón (a `training-files/` mappa az adatkönyvtárban). Ezt a mappát is mentse; nem része a JSON-adatexportnak.
- Minden feltöltés és eltávolítás bekerül az auditnaplóba.

**Részvételi igazolás (PDF):** „Részvételi igazolás (PDF)” gomb a „Bizonyítékok” fülön (a kártyán) és a képzés űrlapján.
- **Csak „Elvégzett” állapotú képzésről** állítható ki. Más állapotnál a rendszer jelzi, hogy befejezés után adható ki.
- **Képzésenként egy igazolás** (nem résztvevőnként): cím, kategória, leírás, befejezés dátuma, oktató/szolgáltató, résztvevők („Hozzárendelve” mező), kötelező igen/nem, kapcsolt kontrollok, a vállalat logója és neve. A kiemelő szín a kategóriától függ, a nyelv a telepítés alapértelmezett nyelve.
- **Az ellenőrző kódot** az azonosítóból, a címből, a befejezés dátumából, az oktatóból és a résztvevőkből számítjuk (SHA-256, az első 12 karakter). Ha ezek az adatok változnak, a kód is változik; így látható, hogy egy régebbi igazolás még megfelel-e a képzés jelenlegi állapotának.
- **Ez a vállalat belső igazolása, nem harmadik fél általi tanúsítás**; a dokumentum is ezt írja. Aláírást nem tartalmaz.
- Korlát: a PDF betűtípusa nem ismeri a magyar ő/ű karaktereket; ö/ü jelenik meg helyettük.
- Minden kiállítás az ellenőrző kóddal együtt bekerül az auditnaplóba.

---

## Haladás és mérőszámok

A képzési áttekintő az alábbiakat mutatja:
- Lefedettségi arány az összes képzésre (cél: a kötelező képzések 100%-os teljesítése)
- Tervezett és teljesített képzések aránya
- Képzések típus és időszak szerinti bontása

---

## Kapcsolat az SoA-val

A képzési intézkedések kontrollok megvalósítási bizonyítékaként is csatolhatók, pl.:
- ISO A.6.3 (Biztonsági tudatossági képzés) → éves képzés
- ISO A.8.7 (Kártevők elleni védelem) → adathalászat-szimuláció

---

## Auditori megjegyzés

Az ISO 27001 7.2 fejezete megköveteli annak igazolását, hogy a munkatársak rendelkeznek a szükséges kompetenciával.
A 7.3 fejezet az ISMS-szabályzattal és a személyes szerepkörrel kapcsolatos tudatosságot írja elő.

Az auditor az alábbiakat várja:
1. Képzési terv az aktuális évre
2. A teljesített képzések igazolása (jelenléti ívek, tanúsítványok)
3. Az összes érintett munkatársat lefedő teljesítési arány

Javaslat: a jelenléti ívet és a hivatkozásokat (http/https) írja be a „Bizonyíték / Megjegyzések” mezőbe, a tanúsítványokat és listákat pedig csatolja fájlként a „Mellékletek” alatt, hogy az audit során azonnal rendelkezésre álljanak. A „Bizonyítékok” fülön a kártyára kattintva a képzés csak megtekinthető (módosítani a „Terv” fülön lehet); a bizonyíték szövegében lévő hivatkozások kattinthatók.