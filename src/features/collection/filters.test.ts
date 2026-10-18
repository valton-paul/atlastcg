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

  it('trie par pays (pays puis capitale), par rareté ou par date', () => {
    expect(slugs({ continent: 'europe' })).toEqual(['pays-fr', 'capitale-fr', 'mont-saint-michel']);
    expect(slugs({ sort: 'rarity' })[0]).toBe('fuji');
    expect(slugs({ sort: 'recent', ownership: 'owned' })).toEqual(['fuji', 'pays-fr']);
  });
});
