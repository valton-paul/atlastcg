# Atlas — Plan d’implémentation par tickets

L’objectif est de transformer le cahier des charges en un plan de développement réellement exploitable, adapté à un développeur solo, avec une stack mobile moderne et Supabase.

Je recommande de développer Atlas par tranches fonctionnelles verticales : chaque étape doit produire quelque chose qui fonctionne sur le téléphone, plutôt que de construire toute la base de données, puis toute l’API, puis toute l’interface séparément.

Le principe directeur reste le même : la carte du monde donne le contexte, les expéditions donnent la direction, les cartes donnent envie de collectionner, l’ouverture des paquets donne le plaisir immédiat et la découverte donne du sens.

## 1. Organisation du développement

## P0

Fondations

Socle technique et design system

Application mobile, navigation, composants, Supabase, environnements et CI.

Bloquant

## P1

Cœur du jeu

Cartes, collection et paquets

Le premier parcours complet : gagner un paquet, l’ouvrir, recevoir des cartes et les retrouver dans sa collection.

Priorité absolue

## P2

Exploration

Carte du monde, fiches pays et expéditions

Donner une utilité à la collection et une direction aux prochaines découvertes.

## P3

Rétention

Progression quotidienne, défis et social

Donner des raisons de revenir sans rendre le jeu punitif ni imposer une connexion quotidienne.

## P4

Lancement

Polissage, sécurité, bêta et monétisation

Stabilité, performances, conformité, instrumentation et préparation à la publication.

Les priorités sont plus importantes que les numéros : si le temps manque, les fonctionnalités sociales avancées et l’abonnement doivent attendre. Le jeu doit être plaisant même sans elles.

## 2. Règles de gestion du backlog

Chaque ticket doit être suffisamment petit pour être développé, testé et validé indépendamment.

- P0 — Bloquant : indispensable pour continuer.
- P1 — MVP : indispensable pour obtenir une première version jouable.
- P2 — Important : enrichit l’expérience après validation du cœur.
- P3 — Plus tard : amélioration non nécessaire au lancement.

Estimation indicative : un ticket représente généralement quelques heures à deux jours de travail pour un développeur solo, hors imprévus. Les estimations ci-dessous ne comprennent pas la création exhaustive des illustrations ni la rédaction de toutes les données culturelles.

## 3. Backlog détaillé par tickets

Les tickets ci-dessous peuvent être copiés dans GitHub Issues, GitLab Issues, Linear ou Jira. Pour chaque ticket, on définit le résultat attendu, les critères d’acceptation et les tests qui permettent de le clôturer.

### Phase A — Fondations techniques

Objectif : obtenir une application qui démarre, navigue correctement et communique avec Supabase de façon sécurisée.

### ATL-001 — Initialiser l’application mobile

P0

Estimation : 0,5 à 1 jour · Dépendance : aucune

Travail

- Créer le projet Expo avec React Native et TypeScript.
- Configurer Expo Router, ESLint, Prettier et les alias d’import.
- Ajouter les scripts de développement, de vérification et de build.
- Créer les environnements local, test et production. Critères d’acceptation
- L’application démarre sur un appareil Android et un simulateur iOS.
- Le typage TypeScript et le lint passent sans erreur.
- Les variables de configuration ne sont pas codées en dur. Tests
- Démarrage à froid et redémarrage.
- Vérification des scripts CI et du build de développement.

### ATL-002 — Construire le design system

P0

Estimation : 1 à 2 jours · Dépendance : ATL-001

Travail

- Définir les couleurs, typographies, espacements, rayons et ombres.
- Créer les composants `Button`, `Card`, `Badge`, `ProgressBar`, `Chip`, `Modal` et `Screen`.
- Définir les états loading, disabled, error et empty. Critères d’acceptation
- Les cinq écrans partagent les mêmes règles visuelles.
- Les composants gèrent les zones de sécurité du téléphone et les tailles de texte.
- Les boutons et éléments interactifs ont un état visuel clair. Tests
- Catalogue de composants ou écran de démonstration.
- Contrôle sur petits et grands écrans.
- Vérification des contrastes et de la lisibilité.

### ATL-003 — Mettre en place Supabase

P0

Estimation : 1 à 2 jours · Dépendance : ATL-001

Travail

