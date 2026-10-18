# Modul: Mobilalkalmazás (Android) és szinkronizálás

> Az Android-alkalmazás az ISMS Builder önálló, offline is használható változata. Saját adatállományt tart a telefonon,
> és igény szerint egyezteti a fő rendszerrel — Wi-Fi-n vagy fájlon keresztül.

---

## Mit tud az alkalmazás

- **Offline munka:** az alkalmazás tartalmazza a felületet és a szerver logikáját (kockázatértékelés, eszköztípusok, verziókezelés, állapotváltások). Szerverre nincs szükség.
- **Modulok:** dokumentumok/sablonok, SoA (alkalmazhatósági nyilatkozat), kockázatok, eszközök, auditmegállapítások és útmutatók. Az összes többi modul (pl. GDPR, BCM, szállítók, adminisztráció) nincs az alkalmazásban.
- **Helyi felhasználó:** az eszközön a saját adatok adminisztrátoraként dolgozik. A fő rendszer jogosultságai csak a szinkronizáláskor érvényesek.
- **Telefon és tablet:** a felület alkalmazkodik (álló és fekvő tájolás; fekvő tájolásnál az oldalsáv látható marad). A jelszó, a 2FA és a szerepkörök beállításai helyben nem léteznek; a nyelvet a szinkronpanelen, az *Felület nyelve* alatt lehet kiválasztani.
- **Nem elérhető:** fájlfeltöltés/mellékletek, WebDAV-közzététel, MI-funkciók, PDF-letöltés a szerverről.

## Követelmények a fő rendszeren

- ISMS Builder **1.75-ös vagy újabb verzió** (1-es szinkronprotokoll, a `GET /api/version` válaszában `syncProtocol` néven).
- `STORAGE_BACKEND=json` (alapértelmezett). sqlite, mariadb vagy postgres esetén a szinkron végpontok `501`-gyel válaszolnak.
- **HTTPS:** a szervernek `https://` címen kell elérhetőnek lennie (beállítás: `scripts/setup-ssl.sh`, *SSL/TLS beállítása* szakasz). Az alkalmazásban megadott címnek szerepelnie kell a tanúsítványban.
- **Verziók:** az alkalmazásnak **saját verziószáma** van, és független a fő rendszertől. Kompatibilisek, ha a szinkronprotokoll egyezik (jelenleg 1), és a szerver legalább 1.75-ös verziójú. Az alkalmazás a *Szerver ellenőrzése* és az *Infó és követelmények* alatt mutatja a verziót és a kompatibilitást.
- Egy felhasználói fiók. A szerepkör határozza meg, mit vihet át az alkalmazás:

| Modul | Olvasás | Írás (push) |
|---|---|---|
| Dokumentumok/sablonok, SoA, eszközök | `reader` szinttől | `editor` szinttől |
| Kockázatok, auditmegállapítások | `reader` szinttől | `auditor` / `contentowner` szinttől |
| Útmutatók | `reader` szinttől (a dokumentum `minRole` értéke szerint) | csak olvasható |

## Tanúsítvány a telefonon

