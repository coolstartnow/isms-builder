# Module : Organisation et logo de l’entreprise

> C’est ici que les administrateurs définissent l’organisation : nom, responsabilités, langues, notifications,
> services et le **logo de l’entreprise**, qui apparaît sur la page de connexion, dans les PDF des politiques et dans les vues d’impression.

---

## Où trouver les paramètres ?

**Admin → Organisation.** Cette zone n’est visible que pour les administrateurs. Les modifications sont appliquées avec **Enregistrer** en haut à droite ; le logo, lui, est enregistré **immédiatement lors du téléversement**.

| Section | Contenu |
|---|---|
| **Informations générales** | Nom de l’organisation, abréviation, texte du logo, **logo de l’entreprise**, périmètre du SMSI |
| **Responsabilités** | RSSI, délégué à la protection des données (DPO) et contact ICS avec nom et e-mail |
| **Politiques de sécurité** | Imposer la 2FA pour tout le système (la connexion sans TOTP est alors bloquée) |
| **Configuration des langues** | Langues activées (DE, EN, FR, NL, HU) et langue par défaut de la page de connexion |
| **Notifications par e-mail** | Interrupteur global et types de notification individuels |
| **Configuration SMTP** | Serveur de messagerie pour les notifications et les accusés de lecture des politiques |
| **Publication WebDAV** | Déposer automatiquement les politiques approuvées dans Nextcloud/ownCloud |
| **Ordre du menu** | Ordre des entrées du menu latéral |
| **Unités organisationnelles** | Structure informatique (CIO, groupe/central, local) utilisée pour les responsabilités dans tous les modules |

Les mots de passe SMTP et WebDAV sont **en écriture seule** : le serveur ne les affiche plus jamais, pas même aux administrateurs. Un champ vide laisse le mot de passe enregistré inchangé ; une option distincte permet de le supprimer.

---

## Logo de l’entreprise

Le logo donne aux documents officiels l’apparence de votre organisation.

### Téléversement

1. **Admin → Organisation → Informations générales**, ligne **Logo de l’entreprise**.
2. Choisissez un fichier. Il est enregistré immédiatement et affiché en aperçu.
3. Pour le remplacer, choisissez un nouveau fichier ; pour le supprimer, cliquez sur **Supprimer le logo**.

| Règle | Valeur |
|---|---|
| Formats | **PNG** ou **JPEG** |
| Taille | **512 ko** et **4000 pixels** par côté au maximum |
| Non autorisés | SVG et tout autre format. Le SVG peut contenir des scripts et est donc volontairement refusé |

Le type de fichier est vérifié d’après le contenu, pas d’après l’extension ni l’indication du navigateur. Un **logo en format paysage sur fond transparent ou blanc** convient le mieux ; jusqu’à environ 840 × 400 pixels suffit pour toutes les sorties.

### Où le logo apparaît

| Endroit | Affichage |
|---|---|
| **Page de connexion** | au-dessus du formulaire, sur une tuile claire (pour que les logos sombres restent lisibles) |
| **PDF des politiques** | petit, en haut à droite de la première page ; le titre commence en dessous |
| **Vues d’impression** | en haut à droite dans les fenêtres d’impression des rapports, des vues d’ensemble des risques, constats et mesures, des sorties d’audit et de l’export de documents |

Ne sont pas concernés : l’en-tête de l’application et l’application mobile. Sans logo, toutes les sorties restent comme avant, simplement sans image.

Qui peut **voir** le logo : toute personne qui atteint la page de connexion (elle l’affiche). Qui peut le **modifier** : uniquement les administrateurs ; chaque modification est consignée dans le journal d’audit.

### Démo et production

- En **mode démo**, ISMS Builder fournit son propre logo. Il est défini au chargement des données de démonstration, mais seulement si vous n’avez pas encore de logo.
- Lors du **passage en production** (Admin → Maintenance → Réinitialisation démo), le logo de démonstration est supprimé. Un logo que vous avez téléversé reste.
- Ensuite, ISMS Builder vous rappelle de **définir le logo de l’entreprise** : dans le résultat de la réinitialisation, dans l’avis de la page de connexion, en haut du tableau de bord (pour les administrateurs) et dans les paramètres. L’avis disparaît dès qu’un logo est téléversé.

### Sauvegarde

Le logo est un fichier du répertoire de données (`org-logo.png` ou `org-logo.jpg` avec `org-logo.json`), indépendant du back-end de stockage choisi. Il **ne fait pas** partie de l’export de données JSON ; une sauvegarde du répertoire de données l’inclut.

---

## Conseils

- Téléversez le logo **avant** le premier PDF de politique. Les PDF déjà créés ne changent pas.
- Si le logo paraît flou dans le PDF, utilisez un fichier plus grand (jusqu’à 4000 pixels) restant à 512 ko au maximum.
- Après le téléversement, rechargez la page si un onglet ouvert affiche encore l’ancien logo.