- Créer le projet Supabase et les configurations d’environnement.
- Ajouter les migrations SQL versionnées.
- Configurer le client Supabase et la gestion des erreurs réseau.
- Définir les politiques RLS sur les tables privées. Critères d’acceptation
- Le client se connecte à l’environnement prévu.
- Aucune clé `service_role` ne se retrouve dans l’application.
- Les migrations peuvent être rejouées sur une base vierge. Tests
- Connexion et lecture d’une donnée publique.
- Vérification des migrations depuis zéro.
- Test qu’un utilisateur anonyme ne peut pas lire les données privées.

### ATL-004 — Navigation et structure des écrans

P0

Estimation : 0,5 à 1 jour · Dépendance : ATL-001, ATL-002

Travail

- Créer les cinq routes principales : Accueil, Collection, Paquets, Carte et Profil/Progression.
- Prévoir la navigation vers une fiche carte et une fiche pays.
- Définir les états de navigation et le retour système. Critères d’acceptation
- Aucun écran principal n’est inaccessible.
- Le retour arrière fonctionne sans perdre une ouverture de paquet en cours.
- Les écrans conservent un état cohérent après navigation. Tests
- Parcours complet entre les onglets.
- Liens profonds vers une fiche carte si prévus dans le MVP.

### Phase B — Données et moteur de collection

C’est la phase la plus importante techniquement. Le client mobile ne doit jamais décider seul des cartes obtenues, de leur rareté ou du solde de monnaie. Ces opérations doivent être validées côté serveur.

### ATL-005 — Modéliser les données du jeu

P0

Estimation : 1 à 2 jours · Dépendance : ATL-003

Travail

- Définir les tables des pays, cartes, raretés, paquets et règles de récompenses.
- Définir les cartes possédées, paquets disponibles, expéditions et progression.
- Ajouter des identifiants stables, dates de création et contraintes d’intégrité. Critères d’acceptation
- Le catalogue de cartes est distinct des exemplaires détenus par chaque joueur.
- Un doublon est représenté sans créer de nouvelle définition de carte.
- Les contraintes empêchent les quantités ou soldes invalides. Tests
- Migrations sur une base vierge.
- Tests des contraintes d’unicité, des clés étrangères et des valeurs interdites.

### ATL-006 — Créer le catalogue de contenu

P1

Estimation : 1 à 3 jours pour le socle · Dépendance : ATL-005

Travail

- Préparer un premier lot de pays et de cartes suffisamment varié pour la bêta.
- Ajouter nom, pays, région, catégorie, rareté, description, faits culturels et références d’illustrations.
- Héberger les images dans Supabase Storage ou un stockage adapté, avec des chemins stables. Critères d’acceptation
- Chaque carte publiée dispose des champs obligatoires.
- Les contenus affichés sont vérifiés et correctement associés à leur pays.
- Les images manquantes disposent d’un fallback propre. Tests
- Validation automatique du catalogue.
- Détection des doublons d’identifiants, champs vides et références d’images invalides.

### ATL-007 — Authentification et profil joueur

P1

Estimation : 1 à 2 jours · Dépendance : ATL-003, ATL-005

Travail

- Implémenter inscription, connexion, déconnexion et réinitialisation du mot de passe si connexion par e-mail retenue.
- Créer le profil joueur à l’inscription.
- Prévoir un pseudo unique et un identifiant public distinct de l’identifiant interne. Critères d’acceptation
- Un utilisateur peut créer son compte et retrouver sa session.
- Le profil est créé une seule fois.
- Un utilisateur ne peut ni modifier ni consulter les données privées d’un autre. Tests
- Inscription, connexion, session expirée et déconnexion.
- Tentatives de lecture et de modification du profil d’un autre joueur.

### ATL-008 — Initialiser la progression du joueur

P1

Estimation : 0,5 à 1 jour · Dépendance : ATL-005, ATL-007

Travail

- Créer la progression initiale, les premières ressources et le premier paquet.
- Définir la logique de reprise après une inscription interrompue. Critères d’acceptation
- Chaque compte reçoit une initialisation unique.
- Une répétition de la requête ne distribue pas une seconde fois les ressources de départ. Tests
- Appels simultanés et répétés à l’initialisation.
- Reconnexion après interruption du premier lancement.

### Phase C — Le cœur du jeu : ouvrir, collectionner, découvrir

### ATL-009 — Développer le moteur de tirage

P1

