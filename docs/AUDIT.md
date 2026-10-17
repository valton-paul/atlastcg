# État des lieux initial (17/10/2026)

## Contenu trouvé

| Document | État | Utilisation |
|---|---|---|
| `specifications/specifications.md` | Complet (1 800 lignes) | Référence fonctionnelle, technique et produit |
| `specifications/implementations-plan.md` | Complet | Tickets ATL-001 à ATL-027, stratégie de tests |
| `specifications/design-system.md` | **Incomplet** | Seule la « Direction artistique » est présente. Le fichier se termine par « image creation is temporarily unavailable » : les maquettes des 5 écrans annoncées en introduction n'ont jamais été produites. Les liens d'images pointent vers des ressources externes sans droits d'usage. |

Le dépôt ne contenait aucun code, aucune configuration et n'était pas un dépôt git.

## Environnement

- Node 23, npm 10, Java 21. Pas de Docker actif, pas de CLI Supabase, pas d'Android SDK ni de Xcode.
- Expo SDK 58 (React Native 0.88, React 19.3, Reanimated 4.7, Gesture Handler 3.3).
- PostgreSQL 18 exécutable localement via `embedded-postgres` : les migrations, RLS et fonctions sont testées sur un vrai serveur.
- Aucun projet Supabase ni clé fournis.

## Contradictions et manques relevés

1. **Navigation** : le cahier des charges (§12.2) impose 4 entrées (Monde, Paquets, Collection, Amis) ; le plan (ATL-004) parle de 5 routes (Accueil, Collection, Paquets, Carte, Profil) ; la mission impose un écran d'accueil. Arbitrage : voir `DECISIONS.md` D-03.
2. **Maquettes absentes** : la mise en page des écrans est conçue à partir des principes écrits (§12, §13, §14 et direction artistique).
3. **Décisions §26 non verrouillées** (taille des paquets, probabilités, doublons, compte, visibilité…) : valeurs initiales choisies, configurables côté serveur et documentées dans `DECISIONS.md`.
4. **Illustrations** : aucune illustration sous licence n'est fournie. Un visuel cartographique généré (silhouette du pays issue de Natural Earth, domaine public) sert de rendu par défaut ; le mécanisme d'import vers Supabase Storage est prêt. Voir `CONTENT.md`.
5. **Sons** : aucun fichier audio fourni ; le son n'est pas implémenté (vibrations oui, optionnelles).
6. **Exigences invérifiables ici** : tests sur appareils réels iOS/Android, mesures de fluidité, publication en boutique.
