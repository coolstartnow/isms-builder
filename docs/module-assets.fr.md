# Module : Assets (Valeurs informationnelles)

> Le registre des actifs est la base de tout SMSI — ISO 27001 Annexe A.5.9 exige
> un inventaire complet de toutes les valeurs traitant de l'information.

---

## Qu'est-ce qu'un asset ?

Un asset (valeur informationnelle) est tout ce qui a de la valeur pour l'organisation
et doit être protégé : logiciels, matériel, données, personnes, processus, locaux.

Catégories d'assets typiques :
- **Matériel** — serveurs, ordinateurs portables, équipements réseau
- **Logiciels** — systèmes d'exploitation, applications, SaaS
- **Données** — bases de données, supports de sauvegarde, données de configuration
- **Personnes** — collaborateurs ayant des rôles clés
- **Processus** — processus métier critiques
- **Installations** — centres de données, immeubles de bureaux

---

## Rôles et permissions

| Action | Rôle minimum |
|---|---|
| Consulter les assets | `reader` |
| Créer et modifier un asset | `editor` |
| Supprimer / restaurer un asset | `admin` |

---

## Créer un asset

**Assets → « + Nouvel asset »**

Champs :
- **Nom** — désignation unique (p. ex. « Serveur de base de données de production »)
- **Type** — p. ex. Serveur, Application SaaS, Base de données. La liste est groupée par catégorie (Matériel, Logiciel, Données, Services, Installations) et peut être personnalisée.
- **Propriétaire** — qui est responsable ?
- **Département / Unité organisationnelle**
- **Classification** — confidentialité : `public` / `internal` / `confidential` / `secret`
- **Criticité** — `low` / `medium` / `high` / `critical`
- **Description** — qu'est-ce que cet asset, où se trouve-t-il ?
- **Risques liés** — quels risques concernent cet asset ?

---

## Personnaliser les types d'actifs

**Administration → Listes → Types d'actifs** (administration uniquement)

Les types livrés avec l'application constituent un point de départ, non une liste figée. Ils
peuvent être renommés, complétés et supprimés ; chaque type appartient à l'une des cinq
catégories.

Deux garde-fous s'appliquent :

- **Un type encore utilisé ne peut pas être supprimé.** Le système indique le type et le nombre
  d'actifs concernés. Réaffectez-les d'abord, puis supprimez.
- **Le type est vérifié lors de l'enregistrement d'un actif.** Un type inconnu est refusé, afin
  qu'une faute de frappe ne devienne pas un type à part entière dans les données.

Les actifs existants conservent leur type même s'il disparaît ensuite de la liste ; dans le
formulaire, il apparaît sous « Type inconnu » afin de ne pas être perdu silencieusement lors
d'une modification.

**Réinitialiser** rétablit les valeurs par défaut.

### Définir les objectifs de protection par type

Chaque type peut définir la confidentialité, l'intégrité, la disponibilité et l'authenticité
(niveaux 1 à 4). Les actifs de ce type en héritent sans qu'il faille les saisir un par un.

Trois règles importantes :

- **La valeur s'applique objectif par objectif.** Un type « Base de données » peut ne fixer que
  la confidentialité à 4 ; l'intégrité et la disponibilité restent alors propres à l'actif.
- **Le lien persiste.** Une correction ultérieure sur le type s'applique immédiatement à tous les
  actifs qui ne l'ont pas substituée — il ne s'agit pas d'une valeur initiale unique.
- **La dérogation est possible** via l'interrupteur « Définir les objectifs indépendamment du
  type ». Tant qu'il est désactivé, les quatre champs sont verrouillés et affichent la valeur du
  type.

**Changement de type dans le formulaire :** lorsque l'on change le type dans le formulaire d'actif, les quatre champs de protection affichent immédiatement les valeurs par défaut du nouveau type — sans enregistrer ni rouvrir. Cela vaut tant que l'option « Définir les objectifs indépendamment du type » n'est pas cochée ; si elle l'est, les valeurs propres restent inchangées. Si le nouveau type n'a pas de valeurs par défaut, les champs sont librement modifiables (l'option est alors masquée). Pour un nouvel actif, les valeurs du type présélectionné s'appliquent dès l'ouverture du formulaire.

**Interaction avec les dépendances :** l'héritage par le principe du maximum reste prioritaire.
Si un actif à fort besoin de protection dépend d'un autre, ce dernier est relevé — même lorsque
sa valeur a été volontairement abaissée. C'est voulu : un serveur hébergeant une application
critique n'est pas moins digne de protection que l'application elle-même. Le formulaire indique
alors quel actif relève la valeur.

---

### Langues : ce qui est traduit et ce qui ne l'est pas

Il s'agit d'un choix délibéré, non d'une lacune :

- **Les 24 types livrés sont traduits dans toutes les langues de l'interface** (DE/EN/FR/NL) et
  s'affichent dans la langue choisie par chaque utilisateur.
- **Un type que vous créez n'est pas traduit.** Il apparaît à tous les utilisateurs exactement
  tel qu'il a été saisi : l'application ne peut inventer une traduction pour un terme qu'elle ne
  connaît pas.
- **Renommer un type livré supprime également sa traduction.** À partir de ce moment, c'est le
  texte saisi qui s'applique, faute de quoi votre modification serait silencieusement écrasée
  dans les autres langues.

Si votre personnel est multilingue et que vous créez vos propres types, convenez d'une langue
unique pour leur libellé — généralement la langue de l'entreprise. La réinitialisation rétablit
également les traductions.

---

## Classification et criticité

La **classification** décrit le besoin de protection en termes de confidentialité :

| Niveau | Signification |
|---|---|
| `public` | Accessible publiquement, aucun préjudice en cas de divulgation |
| `internal` | Interne uniquement, impact limité |
| `confidential` | Confidentiel, impact significatif |
| `secret` | Strictement confidentiel, impact grave |

La **criticité** décrit l'impact d'une panne ou d'une compromission
sur l'activité de l'organisation.

---

## Lien avec les risques

Via le module Risques, les risques peuvent être directement liés aux assets concernés.
Dans le détail de l'asset, tous les risques liés avec leur statut actuel sont visibles.
Cela rend l'**exposition aux risques** d'un asset transparente.

---

## Tableau de bord

L'aperçu des assets affiche :
- Nombre total d'assets par type
- Répartition par classification et criticité
- Assets sans propriétaire (action requise)

---

## Remarque d'audit

ISO 27001 A.5.9 exige un inventaire des actifs à jour avec attribution des propriétaires.
A.5.10 exige une politique d'utilisation acceptable. A.5.12 exige la classification
des informations. Ces trois exigences sont couvertes par le module Asset conjointement
avec une politique appropriée.

Recommandation : réviser le registre des actifs annuellement et le mettre à jour
immédiatement lors de changements importants dans le paysage informatique.