Estimation : 2 à 3 jours · Dépendance : ATL-005, ATL-006

Travail

- Implémenter la sélection des cartes côté serveur.
- Définir les probabilités par type de paquet et rareté.
- Prévoir les règles de doublons et les exclusions éventuelles.
- Versionner les règles de tirage pour garantir leur traçabilité. Critères d’acceptation
- Le client ne choisit jamais le résultat d’un tirage.
- Les probabilités annoncées correspondent aux règles actives.
- Un résultat peut être relié à la version des règles qui l’a produit. Tests
- Tests unitaires des probabilités, exclusions et cas limites.
- Simulation d’un grand nombre de tirages pour détecter une anomalie statistique.
- Vérification qu’une carte indisponible ne peut pas être tirée.

### ATL-010 — Ouvrir un paquet de manière atomique

P1

Estimation : 2 à 3 jours · Dépendance : ATL-008, ATL-009

Travail

- Créer une fonction serveur transactionnelle qui consomme un paquet et attribue ses cartes.
- Enregistrer le résultat dans un historique d’ouverture.
- Prévoir une clé d’idempotence pour éviter les doubles ouvertures en cas de double clic ou de reconnexion. Critères d’acceptation
- Un paquet ne peut pas être consommé deux fois.
- Une ouverture réussie attribue toutes les cartes prévues, sans résultat partiel.
- Si le réseau coupe après validation serveur, le joueur retrouve le même résultat en réessayant. Tests
- Deux requêtes concurrentes sur le même paquet.
- Coupure réseau avant et après validation.
- Répétition de la même clé d’idempotence.

### ATL-011 — Créer l’écran d’ouverture

P1

Estimation : 1 à 2 jours · Dépendance : ATL-002, ATL-010

Travail

- Concevoir le paquet fermé, l’animation d’ouverture et la révélation progressive des cartes.
- Prévoir le bouton de révélation, le récapitulatif et l’action pour continuer.
- Afficher une animation réduite si les préférences du téléphone l’exigent. Critères d’acceptation
- L’animation ne déclenche jamais elle-même un tirage supplémentaire.
- Le résultat serveur reste affiché même si l’animation est interrompue.
- L’ouverture est compréhensible sans animation. Tests
- Ouverture avec paquet disponible et sans paquet disponible.
- Passage en arrière-plan pendant l’animation.
- Réouverture de l’écran après un résultat déjà enregistré.

### ATL-012 — Construire la collection

P1

Estimation : 1 à 2 jours · Dépendance : ATL-005, ATL-010

Travail

- Afficher les cartes possédées dans une grille.
- Ajouter filtres par région, rareté, catégorie et cartes manquantes.
- Afficher le nombre d’exemplaires et la progression globale. Critères d’acceptation
- La collection reflète exactement les données serveur.
- Les filtres peuvent être combinés et réinitialisés.
- Les états vide, chargement et erreur sont traités. Tests
- Collection vide, collection volumineuse et filtres combinés.
- Actualisation après ouverture d’un paquet.
- Vérification de l’absence de doublons d’affichage inattendus.

### ATL-013 — Développer la fiche carte

P1

Estimation : 1 jour · Dépendance : ATL-006, ATL-012

Travail

- Afficher l’illustration, le pays, la région, la rareté, les informations et le fait culturel.
- Distinguer les cartes possédées de celles encore à découvrir.
- Ajouter les liens vers le pays et les autres cartes associées. Critères d’acceptation
- Une carte non possédée ne révèle pas les informations que le jeu souhaite garder secrètes.
- Les données sont accessibles et lisibles sur un écran mobile. Tests
- Carte possédée, carte inconnue, image absente et données incomplètes.

### Phase D — Carte du monde et exploration

### ATL-014 — Intégrer la carte du monde

P1

Estimation : 2 à 4 jours · Dépendance : ATL-002, ATL-006

Travail

- Intégrer une carte 2D légère, adaptée au tactile.
- Permettre zoom, déplacement et sélection des pays disponibles.
- Afficher la progression des régions explorées. Critères d’acceptation
- La carte reste utilisable sur un téléphone de gamme moyenne.
- Les interactions tactiles ne bloquent pas le défilement des panneaux associés.
- Les pays sélectionnés correspondent aux données géographiques chargées. Tests
- Zoom, déplacement, sélection et retour à la vue globale.
- Mesures de fluidité sur appareil réel.
- Test en mode avion avec données mises en cache, si cette fonction est prévue.

