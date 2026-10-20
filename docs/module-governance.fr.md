# Module : Gouvernance (pilotage du SMSI)

> La gouvernance documente les activités de management qui maintiennent le SMSI
> en fonctionnement — révisions, décisions et mesures émanant de la direction.
> ISO 27001 chapitre 9.3 (Revue de direction).

---

## Trois sous-domaines

| Domaine | Objectif |
|---|---|
| **Revues de direction** | Procès-verbaux de la révision du SMSI par la direction |
| **Actions** | Mesures et décisions issues des revues |
| **Réunions** | Procès-verbaux des réunions du comité SMSI |

---

## Revues de direction

ISO 27001 chapitre 9.3 prescrit que la haute direction révise le SMSI à **intervalles
planifiés**. La revue doit prendre en compte certaines données d'entrée (résultats
d'audit, incidents, atteinte des objectifs) et mener à des données de sortie documentées
(décisions d'amélioration).

**Gouvernance → Revues → « + Nouvelle revue »**

Champs :
- **Date et participants**
- **Données d'entrée** — résultats d'audit, état des KPI, incidents depuis la dernière revue,
  situation des risques, besoins en ressources, propositions d'amélioration
- **Résultats** — décisions, responsables, délais
- **Prochaine revue**

---

## Actions (mesures)

Les mesures issues des revues ou d'autres sources (audits, incidents) sont
suivies ici.

**Gouvernance → Mesures → « + Nouvelle mesure »**

Champs :
- **Titre et description**
- **Source** — de quelle revue/audit/incident provient la mesure ?
- **Responsable et date d'échéance**
- **Priorité** — `low` / `medium` / `high`
- **Statut** — `open` / `in_progress` / `completed` / `cancelled`

**Depuis la version 1.80**, ces mesures sont tenues dans le [registre des mesures](module-measures.fr.md) central (indicateur *Gouvernance*). Rien ne
change dans l’utilisation ici ; dans le registre, elles apparaissent avec toutes les autres mesures et peuvent en outre être affectées à des
contrôles, constats et risques. Les pièces jointes restent attachées à la mesure dans ce domaine. Seul un administrateur peut toujours les supprimer.

---

## Réunions

Procès-verbaux des réunions régulières de pilotage du SMSI (p. ex. comité
de sécurité mensuel).

**Gouvernance → Réunions → « + Nouvelle réunion »**

Champs : date, participants, ordre du jour, décisions, prochaine réunion.

---

## Tableau de bord

L'aperçu de gouvernance affiche :
- Mesures ouvertes par priorité et échéance
- Dernière et prochaine revue de direction planifiée
- Mesures en retard (marquées en rouge)

---

## Remarque d'audit

ISO 27001 chapitre 9.3 est l'une des exigences les plus souvent critiquées lors
des audits initiaux — de nombreuses organisations n'ont pas de revue de direction
documentée.

L'auditeur vérifie :
1. Une revue de direction a-t-elle eu lieu ? (au moins une fois par an)
2. Les données d'entrée prescrites ont-elles été prises en compte ?
3. Les mesures sont-elles documentées et traçables ?

Recommandation : au minimum une revue de direction formelle par an, de préférence
semestrielle.
