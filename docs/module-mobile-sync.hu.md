# Modul: Mobilalkalmazás (Android) és szinkronizálás

> Az Android-alkalmazás az ISMS Builder önálló, offline is használható változata. Saját adatállományt tart a telefonon
> vagy a tableten, és igény szerint egyezteti a fő rendszerrel — Wi-Fi-n vagy fájlon keresztül.

> **⚠ Fontos — csak JSON tárolással:** A mobilalkalmazás és a szinkronizálás **kizárólag** akkor működik, ha az ISMS Builder **JSON tárolást** használ (`STORAGE_BACKEND=json`, az alapértelmezett). **SQLite, MariaDB/MySQL vagy PostgreSQL esetén a szinkronizálás nem érhető el** (a szerver `501`-gyel válaszol). Az aktív tárolót a szerver `.env` fájlja adja meg (`STORAGE_BACKEND`). Az alkalmazás használata előtt ellenőrizze.

---

## Mit tud az alkalmazás

- **Offline munka:** az alkalmazás tartalmazza a felületet és a szerver logikáját (kockázatértékelés, eszköztípusok, verziókezelés, állapotváltások). Szerverre nincs szükség.
- **Modulok:** dokumentumok/sablonok, SoA (alkalmazhatósági nyilatkozat), kockázatok, eszközök, auditmegállapítások és útmutatók. Az összes többi modul (pl. GDPR, BCM, szállítók, adminisztráció) nincs az alkalmazásban.
- **Egy fiók alkalmazásonként:** a beállítás után az alkalmazás pontosan egy szinkronfiókhoz tartozik. A név, a menü és a szerkesztési jogok az alkalmazásban e fiók jogosultságait követik.
- **Telefon és tablet:** a felület alkalmazkodik (álló és fekvő tájolás; fekvő tájolásnál az oldalsáv látható marad). A jelszó, a 2FA és a szerepkörök beállításai helyben nem léteznek; a nyelvet a szinkronpanelen, a *Felület nyelve* alatt lehet kiválasztani.
- **Súgó az alkalmazásban:** A szinkronpanelen és a beállítási képernyőn lévő „?” gomb beépített felhasználói súgót nyit meg (beállítás, szinkronizálás, ütközések, fájlcsere, biztonság, hibaüzenetek). Offline olvasható, és mind az öt nyelven elérhető.
- **Jogosultságok területenként:** Az új, szerkesztés, törlés és fájlfeltöltés csak azokon a területeken jelenik meg, ahol a szinkronfiók írhat; az útmutatók az alkalmazásban mindig csak olvashatók. A nyomtatási és PDF-funkciók csak a szerveren érhetők el.
- **Céges licenc (opcionális):** Az alkalmazás szabadon használható marad. A licenckóddal, amelyet egy cég adminisztrátora kér a fejlesztőtől, a telepítés a céghez rendelődik („licencelve: …”). A kódot az eszköz offline ellenőrzi, adat nem kerül továbbításra; kód nélkül csak egy jelzősáv jelenik meg.
- **Nem elérhető:** fájlfeltöltés/mellékletek (az útmutatók PDF/Word-fájljai csak a szerveren vannak meg; az alkalmazás tájékoztatást mutat), WebDAV-közzététel, MI-funkciók, PDF-letöltés a szerverről.

## Követelmények a fő rendszeren

- ISMS Builder **1.76-os vagy újabb verzió** (1-es szinkronprotokoll, a `GET /api/version` válaszában `syncProtocol` néven).
- `STORAGE_BACKEND=json` (alapértelmezett). sqlite, mariadb vagy postgres esetén a szinkron végpontok `501`-gyel válaszolnak.
- **HTTPS:** a szervernek `https://` címen kell elérhetőnek lennie (beállítás: `scripts/setup-ssl.sh`, *SSL/TLS beállítása* szakasz). Az alkalmazásban megadott címnek szerepelnie kell a tanúsítványban.
- **Verziók:** az alkalmazásnak **saját verziószáma** van, és független a fő rendszertől. Kompatibilisek, ha a szinkronprotokoll egyezik (jelenleg 1), és a szerver legalább 1.76-os verziójú. Az alkalmazás a *Szerver ellenőrzése* és az *Infó és követelmények* alatt mutatja a verziót és a kompatibilitást.
- Egy **szinkronfiók** (lásd lent). A szinkronizáláshoz normál felhasználói fiók nem használatos.

## Szinkronfiók létrehozása

