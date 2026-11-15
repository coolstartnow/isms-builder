# Moodul: turvaeesmärgid

> Turvaeesmärgid teevad ISMS-i mõõdetavaks — ISO 27001 punkt 6.2 nõuab selgesõnaliselt
> mõõdetavate kriteeriumidega eesmärkide määratlemist ja edenemise jälgimist.

---

## Mis on turvaeesmärgid?

Turvaeesmärgid tõlgivad ISMS-i strateegia konkreetseteks, mõõdetavateks sihtideks.
Need vastavad küsimusele: **mida me tahame millal saavutada?**

Näited:
- „Kõik töötajad läbivad andmepüügi teadlikkuskoolituse III kvartaliks“
- „Vähenda kriitiliste haavatavuste paigatamise aeg ≤ 72 tunnini“
- „Saavuta ISO 27001 sertifikaat majandusaasta lõpuks“

---

## Rollid ja õigused

| Tegevus | Minimaalne roll |
|---|---|
| Eesmärkide vaatamine | `reader` |
| Eesmärkide loomine ja muutmine | `editor` |
| Eesmärkide kustutamine / taastamine | `admin` |

---

## Eesmärgi loomine

**Turvaeesmärgid → „+ Uus eesmärk“**

Väljad:
- **Pealkiri** — lühike nimetus
- **Kirjeldus** — mida tuleks saavutada?
- **Omanik** — vastutav isik või roll
- **Kategooria** — nt tehniline, korralduslik, vastavus
- **Tähtaeg** — millal?
- **KPI** — mõõdetav sihtväärtus (nt „100% koolituse läbimise määr“)
- **Praegune väärtus** — praegune edenemine (nt „72%“)
- **Olek** — `not_started` / `in_progress` / `completed` / `cancelled`

---

## Edenemise jälgimine

**KPI edenemisriba** arvutatakse automaatselt valemist
`praegune väärtus / sihtväärtus × 100`. See on nähtav töölaual ja
eesmärkide ülevaates.

Edenemise uuendamiseks: ava eesmärk → **„Muuda“** → kohanda praegust väärtust.

---

## Töölaua lõimimine

Töölaud näitab:
- Avatud eesmärke tähtajaga
- Eesmärke, mille tähtaeg on ≤ 14 päeva kaugusel (esile tõstetud kollasega)
- Jooksval kvartalil lõpetatud eesmärke

---

## Seos SoA meetmetega

Eesmärke saab siduda SoA ISO meetmetega — nii on läbipaistev, milline abinõu
toetab millist strateegilist eesmärki. Sidumine toimub eesmärgi vormi
väljal **„Seotud meetmed“**.

---

## Märkus auditiks

ISO 27001 punkt 6.2 nõuab tõendeid, et eesmärgid:
- on dokumenteeritud
- omavad mõõdetavaid kriteeriume
- on määratud vastutavatele isikutele ajaraamidega
- vaadatakse regulaarselt üle

Eesmärkide moodul katab kõik neli nõuet. Auditiks soovitatakse kvartaalset ülevaatust
kõigist eesmärkidest olekuvärskendustega.
