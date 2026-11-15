# Modul: Adatvédelmi hatásvizsgálat (DPIA)

> A DPIA leír egy tervezett adatkezelést, értékeli az érintettekre háruló kockázatokat, és intézkedéseket határoz meg. Az **adatkezelő maga készíti el**, az **adatvédelmi tisztviselő (DPO) átvizsgálja**, és véleményt ad. Az ISMS Builder sablonokat, előzetes vizsgálatot, felülvizsgálati folyamatot és nyomtatási nézetet kínál. A modul többi része az „Modul: GDPR (adatvédelem)” útmutatóban található.

> **Megjegyzés:** Minden sablon és az előzetes vizsgálat gyakorlatias, de **gondosan hozzá kell igazítani a saját vállalkozásához**. **Nem jogi tanácsadás**, és nem is értelmezhető annak; nem helyettesítik az Ön egyedi esetének értékelését, sem a DPO általi felülvizsgálatot. A felügyeleti hatóságok nemzeti listáit Ön maga ellenőrzi.

---

## Ki mit csinál?

| Szerepkör | Feladat |
|---|---|
| Szakterület / adatkezelő (**Content Owner** szerepkörtől) | elvégzi az előzetes vizsgálatot, kiválasztja a sablont, kitölti a DPIA-t, és felülvizsgálatra benyújtja |
| **DPO** (a *DPO* funkciójú fiók vagy rendszergazda) | átvizsgálja a DPIA-t, és rögzíti a **véleményt** |
| Felelős vezetés (Content Owner) | meghozza a **döntést**, indokolja, és jóváhagyja a DPIA-t |

A DPO **nem a szerző**. Véleményt csak a *DPO* funkciójú fiókok és a rendszergazdák rögzíthetnek; a kiszolgáló menti a személyt és a dátumot.

**Demó:** a demókészlet erre két külön fiókot tartalmaz rendszergazdai jogok nélkül: a **carla** (`carla@security.example` / `carlapass`) CISO funkcióval és a **dana** (`dana@privacy.example` / `danapass`) DPO funkcióval. A folyamat kipróbálása: a DPIA-t a **carla** készíti elő, a véleményt a **dana** rögzíti, a jóváhagyást a **carla** végzi. A **carla** nem rögzíthet véleményt.

---

## A menet hat lépésben

1. **GDPR → DPIA → Előzetes vizsgálat: szükséges-e DPIA?** Jelölje be, ami az Ön adatkezelésére igaz (lásd lent). Az eredmény a DPIA-val együtt mentésre kerül.
2. **Tovább sablonnal**, vagy bármikor **Sablon használata**: válassza ki az adatkezelés típusát. Az űrlap előre kitöltődik.
3. **Kitöltés:** leírás (cél, érintettek, adatkategóriák, címzettek, tárolási hely, időtartamok), szükségesség és arányosság, meglévő intézkedések, a **kockázatok intézkedéseikkel** és a **maradványkockázat**. A sablonokban szereplő valószínűség és hatás (1–5) javaslat: ellenőrizze és módosítsa. Az intézkedések soronként egy-egy a kockázat alatt állnak.
4. Állítsa az állapotot **Felülvizsgálat**ra. A DPO elolvassa a DPIA-t.
5. **A DPO véleménye:** a DPO bejelöli a **DPO bevonva** jelölőnégyzetet, és rögzíti a **véleményt**.
6. **Döntés és jóváhagyás:** válassza ki a döntést (folytatás, módosítás, elutasítás), indokolja, majd állítsa az állapotot **Jóváhagyott**ra.

Ezt követően: nyomtatás vagy iktatás a **PDF** gombbal (a cég logója a fejlécben, a DPO véleménye személlyel és dátummal, jóváhagyás), és a DPIA felülvizsgálata az adatkezelés változásakor.

---

## Előzetes vizsgálat: szükséges-e DPIA?

Az előzetes vizsgálat először a **GDPR 35. cikk (3) bekezdése szerinti eseteket** kérdezi. Ha valamelyik fennáll, DPIA szükséges:

- Természetes személyek személyes jellemzőinek szisztematikus és kiterjedt értékelése automatizált adatkezelés alapján, a profilalkotást is beleértve, jogi hatással járó vagy őket hasonlóan jelentősen érintő döntésekkel
- Különleges személyes adatok (9. cikk) vagy büntetőjogi felelősség megállapítására és bűncselekményekre vonatkozó adatok (10. cikk) nagy számú kezelése
- Nyilvánosan hozzáférhető helyek szisztematikus, nagymértékű megfigyelése

Ezután a **WP 248 iránymutatás kilenc kritériuma** következik, amelyet az európai adatvédelmi hatóságok adtak ki. Ha **kettő vagy több** teljesül, általában DPIA szükséges:

1. Értékelés vagy pontozás (a profilalkotást és előrejelzést is beleértve)
2. Jogi vagy hasonlóan jelentős hatású automatizált döntések
3. Személyek szisztematikus megfigyelése
4. Érzékeny vagy rendkívül személyes adatok (pl. egészség, biometria, pénzügyek, tartózkodási hely)
5. Nagy léptékű adatkezelés (sok érintett, nagy adatmennyiség, nagy terület vagy hosszú időtartam)
6. Különböző forrásból származó adatállományok összevetése vagy egyesítése
7. Kiszolgáltatott személyek adatai (pl. munkavállalók, gyermekek, betegek)
8. Új vagy innovatív technológia alkalmazása (pl. AI, biometria, dolgok internete)
9. Az adatkezelés megakadályozza, hogy az érintettek jogot gyakoroljanak, illetve szolgáltatást vagy szerződést vegyenek igénybe

