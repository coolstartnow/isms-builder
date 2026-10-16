# Felhasználói útmutató: osztályvezető / szakterületi szakértő

Ez az útmutató az osztályvezetőknek (dept_head) és szakterületi szakértőknek szól, akik a saját területük szabályzatait, kockázatait és képzéseit gondozzák.

---

## Az Ön szerepe az ISMS-ben

| Feladat | Modul | Hozzáférés |
|---|---|---|
| A saját terület szabályzatainak gondozása | Szabályzatok | Olvasás + létrehozás/szerkesztés |
| Kockázatok bejelentése és értékelése | Kockázatkezelés | Olvasás + szerkesztés |
| Képzési intézkedések tervezése | Képzés | Olvasás + szerkesztés |
| A saját terület eszközeinek kezelése | Eszközkezelés | Olvasás + szerkesztés |
| SoA-intézkedések megjegyzése | SoA | Olvasás (+ soron belüli szerkesztés contentownerrel) |
| Incidensek bejelentése | Nyilvános űrlap / Incidensek | Beküldés + olvasás |

---

## Napi feladatok

### Szabályzat szerkesztése
1. Nyissa meg a menüben a **Szabályzatok** pontot
2. Válassza ki a szabályzatot a fából
3. Kattintson a **Szerkesztés** gombra → frissítse a tartalmat, állítsa be a „Következő felülvizsgálat” dátumát
4. Állítsa az állapotot **„felülvizsgálat”** értékre, hogy a CISO / tartalomfelelős jóváhagyhassa
5. A tartalomfelelős jóváhagyása után az állapot **„jóváhagyott”** lesz

### Kockázat bejelentése
1. **Kockázatok → Új kockázat**
2. Írja le a fenyegetést, becsülje meg a valószínűséget és a hatást (1–5)
3. Adjon meg egy javasolt kezelési intézkedést
4. Adja meg az osztályát „Felelősként”

### Képzés tervezése
1. **Képzés → Új intézkedés**
2. Adja meg a témát, a célcsoportot (osztály), a dátumot és a kötelező jelleget
3. Lezárás után: rögzítse az eredményeket és a résztvevők számát

### Biztonsági incidens bejelentése
- **Belülről (bejelentkezve):** Incidensek → Új incidens
- **Kívülről / névtelenül:** Bejelentkezési oldal → „Biztonsági incidens bejelentése” (bejelentkezés nélkül)
- Kötelező mezők: e-mail, incidens típusa, leírás

---

## Vezérlőpultok és áttekintések

A **Vezérlőpult** megjeleníti:
- A saját területének aktuális kockázatait (Top 5)
- A közelgő felülvizsgálatokat és határidőket (14 napos előnézet)
- A nyitott DSAR-okat és 72 órás bejelentéseket (GDPR-hozzáférés esetén)
- KPI-kártyákat az összes aktív modulhoz

A **Naptár** az összes határidőt mutatja:
- Szabályzat-felülvizsgálati dátumok
- Képzési időpontok
- Eszközök élettartam-végének dátumai
- Szerződések lejárati dátumai

---

## Amit nem tehet meg (és miért)

| Tiltott művelet | Ok |
|---|---|
| Szabályzatok jóváhagyása („Jóváhagyott” beállítása) | Csak tartalomfelelős / admin (négy szem elve) |
| Felhasználók létrehozása | Csak admin |
| Szabályzatok végleges törlése | Csak admin (van lomtár) |
| SoA-intézkedések jóváhagyása | Csak CISO / tartalomfelelős |
| Hozzáférés az Admin konzolhoz | Csak admin |

---

## Tippek

- **Névkeresés:** A felső sáv keresője globálisan megtalálja a szabályzatokat, kockázatokat és intézkedéseket
- **Hivatkozások:** Minden űrlapon a „🔗 Hivatkozások” alatt SoA-intézkedéseket és szabályzatokat kapcsolhat össze — hasznos a megfelelőségi bizonyításhoz
- **Útmutatók:** Ez a rész további útmutatókat tartalmaz az összes modulhoz
