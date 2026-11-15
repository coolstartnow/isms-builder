// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Sichere KI-Entwürfe: reine Funktionen ohne Dateizugriff und ohne Netzwerk. Server (routes/ai.js) und Mobile App nutzen dieselbe Datei.
//
// Was an eine KI geht, wird ausschließlich hier gebaut und besteht nur aus:
//   - einem Dokument aus der festen Titelliste (Kennung → Typ und Titel in fünf Sprachen),
//   - der Sprache (aus der festen Liste),
//   - optional einem kurzen Hinweis (nur erlaubte Zeichen, höchstens 200, ohne personenbezogene/technische Kennungen).
// Firmen-, Personen- und Systemdaten gehen nie hinaus: Das Modell schreibt mit Platzhaltern ({{COMPANY_NAME}} …), die erst
// danach lokal aus den Organisationsdaten ersetzt werden.
//
// Grenze des Filters: Er erkennt strukturierte Angaben (E-Mail, Telefon, IBAN, IP, URL, Kennungen, Schlüssel). Namen von
// Personen oder Firmen kann er nicht zuverlässig erkennen; deshalb gibt es kein freies Titelfeld und der Hinweis ist kurz.

const reg = require('../languages')
const MAX_HINT = 200

// type → Gliederungsvorgabe (Englisch; das Modell übersetzt die Überschriften in die Zielsprache)
const STRUCTURE = {
  'Policy':      'purpose, scope, principles, responsibilities',
  'Procedure':   'purpose, responsibilities, steps/flow, evidence',
  'Risk Policy': 'purpose, risk approach, assessment criteria, treatment strategies, responsibilities',
  'SoA':         'purpose, scope, relation to controls/frameworks, maintenance process',
  'Incident':    'purpose, reporting channels, immediate actions, escalation, follow-up/lessons learned',
  'Release':     'purpose, release criteria, roles, change/rollback process',
  'BCM Plan':     'purpose and scope, activation criteria, roles, immediate actions, recovery steps, communication, return to normal operation, maintenance and exercises',
  'BCM Exercise': 'scenario, objectives, injects (course of events), evaluation questions',
}

