# Modul: Jogi ügyek (Szerződések és jogi dokumentumok)

> Kezelje központilag az információbiztonság szempontjából releváns szerződéseket,
> titoktartási megállapodásokat (NDA) és licenceket —
> ISO 27001 A.5.31 (Jogi követelmények), A.5.32 (Szellemi tulajdonhoz fűződő jogok).

---

## Mi tartozik a Jogi modulba?

A jogi modul nem teljes körű szerződéskezelő rendszer, hanem egy
**biztonsági szempontból releváns dokumentumnyilvántartás** az alábbiak számára:

- **Szerződések** — IT-szolgáltatási szerződések, SLA-k, karbantartási megállapodások
- **NDA-k** — titoktartási megállapodások munkatársakkal, szállítókkal, partnerekkel
- **Licencek** — biztonsági szempontból releváns szoftverlicencek (pl. lejárati dátumok)

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Bejegyzések megtekintése | `reader` |
| Bejegyzések létrehozása és szerkesztése | `contentowner` |
| Bejegyzések törlése / visszaállítása | `admin` |

---

## Szerződések

**Jogi ügyek → Szerződések → „+ Új szerződés"**

Mezők:
- **Cím** — szerződés neve
- **Szerződő fél**
- **Típus** — Szolgáltatás / SLA / Karbantartás / Egyéb
- **Futamidő** — kezdő és befejező dátum
- **Felmondási idő**
- **Státusz** — `aktív` / `lejárt` / `megszűnt`
- **Biztonsági záradékok** — tartalmaznak-e biztonsági követelményeket? (igen/nem + megjegyzés)
- **Melléklet** — szerződés feltöltése PDF formátumban (max. 25 MB)

**Lejárati figyelmeztetés:** A ≤ 30 napon belül lejáró szerződések megjelennek az irányítópulton és a naptárban.

---

## NDA-k (Titoktartási megállapodások)

**Jogi ügyek → NDA-k → „+ Új NDA"**

Mezők: szerződő fél, típus (egyoldalú/kölcsönös), aláírás dátuma, futamidő, hatókör,
melléklet (PDF).

---

## Licencek

**Jogi ügyek → Licencek → „+ Új licenc"**

Mezők: szoftver neve, gyártó, licenctípus (egyfelhasználós/mennyiségi/előfizetéses), darabszám,
lejárati dátum, költség, melléklet.

---

## Export

Mindhárom területen elérhető **CSV-export** audit-bizonyíték és belső jelentések céljára.

---

## Audit-megjegyzés

Az ISO 27001 A.5.31 előírja az összes releváns jogi, szabályozói és szerződéses
követelmény azonosítását és dokumentálását. A jogi modul ehhez nyújtja a strukturált
bizonyítékot.

Különösen fontos: a biztonsági záradékokat tartalmazó szerződéseket (A.5.20 — szállítói
szerződések) a szállítókezelési modulban is rögzíteni kell.
