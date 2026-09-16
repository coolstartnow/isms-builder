# Modul: Szabályzat-visszaigazolások

> A szabályzatok ellenőrizhető terjesztése és munkatársak általi visszaigazolása –
> központi auditdokumentum az ISO 27001 szempontjából.

---

## Mi az a szabályzat-visszaigazolás?

Az ISO 27001 nemcsak azt követeli meg, hogy a szabályzatok létezzenek, hanem azt is, hogy azokat az érintetteknek **közölték**, és azok **megértésüket visszaigazolták**
(7.3 és A.6.3 követelmények). A klasszikus bizonyíték: aláírt visszaigazolási nyilatkozat.

Az ISMS Builder ezt a folyamatot teljes mértékben automatizálja:
- Szabályzat kiválasztása → címzettek meghatározása → hivatkozás elküldése e-mailben
- A címzett személyre szabott hivatkozáson keresztül visszaigazol (bejelentkezés nélkül)
- A címzett a szabályzatot **megfelelően formázva** látja (renderelt Markdown: fejlécek, táblázatok, listák), nem nyers forrásként
- Teljes auditnaplózás időbélyeggel és CSV-exporttal

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Visszaigazolás-áttekintő megtekintése | `reader` |
| Terjesztés létrehozása és elküldése | `contentowner` |
| Emlékeztető küldése | `contentowner` |
| Visszaigazolás manuális rögzítése vagy importálása | `contentowner` |
| Terjesztés törlése | `admin` |

---

## Munkafolyamat: Szabályzat terjesztése

**1. lépés – Terjesztés létrehozása**
A **„Szabályzat-visszaigazolások"** menüben kattintson az **„+ Új terjesztés"** gombra.

**2. lépés – Kötelező mezők**
- **Szabályzat kiválasztása** – csak `approved` (jóváhagyott) állapotú sablonok elérhetők
- **Terjesztés megnevezése** – pl. „Jelszószabályzat 2026 – Éves terjesztés"
- **Határidő** – az összes visszaigazolás teljesítésének végső dátuma
- **Címzettek** – az értesítendő személyek neve és e-mail-címe

**3. lépés – Küldés**
A **„Küldés"** gombra kattintva minden címzett e-mailt kap egy **személyre szabott
visszaigazolási hivatkozással**. A hivatkozás az adott személyhez kötött, és bejelentkezés nélkül működik.

**4. lépés – Visszaigazolás a címzett részéről**
A címzett megnyitja a hivatkozást, elolvassa a teljes szabályzatszöveget, majd rákattint
a **„Visszaigazolom, hogy elolvastam és megértettem ezt a szabályzatot"** gombra.
Az időbélyeg és az IP-cím rögzítésre kerül.

**5. lépés – Állapot nyomon követése**
A terjesztés áttekintője bármikor megmutatja az aktuális állapotot:
- Ki igazolta vissza (időbélyeggel)
- Ki nem igazolta vissza még
- A teljesítés százalékos aránya

---

## Emlékeztető funkció

Az **„Emlékeztető küldése"** gomb újra elküldi az e-mailt ugyanazzal a személyre szabott hivatkozással minden olyan címzettnek, aki még nem igazolt vissza.

---

## Manuális rögzítés és importálás

E-mail-hozzáférés nélküli személyek esetén (pl. termelési dolgozók):

**Egyedi rögzítés:** A terjesztésen belül kattintson a **„Visszaigazolás rögzítése"** gombra – adja meg a nevet, dátumot és opcionális megjegyzést.

**CSV-import:** Tömeges importálás CSV-fájllal, a következő oszlopokkal:
`name, email, confirmedAt` (formátum: ISO 8601).

---

## Exportálás és bizonyítékok

A terjesztés **„CSV exportálása"** gombja letölti a teljes visszaigazolási listát –
auditbizonyítékként alkalmas:

```
name, email, confirmedAt, method
Kovács János, j.kovacs@vallalat.hu, 2026-03-15T10:23:00Z, link
Kiss Anna, a.kiss@vallalat.hu, 2026-03-16T08:45:00Z, manual
```

---

## Megjegyzés auditoroknak

Az auditor minden biztonsági szempontból releváns szabályzatnál kommunikáció megtörténtét igazoló bizonyítékot vár.
A terjesztések CSV-exportjai erre a célra szolgáló megfelelő dokumentumok. Ajánlások:
- Minden aktív szabályzat éves terjesztése
- Szabályzatmódosítás esetén: új terjesztés indítása
- Az exportok archiválása a dokumentumkezelő rendszerben
