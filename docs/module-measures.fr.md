# Module : Registre des mesures

> Un registre central pour toutes les mesures du SMSI — la norme ISO 27001, point 6.1.3, exige que les
> traitements des risques soient définis, mis en œuvre et suivis ; l’art. 32 du RGPD exige la même chose pour
> les mesures techniques et organisationnelles (TOM).

---

## Une mesure, un seul endroit

Les mesures naissent en de nombreux endroits : traitement d’un risque, suite d’un constat d’audit, décision
d’une revue de direction ou TOM au titre de l’art. 32 du RGPD. Auparavant, chaque module tenait sa propre
liste. Depuis la version 1.80, il existe **un seul fonds de données** : le registre des mesures. Les modules
affichent toujours leurs mesures à leur emplacement habituel, mais les lisent et les écrivent dans le
registre. Une modification à un endroit vaut donc partout, et aucune mesure n’apparaît en double.

| Origine | Où elle est modifiée | Marque dans le registre |
|---|---|---|
| Traitement d’un risque | Risk & Compliance → Plans de traitement | Affectée à un **risque** |
| Action pour un constat | Reports → Constatations d’audit | Affectée à un **constat** |
| Mesure de gouvernance | Gouvernance → Actions | Indicateur **Gouvernance** |
| TOM au titre de l’art. 32 du RGPD | GDPR → TOM | Indicateur **TOM** |
| Mesure propre | Mesures | Affectée à des **contrôles SoA**, ou sans affectation |

Une mesure peut être plusieurs choses à la fois : une mesure « MFA pour les administrateurs » peut mettre en
œuvre un contrôle et traiter un risque en même temps.

---

## Rôles et droits

| Action | Rôle minimal |
|---|---|
| Consulter les mesures | `reader` |
| Créer et modifier une mesure | `editor` |
| Affecter une mesure à un **risque** ou à un **constat** ; modifier des mesures affectées à un risque | `auditor` ou `contentowner` |
| Créer ou modifier une TOM (indicateur TOM) | `contentowner` |
| Supprimer une mesure | `contentowner` |
| Supprimer une mesure de gouvernance | `admin` |
| Restaurer une mesure supprimée ou la supprimer définitivement | `admin` |

Le registre ne donne à personne plus de droits que les modules auparavant : celui qui ne pouvait modifier les
traitements de risques qu’en tant qu’auditeur ne peut les modifier qu’en tant qu’auditeur dans le registre.

---

## Le registre

**Mesures** (dans la navigation, après « SoA – Controls »)

![Registre des mesures avec indicateurs, filtres et liste](images/measures/register-list.png)

*Les captures d’écran montrent l’interface allemande avec le jeu de données de démonstration allemand ;
l’interface est disponible en cinq langues.*

**Indicateurs** en haut : Total, Planifiée, En cours, Mise en œuvre (y compris « Efficacité vérifiée »), En
retard et Sans affectation. Une mesure est *en retard* lorsque son échéance est dépassée et qu’elle est encore
planifiée ou en cours. Sont *sans affectation* les mesures qui ne sont affectées ni à un contrôle, ni à un
constat, ni à un risque et qui ne sont ni une TOM ni une mesure de gouvernance — elles se remarquent en premier
lors d’un audit, car on ne sait pas à quoi elles servent.

**Rechercher et filtrer :** texte intégral (référence, titre, description, mise en œuvre, responsable),
statut, responsable, « Uniquement en retard » et **origine**.

![Filtre « Uniquement les traitements de risques »](images/measures/register-filter-risk.png)

Les filtres d’origine : *Toutes les origines*, *Uniquement les TOM*, *Uniquement les mesures de
gouvernance*, *Uniquement les traitements de risques*, *Uniquement les actions sur constats*.

**Colonne « Affectation » :** des icônes indiquent à quoi la mesure est liée (contrôle, constat, risque),
avec le nombre.

**Export :** **CSV** (protégé contre l’injection de formules dans les tableurs) et **PDF** (vue d’impression)
contiennent la liste actuellement filtrée.

---

## Créer et modifier une mesure