Nyilvánosan megbízható tanúsítványnál (pl. Let's Encrypt) nincs teendő. **Saját vagy önaláírt tanúsítványnál** a telefonnak meg kell bíznia benne:

1. A `scripts/setup-ssl.sh` futtatásakor a *További nevek/IP-címek* alatt adja meg az alkalmazásban használt nevet vagy IP-címet (pl. `192.168.1.20`). Ha a cím nincs a tanúsítványban, az alkalmazás elutasítja a kapcsolatot.
2. Másolja a `ssl/cert.pem` fájlt a telefonra (USB, Nextcloud, e-mail).
3. A telefonon: *Beállítások → Biztonság → Titkosítás és hitelesítő adatok → Tanúsítvány telepítése → CA-tanúsítvány* (az útvonal gyártónként eltér). Az Android figyelmeztet a harmadik féltől származó tanúsítványokra; itt ez a saját tanúsítványa.
4. Az alkalmazásban válassza a *Szerver ellenőrzése* lehetőséget: ha megjelenik a szerververzió, a telefon megbízik a tanúsítványban.

Hibaüzenetek: *A szerver nem érhető el* → ellenőrizze a címet, a portot, a Wi-Fi/VPN-t és a szerver tűzfalát. *A tanúsítvány … nem megbízható* → 1–3. lépés.

## Szinkronizálás Wi-Fi-n

1. Koppintson az alkalmazás jobb alsó sarkában lévő szinkron gombra.
2. Adja meg a szerver címét (pl. `https://isms.example.org:3000`), a felhasználót és a jelszót (bekapcsolt 2FA esetén az alkalmazás mezőt jelenít meg a kódhoz). **A jelszó nem kerül mentésre.**
3. **Szinkronizálás most.** Az alkalmazás először elküldi a helyi módosításokat (push), majd letölti, ami új a szerveren (pull). Az első szinkronizálás a teljes alapadatállományt letölti.

Szabályok:

- **Csak a módosítások:** csak az utolsó szinkronizálás óta változott adatok kerülnek átvitelre.
- **Szerveridő:** a szerver fogadáskor adja meg az `updatedAt` értéket. A telefon rosszul járó órája nem zavarja a szinkronizálást.
- **Ütközések:** ha egy rekordot a szerveren módosítottak azután, hogy a telefon letöltötte, **nem íródik felül**. Az alkalmazásban az *Ütközések feloldása* alatt jelenik meg az eltérő mezőkkel. Rekordonként választható: *Saját változat megtartása* (a következő szinkronizáláskor kerül elküldésre) vagy *Szerverváltozat átvétele*.
- **Törlés:** a telefonon végzett törlés a fő rendszer kukájába kerül. A telefonon végrehajtott *Végleges törlés* ott szintén törölt rekordként jelenik meg; nem távolítja el a rekordot a fő rendszerből.
- **Elutasítva:** ha egy modulhoz hiányzik a szerepkör, az alkalmazás *elutasítva* jelzéssel közli; a helyi módosítások nem vesznek el.

## Szinkronizálás fájlon keresztül

A fő rendszerhez hálózati kapcsolattal nem rendelkező eszközökhöz:

- **Minden exportálása** — az alkalmazás adatainak teljes mentése (alkalmazásból alkalmazásba, vagy archívum).
- **Csak a módosítások exportálása** — a helyben módosított rekordokat tartalmazó fájl. Beolvasás a fő rendszeren:

  ```bash
  node scripts/sync-import.js http://localhost:3000 admin isms-mobile-changes-2026-10-18.json
  ```

  A jelszó az `ISMS_SYNC_PASSWORD` környezeti változóból vagy kérdésre érkezik. Ugyanaz az ütközési szabály érvényes, mint a Wi-Fi-szinkronnál; a `3`-as kilépési kód ütközést vagy elutasított rekordokat jelent.
- **Fájl importálása** — alkalmazáscsomagot vagy a fő rendszer exportját (*Admin → Export*) fogadja. Az alkalmazás előbb **előnézetet** mutat (új / frissített / változatlan / ütközés). A helyben módosított rekordokat soha nem írja felül csendben. A fő rendszer exportja csak az általa szolgáltatott modulokat tartalmazza (pl. sablonok, SoA, kockázatok, útmutatók); az eszközök és megállapítások a Wi-Fi-szinkronnal érkeznek.

## API

| Metódus | Útvonal | Cél |
|---|---|---|
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Módosítások `since` óta, a törölt rekordokkal együtt. A válasz tartalmazza a következő pullhoz szükséges `serverTime` értéket. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <modul>: [rekordok baseUpdatedAt értékkel] } }` — válasz: `accepted`, `conflicts`, `rejected`. |

Modulok: `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Leírása: `docs/architecture/openapi.yaml`.

## Biztonság

- Az átvitel **kizárólag titkosítva (HTTPS)** történik. Az alkalmazás elutasítja a titkosítatlan `http://` címet. A saját Wi-Fi-n kívül a szervernek ezen felül VPN-en vagy fordított proxyn át is elérhetőnek kell lennie.
- Az adatok az alkalmazás védett tárhelyén vannak az eszközön, de **nincsenek külön titkosítva**. Az eszközzár és az Android-eszköztitkosítás kötelező.
- A munkamenet csak a szinkronizálásra érvényes, és nem kerül mentésre.

## Korlátok

- Csak JSON háttértárral; a mellékletek nem szinkronizálódnak.
- Az ütközések rekordonként, nem mezőnként oldhatók fel.
- A fő rendszeren véglegesen törölt rekordok nem jutnak el a telefonra.
- Az alkalmazás annak a verziónak a szerverlogikáját tartalmazza, amellyel készült. Szerverfrissítés után az alkalmazást is újra kell építeni (`npm run build:www` a `isms-builder-mobile` projektben).