### ATL-015 — Créer les fiches pays

P1

Estimation : 1 à 2 jours · Dépendance : ATL-006, ATL-014

Travail

- Afficher capitale, région, cartes associées et contenu culturel.
- Indiquer les cartes possédées et celles restant à découvrir.
- Relier chaque pays à une expédition lorsqu’elle est disponible. Critères d’acceptation
- Un pays sélectionné depuis la carte ouvre sa bonne fiche.
- Les informations ne se contredisent pas avec celles des cartes. Tests
- Pays sans carte, pays avec collection complète et contenu manquant.

### ATL-016 — Implémenter les expéditions

P1

Estimation : 2 à 3 jours · Dépendance : ATL-008, ATL-014, ATL-015

Travail

- Définir les expéditions, leurs conditions, étapes, durée et récompenses.
- Ajouter le démarrage, la progression, la finalisation et la récupération des récompenses.
- Vérifier toutes les transitions côté serveur. Critères d’acceptation
- Une expédition ne peut pas être finalisée deux fois.
- Les prérequis et les récompenses sont validés côté serveur.
- Les changements d’heure du téléphone ne permettent pas de contourner les durées. Tests
- Prérequis absents, progression normale, expiration et double récupération.
- Requêtes concurrentes de finalisation.

### Phase E — Progression et vie quotidienne

### ATL-017 — Concevoir l’accueil

P1

Estimation : 1 à 2 jours · Dépendance : ATL-011, ATL-012, ATL-016

Travail

- Présenter une progression de collection, le prochain objectif et les actions principales.
- Afficher les paquets disponibles et une expédition en cours.
- Éviter la surcharge de notifications, compteurs et panneaux. Critères d’acceptation
- L’utilisateur comprend en quelques secondes quoi faire ensuite.
- L’accueil reste utile même lorsqu’aucune expédition ou aucun paquet n’est disponible. Tests
- Nouveau joueur, joueur actif et joueur ayant terminé les objectifs disponibles.

### ATL-018 — Ajouter les récompenses quotidiennes

P2

Estimation : 1 à 2 jours · Dépendance : ATL-008, ATL-010

Travail

- Définir une récompense journalière simple et des objectifs facultatifs.
- Déterminer les règles de date et de fuseau horaire côté serveur.
- Éviter les séries punitives et les pertes de progression. Critères d’acceptation
- Une récompense quotidienne ne peut être attribuée qu’une fois par période.
- Un jour manqué n’efface pas la collection ni les progrès permanents. Tests
- Plusieurs demandes le même jour, changement de fuseau horaire et changement de date.

### ATL-019 — Ajouter les objectifs de découverte

P2

Estimation : 1 à 2 jours · Dépendance : ATL-012, ATL-015, ATL-016

Travail

- Définir des objectifs liés à la collection, à l’exploration et aux faits culturels consultés.
- Ajouter une progression lisible et des récompenses transparentes. Critères d’acceptation
- Les objectifs se mettent à jour à partir d’événements vérifiés.
- Une même action ne génère pas de récompenses répétées indéfiniment. Tests
- Objectif terminé, progression partielle, événement rejoué et objectif expiré si applicable.

### Phase F — Social et partage

### ATL-020 — Partager une collection ou une carte

P2

Estimation : 1 jour · Dépendance : ATL-013

Travail

- Générer un visuel partageable d’une carte ou d’un palier de collection.
- Utiliser le partage natif du téléphone. Critères d’acceptation
- Le partage fonctionne sans obliger le destinataire à installer Atlas.
- Aucun identifiant privé ni donnée sensible n’est inclus dans le visuel. Tests
- Partage vers plusieurs applications et annulation du partage.

### ATL-021 — Défis entre amis

P2

Estimation : 2 à 4 jours · Dépendance : ATL-007, ATL-012, ATL-019

Travail

- Créer des défis simples : collectionner une région, trouver certaines cartes ou compléter une sélection.
- Permettre une invitation par lien et une comparaison de progression.
- Prévoir les paramètres de visibilité et la suppression d’un lien de défi. Critères d’acceptation
- Les liens invalides ou expirés sont refusés.
- Seules les informations autorisées sont exposées.
- La progression affichée provient du serveur. Tests
- Invitation valide, invitation révoquée, joueur absent et accès non autorisé.

