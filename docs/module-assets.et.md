# Moodul: varad (infovarad)

> Varade register on iga ISMS-i alus — ISO 27001 lisa A.5.9 nõuab
> kõigi infot töötlevate varade täielikku inventuuri.

---

## Mis on vara?

Vara (infovara) on kõik, mis on organisatsioonile väärtuslik ja mida tuleb
kaitsta: tarkvara, riistvara, andmed, inimesed, protsessid, rajatised.

Tüüpilised varade kategooriad:
- **Riistvara** — serverid, sülearvutid, võrguseadmed
- **Tarkvara** — operatsioonisüsteemid, rakendused, SaaS
- **Andmed** — andmebaasid, varundusandmekandjad, seadistusandmed
- **Inimesed** — töötajad võtmerollides
- **Protsessid** — kriitilised äriprotsessid
- **Rajatised** — andmekeskused, kontorihooned

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Varade vaatamine | `reader` |
| Varade loomine ja muutmine | `editor` |
| Varade kustutamine / taastamine | `admin` |

---

## Vara loomine

**Varad → „+ Uus vara“**

Väljad:
- **Nimi** — unikaalne tunnus (nt „Tootmise andmebaasiserver“)
- **Liik** — nt server, SaaS-rakendus, andmebaas. Loend on rühmitatud kategooriate järgi (riistvara, tarkvara, andmed, teenused, rajatised) ja seda saab kohandada — vt allpool.
- **Omanik** — kes vastutab?
- **Osakond / organisatsiooniüksus**
- **Klassifikatsioon** — konfidentsiaalsus: `public` / `internal` / `confidential` / `secret`
- **Kriitilisus** — `low` / `medium` / `high` / `critical`
- **Kirjeldus** — mis vara see on, kus see asub?
- **Seotud riskid** — millised riskid seda vara mõjutavad?

---

## Varade liikide kohandamine

**Haldus → Loendid → Varade liigid** (ainult administraatorid)

Rakendusega kaasas olevad liigid on lähtepunkt, mitte kindel loend. Neid saab
ümber nimetada, laiendada ja eemaldada; iga liik kuulub ühte viiest kategooriast.

Kehtib kaks kaitsemeedet:

- **Veel kasutuses olevat liiki ei saa eemaldada.** Süsteem nimetab liigi ja mitut
  vara see mõjutab. Seo need esmalt ümber, seejärel kustuta.
- **Liik valideeritakse vara salvestamisel.** Tundmatu liik lükatakse tagasi, et
  kirjaviga ei satuks andmetesse omaette liigina.

Olemasolevad varad säilitavad oma liigi, isegi kui see hiljem loendist kaob; vormis kuvatakse see
all „Tundmatu liik“, et seda muutmisel vaikselt ei kaotataks.

**Lähtestamine** taastab kaasasolevad vaikeväärtused.

### Kaitse-eesmärkide määramine liigi kaupa

Iga liik saab määratleda konfidentsiaalsuse, tervikluse, käideldavuse ja autentsuse (tasemed 1–4).
Selle liigi varad pärivad need väärtused ilma, et keegi peaks neid eraldi hooldama.

Siin on olulised kolm reeglit:

- **Vaikeväärtus kehtib eesmärgi kaupa.** Liik „Andmebaas“ saab määrata ainult konfidentsiaalsuse 4-ks;
  terviklus ja käideldavus jäävad siis üksiku vara teha.
- **Seos säilib.** Vaikeväärtuse hilisem parandamine liigil kehtib kohe igal
  varal, mis pole seda üle kirjutanud — see ei ole ühekordne algväärtus.
- **Kõrvalekalle on võimalik:** vara vormis on lüliti „Määra kaitse-eesmärgid liigist
  sõltumatult“. Kui see on välja lülitatud, on neli välja lukustatud ja näitavad liigi väärtust.

**Liigi muutmine vormis:** Kui muudad vara vormis liiki, näitavad neli kaitseväljad kohe uue liigi vaikeväärtusi — pole vaja salvestada ja uuesti avada. See kehtib seni, kuni „Määra kaitse-eesmärgid liigist sõltumatult“ pole märgitud; kui lüliti on sees, jäävad sinu enda väärtused puutumata. Kui uuel liigil pole vaikeväärtusi, on väljad vabalt muudetavad (lüliti on peidetud). Uue vara puhul kehtivad eelvalitud liigi vaikeväärtused niipea, kui vorm avatakse.

**Oluline koostoime sõltuvustega:** pärimine maksimumprintsiibi järgi on endiselt
liigi vaikeväärtusest kõrgemal. Kui kõrge kaitsevajadusega vara sõltub teisest, tõstetakse see
teine vara — ka siis, kui selle väärtust on tahtlikult ülekirjutusega alandatud. See on
ettenähtud: kriitilist rakendust käitav server ei ole vähem kaitsmist väärt kui
rakendus ise. Vorm näitab siis, milline vara väärtust tõstab.

