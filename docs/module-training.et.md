# Moodul: koolitus ja turvateadlikkus

> Töötajad on ISMS-i kõige olulisem — ja sageli kõige haavatavam — tegur.
> ISO 27001 punktid 7.2 ja 7.3 ning A.6.3 nõuavad tõendatavat pädevust
> ja turvateadlikkust.

---

## Mida siin dokumenteeritakse?

Koolituse moodul registreerib kõik turvateadlikkuse abinõud:
- Kohustuslik koolitus (sisseelamine, iga-aastane koolitus)
- Andmepüügi simulatsioonid
- Töötoad ja välisseminarid
- E-õppe läbimised
- Rollipõhine koolitus (administraatorid, CISO, andmekaitsespetsialist)

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Koolituskirjete vaatamine | `reader` |
| Koolituskirjete loomine ja muutmine | `editor` |
| Koolituskirjete kustutamine / taastamine | `admin` |

---

## Koolituskirje loomine

**Koolitus → „+ Uus koolitus“**

Väljad:
- **Pealkiri** — nt „Andmepüügi teadlikkus I kvartal 2026“
- **Liik** — kohustuslik / andmepüügi simulatsioon / töötuba / e-õpe / muu
- **Kuupäev** — millal koolitus toimus?
- **Kestus** — tundides
- **Koolitaja / pakkuja**
- **Sihtrühm** — kõik töötajad / IT-osakond / juhtkond jne
- **Osalejate arv** — mitu inimest koolitati?
- **Katvuse määr** — kui suur osa sihtrühmast saavutati?
- **Tulemus / märkused** — hinnang, tähelepanekud, parendusvaldkonnad
- **Olek** — `planned` / `completed` / `cancelled`

---

## Tõendite registreerimine (vahekaart „Tõendid“)

Tõend **ei ole eraldi kirje**; see on koolituskirje väli **„Tõend / märkused“**. Vahekaardil **„Tõendid“** puudub seetõttu nupp „Uus“: see loetleb ainult koolitused olekuga **Lõpetatud** ja neis sisestatud tõendi teksti.

Kuidas toimida:
1. **Vahekaart „Kava“** → ava koolitus pliiatsiikooniga (või loo see nupuga „+ Uus koolitus“).
2. Sea **olekuks** *Lõpetatud* ja sisesta läbimise kuupäev.
3. Täida jaotises **„Tõend“** väli **„Tõend / märkused“**: osalejate nimekiri, tunnistuste numbrid, lingid (`http`/`https`) salvestatud dokumentidele.
4. **Salvesta.** Koolitus ilmub nüüd vahekaardile „Tõendid“; kaardil klõpsamine näitab koolitust ainult vaatamiseks (muudatusi tehakse ainult vahekaardil „Kava“).

Märkus: koolitus, mis pole veel *Lõpetatud*, ei ilmu vahekaardile „Tõendid“, isegi kui sellel on juba tõendi tekst. Faile lisatakse samas vormis jaotises „Manused“ (vt allpool).

---

## Manused ja osalemise kinnitus

**Manused** (osalejate nimekiri, pakkuja tunnistus, fotod): vahekaart „Kava“ → ava koolitus → jaotis **„Manused“** → „Lisa fail“. See on võimalik, kui koolitus on salvestatud.
- Lubatud: PDF, PNG, JPG, DOCX, XLSX ja TXT kuni 20 MB faili kohta. Kontrollitakse nii laiendit **kui ka** faili sisu; muud või maskeeritud failid lükatakse tagasi.
- Kontod alates rollist Editor võivad üles laadida ja eemaldada; iga lugemisõigusega konto võib alla laadida. Vahekaardil „Tõendid“ ilmuvad manused kaardil nuppudena.
- **„Eemalda“ peidab manuse ainult loendist.** Fail säilitatakse serveris tõendina (kaust `training-files/` andmekataloogis). Varunda ka see kaust; see ei kuulu JSON-andmete ekspordi hulka.
- Iga üleslaadimine ja eemaldamine registreeritakse auditilogis.

**Osalemise kinnitus (PDF):** nupp „Osalemise kinnitus (PDF)“ vahekaardil „Tõendid“ (kaardil) ja koolituse vormis.
- See on olemas **ainult koolitustel olekuga „Lõpetatud“**. Mis tahes muu oleku korral teatab süsteem, et see antakse välja pärast lõpetamist.
- **Üks kinnitus koolituse kohta** (mitte osaleja kohta): pealkiri, kategooria, kirjeldus, läbimise kuupäev, koolitaja/pakkuja, osalejad (väli „Määratud“), kohustuslik jah/ei, seotud meetmed, ettevõtte logo ja nimi. Rõhuvärv järgib kategooriat, keel järgib paigalduse vaikekeelt.
- **Kontrollkood** arvutatakse ID-st, pealkirjast, läbimise kuupäevast, koolitajast ja osalejatest (SHA-256, esimesed 12 märki). Kui need andmed muutuvad, muutub kood, nii et saate öelda, kas vanem kinnitus vastab veel koolituse praegusele seisule.
- **See on ettevõtte sisene kirje, mitte kolmanda isiku sertifikaat**; dokument ütleb seda. Sellel pole allkirja.
- Piirang: PDF-i kirjatüübil puuduvad ungari ő/ű; need kuvatakse kui ö/ü.
- Iga väljastamine registreeritakse auditilogis kontrollkoodiga.

---

## Edenemine ja mõõdikud

Koolituse ülevaade näitab:
- Katvuse määra kogu koolituse lõikes (siht: 100% kohustuslikust koolitusest)
- Planeeritud ja lõpetatud koolitust
- Koolitust liigi ja perioodi järgi

---

## Seos SoA-ga

Koolitusabinõusid saab siduda meetmete rakendamise tõendina, nt:
- ISO A.6.3 (turvateadlikkuse koolitus) → iga-aastane koolitus
- ISO A.8.7 (kaitse pahavara eest) → andmepüügi simulatsioon

---

## Märkus auditiks

ISO 27001 punkt 7.2 nõuab tõendeid, et töötajatel on vajalik pädevus.
Punkt 7.3 nõuab teadlikkust ISMS-i poliitikast ja isiklikust rollist selles.

Audiitor ootab:
1. Jooksva aasta koolituskava
2. Lõpetatud koolituse tõendeid (osalejate nimekirjad, tunnistused)
3. Katvuse määra, mis hõlmab kõiki asjakohaseid töötajaid

Soovitus: sisesta osalejate nimekiri ja lingid (http/https) välja „Tõend / märkused“ ning lisa tunnistused ja nimekirjad failidena jaotises „Manused“, et need oleksid auditi ajal kohe kättesaadavad. Vahekaardil „Tõendid“ näitab kaardil klõpsamine koolitust ainult vaatamiseks (muudatusi tehakse vahekaardil „Kava“); tõendi tekstis olevad lingid on klõpsatavad.
