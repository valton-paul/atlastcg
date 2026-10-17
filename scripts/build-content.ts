/**
 * Valide le contenu éditorial et génère `supabase/seed.sql`.
 *   npm run content:check   → validation seule (CI)
 *   npm run content:build   → validation + génération du seed
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { parseCatalog } from './content/catalog';
import { renderSeedSql } from './content/seed-sql';

const root = join(__dirname, '..');
const illustrationsDir = join(root, 'content', 'illustrations');

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [relative(illustrationsDir, full)];
  });
}

const countries: unknown = JSON.parse(readFileSync(join(root, 'content', 'countries.json'), 'utf8'));
const game: unknown = JSON.parse(readFileSync(join(root, 'content', 'game.json'), 'utf8'));
const result = parseCatalog(countries, game, new Set(listFiles(illustrationsDir)));

if (!result.ok) {
  console.error(`Contenu invalide (${result.issues.length} problème(s)) :`);
  for (const issue of result.issues) console.error(`  - ${issue.path} : ${issue.message}`);
  process.exit(1);
}

const { catalog } = result;
const missingIllustrations = catalog.cards.filter((c) => !c.illustrationPath).length;
console.log(
  `Contenu valide : ${catalog.countries.length} pays, ${catalog.cards.length} cartes, ` +
    `${catalog.collections.length} collections, ${catalog.expeditions.length} expéditions. ` +
    `${missingIllustrations} carte(s) utilisent l'illustration générée par défaut.`,
);

if (!process.argv.includes('--check')) {
  writeFileSync(join(root, 'supabase', 'seed.sql'), renderSeedSql(catalog));
  console.log('supabase/seed.sql généré.');
}
