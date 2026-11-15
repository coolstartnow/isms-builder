# Modul: Szállítókezelés

> Az információs vagyonelemekhez hozzáféréssel rendelkező szállítókat és
> szolgáltatókat értékelni és nyomon kell követni — ISO 27001 A.5.19–A.5.22.

---

## Miért szükséges a szállítókezelés?

Számos biztonsági incidens harmadik felektől ered, akik hozzáférnek rendszerekhez
vagy adatokhoz (ellátási lánc elleni támadások, nem biztonságos SaaS-szolgáltatások,
ellenőrizetlen alvállalkozók). Az ISO 27001 ezért szisztematikus megközelítést ír elő
a szállítói kockázatok kezelésére.

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Szállítók megtekintése | `reader` |
| Szállítók létrehozása és szerkesztése | `editor` |
| Szállítók törlése / visszaállítása | `admin` |

---

## Szállító létrehozása

**Szállítók → „+ Új szállító"**

Mezők:
- **Név** — cégnév
- **Kategória** — pl. IT-szolgáltató, felhőszolgáltató, karbantartó cég
- **Kapcsolattartó** — kapcsolattartó személy, e-mail
- **Hozzáférési szint** — melyik rendszerekhez/adatokhoz fér hozzá a szállító?
- **Kockázati besorolás** — `alacsony` / `közepes` / `magas` / `kritikus`
- **Státusz** — `aktív` / `inaktív` / `felülvizsgálat_alatt`
- **Következő felülvizsgálat** — mikor esedékes a soron következő értékelés?
- **Biztonsági követelmények** — milyen követelményekben állapodtak meg?
- **Bizonyítékok** — rendelkezésre áll-e ISO-tanúsítvány, SOC 2 jelentés vagy adatfeldolgozói megállapodás (DPA)?

---

## Igazolás hivatkozása és lejárati dátum

A szállítói űrlapon megadhat egy **igazolás-hivatkozást**, például a szállító ISO 27001 tanúsítványára vagy SOC-jelentésére, valamint azt, hogy **meddig érvényes az igazolás**.

- **Igazolás hivatkozása** — egy Ön által kezelt dokumentum címe (pl. SharePoint vagy a szállítói portál). Csak a `http://` vagy `https://` előtaggal kezdődő címek fogadhatók el.
- **Megnevezés** — rövid szöveg a hivatkozáshoz, pl. „ISO 27001 tanúsítvány”.
- **Az igazolás érvényes eddig** — az igazolás lejáratának napja.

Az ISMS Builder csak a hivatkozást tárolja. A hivatkozást soha nem nyitja meg, és nem ellenőrzi sem az elérhetőséget, sem a dokumentum tartalmát vagy érvényességét; az ellenőrzés az Ön feladata. A lejárat napján **„Szállítói igazolás lejár”** bejegyzés jelenik meg a naptárban, 60 nappal előtte és lejárat után is, amíg a szállító nem „inactive” vagy „terminated”. A szállítói listában az „Igazolás” oszlop mutatja a hivatkozást, és megjelöli a lejárt igazolásokat.

---

## Szállítói értékelés e-mailben

Kritikus szállítók esetén **biztonsági kérdőív** küldhető anélkül, hogy a szállítónak
fiókra lenne szüksége:

**Szállító megnyitása → „Értékelés küldése"**

A szállító személyre szóló hivatkozást kap, és a kérdőívet közvetlenül a böngészőben
tölti ki. A válaszok rögzítésre kerülnek és a szállítói profilhoz rendelődnek.

---

## Kérdőívsablonok és NIS2-katalógus

A **Szállítók → Kérdőívsablonok** menüpontban határozza meg, mely kérdésekre kell a szállítónak válaszolnia. Ez szállítónként vagy szolgáltatástípusonként eltérhet.

