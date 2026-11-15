# Module : Brouillons IA (assistant de politiques)

> À partir d’un document de la liste de titres, un brouillon de texte est créé en quelques secondes ; vous le relisez, l’adaptez et l’enregistrez. Il y a **deux voies** :
> la voie **directe** via l’IA connectée (Ollama) et la voie par **copier-coller** avec une IA de votre choix. Les deux utilisent le même texte vérifié,
> et dans les deux cas les espaces réservés sont remplis automatiquement avec les données de votre organisation.

> **Remarque sur les modèles :** Les titres de la liste sont des propositions orientées pratique. Chaque brouillon doit être **soigneusement adapté à votre propre entreprise** et relu sur le fond. Il ne constitue **pas un conseil juridique** et ne doit pas être compris comme tel.

---

## L’essentiel en un coup d’œil

| | Voie A : directe | Voie B : copier-coller |
|---|---|---|
| Qui écrit le texte ? | l’IA connectée (Ollama, en général sur votre propre serveur) | une IA de votre choix (web, application, IA d’entreprise) |
| Mise en place | Administrateur : Admin → Maintenance → Intégration IA (Ollama) | aucune |
| Ce que vous faites | cliquer sur **Créer le brouillon** | **Copier le texte**, le coller dans l’IA, coller la réponse dans l’éditeur |
| Espaces réservés | remplis immédiatement | remplis au collage (ou avec **Remplir les espaces réservés**) |
| Où va le texte ? | uniquement vers votre adresse Ollama (affichée dans la boîte de dialogue) | là où vous le collez : **vous en êtes responsable** |

Dans les deux cas, le texte est un **brouillon**. Relisez-le sur le fond avant de l’enregistrer et de le soumettre à l’approbation.

---

## Bases communes

### La boîte de dialogue « Rédiger avec l’IA »

Ouvrez un document ou créez-en un (Créer) et cliquez sur **Rédiger avec l’IA** dans la barre d’outils de l’éditeur (à partir du rôle **Content Owner**). Dans la boîte de dialogue, vous choisissez :

1. **Document** dans la liste. Seuls les documents correspondant au type du document ouvert sont proposés (pour *Policy* par exemple : politique de sécurité de l’information, politique de mots de passe, politique de sauvegarde …).
2. **Langue** du texte : la **langues choisies par votre organisation** (Admin → Organisation → Configuration des langues ; si toutes sont choisies, toutes sont proposées). La langue de l’interface est présélectionnée. Le texte de la demande est généré dans la langue choisie et n’a pas besoin d’être retouché. Si une seule langue est choisie, c’est la seule possibilité et la sélection n’est pas affichée.
3. **Indice (facultatif)**, 200 caractères maximum, p. ex. « NIS2, télétravail ».

Sous les champs, la boîte de dialogue montre **exactement le texte envoyé ou copié**, ainsi que la destination. Il change à chaque saisie.

**La liste de titres** compte 149 entrées, classées par type de document. Elle couvre les documents usuels d’un SMSI selon ISO 27001 et NIS2 et comprend expressément des modèles pour l’**intelligence artificielle** (utilisation, étiquetage des contenus générés par l’IA selon l’obligation de transparence du règlement européen sur l’IA, images, audio et vidéos générés par l’IA, gouvernance et classification des risques, maîtrise de l’IA, données confidentielles dans les services d’IA, acquisition de systèmes d’IA, contrôle humain, incidents d’IA). Il n’y a volontairement **pas de champ de titre libre**, pour qu’aucun nom ni donnée d’entreprise n’entre dans la requête. S’il manque un document, merci de le proposer.

**Politiques (Policy)** (38): Politique de sécurité de l’information; Politique d’utilisation acceptable; Politique de contrôle d’accès; Politique de mots de passe; Politique de sauvegarde; Politique de cryptographie; Politique de télétravail; Politique de sécurité des fournisseurs; Politique de bureau propre et d’écran vide; Politique des appareils mobiles; Politique de classification de l’information; Politique d’utilisation de l’intelligence artificielle; Politique d’étiquetage des contenus générés par l’IA; Politique sur les images, audio et vidéos générés par l’IA; Politique de gouvernance et de classification des risques de l’IA; Politique de maîtrise de l’IA par le personnel; Politique sur les données confidentielles dans les services d’IA; Politique d’acquisition et d’évaluation des systèmes d’IA; Politique de protection des données; Politique de conservation et de suppression; Politique de sécurité physique; Politique BYOD (appareils personnels); Politique d’utilisation du courrier électronique et d’Internet; Politique sur les réseaux sociaux; Politique d’utilisation du cloud; Politique de sécurité réseau; Politique de gestion des vulnérabilités; Politique de journalisation et de surveillance; Politique de développement sécurisé; Politique de gestion des actifs; Politique de sensibilisation et de formation; Politique de sécurité des ressources humaines; Politique de gestion de la continuité d’activité; Politique des accès privilégiés; Politique sur les supports amovibles; Politique des rôles et responsabilités en sécurité de l’information; Politique de sécurité OT/ICS; Politique de sécurité des produits (Cyber Resilience Act).

