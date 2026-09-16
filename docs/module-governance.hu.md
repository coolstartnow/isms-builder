# Modul: Irányítás (ISMS-menedzsment)

> Az irányítás dokumentálja azokat a menedzsmentfolyamatokat, amelyek az ISMS működését fenntartják:
> felülvizsgálatokat, döntéseket és a vezetés által meghatározott intézkedéseket.
> ISO 27001 9.3. fejezet (Vezetőségi átvizsgálás).

---

## Három részterület

| Terület | Célja |
|---|---|
| **Vezetőségi átvizsgálások** | Az ISMS leadership általi átvizsgálásainak rögzítése |
| **Intézkedések** | Az átvizsgálásokból eredő intézkedések és döntések |
| **Értekezletek** | Az ISMS irányítóbizottság ülésének jegyzőkönyvei |

---

## Vezetőségi átvizsgálások

Az ISO 27001 9.3. fejezete előírja, hogy a felső vezetés **tervezett időközönként** vizsgálja felül az ISMS-t. A felülvizsgálatnak meghatározott bemeneteket kell figyelembe vennie (audit-eredmények, incidensek, célteljesítés), és dokumentált kimenetekhez (fejlesztési döntések) kell vezetnie.

**Irányítás → Átvizsgálások → „+ Új átvizsgálás"**

Mezők:
- **Dátum és résztvevők**
- **Bemenetek** – audit-eredmények, KPI-állapot, az utolsó átvizsgálás óta bekövetkezett incidensek, kockázati helyzet, erőforrásigények, fejlesztési javaslatok
- **Kimenetek** – döntések, felelős személyek, határidők
- **Következő átvizsgálás dátuma**

---

## Intézkedések

Az átvizsgálásokból vagy egyéb forrásokból (auditok, incidensek) eredő intézkedések itt kerülnek nyilvántartásba.

**Irányítás → Intézkedések → „+ Új intézkedés"**

Mezők:
- **Cím és leírás**
- **Forrás** – melyik átvizsgálás/audit/incidens indukálta ezt az intézkedést?
- **Felelős és határidő**
- **Prioritás** – `alacsony` / `közepes` / `magas`
- **Állapot** – `nyitott` / `folyamatban` / `teljesített` / `lemondva`

---

## Értekezletek

Rendszeres ISMS-irányítási értekezletek (pl. havi biztonsági bizottság) jegyzőkönyvei.

**Irányítás → Értekezletek → „+ Új értekezlet"**

Mezők: dátum, résztvevők, napirend, döntések, következő értekezlet időpontja.

---

## Irányítópult

Az irányítási áttekintő a következőket mutatja:
- Nyitott intézkedések prioritás és határidő szerint
- Az utolsó és a következő tervezett vezetőségi átvizsgálás
- Lejárt intézkedések (pirossal kiemelve)

---

## Audit-megjegyzés

Az ISO 27001 9.3. fejezete az egyik leggyakrabban hivatkozott eltérés az első auditokban – sok szervezetnek nincs dokumentált vezetőségi átvizsgálása.

Az auditor a következőket ellenőrzi:
1. Megtörtént-e a vezetőségi átvizsgálás? (legalább évente egyszer)
2. Figyelembe vették-e az előírt bemeneteket?
3. Az intézkedések dokumentáltak és nyomon követhetők-e?

Ajánlás: legalább egy formális vezetőségi átvizsgálás évente, ideális esetben félévente.
