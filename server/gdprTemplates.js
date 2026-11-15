// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Vorlagen für die Einträge des GDPR-Moduls: Verarbeitungstätigkeiten (VVT), AV-Verträge, Datenpannen, Betroffenenanfragen (mit Antwortschreiben)
// und technische und organisatorische Maßnahmen (TOMs). Reine Funktionen ohne Dateizugriff, Texte in fünf Sprachen.
// Alle Vorlagen sind praxisbezogene Vorschläge: Sie müssen sorgfältig auf das eigene Unternehmen angepasst werden und sind keine Rechtsberatung.
// Firmendaten stehen nicht darin; nur die Platzhalter {{COMPANY_NAME}} und {{DATA_PROTECTION_OFFICER}} werden beim Abruf aus den Organisationsdaten gefüllt.

const safeDraft = require('./ai/safeDraft')

const reg = require('./languages')
const KINDS = ['vvt', 'av', 'incident', 'dsar', 'tom']
const DATA = {
 "deletion": {
  "de": "Löschung nach Ablauf der Frist durch die Fachabteilung, Nachweis im Löschprotokoll",
  "en": "Deletion after the period has expired by the business unit, recorded in the deletion log",
  "fr": "Suppression à l’expiration du délai par le service concerné, consignée dans le journal de suppression",
  "nl": "Verwijdering na afloop van de termijn door de afdeling, vastgelegd in het verwijderlogboek",
  "hu": "A határidő lejárta után a szakterület törli az adatokat, a törlést a törlési naplóban rögzítik",
  "et": "Kustutamine tähtaja möödumisel vastava üksuse poolt, dokumenteeritakse kustutuslogis"
 },
 "closing": {
  "de": "Bei Fragen erreichen Sie unseren Datenschutzbeauftragten: {{DATA_PROTECTION_OFFICER}}. Mit freundlichen Grüßen, {{COMPANY_NAME}}",
  "en": "If you have questions, you can reach our data protection officer: {{DATA_PROTECTION_OFFICER}}. Kind regards, {{COMPANY_NAME}}",
  "fr": "Pour toute question, vous pouvez joindre notre délégué à la protection des données : {{DATA_PROTECTION_OFFICER}}. Cordialement, {{COMPANY_NAME}}",
  "nl": "Bij vragen kunt u contact opnemen met onze functionaris voor gegevensbescherming: {{DATA_PROTECTION_OFFICER}}. Met vriendelijke groet, {{COMPANY_NAME}}",
  "hu": "Kérdés esetén forduljon adatvédelmi tisztviselőnkhöz: {{DATA_PROTECTION_OFFICER}}. Üdvözlettel: {{COMPANY_NAME}}",
  "et": "Küsimuste korral saate pöörduda meie andmekaitsespetsialisti poole: {{DATA_PROTECTION_OFFICER}}. Lugupidamisega {{COMPANY_NAME}}"
 },
 "vvt": {
  "hr_admin": {
   "title": {
    "de": "Personalverwaltung und Entgeltabrechnung",
    "en": "Personnel administration and payroll",
    "fr": "Gestion du personnel et paie",
    "nl": "Personeelsadministratie en salarisverwerking",
    "hu": "Személyügyi nyilvántartás és bérszámfejtés",
    "et": "Personalihaldus ja palgaarvestus"
   },
   "purpose": {
    "de": "Begründung, Durchführung und Beendigung von Arbeitsverhältnissen, Lohn- und Gehaltsabrechnung, gesetzliche Meldungen",
    "en": "Establishing, performing and ending employment relationships, payroll, statutory reporting",
    "fr": "Conclusion, exécution et cessation des relations de travail, paie, déclarations légales",
    "nl": "Aangaan, uitvoeren en beëindigen van arbeidsrelaties, salarisverwerking, wettelijke meldingen",
    "hu": "Munkaviszonyok létesítése, teljesítése és megszüntetése, bérszámfejtés, jogszabályi bejelentések",
    "et": "Töösuhete loomine, täitmine ja lõpetamine, palgaarvestus, seadusjärgsed aruanded"
   },
   "recipients": {
    "de": "Lohnbüro oder Steuerberater, Sozialversicherungsträger, Finanzbehörden, Banken, Auftragsverarbeiter der HR-Software",
    "en": "Payroll office or tax adviser, social security bodies, tax authorities, banks, processor of the HR software",
    "fr": "Bureau de paie ou conseiller fiscal, organismes de sécurité sociale, administration fiscale, banques, sous-traitant du logiciel RH",
    "nl": "Salarisbureau of belastingadviseur, sociale verzekeringsinstanties, belastingdienst, banken, verwerker van de HR-software",
    "hu": "Bérszámfejtő iroda vagy adótanácsadó, társadalombiztosítási szervek, adóhatóság, bankok, a HR-szoftver adatfeldolgozója",
    "et": "Palgabüroo või maksunõustaja, sotsiaalkindlustusasutused, maksuamet, pangad, personalitarkvara volitatud töötleja"
   },
   "retention": {
    "de": "Gesetzliche Aufbewahrungsfristen (z. B. handels- und steuerrechtlich); nach nationalem Recht prüfen",
    "en": "Statutory retention periods (e.g. under commercial and tax law); check national law",
    "fr": "Durées légales de conservation (p. ex. droit commercial et fiscal) ; vérifier le droit national",
    "nl": "Wettelijke bewaartermijnen (bijv. handels- en belastingrecht); nationaal recht controleren",
    "hu": "Jogszabályi megőrzési idők (pl. kereskedelmi és adójog szerint); a nemzeti jog ellenőrzendő",
    "et": "Seadusjärgsed säilitustähtajad (nt kaubandus- ja maksuõiguse alusel); kontrolli riigisisest õigust"
   },
   "legalBasis": "contract",
   "dataCategories": [
    "name",
    "email",
    "phone",
    "address",
    "financial",
    "health"
   ],
   "dataSubjectTypes": [
    "employees"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "applicants": {
   "title": {
    "de": "Bewerbermanagement",
    "en": "Applicant management",
    "fr": "Gestion des candidatures",
    "nl": "Sollicitantenbeheer",
    "hu": "Pályázatkezelés",
    "et": "Kandidaatide haldus"
   },
   "purpose": {
    "de": "Entgegennahme, Prüfung und Auswahl von Bewerbungen, Kommunikation mit Bewerbern",
    "en": "Receiving, reviewing and selecting applications, communication with applicants",
    "fr": "Réception, examen et sélection des candidatures, communication avec les candidats",
    "nl": "Ontvangen, beoordelen en selecteren van sollicitaties, communicatie met sollicitanten",
    "hu": "Pályázatok fogadása, vizsgálata és kiválasztása, kommunikáció a pályázókkal",
    "et": "Kandideerimisavalduste vastuvõtmine, läbivaatamine ja valik, suhtlus kandidaatidega"
   },
   "recipients": {
    "de": "Fachabteilung und Personalabteilung, gegebenenfalls Auftragsverarbeiter des Bewerbermanagementsystems",
    "en": "Business unit and HR department, possibly the processor of the applicant tracking system",
    "fr": "Service concerné et service RH, éventuellement le sous-traitant du système de gestion des candidatures",
    "nl": "Afdeling en HR-afdeling, eventueel de verwerker van het sollicitatiesysteem",
    "hu": "Szakterület és HR-osztály, adott esetben a pályázatkezelő rendszer adatfeldolgozója",
    "et": "Vastav üksus ja personaliosakond, vajaduse korral värbamissüsteemi volitatud töötleja"
   },
   "retention": {
    "de": "Wenige Monate nach Abschluss des Verfahrens (Vorschlag: 6 Monate); Talentpool nur mit Einwilligung",
    "en": "A few months after the procedure ends (suggestion: 6 months); talent pool only with consent",
    "fr": "Quelques mois après la fin de la procédure (suggestion : 6 mois) ; vivier de talents uniquement avec consentement",
    "nl": "Enkele maanden na afloop van de procedure (voorstel: 6 maanden); talentenpool alleen met toestemming",
    "hu": "Az eljárás lezárása után néhány hónappal (javaslat: 6 hónap); tehetségbázis csak hozzájárulással",
    "et": "Mõni kuu pärast menetluse lõppu (soovitus: 6 kuud); talentide andmepank ainult nõusolekul"
   },
   "legalBasis": "contract",
   "dataCategories": [
    "name",
    "email",
    "phone",
    "address",
    "other"
   ],
   "dataSubjectTypes": [
    "employees"
   ],
   "retentionMonths": 6,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "customers_crm": {
   "title": {
    "de": "Kundenverwaltung (CRM)",
    "en": "Customer management (CRM)",
    "fr": "Gestion de la clientèle (CRM)",
    "nl": "Klantenbeheer (CRM)",
    "hu": "Ügyfélkezelés (CRM)",
    "et": "Kliendihaldus (CRM)"
   },
   "purpose": {
    "de": "Verwaltung von Kundenbeziehungen, Angebote, Aufträge, Kundenkommunikation",
    "en": "Managing customer relationships, offers, orders and customer communication",
    "fr": "Gestion de la relation client, offres, commandes, communication avec les clients",
    "nl": "Beheer van klantrelaties, offertes, orders en klantcommunicatie",
    "hu": "Ügyfélkapcsolatok kezelése, ajánlatok, megrendelések, ügyfélkommunikáció",
    "et": "Kliendisuhete, pakkumiste, tellimuste ja kliendisuhtluse haldamine"
   },
   "recipients": {
    "de": "Vertrieb und Kundenservice, Auftragsverarbeiter der CRM-Software, Versanddienstleister",
    "en": "Sales and customer service, processor of the CRM software, shipping providers",
    "fr": "Ventes et service client, sous-traitant du logiciel CRM, prestataires d’expédition",
    "nl": "Verkoop en klantenservice, verwerker van de CRM-software, verzenddiensten",
    "hu": "Értékesítés és ügyfélszolgálat, a CRM-szoftver adatfeldolgozója, szállítási szolgáltatók",
    "et": "Müük ja klienditugi, CRM-tarkvara volitatud töötleja, tarneteenuse pakkujad"
   },
   "retention": {
    "de": "Dauer der Geschäftsbeziehung; danach gesetzliche Aufbewahrungsfristen",
    "en": "Duration of the business relationship; then statutory retention periods",
    "fr": "Durée de la relation commerciale ; ensuite durées légales de conservation",
    "nl": "Duur van de zakelijke relatie; daarna wettelijke bewaartermijnen",
    "hu": "Az üzleti kapcsolat időtartama; ezt követően a jogszabályi megőrzési idők",
    "et": "Ärisuhte kestus; seejärel seadusjärgsed säilitustähtajad"
   },
   "legalBasis": "contract",
   "dataCategories": [
    "name",
    "email",
    "phone",
    "address"
   ],
   "dataSubjectTypes": [
    "customers"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "newsletter": {
   "title": {
    "de": "Newsletter und E-Mail-Marketing",
    "en": "Newsletter and e-mail marketing",
    "fr": "Newsletter et marketing par e-mail",
    "nl": "Nieuwsbrief en e-mailmarketing",
    "hu": "Hírlevél és e-mail marketing",
    "et": "Uudiskiri ja e-posti turundus"
   },
   "purpose": {
    "de": "Versand von Newslettern und Werbeinformationen an Abonnenten, Erfolgsmessung",
    "en": "Sending newsletters and promotional information to subscribers, success measurement",
    "fr": "Envoi de newsletters et d’informations promotionnelles aux abonnés, mesure des résultats",
    "nl": "Verzenden van nieuwsbrieven en reclame-informatie aan abonnees, succesmeting",
    "hu": "Hírlevelek és reklámtájékoztatók küldése az előfizetőknek, eredménymérés",
    "et": "Uudiskirjade ja reklaamteabe saatmine tellijatele, tulemuslikkuse mõõtmine"
   },
   "recipients": {
    "de": "Marketing, Auftragsverarbeiter des Newsletter-Dienstes",
    "en": "Marketing, processor of the newsletter service",
    "fr": "Marketing, sous-traitant du service de newsletter",
    "nl": "Marketing, verwerker van de nieuwsbriefdienst",
    "hu": "Marketing, a hírlevélszolgáltatás adatfeldolgozója",
    "et": "Turundus, uudiskirjateenuse volitatud töötleja"
   },
   "retention": {
    "de": "Bis zum Widerruf der Einwilligung; Nachweis der Einwilligung nach Widerruf begrenzt aufbewahren",
    "en": "Until consent is withdrawn; keep the proof of consent for a limited time after withdrawal",
    "fr": "Jusqu’au retrait du consentement ; conserver la preuve du consentement de façon limitée après le retrait",
    "nl": "Tot intrekking van de toestemming; bewijs van toestemming beperkt bewaren na intrekking",
    "hu": "A hozzájárulás visszavonásáig; a hozzájárulás igazolását visszavonás után korlátozott ideig őrizzük meg",
    "et": "Kuni nõusoleku tagasivõtmiseni; nõusoleku tõendit säilitatakse pärast tagasivõtmist piiratud aja"
   },
   "legalBasis": "consent",
   "dataCategories": [
    "name",
    "email"
   ],
   "dataSubjectTypes": [
    "customers",
    "website_visitors"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "website": {
   "title": {
    "de": "Betrieb der Website und Webanalyse",
    "en": "Website operation and web analytics",
    "fr": "Exploitation du site web et analyse d’audience",
    "nl": "Beheer van de website en webanalyse",
    "hu": "A weboldal üzemeltetése és webanalitika",
    "et": "Veebisaidi käitamine ja veebianalüütika"
   },
   "purpose": {
    "de": "Bereitstellung der Website, Sicherheit, Reichweitenmessung und Verbesserung des Angebots",
    "en": "Providing the website, security, audience measurement and improving the offer",
    "fr": "Mise à disposition du site web, sécurité, mesure d’audience et amélioration de l’offre",
    "nl": "Aanbieden van de website, beveiliging, bereiksmeting en verbetering van het aanbod",
    "hu": "A weboldal biztosítása, biztonság, elérésmérés és a kínálat fejlesztése",
    "et": "Veebisaidi pakkumine, turvalisus, vaatajaskonna mõõtmine ja pakkumise arendamine"
   },
   "recipients": {
    "de": "Hosting-Anbieter, Anbieter der Analyse-Werkzeuge",
    "en": "Hosting provider, providers of analytics tools",
    "fr": "Hébergeur, fournisseurs des outils d’analyse",
    "nl": "Hostingaanbieder, aanbieders van analysehulpmiddelen",
    "hu": "Tárhelyszolgáltató, az elemző eszközök szolgáltatói",
    "et": "Majutusteenuse pakkuja, analüütikavahendite pakkujad"
   },
   "retention": {
    "de": "Server-Protokolle kurz (z. B. 7 bis 30 Tage); Analysedaten nach Einwilligung begrenzt",
    "en": "Server logs for a short time (e.g. 7 to 30 days); analytics data limited, based on consent",
    "fr": "Journaux de serveur courte durée (p. ex. 7 à 30 jours) ; données d’analyse limitées, sur la base du consentement",
    "nl": "Serverlogs kort (bijv. 7 tot 30 dagen); analysegegevens beperkt, op basis van toestemming",
    "hu": "Szervernaplók rövid ideig (pl. 7–30 nap); az elemzési adatok korlátozottan, hozzájárulás alapján",
    "et": "Serverilogid lühikest aega (nt 7 kuni 30 päeva); analüütikaandmed piiratult, nõusoleku alusel"
   },
   "legalBasis": "legitimate_interest",
   "dataCategories": [
    "other",
    "location"
   ],
   "dataSubjectTypes": [
    "website_visitors"
   ],
   "retentionMonths": 1,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "video": {
   "title": {
    "de": "Videoüberwachung",
    "en": "Video surveillance",
    "fr": "Vidéosurveillance",
    "nl": "Camerabewaking",
    "hu": "Videó-megfigyelés",
    "et": "Videovalve"
   },
   "purpose": {
    "de": "Schutz von Eigentum und Personen, Aufklärung von Straftaten in gekennzeichneten Bereichen",
    "en": "Protection of property and people, investigation of offences in marked areas",
    "fr": "Protection des biens et des personnes, élucidation d’infractions dans les zones signalées",
    "nl": "Bescherming van eigendom en personen, opsporing van strafbare feiten in gemarkeerde ruimten",
    "hu": "Vagyon és személyek védelme, bűncselekmények felderítése a kijelölt területeken",
    "et": "Vara ja isikute kaitse, õigusrikkumiste uurimine tähistatud aladel"
   },
   "recipients": {
    "de": "Sicherheitsdienst, bei Vorfällen Strafverfolgungsbehörden",
    "en": "Security service, law enforcement in case of incidents",
    "fr": "Service de sécurité, autorités de poursuite en cas d’incident",
    "nl": "Beveiligingsdienst, bij incidenten opsporingsinstanties",
    "hu": "Biztonsági szolgálat, incidens esetén a bűnüldöző szervek",
    "et": "Turvateenistus, intsidentide korral õiguskaitseasutused"
   },
   "retention": {
    "de": "So kurz wie möglich, in der Regel nach 72 Stunden; Auswertung nur bei Anlass",
    "en": "As short as possible, usually after 72 hours; evaluation only when there is a reason",
    "fr": "Aussi court que possible, en général après 72 heures ; exploitation uniquement en cas de besoin",
    "nl": "Zo kort mogelijk, doorgaans na 72 uur; alleen bij aanleiding uitwerken",
    "hu": "A lehető legrövidebb ideig, általában 72 óra után; kiértékelés csak indokolt esetben",
    "et": "Võimalikult lühikest aega, tavaliselt 72 tundi; hindamine ainult põhjuse olemasolul"
   },
   "legalBasis": "legitimate_interest",
   "dataCategories": [
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "customers",
    "contractors"
   ],
   "retentionMonths": null,
   "isHighRisk": true,
   "automatedDecision": false
  },
  "time_access": {
   "title": {
    "de": "Zeiterfassung und Zutrittskontrolle",
    "en": "Time recording and access control",
    "fr": "Enregistrement du temps et contrôle d’accès",
    "nl": "Tijdregistratie en toegangscontrole",
    "hu": "Munkaidő-nyilvántartás és beléptetés",
    "et": "Tööaja arvestus ja juurdepääsukontroll"
   },
   "purpose": {
    "de": "Erfassung der Arbeitszeit, Steuerung des Zutritts zu Gebäuden und Räumen",
    "en": "Recording working time, controlling access to buildings and rooms",
    "fr": "Enregistrement du temps de travail, gestion de l’accès aux bâtiments et aux locaux",
    "nl": "Registratie van werktijd, beheer van toegang tot gebouwen en ruimten",
    "hu": "Munkaidő rögzítése, az épületekbe és helyiségekbe való belépés szabályozása",
    "et": "Tööaja registreerimine, juurdepääsu kontrollimine hoonetesse ja ruumidesse"
   },
   "recipients": {
    "de": "Personalabteilung, Anbieter des Zeiterfassungs- oder Zutrittssystems",
    "en": "HR department, provider of the time recording or access system",
    "fr": "Service RH, fournisseur du système d’enregistrement du temps ou de contrôle d’accès",
    "nl": "HR-afdeling, aanbieder van het tijdregistratie- of toegangssysteem",
    "hu": "HR-osztály, a munkaidő-nyilvántartó vagy beléptető rendszer szolgáltatója",
    "et": "Personaliosakond, tööaja arvestuse või juurdepääsusüsteemi pakkuja"
   },
   "retention": {
    "de": "Zeitdaten nach gesetzlichen Vorgaben, Zutrittsprotokolle kurz (z. B. 90 Tage)",
    "en": "Time data according to legal requirements, access logs short (e.g. 90 days)",
    "fr": "Données de temps selon les exigences légales, journaux d’accès courts (p. ex. 90 jours)",
    "nl": "Tijdgegevens volgens wettelijke eisen, toegangslogboeken kort (bijv. 90 dagen)",
    "hu": "Az időadatok jogszabályi előírás szerint, a beléptetési naplók rövid ideig (pl. 90 nap)",
    "et": "Tööajaandmed vastavalt õiguslikele nõuetele, juurdepääsulogid lühikest aega (nt 90 päeva)"
   },
   "legalBasis": "legal_obligation",
   "dataCategories": [
    "name",
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "contractors"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "suppliers": {
   "title": {
    "de": "Lieferanten- und Geschäftspartnerverwaltung",
    "en": "Supplier and business partner management",
    "fr": "Gestion des fournisseurs et partenaires commerciaux",
    "nl": "Beheer van leveranciers en zakelijke partners",
    "hu": "Beszállítók és üzleti partnerek kezelése",
    "et": "Tarnijate ja äripartnerite haldus"
   },
   "purpose": {
    "de": "Verwaltung von Lieferanten, Dienstleistern und Partnern, Bestellungen, Vertragsabwicklung, Kommunikation",
    "en": "Managing suppliers, service providers and partners, orders, contract handling, communication",
    "fr": "Gestion des fournisseurs, prestataires et partenaires, commandes, gestion des contrats, communication",
    "nl": "Beheer van leveranciers, dienstverleners en partners, bestellingen, contractafhandeling, communicatie",
    "hu": "Beszállítók, szolgáltatók és partnerek kezelése, megrendelések, szerződéskezelés, kommunikáció",
    "et": "Tarnijate, teenusepakkujate ja partnerite haldus, tellimused, lepingute menetlemine, suhtlus"
   },
   "recipients": {
    "de": "Einkauf, Buchhaltung, Auftragsverarbeiter der Beschaffungssoftware",
    "en": "Purchasing, accounting, processor of the procurement software",
    "fr": "Achats, comptabilité, sous-traitant du logiciel d’achats",
    "nl": "Inkoop, boekhouding, verwerker van de inkoopsoftware",
    "hu": "Beszerzés, könyvelés, a beszerzési szoftver adatfeldolgozója",
    "et": "Hange, raamatupidamine, hanketarkvara volitatud töötleja"
   },
   "retention": {
    "de": "Dauer der Geschäftsbeziehung; danach gesetzliche Aufbewahrungsfristen",
    "en": "Duration of the business relationship; then statutory retention periods",
    "fr": "Durée de la relation commerciale ; ensuite durées légales de conservation",
    "nl": "Duur van de zakelijke relatie; daarna wettelijke bewaartermijnen",
    "hu": "Az üzleti kapcsolat időtartama; ezt követően a jogszabályi megőrzési idők",
    "et": "Ärisuhte kestus; seejärel seadusjärgsed säilitustähtajad"
   },
   "legalBasis": "contract",
   "dataCategories": [
    "name",
    "email",
    "phone",
    "address",
    "financial"
   ],
   "dataSubjectTypes": [
    "contractors"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "accounting": {
   "title": {
    "de": "Buchhaltung und Rechnungswesen",
    "en": "Accounting and invoicing",
    "fr": "Comptabilité et facturation",
    "nl": "Boekhouding en facturering",
    "hu": "Könyvelés és számlázás",
    "et": "Raamatupidamine ja arvete esitamine"
   },
   "purpose": {
    "de": "Erstellung und Prüfung von Rechnungen, Zahlungsverkehr, Buchführung, steuerliche Pflichten",
    "en": "Preparing and checking invoices, payments, bookkeeping, tax obligations",
    "fr": "Établissement et contrôle des factures, paiements, comptabilité, obligations fiscales",
    "nl": "Opstellen en controleren van facturen, betalingsverkeer, boekhouding, fiscale verplichtingen",
    "hu": "Számlák kiállítása és ellenőrzése, fizetések, könyvelés, adókötelezettségek",
    "et": "Arvete koostamine ja kontrollimine, maksed, raamatupidamine, maksukohustused"
   },
   "recipients": {
    "de": "Steuerberater, Wirtschaftsprüfer, Banken, Finanzbehörden",
    "en": "Tax adviser, auditor, banks, tax authorities",
    "fr": "Conseiller fiscal, commissaire aux comptes, banques, administration fiscale",
    "nl": "Belastingadviseur, accountant, banken, belastingdienst",
    "hu": "Adótanácsadó, könyvvizsgáló, bankok, adóhatóság",
    "et": "Maksunõustaja, audiitor, pangad, maksuamet"
   },
   "retention": {
    "de": "Gesetzliche Aufbewahrungsfristen (z. B. 6 bis 10 Jahre); nach nationalem Recht prüfen",
    "en": "Statutory retention periods (e.g. 6 to 10 years); check national law",
    "fr": "Durées légales de conservation (p. ex. 6 à 10 ans) ; vérifier le droit national",
    "nl": "Wettelijke bewaartermijnen (bijv. 6 tot 10 jaar); nationaal recht controleren",
    "hu": "Jogszabályi megőrzési idők (pl. 6–10 év); a nemzeti jog ellenőrzendő",
    "et": "Seadusjärgsed säilitustähtajad (nt 6 kuni 10 aastat); kontrolli riigisisest õigust"
   },
   "legalBasis": "legal_obligation",
   "dataCategories": [
    "name",
    "address",
    "financial"
   ],
   "dataSubjectTypes": [
    "customers",
    "contractors"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "support": {
   "title": {
    "de": "Kundensupport und Ticketsystem",
    "en": "Customer support and ticketing",
    "fr": "Support client et système de tickets",
    "nl": "Klantondersteuning en ticketsysteem",
    "hu": "Ügyfélszolgálat és jegykezelő rendszer",
    "et": "Klienditugi ja päringusüsteem"
   },
   "purpose": {
    "de": "Bearbeitung von Anfragen und Störungsmeldungen, Dokumentation der Kommunikation",
    "en": "Handling enquiries and fault reports, documenting communication",
    "fr": "Traitement des demandes et des signalements de dysfonctionnement, documentation des échanges",
    "nl": "Afhandeling van vragen en storingsmeldingen, documentatie van communicatie",
    "hu": "Megkeresések és hibabejelentések kezelése, a kommunikáció dokumentálása",
    "et": "Päringute ja veateadete menetlemine, suhtluse dokumenteerimine"
   },
   "recipients": {
    "de": "Support-Team, Auftragsverarbeiter des Ticketsystems",
    "en": "Support team, processor of the ticketing system",
    "fr": "Équipe de support, sous-traitant du système de tickets",
    "nl": "Supportteam, verwerker van het ticketsysteem",
    "hu": "Támogatási csapat, a jegykezelő rendszer adatfeldolgozója",
    "et": "Klienditoe meeskond, päringusüsteemi volitatud töötleja"
   },
   "retention": {
    "de": "Bis zur Erledigung und angemessene Zeit danach (z. B. 24 Monate)",
    "en": "Until resolved and a reasonable time afterwards (e.g. 24 months)",
    "fr": "Jusqu’à la résolution et une durée raisonnable ensuite (p. ex. 24 mois)",
    "nl": "Tot afhandeling en daarna een redelijke tijd (bijv. 24 maanden)",
    "hu": "Az ügy lezárásáig és azt követően ésszerű ideig (pl. 24 hónap)",
    "et": "Kuni lahendamiseni ja mõistliku aja jooksul pärast seda (nt 24 kuud)"
   },
   "legalBasis": "contract",
   "dataCategories": [
    "name",
    "email",
    "phone",
    "other"
   ],
   "dataSubjectTypes": [
    "customers"
   ],
   "retentionMonths": 24,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "it_logging": {
   "title": {
    "de": "IT-Betrieb, Protokollierung und Informationssicherheit",
    "en": "IT operations, logging and information security",
    "fr": "Exploitation informatique, journalisation et sécurité de l’information",
    "nl": "IT-beheer, logging en informatiebeveiliging",
    "hu": "IT-üzemeltetés, naplózás és információbiztonság",
    "et": "IT-käitus, logimine ja infoturve"
   },
   "purpose": {
    "de": "Betrieb der IT-Systeme, Benutzerverwaltung, Protokollierung, Erkennung und Abwehr von Angriffen",
    "en": "Operating the IT systems, user management, logging, detecting and defending against attacks",
    "fr": "Exploitation des systèmes informatiques, gestion des utilisateurs, journalisation, détection et défense contre les attaques",
    "nl": "Beheer van de IT-systemen, gebruikersbeheer, logging, detectie en afweer van aanvallen",
    "hu": "Az informatikai rendszerek üzemeltetése, felhasználókezelés, naplózás, támadások észlelése és elhárítása",
    "et": "IT-süsteemide käitamine, kasutajahaldus, logimine, rünnakute tuvastamine ja tõrjumine"
   },
   "recipients": {
    "de": "IT-Abteilung, IT-Dienstleister, Anbieter von Sicherheitswerkzeugen",
    "en": "IT department, IT service provider, providers of security tools",
    "fr": "Service informatique, prestataire informatique, fournisseurs d’outils de sécurité",
    "nl": "IT-afdeling, IT-dienstverlener, aanbieders van beveiligingstools",
    "hu": "IT-osztály, IT-szolgáltató, biztonsági eszközök szolgáltatói",
    "et": "IT-osakond, IT-teenusepakkuja, turvavahendite pakkujad"
   },
   "retention": {
    "de": "Protokolle so kurz wie möglich (Vorschlag: 90 Tage), Benutzerkonten bis zum Austritt",
    "en": "Logs as short as possible (suggestion: 90 days), user accounts until the person leaves",
    "fr": "Journaux aussi courts que possible (suggestion : 90 jours), comptes utilisateurs jusqu’au départ",
    "nl": "Logboeken zo kort mogelijk (voorstel: 90 dagen), gebruikersaccounts tot vertrek",
    "hu": "A naplók a lehető legrövidebb ideig (javaslat: 90 nap), a felhasználói fiókok a kilépésig",
    "et": "Logid võimalikult lühikest aega (soovitus: 90 päeva), kasutajakontod kuni isiku lahkumiseni"
   },
   "legalBasis": "legitimate_interest",
   "dataCategories": [
    "name",
    "email",
    "other",
    "location"
   ],
   "dataSubjectTypes": [
    "employees",
    "contractors"
   ],
   "retentionMonths": 3,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "contact_form": {
   "title": {
    "de": "Kontaktformular und allgemeine Anfragen",
    "en": "Contact form and general enquiries",
    "fr": "Formulaire de contact et demandes générales",
    "nl": "Contactformulier en algemene vragen",
    "hu": "Kapcsolatfelvételi űrlap és általános megkeresések",
    "et": "Kontaktivorm ja üldised päringud"
   },
   "purpose": {
    "de": "Beantwortung von Anfragen, die über Formular, E-Mail oder Telefon eingehen",
    "en": "Answering enquiries received by form, e-mail or phone",
    "fr": "Réponse aux demandes reçues par formulaire, e-mail ou téléphone",
    "nl": "Beantwoorden van vragen via formulier, e-mail of telefoon",
    "hu": "Űrlapon, e-mailben vagy telefonon érkező megkeresések megválaszolása",
    "et": "Vormi, e-posti või telefoni teel saadud päringutele vastamine"
   },
   "recipients": {
    "de": "Zuständige Fachabteilung, Anbieter der E-Mail- und Formularlösung",
    "en": "Responsible business unit, provider of the e-mail and form solution",
    "fr": "Service compétent, fournisseur de la solution de messagerie et de formulaire",
    "nl": "Verantwoordelijke afdeling, aanbieder van de e-mail- en formulieroplossing",
    "hu": "Illetékes szakterület, az e-mail- és űrlapmegoldás szolgáltatója",
    "et": "Vastutav üksus, e-posti- ja vormilahenduse pakkuja"
   },
   "retention": {
    "de": "Bis zur abschließenden Bearbeitung, danach nur wenn gesetzlich erforderlich",
    "en": "Until the request is finally handled, afterwards only if legally required",
    "fr": "Jusqu’au traitement final, ensuite seulement si la loi l’exige",
    "nl": "Tot de definitieve afhandeling, daarna alleen indien wettelijk vereist",
    "hu": "A végleges kezelésig, azt követően csak ha jogszabály előírja",
    "et": "Kuni päringu lõpliku menetlemiseni, pärast seda ainult siis, kui seadus seda nõuab"
   },
   "legalBasis": "legitimate_interest",
   "dataCategories": [
    "name",
    "email",
    "phone"
   ],
   "dataSubjectTypes": [
    "customers",
    "website_visitors"
   ],
   "retentionMonths": 6,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "events": {
   "title": {
    "de": "Veranstaltungen und Schulungen",
    "en": "Events and training courses",
    "fr": "Événements et formations",
    "nl": "Evenementen en trainingen",
    "hu": "Rendezvények és képzések",
    "et": "Sündmused ja koolitused"
   },
   "purpose": {
    "de": "Anmeldung, Durchführung und Nachbereitung von Veranstaltungen und Schulungen",
    "en": "Registration, running and follow-up of events and training courses",
    "fr": "Inscription, déroulement et suivi des événements et formations",
    "nl": "Aanmelding, uitvoering en nazorg van evenementen en trainingen",
    "hu": "Rendezvények és képzések jelentkeztetése, lebonyolítása és utókövetése",
    "et": "Sündmuste ja koolituste registreerimine, läbiviimine ja järeltegevused"
   },
   "recipients": {
    "de": "Veranstaltungsteam, Referenten, Anbieter der Anmeldeplattform",
    "en": "Event team, speakers, provider of the registration platform",
    "fr": "Équipe événementielle, intervenants, fournisseur de la plateforme d’inscription",
    "nl": "Evenemententeam, sprekers, aanbieder van het aanmeldplatform",
    "hu": "Rendezvényszervező csapat, előadók, a jelentkezési felület szolgáltatója",
    "et": "Sündmuse meeskond, esinejad, registreerimisplatvormi pakkuja"
   },
   "retention": {
    "de": "Bis zum Ende der Veranstaltung und der Nachbereitung, Teilnahmenachweise nach Bedarf",
    "en": "Until the end of the event and its follow-up, proof of attendance as needed",
    "fr": "Jusqu’à la fin de l’événement et de son suivi, attestations de participation selon les besoins",
    "nl": "Tot het einde van het evenement en de nazorg, deelnamebewijzen naar behoefte",
    "hu": "A rendezvény és utókövetése végéig, részvételi igazolások szükség szerint",
    "et": "Kuni sündmuse ja selle järeltegevuste lõpuni, osalemise tõend vajaduse korral"
   },
   "legalBasis": "contract",
   "dataCategories": [
    "name",
    "email",
    "phone"
   ],
   "dataSubjectTypes": [
    "customers",
    "employees"
   ],
   "retentionMonths": null,
   "isHighRisk": false,
   "automatedDecision": false
  },
  "whistle": {
   "title": {
    "de": "Hinweisgebersystem (Meldestelle)",
    "en": "Whistleblowing system (reporting channel)",
    "fr": "Dispositif de lancement d’alerte (canal de signalement)",
    "nl": "Klokkenluidersysteem (meldkanaal)",
    "hu": "Bejelentési rendszer (visszaélés-bejelentési csatorna)",
    "et": "Rikkumisest teavitamise süsteem (teavituskanal)"
   },
   "purpose": {
    "de": "Entgegennahme und Bearbeitung von Hinweisen auf Verstöße, Schutz der hinweisgebenden Personen",
    "en": "Receiving and handling reports of violations, protecting whistleblowers",
    "fr": "Réception et traitement des signalements de violations, protection des lanceurs d’alerte",
    "nl": "Ontvangen en afhandelen van meldingen van misstanden, bescherming van melders",
    "hu": "Jogsértésekre vonatkozó bejelentések fogadása és kezelése, a bejelentők védelme",
    "et": "Rikkumisteadete vastuvõtmine ja menetlemine, rikkumisest teavitajate kaitse"
   },
   "recipients": {
    "de": "Meldestelle, gegebenenfalls Rechtsberatung und Behörden; Zugriff streng begrenzt",
    "en": "Reporting office, possibly legal advice and authorities; access strictly limited",
    "fr": "Service de signalement, éventuellement conseil juridique et autorités ; accès strictement limité",
    "nl": "Meldpunt, eventueel juridisch advies en autoriteiten; toegang strikt beperkt",
    "hu": "Bejelentési pont, adott esetben jogi tanácsadás és hatóságok; a hozzáférés szigorúan korlátozott",
    "et": "Teavituspunkt, vajaduse korral õigusnõustamine ja ametiasutused; juurdepääs rangelt piiratud"
   },
   "retention": {
    "de": "Nach den gesetzlichen Vorgaben (häufig 3 Jahre nach Abschluss des Verfahrens); nach nationalem Recht prüfen",
    "en": "According to legal requirements (often 3 years after the procedure ends); check national law",
    "fr": "Selon les exigences légales (souvent 3 ans après la fin de la procédure) ; vérifier le droit national",
    "nl": "Volgens de wettelijke eisen (vaak 3 jaar na afloop van de procedure); nationaal recht controleren",
    "hu": "A jogszabályi előírások szerint (gyakran az eljárás lezárása után 3 évig); a nemzeti jog ellenőrzendő",
    "et": "Vastavalt õiguslikele nõuetele (sageli 3 aastat pärast menetluse lõppu); kontrolli riigisisest õigust"
   },
   "legalBasis": "legal_obligation",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "contractors",
    "customers"
   ],
   "retentionMonths": null,
   "isHighRisk": true,
   "automatedDecision": false
  }
 },
 "av": {
  "cloud_hosting": {
   "title": {
    "de": "Cloud-Hosting und Rechenzentrum",
    "en": "Cloud hosting and data centre",
    "fr": "Hébergement cloud et centre de données",
    "nl": "Cloudhosting en datacenter",
    "hu": "Felhőtárhely és adatközpont",
    "et": "Pilvemajutus ja andmekeskus"
   },
   "scope": {
    "de": "Bereitstellung von Server-, Speicher- und Netzwerkressourcen, auf denen personenbezogene Daten des Verantwortlichen gespeichert und verarbeitet werden",
    "en": "Provision of server, storage and network resources on which the controller’s personal data is stored and processed",
    "fr": "Mise à disposition de ressources serveur, de stockage et réseau sur lesquelles les données personnelles du responsable sont stockées et traitées",
    "nl": "Beschikbaar stellen van server-, opslag- en netwerkcapaciteit waarop persoonsgegevens van de verwerkingsverantwoordelijke worden opgeslagen en verwerkt",
    "hu": "Szerver-, tároló- és hálózati erőforrások biztosítása, amelyeken az adatkezelő személyes adatait tárolják és kezelik",
    "et": "Server-, salvestus- ja võrguressursside pakkumine, millel töödeldakse ja hoitakse vastutava töötleja isikuandmeid"
   }
  },
  "saas_hr": {
   "title": {
    "de": "HR- und Lohnabrechnungssoftware (SaaS)",
    "en": "HR and payroll software (SaaS)",
    "fr": "Logiciel RH et de paie (SaaS)",
    "nl": "HR- en salarissoftware (SaaS)",
    "hu": "HR- és bérszámfejtő szoftver (SaaS)",
    "et": "Personali- ja palgatarkvara (SaaS)"
   },
   "scope": {
    "de": "Betrieb der Software zur Personalverwaltung und Entgeltabrechnung, Zugriff auf Beschäftigtendaten im Rahmen von Wartung und Support",
    "en": "Operation of the personnel administration and payroll software, access to employee data in the course of maintenance and support",
    "fr": "Exploitation du logiciel de gestion du personnel et de paie, accès aux données des salariés dans le cadre de la maintenance et du support",
    "nl": "Beheer van de software voor personeelsadministratie en salarisverwerking, toegang tot werknemersgegevens in het kader van onderhoud en support",
    "hu": "A személyügyi nyilvántartó és bérszámfejtő szoftver üzemeltetése, hozzáférés a munkavállalói adatokhoz karbantartás és támogatás keretében",
    "et": "Personalihalduse ja palgaarvestuse tarkvara käitamine, juurdepääs töötajate andmetele hoolduse ja toe käigus"
   }
  },
  "email_collab": {
   "title": {
    "de": "E-Mail-, Kalender- und Kollaborationsdienst",
    "en": "E-mail, calendar and collaboration service",
    "fr": "Service de messagerie, d’agenda et de collaboration",
    "nl": "E-mail-, agenda- en samenwerkingsdienst",
    "hu": "E-mail-, naptár- és együttműködési szolgáltatás",
    "et": "E-posti, kalendri ja koostöö teenus"
   },
   "scope": {
    "de": "Bereitstellung von E-Mail, Kalender, Dateiablage und Chat; Speicherung und Übertragung von Inhalten der Nutzer",
    "en": "Provision of e-mail, calendar, file storage and chat; storage and transmission of users’ content",
    "fr": "Mise à disposition de la messagerie, de l’agenda, du stockage de fichiers et du chat ; stockage et transmission des contenus des utilisateurs",
    "nl": "Aanbieden van e-mail, agenda, bestandsopslag en chat; opslag en overdracht van inhoud van gebruikers",
    "hu": "E-mail, naptár, fájltárolás és csevegés biztosítása; a felhasználók tartalmainak tárolása és továbbítása",
    "et": "E-posti, kalendri, failisalvestuse ja vestluse pakkumine; kasutajate sisu salvestamine ja edastamine"
   }
  },
  "crm_marketing": {
   "title": {
    "de": "CRM- und Marketing-Software",
    "en": "CRM and marketing software",
    "fr": "Logiciel CRM et marketing",
    "nl": "CRM- en marketingsoftware",
    "hu": "CRM- és marketingszoftver",
    "et": "CRM- ja turundustarkvara"
   },
   "scope": {
    "de": "Verwaltung von Kunden- und Interessentendaten, Kampagnen und Newsletter-Versand im Auftrag des Verantwortlichen",
    "en": "Management of customer and prospect data, campaigns and newsletter dispatch on behalf of the controller",
    "fr": "Gestion des données clients et prospects, campagnes et envoi de newsletters pour le compte du responsable",
    "nl": "Beheer van klant- en prospectgegevens, campagnes en verzending van nieuwsbrieven namens de verwerkingsverantwoordelijke",
    "hu": "Ügyfél- és érdeklődői adatok kezelése, kampányok és hírlevélküldés az adatkezelő megbízásából",
    "et": "Klientide ja huviliste andmete, kampaaniate ja uudiskirjade saatmise haldus vastutava töötleja nimel"
   }
  },
  "support_ticket": {
   "title": {
    "de": "Support- und Ticketsystem",
    "en": "Support and ticketing system",
    "fr": "Système de support et de tickets",
    "nl": "Support- en ticketsysteem",
    "hu": "Támogatási és jegykezelő rendszer",
    "et": "Tugi- ja päringusüsteem"
   },
   "scope": {
    "de": "Betrieb des Systems zur Bearbeitung von Kundenanfragen; Speicherung von Anfragen und Korrespondenz",
    "en": "Operation of the system for handling customer enquiries; storage of enquiries and correspondence",
    "fr": "Exploitation du système de traitement des demandes clients ; stockage des demandes et de la correspondance",
    "nl": "Beheer van het systeem voor afhandeling van klantvragen; opslag van vragen en correspondentie",
    "hu": "Az ügyfélmegkeresések kezelésére szolgáló rendszer üzemeltetése; megkeresések és levelezés tárolása",
    "et": "Kliendipäringute menetlemise süsteemi käitamine; päringute ja kirjavahetuse salvestamine"
   }
  },
  "it_service": {
   "title": {
    "de": "IT-Dienstleister, Wartung und Fernwartung",
    "en": "IT service provider, maintenance and remote maintenance",
    "fr": "Prestataire informatique, maintenance et télémaintenance",
    "nl": "IT-dienstverlener, onderhoud en onderhoud op afstand",
    "hu": "IT-szolgáltató, karbantartás és távkarbantartás",
    "et": "IT-teenusepakkuja, hooldus ja kaughooldus"
   },
   "scope": {
    "de": "Administration, Wartung und Support der IT-Systeme, dabei möglicher Zugriff auf personenbezogene Daten",
    "en": "Administration, maintenance and support of the IT systems, with possible access to personal data",
    "fr": "Administration, maintenance et support des systèmes informatiques, avec accès possible aux données personnelles",
    "nl": "Beheer, onderhoud en support van de IT-systemen, met mogelijke toegang tot persoonsgegevens",
    "hu": "Az informatikai rendszerek adminisztrációja, karbantartása és támogatása, ennek során személyes adatokhoz való esetleges hozzáféréssel",
    "et": "IT-süsteemide haldus, hooldus ja tugi, võimaliku juurdepääsuga isikuandmetele"
   }
  },
  "backup_archive": {
   "title": {
    "de": "Backup- und Archivdienst",
    "en": "Backup and archive service",
    "fr": "Service de sauvegarde et d’archivage",
    "nl": "Back-up- en archiefdienst",
    "hu": "Mentési és archiválási szolgáltatás",
    "et": "Varundus- ja arhiiviteenus"
   },
   "scope": {
    "de": "Sicherung und Archivierung von Daten des Verantwortlichen, Wiederherstellung auf Anforderung",
    "en": "Backup and archiving of the controller’s data, restoration on request",
    "fr": "Sauvegarde et archivage des données du responsable, restauration sur demande",
    "nl": "Back-up en archivering van gegevens van de verwerkingsverantwoordelijke, herstel op verzoek",
    "hu": "Az adatkezelő adatainak mentése és archiválása, helyreállítás kérésre",
    "et": "Vastutava töötleja andmete varundamine ja arhiveerimine, taastamine taotluse korral"
   }
  },
  "web_agency": {
   "title": {
    "de": "Webhosting und Website-Agentur",
    "en": "Web hosting and website agency",
    "fr": "Hébergement web et agence de sites web",
    "nl": "Webhosting en websitebureau",
    "hu": "Webtárhely és weboldal-ügynökség",
    "et": "Veebimajutus ja veebiagentuur"
   },
   "scope": {
    "de": "Betrieb und Pflege der Website, Formulare und Webserver-Protokolle im Auftrag des Verantwortlichen",
    "en": "Operation and maintenance of the website, forms and web server logs on behalf of the controller",
    "fr": "Exploitation et maintenance du site web, des formulaires et des journaux du serveur web pour le compte du responsable",
    "nl": "Beheer en onderhoud van de website, formulieren en webserverlogs namens de verwerkingsverantwoordelijke",
    "hu": "A weboldal, az űrlapok és a webszerver-naplók üzemeltetése és karbantartása az adatkezelő megbízásából",
    "et": "Veebisaidi, vormide ja veebiserveri logide käitamine ja hooldus vastutava töötleja nimel"
   }
  },
  "shredding": {
   "title": {
    "de": "Aktenvernichtung und Datenträgerentsorgung",
    "en": "Document shredding and media disposal",
    "fr": "Destruction de documents et élimination de supports",
    "nl": "Documentvernietiging en verwijdering van gegevensdragers",
    "hu": "Iratmegsemmisítés és adathordozók ártalmatlanítása",
    "et": "Dokumentide purustamine ja andmekandjate kõrvaldamine"
   },
   "scope": {
    "de": "Abholung, sichere Vernichtung und Nachweis der Vernichtung von Papierunterlagen und Datenträgern",
    "en": "Collection, secure destruction and proof of destruction of paper documents and data carriers",
    "fr": "Collecte, destruction sécurisée et justificatif de destruction de documents papier et de supports de données",
    "nl": "Ophalen, veilig vernietigen en bewijs van vernietiging van papieren documenten en gegevensdragers",
    "hu": "Papíralapú iratok és adathordozók elszállítása, biztonságos megsemmisítése és a megsemmisítés igazolása",
    "et": "Paberdokumentide ja andmekandjate kogumine, turvaline hävitamine ja hävitamise tõend"
   }
  },
  "call_center": {
   "title": {
    "de": "Callcenter und Kundenservice-Dienstleister",
    "en": "Call centre and customer service provider",
    "fr": "Centre d’appels et prestataire de service client",
    "nl": "Callcenter en klantenservicedienstverlener",
    "hu": "Telefonos ügyfélszolgálat és ügyfélszolgálati szolgáltató",
    "et": "Kõnekeskus ja klienditeenindusteenuse pakkuja"
   },
   "scope": {
    "de": "Entgegennahme und Bearbeitung von Kundenanrufen und Anfragen im Namen des Verantwortlichen",
    "en": "Taking and handling customer calls and enquiries on behalf of the controller",
    "fr": "Prise en charge et traitement des appels et demandes des clients au nom du responsable",
    "nl": "Aannemen en afhandelen van klantgesprekken en vragen namens de verwerkingsverantwoordelijke",
    "hu": "Az ügyfélhívások és megkeresések fogadása és kezelése az adatkezelő nevében",
    "et": "Klientide kõnede ja päringute vastuvõtmine ja menetlemine vastutava töötleja nimel"
   }
  },
  "video_security": {
   "title": {
    "de": "Videoüberwachung und Sicherheitsdienst",
    "en": "Video surveillance and security service",
    "fr": "Vidéosurveillance et service de sécurité",
    "nl": "Camerabewaking en beveiligingsdienst",
    "hu": "Videó-megfigyelés és biztonsági szolgálat",
    "et": "Videovalve ja turvateenus"
   },
   "scope": {
    "de": "Betrieb der Überwachungstechnik oder Auswertung von Aufnahmen im Auftrag des Verantwortlichen",
    "en": "Operation of the surveillance technology or evaluation of recordings on behalf of the controller",
    "fr": "Exploitation de la technique de surveillance ou exploitation des enregistrements pour le compte du responsable",
    "nl": "Beheer van de bewakingstechniek of uitwerking van opnamen namens de verwerkingsverantwoordelijke",
    "hu": "A megfigyelőtechnika üzemeltetése vagy a felvételek kiértékelése az adatkezelő megbízásából",
    "et": "Valvetehnika käitamine või salvestiste hindamine vastutava töötleja nimel"
   }
  },
  "ai_provider": {
   "title": {
    "de": "KI-Dienst (z. B. Assistent oder Textverarbeitung)",
    "en": "AI service (e.g. assistant or text processing)",
    "fr": "Service d’IA (p. ex. assistant ou traitement de texte)",
    "nl": "AI-dienst (bijv. assistent of tekstverwerking)",
    "hu": "AI-szolgáltatás (pl. asszisztens vagy szövegfeldolgozás)",
    "et": "TI-teenus (nt assistent või tekstitöötlus)"
   },
   "scope": {
    "de": "Verarbeitung von Eingaben und Dokumenten mit Hilfe eines KI-Modells; vertraglich sicherstellen, dass Eingaben nicht zum Training verwendet werden",
    "en": "Processing of inputs and documents using an AI model; ensure by contract that inputs are not used for training",
    "fr": "Traitement de saisies et de documents à l’aide d’un modèle d’IA ; garantir par contrat que les saisies ne servent pas à l’entraînement",
    "nl": "Verwerking van invoer en documenten met behulp van een AI-model; contractueel waarborgen dat invoer niet voor training wordt gebruikt",
    "hu": "Bemenetek és dokumentumok feldolgozása AI-modellel; szerződésben biztosítani kell, hogy a bemeneteket nem használják tanításra",
    "et": "Sisendite ja dokumentide töötlemine TI-mudeliga; tagage lepinguga, et sisendeid ei kasutata treenimiseks"
   }
  }
 },
 "incident": {
  "misdirected_mail": {
   "title": {
    "de": "Fehlversand einer E-Mail oder eines Dokuments",
    "en": "Misdirected e-mail or document",
    "fr": "E-mail ou document envoyé par erreur",
    "nl": "Verkeerd verzonden e-mail of document",
    "hu": "Tévesen elküldött e-mail vagy dokumentum",
    "et": "Valesti adresseeritud e-kiri või dokument"
   },
   "incidentType": "unauthorized_access",
   "dataCategories": [
    "name",
    "email"
   ],
   "dataSubjectTypes": [
    "customers"
   ],
   "containment": {
    "de": "Empfänger um Löschung und schriftliche Bestätigung bitten, Rückruf der Nachricht versuchen, Verteiler und Empfänger dokumentieren",
    "en": "Ask the recipient to delete it and confirm in writing, try to recall the message, document distribution list and recipients",
    "fr": "Demander au destinataire de supprimer et de confirmer par écrit, tenter de rappeler le message, documenter la liste de diffusion et les destinataires",
    "nl": "Ontvanger vragen te verwijderen en schriftelijk te bevestigen, bericht proberen terug te halen, verzendlijst en ontvangers vastleggen",
    "hu": "Kérje a címzettet a törlésre és írásbeli visszaigazolásra, próbálja visszahívni az üzenetet, dokumentálja a címlistát és a címzetteket",
    "et": "Palu saajal see kustutada ja kirjalikult kinnitada, püüa teade tagasi kutsuda, dokumenteeri levitusloend ja saajad"
   },
   "remediation": {
    "de": "Mitarbeiter sensibilisieren, automatische Adressvervollständigung und Verteilerlisten prüfen, Versandregeln (Vier-Augen-Prinzip bei sensiblen Daten) einführen",
    "en": "Raise awareness among staff, review address auto-completion and distribution lists, introduce sending rules (four-eyes principle for sensitive data)",
    "fr": "Sensibiliser le personnel, vérifier la saisie automatique des adresses et les listes de diffusion, introduire des règles d’envoi (principe des quatre yeux pour les données sensibles)",
    "nl": "Medewerkers bewustmaken, automatisch aanvullen van adressen en verzendlijsten controleren, verzendregels invoeren (vierogenprincipe bij gevoelige gegevens)",
    "hu": "A munkatársak érzékenyítése, a címek automatikus kiegészítésének és a címlisták ellenőrzése, küldési szabályok bevezetése (érzékeny adatoknál négyszemközti elv)",
    "et": "Suurenda töötajate teadlikkust, vaata üle aadresside automaatne täitmine ja levitusloendid, kehtesta saatmisreeglid (neljasilmareegel tundlike andmete puhul)"
   },
   "riskLevel": "low",
   "saNotificationRequired": false,
   "dsNotificationRequired": false
  },
  "lost_device": {
   "title": {
    "de": "Verlust oder Diebstahl eines Laptops, Smartphones oder Datenträgers",
    "en": "Loss or theft of a laptop, smartphone or storage medium",
    "fr": "Perte ou vol d’un ordinateur portable, smartphone ou support de données",
    "nl": "Verlies of diefstal van een laptop, smartphone of gegevensdrager",
    "hu": "Laptop, okostelefon vagy adathordozó elvesztése vagy ellopása",
    "et": "Sülearvuti, nutitelefoni või andmekandja kaotamine või vargus"
   },
   "incidentType": "loss",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "customers"
   ],
   "containment": {
    "de": "Gerät aus der Ferne sperren oder löschen, Zugangsdaten ändern, Zugänge widerrufen, Verlust bei der Polizei anzeigen, Verschlüsselungsstatus prüfen",
    "en": "Lock or wipe the device remotely, change credentials, revoke access, report the loss to the police, check whether the device was encrypted",
    "fr": "Verrouiller ou effacer l’appareil à distance, changer les identifiants, révoquer les accès, déclarer la perte à la police, vérifier le chiffrement",
    "nl": "Apparaat op afstand vergrendelen of wissen, inloggegevens wijzigen, toegang intrekken, verlies bij de politie melden, versleuteling controleren",
    "hu": "Az eszköz távoli zárolása vagy törlése, hozzáférési adatok módosítása, hozzáférések visszavonása, a veszteség bejelentése a rendőrségen, a titkosítás ellenőrzése",
    "et": "Lukusta või kustuta seade kaugjuhtimisega, vaheta pääsuandmed, tühista juurdepääs, teata kaotusest politseile, kontrolli, kas seade oli krüpteeritud"
   },
   "remediation": {
    "de": "Festplattenverschlüsselung und Geräteverwaltung (MDM) durchsetzen, Datenhaltung auf Geräten minimieren, Richtlinie für mobile Geräte überprüfen",
    "en": "Enforce disk encryption and device management (MDM), minimise data kept on devices, review the mobile device policy",
    "fr": "Imposer le chiffrement des disques et la gestion des appareils (MDM), minimiser les données sur les appareils, revoir la politique des appareils mobiles",
    "nl": "Schijfversleuteling en apparaatbeheer (MDM) afdwingen, gegevens op apparaten minimaliseren, beleid voor mobiele apparaten herzien",
    "hu": "A lemeztitkosítás és az eszközkezelés (MDM) érvényesítése, az eszközökön tárolt adatok minimalizálása, a mobil eszközök szabályzatának felülvizsgálata",
    "et": "Nõua kettakrüpteerimist ja seadmehaldust (MDM), minimeeri seadmetes hoitavaid andmeid, vaata üle mobiilseadmete poliitika"
   },
   "riskLevel": "medium",
   "saNotificationRequired": false,
   "dsNotificationRequired": false
  },
  "phishing": {
   "title": {
    "de": "Phishing mit Preisgabe von Zugangsdaten",
    "en": "Phishing with disclosure of credentials",
    "fr": "Hameçonnage avec divulgation d’identifiants",
    "nl": "Phishing met prijsgave van inloggegevens",
    "hu": "Adathalászat a hozzáférési adatok kiszivárgásával",
    "et": "Andmepüük pääsuandmete avaldamisega"
   },
   "incidentType": "unauthorized_access",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "customers"
   ],
   "containment": {
    "de": "Konto sofort sperren und Passwort ändern, aktive Sitzungen beenden, Weiterleitungsregeln prüfen, Zugriffe der letzten Tage auswerten, betroffene Systeme isolieren",
    "en": "Lock the account and change the password immediately, end active sessions, check forwarding rules, review recent access, isolate affected systems",
    "fr": "Verrouiller immédiatement le compte et changer le mot de passe, terminer les sessions actives, vérifier les règles de transfert, analyser les accès récents, isoler les systèmes concernés",
    "nl": "Account direct blokkeren en wachtwoord wijzigen, actieve sessies beëindigen, doorstuurregels controleren, recente toegang beoordelen, getroffen systemen isoleren",
    "hu": "A fiók azonnali zárolása és a jelszó módosítása, az aktív munkamenetek lezárása, a továbbítási szabályok ellenőrzése, a legutóbbi hozzáférések elemzése, az érintett rendszerek elkülönítése",
    "et": "Lukusta konto ja vaheta parool kohe, lõpeta aktiivsed seansid, kontrolli edastusreegleid, vaata üle hiljutised juurdepääsud, isoleeri mõjutatud süsteemid"
   },
   "remediation": {
    "de": "Mehrfaktor-Authentifizierung einführen oder erweitern, Awareness-Schulung zu Phishing, E-Mail-Filter verbessern, Meldeweg für verdächtige Mails bekannt machen",
    "en": "Introduce or extend multi-factor authentication, phishing awareness training, improve e-mail filters, publicise the reporting route for suspicious e-mails",
    "fr": "Introduire ou étendre l’authentification multifacteur, formation de sensibilisation au hameçonnage, améliorer les filtres de messagerie, faire connaître la voie de signalement des e-mails suspects",
    "nl": "Meerfactorauthenticatie invoeren of uitbreiden, phishingtraining, e-mailfilters verbeteren, meldroute voor verdachte e-mails bekendmaken",
    "hu": "Többfaktoros hitelesítés bevezetése vagy bővítése, adathalászat elleni tudatossági képzés, e-mail szűrők javítása, a gyanús levelek bejelentési útjának ismertetése",
    "et": "Võta kasutusele või laienda mitmefaktorilist autentimist, andmepüügi alane teadlikkuskoolitus, paranda e-posti filtreid, tee teatavaks kahtlastest e-kirjadest teatamise tee"
   },
   "riskLevel": "medium",
   "saNotificationRequired": true,
   "dsNotificationRequired": false
  },
  "ransomware": {
   "title": {
    "de": "Ransomware-Angriff",
    "en": "Ransomware attack",
    "fr": "Attaque par rançongiciel",
    "nl": "Ransomware-aanval",
    "hu": "Zsarolóvírus-támadás",
    "et": "Lunavararünnak"
   },
   "incidentType": "ransomware",
   "dataCategories": [
    "name",
    "email",
    "address",
    "financial",
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "customers",
    "contractors"
   ],
   "containment": {
    "de": "Betroffene Systeme vom Netz trennen, Angriffsweg eingrenzen, Backups auf Unversehrtheit prüfen, Krisenstab einberufen, Beweise sichern, keine Lösegeldzahlung ohne Abstimmung",
    "en": "Disconnect affected systems from the network, narrow down the attack path, check the integrity of backups, convene the crisis team, preserve evidence, no ransom payment without coordination",
    "fr": "Déconnecter les systèmes touchés du réseau, circonscrire le vecteur d’attaque, vérifier l’intégrité des sauvegardes, réunir la cellule de crise, préserver les preuves, pas de paiement de rançon sans concertation",
    "nl": "Getroffen systemen van het netwerk loskoppelen, aanvalsroute afbakenen, integriteit van back-ups controleren, crisisteam bijeenroepen, bewijs veiligstellen, geen losgeld betalen zonder overleg",
    "hu": "Az érintett rendszerek leválasztása a hálózatról, a támadási út behatárolása, a mentések épségének ellenőrzése, a válságstáb összehívása, a bizonyítékok biztosítása, váltságdíj fizetése csak egyeztetés után",
    "et": "Ühenda mõjutatud süsteemid võrgust lahti, piira rünnaku tee, kontrolli varukoopiate terviklust, kutsu kokku kriisimeeskond, säilita tõendid, ilma kooskõlastuseta lunaraha ei maksta"
   },
   "remediation": {
    "de": "Systeme aus sauberen Backups wiederherstellen, Schwachstelle schließen, Netzwerksegmentierung und Patchmanagement verbessern, Wiederherstellungsübung durchführen",
    "en": "Restore systems from clean backups, close the vulnerability, improve network segmentation and patch management, carry out a recovery exercise",
    "fr": "Restaurer les systèmes à partir de sauvegardes saines, corriger la vulnérabilité, améliorer la segmentation réseau et la gestion des correctifs, réaliser un exercice de restauration",
    "nl": "Systemen herstellen vanuit schone back-ups, kwetsbaarheid dichten, netwerksegmentatie en patchbeheer verbeteren, hersteloefening uitvoeren",
    "hu": "A rendszerek helyreállítása tiszta mentésből, a sérülékenység megszüntetése, a hálózati szegmentálás és a javításkezelés fejlesztése, helyreállítási gyakorlat tartása",
    "et": "Taasta süsteemid puhastest varukoopiatest, sulge haavatavus, paranda võrgu segmenteerimist ja paigahaldust, korralda taasteõppus"
   },
   "riskLevel": "high",
   "saNotificationRequired": true,
   "dsNotificationRequired": true
  },
  "account_compromise": {
   "title": {
    "de": "Unbefugter Zugriff durch ein kompromittiertes Konto",
    "en": "Unauthorised access through a compromised account",
    "fr": "Accès non autorisé via un compte compromis",
    "nl": "Onbevoegde toegang via een gecompromitteerd account",
    "hu": "Jogosulatlan hozzáférés feltört fiókon keresztül",
    "et": "Volitamata juurdepääs kompromiteeritud konto kaudu"
   },
   "incidentType": "unauthorized_access",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "employees",
    "customers"
   ],
   "containment": {
    "de": "Konto sperren, Sitzungen beenden, Passwörter und Schlüssel erneuern, Protokolle sichern und auswerten, Umfang des Zugriffs feststellen",
    "en": "Lock the account, end sessions, renew passwords and keys, preserve and analyse logs, establish the extent of access",
    "fr": "Verrouiller le compte, terminer les sessions, renouveler mots de passe et clés, sauvegarder et analyser les journaux, déterminer l’étendue de l’accès",
    "nl": "Account blokkeren, sessies beëindigen, wachtwoorden en sleutels vernieuwen, logboeken veiligstellen en analyseren, omvang van de toegang vaststellen",
    "hu": "A fiók zárolása, a munkamenetek lezárása, jelszavak és kulcsok megújítása, a naplók biztosítása és elemzése, a hozzáférés terjedelmének megállapítása",
    "et": "Lukusta konto, lõpeta seansid, uuenda paroolid ja võtmed, säilita ja analüüsi logisid, selgita välja juurdepääsu ulatus"
   },
   "remediation": {
    "de": "Berechtigungen überprüfen, Mehrfaktor-Authentifizierung durchsetzen, Protokollauswertung und Alarmierung verbessern",
    "en": "Review permissions, enforce multi-factor authentication, improve log analysis and alerting",
    "fr": "Revoir les droits, imposer l’authentification multifacteur, améliorer l’analyse des journaux et l’alerte",
    "nl": "Rechten controleren, meerfactorauthenticatie afdwingen, loganalyse en alarmering verbeteren",
    "hu": "A jogosultságok felülvizsgálata, a többfaktoros hitelesítés érvényesítése, a naplóelemzés és a riasztás fejlesztése",
    "et": "Vaata üle õigused, nõua mitmefaktorilist autentimist, paranda logianalüüsi ja hoiatusi"
   },
   "riskLevel": "high",
   "saNotificationRequired": true,
   "dsNotificationRequired": false
  },
  "cloud_misconfig": {
   "title": {
    "de": "Fehlkonfiguration: Daten öffentlich oder zu weit freigegeben",
    "en": "Misconfiguration: data publicly exposed or shared too widely",
    "fr": "Erreur de configuration : données exposées publiquement ou partagées trop largement",
    "nl": "Verkeerde configuratie: gegevens openbaar of te ruim gedeeld",
    "hu": "Hibás konfiguráció: nyilvánosan vagy túl széles körben megosztott adatok",
    "et": "Vale seadistus: andmed avalikult nähtavad või liiga laialt jagatud"
   },
   "incidentType": "unauthorized_access",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "customers",
    "employees"
   ],
   "containment": {
    "de": "Freigabe sofort entziehen, Zugriffsprotokolle sichern und auswerten, ermitteln, wer zugegriffen haben könnte, Suchmaschinen-Caches entfernen lassen",
    "en": "Withdraw the sharing immediately, preserve and analyse access logs, determine who may have accessed the data, have search engine caches removed",
    "fr": "Retirer immédiatement le partage, sauvegarder et analyser les journaux d’accès, déterminer qui a pu accéder aux données, faire supprimer les caches des moteurs de recherche",
    "nl": "Deling direct intrekken, toegangslogboeken veiligstellen en analyseren, vaststellen wie toegang kan hebben gehad, caches van zoekmachines laten verwijderen",
    "hu": "A megosztás azonnali visszavonása, a hozzáférési naplók biztosítása és elemzése, annak megállapítása, ki férhetett hozzá, a keresőmotorok gyorsítótárának eltávolíttatása",
    "et": "Tühista jagamine kohe, säilita ja analüüsi juurdepääsulogisid, selgita välja, kes võis andmetele ligi pääseda, lase otsingumootorite vahemälud eemaldada"
   },
   "remediation": {
    "de": "Freigabeprozess und Vier-Augen-Prinzip für Veröffentlichungen einführen, Konfigurationsprüfungen automatisieren, Standardeinstellungen restriktiv wählen",
    "en": "Introduce an approval process and four-eyes principle for publications, automate configuration checks, choose restrictive defaults",
    "fr": "Introduire un processus d’approbation et le principe des quatre yeux pour les publications, automatiser les contrôles de configuration, choisir des paramètres par défaut restrictifs",
    "nl": "Goedkeuringsproces en vierogenprincipe voor publicaties invoeren, configuratiecontroles automatiseren, restrictieve standaardinstellingen kiezen",
    "hu": "Jóváhagyási folyamat és négyszemközti elv bevezetése a közzétételekhez, a konfigurációellenőrzések automatizálása, szigorú alapbeállítások választása",
    "et": "Võta kasutusele kinnitusprotsess ja neljasilmareegel avaldamiste jaoks, automatiseeri seadistuste kontroll, vali piiravad vaikeväärtused"
   },
   "riskLevel": "medium",
   "saNotificationRequired": true,
   "dsNotificationRequired": false
  },
  "theft_documents": {
   "title": {
    "de": "Diebstahl oder Verlust von Papierunterlagen",
    "en": "Theft or loss of paper documents",
    "fr": "Vol ou perte de documents papier",
    "nl": "Diefstal of verlies van papieren documenten",
    "hu": "Papíralapú iratok ellopása vagy elvesztése",
    "et": "Paberdokumentide vargus või kadu"
   },
   "incidentType": "theft",
   "dataCategories": [
    "name",
    "address",
    "other"
   ],
   "dataSubjectTypes": [
    "customers",
    "employees"
   ],
   "containment": {
    "de": "Räume und Aktenschränke sichern, Verlust anzeigen, Umfang der betroffenen Unterlagen feststellen, Betroffene bei hohem Risiko informieren",
    "en": "Secure rooms and filing cabinets, report the loss, establish which documents are affected, inform data subjects if the risk is high",
    "fr": "Sécuriser les locaux et armoires, déclarer la perte, déterminer les documents concernés, informer les personnes concernées si le risque est élevé",
    "nl": "Ruimten en kasten beveiligen, verlies melden, vaststellen welke documenten zijn getroffen, betrokkenen informeren bij hoog risico",
    "hu": "A helyiségek és iratszekrények biztosítása, a veszteség bejelentése, az érintett iratok körének megállapítása, magas kockázat esetén az érintettek tájékoztatása",
    "et": "Turva ruumid ja kapid, teata kaotusest, selgita välja, mida dokumendid hõlmavad, teavita andmesubjekte, kui risk on kõrge"
   },
   "remediation": {
    "de": "Zutrittskonzept und Clean-Desk-Regeln überprüfen, Unterlagen digitalisieren und sicher aufbewahren, abschließbare Schränke nutzen",
    "en": "Review the access concept and clear desk rules, digitise documents and store them securely, use lockable cabinets",
    "fr": "Revoir le concept d’accès et les règles de bureau propre, numériser les documents et les conserver en sécurité, utiliser des armoires verrouillables",
    "nl": "Toegangsconcept en clear-deskregels herzien, documenten digitaliseren en veilig bewaren, afsluitbare kasten gebruiken",
    "hu": "A beléptetési koncepció és a tiszta asztal szabályok felülvizsgálata, az iratok digitalizálása és biztonságos őrzése, zárható szekrények használata",
    "et": "Vaata üle juurdepääsukontseptsioon ja puhta laua reeglid, digiteeri dokumendid ja hoia neid turvaliselt, kasuta lukustatavaid kappe"
   },
   "riskLevel": "medium",
   "saNotificationRequired": false,
   "dsNotificationRequired": false
  },
  "accidental_deletion": {
   "title": {
    "de": "Versehentliche Löschung oder Veränderung von Daten",
    "en": "Accidental deletion or alteration of data",
    "fr": "Suppression ou modification accidentelle de données",
    "nl": "Onbedoeld verwijderen of wijzigen van gegevens",
    "hu": "Adatok véletlen törlése vagy módosítása",
    "et": "Andmete juhuslik kustutamine või muutmine"
   },
   "incidentType": "deletion",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "customers",
    "employees"
   ],
   "containment": {
    "de": "Wiederherstellung aus Backup oder Papierkorb, Umfang der Löschung feststellen, betroffene Prozesse informieren",
    "en": "Restore from backup or recycle bin, establish the extent of the deletion, inform affected processes",
    "fr": "Restaurer depuis la sauvegarde ou la corbeille, déterminer l’étendue de la suppression, informer les processus concernés",
    "nl": "Herstellen vanuit back-up of prullenbak, omvang van de verwijdering vaststellen, getroffen processen informeren",
    "hu": "Helyreállítás mentésből vagy a lomtárból, a törlés terjedelmének megállapítása, az érintett folyamatok tájékoztatása",
    "et": "Taasta varukoopiast või prügikastist, selgita välja kustutamise ulatus, teavita mõjutatud protsesse"
   },
   "remediation": {
    "de": "Berechtigungen für Löschungen einschränken, Versionierung und Papierkorb aktivieren, Wiederherstellungstest regelmäßig durchführen",
    "en": "Restrict permissions to delete, activate versioning and recycle bin, run restore tests regularly",
    "fr": "Limiter les droits de suppression, activer le versionnage et la corbeille, effectuer régulièrement des tests de restauration",
    "nl": "Rechten voor verwijderen beperken, versiebeheer en prullenbak activeren, regelmatig herstelproeven uitvoeren",
    "hu": "A törlési jogosultságok korlátozása, a verziókezelés és a lomtár bekapcsolása, rendszeres helyreállítási tesztek",
    "et": "Piira kustutamisõigusi, aktiveeri versioonihaldus ja prügikast, korralda taastetestid regulaarselt"
   },
   "riskLevel": "low",
   "saNotificationRequired": false,
   "dsNotificationRequired": false
  },
  "publication_error": {
   "title": {
    "de": "Versehentliche Veröffentlichung personenbezogener Daten",
    "en": "Accidental publication of personal data",
    "fr": "Publication accidentelle de données personnelles",
    "nl": "Onbedoelde publicatie van persoonsgegevens",
    "hu": "Személyes adatok véletlen közzététele",
    "et": "Isikuandmete juhuslik avaldamine"
   },
   "incidentType": "unauthorized_access",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "customers",
    "employees",
    "website_visitors"
   ],
   "containment": {
    "de": "Veröffentlichung sofort entfernen, Cache und Suchmaschinen bereinigen lassen, Abrufe auswerten, Betroffene und Kooperationspartner informieren",
    "en": "Remove the publication immediately, have caches and search engines cleaned, analyse accesses, inform data subjects and partners",
    "fr": "Retirer immédiatement la publication, faire nettoyer les caches et moteurs de recherche, analyser les accès, informer les personnes concernées et les partenaires",
    "nl": "Publicatie direct verwijderen, caches en zoekmachines laten opschonen, toegang analyseren, betrokkenen en partners informeren",
    "hu": "A közzététel azonnali eltávolítása, a gyorsítótárak és keresők tisztíttatása, a lekérések elemzése, az érintettek és partnerek tájékoztatása",
    "et": "Eemalda avaldatud sisu kohe, lase vahemälud ja otsingumootorid puhastada, analüüsi juurdepääse, teavita andmesubjekte ja partnereid"
   },
   "remediation": {
    "de": "Freigabeprozess für Veröffentlichungen einführen, Schulung der Redaktion, Checkliste für personenbezogene Daten",
    "en": "Introduce an approval process for publications, train editors, checklist for personal data",
    "fr": "Introduire un processus d’approbation des publications, former la rédaction, liste de contrôle pour les données personnelles",
    "nl": "Goedkeuringsproces voor publicaties invoeren, redactie trainen, checklist voor persoonsgegevens",
    "hu": "Jóváhagyási folyamat bevezetése a közzétételekhez, a szerkesztők képzése, ellenőrzőlista a személyes adatokhoz",
    "et": "Võta kasutusele avaldamiste kinnitusprotsess, koolita toimetajaid, koosta isikuandmete kontrollnimekiri"
   },
   "riskLevel": "medium",
   "saNotificationRequired": false,
   "dsNotificationRequired": false
  },
  "insider": {
   "title": {
    "de": "Missbrauch von Zugriffsrechten durch Beschäftigte",
    "en": "Misuse of access rights by employees",
    "fr": "Utilisation abusive des droits d’accès par des collaborateurs",
    "nl": "Misbruik van toegangsrechten door medewerkers",
    "hu": "A hozzáférési jogosultságokkal való visszaélés munkatársak által",
    "et": "Juurdepääsuõiguste kuritarvitamine töötajate poolt"
   },
   "incidentType": "unauthorized_access",
   "dataCategories": [
    "name",
    "email",
    "other"
   ],
   "dataSubjectTypes": [
    "customers",
    "employees"
   ],
   "containment": {
    "de": "Zugriff sperren, Protokolle sichern, Sachverhalt mit Personalabteilung und Datenschutzbeauftragtem klären, Beweise gerichtsfest sichern",
    "en": "Block access, preserve logs, clarify the facts with the HR department and the DPO, preserve evidence in a way that holds up in court",
    "fr": "Bloquer l’accès, sauvegarder les journaux, clarifier les faits avec le service RH et le DPD, préserver les preuves de manière recevable en justice",
    "nl": "Toegang blokkeren, logboeken veiligstellen, feiten verduidelijken met HR en de FG, bewijs gerechtelijk bruikbaar veiligstellen",
    "hu": "A hozzáférés zárolása, a naplók biztosítása, a tényállás tisztázása a HR-osztállyal és a DPO-val, a bizonyítékok bíróság előtt is használható biztosítása",
    "et": "Blokeeri juurdepääs, säilita logid, selgita asjaolud välja koos personaliosakonna ja andmekaitsespetsialistiga, säilita tõendid kohtus vastu pidaval viisil"
   },
   "remediation": {
    "de": "Berechtigungen nach dem Need-to-know-Prinzip prüfen, Zugriffsprotokollierung auswerten, Verpflichtung zur Vertraulichkeit erneuern, arbeitsrechtliche Schritte prüfen",
    "en": "Review permissions under the need-to-know principle, evaluate access logging, renew the confidentiality undertaking, consider employment-law steps",
    "fr": "Revoir les droits selon le principe du besoin d’en connaître, exploiter la journalisation des accès, renouveler l’engagement de confidentialité, examiner les mesures de droit du travail",
    "nl": "Rechten controleren volgens het need-to-know-principe, toegangslogging uitwerken, geheimhoudingsverklaring vernieuwen, arbeidsrechtelijke stappen overwegen",
    "hu": "A jogosultságok felülvizsgálata a „need-to-know” elv szerint, a hozzáférés-naplózás elemzése, a titoktartási nyilatkozat megújítása, munkajogi lépések mérlegelése",
    "et": "Vaata üle õigused põhimõtte „teadmisvajadus“ alusel, hinda juurdepääsu logimist, uuenda konfidentsiaalsuskohustust, kaalu töölepinguõiguslikke samme"
   },
   "riskLevel": "high",
   "saNotificationRequired": true,
   "dsNotificationRequired": false
  }
 },
 "dsar": {
  "access": {
   "title": {
    "de": "Antwort auf ein Auskunftsersuchen (Art. 15)",
    "en": "Reply to an access request (Art. 15)",
    "fr": "Réponse à une demande d’accès (art. 15)",
    "nl": "Antwoord op een inzageverzoek (art. 15)",
    "hu": "Válasz hozzáférési kérelemre (15. cikk)",
    "et": "Vastus juurdepääsutaotlusele (art 15)"
   },
   "requestType": "access",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Auskunftsersuchens nach Art. 15 DSGVO. Wir teilen Ihnen mit, ob wir Daten über Sie verarbeiten, und stellen Ihnen eine Kopie dieser Daten zur Verfügung. Zusätzlich erhalten Sie Angaben zu den Zwecken, den Kategorien der Daten, den Empfängern, der geplanten Speicherdauer, der Herkunft der Daten sowie zu automatisierten Entscheidungen, soweit vorhanden. Sie haben das Recht auf Berichtigung, Löschung, Einschränkung der Verarbeitung und Widerspruch sowie das Recht auf Beschwerde bei der Aufsichtsbehörde.",
    "en": "Dear Sir or Madam, we confirm receipt of your access request under Art. 15 GDPR. We inform you whether we process data about you and provide you with a copy of that data. You also receive information on the purposes, the categories of data, the recipients, the planned storage period, the source of the data and any automated decision-making. You have the right to rectification, erasure, restriction of processing and objection, and the right to lodge a complaint with the supervisory authority.",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande d’accès au titre de l’art. 15 RGPD. Nous vous indiquons si nous traitons des données vous concernant et vous en remettons une copie. Vous recevez également des informations sur les finalités, les catégories de données, les destinataires, la durée de conservation prévue, l’origine des données et, le cas échéant, la prise de décision automatisée. Vous disposez des droits de rectification, d’effacement, de limitation du traitement et d’opposition, ainsi que du droit d’introduire une réclamation auprès de l’autorité de contrôle.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw inzageverzoek op grond van art. 15 AVG. Wij laten u weten of wij gegevens over u verwerken en verstrekken u een kopie van die gegevens. Daarnaast ontvangt u informatie over de doeleinden, de categorieën gegevens, de ontvangers, de beoogde bewaartermijn, de herkomst van de gegevens en eventuele geautomatiseerde besluitvorming. U hebt het recht op rectificatie, wissing, beperking van de verwerking en bezwaar, en het recht een klacht in te dienen bij de toezichthouder.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 15. cikke szerinti hozzáférési kérelme beérkezését. Tájékoztatjuk arról, hogy kezelünk-e Önre vonatkozó adatokat, és rendelkezésére bocsátjuk ezek másolatát. Emellett tájékoztatást kap a célokról, az adatok kategóriáiról, a címzettekről, a tervezett tárolási időről, az adatok forrásáról és az esetleges automatizált döntéshozatalról. Önt megilleti a helyesbítés, a törlés, az adatkezelés korlátozása és a tiltakozás joga, valamint a felügyeleti hatóságnál történő panasztétel joga.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie juurdepääsutaotluse IKÜM art 15 alusel. Teavitame teid, kas töötleme teie kohta andmeid, ja esitame teile nende andmete koopia. Saate ka teavet eesmärkide, andmekategooriate, saajate, kavandatud säilitusaja, andmete päritolu ja võimaliku automatiseeritud otsuste tegemise kohta. Teil on õigus andmete parandamisele, kustutamisele, töötlemise piiramisele ja vastuväitele ning õigus esitada kaebus järelevalveasutusele."
   }
  },
  "rectification": {
   "title": {
    "de": "Antwort auf ein Berichtigungsverlangen (Art. 16)",
    "en": "Reply to a rectification request (Art. 16)",
    "fr": "Réponse à une demande de rectification (art. 16)",
    "nl": "Antwoord op een verzoek om rectificatie (art. 16)",
    "hu": "Válasz helyesbítési kérelemre (16. cikk)",
    "et": "Vastus parandamistaotlusele (art 16)"
   },
   "requestType": "rectification",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Berichtigungsverlangens nach Art. 16 DSGVO. Wir haben die unrichtigen Daten geprüft und berichtigt beziehungsweise vervollständigt. Empfänger, denen wir die Daten offengelegt haben, informieren wir über die Berichtigung, soweit dies möglich ist und keinen unverhältnismäßigen Aufwand erfordert.",
    "en": "Dear Sir or Madam, we confirm receipt of your request for rectification under Art. 16 GDPR. We have checked the inaccurate data and corrected or completed it. We inform recipients to whom we disclosed the data about the rectification, as far as this is possible and does not involve disproportionate effort.",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande de rectification au titre de l’art. 16 RGPD. Nous avons vérifié les données inexactes et les avons rectifiées ou complétées. Nous informons de la rectification les destinataires auxquels nous avons communiqué les données, dans la mesure où cela est possible et n’exige pas d’efforts disproportionnés.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw verzoek om rectificatie op grond van art. 16 AVG. Wij hebben de onjuiste gegevens gecontroleerd en gecorrigeerd of aangevuld. Ontvangers aan wie wij de gegevens hebben verstrekt, informeren wij over de rectificatie, voor zover dat mogelijk is en geen onevenredige inspanning vergt.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 16. cikke szerinti helyesbítési kérelme beérkezését. A pontatlan adatokat megvizsgáltuk, és helyesbítettük, illetve kiegészítettük. Azokat a címzetteket, akikkel az adatokat közöltük, tájékoztatjuk a helyesbítésről, amennyiben ez lehetséges és nem jár aránytalan erőfeszítéssel.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie parandamistaotluse IKÜM art 16 alusel. Oleme ebaõiged andmed üle vaadanud ning need parandanud või täiendanud. Teavitame saajaid, kellele andmed avaldasime, parandamisest, kui see on võimalik ja ei nõua ebaproportsionaalseid jõupingutusi."
   }
  },
  "erasure": {
   "title": {
    "de": "Antwort auf ein Löschverlangen (Art. 17)",
    "en": "Reply to an erasure request (Art. 17)",
    "fr": "Réponse à une demande d’effacement (art. 17)",
    "nl": "Antwoord op een verzoek om wissing (art. 17)",
    "hu": "Válasz törlési kérelemre (17. cikk)",
    "et": "Vastus kustutamistaotlusele (art 17)"
   },
   "requestType": "erasure",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Löschverlangens nach Art. 17 DSGVO. Wir haben geprüft, ob die Daten gelöscht werden müssen, und die Löschung vorgenommen. Daten, für die gesetzliche Aufbewahrungspflichten gelten oder die zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen erforderlich sind, haben wir gesperrt und löschen sie nach Ablauf der Fristen. Empfänger der Daten informieren wir über die Löschung.",
    "en": "Dear Sir or Madam, we confirm receipt of your erasure request under Art. 17 GDPR. We have checked whether the data must be erased and carried out the erasure. Data subject to statutory retention obligations or needed for the establishment, exercise or defence of legal claims has been blocked and will be erased when the periods expire. We inform recipients of the data about the erasure.",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande d’effacement au titre de l’art. 17 RGPD. Nous avons vérifié si les données doivent être effacées et procédé à l’effacement. Les données soumises à des obligations légales de conservation ou nécessaires à la constatation, à l’exercice ou à la défense de droits en justice ont été bloquées et seront effacées à l’expiration des délais. Nous informons les destinataires des données de l’effacement.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw verzoek om wissing op grond van art. 17 AVG. Wij hebben nagegaan of de gegevens moeten worden gewist en de wissing uitgevoerd. Gegevens waarvoor wettelijke bewaarplichten gelden of die nodig zijn voor de instelling, uitoefening of onderbouwing van een rechtsvordering, zijn geblokkeerd en worden na afloop van de termijnen gewist. Ontvangers van de gegevens informeren wij over de wissing.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 17. cikke szerinti törlési kérelme beérkezését. Megvizsgáltuk, hogy az adatokat törölni kell-e, és a törlést elvégeztük. Azokat az adatokat, amelyekre jogszabályi megőrzési kötelezettség vonatkozik, vagy amelyek jogi igények előterjesztéséhez, érvényesítéséhez vagy védelméhez szükségesek, zároltuk, és a határidők lejártakor töröljük. Az adatok címzettjeit tájékoztatjuk a törlésről.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie kustutamistaotluse IKÜM art 17 alusel. Oleme kontrollinud, kas andmed tuleb kustutada, ja kustutamise teostanud. Andmed, mille suhtes kehtivad seadusjärgsed säilitamiskohustused või mida on vaja õigusnõuete esitamiseks, täitmiseks või kaitsmiseks, on blokeeritud ja kustutatakse tähtaegade lõppedes. Teavitame andmete saajaid kustutamisest."
   }
  },
  "restriction": {
   "title": {
    "de": "Antwort auf ein Verlangen auf Einschränkung der Verarbeitung (Art. 18)",
    "en": "Reply to a request for restriction of processing (Art. 18)",
    "fr": "Réponse à une demande de limitation du traitement (art. 18)",
    "nl": "Antwoord op een verzoek om beperking van de verwerking (art. 18)",
    "hu": "Válasz az adatkezelés korlátozására irányuló kérelemre (18. cikk)",
    "et": "Vastus töötlemise piiramise taotlusele (art 18)"
   },
   "requestType": "restriction",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Verlangens auf Einschränkung der Verarbeitung nach Art. 18 DSGVO. Wir haben die Daten gekennzeichnet und verarbeiten sie bis zur Klärung nur noch eingeschränkt, das heißt im Wesentlichen nur zur Speicherung. Wir informieren Sie, bevor die Einschränkung aufgehoben wird.",
    "en": "Dear Sir or Madam, we confirm receipt of your request for restriction of processing under Art. 18 GDPR. We have marked the data and will process it only in a restricted way until the matter is clarified, essentially for storage only. We will inform you before the restriction is lifted.",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande de limitation du traitement au titre de l’art. 18 RGPD. Nous avons marqué les données et ne les traitons plus que de manière limitée jusqu’à clarification, c’est-à-dire pour l’essentiel uniquement pour la conservation. Nous vous informerons avant la levée de la limitation.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw verzoek om beperking van de verwerking op grond van art. 18 AVG. Wij hebben de gegevens gemarkeerd en verwerken ze tot opheldering slechts beperkt, in wezen alleen voor opslag. Wij informeren u voordat de beperking wordt opgeheven.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 18. cikke szerinti adatkezelés-korlátozási kérelme beérkezését. Az adatokat megjelöltük, és a tisztázásig csak korlátozottan, lényegében csak tárolás céljából kezeljük őket. A korlátozás feloldása előtt tájékoztatjuk Önt.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie töötlemise piiramise taotluse IKÜM art 18 alusel. Oleme andmed märgistanud ja töötleme neid kuni asja selgitamiseni ainult piiratult, sisuliselt ainult säilitamiseks. Teavitame teid enne piirangu tühistamist."
   }
  },
  "portability": {
   "title": {
    "de": "Antwort auf ein Verlangen auf Datenübertragbarkeit (Art. 20)",
    "en": "Reply to a data portability request (Art. 20)",
    "fr": "Réponse à une demande de portabilité des données (art. 20)",
    "nl": "Antwoord op een verzoek om gegevensoverdraagbaarheid (art. 20)",
    "hu": "Válasz adathordozhatósági kérelemre (20. cikk)",
    "et": "Vastus andmete ülekandmise taotlusele (art 20)"
   },
   "requestType": "portability",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Verlangens auf Datenübertragbarkeit nach Art. 20 DSGVO. Wir stellen Ihnen die Daten, die Sie uns bereitgestellt haben und die wir auf Grundlage Ihrer Einwilligung oder eines Vertrags automatisiert verarbeiten, in einem strukturierten, gängigen und maschinenlesbaren Format zur Verfügung. Auf Wunsch übermitteln wir sie, soweit technisch machbar, direkt an einen anderen Verantwortlichen.",
    "en": "Dear Sir or Madam, we confirm receipt of your data portability request under Art. 20 GDPR. We provide the data you gave us and that we process by automated means on the basis of your consent or a contract in a structured, commonly used and machine-readable format. On request, and where technically feasible, we transmit it directly to another controller.",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande de portabilité des données au titre de l’art. 20 RGPD. Nous mettons à votre disposition, dans un format structuré, couramment utilisé et lisible par machine, les données que vous nous avez fournies et que nous traitons de manière automatisée sur la base de votre consentement ou d’un contrat. Sur demande et si c’est techniquement possible, nous les transmettons directement à un autre responsable du traitement.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw verzoek om gegevensoverdraagbaarheid op grond van art. 20 AVG. Wij stellen de gegevens die u ons hebt verstrekt en die wij geautomatiseerd verwerken op basis van uw toestemming of een overeenkomst, ter beschikking in een gestructureerd, gangbaar en machineleesbaar formaat. Op verzoek en voor zover technisch mogelijk dragen wij ze rechtstreeks over aan een andere verwerkingsverantwoordelijke.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 20. cikke szerinti adathordozhatósági kérelme beérkezését. Az Ön által rendelkezésünkre bocsátott, hozzájárulása vagy szerződés alapján automatizáltan kezelt adatokat strukturált, széles körben használt, géppel olvasható formátumban adjuk át. Kérésére, ha technikailag megvalósítható, közvetlenül továbbítjuk őket egy másik adatkezelőnek.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie andmete ülekandmise taotluse IKÜM art 20 alusel. Esitame andmed, mille te meile andsite ja mida me töötleme automatiseeritult teie nõusoleku või lepingu alusel, struktureeritud, üldkasutatavas ja masinloetavas vormingus. Taotluse korral ja kui see on tehniliselt teostatav, edastame need otse teisele vastutavale töötlejale."
   }
  },
  "objection": {
   "title": {
    "de": "Antwort auf einen Widerspruch (Art. 21)",
    "en": "Reply to an objection (Art. 21)",
    "fr": "Réponse à une opposition (art. 21)",
    "nl": "Antwoord op een bezwaar (art. 21)",
    "hu": "Válasz tiltakozásra (21. cikk)",
    "et": "Vastus vastuväitele (art 21)"
   },
   "requestType": "objection",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Widerspruchs nach Art. 21 DSGVO. Wir haben geprüft, ob zwingende schutzwürdige Gründe für die Verarbeitung bestehen, die Ihre Interessen überwiegen. Gegen Direktwerbung ist der Widerspruch jederzeit wirksam; wir haben die Verarbeitung zu diesem Zweck beendet. Über das Ergebnis unserer Prüfung informieren wir Sie.",
    "en": "Dear Sir or Madam, we confirm receipt of your objection under Art. 21 GDPR. We have checked whether there are compelling legitimate grounds for the processing that override your interests. An objection to direct marketing is effective at any time; we have stopped processing for that purpose. We inform you about the result of our review.",
    "fr": "Madame, Monsieur, nous accusons réception de votre opposition au titre de l’art. 21 RGPD. Nous avons vérifié s’il existe des motifs légitimes impérieux pour le traitement qui prévalent sur vos intérêts. L’opposition à la prospection directe est effective à tout moment ; nous avons cessé le traitement à cette fin. Nous vous informons du résultat de notre examen.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw bezwaar op grond van art. 21 AVG. Wij hebben nagegaan of er dwingende gerechtvaardigde gronden voor de verwerking zijn die zwaarder wegen dan uw belangen. Bezwaar tegen direct marketing is altijd van kracht; wij hebben de verwerking voor dat doel beëindigd. Wij informeren u over de uitkomst van onze beoordeling.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 21. cikke szerinti tiltakozása beérkezését. Megvizsgáltuk, hogy fennállnak-e az adatkezelést indokoló, az Ön érdekeit megelőző kényszerítő erejű jogos okok. A közvetlen üzletszerzés elleni tiltakozás bármikor hatályos; az adatkezelést erre a célra megszüntettük. Vizsgálatunk eredményéről tájékoztatjuk Önt.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie vastuväite IKÜM art 21 alusel. Oleme kontrollinud, kas töötlemiseks on kaalukaid õigustatud põhjusi, mis ületavad teie huvid. Vastuväide otseturundusele kehtib igal ajal; oleme selleks otstarbeks töötlemise lõpetanud. Teavitame teid oma kontrolli tulemusest."
   }
  },
  "review_automated": {
   "title": {
    "de": "Antwort zu automatisierten Entscheidungen (Art. 22)",
    "en": "Reply regarding automated decisions (Art. 22)",
    "fr": "Réponse concernant les décisions automatisées (art. 22)",
    "nl": "Antwoord over geautomatiseerde besluitvorming (art. 22)",
    "hu": "Válasz automatizált döntéshozatalról (22. cikk)",
    "et": "Vastus automatiseeritud otsuste kohta (art 22)"
   },
   "requestType": "review_automated",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihres Anliegens zu einer automatisierten Entscheidung nach Art. 22 DSGVO. Die Entscheidung wird durch eine zuständige Person überprüft. Sie können Ihren Standpunkt darlegen und die Entscheidung anfechten. Auf Wunsch erläutern wir Ihnen die involvierte Logik sowie die Tragweite und die angestrebten Auswirkungen der Verarbeitung.",
    "en": "Dear Sir or Madam, we confirm receipt of your concern about an automated decision under Art. 22 GDPR. A responsible person will review the decision. You may express your point of view and contest the decision. On request we explain the logic involved and the significance and envisaged consequences of the processing.",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande relative à une décision automatisée au titre de l’art. 22 RGPD. La décision sera réexaminée par une personne compétente. Vous pouvez exprimer votre point de vue et contester la décision. Sur demande, nous vous expliquons la logique sous-jacente ainsi que l’importance et les conséquences prévues du traitement.",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw verzoek over een geautomatiseerd besluit op grond van art. 22 AVG. Het besluit wordt beoordeeld door een bevoegd persoon. U kunt uw standpunt naar voren brengen en het besluit aanvechten. Op verzoek lichten wij de onderliggende logica en het belang en de verwachte gevolgen van de verwerking toe.",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk a GDPR 22. cikke szerinti automatizált döntéssel kapcsolatos megkeresése beérkezését. A döntést illetékes személy felülvizsgálja. Kifejtheti álláspontját, és megtámadhatja a döntést. Kérésére ismertetjük az alkalmazott logikát, valamint az adatkezelés jelentőségét és tervezett következményeit.",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme kätte saanud teie kaebuse automatiseeritud otsuse kohta IKÜM art 22 alusel. Vastutav isik vaatab otsuse üle. Teil on õigus väljendada oma seisukohta ja otsus vaidlustada. Taotluse korral selgitame kasutatud loogikat ning töötlemise tähtsust ja kavandatud tagajärgi."
   }
  },
  "identity": {
   "title": {
    "de": "Nachforderung eines Identitätsnachweises (Art. 12 Abs. 6)",
    "en": "Request for proof of identity (Art. 12(6))",
    "fr": "Demande de justificatif d’identité (art. 12, par. 6)",
    "nl": "Verzoek om identiteitsbewijs (art. 12, lid 6)",
    "hu": "Személyazonosság igazolásának kérése (12. cikk (6) bekezdés)",
    "et": "Taotlus isikusamasuse tõendamiseks (art 12 lg 6)"
   },
   "requestType": "access",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir haben Ihre Anfrage erhalten. Um Ihre Identität sicher festzustellen und Ihre Daten nicht an Unbefugte herauszugeben, bitten wir Sie um einen Nachweis Ihrer Identität, der sich auf das Erforderliche beschränkt (zum Beispiel die Bestätigung über die bei uns hinterlegte Kontaktadresse). Die Frist für die Bearbeitung beginnt, sobald uns der Nachweis vorliegt.",
    "en": "Dear Sir or Madam, we have received your request. To establish your identity with certainty and not to release your data to unauthorised persons, we ask you for proof of your identity limited to what is necessary (for example a confirmation via the contact address we hold). The time limit for handling your request starts when we have received the proof.",
    "fr": "Madame, Monsieur, nous avons bien reçu votre demande. Afin d’établir votre identité avec certitude et de ne pas communiquer vos données à des personnes non autorisées, nous vous demandons un justificatif d’identité limité au nécessaire (par exemple une confirmation via l’adresse de contact que nous détenons). Le délai de traitement commence lorsque nous avons reçu le justificatif.",
    "nl": "Geachte heer, mevrouw, wij hebben uw verzoek ontvangen. Om uw identiteit met zekerheid vast te stellen en uw gegevens niet aan onbevoegden te verstrekken, vragen wij u om een identiteitsbewijs dat beperkt blijft tot het noodzakelijke (bijvoorbeeld een bevestiging via het contactadres dat wij van u hebben). De termijn voor de afhandeling begint zodra wij het bewijs hebben ontvangen.",
    "hu": "Tisztelt Hölgyem/Uram! Megkaptuk megkeresését. Személyazonosságának biztos megállapítása és adatainak illetéktelenekhez jutásának megelőzése érdekében kérjük, a szükséges mértékre korlátozva igazolja személyazonosságát (például a nálunk nyilvántartott elérhetőségre küldött visszaigazolással). A kérelem kezelésére nyitva álló határidő az igazolás beérkezésekor kezdődik.",
    "et": "Lugupeetud pöörduja, oleme teie taotluse kätte saanud. Teie isikusamasuse kindlaksmääramiseks ja selleks, et mitte avaldada teie andmeid volitamata isikutele, palume teilt vajalikus ulatuses isikusamasuse tõendit (näiteks kinnitust meile teada oleva kontaktaadressi kaudu). Taotluse menetlemise tähtaeg algab tõendi kättesaamisest."
   }
  },
  "extension": {
   "title": {
    "de": "Mitteilung über die Fristverlängerung (Art. 12 Abs. 3)",
    "en": "Notice of extension of the time limit (Art. 12(3))",
    "fr": "Information sur la prolongation du délai (art. 12, par. 3)",
    "nl": "Mededeling over verlenging van de termijn (art. 12, lid 3)",
    "hu": "Értesítés a határidő meghosszabbításáról (12. cikk (3) bekezdés)",
    "et": "Teade tähtaja pikendamise kohta (art 12 lg 3)"
   },
   "requestType": "access",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir bestätigen den Eingang Ihrer Anfrage. Wegen der Komplexität und der Anzahl der Anfragen können wir sie nicht innerhalb eines Monats abschließend bearbeiten. Wir verlängern die Frist um bis zu zwei weitere Monate und informieren Sie hiermit innerhalb der ersten Frist über die Gründe: (Gründe eintragen).",
    "en": "Dear Sir or Madam, we confirm receipt of your request. Because of its complexity and the number of requests, we cannot complete it within one month. We extend the time limit by up to two further months and inform you within the first period of the reasons: (enter reasons).",
    "fr": "Madame, Monsieur, nous accusons réception de votre demande. En raison de sa complexité et du nombre de demandes, nous ne pouvons pas la traiter dans un délai d’un mois. Nous prolongeons le délai de deux mois supplémentaires au maximum et vous informons dans le délai initial des motifs : (indiquer les motifs).",
    "nl": "Geachte heer, mevrouw, wij bevestigen de ontvangst van uw verzoek. Vanwege de complexiteit en het aantal verzoeken kunnen wij het niet binnen een maand afronden. Wij verlengen de termijn met ten hoogste twee maanden en informeren u binnen de eerste termijn over de redenen: (redenen invullen).",
    "hu": "Tisztelt Hölgyem/Uram! Visszaigazoljuk megkeresése beérkezését. A megkeresés összetettsége és a megkeresések száma miatt azt egy hónapon belül nem tudjuk lezárni. A határidőt legfeljebb két további hónappal meghosszabbítjuk, és az első határidőn belül tájékoztatjuk Önt az okokról: (az okok megadandók).",
    "et": "Lugupeetud pöörduja, kinnitame, et oleme teie taotluse kätte saanud. Selle keerukuse ja taotluste arvu tõttu ei saa me seda ühe kuu jooksul lõpetada. Pikendame tähtaega kuni kahe täiendava kuu võrra ja teavitame teid esimese tähtaja jooksul põhjustest: (sisestage põhjused)."
   }
  },
  "refusal": {
   "title": {
    "de": "Ablehnung eines Antrags (Art. 12 Abs. 4 und 5)",
    "en": "Refusal of a request (Art. 12(4) and (5))",
    "fr": "Refus d’une demande (art. 12, par. 4 et 5)",
    "nl": "Afwijzing van een verzoek (art. 12, lid 4 en 5)",
    "hu": "Kérelem elutasítása (12. cikk (4) és (5) bekezdés)",
    "et": "Taotluse tagasilükkamine (art 12 lg 4 ja 5)"
   },
   "requestType": "access",
   "response": {
    "de": "Sehr geehrte Damen und Herren, wir haben Ihre Anfrage geprüft. Wir können ihr nicht entsprechen, weil: (Grund eintragen, zum Beispiel offensichtlich unbegründet oder exzessiv, Rechte Dritter betroffen, gesetzliche Ausnahme). Sie haben das Recht, bei der Aufsichtsbehörde Beschwerde einzulegen und gerichtlichen Rechtsschutz in Anspruch zu nehmen.",
    "en": "Dear Sir or Madam, we have reviewed your request. We cannot comply with it because: (enter the reason, for example manifestly unfounded or excessive, rights of third parties affected, statutory exception). You have the right to lodge a complaint with the supervisory authority and to seek a judicial remedy.",
    "fr": "Madame, Monsieur, nous avons examiné votre demande. Nous ne pouvons pas y donner suite car : (indiquer le motif, par exemple manifestement infondée ou excessive, droits de tiers concernés, exception légale). Vous avez le droit d’introduire une réclamation auprès de l’autorité de contrôle et de former un recours juridictionnel.",
    "nl": "Geachte heer, mevrouw, wij hebben uw verzoek beoordeeld. Wij kunnen er niet aan voldoen omdat: (reden invullen, bijvoorbeeld kennelijk ongegrond of buitensporig, rechten van derden geraakt, wettelijke uitzondering). U hebt het recht een klacht in te dienen bij de toezichthouder en een voorziening in rechte te vragen.",
    "hu": "Tisztelt Hölgyem/Uram! Megvizsgáltuk megkeresését. Annak nem tudunk eleget tenni, mert: (az ok megadandó, például nyilvánvalóan megalapozatlan vagy túlzó, harmadik személyek jogait érinti, jogszabályi kivétel). Önnek joga van panaszt tenni a felügyeleti hatóságnál, és bírósági jogorvoslattal élni.",
    "et": "Lugupeetud pöörduja, oleme teie taotluse läbi vaadanud. Me ei saa seda rahuldada, sest: (sisestage põhjus, näiteks ilmselgelt põhjendamatu või liigne, kolmandate isikute õigused, seadusest tulenev erand). Teil on õigus esitada kaebus järelevalveasutusele ja pöörduda kohtusse."
   }
  }
 },
 "tom": {
  "rbac": {
   "title": {
    "de": "Rollenbasiertes Berechtigungskonzept",
    "en": "Role-based permission concept",
    "fr": "Concept d’autorisations par rôles",
    "nl": "Rolgebaseerd autorisatieconcept",
    "hu": "Szerepköralapú jogosultsági koncepció",
    "et": "Rollipõhine õiguste kontseptsioon"
   },
   "category": "access",
   "description": {
    "de": "Zugriff auf personenbezogene Daten nur nach dem Need-to-know-Prinzip, vergeben über Rollen",
    "en": "Access to personal data only under the need-to-know principle, granted through roles",
    "fr": "Accès aux données personnelles uniquement selon le principe du besoin d’en connaître, attribué par rôles",
    "nl": "Toegang tot persoonsgegevens alleen volgens het need-to-know-principe, toegekend via rollen",
    "hu": "A személyes adatokhoz való hozzáférés csak a „need-to-know” elv szerint, szerepkörökön keresztül",
    "et": "Juurdepääs isikuandmetele ainult põhimõtte „teadmisvajadus“ alusel, antakse rollide kaudu"
   },
   "implementation": {
    "de": "Rollen dokumentieren, Genehmigungsprozess für Rechte, regelmäßige Rezertifizierung (mindestens jährlich), sofortiger Entzug bei Austritt oder Wechsel",
    "en": "Document roles, approval process for rights, regular recertification (at least annually), immediate removal on leaving or change of role",
    "fr": "Documenter les rôles, processus d’approbation des droits, recertification régulière (au moins annuelle), retrait immédiat en cas de départ ou de changement de poste",
    "nl": "Rollen documenteren, goedkeuringsproces voor rechten, regelmatige hercertificering (minstens jaarlijks), directe intrekking bij vertrek of functiewijziging",
    "hu": "A szerepkörök dokumentálása, jogosultságok jóváhagyási folyamata, rendszeres újraigazolás (legalább évente), kilépéskor vagy munkakör-váltáskor azonnali visszavonás",
    "et": "Dokumenteeri rollid, õiguste kinnitusprotsess, regulaarne uuesti sertifitseerimine (vähemalt kord aastas), kohene eemaldamine lahkumisel või rolli muutumisel"
   }
  },
  "mfa": {
   "title": {
    "de": "Mehrfaktor-Authentifizierung",
    "en": "Multi-factor authentication",
    "fr": "Authentification multifacteur",
    "nl": "Meerfactorauthenticatie",
    "hu": "Többfaktoros hitelesítés",
    "et": "Mitmefaktoriline autentimine"
   },
   "category": "access",
   "description": {
    "de": "Zusätzlicher Faktor bei der Anmeldung an Systemen mit personenbezogenen Daten und bei Fernzugängen",
    "en": "An additional factor when signing in to systems with personal data and for remote access",
    "fr": "Facteur supplémentaire lors de la connexion aux systèmes contenant des données personnelles et pour les accès à distance",
    "nl": "Extra factor bij aanmelding op systemen met persoonsgegevens en bij toegang op afstand",
    "hu": "További tényező a személyes adatokat tartalmazó rendszerekbe való bejelentkezéskor és távoli hozzáféréskor",
    "et": "Täiendav tegur isikuandmetega süsteemidesse sisselogimisel ja kaugjuurdepääsu korral"
   },
   "implementation": {
    "de": "Zuerst Administratoren und Fernzugänge, dann alle Nutzer; Wiederherstellungsverfahren für verlorene Faktoren festlegen",
    "en": "Administrators and remote access first, then all users; define a recovery procedure for lost factors",
    "fr": "D’abord les administrateurs et les accès à distance, puis tous les utilisateurs ; définir une procédure de récupération pour les facteurs perdus",
    "nl": "Eerst beheerders en toegang op afstand, daarna alle gebruikers; herstelprocedure voor verloren factoren vastleggen",
    "hu": "Először a rendszergazdák és a távoli hozzáférések, majd minden felhasználó; helyreállítási eljárás meghatározása elveszett tényezőkhöz",
    "et": "Esmalt administraatorid ja kaugjuurdepääs, seejärel kõik kasutajad; määra taastemenetlus kaotatud tegurite jaoks"
   }
  },
  "physical": {
   "title": {
    "de": "Zutrittskontrolle zu Gebäuden und Serverräumen",
    "en": "Physical access control to buildings and server rooms",
    "fr": "Contrôle d’accès physique aux bâtiments et salles serveurs",
    "nl": "Fysieke toegangscontrole tot gebouwen en serverruimten",
    "hu": "Fizikai beléptetés az épületekbe és a szerverhelyiségekbe",
    "et": "Hoonete ja serveriruumide füüsiline juurdepääsukontroll"
   },
   "category": "access",
   "description": {
    "de": "Schutz vor unbefugtem Zutritt zu Räumen, in denen personenbezogene Daten verarbeitet oder gespeichert werden",
    "en": "Protection against unauthorised access to rooms where personal data is processed or stored",
    "fr": "Protection contre l’accès non autorisé aux locaux où sont traitées ou stockées des données personnelles",
    "nl": "Bescherming tegen onbevoegde toegang tot ruimten waar persoonsgegevens worden verwerkt of opgeslagen",
    "hu": "Védelem a jogosulatlan belépés ellen azokba a helyiségekbe, ahol személyes adatokat kezelnek vagy tárolnak",
    "et": "Kaitse volitamata juurdepääsu eest ruumidesse, kus isikuandmeid töödeldakse või hoitakse"
   },
   "implementation": {
    "de": "Schließsystem oder Zutrittskarten, Besucherregelung, Protokoll der Zutritte zu Serverräumen, Alarmanlage nach Risiko",
    "en": "Locking system or access cards, visitor rules, log of access to server rooms, alarm system depending on risk",
    "fr": "Système de fermeture ou cartes d’accès, règles pour les visiteurs, journal des accès aux salles serveurs, alarme selon le risque",
    "nl": "Sluitsysteem of toegangspassen, bezoekersregeling, logboek van toegang tot serverruimten, alarmsysteem afhankelijk van het risico",
    "hu": "Zárrendszer vagy beléptetőkártyák, látogatói szabályok, a szerverhelyiségekbe való belépések naplója, riasztórendszer kockázat szerint",
    "et": "Lukustussüsteem või juurdepääsukaardid, külastajate reeglid, serveriruumidesse sisenemise logi, häiresüsteem vastavalt riskile"
   }
  },
  "clear_desk": {
   "title": {
    "de": "Clean Desk und Bildschirmsperre",
    "en": "Clear desk and screen lock",
    "fr": "Bureau propre et verrouillage d’écran",
    "nl": "Clear desk en schermvergrendeling",
    "hu": "Tiszta asztal és képernyőzár",
    "et": "Puhas laud ja ekraanilukk"
   },
   "category": "access",
   "description": {
    "de": "Unterlagen und Bildschirme sind bei Abwesenheit vor Einsicht Unbefugter geschützt",
    "en": "Documents and screens are protected from unauthorised view when unattended",
    "fr": "Les documents et écrans sont protégés de la vue de personnes non autorisées en cas d’absence",
    "nl": "Documenten en schermen zijn bij afwezigheid beschermd tegen inzage door onbevoegden",
    "hu": "A dokumentumok és képernyők távollétben védettek az illetéktelen betekintéssel szemben",
    "et": "Dokumendid ja ekraanid on järelevalveta olles kaitstud volitamata vaatamise eest"
   },
   "implementation": {
    "de": "Automatische Bildschirmsperre nach kurzer Zeit, abschließbare Schränke, Regel zum Aufräumen am Arbeitsende, Regelung für Besprechungsräume",
    "en": "Automatic screen lock after a short time, lockable cabinets, tidy-up rule at the end of work, rule for meeting rooms",
    "fr": "Verrouillage automatique de l’écran après un court délai, armoires verrouillables, règle de rangement en fin de journée, règle pour les salles de réunion",
    "nl": "Automatische schermvergrendeling na korte tijd, afsluitbare kasten, opruimregel aan het einde van het werk, regeling voor vergaderruimten",
    "hu": "Automatikus képernyőzár rövid idő után, zárható szekrények, munkaidő végi rendrakási szabály, szabály a tárgyalókra",
    "et": "Automaatne ekraanilukk lühikese aja järel, lukustatavad kapid, korrastamise reegel tööpäeva lõpus, reegel koosolekuruumide jaoks"
   }
  },
  "disk": {
   "title": {
    "de": "Festplatten- und Geräteverschlüsselung",
    "en": "Disk and device encryption",
    "fr": "Chiffrement des disques et des appareils",
    "nl": "Schijf- en apparaatversleuteling",
    "hu": "Lemez- és eszköztitkosítás",
    "et": "Ketta- ja seadmekrüpteerimine"
   },
   "category": "encryption",
   "description": {
    "de": "Daten auf Laptops, Smartphones und Datenträgern sind verschlüsselt, sodass sie bei Verlust nicht lesbar sind",
    "en": "Data on laptops, smartphones and storage media is encrypted so that it cannot be read if lost",
    "fr": "Les données sur les ordinateurs portables, smartphones et supports sont chiffrées pour ne pas être lisibles en cas de perte",
    "nl": "Gegevens op laptops, smartphones en gegevensdragers zijn versleuteld zodat ze bij verlies niet leesbaar zijn",
    "hu": "A laptopokon, okostelefonokon és adathordozókon lévő adatok titkosítottak, így elvesztésük esetén nem olvashatók",
    "et": "Sülearvutite, nutitelefonide ja andmekandjate andmed on krüpteeritud, et neid ei saaks kadumise korral lugeda"
   },
   "implementation": {
    "de": "Verschlüsselung per Richtlinie erzwingen und über Geräteverwaltung (MDM) prüfen, Wiederherstellungsschlüssel sicher hinterlegen",
    "en": "Enforce encryption by policy and verify it through device management (MDM), store recovery keys securely",
    "fr": "Imposer le chiffrement par politique et le vérifier via la gestion des appareils (MDM), conserver les clés de récupération en sécurité",
    "nl": "Versleuteling afdwingen via beleid en controleren met apparaatbeheer (MDM), herstelsleutels veilig bewaren",
    "hu": "A titkosítás szabályzattal kikényszerítése és az eszközkezelésen (MDM) keresztüli ellenőrzése, a helyreállítási kulcsok biztonságos tárolása",
    "et": "Nõua krüpteerimist poliitikaga ja kontrolli seda seadmehalduse (MDM) kaudu, hoia taastevõtmeid turvaliselt"
   }
  },
  "transport": {
   "title": {
    "de": "Transportverschlüsselung (TLS) und gesicherte Fernzugänge",
    "en": "Transport encryption (TLS) and secured remote access",
    "fr": "Chiffrement du transport (TLS) et accès à distance sécurisés",
    "nl": "Transportversleuteling (TLS) en beveiligde toegang op afstand",
    "hu": "Szállítási titkosítás (TLS) és biztonságos távoli hozzáférés",
    "et": "Edastuskrüpteerimine (TLS) ja turvatud kaugjuurdepääs"
   },
   "category": "encryption",
   "description": {
    "de": "Daten werden bei der Übertragung über Netzwerke verschlüsselt (Web, E-Mail, Fernzugriff)",
    "en": "Data is encrypted when transmitted across networks (web, e-mail, remote access)",
    "fr": "Les données sont chiffrées lors de la transmission sur les réseaux (web, e-mail, accès à distance)",
    "nl": "Gegevens worden bij overdracht via netwerken versleuteld (web, e-mail, toegang op afstand)",
    "hu": "Az adatokat a hálózaton való továbbításkor titkosítják (web, e-mail, távoli hozzáférés)",
    "et": "Andmed krüpteeritakse võrkude kaudu edastamisel (veeb, e-post, kaugjuurdepääs)"
   },
   "implementation": {
    "de": "Aktuelle TLS-Versionen, VPN für Fernzugriff, verschlüsselter E-Mail-Transport, Prüfung der Konfiguration in regelmäßigen Abständen",
    "en": "Current TLS versions, VPN for remote access, encrypted e-mail transport, check the configuration at regular intervals",
    "fr": "Versions TLS actuelles, VPN pour l’accès à distance, transport de messagerie chiffré, vérification régulière de la configuration",
    "nl": "Actuele TLS-versies, VPN voor toegang op afstand, versleuteld e-mailtransport, configuratie regelmatig controleren",
    "hu": "Naprakész TLS-verziók, VPN a távoli hozzáféréshez, titkosított e-mail-továbbítás, a konfiguráció rendszeres ellenőrzése",
    "et": "Ajakohased TLS-versioonid, VPN kaugjuurdepääsuks, krüpteeritud e-posti transport, kontrolli seadistust regulaarsete ajavahemike järel"
   }
  },
  "backup_enc": {
   "title": {
    "de": "Verschlüsselung von Datensicherungen und mobilen Datenträgern",
    "en": "Encryption of backups and portable storage media",
    "fr": "Chiffrement des sauvegardes et des supports amovibles",
    "nl": "Versleuteling van back-ups en verwijderbare gegevensdragers",
    "hu": "Mentések és hordozható adathordozók titkosítása",
    "et": "Varukoopiate ja teisaldatavate andmekandjate krüpteerimine"
   },
   "category": "encryption",
   "description": {
    "de": "Backups und externe Datenträger enthalten nur verschlüsselte Daten",
    "en": "Backups and external media contain only encrypted data",
    "fr": "Les sauvegardes et supports externes ne contiennent que des données chiffrées",
    "nl": "Back-ups en externe gegevensdragers bevatten alleen versleutelde gegevens",
    "hu": "A mentések és külső adathordozók kizárólag titkosított adatokat tartalmaznak",
    "et": "Varukoopiad ja välised andmekandjad sisaldavad ainult krüpteeritud andmeid"
   },
   "implementation": {
    "de": "Backup-Software mit Verschlüsselung, Schlüsselverwaltung getrennt von den Daten, USB-Speicher nur verschlüsselt und freigegeben",
    "en": "Backup software with encryption, key management separate from the data, USB storage only if encrypted and approved",
    "fr": "Logiciel de sauvegarde avec chiffrement, gestion des clés séparée des données, supports USB uniquement chiffrés et autorisés",
    "nl": "Back-upsoftware met versleuteling, sleutelbeheer gescheiden van de gegevens, usb-opslag alleen versleuteld en goedgekeurd",
    "hu": "Titkosítást támogató mentőszoftver, a kulcskezelés az adatoktól elkülönítve, USB-tároló csak titkosítva és jóváhagyva",
    "et": "Krüpteerimisega varundustarkvara, andmetest eraldi võtmehaldus, USB-salvestus ainult krüpteeritult ja kinnitatult"
   }
  },
  "logs": {
   "title": {
    "de": "Protokollierung und Auswertung",
    "en": "Logging and review",
    "fr": "Journalisation et analyse",
    "nl": "Logging en beoordeling",
    "hu": "Naplózás és elemzés",
    "et": "Logimine ja ülevaatus"
   },
   "category": "logging",
   "description": {
    "de": "Zugriffe auf Systeme mit personenbezogenen Daten werden protokolliert und bei Bedarf ausgewertet",
    "en": "Access to systems with personal data is logged and reviewed when needed",
    "fr": "Les accès aux systèmes contenant des données personnelles sont journalisés et analysés si nécessaire",
    "nl": "Toegang tot systemen met persoonsgegevens wordt gelogd en zo nodig beoordeeld",
    "hu": "A személyes adatokat tartalmazó rendszerekhez való hozzáférést naplózzák, és szükség esetén elemzik",
    "et": "Juurdepääs isikuandmetega süsteemidele logitakse ja vaadatakse vajaduse korral üle"
   },
   "implementation": {
    "de": "Protokollierung von Anmeldungen, Rechteänderungen und Zugriffen, Schutz der Protokolle vor Veränderung, feste Aufbewahrungsdauer, Auswertung bei Anlass",
    "en": "Log sign-ins, permission changes and access, protect logs from alteration, fixed retention period, review when there is a reason",
    "fr": "Journaliser les connexions, modifications de droits et accès, protéger les journaux contre toute modification, durée de conservation fixe, analyse en cas de besoin",
    "nl": "Aanmeldingen, rechtenwijzigingen en toegang loggen, logboeken tegen wijziging beschermen, vaste bewaartermijn, bij aanleiding beoordelen",
    "hu": "A bejelentkezések, jogosultságváltozások és hozzáférések naplózása, a naplók módosítás elleni védelme, rögzített megőrzési idő, alkalomszerű elemzés",
    "et": "Logi sisselogimised, õiguste muudatused ja juurdepääsud, kaitse logisid muutmise eest, kindel säilitusaeg, vaata üle põhjuse korral"
   }
  },
  "input_control": {
   "title": {
    "de": "Eingabekontrolle (Nachvollziehbarkeit von Änderungen)",
    "en": "Input control (traceability of changes)",
    "fr": "Contrôle de saisie (traçabilité des modifications)",
    "nl": "Invoercontrole (naspeurbaarheid van wijzigingen)",
    "hu": "Bevitelellenőrzés (a módosítások nyomon követhetősége)",
    "et": "Sisestuskontroll (muudatuste jälgitavus)"
   },
   "category": "logging",
   "description": {
    "de": "Es ist nachvollziehbar, wer personenbezogene Daten wann eingegeben, geändert oder gelöscht hat",
    "en": "It can be traced who entered, changed or deleted personal data and when",
    "fr": "Il est possible de retracer qui a saisi, modifié ou supprimé des données personnelles et quand",
    "nl": "Het is naspeurbaar wie persoonsgegevens wanneer heeft ingevoerd, gewijzigd of verwijderd",
    "hu": "Nyomon követhető, hogy ki és mikor vitt be, módosított vagy törölt személyes adatokat",
    "et": "On võimalik jälgida, kes ja millal isikuandmeid sisestas, muutis või kustutas"
   },
   "implementation": {
    "de": "Änderungshistorie in den Anwendungen aktivieren, personalisierte Benutzerkonten statt Sammelkonten, Revisionssicherheit der Protokolle prüfen",
    "en": "Activate change history in the applications, personalised user accounts instead of shared accounts, check the tamper resistance of logs",
    "fr": "Activer l’historique des modifications dans les applications, comptes utilisateurs nominatifs plutôt que comptes partagés, vérifier l’inaltérabilité des journaux",
    "nl": "Wijzigingshistorie in de toepassingen activeren, persoonlijke gebruikersaccounts in plaats van gedeelde accounts, onveranderlijkheid van logboeken controleren",
    "hu": "A módosítási előzmények bekapcsolása az alkalmazásokban, személyre szóló felhasználói fiókok közös fiókok helyett, a naplók manipulációvédelmének ellenőrzése",
    "et": "Aktiveeri rakendustes muudatuste ajalugu, isikustatud kasutajakontod jagatud kontode asemel, kontrolli logide muutmiskindlust"
   }
  },
  "firewall": {
   "title": {
    "de": "Firewall und Netzwerksegmentierung",
    "en": "Firewall and network segmentation",
    "fr": "Pare-feu et segmentation du réseau",
    "nl": "Firewall en netwerksegmentatie",
    "hu": "Tűzfal és hálózati szegmentálás",
    "et": "Tulemüür ja võrgu segmenteerimine"
   },
   "category": "network",
   "description": {
    "de": "Das Netzwerk ist nach Schutzbedarf getrennt und gegen unerwünschte Zugriffe von außen geschützt",
    "en": "The network is separated by protection needs and protected against unwanted access from outside",
    "fr": "Le réseau est séparé selon les besoins de protection et protégé contre les accès indésirables de l’extérieur",
    "nl": "Het netwerk is gescheiden naar beschermingsbehoefte en beschermd tegen ongewenste toegang van buiten",
    "hu": "A hálózat védelmi igény szerint szegmentált, és védett a külső, nem kívánt hozzáférésekkel szemben",
    "et": "Võrk on eraldatud kaitsevajaduse järgi ja kaitstud soovimatu välise juurdepääsu eest"
   },
   "implementation": {
    "de": "Firewall mit restriktiven Regeln, getrennte Segmente (z. B. Gäste, Verwaltung, Server), Regelwerk regelmäßig prüfen",
    "en": "Firewall with restrictive rules, separate segments (e.g. guests, administration, servers), review the rule set regularly",
    "fr": "Pare-feu avec règles restrictives, segments séparés (p. ex. invités, administration, serveurs), revue régulière du jeu de règles",
    "nl": "Firewall met restrictieve regels, aparte segmenten (bijv. gasten, beheer, servers), regelset regelmatig controleren",
    "hu": "Szigorú szabályokkal működő tűzfal, külön szegmensek (pl. vendég, ügyvitel, szerverek), a szabályrendszer rendszeres felülvizsgálata",
    "et": "Piiravate reeglitega tulemüür, eraldi segmendid (nt külalised, haldus, serverid), vaata reeglistik regulaarselt üle"
   }
  },
  "endpoint": {
   "title": {
    "de": "Schutz vor Schadsoftware",
    "en": "Protection against malware",
    "fr": "Protection contre les logiciels malveillants",
    "nl": "Bescherming tegen malware",
    "hu": "Kártevők elleni védelem",
    "et": "Kaitse pahavara eest"
   },
   "category": "network",
   "description": {
    "de": "Endgeräte und Server sind gegen Schadsoftware geschützt, Angriffe werden erkannt und gemeldet",
    "en": "Endpoints and servers are protected against malware, attacks are detected and reported",
    "fr": "Les terminaux et serveurs sont protégés contre les logiciels malveillants, les attaques sont détectées et signalées",
    "nl": "Eindapparaten en servers zijn beschermd tegen malware, aanvallen worden gedetecteerd en gemeld",
    "hu": "A végpontok és szerverek védettek a kártevők ellen, a támadásokat észlelik és jelentik",
    "et": "Lõppseadmed ja serverid on kaitstud pahavara eest, rünnakud tuvastatakse ja neist teatatakse"
   },
   "implementation": {
    "de": "Aktueller Virenschutz oder Endpoint-Schutz mit zentraler Verwaltung, E-Mail-Filter, Warnmeldungen an die IT, Reaktionsprozess",
    "en": "Up-to-date antivirus or endpoint protection with central management, e-mail filter, alerts to IT, response process",
    "fr": "Antivirus ou protection des terminaux à jour avec gestion centrale, filtre de messagerie, alertes à l’informatique, processus de réaction",
    "nl": "Actuele virusscanner of endpointbeveiliging met centraal beheer, e-mailfilter, waarschuwingen aan IT, reactieproces",
    "hu": "Naprakész vírusvédelem vagy végpontvédelem központi kezeléssel, e-mail szűrő, riasztások az IT felé, reagálási folyamat",
    "et": "Ajakohane viirusetõrje või lõppseadmekaitse tsentraalse haldusega, e-posti filter, hoiatused IT-le, reageerimisprotsess"
   }
  },
  "patch": {
   "title": {
    "de": "Patch- und Schwachstellenmanagement",
    "en": "Patch and vulnerability management",
    "fr": "Gestion des correctifs et des vulnérabilités",
    "nl": "Patch- en kwetsbaarhedenbeheer",
    "hu": "Javítás- és sérülékenységkezelés",
    "et": "Paiga- ja haavatavuste haldus"
   },
   "category": "application",
   "description": {
    "de": "Sicherheitsupdates werden zeitnah eingespielt, bekannte Schwachstellen werden bewertet und behoben",
    "en": "Security updates are applied promptly, known vulnerabilities are assessed and fixed",
    "fr": "Les mises à jour de sécurité sont appliquées rapidement, les vulnérabilités connues sont évaluées et corrigées",
    "nl": "Beveiligingsupdates worden tijdig geïnstalleerd, bekende kwetsbaarheden worden beoordeeld en verholpen",
    "hu": "A biztonsági frissítéseket időben telepítik, az ismert sérülékenységeket értékelik és megszüntetik",
    "et": "Turvauuendused rakendatakse viivitamata, teadaolevaid haavatavusi hinnatakse ja parandatakse"
   },
   "implementation": {
    "de": "Inventar der Systeme, definierte Fristen je Schweregrad, automatische Updates wo möglich, regelmäßige Schwachstellenscans",
    "en": "Inventory of systems, defined deadlines by severity, automatic updates where possible, regular vulnerability scans",
    "fr": "Inventaire des systèmes, délais définis selon la gravité, mises à jour automatiques si possible, analyses régulières des vulnérabilités",
    "nl": "Inventaris van systemen, vaste termijnen per ernst, automatische updates waar mogelijk, regelmatige kwetsbaarheidsscans",
    "hu": "A rendszerek nyilvántartása, súlyosság szerinti határidők, ahol lehet, automatikus frissítés, rendszeres sérülékenységvizsgálat",
    "et": "Süsteemide inventuur, tõsiduse järgi määratud tähtajad, võimalusel automaatsed uuendused, regulaarsed haavatavusskannid"
   }
  },
  "secure_dev": {
   "title": {
    "de": "Sichere Entwicklung und Schutz von Testdaten",
    "en": "Secure development and protection of test data",
    "fr": "Développement sécurisé et protection des données de test",
    "nl": "Veilige ontwikkeling en bescherming van testgegevens",
    "hu": "Biztonságos fejlesztés és a tesztadatok védelme",
    "et": "Turvaline arendus ja testandmete kaitse"
   },
   "category": "application",
   "description": {
    "de": "Anwendungen werden sicher entwickelt und getestet, produktive personenbezogene Daten werden nicht ungeschützt zum Testen verwendet",
    "en": "Applications are developed and tested securely, production personal data is not used unprotected for testing",
    "fr": "Les applications sont développées et testées de manière sécurisée, les données personnelles de production ne sont pas utilisées sans protection pour les tests",
    "nl": "Toepassingen worden veilig ontwikkeld en getest, productiepersoonsgegevens worden niet onbeschermd voor tests gebruikt",
    "hu": "Az alkalmazásokat biztonságosan fejlesztik és tesztelik, éles személyes adatokat nem használnak védelem nélkül teszteléshez",
    "et": "Rakendusi arendatakse ja testitakse turvaliselt, tootmise isikuandmeid ei kasutata testimiseks kaitsmata kujul"
   },
   "implementation": {
    "de": "Code-Reviews und Sicherheitstests, getrennte Umgebungen, Testdaten anonymisieren oder synthetisch erzeugen, Datenschutz in den Entwicklungsprozess einbinden",
    "en": "Code reviews and security testing, separate environments, anonymise or synthesise test data, build data protection into the development process",
    "fr": "Revues de code et tests de sécurité, environnements séparés, anonymiser ou générer des données de test synthétiques, intégrer la protection des données au processus de développement",
    "nl": "Codereviews en beveiligingstests, gescheiden omgevingen, testgegevens anonimiseren of synthetisch genereren, gegevensbescherming in het ontwikkelproces opnemen",
    "hu": "Kódáttekintések és biztonsági tesztek, külön környezetek, a tesztadatok anonimizálása vagy szintetikus előállítása, az adatvédelem beépítése a fejlesztési folyamatba",
    "et": "Koodi ülevaatused ja turvatestimine, eraldi keskkonnad, testandmete anonümiseerimine või sünteesimine, andmekaitse integreerimine arendusprotsessi"
   }
  },
  "pseudo": {
   "title": {
    "de": "Pseudonymisierung und Anonymisierung",
    "en": "Pseudonymisation and anonymisation",
    "fr": "Pseudonymisation et anonymisation",
    "nl": "Pseudonimisering en anonimisering",
    "hu": "Álnevesítés és anonimizálás",
    "et": "Pseudonümiseerimine ja anonümiseerimine"
   },
   "category": "application",
   "description": {
    "de": "Wo möglich werden Daten pseudonymisiert oder anonymisiert, besonders für Auswertungen und Tests",
    "en": "Where possible, data is pseudonymised or anonymised, especially for analyses and tests",
    "fr": "Dans la mesure du possible, les données sont pseudonymisées ou anonymisées, notamment pour les analyses et tests",
    "nl": "Waar mogelijk worden gegevens gepseudonimiseerd of geanonimiseerd, vooral voor analyses en tests",
    "hu": "Ahol lehetséges, az adatokat álnevesítik vagy anonimizálják, különösen elemzésekhez és teszteléshez",
    "et": "Võimalusel andmed pseudonümiseeritakse või anonümiseeritakse, eriti analüüside ja testide jaoks"
   },
   "implementation": {
    "de": "Kennungen durch Pseudonyme ersetzen, Zuordnungstabelle getrennt und geschützt aufbewahren, Anonymisierung prüfen (kein Rückschluss möglich)",
    "en": "Replace identifiers with pseudonyms, keep the mapping table separate and protected, check anonymisation (no re-identification possible)",
    "fr": "Remplacer les identifiants par des pseudonymes, conserver la table de correspondance séparée et protégée, vérifier l’anonymisation (pas de ré-identification possible)",
    "nl": "Identificatoren vervangen door pseudoniemen, koppeltabel gescheiden en beschermd bewaren, anonimisering controleren (geen heridentificatie mogelijk)",
    "hu": "Az azonosítók álnevekkel való helyettesítése, a hozzárendelési táblázat elkülönített és védett tárolása, az anonimizálás ellenőrzése (visszaazonosítás nem lehetséges)",
    "et": "Asenda identifikaatorid pseudonüümidega, hoia vastavustabelit eraldi ja kaitstult, kontrolli anonümiseerimist (taastuvastamine pole võimalik)"
   }
  },
  "backup": {
   "title": {
    "de": "Datensicherung und getestete Wiederherstellung",
    "en": "Backup and tested restoration",
    "fr": "Sauvegarde et restauration testée",
    "nl": "Back-up en geteste herstelprocedure",
    "hu": "Adatmentés és tesztelt helyreállítás",
    "et": "Varundus ja testitud taastamine"
   },
   "category": "backup",
   "description": {
    "de": "Daten werden regelmäßig gesichert und können bei Verlust oder Ausfall innerhalb der geforderten Zeit wiederhergestellt werden",
    "en": "Data is backed up regularly and can be restored within the required time after loss or failure",
    "fr": "Les données sont sauvegardées régulièrement et peuvent être restaurées dans le délai requis en cas de perte ou de panne",
    "nl": "Gegevens worden regelmatig geback-upt en kunnen bij verlies of storing binnen de vereiste tijd worden hersteld",
    "hu": "Az adatokról rendszeresen mentés készül, és elvesztés vagy kiesés esetén a megkövetelt időn belül helyreállíthatók",
    "et": "Andmeid varundatakse regulaarselt ja neid saab kadumise või tõrke järel nõutud aja jooksul taastada"
   },
   "implementation": {
    "de": "Backup-Konzept (3-2-1-Regel), getrennte Aufbewahrung, Wiederherstellungstests mindestens jährlich, Schutz der Backups vor Verschlüsselungstrojanern",
    "en": "Backup concept (3-2-1 rule), separate storage, restore tests at least annually, protect backups against ransomware",
    "fr": "Concept de sauvegarde (règle 3-2-1), stockage séparé, tests de restauration au moins annuels, protection des sauvegardes contre les rançongiciels",
    "nl": "Back-upconcept (3-2-1-regel), gescheiden opslag, herstelproeven minstens jaarlijks, back-ups beschermen tegen ransomware",
    "hu": "Mentési koncepció (3-2-1 szabály), elkülönített tárolás, legalább évenkénti helyreállítási tesztek, a mentések védelme a zsarolóvírusok ellen",
    "et": "Varunduskontseptsioon (3-2-1 reegel), eraldi salvestus, taastetestid vähemalt kord aastas, kaitse varukoopiaid lunavara eest"
   }
  },
  "bcm": {
   "title": {
    "de": "Notfall- und Wiederanlaufplanung",
    "en": "Emergency and recovery planning",
    "fr": "Planification d’urgence et de reprise",
    "nl": "Nood- en herstelplanning",
    "hu": "Vészhelyzeti és helyreállítási tervezés",
    "et": "Hädaolukorra- ja taastekavandamine"
   },
   "category": "backup",
   "description": {
    "de": "Für den Ausfall von Systemen mit personenbezogenen Daten gibt es Notfallpläne, Zuständigkeiten und Übungen",
    "en": "There are emergency plans, responsibilities and exercises for the failure of systems with personal data",
    "fr": "Il existe des plans d’urgence, des responsabilités et des exercices pour la défaillance des systèmes contenant des données personnelles",
    "nl": "Er zijn noodplannen, verantwoordelijkheden en oefeningen voor het uitvallen van systemen met persoonsgegevens",
    "hu": "A személyes adatokat tartalmazó rendszerek kiesésére vészhelyzeti tervek, felelősségek és gyakorlatok vannak",
    "et": "Isikuandmetega süsteemide tõrke korral on olemas hädaolukorrakavad, vastutused ja õppused"
   },
   "implementation": {
    "de": "Business-Impact-Analyse, Wiederanlaufzeiten festlegen, Notfallhandbuch, Alarmierungswege, jährliche Übung",
    "en": "Business impact analysis, set recovery times, emergency manual, alerting paths, annual exercise",
    "fr": "Analyse d’impact sur l’activité, définition des délais de reprise, manuel d’urgence, voies d’alerte, exercice annuel",
    "nl": "Business impactanalyse, hersteltijden vastleggen, noodhandboek, alarmeringsroutes, jaarlijkse oefening",
    "hu": "Üzleti hatáselemzés, helyreállítási idők meghatározása, vészhelyzeti kézikönyv, riasztási útvonalak, éves gyakorlat",
    "et": "Talitluspidevuse mõjuanalüüs, taasteaegade määramine, hädaolukorra käsiraamat, häiresidetee, iga-aastane õppus"
   }
  },
  "confidentiality": {
   "title": {
    "de": "Verpflichtung zur Vertraulichkeit",
    "en": "Confidentiality undertaking",
    "fr": "Engagement de confidentialité",
    "nl": "Geheimhoudingsverklaring",
    "hu": "Titoktartási kötelezettségvállalás",
    "et": "Konfidentsiaalsuskohustus"
   },
   "category": "organizational",
   "description": {
    "de": "Alle Personen mit Zugang zu personenbezogenen Daten sind zur Vertraulichkeit verpflichtet",
    "en": "All persons with access to personal data are bound to confidentiality",
    "fr": "Toutes les personnes ayant accès aux données personnelles sont tenues à la confidentialité",
    "nl": "Alle personen met toegang tot persoonsgegevens zijn tot geheimhouding verplicht",
    "hu": "A személyes adatokhoz hozzáférő minden személy titoktartásra kötelezett",
    "et": "Kõik isikuandmetele juurdepääsuga isikud on konfidentsiaalsuskohustusega seotud"
   },
   "implementation": {
    "de": "Verpflichtung bei Eintritt unterschreiben lassen, Nachweis ablegen, Fortbestehen nach Ende des Arbeitsverhältnisses regeln, auch für externe Mitarbeitende",
    "en": "Have it signed on joining, keep proof, regulate its continuation after employment ends, also for external staff",
    "fr": "Faire signer à l’arrivée, conserver la preuve, régler la poursuite après la fin du contrat, aussi pour le personnel externe",
    "nl": "Bij indiensttreding laten ondertekenen, bewijs bewaren, voortbestaan na einde dienstverband regelen, ook voor externe medewerkers",
    "hu": "Belépéskor aláíratni, az igazolást megőrizni, a munkaviszony megszűnése utáni fennállást szabályozni, külső munkatársakra is",
    "et": "Laske see liitumisel allkirjastada, hoidke tõendit, reguleerige selle jätkumist pärast töösuhte lõppu, ka väliste töötajate puhul"
   }
  },
  "processors": {
   "title": {
    "de": "Auswahl und Kontrolle von Auftragsverarbeitern",
    "en": "Selection and oversight of processors",
    "fr": "Choix et contrôle des sous-traitants",
    "nl": "Selectie en controle van verwerkers",
    "hu": "Az adatfeldolgozók kiválasztása és ellenőrzése",
    "et": "Volitatud töötlejate valik ja järelevalve"
   },
   "category": "organizational",
   "description": {
    "de": "Auftragsverarbeiter werden sorgfältig ausgewählt, vertraglich gebunden (Art. 28) und regelmäßig kontrolliert",
    "en": "Processors are selected carefully, bound by contract (Art. 28) and checked regularly",
    "fr": "Les sous-traitants sont choisis avec soin, liés par contrat (art. 28) et contrôlés régulièrement",
    "nl": "Verwerkers worden zorgvuldig geselecteerd, contractueel gebonden (art. 28) en regelmatig gecontroleerd",
    "hu": "Az adatfeldolgozókat gondosan választják ki, szerződéssel kötik (28. cikk), és rendszeresen ellenőrzik",
    "et": "Volitatud töötlejaid valitakse hoolikalt, nad seotakse lepinguga (art 28) ja neid kontrollitakse regulaarselt"
   },
   "implementation": {
    "de": "Prüfung vor Vertragsschluss (Zertifikate, Sicherheitskonzept), Auftragsverarbeitungsvertrag, Verzeichnis der Dienstleister, jährliche Überprüfung",
    "en": "Check before signing (certificates, security concept), data processing agreement, register of service providers, annual review",
    "fr": "Vérification avant la conclusion (certificats, concept de sécurité), contrat de sous-traitance, registre des prestataires, revue annuelle",
    "nl": "Controle vóór het sluiten van de overeenkomst (certificaten, beveiligingsconcept), verwerkersovereenkomst, register van dienstverleners, jaarlijkse herziening",
    "hu": "Ellenőrzés a szerződéskötés előtt (tanúsítványok, biztonsági koncepció), adatfeldolgozói szerződés, a szolgáltatók nyilvántartása, éves felülvizsgálat",
    "et": "Kontrolli enne allkirjastamist (sertifikaadid, turvakontseptsioon), andmetöötluse leping, teenusepakkujate register, iga-aastane ülevaatus"
   }
  },
  "incident": {
   "title": {
    "de": "Prozess für Datenschutzverletzungen",
    "en": "Process for personal data breaches",
    "fr": "Processus pour les violations de données",
    "nl": "Proces voor datalekken",
    "hu": "Folyamat adatvédelmi incidensekhez",
    "et": "Isikuandmetega seotud rikkumiste protsess"
   },
   "category": "organizational",
   "description": {
    "de": "Verletzungen des Schutzes personenbezogener Daten werden erkannt, bewertet und fristgerecht gemeldet (72 Stunden)",
    "en": "Personal data breaches are detected, assessed and reported in time (72 hours)",
    "fr": "Les violations de données personnelles sont détectées, évaluées et notifiées dans les délais (72 heures)",
    "nl": "Inbreuken op persoonsgegevens worden gedetecteerd, beoordeeld en tijdig gemeld (72 uur)",
    "hu": "A személyes adatok védelmének megsértését észlelik, értékelik és határidőn belül jelentik (72 óra)",
    "et": "Isikuandmetega seotud rikkumised tuvastatakse, hinnatakse ja neist teatatakse õigeaegselt (72 tundi)"
   },
   "implementation": {
    "de": "Meldeweg für Beschäftigte, Bewertungsschema, Vorlagen für Meldungen, Verantwortliche für Rufbereitschaft, Dokumentation aller Vorfälle",
    "en": "Reporting route for staff, assessment scheme, templates for notifications, responsible persons on call, documentation of all incidents",
    "fr": "Voie de signalement pour le personnel, grille d’évaluation, modèles de notification, responsables d’astreinte, documentation de tous les incidents",
    "nl": "Meldroute voor medewerkers, beoordelingsschema, sjablonen voor meldingen, verantwoordelijken met piketdienst, documentatie van alle incidenten",
    "hu": "Bejelentési út a munkatársak számára, értékelési séma, bejelentési sablonok, ügyeletes felelősök, minden incidens dokumentálása",
    "et": "Töötajate teavitustee, hindamisskeem, teavituste mallid, valvekorras vastutavad isikud, kõigi intsidentide dokumenteerimine"
   }
  },
  "dpm": {
   "title": {
    "de": "Datenschutzmanagement und Einbindung des DSB",
    "en": "Data protection management and involvement of the DPO",
    "fr": "Gestion de la protection des données et implication du DPD",
    "nl": "Gegevensbeschermingsbeheer en betrokkenheid van de FG",
    "hu": "Adatvédelmi irányítás és a DPO bevonása",
    "et": "Andmekaitsejuhtimine ja andmekaitsespetsialisti kaasamine"
   },
   "category": "organizational",
   "description": {
    "de": "Datenschutz ist organisiert: Zuständigkeiten, Verzeichnis der Verarbeitungstätigkeiten, regelmäßige Prüfung, Einbindung des Datenschutzbeauftragten",
    "en": "Data protection is organised: responsibilities, record of processing activities, regular review, involvement of the data protection officer",
    "fr": "La protection des données est organisée : responsabilités, registre des activités de traitement, contrôle régulier, implication du délégué à la protection des données",
    "nl": "Gegevensbescherming is georganiseerd: verantwoordelijkheden, register van verwerkingsactiviteiten, regelmatige controle, betrokkenheid van de functionaris voor gegevensbescherming",
    "hu": "Az adatvédelem szervezett: felelősségek, az adatkezelési tevékenységek nyilvántartása, rendszeres ellenőrzés, az adatvédelmi tisztviselő bevonása",
    "et": "Andmekaitse on korraldatud: vastutused, töötlemistoimingute register, regulaarne ülevaatus, andmekaitsespetsialisti kaasamine"
   },
   "implementation": {
    "de": "Datenschutzbeauftragten benennen und früh beteiligen, Verzeichnis pflegen, Datenschutz-Folgenabschätzungen durchführen, jährlicher Datenschutzbericht",
    "en": "Appoint the data protection officer and involve them early, maintain the record, carry out data protection impact assessments, annual data protection report",
    "fr": "Désigner le délégué à la protection des données et l’impliquer tôt, tenir le registre, réaliser des analyses d’impact, rapport annuel sur la protection des données",
    "nl": "Functionaris voor gegevensbescherming aanwijzen en vroeg betrekken, register bijhouden, gegevensbeschermingseffectbeoordelingen uitvoeren, jaarlijks gegevensbeschermingsverslag",
    "hu": "Az adatvédelmi tisztviselő kijelölése és korai bevonása, a nyilvántartás vezetése, adatvédelmi hatásvizsgálatok elvégzése, éves adatvédelmi jelentés",
    "et": "Määra andmekaitsespetsialist ja kaasa ta varakult, pea registrit, korralda andmekaitsealaseid mõjuhinnanguid, iga-aastane andmekaitseraport"
   }
  },
  "separation": {
   "title": {
    "de": "Trennungskontrolle und Zweckbindung",
    "en": "Separation control and purpose limitation",
    "fr": "Contrôle de séparation et limitation des finalités",
    "nl": "Scheidingscontrole en doelbinding",
    "hu": "Elkülönítési ellenőrzés és célhoz kötöttség",
    "et": "Eraldatuse kontroll ja eesmärgi piiritlus"
   },
   "category": "organizational",
   "description": {
    "de": "Daten, die zu unterschiedlichen Zwecken oder für unterschiedliche Auftraggeber erhoben wurden, werden getrennt verarbeitet",
    "en": "Data collected for different purposes or for different clients is processed separately",
    "fr": "Les données collectées à des fins différentes ou pour des clients différents sont traitées séparément",
    "nl": "Gegevens die voor verschillende doeleinden of voor verschillende opdrachtgevers zijn verzameld, worden gescheiden verwerkt",
    "hu": "A különböző célokra vagy különböző megbízóktól gyűjtött adatokat elkülönítve kezelik",
    "et": "Erinevatel eesmärkidel või erinevate klientide jaoks kogutud andmeid töödeldakse eraldi"
   },
   "implementation": {
    "de": "Mandantentrennung in Systemen, getrennte Datenbanken oder logische Trennung mit Rechten, Zweckprüfung bei neuen Auswertungen",
    "en": "Tenant separation in systems, separate databases or logical separation with permissions, purpose check for new analyses",
    "fr": "Séparation des clients dans les systèmes, bases de données séparées ou séparation logique avec droits, contrôle de la finalité pour les nouvelles analyses",
    "nl": "Scheiding van klanten in systemen, aparte databases of logische scheiding met rechten, doeltoets bij nieuwe analyses",
    "hu": "Ügyfélelkülönítés a rendszerekben, külön adatbázisok vagy jogosultsággal megvalósított logikai elkülönítés, célvizsgálat új elemzéseknél",
    "et": "Üürnike eraldamine süsteemides, eraldi andmebaasid või loogiline eraldamine õigustega, eesmärgi kontroll uute analüüside jaoks"
   }
  },
  "awareness": {
   "title": {
    "de": "Datenschutz- und Awareness-Schulung",
    "en": "Data protection and awareness training",
    "fr": "Formation à la protection des données et sensibilisation",
    "nl": "Training gegevensbescherming en bewustwording",
    "hu": "Adatvédelmi és tudatossági képzés",
    "et": "Andmekaitse- ja teadlikkuskoolitus"
   },
   "category": "training",
   "description": {
    "de": "Beschäftigte werden regelmäßig zu Datenschutz und Informationssicherheit geschult",
    "en": "Employees are trained regularly on data protection and information security",
    "fr": "Les salariés sont formés régulièrement à la protection des données et à la sécurité de l’information",
    "nl": "Medewerkers worden regelmatig getraind in gegevensbescherming en informatiebeveiliging",
    "hu": "A munkatársakat rendszeresen képzik adatvédelemből és információbiztonságból",
    "et": "Töötajaid koolitatakse regulaarselt andmekaitse ja infoturbe teemal"
   },
   "implementation": {
    "de": "Schulung bei Eintritt und mindestens jährlich, Nachweis der Teilnahme, Themen: Phishing, Umgang mit Anfragen Betroffener, Meldung von Vorfällen",
    "en": "Training on joining and at least annually, proof of attendance, topics: phishing, handling data subject requests, reporting incidents",
    "fr": "Formation à l’arrivée et au moins annuellement, preuve de participation, thèmes : hameçonnage, traitement des demandes des personnes concernées, signalement des incidents",
    "nl": "Training bij indiensttreding en minstens jaarlijks, bewijs van deelname, onderwerpen: phishing, omgaan met verzoeken van betrokkenen, melden van incidenten",
    "hu": "Képzés belépéskor és legalább évente, a részvétel igazolása, témák: adathalászat, érintetti kérelmek kezelése, incidensek bejelentése",
    "et": "Koolitus liitumisel ja vähemalt kord aastas, osalemise tõend, teemad: andmepüük, andmesubjekti taotluste käsitlemine, intsidentidest teatamine"
   }
  },
  "deletion": {
   "title": {
    "de": "Löschkonzept",
    "en": "Deletion concept",
    "fr": "Concept de suppression",
    "nl": "Verwijderconcept",
    "hu": "Törlési koncepció",
    "et": "Kustutamiskontseptsioon"
   },
   "category": "retention",
   "description": {
    "de": "Für jede Datenart sind Löschfristen und Verfahren festgelegt, die Löschung wird durchgeführt und nachgewiesen",
    "en": "Deletion periods and procedures are defined for each type of data, deletion is carried out and recorded",
    "fr": "Des délais et procédures de suppression sont définis pour chaque type de données, la suppression est effectuée et consignée",
    "nl": "Voor elk type gegevens zijn verwijdertermijnen en -procedures vastgelegd, de verwijdering wordt uitgevoerd en vastgelegd",
    "hu": "Minden adattípushoz törlési határidők és eljárások vannak meghatározva, a törlést elvégzik és igazolják",
    "et": "Kustutamistähtajad ja -menetlused on määratud iga andmeliigi jaoks, kustutamine tehakse ja registreeritakse"
   },
   "implementation": {
    "de": "Löschfristen aus dem Verzeichnis der Verarbeitungstätigkeiten ableiten, automatische Löschung wo möglich, Löschprotokoll führen, auch Backups berücksichtigen",
    "en": "Derive deletion periods from the record of processing activities, automatic deletion where possible, keep a deletion log, include backups",
    "fr": "Déduire les délais de suppression du registre des activités de traitement, suppression automatique si possible, tenir un journal de suppression, tenir compte des sauvegardes",
    "nl": "Verwijdertermijnen afleiden uit het register van verwerkingsactiviteiten, automatische verwijdering waar mogelijk, verwijderlogboek bijhouden, back-ups meenemen",
    "hu": "A törlési határidők levezetése az adatkezelési tevékenységek nyilvántartásából, ahol lehet, automatikus törlés, törlési napló vezetése, a mentések figyelembevétele",
    "et": "Tuleta kustutamistähtajad töötlemistoimingute registrist, võimalusel automaatne kustutamine, pea kustutuslogi, kaasa varukoopiad"
   }
  },
  "retention": {
   "title": {
    "de": "Aufbewahrungsfristen und Archivierung",
    "en": "Retention periods and archiving",
    "fr": "Durées de conservation et archivage",
    "nl": "Bewaartermijnen en archivering",
    "hu": "Megőrzési idők és archiválás",
    "et": "Säilitustähtajad ja arhiveerimine"
   },
   "category": "retention",
   "description": {
    "de": "Gesetzliche Aufbewahrungsfristen werden eingehalten, Daten danach gelöscht; archivierte Daten sind geschützt und nur eingeschränkt zugänglich",
    "en": "Statutory retention periods are observed, data is deleted afterwards; archived data is protected and accessible only to a limited extent",
    "fr": "Les durées légales de conservation sont respectées, les données sont supprimées ensuite ; les données archivées sont protégées et d’accès limité",
    "nl": "Wettelijke bewaartermijnen worden nageleefd, gegevens worden daarna gewist; gearchiveerde gegevens zijn beschermd en slechts beperkt toegankelijk",
    "hu": "A jogszabályi megőrzési időket betartják, az adatokat ezt követően törlik; az archivált adatok védettek és csak korlátozottan hozzáférhetők",
    "et": "Seadusjärgseid säilitustähtaegu peetakse kinni, andmed kustutatakse seejärel; arhiveeritud andmed on kaitstud ja ligipääsetavad ainult piiratult"
   },
   "implementation": {
    "de": "Fristenübersicht je Dokument- und Datenart, getrenntes Archiv mit eingeschränkten Rechten, Sperrung statt Löschung bei laufender Aufbewahrungspflicht",
    "en": "Overview of periods per document and data type, separate archive with restricted rights, blocking instead of deletion during a retention obligation",
    "fr": "Aperçu des délais par type de document et de données, archive séparée avec droits restreints, blocage au lieu de suppression pendant une obligation de conservation",
    "nl": "Overzicht van termijnen per document- en gegevenstype, apart archief met beperkte rechten, blokkeren in plaats van verwijderen tijdens een bewaarplicht",
    "hu": "Határidő-áttekintés dokumentum- és adattípusonként, külön archívum korlátozott jogosultságokkal, megőrzési kötelezettség alatt zárolás törlés helyett",
    "et": "Tähtaegade ülevaade dokumendi- ja andmeliigi kaupa, eraldi arhiiv piiratud õigustega, blokeerimine kustutamise asemel säilitamiskohustuse ajal"
   }
  }
 }
}

// Sprachen mit Inhalt; alles andere fällt auf Englisch zurück
const LANGUAGES = reg.withData(DATA.closing)
const pickLang = l => (LANGUAGES.includes(l) ? l : 'en')
const split = s => String(s).split(',').map(x => x.trim()).filter(Boolean)

// Liste der Vorlagen einer Art → [{ id, title }]
function list(kind, lang) {
  if (!KINDS.includes(kind)) return null
  const l = pickLang(lang)
  return Object.entries(DATA[kind]).map(([id, t]) => ({ id, title: t.title[l] }))
}

// Befüllter Vorschlag für das jeweilige Formular; `org`: Organisationsdaten (nur für die Platzhalter). → Objekt oder null
function build(kind, id, lang, org) {
  if (!KINDS.includes(kind) || !DATA[kind][id]) return null
  const t = DATA[kind][id]
  const l = pickLang(lang)
  if (kind === 'vvt') return {
    title: t.title[l], purpose: t.purpose[l], legalBasis: t.legalBasis, legalBasisNote: '', dataCategories: t.dataCategories.slice(), dataSubjectTypes: t.dataSubjectTypes.slice(),
    recipients: split(t.recipients[l]), internationalTransfer: false, transferMechanism: '', retentionPeriod: t.retention[l], retentionMonths: t.retentionMonths,
    deletionProcedure: DATA.deletion[l], isHighRisk: t.isHighRisk, automatedDecision: t.automatedDecision,
  }
  if (kind === 'av') return {
    title: t.title[l], processorName: '', processorCountry: '', processorContactEmail: '', processingScope: t.scope[l], transferMechanism: '', status: 'draft',
    art28Checklist: { instructionsOnly: false, confidentiality: false, security: false, subProcessorApproval: false, assistanceRights: false, deletionReturn: false, auditRights: false, cooperation: false },
  }
  if (kind === 'incident') return {
    title: t.title[l], incidentType: t.incidentType, dataCategories: t.dataCategories.slice(), dataSubjectTypes: t.dataSubjectTypes.slice(), containmentMeasures: t.containment[l],
    remediationMeasures: t.remediation[l], riskLevel: t.riskLevel, saNotificationRequired: t.saNotificationRequired, dsNotificationRequired: t.dsNotificationRequired,
  }
  if (kind === 'dsar') {
    const filled = safeDraft.fillPlaceholders(t.response[l] + '\n\n' + DATA.closing[l], org || {})
    return { title: t.title[l], requestType: t.requestType, response: filled.text, unresolved: filled.unresolved }
  }
  return { title: t.title[l], category: t.category, description: t.description[l], implementation: t.implementation[l], status: 'planned' }
}

module.exports = { LANGUAGES, KINDS, DATA, list, build }
