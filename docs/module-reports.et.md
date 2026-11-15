# Moodul: aruanded ja eksport

> Aruannete moodul võtab ISMS-i oleku kokku hinnatavates aruannetes —
> sisemiseks järelevalveks, juhtkonna ülevaatuseks ja välisaudiitorile.

---

## Saadaolevad aruanded

| Aruanne | Sisu |
|---|---|
| **Vastavus** | Kõigi meetmete rakendamise määr raamistiku kaupa |
| **Lüngaanalüüs** | Meetmed ilma seotud poliitika või protseduurita |
| **Raamistik** | Ühe raamistiku üksikasjalik ülevaade |
| **Mallid** | Kõik mallid oleku, liigi ja ülevaatuse kuupäeva järgi |
| **Audit** | Kõigi kasutajatoimingute auditilogi (admin) |
| **Ülevaatused** | Tähtaja ületanud ülevaatustega mallide ülevaade |
| **Maatriks** | Meetmete ja mallide seose maatriks |
| **Tähelepanekud** | Avatud auditi tähelepanekud ja abinõud |
| **Riskid** | Riskide ülevaade käsitluse olekuga |

---

## Vastavusaruanne

Kõige olulisem aruanne juhtkonna ülevaatuseks ja audiitorile.
Iga aktiveeritud raamistiku kohta näitab see:
- Meetmete koguarvu
- Arvu `implemented` / `partial` / `not_started`
- Rakendamise määra protsentides
- Trendi võrreldes eelmise kuuga

**Aruanded → Vastavus**

---

## Lüngaanalüüs

Näitab, millised meetmed on märgitud kui `applicable`, kuid millel pole seotud poliitikat ega
protseduuri — st kus on dokumentatsiooni lünk.

**Aruanded → Lüngaanalüüs**

Eriti kasulik ISO 27001 sertifitseerimise ettevalmistusetapis.

---

## Mallide aruanne

Kõigi mallide ülevaade koos:
- Olekuga (mustand/ülevaatus/kinnitatud/arhiveeritud)
- Omanikuga
- Järgmise ülevaatuse kuupäevaga
- Seotud meetmetega

Eksporditav **CSV** ja **PDF** (printimiseks optimeeritud) kujul.

---

## Riskiaruanne

Kõigi riskide ülevaade koos:
- Riskitasemega (madal/keskmine/kõrge/kriitiline)
- Käsitluse olekuga
- Jääkriskiga
- Omaniku ja tähtajaga

Eksporditav **CSV** ja **PDF** kujul.

---

## Auditilogi

Kõigi süsteemi kasutajatoimingute täielik logi: kes mida ja millal muutis.
Ligipääsetav ainult rollile `admin`.

**Aruanded → Auditilogi** — filtreeritav kasutaja, tegevuse ja ajavahemiku järgi.

---

## Eksportvormingud

Kõik aruanded on saadaval kujul:
- **CSV** — edasiseks töötlemiseks Excelis või BI-vahendites
- **PDF** — printimiseks optimeeritud kaudu `window.print()`, otse brauserist

---

## Märkus auditiks

Juhtkonna ülevaatuse (ISO 27001 punkt 9.3) jaoks soovitatakse
standardsete tugidokumentidena järgmisi aruandeid:
1. Vastavusaruanne (rakendamise määr raamistiku kaupa)
2. Lüngaanalüüs (avatud dokumentatsioonilüngad)
3. Riskiaruanne (praegune riskiolukord)
4. Mallide aruanne filtreeritud olekule `review` (tähtaja ületanud ülevaatused)

Need neli aruannet annavad koos juhtkonnale täieliku pildi ISMS-i olekust.
