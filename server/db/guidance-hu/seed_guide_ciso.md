# Felhasználói útmutató: CISO / információbiztonsági vezető

A CISO (Chief Information Security Officer) viseli az ISMS átfogó felelősségét. Ez az útmutató a legfontosabb modulokat és a napi feladatokat mutatja be.

---

## Modulok áttekintése

| Modul | Feladat | Hely |
|---|---|---|
| **Kockázatkezelés** | Kockázatok rögzítése, értékelése és kezelése | Menü: Kockázatok |
| **SoA** | Intézkedések értékelése, alkalmazhatóság és állapot karbantartása | Menü: SoA |
| **Biztonsági célok** | KPI-k meghatározása, előrehaladás követése | Menü: Célok |
| **Incidens-postaláda** | A bejelentett biztonsági incidensek feldolgozása | Menü: Incidensek |
| **Ellátási lánc** | Szállítók figyelése, NIS2-kötelezettségek | Menü: Szállítók |
| **BCM / BCP** | Üzleti hatáselemzések, tervek, gyakorlatok | Menü: BCM |
| **Irányítás** | Vezetőségi átvizsgálások, intézkedéscsomagok | Menü: Irányítás |
| **Jelentések** | Megfelelőségi mátrix, hiányjelentés, CSV-export | Menü: Jelentések |
| **Beállítások (CISO)** | SLA, értesítési küszöb, eszkalációs e-mail | Menü: Beállítások |

---

## Napi feladatok

### Kockázatértékelés
1. **Kockázatok → Új kockázat** — adja meg a fenyegetést, a valószínűséget (1–5) és a hatást (1–5)
2. Pontszám = valószínűség × hatás (automatikusan számolódik)
3. **Kezelési terveket** a kockázati bejegyzésre kattintva, a „Kezelés” fülön adhat hozzá
4. A szerkesztőűrlapon a „🔗 Hivatkozások” segítségével kapcsolja össze SoA-intézkedésekkel

### SoA-intézkedések karbantartása
1. **SoA → keretrendszer fül** (ISO 27001, NIS2, BSI …)
2. Kattintson egy intézkedésre → állítsa be az állapotot (alkalmazandó / nem alkalmazandó / részben)
3. Adja meg az indoklást és az intézkedéseket
4. **Soron belüli szerkesztés:** kattintson duplán egy mezőre a gyors módosításhoz

### NIS2 bejelentési kötelezettség (72 órás határidő)
- A CISO-postaládában „bejelentendő” állapotú incidensek → készítse elő a BSI/hatósági bejelentést
- A bejelentési küszöböt a **Beállítások → CISO/ISB** alatt állíthatja be
- Az időzítő a rögzítéstől fut; az SLA lejárta után automatikusan eszkalációs e-mail indul

### Vezetőségi átvizsgálás előkészítése
1. **Irányítás → Vezetőségi átvizsgálás → Új átvizsgálás**
2. Adja meg a napirendet, a résztvevőket és a döntéseket
3. A teendőket közvetlenül kapcsolja az átvizsgáláshoz
4. Exportálja a **Jelentések → Megfelelőségi mátrix** riportot mellékletként (CSV)

---

## Jelentések és bizonyítékok

| Jelentés | Hozzáférés | Formátum |
|---|---|---|
| Megfelelőségi mátrix | Jelentések → Megfelelőségi mátrix | Táblázat + CSV |
| Hiányjelentés | Jelentések → Hiányjelentés | Táblázat + CSV |
| Keretrendszer-áttekintés | Jelentések → Keretrendszer | Táblázat |
| Kockázatexport | Kockázatok → CSV | CSV |

---

## Megjegyzések a függetlenségről
A CISO/ISB közvetlenül a felső vezetésnek számol be (ISO 27001 5.1 pont). A szerepkör nem ütközhet operatív informatikai felelősségekkel.
