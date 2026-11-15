# Modul: AI-vázlatok (szabályzat-asszisztens)

> A címlista egy dokumentumából másodpercek alatt szövegvázlat készül, amelyet Ön ellenőriz, módosít és ment. **Két út** van:
> a **közvetlen** út a csatlakoztatott AI-n (Ollama) keresztül, és a **másolás-beillesztés** útja egy tetszőleges AI-val. Mindkettő ugyanazt az ellenőrzött szöveget használja,
> és mindkét esetben a helyőrzők automatikusan kitöltődnek a szervezet adataival.

> **Megjegyzés a sablonokhoz:** A lista címei gyakorlatias javaslatok. Minden vázlatot **gondosan hozzá kell igazítani a saját vállalkozáshoz**, és szakmailag ellenőrizni kell. **Nem jogi tanácsadás**, és nem is értelmezhető annak.

---

## A legfontosabb dolgok áttekintése

| | A út: közvetlen | B út: másolás-beillesztés |
|---|---|---|
| Ki írja a szöveget? | a csatlakoztatott AI (Ollama, általában a saját szerveren) | egy tetszőleges AI (web, alkalmazás, vállalati AI) |
| Beállítás | Rendszergazda: Admin → Karbantartás → AI-integráció (Ollama) | nincs |
| Mit tesz Ön | kattintás a **Vázlat készítése** gombra | **Szöveg másolása**, beillesztés az AI-ba, a válasz beillesztése a szerkesztőbe |
| Helyőrzők | azonnal kitöltődnek | beillesztéskor töltődnek ki (vagy a **Helyőrzők kitöltése** gombbal) |
| Hová kerül a szöveg? | csak az Ön Ollama-címére (a párbeszédablakban látható) | oda, ahová beilleszti: **ezért Ön felel** |

Mindkét esetben a szöveg **vázlat**. Mentés és jóváhagyásra küldés előtt ellenőrizze szakmailag.

---

## Közös alapok

### A „Vázlat készítése AI-val” párbeszédablak

Nyisson meg egy dokumentumot, vagy hozzon létre újat (Létrehozás), és kattintson a szerkesztő eszköztárában a **Vázlat készítése AI-val** gombra (**Content Owner** szerepkörtől). A párbeszédablakban kiválaszthatja:

1. A **dokumentumot** a listából. Csak a megnyitott dokumentum típusához illő dokumentumok jelennek meg (a *Policy* esetén például: információbiztonsági szabályzat, jelszószabályzat, mentési szabályzat …).
2. A szöveg **nyelvét**: a **szervezete által kiválasztott nyelvek** (Admin → Szervezet → Nyelvkonfiguráció; ha mind ki van választva, mind felkínálásra kerül). Előre ki van választva a felület nyelve. A kérés szövege a kiválasztott nyelven készül, és nem kell utólag szerkeszteni. Ha csak egy nyelv van kiválasztva, ez az egyetlen lehetőség, és a választó nem jelenik meg.
3. **Megjegyzés (nem kötelező)**, legfeljebb 200 karakter, pl. „NIS2, távmunka”.

A mezők alatt a párbeszédablak **pontosan azt a szöveget mutatja, amelyet elküldünk vagy kimásolunk**, valamint a célt. Minden beírásnál frissül.

**A címlista** 149 tételes, dokumentumtípus szerint rendezve. Lefedi az ISO 27001 és az NIS2 szerinti ISMS szokásos dokumentumait, és kifejezetten tartalmaz sablonokat a **mesterséges intelligenciához** (használat, az AI által generált tartalom megjelölése az EU AI Act átláthatósági kötelezettsége szerint, AI által generált képek, hang- és videótartalmak, irányítás és kockázati osztályozás, AI-ismeretek, bizalmas adatok AI-szolgáltatásokban, AI-rendszerek beszerzése, emberi felügyelet, AI-incidensek). Szándékosan **nincs szabad címmező**, hogy ne kerüljön név vagy cégadat a kérésbe. Ha hiányzik egy dokumentum, kérjük, javasolja.

