import { makeCatalog, owned, ownedMap } from '@/test-utils/fixtures';

import {
  atlasStats,
  collectionProgress,
  collectionTier,
  continentProgress,
  countryProgress,
  rarityProgress,
} from './progress';

describe('collectionTier', () => {
  const { catalog, cards } = makeCatalog();

  it('applique les seuils 0 · 1–24 · 25–49 · 50–74 · 75–99 · 100', () => {
    expect(collectionTier({ owned: 0, total: 10 })).toBe('empty');
    expect(collectionTier({ owned: 1, total: 10 })).toBe('started');
    expect(collectionTier({ owned: 2, total: 10 })).toBe('started');
    expect(collectionTier({ owned: 3, total: 10 })).toBe('exploring');
    expect(collectionTier({ owned: 5, total: 10 })).toBe('advanced');
    expect(collectionTier({ owned: 8, total: 10 })).toBe('nearly');
    expect(collectionTier({ owned: 10, total: 10 })).toBe('complete');
  });

  it('classe selon le pourcentage de cartes uniques du catalogue', () => {
    // FR a 3 cartes publiées → 1/3 ≈ 33 % → exploring · 2/3 ≈ 66 % → advanced · 3/3 → complete
    expect(collectionTier(countryProgress(catalog, new Map(), 'FR'))).toBe('empty');
    expect(collectionTier(countryProgress(catalog, ownedMap(owned(cards.frCountry.id)), 'FR'))).toBe('exploring');
    expect(
      collectionTier(countryProgress(catalog, ownedMap(owned(cards.frCountry.id), owned(cards.frCapital.id)), 'FR')),
    ).toBe('advanced');
    expect(
      collectionTier(
        countryProgress(
          catalog,
          ownedMap(owned(cards.frCountry.id), owned(cards.frCapital.id), owned(cards.frHeritage.id)),
          'FR',
        ),
      ),
    ).toBe('complete');
  });

  it('ignore les doublons dans le calcul de progression', () => {
    const withDupes = ownedMap(owned(cards.frCountry.id, 5));
    expect(countryProgress(catalog, withDupes, 'FR')).toEqual({ owned: 1, total: 3 });
    expect(collectionTier(countryProgress(catalog, withDupes, 'FR'))).toBe('exploring');
  });

  it('un pays à une seule carte passe directement à complété', () => {
    expect(collectionTier(countryProgress(catalog, ownedMap(owned(cards.keCountry.id)), 'KE'))).toBe('complete');
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

  it('compte les cartes uniques par rareté', () => {
    const map = ownedMap(owned(cards.frCountry.id), owned(cards.jpHeritage.id));
    // Commons publiées : FR, JP, KE · legendary : Fuji
    expect(rarityProgress(catalog, map, 'common')).toEqual({ owned: 1, total: 3 });
    expect(rarityProgress(catalog, map, 'legendary')).toEqual({ owned: 1, total: 1 });
    expect(rarityProgress(catalog, map, 'mythic')).toEqual({ owned: 0, total: 0 });
  });
});
