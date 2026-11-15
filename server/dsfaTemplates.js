// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Vorlagen für die Datenschutz-Folgenabschätzung (DSFA, Art. 35 DSGVO), Vorabprüfung und Freigaberegel. Reine Funktionen ohne Dateizugriff.
// Erzeugt aus gepflegten Katalogen (Risiken, Maßnahmen, Verarbeitungsarten) in fünf Sprachen. Die Werte für Wahrscheinlichkeit und Auswirkung sind
// Vorschläge (1–5), keine Bewertung des Einzelfalls; die Vorlagen ersetzen keine Rechtsberatung. Firmendaten stehen nicht darin: nur der Platzhalter
// {{COMPANY_NAME}}, der beim Abruf aus den Organisationsdaten gefüllt wird (safeDraft.fillPlaceholders).

const safeDraft = require('./ai/safeDraft')

const reg = require('./languages')
const DATA = {
 "risks": {
  "r_access": {
   "text": {
    "de": "Unbefugter Zugriff auf personenbezogene Daten durch Dritte oder Unbefugte",
    "en": "Unauthorised access to personal data by third parties or unauthorised persons",
    "fr": "Accès non autorisé aux données personnelles par des tiers ou des personnes non habilitées",
    "nl": "Onbevoegde toegang tot persoonsgegevens door derden of onbevoegden",
    "hu": "Személyes adatokhoz való jogosulatlan hozzáférés harmadik felek vagy illetéktelenek által",
    "et": "Isikuandmetele volitamata juurdepääs kolmandate isikute või volitamata isikute poolt"
   },
   "likelihood": 3,
   "impact": 4,
   "measures": [
    "m_rbac",
    "m_mfa",
    "m_encrypt",
    "m_logging"
   ]
  },
  "r_confid": {
   "text": {
    "de": "Offenlegung oder Verlust der Vertraulichkeit durch Fehlversand, Geräteverlust oder Fehlkonfiguration",
    "en": "Disclosure or loss of confidentiality through misdirected data, lost devices or misconfiguration",
    "fr": "Divulgation ou perte de confidentialité par erreur d’envoi, perte d’appareil ou erreur de configuration",
    "nl": "Openbaarmaking of verlies van vertrouwelijkheid door verkeerde verzending, verlies van apparatuur of foutieve configuratie",
    "hu": "A bizalmasság megsértése vagy elvesztése téves küldés, eszközvesztés vagy hibás konfiguráció miatt",
    "et": "Konfidentsiaalsuse avalikuks tulek või kadu valesti saadetud andmete, kaotatud seadmete või vale seadistuse tõttu"
   },
   "likelihood": 3,
   "impact": 3,
   "measures": [
    "m_encrypt",
    "m_training",
    "m_incident"
   ]
  },
  "r_purpose": {
   "text": {
    "de": "Zweckänderung: Die Daten werden über den ursprünglichen Zweck hinaus genutzt",
    "en": "Purpose creep: the data is used beyond the original purpose",
    "fr": "Détournement de finalité : les données sont utilisées au-delà de la finalité initiale",
    "nl": "Doelverschuiving: de gegevens worden buiten het oorspronkelijke doel gebruikt",
    "hu": "Célváltozás: az adatokat az eredeti céltól eltérően használják fel",
    "et": "Eesmärgi laienemine: andmeid kasutatakse üle algse eesmärgi"
   },
   "likelihood": 2,
   "impact": 3,
   "measures": [
    "m_minimize",
    "m_rbac",
    "m_dpo"
   ]
  },
  "r_excess": {
   "text": {
    "de": "Übermäßige Datenerhebung und zu lange Speicherung",
    "en": "Excessive data collection and storage for too long",
    "fr": "Collecte excessive de données et conservation trop longue",
    "nl": "Overmatige gegevensverzameling en te lange bewaring",
    "hu": "Túlzott adatgyűjtés és túl hosszú tárolás",
    "et": "Liigne andmete kogumine ja liiga pikk säilitamine"
   },
   "likelihood": 3,
   "impact": 3,
   "measures": [
    "m_minimize",
    "m_retention"
   ]
  },
  "r_accuracy": {
   "text": {
    "de": "Unrichtige oder veraltete Daten führen zu falschen Entscheidungen",
    "en": "Inaccurate or outdated data leads to wrong decisions",
    "fr": "Des données inexactes ou obsolètes conduisent à de mauvaises décisions",
    "nl": "Onjuiste of verouderde gegevens leiden tot verkeerde beslissingen",
    "hu": "Pontatlan vagy elavult adatok téves döntésekhez vezetnek",
    "et": "Ebaõiged või aegunud andmed viivad valedele otsustele"
   },
   "likelihood": 2,
   "impact": 3,
   "measures": [
    "m_rights",
    "m_testing",
    "m_audit"
   ]
  },
  "r_avail": {
   "text": {
    "de": "Verlust oder Nichtverfügbarkeit der Daten (Ausfall, Ransomware, Datenverlust)",
    "en": "Loss or unavailability of the data (outage, ransomware, data loss)",
    "fr": "Perte ou indisponibilité des données (panne, rançongiciel, perte de données)",
    "nl": "Verlies of onbeschikbaarheid van de gegevens (storing, ransomware, gegevensverlies)",
    "hu": "Az adatok elvesztése vagy elérhetetlensége (kiesés, zsarolóvírus, adatvesztés)",
    "et": "Andmete kadu või kättesaamatus (tõrge, lunavara, andmekadu)"
   },
   "likelihood": 2,
   "impact": 3,
   "measures": [
    "m_backup",
    "m_incident",
    "m_physical"
   ]
  },
  "r_rights": {
   "text": {
    "de": "Betroffenenrechte (Auskunft, Berichtigung, Löschung, Widerspruch) werden nicht fristgerecht erfüllt",
    "en": "Data subject rights (access, rectification, erasure, objection) are not met in time",
    "fr": "Les droits des personnes concernées (accès, rectification, effacement, opposition) ne sont pas respectés dans les délais",
    "nl": "Rechten van betrokkenen (inzage, rectificatie, wissing, bezwaar) worden niet tijdig vervuld",
    "hu": "Az érintetti jogok (hozzáférés, helyesbítés, törlés, tiltakozás) teljesítése nem történik meg határidőn belül",
    "et": "Andmesubjekti õigusi (juurdepääs, parandamine, kustutamine, vastuväide) ei täideta õigeaegselt"
   },
   "likelihood": 2,
   "impact": 3,
   "measures": [
    "m_rights",
    "m_info"
   ]
  },
  "r_transfer": {
   "text": {
    "de": "Übermittlung in Drittländer ohne angemessenes Schutzniveau",
    "en": "Transfer to third countries without an adequate level of protection",
    "fr": "Transfert vers des pays tiers sans niveau de protection adéquat",
    "nl": "Doorgifte naar derde landen zonder passend beschermingsniveau",
    "hu": "Adattovábbítás harmadik országokba megfelelő védelmi szint nélkül",
    "et": "Edastamine kolmandatesse riikidesse ilma piisava kaitsetasemeta"
   },
   "likelihood": 2,
   "impact": 4,
   "measures": [
    "m_scc",
    "m_encrypt",
    "m_avv"
   ]
  },
  "r_processor": {
   "text": {
    "de": "Unzureichende Kontrolle von Auftragsverarbeitern und Unterauftragnehmern",
    "en": "Insufficient control of processors and sub-processors",
    "fr": "Contrôle insuffisant des sous-traitants et des sous-traitants ultérieurs",
    "nl": "Onvoldoende controle van verwerkers en subverwerkers",
    "hu": "Az adatfeldolgozók és alfeldolgozók nem megfelelő ellenőrzése",
    "et": "Volitatud töötlejate ja alltöötlejate ebapiisav kontroll"
   },
   "likelihood": 3,
   "impact": 3,
   "measures": [
    "m_avv",
    "m_audit"
   ]
  },
  "r_profiling": {
   "text": {
    "de": "Fehlerhafte oder diskriminierende automatisierte Entscheidungen und Profile",
    "en": "Faulty or discriminatory automated decisions and profiles",
    "fr": "Décisions automatisées et profils erronés ou discriminatoires",
    "nl": "Foutieve of discriminerende geautomatiseerde beslissingen en profielen",
    "hu": "Hibás vagy diszkriminatív automatizált döntések és profilok",
    "et": "Vigased või diskrimineerivad automatiseeritud otsused ja profiilid"
   },
   "likelihood": 3,
   "impact": 4,
   "measures": [
    "m_human",
    "m_testing",
    "m_info"
   ]
  },
  "r_monitoring": {
   "text": {
    "de": "Überwachungsdruck und Eingriff in die Persönlichkeitsrechte der Betroffenen",
    "en": "Pressure from monitoring and interference with the personality rights of the people concerned",
    "fr": "Pression de la surveillance et atteinte aux droits de la personnalité des personnes concernées",
    "nl": "Controledruk en inbreuk op de persoonlijkheidsrechten van betrokkenen",
    "hu": "Megfigyelési nyomás és beavatkozás az érintettek személyiségi jogaiba",
    "et": "Jälgimissurve ja sekkumine asjaomaste isikute isikupärastesse õigustesse"
   },
   "likelihood": 4,
   "impact": 3,
   "measures": [
    "m_worksagr",
    "m_info",
    "m_minimize"
   ]
  },
  "r_sensitive": {
   "text": {
    "de": "Offenlegung besonderer Kategorien personenbezogener Daten (Art. 9 DSGVO)",
    "en": "Disclosure of special categories of personal data (Art. 9 GDPR)",
    "fr": "Divulgation de catégories particulières de données personnelles (art. 9 RGPD)",
    "nl": "Openbaarmaking van bijzondere categorieën persoonsgegevens (art. 9 AVG)",
    "hu": "A személyes adatok különleges kategóriáinak nyilvánosságra kerülése (GDPR 9. cikk)",
    "et": "Isikuandmete eriliikide avalikuks tulek (IKÜM art 9)"
   },
   "likelihood": 2,
   "impact": 5,
   "measures": [
    "m_separation",
    "m_rbac",
    "m_encrypt",
    "m_logging"
   ]
  },
  "r_transparency": {
   "text": {
    "de": "Betroffene sind nicht ausreichend über die Verarbeitung informiert",
    "en": "Data subjects are not sufficiently informed about the processing",
    "fr": "Les personnes concernées ne sont pas suffisamment informées du traitement",
    "nl": "Betrokkenen zijn onvoldoende geïnformeerd over de verwerking",
    "hu": "Az érintettek nem kapnak megfelelő tájékoztatást az adatkezelésről",
    "et": "Andmesubjekte ei teavitata töötlemisest piisavalt"
   },
   "likelihood": 3,
   "impact": 2,
   "measures": [
    "m_info",
    "m_dpo"
   ]
  },
  "r_ai_leak": {
   "text": {
    "de": "Preisgabe personenbezogener Daten an den KI-Anbieter oder Verwendung der Eingaben zum Training von Modellen",
    "en": "Personal data is passed to the AI provider or inputs are used to train models",
    "fr": "Les données personnelles sont transmises au fournisseur d’IA ou les saisies servent à entraîner des modèles",
    "nl": "Persoonsgegevens worden aan de AI-aanbieder doorgegeven of invoer wordt gebruikt om modellen te trainen",
    "hu": "A személyes adatok az AI-szolgáltatóhoz kerülnek, vagy a bemeneteket modellek tanítására használják",
    "et": "Isikuandmed antakse TI-pakkujale edasi või sisendeid kasutatakse mudelite treenimiseks"
   },
   "likelihood": 3,
   "impact": 4,
   "measures": [
    "m_ai_contract",
    "m_ai_filter",
    "m_avv",
    "m_training"
   ]
  },
  "r_reident": {
   "text": {
    "de": "Re-Identifizierung oder unzulässige Zusammenführung von Datenbeständen",
    "en": "Re-identification or unlawful combination of data sets",
    "fr": "Ré-identification ou rapprochement illicite de jeux de données",
    "nl": "Heridentificatie of ongeoorloofde samenvoeging van gegevensbestanden",
    "hu": "Újraazonosítás vagy adatállományok jogosulatlan összekapcsolása",
    "et": "Andmekogumite taastuvastamine või ebaseaduslik kombineerimine"
   },
   "likelihood": 2,
   "impact": 4,
   "measures": [
    "m_pseudonym",
    "m_rbac",
    "m_minimize"
   ]
  },
  "r_retaliation": {
   "text": {
    "de": "Benachteiligung oder Vergeltung gegen hinweisgebende oder betroffene Personen",
    "en": "Disadvantage or retaliation against whistleblowers or the people concerned",
    "fr": "Désavantage ou représailles à l’encontre des lanceurs d’alerte ou des personnes concernées",
    "nl": "Benadeling of represailles tegen klokkenluiders of betrokkenen",
    "hu": "Hátrányos megkülönböztetés vagy megtorlás a bejelentők vagy érintettek ellen",
    "et": "Rikkumisest teavitajate või asjaomaste isikute kahjustamine või kättemaks"
   },
   "likelihood": 2,
   "impact": 5,
   "measures": [
    "m_confidential_channel",
    "m_rbac",
    "m_training"
   ]
  },
  "r_biometric_irrev": {
   "text": {
    "de": "Biometrische Merkmale lassen sich nicht ändern; ein Missbrauch hat dauerhafte Folgen",
    "en": "Biometric features cannot be changed; misuse has lasting consequences",
    "fr": "Les caractéristiques biométriques ne peuvent pas être modifiées ; un abus a des conséquences durables",
    "nl": "Biometrische kenmerken kunnen niet worden gewijzigd; misbruik heeft blijvende gevolgen",
    "hu": "A biometrikus jellemzők nem változtathatók meg; a visszaélés tartós következményekkel jár",
    "et": "Biomeetrilisi tunnuseid ei saa muuta; kuritarvitamisel on püsivad tagajärjed"
   },
   "likelihood": 2,
   "impact": 5,
   "measures": [
    "m_template_store",
    "m_encrypt",
    "m_alternative"
   ]
  },
  "r_insider": {
   "text": {
    "de": "Missbrauch durch Beschäftigte mit Zugriff (Insider)",
    "en": "Misuse by employees with access (insiders)",
    "fr": "Utilisation abusive par des collaborateurs ayant un accès (menace interne)",
    "nl": "Misbruik door medewerkers met toegang (insiders)",
    "hu": "Hozzáféréssel rendelkező munkatársak általi visszaélés (bennfentes)",
    "et": "Juurdepääsuga töötajate (siseringi) kuritarvitamine"
   },
   "likelihood": 3,
   "impact": 4,
   "measures": [
    "m_rbac",
    "m_logging",
    "m_training",
    "m_access_recordings"
   ]
  }
 },
 "measures": {
  "m_rbac": {
   "de": "Rollenbasiertes Berechtigungskonzept nach dem Need-to-know-Prinzip",
   "en": "Role-based permission concept following the need-to-know principle",
   "fr": "Concept d’autorisations par rôles selon le principe du besoin d’en connaître",
   "nl": "Rolgebaseerd autorisatieconcept volgens het need-to-know-principe",
   "hu": "Szerepköralapú jogosultsági koncepció a „need-to-know” elv szerint",
   "et": "Rollipõhine õiguste kontseptsioon põhimõtte „teadmisvajadus“ järgi"
  },
  "m_mfa": {
   "de": "Mehrfaktor-Authentifizierung für alle Zugänge",
   "en": "Multi-factor authentication for all access",
   "fr": "Authentification multifacteur pour tous les accès",
   "nl": "Meerfactorauthenticatie voor alle toegang",
   "hu": "Többfaktoros hitelesítés minden hozzáféréshez",
   "et": "Mitmefaktoriline autentimine kogu juurdepääsule"
  },
  "m_encrypt": {
   "de": "Verschlüsselung bei Speicherung und Übertragung",
   "en": "Encryption at rest and in transit",
   "fr": "Chiffrement au repos et en transit",
   "nl": "Versleuteling bij opslag en overdracht",
   "hu": "Titkosítás tároláskor és továbbításkor",
   "et": "Krüpteerimine salvestatult ja edastamisel"
  },
  "m_logging": {
   "de": "Protokollierung und regelmäßige Auswertung von Zugriffen",
   "en": "Logging and regular review of access",
   "fr": "Journalisation et analyse régulière des accès",
   "nl": "Logging en regelmatige beoordeling van toegang",
   "hu": "A hozzáférések naplózása és rendszeres elemzése",
   "et": "Juurdepääsu logimine ja regulaarne ülevaatus"
  },
  "m_avv": {
   "de": "Auftragsverarbeitungsvertrag und Prüfung des Auftragsverarbeiters",
   "en": "Data processing agreement and assessment of the processor",
   "fr": "Contrat de sous-traitance et vérification du sous-traitant",
   "nl": "Verwerkersovereenkomst en beoordeling van de verwerker",
   "hu": "Adatfeldolgozói szerződés és az adatfeldolgozó ellenőrzése",
   "et": "Andmetöötluse leping ja volitatud töötleja hindamine"
  },
  "m_minimize": {
   "de": "Datenminimierung und Beschränkung auf den erforderlichen Zweck",
   "en": "Data minimisation and restriction to the necessary purpose",
   "fr": "Minimisation des données et limitation à la finalité nécessaire",
   "nl": "Gegevensminimalisatie en beperking tot het noodzakelijke doel",
   "hu": "Adatminimalizálás és korlátozás a szükséges célra",
   "et": "Andmete minimeerimine ja piiramine vajaliku eesmärgiga"
  },
  "m_retention": {
   "de": "Festgelegte Aufbewahrungs- und Löschfristen mit automatischer Löschung",
   "en": "Defined retention and deletion periods with automatic deletion",
   "fr": "Durées de conservation et de suppression définies avec suppression automatique",
   "nl": "Vastgelegde bewaar- en verwijdertermijnen met automatische verwijdering",
   "hu": "Meghatározott megőrzési és törlési határidők automatikus törléssel",
   "et": "Määratletud säilitus- ja kustutamistähtajad automaatse kustutamisega"
  },
  "m_info": {
   "de": "Transparente Information der Betroffenen (Datenschutzhinweise)",
   "en": "Transparent information for data subjects (privacy notices)",
   "fr": "Information transparente des personnes concernées (mentions d’information)",
   "nl": "Transparante informatie aan betrokkenen (privacyverklaring)",
   "hu": "Az érintettek átlátható tájékoztatása (adatvédelmi tájékoztató)",
   "et": "Läbipaistev teave andmesubjektidele (privaatsusteated)"
  },
  "m_rights": {
   "de": "Etablierter Prozess für Betroffenenanfragen mit Fristenüberwachung",
   "en": "Established process for data subject requests with deadline monitoring",
   "fr": "Processus établi pour les demandes des personnes concernées avec suivi des délais",
   "nl": "Vast proces voor verzoeken van betrokkenen met termijnbewaking",
   "hu": "Kialakított folyamat az érintetti kérelmekhez határidő-figyeléssel",
   "et": "Kehtestatud protsess andmesubjekti taotlustele tähtaegade jälgimisega"
  },
  "m_backup": {
   "de": "Datensicherung und getestete Wiederherstellung",
   "en": "Backup and tested restoration",
   "fr": "Sauvegarde et restauration testée",
   "nl": "Back-up en geteste herstelprocedure",
   "hu": "Adatmentés és tesztelt helyreállítás",
   "et": "Varundus ja testitud taastamine"
  },
  "m_training": {
   "de": "Schulung und Verpflichtung der Beschäftigten zur Vertraulichkeit",
   "en": "Training of employees and their commitment to confidentiality",
   "fr": "Formation du personnel et engagement de confidentialité",
   "nl": "Training van medewerkers en verplichting tot vertrouwelijkheid",
   "hu": "A munkatársak képzése és titoktartási kötelezettsége",
   "et": "Töötajate koolitus ja nende konfidentsiaalsuskohustus"
  },
  "m_pseudonym": {
   "de": "Pseudonymisierung oder Anonymisierung, wo möglich",
   "en": "Pseudonymisation or anonymisation where possible",
   "fr": "Pseudonymisation ou anonymisation lorsque c’est possible",
   "nl": "Pseudonimisering of anonimisering waar mogelijk",
   "hu": "Álnevesítés vagy anonimizálás, ahol lehetséges",
   "et": "Pseudonümiseerimine või anonümiseerimine, kus võimalik"
  },
  "m_scc": {
   "de": "Standardvertragsklauseln und Transfer-Folgenabschätzung bei Drittlandübermittlung",
   "en": "Standard contractual clauses and transfer impact assessment for third-country transfers",
   "fr": "Clauses contractuelles types et analyse d’impact du transfert pour les transferts vers des pays tiers",
   "nl": "Modelcontractbepalingen en doorgifte-effectbeoordeling bij doorgifte naar derde landen",
   "hu": "Általános szerződési feltételek és adattovábbítási hatásvizsgálat harmadik országba történő továbbításhoz",
   "et": "Tüüplepingutingimused ja edastamise mõjuhinnang kolmandatesse riikidesse edastamisel"
  },
  "m_human": {
   "de": "Menschliche Prüfung vor Entscheidungen mit rechtlicher oder erheblicher Wirkung",
   "en": "Human review before decisions with legal or significant effect",
   "fr": "Examen humain avant les décisions ayant un effet juridique ou significatif",
   "nl": "Menselijke beoordeling vóór beslissingen met rechtsgevolg of aanzienlijke gevolgen",
   "hu": "Emberi felülvizsgálat a jogi vagy jelentős hatású döntések előtt",
   "et": "Inimese ülevaatus enne õiguslike või märkimisväärsete mõjudega otsuseid"
  },
  "m_testing": {
   "de": "Regelmäßige Prüfung auf Fehler und Verzerrungen (Bias)",
   "en": "Regular testing for errors and bias",
   "fr": "Contrôle régulier des erreurs et des biais",
   "nl": "Regelmatige controle op fouten en vooringenomenheid (bias)",
   "hu": "Rendszeres vizsgálat hibákra és torzításokra (bias)",
   "et": "Regulaarne testimine vigade ja kallutatuse suhtes"
  },
  "m_worksagr": {
   "de": "Betriebsvereinbarung bzw. Einbindung der Arbeitnehmervertretung",
   "en": "Works agreement or involvement of the employee representatives",
   "fr": "Accord d’entreprise ou implication des représentants du personnel",
   "nl": "Ondernemingsovereenkomst of betrokkenheid van de werknemersvertegenwoordiging",
   "hu": "Üzemi megállapodás, illetve a munkavállalói képviselet bevonása",
   "et": "Kollektiivleping või töötajate esindajate kaasamine"
  },
  "m_signage": {
   "de": "Hinweisschilder und klare Begrenzung der erfassten Bereiche",
   "en": "Signage and clear limitation of the areas covered",
   "fr": "Panneaux d’information et délimitation claire des zones couvertes",
   "nl": "Informatieborden en duidelijke afbakening van de gedekte ruimten",
   "hu": "Tájékoztató táblák és a megfigyelt területek egyértelmű korlátozása",
   "et": "Märgistus ja hõlmatud alade selge piiritlemine"
  },
  "m_access_recordings": {
   "de": "Zugriff auf Aufnahmen und Auswertungen nur im Vier-Augen-Prinzip und mit Protokoll",
   "en": "Access to recordings and evaluations only under the four-eyes principle and with a log",
   "fr": "Accès aux enregistrements et analyses uniquement selon le principe des quatre yeux et avec journal",
   "nl": "Toegang tot opnamen en analyses alleen volgens het vierogenprincipe en met logboek",
   "hu": "A felvételekhez és értékelésekhez csak négyszemközti elv szerint és naplózással lehet hozzáférni",
   "et": "Juurdepääs salvestistele ja hindamistele ainult neljasilmareegli alusel ja logiga"
  },
  "m_ai_contract": {
   "de": "Vertragliche Zusicherung, dass Eingaben nicht zum Training verwendet werden",
   "en": "Contractual assurance that inputs are not used for training",
   "fr": "Garantie contractuelle que les saisies ne servent pas à l’entraînement",
   "nl": "Contractuele toezegging dat invoer niet voor training wordt gebruikt",
   "hu": "Szerződéses kötelezettségvállalás arra, hogy a bemeneteket nem használják tanításra",
   "et": "Lepinguline kinnitus, et sisendeid ei kasutata treenimiseks"
  },
  "m_ai_filter": {
   "de": "Technische Sperren und Vorgaben, keine personenbezogenen Daten einzugeben",
   "en": "Technical controls and rules not to enter personal data",
   "fr": "Blocages techniques et consignes de ne pas saisir de données personnelles",
   "nl": "Technische beperkingen en regels om geen persoonsgegevens in te voeren",
   "hu": "Technikai korlátozások és előírások a személyes adatok bevitelének tiltására",
   "et": "Tehnilised kontrollid ja reeglid, et isikuandmeid mitte sisestada"
  },
  "m_alternative": {
   "de": "Gleichwertige Alternative ohne biometrische Erfassung anbieten",
   "en": "Offer an equivalent alternative without biometric capture",
   "fr": "Proposer une alternative équivalente sans saisie biométrique",
   "nl": "Een gelijkwaardig alternatief zonder biometrische registratie aanbieden",
   "hu": "Egyenértékű, biometrikus rögzítés nélküli alternatíva biztosítása",
   "et": "Pakkuda võrdväärset alternatiivi ilma biomeetrilise kogumiseta"
  },
  "m_template_store": {
   "de": "Biometrische Vorlagen nur lokal und verschlüsselt speichern, keine Rohdaten",
   "en": "Store biometric templates only locally and encrypted, no raw data",
   "fr": "Stocker les gabarits biométriques uniquement en local et chiffrés, pas de données brutes",
   "nl": "Biometrische sjablonen alleen lokaal en versleuteld opslaan, geen ruwe gegevens",
   "hu": "A biometrikus sablonokat csak helyben és titkosítva tárolja, nyers adatokat ne",
   "et": "Hoida biomeetrilisi malle ainult kohapeal ja krüpteeritult, mitte toorandmeid"
  },
  "m_confidential_channel": {
   "de": "Vertrauliche Meldekanäle mit Schutz der Identität und Vertraulichkeitsverpflichtung",
   "en": "Confidential reporting channels with protection of identity and confidentiality obligation",
   "fr": "Canaux de signalement confidentiels avec protection de l’identité et obligation de confidentialité",
   "nl": "Vertrouwelijke meldkanalen met bescherming van de identiteit en geheimhoudingsplicht",
   "hu": "Bizalmas bejelentési csatornák a személyazonosság védelmével és titoktartási kötelezettséggel",
   "et": "Konfidentsiaalsed teavituskanalid isiku kaitse ja konfidentsiaalsuskohustusega"
  },
  "m_incident": {
   "de": "Prozess für Datenschutzverletzungen (Meldung innerhalb von 72 Stunden)",
   "en": "Process for personal data breaches (notification within 72 hours)",
   "fr": "Processus pour les violations de données (notification sous 72 heures)",
   "nl": "Proces voor datalekken (melding binnen 72 uur)",
   "hu": "Folyamat adatvédelmi incidensekhez (bejelentés 72 órán belül)",
   "et": "Isikuandmetega seotud rikkumiste protsess (teavitamine 72 tunni jooksul)"
  },
  "m_dpo": {
   "de": "Einbindung des Datenschutzbeauftragten und regelmäßige Überprüfung dieser Folgenabschätzung",
   "en": "Involvement of the data protection officer and regular review of this assessment",
   "fr": "Implication du délégué à la protection des données et réexamen régulier de cette analyse",
   "nl": "Betrokkenheid van de functionaris voor gegevensbescherming en regelmatige herziening van deze beoordeling",
   "hu": "Az adatvédelmi tisztviselő bevonása és e hatásvizsgálat rendszeres felülvizsgálata",
   "et": "Andmekaitsespetsialisti kaasamine ja selle hinnangu regulaarne ülevaatus"
  },
  "m_audit": {
   "de": "Regelmäßige interne Prüfung der Wirksamkeit der Maßnahmen",
   "en": "Regular internal review of the effectiveness of the measures",
   "fr": "Contrôle interne régulier de l’efficacité des mesures",
   "nl": "Regelmatige interne controle van de doeltreffendheid van de maatregelen",
   "hu": "Az intézkedések hatékonyságának rendszeres belső ellenőrzése",
   "et": "Meetmete tõhususe regulaarne sisemine ülevaatus"
  },
  "m_separation": {
   "de": "Getrennte Speicherung besonders sensibler Daten mit eigener Zugriffsbeschränkung",
   "en": "Separate storage of especially sensitive data with its own access restriction",
   "fr": "Stockage séparé des données particulièrement sensibles avec restriction d’accès propre",
   "nl": "Gescheiden opslag van bijzonder gevoelige gegevens met eigen toegangsbeperking",
   "hu": "A különösen érzékeny adatok elkülönített tárolása saját hozzáférés-korlátozással",
   "et": "Eriti tundlike andmete eraldi säilitamine oma juurdepääsupiiranguga"
  },
  "m_physical": {
   "de": "Physische Sicherung von Räumen, Servern und Geräten",
   "en": "Physical protection of rooms, servers and devices",
   "fr": "Protection physique des locaux, serveurs et appareils",
   "nl": "Fysieke beveiliging van ruimten, servers en apparatuur",
   "hu": "A helyiségek, szerverek és eszközök fizikai védelme",
   "et": "Ruumide, serverite ja seadmete füüsiline kaitse"
  }
 },
 "templates": {
  "hr_cloud": {
   "title": {
    "de": "HR-Software in der Cloud (Personalverwaltung und Entgeltabrechnung)",
    "en": "HR software in the cloud (personnel administration and payroll)",
    "fr": "Logiciel RH dans le cloud (gestion du personnel et paie)",
    "nl": "HR-software in de cloud (personeelsadministratie en salarisverwerking)",
    "hu": "Felhőalapú HR-szoftver (személyügyi nyilvántartás és bérszámfejtés)",
    "et": "Pilvepõhine personalitarkvara (personalihaldus ja palgaarvestus)"
   },
   "purpose": {
    "de": "Personalverwaltung, Gehaltsabrechnung und Personalentwicklung mit einer cloudbasierten HR-Software",
    "en": "Personnel administration, payroll and staff development with cloud-based HR software",
    "fr": "Gestion du personnel, paie et développement du personnel avec un logiciel RH dans le cloud",
    "nl": "Personeelsadministratie, salarisverwerking en personeelsontwikkeling met cloudgebaseerde HR-software",
    "hu": "Személyügyi nyilvántartás, bérszámfejtés és személyzetfejlesztés felhőalapú HR-szoftverrel",
    "et": "Personalihaldus, palgaarvestus ja töötajate arendamine pilvepõhise personalitarkvaraga"
   },
   "subjects": {
    "de": "Beschäftigte, Bewerber, ehemalige Beschäftigte",
    "en": "Employees, applicants, former employees",
    "fr": "Salariés, candidats, anciens salariés",
    "nl": "Medewerkers, sollicitanten, oud-medewerkers",
    "hu": "Munkavállalók, pályázók, volt munkavállalók",
    "et": "Töötajad, kandidaadid, endised töötajad"
   },
   "data": {
    "de": "Stammdaten, Vertrags- und Gehaltsdaten, Arbeitszeiten, Abwesenheiten (gegebenenfalls Gesundheitsdaten, Gewerkschaftszugehörigkeit)",
    "en": "Master data, contract and salary data, working time, absences (possibly health data, trade union membership)",
    "fr": "Données de base, données contractuelles et salariales, temps de travail, absences (éventuellement données de santé, appartenance syndicale)",
    "nl": "Stamgegevens, contract- en salarisgegevens, werktijden, afwezigheid (eventueel gezondheidsgegevens, vakbondslidmaatschap)",
    "hu": "Törzsadatok, szerződéses és bérezési adatok, munkaidő, távollétek (adott esetben egészségügyi adatok, szakszervezeti tagság)",
    "et": "Põhiandmed, leping ja palgaandmed, tööaeg, puudumised (võimalik tervise- ja ametiühingu liikmesuse andmed)"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. b und c DSGVO (Arbeitsvertrag, rechtliche Pflichten) sowie nationales Beschäftigtendatenschutzrecht",
    "en": "Art. 6(1)(b) and (c) GDPR (employment contract, legal obligations) and national employee data protection law",
    "fr": "Art. 6, par. 1, points b) et c) RGPD (contrat de travail, obligations légales) et droit national de la protection des données des salariés",
    "nl": "Art. 6, lid 1, onder b en c AVG (arbeidsovereenkomst, wettelijke verplichtingen) en nationaal recht inzake gegevensbescherming van werknemers",
    "hu": "GDPR 6. cikk (1) bekezdés b) és c) pont (munkaszerződés, jogi kötelezettségek) és a nemzeti munkavállalói adatvédelmi jog",
    "et": "IKÜM art 6 lg 1 p b ja c (töölepingu, õiguslikud kohustused) ning riigisisene töötajate andmekaitseõigus"
   },
   "risks": [
    "r_access",
    "r_confid",
    "r_transfer",
    "r_processor",
    "r_rights",
    "r_sensitive",
    "r_insider",
    "r_avail"
   ]
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
    "de": "Schutz von Eigentum und Personen, Aufklärung von Straftaten in definierten Bereichen",
    "en": "Protection of property and people, investigation of offences in defined areas",
    "fr": "Protection des biens et des personnes, élucidation d’infractions dans des zones définies",
    "nl": "Bescherming van eigendom en personen, opsporing van strafbare feiten in afgebakende ruimten",
    "hu": "Vagyon és személyek védelme, bűncselekmények felderítése meghatározott területeken",
    "et": "Vara ja isikute kaitse, õigusrikkumiste uurimine kindlaksmääratud aladel"
   },
   "subjects": {
    "de": "Beschäftigte, Besucher, Kunden, Lieferanten, Passanten",
    "en": "Employees, visitors, customers, suppliers, passers-by",
    "fr": "Salariés, visiteurs, clients, fournisseurs, passants",
    "nl": "Medewerkers, bezoekers, klanten, leveranciers, voorbijgangers",
    "hu": "Munkavállalók, látogatók, ügyfelek, beszállítók, járókelők",
    "et": "Töötajad, külastajad, kliendid, tarnijad, möödujad"
   },
   "data": {
    "de": "Bild- und gegebenenfalls Tonaufnahmen, Zeitpunkt und Ort der Aufnahme",
    "en": "Images and possibly sound recordings, time and place of the recording",
    "fr": "Images et éventuellement enregistrements sonores, date et lieu de l’enregistrement",
    "nl": "Beeld- en eventueel geluidsopnamen, tijdstip en plaats van de opname",
    "hu": "Kép- és adott esetben hangfelvételek, a felvétel ideje és helye",
    "et": "Pildid ja võimalikud helisalvestised, salvestamise aeg ja koht"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse); Interessenabwägung dokumentieren, nationale Vorgaben beachten",
    "en": "Art. 6(1)(f) GDPR (legitimate interest); document the balancing of interests and observe national rules",
    "fr": "Art. 6, par. 1, point f) RGPD (intérêt légitime) ; documenter la pondération des intérêts et respecter les règles nationales",
    "nl": "Art. 6, lid 1, onder f AVG (gerechtvaardigd belang); belangenafweging documenteren en nationale regels naleven",
    "hu": "GDPR 6. cikk (1) bekezdés f) pont (jogos érdek); az érdekmérlegelést dokumentálni kell, és figyelembe kell venni a nemzeti szabályokat",
    "et": "IKÜM art 6 lg 1 p f (õigustatud huvi); dokumenteeri huvide kaalumine ja järgi riigisiseseid reegleid"
   },
   "risks": [
    "r_monitoring",
    "r_excess",
    "r_access",
    "r_transparency",
    "r_insider",
    "r_purpose",
    "r_rights"
   ]
  },
  "employee_monitoring": {
   "title": {
    "de": "Mitarbeiterüberwachung und Ortung (Arbeitszeit, Standort, Leistung)",
    "en": "Employee monitoring and tracking (working time, location, performance)",
    "fr": "Surveillance et géolocalisation des salariés (temps de travail, position, performance)",
    "nl": "Medewerkersbewaking en lokalisatie (werktijd, locatie, prestaties)",
    "hu": "Munkavállalók megfigyelése és helymeghatározása (munkaidő, tartózkodási hely, teljesítmény)",
    "et": "Töötajate jälgimine ja jälitamine (tööaeg, asukoht, tulemuslikkus)"
   },
   "purpose": {
    "de": "Arbeitszeiterfassung, Fahrzeug- oder Geräteortung, Nutzungs- und Leistungsauswertung",
    "en": "Time recording, vehicle or device tracking, usage and performance analysis",
    "fr": "Enregistrement du temps de travail, géolocalisation de véhicules ou d’appareils, analyse de l’usage et de la performance",
    "nl": "Tijdregistratie, voertuig- of apparaatlokalisatie, gebruiks- en prestatieanalyse",
    "hu": "Munkaidő-nyilvántartás, jármű- vagy eszközhelymeghatározás, használati és teljesítményelemzés",
    "et": "Tööaja arvestus, sõidukite või seadmete jälgimine, kasutuse ja tulemuslikkuse analüüs"
   },
   "subjects": {
    "de": "Beschäftigte, Leiharbeitskräfte, Fahrer",
    "en": "Employees, temporary workers, drivers",
    "fr": "Salariés, intérimaires, conducteurs",
    "nl": "Medewerkers, uitzendkrachten, chauffeurs",
    "hu": "Munkavállalók, kölcsönzött munkaerő, gépjárművezetők",
    "et": "Töötajad, renditöötajad, juhid"
   },
   "data": {
    "de": "Zeit-, Standort-, Nutzungs- und Protokolldaten, gegebenenfalls Leistungskennzahlen",
    "en": "Time, location, usage and log data, possibly performance indicators",
    "fr": "Données de temps, de localisation, d’usage et de journalisation, éventuellement indicateurs de performance",
    "nl": "Tijd-, locatie-, gebruiks- en logboekgegevens, eventueel prestatie-indicatoren",
    "hu": "Idő-, helyadat-, használati és naplóadatok, adott esetben teljesítménymutatók",
    "et": "Aja-, asukoha-, kasutus- ja logiandmed, võimalikud tulemuslikkuse näitajad"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. b und f DSGVO sowie nationales Beschäftigtendatenschutzrecht; Mitbestimmung der Arbeitnehmervertretung beachten; strenge Erforderlichkeitsprüfung",
    "en": "Art. 6(1)(b) and (f) GDPR and national employee data protection law; observe co-determination by employee representatives; strict necessity test",
    "fr": "Art. 6, par. 1, points b) et f) RGPD et droit national de la protection des données des salariés ; respecter la codétermination des représentants du personnel ; contrôle strict de la nécessité",
    "nl": "Art. 6, lid 1, onder b en f AVG en nationaal recht inzake gegevensbescherming van werknemers; medezeggenschap van de werknemersvertegenwoordiging naleven; strenge noodzakelijkheidstoets",
    "hu": "GDPR 6. cikk (1) bekezdés b) és f) pont és a nemzeti munkavállalói adatvédelmi jog; a munkavállalói képviselet együttdöntési jogának figyelembevétele; szigorú szükségességi vizsgálat",
    "et": "IKÜM art 6 lg 1 p b ja f ning riigisisene töötajate andmekaitseõigus; arvesta töötajate esindajate kaasotsustusõigust; range vajalikkuse kontroll"
   },
   "risks": [
    "r_monitoring",
    "r_purpose",
    "r_excess",
    "r_transparency",
    "r_profiling",
    "r_access",
    "r_rights",
    "r_insider"
   ]
  },
  "ai_service": {
   "title": {
    "de": "KI-Dienst mit personenbezogenen Daten (z. B. Assistent, Chatbot, Auswertung)",
    "en": "AI service with personal data (e.g. assistant, chatbot, analysis)",
    "fr": "Service d’IA avec données personnelles (p. ex. assistant, chatbot, analyse)",
    "nl": "AI-dienst met persoonsgegevens (bijv. assistent, chatbot, analyse)",
    "hu": "AI-szolgáltatás személyes adatokkal (pl. asszisztens, chatbot, elemzés)",
    "et": "TI-teenus isikuandmetega (nt assistent, vestlusrobot, analüüs)"
   },
   "purpose": {
    "de": "Einsatz eines KI-Dienstes zur Unterstützung von Aufgaben, bei dem personenbezogene Daten verarbeitet werden können",
    "en": "Use of an AI service to support tasks in which personal data may be processed",
    "fr": "Utilisation d’un service d’IA pour assister des tâches pouvant impliquer des données personnelles",
    "nl": "Inzet van een AI-dienst ter ondersteuning van taken waarbij persoonsgegevens kunnen worden verwerkt",
    "hu": "AI-szolgáltatás használata feladatok támogatására, amelyek során személyes adatok kezelhetők",
    "et": "TI-teenuse kasutamine ülesannete toetamiseks, mille käigus võidakse töödelda isikuandmeid"
   },
   "subjects": {
    "de": "Beschäftigte, Kunden, Geschäftspartner, deren Daten in Eingaben vorkommen",
    "en": "Employees, customers, business partners whose data appears in inputs",
    "fr": "Salariés, clients, partenaires dont les données figurent dans les saisies",
    "nl": "Medewerkers, klanten, zakelijke partners van wie gegevens in de invoer voorkomen",
    "hu": "Munkavállalók, ügyfelek, üzleti partnerek, akiknek adatai a bemenetekben szerepelnek",
    "et": "Töötajad, kliendid, äripartnerid, kelle andmed on sisendites"
   },
   "data": {
    "de": "Eingabetexte und Dokumente, Ausgaben, Nutzungs- und Protokolldaten; keine besonderen Kategorien vorsehen",
    "en": "Input texts and documents, outputs, usage and log data; do not plan for special categories",
    "fr": "Textes et documents saisis, résultats, données d’usage et de journalisation ; ne pas prévoir de catégories particulières",
    "nl": "Invoerteksten en -documenten, uitvoer, gebruiks- en logboekgegevens; geen bijzondere categorieën voorzien",
    "hu": "Beviteli szövegek és dokumentumok, kimenetek, használati és naplóadatok; különleges kategóriák nem tervezhetők",
    "et": "Sisendtekstid ja dokumendid, väljundid, kasutus- ja logiandmed; ära planeeri eriliike"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. b oder f DSGVO; Auftragsverarbeitung nach Art. 28; Pflichten nach der KI-Verordnung (EU AI Act) prüfen, auch Transparenz und Kennzeichnung",
    "en": "Art. 6(1)(b) or (f) GDPR; processing by a processor under Art. 28; check the obligations under the EU AI Act, including transparency and labelling",
    "fr": "Art. 6, par. 1, point b) ou f) RGPD ; sous-traitance selon l’art. 28 ; vérifier les obligations du règlement européen sur l’IA, y compris transparence et étiquetage",
    "nl": "Art. 6, lid 1, onder b of f AVG; verwerking door een verwerker volgens art. 28; verplichtingen onder de Europese AI-verordening controleren, ook transparantie en labelen",
    "hu": "GDPR 6. cikk (1) bekezdés b) vagy f) pont; adatfeldolgozás a 28. cikk szerint; az EU AI Act kötelezettségeinek vizsgálata, az átláthatóságot és a megjelölést is beleértve",
    "et": "IKÜM art 6 lg 1 p b või f; töötlemine volitatud töötleja poolt art 28 alusel; kontrolli ELi tehisintellekti määruse kohustusi, sh läbipaistvus ja märgistamine"
   },
   "risks": [
    "r_ai_leak",
    "r_transfer",
    "r_processor",
    "r_profiling",
    "r_accuracy",
    "r_transparency",
    "r_rights",
    "r_purpose",
    "r_access"
   ]
  },
  "profiling": {
   "title": {
    "de": "Profiling und Scoring von Kunden",
    "en": "Profiling and scoring of customers",
    "fr": "Profilage et scoring des clients",
    "nl": "Profilering en scoring van klanten",
    "hu": "Ügyfelek profilalkotása és pontozása",
    "et": "Klientide profileerimine ja skoorimine"
   },
   "purpose": {
    "de": "Bewertung von Kunden (Bonität, Kaufverhalten, Segmentierung) auf Grundlage automatisierter Verarbeitung",
    "en": "Assessment of customers (creditworthiness, purchase behaviour, segmentation) based on automated processing",
    "fr": "Évaluation des clients (solvabilité, comportement d’achat, segmentation) sur la base d’un traitement automatisé",
    "nl": "Beoordeling van klanten (kredietwaardigheid, koopgedrag, segmentatie) op basis van geautomatiseerde verwerking",
    "hu": "Ügyfelek értékelése (hitelképesség, vásárlási szokások, szegmentálás) automatizált feldolgozás alapján",
    "et": "Klientide hindamine (krediidivõime, ostukäitumine, segmenteerimine) automatiseeritud töötlemise alusel"
   },
   "subjects": {
    "de": "Kunden, Interessenten",
    "en": "Customers, prospects",
    "fr": "Clients, prospects",
    "nl": "Klanten, prospects",
    "hu": "Ügyfelek, érdeklődők",
    "et": "Kliendid, huvilised"
   },
   "data": {
    "de": "Stamm-, Vertrags-, Zahlungs- und Nutzungsdaten, abgeleitete Scores und Segmente",
    "en": "Master, contract, payment and usage data, derived scores and segments",
    "fr": "Données de base, contractuelles, de paiement et d’usage, scores et segments dérivés",
    "nl": "Stam-, contract-, betalings- en gebruiksgegevens, afgeleide scores en segmenten",
    "hu": "Törzs-, szerződéses, fizetési és használati adatok, származtatott pontszámok és szegmensek",
    "et": "Põhi-, lepingu-, makse- ja kasutusandmed, tuletatud hinded ja segmendid"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. a, b oder f DSGVO; Einschränkungen automatisierter Entscheidungen nach Art. 22 beachten",
    "en": "Art. 6(1)(a), (b) or (f) GDPR; observe the limits on automated decisions under Art. 22",
    "fr": "Art. 6, par. 1, points a), b) ou f) RGPD ; respecter les limites des décisions automatisées selon l’art. 22",
    "nl": "Art. 6, lid 1, onder a, b of f AVG; beperkingen voor geautomatiseerde besluitvorming volgens art. 22 naleven",
    "hu": "GDPR 6. cikk (1) bekezdés a), b) vagy f) pont; a 22. cikk szerinti automatizált döntéshozatali korlátok betartása",
    "et": "IKÜM art 6 lg 1 p a, b või f; arvesta art 22 automatiseeritud otsuste piiranguid"
   },
   "risks": [
    "r_profiling",
    "r_accuracy",
    "r_transparency",
    "r_rights",
    "r_purpose",
    "r_excess",
    "r_reident",
    "r_processor"
   ]
  },
  "health": {
   "title": {
    "de": "Gesundheitsdaten (betriebliches Eingliederungsmanagement, Betriebsarzt)",
    "en": "Health data (workplace reintegration management, occupational physician)",
    "fr": "Données de santé (gestion de la réintégration, médecin du travail)",
    "nl": "Gezondheidsgegevens (re-integratiebegeleiding, bedrijfsarts)",
    "hu": "Egészségügyi adatok (munkahelyi visszailleszkedés, üzemorvos)",
    "et": "Terviseandmed (töölenaasmise haldus, töötervishoiuarst)"
   },
   "purpose": {
    "de": "Umgang mit Gesundheitsdaten von Beschäftigten, etwa Wiedereingliederung nach Krankheit und arbeitsmedizinische Vorsorge",
    "en": "Handling of employees’ health data, for example return to work after illness and occupational health surveillance",
    "fr": "Traitement des données de santé des salariés, par exemple reprise du travail après maladie et suivi de santé au travail",
    "nl": "Omgang met gezondheidsgegevens van medewerkers, bijvoorbeeld terugkeer na ziekte en arbeidsgezondheidskundig onderzoek",
    "hu": "A munkavállalók egészségügyi adatainak kezelése, például betegség utáni visszatérés és munkaegészségügyi gondozás",
    "et": "Töötajate terviseandmete käsitlemine, näiteks haigusjärgne tööleasumine ja töötervishoiu järelevalve"
   },
   "subjects": {
    "de": "Beschäftigte",
    "en": "Employees",
    "fr": "Salariés",
    "nl": "Medewerkers",
    "hu": "Munkavállalók",
    "et": "Töötajad"
   },
   "data": {
    "de": "Besondere Kategorien nach Art. 9: Gesundheitsdaten, Arbeitsunfähigkeit, Untersuchungsergebnisse (nur das Erforderliche)",
    "en": "Special categories under Art. 9: health data, incapacity for work, examination results (only what is necessary)",
    "fr": "Catégories particulières selon l’art. 9 : données de santé, incapacité de travail, résultats d’examens (uniquement le nécessaire)",
    "nl": "Bijzondere categorieën volgens art. 9: gezondheidsgegevens, arbeidsongeschiktheid, onderzoeksresultaten (alleen het noodzakelijke)",
    "hu": "A 9. cikk szerinti különleges kategóriák: egészségügyi adatok, munkaképtelenség, vizsgálati eredmények (csak a szükséges)",
    "et": "Art 9 eriliigid: terviseandmed, töövõimetus, uuringutulemused (ainult vajalik)"
   },
   "legal": {
    "de": "Art. 9 Abs. 2 lit. b und h DSGVO in Verbindung mit nationalem Recht; zusätzlich Art. 6; strenge Zweckbindung",
    "en": "Art. 9(2)(b) and (h) GDPR in conjunction with national law; additionally Art. 6; strict purpose limitation",
    "fr": "Art. 9, par. 2, points b) et h) RGPD en lien avec le droit national ; en outre art. 6 ; limitation stricte de la finalité",
    "nl": "Art. 9, lid 2, onder b en h AVG in samenhang met nationaal recht; daarnaast art. 6; strikte doelbinding",
    "hu": "GDPR 9. cikk (2) bekezdés b) és h) pont a nemzeti joggal összefüggésben; emellett a 6. cikk; szigorú célhoz kötöttség",
    "et": "IKÜM art 9 lg 2 p b ja h koostoimes riigisisese õigusega; lisaks art 6; range eesmärgi piiritlus"
   },
   "risks": [
    "r_sensitive",
    "r_access",
    "r_confid",
    "r_excess",
    "r_purpose",
    "r_rights",
    "r_insider",
    "r_avail"
   ]
  },
  "biometric": {
   "title": {
    "de": "Biometrische Zugangskontrolle und Zeiterfassung",
    "en": "Biometric access control and time recording",
    "fr": "Contrôle d’accès biométrique et enregistrement du temps",
    "nl": "Biometrische toegangscontrole en tijdregistratie",
    "hu": "Biometrikus beléptetés és munkaidő-nyilvántartás",
    "et": "Biomeetriline juurdepääsukontroll ja tööaja arvestus"
   },
   "purpose": {
    "de": "Zutritt zu Räumen oder Systemen bzw. Zeiterfassung mit Fingerabdruck, Gesicht oder anderen biometrischen Merkmalen",
    "en": "Access to rooms or systems or time recording using fingerprint, face or other biometric features",
    "fr": "Accès à des locaux ou systèmes ou enregistrement du temps par empreinte digitale, visage ou autres caractéristiques biométriques",
    "nl": "Toegang tot ruimten of systemen of tijdregistratie met vingerafdruk, gezicht of andere biometrische kenmerken",
    "hu": "Helyiségekbe vagy rendszerekbe való belépés, illetve munkaidő-nyilvántartás ujjlenyomattal, arccal vagy más biometrikus jellemzővel",
    "et": "Juurdepääs ruumidele või süsteemidele või tööaja arvestus sõrmejälje, näo või muu biomeetrilise tunnuse abil"
   },
   "subjects": {
    "de": "Beschäftigte, Besucher, Auftragnehmer",
    "en": "Employees, visitors, contractors",
    "fr": "Salariés, visiteurs, prestataires",
    "nl": "Medewerkers, bezoekers, contractanten",
    "hu": "Munkavállalók, látogatók, vállalkozók",
    "et": "Töötajad, külastajad, töövõtjad"
   },
   "data": {
    "de": "Biometrische Vorlagen (Art. 9), Zeitpunkt und Ort der Nutzung",
    "en": "Biometric templates (Art. 9), time and place of use",
    "fr": "Gabarits biométriques (art. 9), date et lieu d’utilisation",
    "nl": "Biometrische sjablonen (art. 9), tijdstip en plaats van gebruik",
    "hu": "Biometrikus sablonok (9. cikk), a használat ideje és helye",
    "et": "Biomeetrilised mallid (art 9), kasutamise aeg ja koht"
   },
   "legal": {
    "de": "Art. 9 Abs. 2 DSGVO (ausdrückliche Einwilligung oder nationale Vorschriften); die Erforderlichkeit gegenüber Alternativen ohne Biometrie nachweisen",
    "en": "Art. 9(2) GDPR (explicit consent or national provisions); demonstrate necessity compared with alternatives without biometrics",
    "fr": "Art. 9, par. 2 RGPD (consentement explicite ou dispositions nationales) ; démontrer la nécessité par rapport aux alternatives sans biométrie",
    "nl": "Art. 9, lid 2 AVG (uitdrukkelijke toestemming of nationale bepalingen); noodzaak aantonen ten opzichte van alternatieven zonder biometrie",
    "hu": "GDPR 9. cikk (2) bekezdés (kifejezett hozzájárulás vagy nemzeti rendelkezések); igazolni kell a szükségességet a biometria nélküli alternatívákhoz képest",
    "et": "IKÜM art 9 lg 2 (selgesõnaline nõusolek või riigisisesed sätted); tõesta vajalikkus võrreldes alternatiividega ilma biomeetriata"
   },
   "risks": [
    "r_biometric_irrev",
    "r_sensitive",
    "r_access",
    "r_purpose",
    "r_accuracy",
    "r_transparency",
    "r_rights",
    "r_excess"
   ]
  },
  "whistleblowing": {
   "title": {
    "de": "Hinweisgebersystem (Meldestelle)",
    "en": "Whistleblowing system (reporting channel)",
    "fr": "Dispositif de lancement d’alerte (canal de signalement)",
    "nl": "Klokkenluidersysteem (meldkanaal)",
    "hu": "Bejelentési rendszer (visszaélés-bejelentési csatorna)",
    "et": "Rikkumisest teavitamise süsteem (teavituskanal)"
   },
   "purpose": {
    "de": "Entgegennahme, Prüfung und Bearbeitung von Hinweisen auf Verstöße über eine interne oder externe Meldestelle",
    "en": "Receiving, reviewing and handling reports of violations through an internal or external reporting channel",
    "fr": "Réception, examen et traitement des signalements de violations via un canal interne ou externe",
    "nl": "Ontvangst, beoordeling en afhandeling van meldingen van misstanden via een intern of extern meldkanaal",
    "hu": "Jogsértésekre vonatkozó bejelentések fogadása, vizsgálata és kezelése belső vagy külső csatornán keresztül",
    "et": "Rikkumisteadete vastuvõtmine, läbivaatamine ja menetlemine sisemise või välise teavituskanali kaudu"
   },
   "subjects": {
    "de": "Hinweisgebende, gemeldete Personen, Zeugen",
    "en": "Whistleblowers, reported persons, witnesses",
    "fr": "Lanceurs d’alerte, personnes visées, témoins",
    "nl": "Melders, gemelde personen, getuigen",
    "hu": "Bejelentők, érintett személyek, tanúk",
    "et": "Rikkumisest teavitajad, teatatud isikud, tunnistajad"
   },
   "data": {
    "de": "Inhalt der Meldung, Identitätsdaten (soweit angegeben), Ermittlungsergebnisse, gegebenenfalls Daten über Straftaten",
    "en": "Content of the report, identity data (where provided), investigation results, possibly data on offences",
    "fr": "Contenu du signalement, données d’identité (si fournies), résultats d’enquête, éventuellement données relatives à des infractions",
    "nl": "Inhoud van de melding, identiteitsgegevens (indien verstrekt), onderzoeksresultaten, eventueel gegevens over strafbare feiten",
    "hu": "A bejelentés tartalma, személyazonosító adatok (ha megadták), a vizsgálat eredményei, adott esetben bűncselekményekkel kapcsolatos adatok",
    "et": "Teate sisu, isikuandmed (kui esitatud), uurimistulemused, võimalikud andmed õigusrikkumiste kohta"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Pflicht zur Einrichtung einer Meldestelle nach nationalem Hinweisgeberschutzrecht, EU-Richtlinie 2019/1937)",
    "en": "Art. 6(1)(c) GDPR (legal obligation to set up a reporting channel under national whistleblower protection law, EU Directive 2019/1937)",
    "fr": "Art. 6, par. 1, point c) RGPD (obligation légale de mettre en place un canal de signalement selon le droit national de protection des lanceurs d’alerte, directive (UE) 2019/1937)",
    "nl": "Art. 6, lid 1, onder c AVG (wettelijke verplichting een meldkanaal in te richten volgens nationaal recht ter bescherming van klokkenluiders, EU-richtlijn 2019/1937)",
    "hu": "GDPR 6. cikk (1) bekezdés c) pont (jogszabályi kötelezettség bejelentési csatorna létrehozására a nemzeti bejelentővédelmi jog szerint, az (EU) 2019/1937 irányelv)",
    "et": "IKÜM art 6 lg 1 p c (õiguslik kohustus luua teavituskanal riigisisese rikkumisest teavitajate kaitse seaduse alusel, ELi direktiiv 2019/1937)"
   },
   "risks": [
    "r_retaliation",
    "r_confid",
    "r_access",
    "r_insider",
    "r_transparency",
    "r_rights",
    "r_excess"
   ]
  },
  "recruiting": {
   "title": {
    "de": "Bewerbermanagement (optional mit KI-Vorauswahl)",
    "en": "Applicant management (optionally with AI pre-selection)",
    "fr": "Gestion des candidatures (éventuellement avec présélection par IA)",
    "nl": "Sollicitantenbeheer (optioneel met AI-voorselectie)",
    "hu": "Pályázatkezelés (opcionálisan AI-alapú előválogatással)",
    "et": "Kandidaatide haldus (valikuliselt TI-eelvalikuga)"
   },
   "purpose": {
    "de": "Entgegennahme, Auswahl und Verwaltung von Bewerbungen, gegebenenfalls mit automatisierter Vorauswahl",
    "en": "Receiving, selecting and managing applications, possibly with automated pre-selection",
    "fr": "Réception, sélection et gestion des candidatures, éventuellement avec présélection automatisée",
    "nl": "Ontvangst, selectie en beheer van sollicitaties, eventueel met geautomatiseerde voorselectie",
    "hu": "Pályázatok fogadása, kiválasztása és kezelése, adott esetben automatizált előválogatással",
    "et": "Kandideerimisavalduste vastuvõtmine, valik ja haldus, võimalik automatiseeritud eelvalik"
   },
   "subjects": {
    "de": "Bewerber, Talentpool-Teilnehmer",
    "en": "Applicants, talent pool participants",
    "fr": "Candidats, participants au vivier de talents",
    "nl": "Sollicitanten, deelnemers aan de talentenpool",
    "hu": "Pályázók, tehetségbázis-résztvevők",
    "et": "Kandidaadid, talentide andmepanga osalejad"
   },
   "data": {
    "de": "Bewerbungsunterlagen, Qualifikationen, Gesprächsnotizen, gegebenenfalls Bewertungen und Scores",
    "en": "Application documents, qualifications, interview notes, possibly ratings and scores",
    "fr": "Dossiers de candidature, qualifications, notes d’entretien, éventuellement évaluations et scores",
    "nl": "Sollicitatiestukken, kwalificaties, gespreksnotities, eventueel beoordelingen en scores",
    "hu": "Pályázati anyagok, képesítések, interjújegyzetek, adott esetben értékelések és pontszámok",
    "et": "Kandideerimisdokumendid, kvalifikatsioonid, intervjuumärkmed, võimalikud hinnangud ja hinded"
   },
   "legal": {
    "de": "Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) sowie nationales Recht; Talentpool nur mit Einwilligung (lit. a); automatisierte Entscheidungen nach Art. 22 beachten; KI im Bewerbungsverfahren kann nach der KI-Verordnung hochriskant sein",
    "en": "Art. 6(1)(b) GDPR (pre-contractual measures) and national law; talent pool only with consent ((a)); observe automated decisions under Art. 22; AI in recruitment can be high-risk under the EU AI Act",
    "fr": "Art. 6, par. 1, point b) RGPD (mesures précontractuelles) et droit national ; vivier de talents uniquement avec consentement (point a)) ; respecter les décisions automatisées selon l’art. 22 ; l’IA dans le recrutement peut être à haut risque selon le règlement sur l’IA",
    "nl": "Art. 6, lid 1, onder b AVG (precontractuele maatregelen) en nationaal recht; talentenpool alleen met toestemming (onder a); geautomatiseerde besluitvorming volgens art. 22 naleven; AI bij werving kan volgens de AI-verordening hoog risico zijn",
    "hu": "GDPR 6. cikk (1) bekezdés b) pont (szerződés előtti intézkedések) és a nemzeti jog; tehetségbázis csak hozzájárulással (a) pont); a 22. cikk szerinti automatizált döntéshozatal figyelembevétele; a toborzásban használt AI az EU AI Act szerint magas kockázatú lehet",
    "et": "IKÜM art 6 lg 1 p b (lepingueelsed meetmed) ja riigisisene õigus; talentide andmepank ainult nõusolekul (p a); arvesta art 22 automatiseeritud otsuseid; TI värbamisel võib ELi tehisintellekti määruse alusel olla kõrge riskiga"
   },
   "risks": [
    "r_profiling",
    "r_excess",
    "r_accuracy",
    "r_access",
    "r_transparency",
    "r_rights",
    "r_sensitive",
    "r_transfer"
   ]
  }
 },
 "labels": {
  "head": {
   "de": "Beschreibung der Verarbeitung (bitte ergänzen):",
   "en": "Description of the processing (please complete):",
   "fr": "Description du traitement (à compléter) :",
   "nl": "Beschrijving van de verwerking (aanvullen):",
   "hu": "Az adatkezelés leírása (kérjük, egészítse ki):",
   "et": "Töötlemise kirjeldus (palun täida):"
  },
  "purpose": {
   "de": "Zweck",
   "en": "Purpose",
   "fr": "Finalité",
   "nl": "Doel",
   "hu": "Cél",
   "et": "Eesmärk"
  },
  "subjects": {
   "de": "Betroffene",
   "en": "Data subjects",
   "fr": "Personnes concernées",
   "nl": "Betrokkenen",
   "hu": "Érintettek",
   "et": "Andmesubjektid"
  },
  "data": {
   "de": "Datenarten",
   "en": "Data categories",
   "fr": "Catégories de données",
   "nl": "Gegevenscategorieën",
   "hu": "Adatkategóriák",
   "et": "Andmekategooriad"
  },
  "controller": {
   "de": "Verantwortlicher",
   "en": "Controller",
   "fr": "Responsable du traitement",
   "nl": "Verwerkingsverantwoordelijke",
   "hu": "Adatkezelő",
   "et": "Vastutav töötleja"
  },
  "recipients": {
   "de": "Empfänger und Auftragsverarbeiter: (eintragen)",
   "en": "Recipients and processors: (enter)",
   "fr": "Destinataires et sous-traitants : (à renseigner)",
   "nl": "Ontvangers en verwerkers: (invullen)",
   "hu": "Címzettek és adatfeldolgozók: (kitöltendő)",
   "et": "Saajad ja volitatud töötlejad: (sisesta)"
  },
  "storage": {
   "de": "Speicherort und Drittlandbezug: (eintragen)",
   "en": "Storage location and third-country link: (enter)",
   "fr": "Lieu de stockage et lien avec des pays tiers : (à renseigner)",
   "nl": "Opslaglocatie en verband met derde landen: (invullen)",
   "hu": "Tárolási hely és harmadik országi kapcsolat: (kitöltendő)",
   "et": "Salvestuskoht ja seos kolmanda riigiga: (sisesta)"
  },
  "retention": {
   "de": "Aufbewahrungsfristen: (eintragen)",
   "en": "Retention periods: (enter)",
   "fr": "Durées de conservation : (à renseigner)",
   "nl": "Bewaartermijnen: (invullen)",
   "hu": "Megőrzési idők: (kitöltendő)",
   "et": "Säilitustähtajad: (sisesta)"
  },
  "necessity": {
   "de": "Notwendigkeit: Warum ist die Verarbeitung für den Zweck erforderlich? Gibt es mildere, gleich wirksame Mittel? (eintragen)",
   "en": "Necessity: why is the processing needed for the purpose? Are there milder, equally effective means? (enter)",
   "fr": "Nécessité : pourquoi le traitement est-il nécessaire à la finalité ? Existe-t-il des moyens plus doux, tout aussi efficaces ? (à renseigner)",
   "nl": "Noodzaak: waarom is de verwerking voor het doel nodig? Zijn er mildere, even doeltreffende middelen? (invullen)",
   "hu": "Szükségesség: miért szükséges az adatkezelés a cél eléréséhez? Vannak-e enyhébb, ugyanilyen hatékony eszközök? (kitöltendő)",
   "et": "Vajalikkus: miks on töötlemine eesmärgi jaoks vajalik? Kas on leebemaid, sama tõhusaid vahendeid? (sisesta)"
  },
  "proportion": {
   "de": "Verhältnismäßigkeit: Datenminimierung, Speicherbegrenzung, Information und Rechte der Betroffenen. (eintragen)",
   "en": "Proportionality: data minimisation, storage limitation, information and rights of data subjects. (enter)",
   "fr": "Proportionnalité : minimisation des données, limitation de la conservation, information et droits des personnes concernées. (à renseigner)",
   "nl": "Evenredigheid: gegevensminimalisatie, opslagbeperking, informatie en rechten van betrokkenen. (invullen)",
   "hu": "Arányosság: adatminimalizálás, korlátozott tárolhatóság, tájékoztatás és az érintettek jogai. (kitöltendő)",
   "et": "Proportsionaalsus: andmete minimeerimine, säilitamise piiramine, andmesubjektide teavitamine ja õigused. (sisesta)"
  },
  "legal": {
   "de": "Rechtsgrundlage",
   "en": "Legal basis",
   "fr": "Base juridique",
   "nl": "Rechtsgrond",
   "hu": "Jogalap",
   "et": "Õiguslik alus"
  }
 },
 "art353": {
  "a": {
   "de": "Systematische und umfassende Bewertung persönlicher Aspekte natürlicher Personen auf Grundlage automatisierter Verarbeitung einschließlich Profiling, mit Entscheidungen, die rechtliche Wirkung haben oder die Personen erheblich beeinträchtigen",
   "en": "Systematic and extensive evaluation of personal aspects of natural persons based on automated processing, including profiling, with decisions that produce legal effects or similarly significantly affect them",
   "fr": "Évaluation systématique et approfondie d’aspects personnels de personnes physiques fondée sur un traitement automatisé, y compris le profilage, avec des décisions produisant des effets juridiques ou les affectant de manière significative",
   "nl": "Systematische en uitgebreide beoordeling van persoonlijke aspecten van natuurlijke personen op basis van geautomatiseerde verwerking, waaronder profilering, met beslissingen die rechtsgevolgen hebben of hen anderszins aanmerkelijk treffen",
   "hu": "Természetes személyek személyes jellemzőinek szisztematikus és kiterjedt értékelése automatizált adatkezelés alapján, a profilalkotást is beleértve, jogi hatással járó vagy őket hasonlóan jelentősen érintő döntésekkel",
   "et": "Füüsiliste isikute isiklike aspektide süstemaatiline ja ulatuslik hindamine automatiseeritud töötlemise alusel, sh profileerimine, otsustega, millel on õiguslik mõju või mis mõjutavad neid sarnaselt märkimisväärselt"
  },
  "b": {
   "de": "Umfangreiche Verarbeitung besonderer Kategorien personenbezogener Daten (Art. 9) oder von Daten über strafrechtliche Verurteilungen und Straftaten (Art. 10)",
   "en": "Large-scale processing of special categories of personal data (Art. 9) or of data relating to criminal convictions and offences (Art. 10)",
   "fr": "Traitement à grande échelle de catégories particulières de données (art. 9) ou de données relatives aux condamnations pénales et aux infractions (art. 10)",
   "nl": "Grootschalige verwerking van bijzondere categorieën persoonsgegevens (art. 9) of van gegevens over strafrechtelijke veroordelingen en strafbare feiten (art. 10)",
   "hu": "Különleges személyes adatok (9. cikk) vagy büntetőjogi felelősség megállapítására és bűncselekményekre vonatkozó adatok (10. cikk) nagy számú kezelése",
   "et": "Isikuandmete eriliikide (art 9) või süüdimõistvate kohtuotsuste ja süütegudega seotud andmete (art 10) ulatuslik töötlemine"
  },
  "c": {
   "de": "Systematische umfangreiche Überwachung öffentlich zugänglicher Bereiche",
   "en": "Systematic monitoring of a publicly accessible area on a large scale",
   "fr": "Surveillance systématique à grande échelle d’une zone accessible au public",
   "nl": "Stelselmatig grootschalig monitoren van openbaar toegankelijke ruimten",
   "hu": "Nyilvánosan hozzáférhető helyek szisztematikus, nagymértékű megfigyelése",
   "et": "Avalikult juurdepääsetava ala ulatuslik süstemaatiline jälgimine"
  }
 },
 "criteria": {
  "evaluation": {
   "de": "Bewertung oder Scoring (einschließlich Profiling und Vorhersagen)",
   "en": "Evaluation or scoring (including profiling and prediction)",
   "fr": "Évaluation ou notation (y compris profilage et prédiction)",
   "nl": "Evaluatie of scoring (inclusief profilering en voorspelling)",
   "hu": "Értékelés vagy pontozás (a profilalkotást és előrejelzést is beleértve)",
   "et": "Hindamine või skoorimine (sh profileerimine ja prognoosimine)"
  },
  "automated": {
   "de": "Automatisierte Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung",
   "en": "Automated decisions with legal or similarly significant effect",
   "fr": "Décisions automatisées ayant un effet juridique ou similaire",
   "nl": "Geautomatiseerde beslissingen met rechtsgevolg of soortgelijk aanzienlijk effect",
   "hu": "Jogi vagy hasonlóan jelentős hatású automatizált döntések",
   "et": "Automatiseeritud otsused õigusliku või sarnaselt märkimisväärse mõjuga"
  },
  "monitoring": {
   "de": "Systematische Überwachung von Personen",
   "en": "Systematic monitoring of people",
   "fr": "Surveillance systématique de personnes",
   "nl": "Stelselmatige bewaking van personen",
   "hu": "Személyek szisztematikus megfigyelése",
   "et": "Isikute süstemaatiline jälgimine"
  },
  "sensitive": {
   "de": "Sensible oder höchstpersönliche Daten (z. B. Gesundheit, Biometrie, Finanzen, Standort)",
   "en": "Sensitive or highly personal data (e.g. health, biometrics, finances, location)",
   "fr": "Données sensibles ou à caractère hautement personnel (p. ex. santé, biométrie, finances, localisation)",
   "nl": "Gevoelige of zeer persoonlijke gegevens (bijv. gezondheid, biometrie, financiën, locatie)",
   "hu": "Érzékeny vagy rendkívül személyes adatok (pl. egészség, biometria, pénzügyek, tartózkodási hely)",
   "et": "Tundlikud või väga isiklikud andmed (nt tervis, biomeetria, rahandus, asukoht)"
  },
  "large_scale": {
   "de": "Verarbeitung in großem Umfang (viele Personen, große Datenmenge, große Fläche oder lange Dauer)",
   "en": "Large-scale processing (many people, large volume of data, wide area or long duration)",
   "fr": "Traitement à grande échelle (nombreuses personnes, gros volume de données, vaste zone ou longue durée)",
   "nl": "Grootschalige verwerking (veel personen, grote hoeveelheid gegevens, groot gebied of lange duur)",
   "hu": "Nagy léptékű adatkezelés (sok érintett, nagy adatmennyiség, nagy terület vagy hosszú időtartam)",
   "et": "Ulatuslik töötlemine (palju inimesi, suur andmemaht, lai ala või pikk kestus)"
  },
  "matching": {
   "de": "Abgleich oder Zusammenführung von Datensätzen aus verschiedenen Quellen",
   "en": "Matching or combining of data sets from different sources",
   "fr": "Mise en correspondance ou combinaison de jeux de données de sources différentes",
   "nl": "Koppelen of combineren van gegevensbestanden uit verschillende bronnen",
   "hu": "Különböző forrásból származó adatállományok összevetése vagy egyesítése",
   "et": "Eri allikatest pärinevate andmekogumite võrdlemine või kombineerimine"
  },
  "vulnerable": {
   "de": "Daten schutzbedürftiger Personen (z. B. Beschäftigte, Kinder, Patienten)",
   "en": "Data of vulnerable persons (e.g. employees, children, patients)",
   "fr": "Données de personnes vulnérables (p. ex. salariés, enfants, patients)",
   "nl": "Gegevens van kwetsbare personen (bijv. werknemers, kinderen, patiënten)",
   "hu": "Kiszolgáltatott személyek adatai (pl. munkavállalók, gyermekek, betegek)",
   "et": "Kaitsetute isikute andmed (nt töötajad, lapsed, patsiendid)"
  },
  "innovative": {
   "de": "Einsatz neuer oder innovativer Technik (z. B. KI, Biometrie, Internet der Dinge)",
   "en": "Use of new or innovative technology (e.g. AI, biometrics, internet of things)",
   "fr": "Utilisation de technologies nouvelles ou innovantes (p. ex. IA, biométrie, internet des objets)",
   "nl": "Gebruik van nieuwe of innovatieve technologie (bijv. AI, biometrie, internet der dingen)",
   "hu": "Új vagy innovatív technológia alkalmazása (pl. AI, biometria, dolgok internete)",
   "et": "Uue või innovaatilise tehnoloogia kasutamine (nt TI, biomeetria, asjade internet)"
  },
  "blocks_rights": {
   "de": "Die Verarbeitung hindert Personen an der Ausübung von Rechten oder der Nutzung einer Leistung oder eines Vertrags",
   "en": "The processing prevents people from exercising a right or using a service or contract",
   "fr": "Le traitement empêche des personnes d’exercer un droit ou de bénéficier d’un service ou d’un contrat",
   "nl": "De verwerking belet personen een recht uit te oefenen of een dienst of overeenkomst te gebruiken",
   "hu": "Az adatkezelés megakadályozza, hogy az érintettek jogot gyakoroljanak, illetve szolgáltatást vagy szerződést vegyenek igénybe",
   "et": "Töötlemine takistab inimesi õiguse kasutamisel või teenuse või lepingu kasutamisel"
  }
 },
 "result": {
  "required": {
   "de": "Eine DSFA ist erforderlich (Art. 35 Abs. 3 DSGVO).",
   "en": "A DPIA is required (Art. 35(3) GDPR).",
   "fr": "Une AIPD est requise (art. 35, par. 3 RGPD).",
   "nl": "Een DPIA is verplicht (art. 35, lid 3 AVG).",
   "hu": "DPIA szükséges (GDPR 35. cikk (3) bekezdés).",
   "et": "Mõjuhinnang on nõutav (IKÜM art 35 lg 3)."
  },
  "likely": {
   "de": "Eine DSFA ist wahrscheinlich erforderlich (zwei oder mehr Kriterien der Leitlinie WP 248 treffen zu). Sie muss begründen, wenn Sie darauf verzichten.",
   "en": "A DPIA is probably required (two or more criteria of guideline WP 248 apply). If you do without one, you must document the reasons.",
   "fr": "Une AIPD est probablement requise (deux critères ou plus des lignes directrices WP 248 s’appliquent). Si vous y renoncez, vous devez en documenter les motifs.",
   "nl": "Een DPIA is waarschijnlijk verplicht (twee of meer criteria van richtsnoer WP 248 zijn van toepassing). Wie afziet, moet de redenen vastleggen.",
   "hu": "Valószínűleg DPIA szükséges (a WP 248 iránymutatás két vagy több kritériuma teljesül). Ha eltekint tőle, az indokokat dokumentálnia kell.",
   "et": "Mõjuhinnang on tõenäoliselt nõutav (kohaldub kaks või enam suuniste WP 248 kriteeriumi). Kui sellest loobute, peate põhjused dokumenteerima."
  },
  "optional": {
   "de": "Eine DSFA ist nicht zwingend. Dokumentieren Sie das Ergebnis dieser Prüfung und prüfen Sie die Listen der Aufsichtsbehörde Ihres Landes.",
   "en": "A DPIA is not mandatory. Document the result of this check and check the lists of your country’s supervisory authority.",
   "fr": "Une AIPD n’est pas obligatoire. Documentez le résultat de cet examen et consultez les listes de l’autorité de contrôle de votre pays.",
   "nl": "Een DPIA is niet verplicht. Leg het resultaat van deze toets vast en raadpleeg de lijsten van de toezichthouder in uw land.",
   "hu": "A DPIA nem kötelező. Dokumentálja a vizsgálat eredményét, és ellenőrizze az országa felügyeleti hatóságának listáit.",
   "et": "Mõjuhinnang ei ole kohustuslik. Dokumenteerige selle kontrolli tulemus ja kontrollige oma riigi järelevalveasutuse loendeid."
  }
 }
}

