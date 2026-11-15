// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Übersetzung der Server-Meldungen (Fehlertexte der API) in die Sprache der Oberfläche.
//
// Die Routen und Stores liefern ihre Fehlertexte weiterhin als einfachen String (Deutsch oder
// Englisch, historisch gewachsen). Eine Middleware (installMiddleware) übersetzt sie vor dem Senden
// anhand dieser Tabelle in die Sprache des Aufrufers:
//   1. Header `X-Lang` (setzt ui/i18n/t.js automatisch bei jedem Request der Oberfläche),
//   2. sonst die Standardsprache der Organisation (Admin → Organisation → Sprachen),
//   3. sonst Englisch.
// Unbekannte Texte (z. B. Systemfehler, `e.message`) bleiben unverändert.
//
// Eintrag: [en, de, fr, nl, hu]; {name} sind Platzhalter, die beim Übersetzen erhalten bleiben.
'use strict'

const reg = require('./languages')
const SUPPORTED = reg.codes()
// Spalte in MESSAGES je Sprache (en = 0 …); fehlt der Text einer Sprache, wird Englisch ausgegeben
const IDX = Object.fromEntries(reg.list.map(l => [l.code, l.msgIndex]))

const MESSAGES = [
  ['File too large (max 20 MB)', 'Datei zu groß (höchstens 20 MB)', 'Fichier trop volumineux (20 Mo maximum)', 'Bestand te groot (maximaal 20 MB)', 'A fájl túl nagy (legfeljebb 20 MB)', 'Fail on liiga suur (kuni 20 MB)'],
  ['File type not allowed (PDF, PNG, JPG, DOCX, XLSX, TXT)', 'Dateityp nicht erlaubt (PDF, PNG, JPG, DOCX, XLSX, TXT)', 'Type de fichier non autorisé (PDF, PNG, JPG, DOCX, XLSX, TXT)', 'Bestandstype niet toegestaan (PDF, PNG, JPG, DOCX, XLSX, TXT)', 'A fájltípus nem engedélyezett (PDF, PNG, JPG, DOCX, XLSX, TXT)', 'Failitüüp pole lubatud (PDF, PNG, JPG, DOCX, XLSX, TXT)'],
  ['File content does not match its type', 'Der Dateiinhalt passt nicht zum Dateityp', 'Le contenu du fichier ne correspond pas à son type', 'De inhoud van het bestand komt niet overeen met het type', 'A fájl tartalma nem felel meg a típusának', 'Faili sisu ei vasta failitüübile'],
  ['A confirmation is only issued for completed trainings', 'Eine Teilnahmebestätigung wird nur für abgeschlossene Schulungen ausgestellt', 'Une attestation n\'est délivrée que pour les formations terminées', 'Een bevestiging wordt alleen afgegeven voor afgeronde trainingen', 'Igazolás csak elvégzett képzésről állítható ki', 'Osalemise kinnitus antakse välja ainult lõpetatud koolituste kohta'],
  ['PDF could not be created', 'Das PDF konnte nicht erstellt werden', 'Le PDF n\'a pas pu être créé', 'De pdf kon niet worden gemaakt', 'A PDF nem hozható létre', 'PDF-i ei õnnestunud luua'],
  ['File too large (max 2 MB)', 'Datei zu groß (höchstens 2 MB)', 'Fichier trop volumineux (2 Mo maximum)', 'Bestand te groot (maximaal 2 MB)', 'A fájl túl nagy (legfeljebb 2 MB)', 'Fail on liiga suur (kuni 2 MB)'],
  ['Too many rows (max 2000)', 'Zu viele Zeilen (höchstens 2000)', 'Trop de lignes (2000 maximum)', 'Te veel regels (maximaal 2000)', 'Túl sok sor (legfeljebb 2000)', 'Liiga palju ridu (kuni 2000)'],
  ['The file could not be read', 'Die Datei konnte nicht gelesen werden', 'Le fichier n\'a pas pu être lu', 'Het bestand kon niet worden gelezen', 'A fájl nem olvasható', 'Faili ei õnnestunud lugeda'],
  ['No valid requirements found', 'Keine gültigen Anforderungen gefunden', 'Aucune exigence valide trouvée', 'Geen geldige eisen gevonden', 'Nem található érvényes követelmény', 'Kehtivaid nõudeid ei leitud'],
  ['A justification is required for "not applicable"', 'Für „nicht anwendbar“ ist eine Begründung erforderlich', 'Une justification est requise pour « non applicable »', 'Voor „niet van toepassing” is een motivering vereist', 'A „nem alkalmazható” állapothoz indoklás szükséges', 'Valiku „ei kohaldu“ jaoks on vaja põhjendust'],
  ['Invalid value', 'Ungültiger Wert', 'Valeur invalide', 'Ongeldige waarde', 'Érvénytelen érték', 'Kehtetu väärtus'],
  ['Evidence link must start with http:// or https://', 'Der Nachweis-Link muss mit http:// oder https:// beginnen', 'Le lien du justificatif doit commencer par http:// ou https://', 'De bewijslink moet beginnen met http:// of https://', 'Az igazolás hivatkozásának http:// vagy https:// előtaggal kell kezdődnie', 'Tõendi link peab algama aadressiga http:// või https://'],
  ['Evidence link is too long (max 2000 characters)', 'Der Nachweis-Link ist zu lang (höchstens 2000 Zeichen)', 'Le lien du justificatif est trop long (2000 caractères maximum)', 'De bewijslink is te lang (maximaal 2000 tekens)', 'Az igazolás hivatkozása túl hosszú (legfeljebb 2000 karakter)', 'Tõendi link on liiga pikk (kuni 2000 märki)'],
  ['Evidence label is too long (max 120 characters)', 'Die Beschriftung des Nachweises ist zu lang (höchstens 120 Zeichen)', 'Le libellé du justificatif est trop long (120 caractères maximum)', 'Het label van het bewijs is te lang (maximaal 120 tekens)', 'Az igazolás megnevezése túl hosszú (legfeljebb 120 karakter)', 'Tõendi nimetus on liiga pikk (kuni 120 märki)'],
  ['Invalid date for "valid until"', 'Ungültiges Datum bei „gültig bis“', 'Date non valide pour « valable jusqu\'au »', 'Ongeldige datum bij ‘geldig tot’', 'Érvénytelen dátum az „érvényes ig” mezőben', 'Kehtetu kuupäev väljal „kehtib kuni“'],
  ['Unknown link target', 'Unbekanntes Verknüpfungsziel', 'Cible de lien inconnue', 'Onbekend koppelingsdoel', 'Ismeretlen kapcsolati cél', 'Tundmatu seose sihtmärk'],
  ['Internal server error', 'Interner Serverfehler', 'Erreur interne du serveur', 'Interne serverfout', 'Belső kiszolgálóhiba', 'Serveri sisemine viga'],
  ['Request could not be processed', 'Die Anfrage konnte nicht verarbeitet werden', 'La requête n\'a pas pu être traitée', 'Het verzoek kon niet worden verwerkt', 'A kérés nem dolgozható fel', 'Päringut ei saanud töödelda'],
  ['Empty file', 'Leere Datei', 'Fichier vide', 'Leeg bestand', 'Üres fájl', 'Tühi fail'],
  ['Logo too large (max 512 kB)', 'Logo zu groß (höchstens 512 kB)', 'Logo trop volumineux (512 ko maximum)', 'Logo te groot (maximaal 512 kB)', 'A logó túl nagy (legfeljebb 512 kB)', 'Logo on liiga suur (kuni 512 kB)'],
  ['Only PNG and JPEG images are accepted', 'Nur PNG- und JPEG-Bilder werden angenommen', 'Seules les images PNG et JPEG sont acceptées', 'Alleen PNG- en JPEG-afbeeldingen worden geaccepteerd', 'Csak PNG és JPEG képek fogadhatók el', 'Aktsepteeritakse ainult PNG- ja JPEG-pilte'],
  ['Image dimensions invalid (max 4000 px)', 'Bildmaße ungültig (höchstens 4000 px)', 'Dimensions de l’image invalides (4000 px maximum)', 'Afbeeldingsafmetingen ongeldig (maximaal 4000 px)', 'Érvénytelen képméret (legfeljebb 4000 px)', 'Pildi mõõtmed on kehtetud (kuni 4000 px)'],
  ['No logo set', 'Kein Logo gesetzt', 'Aucun logo défini', 'Geen logo ingesteld', 'Nincs logó beállítva', 'Logo pole seatud'],
  ['Invalid image data', 'Ungültige Bilddaten', 'Données d’image invalides', 'Ongeldige afbeeldingsgegevens', 'Érvénytelen képadatok', 'Kehtetud pildiandmed'],
  ['Unknown document selection.', 'Unbekannte Dokumentauswahl.', 'Sélection de document inconnue.', 'Onbekende documentkeuze.', 'Ismeretlen dokumentumválasztás.', 'Tundmatu dokumendivalik.'],
  ['Unsupported language.', 'Nicht unterstützte Sprache.', 'Langue non prise en charge.', 'Niet-ondersteunde taal.', 'Nem támogatott nyelv.', 'Keel pole toetatud.'],
  ['The hint is too long (max 200 characters).', 'Der Hinweis ist zu lang (höchstens 200 Zeichen).', 'L’indice est trop long (200 caractères maximum).', 'De aanwijzing is te lang (maximaal 200 tekens).', 'A megjegyzés túl hosszú (legfeljebb 200 karakter).', 'Vihje on liiga pikk (kuni 200 märki).'],
  ['The hint contains characters that are not allowed.', 'Der Hinweis enthält nicht erlaubte Zeichen.', 'L’indice contient des caractères non autorisés.', 'De aanwijzing bevat niet-toegestane tekens.', 'A megjegyzés nem engedélyezett karaktereket tartalmaz.', 'Vihje sisaldab lubamatuid märke.'],
  ['The hint contains personal or technical data and is not sent.', 'Der Hinweis enthält personenbezogene oder technische Angaben und wird nicht gesendet.', 'L’indice contient des données personnelles ou techniques et n’est pas envoyé.', 'De aanwijzing bevat persoonlijke of technische gegevens en wordt niet verzonden.', 'A megjegyzés személyes vagy technikai adatokat tartalmaz, ezért nem kerül elküldésre.', 'Vihje sisaldab isiku- või tehnilisi andmeid ja seda ei saadeta.'],
  ['Set up two-factor authentication for your own account first; otherwise you would lock yourself out.', 'Richten Sie zuerst die Zwei-Faktor-Authentifizierung für Ihr eigenes Konto ein; sonst sperren Sie sich selbst aus.', 'Configurez d\'abord l\'authentification à deux facteurs pour votre propre compte ; sinon vous vous bloqueriez.', 'Stel eerst tweefactorauthenticatie in voor uw eigen account; anders sluit u uzelf buiten.', 'Először állítsa be a kétfaktoros hitelesítést a saját fiókjához; különben kizárná magát.', 'Seadistage esmalt oma konto kaheastmeline autentimine; muidu lukustaksite end välja.'],
  ['Invalid request.', 'Ungültige Anfrage.', 'Requête invalide.', 'Ongeldig verzoek.', 'Érvénytelen kérés.', 'Kehtetu päring.'],
  ['The CSV file could not be read.', 'Die CSV-Datei konnte nicht gelesen werden.', 'Le fichier CSV n’a pas pu être lu.', 'Het CSV-bestand kon niet worden gelezen.', 'A CSV-fájl nem olvasható.', 'CSV-faili ei õnnestunud lugeda.'],
  ['Only the data protection officer or an administrator may enter the DPO opinion.', 'Die Stellungnahme des DSB dürfen nur der DSB oder ein Administrator eintragen.', 'Seuls le délégué à la protection des données ou un administrateur peut saisir l’avis du DPD.', 'Alleen de functionaris voor gegevensbescherming of een beheerder mag het advies van de FG invoeren.', 'Az adatvédelmi tisztviselő véleményét csak az adatvédelmi tisztviselő vagy egy rendszergazda rögzítheti.', 'Andmekaitsespetsialisti arvamust võib sisestada ainult andmekaitsespetsialist või administraator.'],
  ['A new assessment cannot be approved directly.', 'Eine neue Folgenabschätzung kann nicht direkt freigegeben werden.', 'Une nouvelle analyse ne peut pas être approuvée directement.', 'Een nieuwe beoordeling kan niet direct worden goedgekeurd.', 'Új hatásvizsgálat nem hagyható jóvá közvetlenül.', 'Uut hindamist ei saa otse kinnitada.'],
  ['Approval requires the opinion of the data protection officer.', 'Die Freigabe setzt die Stellungnahme des Datenschutzbeauftragten voraus.', 'L’approbation requiert l’avis du délégué à la protection des données.', 'Goedkeuring vereist het advies van de functionaris voor gegevensbescherming.', 'A jóváhagyáshoz az adatvédelmi tisztviselő véleménye szükséges.', 'Kinnitamiseks on vaja andmekaitsespetsialisti arvamust.'],
  ['Approval requires a decision.', 'Die Freigabe setzt eine Entscheidung voraus.', 'L’approbation requiert une décision.', 'Goedkeuring vereist een beslissing.', 'A jóváhagyáshoz döntés szükséges.', 'Kinnitamiseks on vaja otsust.'],
  ['With a high residual risk, approval requires a justification or the consultation of the supervisory authority.', 'Bei hohem Restrisiko setzt die Freigabe eine Begründung oder die Konsultation der Aufsichtsbehörde voraus.', 'En cas de risque résiduel élevé, l’approbation requiert une justification ou la consultation de l’autorité de contrôle.', 'Bij een hoog restrisico vereist goedkeuring een motivering of raadpleging van de toezichthouder.', 'Magas maradványkockázat esetén a jóváhagyáshoz indokolás vagy a felügyeleti hatóság előzetes konzultációja szükséges.', 'Kõrge jääkriski korral nõuab kinnitamine põhjendust või järelevalveasutusega konsulteerimist.'],
  ['Approval is not possible.', 'Die Freigabe ist nicht möglich.', 'L’approbation n’est pas possible.', 'Goedkeuring is niet mogelijk.', 'A jóváhagyás nem lehetséges.', 'Kinnitamine ei ole võimalik.'],
  ['Not found', 'Nicht gefunden', 'Introuvable', 'Niet gevonden', 'Nem található', 'Ei leitud'],
  ['Invalid collection', 'Ungültige Sammlung', 'Collection invalide', 'Ongeldige verzameling', 'Érvénytelen gyűjtemény', 'Kehtetu kogu'],
  ['No file uploaded', 'Keine Datei hochgeladen', 'Aucun fichier téléversé', 'Geen bestand geüpload', 'Nincs feltöltött fájl', 'Faili pole üles laaditud'],
  ['File not found', 'Datei nicht gefunden', 'Fichier introuvable', 'Bestand niet gevonden', 'A fájl nem található', 'Faili ei leitud'],
  ['File not found on disk', 'Datei auf dem Datenträger nicht gefunden', 'Fichier introuvable sur le disque', 'Bestand niet gevonden op schijf', 'A fájl nem található a lemezen', 'Faili ei leitud kettalt'],
  ['Attachment not found', 'Anhang nicht gefunden', 'Pièce jointe introuvable', 'Bijlage niet gevonden', 'A melléklet nem található', 'Manust ei leitud'],
  ['Forbidden', 'Zugriff verweigert', 'Accès refusé', 'Toegang geweigerd', 'Hozzáférés megtagadva', 'Keelatud'],
  ['Forbidden: insufficient permissions', 'Zugriff verweigert: unzureichende Berechtigung', 'Accès refusé : droits insuffisants', 'Toegang geweigerd: onvoldoende rechten', 'Hozzáférés megtagadva: nincs elég jogosultság', 'Keelatud: puudulikud õigused'],
  ['Insufficient role', 'Unzureichende Rolle', 'Rôle insuffisant', 'Onvoldoende rol', 'Nem megfelelő szerepkör', 'Puudulik roll'],
  ['Invalid status', 'Ungültiger Status', 'Statut invalide', 'Ongeldige status', 'Érvénytelen állapot', 'Kehtetu olek'],
  ['Already in this status', 'Bereits in diesem Status', 'Déjà dans ce statut', 'Al in deze status', 'Már ebben az állapotban van', 'Juba selles olekus'],
  ['Transition {from} → {to} not allowed', 'Statuswechsel {from} → {to} nicht erlaubt', 'Transition {from} → {to} non autorisée', 'Overgang {from} → {to} niet toegestaan', 'A(z) {from} → {to} átmenet nem engedélyezett', 'Üleminek {from} → {to} ei ole lubatud'],
  ["Role '{role}' insufficient. Requires '{min}'", "Rolle '{role}' reicht nicht aus. Erforderlich: '{min}'", "Rôle '{role}' insuffisant. Requis : '{min}'", "Rol '{role}' is onvoldoende. Vereist: '{min}'", "A(z) '{role}' szerepkör nem elég. Szükséges: '{min}'", 'Roll \'{role}\' ei piisa. Nõutav on \'{min}\''],
  ['Missing required fields', 'Pflichtfelder fehlen', 'Champs obligatoires manquants', 'Verplichte velden ontbreken', 'Hiányzó kötelező mezők', 'Kohustuslikud väljad puuduvad'],
  ['Not authenticated', 'Nicht angemeldet', 'Non authentifié', 'Niet aangemeld', 'Nincs bejelentkezve', 'Autentimata'],
  ['Invalid sync key', 'Ungültiger Zugangsschlüssel', "Clé d'accès invalide", 'Ongeldige toegangssleutel', 'Érvénytelen hozzáférési kulcs', 'Kehtetu sünkroonimisvõti'],
  ['Sync key is disabled or expired', 'Zugangsschlüssel ist gesperrt oder abgelaufen', "La clé d'accès est désactivée ou expirée", 'Toegangssleutel is geblokkeerd of verlopen', 'A hozzáférési kulcs le van tiltva vagy lejárt', 'Sünkroonimisvõti on keelatud või aegunud'],
  ['Invalid permissions', 'Ungültige Rechte', 'Droits invalides', 'Ongeldige rechten', 'Érvénytelen jogosultságok', 'Kehtetud õigused'],
  ['Invalid or expired setup code', 'Einrichtungscode ungültig oder abgelaufen', "Code de configuration invalide ou expiré", 'Installatiecode ongeldig of verlopen', 'A beállítási kód érvénytelen vagy lejárt', 'Kehtetu või aegunud seadistuskood'],
  ['Title is required', 'Der Titel ist erforderlich', 'Le titre est obligatoire', 'Titel is verplicht', 'A cím megadása kötelező', 'Pealkiri on kohustuslik'],
  ['Unknown SoA control: {id}', 'Unbekanntes SoA-Control: {id}', 'Contrôle SoA inconnu : {id}', 'Onbekende SoA-control: {id}', 'Ismeretlen SoA-kontroll: {id}', 'Tundmatu SoA meede: {id}'],
  ['Unknown finding: {id}', 'Unbekannte Feststellung: {id}', 'Constat inconnu : {id}', 'Onbekende bevinding: {id}', 'Ismeretlen megállapítás: {id}', 'Tundmatu tähelepanek: {id}'],
  ['linkedControls must be a list', 'linkedControls muss eine Liste sein', 'linkedControls doit être une liste', 'linkedControls moet een lijst zijn', 'A linkedControls értékének listának kell lennie', 'linkedControls peab olema loend'],
  ['linkedFindings must be a list', 'linkedFindings muss eine Liste sein', 'linkedFindings doit être une liste', 'linkedFindings moet een lijst zijn', 'A linkedFindings értékének listának kell lennie', 'linkedFindings peab olema loend'],
  ['Unknown risk: {id}', 'Unbekanntes Risiko: {id}', 'Risque inconnu : {id}', 'Onbekend risico: {id}', 'Ismeretlen kockázat: {id}', 'Tundmatu risk: {id}'],
  ['linkedRisks must be a list', 'linkedRisks muss eine Liste sein', 'linkedRisks doit être une liste', 'linkedRisks moet een lijst zijn', 'A linkedRisks értékének listának kell lennie', 'linkedRisks peab olema loend'],
  ['Request body too large', 'Anfrage zu groß', 'Requête trop volumineuse', 'Verzoek te groot', 'A kérés túl nagy', 'Päringu sisu on liiga suur'],
  ['Invalid JSON in request body', 'Ungültiges JSON in der Anfrage', 'JSON invalide dans la requête', 'Ongeldige JSON in het verzoek', 'Érvénytelen JSON a kérésben', 'Päringu sisus on kehtetu JSON'],
  ['Demo reset is only available with STORAGE_BACKEND=json (current: {backend}). It is a demo function; for other backends use scripts/prepare-production.js or empty the database.',
   'Den Demo-Reset gibt es nur mit STORAGE_BACKEND=json (aktuell: {backend}). Er ist eine Demo-Funktion; bei anderen Backends scripts/prepare-production.js nutzen oder die Datenbank selbst leeren.',
   "La réinitialisation de la démo n'existe qu'avec STORAGE_BACKEND=json (actuel : {backend}). C'est une fonction de démonstration ; pour les autres backends, utilisez scripts/prepare-production.js ou videz la base de données.",
   'De demo-reset bestaat alleen met STORAGE_BACKEND=json (nu: {backend}). Het is een demofunctie; gebruik bij andere backends scripts/prepare-production.js of maak de database zelf leeg.',
   'A demó visszaállítása csak STORAGE_BACKEND=json esetén érhető el (jelenleg: {backend}). Ez egy demófunkció; más háttértárak esetén használja a scripts/prepare-production.js szkriptet, vagy ürítse ki az adatbázist.', 'Demo lähtestamine on saadaval ainult väärtusega STORAGE_BACKEND=json (praegu: {backend}). See on demofunktsioon; teiste taustasüsteemide jaoks kasuta skripti scripts/prepare-production.js või tühjenda andmebaas.'],
  ['Demo import is only available with STORAGE_BACKEND=json (current: {backend}). It is a demo function and not a backup or migration tool.',
   'Der Demo-Import gibt es nur mit STORAGE_BACKEND=json (aktuell: {backend}). Er ist eine Demo-Funktion und kein Backup- oder Migrationswerkzeug.',
   "L'import de démonstration n'existe qu'avec STORAGE_BACKEND=json (actuel : {backend}). C'est une fonction de démonstration, pas un outil de sauvegarde ou de migration.",
   'De demo-import bestaat alleen met STORAGE_BACKEND=json (nu: {backend}). Het is een demofunctie en geen back-up- of migratiehulpmiddel.',
   'A demóimport csak STORAGE_BACKEND=json esetén érhető el (jelenleg: {backend}). Demófunkció, nem mentési vagy migrációs eszköz.', 'Demo import on saadaval ainult väärtusega STORAGE_BACKEND=json (praegu: {backend}). See on demofunktsioon, mitte varundus- ega migreerimisvahend.'],
  ['Invalid server address', 'Ungültige Server-Adresse', 'Adresse de serveur invalide', 'Ongeldig serveradres', 'Érvénytelen szervercím', 'Kehtetu serveri aadress'],
  ['Grant access to at least one module', 'Mindestens ein Modul freigeben', 'Autoriser au moins un module', 'Geef toegang tot minstens één module', 'Legalább egy modulhoz adjon hozzáférést', 'Anna juurdepääs vähemalt ühele moodulile'],
  ['Name is required', 'Name ist erforderlich', 'Le nom est obligatoire', 'Naam is verplicht', 'A név megadása kötelező', 'Nimi on kohustuslik'],
  ['A sync account with this name already exists', 'Ein Sync-Konto mit diesem Namen existiert bereits', 'Un compte de synchronisation portant ce nom existe déjà', 'Er bestaat al een synchronisatieaccount met deze naam', 'Már létezik ilyen nevű szinkronfiók', 'Selle nimega sünkroonimiskonto on juba olemas'],
  ['Invalid expiry date', 'Ungültiges Ablaufdatum', "Date d'expiration invalide", 'Ongeldige vervaldatum', 'Érvénytelen lejárati dátum', 'Kehtetu aegumiskuupäev'],
  ['Sync supports only STORAGE_BACKEND=json (current: {backend})', 'Sync unterstützt nur STORAGE_BACKEND=json (aktuell: {backend})', 'La synchronisation ne prend en charge que STORAGE_BACKEND=json (actuel : {backend})', 'Synchronisatie ondersteunt alleen STORAGE_BACKEND=json (nu: {backend})', 'A szinkronizálás csak a STORAGE_BACKEND=json beállítást támogatja (jelenleg: {backend})', 'Sünkroonimine toetab ainult väärtust STORAGE_BACKEND=json (praegu: {backend})'],
  ['Unknown modules: {list}', 'Unbekannte Module: {list}', 'Modules inconnus : {list}', 'Onbekende modules: {list}', 'Ismeretlen modulok: {list}', 'Tundmatud moodulid: {list}'],
  ['since is not a valid ISO timestamp', 'since ist kein gültiger ISO-Zeitstempel', "since n'est pas un horodatage ISO valide", 'since is geen geldige ISO-tijdstempel', 'A since nem érvényes ISO időbélyeg', 'since ei ole kehtiv ISO ajatempel'],
  ['Invalid body: changes object expected', 'Ungültiger Body: changes-Objekt erwartet', 'Corps invalide : objet changes attendu', 'Ongeldige body: changes-object verwacht', 'Érvénytelen törzs: changes objektum szükséges', 'Kehtetu sisu: oodatud changes-objekt'],
  ['Sync protocol {client} not supported (server: {server})', 'Sync-Protokoll {client} nicht unterstützt (Server: {server})', 'Protocole de synchronisation {client} non pris en charge (serveur : {server})', 'Synchronisatieprotocol {client} wordt niet ondersteund (server: {server})', 'A(z) {client} szinkronizációs protokoll nem támogatott (szerver: {server})', 'Sünkroonimisprotokolli {client} ei toetata (server: {server})'],
  ['Unknown dependencies', 'Unbekannte Abhängigkeiten', 'Dépendances inconnues', 'Onbekende afhankelijkheden', 'Ismeretlen függőségek', 'Tundmatud sõltuvused'],
  ['Circular dependency', 'Zirkuläre Abhängigkeit', 'Dépendance circulaire', 'Circulaire afhankelijkheid', 'Körkörös függőség', 'Ringsõltuvus'],
  ['Unknown phase', 'Unbekannte Phase', 'Phase inconnue', 'Onbekende fase', 'Ismeretlen fázis', 'Tundmatu etapp'],
  ['No valid time of becoming aware', 'Kein gültiger Zeitpunkt der Kenntnisnahme', "Aucun moment valide de prise de connaissance", 'Geen geldig tijdstip van kennisname', 'Érvénytelen tudomásszerzési időpont', 'Kehtivat teadasaamise aega pole'],
  ['category and title are required', 'Kategorie und Titel sind erforderlich', 'La catégorie et le titre sont obligatoires', 'Categorie en titel zijn verplicht', 'A kategória és a cím megadása kötelező', 'category ja title on kohustuslikud'],
  ['Only for email campaigns', 'Nur für E-Mail-Kampagnen', 'Uniquement pour les campagnes par e-mail', 'Alleen voor e-mailcampagnes', 'Csak e-mailes kampányokhoz', 'Ainult e-posti kampaaniate jaoks'],
  ['This password is a well-known demo password and is not allowed in production.', 'Dieses Passwort ist ein bekanntes Demo-Passwort und im Produktivbetrieb nicht erlaubt.', 'Ce mot de passe est un mot de passe de démonstration connu et n\'est pas autorisé en production.', 'Dit wachtwoord is een bekend demowachtwoord en is niet toegestaan in productie.', 'Ez egy ismert demójelszó, éles üzemben nem engedélyezett.', 'See parool on üldtuntud demoparool ja tootmises ei ole lubatud.'],
  ['Demo password blocked in production', 'Demo-Passwort im Produktivbetrieb gesperrt. Das Passwort muss neu gesetzt werden (Administrator oder Kommandozeile).', 'Mot de passe de démonstration bloqué en production. Le mot de passe doit être redéfini (administrateur ou ligne de commande).', 'Demowachtwoord geblokkeerd in productie. Het wachtwoord moet opnieuw worden ingesteld (beheerder of opdrachtregel).', 'A demójelszó éles üzemben le van tiltva. A jelszót újra kell állítani (rendszergazda vagy parancssor).', 'Demoparool on tootmises blokeeritud'],
  ['This function is disabled in the public demo.', 'Diese Funktion ist in der öffentlichen Demo deaktiviert.', 'Cette fonction est désactivée dans la démo publique.', 'Deze functie is uitgeschakeld in de openbare demo.', 'Ez a funkció a nyilvános demóban le van tiltva.', 'See funktsioon on avalikus demos keelatud.'],
  ['Password must be at least 8 characters', 'Passwort muss mindestens 8 Zeichen haben', 'Le mot de passe doit comporter au moins 8 caractères', 'Het wachtwoord moet minstens 8 tekens bevatten', 'A jelszónak legalább 8 karakter hosszúnak kell lennie', 'Parool peab olema vähemalt 8 märki pikk'],
  ['Invalid list', 'Ungültige Liste', 'Liste invalide', 'Ongeldige lijst', 'Érvénytelen lista', 'Kehtetu loend'],
  ['Unknown list id', 'Unbekannte Listen-ID', 'Identifiant de liste inconnu', 'Onbekende lijst-ID', 'Ismeretlen lista-azonosító', 'Tundmatu loendi ID'],
  ['Invalid credentials', 'Ungültige Zugangsdaten', 'Identifiants invalides', 'Ongeldige inloggegevens', 'Érvénytelen hitelesítő adatok', 'Kehtetud andmed'],
  ['User not found', 'Benutzer nicht gefunden', 'Utilisateur introuvable', 'Gebruiker niet gevonden', 'A felhasználó nem található', 'Kasutajat ei leitud'],
  ['User exists', 'Benutzer existiert bereits', "L'utilisateur existe déjà", 'Gebruiker bestaat al', 'A felhasználó már létezik', 'Kasutaja on juba olemas'],
  ['GitHub API responded with {status}', 'GitHub-API antwortete mit {status}', "L'API GitHub a répondu avec {status}", 'GitHub-API antwoordde met {status}', 'A GitHub API ezzel válaszolt: {status}', 'GitHubi API vastas: {status}'],
  ['Base URL, username and app password are required', 'Basis-URL, Benutzername und App-Passwort sind erforderlich', "L'URL de base, le nom d'utilisateur et le mot de passe d'application sont obligatoires", 'Basis-URL, gebruikersnaam en app-wachtwoord zijn verplicht', 'Az alap URL, a felhasználónév és az alkalmazásjelszó megadása kötelező', 'Baas-URL, kasutajanimi ja rakenduse parool on kohustuslikud'],
  ['Login failed (check username/app password)', 'Anmeldung fehlgeschlagen (Benutzername/App-Passwort prüfen)', "Échec de la connexion (vérifiez le nom d'utilisateur / mot de passe d'application)", 'Inloggen mislukt (controleer gebruikersnaam/app-wachtwoord)', 'A bejelentkezés sikertelen (ellenőrizze a felhasználónevet / alkalmazásjelszót)', 'Sisselogimine ebaõnnestus (kontrolli kasutajanime/rakenduse parooli)'],
  ['Base URL not found (404)', 'Basis-URL nicht gefunden (404)', 'URL de base introuvable (404)', 'Basis-URL niet gevonden (404)', 'Az alap URL nem található (404)', 'Baas-URL-i ei leitud (404)'],
  ['Unexpected response: {status} {text}', 'Unerwartete Antwort: {status} {text}', 'Réponse inattendue : {status} {text}', 'Onverwacht antwoord: {status} {text}', 'Váratlan válasz: {status} {text}', 'Ootamatu vastus: {status} {text}'],
  ['WebDAV publish is not configured or disabled', 'WebDAV-Publish ist nicht konfiguriert oder deaktiviert', "La publication WebDAV n'est pas configurée ou est désactivée", 'WebDAV-publicatie is niet geconfigureerd of uitgeschakeld', 'A WebDAV-közzététel nincs beállítva vagy ki van kapcsolva', 'WebDAV-i avaldamine on seadistamata või keelatud'],
  ['email, incidentType and description are required.', 'email, incidentType und description sind Pflichtfelder.', "email, incidentType et description sont obligatoires.", 'email, incidentType en description zijn verplicht.', 'Az email, az incidentType és a description kötelező.', 'email, incidentType ja description on kohustuslikud.'],
  ['Invalid mode', 'Ungültiger Modus', 'Mode invalide', 'Ongeldige modus', 'Érvénytelen mód', 'Kehtetu režiim'],
  ['templateId missing', 'templateId fehlt', 'templateId manquant', 'templateId ontbreekt', 'Hiányzik a templateId', 'templateId puudub'],
  ['Only approved policies can be distributed', 'Nur freigegebene (approved) Richtlinien können verteilt werden', 'Seules les politiques approuvées peuvent être diffusées', 'Alleen goedgekeurde beleidsdocumenten kunnen worden verspreid', 'Csak jóváhagyott szabályzatok küldhetők ki', 'Levitada võib ainult kinnitatud poliitikaid'],
  ['rows[] expected', 'rows[] erwartet', 'rows[] attendu', 'rows[] verwacht', 'rows[] szükséges', 'Oodatud rows[]'],
  ['updates must be array', 'updates muss ein Array sein', 'updates doit être un tableau', 'updates moet een array zijn', 'Az updates tömb kell legyen', 'updates peab olema massiiv'],
  ['Approved documents cannot be edited. Set the status back to review first.', 'Freigegebene Dokumente können nicht bearbeitet werden. Status zuerst auf „Review“ zurücksetzen.', "Les documents approuvés ne peuvent pas être modifiés. Repassez d'abord le statut en « révision ».", 'Goedgekeurde documenten kunnen niet worden bewerkt. Zet de status eerst terug naar beoordeling.', 'A jóváhagyott dokumentumok nem szerkeszthetők. Előbb állítsa vissza az állapotot felülvizsgálatra.', 'Kinnitatud dokumente ei saa muuta. Sea olek esmalt tagasi ülevaatusele.'],
  ['Circular link not allowed', 'Zirkuläre Verknüpfung nicht erlaubt', 'Lien circulaire non autorisé', 'Circulaire koppeling niet toegestaan', 'A körkörös kapcsolat nem engedélyezett', 'Ringviide pole lubatud'],
  ['status is required', 'Status ist erforderlich', 'Le statut est obligatoire', 'Status is verplicht', 'Az állapot megadása kötelező', 'status on kohustuslik'],
  ['Storage error', 'Speicherfehler', 'Erreur de stockage', 'Opslagfout', 'Tárolási hiba', 'Salvestusviga'],
  ['Document not found', 'Template nicht gefunden', 'Document introuvable', 'Document niet gevonden', 'A dokumentum nem található', 'Dokumenti ei leitud'],
  ['name is required', 'Name ist erforderlich', 'Le nom est obligatoire', 'Naam is verplicht', 'A név megadása kötelező', 'name on kohustuslik'],
  ['AI integration disabled', 'KI-Integration deaktiviert', 'Intégration IA désactivée', 'AI-integratie uitgeschakeld', 'Az MI-integráció ki van kapcsolva', 'TI-integratsioon keelatud'],
  ['AI integration is disabled (admin setting).', 'KI-Integration ist deaktiviert (Admin-Einstellung).', "L'intégration IA est désactivée (paramètre administrateur).", 'AI-integratie is uitgeschakeld (beheerdersinstelling).', 'Az MI-integráció ki van kapcsolva (adminisztrátori beállítás).', 'TI-integratsioon on keelatud (administraatori seade).'],
  ['title, type and language are required.', 'title, type und language sind erforderlich.', 'title, type et language sont obligatoires.', 'title, type en language zijn verplicht.', 'A title, a type és a language kötelező.', 'title, type ja language on kohustuslikud.'],
  ['sections must be an array', 'sections muss ein Array sein', 'sections doit être un tableau', 'sections moet een array zijn', 'A sections tömb kell legyen', 'sections peab olema massiiv'],
  ['username, email and role are required', 'username, email und role sind erforderlich', 'username, email et role sont obligatoires', 'username, email en role zijn verplicht', 'A username, az email és a role kötelező', 'username, email ja role on kohustuslikud'],
  ['Cannot delete your own account', 'Eigenen Account nicht löschbar', 'Impossible de supprimer votre propre compte', 'Het eigen account kan niet worden verwijderd', 'A saját fiók nem törölhető', 'Oma kontot ei saa kustutada'],
  ['Body must be an array', 'Body muss ein Array sein', 'Le corps doit être un tableau', 'Body moet een array zijn', 'A törzsnek tömbnek kell lennie', 'Sisu peab olema massiiv'],
  ['asset types still in use', 'Asset-Typen werden noch verwendet', "Types d'actifs encore utilisés", 'Assettypen zijn nog in gebruik', 'Az eszköztípusok még használatban vannak', 'varaliigid on veel kasutusel'],
  ['Recipient address missing', 'Empfängeradresse fehlt', 'Adresse du destinataire manquante', 'Ontvangersadres ontbreekt', 'Hiányzik a címzett címe', 'Saaja aadress puudub'],
  ['Invalid bundle format', 'Ungültiges Bundle-Format', 'Format de bundle invalide', 'Ongeldig bundle-formaat', 'Érvénytelen csomagformátum', 'Kehtetu paketivorming'],
  ['Unsupported language', 'Nicht unterstützte Sprache', 'Langue non prise en charge', 'Niet-ondersteunde taal', 'Nem támogatott nyelv', 'Keel pole toetatud'],
  ['Unsupported language. Use: de, en, fr, nl, hu', 'Nicht unterstützte Sprache. Erlaubt: de, en, fr, nl, hu', 'Langue non prise en charge. Utilisez : de, en, fr, nl, hu', 'Niet-ondersteunde taal. Gebruik: de, en, fr, nl, hu', 'Nem támogatott nyelv. Használható: de, en, fr, nl, hu', 'Keel pole toetatud. Kasuta: de, en, fr, nl, hu'],
  ["Demo bundle for '{lang}' not found", "Demo-Bundle für '{lang}' nicht gefunden", "Bundle de démonstration pour '{lang}' introuvable", "Demobundel voor '{lang}' niet gevonden", "A(z) '{lang}' demócsomag nem található", 'Keele \'{lang}\' demopaketti ei leitud'],
  ['Too many failed attempts. Please wait a moment and try again.', 'Zu viele Fehlversuche. Bitte kurz warten und erneut versuchen.', 'Trop de tentatives échouées. Veuillez patienter un instant et réessayer.', 'Te veel mislukte pogingen. Wacht even en probeer het opnieuw.', 'Túl sok sikertelen próbálkozás. Kérjük, várjon egy kicsit, és próbálja újra.', 'Liiga palju ebaõnnestunud katseid. Palun oota hetk ja proovi uuesti.'],
  ['2FA required', '2FA erforderlich', '2FA requise', '2FA vereist', '2FA szükséges', 'Vajalik on 2FA'],
  ['Invalid 2FA code', 'Ungültiger 2FA-Code', 'Code 2FA invalide', 'Ongeldige 2FA-code', 'Érvénytelen 2FA-kód', 'Kehtetu 2FA kood'],
  ['2FA verification failed', '2FA-Verifizierung fehlgeschlagen', 'Échec de la vérification 2FA', '2FA-verificatie mislukt', 'A 2FA-ellenőrzés sikertelen', '2FA kontroll ebaõnnestus'],
  ['2FA is mandatory for all users. Please contact the administrator to set up 2FA for your account.', '2FA ist für alle Benutzer verpflichtend. Bitte kontaktiere den Administrator, um 2FA für deinen Account einzurichten.', "La 2FA est obligatoire pour tous les utilisateurs. Veuillez contacter l'administrateur pour configurer la 2FA pour votre compte.", '2FA is voor alle gebruikers verplicht. Neem contact op met de beheerder om 2FA voor uw account in te stellen.', 'A 2FA minden felhasználó számára kötelező. Kérjük, forduljon az adminisztrátorhoz, hogy beállítsa a 2FA-t a fiókjához.', '2FA on kõigile kasutajatele kohustuslik. Palun pöördu administraatori poole, et ta seadistaks sinu kontole 2FA.'],
  ['Current and new password required (min. 8 characters).', 'Aktuelles und neues Passwort erforderlich (min. 8 Zeichen).', 'Mot de passe actuel et nouveau mot de passe requis (8 caractères min.).', 'Huidig en nieuw wachtwoord vereist (min. 8 tekens).', 'A jelenlegi és az új jelszó megadása kötelező (legalább 8 karakter).', 'Praegune ja uus parool on nõutavad (vähemalt 8 märki).'],
  ['Current password is incorrect.', 'Aktuelles Passwort ist falsch.', 'Le mot de passe actuel est incorrect.', 'Het huidige wachtwoord is onjuist.', 'A jelenlegi jelszó helytelen.', 'Praegune parool on vale.'],
  ['Password change required', 'Passwortänderung erforderlich', 'Changement de mot de passe requis', 'Wachtwoordwijziging vereist', 'Jelszócsere szükséges', 'Vajalik on parooli muutmine'],
  ['The new password must differ from the current one.', 'Das neue Passwort muss sich vom bisherigen unterscheiden.', 'Le nouveau mot de passe doit être différent de l’actuel.', 'Het nieuwe wachtwoord moet verschillen van het huidige.', 'Az új jelszónak különböznie kell a jelenlegitől.', 'Uus parool peab erinema praegusest.'],
  ['No 2FA secret found. Please call /2fa/setup first.', 'Kein 2FA-Secret gefunden. Bitte zuerst /2fa/setup aufrufen.', "Aucun secret 2FA trouvé. Veuillez d'abord appeler /2fa/setup.", 'Geen 2FA-geheim gevonden. Roep eerst /2fa/setup aan.', 'Nem található 2FA-titkos kulcs. Kérjük, előbb hívja meg a /2fa/setup végpontot.', '2FA salajast võtit ei leitud. Palun käivita esmalt /2fa/setup.'],
  ['Invalid code', 'Ungültiger Code', 'Code invalide', 'Ongeldige code', 'Érvénytelen kód', 'Kehtetu kood'],
  ['Control not found', 'Control nicht gefunden', 'Contrôle introuvable', 'Control niet gevonden', 'A kontroll nem található', 'Meedet ei leitud'],
  ['Parse error: {msg}', 'Lesefehler: {msg}', 'Erreur de lecture : {msg}', 'Leesfout: {msg}', 'Olvasási hiba: {msg}', 'Parsimisviga: {msg}'],
  ['Expected JSON array of controls', 'JSON-Array von Controls erwartet', 'Tableau JSON de contrôles attendu', 'JSON-array van controls verwacht', 'Kontrollok JSON-tömbje szükséges', 'Oodatud meetmete JSON-massiiv'],
  ['No valid controls found', 'Keine gültigen Controls gefunden', 'Aucun contrôle valide trouvé', 'Geen geldige controls gevonden', 'Nem található érvényes kontroll', 'Kehtivaid meetmeid ei leitud'],
  ['Not found or not a custom control', 'Nicht gefunden oder kein eigenes Control', 'Introuvable ou pas un contrôle personnalisé', 'Niet gevonden of geen eigen control', 'Nem található, vagy nem egyéni kontroll', 'Ei leitud või pole oma meede'],
  ['Cannot delete built-in controls', 'Mitgelieferte Controls können nicht gelöscht werden', 'Les contrôles fournis ne peuvent pas être supprimés', 'Meegeleverde controls kunnen niet worden verwijderd', 'A beépített kontrollok nem törölhetők', 'Sisseehitatud meetmeid ei saa kustutada'],
  ['Control is linked to templates — unlink first', 'Control ist mit Dokumenten verknüpft — zuerst Verknüpfung lösen', "Le contrôle est lié à des documents — supprimez d'abord les liens", 'Control is gekoppeld aan documenten — verwijder eerst de koppeling', 'A kontroll dokumentumokhoz van kapcsolva — előbb szüntesse meg a kapcsolatot', 'Meede on dokumentidega seotud — eemalda seosed esmalt'],
  ['Unknown asset type', 'Unbekannter Asset-Typ', "Type d'actif inconnu", 'Onbekend assettype', 'Ismeretlen eszköztípus', 'Tundmatu varaliik'],
  ['supplierId required', 'supplierId erforderlich', 'supplierId requis', 'supplierId vereist', 'A supplierId kötelező', 'supplierId on nõutav'],
  ['Supplier not found', 'Lieferant nicht gefunden', 'Fournisseur introuvable', 'Leverancier niet gevonden', 'A szállító nem található', 'Tarnijat ei leitud'],
  ['At least contentowner role required', 'Mindestens contentowner-Rolle erforderlich', 'Rôle contentowner au minimum requis', 'Minimaal de rol contentowner vereist', 'Legalább contentowner szerepkör szükséges', 'Nõutav on vähemalt sisuomaniku roll'],
  ['At least auditor role required', 'Mindestens auditor-Rolle erforderlich', 'Rôle auditor au minimum requis', 'Minimaal de rol auditor vereist', 'Legalább auditor szerepkör szükséges', 'Nõutav on vähemalt audiitori roll'],
  ['At least editor role required', 'Mindestens editor-Rolle erforderlich', 'Rôle editor au minimum requis', 'Minimaal de rol editor vereist', 'Legalább editor szerepkör szükséges', 'Nõutav on vähemalt toimetaja roll'],
  ['At least auditor or contentowner role required', 'Mindestens auditor- oder contentowner-Rolle erforderlich', 'Rôle auditor ou contentowner au minimum requis', 'Minimaal de rol auditor of contentowner vereist', 'Legalább auditor vagy contentowner szerepkör szükséges', 'Nõutav on vähemalt audiitori või sisuomaniku roll'],
  ['At least auditor or contentowner role, or being the registered owner, required', 'Mindestens auditor- oder contentowner-Rolle oder eingetragener Owner erforderlich', 'Rôle auditor ou contentowner, ou propriétaire enregistré, requis', 'Minimaal de rol auditor of contentowner, of de geregistreerde eigenaar, vereist', 'Legalább auditor vagy contentowner szerepkör, illetve a bejegyzett tulajdonos szükséges', 'Nõutav on vähemalt audiitori või sisuomaniku roll või registreeritud omanik olemine'],
  ['AV not found', 'AV-Vertrag nicht gefunden', 'Contrat de sous-traitance introuvable', 'Verwerkersovereenkomst niet gevonden', 'Az adatfeldolgozói szerződés nem található', 'Volitatud töötleja lepingut ei leitud'],
  ['Finding not found', 'Feststellung nicht gefunden', 'Constat introuvable', 'Bevinding niet gevonden', 'A megállapítás nem található', 'Tähelepanekut ei leitud'],
  ['Risk not found', 'Risiko nicht gefunden', 'Risque introuvable', 'Risico niet gevonden', 'A kockázat nem található', 'Riski ei leitud'],
  ['Audit not found', 'Audit nicht gefunden', 'Audit introuvable', 'Audit niet gevonden', 'Az audit nem található', 'Auditit ei leitud'],
  ['A finding already exists for this item', 'Für diesen Prüfpunkt existiert bereits eine Feststellung', 'Un constat existe déjà pour ce point', 'Voor dit controlepunt bestaat al een bevinding', 'Ehhez az ellenőrzőponthoz már létezik megállapítás', 'Selle kirje kohta on tähelepanek juba olemas'],
  ['Approved programs cannot be edited. Reopen the program first.', 'Freigegebene Programme können nicht bearbeitet werden. Zuerst in den Entwurf zurücksetzen.', "Les programmes approuvés ne peuvent pas être modifiés. Repassez-les d'abord en brouillon.", 'Goedgekeurde programma’s kunnen niet worden bewerkt. Zet het programma eerst terug naar concept.', 'A jóváhagyott programok nem szerkeszthetők. Előbb állítsa vissza a programot tervezetbe.', 'Kinnitatud kavu ei saa muuta. Ava kava esmalt uuesti.'],
  ['Only .xml or .pdf files are supported', 'Nur .xml oder .pdf Dateien werden unterstützt', 'Seuls les fichiers .xml ou .pdf sont pris en charge', 'Alleen .xml- of .pdf-bestanden worden ondersteund', 'Csak .xml vagy .pdf fájlok támogatottak', 'Toetatakse ainult .xml- või .pdf-faile'],
  ['Parsing failed: {msg}', 'Parsing fehlgeschlagen: {msg}', "Échec de l'analyse : {msg}", 'Parsen mislukt: {msg}', 'Az elemzés sikertelen: {msg}', 'Parsimine ebaõnnestus: {msg}'],
  ['No vulnerabilities found in the report (CVSS > 0)', 'Keine Schwachstellen im Report gefunden (CVSS > 0)', "Aucune vulnérabilité trouvée dans le rapport (CVSS > 0)", 'Geen kwetsbaarheden gevonden in het rapport (CVSS > 0)', 'Nem található sebezhetőség a jelentésben (CVSS > 0)', 'Aruandes haavatavusi ei leitud (CVSS > 0)'],
  ['spec required', 'Auswahl fehlt', 'sélection manquante', 'selectie ontbreekt', 'a kijelölés hiányzik', 'valik puudub'],
  ['catalog invalid', 'Katalog ungültig', 'catalogue invalide', 'catalogus ongeldig', 'érvénytelen katalógus', 'kataloog on vigane'],
  ['selection contains unknown question', 'Auswahl enthält eine unbekannte Frage', 'la sélection contient une question inconnue', 'selectie bevat een onbekende vraag', 'a kijelölés ismeretlen kérdést tartalmaz', 'valik sisaldab tundmatut küsimust'],
  ['selection contains duplicates', 'Auswahl enthält Doppelte', 'la sélection contient des doublons', 'selectie bevat dubbele vragen', 'a kijelölés duplikátumokat tartalmaz', 'valik sisaldab duplikaate'],
  ['too many custom questions', 'Zu viele eigene Fragen', 'trop de questions personnalisées', 'te veel eigen vragen', 'túl sok saját kérdés', 'liiga palju oma küsimusi'],
  ['custom question text invalid', 'Text der eigenen Frage ungültig', 'texte de la question personnalisée invalide', 'tekst van eigen vraag ongeldig', 'a saját kérdés szövege érvénytelen', 'oma küsimuse tekst on vigane'],
  ['custom question type invalid', 'Typ der eigenen Frage ungültig', 'type de la question personnalisée invalide', 'type van eigen vraag ongeldig', 'a saját kérdés típusa érvénytelen', 'oma küsimuse tüüp on vigane'],
  ['at least one question required', 'Mindestens eine Frage erforderlich', 'au moins une question est requise', 'minstens één vraag vereist', 'legalább egy kérdés szükséges', 'vähemalt üks küsimus on nõutav'],
  ['too many questions', 'Zu viele Fragen', 'trop de questions', 'te veel vragen', 'túl sok kérdés', 'liiga palju küsimusi'],
  ['name required (max 120)', 'Name erforderlich (höchstens 120 Zeichen)', 'nom requis (120 caractères au maximum)', 'naam vereist (maximaal 120 tekens)', 'a név kötelező (legfeljebb 120 karakter)', 'nimi on nõutav (kuni 120 märki)'],
  ['description too long (max 500)', 'Beschreibung zu lang (höchstens 500 Zeichen)', 'description trop longue (500 caractères au maximum)', 'beschrijving te lang (maximaal 500 tekens)', 'a leírás túl hosszú (legfeljebb 500 karakter)', 'kirjeldus on liiga pikk (kuni 500 märki)'],
  ['name already exists', 'Name existiert bereits', 'ce nom existe déjà', 'naam bestaat al', 'a név már létezik', 'nimi on juba olemas'],
  ['not found', 'nicht gefunden', 'introuvable', 'niet gevonden', 'nem található', 'ei leitud'],
  ['Built-in templates cannot be changed', 'Eingebaute Vorlagen können nicht geändert werden', 'Les modèles intégrés ne peuvent pas être modifiés', 'Ingebouwde sjablonen kunnen niet worden gewijzigd', 'A beépített sablonok nem módosíthatók', 'Sisseehitatud malle ei saa muuta'],
  ['Built-in templates cannot be deleted', 'Eingebaute Vorlagen können nicht gelöscht werden', 'Les modèles intégrés ne peuvent pas être supprimés', 'Ingebouwde sjablonen kunnen niet worden verwijderd', 'A beépített sablonok nem törölhetők', 'Sisseehitatud malle ei saa kustutada'],
  ['questions invalid', 'Fragen ungültig', 'questions invalides', 'vragen ongeldig', 'érvénytelen kérdések', 'küsimused on vigased'],
  ['Template not found', 'Vorlage nicht gefunden', 'Modèle introuvable', 'Sjabloon niet gevonden', 'A sablon nem található', 'Malli ei leitud'],
  ['Portal not enabled', 'Briefkasten nicht aktiviert', 'Boîte aux lettres non activée', 'Brievenbus niet geactiveerd', 'A postaláda nincs bekapcsolva', 'Postkast pole lubatud'],
  ['Portal unreachable: ', 'Briefkasten nicht erreichbar: ', 'Boîte aux lettres injoignable : ', 'Brievenbus niet bereikbaar: ', 'A postaláda nem érhető el: ', 'Postkast pole kättesaadav: '],
  ['Portal not fully configured', 'Briefkasten nicht vollständig eingerichtet (Adresse, API-Schlüssel und Schlüsselpaar nötig)', 'Boîte aux lettres incomplètement configurée (adresse, clé API et paire de clés requises)', 'Brievenbus niet volledig ingesteld (adres, API-sleutel en sleutelpaar nodig)', 'A postaláda beállítása hiányos (cím, API-kulcs és kulcspár szükséges)', 'Postkast pole täielikult seadistatud (vaja on aadressi, API-võtit ja võtmepaari)'],
  ['Portal URL invalid (https required)', 'Adresse ungültig (https erforderlich)', 'Adresse invalide (https requis)', 'Adres ongeldig (https vereist)', 'Érvénytelen cím (https szükséges)', 'Aadress on vigane (vajalik https)'],
  ['API key invalid (at least 32 characters)', 'API-Schlüssel ungültig (mindestens 32 Zeichen)', 'Clé API invalide (32 caractères au minimum)', 'API-sleutel ongeldig (minstens 32 tekens)', 'Érvénytelen API-kulcs (legalább 32 karakter)', 'API-võti on vigane (vähemalt 32 märki)'],
  ['Key already exists', 'Schlüssel existiert bereits', 'La clé existe déjà', 'Sleutel bestaat al', 'A kulcs már létezik', 'Võti on juba olemas'],
  ['Key missing', 'Schlüssel fehlt', 'Clé manquante', 'Sleutel ontbreekt', 'A kulcs hiányzik', 'Võti puudub'],
  ['answers invalid', 'Antworten ungültig', 'réponses invalides', 'antwoorden ongeldig', 'érvénytelen válaszok', 'vastused on vigased'],
  ['Portal rejected the API key', 'Der Briefkasten hat den API-Schlüssel abgelehnt', 'La boîte aux lettres a refusé la clé API', 'De brievenbus heeft de API-sleutel geweigerd', 'A postaláda elutasította az API-kulcsot', 'Postkast lükkas API-võtme tagasi'],
  ['Portal answered with status {s}', 'Der Briefkasten antwortete mit Status {s}', 'La boîte aux lettres a répondu avec le statut {s}', 'De brievenbus antwoordde met status {s}', 'A postaláda {s} állapottal válaszolt', 'Postkast vastas olekuga {s}'],
  ['Questionnaire already answered', 'Der Fragebogen wurde bereits beantwortet', 'Le questionnaire a déjà reçu une réponse', 'De vragenlijst is al beantwoord', 'A kérdőívre már válaszoltak', 'Küsimustikule on juba vastatud'],
  ['required answers missing', 'Pflichtantworten fehlen', 'des réponses obligatoires manquent', 'verplichte antwoorden ontbreken', 'kötelező válaszok hiányoznak', 'kohustuslikud vastused puuduvad'],
  ['choice invalid', 'Auswahl ungültig', 'choix invalide', 'keuze ongeldig', 'érvénytelen választás', 'valik on vigane'],
  ['Custom font missing', 'Eigene Schrift nicht vorhanden', 'Police personnalisée absente', 'Eigen lettertype ontbreekt', 'Nincs saját betűtípus', 'Oma kirjatüüp puudub'],
  ['Font file invalid', 'Schriftdatei ungültig (nur TrueType/OpenType, keine .woff/.ttc)', 'Fichier de police invalide (TrueType/OpenType uniquement, pas .woff/.ttc)', 'Lettertypebestand ongeldig (alleen TrueType/OpenType, geen .woff/.ttc)', 'Érvénytelen betűtípusfájl (csak TrueType/OpenType, nem .woff/.ttc)', 'Kirjatüübi fail on vigane (ainult TrueType/OpenType, mitte .woff/.ttc)'],
  ['Font file too large (max 8 MB)', 'Schriftdatei zu groß (höchstens 8 MB)', 'Fichier de police trop volumineux (8 Mo maximum)', 'Lettertypebestand te groot (maximaal 8 MB)', 'A betűtípusfájl túl nagy (legfeljebb 8 MB)', 'Kirjatüübi fail on liiga suur (kuni 8 MB)'],
  ['Font does not allow embedding', 'Die Schrift erlaubt das Einbetten in PDF nicht', 'La police n’autorise pas l’incorporation dans un PDF', 'Het lettertype staat insluiten in pdf niet toe', 'A betűtípus nem engedi a PDF-be ágyazást', 'Kirjatüüp ei luba PDF-i manustamist'],
  ['Font lacks basic characters', 'Der Schrift fehlen Grundzeichen (A, a, 0)', 'La police ne contient pas les caractères de base (A, a, 0)', 'Het lettertype mist basistekens (A, a, 0)', 'A betűtípusból hiányoznak az alapkarakterek (A, a, 0)', 'Kirjatüübil puuduvad põhimärgid (A, a, 0)'],
  ['style invalid', 'Schnitt ungültig (regular, bold oder italic)', 'style invalide (regular, bold ou italic)', 'stijl ongeldig (regular, bold of italic)', 'érvénytelen stílus (regular, bold vagy italic)', 'stiil on vigane (regular, bold või italic)'],
  ['License confirmation required', 'Die Lizenzbestätigung fehlt', 'La confirmation de licence est requise', 'Licentiebevestiging vereist', 'A licenc megerősítése szükséges', 'Vajalik on litsentsi kinnitus'],
  ['Invalid group ID (2–50 characters: A–Z, 0–9, "_" or "-")', 'Ungültige Gruppenkennung (2–50 Zeichen: A–Z, 0–9, „_“ oder „-“)', 'Identifiant de groupe non valide (2 à 50 caractères : A–Z, 0–9, « _ » ou « - »)', 'Ongeldige groepskennung (2–50 tekens: A–Z, 0–9, ‘_’ of ‘-’)', 'Érvénytelen csoportazonosító (2–50 karakter: A–Z, 0–9, „_” vagy „-”)', 'Kehtetu rühma tunnus (2–50 märki: A–Z, 0–9, „_“ või „-“)'],
  ['This group ID is reserved for a built-in framework', 'Diese Gruppenkennung ist für ein eingebautes Framework reserviert', 'Cet identifiant de groupe est réservé à un référentiel intégré', 'Deze groepskennung is gereserveerd voor een ingebouwd kader', 'Ez a csoportazonosító beépített keretrendszer számára fenntartott', 'See rühma tunnus on reserveeritud sisseehitatud raamistikule'],
  ['Invalid group name (1–120 characters)', 'Ungültige Gruppenbezeichnung (1–120 Zeichen)', 'Nom de groupe non valide (1 à 120 caractères)', 'Ongeldige groepsnaam (1–120 tekens)', 'Érvénytelen csoportnév (1–120 karakter)', 'Kehtetu rühma nimi (1–120 märki)'],
  ['Invalid color (use #RRGGBB)', 'Ungültige Farbe (Format #RRGGBB)', 'Couleur non valide (format #RRGGBB)', 'Ongeldige kleur (gebruik #RRGGBB)', 'Érvénytelen szín (formátum: #RRGGBB)', 'Kehtetu värv (vorming #RRGGBB)'],
  ['A group with this ID already exists', 'Eine Gruppe mit dieser Kennung gibt es schon', 'Un groupe avec cet identifiant existe déjà', 'Er bestaat al een groep met deze kennung', 'Már létezik ilyen azonosítójú csoport', 'Selle tunnusega rühm on juba olemas'],
  ['Group not found', 'Gruppe nicht gefunden', 'Groupe introuvable', 'Groep niet gevonden', 'A csoport nem található', 'Rühma ei leitud'],
  ['Built-in frameworks cannot be changed', 'Eingebaute Frameworks lassen sich nicht ändern', 'Les référentiels intégrés ne peuvent pas être modifiés', 'Ingebouwde kaders kunnen niet worden gewijzigd', 'A beépített keretrendszerek nem módosíthatók', 'Sisseehitatud raamistikke ei saa muuta'],
  ['The group still contains controls — remove them first', 'Die Gruppe enthält noch Controls — zuerst diese entfernen', 'Le groupe contient encore des contrôles — supprimez-les d\'abord', 'De groep bevat nog controls — verwijder die eerst', 'A csoport még tartalmaz intézkedéseket — előbb ezeket törölje', 'Rühm sisaldab veel meetmeid — eemaldage need esmalt'],
  ['Unexpected file format: expected an object with a "controls" list', 'Unerwartetes Dateiformat: erwartet wird ein Objekt mit einer Liste „controls“', 'Format de fichier inattendu : un objet avec une liste « controls » est attendu', 'Onverwacht bestandsformaat: een object met een lijst ‘controls’ wordt verwacht', 'Váratlan fájlformátum: „controls” listát tartalmazó objektum szükséges', 'Ootamatu failivorming: oodatakse objekti, milles on loend „controls“'],
  ['Invalid framework group', 'Ungültige Gruppe', 'Groupe non valide', 'Ongeldige groep', 'Érvénytelen csoport', 'Kehtetu rühm'],
  ['Invalid control ID', 'Ungültige Control-Kennung', 'Identifiant de contrôle non valide', 'Ongeldige controlkennung', 'Érvénytelen intézkedésazonosító', 'Kehtetu meetme tunnus'],
  ['A control with this ID already exists', 'Ein Control mit dieser Kennung gibt es schon', 'Un contrôle avec cet identifiant existe déjà', 'Er bestaat al een control met deze kennung', 'Már létezik ilyen azonosítójú intézkedés', 'Selle tunnusega meede on juba olemas'],
  ['The API key is too long (max 512 characters)', 'Der API-Schlüssel ist zu lang (höchstens 512 Zeichen)', 'La clé d\'API est trop longue (512 caractères maximum)', 'De API-sleutel is te lang (maximaal 512 tekens)', 'Az API-kulcs túl hosszú (legfeljebb 512 karakter)', 'API-võti on liiga pikk (kuni 512 märki)'],
  ['The API key may only contain visible ASCII characters (no spaces or line breaks)', 'Der API-Schlüssel darf nur sichtbare ASCII-Zeichen enthalten (keine Leerzeichen oder Zeilenumbrüche)', 'La clé d\'API ne peut contenir que des caractères ASCII visibles (ni espaces ni sauts de ligne)', 'De API-sleutel mag alleen zichtbare ASCII-tekens bevatten (geen spaties of regeleinden)', 'Az API-kulcs csak látható ASCII-karaktereket tartalmazhat (szóköz és sortörés nélkül)', 'API-võti tohib sisaldada ainult nähtavaid ASCII-märke (ilma tühikute ja reavahetuseta)'],
]

