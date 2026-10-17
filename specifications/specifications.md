# CAHIER DES CHARGES FONCTIONNEL, UX/UI ET TECHNIQUE
# ATLAS — Le monde est à collectionner

**Version :** 1.0  
**Statut :** Document de référence pour la conception et le développement  
**Type de produit :** Jeu mobile de cartes à collectionner, exploration géographique et découverte culturelle  
**Modèle économique cible :** Freemium avec abonnement optionnel  
**Priorité produit :** Expérience de collection, ouverture de paquets, découverte et progression visuelle  
**Plateforme initiale :** Application mobile-first, avec possibilité de publication sur iOS et Android

---

# 1. Vision générale du projet

## 1.1. Présentation d'Atlas

Atlas est un jeu de cartes à collectionner centré sur les pays, les capitales, les cultures et les curiosités du monde.

Le joueur constitue progressivement une collection personnelle de cartes illustrées. Il obtient des paquets, les ouvre à travers une animation satisfaisante, découvre de nouvelles cartes, complète des collections et fait évoluer son atlas interactif du monde.

Chaque carte représente une découverte : un pays, une capitale, une tradition, une architecture, un monument, une particularité culturelle ou un élément emblématique d'une destination.

Le jeu doit combiner quatre piliers :

1. **La collection :** obtenir, découvrir, classer et compléter des cartes.
2. **L'ouverture de paquets :** vivre un moment de surprise, de révélation et de satisfaction visuelle.
3. **L'exploration :** découvrir des pays et faire évoluer une carte interactive du monde.
4. **La progression sociale :** comparer ses collections, envoyer des défis et explorer avec ses amis.

Atlas ne doit pas être perçu comme un simple quiz de géographie auquel on aurait ajouté des cartes. La collection est le cœur du jeu, et la connaissance donne du sens à cette collection.

## 1.2. Vision à long terme

À terme, Atlas doit devenir un univers de collection dans lequel chaque joueur possède un atlas unique, façonné par ses découvertes.

Le joueur doit pouvoir :

- Collectionner les pays du monde.
- Découvrir des capitales et des éléments culturels.
- Compléter des séries thématiques.
- Obtenir des cartes de différentes raretés.
- Ouvrir des paquets avec une animation mémorable.
- Voir les régions et les continents évoluer sur une carte interactive.
- Compléter des collections individuelles et collectives.
- Affronter ses amis lors de défis géographiques.
- Revenir régulièrement pour de nouvelles découvertes.
- Conserver durablement ses cartes et son historique.

L'objectif n'est pas de multiplier les mécaniques artificiellement. Il est de construire une expérience suffisamment satisfaisante pour que le joueur ait envie de revenir, même lorsqu'il ne cherche pas à améliorer un score.

## 1.3. Proposition de valeur

**« Ouvre, découvre, collectionne et explore le monde. »**

Cette proposition doit rester compréhensible dès les premières secondes d'utilisation.

Un nouveau joueur doit rapidement comprendre :

- Ce qu'il peut collectionner.
- Comment obtenir des paquets.
- Comment découvrir de nouvelles cartes.
- Comment compléter une collection.
- Pourquoi la carte du monde est importante.
- Ce qu'il peut accomplir lors de sa prochaine session.

## 1.4. Principes fondamentaux

Les principes suivants guident toutes les décisions de conception.

### Principe 1 — La collection avant tout

Les cartes ne sont pas des récompenses secondaires affichées après un quiz. Elles sont le produit principal.

### Principe 2 — Chaque ouverture doit être satisfaisante

L'ouverture d'un paquet doit être un moment fort : animation fluide, révélation progressive, mise en valeur des illustrations et compréhension immédiate des nouvelles acquisitions.

### Principe 3 — La découverte doit apporter une vraie valeur

Chaque carte doit apprendre quelque chose au joueur. La rareté ne remplace jamais la qualité du contenu.

### Principe 4 — Le monde doit évoluer avec le joueur

La carte interactive est un espace de progression persistant, pas un simple fond décoratif.

### Principe 5 — La collection doit rester accessible

Aucun joueur ne doit être obligé de payer pour collectionner les cartes fondamentales, participer aux défis essentiels ou conserver sa progression.

### Principe 6 — La simplicité prime sur l'accumulation

Chaque fonctionnalité doit justifier son existence par une amélioration réelle de l'expérience.

---

# 2. Positionnement et public cible

## 2.1. Public principal

Atlas s'adresse en priorité aux personnes qui apprécient :

- Les jeux de collection.
- Les jeux de cartes.
- Les jeux de découverte et d'exploration.
- La géographie et les cultures du monde.
- Les systèmes de progression visibles.
- Les jeux mobiles accessibles en quelques minutes.
- La comparaison amicale et les défis.

Le produit doit pouvoir séduire aussi bien un amateur de jeux de collection qu'une personne curieuse du monde, sans exiger un niveau préalable en géographie.

## 2.2. Public secondaire

À terme, Atlas pourrait également intéresser :

- Les amateurs de voyages.
- Les passionnés de cartes et d'atlas.
- Les familles souhaitant découvrir des pays ensemble.
- Les étudiants et les personnes souhaitant apprendre les capitales.
- Les collectionneurs numériques appréciant les séries et les raretés.

Ces publics ne doivent pas conduire à multiplier les fonctionnalités dès le lancement.

## 2.3. Positionnement concurrentiel

Atlas s'inspire des mécaniques de collection des jeux de cartes, de la progression des jeux d'exploration et de l'accessibilité des quiz géographiques.

Le produit doit se distinguer par la combinaison suivante :

- Des cartes illustrées conçues pour être collectionnées.
- Une ouverture de paquets au centre du gameplay.
- Une collection structurée par pays, continents et thèmes.
- Une carte du monde qui reflète la progression réelle du joueur.
- Une découverte culturelle intégrée à chaque carte.
- Une dimension sociale légère, centrée sur les défis et les collections.

Atlas ne cherche pas à remplacer un jeu de localisation comme GeoGuessr, un quiz scolaire ou un guide touristique.

Il cherche à devenir **un jeu de collection géographique auquel on revient pour découvrir la prochaine carte**.

---

# 3. Boucle de gameplay principale

La boucle de gameplay est la mécanique la plus importante du produit. Elle doit être définie et validée avant toute fonctionnalité secondaire.

## 3.1. Boucle principale

1. Le joueur récupère un paquet ou obtient les ressources nécessaires pour en ouvrir un.
2. Il accède à l'écran d'ouverture.
3. Il ouvre le paquet et découvre les cartes obtenues.
4. Il consulte les nouvelles cartes, leur rareté et leurs informations.
5. Les cartes sont automatiquement ajoutées à sa collection.
6. Les pays et collections associés progressent.
7. La carte interactive du monde se met à jour.
8. Le joueur consulte les collections incomplètes.
9. Il peut poursuivre une expédition, relever un défi ou quitter le jeu.
10. Lors d'une prochaine session, il retrouve sa progression et de nouvelles possibilités de découverte.

Cette boucle doit fonctionner même lorsque le joueur n'utilise ni les fonctions sociales ni les quiz.

## 3.2. Boucle secondaire de découverte

Certaines cartes peuvent être accompagnées d'une découverte interactive.