**Eredmény:**

- DPIA szükséges (GDPR 35. cikk (3) bekezdés).
- Valószínűleg DPIA szükséges (a WP 248 iránymutatás két vagy több kritériuma teljesül). Ha eltekint tőle, az indokokat dokumentálnia kell.
- A DPIA nem kötelező. Dokumentálja a vizsgálat eredményét, és ellenőrizze az országa felügyeleti hatóságának listáit.

Az országa felügyeleti hatóságának azokat a listáit, amelyek megnevezik, mikor szükséges vagy nem szükséges DPIA, Ön maga ellenőrzi. Aki eltekint a DPIA-tól, dokumentálja az indokokat, például egy archivált rekordban.

---

## A sablonok

A sablon létrehozza a leírási vázat, a jogalapokat, a jellemző kockázatokat intézkedésekkel és a javasolt értékeket. Cégadatot nem tartalmaz, kivéve a `{{COMPANY_NAME}}` helyőrzőt, amelyet a szervezeti adatokból töltünk ki (Admin → Szervezet). Felkínált adatkezelési típusok:

- **Felhőalapú HR-szoftver (személyügyi nyilvántartás és bérszámfejtés)**: Személyügyi nyilvántartás, bérszámfejtés és személyzetfejlesztés felhőalapú HR-szoftverrel.
- **Videó-megfigyelés**: Vagyon és személyek védelme, bűncselekmények felderítése meghatározott területeken.
- **Munkavállalók megfigyelése és helymeghatározása (munkaidő, tartózkodási hely, teljesítmény)**: Munkaidő-nyilvántartás, jármű- vagy eszközhelymeghatározás, használati és teljesítményelemzés.
- **AI-szolgáltatás személyes adatokkal (pl. asszisztens, chatbot, elemzés)**: AI-szolgáltatás használata feladatok támogatására, amelyek során személyes adatok kezelhetők.
- **Ügyfelek profilalkotása és pontozása**: Ügyfelek értékelése (hitelképesség, vásárlási szokások, szegmentálás) automatizált feldolgozás alapján.
- **Egészségügyi adatok (munkahelyi visszailleszkedés, üzemorvos)**: A munkavállalók egészségügyi adatainak kezelése, például betegség utáni visszatérés és munkaegészségügyi gondozás.
- **Biometrikus beléptetés és munkaidő-nyilvántartás**: Helyiségekbe vagy rendszerekbe való belépés, illetve munkaidő-nyilvántartás ujjlenyomattal, arccal vagy más biometrikus jellemzővel.
- **Bejelentési rendszer (visszaélés-bejelentési csatorna)**: Jogsértésekre vonatkozó bejelentések fogadása, vizsgálata és kezelése belső vagy külső csatornán keresztül.
- **Pályázatkezelés (opcionálisan AI-alapú előválogatással)**: Pályázatok fogadása, kiválasztása és kezelése, adott esetben automatizált előválogatással.

Amit Önnek kell kiegészítenie: az **Ön** adatkezelésének konkrét adatai (címzettek, szolgáltatók, tárolási hely, időtartamok, jogalap az egyedi esetben), a javasolt kockázatok és értékek ellenőrzése, valamint a ténylegesen megvalósított intézkedések.

---

## A jóváhagyás szabályai

| Szabály | Hatás |
|---|---|
| Új DPIA | nem hagyható jóvá azonnal |
| Vélemény | csak a *DPO* funkció vagy rendszergazda; a személy és a dátum mentésre kerül |
| Jóváhagyás | csak a **DPO bevonva** jelölővel és rögzített véleménnyel, **döntéssel**, valamint **magas vagy kritikus maradványkockázat** esetén **indokolással** vagy a **A felügyeleti hatóság előzetes konzultációja szükséges** jelöléssel |
| Jóváhagyási bélyeg | a személyt és a dátumot a kiszolgáló állítja be; az állapot visszaállításakor megszűnik |
| Auditnapló | a létrehozás, a módosítások és az állapotváltások naplózásra kerülnek |

A korábbi verziókban már jóváhagyott DPIA-k érvényesek maradnak; a szabályok a következő állapotváltáskor érvényesek.

**Hibaüzenetek:** „A jóváhagyáshoz az adatvédelmi tisztviselő véleménye szükséges” (hiányzik a vélemény), „A jóváhagyáshoz döntés szükséges”, „Magas maradványkockázat esetén …” (adjon hozzá indokolást, vagy jelölje be a felügyeleti hatóság konzultációját), „Az adatvédelmi tisztviselő véleményét csak az adatvédelmi tisztviselő vagy egy rendszergazda rögzítheti”.

---

## Nyomtatás

A **PDF** (a listában és az űrlapon) nyomtatási nézetet nyit a cég logójával, leírással, szükségességgel, a kockázati táblázattal intézkedésekkel, maradványkockázattal, a DPO véleményével, döntéssel és jóváhagyással. A nyomtatási párbeszédablakban PDF-ként is mentheti.
