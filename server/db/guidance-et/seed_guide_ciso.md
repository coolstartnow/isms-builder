# Kasutusjuhend: CISO / infoturbejuht

CISO (Chief Information Security Officer) vastutab ISMS-i eest tervikuna. See juhend selgitab olulisemaid mooduleid ja igapäevaseid ülesandeid.

---

## Moodulite ülevaade

| Moodul | Ülesanne | Asukoht |
|---|---|---|
| **Riskijuhtimine** | Riskide registreerimine, hindamine ja käsitlemine | Menüü: Riskid |
| **SoA** | Meetmete hindamine, kohaldatavuse ja oleku haldamine | Menüü: SoA |
| **Turvaeesmärgid** | KPI-de määramine, edenemise jälgimine | Menüü: Eesmärgid |
| **Intsidentide postkast** | Teatatud turvaintsidentide menetlemine | Menüü: Intsidendid |
| **Tarneahel** | Tarnijate jälgimine, NIS2 kohustused | Menüü: Tarnijad |
| **BCM / BCP** | Talitluspidevuse mõjuanalüüsid, kavad, õppused | Menüü: BCM |
| **Juhtimine** | Juhtkonna ülevaatused, tegevuspaketid | Menüü: Juhtimine |
| **Aruanded** | Vastavusmaatriks, lüngaaruanne, CSV-eksport | Menüü: Aruanded |
| **Seaded (CISO)** | SLA, teavituslävi, eskaleerimise e-post | Menüü: Seaded |

---

## Igapäevased ülesanded

### Riskihindamine
1. **Riskid → Uus risk** — sisesta oht, tõenäosus (1–5), mõju (1–5)
2. Hinne = tõenäosus × mõju (arvutatakse automaatselt)
3. Lisa **käsitluskavad**, klõpsates riski kirjel → vahekaart „Käsitlus“
4. Seo SoA meetmetega nupuga „🔗 Seosed“ muutmisvormis

### SoA meetmete haldamine
1. **SoA → raamistiku vahekaart** (ISO 27001, NIS2, BSI …)
2. Klõpsa meetmel → sea olek (kohaldatav / ei kohaldu / osaliselt)
3. Sisesta põhjendus ja abinõud
4. **Kohapealne muutmine:** topeltklõps mis tahes väljal kiireks muutmiseks

### NIS2 teavitamiskohustus (72 tunni tähtaeg)
- Intsidendid olekuga „teavitamisele kuuluv“ CISO postkastis → valmista ette aruanne ametiasutusele
- Seadista teavituslävi jaotises **Seaded → CISO/infoturbejuht**
- Taimer jookseb registreerimisest; eskaleerimise e-kiri saadetakse automaatselt pärast SLA ületamist

### Juhtkonna ülevaatuse ettevalmistamine
1. **Juhtimine → Juhtkonna ülevaatus → Uus ülevaatus**
2. Sisesta päevakord, osalejad, otsused
3. Seo tegevuspunktid otse ülevaatusega
4. Ekspordi **Aruanded → Vastavusmaatriks** manusena (CSV)

---

## Aruanded ja tõendid

| Aruanne | Juurdepääs | Vorming |
|---|---|---|
| Vastavusmaatriks | Aruanded → Vastavusmaatriks | Tabel + CSV |
| Lüngaaruanne | Aruanded → Lüngaaruanne | Tabel + CSV |
| Raamistiku ülevaade | Aruanded → Raamistik | Tabel |
| Riskide eksport | Riskid → CSV | CSV |

---

## Märkused sõltumatuse kohta
CISO/infoturbejuht aruandleb otse tippjuhtkonnale (ISO 27001 punkt 5.1). Roll ei tohi olla vastuolus operatiivse IT vastutusega.