Exemple :

- Le joueur obtient une carte représentant le Japon.
- Il ouvre sa fiche et découvre Tokyo comme capitale.
- Il consulte une anecdote culturelle vérifiée.
- Il répond à une question courte.
- Il obtient une progression de découverte ou une récompense de gameplay.
- Son atlas reflète cette nouvelle connaissance.

Le quiz soutient la collection ; il ne doit pas remplacer l'ouverture des paquets.

## 3.3. Boucle de complétion

Le joueur doit toujours pouvoir répondre à trois questions :

- Quelles cartes me manquent ?
- Quelles collections puis-je terminer ?
- Quelle est la prochaine étape pour progresser ?

L'interface doit afficher ces informations sans transformer l'écran d'accueil en tableau de bord surchargé.

---

# 4. Système de cartes

## 4.1. Rôle des cartes

Une carte est l'unité fondamentale du jeu.

Chaque carte doit posséder une identité visuelle forte, un contenu éditorial vérifié et une place précise dans une ou plusieurs collections.

Une carte ne doit jamais être générée uniquement pour gonfler artificiellement le nombre d'éléments disponibles.

## 4.2. Catégories de cartes

Le catalogue initial peut comprendre les catégories suivantes :

| Catégorie | Contenu |
|---|---|
| Pays | Représentation d'un pays, drapeau, localisation et informations fondamentales |
| Capitales | Villes capitales et faits géographiques associés |
| Culture | Traditions, langues, coutumes et patrimoine culturel |
| Monuments | Édifices, sites et lieux emblématiques |
| Géographie | Reliefs, régions, paysages et particularités naturelles |
| Histoire | Événements historiques contextualisés et patrimoine |
| Collections spéciales | Cartes réunissant plusieurs destinations ou un thème précis |

Le lancement doit privilégier les pays, les capitales et la culture. Les catégories plus complexes seront introduites progressivement.

## 4.3. Informations d'une carte

Chaque carte doit pouvoir contenir les informations suivantes :

- Identifiant unique.
- Nom officiel ou nom usuel.
- Catégorie.
- Pays associé, lorsque pertinent.
- Continent et région.
- Illustration principale.
- Illustration secondaire facultative.
- Rareté.
- Texte de découverte.
- Fait intéressant.
- Sources éditoriales internes.
- Collection ou collections associées.
- Date d'ajout au catalogue.
- Statut de publication.
- Version du contenu.

Les données doivent être séparées de la présentation visuelle. Une modification de la description d'une carte ne doit pas nécessiter une modification du composant d'interface.

## 4.4. Raretés

Les raretés permettent de renforcer la sensation de collection et de varier les ouvertures de paquets.

Le système initial peut comprendre cinq niveaux :

| Rareté | Identité visuelle | Fréquence cible |
|---|---|---|
| Commune | Cadre sobre | Fréquente |
| Peu commune | Accent coloré | Assez fréquente |
| Rare | Finition plus travaillée | Occasionnelle |
| Épique | Effets visuels spécifiques | Peu fréquente |
| Légendaire | Présentation exceptionnelle | Très rare |

Les probabilités exactes ne sont pas définies arbitrairement dans le frontend. Elles doivent être configurables côté serveur, documentées et testées.

Les raretés doivent refléter une valeur de collection et une expérience visuelle, et non suggérer qu'une culture ou qu'un pays est intrinsèquement supérieur à un autre.

Une carte commune peut être extrêmement intéressante sur le plan culturel. Une carte légendaire ne doit pas nécessairement contenir une information plus importante.

## 4.5. Doublons

Les doublons font partie intégrante du système de collection, mais ne doivent pas devenir une source de frustration.

Lorsqu'un joueur obtient une carte déjà possédée :

- La carte est présentée normalement lors de l'ouverture.
- L'interface indique clairement qu'il s'agit d'un doublon.
- Le compteur de doublons est mis à jour.
- Une compensation simple peut être accordée.
- Le joueur conserve la possibilité de consulter la carte.

La compensation peut prendre la forme de fragments d'échange, d'une ressource de collection ou d'un crédit de progression.

Le système de compensation doit rester simple. Il ne faut pas créer plusieurs monnaies dont les fonctions se chevauchent.

Dans le MVP, les doublons ne doivent pas être échangeables entre joueurs tant que les risques d'abus et la complexité du système n'ont pas été évalués.

## 4.6. Collection complète

Une carte obtenue est conservée définitivement dans la collection.

Une collection peut être considérée comme terminée lorsque toutes les cartes qui la composent ont été obtenues au moins une fois.

Les cartes peuvent être consultées à tout moment, y compris hors de l'écran d'ouverture.

L'album doit afficher clairement :

- Les cartes possédées.
- Les cartes non découvertes.
- Les doublons.
- Le pourcentage de complétion.
- Les collections terminées.
- Les collections en cours.

Aucune carte déjà acquise ne doit disparaître à la suite d'une mise à jour du jeu.

---

# 5. Ouverture des paquets : fonctionnalité centrale

Cette fonctionnalité bénéficie d'une priorité de conception et de développement maximale.

Elle doit être plus travaillée que les autres écrans, car elle constitue le principal moment émotionnel du jeu.

## 5.1. Objectifs

L'ouverture doit produire quatre sensations :

1. L'anticipation.
2. La manipulation du paquet.
3. La surprise de la révélation.
4. La satisfaction de voir la carte rejoindre sa collection.

L'animation doit être agréable même lorsque le paquet contient uniquement des cartes communes.

## 5.2. Types de paquets

Le MVP peut proposer trois variantes.

### Paquet Découverte

- Paquet d'entrée du joueur.
- Contenu orienté vers les pays et les capitales.
- Obtention par la progression de départ ou les récompenses de gameplay.

### Paquet Exploration

- Paquet standard du jeu.
- Contenu provenant des collections géographiques et culturelles.
- Principal paquet obtenu en jouant.

### Paquet Thématique

- Paquet associé à un continent ou à une collection précise.
- Exemple : Asie, capitales, patrimoine culturel.
- Disponible lorsque le joueur progresse dans le jeu.

Les paquets thématiques doivent éviter de rendre les autres cartes inutiles. Ils servent principalement à orienter la collection.

## 5.3. Animation d'ouverture

L'ouverture doit être conçue comme une séquence interactive en plusieurs phases.

### Phase 1 — Présentation du paquet

Le paquet apparaît au centre de l'écran, sur un fond sombre et immersif.

Le design du paquet reprend la direction artistique d'Atlas : cartographie, lignes topographiques, motifs géographiques et détails lumineux discrets.

L'utilisateur peut toucher le paquet pour commencer.

### Phase 2 — Interaction

Une interaction tactile déclenche une animation :

- Le paquet réagit légèrement au toucher.
- Une vibration subtile peut accompagner l'action sur les appareils compatibles.
- Le paquet se soulève ou s'incline.
- Une lumière apparaît dans les interstices.
- Le son, s'il est activé, accompagne l'ouverture.

Les animations doivent être fluides et ne pas bloquer inutilement l'utilisateur.

### Phase 3 — Ouverture

Le paquet s'ouvre au centre de l'écran.

