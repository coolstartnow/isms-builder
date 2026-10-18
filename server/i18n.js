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

const SUPPORTED = ['de', 'en', 'fr', 'nl', 'hu']
const IDX = { en: 0, de: 1, fr: 2, nl: 3, hu: 4 }

const MESSAGES = [
  ['Not found', 'Nicht gefunden', 'Introuvable', 'Niet gevonden', 'Nem található'],
  ['Invalid collection', 'Ungültige Sammlung', 'Collection invalide', 'Ongeldige verzameling', 'Érvénytelen gyűjtemény'],
  ['No file uploaded', 'Keine Datei hochgeladen', 'Aucun fichier téléversé', 'Geen bestand geüpload', 'Nincs feltöltött fájl'],
  ['File not found', 'Datei nicht gefunden', 'Fichier introuvable', 'Bestand niet gevonden', 'A fájl nem található'],
  ['File not found on disk', 'Datei auf dem Datenträger nicht gefunden', 'Fichier introuvable sur le disque', 'Bestand niet gevonden op schijf', 'A fájl nem található a lemezen'],
  ['Attachment not found', 'Anhang nicht gefunden', 'Pièce jointe introuvable', 'Bijlage niet gevonden', 'A melléklet nem található'],
  ['Forbidden', 'Zugriff verweigert', 'Accès refusé', 'Toegang geweigerd', 'Hozzáférés megtagadva'],
  ['Forbidden: insufficient permissions', 'Zugriff verweigert: unzureichende Berechtigung', 'Accès refusé : droits insuffisants', 'Toegang geweigerd: onvoldoende rechten', 'Hozzáférés megtagadva: nincs elég jogosultság'],
  ['Insufficient role', 'Unzureichende Rolle', 'Rôle insuffisant', 'Onvoldoende rol', 'Nem megfelelő szerepkör'],
  ['Invalid status', 'Ungültiger Status', 'Statut invalide', 'Ongeldige status', 'Érvénytelen állapot'],
  ['Already in this status', 'Bereits in diesem Status', 'Déjà dans ce statut', 'Al in deze status', 'Már ebben az állapotban van'],
  ['Transition {from} → {to} not allowed', 'Statuswechsel {from} → {to} nicht erlaubt', 'Transition {from} → {to} non autorisée', 'Overgang {from} → {to} niet toegestaan', 'A(z) {from} → {to} átmenet nem engedélyezett'],
  ["Role '{role}' insufficient. Requires '{min}'", "Rolle '{role}' reicht nicht aus. Erforderlich: '{min}'", "Rôle '{role}' insuffisant. Requis : '{min}'", "Rol '{role}' is onvoldoende. Vereist: '{min}'", "A(z) '{role}' szerepkör nem elég. Szükséges: '{min}'"],
  ['Missing required fields', 'Pflichtfelder fehlen', 'Champs obligatoires manquants', 'Verplichte velden ontbreken', 'Hiányzó kötelező mezők'],
  ['Not authenticated', 'Nicht angemeldet', 'Non authentifié', 'Niet aangemeld', 'Nincs bejelentkezve'],
  ['Sync supports only STORAGE_BACKEND=json (current: {backend})', 'Sync unterstützt nur STORAGE_BACKEND=json (aktuell: {backend})', 'La synchronisation ne prend en charge que STORAGE_BACKEND=json (actuel : {backend})', 'Synchronisatie ondersteunt alleen STORAGE_BACKEND=json (nu: {backend})', 'A szinkronizálás csak a STORAGE_BACKEND=json beállítást támogatja (jelenleg: {backend})'],
  ['Unknown modules: {list}', 'Unbekannte Module: {list}', 'Modules inconnus : {list}', 'Onbekende modules: {list}', 'Ismeretlen modulok: {list}'],
  ['since is not a valid ISO timestamp', 'since ist kein gültiger ISO-Zeitstempel', "since n'est pas un horodatage ISO valide", 'since is geen geldige ISO-tijdstempel', 'A since nem érvényes ISO időbélyeg'],
  ['Invalid body: changes object expected', 'Ungültiger Body: changes-Objekt erwartet', 'Corps invalide : objet changes attendu', 'Ongeldige body: changes-object verwacht', 'Érvénytelen törzs: changes objektum szükséges'],
  ['Sync protocol {client} not supported (server: {server})', 'Sync-Protokoll {client} nicht unterstützt (Server: {server})', 'Protocole de synchronisation {client} non pris en charge (serveur : {server})', 'Synchronisatieprotocol {client} wordt niet ondersteund (server: {server})', 'A(z) {client} szinkronizációs protokoll nem támogatott (szerver: {server})'],
  ['Unknown dependencies', 'Unbekannte Abhängigkeiten', 'Dépendances inconnues', 'Onbekende afhankelijkheden', 'Ismeretlen függőségek'],
  ['Circular dependency', 'Zirkuläre Abhängigkeit', 'Dépendance circulaire', 'Circulaire afhankelijkheid', 'Körkörös függőség'],
  ['Unknown phase', 'Unbekannte Phase', 'Phase inconnue', 'Onbekende fase', 'Ismeretlen fázis'],
  ['No valid time of becoming aware', 'Kein gültiger Zeitpunkt der Kenntnisnahme', "Aucun moment valide de prise de connaissance", 'Geen geldig tijdstip van kennisname', 'Érvénytelen tudomásszerzési időpont'],
  ['category and title are required', 'Kategorie und Titel sind erforderlich', 'La catégorie et le titre sont obligatoires', 'Categorie en titel zijn verplicht', 'A kategória és a cím megadása kötelező'],
  ['Only for email campaigns', 'Nur für E-Mail-Kampagnen', 'Uniquement pour les campagnes par e-mail', 'Alleen voor e-mailcampagnes', 'Csak e-mailes kampányokhoz'],
  ['Password must be at least 6 characters', 'Passwort muss mindestens 6 Zeichen haben', 'Le mot de passe doit comporter au moins 6 caractères', 'Het wachtwoord moet minstens 6 tekens bevatten', 'A jelszónak legalább 6 karakter hosszúnak kell lennie'],
  ['Invalid list', 'Ungültige Liste', 'Liste invalide', 'Ongeldige lijst', 'Érvénytelen lista'],
  ['Unknown list id', 'Unbekannte Listen-ID', 'Identifiant de liste inconnu', 'Onbekende lijst-ID', 'Ismeretlen lista-azonosító'],
  ['Invalid credentials', 'Ungültige Zugangsdaten', 'Identifiants invalides', 'Ongeldige inloggegevens', 'Érvénytelen hitelesítő adatok'],
  ['User not found', 'Benutzer nicht gefunden', 'Utilisateur introuvable', 'Gebruiker niet gevonden', 'A felhasználó nem található'],
  ['User exists', 'Benutzer existiert bereits', "L'utilisateur existe déjà", 'Gebruiker bestaat al', 'A felhasználó már létezik'],
  ['GitHub API responded with {status}', 'GitHub-API antwortete mit {status}', "L'API GitHub a répondu avec {status}", 'GitHub-API antwoordde met {status}', 'A GitHub API ezzel válaszolt: {status}'],
  ['Base URL, username and app password are required', 'Basis-URL, Benutzername und App-Passwort sind erforderlich', "L'URL de base, le nom d'utilisateur et le mot de passe d'application sont obligatoires", 'Basis-URL, gebruikersnaam en app-wachtwoord zijn verplicht', 'Az alap URL, a felhasználónév és az alkalmazásjelszó megadása kötelező'],
  ['Login failed (check username/app password)', 'Anmeldung fehlgeschlagen (Benutzername/App-Passwort prüfen)', "Échec de la connexion (vérifiez le nom d'utilisateur / mot de passe d'application)", 'Inloggen mislukt (controleer gebruikersnaam/app-wachtwoord)', 'A bejelentkezés sikertelen (ellenőrizze a felhasználónevet / alkalmazásjelszót)'],
  ['Base URL not found (404)', 'Basis-URL nicht gefunden (404)', 'URL de base introuvable (404)', 'Basis-URL niet gevonden (404)', 'Az alap URL nem található (404)'],
  ['Unexpected response: {status} {text}', 'Unerwartete Antwort: {status} {text}', 'Réponse inattendue : {status} {text}', 'Onverwacht antwoord: {status} {text}', 'Váratlan válasz: {status} {text}'],
  ['WebDAV publish is not configured or disabled', 'WebDAV-Publish ist nicht konfiguriert oder deaktiviert', "La publication WebDAV n'est pas configurée ou est désactivée", 'WebDAV-publicatie is niet geconfigureerd of uitgeschakeld', 'A WebDAV-közzététel nincs beállítva vagy ki van kapcsolva'],
  ['email, incidentType and description are required.', 'email, incidentType und description sind Pflichtfelder.', "email, incidentType et description sont obligatoires.", 'email, incidentType en description zijn verplicht.', 'Az email, az incidentType és a description kötelező.'],
  ['Invalid mode', 'Ungültiger Modus', 'Mode invalide', 'Ongeldige modus', 'Érvénytelen mód'],
  ['templateId missing', 'templateId fehlt', 'templateId manquant', 'templateId ontbreekt', 'Hiányzik a templateId'],
  ['Only approved policies can be distributed', 'Nur freigegebene (approved) Richtlinien können verteilt werden', 'Seules les politiques approuvées peuvent être diffusées', 'Alleen goedgekeurde beleidsdocumenten kunnen worden verspreid', 'Csak jóváhagyott szabályzatok küldhetők ki'],
  ['rows[] expected', 'rows[] erwartet', 'rows[] attendu', 'rows[] verwacht', 'rows[] szükséges'],
  ['updates must be array', 'updates muss ein Array sein', 'updates doit être un tableau', 'updates moet een array zijn', 'Az updates tömb kell legyen'],
  ['Approved documents cannot be edited. Set the status back to review first.', 'Freigegebene Dokumente können nicht bearbeitet werden. Status zuerst auf „Review“ zurücksetzen.', "Les documents approuvés ne peuvent pas être modifiés. Repassez d'abord le statut en « révision ».", 'Goedgekeurde documenten kunnen niet worden bewerkt. Zet de status eerst terug naar beoordeling.', 'A jóváhagyott dokumentumok nem szerkeszthetők. Előbb állítsa vissza az állapotot felülvizsgálatra.'],
  ['Circular link not allowed', 'Zirkuläre Verknüpfung nicht erlaubt', 'Lien circulaire non autorisé', 'Circulaire koppeling niet toegestaan', 'A körkörös kapcsolat nem engedélyezett'],
  ['status is required', 'Status ist erforderlich', 'Le statut est obligatoire', 'Status is verplicht', 'Az állapot megadása kötelező'],
  ['Storage error', 'Speicherfehler', 'Erreur de stockage', 'Opslagfout', 'Tárolási hiba'],
  ['Document not found', 'Template nicht gefunden', 'Document introuvable', 'Document niet gevonden', 'A dokumentum nem található'],
  ['name is required', 'Name ist erforderlich', 'Le nom est obligatoire', 'Naam is verplicht', 'A név megadása kötelező'],
  ['AI integration disabled', 'KI-Integration deaktiviert', 'Intégration IA désactivée', 'AI-integratie uitgeschakeld', 'Az MI-integráció ki van kapcsolva'],
  ['AI integration is disabled (admin setting).', 'KI-Integration ist deaktiviert (Admin-Einstellung).', "L'intégration IA est désactivée (paramètre administrateur).", 'AI-integratie is uitgeschakeld (beheerdersinstelling).', 'Az MI-integráció ki van kapcsolva (adminisztrátori beállítás).'],
  ['title, type and language are required.', 'title, type und language sind erforderlich.', 'title, type et language sont obligatoires.', 'title, type en language zijn verplicht.', 'A title, a type és a language kötelező.'],
  ['sections must be an array', 'sections muss ein Array sein', 'sections doit être un tableau', 'sections moet een array zijn', 'A sections tömb kell legyen'],
  ['username, email and role are required', 'username, email und role sind erforderlich', 'username, email et role sont obligatoires', 'username, email en role zijn verplicht', 'A username, az email és a role kötelező'],
  ['Cannot delete your own account', 'Eigenen Account nicht löschbar', 'Impossible de supprimer votre propre compte', 'Het eigen account kan niet worden verwijderd', 'A saját fiók nem törölhető'],
  ['Body must be an array', 'Body muss ein Array sein', 'Le corps doit être un tableau', 'Body moet een array zijn', 'A törzsnek tömbnek kell lennie'],
  ['asset types still in use', 'Asset-Typen werden noch verwendet', "Types d'actifs encore utilisés", 'Assettypen zijn nog in gebruik', 'Az eszköztípusok még használatban vannak'],
  ['Recipient address missing', 'Empfängeradresse fehlt', 'Adresse du destinataire manquante', 'Ontvangersadres ontbreekt', 'Hiányzik a címzett címe'],
  ['Invalid bundle format', 'Ungültiges Bundle-Format', 'Format de bundle invalide', 'Ongeldig bundle-formaat', 'Érvénytelen csomagformátum'],
  ['Unsupported language', 'Nicht unterstützte Sprache', 'Langue non prise en charge', 'Niet-ondersteunde taal', 'Nem támogatott nyelv'],
  ['Unsupported language. Use: de, en, fr, nl, hu', 'Nicht unterstützte Sprache. Erlaubt: de, en, fr, nl, hu', 'Langue non prise en charge. Utilisez : de, en, fr, nl, hu', 'Niet-ondersteunde taal. Gebruik: de, en, fr, nl, hu', 'Nem támogatott nyelv. Használható: de, en, fr, nl, hu'],
  ["Demo bundle for '{lang}' not found", "Demo-Bundle für '{lang}' nicht gefunden", "Bundle de démonstration pour '{lang}' introuvable", "Demobundel voor '{lang}' niet gevonden", "A(z) '{lang}' demócsomag nem található"],
  ['Too many failed attempts. Please wait a moment and try again.', 'Zu viele Fehlversuche. Bitte kurz warten und erneut versuchen.', 'Trop de tentatives échouées. Veuillez patienter un instant et réessayer.', 'Te veel mislukte pogingen. Wacht even en probeer het opnieuw.', 'Túl sok sikertelen próbálkozás. Kérjük, várjon egy kicsit, és próbálja újra.'],
  ['2FA required', '2FA erforderlich', '2FA requise', '2FA vereist', '2FA szükséges'],
  ['Invalid 2FA code', 'Ungültiger 2FA-Code', 'Code 2FA invalide', 'Ongeldige 2FA-code', 'Érvénytelen 2FA-kód'],
  ['2FA verification failed', '2FA-Verifizierung fehlgeschlagen', 'Échec de la vérification 2FA', '2FA-verificatie mislukt', 'A 2FA-ellenőrzés sikertelen'],
  ['2FA is mandatory for all users. Please contact the administrator to set up 2FA for your account.', '2FA ist für alle Benutzer verpflichtend. Bitte kontaktiere den Administrator, um 2FA für deinen Account einzurichten.', "La 2FA est obligatoire pour tous les utilisateurs. Veuillez contacter l'administrateur pour configurer la 2FA pour votre compte.", '2FA is voor alle gebruikers verplicht. Neem contact op met de beheerder om 2FA voor uw account in te stellen.', 'A 2FA minden felhasználó számára kötelező. Kérjük, forduljon az adminisztrátorhoz, hogy beállítsa a 2FA-t a fiókjához.'],
  ['Current and new password required (min. 6 characters).', 'Aktuelles und neues Passwort erforderlich (min. 6 Zeichen).', 'Mot de passe actuel et nouveau mot de passe requis (6 caractères min.).', 'Huidig en nieuw wachtwoord vereist (min. 6 tekens).', 'A jelenlegi és az új jelszó megadása kötelező (legalább 6 karakter).'],
  ['Current password is incorrect.', 'Aktuelles Passwort ist falsch.', 'Le mot de passe actuel est incorrect.', 'Het huidige wachtwoord is onjuist.', 'A jelenlegi jelszó helytelen.'],
  ['No 2FA secret found. Please call /2fa/setup first.', 'Kein 2FA-Secret gefunden. Bitte zuerst /2fa/setup aufrufen.', "Aucun secret 2FA trouvé. Veuillez d'abord appeler /2fa/setup.", 'Geen 2FA-geheim gevonden. Roep eerst /2fa/setup aan.', 'Nem található 2FA-titkos kulcs. Kérjük, előbb hívja meg a /2fa/setup végpontot.'],
  ['Invalid code', 'Ungültiger Code', 'Code invalide', 'Ongeldige code', 'Érvénytelen kód'],
  ['Control not found', 'Control nicht gefunden', 'Contrôle introuvable', 'Control niet gevonden', 'A kontroll nem található'],
  ['Parse error: {msg}', 'Lesefehler: {msg}', 'Erreur de lecture : {msg}', 'Leesfout: {msg}', 'Olvasási hiba: {msg}'],
  ['Expected JSON array of controls', 'JSON-Array von Controls erwartet', 'Tableau JSON de contrôles attendu', 'JSON-array van controls verwacht', 'Kontrollok JSON-tömbje szükséges'],
  ['No valid controls found', 'Keine gültigen Controls gefunden', 'Aucun contrôle valide trouvé', 'Geen geldige controls gevonden', 'Nem található érvényes kontroll'],
  ['Not found or not a custom control', 'Nicht gefunden oder kein eigenes Control', 'Introuvable ou pas un contrôle personnalisé', 'Niet gevonden of geen eigen control', 'Nem található, vagy nem egyéni kontroll'],
  ['Cannot delete built-in controls', 'Mitgelieferte Controls können nicht gelöscht werden', 'Les contrôles fournis ne peuvent pas être supprimés', 'Meegeleverde controls kunnen niet worden verwijderd', 'A beépített kontrollok nem törölhetők'],
  ['Control is linked to templates — unlink first', 'Control ist mit Dokumenten verknüpft — zuerst Verknüpfung lösen', "Le contrôle est lié à des documents — supprimez d'abord les liens", 'Control is gekoppeld aan documenten — verwijder eerst de koppeling', 'A kontroll dokumentumokhoz van kapcsolva — előbb szüntesse meg a kapcsolatot'],
  ['Unknown asset type', 'Unbekannter Asset-Typ', "Type d'actif inconnu", 'Onbekend assettype', 'Ismeretlen eszköztípus'],
  ['supplierId required', 'supplierId erforderlich', 'supplierId requis', 'supplierId vereist', 'A supplierId kötelező'],
  ['Supplier not found', 'Lieferant nicht gefunden', 'Fournisseur introuvable', 'Leverancier niet gevonden', 'A szállító nem található'],
  ['At least contentowner role required', 'Mindestens contentowner-Rolle erforderlich', 'Rôle contentowner au minimum requis', 'Minimaal de rol contentowner vereist', 'Legalább contentowner szerepkör szükséges'],
  ['At least auditor role required', 'Mindestens auditor-Rolle erforderlich', 'Rôle auditor au minimum requis', 'Minimaal de rol auditor vereist', 'Legalább auditor szerepkör szükséges'],
  ['At least editor role required', 'Mindestens editor-Rolle erforderlich', 'Rôle editor au minimum requis', 'Minimaal de rol editor vereist', 'Legalább editor szerepkör szükséges'],
  ['At least auditor or contentowner role required', 'Mindestens auditor- oder contentowner-Rolle erforderlich', 'Rôle auditor ou contentowner au minimum requis', 'Minimaal de rol auditor of contentowner vereist', 'Legalább auditor vagy contentowner szerepkör szükséges'],
  ['At least auditor or contentowner role, or being the registered owner, required', 'Mindestens auditor- oder contentowner-Rolle oder eingetragener Owner erforderlich', 'Rôle auditor ou contentowner, ou propriétaire enregistré, requis', 'Minimaal de rol auditor of contentowner, of de geregistreerde eigenaar, vereist', 'Legalább auditor vagy contentowner szerepkör, illetve a bejegyzett tulajdonos szükséges'],
  ['AV not found', 'AV-Vertrag nicht gefunden', 'Contrat de sous-traitance introuvable', 'Verwerkersovereenkomst niet gevonden', 'Az adatfeldolgozói szerződés nem található'],
  ['Finding not found', 'Feststellung nicht gefunden', 'Constat introuvable', 'Bevinding niet gevonden', 'A megállapítás nem található'],
  ['Risk not found', 'Risiko nicht gefunden', 'Risque introuvable', 'Risico niet gevonden', 'A kockázat nem található'],
  ['Audit not found', 'Audit nicht gefunden', 'Audit introuvable', 'Audit niet gevonden', 'Az audit nem található'],
  ['A finding already exists for this item', 'Für diesen Prüfpunkt existiert bereits eine Feststellung', 'Un constat existe déjà pour ce point', 'Voor dit controlepunt bestaat al een bevinding', 'Ehhez az ellenőrzőponthoz már létezik megállapítás'],
  ['Approved programs cannot be edited. Reopen the program first.', 'Freigegebene Programme können nicht bearbeitet werden. Zuerst in den Entwurf zurücksetzen.', "Les programmes approuvés ne peuvent pas être modifiés. Repassez-les d'abord en brouillon.", 'Goedgekeurde programma’s kunnen niet worden bewerkt. Zet het programma eerst terug naar concept.', 'A jóváhagyott programok nem szerkeszthetők. Előbb állítsa vissza a programot tervezetbe.'],
  ['Only .xml or .pdf files are supported', 'Nur .xml oder .pdf Dateien werden unterstützt', 'Seuls les fichiers .xml ou .pdf sont pris en charge', 'Alleen .xml- of .pdf-bestanden worden ondersteund', 'Csak .xml vagy .pdf fájlok támogatottak'],
  ['Parsing failed: {msg}', 'Parsing fehlgeschlagen: {msg}', "Échec de l'analyse : {msg}", 'Parsen mislukt: {msg}', 'Az elemzés sikertelen: {msg}'],
  ['No vulnerabilities found in the report (CVSS > 0)', 'Keine Schwachstellen im Report gefunden (CVSS > 0)', "Aucune vulnérabilité trouvée dans le rapport (CVSS > 0)", 'Geen kwetsbaarheden gevonden in het rapport (CVSS > 0)', 'Nem található sebezhetőség a jelentésben (CVSS > 0)'],
]

