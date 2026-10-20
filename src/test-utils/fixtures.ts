import { buildCatalog } from '@/features/catalog/api';
import type { Card, Catalog, Country } from '@/features/catalog/types';
import type { OwnedCard, PlayerState, UserExpedition } from '@/features/player/api';

let counter = 0;
export function uuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

export function country(iso: string, name: string, continent: Country['continent'], isoNumeric: string): Country {
  return {
    iso_code: iso,
    iso_numeric: isoNumeric,
    name,
    name_with_article: name,
    capital: `Capitale ${name}`,
    continent,
    region: 'Région',
  };
}

export function card(partial: Partial<Card> & Pick<Card, 'slug' | 'title'>): Card {
  return {
    id: uuid(),
    subtitle: null,
    category: 'monument',
    rarity: 'common',
    country_code: null,
    illustration_path: null,
    illustration_credit: null,
    status: 'published',
    ...partial,
  };
}

export type Fixture = {
  catalog: Catalog;
  cards: Record<string, Card>;
};

/** Catalogue minimal : France (Europe), Japon (Asie), Kenya (Afrique, sans expédition). */
export function makeCatalog(): Fixture {
  const countries = [
    country('FR', 'France', 'europe', '250'),
    country('JP', 'Japon', 'asia', '392'),
    country('KE', 'Kenya', 'africa', '404'),
  ];
  const cards = {
    frCountry: card({ slug: 'pays-fr', title: 'France', category: 'country', country_code: 'FR' }),
    frCapital: card({
      slug: 'capitale-fr',
      title: 'Paris',
      category: 'capital',
      country_code: 'FR',
      rarity: 'uncommon',
    }),
    frHeritage: card({ slug: 'mont-saint-michel', title: 'Mont-Saint-Michel', country_code: 'FR', rarity: 'epic' }),
    jpCountry: card({ slug: 'pays-jp', title: 'Japon', category: 'country', country_code: 'JP' }),
    jpHeritage: card({
      slug: 'fuji',
      title: 'Mont Fuji',
      category: 'geography',
      country_code: 'JP',
      rarity: 'legendary',
    }),
    keCountry: card({ slug: 'pays-ke', title: 'Kenya', category: 'country', country_code: 'KE' }),
    archived: card({ slug: 'ancienne', title: 'Ancienne carte', country_code: 'FR', status: 'archived' }),
  };
  const packId = uuid();
  const catalog = buildCatalog({
    countries,
    cards: Object.values(cards),
    rarities: [
      { rarity: 'common', rank: 1, label: 'Commune', duplicate_fragments: 5 },
      { rarity: 'uncommon', rank: 2, label: 'Peu commune', duplicate_fragments: 10 },
      { rarity: 'rare', rank: 3, label: 'Rare', duplicate_fragments: 25 },
      { rarity: 'epic', rank: 4, label: 'Épique', duplicate_fragments: 50 },
      { rarity: 'legendary', rank: 5, label: 'Légendaire', duplicate_fragments: 100 },
    ],
    collections: [
      {
        id: uuid(),
        slug: 'pays-europe',
        title: 'Pays d’Europe',
        description: 'Europe',
        collection_type: 'geographic',
        continent: 'europe',
        position: 1,
        collection_cards: [
          { card_id: cards.frCountry.id, position: 1 },
          { card_id: cards.frCapital.id, position: 2 },
        ],
      },
    ],
    packs: [
      {
        id: packId,
        slug: 'classique',
        name: 'Classique',
        description: 'Toutes les cartes',
        cards_per_pack: 5,
        card_categories: null,
        continent: null,
        configuration_version: 1,
        position: 1,
        pack_drop_rates: [
          { configuration_version: 1, rarity: 'common', probability: 0.5 },
          { configuration_version: 1, rarity: 'uncommon', probability: 0.25 },
          { configuration_version: 1, rarity: 'rare', probability: 0.15 },
          { configuration_version: 1, rarity: 'epic', probability: 0.07 },
          { configuration_version: 1, rarity: 'legendary', probability: 0.025 },
          { configuration_version: 1, rarity: 'mythic', probability: 0.005 },
        ],
      },
    ],
    expeditions: [
      {
        id: uuid(),
        slug: 'expedition-fr',
        country_code: 'FR',
        title: 'Expédition France',
        summary: 'Résumé',
        reward_pack_id: null,
        reward_pack_quantity: null,
        reward_fragments: 30,
        reward_xp: 40,
        perfect_bonus_fragments: 15,
        perfect_bonus_xp: 20,
        step_xp: 5,
      },
      {
        id: uuid(),
        slug: 'expedition-jp',
        country_code: 'JP',
        title: 'Expédition Japon',
        summary: 'Résumé',
        reward_pack_id: null,
        reward_pack_quantity: null,
        reward_fragments: 30,
        reward_xp: 40,
        perfect_bonus_fragments: 15,
        perfect_bonus_xp: 20,
        step_xp: 5,
      },
    ],
    settings: {
      fragmentOffers: [
        { packSlug: 'premium', cost: 100 },
        { packSlug: 'legendaire', cost: 280 },
      ],
    },
  });
  return { catalog, cards };
}

export function owned(cardId: string, quantity = 1, seen = true, acquired = '2026-01-01T00:00:00Z'): OwnedCard {
  return { card_id: cardId, quantity, seen_at: seen ? acquired : null, first_acquired_at: acquired };
}

export function ownedMap(...entries: OwnedCard[]): Map<string, OwnedCard> {
  return new Map(entries.map((e) => [e.card_id, e]));
}

export function expeditionState(expeditionId: string, status: UserExpedition['status']): UserExpedition {
  return {
    expedition_id: expeditionId,
    status,
    started_at: '2026-01-01T00:00:00Z',
    completed_at: status === 'completed' ? '2026-01-02T00:00:00Z' : null,
  };
}

export function playerState(partial: Partial<PlayerState> = {}): PlayerState {
  return {
    profile: {
      id: uuid(),
      display_name: 'Explora',
      public_code: 'ABCDEFGH',
      collection_visibility: 'friends',
      onboarding_completed_at: '2026-01-01T00:00:00Z',
      exploration_xp: 0,
    },
    fragments: 0,
    explorationXp: 0,
    packs: [],
    ownedCards: new Map(),
    expeditions: new Map(),
    completedSteps: new Map(),
    stepTotals: new Map(),
    ...partial,
  };
}