### ATL-022 — Échanges de cartes, si retenus

P3

Estimation : 3 à 6 jours ou davantage · Dépendance : ATL-012, ATL-021

Travail

- Définir les propositions d’échange, l’acceptation et l’annulation.
- Transférer les exemplaires de façon transactionnelle. Critères d’acceptation
- Un même exemplaire ne peut être échangé deux fois.
- Les deux côtés de l’échange sont validés et enregistrés atomiquement. Tests
- Échanges concurrents, annulation, refus, déconnexion et double acceptation.

Recommandation : ne pas intégrer les échanges de cartes dans le premier MVP. Ils augmentent fortement la complexité des règles, la prévention des abus et le support utilisateur.

### Phase G — Qualité, sécurité et lancement

### ATL-023 — Profil, paramètres et suppression de compte

P1

Estimation : 1 à 2 jours · Dépendance : ATL-007

Critères d’acceptation

- Le joueur peut consulter et modifier les informations de profil autorisées.
- La déconnexion invalide la session locale.
- La suppression de compte déclenche un processus serveur sécurisé et documenté, avec traitement des données associées. Tests
- Modification du profil, session expirée et suppression confirmée.
- Vérification des données conservées ou supprimées conformément à la politique définie.

### ATL-024 — Observabilité et gestion des erreurs

P1

Estimation : 1 jour · Dépendance : ATL-001, ATL-003

Critères d’acceptation

- Les erreurs importantes sont remontées sans enregistrer de secrets ou de données personnelles inutiles.
- Les erreurs réseau affichent un message compréhensible et une action de reprise.
- Les opérations sensibles possèdent un identifiant de corrélation ou un historique serveur. Tests
- Réseau indisponible, délai dépassé, réponse serveur invalide et session expirée.

### ATL-025 — Tests de sécurité Supabase

P1

Estimation : 1 à 3 jours · Dépendance : ATL-003, ATL-005 à ATL-010

Critères d’acceptation

- Les tables privées sont protégées par RLS.
- Les fonctions serveur vérifient l’identité et les droits de l’appelant.
- Les clients ne peuvent pas modifier directement les résultats de tirage, les récompenses ou les soldes.
- Les secrets restent côté serveur. Tests
- Tests automatisés RLS avec deux utilisateurs distincts.
- Appels malveillants simulés sur les fonctions sensibles.
- Vérification des permissions Storage et des fonctions RPC.

### ATL-026 — Performance et accessibilité

P1

Estimation : 1 à 3 jours · Dépendance : écrans principaux terminés

Critères d’acceptation

- Les listes longues sont paginées ou virtualisées.
- Les images sont redimensionnées et mises en cache.
- Les zones tactiles sont suffisamment grandes et les textes restent lisibles.
- Les animations peuvent être réduites. Tests
- Téléphone de gamme moyenne, connexion lente, collection volumineuse et changement de taille de texte.

### ATL-027 — Préparer la bêta et la publication

P1

Estimation : 2 à 4 jours · Dépendance : ATL-023 à ATL-026

Travail

- Préparer les builds de test, les fiches de publication, la politique de confidentialité et les conditions d’utilisation.
- Ajouter les mécanismes de remontée de bugs et les indicateurs de stabilité.
- Définir une procédure de retour arrière pour les changements serveur risqués. Critères d’acceptation
- Un nouvel utilisateur peut s’inscrire, ouvrir un paquet et retrouver ses cartes.
- Les scénarios critiques passent sur appareils réels.
- Les données de démonstration ne sont pas mélangées avec les données de production. Tests
- Parcours complet sur Android et iOS.
- Installation propre, mise à jour, reprise après coupure réseau et suppression de compte.

## 4. Ordre de développement recommandé

Voici l’ordre concret pour éviter de développer des écrans qui dépendent de fonctionnalités encore inexistantes.

## Parcours de développement

1. Lot 1 — Application fonctionnelle

   ATL-001 à ATL-004

   L’application démarre, le design system existe et la navigation est opérationnelle.
2. Lot 2 — Données et comptes

   ATL-005 à ATL-008

   Le catalogue est chargé, les comptes sont sécurisés et chaque joueur possède une progression initiale.
3. Lot 3 — Première boucle jouable

   ATL-009 à ATL-013

   Le joueur ouvre un paquet, reçoit ses cartes et les retrouve dans sa collection. C’est le premier jalon majeur.