**Szabályzatok (Policy)** (38): Információbiztonsági szabályzat; Elfogadható használati szabályzat; Hozzáférés-szabályozási szabályzat; Jelszószabályzat; Mentési szabályzat; Kriptográfiai szabályzat; Távmunka-szabályzat; Beszállítói biztonsági szabályzat; Tiszta asztal és tiszta képernyő szabályzat; Mobil eszközök szabályzata; Információosztályozási szabályzat; A mesterséges intelligencia használatának szabályzata; Az AI által generált tartalom megjelölésének szabályzata; Az AI által generált képek, hang- és videótartalmak szabályzata; AI-irányítási és kockázati osztályozási szabályzat; A munkatársak AI-ismereteinek szabályzata; A bizalmas adatok kezelésének szabályzata AI-szolgáltatásokban; AI-rendszerek beszerzésének és értékelésének szabályzata; Adatvédelmi szabályzat; Megőrzési és törlési szabályzat; Fizikai biztonsági szabályzat; BYOD-szabályzat (saját eszközök); E-mail- és internethasználati szabályzat; Közösségi média szabályzat; Felhőhasználati szabályzat; Hálózatbiztonsági szabályzat; Sérülékenységkezelési szabályzat; Naplózási és felügyeleti szabályzat; Biztonságos szoftverfejlesztési szabályzat; Eszközkezelési szabályzat; Biztonságtudatossági és képzési szabályzat; Humánerőforrás-biztonsági szabályzat; Üzletmenet-folytonossági szabályzat; Kiemelt jogosultságú hozzáférések szabályzata; Cserélhető adathordozók szabályzata; Az információbiztonsági szerepek és felelősségek szabályzata; OT/ICS biztonsági szabályzat; Termékbiztonsági szabályzat (Cyber Resilience Act).

**Eljárások (Procedure)** (63): Változáskezelési eljárás; Belépési, áthelyezési és kilépési eljárás; Javításkezelési eljárás; Hozzáférési jogosultságok felülvizsgálati eljárása; Adat-helyreállítási eljárás; Sérülékenységkezelési eljárás; Koordinált sebezhetőség-közzétételi eljárás; Eszköznyilvántartási eljárás; Naplóelemzési eljárás; Az érintetti kérelmek kezelésének eljárása; Belső auditi eljárás; Vezetőségi átvizsgálás eljárása; Dokumentumkezelési eljárás; Korrekciós intézkedések és folyamatos fejlesztés eljárása; Beszállítói értékelési eljárás; Adathordozók biztonságos megsemmisítésének eljárása; Kriptográfiai kulcskezelési eljárás; Kockázatértékelési és -kezelési eljárás; Üzleti hatáselemzési eljárás; Katasztrófa-helyreállítási eljárás; AI-rendszerek nyilvántartásának és kockázati osztályozásának eljárása; Az AI-rendszerek emberi felügyeletének eljárása; AI-felhasználási esetek jóváhagyási eljárása; Konfigurációkezelési eljárás; Kapacitáskezelési eljárás; Kártevők elleni védelem eljárása; Penetrációs tesztelési és biztonsági vizsgálati eljárás; Hozzáférési jogosultságok kiadásának és visszavonásának eljárása; Kiemelt és vészhelyzeti hozzáférések eljárása; Jelszó-visszaállítási eljárás; Jelöltek és munkatársak ellenőrzési eljárása; Eszközök és hozzáférések visszaadásának eljárása; Látogatókezelési eljárás; Fizikai beléptetési eljárás; Adathordozók kezelésének eljárása; Információk megjelölésének és kezelésének eljárása; Biztonságos adattovábbítási eljárás; Új beszállítók felvételének eljárása; Beszállítói kapcsolat megszüntetésének eljárása; Adatvédelmi hatásvizsgálati eljárás; Az adatkezelési tevékenységek nyilvántartásának vezetési eljárása; Hozzájárulások kezelésének eljárása; Személyes adatok törlésének eljárása; Adatfeldolgozói szerződések megkötésének eljárása; Biztonsági események bejelentési és értékelési eljárása; Bizonyítékgyűjtési és digitális törvényszéki eljárás; Incidensek utólagos értékelésének eljárása; Üzletmenet-folytonossági tervek gyakorlásának és tesztelésének eljárása; Mentések ellenőrzési eljárása; Az információbiztonság mérésének és jelentésének eljárása; Jogi és szabályozási követelmények azonosításának eljárása; Kompetenciafelmérési és képzési eljárás; Eltérések és nemmegfelelőségek kezelésének eljárása; Kivételkérelmi eljárás; Felhőszolgáltatások jóváhagyásának eljárása; Szoftverek jóváhagyásának és telepítésének eljárása; Kódáttekintési és biztonsági tesztelési eljárás; Tanúsítványkezelési eljárás; Távoli hozzáférési eljárás; Adatirányítási eljárás az AI-hoz; AI-rendszerek tesztelésének és felügyeletének eljárása; Az AI-használatról szóló tájékoztatás eljárása; Az AI által generált tartalom megjelölésének eljárása.

