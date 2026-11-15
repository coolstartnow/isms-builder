# Kasutusjuhend: siseaudit

Siseaudit vaatab sõltumatult üle ISMS-i ja sisekontrollisüsteemide tõhusust.

> **Sõltumatus:** Siseaudit on funktsionaalselt ja organisatsiooniliselt sõltumatu (IIA standard 1100, IDW PS 321). See aruandleb otse juhatusele / tippjuhtkonnale või auditikomiteele ning on operatiivjuhtkonna juhistest vaba.

---

## Moodulite ülevaade

| Moodul | Auditi objekt | Asukoht |
|---|---|---|
| **SoA** | Kõigi meetmete rakendamise olek | Menüü: SoA |
| **Aruanded** | Vastavusmaatriks, lüngaaruanne, ülevaatuse tsüklid | Menüü: Aruanded |
| **Auditilogi** | Kõigi süsteemitegevuste jälgitavus | Halduskonsool → Auditilogi |
| **Riskijuhtimine** | Riskiregistri täielikkus, käsitluse olek | Menüü: Riskid |
| **Juhtimine** | Juhtkonna ülevaatuse protokollid, tegevuste olek | Menüü: Juhtimine |
| **Koolitus** | Koolituskirjed, läbimise määr | Menüü: Koolitus |
| **BCM** | Õppuste aruanded, BIA ajakohasus | Menüü: BCM |

---

## Auditimenetlused

### Vastavuse oleku hindamine
1. **Aruanded → vastavusmaatriks:** valgusfoori vaade meede × üksus
2. Punased lahtrid = puuduv rakendamine → pärige mooduli omanikult
3. **Aruanded → lüngaaruanne:** kõik meetmed olekuga „ei kohaldu“ või ilma abinõuta
4. CSV-eksport tööpaberiks

### SoA meetmete ülevaatus
1. **SoA → vali raamistik** (ISO 27001, NIS2, BSI …)
2. Filtreeri „ei kohaldu“ → kontrolli põhjenduste usutavust
3. Valim: meetmed „kohaldatav“ olekuga „planeeritud/osaliselt“ → nõua rakendamise tõendeid

### Auditilogi hindamine (vajalik administraatori juurdepääs)
1. **Halduskonsool → Auditilogi**
2. Filtreeri perioodi, kasutaja või tegevuse järgi
3. Kriitilised tegevused: permanent_delete, demo_reset, seadete muudatused

### Riskihindamiste jälgimine
1. **Riskid → loend:** kontrolli hinnet, viimase muutmise kuupäeva, käsitluse olekut
2. Tuvasta käsitlemata kõrged riskid (hinne ≥ 15)
3. Jälgi seotud meetmeid üksikasjade paneelil

---

## Auditiaruanded ja tööpaberid

| Tõend | Juurdepääs | Märkus |
|---|---|---|
| Vastavusmaatriks | Aruanded → vastavusmaatriks + CSV | Märgi üles võrdluskuupäev |
| Lüngaaruanne | Aruanded → lüngaaruanne + CSV | Dokumenteeri muutus eelmise aastaga võrreldes |
| Riskide eksport | Riskid → CSV | Täielikkuse kontroll |
| Auditilogi eksport | Haldus → Auditilogi → CSV | Märgi muutmiskaitse |
| Koolituskirjed | Koolitus → loend | Läbimise määr osakonna kaupa |
