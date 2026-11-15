# Moodul: õigus (lepingud ja õigusdokumendid)

> Halda keskselt infoturbega seotud lepinguid, NDA-sid ja litsentse —
> ISO 27001 A.5.31 (õiguslikud nõuded), A.5.32 (intellektuaalomandi õigused).

---

## Mis kuulub õiguse moodulisse?

Õiguse moodul ei ole täielik lepingute haldussüsteem, vaid
**turbega seotud dokumentide register** järgmiste jaoks:

- **Lepingud** — IT-teenuste lepingud, SLA-d, hoolduslepingud
- **NDA-d** — konfidentsiaalsuslepingud töötajate, tarnijate ja partneritega
- **Litsentsid** — turbega seotud tarkvaralitsentsid (nt aegumiskuupäevad)

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Kirjete vaatamine | `reader` |
| Kirjete loomine ja muutmine | `contentowner` |
| Kirjete kustutamine / taastamine | `admin` |

---

## Lepingud

**Õigus → Lepingud → „+ Uus leping“**

Väljad:
- **Pealkiri** — lepingu nimi
- **Lepingupartner**
- **Liik** — teenus / SLA / hooldus / muu
- **Kehtivusaeg** — alguse ja lõpu kuupäev
- **Etteteatamistähtaeg**
- **Olek** — `active` / `expired` / `terminated`
- **Turvaklauslid** — kas turvanõuded on kaasatud? (jah/ei + märkus)
- **Manus** — laadi leping üles PDF-ina (kuni 25 MB)

**Aegumishoiatus:** lepingud, mis aeguvad ≤ 30 päeva pärast, ilmuvad töölauale ja
kalendrisse.

---

## NDA-d (konfidentsiaalsuslepingud)

**Õigus → NDA-d → „+ Uus NDA“**

Väljad: lepingupartner, liik (ühepoolne/vastastikune), allkirjastamise kuupäev, kehtivusaeg, ulatus,
manus (PDF).

---

## Litsentsid

**Õigus → Litsentsid → „+ Uus litsents“**

Väljad: tarkvara nimi, tarnija, litsentsi liik (üksik/mahu-/tellimus), kogus,
aegumiskuupäev, kulu, manus.

---

## Eksport

Kõik kolm valdkonda toetavad **CSV-eksporti** auditi tõendite ja sisemiste aruannete jaoks.

---

## Märkus auditiks

ISO 27001 A.5.31 nõuab kõigi asjakohaste
õiguslike, regulatiivsete ja lepinguliste nõuete tuvastamist ja dokumenteerimist. Õiguse moodul pakub selleks
struktureeritud tõendeid.

Eriti oluline: turvaklausleid sisaldavad lepingud (A.5.20 — tarnijalepingud)
tuleks registreerida nii siin kui ka tarnijate moodulis.
