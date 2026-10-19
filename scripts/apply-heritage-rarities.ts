/**
 * Applique scripts/data/heritage-rarities.json sur content/countries.json.
 *
 *   npx tsx scripts/apply-heritage-rarities.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const tiers = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'] as const;

type Rarity = (typeof tiers)[number];

function main() {
  const mapPath = join(root, 'scripts', 'data', 'heritage-rarities.json');
  const raw = JSON.parse(readFileSync(mapPath, 'utf8')) as Record<string, string[]>;
  const bySlug = new Map<string, Rarity>();
  for (const tier of tiers) {
    for (const slug of raw[tier] ?? []) {
      if (bySlug.has(slug)) throw new Error(`doublon : ${slug}`);
      bySlug.set(slug, tier);
    }
  }

  const countriesPath = join(root, 'content', 'countries.json');
  const data = JSON.parse(readFileSync(countriesPath, 'utf8')) as {
    countries: {
      name: string;
      cards: {
        heritage: { slug: string; rarity: string; title: string };
        extras?: { slug: string; rarity: string; title: string }[];
      };
    }[];
  };

  const counts: Record<Rarity, number> = {
    mythic: 0,
    legendary: 0,
    epic: 0,
    rare: 0,
    uncommon: 0,
    common: 0,
  };
  const changes: { slug: string; from: string; to: Rarity; title: string }[] = [];
  let missing = 0;

  for (const country of data.countries) {
    for (const card of [country.cards.heritage, ...(country.cards.extras ?? [])]) {
      const next = bySlug.get(card.slug);
      if (!next) {
        console.error(`Pas de rareté pour ${card.slug}`);
        missing += 1;
        continue;
      }
      if (card.rarity !== next) {
        changes.push({ slug: card.slug, from: card.rarity, to: next, title: card.title });
        card.rarity = next;
      }
      counts[next] += 1;
    }
  }

  if (missing > 0) process.exit(1);

  writeFileSync(countriesPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log('Distribution :', counts);
  console.log(`${changes.length} carte(s) modifiée(s).`);
  for (const c of changes.slice(0, 40)) {
    console.log(`  ${c.slug}: ${c.from} → ${c.to}`);
  }
  if (changes.length > 40) console.log(`  … +${changes.length - 40}`);
}

main();