Des particules, des lignes cartographiques ou des éléments graphiques peuvent apparaître brièvement. Les effets doivent rester cohérents avec l'univers visuel et ne pas ressembler à un jeu de casino.

La durée doit être courte, avec une option permettant d'accélérer ou de passer les animations.

### Phase 4 — Révélation des cartes

Les cartes apparaissent successivement.

Chaque carte doit bénéficier :

- D'une entrée animée.
- D'un retournement ou d'une révélation progressive.
- D'une mise en valeur de son illustration.
- D'un effet visuel adapté à sa rareté.
- D'une indication claire de son nom et de sa catégorie.

Les cartes rares peuvent déclencher un effet plus spectaculaire, mais les animations ne doivent jamais laisser croire à une rareté différente de celle réellement obtenue.

### Phase 5 — Présentation de la rareté

La rareté peut modifier les effets visuels :

- Commune : apparition propre et rapide.
- Peu commune : accent lumineux léger.
- Rare : halo ou effet de profondeur.
- Épique : animation plus marquée et particules limitées.
- Légendaire : séquence dédiée, plus longue, mais toujours contrôlable.

L'intensité doit rester maîtrisée pour ne pas fatiguer le joueur.

### Phase 6 — Résumé du paquet

Après la révélation, un écran récapitulatif présente toutes les cartes obtenues.

Il doit afficher :

- Le nombre de nouvelles cartes.
- Le nombre de doublons.
- Les cartes rares obtenues.
- Les collections qui ont progressé.
- Les nouvelles découvertes disponibles.

Le joueur peut ensuite consulter une carte, accéder à sa collection ou ouvrir un autre paquet s'il en possède un.

## 5.4. Règles techniques d'ouverture

Le résultat d'un paquet doit être déterminé côté serveur.

Le client ne doit jamais pouvoir modifier les probabilités ou inventer les cartes obtenues.

Le système doit garantir :

- Une seule attribution effective par ouverture.
- L'absence de doublon d'attribution causé par une double interaction.
- La persistance des cartes obtenues.
- La récupération du résultat en cas de fermeture de l'application pendant l'animation.
- Une cohérence entre les ressources dépensées et les cartes attribuées.

L'animation peut être rejouée ou accélérée sans provoquer une seconde attribution.

Si une erreur réseau survient, le joueur doit pouvoir retrouver le résultat de l'ouverture.

## 5.5. Ce qui est interdit

- Des probabilités différentes selon la valeur dépensée sans information explicite.
- Des récompenses visuellement trompeuses.
- Des animations interminables impossibles à passer.
- Des ouvertures automatiques impossibles à contrôler.
- Des mécanismes payants de hasard au lancement.
- Des probabilités cachées.
- Des fausses notifications de rareté.
- Des doublons attribués par erreur.
- Des animations qui empêchent de consulter rapidement sa collection.

---

# 6. Paquets, récompenses et économie du jeu

## 6.1. Ressources

Le MVP doit se limiter à deux éléments :

1. Les paquets.
2. Une ressource de progression facultative, si elle est réellement nécessaire.

Il ne faut pas multiplier les monnaies, les jetons, les cristaux et les fragments dès le lancement.

## 6.2. Obtention des paquets

Les joueurs peuvent obtenir des paquets grâce à :

- La progression initiale.
- La complétion d'une expédition.
- Des objectifs de collection.
- Des récompenses de découverte.
- Des événements occasionnels, une fois le jeu stabilisé.

Les récompenses doivent être suffisamment régulières pour rendre la collection accessible, sans rendre toutes les cartes triviales à obtenir.

## 6.3. Progression gratuite

Le joueur gratuit doit pouvoir :

- Obtenir régulièrement des paquets.
- Compléter des collections.
- Découvrir les pays.
- Participer aux défis essentiels.
- Conserver toutes ses cartes.
- Continuer à progresser sans abonnement.

La progression ne doit pas être artificiellement bloquée après quelques minutes.

## 6.4. Économie et équilibrage

Les probabilités et les récompenses doivent être configurables sans nouvelle version de l'application.

Le système doit permettre de modifier :

- Les probabilités par rareté.
- Les cartes disponibles dans chaque paquet.
- Les conditions d'obtention.
- Les récompenses des expéditions.
- Les compensations des doublons.

Les modifications doivent être versionnées et auditées.

Le MVP ne nécessite pas une simulation économique sophistiquée, mais il doit éviter de coder en dur les règles essentielles dans les composants d'interface.

---

# 7. Carte interactive et évolutive du monde

## 7.1. Rôle de la carte

La carte du monde est le deuxième pilier visuel d'Atlas.

Elle matérialise les découvertes du joueur, permet d'accéder aux pays et offre une représentation durable de sa progression.

Elle ne doit pas être uniquement décorative.

## 7.2. États visuels des pays

Chaque pays peut posséder plusieurs états :

- Non découvert.
- Disponible pour une expédition.
- Expédition commencée.
- Pays partiellement exploré.
- Pays exploré.
- Collection associée terminée.

Les états doivent être différenciables sans dépendre uniquement de la couleur, afin de rester accessibles.

## 7.3. Interactions

La carte doit permettre :

- Le déplacement et le zoom.
- La sélection d'un pays.
- L'affichage de son nom.
- La consultation de sa progression.
- L'accès à ses collections.
- L'accès à une expédition.
- Le retour rapide à une vue globale.

Sur mobile, les interactions doivent être adaptées aux gestes tactiles et aux écrans de petite taille.

## 7.4. Évolution visuelle

À mesure que le joueur progresse :

- Les pays découverts deviennent plus visibles.
- Des éléments de cartographie peuvent se révéler.
- Les continents peuvent afficher leur progression.
- Les collections terminées peuvent ajouter des détails visuels.
- Les zones explorées peuvent être mises en valeur lors du retour sur la carte.

L'évolution doit rester progressive et cohérente. Il ne faut pas construire un système de décoration complexe qui ralentit le développement du jeu.

## 7.5. MVP cartographique

Pour la première version :

- Utiliser une carte 2D interactive.
- Afficher les pays et les états de progression.
- Permettre la sélection des pays.
- Afficher un panneau de détails.
- Synchroniser la progression avec la collection.
- Prévoir une présentation adaptée aux petits écrans.

Un globe 3D, des animations géographiques avancées et des transitions cinématiques complètes sont des évolutions futures, pas des prérequis.

---

# 8. Système de collections

## 8.1. Organisation

La collection doit être organisée selon plusieurs axes :

- Par pays.
- Par continent.
- Par catégorie.
- Par thème.
- Par état de complétion.

Un même élément peut appartenir à plusieurs collections, sans être dupliqué dans la base de données.

## 8.2. Collections géographiques

Exemples :

- Les pays d'Asie.
- Les capitales d'Europe.
- Les pays d'Afrique.
- Les îles du monde.
- Les pays d'Amérique du Sud.

## 8.3. Collections culturelles

Exemples :

- Traditions et fêtes.
- Architectures remarquables.
- Patrimoine historique.
- Langues et écritures.
- Grandes villes du monde.

Chaque collection doit disposer d'une identité visuelle et d'un objectif compréhensible.

## 8.4. Progression

L'interface affiche :

