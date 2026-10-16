# Module : Évaluation des fournisseurs (Suppliers)

> Les fournisseurs et prestataires ayant accès aux valeurs informationnelles doivent
> être évalués et surveillés — ISO 27001 A.5.19 à A.5.22.

---

## Pourquoi évaluer les fournisseurs ?

De nombreux incidents de sécurité sont causés par des tiers ayant accès aux systèmes
ou aux données (attaques de la chaîne d'approvisionnement, services SaaS non sécurisés,
sous-traitants non contrôlés). ISO 27001 exige donc une gestion systématique des
risques liés aux fournisseurs.

---

## Rôles et permissions

| Action | Rôle minimum |
|---|---|
| Consulter les fournisseurs | `reader` |
| Créer et modifier un fournisseur | `editor` |
| Supprimer / restaurer un fournisseur | `admin` |

---

## Créer un fournisseur

**Fournisseurs → « + Nouveau fournisseur »**

Champs :
- **Nom** — raison sociale
- **Catégorie** — p. ex. Prestataire informatique, Fournisseur cloud, Entreprise de maintenance
- **Contact** — interlocuteur, e-mail
- **Niveau d'accès** — à quels systèmes/données le fournisseur a-t-il accès ?
- **Évaluation des risques** — `low` / `medium` / `high` / `critical`
- **Statut** — `active` / `inactive` / `under_review`
- **Prochaine révision** — quand la prochaine évaluation est-elle due ?
- **Exigences de sécurité** — quelles exigences ont été convenues ?
- **Preuves** — un certificat ISO, un rapport SOC2, un contrat AV sont-ils disponibles ?

---

## Évaluation fournisseur par e-mail

Pour les fournisseurs critiques, un **questionnaire de sécurité** peut être envoyé
sans que le fournisseur ait besoin d'un compte :

**Ouvrir le fournisseur → « Envoyer l'évaluation »**

Le fournisseur reçoit un lien personnalisé et remplit le questionnaire
directement dans le navigateur. Les réponses sont enregistrées et associées
au profil du fournisseur.

---

## Évaluation des risques

L'évaluation des risques d'un fournisseur dépend de :
- La nature et l'étendue de l'accès aux données
- La criticité des processus dépendants
- Les mesures de sécurité attestées (certifications, audits)
- La couverture contractuelle (contrat AV, NDA, SLAs)

Les fournisseurs avec une évaluation `high` ou `critical` devraient être
révisés au minimum annuellement.

---

## Lien avec le RGPD

Les fournisseurs qui traitent des données personnelles apparaissent également dans
le module RGPD sous Contrats de sous-traitance (AV). La liaison s'effectue là-bas
manuellement lors de la saisie AV.

---

## Risques liés

Dans le formulaire de risque, les risques peuvent être liés à un ou plusieurs fournisseurs (section « Liens » → **Actifs, types d'actifs et fournisseurs concernés**). Dans le formulaire du fournisseur (en modification), la section **Risques liés** liste tous les risques associés avec niveau et statut.

---

## Tableau de bord

L'aperçu des fournisseurs affiche :
- Nombre total par évaluation des risques
- Fournisseurs avec révision en retard
- Fournisseurs actifs vs. inactifs

---

## Remarque d'audit

ISO 27001 A.5.19 exige une politique pour les relations avec les fournisseurs.
A.5.20 exige des exigences de sécurité dans les contrats fournisseurs.
A.5.21 traite des risques liés à la chaîne d'approvisionnement.
A.5.22 exige la surveillance régulière des performances et de la sécurité des fournisseurs.

La fonctionnalité d'évaluation des fournisseurs permet la preuve documentée
du contrôle de sécurité vis-à-vis de l'auditeur.
