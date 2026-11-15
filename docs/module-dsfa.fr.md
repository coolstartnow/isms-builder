# Module : Analyse d’impact relative à la protection des données (AIPD)

> Une AIPD décrit un traitement prévu, évalue ses risques pour les personnes concernées et définit des mesures. Le **responsable la rédige lui-même**, le **délégué à la protection des données (DPD) la vérifie** et rend un avis. ISMS Builder fournit des modèles, un examen préalable, un circuit de vérification et une vue d’impression. Le reste du module est décrit dans le guide « Module : RGPD (protection des données) ».

> **Remarque :** Tous les modèles et l’examen préalable sont orientés pratique mais doivent être **soigneusement adaptés à votre propre entreprise**. Ils ne constituent **pas un conseil juridique** et ne doivent pas être compris comme tel ; ils ne remplacent ni l’évaluation de votre cas concret ni la vérification par le DPD. Vous consultez vous-même les listes nationales des autorités de contrôle.

---

## Qui fait quoi ?

| Rôle | Tâche |
|---|---|
| Service métier / responsable (à partir du rôle **Content Owner**) | effectue l’examen préalable, choisit le modèle, remplit l’AIPD et la soumet à vérification |
| **DPD** (compte avec la fonction *DPD* ou administrateur) | vérifie l’AIPD et saisit l’**avis** |
| Direction responsable (Content Owner) | prend la **décision**, la motive et approuve l’AIPD |

Le DPD n’est **pas l’auteur**. Seuls les comptes ayant la fonction *DPD* et les administrateurs peuvent saisir un avis ; le serveur enregistre la personne et la date.

**Démo :** le jeu de démonstration contient pour cela deux comptes distincts sans droits d’administrateur : **carla** (`carla@security.example` / `carlapass`) avec la fonction RSSI et **dana** (`dana@privacy.example` / `danapass`) avec la fonction DPD. Tester le circuit : préparer l’AIPD avec **carla**, saisir l’avis avec **dana**, approuver avec **carla**. **carla** ne peut pas saisir l’avis.

---

## Déroulement en six étapes

1. **RGPD → AIPD → Examen préalable : une AIPD est-elle nécessaire ?** Cochez ce qui s’applique à votre traitement (voir ci-dessous). Le résultat est enregistré avec l’AIPD.
2. **Continuer avec un modèle**, ou à tout moment **Utiliser un modèle** : choisissez le type de traitement. Le formulaire est prérempli.
3. **Remplir :** description (finalité, personnes concernées, catégories de données, destinataires, lieu de stockage, durées), nécessité et proportionnalité, mesures existantes, les **risques avec leurs mesures** et le **risque résiduel**. La probabilité et l’impact (1 à 5) des modèles sont des propositions : vérifiez-les et modifiez-les. Les mesures s’écrivent une par ligne sous le risque.
4. Mettre le statut **Vérification**. Le DPD lit l’AIPD.
5. **Avis du DPD :** le DPD coche **DPD consulté** et saisit l’**avis**.
6. **Décision et approbation :** choisir la décision (poursuivre, modifier, rejeter) et la motiver, puis mettre le statut **Approuvé**.

Ensuite : imprimer ou archiver avec **PDF** (logo de l’entreprise en en-tête, avis du DPD avec personne et date, approbation) et réexaminer l’AIPD à chaque modification du traitement.

---

## Examen préalable : une AIPD est-elle nécessaire ?

L’examen préalable interroge d’abord les **cas de l’art. 35, par. 3 RGPD**. Si l’un s’applique, une AIPD est requise :

- Évaluation systématique et approfondie d’aspects personnels de personnes physiques fondée sur un traitement automatisé, y compris le profilage, avec des décisions produisant des effets juridiques ou les affectant de manière significative
- Traitement à grande échelle de catégories particulières de données (art. 9) ou de données relatives aux condamnations pénales et aux infractions (art. 10)
- Surveillance systématique à grande échelle d’une zone accessible au public

Puis les **neuf critères des lignes directrices WP 248** des autorités européennes de protection des données. Si **deux ou plus** s’appliquent, une AIPD est en principe nécessaire :