- Le nombre de cartes obtenues.
- Le nombre de cartes restantes.
- Le pourcentage de complétion.
- Les récompenses associées, si elles existent.
- La prochaine étape recommandée.

Les récompenses de complétion doivent être principalement visuelles ou liées au contenu : badge, thème, illustration, titre ou accès à une nouvelle série.

## 8.5. Filtres

Les filtres essentiels sont :

- Toutes les cartes.
- Nouvelles cartes.
- Cartes possédées.
- Cartes manquantes.
- Doublons.
- Par rareté.
- Par pays ou collection.

Les filtres avancés pourront être ajoutés selon les retours des utilisateurs.

---

# 9. Découverte culturelle et contenu éditorial

## 9.1. Objectif

Le contenu est ce qui donne du sens aux cartes. Il doit être court, fiable, accessible et agréable à consulter.

Le jeu ne doit pas se limiter à des drapeaux et des capitales.

## 9.2. Structure d'une découverte

Une fiche de découverte peut comprendre :

- Un titre évocateur.
- Une illustration.
- Un texte court.
- Un fait intéressant.
- Une localisation.
- Une référence éditoriale.
- Une question facultative.
- Un lien avec une collection.

## 9.3. Qualité éditoriale

Les informations doivent être vérifiées à partir de sources fiables.

Les faits historiques doivent être contextualisés. Les coutumes culturelles ne doivent pas être présentées comme universelles lorsqu'elles ne concernent qu'une région ou une partie de la population.

Les descriptions doivent éviter les stéréotypes, les généralisations et les formulations sensationnalistes.

Les données géographiques, notamment les noms de pays et les capitales, doivent être maintenues à jour.

## 9.4. Gestion du contenu

Le catalogue doit être séparé du code applicatif.

Chaque élément de contenu doit disposer d'un statut :

- Brouillon.
- En cours de vérification.
- Publié.
- Archivé.

Le système doit permettre d'ajouter ou de modifier une carte sans devoir publier une nouvelle version du frontend.

Les illustrations doivent avoir des droits d'utilisation adaptés à une exploitation commerciale.

---

# 10. Expéditions

## 10.1. Rôle

Les expéditions organisent la découverte des pays et servent de structure de progression.

Elles ne remplacent pas la collection : elles permettent d'obtenir des paquets, de débloquer des cartes et de faire avancer l'atlas.

## 10.2. Structure

Une expédition peut comporter trois étapes :

1. Situer le pays et sa capitale.
2. Découvrir un élément culturel.
3. Répondre à un défi de connaissances.

Chaque étape doit avoir un objectif clair et une récompense définie.

## 10.3. Accessibilité

Les expéditions doivent être courtes et accessibles à tous les niveaux.

Une mauvaise réponse ne doit pas bloquer définitivement la progression. Le joueur peut consulter une explication et réessayer lorsque cela est pertinent.

## 10.4. Ce qui est exclu du MVP

- Les arbres de missions complexes.
- Les expéditions multijoueurs en temps réel.
- Les systèmes de stamina ou d'énergie.
- Les déplacements géolocalisés obligatoires.
- Les événements en direct.
- Les cartes de progression entièrement animées en 3D.

---

# 11. Dimension sociale

## 11.1. Objectif

Le social doit renforcer le plaisir de collectionner, sans devenir un réseau social généraliste.

## 11.2. Fonctionnalités du MVP

- Ajouter un ami via un lien ou un identifiant.
- Consulter les statistiques de collection d'un ami.
- Comparer des collections.
- Envoyer un défi géographique.
- Répondre à un défi de manière asynchrone.
- Partager une carte obtenue.

## 11.3. Défis

Un défi peut porter sur :

- Les capitales.
- Les drapeaux.
- Les pays d'un continent.
- Les connaissances culturelles.
- Une collection thématique.

Un défi doit être rapide à lancer et facile à rejoindre.

## 11.4. Confidentialité

Les profils et collections doivent disposer de paramètres de visibilité adaptés.

L'application ne doit pas exposer automatiquement des informations personnelles ou la progression détaillée d'un utilisateur sans choix explicite.

## 11.5. Fonctionnalités sociales exclues du MVP

- Messagerie privée complète.
- Chat vocal.
- Fil d'actualité généraliste.
- Groupes publics complexes.
- Échanges libres de cartes.
- Marché entre joueurs.
- Classements mondiaux compétitifs.
- Matchmaking en temps réel.

Ces fonctions introduiraient des coûts, des risques de modération et une complexité disproportionnés pour le lancement.

---

# 12. UX — Expérience utilisateur attendue

## 12.1. Objectif UX

L'application doit être immédiatement compréhensible et donner une sensation de qualité.

Un joueur doit pouvoir ouvrir un paquet sans parcourir plusieurs menus. Il doit comprendre ce qu'il a gagné, où trouver ses cartes et comment progresser.

## 12.2. Navigation

La navigation principale doit rester limitée à quatre entrées :

1. **Monde** : carte interactive et expéditions.
2. **Paquets** : paquets disponibles et ouverture.
3. **Collection** : cartes, albums et complétion.
4. **Amis** : défis et comparaisons.

L'ouverture d'un paquet doit rester accessible depuis l'écran d'accueil dès qu'un paquet est disponible.

Le profil, les paramètres et les informations de compte peuvent être accessibles depuis une zone secondaire.

## 12.3. Hiérarchie de l'interface

L'interface doit prioriser :

1. L'action principale disponible.
2. La progression personnelle.
3. Les cartes nouvellement obtenues.
4. Les collections incomplètes.
5. Les fonctions secondaires.

Les informations importantes ne doivent pas être noyées sous les statistiques ou les éléments décoratifs.

## 12.4. Retour utilisateur

Chaque action doit produire un retour clair :

- Un paquet est obtenu.
- Une carte est découverte.
- Une collection progresse.
- Une expédition est terminée.
- Un défi est envoyé.
- Une erreur survient.

Les erreurs réseau et les chargements doivent être représentés explicitement.

Aucune action ne doit sembler réussie alors que les données n'ont pas été enregistrées.

## 12.5. Première expérience

L'onboarding doit être court.

Il doit permettre au joueur :

1. De comprendre le principe de collection.
2. D'ouvrir son premier paquet rapidement.
3. De découvrir ses premières cartes.
4. De consulter sa collection.
5. De voir sa progression sur le monde.

La création d'un compte peut être proposée au moment où la sauvegarde ou les fonctions sociales le nécessitent. Les choix définitifs concernant le mode invité et la synchronisation devront être arrêtés avant l'implémentation.

L'utilisateur ne doit pas être contraint de répondre à un long questionnaire avant de jouer.

---

# 13. UI — Direction artistique attendue

## 13.1. Identité visuelle

Atlas doit posséder une identité reconnaissable, élégante et immersive.

La direction proposée repose sur :

- Un univers cartographique contemporain.
- Des fonds sombres pour les moments d'exploration.
- Des surfaces claires ou texturées pour certaines cartes et fiches.
- Des accents dorés ou lumineux pour les raretés.
- Des illustrations de destinations au style cohérent.
- Une typographie lisible et une hiérarchie visuelle nette.

L'objectif est d'évoquer un atlas de collection haut de gamme, pas un tableau de bord administratif.

