# Module : Business Continuity Management (BCM)

> Le BCM garantit que l'organisation reste opérationnelle en cas de perturbations
> graves — ISO 27001 A.5.29/A.5.30, ISO 22301.

---

## Introduction : qu'est-ce que l'ISO 22301 ?

> **Avis important — pas une reproduction officielle :** cette introduction est un **résumé simplifié et propre** à ISMS Builder. Elle **n'est pas le texte de la norme**, **pas une version officielle ou faisant foi** de l'ISO 22301 et **ne remplace pas la norme**. Seule l'**édition en vigueur de la norme** fait foi ; elle s'obtient auprès de votre organisme de normalisation (en Allemagne DIN/Beuth, à l'international ISO). Ce texte **n'est pas un conseil** et ne garantit pas qu'une mise en œuvre fondée sur lui satisfasse une certification. Les numéros de chapitres et les termes peuvent différer de l'édition utilisée par votre organisation.

L'**ISO 22301** décrit comment une organisation met en place et exploite un **système de management de la continuité d'activité (SMCA, en anglais BCMS)**. L'objectif est que les services importants continuent pendant une perturbation (incendie, cyberattaque, panne de courant, défaillance d'un fournisseur, pandémie) ou soient de nouveau disponibles dans un délai acceptable. Comme l'ISO 27001, c'est une **norme de système de management** : elle dit **ce que** un système efficace doit atteindre, pas **comment** le réaliser techniquement. Une certification est possible. L'ISO 27001 protège les informations, l'ISO 22301 garantit que l'activité se poursuit.

La norme n'a **pas d'annexe avec un catalogue de mesures** (contrairement à l'ISO 27001), mais des exigences (« doit ») dans les chapitres 4 à 10, suivant le schéma commun à toutes les normes de système de management ISO :

| Chapitre | Question sous-jacente | Soutien dans ISMS Builder |
|---|---|---|
| **4 Contexte** | Où en sommes-nous, que couvre le système ? | Organisation, périmètre (document), obligations dans le module Juridique |
| **5 Leadership** | La direction soutient-elle ? | Politique de continuité comme politique (Documents), rôles et responsables |
| **6 Planification** | Quels risques, quels objectifs ? | Gestion des risques, objectifs de sécurité (p. ex. « service critique rétabli sous 4 heures ») |
| **7 Support** | Ressources, connaissances, documents ? | Formations et preuves, prise de connaissance des politiques, maîtrise documentaire |
| **8 Fonctionnement** | Comment la continuité est-elle assurée ? | **ce module** : BIA, plans, exercices |
| **9 Évaluation des performances** | Cela fonctionne-t-il vraiment ? | Indicateurs et tableau de bord, audits, revue de direction (Gouvernance) |
| **10 Amélioration** | Comment apprendre des défaillances ? | Constats et mesures, objectifs de sécurité |

### Chapitre 8 — Fonctionnement (le cœur, couvert par ce module)
- **8.2 Analyse d'impact sur les activités et appréciation des risques :** quelles activités comptent, à quelle vitesse une panne devient-elle coûteuse, de quoi dépendent-elles ? → onglet **BIA**.
- **8.3 Stratégies et solutions :** comment franchir une panne (site de repli, alimentation de secours, second fournisseur, télétravail) ? → à décrire comme stratégie dans la BIA et les plans.
- **8.4 Plans et procédures :** structure de réponse, alerte, communication, plans de continuité et retour à l'exploitation normale. → onglet **Plans de continuité**.
- **8.5 Programme d'exercices :** les plans sont exercés à intervalles planifiés et après des changements importants, avec un rapport. → onglet **Exercices**.
- **8.6 Évaluation :** analyse, plans et procédures sont-ils adaptés, et que faut-il en conclure ? → résultats des exercices et des audits.

### Chapitres 9 et 10 — Évaluation et amélioration (réalisables avec le système)
- **9.1 Surveillance et mesure :** tableau de bord BCM (BIA par criticité, processus sans plan approuvé, dernier et prochain exercice) et rapports ; objectifs de sécurité avec valeurs mesurées.
- **9.2 Audit interne :** mener un audit du SMCA comme tout autre — module **Audits** (points de contrôle, programme d'audit en plan annuel, rapport d'audit).
- **9.3 Revue de direction :** **Gouvernance → Revues de direction** ; y consigner les éléments d'entrée (résultats d'audit, exercices, indicateurs) et les décisions.
- **10.1 Non-conformité et actions correctives :** enregistrer les écarts d'audits et d'exercices comme **constats** et les suivre avec des **mesures** (module Mesures) jusqu'au contrôle d'efficacité.
- **10.2 Amélioration continue :** en déduire mesures, objectifs de sécurité et prochains exercices.