4. Lot 4 — Exploration

   ATL-014 à ATL-016

   La carte, les fiches pays et les expéditions donnent du sens à la collection.
5. Lot 5 — Accueil et retour dans le jeu

   ATL-017 à ATL-019

   L’accueil devient utile et la progression quotidienne donne des objectifs facultatifs.
6. Lot 6 — Partage et social

   ATL-020 à ATL-022

   On ajoute d’abord le partage de cartes, puis les défis. Les échanges restent optionnels.
7. Lot 7 — Bêta et lancement

   ATL-023 à ATL-027

   On vérifie la sécurité, la stabilité, la conformité et l’expérience sur de vrais téléphones.

### Comment découper les premières semaines

Pour un développeur solo, je partirais sur des cycles de travail d’une semaine, avec des jalons plutôt qu’un calendrier rigide. Le contenu éditorial et les illustrations peuvent avancer en parallèle.

| Cycle indicatif | Résultat à obtenir                                      |
| --------------- | ------------------------------------------------------- |
| Semaine 1       | Projet, navigation, design system, Supabase             |
| Semaine 2       | Schéma SQL, catalogue initial, authentification         |
| Semaine 3       | Moteur de tirage et ouverture transactionnelle          |
| Semaine 4       | Animation d’ouverture, collection et fiche carte        |
| Semaine 5       | Carte du monde et fiches pays                           |
| Semaine 6       | Expéditions et accueil                                  |
| Semaine 7       | Progression quotidienne, correction des bugs            |
| Semaine 8+      | Tests élargis, social minimal et préparation de la bêta |

Ces durées sont indicatives : il est préférable de décaler une semaine plutôt que de sacrifier la sécurité du moteur de jeu ou la qualité de l’expérience principale.

## 5. Stratégie de tests

L’objectif n’est pas seulement de vérifier que les écrans s’affichent. Il faut vérifier que le jeu reste cohérent lorsque le réseau coupe, que l’utilisateur clique deux fois ou que plusieurs requêtes arrivent simultanément.

Niveau 1 — Tests unitaires

Tester les règles isolément : calcul de progression, filtres, validation des prérequis, sélection de cartes, dates et récompenses. Les fonctions métier ne doivent pas dépendre directement de React Native.

Niveau 2 — Tests d’intégration

Tester les migrations SQL, les fonctions serveur, les transactions, les politiques RLS et le comportement avec deux comptes distincts.

Niveau 3 — Tests d’interface

Vérifier les écrans, les états vides, les erreurs, les animations interrompues, le retour arrière et les différentes tailles d’écran.

Niveau 4 — Tests de parcours complet

Simuler un joueur qui s’inscrit, ouvre son premier paquet, consulte une carte, démarre une expédition, revient plus tard et retrouve toute sa progression.

### Les scénarios critiques à automatiser

| Scénario                                         | Résultat obligatoire                           |
| ------------------------------------------------ | ---------------------------------------------- |
| Deux ouvertures simultanées du même paquet       | Une seule ouverture est attribuée              |
| Requête répétée après une coupure réseau         | Même résultat, aucune double récompense        |
| Un joueur tente de lire la collection d’un autre | Accès refusé                                   |
| Un joueur modifie son solde depuis le client     | Modification refusée                           |
| Une expédition est finalisée deux fois           | Une seule récompense                           |
| Une image de carte ne charge pas                 | Interface utilisable avec fallback             |
| Session expirée pendant une action               | Message clair et reprise sécurisée             |
| Migration sur une base vierge                    | Schéma complet et cohérent                     |
| Collection sans aucune carte                     | État vide avec une action compréhensible       |
| Animations désactivées                           | Toutes les fonctionnalités restent utilisables |

Pour les tests de sécurité, il faut tester les politiques RLS réellement appliquées dans Supabase, et pas seulement les fonctions JavaScript qui appellent l’API.

## 6. Stack technique et outils de développement

Je conserverais cette stack pour le MVP d’Atlas :