## 13.2. Couleurs

Palette indicative à tester :

| Usage | Direction |
|---|---|
| Fond principal | Bleu nuit profond |
| Surface secondaire | Bleu ardoise |
| Texte principal | Ivoire clair |
| Accent principal | Or doux |
| Accent secondaire | Turquoise ou bleu lumineux |
| Succès | Vert discret |
| Alerte | Ambre |
| Erreur | Rouge accessible et contrasté |

Les couleurs doivent être centralisées dans des variables de thème.

La rareté ne doit jamais être indiquée uniquement par la couleur : les cadres, icônes et libellés doivent aussi différencier les niveaux.

## 13.3. Cartes

Les cartes doivent être le principal objet visuel du jeu.

Elles doivent comporter :

- Une illustration forte.
- Un nom lisible.
- Une catégorie.
- Une identité de rareté.
- Une composition cohérente.
- Des marges suffisantes.
- Des effets visuels limités à ce qui renforce la lecture.

Le format, les proportions et les règles de composition doivent être définis avant la production en volume.

Les illustrations doivent être adaptées aux écrans mobiles et conserver leur lisibilité dans les grilles de collection.

## 13.4. Typographie

La typographie doit distinguer clairement :

- Les titres de destinations.
- Les noms des cartes.
- Les textes de découverte.
- Les statistiques.
- Les indications secondaires.

Les textes de découverte doivent rester lisibles sur les petits écrans. Il faut éviter les paragraphes trop longs et les polices trop fines.

## 13.5. Espacement et composants

Un système de composants cohérent doit être établi pour :

- Les boutons.
- Les cartes.
- Les badges de rareté.
- Les barres de progression.
- Les modales.
- Les panneaux de détails.
- Les états de chargement.
- Les messages d'erreur.
- Les confirmations.

L'interface doit être conçue pour le tactile, avec des zones interactives suffisamment grandes et des actions clairement séparées.

---

# 14. Animations et sensations

## 14.1. Priorité des animations

Toutes les animations ne sont pas équivalentes.

Priorité maximale :

1. Ouverture du paquet.
2. Révélation des cartes.
3. Mise en valeur d'une nouvelle carte.
4. Progression de collection.
5. Mise à jour de la carte du monde.

Les animations de navigation et de paramètres sont secondaires.

## 14.2. Principes d'animation

- Les mouvements doivent être fluides.
- Les transitions doivent renforcer la compréhension.
- Les animations doivent respecter la hiérarchie des raretés.
- Les effets ne doivent pas ralentir les interactions.
- Les animations doivent pouvoir être réduites.
- Les transitions ne doivent pas masquer une erreur.
- Les résultats doivent rester accessibles même si une animation est interrompue.

## 14.3. Performances

Le jeu doit rester fluide sur des appareils mobiles courants.

Les animations ne doivent pas nécessiter de calculs lourds à chaque image. Les illustrations doivent être optimisées, les effets réutilisés et les transitions limitées aux zones utiles.

Le chargement des images doit être anticipé lorsque cela améliore réellement l'expérience.

---

# 15. Ce que nous ne voulons absolument pas

Cette section constitue une liste de garde-fous produit. Toute fonctionnalité ou proposition UI doit être évaluée par rapport à ces règles.

## 15.1. Anti-patterns UX

Nous ne voulons pas :

- D'une interface remplie de boutons et de compteurs.
- D'un écran d'accueil ressemblant à un tableau de bord financier.
- De menus imbriqués pour ouvrir un paquet.
- D'une navigation incompréhensible.
- De textes trop longs avant la première action.
- De fenêtres promotionnelles permanentes.
- De tutoriels interminables.
- De notifications imposées.
- De fonctionnalités importantes cachées derrière plusieurs écrans.

## 15.2. Anti-patterns de gameplay

Nous ne voulons pas :

- D'un simple quiz rebaptisé jeu de collection.
- De cartes qui n'ont aucune utilité après leur obtention.
- D'un système de rareté artificiel sans valeur de collection.
- D'une progression qui oblige à se connecter à heure fixe.
- De séries de connexion qui punissent les absences.
- De ressources qui bloquent arbitrairement le jeu.
- D'un système de collection impossible à compléter sans payer.
- D'un catalogue artificiellement gonflé par des cartes répétitives.
- De classements imposés qui découragent les nouveaux joueurs.

## 15.3. Anti-patterns de monétisation

Nous ne voulons pas :

- De loot boxes payantes au lancement.
- De probabilités dissimulées.
- De mécaniques de paiement destinées à exploiter la frustration.
- De publicité plein écran après chaque action.
- De paywall empêchant l'accès à la collection de base.
- D'avantages payants écrasant les joueurs gratuits lors des défis.
- De fausses promotions ou de compteurs artificiels.
- D'abonnement difficile à résilier.

La monétisation doit améliorer ou enrichir l'expérience, pas détruire le plaisir de collectionner.

## 15.4. Anti-patterns techniques

Nous ne voulons pas :

- D'une architecture inutilement distribuée.
- De microservices pour un MVP.
- De règles de rareté uniquement exécutées dans le client.
- De clés secrètes Supabase intégrées dans le frontend.
- De requêtes répétées pour chaque carte d'une collection.
- D'animations qui déclenchent plusieurs écritures en base.
- De logique métier dupliquée entre plusieurs composants.
- D'un catalogue éditorial directement codé dans les écrans.
- D'une dépendance à une technologie 3D sans besoin validé.
- D'un backend qui nécessite une maintenance quotidienne disproportionnée.

---

# 16. Stack technique recommandée

La stack doit permettre de développer vite, de garder une architecture propre et de faire évoluer Atlas sans réécrire tout le produit.

Le choix définitif dépendra des tests de performance, des besoins natifs et de l'expérience de développement. La priorité n'est pas d'utiliser le maximum de technologies, mais d'utiliser le minimum nécessaire.

## 16.1. Frontend mobile

### Recommandation principale : Expo + React Native + TypeScript

Pour un jeu dont les moments essentiels reposent sur le tactile, les animations, les vibrations et l'ouverture de paquets, je recommande une application mobile native multiplateforme plutôt qu'une simple PWA comme cible finale.

**Technologies :**

- React Native.
- Expo.
- TypeScript en mode strict.
- Expo Router pour la navigation.
- React Native Reanimated pour les animations.
- React Native Gesture Handler pour les interactions tactiles.
- Une solution de gestion d'état légère, comme Zustand, si l'état partagé le justifie.
- TanStack Query pour les requêtes et la gestion des données distantes, si son usage est pertinent dans l'architecture retenue.

### Pourquoi ce choix ?

React Native permet de construire une expérience mobile avec un code largement partagé entre iOS et Android.

Expo réduit la complexité du développement, des tests et des builds. Reanimated et Gesture Handler permettent de concevoir les interactions tactiles et les animations nécessaires à l'ouverture des paquets.

Cette stack convient mieux à une expérience mobile immersive qu'une interface web simplement encapsulée.

### Alternative

Une PWA Nuxt reste pertinente pour un prototype de validation rapide ou une première maquette interactive. Elle ne doit toutefois pas être considérée automatiquement comme équivalente à une application mobile native pour les animations, l'intégration système et la distribution.