**Kockázati szabályzatok (Risk Policy)** (20): Kockázatkezelési szabályzat; Kockázatvállalási és kockázati kritériumok szabályzata; AI-rendszerek kockázatkezelési szabályzata; Ellátási lánc és harmadik felek kockázatkezelési szabályzata; Kockázatértékelési módszertani szabályzat; Kockázatvállalási hajlandóság és tűréshatár szabályzata; Kockázatkezelési terv szabályzata; Kockázati nyilvántartás szabályzata; Kockázatjelentési és eszkalációs szabályzat; Kockázati felelősök szabályzata; Kockázatfigyelési és felülvizsgálati szabályzat; Adatvédelmi kockázatkezelési szabályzat; Kiberkockázat-kezelési szabályzat (NIS2); Projektkockázat-kezelési szabályzat; Változásokkal kapcsolatos kockázatértékelési szabályzat; Üzletmenet-folytonossági kockázatok szabályzata; Bennfentes kockázatok kezelési szabályzata; Maradványkockázatok és kockázati kivételek szabályzata; AI-hatásvizsgálati szabályzat; Eszközértékelési és védelmi igény szabályzata.

**Incidensek (Incident)** (7): Incidenskezelési eljárás; Adatvédelmi incidens kezelési eljárása; Jelentős incidensek bejelentési eljárása (NIS2); Zsarolóvírus-incidens kezelési eljárása; Eszköz elvesztése vagy ellopása esetén követendő eljárás; AI-rendszerekkel kapcsolatos incidensek eljárása; Válságkommunikációs terv.

**Kiadások (Release)** (4): Kiadási és jóváhagyási eljárás; Sürgősségi változtatások eljárása; AI-rendszerek és modellek kiadási eljárása; Szoftverkiadási eljárás biztonsági felülvizsgálattal.

**Alkalmazhatóság (SoA)** (2): Alkalmazhatósági nyilatkozat (SoA); Az alkalmazhatósági nyilatkozat karbantartásának eljárása.

**BCM-tervek (BCM Plan)** (9; csak a BCM-modulban, Tervek fül, „Eljárások” mező): Általános üzletmenet-folytonossági terv; Informatikai katasztrófa-helyreállítási terv; Kibertámadás és zsarolóvírus; Áramkimaradás; Épület- és telephely-kiesés; Kritikus beszállító kiesése; Járvány és jelentős munkaerőhiány; Válságkommunikáció; Az adatközpont újraindítása.

**BCM-gyakorlatok (BCM Exercise)** (6; csak a BCM-modulban, Gyakorlatok fül, „Forgatókönyv és menet” mező): Asztali gyakorlat: zsarolóvírus; Az adatmentés visszaállítási tesztje; Kitelepítés és telephely-kiesés; Beszállítói kiesés; A riasztási lánc tesztje; Áramkimaradás-gyakorlat.

### Mi kerül elküldésre, és mi nem

A szöveg kizárólag ezekből áll: az AI-nak szóló rögzített utasítás, a listából vett típus és cím, típusonkénti felépítési útmutató, a célnyelv, a kérés, hogy **kitalált adatok helyett helyőrzőket** használjon, és az Ön megjegyzése. **A cégnevek, személynevek, címek és a telepítés rendszeradatai soha nem szerepelnek benne.**

A **megjegyzés** az egyetlen szabad szöveges mező, és ellenőrizzük:

