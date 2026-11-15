# Moodul: poliitikate kinnitused

> Poliitikate kontrollitav levitamine ja töötajate kinnitus —
> ISO 27001 keskne auditidokument.

---

## Mis on poliitika kinnitus?

ISO 27001 nõuab mitte ainult poliitikate olemasolu, vaid et need on asjaomastele isikutele **teatavaks tehtud**
ning et need isikud on oma arusaamist **kinnitanud**
(nõuded 7.3 ja A.6.3). Klassikaline tõend: allkirjastatud kinnituskviitung.

ISMS Builder automatiseerib selle protsessi täielikult:
- Vali poliitika → määra saajad → saada link e-postiga
- Saaja kinnitab isikustatud lingi kaudu (sisselogimist pole vaja)
- Saaja näeb poliitikat **korrektselt vormindatuna** (renderdatud Markdown: pealkirjad, tabelid, loendid), mitte enam toorallikana
- Täielik auditijälg ajatempli ja CSV-ekspordiga

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Töölaua kokkuvõtlike näitajate vaatamine („Aktiivsed levitused“, „Ootel kinnitused“) | `reader` |
| Levituste ülevaate ja kinnituste üksikasjade vaatamine (menüükirje „Poliitikate kinnitused“) | `contentowner` |
| Levituse loomine ja saatmine | `contentowner` |
| Meeldetuletuse saatmine | `contentowner` |
| Kinnituse käsitsi registreerimine või importimine | `contentowner` |
| Levituse kustutamine | `admin` |

Lugejad näevad Töölaual ainult kokkuvõtlikke arve. Adressaatide nimekirjad (e-posti aadress, nimi, kinnituse aeg ja IP-aadress) on ette nähtud ainult contentownerile, sest need sisaldavad isikuandmeid.

---

## Töövoog: poliitika levitamine

**1. samm — levituse loomine**
Klõpsa menüüs **„Poliitikate kinnitused“** nupul **„+ Uus levitus“**.

**2. samm — kohustuslikud väljad**
- **Vali poliitika** — saadaval on ainult mallid olekuga `approved`
- **Levituse pealkiri** — nt „Paroolipoliitika 2026 – iga-aastane levitus“
- **Tähtaeg** — kõigi kinnituste tähtaeg
- **Saajad** — teavitatavate inimeste nimed ja e-posti aadressid

**3. samm — saatmine**
Nupule **„Saada“** klõpsamine saadab igale saajale e-kirja **isikustatud
kinnituslingiga**. Link on seotud selle inimesega ja töötab ilma sisselogimiseta.

**4. samm — saaja kinnitus**
Saaja avab lingi, loeb poliitika täistekstina ja klõpsab nupul
**„Olen selle poliitika läbi lugenud ja sellest aru saanud“**.
Ajatempel ja IP-aadress salvestatakse.

**5. samm — oleku jälgimine**
Levituse ülevaade näitab igal ajal praegust olukorda:
- Kes on kinnitanud (ajatempliga)
- Kes pole veel kinnitanud
- Lõpetatud protsent

---

## Meeldetuletuse funktsioon

**„Saada meeldetuletus“** saadab uuesti e-kirja sama isikustatud lingiga kõigile
saajatele, kes pole veel kinnitanud.

---

## Käsitsi sisestamine ja import

Isikutele, kellel pole e-posti juurdepääsu (nt tootmistöötajad):

**Üksiksisestus:** klõpsa levituses **„Registreeri kinnitus“** — sisesta
nimi, kuupäev ja valikuline märkus.

**CSV-import:** hulgiimport CSV-failiga, mille veerud on
`name, email, confirmedAt` (vorming: ISO 8601).

---

## Eksport ja tõendid

**„Ekspordi CSV“** levituses laadib alla täieliku kinnituste loendi —
sobib auditi tõendiks:

```
name, email, confirmedAt, method
John Smith, j.smith@company.com, 2026-03-15T10:23:00Z, link
Anna Jones, a.jones@company.com, 2026-03-16T08:45:00Z, manual
```

---

## Märkus auditiks

Audiitor ootab iga turvalisega seotud poliitika kohta teatavaks tegemise tõendeid.
Levituste CSV-eksport on selleks sobiv dokument. Soovitused:
- Kõigi aktiivsete poliitikate iga-aastane levitus
- Poliitika muutumisel: käivita uus levitus
- Arhiveeri eksport dokumendihaldussüsteemis