Il faut éviter de développer deux applications complètes en parallèle dès le début.

## 16.2. Backend et base de données

### Recommandation : Supabase

Supabase constitue le backend principal d'Atlas.

Il fournit :

- PostgreSQL.
- Authentification.
- API de données.
- Row Level Security.
- Stockage de fichiers.
- Fonctions serveur.
- Outils de migration et de gestion de schéma.

L'application ne doit pas multiplier les services backend sans besoin démontré.

### Rôle de PostgreSQL

PostgreSQL stockera notamment :

- Les profils.
- Le catalogue de cartes.
- Les collections.
- Les cartes possédées.
- Les paquets disponibles.
- Les ouvertures de paquets.
- Les récompenses.
- Les expéditions.
- Les défis.
- La progression des utilisateurs.
- Les événements nécessaires au fonctionnement du jeu.

Les données relationnelles conviennent bien aux relations entre cartes, pays, collections et utilisateurs.

### Rôle des fonctions serveur

Les opérations sensibles doivent passer par des fonctions serveur contrôlées.

Elles comprennent notamment :

- L'ouverture d'un paquet.
- Le tirage des cartes.
- L'attribution des récompenses.
- La mise à jour des ressources.
- La création et la validation des défis.
- Les opérations nécessitant une vérification de propriété.

Une Edge Function Supabase peut coordonner ces opérations. Lorsque plusieurs écritures doivent rester atomiques, une fonction PostgreSQL transactionnelle peut être appelée depuis une fonction serveur.

Le choix exact dépendra de la logique d'ouverture et des contraintes transactionnelles.

## 16.3. Sécurité

La sécurité ne doit pas être ajoutée après le développement.

Les règles essentielles :

- Activer RLS sur les tables exposées.
- Limiter chaque utilisateur à ses propres données privées.
- Contrôler les accès aux collections publiques et aux défis.
- Réserver les opérations sensibles au serveur.
- Ne jamais exposer la clé `service_role` dans le client.
- Valider les entrées côté serveur.
- Limiter les requêtes abusives sur les opérations sensibles.
- Journaliser les opérations importantes.
- Prévoir une stratégie de sauvegarde et de restauration.

Les probabilités de cartes et les résultats d'ouverture ne doivent pas être modifiables par un utilisateur via les outils de développement du navigateur ou de l'application.

## 16.4. Gestion des images

Les illustrations de cartes sont un élément central du produit et doivent être traitées comme des ressources de premier ordre.

Utiliser Supabase Storage ou un stockage compatible avec un CDN pour les fichiers du catalogue.

Les images doivent être optimisées selon leur usage :

- Vignettes de collection.
- Images détaillées des cartes.
- Illustrations d'expéditions.
- Fonds d'écran.
- Éléments de décoration.

Le chargement des vignettes doit rester rapide, et les images détaillées ne doivent être chargées que lorsqu'elles sont utiles.

Les images statiques, les illustrations et les éléments d'interface doivent être distingués des données de collection utilisateur.

## 16.5. Carte interactive

Pour le MVP, privilégier une carte 2D basée sur des données géographiques vectorielles.

Une bibliothèque cartographique adaptée à React Native peut être retenue après un prototype technique. Il faut vérifier sa compatibilité avec Expo, les interactions tactiles, le rendu des frontières et les conditions de licence des données utilisées.

La carte doit pouvoir :

- Afficher les pays.
- Gérer le zoom et le déplacement.
- Réagir à la sélection d'un pays.
- Afficher les états de progression.
- Se mettre à jour à partir des données utilisateur.

Un moteur 3D complet n'est pas nécessaire au lancement.

## 16.6. Sons et vibrations

Les sons et vibrations doivent être optionnels.

Les effets sonores peuvent accompagner :

- L'ouverture du paquet.
- La révélation d'une carte.
- Une rareté importante.
- Une collection terminée.

Le système doit respecter les préférences de l'utilisateur et les contraintes des appareils.

## 16.7. Tests

La stack de tests doit couvrir :

- Les fonctions métier.
- Les probabilités de tirage.
- L'absence de doubles attributions.
- Les permissions Supabase.
- Les parcours d'ouverture.
- Les transitions d'état.
- Les erreurs réseau.
- Les principales interactions sur appareils mobiles.

Les tests unitaires peuvent être réalisés avec Vitest ou Jest selon la stack retenue. Les tests d'interface doivent couvrir les parcours critiques, et les tests de bout en bout doivent être ajoutés sur les fonctionnalités principales.

## 16.8. Observabilité et analytics

Il faut mesurer les comportements essentiels sans collecter inutilement des données personnelles.

Les événements utiles comprennent :

- Première ouverture de paquet.
- Fin de première expédition.
- Carte obtenue.
- Collection complétée.
- Défi envoyé.
- Défi accepté.
- Retour après plusieurs jours.
- Consultation de l'offre premium.

Les événements doivent être définis avant leur implémentation.

L'outil d'analytics sera choisi après vérification de ses coûts, de sa compatibilité mobile, de ses conditions de confidentialité et des obligations applicables en matière de consentement.

---

# 17. Modèle de données indicatif

Le schéma exact sera défini par migrations, mais les entités principales doivent être identifiées dès le départ.

## 17.1. Tables de référence

### `countries`

Contient les pays du catalogue.

Champs indicatifs :

- `id`
- `iso_code`
- `name`
- `capital`
- `continent`
- `region`
- `geometry_reference`
- `created_at`
- `updated_at`

Les identifiants géographiques doivent rester stables et ne pas dépendre uniquement du nom affiché.

### `cards`

Catalogue des cartes disponibles.

- `id`
- `slug`
- `title`
- `category`
- `rarity`
- `country_id`, nullable
- `illustration_path`
- `discovery_content`
- `status`
- `content_version`
- `created_at`
- `updated_at`

### `collections`

Définitions des collections.

- `id`
- `slug`
- `title`
- `description`
- `cover_path`
- `collection_type`
- `status`

### `collection_cards`

Relation entre les collections et les cartes.

- `collection_id`
- `card_id`
- `position`

Une carte peut appartenir à plusieurs collections.

## 17.2. Tables utilisateur

### `profiles`

- `id`, lié à l'identifiant Auth Supabase.
- `display_name`
- `avatar_path`
- `created_at`
- `updated_at`

### `user_cards`

Inventaire du joueur.

- `user_id`
- `card_id`
- `quantity`
- `first_acquired_at`
- `last_acquired_at`

Une contrainte unique sur `user_id` et `card_id` permet de représenter les quantités de cartes sans créer une ligne distincte pour chaque exemplaire.

Si des échanges ou des objets individuels sont introduits plus tard, le modèle devra être adapté.

### `user_progress`

- `user_id`
- `country_id`
- `expedition_status`
- `progress_value`
- `completed_at`
- `updated_at`

Cette table représente la progression de l'utilisateur dans les expéditions et les pays.

## 17.3. Paquets et ouvertures

### `pack_definitions`

- `id`
- `slug`
- `name`
- `description`
- `status`
- `configuration_version`

### `pack_drop_rates`

- `pack_id`
- `rarity`
- `probability`
- `configuration_version`

