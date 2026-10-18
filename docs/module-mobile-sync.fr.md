# Module : Application mobile (Android) et synchronisation

> L'application Android est une variante autonome d'ISMS Builder, utilisable hors ligne. Elle conserve ses propres
> données sur le téléphone et les synchronise à la demande avec le système principal — par Wi-Fi ou par fichier.

---

## Ce que fait l'application

- **Travail hors ligne :** l'application embarque l'interface et la logique du serveur (évaluation des risques, types d'actifs, gestion des versions, changements de statut). Aucun serveur n'est nécessaire.
- **Modules :** documents/modèles, SoA (déclaration d'applicabilité), risques, actifs, constats d'audit et guidance. Tous les autres modules (p. ex. RGPD, BCM, fournisseurs, administration) ne sont pas dans l'application.
- **Utilisateur local :** sur l'appareil, on travaille en administrateur de ses propres données. Les droits du système principal ne s'appliquent que lors de la synchronisation.
- **Téléphone et tablette :** l'interface s'adapte (portrait et paysage ; en paysage, la barre latérale reste visible). Il n'y a pas de réglages de mot de passe, 2FA et rôles en local ; la langue se choisit dans le panneau de synchronisation sous *Langue de l'interface*.
- **Non disponible :** envoi de fichiers/pièces jointes, publication WebDAV, fonctions d'IA, téléchargement de PDF depuis le serveur.

## Prérequis sur le système principal

- ISMS Builder **version 1.75 ou ultérieure** (protocole de synchronisation 1, indiqué par `GET /api/version` sous `syncProtocol`).
- `STORAGE_BACKEND=json` (par défaut). Avec sqlite, mariadb ou postgres, les points d'accès de synchronisation répondent `501`.
- **HTTPS :** le serveur doit être joignable en `https://` (mise en place : `scripts/setup-ssl.sh`, section *Configuration SSL/TLS*). L'adresse saisie dans l'application doit figurer dans le certificat.
- **Versions :** l'application a **son propre numéro de version** et est indépendante du système principal. Les deux sont compatibles lorsque le protocole de synchronisation correspond (actuellement 1) et que le serveur est au moins en version 1.75. L'application affiche la version et la compatibilité sous *Vérifier le serveur* et *Infos et prérequis*.
- Un compte utilisateur. Son rôle détermine ce que l'application peut transférer :

| Module | Lecture | Écriture (push) |
|---|---|---|
| Documents/modèles, SoA, actifs | à partir de `reader` | à partir de `editor` |
| Risques, constats d'audit | à partir de `reader` | à partir de `auditor` / `contentowner` |
| Guidance | à partir de `reader` (selon `minRole` du document) | lecture seule |

## Certificat sur le téléphone

Avec un certificat publiquement approuvé (p. ex. Let's Encrypt), rien n'est à faire. Avec un **certificat propre ou auto-signé**, le téléphone doit lui faire confiance :

1. Lors de la création avec `scripts/setup-ssl.sh`, saisir sous *Noms/adresses IP supplémentaires* le nom ou l'IP utilisé dans l'application (p. ex. `192.168.1.20`). Si l'adresse ne figure pas dans le certificat, l'application refuse la connexion.
2. Copier `ssl/cert.pem` sur le téléphone (USB, Nextcloud, e-mail).
3. Sur le téléphone : *Paramètres → Sécurité → Chiffrement et identifiants → Installer un certificat → Certificat d'autorité (CA)* (le chemin varie selon le fabricant). Android avertit pour les certificats tiers ; ici, c'est votre propre certificat.
4. Dans l'application, choisir *Vérifier le serveur* : si la version du serveur s'affiche, le téléphone fait confiance au certificat.

Messages d'erreur : *Serveur injoignable* → vérifier adresse, port, Wi-Fi/VPN et pare-feu du serveur. *Certificat … non approuvé* → étapes 1 à 3.

## Synchronisation par Wi-Fi

1. Appuyer sur le bouton de synchronisation en bas à droite de l'application.
2. Saisir l'adresse du serveur (p. ex. `https://isms.example.org:3000`), l'utilisateur et le mot de passe (si la 2FA est activée, l'application affiche un champ pour le code). **Le mot de passe n'est pas enregistré.**
3. **Synchroniser maintenant.** L'application envoie d'abord les modifications locales (push), puis récupère tout ce qui est nouveau sur le serveur (pull). La première synchronisation télécharge l'ensemble des données de base.

Règles :

- **Modifications uniquement :** seul ce qui a changé depuis la dernière synchronisation est transféré.
- **Heure du serveur :** le serveur attribue `updatedAt` à l'acceptation. Une horloge de téléphone erronée ne perturbe pas la synchronisation.
- **Conflits :** si un enregistrement a été modifié sur le serveur après avoir été récupéré par le téléphone, il n'est **pas écrasé**. Il apparaît dans l'application sous *Résoudre les conflits*, avec les champs divergents. Pour chaque enregistrement, on choisit *Garder ma version* (envoyée à la prochaine synchronisation) ou *Prendre la version du serveur*.
- **Suppression :** supprimer sur le téléphone place l'enregistrement dans la corbeille du système principal. *Supprimer définitivement* sur le téléphone y est également transmis comme enregistrement supprimé ; il n'est pas retiré du système principal.
- **Refusé :** si le rôle manque pour un module, l'application l'indique comme *refusé* ; les modifications locales ne sont pas perdues.

## Synchronisation par fichier

Pour les appareils sans connexion réseau au système principal :

- **Exporter tout** — sauvegarde complète des données de l'application (application vers application, ou archive).
- **Exporter uniquement les modifications** — fichier contenant les enregistrements modifiés localement. Import sur le système principal :

  ```bash
  node scripts/sync-import.js http://localhost:3000 admin isms-mobile-changes-2026-10-18.json
  ```

  Le mot de passe provient de la variable d'environnement `ISMS_SYNC_PASSWORD` ou d'une invite. La même règle de conflit que pour la synchronisation Wi-Fi s'applique ; le code de sortie `3` signale des conflits ou des enregistrements refusés.
- **Importer un fichier** — accepte un bundle de l'application ou un export du système principal (*Admin → Export*). L'application affiche d'abord un **aperçu** (nouveau / mis à jour / inchangé / conflits). Les enregistrements modifiés localement ne sont jamais écrasés silencieusement. L'export du système principal ne contient que les modules qu'il fournit lui-même (p. ex. modèles, SoA, risques, guidance) ; les actifs et les constats arrivent par la synchronisation Wi-Fi.

## API

| Méthode | Chemin | Objet |
|---|---|---|
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Modifications depuis `since`, y compris les enregistrements supprimés. La réponse contient `serverTime` pour le pull suivant. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <module>: [enregistrements avec baseUpdatedAt] } }` — réponse : `accepted`, `conflicts`, `rejected`. |

Modules : `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Décrit dans `docs/architecture/openapi.yaml`.

## Sécurité

- La transmission est **exclusivement chiffrée (HTTPS)**. L'application refuse le `http://` non chiffré. En dehors de votre propre Wi-Fi, le serveur devrait en outre être joignable par VPN ou reverse proxy.
- Les données se trouvent dans le stockage protégé de l'application sur l'appareil, mais **ne sont pas chiffrées en plus**. Le verrouillage de l'appareil et le chiffrement Android sont indispensables.
- La session n'est valable que pour la synchronisation et n'est pas enregistrée.

## Limites

- Backend JSON uniquement ; les pièces jointes ne sont pas synchronisées.
- Les conflits sont résolus par enregistrement, pas par champ.
- Les enregistrements supprimés définitivement sur le système principal n'atteignent pas le téléphone.
- L'application contient la logique serveur de la version avec laquelle elle a été construite. Après une mise à jour du serveur, reconstruire aussi l'application (`npm run build:www` dans le projet `Confluence_ISMS_android`).
