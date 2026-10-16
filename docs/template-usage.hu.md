# Dokumentumsablonok: Használat az ISMS Builderben

> A dokumentumsablonok az ISMS Builder központi munkaszközei. Ez az útmutató bemutatja, hogyan
> lehet sablonokat létrehozni, szerkeszteni, az életciklus-jóváhagyási folyamaton átvezeti, és más modulokhoz kapcsolni.

---

## Mi az a dokumentumsablon?

A dokumentumsablon egy verziózott, státuszkezelt dokumentum – például egy szabályzat, eljárásrend
vagy kiadási dokumentum. Minden sablon egy meghatározott életciklust követ, és kapcsolható
kontrollokhoz (SoA), kockázatokhoz és más sablonokhoz.

Elérhető sablontípusok:

| Típus | Cél | Külön dokumentáció |
|---|---|---|
| **policy** | Kötelező érvényű szabályok (Mi érvényes?) | [template-type-policy.md](template-type-policy.md) |
| **procedure** | Munkaútmutatók (Hogyan kell elvégezni?) | [template-type-procedure.md](template-type-procedure.md) |
| **soa** | Kiegészítő dokumentumok az SoA-folyamathoz | [template-type-soa.md](template-type-soa.md) |
| **incident** | Eseménykezelési tervek és sablonok | [template-type-incident.md](template-type-incident.md) |
| **release** | Változás- és kiadási dokumentáció | [template-type-release.md](template-type-release.md) |

---

## Szerepkörök és jogosultságok

| Művelet | Minimálisan szükséges szerepkör |
|---|---|
| Sablonok megtekintése | `reader` |
| Sablon szerkesztése (tartalom, státusz) | `editor` |
| Sablonok létrehozása, áthelyezése, törlése | `contentowner` |
| Sablonok végleges törlése, visszaállítása | `admin` |

---

## Sablon létrehozása

