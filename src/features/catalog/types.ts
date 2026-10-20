import { z } from 'zod';

export const rarityEnum = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);
export const categoryEnum = z.enum(['country', 'capital', 'culture', 'monument', 'geography', 'history', 'special']);
export const continentEnum = z.enum(['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania']);

export type Rarity = z.infer<typeof rarityEnum>;
export type CardCategory = z.infer<typeof categoryEnum>;
export type Continent = z.infer<typeof continentEnum>;

export const CONTINENT_LABELS: Record<Continent, string> = {
  africa: 'Afrique',
  asia: 'Asie',
  europe: 'Europe',
  north_america: 'Amérique du Nord',
  south_america: 'Amérique du Sud',
  oceania: 'Océanie',
};

export const CONTINENT_ORDER: Continent[] = ['europe', 'africa', 'asia', 'north_america', 'south_america', 'oceania'];

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  country: 'Pays',
  capital: 'Capitale',
  culture: 'Culture',
  monument: 'Monument',
  geography: 'Paysage',
  history: 'Histoire',
  special: 'Spéciale',
};

export const countrySchema = z.object({
  iso_code: z.string(),
  iso_numeric: z.string(),
  name: z.string(),
  name_with_article: z.string(),
  capital: z.string(),
  continent: continentEnum,
  region: z.string(),
});

export const cardSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  category: categoryEnum,
  rarity: rarityEnum,
  country_code: z.string().nullable(),
  illustration_path: z.string().nullable(),
  illustration_credit: z.string().nullable(),
  status: z.enum(['draft', 'review', 'published', 'archived']),
});

export const raritySchema = z.object({
  rarity: rarityEnum,
  rank: z.number(),
  label: z.string(),
  duplicate_fragments: z.number(),
  new_card_xp: z.number().optional().default(0),
  duplicate_xp: z.number().optional().default(0),
});

export const collectionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  collection_type: z.enum(['geographic', 'cultural', 'thematic']),
  continent: continentEnum.nullable(),
  position: z.number(),
  collection_cards: z.array(z.object({ card_id: z.string().uuid(), position: z.number() })),
});

export const packDefinitionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  cards_per_pack: z.number(),
  card_categories: z.array(categoryEnum).nullable(),
  continent: continentEnum.nullable(),
  configuration_version: z.number(),
  position: z.number(),
  pack_drop_rates: z.array(
    z.object({ configuration_version: z.number(), rarity: rarityEnum, probability: z.coerce.number() }),
  ),
});

export const expeditionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  country_code: z.string(),
  title: z.string(),
  summary: z.string(),
  reward_pack_id: z.string().uuid().nullable(),
  reward_pack_quantity: z.number().nullable(),
  reward_fragments: z.number(),
  reward_xp: z.number(),
  perfect_bonus_fragments: z.number(),
  perfect_bonus_xp: z.number(),
  step_xp: z.number(),
});

export type Country = z.infer<typeof countrySchema>;
export type Card = z.infer<typeof cardSchema>;
export type RarityDefinition = z.infer<typeof raritySchema>;
export type CollectionDefinition = z.infer<typeof collectionSchema>;
export type PackDefinition = z.infer<typeof packDefinitionSchema>;
export type ExpeditionDefinition = z.infer<typeof expeditionSchema>;

export type Catalog = {
  countries: Country[];
  countriesByIso: Map<string, Country>;
  cards: Card[];
  cardsById: Map<string, Card>;
  cardsBySlug: Map<string, Card>;
  rarities: RarityDefinition[];
  collections: CollectionDefinition[];
  packs: PackDefinition[];
  packsById: Map<string, PackDefinition>;
  expeditions: ExpeditionDefinition[];
  expeditionsByCountry: Map<string, ExpeditionDefinition>;
  settings: EconomySettings;
};

export type FragmentOffer = { packSlug: string; cost: number };

export type EconomySettings = {
  /** Offres de la boutique de fragments (Premium, Légendaire…). */
  fragmentOffers: FragmentOffer[];
};

export const economySettingSchema = z.object({ key: z.string(), value: z.unknown() });
