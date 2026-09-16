# Modul: Jelentések és exportok

> A jelentések modul az ISMS állapotát értékelhető riportokban foglalja össze —
> belső felügyelethez, vezetőségi átvizsgáláshoz és külső auditornak egyaránt.

---

## Elérhető jelentések

| Jelentés | Tartalom |
|---|---|
| **Megfelelőség** | Az összes kontroll megvalósítási aránya keretrendszerenként |
| **Réselemzés** | Kapcsolódó szabályzat vagy eljárás nélküli kontrollek |
| **Keretrendszer** | Egyetlen keretrendszer részletes áttekintése |
| **Sablonok** | Az összes sablon állapot, típus és felülvizsgálati dátum szerint |
| **Audit** | Az összes felhasználói műveletet rögzítő auditnapló (admin) |
| **Felülvizsgálatok** | Lejárt felülvizsgálati határidejű sablonok áttekintése |
| **Mátrix** | Kontroll-sablon hozzárendelési mátrix |
| **Megállapítások** | Nyitott audit-megállapítások és intézkedések |
| **Kockázatok** | Kockázatáttekintés kezelési státusszal |

---

## Megfelelőségi jelentés

A legfontosabb jelentés a vezetőségi átvizsgáláshoz és az auditornak.
Minden aktivált keretrendszerhez megjeleníti:
- A kontrollek teljes száma
- `megvalósítva` / `részlegesen` / `nem_kezdtek_hozzá` darabszáma
- Megvalósítási arány százalékban
- Trend az előző hónaphoz képest

**Jelentések → Megfelelőség**

---

## Réselemzés

Megmutatja, mely kontrollek vannak `alkalmazandó`-ként jelölve, de nincs hozzájuk kapcsolva
szabályzat vagy eljárás — azaz hol van dokumentációs hiányosság.

**Jelentések → Réselemzés**

Különösen hasznos ISO 27001 tanúsítás előkészítési fázisában.

---

## Sablonjelentés

Az összes sablon áttekintése az alábbiakkal:
- Állapot (Tervezet/Felülvizsgálat/Jóváhagyott/Archivált)
- Felelős
- Következő felülvizsgálati dátum
- Kapcsolódó kontrollek

Exportálható **CSV** és **PDF** formátumban (nyomtatásra optimalizált).

---

## Kockázati jelentés

Az összes kockázat áttekintése az alábbiakkal:
- Kockázati szint (alacsony/közepes/magas/kritikus)
- Kezelési státusz
- Maradványkockázat
- Felelős és határidő

Exportálható **CSV** és **PDF** formátumban.

---

## Auditnapló

A rendszerben végrehajtott összes felhasználói művelet teljes naplója: ki mit és mikor változtatott.
Csak `admin` szerepkörből érhető el.

**Jelentések → Auditnapló** — szűrhető felhasználó, művelet és időszak szerint.

---

## Exportformátumok

Az összes jelentés elérhető az alábbi formátumokban:
- **CSV** — további feldolgozáshoz Excelben vagy BI-eszközökben
- **PDF** — nyomtatásra optimalizált, `window.print()` segítségével, közvetlenül a böngészőből

---

## Audit-megjegyzés

A vezetőségi átvizsgáláshoz (ISO 27001, 9.3. fejezet) az alábbi jelentések ajánlottak
standard alátámasztó dokumentumként:
1. Megfelelőségi jelentés (megvalósítási arány keretrendszerenként)
2. Réselemzés (nyitott dokumentációs hiányosságok)
3. Kockázati jelentés (aktuális kockázati helyzet)
4. Sablonjelentés `felülvizsgálat` állapotra szűrve (lejárt felülvizsgálatok)

Ez a négy jelentés együttesen teljes képet ad a vezetésnek az ISMS aktuális állapotáról.