// Beschriftungen von Kalendereinträgen, die Stores/Routen als "Präfix: Titel" liefern.
// {t} ist der (nie übersetzte) Titel des Datensatzes.
const LABELS = [
  ['Due: {t}', 'Fälligkeit: {t}', 'Échéance : {t}', 'Vervaldatum: {t}', 'Határidő: {t}'],
  ['Review: {t}', 'Review: {t}', 'Révision : {t}', 'Beoordeling: {t}', 'Felülvizsgálat: {t}'],
  ['Action: {t}', 'Maßnahme: {t}', 'Mesure : {t}', 'Maatregel: {t}', 'Intézkedés: {t}'],
  ['Goal due: {t}', 'Ziel fällig: {t}', 'Objectif à échéance : {t}', 'Doel verschuldigd: {t}', 'Cél esedékes: {t}'],
  ['Goal review: {t}', 'Ziel-Review: {t}', "Revue de l'objectif : {t}", 'Doelbeoordeling: {t}', 'Cél felülvizsgálata: {t}'],
  ['In review: {t}', 'Prüfung: {t}', 'En révision : {t}', 'In beoordeling: {t}', 'Felülvizsgálatban: {t}'],
  ['Review due: {t}', 'Review fällig: {t}', 'Révision à échéance : {t}', 'Beoordeling verschuldigd: {t}', 'Felülvizsgálat esedékes: {t}'],
  ['Contract notice period: {t}', 'Vertrag Kündigungsfrist: {t}', 'Délai de préavis du contrat : {t}', 'Opzegtermijn contract: {t}', 'Szerződés felmondási határideje: {t}'],
  ['Deletion deadline: {t}', 'Löschfrist: {t}', 'Délai de suppression : {t}', 'Verwijdertermijn: {t}', 'Törlési határidő: {t}'],
  ['Deletion deadline OVERDUE: {t}', 'Löschfrist ÜBERFÄLLIG: {t}', 'Délai de suppression DÉPASSÉ : {t}', 'Verwijdertermijn ACHTERSTALLIG: {t}', 'Törlési határidő LEJÁRT: {t}'],
  ['Next review: {t}', 'Nächstes Review: {t}', 'Prochaine révision : {t}', 'Volgende beoordeling: {t}', 'Következő felülvizsgálat: {t}'],
  ['Next meeting: {t}', 'Nächste Sitzung: {t}', 'Prochaine réunion : {t}', 'Volgende vergadering: {t}', 'Következő ülés: {t}'],
  ['BCM exercise: {t}', 'BCM-Übung: {t}', 'Exercice BCM : {t}', 'BCM-oefening: {t}', 'BCM-gyakorlat: {t}'],
  ['Plan test due: {t}', 'Plan-Test fällig: {t}', 'Test de plan à échéance : {t}', 'Plantest verschuldigd: {t}', 'Terv-teszt esedékes: {t}'],
  ['Supplier audit: {t}', 'Lieferanten-Audit: {t}', 'Audit fournisseur : {t}', 'Leveranciersaudit: {t}', 'Szállítói audit: {t}'],
  ['Finding action: {t}', 'Finding-Maßnahme: {t}', 'Action de constat : {t}', 'Bevindingactie: {t}', 'Megállapítás intézkedése: {t}'],
  ['Management review', 'Management Review', 'Revue de direction', 'Directiebeoordeling', 'Vezetőségi átvizsgálás'],
  ['Committee meeting', 'Ausschusssitzung', 'Réunion du comité', 'Commissievergadering', 'Bizottsági ülés'],
]

// ── Translator: jeder Text in jeder Sprache → Eintrag ─────────────────────────
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function makeTranslator(entries) {
  const exact = new Map()          // Text → Eintrag (ohne Platzhalter)
  const patterns = []              // Platzhalter-Texte als Regex
  for (const entry of entries) {
    const hasParams = /\{\w+\}/.test(entry[0])
    for (const text of entry) {
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
    if (hit) return hit[li]
    for (const { re, names, entry } of patterns) {
      const m = re.exec(text)
      if (!m) continue
      let out = entry[li]
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

const LOCALES = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', nl: 'nl-NL', hu: 'hu-HU' }
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
