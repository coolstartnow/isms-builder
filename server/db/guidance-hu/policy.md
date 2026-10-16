# Szabályzati folyamatok – létrehozás, felülvizsgálat és jóváhagyás

Ez az útmutató a szabályzati dokumentumok teljes életciklusát írja le az ISMS Builderben — a létrehozástól a felülvizsgálati folyamaton át az archiválásig.

---

## Dokumentumtípusok

| Típus | Leírás | Példák |
|---|---|---|
| **Szabályzat** | Kötelező előírás | Információbiztonsági szabályzat, jelszószabályzat |
| **Eljárás** | Folyamatleírás | Incidenskezelési eljárás, változáskezelés |
| **Irányelv** | Ajánlás | Biztonságos kódolási irányelvek |
| **Szabvány** | Műszaki szabvány | Titkosítási szabvány, rendszerkeményítési alap |
| **SoA** | Alkalmazhatósági nyilatkozat | ISO 27001 SoA dokumentum |
| **Kockázat** | Kockázatelfogadási dokumentum | Kockázatelfogadási szabályzat |
| **Sablon** | Üres űrlap | Adatvédelmi hatásvizsgálati sablon |

---

## Életciklus-állapotok

```
vázlat  →  felülvizsgálat  →  jóváhagyott  →  archivált
                ↑_____________|   (újbóli felülvizsgálat)
```

| Állapot | Jelentés | Ki állíthatja be |
|---|---|---|
| **vázlat** | Készülő, nem kiadott | editor+ |
| **felülvizsgálat** | Felülvizsgálatra beküldve | editor+ |
| **jóváhagyott** | Kiadott, kötelező érvényű | contentowner / admin |
| **archivált** | Már nem érvényes, csak archívum | contentowner / admin |

---

## Új szabályzat létrehozása

1. Nyissa meg a menüben a **Szabályzatok** pontot
2. Kattintson az **+ Új oldal** gombra (jobb felül)
3. Töltse ki a kötelező mezőket:
   - **Típus** (szabályzat / eljárás / …)
   - **Cím** (egyedi és beszédes)
   - **Nyelv** (de / en / …)
   - Az **állapot** automatikusan **vázlat**
4. Írja be a **tartalmat** a szerkesztőben (Markdown vagy formázott szöveg)
5. Adja meg a **következő felülvizsgálat dátumát** (jóváhagyott szabályzatoknál kötelező)
6. Vegyen fel **hivatkozásokat** a „🔗 Hivatkozások” alatt:
   - SoA-intézkedések összekapcsolása (mely intézkedéseket fedi le a szabályzat?)
   - Az érintett szervezeti egységek megadása
7. **Mentés** (Ctrl+S vagy a Mentés gomb)

---

## Felülvizsgálati folyamat

### Beküldés felülvizsgálatra
1. Nyissa meg a szabályzatot → **Szerkesztés**
2. Állítsa az állapotot **„felülvizsgálat”** értékre
3. Mentés → a szabályzat megjelenik a Vezérlőpulton a „Teendők” alatt
4. A felülvizsgáló (contentowner) – ha be van állítva – e-mailes értesítést kap

### Felülvizsgálat CISO-ként / tartalomfelelősként
1. **Vezérlőpult → Teendők → Felülvizsgálat alatt álló szabályzatok**
2. Nyissa meg a szabályzatot → ellenőrizze a tartalmat
3. Jóváhagyáshoz: állítsa az állapotot **„jóváhagyott”** értékre + frissítse a felülvizsgálati dátumot
4. Elutasításhoz: állítsa vissza az állapotot **„vázlat”** értékre + fűzzön megjegyzést a leíráshoz

---

## Verziókezelés

Minden, állapotváltozással járó mentés automatikusan új verziót hoz létre:

