# Felhasználói útmutató: DPO / adatvédelmi tisztviselő

Az adatvédelmi tisztviselő (DPO / GDPO) a GDPR és a kapcsolódó adatvédelmi előírások betartását felügyeli.

> **Függetlenség:** A DPO feladatai ellátása során utasításoktól mentes (GDPR 38. cikk (3) bekezdés), és feladatai ellátása miatt nem bocsátható el, illetve nem szankcionálható. Közvetlenül a legfelső vezetésnek számol be.

---

## Modulok áttekintése

| Modul | Feladat | Hely |
|---|---|---|
| **RoPA** | Adatkezelési tevékenységek nyilvántartása (30. cikk) | Adatvédelem → RoPA |
| **DPA** | Adatfeldolgozási megállapodások | Adatvédelem → DPA |
| **DPIA** | Adatvédelmi hatásvizsgálat (35. cikk) | Adatvédelem → DPIA |
| **TOM-ok** | Műszaki és szervezési intézkedések | Adatvédelem → TOM-ok |
| **DSAR** | Az érintettek hozzáférési kérelmei | Adatvédelem → DSAR |
| **72 órás időzítő** | Adatvédelmi incidens bejelentési határidejének követése | Adatvédelem → Incidensek |
| **Törlési napló** | A 17. cikk szerinti törlések nyilvántartása | Adatvédelem → Törlési napló |
| **Adatvédelmi tájékoztatók** | Az aktuális tájékoztatók kezelése | Jogi → Szabályzatok |
| **Beállítások (GDPO)** | DSAR-határidők, DPO-kapcsolat, hatóságok | Beállítások |

---

## Napi feladatok

### RoPA karbantartása
1. **Adatvédelem → RoPA → Új bejegyzés**
2. Kötelező mezők: név, cél, jogalap (6./9. cikk), adatkategóriák, érintettek, címzettek, megőrzési idők
3. Harmadik országba történő továbbítás: adja meg az országot + a garanciát (SCC, BCR)
4. CSV-export a szűrősávban lévő „CSV” gombbal

### DPIA lefolytatása (GDPR 35. cikk)
1. **Adatvédelem → DPIA → Új értékelés**
2. Küszöbérték-vizsgálat: a jogokat és szabadságokat érintő kockázat értékelése
3. Dokumentálja a tervezett intézkedéseket és a fennmaradó kockázatot
4. Állapot: vázlat → felülvizsgálat alatt → lezárt

### 72 órás incidensbejelentés kezelése
1. Rögzítse az incidenst az **Adatvédelem → Incidensek** alatt
2. A rendszer a rögzítéstől automatikusan elindítja a 72 órás visszaszámlálást
3. Lejáratkor: dokumentálja a hatóság felé tett bejelentést
4. A hatóság elérhetőségei a **Beállítások → DPO/GDPO** alatt találhatók

### DSAR (hozzáférési kérelmek) feldolgozása
1. **Adatvédelem → DSAR → Új kérelem**
2. A határidő automatikusan a GDPO-beállítások szerint számolódik (alapértelmezés: 30 nap, 90 napra hosszabbítható)
3. Állapot: Beérkezett → Folyamatban → Lezárt / Elutasított

---

## Bizonyítékok és dokumentáció

| Dokumentum | Hozzáférés | GDPR-cikk |
|---|---|---|
| RoPA (CSV) | RoPA → CSV-export | 30. cikk |
| DPIA-jelentés | DPIA → Részletek | 35. cikk |
| DPA-áttekintés | Adatvédelem → DPA | 28. cikk |
| TOM-bizonyítékok | Adatvédelem → TOM-ok | 32. cikk |
| Törlési napló | Adatvédelem → Törlési napló | 17. cikk |