Les probabilités doivent être validées et leur somme contrôlée pour chaque configuration.

### `user_packs`

- `id`
- `user_id`
- `pack_id`
- `status`
- `created_at`

Cette table représente les paquets disponibles ou attribués au joueur.

### `pack_openings`

- `id`
- `user_id`
- `pack_id`
- `idempotency_key`
- `status`
- `result_payload`
- `created_at`
- `completed_at`

Elle permet de conserver une trace des ouvertures et de récupérer leur résultat en cas d'interruption.

Les résultats définitifs doivent être enregistrés de manière cohérente avec l'inventaire et la consommation du paquet.

## 17.4. Tables sociales

### `friendships`

- `id`
- `requester_id`
- `recipient_id`
- `status`
- `created_at`
- `updated_at`

### `challenges`

- `id`
- `creator_id`
- `challenge_type`
- `configuration`
- `status`
- `created_at`
- `expires_at`

### `challenge_participants`

- `challenge_id`
- `user_id`
- `score`
- `completed_at`
- `result_payload`

Les résultats doivent être validés côté serveur pour limiter les manipulations.

## 17.5. Contraintes de conception

- Toutes les relations doivent avoir des clés étrangères adaptées.
- Les index doivent être définis sur les colonnes utilisées dans les requêtes fréquentes.
- Les données utilisateur doivent être protégées par RLS.
- Les opérations économiques doivent être transactionnelles.
- Les migrations doivent être versionnées.
- Les données archivées doivent rester cohérentes avec l'historique des utilisateurs.

Le modèle définitif devra être validé avant l'implémentation des ouvertures de paquets et des défis.

---

# 18. Architecture logicielle

## 18.1. Organisation du code

Le projet doit séparer clairement :

- Les composants d'interface.
- Les écrans.
- Les fonctionnalités métier.
- Les services d'accès aux données.
- Les types partagés.
- Les animations.
- Les ressources graphiques.
- Les tests.

Une organisation par fonctionnalités est recommandée :

- `features/cards`
- `features/packs`
- `features/collections`
- `features/world-map`
- `features/expeditions`
- `features/challenges`
- `features/profile`

Cette organisation facilite la maintenance et évite un dossier de composants géant.

## 18.2. Principes d'architecture

- TypeScript strict.
- Logique métier séparée de l'interface.
- Types partagés et validés.
- Fonctions d'accès aux données centralisées.
- Gestion explicite des états de chargement et d'erreur.
- Pas de logique sensible dans les composants.
- Pas de duplication des règles de progression.
- Pas d'abstraction complexe sans besoin concret.

## 18.3. Cohérence des opérations

L'ouverture d'un paquet doit suivre une procédure contrôlée :

1. Vérifier l'identité de l'utilisateur.
2. Vérifier que le paquet lui appartient.
3. Vérifier que le paquet peut être ouvert.
4. Créer ou retrouver l'opération liée à la clé d'idempotence.
5. Déterminer les cartes selon la configuration serveur.
6. Attribuer les cartes.
7. Mettre à jour les ressources et les statistiques.
8. Enregistrer le résultat définitif.
9. Renvoyer le résultat au client.
10. Afficher l'animation correspondant aux cartes réellement attribuées.

Cette procédure doit éviter qu'une interruption réseau entraîne une perte de cartes ou une double consommation du paquet.

---

# 19. Performance et qualité

## 19.1. Objectifs

Le jeu doit rester rapide sur des appareils courants.

Les objectifs à vérifier lors des tests sont :

- Démarrage rapide.
- Navigation fluide.
- Chargement progressif des images.
- Ouverture de paquets sans blocage de l'interface.
- Reprise après une interruption.
- Faible consommation mémoire.
- Comportement correct en réseau instable.

Les mesures exactes seront définies après le premier prototype sur appareils représentatifs.

## 19.2. Réseau

L'application doit gérer :

- Les erreurs temporaires.
- Les requêtes répétées.
- Les réponses tardives.
- Les sessions expirées.
- La perte de connexion.
- Les opérations dont le résultat est inconnu du client.

Les opérations critiques doivent être récupérables après une reconnexion.

## 19.3. Cache

Le catalogue et les illustrations peuvent être mis en cache pour améliorer la navigation.

Les données d'inventaire et les résultats d'ouverture nécessitent une stratégie de synchronisation claire afin d'éviter les incohérences.

Le cache ne doit jamais être considéré comme une source d'autorité pour les cartes possédées ou les récompenses.

## 19.4. Accessibilité

- Contrastes suffisants.
- Textes redimensionnables.
- Libellés accessibles pour les contrôles.
- Informations qui ne reposent pas uniquement sur la couleur.
- Réduction des animations lorsque le système le demande.
- Possibilité de couper les sons et vibrations.
- Alternatives aux gestes complexes.

---

# 20. Confidentialité et conformité

Le jeu doit appliquer les principes de minimisation des données.

Les informations nécessaires au fonctionnement doivent être distinguées des données d'analytics.

Le projet doit prévoir :

- Une politique de confidentialité.
- Des conditions d'utilisation.
- La suppression du compte et des données associées selon les obligations applicables.
- La gestion des préférences de communication.
- Une politique de conservation des données.
- La vérification des droits sur les illustrations.
- Le respect des règles applicables aux achats intégrés.
- La conformité aux obligations de protection des données personnelles.

Les règles d'âge, le consentement parental éventuel et les exigences des boutiques doivent être étudiés avant le lancement public.

---

# 21. Monétisation

## 21.1. Principe

Atlas utilise un modèle freemium.

Le jeu de base doit être suffisamment complet pour procurer une vraie expérience de collection. L'abonnement finance des contenus et services supplémentaires, et non l'accès à la mécanique fondamentale.

## 21.2. Version gratuite

- Collection de base.
- Paquets obtenus en jouant.
- Carte du monde interactive.
- Expéditions fondamentales.
- Défis entre amis.
- Consultation des cartes possédées.
- Progression conservée.

## 21.3. Version premium

Tarifs initiaux à tester :

- Environ 3,49 € par mois.
- Environ 24,99 € à 29,99 € par an.

Fonctionnalités potentielles :

- Collections culturelles approfondies.
- Expéditions supplémentaires.
- Thèmes de carte et styles visuels.
- Statistiques détaillées.
- Carnet enrichi.
- Expérience sans publicité, si des publicités sont introduites.

## 21.4. Conditions de lancement

L'abonnement ne doit être introduit qu'après avoir démontré que les utilisateurs reviennent et apprécient les contenus.

Les achats ne doivent pas permettre de contourner les défis ou d'obtenir une supériorité artificielle dans les comparaisons sociales.

---

# 22. Analytics et indicateurs de réussite

Le succès ne doit pas être mesuré uniquement au nombre de téléchargements.

## 22.1. Indicateurs d'activation

- Pourcentage de nouveaux utilisateurs qui ouvrent un premier paquet.
- Pourcentage qui consultent une carte après ouverture.
- Pourcentage qui consultent leur collection.
- Pourcentage qui terminent leur première expédition.

## 22.2. Indicateurs de rétention

- Retour à J1, J7 et J30.
- Nombre de sessions par utilisateur.
- Nombre moyen de paquets ouverts.
- Nombre de cartes consultées.
- Progression des collections.
- Taux d'abandon pendant l'ouverture.