- **Katalógusok:** „Standard” (19 kérdés, ISO 27001) és „NIS2 szállítói értékelés” (56 kérdés 13 szakaszban, a (EU) 2022/2555 irányelv 20. cikke, 21. cikk (2) bekezdés a)–j) pontja és 23. cikke szerint tagolva). A kérdések saját megfogalmazásúak, nem hivatalos ellenőrzőlista és nem jogi tanács. A NIS2-katalógus német és angol nyelven érhető el; más nyelveken a kérdések angolul jelennek meg.
- **Saját sablonok:** kérdésenként választhatja, hogy szerepel-e, **kötelező**-e, és hogy az igen/nem kérdéshez tartozik-e **megjegyzés mező** (pl. igazoló hivatkozáshoz). A szakaszok egészben be- vagy kikapcsolhatók; saját kérdéseket is hozzáadhat. A beépített sablonok nem módosíthatók; a „Mentés új sablonként” segítségével saját változatot hozhat létre. A sablonokat a szerkesztők hozhatják létre és módosíthatják; az olvasók megtekinthetik.
- **Szállítónkénti módosítás:** az értékelési hivatkozás létrehozásakor sablont választ, és az adott szállítóra még módosíthatja a kijelölést. A kijelölés másolatként tárolódik; a sablon későbbi módosításai a már kiadott kérdőíveket nem érintik.
- A **kötelező kérdéseket** a szállító számára * jelöli, és a szerver is ellenőrzi. A régebbi kérdőívek a korábbiak szerint működnek.
- A megjegyzések és válaszok a szállító bevitelei, csak szövegként jelennek meg; a Builder a megjegyzésben megadott hivatkozást soha nem nyitja meg.

---

## Szállítói postaláda (a Builder belső marad)

A Builder belső használatra készült. Hogy a szállítók mégis maguk adhassanak információt anélkül, hogy a Buildernek elérhetőnek kellene lennie az internetről, létezik a **szállítói postaláda**: egy különálló kis szolgáltatás (`isms-supplier-portal` projekt), amely csak kérdőíveket és titkosított válaszokat tárol, és semmilyen ISMS-adatot nem ismer.

- **Menete:** a Builder *kimenő* kapcsolattal helyezi el a kérdőívet a postaládában. A szállító megnyitja a postaláda hivatkozását és kitölti; a böngészője **a küldés előtt titkosítja a válaszokat** (AES-256-GCM, a kulcs RSA-OAEP-256-tal az Ön nyilvános kulcsához kötve). A Builder *kimenő* kapcsolattal kéri le a válaszokat (5 percenként vagy a „Válaszok lekérése” gombbal), maga fejti vissza, majd törli a postaládából. A postaláda nem tudja elolvasni a válaszokat.
- **Beállítás (rendszergazda):** **Szállítók → Kérdőívsablonok → Szállítói postaláda:** cím (https), a postaláda API-kulcsa, kulcspár létrehozása, „Postaláda használata” bekapcsolása, kapcsolat tesztelése. A **privát kulcs** az adatkönyvtáron kívül van (`~/.config/isms-builder/supplier-portal.pem` vagy `SUPPLIER_PORTAL_KEY_FILE`, 600-as jogosultság), és **Önnek kell mentenie** — nélküle a beérkezett válaszok nem olvashatók. A kulcspár cseréjekor a régi kulcs másolatként megmarad. Ha a postaláda önaláírt tanúsítványt használ, a hitelesítésszolgáltatót a `NODE_EXTRA_CA_CERTS` változóval adja meg.
- **Kézbesítés:** értékelési hivatkozás létrehozásakor válassza a „A postaládán keresztül” vagy a „Közvetlenül” lehetőséget. A postaládán át menő kérdőíveket a Builder saját oldala már nem szolgálja ki. Ha a kérdőív nem helyezhető el a postaládában, nem jön létre.
- **Tartalék hálózat nélkül:** a „Fájl importálása” a postaládából származó válaszfájlt veszi át; ugyanúgy ellenőrzi.
- **Korlátok:** a titkosítás a postaládával szemben védi a bizalmasságot, de nem bizonyítja, ki küldte a választ: aki ismeri a hivatkozást, egyszer válaszolhat. A válaszok a szállító bevitelei. Ha kifejezetten kötelező kérdések hiányoznak, a válasz átvételre kerül, és !-lel jelölt. A postaláda üzemeltetésének megőrzési idejét és adatfeldolgozási megállapodásait Ön rendezi.

---

## Nyelv, PDF-űrlap és a válaszok rögzítése