// Texte je Sprache (Reihenfolge wie im Sprachregister); `et` darf fehlen und fällt dann auf Englisch zurück
const t = (de, en, fr, nl, hu, et) => ({ de, en, fr, nl, hu, ...(et === undefined ? {} : { et }) })
let LANGUAGES = []   // nach CATALOG gesetzt: Sprachen, für die der Katalog Titel hat
const CATALOG = [
  { id: 'infosec', type: 'Policy', title: t('Informationssicherheitsrichtlinie', 'Information Security Policy', 'Politique de sécurité de l’information', 'Informatiebeveiligingsbeleid', 'Információbiztonsági szabályzat', 'Infoturbepoliitika') },
  { id: 'acceptable_use', type: 'Policy', title: t('Richtlinie zur akzeptablen Nutzung', 'Acceptable Use Policy', 'Politique d’utilisation acceptable', 'Beleid voor aanvaardbaar gebruik', 'Elfogadható használati szabályzat', 'Vastuvõetava kasutuse poliitika') },
  { id: 'access_control', type: 'Policy', title: t('Zugriffssteuerungsrichtlinie', 'Access Control Policy', 'Politique de contrôle d’accès', 'Toegangsbeheerbeleid', 'Hozzáférés-szabályozási szabályzat', 'Juurdepääsukontrolli poliitika') },
  { id: 'password', type: 'Policy', title: t('Passwortrichtlinie', 'Password Policy', 'Politique de mots de passe', 'Wachtwoordbeleid', 'Jelszószabályzat', 'Paroolipoliitika') },
  { id: 'backup', type: 'Policy', title: t('Datensicherungsrichtlinie', 'Backup Policy', 'Politique de sauvegarde', 'Back-upbeleid', 'Mentési szabályzat', 'Varundamise poliitika') },
  { id: 'crypto', type: 'Policy', title: t('Kryptografie-Richtlinie', 'Cryptography Policy', 'Politique de cryptographie', 'Cryptografiebeleid', 'Kriptográfiai szabályzat', 'Krüptograafiapoliitika') },
  { id: 'remote_work', type: 'Policy', title: t('Richtlinie für Remote-Arbeit', 'Remote Work Policy', 'Politique de télétravail', 'Beleid voor werken op afstand', 'Távmunka-szabályzat', 'Kaugtöö poliitika') },
  { id: 'supplier', type: 'Policy', title: t('Lieferantensicherheitsrichtlinie', 'Supplier Security Policy', 'Politique de sécurité des fournisseurs', 'Leveranciersbeveiligingsbeleid', 'Beszállítói biztonsági szabályzat', 'Tarnijate turvapoliitika') },
  { id: 'clear_desk', type: 'Policy', title: t('Richtlinie für den aufgeräumten Arbeitsplatz und Bildschirm', 'Clear Desk and Clear Screen Policy', 'Politique de bureau propre et d’écran vide', 'Clear-desk- en clear-screenbeleid', 'Tiszta asztal és tiszta képernyő szabályzat', 'Puhta laua ja puhta ekraani poliitika') },
  { id: 'mobile_devices', type: 'Policy', title: t('Richtlinie für mobile Geräte', 'Mobile Device Policy', 'Politique des appareils mobiles', 'Beleid voor mobiele apparaten', 'Mobil eszközök szabályzata', 'Mobiilseadmete poliitika') },
  { id: 'classification', type: 'Policy', title: t('Richtlinie zur Informationsklassifizierung', 'Information Classification Policy', 'Politique de classification de l’information', 'Beleid voor informatieclassificatie', 'Információosztályozási szabályzat', 'Teabe klassifitseerimise poliitika') },
  { id: 'ai_use', type: 'Policy', title: t('Richtlinie zur Nutzung von Künstlicher Intelligenz', 'Artificial Intelligence Use Policy', 'Politique d’utilisation de l’intelligence artificielle', 'Beleid voor het gebruik van kunstmatige intelligentie', 'A mesterséges intelligencia használatának szabályzata', 'Tehisintellekti kasutamise poliitika') },
  { id: 'ai_labelling', type: 'Policy', title: t('Richtlinie zur Kennzeichnung KI-generierter Inhalte', 'AI-Generated Content Labelling Policy', 'Politique d’étiquetage des contenus générés par l’IA', 'Beleid voor het labelen van door AI gegenereerde inhoud', 'Az AI által generált tartalom megjelölésének szabályzata', 'TI-ga loodud sisu märgistamise poliitika') },
  { id: 'ai_media', type: 'Policy', title: t('Richtlinie zu KI-generierten Bildern, Audio- und Videoinhalten', 'Policy on AI-Generated Images, Audio and Video', 'Politique sur les images, audio et vidéos générés par l’IA', 'Beleid voor door AI gegenereerde beelden, audio en video', 'Az AI által generált képek, hang- és videótartalmak szabályzata', 'TI-ga loodud piltide, heli ja video poliitika') },
  { id: 'ai_governance', type: 'Policy', title: t('Richtlinie zu KI-Governance und Risikoklassifizierung', 'AI Governance and Risk Classification Policy', 'Politique de gouvernance et de classification des risques de l’IA', 'Beleid voor AI-governance en risicoclassificatie', 'AI-irányítási és kockázati osztályozási szabályzat', 'TI juhtimise ja riskiklassifitseerimise poliitika') },
  { id: 'ai_literacy', type: 'Policy', title: t('Richtlinie zur KI-Kompetenz der Beschäftigten', 'AI Literacy Policy', 'Politique de maîtrise de l’IA par le personnel', 'Beleid voor AI-geletterdheid van medewerkers', 'A munkatársak AI-ismereteinek szabályzata', 'TI-kirjaoskuse poliitika') },
  { id: 'ai_confidential', type: 'Policy', title: t('Richtlinie zum Umgang mit vertraulichen Daten in KI-Diensten', 'Policy on Confidential Data in AI Services', 'Politique sur les données confidentielles dans les services d’IA', 'Beleid voor vertrouwelijke gegevens in AI-diensten', 'A bizalmas adatok kezelésének szabályzata AI-szolgáltatásokban', 'Konfidentsiaalsete andmete poliitika TI-teenustes') },
  { id: 'ai_vendors', type: 'Policy', title: t('Richtlinie zur Beschaffung und Bewertung von KI-Systemen', 'AI System Procurement and Assessment Policy', 'Politique d’acquisition et d’évaluation des systèmes d’IA', 'Beleid voor inkoop en beoordeling van AI-systemen', 'AI-rendszerek beszerzésének és értékelésének szabályzata', 'TI-süsteemide hanke ja hindamise poliitika') },
  { id: 'data_protection', type: 'Policy', title: t('Datenschutzrichtlinie', 'Data Protection Policy', 'Politique de protection des données', 'Gegevensbeschermingsbeleid', 'Adatvédelmi szabályzat', 'Andmekaitsepoliitika') },
  { id: 'retention', type: 'Policy', title: t('Aufbewahrungs- und Löschrichtlinie', 'Retention and Deletion Policy', 'Politique de conservation et de suppression', 'Bewaar- en verwijderbeleid', 'Megőrzési és törlési szabályzat', 'Säilitamise ja kustutamise poliitika') },
  { id: 'physical', type: 'Policy', title: t('Richtlinie zur physischen Sicherheit', 'Physical Security Policy', 'Politique de sécurité physique', 'Beleid voor fysieke beveiliging', 'Fizikai biztonsági szabályzat', 'Füüsilise turvalisuse poliitika') },
  { id: 'byod', type: 'Policy', title: t('BYOD-Richtlinie (private Geräte)', 'Bring Your Own Device (BYOD) Policy', 'Politique BYOD (appareils personnels)', 'BYOD-beleid (eigen apparaten)', 'BYOD-szabályzat (saját eszközök)', 'Oma seadme kasutamise (BYOD) poliitika') },
  { id: 'email_internet', type: 'Policy', title: t('Richtlinie zur E-Mail- und Internetnutzung', 'E-Mail and Internet Use Policy', 'Politique d’utilisation du courrier électronique et d’Internet', 'Beleid voor e-mail- en internetgebruik', 'E-mail- és internethasználati szabályzat', 'E-posti ja interneti kasutamise poliitika') },
  { id: 'social_media', type: 'Policy', title: t('Social-Media-Richtlinie', 'Social Media Policy', 'Politique sur les réseaux sociaux', 'Socialmediabeleid', 'Közösségi média szabályzat', 'Sotsiaalmeedia poliitika') },
  { id: 'cloud', type: 'Policy', title: t('Cloud-Nutzungsrichtlinie', 'Cloud Usage Policy', 'Politique d’utilisation du cloud', 'Cloudgebruiksbeleid', 'Felhőhasználati szabályzat', 'Pilveteenuste kasutamise poliitika') },
  { id: 'network', type: 'Policy', title: t('Netzwerksicherheitsrichtlinie', 'Network Security Policy', 'Politique de sécurité réseau', 'Netwerkbeveiligingsbeleid', 'Hálózatbiztonsági szabályzat', 'Võrguturbe poliitika') },
  { id: 'vuln_policy', type: 'Policy', title: t('Richtlinie zum Schwachstellenmanagement', 'Vulnerability Management Policy', 'Politique de gestion des vulnérabilités', 'Beleid voor kwetsbaarhedenbeheer', 'Sérülékenységkezelési szabályzat', 'Haavatavuste halduse poliitika') },
  { id: 'logging', type: 'Policy', title: t('Richtlinie zu Protokollierung und Überwachung', 'Logging and Monitoring Policy', 'Politique de journalisation et de surveillance', 'Beleid voor logging en monitoring', 'Naplózási és felügyeleti szabályzat', 'Logimise ja jälgimise poliitika') },
  { id: 'secure_dev', type: 'Policy', title: t('Richtlinie zur sicheren Softwareentwicklung', 'Secure Development Policy', 'Politique de développement sécurisé', 'Beleid voor veilige softwareontwikkeling', 'Biztonságos szoftverfejlesztési szabályzat', 'Turvalise arenduse poliitika') },
  { id: 'asset_policy', type: 'Policy', title: t('Richtlinie zum Umgang mit Werten (Asset Management)', 'Asset Management Policy', 'Politique de gestion des actifs', 'Assetmanagementbeleid', 'Eszközkezelési szabályzat', 'Varahalduse poliitika') },
  { id: 'awareness', type: 'Policy', title: t('Richtlinie zu Schulung und Sensibilisierung', 'Security Awareness and Training Policy', 'Politique de sensibilisation et de formation', 'Beleid voor bewustwording en training', 'Biztonságtudatossági és képzési szabályzat', 'Turvateadlikkuse ja koolituse poliitika') },
  { id: 'hr_security', type: 'Policy', title: t('Richtlinie zur Personalsicherheit', 'Human Resources Security Policy', 'Politique de sécurité des ressources humaines', 'Beleid voor personeelsbeveiliging', 'Humánerőforrás-biztonsági szabályzat', 'Personaliturbe poliitika') },
  { id: 'bcm_policy', type: 'Policy', title: t('Richtlinie zum Business Continuity Management', 'Business Continuity Management Policy', 'Politique de gestion de la continuité d’activité', 'Beleid voor bedrijfscontinuïteitsbeheer', 'Üzletmenet-folytonossági szabályzat', 'Talitluspidevuse juhtimise poliitika') },
  { id: 'privileged', type: 'Policy', title: t('Richtlinie für privilegierte Zugänge', 'Privileged Access Policy', 'Politique des accès privilégiés', 'Beleid voor bevoorrechte toegang', 'Kiemelt jogosultságú hozzáférések szabályzata', 'Privilegeeritud juurdepääsu poliitika') },
  { id: 'removable_media', type: 'Policy', title: t('Richtlinie für Wechseldatenträger', 'Removable Media Policy', 'Politique sur les supports amovibles', 'Beleid voor verwijderbare media', 'Cserélhető adathordozók szabályzata', 'Irdkandjate poliitika') },
  { id: 'security_roles', type: 'Policy', title: t('Richtlinie zu Rollen und Verantwortlichkeiten der Informationssicherheit', 'Information Security Roles and Responsibilities Policy', 'Politique des rôles et responsabilités en sécurité de l’information', 'Beleid voor rollen en verantwoordelijkheden bij informatiebeveiliging', 'Az információbiztonsági szerepek és felelősségek szabályzata', 'Infoturbe rollide ja vastutuste poliitika') },
  { id: 'ot_security', type: 'Policy', title: t('Richtlinie zur OT-/ICS-Sicherheit', 'OT/ICS Security Policy', 'Politique de sécurité OT/ICS', 'OT/ICS-beveiligingsbeleid', 'OT/ICS biztonsági szabályzat', 'OT/ICS-turbe poliitika') },
  { id: 'product_security', type: 'Policy', title: t('Richtlinie zur Produktsicherheit (Cyber Resilience Act)', 'Product Security Policy (Cyber Resilience Act)', 'Politique de sécurité des produits (Cyber Resilience Act)', 'Productbeveiligingsbeleid (Cyber Resilience Act)', 'Termékbiztonsági szabályzat (Cyber Resilience Act)', 'Tootturbe poliitika (küberkerksuse määrus)') },
  { id: 'change_mgmt', type: 'Procedure', title: t('Änderungsmanagement-Verfahren', 'Change Management Procedure', 'Procédure de gestion des changements', 'Procedure voor wijzigingsbeheer', 'Változáskezelési eljárás', 'Muudatuste haldamise protseduur') },
  { id: 'jml', type: 'Procedure', title: t('Verfahren für Eintritt, Wechsel und Austritt', 'Joiner, Mover, Leaver Procedure', 'Procédure d’arrivée, de mobilité et de départ', 'Procedure voor in-, door- en uitstroom', 'Belépési, áthelyezési és kilépési eljárás', 'Liitumise, ümberpaigutamise ja lahkumise protseduur') },
  { id: 'patch', type: 'Procedure', title: t('Patch-Management-Verfahren', 'Patch Management Procedure', 'Procédure de gestion des correctifs', 'Procedure voor patchbeheer', 'Javításkezelési eljárás', 'Paigahalduse protseduur') },
  { id: 'access_review', type: 'Procedure', title: t('Verfahren zur Überprüfung von Zugriffsrechten', 'Access Review Procedure', 'Procédure de revue des accès', 'Procedure voor toegangsreview', 'Hozzáférési jogosultságok felülvizsgálati eljárása', 'Juurdepääsu ülevaatuse protseduur') },
  { id: 'restore', type: 'Procedure', title: t('Verfahren zur Wiederherstellung von Daten', 'Data Restore Procedure', 'Procédure de restauration des données', 'Procedure voor gegevensherstel', 'Adat-helyreállítási eljárás', 'Andmete taastamise protseduur') },
  { id: 'vuln_proc', type: 'Procedure', title: t('Schwachstellenmanagement-Verfahren', 'Vulnerability Management Procedure', 'Procédure de gestion des vulnérabilités', 'Procedure voor kwetsbaarhedenbeheer', 'Sérülékenységkezelési eljárás', 'Haavatavuste halduse protseduur') },
  { id: 'cvd', type: 'Procedure', title: t('Verfahren zur koordinierten Schwachstellenmeldung (CVD)', 'Coordinated Vulnerability Disclosure Procedure', 'Procédure de divulgation coordonnée des vulnérabilités', 'Procedure voor gecoördineerde kwetsbaarheidsmelding', 'Koordinált sebezhetőség-közzétételi eljárás', 'Koordineeritud haavatavuste avalikustamise protseduur') },
  { id: 'asset_inventory', type: 'Procedure', title: t('Verfahren zur Inventarisierung von Assets', 'Asset Inventory Procedure', 'Procédure d’inventaire des actifs', 'Procedure voor assetinventarisatie', 'Eszköznyilvántartási eljárás', 'Varade inventuuri protseduur') },
  { id: 'log_review', type: 'Procedure', title: t('Verfahren zur Auswertung von Protokollen', 'Log Review Procedure', 'Procédure d’analyse des journaux', 'Procedure voor logbeoordeling', 'Naplóelemzési eljárás', 'Logide ülevaatuse protseduur') },
  { id: 'dsar', type: 'Procedure', title: t('Verfahren zur Bearbeitung von Betroffenenanfragen', 'Data Subject Request Procedure', 'Procédure de traitement des demandes des personnes concernées', 'Procedure voor verzoeken van betrokkenen', 'Az érintetti kérelmek kezelésének eljárása', 'Andmesubjekti taotluste protseduur') },
  { id: 'internal_audit', type: 'Procedure', title: t('Verfahren für interne Audits', 'Internal Audit Procedure', 'Procédure d’audit interne', 'Procedure voor interne audits', 'Belső auditi eljárás', 'Siseauditi protseduur') },
  { id: 'mgmt_review', type: 'Procedure', title: t('Verfahren für die Managementbewertung', 'Management Review Procedure', 'Procédure de revue de direction', 'Procedure voor managementbeoordeling', 'Vezetőségi átvizsgálás eljárása', 'Juhtkonna ülevaatuse protseduur') },
  { id: 'doc_control', type: 'Procedure', title: t('Verfahren zur Lenkung dokumentierter Informationen', 'Document Control Procedure', 'Procédure de maîtrise des informations documentées', 'Procedure voor documentbeheer', 'Dokumentumkezelési eljárás', 'Dokumendikontrolli protseduur') },
  { id: 'corrective', type: 'Procedure', title: t('Verfahren für Korrekturmaßnahmen und ständige Verbesserung', 'Corrective Action and Continual Improvement Procedure', 'Procédure d’actions correctives et d’amélioration continue', 'Procedure voor corrigerende maatregelen en continue verbetering', 'Korrekciós intézkedések és folyamatos fejlesztés eljárása', 'Korrigeerivate tegevuste ja pideva parendamise protseduur') },
  { id: 'supplier_assessment', type: 'Procedure', title: t('Verfahren zur Lieferantenbewertung', 'Supplier Assessment Procedure', 'Procédure d’évaluation des fournisseurs', 'Procedure voor leveranciersbeoordeling', 'Beszállítói értékelési eljárás', 'Tarnijate hindamise protseduur') },
  { id: 'disposal', type: 'Procedure', title: t('Verfahren zur sicheren Entsorgung von Datenträgern', 'Secure Media Disposal Procedure', 'Procédure d’élimination sécurisée des supports', 'Procedure voor veilige verwijdering van media', 'Adathordozók biztonságos megsemmisítésének eljárása', 'Andmekandjate turvalise kõrvaldamise protseduur') },
  { id: 'key_mgmt', type: 'Procedure', title: t('Verfahren zur Schlüsselverwaltung', 'Cryptographic Key Management Procedure', 'Procédure de gestion des clés cryptographiques', 'Procedure voor cryptografisch sleutelbeheer', 'Kriptográfiai kulcskezelési eljárás', 'Krüptovõtmete halduse protseduur') },
  { id: 'risk_assessment', type: 'Procedure', title: t('Verfahren zur Risikobewertung und -behandlung', 'Risk Assessment and Treatment Procedure', 'Procédure d’appréciation et de traitement des risques', 'Procedure voor risicobeoordeling en -behandeling', 'Kockázatértékelési és -kezelési eljárás', 'Riskihindamise ja -käsitluse protseduur') },
  { id: 'bia', type: 'Procedure', title: t('Verfahren zur Business-Impact-Analyse', 'Business Impact Analysis Procedure', 'Procédure d’analyse d’impact sur l’activité', 'Procedure voor business impactanalyse', 'Üzleti hatáselemzési eljárás', 'Talitluspidevuse mõjuanalüüsi protseduur') },
  { id: 'dr', type: 'Procedure', title: t('Notfallwiederherstellungsverfahren (Disaster Recovery)', 'Disaster Recovery Procedure', 'Procédure de reprise après sinistre', 'Procedure voor rampherstel', 'Katasztrófa-helyreállítási eljárás', 'Katastroofijärgse taaste protseduur') },
  { id: 'ai_inventory', type: 'Procedure', title: t('Verfahren zur Erfassung und Risikoklassifizierung von KI-Systemen', 'AI System Inventory and Risk Classification Procedure', 'Procédure d’inventaire et de classification des risques des systèmes d’IA', 'Procedure voor inventarisatie en risicoclassificatie van AI-systemen', 'AI-rendszerek nyilvántartásának és kockázati osztályozásának eljárása', 'TI-süsteemide inventuuri ja riskiklassifitseerimise protseduur') },
  { id: 'ai_oversight', type: 'Procedure', title: t('Verfahren zur menschlichen Aufsicht über KI-Systeme', 'Human Oversight of AI Systems Procedure', 'Procédure de contrôle humain des systèmes d’IA', 'Procedure voor menselijk toezicht op AI-systemen', 'Az AI-rendszerek emberi felügyeletének eljárása', 'TI-süsteemide inimjärelevalve protseduur') },
  { id: 'ai_use_case', type: 'Procedure', title: t('Verfahren zur Freigabe von KI-Anwendungsfällen', 'AI Use Case Approval Procedure', 'Procédure d’approbation des cas d’usage de l’IA', 'Procedure voor goedkeuring van AI-toepassingen', 'AI-felhasználási esetek jóváhagyási eljárása', 'TI kasutusjuhtude kinnitamise protseduur') },
  { id: 'config_mgmt', type: 'Procedure', title: t('Konfigurationsmanagement-Verfahren', 'Configuration Management Procedure', 'Procédure de gestion de la configuration', 'Procedure voor configuratiebeheer', 'Konfigurációkezelési eljárás', 'Konfiguratsioonihalduse protseduur') },
  { id: 'capacity_mgmt', type: 'Procedure', title: t('Verfahren zum Kapazitätsmanagement', 'Capacity Management Procedure', 'Procédure de gestion de la capacité', 'Procedure voor capaciteitsbeheer', 'Kapacitáskezelési eljárás', 'Mahuhalduse protseduur') },
  { id: 'malware', type: 'Procedure', title: t('Verfahren zum Schutz vor Schadsoftware', 'Malware Protection Procedure', 'Procédure de protection contre les logiciels malveillants', 'Procedure voor bescherming tegen malware', 'Kártevők elleni védelem eljárása', 'Pahavarakaitse protseduur') },
  { id: 'pentest', type: 'Procedure', title: t('Verfahren für Penetrationstests und Sicherheitsprüfungen', 'Penetration Testing and Security Testing Procedure', 'Procédure de tests d’intrusion et de contrôles de sécurité', 'Procedure voor penetratietests en beveiligingstests', 'Penetrációs tesztelési és biztonsági vizsgálati eljárás', 'Läbistus- ja turvatestimise protseduur') },
  { id: 'user_access', type: 'Procedure', title: t('Verfahren zur Vergabe und zum Entzug von Zugriffsrechten', 'User Access Provisioning and Revocation Procedure', 'Procédure d’attribution et de retrait des droits d’accès', 'Procedure voor het toekennen en intrekken van toegangsrechten', 'Hozzáférési jogosultságok kiadásának és visszavonásának eljárása', 'Kasutajapääsu andmise ja tühistamise protseduur') },
  { id: 'privileged_proc', type: 'Procedure', title: t('Verfahren für privilegierte Zugriffe und Notfallzugänge', 'Privileged Access and Break-Glass Procedure', 'Procédure d’accès privilégiés et d’accès d’urgence', 'Procedure voor bevoorrechte toegang en noodtoegang', 'Kiemelt és vészhelyzeti hozzáférések eljárása', 'Privilegeeritud juurdepääsu ja hädaolukorra pääsu (break-glass) protseduur') },
  { id: 'password_reset', type: 'Procedure', title: t('Verfahren zum Zurücksetzen von Passwörtern', 'Password Reset Procedure', 'Procédure de réinitialisation des mots de passe', 'Procedure voor het resetten van wachtwoorden', 'Jelszó-visszaállítási eljárás', 'Parooli lähtestamise protseduur') },
  { id: 'screening', type: 'Procedure', title: t('Verfahren zur Überprüfung von Bewerbern und Beschäftigten', 'Background Screening Procedure', 'Procédure de vérification des candidats et du personnel', 'Procedure voor screening van kandidaten en medewerkers', 'Jelöltek és munkatársak ellenőrzési eljárása', 'Taustakontrolli protseduur') },
  { id: 'return_assets', type: 'Procedure', title: t('Verfahren zur Rückgabe von Geräten und Zugängen', 'Return of Assets Procedure', 'Procédure de restitution des équipements et des accès', 'Procedure voor teruggave van apparatuur en toegang', 'Eszközök és hozzáférések visszaadásának eljárása', 'Varade tagastamise protseduur') },
  { id: 'visitors', type: 'Procedure', title: t('Verfahren für Besucher und Fremdpersonal', 'Visitor Management Procedure', 'Procédure de gestion des visiteurs', 'Procedure voor bezoekersbeheer', 'Látogatókezelési eljárás', 'Külastajate haldamise protseduur') },
  { id: 'physical_access', type: 'Procedure', title: t('Verfahren zur Zutrittskontrolle', 'Physical Access Control Procedure', 'Procédure de contrôle d’accès physique', 'Procedure voor fysieke toegangscontrole', 'Fizikai beléptetési eljárás', 'Füüsilise juurdepääsukontrolli protseduur') },
  { id: 'media_handling', type: 'Procedure', title: t('Verfahren für den Umgang mit Datenträgern', 'Media Handling Procedure', 'Procédure de manipulation des supports', 'Procedure voor het omgaan met media', 'Adathordozók kezelésének eljárása', 'Andmekandjate käitlemise protseduur') },
  { id: 'info_labelling', type: 'Procedure', title: t('Verfahren zur Kennzeichnung und Handhabung von Informationen', 'Information Labelling and Handling Procedure', 'Procédure d’étiquetage et de traitement de l’information', 'Procedure voor het labelen en behandelen van informatie', 'Információk megjelölésének és kezelésének eljárása', 'Teabe märgistamise ja käitlemise protseduur') },
  { id: 'data_transfer', type: 'Procedure', title: t('Verfahren für die sichere Datenübertragung', 'Secure Information Transfer Procedure', 'Procédure de transfert sécurisé de l’information', 'Procedure voor veilige gegevensoverdracht', 'Biztonságos adattovábbítási eljárás', 'Teabe turvalise edastamise protseduur') },
  { id: 'supplier_onboarding', type: 'Procedure', title: t('Verfahren zur Aufnahme neuer Lieferanten', 'Supplier Onboarding Procedure', 'Procédure d’intégration de nouveaux fournisseurs', 'Procedure voor het aannemen van nieuwe leveranciers', 'Új beszállítók felvételének eljárása', 'Tarnija kasutuselevõtu protseduur') },
  { id: 'supplier_offboarding', type: 'Procedure', title: t('Verfahren zur Beendigung von Lieferantenbeziehungen', 'Supplier Offboarding Procedure', 'Procédure de fin de relation avec un fournisseur', 'Procedure voor beëindiging van leveranciersrelaties', 'Beszállítói kapcsolat megszüntetésének eljárása', 'Tarnija lõpetamise protseduur') },
  { id: 'dpia', type: 'Procedure', title: t('Verfahren zur Datenschutz-Folgenabschätzung', 'Data Protection Impact Assessment Procedure', 'Procédure d’analyse d’impact relative à la protection des données', 'Procedure voor gegevensbeschermingseffectbeoordeling', 'Adatvédelmi hatásvizsgálati eljárás', 'Andmekaitsealase mõjuhinnangu protseduur') },
  { id: 'ropa', type: 'Procedure', title: t('Verfahren zur Pflege des Verzeichnisses von Verarbeitungstätigkeiten', 'Records of Processing Activities Procedure', 'Procédure de tenue du registre des activités de traitement', 'Procedure voor het bijhouden van het register van verwerkingsactiviteiten', 'Az adatkezelési tevékenységek nyilvántartásának vezetési eljárása', 'Töötlemistoimingute registri protseduur') },
  { id: 'consent', type: 'Procedure', title: t('Verfahren zur Einholung und Verwaltung von Einwilligungen', 'Consent Management Procedure', 'Procédure de recueil et de gestion des consentements', 'Procedure voor het beheer van toestemmingen', 'Hozzájárulások kezelésének eljárása', 'Nõusolekute haldamise protseduur') },
  { id: 'data_deletion', type: 'Procedure', title: t('Verfahren zur Löschung personenbezogener Daten', 'Personal Data Deletion Procedure', 'Procédure de suppression des données personnelles', 'Procedure voor verwijdering van persoonsgegevens', 'Személyes adatok törlésének eljárása', 'Isikuandmete kustutamise protseduur') },
  { id: 'processor_contract', type: 'Procedure', title: t('Verfahren zum Abschluss von Auftragsverarbeitungsverträgen', 'Data Processing Agreement Procedure', 'Procédure de conclusion des contrats de sous-traitance', 'Procedure voor verwerkersovereenkomsten', 'Adatfeldolgozói szerződések megkötésének eljárása', 'Andmetöötluslepingu protseduur') },
  { id: 'security_event', type: 'Procedure', title: t('Verfahren zur Meldung und Bewertung von Sicherheitsereignissen', 'Security Event Reporting and Assessment Procedure', 'Procédure de signalement et d’évaluation des événements de sécurité', 'Procedure voor melding en beoordeling van beveiligingsgebeurtenissen', 'Biztonsági események bejelentési és értékelési eljárása', 'Turvasündmuste teavitamise ja hindamise protseduur') },
  { id: 'forensics', type: 'Procedure', title: t('Verfahren zur Beweissicherung (Forensik)', 'Evidence Collection and Forensics Procedure', 'Procédure de collecte de preuves et d’investigation numérique', 'Procedure voor bewijsvergaring en forensisch onderzoek', 'Bizonyítékgyűjtési és digitális törvényszéki eljárás', 'Tõendite kogumise ja kohtuekspertiisi protseduur') },
  { id: 'lessons_learned', type: 'Procedure', title: t('Verfahren zur Nachbereitung von Vorfällen (Lessons Learned)', 'Post-Incident Review Procedure', 'Procédure de retour d’expérience après incident', 'Procedure voor nabespreking van incidenten', 'Incidensek utólagos értékelésének eljárása', 'Intsidendijärgse ülevaatuse protseduur') },
  { id: 'bc_test', type: 'Procedure', title: t('Verfahren zur Prüfung von Notfall- und Wiederanlaufplänen', 'Business Continuity Exercise and Test Procedure', 'Procédure d’exercice et de test des plans de continuité', 'Procedure voor het testen van continuïteitsplannen', 'Üzletmenet-folytonossági tervek gyakorlásának és tesztelésének eljárása', 'Talitluspidevuse õppuste ja testide protseduur') },
  { id: 'backup_test', type: 'Procedure', title: t('Verfahren zur Prüfung der Datensicherung', 'Backup Verification Procedure', 'Procédure de vérification des sauvegardes', 'Procedure voor verificatie van back-ups', 'Mentések ellenőrzési eljárása', 'Varukoopiate kontrolli protseduur') },
  { id: 'security_metrics', type: 'Procedure', title: t('Verfahren zur Messung und Berichterstattung der Informationssicherheit', 'Security Metrics and Reporting Procedure', 'Procédure de mesure et de rapport de la sécurité de l’information', 'Procedure voor meten en rapporteren van informatiebeveiliging', 'Az információbiztonság mérésének és jelentésének eljárása', 'Turvamõõdikute ja aruandluse protseduur') },
  { id: 'legal_register', type: 'Procedure', title: t('Verfahren zur Ermittlung und Bewertung rechtlicher Anforderungen', 'Legal and Regulatory Requirements Procedure', 'Procédure d’identification des exigences légales et réglementaires', 'Procedure voor het vaststellen van wettelijke eisen', 'Jogi és szabályozási követelmények azonosításának eljárása', 'Õiguslike ja regulatiivsete nõuete protseduur') },
  { id: 'competence', type: 'Procedure', title: t('Verfahren zur Kompetenzfeststellung und Schulung', 'Competence and Training Procedure', 'Procédure de gestion des compétences et de la formation', 'Procedure voor competentie en training', 'Kompetenciafelmérési és képzési eljárás', 'Pädevuse ja koolituse protseduur') },
  { id: 'nonconformity', type: 'Procedure', title: t('Verfahren für Abweichungen und Nichtkonformitäten', 'Nonconformity Handling Procedure', 'Procédure de traitement des non-conformités', 'Procedure voor afwijkingen en non-conformiteiten', 'Eltérések és nemmegfelelőségek kezelésének eljárása', 'Mittevastavuste käsitlemise protseduur') },
  { id: 'exception', type: 'Procedure', title: t('Verfahren für Ausnahmegenehmigungen', 'Exception Request Procedure', 'Procédure de demande de dérogation', 'Procedure voor uitzonderingsverzoeken', 'Kivételkérelmi eljárás', 'Erandi taotlemise protseduur') },
  { id: 'cloud_approval', type: 'Procedure', title: t('Verfahren zur Freigabe von Cloud-Diensten', 'Cloud Service Approval Procedure', 'Procédure d’approbation des services cloud', 'Procedure voor goedkeuring van clouddiensten', 'Felhőszolgáltatások jóváhagyásának eljárása', 'Pilveteenuse kinnitamise protseduur') },
  { id: 'software_install', type: 'Procedure', title: t('Verfahren zur Freigabe und Installation von Software', 'Software Approval and Installation Procedure', 'Procédure d’approbation et d’installation des logiciels', 'Procedure voor goedkeuring en installatie van software', 'Szoftverek jóváhagyásának és telepítésének eljárása', 'Tarkvara kinnitamise ja paigaldamise protseduur') },
  { id: 'code_review', type: 'Procedure', title: t('Verfahren für Code-Reviews und Sicherheitstests in der Entwicklung', 'Code Review and Security Testing Procedure', 'Procédure de revue de code et de tests de sécurité', 'Procedure voor codereview en beveiligingstests', 'Kódáttekintési és biztonsági tesztelési eljárás', 'Koodi ülevaatuse ja turvatestimise protseduur') },
  { id: 'certificate_mgmt', type: 'Procedure', title: t('Verfahren zur Verwaltung von Zertifikaten', 'Certificate Management Procedure', 'Procédure de gestion des certificats', 'Procedure voor certificaatbeheer', 'Tanúsítványkezelési eljárás', 'Sertifikaatide halduse protseduur') },
  { id: 'remote_access', type: 'Procedure', title: t('Verfahren für den Fernzugriff', 'Remote Access Procedure', 'Procédure d’accès à distance', 'Procedure voor toegang op afstand', 'Távoli hozzáférési eljárás', 'Kaugjuurdepääsu protseduur') },
  { id: 'ai_data_governance', type: 'Procedure', title: t('Verfahren zu Datenqualität und Datenherkunft für KI', 'Data Governance Procedure for AI', 'Procédure de gouvernance des données pour l’IA', 'Procedure voor datagovernance voor AI', 'Adatirányítási eljárás az AI-hoz', 'TI andmejuhtimise protseduur') },
  { id: 'ai_testing', type: 'Procedure', title: t('Verfahren zur Prüfung und Überwachung von KI-Systemen', 'AI System Testing and Monitoring Procedure', 'Procédure de test et de surveillance des systèmes d’IA', 'Procedure voor het testen en monitoren van AI-systemen', 'AI-rendszerek tesztelésének és felügyeletének eljárása', 'TI-süsteemide testimise ja jälgimise protseduur') },
  { id: 'ai_transparency', type: 'Procedure', title: t('Verfahren zur Information Betroffener über den KI-Einsatz', 'Procedure for Informing People about AI Use', 'Procédure d’information des personnes sur l’usage de l’IA', 'Procedure voor het informeren van personen over AI-gebruik', 'Az AI-használatról szóló tájékoztatás eljárása', 'Inimeste TI kasutamisest teavitamise protseduur') },
  { id: 'ai_labelling_proc', type: 'Procedure', title: t('Verfahren zur Kennzeichnung KI-generierter Inhalte', 'AI-Generated Content Labelling Procedure', 'Procédure d’étiquetage des contenus générés par l’IA', 'Procedure voor het labelen van door AI gegenereerde inhoud', 'Az AI által generált tartalom megjelölésének eljárása', 'TI-ga loodud sisu märgistamise protseduur') },
  { id: 'risk_mgmt', type: 'Risk Policy', title: t('Risikomanagement-Richtlinie', 'Risk Management Policy', 'Politique de gestion des risques', 'Risicomanagementbeleid', 'Kockázatkezelési szabályzat', 'Riskijuhtimise poliitika') },
  { id: 'risk_acceptance', type: 'Risk Policy', title: t('Richtlinie zu Risikoakzeptanz und Risikokriterien', 'Risk Acceptance and Risk Criteria Policy', 'Politique d’acceptation des risques et de critères de risque', 'Beleid voor risicoacceptatie en risicocriteria', 'Kockázatvállalási és kockázati kritériumok szabályzata', 'Riski aktsepteerimise ja riskikriteeriumide poliitika') },
  { id: 'ai_risk', type: 'Risk Policy', title: t('Risikomanagement-Richtlinie für KI-Systeme', 'AI Risk Management Policy', 'Politique de gestion des risques de l’IA', 'Risicomanagementbeleid voor AI-systemen', 'AI-rendszerek kockázatkezelési szabályzata', 'TI riskijuhtimise poliitika') },
  { id: 'third_party_risk', type: 'Risk Policy', title: t('Richtlinie zum Management von Lieferketten- und Drittparteirisiken', 'Supply Chain and Third-Party Risk Policy', 'Politique de gestion des risques de la chaîne d’approvisionnement et des tiers', 'Beleid voor risico’s in de toeleveringsketen en bij derden', 'Ellátási lánc és harmadik felek kockázatkezelési szabályzata', 'Tarneahela ja kolmandate osapoolte riski poliitika') },
  { id: 'risk_methodology', type: 'Risk Policy', title: t('Richtlinie zur Risikobewertungsmethodik', 'Risk Assessment Methodology Policy', 'Politique de méthodologie d’appréciation des risques', 'Beleid voor risicobeoordelingsmethodiek', 'Kockázatértékelési módszertani szabályzat', 'Riskihindamise metoodika poliitika') },
  { id: 'risk_appetite', type: 'Risk Policy', title: t('Richtlinie zu Risikobereitschaft und Risikotoleranz', 'Risk Appetite and Tolerance Policy', 'Politique d’appétence et de tolérance au risque', 'Beleid voor risicobereidheid en risicotolerantie', 'Kockázatvállalási hajlandóság és tűréshatár szabályzata', 'Riskiisu ja -taluvuse poliitika') },
  { id: 'risk_treatment', type: 'Risk Policy', title: t('Richtlinie zur Risikobehandlung', 'Risk Treatment Policy', 'Politique de traitement des risques', 'Risicobehandelingsbeleid', 'Kockázatkezelési terv szabályzata', 'Riskikäsitluse poliitika') },
  { id: 'risk_register', type: 'Risk Policy', title: t('Richtlinie zur Führung des Risikoregisters', 'Risk Register Policy', 'Politique du registre des risques', 'Beleid voor het risicoregister', 'Kockázati nyilvántartás szabályzata', 'Riskiregistri poliitika') },
  { id: 'risk_reporting', type: 'Risk Policy', title: t('Richtlinie zu Risikoberichterstattung und Eskalation', 'Risk Reporting and Escalation Policy', 'Politique de rapport et d’escalade des risques', 'Beleid voor risicorapportage en escalatie', 'Kockázatjelentési és eszkalációs szabályzat', 'Riskiaruandluse ja eskaleerimise poliitika') },
  { id: 'risk_ownership', type: 'Risk Policy', title: t('Richtlinie zu Risikoverantwortlichen (Risk Owner)', 'Risk Ownership Policy', 'Politique des responsables de risque', 'Beleid voor risico-eigenaren', 'Kockázati felelősök szabályzata', 'Riski omandi poliitika') },
  { id: 'risk_monitoring', type: 'Risk Policy', title: t('Richtlinie zur Risikoüberwachung und -überprüfung', 'Risk Monitoring and Review Policy', 'Politique de surveillance et de revue des risques', 'Beleid voor risicomonitoring en -review', 'Kockázatfigyelési és felülvizsgálati szabályzat', 'Riskide jälgimise ja ülevaatuse poliitika') },
  { id: 'privacy_risk', type: 'Risk Policy', title: t('Richtlinie zum Datenschutz-Risikomanagement', 'Privacy Risk Management Policy', 'Politique de gestion des risques de protection des données', 'Beleid voor privacyrisicobeheer', 'Adatvédelmi kockázatkezelési szabályzat', 'Privaatsusriskide juhtimise poliitika') },
  { id: 'cyber_risk', type: 'Risk Policy', title: t('Richtlinie zum Management von Cyberrisiken (NIS2)', 'Cyber Risk Management Policy (NIS2)', 'Politique de gestion des cyber-risques (NIS2)', 'Cyberrisicomanagementbeleid (NIS2)', 'Kiberkockázat-kezelési szabályzat (NIS2)', 'Küberriskide juhtimise poliitika (NIS2)') },
  { id: 'project_risk', type: 'Risk Policy', title: t('Richtlinie zum Risikomanagement in Projekten', 'Project Risk Management Policy', 'Politique de gestion des risques de projet', 'Beleid voor risicomanagement in projecten', 'Projektkockázat-kezelési szabályzat', 'Projektiriskide juhtimise poliitika') },
  { id: 'change_risk', type: 'Risk Policy', title: t('Richtlinie zur Risikobewertung bei Änderungen', 'Change Risk Assessment Policy', 'Politique d’appréciation des risques liés aux changements', 'Beleid voor risicobeoordeling bij wijzigingen', 'Változásokkal kapcsolatos kockázatértékelési szabályzat', 'Muudatuste riskihindamise poliitika') },
  { id: 'bcm_risk', type: 'Risk Policy', title: t('Richtlinie zu Betriebskontinuitätsrisiken', 'Business Continuity Risk Policy', 'Politique des risques de continuité d’activité', 'Beleid voor continuïteitsrisico’s', 'Üzletmenet-folytonossági kockázatok szabályzata', 'Talitluspidevuse riski poliitika') },
  { id: 'insider_risk', type: 'Risk Policy', title: t('Richtlinie zum Umgang mit Insider-Risiken', 'Insider Risk Policy', 'Politique de gestion des risques internes', 'Beleid voor insiderrisico’s', 'Bennfentes kockázatok kezelési szabályzata', 'Siseringi riski poliitika') },
  { id: 'risk_exceptions', type: 'Risk Policy', title: t('Richtlinie zu Restrisiken und Risikoausnahmen', 'Residual Risk and Risk Exception Policy', 'Politique des risques résiduels et des dérogations', 'Beleid voor restrisico’s en uitzonderingen', 'Maradványkockázatok és kockázati kivételek szabályzata', 'Jääkriski ja riskierandite poliitika') },
  { id: 'ai_impact', type: 'Risk Policy', title: t('Richtlinie zur Folgenabschätzung für KI-Systeme', 'AI Impact Assessment Policy', 'Politique d’analyse d’impact des systèmes d’IA', 'Beleid voor AI-impactbeoordeling', 'AI-hatásvizsgálati szabályzat', 'TI mõjuhinnangu poliitika') },
  { id: 'asset_valuation', type: 'Risk Policy', title: t('Richtlinie zur Bewertung von Werten und Schutzbedarf', 'Asset Valuation and Protection Needs Policy', 'Politique d’évaluation des actifs et des besoins de protection', 'Beleid voor waardering van assets en beschermingsbehoefte', 'Eszközértékelési és védelmi igény szabályzata', 'Varade hindamise ja kaitsevajaduse poliitika') },
  { id: 'incident_response', type: 'Incident', title: t('Incident-Response-Verfahren', 'Incident Response Procedure', 'Procédure de réponse aux incidents', 'Procedure voor incidentrespons', 'Incidenskezelési eljárás', 'Intsidentidele reageerimise protseduur') },
  { id: 'data_breach', type: 'Incident', title: t('Verfahren bei Datenschutzverletzungen', 'Data Breach Procedure', 'Procédure en cas de violation de données', 'Procedure bij datalekken', 'Adatvédelmi incidens kezelési eljárása', 'Isikuandmetega seotud rikkumise protseduur') },
  { id: 'nis2_reporting', type: 'Incident', title: t('Meldeverfahren für erhebliche Sicherheitsvorfälle (NIS2)', 'Significant Incident Reporting Procedure (NIS2)', 'Procédure de notification des incidents importants (NIS2)', 'Meldprocedure voor significante incidenten (NIS2)', 'Jelentős incidensek bejelentési eljárása (NIS2)', 'Olulisest intsidendist teavitamise protseduur (NIS2)') },
  { id: 'ransomware', type: 'Incident', title: t('Notfallverfahren bei Ransomware', 'Ransomware Response Procedure', 'Procédure de réponse aux rançongiciels', 'Procedure bij ransomware', 'Zsarolóvírus-incidens kezelési eljárása', 'Lunavarale reageerimise protseduur') },
  { id: 'lost_device', type: 'Incident', title: t('Verfahren bei Verlust oder Diebstahl von Geräten', 'Lost or Stolen Device Procedure', 'Procédure en cas de perte ou de vol d’un appareil', 'Procedure bij verlies of diefstal van apparatuur', 'Eszköz elvesztése vagy ellopása esetén követendő eljárás', 'Kaotatud või varastatud seadme protseduur') },
  { id: 'ai_incident', type: 'Incident', title: t('Verfahren bei Vorfällen mit KI-Systemen', 'AI Incident Procedure', 'Procédure en cas d’incident impliquant un système d’IA', 'Procedure bij incidenten met AI-systemen', 'AI-rendszerekkel kapcsolatos incidensek eljárása', 'TI intsidendi protseduur') },
  { id: 'crisis_comm', type: 'Incident', title: t('Krisenkommunikationsplan', 'Crisis Communication Plan', 'Plan de communication de crise', 'Crisiscommunicatieplan', 'Válságkommunikációs terv', 'Kriisikommunikatsiooni kava') },
  { id: 'release_mgmt', type: 'Release', title: t('Freigabe- und Release-Verfahren', 'Release and Approval Procedure', 'Procédure de validation et de mise en production', 'Release- en goedkeuringsprocedure', 'Kiadási és jóváhagyási eljárás', 'Väljalaske ja kinnitamise protseduur') },
  { id: 'emergency_change', type: 'Release', title: t('Verfahren für Notfalländerungen', 'Emergency Change Procedure', 'Procédure de changement d’urgence', 'Procedure voor noodwijzigingen', 'Sürgősségi változtatások eljárása', 'Erakorralise muudatuse protseduur') },
  { id: 'ai_release', type: 'Release', title: t('Freigabeverfahren für KI-Systeme und Modelle', 'Release Procedure for AI Systems and Models', 'Procédure de mise en production des systèmes et modèles d’IA', 'Releaseprocedure voor AI-systemen en -modellen', 'AI-rendszerek és modellek kiadási eljárása', 'TI-süsteemide ja -mudelite väljalaske protseduur') },
  { id: 'sw_release_sec', type: 'Release', title: t('Freigabeverfahren für Software mit Sicherheitsprüfung', 'Software Release Procedure with Security Review', 'Procédure de mise en production de logiciels avec revue de sécurité', 'Releaseprocedure voor software met beveiligingsreview', 'Szoftverkiadási eljárás biztonsági felülvizsgálattal', 'Tarkvara väljalaske protseduur turvaülevaatusega') },
  { id: 'soa_doc', type: 'SoA', title: t('Erklärung zur Anwendbarkeit (SoA)', 'Statement of Applicability (SoA)', 'Déclaration d’applicabilité (SoA)', 'Verklaring van toepasselijkheid (SoA)', 'Alkalmazhatósági nyilatkozat (SoA)', 'Kohaldatavuse deklaratsioon (SoA)') },
  { id: 'soa_maintenance', type: 'SoA', title: t('Verfahren zur Pflege der Erklärung zur Anwendbarkeit', 'Statement of Applicability Maintenance Procedure', 'Procédure de mise à jour de la déclaration d’applicabilité', 'Procedure voor onderhoud van de verklaring van toepasselijkheid', 'Az alkalmazhatósági nyilatkozat karbantartásának eljárása', 'Kohaldatavuse deklaratsiooni hoolduse protseduur') },
  { id: 'bcm_plan_bcp_general', type: 'BCM Plan', title: t('Allgemeiner Business-Continuity-Plan', 'General business continuity plan', 'Plan de continuité d’activité général', 'Algemeen bedrijfscontinuïteitsplan', 'Általános üzletmenet-folytonossági terv', 'Üldine talitluspidevuse kava') },
  { id: 'bcm_plan_drp_it', type: 'BCM Plan', title: t('IT-Notfallplan (Disaster Recovery)', 'IT disaster recovery plan', 'Plan de reprise informatique (Disaster Recovery)', 'IT-noodplan (disaster recovery)', 'Informatikai katasztrófa-helyreállítási terv', 'IT hädaolukorra taastekava') },
  { id: 'bcm_plan_cyber_attack', type: 'BCM Plan', title: t('Cyberangriff und Ransomware', 'Cyber attack and ransomware', 'Cyberattaque et rançongiciel', 'Cyberaanval en ransomware', 'Kibertámadás és zsarolóvírus', 'Küberrünnak ja lunavara') },
  { id: 'bcm_plan_power_outage', type: 'BCM Plan', title: t('Stromausfall', 'Power outage', 'Panne de courant', 'Stroomuitval', 'Áramkimaradás', 'Elektrikatkestus') },
  { id: 'bcm_plan_site_loss', type: 'BCM Plan', title: t('Gebäude- und Standortausfall', 'Building and site loss', 'Perte d’un bâtiment ou d’un site', 'Uitval van gebouw en locatie', 'Épület- és telephely-kiesés', 'Hoone ja asukoha kadu') },
  { id: 'bcm_plan_supplier_failure', type: 'BCM Plan', title: t('Ausfall eines kritischen Lieferanten', 'Failure of a critical supplier', 'Défaillance d’un fournisseur critique', 'Uitval van een kritieke leverancier', 'Kritikus beszállító kiesése', 'Kriitilise tarnija tõrge') },
  { id: 'bcm_plan_pandemic', type: 'BCM Plan', title: t('Pandemie und größerer Personalausfall', 'Pandemic and major staff shortage', 'Pandémie et absentéisme important', 'Pandemie en groot personeelstekort', 'Járvány és jelentős munkaerőhiány', 'Pandeemia ja suur töötajate puudus') },
  { id: 'bcm_plan_crisis_communication', type: 'BCM Plan', title: t('Krisenkommunikation', 'Crisis communication', 'Communication de crise', 'Crisiscommunicatie', 'Válságkommunikáció', 'Kriisikommunikatsioon') },
  { id: 'bcm_plan_datacenter_recovery', type: 'BCM Plan', title: t('Wiederanlauf des Rechenzentrums', 'Data centre restart', 'Redémarrage du centre de données', 'Herstart van het datacenter', 'Az adatközpont újraindítása', 'Andmekeskuse taaskäivitus') },
  { id: 'bcm_exercise_tabletop_ransomware', type: 'BCM Exercise', title: t('Planspiel Ransomware', 'Tabletop exercise: ransomware', 'Exercice sur table : rançongiciel', 'Tabletop-oefening: ransomware', 'Asztali gyakorlat: zsarolóvírus', 'Laua taga õppus: lunavara') },
  { id: 'bcm_exercise_restore_test', type: 'BCM Exercise', title: t('Wiederherstellungstest der Datensicherung', 'Backup restore test', 'Test de restauration de la sauvegarde', 'Herstelltest van de back-up', 'Az adatmentés visszaállítási tesztje', 'Varukoopia taastetest') },
  { id: 'bcm_exercise_evacuation_site_loss', type: 'BCM Exercise', title: t('Räumung und Standortausfall', 'Evacuation and site loss', 'Évacuation et perte du site', 'Ontruiming en locatie-uitval', 'Kitelepítés és telephely-kiesés', 'Evakueerimine ja asukoha kadu') },
  { id: 'bcm_exercise_supplier_outage', type: 'BCM Exercise', title: t('Lieferantenausfall', 'Supplier outage', 'Défaillance d’un fournisseur', 'Leveranciersuitval', 'Beszállítói kiesés', 'Tarnija tõrge') },
  { id: 'bcm_exercise_call_tree', type: 'BCM Exercise', title: t('Test der Alarmierungskette', 'Alerting chain test', 'Test de la chaîne d’alerte', 'Test van de alarmeringsketen', 'A riasztási lánc tesztje', 'Häireahela test') },
  { id: 'bcm_exercise_power_outage_drill', type: 'BCM Exercise', title: t('Übung Stromausfall', 'Power outage drill', 'Exercice de panne de courant', 'Oefening stroomuitval', 'Áramkimaradás-gyakorlat', 'Elektrikatkestuse õppus') },
]
LANGUAGES = reg.withData(CATALOG[0].title)

