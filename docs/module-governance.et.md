# Moodul: juhtimine (ISMS-i juhtimine)

> Juhtimine dokumenteerib juhtimistegevused, mis hoiavad ISMS-i töös —
> ülevaatused, otsused ja juhtkonna tegevused.
> ISO 27001 punkt 9.3 (juhtkonna ülevaatus).

---

## Kolm alavaldkonda

| Valdkond | Eesmärk |
|---|---|
| **Juhtkonna ülevaatused** | Juhtkonna tehtud ISMS-i ülevaatuste kirjed |
| **Tegevused** | Ülevaatustest tulenevad abinõud ja otsused |
| **Koosolekud** | ISMS-i juhtkomitee koosolekute protokollid |

---

## Juhtkonna ülevaatused

ISO 27001 punkt 9.3 nõuab, et tippjuhtkond vaatab ISMS-i üle **kavandatud
ajavahemike järel**. Ülevaatus peab arvestama kindlate sisenditega (auditi tulemused, intsidendid,
eesmärkide saavutamine) ja viima dokumenteeritud väljunditeni (parendusotsused).

**Juhtimine → Ülevaatused → „+ Uus ülevaatus“**

Väljad:
- **Kuupäev ja osalejad**
- **Sisendid** — auditi tulemused, KPI olek, intsidendid viimasest ülevaatusest alates,
  riskiolukord, ressursivajadus, parendusettepanekud
- **Väljundid** — otsused, vastutavad isikud, tähtajad
- **Järgmise ülevaatuse kuupäev**

---

## Tegevused

Ülevaatustest või muudest allikatest (auditid, intsidendid) tulenevaid tegevusi jälgitakse siin.

**Juhtimine → Tegevused → „+ Uus tegevus“**

Väljad:
- **Pealkiri ja kirjeldus**
- **Allikas** — milline ülevaatus/audit/intsident selle tegevuse põhjustas?
- **Omanik ja tähtaeg**
- **Prioriteet** — `low` / `medium` / `high`
- **Olek** — `open` / `in_progress` / `completed` / `cancelled`

**Alates versioonist 1.80** hoitakse neid tegevusi keskses [abinõude registris](module-measures.et.md) (märge *Juhtimine*). Siin
töötamises midagi ei muutu; registris ilmuvad need koos kõigi teiste abinõudega ja neid saab lisaks siduda
meetmete, tähelepanekute ja riskidega. Manused jäävad tegevuse juurde selles valdkonnas. Neid võib endiselt kustutada ainult administraator.

---

## Koosolekud

Regulaarsete ISMS-i juhtkoosolekute (nt igakuine turvakomitee) protokollid.

**Juhtimine → Koosolekud → „+ Uus koosolek“**

Väljad: kuupäev, osalejad, päevakord, otsused, järgmine koosolek.

---

## Töölaud

Juhtimise ülevaade näitab:
- Avatud tegevusi prioriteedi ja tähtaja järgi
- Viimast ja järgmist planeeritud juhtkonna ülevaatust
- Tähtaja ületanud tegevusi (esile tõstetud punasega)

---

## Märkus auditiks

ISO 27001 punkt 9.3 on üks sagedamini viidatud mittevastavusi
esmastel audititel — paljudel organisatsioonidel puudub dokumenteeritud juhtkonna ülevaatus.

Audiitor kontrollib:
1. Kas juhtkonna ülevaatus on toimunud? (vähemalt kord aastas)
2. Kas ettenähtud sisendeid arvestati?
3. Kas tegevused on dokumenteeritud ja jälgitavad?

Soovitus: vähemalt üks ametlik juhtkonna ülevaatus aastas, ideaalis iga
kuue kuu järel.
