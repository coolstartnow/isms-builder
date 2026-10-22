# Modul: Szervezet és céglogó

> Itt határozzák meg a rendszergazdák, ki a szervezet: név, felelősségek, nyelvek, értesítések,
> szolgáltatások és a **céglogó**, amely a bejelentkezési oldalon, a szabályzat-PDF-ekben és a nyomtatási nézetekben jelenik meg.

---

## Hol találom a beállításokat?

**Admin → Szervezet.** A terület csak rendszergazdáknak látható. A módosítások a jobb felső sarokban lévő **Mentés** gombbal lépnek érvénybe; a céglogó ezzel szemben **feltöltéskor azonnal** mentésre kerül.

| Szakasz | Tartalom |
|---|---|
| **Általános információk** | Szervezet neve, rövidítés, logószöveg, **céglogó**, az ISMS hatóköre |
| **Felelősségek** | CISO, adatvédelmi tisztviselő (GDPO) és ICS-kapcsolattartó névvel és e-mail-címmel |
| **Biztonsági szabályzatok** | 2FA kikényszerítése az egész rendszerben (TOTP nélküli bejelentkezés ekkor blokkolva van) |
| **Nyelvkonfiguráció** | Engedélyezett nyelvek (DE, EN, FR, NL, HU) és a bejelentkezési oldal alapértelmezett nyelve |
| **E-mail értesítések** | Globális kapcsoló és az egyes értesítéstípusok |
| **SMTP-konfiguráció** | Levelezőkiszolgáló az értesítésekhez és a szabályzat-visszaigazolásokhoz |
| **WebDAV-közzététel** | Jóváhagyott szabályzatok automatikus elhelyezése Nextcloudban/ownCloudban |
| **Menü sorrendje** | Az oldalsáv menüpontjainak sorrendje |
| **Szervezeti egységek** | IT-struktúra (CIO, csoport/központi, helyi) a felelősségekhez minden modulban |

Az SMTP és a WebDAV jelszavai **csak írhatók**: a kiszolgáló soha többé nem mutatja meg őket, a rendszergazdáknak sem. Üres mező esetén a mentett jelszó változatlan marad; az eltávolításhoz külön lehetőség van.

---

## Céglogó

A céglogó a hivatalos dokumentumoknak az Ön szervezetének megjelenését adja.

### Feltöltés

1. **Admin → Szervezet → Általános információk**, **Céglogó** sor.
2. Válasszon egy fájlt. Azonnal mentésre kerül, és előnézetként megjelenik.
3. Cseréhez válasszon új fájlt, eltávolításhoz kattintson a **Logó eltávolítása** gombra.

| Szabály | Érték |
|---|---|
| Formátumok | **PNG** vagy **JPEG** |
| Méret | legfeljebb **512 kB** és oldalanként **4000 képpont** |
| Nem engedélyezett | SVG és minden más formátum. Az SVG szkripteket tartalmazhat, ezért szándékosan elutasítjuk |

A fájltípust a fájl tartalma alapján ellenőrizzük, nem a kiterjesztés vagy a böngésző megadása alapján. A legjobb a **fekvő formátumú, átlátszó vagy fehér hátterű logó**; kb. 840 × 400 képpontig minden kimenethez elegendő.

### Hol jelenik meg a logó

| Hely | Megjelenítés |
|---|---|
| **Bejelentkezési oldal** | a bejelentkezési űrlap felett, világos csempén (hogy a sötét logók is olvashatók maradjanak) |
| **Szabályzat-PDF** | kicsiben az első oldal jobb felső sarkában, a cím alatta kezdődik |
| **Nyomtatási nézetek** | jobb felül a jelentések, kockázat-, megállapítás- és intézkedésáttekintések, auditkimenetek és a dokumentumexport nyomtatási ablakaiban |

Nem érinti: az alkalmazás fejléce és a mobilalkalmazás. Logó nélkül minden kimenet a régi marad, csak kép nélkül.

Ki **láthatja** a logót: mindenki, aki eléri a bejelentkezési oldalt (az megjeleníti). Ki **módosíthatja**: csak a rendszergazdák; minden módosítás bekerül az auditnaplóba.

### Demó és éles üzem

- **Demó módban** az ISMS Builder saját logóval érkezik. A demóadatok betöltésekor kerül beállításra, de csak akkor, ha még nincs saját logó.
- Az **éles üzemre váltáskor** (Admin → Karbantartás → Demó-visszaállítás) a demólogó törlődik. A saját feltöltésű logó megmarad.
- Ezután az ISMS Builder emlékeztet a **céglogó beállítására**: a visszaállítás eredményében, a bejelentkezési oldal értesítésében, a vezérlőpult tetején (rendszergazdáknak) és a beállításokban. Az értesítés eltűnik, amint feltöltenek egy logót.

### Mentés

A logó egy fájl az adatkönyvtárban (`org-logo.png` vagy `org-logo.jpg` az `org-logo.json` fájllal), függetlenül a választott tárolási háttérrendszertől. **Nem** része a JSON-adatexportnak; az adatkönyvtár mentése tartalmazza.

---

## Tippek

- Töltse fel a logót az első szabályzat-PDF **előtt**. A már elkészült PDF-ek nem változnak.
- Ha a logó elmosódottnak tűnik a PDF-ben, használjon nagyobb fájlt (legfeljebb 4000 képpont), amely továbbra is legfeljebb 512 kB.
- Feltöltés után töltse újra az oldalt, ha egy megnyitott böngészőlap még a régi logót mutatja.