// Platzhalter → Feld der Organisationsdaten
const PLACEHOLDERS = {
  COMPANY_NAME: 'orgName',
  ISMS_OWNER: 'cisoName',
  DATA_PROTECTION_OFFICER: 'gdpoName',
  ISMS_SCOPE: 'ismsScope',
}

const entryById = id => CATALOG.find(e => e.id === id) || null
const catalogFor = type => CATALOG.filter(e => e.type === type)

// Strukturierte Angaben, die nie an eine KI gehen dürfen → [{ kind, match }]
const PII_RULES = [
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/i],
  ['url', /\b(?:https?|ftp|file):\/\/\S+|\bwww\.\S+/i],
  ['ip', /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/i],
  ['mac', /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i],
  ['iban', /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{3,4}){3,8}\b/],
  ['phone', /(?:\+|\b00)\d[\d\s()/.-]{6,}\d|\b0\d{2,5}[\s/.-]?\d{3,}(?:[\s/.-]?\d+)*\b/],
  ['domain', /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|de|org|net|eu|io|ch|at|fr|nl|hu|info|biz|local|lan|intern|internal|corp|home)\b/i],
  ['uuid', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ['secret', /\b(?:gh[pousr]_|github_pat_|sk-|AKIA|xox[abprs]-)[A-Za-z0-9_-]{8,}|\b[A-Za-z0-9+/_-]{32,}={0,2}/],
  ['number', /\b\d{6,}\b/],
  ['path', /\b[A-Za-z]:\\|\/(?:home|Users|etc|var|root)\/\S+/],
  ['handle', /(?:^|\s)@[A-Za-z0-9_]{2,}/],
  ['company', /\b(?:GmbH|AG|KG|UG|e\.?\s?V\.|Ltd\.?|Inc\.?|LLC|S\.?A\.?R\.?L\.?|B\.?V\.?|Kft\.?|Zrt\.?|Co\.|Corp\.?)(?=\s|$|[,.;)])/],
]
function findPii(text, known = []) {
  const s = String(text || '')
  const out = []
  // Eigene Daten der Organisation (Firmenname, Namen der Verantwortlichen) sind bekannt und werden zusätzlich gesucht
  const low = s.toLowerCase()
  for (const k of known || []) {
    const v = String(k || '').trim().toLowerCase()
    if (v.length >= 3 && low.includes(v)) { out.push({ kind: 'known', match: String(k).trim().slice(0, 40) }); break }
  }
  for (const [kind, re] of PII_RULES) {
    const m = s.match(re)
    if (m) out.push({ kind, match: m[0].trim().slice(0, 40) })
  }
  return out
}

