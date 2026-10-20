# Module : Gestion des audits

> Planifier, réaliser et suivre les audits — de la liste de contrôle aux constats jusqu'au programme
> d'audit annuel (ISO 27001 § 9.2, ISO 19011).

---

## Pourquoi la gestion des audits ?

L'ISO 27001 exige des audits internes à intervalles planifiés et un programme d'audit définissant fréquence,
méthodes, responsabilités et rapports. Le module réunit tout cela : l'**audit** comme objet, des **points de contrôle**
avec résultat, les **constats** qui en découlent et le **programme d'audit** comme plan annuel.

---

## Rôles et autorisations

| Action | Rôle minimum |
|---|---|
| Consulter audits et programmes d'audit | `reader` |
| Créer et modifier audits, points de contrôle, programmes | `auditor` ou `contentowner` |
| Approuver un programme / le remettre en brouillon | `auditor` ou `contentowner` |
| Supprimer définitivement ou restaurer depuis la corbeille | `admin` |

L'entrée de menu **Audits** est visible à partir de `contentowner` et pour les fonctions CISO, Révision et QMB.
Les administrateurs peuvent désactiver le module sous **Admin → Système**.

---

## Créer un audit

**Audits → « Nouvel audit »**

- **Titre**, **type d'audit** (interne, externe, audit fournisseur, certification) et **statut**
  (planifié, en cours, terminé, annulé).
- **Norme / référentiel** et **périmètre de l'audit**, **entités** concernées, pour un audit fournisseur le **fournisseur**.
- **Auditeur principal** et **équipe d'audit**.
- **Début / fin prévus**, **début / fin effectifs** et une **date de suivi**.
- **Programme d'audit** : rattachement à un plan annuel (facultatif).
- **Conclusion / résultat**.

Chaque audit reçoit une référence **AUD-AAAA-NNNN**. La liste se filtre par statut, type et année.

---

## Points de contrôle

Le détail de l'audit contient la **liste de contrôle**. Chaque point comporte

- une **référence de contrôle** (choisie dans la SoA, facultatif),
- la **question / exigence**,
- un **résultat** : ouvert, conforme, **non-conformité** ou non applicable,
- une **preuve** et des **remarques**.

Le résultat se modifie directement dans la ligne. En cas de **non-conformité**, le bouton
**« Créer un constat »** apparaît : il crée un constat prérempli (question comme état requis,
remarques comme état constaté, auditeur, période d'audit, lien vers le contrôle). Un seul constat est créé par point ;
il est ensuite lié dans le point.

---

## Associer des constats à un audit

Les constats créés à partir d'un point appartiennent automatiquement à l'audit. Les constats existants peuvent être
associés (ou dissociés) dans le formulaire de constat sous **Audit**. Le détail de l'audit liste tous les constats associés.

---

## Programme d'audit (plan annuel)

**Audits → onglet « Programme d'audit » → « Nouveau programme d'audit »**

Un programme a une **année**, des **objectifs** et un **périmètre** et reçoit la référence **AP-AAAA-NNNN**. Les audits sont associés via
le formulaire d'audit (ou directement dans le programme avec **« Ajouter un audit à ce programme »**). La vue du programme
regroupe les audits **par trimestre** du début prévu ; les audits sans date forment un groupe à part.

**Approbation :** **« Approuver »** enregistre le programme avec l'utilisateur et la date et le verrouille. Pour le réviser,
utiliser **« Retour au brouillon »**.

---

## Calendrier et tableau de bord

Le **calendrier** affiche pour chaque audit le début prévu, la fin prévue (tant que non terminé) et la date de suivi.
Le **tableau de bord** montre le total des audits, ceux en retard, ceux dans les 30 jours et les non-conformités ouvertes.
Un audit planifié ou en cours est en retard lorsque sa fin prévue est dépassée.

---

## Export

- **Liste des audits :** CSV et PDF (selon les filtres actifs).
- **Rapport d'audit :** dans le détail via **« Rapport d'audit »** — données de base, points de contrôle, constats et conclusion en PDF.
- **Programme d'audit :** CSV et PDF avec le plan trimestriel.

Le PDF est généré via la boîte de dialogue d'impression du navigateur.

---

## Actions sur les constats

Chaque constat dispose d’un **plan d’actions** (Reports → Constatations d’audit → ouvrir un constat). `auditor` et `contentowner` peuvent créer
ou supprimer une action ; toute personne à partir de `editor` peut en modifier le statut.

**Depuis la version 1.80**, ces actions sont des entrées du [registre des mesures](module-measures.fr.md) central : le plan d’actions du constat
les affiche comme auparavant, et en dessous le bloc **« Mesures (registre) »** les liste avec référence (`M-…`) et statut. La même mesure peut en
outre être affectée à des contrôles et à des risques dans le registre. Si une action encore affectée ailleurs est supprimée dans le plan d’actions,
seule l’affectation à ce constat est retirée.

---

## Corbeille

Les audits et programmes supprimés restent 30 jours dans la corbeille (**Admin → Corbeille**) et peuvent être restaurés ou
supprimés définitivement par les administrateurs.

---

## Remarque d'audit

Toutes les modifications sont consignées dans le journal d'audit. La gestion des audits ne remplace pas un rapport d'organisme de
certification, mais fournit les preuves de planification, de réalisation et de suivi selon l'ISO 27001 § 9.2.