1. Évaluation ou notation (y compris profilage et prédiction)
2. Décisions automatisées ayant un effet juridique ou similaire
3. Surveillance systématique de personnes
4. Données sensibles ou à caractère hautement personnel (p. ex. santé, biométrie, finances, localisation)
5. Traitement à grande échelle (nombreuses personnes, gros volume de données, vaste zone ou longue durée)
6. Mise en correspondance ou combinaison de jeux de données de sources différentes
7. Données de personnes vulnérables (p. ex. salariés, enfants, patients)
8. Utilisation de technologies nouvelles ou innovantes (p. ex. IA, biométrie, internet des objets)
9. Le traitement empêche des personnes d’exercer un droit ou de bénéficier d’un service ou d’un contrat

**Résultat :**

- Une AIPD est requise (art. 35, par. 3 RGPD).
- Une AIPD est probablement requise (deux critères ou plus des lignes directrices WP 248 s’appliquent). Si vous y renoncez, vous devez en documenter les motifs.
- Une AIPD n’est pas obligatoire. Documentez le résultat de cet examen et consultez les listes de l’autorité de contrôle de votre pays.

Vous consultez vous-même les listes de l’autorité de contrôle de votre pays qui désignent les cas où une AIPD est ou n’est pas exigée. Si vous renoncez à une AIPD, documentez les motifs, par exemple dans un enregistrement archivé.

---

## Les modèles

Le modèle crée la trame de description, les bases juridiques, des risques types avec mesures et des valeurs suggérées. Il ne contient aucune donnée d’entreprise hormis l’espace réservé `{{COMPANY_NAME}}`, rempli à partir des données de l’organisation (Admin → Organisation). Types de traitement proposés :

- **Logiciel RH dans le cloud (gestion du personnel et paie)**: Gestion du personnel, paie et développement du personnel avec un logiciel RH dans le cloud.
- **Vidéosurveillance**: Protection des biens et des personnes, élucidation d’infractions dans des zones définies.
- **Surveillance et géolocalisation des salariés (temps de travail, position, performance)**: Enregistrement du temps de travail, géolocalisation de véhicules ou d’appareils, analyse de l’usage et de la performance.
- **Service d’IA avec données personnelles (p. ex. assistant, chatbot, analyse)**: Utilisation d’un service d’IA pour assister des tâches pouvant impliquer des données personnelles.
- **Profilage et scoring des clients**: Évaluation des clients (solvabilité, comportement d’achat, segmentation) sur la base d’un traitement automatisé.
- **Données de santé (gestion de la réintégration, médecin du travail)**: Traitement des données de santé des salariés, par exemple reprise du travail après maladie et suivi de santé au travail.
- **Contrôle d’accès biométrique et enregistrement du temps**: Accès à des locaux ou systèmes ou enregistrement du temps par empreinte digitale, visage ou autres caractéristiques biométriques.
- **Dispositif de lancement d’alerte (canal de signalement)**: Réception, examen et traitement des signalements de violations via un canal interne ou externe.
- **Gestion des candidatures (éventuellement avec présélection par IA)**: Réception, sélection et gestion des candidatures, éventuellement avec présélection automatisée.

Ce que vous devez compléter : les informations concrètes sur **votre** traitement (destinataires, prestataires, lieu de stockage, durées, base juridique dans le cas concret), la vérification des risques et valeurs proposés et les mesures réellement mises en œuvre.

---

## Règles d’approbation

| Règle | Effet |
|---|---|
| Nouvelle AIPD | ne peut pas être approuvée immédiatement |
| Avis | uniquement fonction *DPD* ou administrateur ; la personne et la date sont enregistrées |
| Approbation | uniquement avec **DPD consulté** et un avis saisi, une **décision** et, en cas de **risque résiduel élevé ou critique**, une **justification** ou la case **Consultation de l’autorité de contrôle requise** |
| Cachet d’approbation | personne et date fixées par le serveur ; supprimé si le statut est réinitialisé |
| Journal d’audit | création, modifications et changements de statut sont journalisés |

Les AIPD déjà approuvées dans des versions antérieures restent valables ; les règles s’appliquent au prochain changement de statut.

**Messages d’erreur :** « L’approbation requiert l’avis du délégué à la protection des données » (avis manquant), « L’approbation requiert une décision », « En cas de risque résiduel élevé … » (ajouter une justification ou cocher la consultation de l’autorité de contrôle), « Seul le délégué à la protection des données ou un administrateur peut saisir l’avis du DPD ».

---

## Impression

**PDF** (dans la liste et dans le formulaire) ouvre une vue d’impression avec logo de l’entreprise, description, nécessité, tableau des risques avec mesures, risque résiduel, avis du DPD, décision et approbation. Dans la boîte de dialogue d’impression, vous pouvez enregistrer en PDF.