**Mesures → « + Nouvelle mesure »**. La mesure reçoit automatiquement une référence `M-001`, `M-002`, …

| Champ | Signification |
|---|---|
| Titre, description | Ce qui doit être atteint |
| Mise en œuvre (concrète) | Ce qui est fait : quoi, comment, où, à quelle fréquence — la preuve pour les auditeurs |
| Responsable | Qui met en œuvre |
| Échéance / Vérification le | Délai de mise en œuvre et date de suivi pour le contrôle d’efficacité |
| Statut | `Planifiée` · `En cours` · `Mise en œuvre` · `Efficacité vérifiée` · `Annulée` |

Lorsqu’une mesure passe à *Mise en œuvre* ou *Efficacité vérifiée*, le système inscrit la date comme
« Terminé le » si aucune n’est indiquée. Les mesures annulées restent dans le registre (pour la traçabilité),
mais ne comptent plus comme traitement en cours d’un risque.

### Affectations

La section **Affectation** relie la mesure à des **contrôles SoA**, des **constats** et des **risques**.
Chaque liste dispose d’un champ de filtre.

![Formulaire avec les trois listes de sélection pour contrôles, constats et risques](images/measures/form-links.png)

Toute mesure affectée à un risque compte comme **traitement de ce risque** et apparaît sous Risk & Compliance →
Plans de traitement. Toute mesure affectée à un constat apparaît dans le plan d’actions du constat. Les
éditeurs voient ces deux listes en lecture seule (voir rôles) ; ils peuvent affecter des contrôles librement.

### Mesure de gouvernance

Avec l’indicateur **Mesure de gouvernance**, la mesure est aussi gérée dans le domaine Gouvernance. Cela
ajoute des champs : **Origine** (revue de direction, audit interne ou externe, incident, autre),
**Référence** (p. ex. numéro d’audit), **Priorité**, **Avancement (%)**, e-mail du responsable,
**Terminé le** et notes.

![Formulaire : section Mesure de gouvernance](images/measures/form-governance.png)

Seul un administrateur peut supprimer une mesure de gouvernance, dans le registre également.

### TOM (art. 32 du RGPD)

Avec l’indicateur **TOM**, la mesure apparaît aussi dans le module RGPD sous « TOM ». Champs supplémentaires :
**Catégorie** (contrôle d’accès, chiffrement, journalisation, sécurité réseau, sécurité applicative,
sauvegarde et restauration, organisationnelle, formation, conservation des données), **Niveau de risque**,
**Règle de conservation** et **Preuve**. Seuls les propriétaires de contenu peuvent créer et modifier des
TOM, comme dans le module RGPD.

---

## Où les mesures apparaissent

**SoA – Controls :** dans un contrôle déplié, le bloc **« Mesures pour ce contrôle »** montre les mesures
affectées avec leur statut. Un clic ouvre la mesure ; **« Ajouter une mesure »** en crée une nouvelle et
l’affecte aussitôt au contrôle.

![SoA : bloc « Mesures pour ce contrôle »](images/measures/soa-block.png)

**Constats :** le **plan d’actions** d’un constat montre ses mesures comme auparavant et travaille sur les
mêmes enregistrements que le registre. En dessous, le bloc **« Mesures (registre) »** les liste avec
référence et statut.

![Constat : plan d’actions et mesures (registre)](images/measures/finding-block.png)

**Risques :** l’onglet **Plans de traitement** montre tous les traitements de tous les risques ; le détail
d’un risque montre les traitements de ce risque.

![Risk & Compliance : Plans de traitement](images/measures/risk-treatments.png)

**Gouvernance :** l’onglet **Actions** montre les mesures de gouvernance avec origine, priorité et avancement.
Les pièces jointes (procès-verbaux, preuves) restent attachées à la mesure à cet endroit.

![Gouvernance : Actions](images/measures/governance-actions.png)

**RGPD :** l’onglet **TOM** montre les mesures portant l’indicateur TOM.

![GDPR : TOM](images/measures/gdpr-toms.png)

