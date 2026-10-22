# Modèles : Utilisation dans ISMS Builder

> Les modèles sont l'outil de travail central d'ISMS Builder. Ce guide explique comment
> créer et modifier des modèles, les faire passer par le cycle de vie d'approbation
> et les lier à d'autres modules.

---

## Qu'est-ce qu'un modèle ?

Un modèle est un document versionné et géré par statut — par exemple une politique,
une procédure ou un document de mise en production. Chaque modèle suit un cycle de vie
défini et peut être lié à des contrôles (SoA), des risques et d'autres modèles.

Types de modèles disponibles :

| Type | Objectif |
|---|---|
| **policy** | Règles contraignantes (Que faut-il faire ?) |
| **procedure** | Instructions de travail (Comment procéder ?) |
| **soa** | Documents d'accompagnement du processus SoA |
| **incident** | Plans de réponse aux incidents |
| **release** | Documentation des changements et mises en production |

---

## Rôles et autorisations

| Action | Rôle minimum |
|---|---|
| Lire les modèles | `reader` |
| Modifier un modèle (contenu, statut) | `editor` |
| Créer, déplacer, supprimer des modèles | `contentowner` |
| Supprimer définitivement, restaurer | `admin` |

---

## Créer un modèle

**Étape 1 — Choisir le type**
Dans la barre latérale, sous le type souhaité (ex. « Politique »), cliquer sur **« + Nouveau »**.

**Étape 2 — Remplir les champs obligatoires**
- **Titre** — nom unique (ex. « Politique de mots de passe v1.0 »)
- **Propriétaire** — personne ou rôle responsable
- **Valide à partir de / Prochaine révision** — champs de date pour la gestion du cycle de vie
- **Contrôles ISO liés** — lien optionnel vers des contrôles SoA

**Étape 3 — Saisir le contenu**
La zone de contenu prend en charge le **Markdown**. Pour les politiques structurées,
la structure suivante est recommandée :

```
# Titre
## 1. Objectif
## 2. Champ d'application
## 3. Règles
## 4. Responsabilités
## 5. Infractions et conséquences
## 6. Révision et mise à jour
```

**Étape 4 — Enregistrer**
Le modèle est enregistré avec le statut `draft` et n'est visible que par les
utilisateurs connectés ayant le rôle `reader` ou supérieur.


## Brouillon avec l’IA (facultatif)

Dans la barre d’outils de l’éditeur (à partir du rôle Content Owner, seulement si l’intégration IA est activée), **« Rédiger avec l’IA »** crée un brouillon de texte. Vous le relisez et l’enregistrez toujours vous-même.

- **Choisissez le document dans la liste** (p. ex. politique de mots de passe, procédure de gestion des correctifs) et la **langue**. Il n’y a volontairement pas de champ de titre libre, pour qu’aucun nom ni donnée d’entreprise n’entre dans la requête.
- **Indice (facultatif) :** 200 caractères maximum, p. ex. « NIS2, télétravail ». Adresses e-mail, numéros de téléphone, IBAN, adresses IP, adresses web, identifiants, clés, désignations d’entreprise et noms issus des données de l’organisation sont détectés et **bloquent** l’envoi. Le filtre ne peut pas détecter de façon fiable des noms de personnes quelconques ; n’en saisissez donc pas.
- **La boîte de dialogue montre exactement ce qui est envoyé et où** avant tout envoi. Seuls le document choisi, la langue et l’indice sont envoyés.
- **Espaces réservés :** le modèle écrit `{{COMPANY_NAME}}`, `{{ISMS_OWNER}}`, `{{DATA_PROTECTION_OFFICER}}` et `{{ISMS_SCOPE}}`. Après la réponse, ils sont remplacés **localement** à partir de *Admin → Organisation*. Si une valeur y est vide, l’espace réservé reste et vous en êtes informé.
- Un texte existant dans l’éditeur n’est écrasé qu’après confirmation.

---

## Cycle de vie (flux de statuts)

Chaque modèle passe par quatre étapes de statut :

```
draft  →  review  →  approved  →  archived
```

| Statut | Signification | Visible par |
|---|---|---|
| `draft` | En cours, pas encore validé | À partir de `reader` |
| `review` | En cours d'examen, en attente d'approbation | À partir de `reader` |
| `approved` | Officiellement valide, en production | À partir de `reader` |
| `archived` | Remplacé, conservé pour référence | À partir de `reader` |

> **Note d'audit :** L'historique complet des statuts est conservé dans le journal d'audit.
> Un modèle passant directement de `draft` à `approved` sans `review` est autorisé
> mais doit être une décision organisationnelle consciente.

---

## Historique des versions

La **version n'augmente qu'à l'approbation**, pas à l'enregistrement. On peut enregistrer autant de fois que nécessaire sans changer le numéro de version ; un document reçoit sa version lorsqu'il passe de `review` à `approved`. La première approbation conserve le numéro existant, chaque approbation suivante l'augmente de 1.

**Approuver :** le bouton « Approuver » demande d'abord confirmation : **« Approuver comme version X ? »**, avec un **commentaire de modification** facultatif. Seul « Oui, approuver » exécute l'approbation.

**Les documents approuvés sont verrouillés :** le titre et le contenu ne peuvent pas être modifiés au statut `approved` (l'interface affiche la vue en lecture seule et une remarque, le serveur refuse les modifications avec `409`). La prochaine date de révision reste modifiable. Pour continuer à travailler, on remet le document en `review` (rôle `contentowner`), on le modifie puis on l'approuve à nouveau — la version suivante est alors créée.

**Historique des versions dans l'en-tête du document :** au-dessus du document (repliable, aussi via l'**icône d'horloge**) figure le tableau

| Version | Approuvé par | Approuvé le | Modifications |
|---|---|---|---|

avec le nom d'utilisateur, la date et le commentaire de chaque approbation. Le même tableau figure dans l'impression/le PDF et dans le PDF de la publication Nextcloud. Chaque approbation enregistre aussi un instantané du contenu. Les documents approuvés avant cette fonction affichent la dernière approbation de l'historique des statuts comme première ligne.

---

## Pièces jointes

Les modèles peuvent recevoir des fichiers en pièce jointe (PDF, DOCX — max. 25 Mo).
Rôle minimum pour ajouter : `editor`.

---

## Liens vers d'autres modules

- **→ Contrôles SoA :** Sélectionner les contrôles ISO couverts par ce document.
- **→ Risques :** Lier des politiques à des risques comme mesures d'atténuation.
- **→ Confirmation de politique :** Envoyer les politiques approuvées pour confirmation au personnel.

---

## Dates de révision

Le champ **« Prochaine révision »** est surveillé activement :
- Modèles dont la révision est due dans ≤ 14 jours apparaissent dans le **calendrier**
- L'administrateur reçoit une **notification par e-mail** (si SMTP est configuré)

Recommandation : réviser les politiques annuellement, les procédures tous les six mois.