Az adminisztrátorok az *Adminisztráció → Felhasználók* alatt, a *Szinkronfiókok (mobilalkalmazás)* részben hozzák létre a szinkronfiókokat (*Új szinkronfiók*). A szinkronfiók egy **szerepkört vagy személyt** képvisel (pl. „CISO”, „adatvédelmi tisztviselő”, „audit”), és **független a felhasználóktól**: nincs bejelentkezés a felületre, nincs szerepkör, nincs jelszó, nincs 2FA. Kizárólag az alkalmazás adatszinkronizálására szolgál.

- **Név**, pl. „CISO”. A név az alkalmazásban fiókként, az újonnan létrehozott rekordokon és az audit naplóban jelenik meg (`sync:CISO`).
- **Jogosultságok modulonként:** *nincs hozzáférés*, *olvasás* vagy *olvasás és írás* (dokumentumok/sablonok, SoA, kockázatok, eszközök, megállapítások). Az útmutatók csak olvashatók. Példa: az auditor fiókja olvashatja és írhatja a kockázatokat és megállapításokat, mást nem.
- **Érvényes eddig** (opcionális).
- **Eszközök:** egy fióknak több eszköze lehet (pl. a CISO telefonja és tabletje). Minden eszköznek **saját kulcsa** van. A lista az eszköz nevét és az „utoljára használva” időpontot mutatja; az elveszett eszköz külön letiltható (✕), a többit nem érinti.

### Eszköz beállítása (QR-kód)

Létrehozás után, később pedig bármikor a QR-ikonnal az adminisztráció **QR-kódot és beállítási kódot** (formátum: `XXXX-XXXX-XXXX`) mutat. Mindkettő **15 percig érvényes és csak egyszer használható**; az új kód érvényteleníti az előzőt. Az a cím, amelyen az alkalmazás eléri a szervert, szerkeszthető (előre kitöltve az éppen használttal). A QR-kód csak ezt a címet és az egyszeri kódot tartalmazza — **a kulcsot nem**. A kulcs csak az alkalmazásban történő beváltáskor jön létre, az adminisztrátor soha nem látja, és a szerveren csak hashként tárolódik.

**Szkriptekhez** (pl. `scripts/sync-import.js`) a kulcs ikon eszközkulcsot hoz létre (`ISMS-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`), amely **egyszer** jelenik meg.

A letiltás, az újra engedélyezés, a jogosultságok módosítása és a törlés azonnal érvénybe lép. Az adminisztráció az audit naplóban rögzítésre kerül (kulcsok és kódok soha); a szinkronizálásból származó módosítások ott a szinkronfiók nevén szerepelnek.

## Az eszköz beállítása az alkalmazásban

1. Telepítse és nyissa meg az alkalmazást (aktív eszközzár esetén előbb oldja fel, lásd *Biztonság*). Az első indításkor az alkalmazás csak a beállítási képernyőt mutatja.
2. **QR-kód beolvasása**, majd az adminisztráció QR-kódjának lefényképezése a kamerával. Vagy adja meg kézzel a szervercímet és a beállítási kódot. Az alkalmazás maga olvassa a QR-kódot, Google-szolgáltatások nélkül.
3. Az alkalmazás beváltja a kódot az eszközkulcsra (az Android kulcstárolóban tárolva), letölti az alapadatokat (első szinkronizálás), és újraindul.

Ezután az alkalmazás **ehhez az egy fiókhoz** tartozik: felül a fiók neve látható, a menü és a szerkesztési jogok a fiók jogosultságait követik. A hozzáférés nélküli modulok hiányoznak a menüből; a csak olvasható modulok írásvédettek (a módosításokat „Hozzáférés megtagadva” üzenettel utasítja el). A szinkronpanel a *Az eszköz fiókja* alatt mutatja a fiókot, az eszközt és a jogosultságokat.

- **A jogosultságok változnak:** minden szinkronizálás lekéri az aktuális jogosultságokat. Ha egy olvasási jogot visszavonnak, az alkalmazás törli az adott modul helyi adatait (az el nem küldött módosításokat is); ha egy modult újonnan engednek, teljesen betölti. A megjelenítés és a menü a felület újratöltése után igazodik.
- **Fiókváltás vagy az eszköz átadása:** a szinkronpanelen az *Eszköz visszaállítása* megerősítés után törli az összes helyi adatot, a fiókot és a kulcsot; ezután új beállítás szükséges. Az el nem küldött módosítások elvesznek.

