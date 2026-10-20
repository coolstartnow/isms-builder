# Module : Application mobile (Android) et synchronisation

> L'application Android est une variante autonome d'ISMS Builder, utilisable hors ligne. Elle conserve ses propres
> données sur le téléphone ou la tablette et les synchronise à la demande avec le système principal — par Wi-Fi ou par fichier.

> **⚠ Important — uniquement avec le stockage JSON :** L'application mobile et la synchronisation fonctionnent **exclusivement** lorsqu'ISMS Builder utilise le **stockage JSON** (`STORAGE_BACKEND=json`, par défaut). Avec **SQLite, MariaDB/MySQL ou PostgreSQL, la synchronisation n'est pas disponible** (le serveur répond `501`). Le stockage actif est défini dans le `.env` du serveur (`STORAGE_BACKEND`). À vérifier avant d'utiliser l'application.

---

## Ce que fait l'application

- **Travail hors ligne :** l'application embarque l'interface et la logique du serveur (évaluation des risques, types d'actifs, gestion des versions, changements de statut). Aucun serveur n'est nécessaire.
- **Modules :** documents/modèles, SoA (déclaration d'applicabilité), risques, actifs, constats d'audit et guidance. Tous les autres modules (p. ex. RGPD, BCM, fournisseurs, administration) ne sont pas dans l'application.
- **Un compte par application :** après la configuration, l'application appartient à exactement un compte de synchronisation. Nom, menu et droits d'édition dans l'application suivent les droits de ce compte.
- **Téléphone et tablette :** l'interface s'adapte (portrait et paysage ; en paysage, la barre latérale reste visible). Il n'y a pas de réglages de mot de passe, 2FA et rôles en local ; la langue se choisit dans le panneau de synchronisation sous *Langue de l'interface*.
- **Aide dans l'application :** Le bouton « ? » du panneau de synchronisation et de l'écran de configuration ouvre une aide intégrée (configuration, synchronisation, conflits, échange de fichiers, sécurité, messages d'erreur). Elle est lisible hors ligne et disponible dans les cinq langues.
- **Droits par zone :** Nouveau, modifier, supprimer et envoi de fichier n'apparaissent que dans les zones où le compte de synchronisation peut écrire ; la guidance est toujours en lecture seule dans l'application. Les fonctions d'impression et de PDF n'existent que sur le serveur.
- **Non disponible :** envoi de fichiers/pièces jointes (les fichiers PDF/Word de la guidance n'existent que sur le serveur ; l'application affiche une note), publication WebDAV, fonctions d'IA, téléchargement de PDF depuis le serveur.

## Prérequis sur le système principal

- ISMS Builder **version 1.76 ou ultérieure** (protocole de synchronisation 1, indiqué par `GET /api/version` sous `syncProtocol`).
- `STORAGE_BACKEND=json` (par défaut). Avec sqlite, mariadb ou postgres, les points d'accès de synchronisation répondent `501`.
- **HTTPS :** le serveur doit être joignable en `https://` (mise en place : `scripts/setup-ssl.sh`, section *Configuration SSL/TLS*). L'adresse saisie dans l'application doit figurer dans le certificat.
- **Versions :** l'application a **son propre numéro de version** et est indépendante du système principal. Les deux sont compatibles lorsque le protocole de synchronisation correspond (actuellement 1) et que le serveur est au moins en version 1.76. L'application affiche la version et la compatibilité sous *Vérifier le serveur* et *Infos et prérequis*.
- Un **compte de synchronisation** (voir ci-dessous). Un compte utilisateur normal n'est pas utilisé pour la synchronisation.

## Créer un compte de synchronisation

Les administrateurs créent les comptes de synchronisation sous *Administration → Utilisateurs*, dans la section *Comptes de synchronisation (application mobile)* (*Nouveau compte de synchronisation*). Un compte de synchronisation représente un **rôle ou une personne** (p. ex. « RSSI », « DPD », « Audit ») et est **indépendant des utilisateurs** : pas de connexion à l'interface, pas de rôle, pas de mot de passe, pas de 2FA. Il sert uniquement à la synchronisation des données de l'application.

- **Nom**, p. ex. « RSSI ». Le nom apparaît dans l'application comme compte, sur les enregistrements nouvellement créés et dans le journal d'audit (`sync:RSSI`).
- **Droits par module :** *aucun accès*, *lecture* ou *lecture et écriture* (documents/modèles, SoA, risques, actifs, constats). La guidance est en lecture seule. Exemple : le compte de l'auditrice peut lire et écrire les risques et les constats, et rien d'autre.
- **Valable jusqu'au** (facultatif).
- **Appareils :** un compte peut avoir plusieurs appareils (p. ex. téléphone et tablette du RSSI). Chaque appareil a **sa propre clé**. La liste affiche le nom de l'appareil et « dernière utilisation » ; un appareil perdu peut être bloqué individuellement (✕) sans toucher aux autres.

### Configurer un appareil (code QR)

Après la création, et plus tard à tout moment via l'icône QR, l'administration affiche un **code QR et un code de configuration** (format `XXXX-XXXX-XXXX`). Les deux sont **valables 15 minutes et utilisables une seule fois** ; un nouveau code invalide le précédent. L'adresse par laquelle l'application joint le serveur est modifiable (préremplie avec celle utilisée). Le code QR ne contient que cette adresse et le code à usage unique — **pas la clé**. La clé n'est créée qu'au moment où l'application utilise le code, n'est jamais visible pour l'administrateur et n'est stockée sur le serveur que sous forme de hachage.

Pour les **scripts** (p. ex. `scripts/sync-import.js`), l'icône de clé crée une clé d'appareil `ISMS-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`, affichée **une seule fois**.

Désactiver, réactiver, modifier les droits et supprimer prennent effet immédiatement. L'administration est consignée dans le journal d'audit (jamais les clés ni les codes) ; les modifications issues de la synchronisation y apparaissent sous le nom du compte de synchronisation.

## Configurer l'appareil dans l'application

1. Installer et ouvrir l'application (avec un verrouillage d'appareil actif, déverrouiller d'abord, voir *Sécurité*). Au premier démarrage, l'application n'affiche que l'écran de configuration.
2. **Scanner le code QR** et capturer avec l'appareil photo le code QR de l'administration. Sinon, saisir l'adresse du serveur et le code de configuration à la main. L'application lit elle-même le code QR, sans services Google.
3. L'application échange le code contre la clé d'appareil (stockée dans le coffre de clés Android), récupère les données de base (première synchronisation) et redémarre.

Ensuite, l'application appartient à **ce seul compte** : le nom du compte s'affiche en haut, et le menu et les droits d'édition suivent les droits du compte. Les modules sans accès disparaissent du menu ; les modules en lecture seule sont protégés en écriture (les modifications sont refusées avec « Accès refusé »). Le panneau de synchronisation affiche le compte, l'appareil et les droits sous *Compte de cet appareil*.

- **Les droits changent :** chaque synchronisation récupère les droits actuels. Si un droit de lecture est retiré, l'application supprime les données locales de ce module (y compris les modifications non envoyées) ; si un module est nouvellement autorisé, elle le charge entièrement. L'affichage et le menu s'adaptent après le rechargement de l'interface.
- **Changer de compte ou remettre l'appareil :** *Réinitialiser l'appareil* dans le panneau de synchronisation supprime, après confirmation, toutes les données locales, le compte et la clé ; une nouvelle configuration est alors nécessaire. Les modifications non envoyées sont perdues.

## Certificat sur le téléphone

Avec un certificat publiquement approuvé (p. ex. Let's Encrypt), rien n'est à faire. Avec un **certificat propre ou auto-signé**, le téléphone doit lui faire confiance :

1. Lors de la création avec `scripts/setup-ssl.sh`, saisir sous *Noms/adresses IP supplémentaires* le nom ou l'IP utilisé dans l'application (p. ex. `192.168.1.20`). Si l'adresse ne figure pas dans le certificat, l'application refuse la connexion.
2. Copier `ssl/cert.pem` sur le téléphone (USB, Nextcloud, e-mail).
3. Sur le téléphone : *Paramètres → Sécurité → Chiffrement et identifiants → Installer un certificat → Certificat d'autorité (CA)* (le chemin varie selon le fabricant). Android avertit pour les certificats tiers ; ici, c'est votre propre certificat.
4. Dans l'application, choisir *Vérifier le serveur* : si la version du serveur s'affiche, le téléphone fait confiance au certificat.

Messages d'erreur : *Serveur injoignable* → vérifier adresse, port, Wi-Fi/VPN et pare-feu du serveur. *Certificat … non approuvé* → étapes 1 à 3.

## Synchronisation par Wi-Fi

Après la configuration (voir ci-dessus), l'adresse et la clé sont enregistrées : *Synchroniser maintenant* suffit. Les étapes suivantes s'appliquent si la clé a été supprimée ou si une autre clé d'appareil est utilisée.

1. Appuyer sur le bouton de synchronisation en bas à droite de l'application.
2. Saisir l'adresse du serveur (p. ex. `https://isms.example.org:3000`) et la **clé d'accès**. *Vérifier le serveur* affiche la version du serveur et la compatibilité ; après la première synchronisation, l'application affiche aussi le nom et les droits du compte de synchronisation. La clé est conservée dans le coffre de clés protégé d'Android ; *Supprimer la clé* l'efface de l'appareil.
3. **Synchroniser maintenant.** L'application envoie d'abord les modifications locales (push), puis récupère tout ce qui est nouveau sur le serveur (pull). La première synchronisation télécharge l'ensemble des données de base.

Règles :

- **Modifications uniquement :** seul ce qui a changé depuis la dernière synchronisation est transféré.
- **Heure du serveur :** le serveur attribue `updatedAt` à l'acceptation. Une horloge de téléphone erronée ne perturbe pas la synchronisation.
- **Conflits :** si un enregistrement a été modifié sur le serveur après avoir été récupéré par le téléphone, il n'est **pas écrasé**. Il apparaît dans l'application sous *Résoudre les conflits*, avec les champs divergents. Pour chaque enregistrement, on choisit *Garder ma version* (envoyée à la prochaine synchronisation) ou *Prendre la version du serveur*.
- **Suppression :** supprimer sur le téléphone place l'enregistrement dans la corbeille du système principal. *Supprimer définitivement* sur le téléphone y est également transmis comme enregistrement supprimé ; il n'est pas retiré du système principal.
- **Droits :** les modules sans droit de lecture ne sont pas récupérés. Si le droit d'écriture manque pour un module, l'application l'indique comme *refusé* ; les modifications locales ne sont pas perdues. *Clé d'accès invalide, désactivée ou expirée* signifie : vérifier le compte dans l'administration.

## Synchronisation par fichier

Pour les appareils sans connexion réseau au système principal :

- **Exporter tout** — sauvegarde complète des données de l'application (application vers application, ou archive).
- **Exporter uniquement les modifications** — fichier contenant les enregistrements modifiés localement. Import sur le système principal avec un compte de synchronisation :

  ```bash
  ISMS_SYNC_KEY=ISMS-XXXX-… node scripts/sync-import.js https://isms.example.org:3000 isms-mobile-changes-2026-10-18.json
  ```

  Sans `ISMS_SYNC_KEY`, le script demande la clé sans l'afficher. Les mêmes droits et la même règle de conflit que pour la synchronisation Wi-Fi s'appliquent ; le code de sortie `3` signale des conflits ou des enregistrements refusés.
- **Importer un fichier** — accepte un bundle de l'application ou un export du système principal (*Admin → Export*). L'application affiche d'abord un **aperçu** (nouveau / mis à jour / inchangé / conflits). Les enregistrements modifiés localement ne sont jamais écrasés silencieusement. L'export du système principal ne contient que les modules qu'il fournit lui-même (p. ex. modèles, SoA, risques, guidance) ; les actifs et les constats arrivent par la synchronisation Wi-Fi.

## API

Tous les appels sauf `/sync/enroll` portent l'en-tête `Authorization: Bearer <clé d'appareil>`.

| Méthode | Chemin | Objet |
|---|---|---|
| POST | `/sync/enroll` | Configurer un appareil : échange le code de configuration (du code QR) contre une clé d'appareil. Sans connexion ; code à usage unique, valable 15 minutes ; les tentatives échouées sont ralenties. |
| GET | `/sync/me` | Nom, droits et validité du compte de synchronisation. |
| GET | `/sync/pull?since=<ISO>&modules=a,b` | Modifications depuis `since`, y compris les enregistrements supprimés, pour les modules lisibles uniquement (ceux demandés explicitement mais non autorisés figurent sous `denied`). La réponse contient `serverTime` pour le pull suivant. |
| POST | `/sync/push` | `{ protocolVersion, changes: { <module>: [enregistrements avec baseUpdatedAt] } }` — réponse : `accepted`, `conflicts`, `rejected`. |

L'administration des comptes de synchronisation (`/admin/sync-accounts`) est réservée aux administrateurs. Modules : `templates`, `soa`, `risks`, `assets`, `findings`, `guidance`. Décrit dans `docs/architecture/openapi.yaml`.

## Sécurité

- La transmission est **exclusivement chiffrée (HTTPS)**. L'application refuse le `http://` non chiffré. En dehors de votre propre Wi-Fi, le serveur devrait en outre être joignable par VPN ou reverse proxy.
- La clé d'accès n'autorise **que la synchronisation** des modules autorisés, pas l'interface ni l'administration. Le serveur ne stocke que son hachage ; sur l'appareil, elle se trouve dans le coffre de clés Android. En cas de perte d'un appareil, désactivez ou supprimez le compte de synchronisation — l'effet est immédiat.
- Les clés erronées sont ralenties (comme les mots de passe erronés à la connexion).
- **Verrouillage de l'application :** l'application demande empreinte, visage ou PIN/schéma/mot de passe de l'appareil au démarrage et après environ deux minutes en arrière-plan. Sans verrouillage d'écran sur l'appareil, l'application ne démarre pas et explique pourquoi.
- La sauvegarde Android de l'application est désactivée ; captures d'écran, enregistrement d'écran et aperçu dans la vue des applications sont bloqués. Une version release signée est livrée (non « debuggable », débogage WebView désactivé).
- Les codes de configuration sont à usage unique et valables 15 minutes ; les codes erronés sont ralentis.
- Les données se trouvent dans le stockage protégé de l'application sur l'appareil, mais **ne sont pas chiffrées en plus**. Le verrouillage de l'appareil et le chiffrement Android sont indispensables.

## Limites

- Backend JSON uniquement ; les pièces jointes ne sont pas synchronisées.
- Les conflits sont résolus par enregistrement, pas par champ.
- Les enregistrements supprimés définitivement sur le système principal n'atteignent pas le téléphone.
- L'interface ne connaît pas de droits par module : elle distingue seulement « peut écrire quelque part » et « lecture seule ». Le contrôle exact par module a lieu à l'enregistrement.
- Les constats d'audit sont synchronisés, mais n'ont pas encore de vue propre dans l'application.
- L'application contient la logique serveur de la version avec laquelle elle a été construite. Après une mise à jour du serveur, reconstruire aussi l'application (`npm run build:android` dans le projet `isms-builder-mobile`).
