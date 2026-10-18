# Atlas TCG

Jeu mobile de collection de cartes sur les pays, leurs capitales et leurs cultures.
Expo SDK 58 · React Native 0.88 · TypeScript strict · Expo Router · Supabase (PostgreSQL, Auth, RLS, Storage).

## Démarrer

```bash
npm ci
cp .env.example .env   # puis renseigner l'URL et la clé publishable du projet Supabase
npx expo start
```

Sans configuration Supabase, l'application démarre sur un écran expliquant quoi renseigner.

### Variables d'environnement

| Variable                                                        | Rôle                        | Embarquée dans l'app |
| --------------------------------------------------------------- | --------------------------- | -------------------- |
| `SUPABASE_URL` ou `EXPO_PUBLIC_SUPABASE_URL`                    | URL du projet               | Oui (publique)       |
| `SUPABASE_PUBLIC_KEY` ou `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable / anon      | Oui (publique)       |
| `SUPABASE_SECRET_KEY`                                           | Réservée aux outils serveur | **Jamais**           |

`app.config.ts` ne transmet que l'URL et la clé publique, et **refuse de construire** si la clé fournie est une clé secrète (`sb_secret_…` ou JWT `service_role`).

### Préparer le projet Supabase

1. Appliquer les migrations et le seed avec la CLI Supabase (installée en dépendance de développement) :
   ```bash
   npm run db:login      # ouvre le navigateur pour autoriser la CLI
   npm run db:link       # choisir le projet ; demande le mot de passe de la base
   npm run db:push:dry   # liste ce qui sera appliqué, sans rien modifier
   npm run db:push       # applique les migrations manquantes puis le seed
   ```
   La CLI mémorise les migrations déjà jouées : relancer `db:push` n'applique que les nouvelles.
2. Dans Authentification → URL Configuration, autoriser : `atlas://auth/callback`, `atlas://reset-password` (et `exp://**` en développement avec Expo Go).
3. Les illustrations se déposent dans le bucket public `card-illustrations` (créé par la migration `storage`).

## Commandes

```bash
npm run lint            # ESLint (règles Expo + React Compiler)
npm run typecheck       # tsc --noEmit
npm run format:check    # Prettier
npm run content:check   # valide content/*.json
npm run content:build   # valide et régénère supabase/seed.sql
npm test                # tests applicatifs et de contenu (Jest)
npm run test:db         # migrations, RLS et RPC sur un vrai PostgreSQL embarqué
npm run export:android  # bundle de production Android
npm run verify          # tout ce qui précède sauf l'export
```

## Organisation

```
src/app/            routes Expo Router (écrans uniquement)
src/design-system/  jetons et composants partagés
src/features/       domaines : auth, catalog, player, packs, cards, collection, world-map, expeditions, objectives, social
src/lib/            client Supabase, appels RPC validés, erreurs, préférences, journalisation
supabase/           migrations SQL, seed généré, configuration CLI
content/            contenu éditorial source (pays, cartes, paquets, objectifs)
scripts/            génération du seed, de la carte du monde, configuration publique
tests/              tests de base de données et de contenu
```

La documentation détaillée (architecture, base, sécurité, tests, décisions, état d'avancement) est dans `docs/`.
