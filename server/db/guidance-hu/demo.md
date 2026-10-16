# Demó üzemmód – áttekintés és átállás éles üzemre

Üdvözöljük az **ISMS Builderben** — az Ön saját üzemeltetésű információbiztonság-irányítási rendszerében.

Ez a dokumentum bemutatja a demókörnyezetet, és végigvezeti az éles üzemre való átálláson.

---

## Demó hozzáférések

| Felhasználó | E-mail | Jelszó | Szerepkör | Terület | Hozzáférés |
|---|---|---|---|---|---|
| admin | admin@example.com | adminpass | Admin | Globális | Teljes hozzáférés — minden modul |
| alice | alice@it.example | alicepass | Osztályvezető | IT | Szabályzatok, kockázatok, útmutatók (olvasás+írás) |
| bob | bob@hr.example | bobpass | Olvasó | HR | Csak olvasás |

> **Biztonsági figyelmeztetés:** Ezek a jelszavak nyilvánosan ismertek. Élesítés előtt módosítsa az összes jelszót.

---

## Elérhető demóadatok

A rendszer valósághű mintaadatokat tartalmaz a következő modulokhoz:

| Modul | Demótartalom |
|---|---|
| **Szabályzatok** | Információbiztonsági szabályzat, jelszószabályzat, BYOD-szabályzat, mentési szabályzat, hozzáférés-szabályozási szabályzat |
| **SoA** | 313 intézkedés 8 keretrendszerben (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — mind szerkeszthető |
| **Kockázatkezelés** | Valósághű kockázatok több keretrendszerhez kapcsolva (zsarolóvírus, adathalászat, belső fenyegetés, ellátási lánc, …) |
| **GDPR és adatvédelem** | RoPA, adatfeldolgozói szerződések, TOM-ok, DPIA-bejegyzések, 72 órás időzítő demó |
| **Eszközök** | Vállalati eszközök (szerverek, munkaállomások, ERP, felhőszolgáltatások, hálózat) osztályozással |
| **Ellátási lánc** | Szállítók NIS2/EUCS-hivatkozásokkal |
| **BCM / BCP** | Üzleti hatáselemzések, folytonossági tervek, gyakorlatok |
| **Irányítás** | Vezetőségi átvizsgálások teendőkkel és jegyzőkönyvekkel |
| **Képzés** | Képzési intézkedések (ISO tudatosság, GDPR, adathalász-szimuláció) |
| **Jogi** | Szerződések, titoktartási megállapodások, adatvédelmi tájékoztatók |
| **Biztonsági célok** | KPI-célok folyamatjelzővel |
| **Incidens-postaláda** | Demóbejelentések a nyilvános incidensbejelentő űrlapról |
| **Útmutatók** | Rendszerkézikönyv, szerepköri útmutatók, szabályzati folyamatok, SoA-auditútmutató |

---

## Átállás éles üzemre

### Lépésről lépésre
1. Nyissa meg az **Admin konzolt** → **Karbantartás** fül
2. **Demó visszaállítás futtatása:**
   - Kattintson a „Demó visszaállítás” szakaszra
   - Írja be a `RESET` szót a megerősítő párbeszédpanelen
   - A rendszer az összes demóadatot JSON-letöltésként exportálja (mentés)
   - Minden modul adata törlődik, az `admin` kivételével minden felhasználó törlődik
   - Az admin jelszava `adminpass`-ra áll vissza, a 2FA kikapcsol
3. **Átirányítás a bejelentkezési oldalra** — egy sárga sáv jelzi a sikeres visszaállítást
4. **Jelentkezzen be az `admin@example.com` / `adminpass` adatokkal** — a sáv eltűnik, a rendszer készen áll az éles üzemre
5. **Azonnal módosítsa a jelszót:** Beállítások → Jelszó módosítása
6. **Állítsa be a 2FA-t:** Beállítások → 2FA bekapcsolása
7. **Hozza létre a felhasználóit:** Admin konzol → Felhasználók fül
8. **Hozza létre a tartalmait:** minden modul üres és használatra kész

### Mi marad meg a visszaállítás után?

| Megmarad | Törlődik |
|---|---|
| SoA-intézkedések (mind a 313) | Szabályzatok / sablonok |
| Legördülő listák | Kockázatok |
| Szervezeti beállítások | Eszközök, BCM, irányítás |
| (Admin felhasználó) | Szállítók, jogi, képzés |
| | GDPR-adatok, útmutatók |
| | Auditnapló, biztonsági célok |

---

## Demóadatok visszaállítása

A rendszer újbóli bemutatásához:

1. **Admin konzol → Karbantartás → „Demóadatok importálása”**
2. Válassza ki a demó visszaállításkor letöltött JSON-fájlt
3. Minden modul adata helyreáll
4. Alice (alice@it.example / alicepass) és Bob (bob@hr.example / bobpass) 2FA nélkül újra létrejön
5. Az admin fiók változatlan marad

---

## További információk

- **Architektúra és API-referencia:** Útmutatók → Adminisztrátori dokumentáció
- **Szerepköri útmutatók:** Útmutatók → Szerepkörök
- **Projektoldal:** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Licenc:** GNU Affero General Public License v3.0 (AGPL-3.0)
