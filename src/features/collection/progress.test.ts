import { expeditionState, makeCatalog, owned, ownedMap } from '@/test-utils/fixtures';

import { atlasStats, collectionProgress, continentProgress, countryProgress, countryState } from './progress';

describe('countryState', () => {
  const { catalog, cards } = makeCatalog();
  const fr = catalog.expeditionsByCountry.get('FR')!;

  it('reste inexploré sans carte du pays', () => {
    expect(countryState(catalog, new Map(), new Map(), 'FR')).toBe('unknown');
  });

  it('devient découvert avec une seule carte', () => {
    expect(countryState(catalog, ownedMap(owned(cards.frCountry.id)), new Map(), 'FR')).toBe('discovered');
  });

  it('distingue expédition en cours, terminée et pays complété', () => {
    const some = ownedMap(owned(cards.frCountry.id));
    expect(countryState(catalog, some, new Map([[fr.id, expeditionState(fr.id, 'in_progress')]]), 'FR')).toBe(
      'exploring',
    );
    expect(countryState(catalog, some, new Map([[fr.id, expeditionState(fr.id, 'completed')]]), 'FR')).toBe('explored');
    const all = ownedMap(owned(cards.frCountry.id), owned(cards.frCapital.id), owned(cards.frHeritage.id));
    expect(countryState(catalog, all, new Map([[fr.id, expeditionState(fr.id, 'completed')]]), 'FR')).toBe('completed');
  });

  it('un pays sans expédition reste « découvert »', () => {
    expect(countryState(catalog, ownedMap(owned(cards.keCountry.id)), new Map(), 'KE')).toBe('discovered');
  });
});

describe('progressions', () => {
  const { catalog, cards } = makeCatalog();

  it('ignore les cartes archivées dans le total d’un pays', () => {
    expect(countryProgress(catalog, ownedMap(owned(cards.archived.id)), 'FR')).toEqual({ owned: 0, total: 3 });
  });

  it('calcule la progression d’un album', () => {
    const collection = catalog.collections[0];
    expect(collectionProgress(collection, ownedMap(owned(cards.frCapital.id)))).toEqual({ owned: 1, total: 2 });
  });

  it('compte les pays découverts par continent', () => {
    expect(continentProgress(catalog, ownedMap(owned(cards.jpCountry.id)), 'asia')).toEqual({ owned: 1, total: 1 });
    expect(continentProgress(catalog, ownedMap(owned(cards.jpCountry.id)), 'europe')).toEqual({ owned: 0, total: 1 });
  });

  it('agrège les statistiques du joueur', () => {
    const map = ownedMap(owned(cards.frCountry.id, 3), owned(cards.jpHeritage.id, 1, false), owned(cards.archived.id));
    const stats = atlasStats(catalog, map, new Map());
    expect(stats).toMatchObject({
      cardsOwned: 2,
      cardsTotal: 6,
      countriesDiscovered: 2,
      countriesTotal: 3,
      continentsDiscovered: 2,
      duplicates: 2,
      newCards: 1,
      expeditionsCompleted: 0,
    });
  });
});
