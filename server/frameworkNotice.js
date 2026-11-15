// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Rechtlicher Hinweis zu ISO, NEN 7510 und TISAX in der Anleitung „SoA & Audit – Leitfaden“.
// Die Anleitung wird beim ersten Start einmal angelegt (guidanceStore._upsertSeed) und danach nicht mehr aus dem Code erneuert; Änderungen am Text im Code
// erreichen bestehende Installationen daher nicht. Der Hinweis ist rechtlich wichtig und muss dort ankommen: patchContent() trägt ihn in einen schon
// angelegten Artikel nach — nur, wenn der bekannte Absatz „Eigene Gruppen“ vorhanden ist und der Hinweis noch fehlt. Eigene Änderungen am Text bleiben unberührt.
// Die Texte stehen unverändert auch in den Anleitungen des Programmstands (guidanceStore.js, guidance-hu/-et) und in docs/ (tests/frameworkNotice.test.js hält sie gleich).

const HEAD = { de: 'Rechtlicher Hinweis', en: 'Legal notice', fr: 'Avis juridique', nl: 'Juridische kennisgeving', hu: 'Jogi megjegyzés', et: 'Õiguslik märkus' }
const KEY = { de: '> **Eigene Gruppen:**', en: '> **Own groups:**', fr: '> **Groupes personnalisés :**', nl: '> **Eigen groepen:**', hu: '> **Saját csoportok:**', et: '> **Oma rühmad:**' }
const TEXT = {
  de: 'Die Normtexte von ISO 27001/9000/9001, NEN 7510 und der TISAX-Prüfkataloge (VDA ISA) unterliegen den Rechten ihrer Herausgeber (Urheber- und Markenrecht) und werden von ISMS Builder nicht mitgeliefert. Beispiel-Controls in Demo-Daten sind eigene, erfundene Platzhaltertexte ohne Bezug zum Wortlaut der Normen — unvollständig und weder für Zertifizierungen noch für TISAX-Assessments verwendbar. Importieren Sie nur Texte, die Sie lizenzrechtlich verwenden dürfen. Das ist keine Rechtsberatung.',
  en: 'The standard texts of ISO 27001/9000/9001, NEN 7510 and the TISAX assessment catalogues (VDA ISA) are subject to the rights of their publishers (copyright and trademark law) and are not shipped with ISMS Builder. Example controls in demo data are our own invented placeholder texts with no connection to the wording of the standards — incomplete and usable neither for certifications nor for TISAX assessments. Only import texts you are licensed to use. This is not legal advice.',
  fr: "Les textes normatifs d'ISO 27001/9000/9001, de NEN 7510 et des catalogues d'évaluation TISAX (VDA ISA) sont soumis aux droits de leurs éditeurs (droit d'auteur et droit des marques) et ne sont pas fournis avec ISMS Builder. Les contrôles d'exemple des données de démonstration sont nos propres textes fictifs, sans lien avec le libellé des normes — incomplets et utilisables ni pour des certifications ni pour des évaluations TISAX. N'importez que des textes que vous avez le droit d'utiliser. Ceci n'est pas un conseil juridique.",
  nl: 'De normteksten van ISO 27001/9000/9001, NEN 7510 en de TISAX-beoordelingscatalogi (VDA ISA) vallen onder de rechten van hun uitgevers (auteurs- en merkenrecht) en worden niet met ISMS Builder meegeleverd. Voorbeeld-controls in demogegevens zijn eigen, verzonnen plaatsaanduidingsteksten zonder verband met de formulering van de normen — onvolledig en bruikbaar noch voor certificeringen noch voor TISAX-assessments. Importeer alleen teksten die u mag gebruiken. Dit is geen juridisch advies.',
  hu: 'Az ISO 27001/9000/9001, a NEN 7510 és a TISAX értékelési katalógusok (VDA ISA) szabványszövegeire a kiadóik jogai (szerzői jog és védjegyjog) vonatkoznak, és az ISMS Builder nem szállítja őket. A demóadatokban lévő példa-kontrollok saját, kitalált helyőrző szövegek, a szabványok szövegéhez nincs közük — hiányosak, és sem tanúsításra, sem TISAX-értékelésre nem használhatók. Csak olyan szöveget importáljon, amelynek használatára jogosult. Ez nem jogi tanács.',
  et: 'ISO 27001/9000/9001, NEN 7510 ja TISAXi hindamiskataloogide (VDA ISA) standarditekstide suhtes kehtivad nende väljaandjate õigused (autoriõigus ja kaubamärgiõigus) ning ISMS Builder neid kaasa ei anna. Demoandmete näidiskontrollid on meie enda väljamõeldud kohatäitetekstid, millel puudub seos standardite sõnastusega — need on puudulikud ning ei sobi ei sertifitseerimiseks ega TISAXi hindamisteks. Importige ainult tekste, mille kasutamiseks teil on õigus. See ei ole õigusnõustamine.',
}
const line = lang => `> **${HEAD[lang]}:** ${TEXT[lang]}`

/** → neuer Inhalt mit nachgetragenem Hinweis, oder null (Hinweis schon vorhanden / Absatz „Eigene Gruppen“ nicht gefunden → nichts ändern) */
function patchContent(content) {
  if (typeof content !== 'string') return null
  for (const lang of Object.keys(HEAD)) if (content.includes(`**${HEAD[lang]}:**`)) return null
  for (const lang of Object.keys(KEY)) {
    const i = content.indexOf(KEY[lang]); if (i < 0) continue
    const j = content.indexOf('\n', i), end = j < 0 ? content.length : j
    return content.slice(0, end) + '\n\n' + line(lang) + content.slice(end)
  }
  return null
}

module.exports = { HEAD, KEY, TEXT, line, patchContent }