// Beschriftungen von Kalendereinträgen, die Stores/Routen als "Präfix: Titel" liefern.
// {t} ist der (nie übersetzte) Titel des Datensatzes.
const LABELS = [
  ['Due: {t}', 'Fälligkeit: {t}', 'Échéance : {t}', 'Vervaldatum: {t}', 'Határidő: {t}', 'Tähtaeg: {t}'],
  ['Review: {t}', 'Review: {t}', 'Révision : {t}', 'Beoordeling: {t}', 'Felülvizsgálat: {t}', 'Ülevaatus: {t}'],
  ['Action: {t}', 'Maßnahme: {t}', 'Mesure : {t}', 'Maatregel: {t}', 'Intézkedés: {t}', 'Abinõu: {t}'],
  ['Goal due: {t}', 'Ziel fällig: {t}', 'Objectif à échéance : {t}', 'Doel verschuldigd: {t}', 'Cél esedékes: {t}', 'Eesmärgi tähtaeg: {t}'],
  ['Goal review: {t}', 'Ziel-Review: {t}', "Revue de l'objectif : {t}", 'Doelbeoordeling: {t}', 'Cél felülvizsgálata: {t}', 'Eesmärgi ülevaatus: {t}'],
  ['In review: {t}', 'Prüfung: {t}', 'En révision : {t}', 'In beoordeling: {t}', 'Felülvizsgálatban: {t}', 'Ülevaatusel: {t}'],
  ['Review due: {t}', 'Review fällig: {t}', 'Révision à échéance : {t}', 'Beoordeling verschuldigd: {t}', 'Felülvizsgálat esedékes: {t}', 'Ülevaatuse tähtaeg: {t}'],
  ['Contract notice period: {t}', 'Vertrag Kündigungsfrist: {t}', 'Délai de préavis du contrat : {t}', 'Opzegtermijn contract: {t}', 'Szerződés felmondási határideje: {t}', 'Lepingu etteteatamistähtaeg: {t}'],
  ['Deletion deadline: {t}', 'Löschfrist: {t}', 'Délai de suppression : {t}', 'Verwijdertermijn: {t}', 'Törlési határidő: {t}', 'Kustutustähtaeg: {t}'],
  ['Deletion deadline OVERDUE: {t}', 'Löschfrist ÜBERFÄLLIG: {t}', 'Délai de suppression DÉPASSÉ : {t}', 'Verwijdertermijn ACHTERSTALLIG: {t}', 'Törlési határidő LEJÁRT: {t}', 'Kustutustähtaeg ÜLETATUD: {t}'],
  ['Next review: {t}', 'Nächstes Review: {t}', 'Prochaine révision : {t}', 'Volgende beoordeling: {t}', 'Következő felülvizsgálat: {t}', 'Järgmine ülevaatus: {t}'],
  ['Next meeting: {t}', 'Nächste Sitzung: {t}', 'Prochaine réunion : {t}', 'Volgende vergadering: {t}', 'Következő ülés: {t}', 'Järgmine koosolek: {t}'],
  ['BCM exercise: {t}', 'BCM-Übung: {t}', 'Exercice BCM : {t}', 'BCM-oefening: {t}', 'BCM-gyakorlat: {t}', 'Talitluspidevuse õppus: {t}'],
  ['Plan test due: {t}', 'Plan-Test fällig: {t}', 'Test de plan à échéance : {t}', 'Plantest verschuldigd: {t}', 'Terv-teszt esedékes: {t}', 'Kava test tähtajaline: {t}'],
  ['Supplier evidence expires: {t}', 'Nachweis läuft ab: {t}', 'Justificatif fournisseur expirant : {t}', 'Bewijs van leverancier verloopt: {t}', 'Szállítói igazolás lejár: {t}', 'Tarnija tõend aegub: {t}'],
  ['Supplier audit: {t}', 'Lieferanten-Audit: {t}', 'Audit fournisseur : {t}', 'Leveranciersaudit: {t}', 'Szállítói audit: {t}', 'Tarnijaaudit: {t}'],
  ['Finding action: {t}', 'Finding-Maßnahme: {t}', 'Action de constat : {t}', 'Bevindingactie: {t}', 'Megállapítás intézkedése: {t}', 'Tähelepaneku tegevus: {t}'],
  ['Management review', 'Management Review', 'Revue de direction', 'Directiebeoordeling', 'Vezetőségi átvizsgálás', 'Juhtkonna ülevaatus'],
  ['Committee meeting', 'Ausschusssitzung', 'Réunion du comité', 'Commissievergadering', 'Bizottsági ülés', 'Komitee koosolek'],
]

