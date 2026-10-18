import { rarityStyles } from '@/design-system/tokens';
import { makeCatalog, owned, ownedMap } from '@/test-utils/fixtures';

import { DEFAULT_FILTERS, filterCards, normalizeSearch } from './filters';

describe('filterCards', () => {
  const { catalog, cards } = makeCatalog();
  const map = ownedMap(
    owned(cards.frCountry.id, 2, true, '2026-01-01T00:00:00Z'),
    owned(cards.jpHeritage.id, 1, false, '2026-03-01T00:00:00Z'),
  );
  const slugs = (filters: Partial<typeof DEFAULT_FILTERS>) =>
    filterCards(catalog, map, { ...DEFAULT_FILTERS, ...filters }).map((c) => c.slug);

  it('masque les cartes archivées non possédées', () => {
    expect(slugs({})).not.toContain('ancienne');
    const withArchived = ownedMap(owned(cards.archived.id));
    expect(filterCards(catalog, withArchived, DEFAULT_FILTERS).map((c) => c.slug)).toContain('ancienne');
  });

  it('filtre par possession', () => {
    expect(slugs({ ownership: 'owned' }).sort()).toEqual(['fuji', 'pays-fr']);
    expect(slugs({ ownership: 'missing' })).not.toContain('pays-fr');
    expect(slugs({ ownership: 'new' })).toEqual(['fuji']);
    expect(slugs({ ownership: 'duplicates' })).toEqual(['pays-fr']);
  });

  it('filtre par rareté et par continent', () => {
    expect(slugs({ rarity: 'legendary' })).toEqual(['fuji']);
    expect(slugs({ continent: 'asia' }).sort()).toEqual(['fuji', 'pays-jp']);
  });

  it('ne cherche que parmi les cartes possédées, sans tenir compte des accents', () => {
    expect(slugs({ query: 'japon' })).toEqual(['fuji']);
    expect(slugs({ query: 'kenya' })).toEqual([]);
    expect(normalizeSearch('  Éthiopie ')).toBe('ethiopie');
  });

  it('trie par défaut de la plus rare à la plus commune', () => {
    const ranks = filterCards(catalog, map, DEFAULT_FILTERS).map((c) => rarityStyles[c.rarity].rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(slugs({})[0]).toBe('fuji');
  });

  it('trie aussi par pays (pays puis capitale) ou par date', () => {
    expect(slugs({ continent: 'europe', sort: 'country' })).toEqual(['pays-fr', 'capitale-fr', 'mont-saint-michel']);
    expect(slugs({ sort: 'recent', ownership: 'owned' })).toEqual(['fuji', 'pays-fr']);
  });
});
