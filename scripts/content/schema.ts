import { z } from 'zod';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export const CATEGORIES = ['country', 'capital', 'culture', 'monument', 'geography', 'history', 'special'] as const;
export const HERITAGE_CATEGORIES = ['culture', 'monument', 'geography', 'history'] as const;
export const CONTINENTS = ['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania'] as const;

export type Rarity = (typeof RARITIES)[number];
export type Category = (typeof CATEGORIES)[number];
export type Continent = (typeof CONTINENTS)[number];

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug invalide');
const illustrationPath = z.string().regex(/^[a-z0-9][a-z0-9/_.-]*\.(webp|png|jpg)$/, "chemin d'illustration invalide");

const cardContent = z.object({
  rarity: z.enum(RARITIES),
  discovery: text.max(240),
  fact: text.max(240),
  sources: z.array(text).min(1),
  illustration: illustrationPath.optional(),
  illustrationCredit: text.optional(),
});

const heritageCard = cardContent.extend({
  slug,
  title: text.max(80),
  subtitle: text.optional(),
  category: z.enum(HERITAGE_CATEGORIES),
});

export const countrySchema = z.object({
  iso: z.string().regex(/^[A-Z]{2}$/),
  /** `null` pour les pays employés sans article (Cuba, Malte, Singapour…). */
  article: z.enum(['le', 'la', "l'", 'les']).nullable(),
  isoNumeric: z.string().regex(/^[0-9]{3}$/),
  name: text,
  capital: text,
  continent: z.enum(CONTINENTS),
  region: text,
  cards: z.object({
    country: cardContent,
    capital: cardContent,
    /** Carte de patrimoine principale, présentée pendant l'expédition. */
    heritage: heritageCard,
    /** Cartes de patrimoine supplémentaires du pays. */
    extras: z.array(heritageCard).max(6).optional(),
  }),
  expedition: z.object({
    quiz: z.object({
      prompt: text,
      choices: z.array(text).min(2).max(4),
      answer: z.number().int().min(0),
      explanation: text,
    }),
  }),
});

export const countriesDocSchema = z.object({
  countries: z.array(countrySchema).min(1),
});

const packSchema = z.object({
  slug,
  name: text,
  description: text,
  position: z.number().int(),
  cardsPerPack: z.number().int().min(1).max(10),
  categories: z.array(z.enum(CATEGORIES)).min(1).nullable(),
  configurationVersion: z.number().int().min(1),
  dropRates: z.record(z.enum(RARITIES), z.number().gt(0).lte(1)),
});

const collectionSchema = z.object({
  slug,
  title: text,
  description: text,
  type: z.enum(['geographic', 'cultural', 'thematic']),
  rule: z.object({
    category: z.enum(CATEGORIES).optional(),
    categories: z.array(z.enum(CATEGORIES)).min(1).optional(),
    continent: z.enum(CONTINENTS).optional(),
  }),
});

const objectiveSchema = z.object({
  slug,
  title: text,
  description: text,
  kind: z.enum([
    'cards_owned',
    'countries_discovered',
    'continents_discovered',
    'expeditions_completed',
    'collection_completed',
  ]),
  target: z.number().int().min(1).optional(),
  collection: slug.optional(),
  rewardPack: slug,
  rewardQuantity: z.number().int().min(1).max(5),
});

export const gameDocSchema = z.object({
  rarities: z
    .array(
      z.object({
        rarity: z.enum(RARITIES),
        rank: z.number().int().min(1).max(RARITIES.length),
        label: text,
        duplicateFragments: z.number().int().min(0),
        /** XP d’exploration à l’obtention d’une nouvelle carte. */
        newCardXp: z.number().int().min(0),
        /** XP d’exploration quand un doublon est détruit / converti. */
        duplicateXp: z.number().int().min(0),
      }),
    )
    .length(RARITIES.length),
  packs: z.array(packSchema).min(1),
  collections: z.array(collectionSchema),
  objectives: z.array(objectiveSchema),
  expeditionReward: z.object({
    fragments: z.number().int().min(0).max(500),
    xp: z.number().int().min(0).max(500),
    perfectBonusFragments: z.number().int().min(0).max(200),
    perfectBonusXp: z.number().int().min(0).max(200),
    stepXp: z.number().int().min(0).max(50),
  }),
  settings: z.record(
    z.string().regex(/^[a-z_]+$/),
    z.object({ value: z.record(z.string(), z.unknown()), description: text }),
  ),
});

export type CountryEntry = z.infer<typeof countrySchema>;
export type CountriesDoc = z.infer<typeof countriesDocSchema>;
export type GameDoc = z.infer<typeof gameDocSchema>;