- Engedélyezett: betűk, számjegyek, szóköz és `, . ; : ( ) / & + -`. Sortörés és idézőjel nem lehetséges.
- **Blokkolva** (nem kerül elküldésre vagy másolásra semmi, a párbeszédablak megnevezi a találatot): e-mail-címek, web- és domainnevek, IP- és MAC-címek, IBAN-ok, telefonszámok, hosszú számok (hat számjegy vagy több, pl. ügyfélszámok), UUID-k, kulcsok és tokenek, fájlútvonalak, @nevek, cégmegnevezések, mint a GmbH, AG vagy Ltd, és **a szervezeti adatok értékei** (a szervezet neve, rövidítés, a CISO és az adatvédelmi tisztviselő neve).
- **Korlát:** a szűrő tetszőleges személy- vagy cégneveket nem tud felismerni. Ezért ne írjon neveket a megjegyzésbe.

### Helyőrzők

Cégadatok kitalálása helyett az AI helyőrzőket ír. Ezeket a szervezeti adatokból cseréljük le:

| Helyőrző | Erre cseréljük | Hol kezeli az értéket |
|---|---|---|
| `{{COMPANY_NAME}}` | a szervezet neve | Admin → Szervezet → Általános információk → *Szervezet neve* |
| `{{ISMS_OWNER}}` | az ISMS felelősének neve | Admin → Szervezet → Felelősségek → *CISO / ISB neve* |
| `{{DATA_PROTECTION_OFFICER}}` | az adatvédelmi tisztviselő neve | Admin → Szervezet → Felelősségek → *Adatvédelmi tisztviselő (DPO) neve* |
| `{{ISMS_SCOPE}}` | az ISMS hatóköre | Admin → Szervezet → Általános információk → *ISMS hatókör* |

- Felismerjük a `[COMPANY_NAME]` írásmódot, a kis- és nagybetűs változatot, valamint a zárójelen belüli szóközöket is (`{{ company name }}`).
- **Ha az érték üres a szervezeti adatokban, a helyőrző a szövegben marad**, és egy értesítés megnevezi. Adja meg az értéket, és kattintson a **Helyőrzők kitöltése** gombra.
- A szöveg más zárójelei (`{x}`, `[itt]`) érintetlenek maradnak. Csak ezt a négy helyőrzőt cseréljük.

---

## A út: közvetlenül a csatlakoztatott AI-n keresztül

### Beállítás (egyszer, rendszergazda)

1. **Admin → Karbantartás → AI-integráció (Ollama).**
2. Kapcsolja be az **AI-keresés engedélyezése** kapcsolót. Ez az összes AI-funkció globális kapcsolója, a vázlatokéi is.
3. Adja meg az **Ollama URL-t**. Üresen `http://localhost:11434`.
4. Adja meg a **Generálási modellt (AI Policy Assistant)**. Üresen `llama3.2:3b`. A modellnek léteznie kell az Ollama-kiszolgálón.
5. Szükség esetén adja meg az **API-kulcsot**, ha az MI címe megköveteli, vagy ha fel szeretné ismerni a kéréseket egy előtte álló átjáró naplójában (részletek: adminisztrációs konzol → AI-integráció). A kulcs többé nem jelenik meg.

### Menet

1. Nyissa meg a **Vázlat készítése AI-val** párbeszédablakot, válassza ki a dokumentumot, a nyelvet és szükség esetén a megjegyzést.
2. Ellenőrizze a megjelenített szöveget és a célt. Ha a megjegyzésben találat van, a **Vázlat készítése** gomb zárolva van a javításig.
3. Kattintson a **Vázlat készítése** gombra. Ha a szerkesztőben már van szöveg, az ISMS Builder felülírás előtt rákérdez.
4. A vázlat a szerkesztőben van, a helyőrzők kitöltve. Ha a címmező üres, a lista címe kerül bele. A nyitva maradt helyőrzőket jelezzük.
5. Ellenőrzés, módosítás, **Mentés**. A dokumentum *Vázlat* állapotban marad.

A létrehozás akár 60 másodpercig is tarthat. Az auditnapló rögzíti, ki melyik dokumentumot milyen nyelven hozta létre (és hogy használt-e megjegyzést, annak szövegét nem).

### Ha nem sikerül