**Procédures (Procedure)** (63): Procédure de gestion des changements; Procédure d’arrivée, de mobilité et de départ; Procédure de gestion des correctifs; Procédure de revue des accès; Procédure de restauration des données; Procédure de gestion des vulnérabilités; Procédure de divulgation coordonnée des vulnérabilités; Procédure d’inventaire des actifs; Procédure d’analyse des journaux; Procédure de traitement des demandes des personnes concernées; Procédure d’audit interne; Procédure de revue de direction; Procédure de maîtrise des informations documentées; Procédure d’actions correctives et d’amélioration continue; Procédure d’évaluation des fournisseurs; Procédure d’élimination sécurisée des supports; Procédure de gestion des clés cryptographiques; Procédure d’appréciation et de traitement des risques; Procédure d’analyse d’impact sur l’activité; Procédure de reprise après sinistre; Procédure d’inventaire et de classification des risques des systèmes d’IA; Procédure de contrôle humain des systèmes d’IA; Procédure d’approbation des cas d’usage de l’IA; Procédure de gestion de la configuration; Procédure de gestion de la capacité; Procédure de protection contre les logiciels malveillants; Procédure de tests d’intrusion et de contrôles de sécurité; Procédure d’attribution et de retrait des droits d’accès; Procédure d’accès privilégiés et d’accès d’urgence; Procédure de réinitialisation des mots de passe; Procédure de vérification des candidats et du personnel; Procédure de restitution des équipements et des accès; Procédure de gestion des visiteurs; Procédure de contrôle d’accès physique; Procédure de manipulation des supports; Procédure d’étiquetage et de traitement de l’information; Procédure de transfert sécurisé de l’information; Procédure d’intégration de nouveaux fournisseurs; Procédure de fin de relation avec un fournisseur; Procédure d’analyse d’impact relative à la protection des données; Procédure de tenue du registre des activités de traitement; Procédure de recueil et de gestion des consentements; Procédure de suppression des données personnelles; Procédure de conclusion des contrats de sous-traitance; Procédure de signalement et d’évaluation des événements de sécurité; Procédure de collecte de preuves et d’investigation numérique; Procédure de retour d’expérience après incident; Procédure d’exercice et de test des plans de continuité; Procédure de vérification des sauvegardes; Procédure de mesure et de rapport de la sécurité de l’information; Procédure d’identification des exigences légales et réglementaires; Procédure de gestion des compétences et de la formation; Procédure de traitement des non-conformités; Procédure de demande de dérogation; Procédure d’approbation des services cloud; Procédure d’approbation et d’installation des logiciels; Procédure de revue de code et de tests de sécurité; Procédure de gestion des certificats; Procédure d’accès à distance; Procédure de gouvernance des données pour l’IA; Procédure de test et de surveillance des systèmes d’IA; Procédure d’information des personnes sur l’usage de l’IA; Procédure d’étiquetage des contenus générés par l’IA.

**Politiques de risque (Risk Policy)** (20): Politique de gestion des risques; Politique d’acceptation des risques et de critères de risque; Politique de gestion des risques de l’IA; Politique de gestion des risques de la chaîne d’approvisionnement et des tiers; Politique de méthodologie d’appréciation des risques; Politique d’appétence et de tolérance au risque; Politique de traitement des risques; Politique du registre des risques; Politique de rapport et d’escalade des risques; Politique des responsables de risque; Politique de surveillance et de revue des risques; Politique de gestion des risques de protection des données; Politique de gestion des cyber-risques (NIS2); Politique de gestion des risques de projet; Politique d’appréciation des risques liés aux changements; Politique des risques de continuité d’activité; Politique de gestion des risques internes; Politique des risques résiduels et des dérogations; Politique d’analyse d’impact des systèmes d’IA; Politique d’évaluation des actifs et des besoins de protection.

**Incidents (Incident)** (7): Procédure de réponse aux incidents; Procédure en cas de violation de données; Procédure de notification des incidents importants (NIS2); Procédure de réponse aux rançongiciels; Procédure en cas de perte ou de vol d’un appareil; Procédure en cas d’incident impliquant un système d’IA; Plan de communication de crise.

