import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseCatalog } from '../../scripts/content/catalog';
import { renderSeedSql } from '../../scripts/content/seed-sql';

const root = join(__dirname, '..', '..');
const readJson = (file: string): unknown => JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));

type CountriesDoc = { countries: Record<string, unknown>[] };
type GameDoc = { packs: { slug: string; dropRates: Record<string, number> }[] };

function load() {
  return {
    countries: structuredClone(readJson('countries.json')) as CountriesDoc,
    game: structuredClone(readJson('game.json')) as GameDoc,
  };
}

function issuesOf(countries: unknown, game: unknown) {
  const result = parseCatalog(countries, game);
  return result.ok ? [] : result.issues.map((issue) => issue.message);
}

describe('catalogue éditorial', () => {
  it('le contenu livré est valide', () => {
    const { countries, game } = load();
    const result = parseCatalog(countries, game);
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it('supabase/seed.sql correspond exactement au contenu (npm run content:build)', () => {
    const { countries, game } = load();
    const result = parseCatalog(countries, game);
    if (!result.ok) throw new Error('catalogue invalide');
    const seed = readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8');
    expect(seed).toBe(renderSeedSql(result.catalog));
  });

  it('chaque pays produit des cartes et une expédition', () => {
    const { countries, game } = load();
    const result = parseCatalog(countries, game);
    if (!result.ok) throw new Error('catalogue invalide');
    const { catalog } = result;
    expect(catalog.expeditions).toHaveLength(catalog.countries.length);
    for (const country of catalog.countries) {
      expect(catalog.cards.some((card) => card.countryCode === country.iso)).toBe(true);
    }
  });

  it('détecte un code ISO dupliqué', () => {
    const { countries, game } = load();
    countries.countries[1] = { ...countries.countries[1], iso: countries.countries[0].iso };
    expect(issuesOf(countries, game)).toEqual(expect.arrayContaining([expect.stringMatching(/code ISO dupliqué/)]));
  });

  it('refuse des probabilités dont la somme ne vaut pas 1', () => {
    const { countries, game } = load();
    game.packs[0].dropRates = { ...game.packs[0].dropRates, common: 0.6 };
    expect(issuesOf(countries, game)).toEqual(
      expect.arrayContaining([expect.stringMatching(/somme des probabilités/)]),
    );
  });

  it('refuse une illustration déclarée mais absente', () => {
    const { countries, game } = load();
    const first = countries.countries[0] as { cards: { country: Record<string, unknown> } };
    first.cards.country.illustration = 'absente.webp';
    expect(issuesOf(countries, game)).toEqual(
      expect.arrayContaining([expect.stringMatching(/fichier introuvable : content\/illustrations\/absente\.webp/)]),
    );
  });
});