// ── Translator: jeder Text in jeder Sprache → Eintrag ─────────────────────────
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function makeTranslator(entries) {
  const exact = new Map()          // Text → Eintrag (ohne Platzhalter)
  const patterns = []              // Platzhalter-Texte als Regex
  for (const entry of entries) {
    const hasParams = /\{\w+\}/.test(entry[0])
    for (const text of entry) {
      if (typeof text !== 'string') continue   // Sprache ohne Übersetzung in dieser Zeile
      if (!hasParams) { if (!exact.has(text)) exact.set(text, entry); continue }
      const names = []
      const re = new RegExp('^' + esc(text).replace(/\\\{(\w+)\\\}/g, (_, n) => { names.push(n); return '([\\s\\S]+?)' }) + '$')
      patterns.push({ re, names, entry })
    }
  }
  return function translate(text, lang) {
    if (typeof text !== 'string' || !text) return text
    const li = IDX[lang] ?? 0
    const hit = exact.get(text)
    if (hit) return hit[li] ?? hit[0]
    for (const { re, names, entry } of patterns) {
      const m = re.exec(text)
      if (!m) continue
      let out = entry[li] ?? entry[0]
      names.forEach((n, i) => { out = out.split('{' + n + '}').join(m[i + 1]) })
      return out
    }
    return text
  }
}
const _translateError = makeTranslator(MESSAGES)
const _translateLabel = makeTranslator(LABELS)

