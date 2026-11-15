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

> **En détail :** modèles, examen préalable, vérification par le DPD et impression sont décrits dans le guide « Module : Analyse d’impact relative à la protection des données (AIPD) » (`docs/module-dsfa.fr.md`).

---

## Modèles pour les entrées

Chaque onglet propose des modèles qui préremplissent un nouveau formulaire avec une proposition pratique : **activités de traitement (registre)**, **contrats de sous-traitance**, **violations de données**, **droits des personnes concernées** (lettres de réponse) et **TOM**. L’**AIPD** a ses propres modèles, voir le guide « Module : Analyse d’impact relative à la protection des données (AIPD) ».

**Comment faire :** dans l’onglet, cliquez sur **Utiliser un modèle**, choisissez le modèle et cliquez sur **Appliquer le modèle**. Le formulaire s’ouvre avec la proposition. Vous vérifiez, adaptez et enregistrez. Une entrée n’existe qu’une fois enregistrée ; le modèle lui-même n’est jamais modifié.

> **Important :** Tous les modèles sont orientés pratique mais doivent être **soigneusement adaptés à votre propre entreprise**. Ils ne constituent **pas un conseil juridique** et ne doivent pas être compris comme tel. Les délais, bases juridiques et durées de conservation sont des propositions que vous devez vérifier au regard du droit qui vous est applicable. Vous saisissez vous-même les noms, prestataires, chiffres et responsabilités.

### Activités de traitement (registre) (14)

Sont préremplis la finalité, la base juridique, les catégories de données, les personnes concernées, les destinataires, la conservation et la procédure de suppression ; « risque élevé » n’est coché que là où il s’applique en général. Les mois de conservation ne sont indiqués que lorsqu’une valeur indicative courte est usuelle.

Comptabilité et facturation; Dispositif de lancement d’alerte (canal de signalement); Enregistrement du temps et contrôle d’accès; Exploitation du site web et analyse d’audience; Exploitation informatique, journalisation et sécurité de l’information; Formulaire de contact et demandes générales; Gestion de la clientèle (CRM); Gestion des candidatures; Gestion des fournisseurs et partenaires commerciaux; Gestion du personnel et paie; Newsletter et marketing par e-mail; Support client et système de tickets; Vidéosurveillance; Événements et formations.

### Contrats de sous-traitance (12)

Sont préremplis le titre et l’étendue du traitement. Sous-traitant, pays, dates du contrat et **liste de contrôle de l’art. 28** restent vides ; vous ne cochez que ce que le contrat contient réellement.

Centre d’appels et prestataire de service client; Destruction de documents et élimination de supports; Hébergement cloud et centre de données; Hébergement web et agence de sites web; Logiciel CRM et marketing; Logiciel RH et de paie (SaaS); Prestataire informatique, maintenance et télémaintenance; Service de messagerie, d’agenda et de collaboration; Service de sauvegarde et d’archivage; Service d’IA (p. ex. assistant ou traitement de texte); Système de support et de tickets; Vidéosurveillance et service de sécurité.

### Violations de données (10)

Sont préremplis le type, les catégories de données, les personnes concernées, les mesures immédiates, les mesures de suivi, le risque et une **suggestion** quant à la notification de l’autorité de contrôle et des personnes concernées. Il vous appartient de décider au cas par cas si une notification est nécessaire.

Accès non autorisé via un compte compromis; Attaque par rançongiciel; E-mail ou document envoyé par erreur; Erreur de configuration : données exposées publiquement ou partagées trop largement; Hameçonnage avec divulgation d’identifiants; Perte ou vol d’un ordinateur portable, smartphone ou support de données; Publication accidentelle de données personnelles; Suppression ou modification accidentelle de données; Utilisation abusive des droits d’accès par des collaborateurs; Vol ou perte de documents papier.

### Droits des personnes concernées, lettres de réponse (10)

Le texte de réponse est prérempli avec phrase d’introduction et de conclusion. Les espaces réservés `{{COMPANY_NAME}}` et `{{DATA_PROTECTION_OFFICER}}` sont remplis à partir des données de l’organisation. Il existe aussi des textes pour la demande de justificatif d’identité, la prolongation du délai et le refus ; les points ouverts figurent entre parenthèses.

Demande de justificatif d’identité (art. 12, par. 6); Information sur la prolongation du délai (art. 12, par. 3); Refus d’une demande (art. 12, par. 4 et 5); Réponse concernant les décisions automatisées (art. 22); Réponse à une demande de limitation du traitement (art. 18); Réponse à une demande de portabilité des données (art. 20); Réponse à une demande de rectification (art. 16); Réponse à une demande d’accès (art. 15); Réponse à une demande d’effacement (art. 17); Réponse à une opposition (art. 21).

### TOM (24)

Sont préremplis le titre, la catégorie, la description et les conseils de mise en œuvre ; le statut est « Planifié ». Vous saisissez vous-même ce qui est réellement mis en œuvre.

Authentification multifacteur; Bureau propre et verrouillage d’écran; Chiffrement des disques et des appareils; Chiffrement des sauvegardes et des supports amovibles; Chiffrement du transport (TLS) et accès à distance sécurisés; Choix et contrôle des sous-traitants; Concept de suppression; Concept d’autorisations par rôles; Contrôle de saisie (traçabilité des modifications); Contrôle de séparation et limitation des finalités; Contrôle d’accès physique aux bâtiments et salles serveurs; Durées de conservation et archivage; Développement sécurisé et protection des données de test; Engagement de confidentialité; Formation à la protection des données et sensibilisation; Gestion de la protection des données et implication du DPD; Gestion des correctifs et des vulnérabilités; Journalisation et analyse; Pare-feu et segmentation du réseau; Planification d’urgence et de reprise; Processus pour les violations de données; Protection contre les logiciels malveillants; Pseudonymisation et anonymisation; Sauvegarde et restauration testée.

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
