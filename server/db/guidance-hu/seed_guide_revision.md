# Felhasználói útmutató: belső audit

A belső audit függetlenül vizsgálja az ISMS és a belső kontrollrendszerek hatékonyságát.

> **Függetlenség:** A belső audit funkcionálisan és szervezetileg független (IIA 1100. standard, IDW PS 321). Közvetlenül az igazgatóságnak / felső vezetésnek vagy az auditbizottságnak számol be, és mentes az operatív vezetés utasításaitól.

---

## Modulok áttekintése

| Modul | Auditálás tárgya | Hely |
|---|---|---|
| **SoA** | Az összes intézkedés megvalósítási állapota | Menü: SoA |
| **Jelentések** | Megfelelőségi mátrix, hiányjelentés, felülvizsgálati ciklusok | Menü: Jelentések |
| **Auditnapló** | Az összes rendszerművelet nyomon követhetősége | Admin konzol → Auditnapló |
| **Kockázatkezelés** | A kockázati nyilvántartás teljessége, a kezelés állapota | Menü: Kockázatok |
| **Irányítás** | Vezetőségi átvizsgálás jegyzőkönyvei, teendők állapota | Menü: Irányítás |
| **Képzés** | Képzési nyilvántartások, lefedettségi arány | Menü: Képzés |
| **BCM** | Gyakorlati jelentések, a BIA aktualitása | Menü: BCM |

---

## Auditeljárások

### A megfelelőségi állapot értékelése
1. **Jelentések → Megfelelőségi mátrix:** jelzőfényes nézet intézkedés × szervezeti egység
2. Piros cellák = hiányzó megvalósítás → érdeklődjön a modul felelősénél
3. **Jelentések → Hiányjelentés:** minden „nem alkalmazandó” állapotú vagy intézkedés nélküli kontroll
4. CSV-export munkapapírként

### SoA-intézkedések felülvizsgálata
1. **SoA → keretrendszer kiválasztása** (ISO 27001, NIS2, BSI …)
2. Szűrés „nem alkalmazandó” állapotra → az indoklások hihetőségének ellenőrzése
3. Mintavétel: „alkalmazandó”, de „tervezett/részben” állapotú intézkedések → kérjen bizonyítékot a megvalósításról

### Az auditnapló értékelése (admin hozzáférés szükséges)
1. **Admin konzol → Auditnapló**
2. Szűrés időszak, felhasználó vagy művelet szerint
3. Kritikus műveletek: permanent_delete, demo_reset, beállításmódosítások

### Kockázatértékelések nyomon követése
1. **Kockázatok → Lista:** ellenőrizze a pontszámot, az utolsó szerkesztés dátumát és a kezelés állapotát
2. Azonosítsa a kezeletlen magas kockázatokat (pontszám ≥ 15)
3. Kövesse nyomon a kapcsolt intézkedéseket a részletek panelen

---

## Auditjelentések és munkapapírok

| Bizonyíték | Hozzáférés | Megjegyzés |
|---|---|---|
| Megfelelőségi mátrix | Jelentések → Megfelelőségi mátrix + CSV | Rögzítse a vonatkozási dátumot |
| Hiányjelentés | Jelentések → Hiányjelentés + CSV | Dokumentálja az előző évhez képesti eltérést |
| Kockázatexport | Kockázatok → CSV | Teljességi ellenőrzés |
| Auditnapló-export | Admin → Auditnapló → CSV | Vegye figyelembe a manipuláció elleni védelmet |
| Képzési nyilvántartások | Képzés → Lista | Lefedettségi arány osztályonként |