const HINT_CHARS = /^[\p{L}\p{N} ,.;:()/&+\-–]*$/u

// Prompt bauen → { ok: true, prompt, entry, language, hint } oder { ok: false, code, findings? }
// `known`: Werte, die nie im Hinweis stehen dürfen (Firmenname, Namen der Verantwortlichen aus den Organisationsdaten)
function buildPrompt({ entry, language, hint, known } = {}) {
  const e = entryById(entry)
  if (!e) return { ok: false, code: 'unknown_entry' }
  if (!LANGUAGES.includes(language)) return { ok: false, code: 'bad_language' }
  const h = String(hint == null ? '' : hint).trim()
  if (h.length > MAX_HINT) return { ok: false, code: 'hint_too_long' }
  if (h) {
    const findings = findPii(h, known)
    if (findings.length) return { ok: false, code: 'pii', findings }
    if (!HINT_CHARS.test(h)) return { ok: false, code: 'hint_chars' }
  }
  const title = e.title[language]
  const bcm = e.type === 'BCM Plan' || e.type === 'BCM Exercise'
  const lines = [
    bcm ? 'You are an experienced author of business continuity documents for a small or medium-sized company.'
        : 'You are an experienced author of information security documents (ISO 27001 / NIS2) for a small or medium-sized company.',
    bcm ? `Write the content of a ${e.type === 'BCM Plan' ? 'business continuity plan' : 'business continuity exercise (scenario description)'} titled "${title}".`
        : `Write the content of a document of type "${e.type}" titled "${title}".`,
    `Usual structure for this document type: ${STRUCTURE[e.type] || STRUCTURE.Policy}.`,
    `Write the whole text, including all headings, in ${reg.aiName(language)}.`,
    'Never invent concrete names, addresses, e-mail addresses, phone numbers or other company data. Use exactly these placeholders where such data belongs, written with double curly braces: ' +
      Object.keys(PLACEHOLDERS).map(k => `{{${k}}}`).join(', ') + '.',
  ]
  if (h) lines.push(`Pay particular attention to: ${h}.`)
  lines.push('Return ONLY the Markdown content, starting with a "#" heading. No explanations, no code fences, no JSON.')
  return { ok: true, prompt: lines.join('\n'), entry: e, language, hint: h }
}