---

### Keeled: mis on tõlgitud ja mis mitte

See on teadlik disainiotsus, mitte lünk:

- **24 kaasasolevat liiki on tõlgitud kõigisse kasutajaliidese keeltesse** (DE/EN/FR/NL/HU/ET) ja kuvatakse
  selles keeles, mille iga kasutaja on valinud.
- **Ise loodud liiki ei tõlgita.** See kuvatakse igale kasutajale täpselt nii, nagu see sisestati.
  Rakendus ei oska leiutada tõlget terminile, mida ta ei tunne.
- **Kaasasoleva liigi ümbernimetamine kaotab ka selle tõlke.** Sellest hetkest kehtib
  sinu sisestatud tekst — vastasel juhul kirjutataks sinu ümbernimetamine teistes keeltes vaikselt üle.

Kui teil on mitmekeelne personal ja lisate oma liike, leppige liikide nimede jaoks kokku üks keel —
tavaliselt ettevõtte keel. Vaikeväärtustele lähtestamine taastab tõlked.

---

## Loendi sorteerimine ja varade leidmine

Loend **Kõik varad** on vaikimisi sorteeritud **kategooria → liik → nimi** järgi (tähestiku järjekorras liidese keeles; numbrid järjestatakse loomulikult, „Laptop 2“ tuleb enne „Laptop 10“; liigita vara on oma kategoorias viimane). Uus vara ilmub seetõttu oma kohale, mitte enam päris alla; pärast salvestamist tõstetakse rida korraks esile ja kerib vaatesse, aktiivsed filtrid ja otsing säilivad.

**Veeru päisele** klõpsamine (nimi, liik, kaitsevajadus, klassifikatsioon, kriitilisus, vastutaja, olek, eluea lõpp) sorteerib kasvavalt ja teisel klõpsul kahanevalt; kolmas klõps taastab vaikejärjestuse. Tühjad väärtused on alati lõpus. Brauser jätab valitud veeru meelde. Sorteeritakse ainult kuva; ekspordi ja liidese järjestus ei muutu.

Vahekaardil **Kategooria järgi** on kategooriad tähestiku järjekorras, nende sees varad liigi ja nime järgi. Redigeerimisõigusega kontod saavad seal samuti redigeerida (pliiatsi ikoon; administraatorid saavad ka kustutada); pärast salvestamist naaseb vaade sellele vahekaardile.

## Klassifikatsioon ja kriitilisus

**Klassifikatsioon** kirjeldab kaitsevajadust konfidentsiaalsuse osas:

| Tase | Tähendus |
|---|---|
| `public` | Avalikult kättesaadav, avalikustamisel kahju pole |
| `internal` | Ainult sisemiseks kasutuseks, piiratud mõju |
| `confidential` | Konfidentsiaalne, märkimisväärne mõju |
| `secret` | Rangelt konfidentsiaalne, tõsine mõju |

**Kriitilisus** kirjeldab mõju äritegevusele, kui vara on
kättesaamatu või kompromiteeritud.

---

## Seos riskidega

Riskivormis (jaotis „Seosed“ → **Mõjutatud varad, varaliigid ja tarnijad**) saab riski siduda üksikute **varadega**, tervete **varaliikidega (klassidega)** ja **tarnijatega**. Valijal on otsingukast; topeltklõps lisab kirje, kiibil klõpsamine eemaldab selle. Varaliigiga seotud risk kehtib kõigile selle liigi varadele.

Vara vormis (muutmisel) loetleb jaotis **Seotud riskid** kõik riskid taseme ja olekuga — nii otse seotud kui ka need, mis kehtivad varaliigi kaudu (märgitud „varaliigi kaudu“). Riski üksikasjade vaade loetleb seotud varad, liigid ja tarnijad nimeliselt.
See teeb vara **riskiekspositsiooni** läbipaistvaks.

---

## Töölaud

Varade ülevaade näitab:
- Varade koguarvu liigi järgi
- Jaotust klassifikatsiooni ja kriitilisuse järgi
- Varasid ilma omanikuta (vajab tegutsemist)

---

## Märkus auditiks

ISO 27001 A.5.9 nõuab peetud varade inventuuri omanike määramisega.
A.5.10 nõuab vastuvõetava kasutuse poliitikat. A.5.12 nõuab teabe klassifitseerimist.
Kõiki kolme nõuet katab varade moodul koos sobiva poliitikaga.

Soovitus: vaata varade register igal aastal üle ja uuenda seda kohe, kui
IT-maastikus toimuvad olulised muudatused.
