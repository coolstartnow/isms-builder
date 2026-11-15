# Module : Évaluation des fournisseurs (Suppliers)

> Les fournisseurs et prestataires ayant accès aux valeurs informationnelles doivent
> être évalués et surveillés — ISO 27001 A.5.19 à A.5.22.

---

## Pourquoi évaluer les fournisseurs ?

De nombreux incidents de sécurité sont causés par des tiers ayant accès aux systèmes
ou aux données (attaques de la chaîne d'approvisionnement, services SaaS non sécurisés,
sous-traitants non contrôlés). ISO 27001 exige donc une gestion systématique des
risques liés aux fournisseurs.

---

## Rôles et permissions

| Action | Rôle minimum |
|---|---|
| Consulter les fournisseurs | `reader` |
| Créer et modifier un fournisseur | `editor` |
| Supprimer / restaurer un fournisseur | `admin` |

---

## Créer un fournisseur

**Fournisseurs → « + Nouveau fournisseur »**

Champs :
- **Nom** — raison sociale
- **Catégorie** — p. ex. Prestataire informatique, Fournisseur cloud, Entreprise de maintenance
- **Contact** — interlocuteur, e-mail
- **Niveau d'accès** — à quels systèmes/données le fournisseur a-t-il accès ?
- **Évaluation des risques** — `low` / `medium` / `high` / `critical`
- **Statut** — `active` / `inactive` / `under_review`
- **Prochaine révision** — quand la prochaine évaluation est-elle due ?
- **Exigences de sécurité** — quelles exigences ont été convenues ?
- **Preuves** — un certificat ISO, un rapport SOC2, un contrat AV sont-ils disponibles ?

---

## Lien du justificatif et date d'expiration

Dans le formulaire fournisseur, vous pouvez enregistrer un **lien de justificatif**, par exemple vers le certificat ISO 27001 ou le rapport SOC du fournisseur, et indiquer **jusqu'à quand le justificatif est valable**.

- **Lien du justificatif** — adresse d'un document que **vous gérez vous-même** (p. ex. SharePoint ou le portail fournisseur). Seules les adresses commençant par `http://` ou `https://` sont acceptées.
- **Libellé** — court texte pour le lien, p. ex. « certificat ISO 27001 ».
- **Justificatif valable jusqu'au** — date d'expiration du justificatif.

ISMS Builder n'enregistre que le lien. Il n'ouvre jamais le lien et ne vérifie ni l'accessibilité, ni le contenu, ni la validité du document ; le contrôle reste de votre côté. À la date d'expiration, une entrée **« Justificatif fournisseur expirant »** apparaît dans le calendrier, 60 jours avant et également après l'expiration, tant que le fournisseur n'est pas « inactive » ou « terminated ». Dans la liste des fournisseurs, la colonne « Justificatif » affiche le lien et signale les justificatifs expirés.

---

## Évaluation fournisseur par e-mail

Pour les fournisseurs critiques, un **questionnaire de sécurité** peut être envoyé
sans que le fournisseur ait besoin d'un compte :

**Ouvrir le fournisseur → « Envoyer l'évaluation »**

Le fournisseur reçoit un lien personnalisé et remplit le questionnaire
directement dans le navigateur. Les réponses sont enregistrées et associées
au profil du fournisseur.

---

## Modèles de questionnaire et catalogue NIS2

Vous définissez les questions posées à un fournisseur sous **Fournisseurs → Modèles de questionnaire**. Cela peut varier selon le fournisseur ou le type de prestation.

- **Catalogues :** « Standard » (19 questions, ISO 27001) et « Évaluation fournisseur NIS2 » (56 questions en 13 sections, structurées selon la directive (UE) 2022/2555, art. 20, art. 21, par. 2, points a) à j) et art. 23). Les questions sont formulées par nos soins ; ce n’est ni une liste de contrôle officielle ni un conseil juridique. Le catalogue NIS2 existe en allemand et en anglais ; dans les autres langues, les questions s’affichent en anglais.
- **Modèles personnalisés :** pour chaque question, choisissez si elle est **posée**, si elle est **obligatoire** et si une question oui/non propose un **champ de remarque** (par ex. pour un lien vers un justificatif). Les sections peuvent être activées ou désactivées en bloc ; vous pouvez ajouter vos propres questions. Les modèles intégrés ne sont pas modifiables ; utilisez « Adapter comme nouveau modèle ». Les éditeurs créent et modifient les modèles ; les lecteurs peuvent les consulter.
- **Adaptation par fournisseur :** lors de la création d’un lien d’évaluation, vous choisissez un modèle et pouvez encore modifier la sélection pour ce fournisseur. La sélection est enregistrée sous forme de copie ; les modifications ultérieures du modèle ne touchent pas les questionnaires déjà émis.
- **Les questions obligatoires** sont marquées d’un * pour le fournisseur et sont également vérifiées côté serveur. Les anciens questionnaires se comportent comme avant.
- Les remarques et réponses proviennent du fournisseur et sont affichées comme texte ; le Builder n’ouvre jamais un lien indiqué dans une remarque.

---

## Boîte aux lettres fournisseurs (le Builder reste interne)

Le Builder est destiné à un usage interne. Pour que les fournisseurs puissent néanmoins renseigner eux-mêmes leurs informations sans que le Builder soit joignable depuis Internet, il existe la **boîte aux lettres fournisseurs** : un petit service distinct (projet `isms-supplier-portal`) qui ne contient que des questionnaires et des réponses chiffrées et ne connaît aucune donnée du SMSI.

