# <span style="color:#FFD700">⚠</span> Jogi tudnivaló: ISO-intézkedések — kézi telepítés szükséges

> <span style="color:#FFD700">**⚠ Ez a tájékoztatás kötelező érvényű. Érvényes a platform minden adminisztrátorára, üzemeltetőjére és felhasználójára.**</span>

---

## Amit tudnia kell

Az **ISO 27001:2022, ISO 9000:2015 és ISO 9001:2015** szerzői jogvédelem alatt álló szabványok, amelyeket a
Nemzetközi Szabványügyi Szervezet (ISO, © ISO) ad ki.

A teljes intézkedésdefiníciók — címek, leírások és követelményszövegek — **nem részei ennek a szoftvernek**, és **érvényes ISO-licenc nélkül nem tárolhatók, nem terjeszthetők és nem használhatók**.

---

## Mit kell tennie az adminisztrátornak?

Az ISO 27001, ISO 9000 és ISO 9001 SoA-moduljai **intézkedéstartalom nélkül** érkeznek.
Az adminisztrátornak az intézkedéseket **kézzel kell importálnia**:

1. **Szerezzen be licencelt példányt** — az [iso.org](https://www.iso.org/) oldalról vagy egy hivatalos nemzeti szervezettől
2. **Készítsen elő egy JSON-fájlt** — a formátum a `scripts/import-iso-controls.sh` szkriptben van dokumentálva
3. **Futtassa az importszkriptet:**
   ```bash
   bash scripts/import-iso-controls.sh /path/to/iso-controls.json
   ```
4. **Indítsa újra a szervert**

---

## Mely keretrendszerek vannak már benne?

A következő keretrendszerek nyilvánosan elérhető uniós jogszabályokon vagy szövetségi kiadványokon alapulnak,
és **teljesen előtelepítettek** — licenc nem szükséges:

| Keretrendszer | Jogalap |
|---|---|
| **BSI IT-Grundschutz** | Német Szövetségi Információbiztonsági Hivatal (BSI) |
| **EU NIS2** | 2022/2555 EU-irányelv |
| **EUCS** | ENISA európai felhő-kiberbiztonsági tanúsítási rendszer |
| **EU MI-rendelet** | 2024/1689 EU-rendelet |
| **CRA** | EU kiberrezilienciai rendelet |

---

## Jogalap

Az ISO-szabványok szerzői jogi védelem alatt állnak (Berni Egyezmény, nemzeti átültetések).
A jogosulatlan sokszorosítás, nyilvános közlés vagy tárolás — belső üzleti célra is,
licenc nélkül — **nem megengedett**.

**A licencnek megfelelő üzemeltetésért kizárólag e telepítés üzemeltetője felel.**
Az ISMS Builder szerzői nem vállalnak felelősséget ISO-védelem alatt álló tartalmak licenc nélküli használatáért.