| Művelet | Verziónövelés |
|---|---|
| Tartalom szerkesztése (azonos állapot) | Kis (pl. 1.0 → 1.1) |
| Állapotváltás (pl. vázlat → felülvizsgálat) | Kis |
| Új jóváhagyás (→ jóváhagyott) | Nagy (pl. 1.x → 2.0) |

A verziótörténet a részletek panelen a **„Előzmények”** alatt látható.

---

## Oldalhierarchia (térstruktúra)

Az ISMS Builder Confluence-stílusú oldalhierarchiát támogat:

- **Szülőoldal beállítása**: nyissa meg a szabályzatot → **„Áthelyezés”** → válassza ki a szülőcsomópontot
- **Gyermekoldal létrehozása**: nyissa meg a szabályzatot → **„+ Aloldal”**
- **Átrendezés** húzással vagy a faszerkezetben lévő ↑↓ gombokkal
- A **morzsamenü** az aktuális oldalhoz vezető utat mutatja

Ajánlott struktúra:
```
├── Információbiztonsági szabályzat (Szabályzat)
│   ├── Jelszószabályzat (Szabályzat)
│   ├── Tiszta asztal szabályzat (Szabályzat)
│   └── BYOD-szabályzat (Szabályzat)
├── Incidenskezelési eljárás (Eljárás)
│   └── Eszkalációs terv (Eljárás)
└── Adatvédelmi szabályzat (Szabályzat)
    └── Adatvédelmi tájékoztató (SoA)
```

---

## Mellékletek

A szabályzatokhoz mellékletek csatolhatók (PDF, DOCX, legfeljebb 20 MB):
1. Nyissa meg a szabályzatot → **„Mellékletek”** fül
2. Töltse fel a fájlt húzással vagy a fájlválasztóval
3. A mellékletek a mellékletsávban jelennek meg, és letölthetők

---

## Felülvizsgálati ciklusok

A rendszer automatikusan kezeli a felülvizsgálati ütemezést:

- **nextReviewDate**: jóváhagyáskor kötelező — mikor kell a szabályzatot legközelebb felülvizsgálni?
- **Színkódolás** a szerkesztő fejlécében:
  - 🟢 Zöld: felülvizsgálat > 30 nap múlva
  - 🟡 Sárga: felülvizsgálat ≤ 30 nap múlva
  - 🔴 Piros: a felülvizsgálat lejárt
- **Vezérlőpult**: az összes lejárt és közelgő felülvizsgálat a „Teendők” alatt
- **Naptár**: a felülvizsgálati dátumok naptárbejegyzésként láthatók
- **Jelentések → Felülvizsgálati ciklusok**: az összes szabályzat teljes áttekintése határidőkkel

---

## RACI a szabályzatkezeléshez

| Tevékenység | CISO | Osztály | Tartalomfelelős | Audit |
|---|---|---|---|---|
| Szabályzat létrehozása | R | R | — | — |
| Tartalom megfogalmazása | A | **R** | — | I |
| Beküldés felülvizsgálatra | R | **R** | — | — |
| Tartalom felülvizsgálata | A | C | **R** | I |
| Jóváhagyás megadása | I | — | **R** | I |
| SoA-intézkedések összekapcsolása | **R** | C | — | I |
| Archiválás | **R** | — | R | I |

---

## Gyakori hibák a szabályzatkezelésben

| Hiba | Hatás | Megoldás |
|---|---|---|
| Szabályzat jóváhagyása felülvizsgálati dátum nélkül | Nincs határidő-követés | Jóváhagyás előtt adja meg a nextReviewDate értéket |
| „Vázlat” állapot > 6 hónapja | Elavult vázlatdokumentum | Indítson felülvizsgálatot vagy archiválja |
| Nincsenek SoA-intézkedés-hivatkozások | Megfelelőségi bizonyítékhiány | Kapcsolja össze a releváns intézkedéseket |
| Több, egymást átfedő szabályzat | Redundancia, ellentmondások | Használja az oldalhierarchiát (aloldalak) |