// Sprachen mit Inhalt; alles andere fällt auf Englisch zurück
const LANGUAGES = reg.withData(DATA.labels.purpose)
const pickLang = l => (LANGUAGES.includes(l) ? l : 'en')

// Liste der Vorlagen → [{ id, title }]
function list(lang) {
  const l = pickLang(lang)
  return Object.entries(DATA.templates).map(([id, t]) => ({ id, title: t.title[l] }))
}

// Befülltes Gerüst für das DSFA-Formular. `org`: Organisationsdaten (nur für {{COMPANY_NAME}}).
function build(id, lang, org) {
  const t = DATA.templates[id]
  if (!t) return null
  const l = pickLang(lang)
  const L = k => DATA.labels[k][l]
  const description = [
    L('head'),
    `- ${L('purpose')}: ${t.purpose[l]}`,
    `- ${L('subjects')}: ${t.subjects[l]}`,
    `- ${L('data')}: ${t.data[l]}`,
    `- ${L('controller')}: {{COMPANY_NAME}}`,
    `- ${L('recipients')}`,
    `- ${L('storage')}`,
    `- ${L('retention')}`,
  ].join('\n')
  const necessity = [`${L('legal')}: ${t.legal[l]}`, L('necessity'), L('proportion')].join('\n')
  const risks = t.risks.map(rid => {
    const r = DATA.risks[rid]
    return { id: `${id}_${rid}`, description: r.text[l], likelihood: r.likelihood, impact: r.impact, score: r.likelihood * r.impact, mitigations: r.measures.map(m => DATA.measures[m][l]) }
  })
  const filled = safeDraft.fillPlaceholders(description, org || {})
  return { id, title: t.title[l], processingDescription: filled.text, necessityAssessment: necessity, risks, existingControls: '', residualRisk: 'medium', unresolved: filled.unresolved }
}

