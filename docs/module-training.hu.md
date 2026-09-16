# Modul: Képzés és információbiztonsági tudatosság

> A munkatársak az ISMS legfontosabb – és gyakran legsérülékenyebb – tényezői.
> Az ISO 27001 7.2 és 7.3, valamint az A.6.3 fejezete igazolható kompetenciát
> és biztonsági tudatosságot követel meg.

---

## Mi kerül itt dokumentálásra?

A képzési modul rögzíti az összes biztonsági tudatossági intézkedést:
- Kötelező képzések (onboarding, éves képzés)
- Adathalászat-szimulációk (phishing)
- Műhelymunkák és külső szemináriumok
- E-learning teljesítések
- Szerepkör-specifikus képzések (rendszergazdák, CISO, DPO)

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Képzési nyilvántartások megtekintése | `reader` |
| Képzési nyilvántartások létrehozása és szerkesztése | `editor` |
| Képzési nyilvántartások törlése / visszaállítása | `admin` |

---

## Képzési bejegyzés létrehozása

**Képzés → „+ Új képzés"**

Mezők:
- **Cím** – pl. „Adathalászat-tudatosság Q1 2026"
- **Típus** – Kötelező / Adathalászat-szimuláció / Műhelymunka / E-learning / Egyéb
- **Dátum** – mikor zajlott a képzés?
- **Időtartam** – órában megadva
- **Oktató / Szolgáltató**
- **Célcsoport** – minden munkatárs / IT-osztály / vezetőség stb.
- **Résztvevők száma** – hány fő vett részt?
- **Lefedettségi arány** – a célcsoport hány százalékát sikerült elérni?
- **Eredmény / Megjegyzések** – értékelés, megállapítások, fejlesztendő területek
- **Státusz** – `tervezett` / `teljesített` / `lemondott`

---

## Haladás és mérőszámok

A képzési áttekintő az alábbiakat mutatja:
- Lefedettségi arány az összes képzésre (cél: a kötelező képzések 100%-os teljesítése)
- Tervezett és teljesített képzések aránya
- Képzések típus és időszak szerinti bontása

---

## Kapcsolat az SoA-val

A képzési intézkedések kontrollok megvalósítási bizonyítékaként is csatolhatók, pl.:
- ISO A.6.3 (Biztonsági tudatossági képzés) → éves képzés
- ISO A.8.7 (Kártevők elleni védelem) → adathalászat-szimuláció

---

## Auditori megjegyzés

Az ISO 27001 7.2 fejezete megköveteli annak igazolását, hogy a munkatársak rendelkeznek a szükséges kompetenciával.
A 7.3 fejezet az ISMS-szabályzattal és a személyes szerepkörrel kapcsolatos tudatosságot írja elő.

Az auditor az alábbiakat várja:
1. Képzési terv az aktuális évre
2. A teljesített képzések igazolása (jelenléti ívek, tanúsítványok)
3. Az összes érintett munkatársat lefedő teljesítési arány

Javaslat: a képzési bizonyítékokat PDF-ben csatolja az adott képzési bejegyzéshez,
hogy az audit során azonnal rendelkezésre álljanak.