| Üzenet | Jelentés és teendő |
|---|---|
| A közvetlen AI-kapcsolat ki van kapcsolva | A kapcsoló az Admin → Karbantartás alatt ki van kapcsolva. Kapcsolja be, vagy használja a B utat. |
| Az Ollama nem érhető el | Hibás cím, az Ollama nem fut, vagy a tűzfal blokkolja. Ellenőrizze az Ollama URL-t. |
| Az Ollama HTTP … kóddal válaszolt | Az Ollama hibát jelzett, például mert a modell nem létezik ott. Ellenőrizze a modell nevét és az Ollamát. |
| Üres vagy túl rövid válasz | A modell nem adott használható szöveget. Próbálja újra, vagy adjon meg nagyobb modellt. |
| Nem lett elküldve, a megjegyzés tartalmaz … | A szűrő személyes vagy technikai adatot talált. Módosítsa vagy ürítse ki a megjegyzést. |

---

## B út: másolás-beillesztés egy tetszőleges AI-val

Ehhez az úthoz nem kell beállítás, és akkor is működik, ha a közvetlen kapcsolat ki van kapcsolva (a párbeszédablak ilyenkor is megnyílik).

1. Nyissa meg a **Vázlat készítése AI-val** párbeszédablakot, válassza ki a dokumentumot, a nyelvet és szükség esetén a megjegyzést.
2. Kattintson a **Szöveg másolása** gombra (vagy jelölje ki és másolja ki a megjelenített szöveget). Ha a megjegyzésben találat van, a gomb zárolva van.
3. A tetszőleges AI-ban illessze be **csak ezt a szöveget**, és küldje el. Ne egészítse ki cég- vagy személyes adatokkal: pontosan erre valók a helyőrzők.
4. Másolja ki az **AI válaszát**, lehetőleg csak a Markdown-szöveget, **a nélkül** a három visszafelé dőlő idézőjeles (```) sor nélkül, amelyet egyes AI-k a szöveg köré tesznek.
5. **Illessze be** a dokumentum szerkesztőjébe (Ctrl+V). Ha a szöveg helyőrzőket tartalmaz, az ISMS Builder azonnal lecseréli őket, és jelzi, hányat cserélt, és melyek maradtak nyitva.
6. Már volt szöveg a szerkesztőben? Kattintson a **Helyőrzők kitöltése** gombra, ez a teljes szövegben cserél.
7. Ellenőrzés, módosítás, **Mentés**.

**Adatvédelem a B útnál:** A kimásolt szöveg nem tartalmaz a szervezetre vonatkozó adatot, és a szűrő ellenőrizte a megjegyzést. Hogy a tetszőleges AI mit kezd vele, az annak feltételeitől függ. Olyan szolgáltatásokat használjon, amelyeket a szervezete ilyen tartalomra jóváhagyott. A válasz beillesztése az ISMS Builderbe helyben cseréli a helyőrzőket; a szervezet neve eközben nem kerül sehová.

---

## Kérdések és válaszok

**Miért áll még a szövegemben `{{COMPANY_NAME}}`?** Az érték hiányzik a szervezeti adatokból, vagy a szöveg nem beillesztéssel került a szerkesztőbe (például egérrel húzással). Adja meg az értéket, és kattintson a **Helyőrzők kitöltése** gombra.

**Az AI saját helyőrzőket használt, például `[Cégnév]`.** Ezeket nem cseréljük automatikusan, mert az ISMS Builder csak a négy helyőrzőt ismeri. Kérje meg az AI-t, hogy pontosan a kimásolt szövegben szereplő helyőrzőket használja, vagy cserélje ki a helyeket kézzel.

**Ki teheti ezt?** A párbeszédablak és a közvetlen út a *Content Owner* szerepkörtől (ugyanaz a jogosultság, mint a dokumentum létrehozásához). A **Helyőrzők kitöltése** és az automatikus csere beillesztéskor az *Editor* szerepkörtől.

**Szabadon választhatok címet?** A vázlathoz nem. A szöveg beillesztése után a szerkesztő címmezőjét a szokott módon módosíthatja.

**Érvényes ez a mobilalkalmazásra is?** Ott a közvetlen kapcsolat nem létezik. Az AI-alkalmazásnak való átadás az Android megosztás menüjén keresztül tervben van.
