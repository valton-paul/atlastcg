/**
 * Applique scripts/data/geo-rarities.json sur content/countries.json
 * (cartes pays + capitales).
 *
 *   npm run rarities:geo
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
type Rarity = (typeof RARITIES)[number];

function main() {
  const map = JSON.parse(readFileSync(join(root, 'scripts', 'data', 'geo-rarities.json'), 'utf8')) as {
    country: Record<string, Rarity>;
    capital: Record<string, Rarity>;
  };

  const countriesPath = join(root, 'content', 'countries.json');
  const data = JSON.parse(readFileSync(countriesPath, 'utf8')) as {
    countries: {
      iso: string;
      name: string;
      capital: string;
      cards: {
        country: { rarity: string };
        capital: { rarity: string };
      };
    }[];
  };

  const counts = {
    country: Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>,
    capital: Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>,
  };
  const missingCountry: string[] = [];
  const missingCapital: string[] = [];
  let changed = 0;

  for (const c of data.countries) {
    const countryR = map.country[c.iso];
    const capitalR = map.capital[c.iso];
    if (!countryR) missingCountry.push(`${c.iso} ${c.name}`);
    if (!capitalR) missingCapital.push(`${c.iso} ${c.capital}`);

    const nextCountry = countryR ?? 'common';
    const nextCapital = capitalR ?? 'common';
    if (c.cards.country.rarity !== nextCountry) {
      c.cards.country.rarity = nextCountry;
      changed += 1;
    }
    if (c.cards.capital.rarity !== nextCapital) {
      c.cards.capital.rarity = nextCapital;
      changed += 1;
    }
    counts.country[nextCountry] += 1;
    counts.capital[nextCapital] += 1;
  }

  if (missingCountry.length || missingCapital.length) {
    console.error('ISO manquants (défaut → common) :');
    if (missingCountry.length) console.error('  pays:', missingCountry.join(', '));
    if (missingCapital.length) console.error('  capitales:', missingCapital.join(', '));
  }

  // Doublons / ISO inconnus dans le mapping
  const known = new Set(data.countries.map((c) => c.iso));
  for (const [iso] of Object.entries(map.country)) {
    if (!known.has(iso)) console.error(`ISO inconnu (country): ${iso}`);
  }
  for (const [iso] of Object.entries(map.capital)) {
    if (!known.has(iso)) console.error(`ISO inconnu (capital): ${iso}`);
  }

  writeFileSync(countriesPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log('Pays :', counts.country);
  console.log('Capitales :', counts.capital);
  console.log(`${changed} champ(s) rareté mis à jour.`);
}

main();
