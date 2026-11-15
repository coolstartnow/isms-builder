# Moodul: organisatsioon ja ettevõtte logo

> Siin määratlevad administraatorid, kes organisatsioon on: nimi, vastutused, keeled, teavitused,
> teenused ja **ettevõtte logo**, mis ilmub sisselogimislehel, poliitikate PDF-ides ja prindivaadetes.

---

## Kust seaded leiab?

**Haldus → Organisatsioon.** Valdkond on nähtav ainult administraatoritele. Muudatused rakendatakse nupuga **Salvesta** üleval paremal; ettevõtte logo seevastu salvestatakse **kohe üleslaadimisel**.

| Jaotis | Sisu |
|---|---|
| **Üldteave** | Organisatsiooni nimi, lühend, logo tekst, **ettevõtte logo**, ISMS-i kohaldamisala |
| **Vastutused** | CISO, andmekaitsespetsialist (GDPO) ja ICS-i kontakt nime ja e-postiga |
| **Turvapoliitikad** | Kahefaktorilise autentimise nõue kogu süsteemis (sisselogimine ilma TOTP-ta on siis blokeeritud) |
| **Keelte seadistus** | Lubatud keeled (DE, EN, FR, NL, HU) ja sisselogimislehe vaikekeel |
| **E-posti teavitused** | Üldlüliti ja üksikud teavituse liigid |
| **SMTP seadistus** | Meiliserver teavituste ja poliitikate kinnituste jaoks |
| **WebDAV-i avaldamine** | Kinnitatud poliitikate automaatne salvestamine Nextcloudi/ownCloudi |
| **Menüü järjekord** | Külgriba menüükirjete järjekord |
| **Organisatsiooniüksused** | IT-struktuur (CIO, kontsern/keskne, kohalik), mida kasutatakse vastutuste jaoks kõigis moodulites |

SMTP ja WebDAV-i paroolid on **ainult kirjutatavad**: server ei näita neid enam kunagi, isegi mitte administraatoritele. Tühi väli jätab salvestatud parooli muutmata; selle eemaldamiseks on eraldi valik.

---

## Ettevõtte logo

Ettevõtte logo annab ametlikele dokumentidele teie organisatsiooni ilme.

### Üleslaadimine

1. **Haldus → Organisatsioon → Üldteave**, rida **Ettevõtte logo**.
2. Vali fail. See salvestatakse kohe ja kuvatakse eelvaatena.
3. Asendamiseks vali uus fail; eemaldamiseks klõpsa **Eemalda logo**.

| Reegel | Väärtus |
|---|---|
| Vormingud | **PNG** või **JPEG** |
| Suurus | kuni **512 kB** ja **4000 pikslit** küljel |
| Pole lubatud | SVG ja kõik muud vormingud. SVG võib sisaldada skripte ja lükatakse seetõttu tahtlikult tagasi |

Failitüüp kontrollitakse faili sisu järgi, mitte laiendi ega brauseri väite järgi. Parim on **horisontaalne logo läbipaistva või valge taustaga**; kuni umbes 840 × 400 pikslit piisab kõigi väljundite jaoks.

### Kus logo ilmub

| Koht | Kuvamine |
|---|---|
| **Sisselogimisleht** | sisselogimisvormi kohal, heledal plaadil (et tumedad logod jääksid loetavaks) |
| **Poliitika PDF** | väikesena esimese lehe paremas ülanurgas, pealkiri algab selle all |
| **Prindivaated** | paremal üleval aruannete, riski-, tähelepaneku- ja abinõuülevaadete, auditiväljundite ning dokumendi ekspordi prindiakendes |

Ei mõjuta: rakenduse päist ja mobiilirakendust. Kui logo puudub, jäävad kõik väljundid endiseks, lihtsalt ilma pildita.

Kes võib logo **näha**: kõik, kes pääsevad sisselogimislehele (see näitab seda). Kes võib seda **muuta**: ainult administraatorid; iga muudatus registreeritakse auditilogis.

### Demo ja tootmine

- **Demorežiimis** tarnitakse ISMS Builder oma logoga. See määratakse demoandmete laadimisel, kuid ainult siis, kui oma logo pole olemas.
- **Tootmisse lülitumisel** (Haldus → Hooldus → Demo lähtestamine) eemaldatakse demologo. Teie ise üles laaditud logo jääb.
- Pärast seda tuletab ISMS Builder meelde **ettevõtte logo määramist**: lähtestamise tulemuses, sisselogimislehe teates, töölaua ülaosas (administraatoritele) ja seadetes. Teade kaob niipea, kui logo on üles laaditud.

### Varundus

Logo on fail andmekataloogis (`org-logo.png` või `org-logo.jpg` koos `org-logo.json`), sõltumatu valitud salvestuse taustasüsteemist. See **ei kuulu** JSON-andmete ekspordi hulka; andmekataloogi varukoopia sisaldab seda.

---

## Näpunäited

- Lae logo üles **enne** esimest poliitika PDF-i. Juba loodud PDF-id ei muutu.
- Kui logo paistab PDF-is hägune, kasuta suuremat faili (kuni 4000 pikslit), mis on siiski kuni 512 kB.
- Pärast üleslaadimist laadi leht uuesti, kui avatud brauseri vahekaart näitab veel vana logo.
