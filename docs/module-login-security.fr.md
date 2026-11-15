# Module : connexion, sessions et mise en production

> Comment la connexion est protégée : **une session par compte**, mots de passe de démonstration **uniquement en démo**, cookie uniquement via **HTTPS**. Ce guide s'adresse aux administrateurs et exploitants.

---

## Une seule session simultanée par compte

Chaque compte ne peut avoir **qu'une session à la fois**. Quand quelqu'un se connecte avec un compte, la session précédente de ce compte prend fin ; au prochain clic elle revient à la page de connexion.

**Si vous avez besoin de deux sessions en même temps** (deux personnes, deux appareils ou navigateurs), créez un **compte distinct**. Un compte ne se partage pas.

Une session prend aussi fin : à la **déconnexion** (immédiatement, un jeton copié est alors inutilisable), lors d'un **changement de mot de passe** (votre propre session reste), quand un administrateur **modifie le rôle, le domaine ou les fonctions**, **réinitialise un mot de passe** ou **supprime le compte**, et après **8 heures** (`JWT_EXPIRES_IN`).

Le mot de passe doit comporter **au moins 8 caractères**. Les clés d'accès de l'application mobile (synchronisation) sont distinctes et non concernées par cette règle.

## Démo et production

Une nouvelle instance est une **démo** avec les comptes de démonstration (`admin`, `alice`, `bob`, `carla`, `dana`) et des mots de passe publics (p. ex. `adminpass`). Le passage en **production** se fait via **Administration → Réinitialisation de la démo** (ou `scripts/prepare-production.js`) ; le système est alors marqué durablement comme productif.

Un clic sur **Administration → Maintenance → Réinitialisation de la démo** (et la voie en ligne de commande `node scripts/prepare-production.js`) **ouvre d'abord ce guide** dans une fenêtre séparée. Le bouton de confirmation n'est disponible qu'après avoir fait défiler jusqu'à la fin et après au moins 15 secondes. **Le passage ne commence qu'après votre confirmation et la fermeture de la fenêtre** ; si la fenêtre est fermée autrement ou si une fenêtre contextuelle est bloquée, rien n'est modifié. L'entrée « Réinitialisation de la démo » du journal d'audit indique que le guide a été affiché et confirmé. Le guide n'apparaît pas pendant l'usage normal de la démo.

**Sauvegarde :** avant toute suppression, toutes les données de démonstration (modules, liste des utilisateurs sans mots de passe, paramètres, journal, données de protection des données et juridiques) sont exportées dans le fichier `isms-demo-export-<date>.json` et **téléchargées automatiquement**. Veuillez conserver ce fichier — le serveur n'en garde aucune copie. Les fichiers téléversés (pièces jointes, logo) ne sont pas inclus. En ligne de commande, `prepare-production.js` crée à la place une sauvegarde du répertoire `data/` et affiche son chemin.

![La réinitialisation de la démo ouvre d'abord ce guide ; le passage ne commence qu'après votre confirmation.](images/security/sec-04-anleitung-vor-umstellung.png)

En production, les **mots de passe de démonstration sont bloqués** : la connexion avec eux est refusée et ils ne peuvent plus être attribués. Seule exception : la **passation** juste après la réinitialisation : `admin` se connecte avec le mot de passe initial et doit **définir immédiatement son propre mot de passe** ; toutes les autres fonctions restent bloquées jusque-là.

![Passation après la réinitialisation : le mot de passe initial doit être changé immédiatement.](images/security/sec-03-passwortwechsel-pflicht.png)

## Avertissement : mots de passe de démonstration en production

Si un compte en production porte encore son mot de passe de démonstration, le système avertit clairement — **l'avertissement ne peut pas être fermé** et reste jusqu'au remplacement de tous les mots de passe :

- **Journal du serveur :** au démarrage puis toutes les 30 minutes, un encadré visible « SICHERHEITSWARNUNG » avec les comptes concernés et la commande de correction.
- **Page de connexion :** un avis rouge (sans noms de comptes). Quiconque saisit le mot de passe de démonstration reçoit le message « bloqué ».
- **Administrateurs connectés :** une barre rouge fixe tout en haut avec les comptes concernés.