**1. lépés – Típus kiválasztása**
Az oldalsávban a kívánt sablontípus alatt (pl. „Szabályzat") kattintson a **„+ Új"** gombra, vagy
használja az oldalsáv tetején lévő „Létrehozás" gombot, majd válassza ki a típust.

**2. lépés – Kötelező mezők kitöltése**
- **Cím** – egyedi megnevezés (pl. „Jelszószabályzat v1.0")
- **Felelős** – felelős személy vagy szerepkör
- **Érvényes-tól / Következő felülvizsgálat** – dátummezők az életciklus-kezeléshez
- **Kapcsolódó ISO kontrollok** – opcionális kapcsolat az SoA-kontrollokhoz

**3. lépés – Tartalom megadása**
A tartalomterület **Markdown** formátumot támogat. A fejlécek, listák, táblázatok és kódblokkok
megjelenítve jelennek meg. Strukturált szabályzatokhoz az alábbi vázlat ajánlott:

```
# Cím
## 1. Cél
## 2. Hatókör
## 3. Szabályok
## 4. Felelősségek
## 5. Szabálysértések és következményeik
## 6. Felülvizsgálat és frissítések
```

**4. lépés – Mentés**
A sablon `draft` (tervezet) státusszal kerül mentésre, és csak a `reader` vagy magasabb
szerepkörrel rendelkező, bejelentkezett felhasználók számára látható.

---

## Életciklus (státuszfolyamat)

Minden sablon négy státuszfázison megy át:

```
draft  →  review  →  approved  →  archived
```

| Státusz | Jelentés | Kinek látható |
|---|---|---|
| `draft` | Folyamatban, még nem publikált | `reader`-tól (belső) |
| `review` | Felülvizsgálat alatt, jóváhagyásra vár | `reader`-tól (belső) |
| `approved` | Hivatalosan érvényes, éles használatban | `reader`-tól |
| `archived` | Felváltva, csak referencia-céllal megőrzött | `reader`-tól |

**Státusz módosítása:** Használja a sablon részletező nézetében lévő státusz-legördülő menüt. Minden
státuszváltást időbélyeggel és felhasználónévvel naplózza a **státuztörténet**
(a sablonban a óra ikonon keresztül érhető el).

> **Audit megjegyzés:** A teljes státuztörténet az audit naplóban tárolódik, és az auditor
> megtekintheti. Az a sablon, amely `review` mellőzésével kerül `draft`-ból közvetlenül
> `approved` státuszba, megengedett, de tudatos szervezeti döntésnek kell lennie.

---

## Verziotörténet

A **verzió csak a jóváhagyáskor változik**, mentéskor nem. Tetszőleges számú alkalommal menthet anélkül, hogy a verziószám módosulna; a dokumentum akkor kapja meg a verzióját, amikor `review` állapotból `approved` állapotba kerül. Az első jóváhagyás megtartja a meglévő számot, minden további eggyel növeli.

**Jóváhagyás:** a „Jóváhagyás” gomb előbb rákérdez: **„Jóváhagyás {X}. verzióként?”**, opcionális **módosítási megjegyzéssel**. Csak az „Igen, jóváhagyom” hajtja végre a jóváhagyást.

**A jóváhagyott dokumentumok zároltak:** `approved` állapotban a cím és a tartalom nem módosítható (a felület csak olvasási nézetet és egy megjegyzést mutat, a szerver `409`-cel utasítja el a módosítást). A következő felülvizsgálati dátum szerkeszthető marad. A továbblépéshez a dokumentumot vissza kell állítani `review` állapotba (`contentowner` szerepkör), szerkeszteni, majd újra jóváhagyni — ekkor jön létre a következő verzió.

**Verziótörténet a dokumentum fejlécében:** a dokumentum felett (összecsukható, az **előzmény ikonon** keresztül is) látható a táblázat

| Verzió | Jóváhagyta | Jóváhagyás dátuma | Módosítások |
|---|---|---|---|

minden jóváhagyás felhasználónevével, időpontjával és módosítási megjegyzésével. Ugyanez a táblázat szerepel a nyomtatásban/PDF-ben és a Nextcloud-közzététel PDF-jében. Minden jóváhagyás a tartalom pillanatképét is eltárolja. A funkció előtt már jóváhagyott dokumentumoknál az állapottörténet utolsó jóváhagyása jelenik meg első sorként.

Ez lehetővé teszi azt a teljes nyomon követhetőséget, amelyet az ISO 27001 a dokumentumoknál megkövetel.

---

## Mellékletek

A sablonokhoz fájlok csatolhatók (PDF, DOCX – max. 25 MB):

**Melléklet hozzáadása:** Kattintson a **„Melléklet feltöltése"** gombra a sablon részletező nézetében.
Minimálisan szükséges szerepkör: `editor`.

**Melléklet letöltése:** Minden `reader` vagy magasabb szerepkörű felhasználó számára látható.

**Melléklet törlése:** Minimálisan szükséges szerepkör: `editor`.

---

## Kapcsolatok más modulokhoz

A sablonok más modulokhoz kapcsolhatók:

**→ SoA-kontrollok:** Jelölje ki azokat az ISO-kontrollokat, amelyeket ez a dokumentum lefed. A kontroll
ezt követően az SoA-ban megjelenik a sablonra mutató hivatkozással („megvalósítási bizonyíték").
Ez releváns a réselemzés és a megfelelőségi jelentés szempontjából.

**→ Kockázatok:** A kockázatkezelési modulon keresztül szabályzatok és eljárásrendek
kockázatcsökkentő intézkedésként rendelhetők egy kockázathoz.

**→ Szabályzat-visszaigazolás:** A jóváhagyott szabályzatok elküldhetők a munkatársaknak visszaigazolásra
(„Szabályzat-visszaigazolások" modul).

---

## Sablon áthelyezése

A sablon áthelyezhető egy másik típusba (pl. `procedure`-ból `policy`-ba) –
minimálisan szükséges szerepkör: `contentowner`. Minden hivatkozás és a verziótörténet megmarad.

---

## Sablonok törlése és visszaállítása

**Puha törlés** (minimálisan szükséges szerepkör: `contentowner`): A sablon töröltként jelölődik és
eltűnik a nézetből, de a rendszerben megmarad. A kontrollokhoz és kockázatokhoz fűződő hivatkozások megőrződnek.

**Visszaállítás** (minimálisan szükséges szerepkör: `admin`): A törölt sablonok visszaállíthatók az
adminisztrációs panelen a „Kuka" menüpontban.

**Végleges törlés** (minimálisan szükséges szerepkör: `admin`): Visszavonhatatlanul eltávolítja a sablont,
beleértve a verziótörténetet és a mellékleteket is. Nem vonható vissza.

---

## Felülvizsgálati határidők

A **„Következő felülvizsgálat"** mező aktívan figyelt:

- Azok a sablonok, amelyek felülvizsgálata ≤ 14 napon belül esedékes, megjelennek a **naptárban** (pirossal kiemelve)
- Az adminisztrátor **e-mail értesítést** kap (ha az SMTP konfigurált)
- Az esedékes felülvizsgálatok feladatként jelennek meg az **irányítópulton**

Ajánlás: a szabályzatokat évente, az eljárásrendeket félévente vizsgálja felül.
