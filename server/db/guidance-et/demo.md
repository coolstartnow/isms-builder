# Demorežiim – ülevaade ja üleminek tootmisse

Tere tulemast **ISMS Builderisse** — teie isemajutatavasse infoturbejuhtimissüsteemi.

See dokument selgitab demokeskkonda ja juhatab teid üleminekul tootmisse.

---

## Demo kasutajatunnused

| Kasutaja | E-post | Parool | Roll | Valdkond | Juurdepääs |
|---|---|---|---|---|---|
| admin | admin@example.com | adminpass | Admin | Üldine | Täielik juurdepääs — kõik moodulid |
| alice | alice@it.example | alicepass | Osakonnajuhataja | IT | Poliitikad, riskid, juhised (lugemine+kirjutamine) |
| bob | bob@hr.example | bobpass | Lugeja | Personal | Ainult lugemine |
| carla | carla@security.example | carlapass | Sisuomanik | Turve | CISO funktsioon (mitte admin): mõjuhinnangute ettevalmistamine ja kinnitamine |
| dana | dana@privacy.example | danapass | Sisuomanik | Privaatsus | Andmekaitsespetsialisti funktsioon (mitte admin): mõjuhinnangu arvamuse sisestamine |

> **Turvateade:** Need paroolid on avalikult teada. Muutke kõik paroolid enne kasutuselevõttu.

---

## Saadaolevad demoandmed

Süsteem sisaldab realistlikke näidisandmeid järgmiste moodulite jaoks:

| Moodul | Demosisu |
|---|---|
| **Poliitikad** | Infoturbepoliitika, paroolipoliitika, BYOD poliitika, varundamise poliitika, juurdepääsukontrolli poliitika |
| **SoA** | 313 meedet 8 raamistikus (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA) — kõik muudetavad |
| **Riskijuhtimine** | Realistlikud riskid mitme raamistiku seostega (lunavara, andmepüük, siseringi oht, tarneahel, …) |
| **IKÜM ja privaatsus** | Töötlemistoimingute register, volitatud töötleja lepingud, TOM-id, mõjuhinnangute kirjed, 72 h taimeri demo |
| **Varad** | Ettevõtte varad (serverid, tööjaamad, ERP, pilveteenused, võrk) klassifikatsiooniga |
| **Tarneahel** | Tarnijad, sh seosed NIS2/EUCS-iga |
| **BCM / BCP** | Talitluspidevuse mõjuanalüüsid, talitluspidevuse kavad, õppused |
| **Juhtimine** | Juhtkonna ülevaatused tegevuste ja koosolekute protokollidega |
| **Koolitus** | Koolitusabinõud (ISO teadlikkus, IKÜM, andmepüügi simulatsioon) |
| **Õigus** | Lepingud, NDA-d, privaatsuspoliitikad |
| **Turvaeesmärgid** | KPI-eesmärgid edenemisribadega |
| **Intsidentide postkast** | Demoteated avaliku intsidendivormi kaudu |
| **Juhised** | Süsteemijuhend, rollijuhendid, poliitikaprotsessid, SoA auditi juhend |

---

## Üleminek tootmisse

### Samm-sammult
1. Ava **Halduskonsool** → vahekaart **Hooldus**
2. **Tee demo lähtestamine:**
   - Klõpsa jaotisel „Demo lähtestamine“
   - Sisesta kinnitusdialoogis `RESET`
   - Süsteem ekspordib kõik demoandmed JSON-allalaadimisena (varukoopia)
   - Kõik moodulite andmed kustutatakse, kõik kasutajad peale `admin` kustutatakse
   - Admini parool lähtestatakse väärtusele `adminpass`, 2FA keelatakse
3. **Suunamine sisselogimislehele** — kollane riba kinnitab lähtestamise õnnestumist
4. **Logi sisse kasutajaga `admin@example.com` / `adminpass`** — riba kaob, süsteem on tootmiseks valmis
5. **Muuda parool kohe:** Seaded → Muuda parooli
6. **Seadista 2FA:** Seaded → Lülita 2FA sisse
7. **Loo oma kasutajad:** Halduskonsool → vahekaart Kasutajad
8. **Loo oma sisu:** kõik moodulid on tühjad ja kasutusvalmis

### Mis säilib pärast lähtestamist?

| Säilib | Kustutatakse |
|---|---|
| SoA meetmed (kõik 313) | Poliitikad / mallid |
| Rippmenüü loendid | Riskid |
| Organisatsiooni seaded | Varad, BCM, juhtimine |
| (Admin-kasutaja) | Tarnijad, õigus, koolitus |
| | IKÜM-i andmed, juhised |
| | Auditilogi, turvaeesmärgid |

---

## Demoandmete taastamine

Süsteemi uuesti demonstreerimiseks:

1. **Halduskonsool → Hooldus → „Impordi demoandmed“**
2. Vali demo lähtestamisel alla laaditud JSON-fail
3. Kõik moodulite andmed taastatakse
4. alice (alice@it.example / alicepass), bob (bob@hr.example / bobpass), carla (carla@security.example / carlapass) ja dana (dana@privacy.example / danapass) luuakse uuesti ilma 2FA-ta
5. Admini konto jääb muutmata

---

## Lisateave

- **Arhitektuur ja API viide:** Juhised → administraatori dokumentatsioon
- **Rollijuhendid:** Juhised → rollid
- **Projekti leht:** [GitHub – ISMS Builder](https://github.com/claudehecker/isms-builder)
- **Litsents:** GNU Affero General Public License v3.0 (AGPL-3.0)
