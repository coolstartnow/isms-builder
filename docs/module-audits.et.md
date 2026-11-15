# Moodul: auditihaldus

> Planeeri, vii läbi ja jälgi audiitoid — kontrollnimekirjast tähelepanekuteni kuni iga-aastase
> auditikavani (ISO 27001 punkt 9.2, ISO 19011).

---

## Miks auditihaldus?

ISO 27001 nõuab siseauditeid kavandatud ajavahemike järel ja auditikava, mis määratleb sageduse,
meetodid, vastutused ja aruandluse. Moodul toob selle kokku: **audit** objektina,
**kontrollnimekirja punktid** tulemusega, nendest tulenevad **tähelepanekud** ja **auditikava** iga-aastase plaanina.

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Auditite ja auditikavade vaatamine | `reader` |
| Auditite, kontrollnimekirja punktide, auditikavade loomine ja muutmine | `auditor` või `contentowner` |
| Auditikava kinnitamine / tagasi mustandiks seadmine | `auditor` või `contentowner` |
| Jäädav kustutamine või taastamine prügikastist | `admin` |

Menüükirje **Auditid** on nähtav alates rollist `contentowner` ning funktsioonidele CISO, Revision ja QMB.
Administraatorid saavad mooduli välja lülitada jaotises **Haldus → Süsteem**.

---

## Auditi loomine

**Auditid → „Uus audit“**

- **Pealkiri**, **auditi liik** (sisene, väline, tarnijaaudit, sertifitseerimine) ja **olek**
  (planeeritud, töös, lõpetatud, tühistatud).
- **Standard / norm** ja **auditi ulatus**, mõjutatud **üksused** ning tarnijaauditite puhul **tarnija**.
- **Juhtaudiitor** ja **auditimeeskond**.
- **Planeeritud algus / lõpp**, **tegelik algus / lõpp** ja **järeltegevuse kuupäev**.
- **Auditikava**: seos iga-aastase plaaniga (valikuline).
- **Järeldus / tulemus**.

Iga audit saab viite **AUD-AAAA-NNNN**. Loendit saab filtreerida oleku, liigi ja aasta järgi.

---

## Kontrollnimekirja punktid

Auditi üksikasjad sisaldavad **kontrollnimekirja**. Igal punktil on

- **meetme viide** (valitakse SoA-st, valikuline),
- **küsimus / nõue**,
- **tulemus**: avatud, vastab, **mittevastavus** või ei kohaldu,
- **tõend** ja **märkused**.

Tulemust saab muuta otse reas. **Mittevastavuse** korral ilmub nupp
**„Loo tähelepanek“**: see loob tähelepaneku ja täidab selle eelnevalt (küsimus nõutava seisuna,
märkused tuvastatud seisuna, audiitor, auditiperiood, meetme seos). Punkti kohta luuakse ainult üks tähelepanek;
see seotakse seejärel punktis.

---

## Tähelepanekute seostamine auditiga

Kontrollnimekirja punktist loodud tähelepanekud kuuluvad automaatselt auditi juurde. Olemasolevaid tähelepanekuid saab
seostada (või lahti siduda) tähelepanekute vormis jaotises **Audit**. Auditi üksikasjad loetlevad kõik seotud tähelepanekud.

---

## Auditikava (iga-aastane plaan)

**Auditid → vahekaart „Auditikava“ → „Uus auditikava“**

Kavas on **aasta**, **eesmärgid** ja **ulatus** ning see saab viite **AP-AAAA-NNNN**. Auditid seotakse
auditi vormis (või otse kavas nupuga **„Lisa audit sellesse kavva“**). Kava vaade näitab auditeid
planeeritud alguse **kvartali järgi**; kuupäevata auditid ilmuvad eraldi rühmas.

**Kinnitamine:** **„Kinnita“** registreerib kava kasutaja ja kuupäevaga ning lukustab selle. Selle muutmiseks kasuta
**„Tagasi mustandisse“**.

---

## Kalender ja töölaud

**Kalender** näitab iga auditi planeeritud algust, planeeritud lõppu (kuni lõpetamiseni) ja järeltegevuse kuupäeva.
**Töölaud** näitab auditeid kokku, tähtaja ületanud, 30 päeva jooksul tähtajalisi ja avatud mittevastavusi.
Planeeritud või käimasolev audit on tähtaja ületanud, kui selle planeeritud lõpp on möödunud.

---

## Eksport

- **Auditite loend:** CSV ja PDF (arvestab aktiivseid filtreid).
- **Auditiaruanne:** auditi üksikasjades nupuga **„Auditiaruanne“** — põhiandmed, kontrollnimekiri, tähelepanekud ja järeldus PDF-ina.
- **Auditikava:** CSV ja PDF kvartaalse plaaniga.

PDF luuakse brauseri printimisdialoogi kaudu.

---

## Tähelepanekute tegevused

Igal tähelepanekul on **tegevuskava** (Aruanded → Auditi tähelepanekud → ava tähelepanek). `auditor` ja `contentowner` võivad luua või kustutada
tegevuse; igaüks alates rollist `editor` võib selle olekut muuta.

**Alates versioonist 1.80** on need tegevused keskse [abinõude registri](module-measures.et.md) kirjed: tähelepaneku tegevuskava näitab
neid nagu varem ja selle all loetleb plokk **„Abinõud (register)“** neid viite (`M-…`) ja olekuga. Sama abinõu saab
registris lisaks siduda meetmete ja riskidega. Kui tegevuskavas kustutatakse tegevus, mis on veel mujal seotud,
eemaldatakse ainult seos selle tähelepanekuga.

---

## Prügikast

Kustutatud auditid ja auditikavad jäävad prügikasti 30 päevaks (**Haldus → Prügikast**) ning administraatorid saavad need taastada või
jäädavalt kustutada.

---

## Raamistikud: ISO, NEN 7510, TISAX

Kontrollnimekirja punkt võib viidata mis tahes SoA kontrollile — ka oma rühmade kontrollidele, näiteks NEN 7510 või TISAX (tunnus on välja „Kontroll“ soovituste loendis). Auditimoodul toetab sisemiste auditite planeerimist, läbiviimist ja järeltegevust; see ei asenda ei sertifitseerimist ega TISAXi hindamist.

> **Õiguslik märkus:** ISO 27001/9000/9001, NEN 7510 ja TISAXi hindamiskataloogide (VDA ISA) standarditekstide suhtes kehtivad nende väljaandjate õigused (autoriõigus ja kaubamärgiõigus) ning ISMS Builder neid kaasa ei anna. Demoandmete näidiskontrollid on meie enda väljamõeldud kohatäitetekstid, millel puudub seos standardite sõnastusega — need on puudulikud ning ei sobi ei sertifitseerimiseks ega TISAXi hindamisteks. Importige ainult tekste, mille kasutamiseks teil on õigus. See ei ole õigusnõustamine.

## Märkus auditiks

Kõik muudatused registreeritakse auditilogis. Auditihaldus ei asenda sertifitseerimisorgani auditiaruannet,
kuid pakub tõendeid planeerimise, läbiviimise ja järeltegevuse kohta ISO 27001 punkti 9.2 alusel.