## 22.3. Indicateurs sociaux

- Défis envoyés.
- Défis acceptés.
- Cartes partagées.
- Nouveaux utilisateurs arrivant par invitation.
- Participation récurrente aux défis.

## 22.4. Indicateurs économiques

- Conversion gratuit vers premium.
- Revenu moyen par utilisateur payant.
- Résiliations.
- Coût d'acquisition.
- Marge après coûts variables.
- Rétention des abonnés.

Les métriques doivent être interprétées avec des cohortes et des volumes suffisants. Un faible nombre de testeurs ne permet pas de tirer des conclusions solides sur la rentabilité.

---

# 23. Roadmap de développement

## Phase 0 — Validation du concept

Objectifs :

- Tester les maquettes.
- Valider le plaisir d'ouverture.
- Vérifier la compréhension des collections.
- Tester la carte interactive.
- Définir le premier catalogue.

Livrable : prototype UX validé auprès d'utilisateurs.

## Phase 1 — MVP jouable

Fonctionnalités :

- Authentification ou mode de démarrage adapté.
- Catalogue de cartes.
- Paquets.
- Ouverture animée.
- Attribution et sauvegarde des cartes.
- Album de collection.
- Carte du monde 2D.
- Expéditions de base.
- Progression utilisateur.

Livrable : jeu jouable de bout en bout.

## Phase 2 — Bêta sociale

Fonctionnalités :

- Profils.
- Ajout d'amis.
- Défis asynchrones.
- Partage de cartes.
- Statistiques de collection.
- Améliorations de performance.

Livrable : bêta fermée permettant de mesurer la rétention et le partage.

## Phase 3 — Première monétisation

Fonctionnalités :

- Offre premium.
- Gestion des abonnements.
- Contenus enrichis.
- Thèmes et personnalisation.
- Analytics commerciaux.

Livrable : première version commercialisable.

## Phase 4 — Évolutions possibles

Seulement si les données d'usage le justifient :

- Carte 3D plus immersive.
- Collections saisonnières.
- Événements géographiques.
- Échanges limités de cartes.
- Collections collaboratives.
- Nouveaux continents et thèmes.
- Mode hors ligne plus complet.
- Version web complémentaire.

---

# 24. Critères d'acceptation du MVP

Le MVP ne sera considéré comme prêt que si les scénarios suivants fonctionnent correctement.

## Parcours de collection

- Un utilisateur peut obtenir un paquet.
- Il peut l'ouvrir et voir toutes les cartes attribuées.
- Les cartes sont sauvegardées.
- La collection reflète les nouvelles acquisitions.
- Les doublons sont identifiés correctement.
- La progression est conservée après reconnexion.

## Parcours cartographique

- La carte du monde s'affiche sur mobile.
- Les pays sont sélectionnables.
- Leur progression est visible.
- Un pays sélectionné permet d'accéder à son expédition.
- Les changements de progression sont reflétés sur la carte.

## Parcours d'expédition

- Une expédition peut être commencée.
- Les étapes peuvent être terminées.
- Les questions affichent une réponse et une explication.
- Les récompenses sont attribuées correctement.
- La progression peut être reprise plus tard.

## Parcours social

- Un défi peut être créé.
- Un autre utilisateur peut y accéder.
- Le résultat est enregistré.
- Les comparaisons ne révèlent pas de données privées non autorisées.

## Parcours technique

- Les opérations sensibles sont contrôlées côté serveur.
- Les permissions RLS sont testées.
- Une ouverture répétée ne produit pas de double attribution.
- Les erreurs réseau sont récupérables.
- Les migrations et sauvegardes sont documentées.
- Les performances sont acceptables sur des appareils représentatifs.

---

# 25. Priorisation des fonctionnalités

## P0 — Indispensable au MVP

- Identité visuelle.
- Catalogue de cartes.
- Raretés.
- Paquets.
- Animation d'ouverture.
- Attribution fiable.
- Collection personnelle.
- Carte interactive 2D.
- Expéditions de base.
- Sauvegarde de progression.
- Sécurité des données.
- Gestion des erreurs.

## P1 — Après validation du MVP

- Défis entre amis.
- Partage des cartes.
- Collections thématiques plus riches.
- Statistiques détaillées.
- Notifications facultatives.
- Offre premium.
- Personnalisation visuelle.

## P2 — À étudier plus tard

- Globe 3D.
- Échanges de cartes.
- Événements temporaires.
- Collections collaboratives.
- Classements mondiaux.
- Animations géographiques avancées.
- Recommandations personnalisées complexes.

## Explicitement hors périmètre initial

- Marché de cartes entre joueurs.
- Chat complet.
- Matchmaking temps réel.
- Loot boxes payantes.
- Économie multidevise.
- Système de combat.
- Monde virtuel multijoueur.
- Génération automatique non vérifiée de toutes les cartes.

---

# 26. Décisions produit à verrouiller avant le développement

Certains paramètres nécessitent un arbitrage avant l'implémentation :

1. Le catalogue initial exact.
2. Le nombre de cartes par paquet.
3. Les probabilités de rareté.
4. Les règles de compensation des doublons.
5. Le nombre de paquets obtenus en progression.
6. La structure définitive des collections.
7. Le fonctionnement des expéditions.
8. Le choix de la bibliothèque cartographique.
9. La politique de compte et de synchronisation.
10. La stratégie d'abonnement.
11. Les règles de visibilité des profils.
12. Les conditions de publication iOS et Android.

Ces décisions doivent être documentées dans des fichiers de configuration ou des spécifications versionnées, pas dispersées dans le code.

---

# 27. Synthèse finale

Atlas doit être développé autour d'une conviction simple :

**La carte du monde donne le contexte. Les expéditions donnent la direction. Les cartes donnent envie de collectionner. L'ouverture des paquets donne le plaisir immédiat. La découverte donne du sens à l'ensemble.**

L'ouverture des paquets constitue la fonctionnalité prioritaire, tant sur le plan visuel que technique. Elle doit être satisfaisante, fiable, fluide et toujours cohérente avec les cartes réellement attribuées.

La collection doit être durable et agréable à parcourir. La carte interactive doit évoluer avec les découvertes. Les expéditions doivent alimenter le catalogue et la progression. Le social doit rester léger et facultatif.

La stack recommandée pour la cible mobile est Expo, React Native et TypeScript, avec Supabase et PostgreSQL pour les données, l'authentification et les opérations serveur. Une carte 2D et une architecture simple sont préférables à un moteur 3D ou à une infrastructure complexe dès le lancement.

Le MVP doit démontrer une boucle complète :

**Obtenir un paquet → l'ouvrir → découvrir des cartes → enrichir sa collection → faire évoluer son atlas → recommencer.**

Tout ce qui ne renforce pas cette boucle doit être reporté jusqu'à ce que les premiers utilisateurs démontrent qu'il existe un besoin réel.

La réussite d'Atlas ne dépendra pas du nombre de fonctionnalités. Elle dépendra de la qualité de cette boucle, de la cohérence de l'univers visuel, de la fiabilité du contenu et de la capacité du jeu à donner envie de découvrir une nouvelle carte demain.