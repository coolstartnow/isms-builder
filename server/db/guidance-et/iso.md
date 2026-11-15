# <span style="color:#FFD700">⚠</span> Õiguslik teade: ISO meetmed — vajalik käsitsi paigaldamine

> <span style="color:#FFD700">**⚠ See teade on siduv. See kehtib kõigile selle platvormi administraatoritele, käitajatele ja kasutajatele.**</span>

---

## Mida peate teadma

**ISO 27001:2022, ISO 9000:2015 ja ISO 9001:2015** on autoriõigusega kaitstud standardid, mille on avaldanud
Rahvusvaheline Standardiorganisatsioon (ISO, © ISO).

Täielikud meetmete määratlused — pealkirjad, kirjeldused ja nõuete tekst — **ei kuulu selle tarkvara hulka** ning neid **ei tohi ilma kehtiva ISO litsentsita salvestada, levitada ega kasutada**.

---

## Mida peab administraator tegema?

ISO 27001, ISO 9000 ja ISO 9001 SoA moodulid tarnitakse **ilma meetmete sisuta**.
Administraator peab meetmed **käsitsi importima**:

1. **Hanki litsentsitud koopia** — aadressilt [iso.org](https://www.iso.org/) või volitatud riiklikult organilt
2. **Valmista ette JSON-fail** — vorming on dokumenteeritud skriptis `scripts/import-iso-controls.sh`
3. **Käivita impordiskript:**
   ```bash
   bash scripts/import-iso-controls.sh /path/to/iso-controls.json
   ```
4. **Taaskäivita server**

---

## Millised raamistikud on juba kaasatud?

Järgmised raamistikud põhinevad avalikult kättesaadaval ELi õigusel või riiklike asutuste väljaannetel
ja on **täielikult eelpaigaldatud** — litsentsi pole vaja:

| Raamistik | Õiguslik alus |
|---|---|
| **BSI IT-Grundschutz** | Saksamaa Föderaalne Infoturbeamet (BSI) |
| **ELi NIS2** | ELi direktiiv 2022/2555 |
| **EUCS** | ENISA Euroopa pilveteenuste küberturvalisuse sertifitseerimiskava |
| **ELi tehisintellekti määrus** | ELi määrus 2024/1689 |
| **CRA** | ELi küberkerksuse määrus |

---

## Õiguslik alus

ISO standardid on kaitstud autoriõigusega (Berni konventsioon, riiklikud rakendused).
Loata kopeerimine, avalik edastamine või salvestamine — isegi sisemiseks ärikasutuseks
ilma litsentsita — **ei ole lubatud**.

**Vastutus litsentsinõuetele vastava käitamise eest lasub ainuüksi selle paigalduse käitajal.**
ISMS Builderi autorid ei vastuta ISO-kaitsega sisu litsentsita kasutamise eest.