- **Nyelv:** az értékelési hivatkozás létrehozásakor csak a **szervezeti beállításokban** engedélyezett (és teljes fordítással rendelkező) nyelvek választhatók. Előre a felület nyelve van kijelölve; ha csak egy nyelv engedélyezett, a választó elrejtődik. A cím követi a választott nyelvet. Ez mindkét kézbesítési módra (postaláda és közvetlen) és a PDF-re is érvényes.
- **Kapcsolattartó:** a kapcsolattartó neve és e-mail-címe szerepel az űrlapon; előre a szervezeti beállításokban megadott CISO neve és e-mail-címe áll, és kérdőívenként módosítható.
- **Cím:** az utcát, irányítószámot/települést, országot és telefonszámot az **Adminisztráció → Szervezet** menüben adja meg; ezek a PDF-űrlap fejlécében jelennek meg a céglogó mellett.
- **PDF-űrlap:** nyitott kérdőívnél a **PDF-űrlap** gomb **kitölthető PDF-et** hoz létre logóval, cégnévvel, címmel, kapcsolattartóval, szállítóval, határidővel, hivatkozással, jelölőnégyzetekkel (igen/nem), megjegyzés- és szövegmezőkkel, *-gal jelölt kötelező kérdésekkel és aláírási blokkal. A szállító a képernyőn vagy kézzel tölti ki, és e-mailben vagy postán küldi vissza. A PDF **nem** tartalmazza a titkos hivatkozást, csak a kérdőív hivatkozási számát. A PDF a szervezet beágyazott **PDF-betűtípusát** használja (alapértelmezés: Liberation Sans; Adminisztráció → Szervezet), így az EU összes hivatalos nyelvének különleges betűi helyesen jelennek meg. Kivétel: amit a szállító az űrlapmezőkbe ír, azt a PDF-programja a PDF-formátum alapbetűtípusával rajzolja; hogy a különleges karakterek minden programban megjelennek-e, nincs ellenőrizve.
- **Válaszok rögzítése:** a **Válaszok rögzítése** gombbal a szerkesztők a visszaküldött űrlap válaszait ugyanazokkal a kérdésekkel rögzítik. Ha kötelező válaszok hiányoznak, a Builder megerősítést kér; csak megerősítés után mentődnek, !-lel jelölve. A kérdőív „Űrlap” jelölést kap, és nyom marad az audit naplóban. Csak nyitott kérdőív válaszolható meg így; utána a szokott módon ellenőrizze.

---

## Kockázati besorolás

A szállító kockázati besorolását a következők határozzák meg:
- Az adathozzáférés típusa és mértéke
- A függő folyamatok kritikussága
- Igazolt biztonsági intézkedések (tanúsítványok, auditok)
- Szerződéses biztosítékok (DPA, titoktartási megállapodás, SLA-k)

A `magas` vagy `kritikus` besorolású szállítókat legalább évente felül kell vizsgálni.

---

## Kapcsolat a GDPR-modulhoz

A személyes adatokat kezelő szállítók a GDPR-modulban is megjelennek az
adatfeldolgozói megállapodások (DPA) alatt. A kapcsolatot manuálisan kell létrehozni
a DPA-bejegyzésnél.

---

## Kapcsolódó kockázatok

A kockázati űrlapon a kockázatok egy vagy több szállítóhoz köthetők („Kapcsolatok” szakasz → **Érintett eszközök, eszköztípusok és szállítók**). A szállító űrlapján (szerkesztéskor) a **Kapcsolódó kockázatok** szakasz az összes kapcsolódó kockázatot mutatja szinttel és állapottal.

---

## Irányítópult

A szállítói áttekintő a következőket mutatja:
- Összes szállító kockázati besorolás szerint
- Lejárt felülvizsgálatú szállítók
- Aktív és inaktív szállítók aránya

---

## Audit-megjegyzés

Az ISO 27001 A.5.19 szabályozást ír elő a szállítói kapcsolatokra. Az A.5.20 biztonsági
követelményeket vár el a szállítói szerződésekben. Az A.5.21 az ellátási lánc kockázataival
foglalkozik. Az A.5.22 a szállítói teljesítmény és biztonság rendszeres nyomon követését írja elő.

A szállítói értékelési funkció dokumentált bizonyítékot tesz lehetővé a biztonsági
felülvizsgálatokról, amelyet az auditornak be lehet mutatni.