| Besoin               | Technologie                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| Application mobile   | Expo + React Native + TypeScript                                                  |
| Navigation           | Expo Router                                                                       |
| Animations et gestes | Reanimated + Gesture Handler                                                      |
| Données serveur      | Supabase + PostgreSQL                                                             |
| Authentification     | Supabase Auth                                                                     |
| Sécurité des données | RLS + fonctions serveur/RPC                                                       |
| Images               | Supabase Storage et cache local                                                   |
| Tests métier         | Vitest ou Jest                                                                    |
| Tests UI et parcours | React Native Testing Library, puis Maestro pour les parcours natifs               |
| Qualité du code      | ESLint, Prettier, TypeScript strict                                               |
| CI                   | GitHub Actions ou GitLab CI                                                       |
| Suivi des erreurs    | Sentry ou solution équivalente, après vérification des besoins de confidentialité |

Point important : les règles de tirage, la distribution des récompenses et les opérations sur l’inventaire doivent être contrôlées côté serveur. Une fonction transactionnelle PostgreSQL est particulièrement adaptée aux ouvertures de paquets et aux récompenses. Les Edge Functions sont utiles pour les opérations qui nécessitent une orchestration supplémentaire.

## 7. Critères de sortie du MVP

Le MVP ne doit pas être considéré comme terminé simplement parce que les cinq écrans sont présents.

## Checklist de validation

### 0/8

Le joueur peut s'inscrire et se reconnecter

La session et la progression persistent entre deux lancements.

Le catalogue de cartes est exploitable

Les cartes ont des identifiants stables, des données vérifiées et des illustrations.

Le paquet fonctionne de bout en bout

Une ouverture attribue des cartes une seule fois, même en cas de double requête.

La collection est cohérente

Les cartes obtenues sont immédiatement retrouvables et les doublons sont gérés.

L'exploration a un intérêt

La carte permet de découvrir des pays et de lancer au moins une expédition.

La progression est sauvegardée

Les récompenses et étapes sont persistantes et validées côté serveur.

La sécurité est testée

Les tests RLS et les tentatives d'accès croisé entre joueurs passent.

La bêta est exploitable

Les erreurs sont observables et les parcours critiques fonctionnent sur appareils réels.

## 8. Ce que je repousserais volontairement

Pour conserver un projet réaliste à développer seul, je ne lancerais pas immédiatement :

- les échanges libres entre joueurs ;
- les classements compétitifs mondiaux ;
- les notifications poussées quotidiennes ;
- les événements temporaires complexes ;
- une boutique avec plusieurs monnaies ;
- un système d’achat aléatoire de cartes payant ;
- les fonctionnalités communautaires de type réseau social ;
- un globe 3D coûteux à optimiser.

L’abonnement Atlas Plus pourra venir plus tard, lorsque la valeur du jeu aura été validée. Il pourrait proposer des statistiques approfondies, des options de personnalisation et des outils de découverte supplémentaires. La collection de base doit rester plaisante sans abonnement.

## 9. Format recommandé pour tes tickets GitHub

Pour conserver un backlog propre, utilise ce modèle pour chaque issue.

# [ATL-XXX] Titre du ticket

## Objectif

Quel résultat concret doit être obtenu ?

## Contexte

Pourquoi cette fonctionnalité est-elle nécessaire ?

## Dépendances

- Tickets requis :
- Schéma SQL / fonction serveur concernés :

## Tâches

- Développement
- Gestion des états de chargement, erreur et vide
- Gestion des cas limites
- Tests automatisés
- Documentation si nécessaire

## Critères d'acceptation

- Résultat attendu n° 1
- Résultat attendu n° 2
- Résultat attendu n° 3

## Tests

- Cas nominal :
- Cas limite :
- Cas d'erreur :
- Sécurité / concurrence :

## Définition de terminé

- Code typé et relu
- Lint et tests réussis
- Pas de secret côté client
- Comportement vérifié sur appareil réel si nécessaire
- Ticket validé selon les critères d'acceptation

## Ma recommandation finale

Commence par ATL-001 à ATL-004, puis enchaîne directement sur la modélisation des données et le moteur d’ouverture. Le premier vrai objectif n’est pas d’avoir une belle carte du monde : c’est de pouvoir effectuer ce parcours sans erreur :

Créer un compte → recevoir un paquet → l’ouvrir → découvrir ses cartes → les retrouver dans sa collection → consulter un pays → lancer une expédition → revenir et retrouver sa progression.

Quand cette boucle fonctionne, Atlas a déjà un cœur de jeu testable. Tout le reste doit renforcer ce plaisir central, pas le masquer.