**Mises en production (Release)** (4): Procédure de validation et de mise en production; Procédure de changement d’urgence; Procédure de mise en production des systèmes et modèles d’IA; Procédure de mise en production de logiciels avec revue de sécurité.

**Applicabilité (SoA)** (2): Déclaration d’applicabilité (SoA); Procédure de mise à jour de la déclaration d’applicabilité.

**Plans BCM (BCM Plan)** (9 ; uniquement dans le module BCM, onglet Plans, champ « Procédures »): Plan de continuité d’activité général; Plan de reprise informatique (Disaster Recovery); Cyberattaque et rançongiciel; Panne de courant; Perte d’un bâtiment ou d’un site; Défaillance d’un fournisseur critique; Pandémie et absentéisme important; Communication de crise; Redémarrage du centre de données.

**Exercices BCM (BCM Exercise)** (6 ; uniquement dans le module BCM, onglet Exercices, champ « Scénario et déroulement »): Exercice sur table : rançongiciel; Test de restauration de la sauvegarde; Évacuation et perte du site; Défaillance d’un fournisseur; Test de la chaîne d’alerte; Exercice de panne de courant.

### Ce qui est envoyé, et ce qui ne l’est pas

Le texte se compose uniquement : d’une consigne fixe à l’IA, du type et du titre de la liste, d’une trame par type, de la langue cible, de la demande d’utiliser des **espaces réservés au lieu d’inventer des données**, et de votre indice. **Noms d’entreprise, noms de personnes, adresses et données système de votre installation ne sont jamais inclus.**

L’**indice** est le seul champ libre et il est vérifié :

- Sont autorisés : lettres, chiffres, espaces et `, . ; : ( ) / & + -`. Les sauts de ligne et les guillemets sont impossibles.
- Sont **bloqués** (rien n’est envoyé ni copié, la boîte de dialogue nomme la découverte) : adresses e-mail, adresses web et noms de domaine, adresses IP et MAC, IBAN, numéros de téléphone, nombres longs (six chiffres ou plus, p. ex. numéros de client), UUID, clés et jetons, chemins de fichiers, @noms, désignations d’entreprise comme GmbH, AG ou Ltd, et **les valeurs des données de votre organisation** (nom de l’organisation, abréviation, noms du RSSI et du DPD).
- **Limite :** le filtre ne peut pas reconnaître des noms de personnes ou d’entreprises quelconques. N’écrivez donc aucun nom dans l’indice.

### Espaces réservés

Au lieu d’inventer des données d’entreprise, l’IA écrit des espaces réservés. Ils sont remplacés à partir des données de l’organisation :

| Espace réservé | Remplacé par | Où vous gérez la valeur |
|---|---|---|
| `{{COMPANY_NAME}}` | nom de l’organisation | Admin → Organisation → Informations générales → *Nom de l’organisation* |
| `{{ISMS_OWNER}}` | nom de la personne responsable du SMSI | Admin → Organisation → Responsabilités → *Nom du RSSI / RSSI* |
| `{{DATA_PROTECTION_OFFICER}}` | nom du délégué à la protection des données | Admin → Organisation → Responsabilités → *Nom du DPD / RGP* |
| `{{ISMS_SCOPE}}` | périmètre du SMSI | Admin → Organisation → Informations générales → *Périmètre du SMSI* |

- Les écritures `[COMPANY_NAME]`, minuscules et majuscules et les espaces à l’intérieur des accolades (`{{ company name }}`) sont également reconnues.
- **Si la valeur est vide dans les données de l’organisation, l’espace réservé reste dans le texte** et un avis le nomme. Saisissez la valeur et cliquez sur **Remplir les espaces réservés**.
- Les autres crochets du texte (`{x}`, `[ici]`) ne sont pas touchés. Seuls ces quatre espaces réservés sont remplacés.

---

## Voie A : directement via l’IA connectée

### Mise en place (une fois, administrateur)

1. **Admin → Maintenance → Intégration IA (Ollama).**
2. Activer **Activer la recherche IA**. C’est l’interrupteur global de toutes les fonctions IA, y compris les brouillons.
3. Saisir l’**URL Ollama**. Vide signifie `http://localhost:11434`.
4. Saisir le **Modèle de génération (assistant IA)**. Vide signifie `llama3.2:3b`. Le modèle doit exister sur le serveur Ollama.
5. Saisir au besoin la **clé d’API** si l’adresse de l’IA en exige une ou si vous souhaitez reconnaître les requêtes dans le journal d’une passerelle placée devant (détails : console d’administration → Intégration IA). La clé n’est plus jamais affichée.