// Kriterien der Vorabprüfung → { art353: [{ id, text }], criteria: [{ id, text }] }
function precheckCriteria(lang) {
  const l = pickLang(lang)
  return {
    art353: Object.entries(DATA.art353).map(([id, t]) => ({ id, text: t[l] })),
    criteria: Object.entries(DATA.criteria).map(([id, t]) => ({ id, text: t[l] })),
  }
}

// Ergebnis der Vorabprüfung: Fall nach Art. 35 Abs. 3 → „required“; zwei oder mehr Kriterien (WP 248) → „likely“; sonst „optional“
function evaluatePrecheck({ art353, criteria } = {}, lang) {
  const a = (Array.isArray(art353) ? art353 : []).filter(x => x in DATA.art353)
  const c = (Array.isArray(criteria) ? criteria : []).filter(x => x in DATA.criteria)
  const result = a.length ? 'required' : (c.length >= 2 ? 'likely' : 'optional')
  return { result, text: DATA.result[result][pickLang(lang)], art353: a, criteria: c }
}

// Freigaberegel: ohne Stellungnahme des DSB, ohne Entscheidung oder bei hohem Restrisiko ohne Begründung/Konsultation der Aufsichtsbehörde keine Freigabe
function validateApproval(item) {
  const it = item || {}
  if (!it.dpoConsulted || !String(it.dpoOpinion || '').trim()) return { ok: false, code: 'dpo_opinion_missing' }
  if (!it.decision) return { ok: false, code: 'decision_missing' }
  if (['high', 'critical'].includes(it.residualRisk) && !it.saConsultationRequired && !String(it.decisionJustification || '').trim()) return { ok: false, code: 'high_residual_unjustified' }
  return { ok: true }
}

module.exports = { LANGUAGES, DATA, list, build, precheckCriteria, evaluatePrecheck, validateApproval }