### L'amendement 2024
L'ISO 22301:2019/Amd 1:2024 est très court : en **4.1**, l'organisation doit décider si le **changement climatique** est un enjeu pertinent pour elle ; en **4.2.1**, une note indique que les parties intéressées peuvent avoir des exigences liées au climat. Il n'exige pas de nouvelles mesures, seulement l'examen et sa documentation (p. ex. dans le document de périmètre ou le registre des risques).

### ISO 22313 — le guide associé
L'**ISO 22313** est un **guide de mise en œuvre** de l'ISO 22301. Elle ne contient pas d'exigences certifiables, mais explique en détail comment satisfaire concrètement les exigences (conseils et exemples sur la BIA, les stratégies, les plans et les exercices). Nous recommandons de se la procurer en plus de l'ISO 22301, surtout pour la première BIA et les premiers plans.

> **Remarque :** cette introduction résume la norme avec nos propres mots et ne remplace ni la norme ni le guide. Les normes ISO sont protégées par le droit d'auteur et ne sont pas fournies avec ISMS Builder ; le texte de l'édition sous licence fait foi. La correspondance avec les modules est une orientation, pas une déclaration de certification.

---

## Trois sous-domaines

Le module BCM comprend trois domaines étroitement interconnectés :

| Domaine | Objectif |
|---|---|
| **BIA** (Analyse d'impact sur les activités — Business Impact Analysis) | Identifier les processus critiques et évaluer les conséquences d'une interruption |
| **Plans de continuité** | Plans de reprise concrets pour les processus critiques |
| **Exercices** | Documenter les exercices et tests des plans |

---

## Analyse d'impact sur les activités (BIA)

La BIA répond à la question : **Que se passe-t-il si ce processus s'interrompt —
et combien de temps pouvons-nous nous le permettre ?**

**BCM → BIA → « + Nouvelle BIA »**

Champs :
- **Nom du processus** — quel processus métier ?
- **Responsable du processus et département**
- **Criticité** — `low` / `medium` / `high` / `critical`
- **RTO** (Recovery Time Objective — Délai de reprise) — durée maximale tolérée d'interruption (heures)
- **RPO** (Recovery Point Objective — Point de reprise) — perte de données maximale tolérée (heures)
- **MTPD** (Maximum Tolerable Period of Disruption — Durée maximale d'interruption tolérée) — durée maximale absolue d'interruption
- **Dépendances** — de quels systèmes/fournisseurs dépend ce processus ?
- **Systèmes impactés**
- **Statut** — `draft` / `reviewed` / `approved`

> **RTO et RPO** sont les indicateurs centraux de la BIA. Le RTO définit la rapidité
> avec laquelle le processus doit être rétabli, le RPO définit l'âge maximal admissible
> des données lors de la reprise.

---

## Plans de continuité (plans de reprise)

Pour chaque processus critique (criticité BIA `high`/`critical`), un plan de reprise
doit exister.

**BCM → Plans → « + Nouveau plan »**

Champs :
- **Nom du plan** — p. ex. « Reprise base de données de production »
- **BIA liée** — à quelle BIA ce plan se rapporte-t-il ?
- **Déclencheur** — quand le plan est-il activé ?
- **Responsable**
- **Étapes** — instructions numérotées
- **Ressources** — systèmes requis, contacts, données d'accès (chiffrés)
- **Statut** — `draft` / `tested` / `approved`

---

## Exercices

Les plans BCM ne sont efficaces que s'ils sont régulièrement exercés.
ISO 22301 exige la preuve des tests effectués.

**BCM → Exercices → « + Nouvel exercice »**

Champs :
- **Type d'exercice** — exercice sur table (Tabletop) / exercice de simulation / test complet
- **Date et durée**
- **Plans testés**
- **Participants**
- **Résultat** — qu'est-ce qui a fonctionné, qu'est-ce qui n'a pas fonctionné ?
- **Mesures** — qu'est-ce qui doit être amélioré ?

---

## Modèles pour BIA, plans et exercices

Chaque onglet (**BIA**, **Plans**, **Exercices**) propose, à côté de « Nouveau », le bouton **« Utiliser un modèle »** (rôle Éditeur et plus). Il remplit le formulaire avec des valeurs suggérées que vous vérifiez et adaptez avant d'enregistrer.

- **Les modèles de BIA** contiennent criticité, RTO/RPO/MTPD (heures), dépendances et systèmes typiques (types seulement) et une remarque. Les délais sont des **suggestions** : les responsables de processus décident.
- **Les modèles de plans** apportent un texte structuré : objet et périmètre, critères d'activation, rôles, actions immédiates, reprise, communication, retour à l'exploitation normale, mise à jour et exercices. `{{COMPANY_NAME}}` et `{{ISMS_OWNER}}` sont remplis à partir des données de l'organisation ; le système signale les valeurs manquantes.
- **Les modèles d'exercices** remplissent le nouveau champ **« Scénario et déroulement »** : scénario, objectifs, injections et questions d'évaluation.

**Modèles fournis (français) :**
- BIA : Paie; Exploitation informatique et centre de données; Service client et support; Traitement des commandes et ventes; Production et prestation de services; Achats et gestion des fournisseurs; Communication d’entreprise et site web; Recrutement et accompagnement du personnel
- Plans : Plan de continuité d’activité général; Plan de reprise informatique (Disaster Recovery); Cyberattaque et rançongiciel; Panne de courant; Perte d’un bâtiment ou d’un site; Défaillance d’un fournisseur critique; Pandémie et absentéisme important; Communication de crise; Redémarrage du centre de données
- Exercices : Exercice sur table : rançongiciel; Test de restauration de la sauvegarde; Évacuation et perte du site; Défaillance d’un fournisseur; Test de la chaîne d’alerte; Exercice de panne de courant

Les modèles sont des propositions orientées pratique, rédigées avec nos propres mots. Ils doivent être soigneusement adaptés à votre entreprise, ne constituent pas un conseil et ne contiennent aucun texte de norme. Les versions FR, NL et HU sont nos propres traductions ; une relecture professionnelle est recommandée. Le guide **ISO 22313** aide à la mise en place du système.

---

## Brouillons par IA pour plans et exercices

Le formulaire d'un **plan** (champ « Procédures ») et d'un **exercice** (champ « Scénario et déroulement ») propose le bouton **« Rédiger avec l'IA »** (rôle Propriétaire de contenu et plus, comme pour les documents). Il ouvre le même dialogue sûr que pour les politiques : vous choisissez un thème dans la liste (9 plans, 6 exercices), voyez **le texte exact qui serait envoyé** et l'envoyez à l'IA connectée ou le **copiez** pour une IA de votre choix. Les données personnelles dans le champ d'indication sont bloquées, les marqueurs d'entreprise sont remplacés localement. Le résultat apparaît ensuite dans le champ du formulaire (avec confirmation s'il contient déjà du texte) et reste un **brouillon** à vérifier et adapter. Détails et liste de titres : guide « Brouillons par IA ».

---

## Registre des exigences de l'ISO 22301

L'onglet **« Exigences »** présente les exigences de l'ISO 22301 (chapitres 4 à 10) et l'état de votre mise en œuvre. Vous voyez d'un coup d'œil **quelle exigence est prouvée par quoi** et où il manque encore des preuves.

**Important :** le **texte de la norme n'est pas fourni avec ISMS Builder** (droit d'auteur). Un administrateur l'importe depuis l'**édition sous licence** de votre entreprise. Le registre est un outil de travail, pas une déclaration de certification ; le texte de votre édition sous licence fait foi.

