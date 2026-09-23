# Modul: Üzletmenet-folytonosság-menedzsment (BCM)

> A BCM biztosítja, hogy a szervezet súlyos zavarások idején is működőképes maradjon -
> ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Három részterület

A BCM modul három szorosan kapcsolódó területből áll:

| Terület | Cél |
|---|---|
| **BIA** (Üzleti hatáselemzés) | Kritikus folyamatok azonosítása és a kiesés hatásának felmérése |
| **Folytonossági tervek** | Konkrét helyreállítási tervek kritikus folyamatokhoz |
| **Gyakorlatok** | A tervek tesztelésének dokumentálása és nyomon követése |

---

## Üzleti hatáselemzés (BIA)

A BIA megválaszolja: **Mi történik, ha ez a folyamat kiesik - és meddig engedhető meg ez?**

**BCM → BIA → „+ Új BIA"**

Mezők:
- **Folyamat neve** - melyik üzleti folyamat?
- **Folyamatfelelős és szervezeti egység**
- **Kritikusság** - `alacsony` / `közepes` / `magas` / `kritikus`
- **RTO** (Helyreállítási idő célja) - maximálisan tolerálható leállási idő (óra)
- **RPO** (Visszaállítási pontcél) - maximálisan tolerálható adatveszteség (óra)
- **MTPD** (Maximálisan tolerálható zavarási időszak) - abszolút maximális kiesési idő
- **Függőségek** - mely rendszerektől/szállítóktól függ ez a folyamat?
- **Érintett rendszerek**
- **Státusz** - `tervezet` / `felülvizsgált` / `jóváhagyott`

> Az **RTO és RPO** a BIA központi mutatói. Az RTO meghatározza, milyen gyorsan kell helyreállítani
> a folyamatot; az RPO meghatározza, mekkora adatveszteség fogadható el a helyreállítás pillanatában.

---

## Folytonossági tervek (Helyreállítási tervek)

Minden kritikus folyamathoz (BIA kritikusság: `magas`/`kritikus`) helyreállítási tervnek
kell léteznie.

**BCM → Tervek → „+ Új terv"**

Mezők:
- **Terv neve** - pl. „Termelési adatbázis helyreállítása"
- **Kapcsolódó BIA** - melyik BIA-hoz tartozik ez a terv?
- **Kiváltó esemény** - mikor aktiválják a tervet?
- **Felelős**
- **Lépések** - sorszámozott intézkedési utasítások
- **Erőforrások** - szükséges rendszerek, kapcsolattartók, hozzáférési adatok (titkosítva)
- **Státusz** - `tervezet` / `tesztelt` / `jóváhagyott`

---

## Gyakorlatok

A BCM-tervek csak akkor hatékonyak, ha rendszeresen gyakorolják azokat.
Az ISO 22301 elvárja az elvégzett tesztek dokumentálását.

**BCM → Gyakorlatok → „+ Új gyakorlat"**

Mezők:
- **Gyakorlat típusa** - Asztali (tabletop) / Szimuláció / Teljes körű teszt
- **Időpont és időtartam**
- **Tesztelt tervek**
- **Résztvevők**
- **Eredmény** - mi működött, mi nem?
- **Intézkedések** - mit kell javítani?

---

## Irányítópult

A BCM irányítópult mutatja:
- BIA-k száma kritikusság szerint
- Jóváhagyott terv nélküli folyamatok
- Utolsó gyakorlat és a következő tervezett gyakorlat
- `Tervezet` státuszú tervek (intézkedést igényelnek)

---

## Auditmegjegyzés

Az ISO 27001 A.5.29 az információbiztonságot követeli meg az üzletmenet-folytonosság keretében.
Az A.5.30 az IKT-felkészültséget szabályozza az üzletmenet-folytonosság szempontjából.

Az auditor jellemzően az alábbiakat ellenőrzi:
1. Létezik-e dokumentált RTO/RPO értékekkel rendelkező BIA?
2. Vannak-e jóváhagyott helyreállítási tervek a kritikus folyamatokhoz?
3. Tesztelték-e a terveket? (gyakorlati feljegyzések)
4. A gyakorlatokból levont tanulságokat beépítették-e a tervekbe?

Ajánlás: legalább évi egy asztali gyakorlat (tabletop) minden kritikus tervhez.
