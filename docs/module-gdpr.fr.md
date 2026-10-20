# Module : RGPD (Règlement Général sur la Protection des Données)

> Le module RGPD couvre toutes les obligations de preuve centrales du Règlement Général
> sur la Protection des Données — du registre des activités de traitement aux contrats
> de sous-traitance jusqu'aux demandes des personnes concernées.

---

## Vue d'ensemble des sous-domaines

| Domaine | Abréviation | Base juridique |
|---|---|---|
| Registre des activités de traitement | RAT | Art. 30 RGPD |
| Contrats de sous-traitance (DPA) | AV | Art. 28 RGPD |
| Analyse d'impact relative à la protection des données | AIPD | Art. 35 RGPD |
| Violations de données | — | Art. 33/34 RGPD |
| Demandes des personnes concernées (DSAR) | DSAR | Art. 15–22 RGPD |
| Mesures techniques et organisationnelles | MTO | Art. 32 RGPD |
| Délégué à la protection des données | DPD | Art. 37–39 RGPD |
| Plan d'effacement | — | Art. 17 RGPD |

---

## Registre des activités de traitement (RAT)

Le RAT est le registre central du RGPD — une liste complète de toutes les activités
de traitement des données de l'organisation.

**Créer :** RGPD → RAT → **« + Nouveau traitement »**

Champs obligatoires selon l'art. 30 RGPD :
- Désignation et finalité du traitement
- Responsable(s) du traitement et éventuellement co-responsables
- Groupes de personnes concernées et catégories de données
- Destinataires (internes/externes)
- Transfert vers des pays tiers (oui/non + mesure de protection)
- Délais d'effacement
- MTO associées

**Export :** Les entrées du RAT peuvent être exportées en CSV — directement utilisable
comme annexe au rapport de protection des données ou pour l'autorité de contrôle.

---

## Contrats de sous-traitance (DPA — Data Processing Agreement)

Pour chaque prestataire qui traite des données personnelles pour le compte de l'organisation
(services cloud, prestataires informatiques, gestion de la paie, etc.), un contrat de
sous-traitance (AV) est requis conformément à l'art. 28 RGPD.

**Créer :** RGPD → AV → **« + Nouveau AV »**

Champs : nom du prestataire, finalité, catégories de données, durée, annexe au contrat
(upload PDF possible).

> **Rôle minimum pour AV :** `contentowner`

---

## Analyse d'impact relative à la protection des données (AIPD)

Pour les traitements présentant un **risque élevé** pour les droits des personnes concernées,
une AIPD (DPIA — Data Protection Impact Assessment) est obligatoire selon l'art. 35 RGPD.
Déclencheurs typiques : surveillance systématique, traitement de catégories sensibles,
décisions automatisées.

**Créer :** RGPD → AIPD → **« + Nouvelle AIPD »**

Champs : description du traitement, nécessité et proportionnalité, risques identifiés,
mesures correctives, statut d'approbation.

> **Rôle minimum pour AIPD :** `contentowner`

---

## Violations de données

Les violations de données présentant un risque pour les personnes concernées doivent être
notifiées à l'autorité de contrôle dans un délai de **72 heures** (art. 33 RGPD).

**Saisir :** RGPD → Violations de données → **« + Nouvelle violation »**

Champs : date et heure, nature de la violation, catégories de données et nombre de personnes
concernées, conséquences probables, mesures prises, obligation de notification (oui/non).

> **Rôle minimum :** `auditor` ou supérieur

---

## Demandes d'accès des personnes concernées (DSAR — Data Subject Access Request)

Les personnes concernées ont le droit d'accès, de rectification, d'effacement et de
portabilité (art. 15–22 RGPD). Le délai est d'**un mois** (prorogeable à trois mois).

**Saisir :** RGPD → DSAR → **« + Nouvelle demande »**

Champs : type de demande (accès/effacement/rectification/portabilité), date de réception,
délai, statut (ouvert/en cours/clôturé), notes.

> **Rôle minimum :** `editor` ou supérieur — les DSAR sont confidentielles

---

## Mesures techniques et organisationnelles (MTO)

Les MTO documentent les mesures de protection selon l'art. 32 RGPD — tant techniques
(chiffrement, contrôle d'accès) qu'organisationnelles (formations, politiques).

**Créer :** RGPD → MTO → **« + Nouvelle MTO »**

Champs : catégorie (contrôle d’accès, chiffrement, journalisation, sécurité réseau, sécurité applicative,
sauvegarde et restauration, organisationnelle, formation, conservation des données), niveau de risque, description,
état de mise en œuvre, entrées RAT associées, preuve.

**Depuis la version 1.80**, les MTO (« TOM » dans l’interface) sont tenues dans le [registre des mesures](module-measures.fr.md) central
(indicateur *TOM*). Elles y apparaissent avec toutes les autres mesures, peuvent être filtrées par origine « Uniquement les TOM »
et peuvent en outre être affectées à des contrôles SoA. Les droits restent ceux décrits ici : création et modification à partir de `contentowner`.

---

## Délégué à la protection des données (DPD)

Sous RGPD → DPD, les coordonnées et le document de désignation du délégué à la
protection des données peuvent être enregistrés (upload PDF). Les informations apparaissent
automatiquement dans le tableau de bord RGPD.

---

## Plan d'effacement

Le journal d'effacement documente les suppressions effectivement réalisées —
quand quelle catégorie de données a été supprimée et selon quel délai.

**RGPD → Journal d'effacement → « + Entrée »**

Les effacements échus (basés sur les délais enregistrés dans le RAT) apparaissent
comme indication dans le tableau de bord.

---

## Tableau de bord

Le tableau de bord RGPD offre un aperçu rapide :
- Nombre d'entrées RAT, DSAR ouvertes, violations de données actives
- MTO par catégorie
- Effacements échus
- Coordonnées du DPD

---

## Remarque d'audit

Lors d'un contrôle RGPD par l'autorité de contrôle, les éléments typiquement vérifiés sont :
exhaustivité du RAT, contrats AV pour tous les prestataires concernés, AIPD pour les
traitements à haut risque, preuve du traitement des DSAR dans les délais,
et la documentation des MTO. Le module RGPD couvre tous ces points.