### Déroulement

1. Ouvrir la boîte de dialogue **Rédiger avec l’IA**, choisir le document, la langue et éventuellement un indice.
2. Vérifier le texte affiché et la destination. Si l’indice contient une découverte, **Créer le brouillon** est verrouillé jusqu’à correction.
3. Cliquer sur **Créer le brouillon**. Si l’éditeur contient déjà du texte, ISMS Builder demande confirmation avant d’écraser.
4. Le brouillon est dans l’éditeur, les espaces réservés sont remplis. Si le champ de titre est vide, le titre de la liste est repris. Les espaces réservés restés ouverts sont signalés.
5. Relire, adapter, **Enregistrer**. Le document reste au statut *Brouillon*.

La création peut prendre jusqu’à 60 secondes. Le journal d’audit indique qui a créé quel document dans quelle langue (et si un indice a été utilisé, pas son texte).

### En cas de problème

| Message | Signification et remède |
|---|---|
| La connexion IA directe est désactivée | L’interrupteur sous Admin → Maintenance est éteint. L’activer ou utiliser la voie B. |
| Ollama injoignable | Adresse erronée, Ollama ne tourne pas ou le pare-feu bloque. Vérifier l’URL Ollama. |
| Ollama a répondu avec HTTP … | Ollama a signalé une erreur, par exemple parce que le modèle n’y existe pas. Vérifier le nom du modèle et Ollama. |
| Réponse vide ou trop courte | Le modèle n’a rien livré d’utilisable. Réessayer ou saisir un modèle plus grand. |
| Non envoyé, l’indice contient … | Le filtre a trouvé une donnée personnelle ou technique. Modifier ou vider l’indice. |

---

## Voie B : copier-coller avec une IA de votre choix

Cette voie ne demande aucune mise en place et fonctionne aussi lorsque la connexion directe est désactivée (la boîte de dialogue s’ouvre quand même).

1. Ouvrir la boîte de dialogue **Rédiger avec l’IA**, choisir le document, la langue et éventuellement un indice.
2. Cliquer sur **Copier le texte** (ou sélectionner et copier vous-même le texte affiché). Si l’indice contient une découverte, le bouton est verrouillé.
3. Dans l’IA de votre choix, coller **uniquement ce texte** et l’envoyer. N’y ajoutez pas de données d’entreprise ou personnelles : c’est précisément la raison d’être des espaces réservés.
4. Copier la **réponse de l’IA**, de préférence uniquement le texte Markdown, **sans** les lignes de trois accents graves (```) que certaines IA placent autour du texte.
5. **Coller** dans l’éditeur du document (Ctrl+V). Si le texte contient des espaces réservés, ISMS Builder les remplace aussitôt et indique combien ont été remplacés et lesquels restent ouverts.
6. Du texte était déjà dans l’éditeur ? Cliquer sur **Remplir les espaces réservés**, ce qui remplace dans tout le texte.
7. Relire, adapter, **Enregistrer**.

**Protection des données avec la voie B :** le texte copié ne contient aucune donnée de votre organisation, et le filtre a vérifié l’indice. Ce que l’IA de votre choix en fait dépend de ses conditions. Utilisez des services que votre organisation a approuvés pour de tels contenus. Le collage de la réponse dans ISMS Builder remplace les espaces réservés localement ; le nom de votre organisation ne part nulle part.

---

## Questions et réponses

**Pourquoi mon texte contient-il encore `{{COMPANY_NAME}}` ?** La valeur manque dans les données de l’organisation, ou le texte n’est pas arrivé dans l’éditeur par collage (par exemple par glisser à la souris). Saisissez la valeur et cliquez sur **Remplir les espaces réservés**.

**L’IA a utilisé ses propres espaces réservés comme `[Nom de l’entreprise]`.** Ils ne sont pas remplacés automatiquement, car ISMS Builder ne connaît que les quatre espaces réservés. Demandez à l’IA d’utiliser exactement ceux du texte copié, ou remplacez ces endroits à la main.

**Qui peut le faire ?** La boîte de dialogue et la voie directe à partir du rôle *Content Owner* (même droit que pour créer un document). **Remplir les espaces réservés** et le remplacement automatique au collage à partir du rôle *Editor*.

**Puis-je choisir librement le titre ?** Pas pour le brouillon. Après avoir collé le texte, vous pouvez modifier le champ de titre dans l’éditeur comme d’habitude.

**Cela vaut-il aussi pour l’application mobile ?** La connexion directe n’y existe pas. La transmission à une application d’IA via le menu de partage Android est prévue.
