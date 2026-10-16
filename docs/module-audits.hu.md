# Modul: Auditkezelés

> Auditok tervezése, lefolytatása és nyomon követése — az ellenőrzőlistától a megállapításokon át az éves
> auditprogramig (ISO 27001 9.2. pont, ISO 19011).

---

## Miért auditkezelés?

Az ISO 27001 tervezett időközönként belső auditokat és olyan auditprogramot kér, amely meghatározza a gyakoriságot,
módszereket, felelősségeket és a jelentéseket. A modul ezt fogja össze: az **audit** mint objektum,
az eredménnyel rendelkező **ellenőrzőpontok**, az ezekből keletkező **megállapítások** és az **auditprogram** mint éves terv.

---

## Szerepkörök és jogosultságok

| Művelet | Minimális szerepkör |
|---|---|
| Auditok és auditprogramok megtekintése | `reader` |
| Auditok, ellenőrzőpontok, auditprogramok létrehozása és szerkesztése | `auditor` vagy `contentowner` |
| Auditprogram jóváhagyása / visszaállítása tervezetbe | `auditor` vagy `contentowner` |
| Végleges törlés vagy visszaállítás a kukából | `admin` |

Az **Auditok** menüpont `contentowner` szerepkörtől, valamint a CISO, Revízió és QMB funkcióknak látható.
Az adminisztrátorok a modult az **Admin → Rendszer** alatt kikapcsolhatják.

---

## Audit létrehozása

**Auditok → „Új audit”**

- **Cím**, **audit típusa** (belső, külső, szállítói audit, tanúsítás) és **állapot**
  (tervezett, folyamatban, lezárt, megszakítva).
- **Szabvány / norma** és **audit hatóköre**, érintett **társaságok**, szállítói audit esetén a **szállító**.
- **Vezető auditor** és **auditcsapat**.
- **Tervezett kezdés / befejezés**, **tényleges kezdés / befejezés** és egy **utókövetési dátum**.
- **Auditprogram**: hozzárendelés egy éves tervhez (opcionális).
- **Következtetés / eredmény**.

Minden audit **AUD-ÉÉÉÉ-NNNN** hivatkozást kap. A lista állapot, típus és év szerint szűrhető.

---

## Ellenőrzőpontok

Az audit részletes nézete tartalmazza az **ellenőrzőlistát**. Minden ponthoz tartozik

- egy **kontrollhivatkozás** (az SoA-ból választható, opcionális),
- a **kérdés / követelmény**,
- egy **eredmény**: nyitott, megfelelő, **eltérés** vagy nem alkalmazható,
- **bizonyíték** és **megjegyzések**.

Az eredmény közvetlenül a sorban módosítható. **Eltérés** esetén megjelenik a
**„Megállapítás létrehozása”** gomb: előre kitöltött megállapítást hoz létre (a kérdés mint elvárt állapot,
a megjegyzések mint tényleges állapot, auditor, auditidőszak, kontrollkapcsolat). Pontonként csak egy megállapítás jön létre;
ezt utána a pont hivatkozza.

---

## Megállapítások hozzárendelése auditokhoz

Az ellenőrzőpontból létrehozott megállapítások automatikusan az audithoz tartoznak. A meglévő megállapítások a megállapítás
űrlapján az **Audit** mezőben rendelhetők hozzá (vagy választhatók le). Az audit részletes nézete listázza a hozzárendelt megállapításokat.

---

## Auditprogram (éves terv)

**Auditok → „Auditprogram” fül → „Új auditprogram”**

A programnak van **éve**, **céljai** és **hatóköre**, és **AP-ÉÉÉÉ-NNNN** hivatkozást kap. Az auditok az audit űrlapon keresztül rendelhetők hozzá
(vagy közvetlenül a programban az **„Audit hozzáadása a programhoz”** gombbal). A programnézet az auditokat a tervezett kezdés
**negyedéve** szerint csoportosítja; az időpont nélküli auditok külön csoportban jelennek meg.

**Jóváhagyás:** a **„Jóváhagyás”** rögzíti a programot a felhasználóval és a dátummal, és zárolja. Átdolgozáshoz
használja a **„Vissza tervezetbe”** gombot.

---

## Naptár és irányítópult

A **naptár** minden audithoz megmutatja a tervezett kezdést, a tervezett befejezést (amíg nincs lezárva) és az utókövetési dátumot.
Az **irányítópult** mutatja az auditok teljes számát, a késésben lévőket, a 30 napon belülieket és a nyitott eltéréseket.
Egy tervezett vagy folyamatban lévő audit késésben van, ha a tervezett befejezés eltelt.

---

## Export

- **Auditlista:** CSV és PDF (az aktív szűrők figyelembevételével).
- **Auditjelentés:** az audit részletes nézetében az **„Auditjelentés”** gombbal — alapadatok, ellenőrzőpontok, megállapítások és következtetés PDF-ben.
- **Auditprogram:** CSV és PDF a negyedéves tervvel.

A PDF a böngésző nyomtatási párbeszédablakán keresztül készül.

---

## Kuka

A törölt auditok és auditprogramok 30 napig maradnak a kukában (**Admin → Kuka**), és az adminisztrátorok visszaállíthatják vagy
véglegesen törölhetik őket.

---

## Audit-megjegyzés

Minden módosítás bekerül az auditnaplóba. Az auditkezelés nem helyettesíti a tanúsító szervezet jelentését,
de bizonyítékot ad a tervezésre, végrehajtásra és nyomon követésre az ISO 27001 9.2. pontja szerint.