## Tanúsítvány a telefonon

Nyilvánosan megbízható tanúsítványnál (pl. Let's Encrypt) nincs teendő. **Saját vagy önaláírt tanúsítványnál** a telefonnak meg kell bíznia benne:

1. A `scripts/setup-ssl.sh` futtatásakor a *További nevek/IP-címek* alatt adja meg az alkalmazásban használt nevet vagy IP-címet (pl. `192.168.1.20`). Ha a cím nincs a tanúsítványban, az alkalmazás elutasítja a kapcsolatot.
2. Másolja a `ssl/cert.pem` fájlt a telefonra (USB, Nextcloud, e-mail).
3. A telefonon: *Beállítások → Biztonság → Titkosítás és hitelesítő adatok → Tanúsítvány telepítése → CA-tanúsítvány* (az útvonal gyártónként eltér). Az Android figyelmeztet a harmadik féltől származó tanúsítványokra; itt ez a saját tanúsítványa.
4. Az alkalmazásban válassza a *Szerver ellenőrzése* lehetőséget: ha megjelenik a szerververzió, a telefon megbízik a tanúsítványban.

Hibaüzenetek: *A szerver nem érhető el* → ellenőrizze a címet, a portot, a Wi-Fi/VPN-t és a szerver tűzfalát. *A tanúsítvány … nem megbízható* → 1–3. lépés.

## Szinkronizálás Wi-Fi-n

A beállítás után (lásd fent) a cím és a kulcs el van mentve: elég a *Szinkronizálás most* gomb. Az alábbi lépések akkor érvényesek, ha a kulcsot eltávolították, vagy másik eszközkulcsot használnak.

1. Koppintson az alkalmazás jobb alsó sarkában lévő szinkron gombra.
2. Adja meg a szerver címét (pl. `https://isms.example.org:3000`) és a **hozzáférési kulcsot**. A *Szerver ellenőrzése* mutatja a szerververziót és a kompatibilitást; az első szinkronizálás után az alkalmazás a szinkronfiók nevét és jogosultságait is megjeleníti. A kulcs az Android védett kulcstárolójában kerül tárolásra; a *Kulcs eltávolítása* törli az eszközről.
3. **Szinkronizálás most.** Az alkalmazás először elküldi a helyi módosításokat (push), majd letölti, ami új a szerveren (pull). Az első szinkronizálás a teljes alapadatállományt letölti.

Szabályok:

- **Csak a módosítások:** csak az utolsó szinkronizálás óta változott adatok kerülnek átvitelre.
- **Szerveridő:** a szerver fogadáskor adja meg az `updatedAt` értéket. A telefon rosszul járó órája nem zavarja a szinkronizálást.
- **Ütközések:** ha egy rekordot a szerveren módosítottak azután, hogy a telefon letöltötte, **nem íródik felül**. Az alkalmazásban az *Ütközések feloldása* alatt jelenik meg az eltérő mezőkkel. Rekordonként választható: *Saját változat megtartása* (a következő szinkronizáláskor kerül elküldésre) vagy *Szerverváltozat átvétele*.
- **Törlés:** a telefonon végzett törlés a fő rendszer kukájába kerül. A telefonon végrehajtott *Végleges törlés* ott szintén törölt rekordként jelenik meg; nem távolítja el a rekordot a fő rendszerből.
- **Jogosultságok:** az olvasási jog nélküli modulok nem kerülnek letöltésre. Ha egy modulhoz hiányzik az írási jog, az alkalmazás *elutasítva* jelzéssel közli; a helyi módosítások nem vesznek el. A *Hozzáférési kulcs érvénytelen, letiltott vagy lejárt* üzenet azt jelenti: ellenőrizze a fiókot az adminisztrációban.

## Szinkronizálás fájlon keresztül

A fő rendszerhez hálózati kapcsolattal nem rendelkező eszközökhöz:

- **Minden exportálása** — az alkalmazás adatainak teljes mentése (alkalmazásból alkalmazásba, vagy archívum).
- **Csak a módosítások exportálása** — a helyben módosított rekordokat tartalmazó fájl. Beolvasás a fő rendszeren szinkronfiókkal:

  ```bash
  ISMS_SYNC_KEY=ISMS-XXXX-… node scripts/sync-import.js https://isms.example.org:3000 isms-mobile-changes-2026-10-18.json
  ```

  `ISMS_SYNC_KEY` nélkül a szkript visszhang nélkül kéri a kulcsot. Ugyanazok a jogosultságok és ugyanaz az ütközési szabály érvényes, mint a Wi-Fi-szinkronnál; a `3`-as kilépési kód ütközést vagy elutasított rekordokat jelent.
- **Fájl importálása** — alkalmazáscsomagot vagy a fő rendszer exportját (*Admin → Export*) fogadja. Az alkalmazás előbb **előnézetet** mutat (új / frissített / változatlan / ütközés). A helyben módosított rekordokat soha nem írja felül csendben. A fő rendszer exportja csak az általa szolgáltatott modulokat tartalmazza (pl. sablonok, SoA, kockázatok, útmutatók); az eszközök és megállapítások a Wi-Fi-szinkronnal érkeznek.

## API

Minden hívás, a `/sync/enroll` kivételével, tartalmazza az `Authorization: Bearer <eszközkulcs>` fejlécet.

| Metódus | Útvonal | Cél |
|---|---|---|
| POST | `/sync/enroll` | Eszköz beállítása: a beállítási kódot (a QR-kódból) eszközkulcsra váltja. Bejelentkezés nélkül; a kód egyszer használható és 15 percig érvényes; a sikertelen próbálkozások lassításra kerülnek. |
| GET | `/sync/me` | A szinkronfiók neve, jogosultságai és érvényessége. |
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Módosítások `since` óta, a törölt rekordokkal együtt, csak az olvasható modulokra (a kifejezetten kért, de nem engedélyezett modulok a `denied` alatt szerepelnek). A válasz tartalmazza a következő pullhoz szükséges `serverTime` értéket. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <modul>: [rekordok baseUpdatedAt értékkel] } }` — válasz: `accepted`, `conflicts`, `rejected`. |

A szinkronfiókok kezelése (`/admin/sync-accounts`) csak adminisztrátoroknak szól. Modulok: `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Leírása: `docs/architecture/openapi.yaml`.