![Page de connexion : le mot de passe de démonstration est bloqué, l'avertissement reste visible.](images/security/sec-01-demo-passwort-gesperrt.png)

![Les administrateurs voient en haut une barre fixe avec les comptes concernés.](images/security/sec-02-warnleiste-administrator.png)

### Comment corriger

1. **En tant qu'autre administrateur :** Administration → Utilisateurs → ouvrir le compte → définir un nouveau mot de passe (l'utilisateur doit le changer à la prochaine connexion).
2. **Sur le serveur** (aussi si le seul administrateur est concerné) : `node scripts/set-password.js admin` — dans le conteneur Docker : `docker exec -it <container> node scripts/set-password.js admin`. Le mot de passe est demandé sans écho ; les sessions existantes du compte prennent fin.

## HTTPS

Le cookie de session reçoit l'indicateur **Secure** et le serveur envoie **HSTS** dès que la requête arrive en HTTPS : avec votre propre certificat (`SSL_CERT_FILE`/`SSL_KEY_FILE`) ou derrière un proxy avec **`TRUST_PROXY`** défini (sans cette variable, l'application ne reconnaît pas HTTPS derrière le proxy).

En HTTP, le système continue de fonctionner pour l'instant mais **avertit au démarrage** : cookie et mots de passe sont lisibles sur le réseau. Dans une version ultérieure, HTTP en production ne sera autorisé qu'avec `ALLOW_INSECURE_HTTP=true`. N'exploitez le système en production que via HTTPS.

## Remarques pour la mise à jour

- Après la mise à jour, **tout le monde se reconnecte une fois** (les anciens jetons ne sont plus valables).
- Quiconque utilise un **mot de passe de démonstration** en production est verrouillé — voir « Comment corriger ».
- Derrière un proxy, définir `TRUST_PROXY` pour que HTTPS soit reconnu.

_Les captures d'écran montrent l'interface en allemand._

## Urgence : verrouillé par l'obligation 2FA

Si l'**obligation 2FA** est activée sous *Administration → Organisation → Politiques de sécurité* et qu'**aucun administrateur** n'a configuré la 2FA, plus personne ne peut se connecter : la connexion répond `ENFORCE_2FA`, et la 2FA ne peut être configurée qu'après connexion.

**Prévention.** Le serveur n'active l'obligation que si l'administrateur qui agit **a lui-même** une 2FA configurée (sinon erreur `ENFORCE_2FA_SELF`, rien n'est modifié). Avant l'activation, l'interface indique combien de comptes n'ont pas encore de 2FA. Configurez d'abord la 2FA pour au moins deux administrateurs. Au démarrage, le serveur écrit un avertissement dans le journal si l'obligation est active et qu'aucun administrateur n'a de 2FA.

**Procédure d'urgence en ligne de commande** (`scripts/emergency-2fa.js`, tous les backends ; **arrêtez d'abord le serveur**, sinon il écrase la modification) :

```
node scripts/emergency-2fa.js status                      # affiche l'état, ne modifie rien
node scripts/emergency-2fa.js disable-policy              # désactive l'obligation 2FA
node scripts/emergency-2fa.js reset-user <utilisateur>    # réinitialise la 2FA d'un compte
```

Docker : `docker exec -it <conteneur> node scripts/emergency-2fa.js status`. L'outil demande confirmation avant chaque modification (taper JA ; `--yes` évite la question), crée une copie de sauvegarde avec le stockage JSON (`*.notfall-<heure>.bak`), consigne la modification dans le journal d'audit (utilisateur `notfall-cli`) et n'affiche jamais de secrets. Si un serveur tourne encore, il s'arrête (`--force` force). Ensuite : démarrer le serveur, se connecter en administrateur, **configurer la 2FA**, et seulement alors réactiver l'obligation.

Qui peut exécuter l'outil a accès aux données du serveur ; ce n'est pas un contournement de la protection d'accès, mais la voie de l'exploitant.