- **Déroulement :** le Builder dépose le questionnaire dans la boîte *en sortie*. Le fournisseur ouvre le lien de la boîte et remplit ; son navigateur **chiffre les réponses avant l’envoi** (AES-256-GCM, clé enveloppée par RSA-OAEP-256 pour votre clé publique). Le Builder récupère les réponses *en sortie* (toutes les 5 minutes ou via « Récupérer les réponses »), les déchiffre lui-même puis les supprime dans la boîte. La boîte ne peut pas lire les réponses.
- **Configuration (administrateur)** sous **Fournisseurs → Modèles de questionnaire → Boîte aux lettres fournisseurs :** adresse (https), clé API de la boîte, création de la paire de clés, activation, test de connexion. La **clé privée** est stockée hors du répertoire de données (`~/.config/isms-builder/supplier-portal.pem` ou `SUPPLIER_PORTAL_KEY_FILE`, droits 600) et **vous devez la sauvegarder** — sans elle, les réponses reçues sont illisibles. Lors du remplacement de la paire de clés, l’ancienne clé est conservée en copie. Si la boîte utilise un certificat auto-signé, indiquez l’autorité de certification au Builder via `NODE_EXTRA_CA_CERTS`.
- **Mode d’envoi :** à la création d’un lien d’évaluation, choisissez « Via la boîte aux lettres » ou « Directement ». Les questionnaires passant par la boîte ne sont plus servis par la page du Builder. Si le questionnaire ne peut pas être déposé dans la boîte, il n’est pas créé.
- **Secours sans réseau :** « Importer un fichier » reprend un fichier de réponses de la boîte ; il est vérifié de la même façon.
- **Limites :** le chiffrement protège la confidentialité vis-à-vis de la boîte mais ne prouve pas l’origine d’une réponse : quiconque connaît le lien peut répondre une fois. Les réponses sont des saisies du fournisseur. Si des questions expressément obligatoires manquent, la réponse est acceptée et marquée d’un !. Les durées de conservation et les accords de sous-traitance pour l’exploitation de la boîte relèvent de vous.

---

## Langue, formulaire PDF et saisie des réponses

- **Langue :** lors de la création d’un lien d’évaluation, seules les langues activées dans les **paramètres de l’organisation** (et disposant d’une traduction complète) sont proposées. La langue de l’interface est présélectionnée ; si une seule langue est activée, le choix est masqué. Le titre suit la langue choisie. Cela vaut pour les deux modes d’envoi (boîte aux lettres et direct) et pour le PDF.
- **Interlocuteur :** le nom et l’e-mail de l’interlocuteur figurent sur le formulaire ; le nom et l’e-mail du RSSI des paramètres de l’organisation sont présélectionnés et modifiables par questionnaire.
- **Adresse :** saisissez rue, code postal/ville, pays et téléphone sous **Administration → Organisation** ; ils apparaissent dans l’en-tête du formulaire PDF à côté du logo.
- **Formulaire PDF :** pour un questionnaire ouvert, le bouton **Formulaire PDF** crée un **PDF remplissable** avec logo, nom de l’entreprise, adresse, interlocuteur, fournisseur, échéance, référence, cases à cocher (oui/non), champs de remarque et de texte, questions obligatoires marquées d’un * et un bloc de signature. Le fournisseur le remplit à l’écran ou à la main et le renvoie par e-mail ou courrier. Le PDF ne contient **pas** le lien secret, seulement la référence du questionnaire. Le PDF utilise la **police PDF** incorporée de l’organisation (par défaut Liberation Sans ; Administration → Organisation), de sorte que les lettres spéciales de toutes les langues officielles de l’UE s’affichent correctement. Exception : ce que le fournisseur saisit dans les champs du formulaire est dessiné par son logiciel PDF avec la police standard du format PDF ; l’affichage des caractères spéciaux dans chaque logiciel n’a pas été vérifié.
- **Saisir les réponses :** avec **Saisir les réponses**, les éditeurs reportent les réponses du formulaire retourné dans un masque comportant les mêmes questions. Si des réponses obligatoires manquent, le Builder demande confirmation ; elles ne sont enregistrées qu’après confirmation et marquées d’un !. Le questionnaire reçoit la mention « Formulaire » et une trace dans le journal d’audit. Seul un questionnaire ouvert peut être traité ainsi ; contrôlez-le ensuite comme d’habitude.

---

## Évaluation des risques

L'évaluation des risques d'un fournisseur dépend de :
- La nature et l'étendue de l'accès aux données
- La criticité des processus dépendants
- Les mesures de sécurité attestées (certifications, audits)
- La couverture contractuelle (contrat AV, NDA, SLAs)

Les fournisseurs avec une évaluation `high` ou `critical` devraient être
révisés au minimum annuellement.

---

## Lien avec le RGPD

Les fournisseurs qui traitent des données personnelles apparaissent également dans
le module RGPD sous Contrats de sous-traitance (AV). La liaison s'effectue là-bas
manuellement lors de la saisie AV.

---

## Risques liés

Dans le formulaire de risque, les risques peuvent être liés à un ou plusieurs fournisseurs (section « Liens » → **Actifs, types d'actifs et fournisseurs concernés**). Dans le formulaire du fournisseur (en modification), la section **Risques liés** liste tous les risques associés avec niveau et statut.

---

## Tableau de bord

L'aperçu des fournisseurs affiche :
- Nombre total par évaluation des risques
- Fournisseurs avec révision en retard
- Fournisseurs actifs vs. inactifs

---

## Remarque d'audit

ISO 27001 A.5.19 exige une politique pour les relations avec les fournisseurs.
A.5.20 exige des exigences de sécurité dans les contrats fournisseurs.
A.5.21 traite des risques liés à la chaîne d'approvisionnement.
A.5.22 exige la surveillance régulière des performances et de la sécurité des fournisseurs.

La fonctionnalité d'évaluation des fournisseurs permet la preuve documentée
du contrôle de sécurité vis-à-vis de l'auditeur.