/** Erste unterstützte Sprache aus dem Wert eines X-Lang-/Accept-Language-Headers. */
function pickLang(value) {
  const l = String(value || '').toLowerCase().slice(0, 2)
  return SUPPORTED.includes(l) ? l : null
}

/**
 * Sprache des Aufrufers: X-Lang → Organisations-Standard → Englisch.
 * Die Middleware (installMiddleware) legt die Sprache einmal pro Request als `req.lang` ab, weil der
 * Organisations-Standard je nach STORAGE_BACKEND asynchron aus der Datenbank kommt.
 */
function langOf(req) {
  if (req.lang) return req.lang
  return pickLang(req.headers && req.headers['x-lang']) || 'en'
}

/** Standardsprache der Organisation, asynchron (auch bei SQLite/PostgreSQL/MariaDB korrekt). */
async function orgLang() {
  try {
    const cfg = await require('./db/orgSettingsStore').get()
    return pickLang(cfg && cfg.languageConfig && cfg.languageConfig.default) || 'en'
  } catch { return 'en' }
}

/** Übersetzt einen bekannten Meldungstext; unbekannte Texte bleiben unverändert. */
function translateError(text, lang) { return _translateError(text, lang) }

/** Übersetzt die Beschriftung eines Kalendereintrags ("Präfix: Titel"); Titel bleibt unverändert. */
function translateLabel(text, lang) { return _translateLabel(text, lang) }