**Calendrier :** les mesures à échéance apparaissent avec leur date. Les traitements de risques, les actions
sur constats et les mesures de gouvernance ont chacun leur propre type d’événement ; toutes les autres
apparaissent comme échéance de mesure. La même mesure n’est pas listée en plus comme échéance générale. Si
elle appartient à la fois à un risque et à un constat, elle apparaît pour les deux contextes.

**Recherche IA :** le registre fait partie de la recherche ; les mesures se trouvent par mot-clé ou question.

---

## Données existantes (mise à niveau vers 1.80)

Au premier démarrage avec la version 1.80, le système reprend automatiquement dans le registre les mesures
jusqu’ici intégrées aux modules : TOM, traitements de risques, actions sur constats et mesures de
gouvernance.

- **Identifiants, horodatages et état de suppression sont conservés** ; les références `M-…` sont attribuées par date de création.
- **Le processus est répétable :** les enregistrements déjà repris ne sont pas recréés.
- **Les anciennes données restent inchangées** (`risks.json`, `findings.json`, `governance.json`,
  `gdpr/toms.json` ou les tables de la base de données). Elles ne sont plus lues, mais servent de sauvegarde.
- **Les statuts** sont mis en correspondance : *ouvert / en cours / terminé* des modules correspondent à *Planifiée / En cours / Mise en œuvre*.
- **Nouveaux ID :** les nouvelles mesures de gouvernance reçoivent des ID de la forme `meas_…` (auparavant
  `gact_…`) ; les identifiants existants ne changent pas.

Lors du passage de JSON à une base SQL avec `tools/migrate-json-to-knex.js`, le registre est repris avec tous
ses champs et pièces jointes.

**Données de démonstration :** les bundles de démonstration (allemand, anglais, français, néerlandais,
hongrois) contiennent le registre avec les cinq origines. Recharger un bundle remplace le registre.

---

## Corbeille

Les mesures supprimées se trouvent dans la corbeille (**Admin → Corbeille**, sauf les TOM : elles figurent
parmi les entrées RGPD) et peuvent être restaurées ou supprimées définitivement par les administrateurs.
Lorsqu’un traitement dans un risque ou une action dans un constat est « supprimé » alors qu’il est encore
affecté à un contrôle ou à d’autres risques ou constats, seule l’affectation à ce risque ou à ce constat est
retirée ; la mesure elle-même reste dans le registre.

---

## API

| Méthode | Chemin | Objet |
|---|---|---|
| GET | `/measures` | Liste ; filtres `q`, `status`, `responsible`, `control`, `finding`, `risk`, `overdue`, `tom`, `governance`, `source`, `priority`, `category` |
| GET | `/measures/summary` | Indicateurs |
| GET | `/measures/{id}` | Une mesure |
| POST | `/measures` | Créer |
| PUT | `/measures/{id}` | Modifier (uniquement les champs transmis) |
| DELETE | `/measures/{id}` | Supprimer (corbeille) |
| POST | `/measures/{id}/restore` | Restaurer (admin) |
| DELETE | `/measures/{id}/permanent` | Supprimer définitivement (admin) |

Les interfaces existantes des modules (`/risks/{id}/treatments`, `/findings/{id}/actions`,
`/governance/actions`, `/gdpr/toms`) restent inchangées et travaillent sur le même fonds de données.

---

## Remarque d’audit

Pour l’ISO 27001, le registre et ses entrées constituent la preuve des points 6.1.3 (traitement des risques),
8.3 (mise en œuvre du traitement) et 10.2 (actions correctives). Les auditeurs demandent généralement :

1. Existe-t-il, pour chaque risque non accepté, une mesure avec un responsable et une échéance ?
2. Les mesures en retard sont-elles connues et justifiées ?
3. Une preuve (mise en œuvre, contrôle d’efficacité) est-elle consignée pour les mesures mises en œuvre ?
4. Les constats d’audit conduisent-ils à des mesures, et celles-ci sont-elles suivies ?

Pour l’art. 32 du RGPD, les TOM avec catégorie, niveau de risque et preuve démontrent le caractère approprié des mesures.
