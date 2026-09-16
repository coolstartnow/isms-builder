# Modul: Biztonsági célok

> A biztonsági célok mérhetővé teszik az ISMS-t — az ISO 27001 szabvány 6.2 fejezete
> kifejezetten előírja a mérhető kritériumokkal rendelkező célok meghatározását és a haladás nyomon követését.

---

## Mik azok a biztonsági célok?

A biztonsági célok az ISMS-stratégiát konkrét, mérhető célkitűzésekké alakítják.
Megválaszolják a kérdést: **Mit szeretnénk elérni és mikor?**

Példák:
- „Minden munkatárs elvégez egy adathalászat-tudatossági képzést a 3. negyedév végéig"
- „Kritikus sérülékenységek javítási ideje ≤ 72 óra"
- „ISO 27001 tanúsítvány megszerzése a pénzügyi év végéig"

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Célok megtekintése | `reader` |
| Célok létrehozása és szerkesztése | `editor` |
| Célok törlése / visszaállítása | `admin` |

---

## Cél létrehozása

**Biztonsági célok → „+ Új cél"**

Mezők:
- **Cím** — tömör megnevezés
- **Leírás** — mit kell elérni?
- **Felelős** — felelős személy vagy szerepkör
- **Kategória** — pl. Technikai, Szervezeti, Megfelelőség
- **Határidő** — mikor?
- **KPI** — mérhető célérték (pl. „100%-os képzési teljesítési arány")
- **Aktuális érték** — jelenlegi haladás (pl. „72%")
- **Státusz** — `not_started` / `in_progress` / `completed` / `cancelled`

---

## Haladás nyomon követése

A **KPI folyamatjelző** automatikusan számítódik:
`aktuális érték / célérték × 100`. Az irányítópulton és a célok áttekintőjén egyaránt látható.

A haladás frissítése: cél megnyitása → **„Szerkesztés"** → aktuális érték módosítása.

---

## Irányítópult-integráció

Az irányítópult megjeleníti:
- Nyitott célokat a határidővel
- Azokat a célokat, amelyek határideje ≤ 14 nap (sárgával kiemelve)
- A jelenlegi negyedévben teljesített célokat

---

## Kapcsolódás SoA-kontrollokhoz

A célok kapcsolhatók ISO-kontrollokhoz a SoA-ban — így átláthatóvá válik, hogy melyik intézkedés melyik stratégiai célt támogatja. A kapcsolat a cél-űrlap **„Kapcsolódó kontrollok"** mezőjén keresztül adható meg.

---

## Audit-megjegyzés

Az ISO 27001 szabvány 6.2 fejezete bizonyítékot követel meg arra vonatkozóan, hogy a célok:
- dokumentáltak
- mérhető kritériumokkal rendelkeznek
- felelős személyhez vannak rendelve határidővel
- rendszeresen felülvizsgálják

A Biztonsági célok modul mindnégy követelményt lefedi. Az audithoz javasolt az összes cél negyedéves felülvizsgálata státuszfrissítéssel.