// ── Texte aus dem Wörterbuch der Oberfläche (Mails, Berichte, öffentliche Seiten) ──
// Server-Texte liegen mit im Wörterbuch ui/i18n/translations.js (Schlüssel srv_…), damit es eine
// einzige Quelle für alle Sprachen gibt und die Vollständigkeitstests sie mit abdecken.
const fs = require('fs')
const path = require('path')
let _dict = null
function dictionary() {
  if (!_dict) {
    const win = {}
    // eslint-disable-next-line no-new-func
    new Function('window', fs.readFileSync(path.join(__dirname, '..', 'ui', 'i18n', 'translations.js'), 'utf8'))(win)
    _dict = win.TRANSLATIONS || {}
  }
  return _dict
}

/** Text zu einem Schlüssel in der Sprache `lang` (Fallback Englisch, dann der Schlüssel selbst). */
function tr(lang, key, params) {
  const e = dictionary()[key]
  let out = (e && (e[lang] || e.en)) || key
  if (params) for (const [k, v] of Object.entries(params)) out = out.split('{' + k + '}').join(String(v))
  return out
}

const LOCALES = Object.fromEntries(reg.list.map(l => [l.code, l.locale]))
/** Datumsformat passend zur Sprache. */
function fmtDate(value, lang) {
  if (!value) return '–'
  return new Date(value).toLocaleDateString(LOCALES[lang] || LOCALES.en)
}
function fmtDateTime(value, lang) {
  if (!value) return '–'
  return new Date(value).toLocaleString(LOCALES[lang] || LOCALES.en)
}

/** Sprache für Seiten ohne Login/Header: ?lang= → vorgegebene Sprache (z. B. des Dokuments) → Organisations-Standard. */
function pageLang(req, preferred) {
  return pickLang(req.query && req.query.lang) || pickLang(preferred) || langOf(req)
}


/** Middleware: übersetzt `error` in jeder JSON-Antwort in die Sprache des Aufrufers. */
function installMiddleware(app) {
  app.use(async (req, res, next) => {
    req.lang = pickLang(req.headers && req.headers['x-lang']) || await orgLang()
    const send = res.json.bind(res)
    res.json = body => {
      if (body && typeof body === 'object' && !Array.isArray(body) && typeof body.error === 'string') {
        body = { ...body, error: translateError(body.error, langOf(req)) }
      }
      return send(body)
    }
    next()
  })
}

module.exports = { SUPPORTED, MESSAGES, LABELS, langOf, pickLang, pageLang, orgLang, translateError, translateLabel, tr, fmtDate, fmtDateTime, installMiddleware }
