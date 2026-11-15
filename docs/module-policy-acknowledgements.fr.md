# Module : Policy Acknowledgements (Confirmation de politique)

> Distribution et confirmation vérifiables des politiques par les collaborateurs —
> un document d'audit central pour ISO 27001.

---

## Qu'est-ce qu'une Policy Acknowledgement ?

ISO 27001 exige non seulement que les politiques existent, mais qu'elles aient été
**portées à la connaissance** des personnes concernées et que celles-ci aient **confirmé
leur compréhension** (exigences 7.3 et A.6.3). La preuve classique : un accusé de réception signé.

L'ISMS Builder automatise entièrement ce processus :
- Sélectionner la politique → définir la liste de distribution → envoyer le lien par e-mail
- Le destinataire confirme via un lien personnalisé (aucune connexion requise)
- Documentation complète des preuves avec horodatage et export CSV

---

## Rôles et permissions

| Action | Rôle minimum |
|---|---|
| Voir les chiffres du tableau de bord (« Campagnes actives », « Confirmations en attente ») | `reader` |
| Consulter l'aperçu des distributions et le détail des confirmations (menu « Accusés de réception des politiques ») | `contentowner` |
| Créer et envoyer une distribution | `contentowner` |
| Envoyer un rappel | `contentowner` |
| Saisir ou importer manuellement une confirmation | `contentowner` |
| Supprimer une distribution | `admin` |

Les lecteurs ne voient que les chiffres agrégés du tableau de bord. Les listes de destinataires (adresse e-mail, nom, date et adresse IP de la confirmation) sont réservées au content owner, car elles contiennent des données personnelles.

---

## Flux de travail : distribuer une politique

**Étape 1 — Créer une distribution**
Dans le menu **« Policy Acknowledgements »**, cliquer sur **« + Nouvelle distribution »**.

**Étape 2 — Champs obligatoires**
- **Choisir la politique** — seuls les templates avec le statut `approved` sont sélectionnables
- **Titre de la distribution** — p. ex. « Politique de mots de passe 2026 – Distribution annuelle »
- **Date d'échéance** — jusqu'à quand la confirmation doit-elle être reçue ?
- **Destinataires** — noms et adresses e-mail des personnes à notifier

**Étape 3 — Envoyer**
Via **« Envoyer »**, chaque destinataire reçoit un e-mail avec un **lien de confirmation
personnalisé**. Le lien est associé à la personne et fonctionne sans connexion. Le destinataire voit la politique **mise en forme** (Markdown rendu : titres, tableaux, listes), et non plus en texte brut.

**Étape 4 — Confirmation par le destinataire**
Le destinataire ouvre le lien, voit le texte complet de la politique et clique sur
**« Je confirme avoir lu et compris cette politique »**.
L'horodatage et l'adresse IP sont enregistrés.

**Étape 5 — Suivi du statut**
Dans l'aperçu des distributions, l'état est visible à tout moment :
- Qui a confirmé (avec horodatage)
- Qui n'a pas encore confirmé
- Quel pourcentage est complété

---

## Fonction de rappel

Via **« Envoyer un rappel »**, tous les destinataires qui n'ont pas encore confirmé
reçoivent un nouvel e-mail avec le même lien personnalisé.

---

## Confirmation manuelle et import

Pour les personnes sans accès e-mail (p. ex. collaborateurs en production) :

**Saisie individuelle :** Dans la distribution, cliquer sur **« Saisir une confirmation »** — saisir
le nom, la date et une note optionnelle.

**Import CSV :** Import groupé via un fichier CSV avec les colonnes
`name, email, confirmedAt` (format : ISO 8601).

---

## Export et preuve

Via **« Exporter en CSV »** dans la distribution, une liste complète de confirmations
est téléchargée — utilisable comme preuve d'audit :

```
name, email, confirmedAt, method
Max Mustermann, m.mustermann@firma.de, 2026-03-15T10:23:00Z, link
Anna Schmidt, a.schmidt@firma.de, 2026-03-16T08:45:00Z, manual
```

---

## Remarque d'audit

L'auditeur attend pour chaque politique liée à la sécurité la preuve de sa communication.
Les exports CSV des distributions constituent le document approprié à cet effet. Recommandation :
- Distribution annuelle de toutes les politiques actives
- En cas de modification d'une politique : déclencher une nouvelle distribution
- Archiver les exports dans le système de gestion documentaire