### Marche à suivre
1. **Télécharger le modèle :** onglet « Exigences » → « Modèle (CSV) ». Il ne contient que des lignes d'exemple inventées.
2. **Saisir vos propres textes** (identifiant, titre, description) issus de votre norme sous licence, ou fournir les mêmes champs en JSON.
3. **Import** (administrateurs uniquement) : choisir le fichier. Un **aperçu** s'affiche d'abord (nouvelles, mises à jour, rejetées avec le motif par ligne) ; seul « Appliquer » enregistre.
4. **Tenir l'état à jour** (rôle Éditeur et plus) : par exigence statut, responsable, justification, preuve et liens vers BIA, plans et exercices.
5. **Un nouvel import** (nouvelle édition, amendement) modifie les **descriptions**, pas l'état de mise en œuvre ; rien n'est supprimé.

Statuts : *Ouvert*, *Partiel*, *Mis en œuvre*, *Non applicable* (une **justification est obligatoire**). La barre de couverture ne compte que les points du dernier niveau, pas les titres de chapitre. Pour 8.2.2, 8.4.4 et 8.5, le système affiche des indications tirées des données existantes (nombre de BIA, de plans approuvés, d'exercices réalisés) ; le statut n'est **jamais défini automatiquement**. Export de l'état : « Exporter (CSV) ».

### Format du fichier d'import
Une ligne par exigence. **CSV** (UTF-8, séparateur virgule ou point-virgule, champs contenant une virgule ou un saut de ligne entre guillemets) ou **JSON** (liste ou `{ "requirements": [ … ] }`). Noms de colonnes en minuscules, ordre libre ; les colonnes inconnues sont signalées et ignorées. Au maximum **2 Mo** et **2000 lignes**.

| Colonne | Obligatoire | Signification | Limite |
|---|---|---|---|
| `framework` | oui | Identifiant de la norme, actuellement seulement `ISO22301` | – |
| `id` | oui | Identifiant de l'exigence, p. ex. `9.1` (unique par fichier) | 40 caractères |
| `parent` | non | `id` de l'exigence parente (dans le fichier ou déjà enregistrée) | 40 |
| `chapter` | non | Chapitre ; sinon le nombre avant le premier point de l'`id` | 40 |
| `title_de`, `title_en`, `title_fr`, `title_nl`, `title_hu` | au moins un titre | Titre par langue ; la langue de l'interface est affichée, sinon l'anglais, sinon la première disponible | 512 |
| `summary_de` … `summary_hu` | non | Description par langue | 4000 |
| `title`, `summary` | non | Titre/description sans langue (considérés comme anglais si `title_en` manque) | 512 / 4000 |
| `amendment` | non | Mention d'un amendement, p. ex. `Amd 1:2024` | 60 |

L'aperçu indique les lignes rejetées avec le motif : champ obligatoire manquant, framework inconnu, identifiant en double, exigence parente inconnue, texte trop long.

**Exemple CSV** (textes inventés) :

```csv
framework,id,parent,chapter,title_en,summary_en
ISO22301,9,,9,Example chapter,
ISO22301,9.9,9,9,Example requirement,Your description from the licensed standard goes here.
```

**Exemple JSON** (textes inventés) :

```json
[
  { "framework": "ISO22301", "id": "9",   "chapter": "9", "title_en": "Example chapter" },
  { "framework": "ISO22301", "id": "9.9", "parent": "9", "chapter": "9",
    "title_en": "Example requirement", "summary_en": "Your description from the licensed standard goes here." }
]
```

Les textes sont enregistrés comme texte simple et échappés à l'affichage. Pour l'export vers un tableur, les cellules commençant par `=`, `+`, `-` ou `@` sont neutralisées.

**Droits :** consultation à partir de Lecteur, mise à jour à partir d'Éditeur, import réservé aux administrateurs. Chaque import et chaque modification figure dans le journal d'audit. Lors du passage en production (réinitialisation de la démo), le registre est vidé comme les autres données de démonstration.

---

## Tableau de bord

Le tableau de bord BCM affiche :
- Nombre de BIAs par criticité
- Processus sans plan approuvé
- Dernier exercice et prochain exercice prévu
- Plans avec statut `draft` (action requise)

---

## Remarque d'audit

ISO 27001 A.5.29 exige la sécurité de l'information dans la continuité d'activité.
A.5.30 traite de la préparation des TIC pour la continuité d'activité.

L'auditeur vérifie typiquement :
1. Existe-t-il une BIA avec des valeurs RTO/RPO documentées ?
2. Existe-t-il des plans de reprise approuvés pour les processus critiques ?
3. Les plans ont-ils été testés ? (preuves d'exercices)
4. Les enseignements tirés des exercices ont-ils été intégrés dans les plans ?

Recommandation : au minimum un exercice sur table par an par plan critique.
