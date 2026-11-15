# Module : Formations et sensibilisation (Training)

> Les collaborateurs sont le facteur le plus important — et souvent le plus vulnérable —
> dans le SMSI. ISO 27001 chapitres 7.2 et 7.3 ainsi que A.6.3 exigent une
> compétence et une sensibilisation à la sécurité attestées.

---

## Qu'est-ce qui est documenté ici ?

Le module Training enregistre toutes les mesures de formation à la sécurité
de l'information :
- Formations obligatoires (intégration, formation annuelle)
- Simulations de phishing (hameçonnage)
- Ateliers et séminaires externes
- Achèvements d'e-learning
- Formations spécifiques aux rôles (Admin, CISO, DPO)

---

## Rôles et permissions

| Action | Rôle minimum |
|---|---|
| Consulter les formations | `reader` |
| Créer et modifier une formation | `editor` |
| Supprimer / restaurer une formation | `admin` |

---

## Créer une formation

**Training → « + Nouvelle formation »**

Champs :
- **Titre** — p. ex. « Sensibilisation au phishing T1 2026 »
- **Type** — Formation obligatoire / Simulation de phishing / Atelier / E-Learning / Autre
- **Date** — quand la formation a-t-elle eu lieu ?
- **Durée** — en heures
- **Formateur / Prestataire**
- **Public cible** — tous les collaborateurs / département informatique / cadres, etc.
- **Nombre de participants** — combien de personnes ont été formées ?
- **Taux de couverture** — quel pourcentage du public cible a été atteint ?
- **Résultat / Notes** — évaluation, enseignements, points d'amélioration
- **Statut** — `planned` / `completed` / `cancelled`

---

## Saisir une preuve (onglet « Preuves »)

Une preuve n'est **pas un enregistrement à part** : c'est le champ **« Preuve / Notes »** de la formation. L'onglet **« Preuves »** n'a donc pas de bouton « Nouveau » : il liste uniquement les formations au statut **Terminée** avec le texte de preuve saisi.

Marche à suivre :
1. **Onglet « Plan »** → ouvrir la formation avec le crayon (ou la créer avec « + Nouvelle formation »).
2. Mettre le **statut** sur *Terminée* et saisir la date de fin.
3. Dans la section **« Preuves »**, remplir **« Preuve / Notes »** : liste de présence, numéros de certificat, liens (`http`/`https`) vers les documents archivés.
4. **Enregistrer.** La formation apparaît dans l'onglet « Preuves » ; un clic sur sa carte affiche la formation en lecture seule (les modifications se font uniquement dans l'onglet « Plan »).

Attention : une formation qui n'est pas encore *Terminée* n'apparaît pas dans l'onglet « Preuves », même avec un texte de preuve. Les fichiers se joignent dans le même formulaire sous « Pièces jointes » (voir plus bas).

---

## Pièces jointes et attestation de participation

**Pièces jointes** (liste de présence, certificat d'un prestataire, photos) : onglet « Plan » → ouvrir la formation → section **« Pièces jointes »** → « Ajouter un fichier ». Possible dès que la formation est enregistrée.
- Autorisés : PDF, PNG, JPG, DOCX, XLSX et TXT jusqu'à 20 Mo par fichier. L'extension **et** le contenu sont vérifiés ; les autres fichiers ou fichiers déguisés sont refusés.
- Les comptes à partir d'Éditeur peuvent ajouter et retirer ; tout compte avec droit de lecture peut télécharger. Dans l'onglet « Preuves », les pièces jointes figurent comme boutons sur la carte.
- **« Retirer » masque seulement la pièce jointe dans la liste.** Le fichier reste sur le serveur comme preuve (dossier `training-files/` du répertoire de données). Sauvegardez aussi ce dossier ; il ne fait pas partie de l'export JSON.
- Chaque ajout et chaque retrait figure dans le journal d'audit.

**Attestation de participation (PDF) :** bouton « Attestation de participation (PDF) » dans l'onglet « Preuves » (sur la carte) et dans le formulaire.
- Elle n'existe **que pour les formations au statut « Terminée »**. Pour tout autre statut, le système indique qu'elle est délivrée après la fin.
- **Une attestation par formation** (pas par participant) : titre, catégorie, description, date de fin, formateur/prestataire, participants (champ « Assignée à »), obligatoire oui/non, contrôles liés, logo et nom de l'entreprise. La couleur d'accent suit la catégorie, la langue suit la langue par défaut de l'installation.
- **Le code de contrôle** est calculé à partir de l'identifiant, du titre, de la date de fin, du formateur et des participants (SHA-256, 12 premiers caractères). Si ces informations changent, le code change : vous voyez ainsi si une ancienne attestation correspond encore à l'état actuel de la formation.
- **C'est un justificatif interne de l'entreprise, pas une certification** par un tiers ; le document le dit. Il ne porte pas de signature.
- Limite : la police du PDF ne connaît pas les caractères hongrois ő/ű ; ils apparaissent comme ö/ü.
- Chaque émission figure dans le journal d'audit avec le code de contrôle.

---

## Progression et indicateurs

L'aperçu des formations affiche :
- Taux de couverture sur l'ensemble des formations (objectif : 100 % des formations obligatoires)
- Formations planifiées vs. réalisées
- Formations par type et période

---

## Lien avec le SoA

Les mesures de formation peuvent être liées comme preuve de mise en œuvre
de contrôles, par exemple :
- ISO A.6.3 (Security Awareness Training) → Formation annuelle
- ISO A.8.7 (Protection against malware) → Simulation de phishing

---

## Remarque d'audit

ISO 27001 chapitre 7.2 exige la preuve que les collaborateurs possèdent
les compétences nécessaires. Le chapitre 7.3 exige la conscience de la politique
du SMSI et de leur rôle personnel au sein de celle-ci.

L'auditeur attend :
1. Un plan de formation pour l'année en cours
2. Les preuves des formations réalisées (listes de présence, certificats)
3. Un taux de couverture qui englobe tous les collaborateurs concernés

Recommandation : indiquer la liste de présence et les liens (http/https) dans le champ « Preuve / Notes » et joindre certificats et listes sous « Pièces jointes », pour qu'ils soient immédiatement disponibles lors de l'audit. Dans l'onglet « Preuves », un clic sur une carte affiche la formation en lecture seule (les modifications se font dans l'onglet « Plan ») ; les liens du texte sont cliquables.