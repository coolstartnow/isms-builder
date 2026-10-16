# SoA és audit – útmutató

Ez a dokumentum bemutatja az alkalmazhatósági nyilatkozat (SoA) modul használatát, és azt, hogyan készülhet fel az ISMS Builder segítségével belső és külső auditokra.

---

## Mi a SoA?

Az alkalmazhatósági nyilatkozat (Statement of Applicability, SoA) az ISO 27001 6.1.3 pontja szerinti kötelező dokumentum. Felsorolja az összes releváns intézkedést, és dokumentálja:
- **Miért** alkalmazandó egy intézkedés (vagy miért van kizárva)
- **Milyen intézkedések** valósultak meg
- A **jelenlegi megvalósítási állapotot**

---

## Keretrendszerek áttekintése

| Keretrendszer | Kód | Intézkedések | Megjegyzés |
|---|---|---|---|
| ISO 27001:2022 | ISO | 93 | ISO szerzői jog — a szöveget saját licenc alapján kell megadni |
| BSI IT-Grundschutz | BSI | 88 | Szabadon elérhető (bsi.bund.de) |
| NIS2 irányelv | NIS2 | 10 | EU-szabályozás, nyilvános |
| EUCS (EU felhő) | EUCS | 44 | ENISA-szabvány |
| EU MI-rendelet | EUAI | 20 | EU-szabályozás, nyilvános |
| ISO 9001:2015 | ISO9001 | 36 | ISO szerzői jog |
| ISO 9000:2015 | ISO9000 | 10 | ISO szerzői jog |
| Kiberrezilienciai rendelet | CRA | 12 | EU-szabályozás, nyilvános |

> **Megjegyzés:** Az ISO-intézkedések nem részei a csomagnak. A saját intézkedések importálásához használja a `scripts/import-iso-controls.sh` szkriptet.

---

## Intézkedés szerkesztése

1. **SoA → keretrendszer fül** (pl. ISO 27001)
2. Kattintson egy intézkedésre → a részletek panel jobb oldalon megnyílik
3. Töltse ki:
   - **Alkalmazhatóság:** alkalmazandó / nem alkalmazandó / részben
   - **Állapot:** tervezett / folyamatban / megvalósítva / nem alkalmazandó
   - **Indoklás:** Miért szerepel vagy miért van kizárva?
   - **Intézkedések:** Mi valósult meg konkrétan?
4. **Soron belüli szerkesztés:** kattintson duplán egy mezőre a gyors módosításhoz a táblázatban
5. **Nyomon követhetőség:** „🔗 Hivatkozások” → az intézkedések összekapcsolása szabályzatokkal és kockázatokkal

---

## Szűrők és keresés

| Szűrő | Leírás |
|---|---|
| Állapot: nem alkalmazandó | Az összes kizárt intézkedés — ellenőrizze az indoklásokat |
| Állapot: tervezett | Tervezett, de még nem megvalósított — ellenőrizze a prioritást |
| Állapot: részben | Részben megvalósított — fejezze be az intézkedési tervet |
| Keresés | Teljes szöveges keresés az intézkedés azonosítójában, címében és indoklásában |

---

## Keresztleképezés

A keresztleképezés a keretrendszerek közötti tematikus átfedéseket mutatja:
- **SoA → Keresztleképezés** fül
- 20 témacsoport (pl. „Hozzáférés-szabályozás”, „Titkosítás”)
- Megmutatja, hogy a különböző keretrendszerek mely intézkedései fednek le azonos témát
- Segít elkerülni a duplikációt, ha egyszerre ISO 27001, NIS2 és BSI megfelelés a cél

---

## Auditfelkészülés

### Belső felkészülés
1. **Jelentések → Megfelelőségi mátrix**
   - Oszlopok: SoA-intézkedések (keretrendszerenként)
   - Sorok: jogi személyek / leányvállalatok
   - Jelzőfény: zöld = megvalósítva, sárga = részben, piros = nem alkalmazandó / tervezett
2. **Jelentések → Hiányjelentés** — minden intézkedés megvalósítási bejegyzés nélkül
3. **Jelentések → Keretrendszer-áttekintés** — százalékos teljesítés keretrendszerenként
4. CSV-export a munkapapírokhoz

### Külső tanúsító auditok (ISO 27001)

**1. szakasz (dokumentumfelülvizsgálat):**
- A SoA exportálása (JSON → saját formázás)
- Minden „nem alkalmazandó” indoklásnak érthetőnek és követhetőnek kell lennie
- Szabályzatok: mindegyiknek „jóváhagyott” állapotban kell lennie (vázlat nem fogadható el bizonyítékként)
- VVT/RoPA: ellenőrizze, hogy naprakész-e

**2. szakasz (helyszíni audit):**
- Kockázatkezelés: minden kockázat értékelve, a kezelések dokumentálva
- Képzési nyilvántartások: teljesítési arányok, tanúsítványok
- BCM-gyakorlati jelentések: az utolsó gyakorlat < 12 hónapos
- Auditnapló: az összes módosítás teljes nyomon követhetősége (Admin → Auditnapló)
- Vezetőségi átvizsgálás jegyzőkönyvei (Irányítás → Átvizsgálások)

---

## RACI a SoA karbantartásához

| Tevékenység | CISO | DPO | QMO | Audit | Osztály |
|---|---|---|---|---|---|
| Intézkedések értékelése | **R** | C | C | I | C |
| Indoklások megírása | **R** | A (GDPR) | A (ISO 9001) | I | — |
| Intézkedések dokumentálása | A | — | — | — | **R** |
| SoA jóváhagyása | **A** | — | — | I | — |
| Auditfelkészülés | **R** | C | C | **R** | C |

> R = Végrehajtó, A = Felelős, C = Konzultált, I = Tájékoztatott

---

## Gyakori SoA-hibák

| Hiba | Hatás | Megoldás |
|---|---|---|
| „Nem alkalmazandó” intézkedés indoklás nélkül | Auditmegállapítás | Adjon meg indoklást |
| „Tervezett” állapot > 12 hónapja | Nemmegfelelőség | Készítsen intézkedési tervet, jelöljön ki felelőst |
| Nincs kapcsolat intézkedés → szabályzat között | Bizonyítékhiány | Használja az intézkedésen a „🔗 Hivatkozások” funkciót |
| A SoA nem felel meg az aktuális hatályának | Tanúsítási kockázat | Frissítse a hatályt a szervezeti beállításokban |