function stripCodeFences(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

// Platzhalter lokal ersetzen. `values` = Organisationsdaten (orgName, cisoName, gdpoName, ismsScope).
// Nicht ersetzbare (leerer Wert) bleiben als {{NAME}} stehen und werden in `unresolved` gemeldet; `replaced` = Anzahl ersetzter Stellen.
function fillPlaceholders(text, values) {
  const unresolved = new Set()
  let replaced = 0
  const out = String(text || '').replace(/\{\{\s*([A-Za-z_ ]+?)\s*\}\}|\[\s*(COMPANY_NAME|ISMS_OWNER|DATA_PROTECTION_OFFICER|ISMS_SCOPE)\s*\]/g, (whole, a, b) => {
    const name = String(a || b).trim().toUpperCase().replace(/ +/g, '_')
    if (!(name in PLACEHOLDERS)) return whole
    const v = values && typeof values[PLACEHOLDERS[name]] === 'string' ? values[PLACEHOLDERS[name]].trim() : ''
    if (!v) { unresolved.add(name); return `{{${name}}}` }
    replaced++
    return v
  })
  return { text: out, unresolved: [...unresolved].sort(), replaced }
}

module.exports = { LANGUAGES, MAX_HINT, CATALOG, PLACEHOLDERS, entryById, catalogFor, findPii, buildPrompt, stripCodeFences, fillPlaceholders }