## Biztonság

- Az átvitel **kizárólag titkosítva (HTTPS)** történik. Az alkalmazás elutasítja a titkosítatlan `http://` címet. A saját Wi-Fi-n kívül a szervernek ezen felül VPN-en vagy fordított proxyn át is elérhetőnek kell lennie.
- A hozzáférési kulcs **kizárólag a szinkronizálásra** jogosít az engedélyezett modulokra, a felületre vagy az adminisztrációra nem. A szerveren csak a hash tárolódik; az eszközön az Android kulcstárolójában van. Ha egy eszköz elvész, tiltsa le vagy törölje a szinkronfiókot — azonnal hatályba lép.
- A hibás kulcsok lassításra kerülnek (mint a hibás jelszavak a bejelentkezéskor).
- **Alkalmazászár:** az alkalmazás induláskor és kb. két perc háttérben töltött idő után ujjlenyomatot, arcot vagy az eszköz PIN-kódját/mintáját/jelszavát kéri. Ha az eszközön nincs képernyőzár, az alkalmazás nem indul el, és megmagyarázza az okot.
- Az alkalmazás Android-mentése ki van kapcsolva; a képernyőképek, a képernyőfelvétel és az előnézet az alkalmazásáttekintőben tiltottak. Aláírt kiadási (release) verzió kerül kiszállításra (nem „debuggable”, a WebView-hibakeresés ki van kapcsolva).
- A beállítási kódok egyszer használhatók és 15 percig érvényesek; a hibás kódok lassításra kerülnek.
- Az adatok az alkalmazás védett tárhelyén vannak az eszközön, de **nincsenek külön titkosítva**. Az eszközzár és az Android-eszköztitkosítás kötelező.

## Korlátok

- Csak JSON háttértárral; a mellékletek nem szinkronizálódnak.
- Az ütközések rekordonként, nem mezőnként oldhatók fel.
- A fő rendszeren véglegesen törölt rekordok nem jutnak el a telefonra.
- A felület nem ismer modulonkénti jogosultságokat: csak azt különbözteti meg, hogy „írhat valahol” vagy „csak olvasható”. A pontos modulonkénti ellenőrzés mentéskor történik.
- Az auditmegállapítások szinkronizálódnak, de az alkalmazásban még nincs saját nézetük.
- Az alkalmazás annak a verziónak a szerverlogikáját tartalmazza, amellyel készült. Szerverfrissítés után az alkalmazást is újra kell építeni (`npm run build:android` az `isms-builder-mobile` projektben).
