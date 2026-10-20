import {
  type Category,
  type Continent,
  type CountriesDoc,
  type CountryEntry,
  type GameDoc,
  type Rarity,
  RARITIES,
  countriesDocSchema,
  gameDocSchema,
} from './schema';

export interface ContentIssue {
  path: string;
  message: string;
}

export interface CatalogCountry {
  iso: string;
  isoNumeric: string;
  name: string;
  nameWithArticle: string;
  nameGenitive: string;
  capital: string;
  continent: Continent;
  region: string;
}

export interface CatalogCard {
  slug: string;
  title: string;
  subtitle: string | null;
  category: Category;
  rarity: Rarity;
  countryCode: string;
  illustrationPath: string | null;
  illustrationCredit: string | null;
  discoveryText: string;
  funFact: string;
  sources: string[];
}

export interface CatalogExpeditionStep {
  position: number;
  kind: 'locate' | 'discover' | 'quiz';
  title: string;
  prompt: string;
  body: string | null;
  choices: string[] | null;
  correctChoice: number | null;
  explanation: string;
}

export interface CatalogExpedition {
  slug: string;
  countryCode: string;
  title: string;
  summary: string;
  steps: CatalogExpeditionStep[];
}

export interface Catalog {
  game: GameDoc;
  countries: CatalogCountry[];
  cards: CatalogCard[];
  collections: { slug: string; cardSlugs: string[] }[];
  expeditions: CatalogExpedition[];
}

export const CONTINENT_LABELS: Record<Continent, string> = {
  africa: 'Afrique',
  asia: 'Asie',
  europe: 'Europe',
  north_america: 'Amérique du Nord',
  south_america: 'Amérique du Sud',
  oceania: 'Océanie',
};

export function nameWithArticle(country: Pick<CountryEntry, 'article' | 'name'>): string {
  if (country.article === null) return country.name;
  return country.article === "l'" ? `l'${country.name}` : `${country.article} ${country.name}`;
}

/** Voyelle ou h muet initial : « d'Oman », « d'Haïti », mais « de Cuba ». */
const ELISION = /^[AEIOUYÉÈÊÎÏÔÂH]/i;

export function nameGenitive(country: Pick<CountryEntry, 'article' | 'name'>): string {
  switch (country.article) {
    case null:
      return ELISION.test(country.name) ? `d'${country.name}` : `de ${country.name}`;
    case 'le':
      return `du ${country.name}`;
    case 'les':
      return `des ${country.name}`;
    case 'la':
      return `de la ${country.name}`;
    case "l'":
      return `de l'${country.name}`;
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Position stable de la bonne réponse, dérivée du code ISO (aucun hasard au build). */
function stableIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100003;
  return hash % modulo;
}

/** Trois capitales distractrices : même continent en priorité, ordre alphabétique stable. */
export function capitalChoices(country: CountryEntry, all: CountryEntry[]): { choices: string[]; correct: number } {
  const others = all
    .filter((c) => c.iso !== country.iso && c.capital !== country.capital)
    .sort((a, b) => {
      const sameA = a.continent === country.continent ? 0 : 1;
      const sameB = b.continent === country.continent ? 0 : 1;
      return sameA - sameB || a.capital.localeCompare(b.capital, 'fr');
    })
    .slice(0, 3)
    .map((c) => c.capital);
  const correct = stableIndex(country.iso, others.length + 1);
  const choices = [...others];
  choices.splice(correct, 0, country.capital);
  return { choices, correct };
}

function cardsForCountry(country: CountryEntry): CatalogCard[] {
  const iso = country.iso.toLowerCase();
  const { cards } = country;
  const heritageCards = [cards.heritage, ...(cards.extras ?? [])].map(
    (h): CatalogCard => ({
      slug: h.slug,
      title: h.title,
      subtitle: h.subtitle ?? null,
      category: h.category,
      rarity: h.rarity,
      countryCode: country.iso,
      illustrationPath: h.illustration ?? null,
      illustrationCredit: h.illustrationCredit ?? null,
      discoveryText: h.discovery,
      funFact: h.fact,
      sources: h.sources,
    }),
  );
  return [
    {
      slug: `pays-${iso}`,
      title: country.name,
      subtitle: country.region,
      category: 'country',
      rarity: cards.country.rarity,
      countryCode: country.iso,
      illustrationPath: cards.country.illustration ?? null,
      illustrationCredit: cards.country.illustrationCredit ?? null,
      discoveryText: cards.country.discovery,
      funFact: cards.country.fact,
      sources: cards.country.sources,
    },
    {
      slug: `capitale-${iso}`,
      title: country.capital,
      subtitle: `Capitale ${nameGenitive(country)}`,
      category: 'capital',
      rarity: cards.capital.rarity,
      countryCode: country.iso,
      illustrationPath: cards.capital.illustration ?? null,
      illustrationCredit: cards.capital.illustrationCredit ?? null,
      discoveryText: cards.capital.discovery,
      funFact: cards.capital.fact,
      sources: cards.capital.sources,
    },
    ...heritageCards,
  ];
}

function expeditionForCountry(country: CountryEntry, all: CountryEntry[]): CatalogExpedition {
  const withArticle = nameWithArticle(country);
  const capitals = capitalChoices(country, all);
  const heritage = country.cards.heritage;
  const quiz = country.expedition.quiz;
  return {
    slug: `expedition-${country.iso.toLowerCase()}`,
    countryCode: country.iso,
    title: `Expédition : ${country.name}`,
    summary: `Situe ${withArticle}, découvre ${heritage.title} et relève un défi de connaissances.`,
    steps: [
      {
        position: 1,
        kind: 'locate',
        title: `Situer ${withArticle}`,
        prompt: `${capitalize(withArticle)} se trouve en ${CONTINENT_LABELS[country.continent]} (${country.region}). Quelle est sa capitale ?`,
        body: null,
        choices: capitals.choices,
        correctChoice: capitals.correct,
        explanation: `${country.capital} est la capitale ${nameGenitive(country)}.`,
      },
      {
        position: 2,
        kind: 'discover',
        title: `Découvrir : ${heritage.title}`,
        prompt: 'Prends le temps de lire cette découverte, puis poursuis ton expédition.',
        body: `${heritage.discovery} ${heritage.fact}`,
        choices: null,
        correctChoice: null,
        explanation: `${heritage.title} fait désormais partie de ton carnet de route.`,
      },
      {
        position: 3,
        kind: 'quiz',
        title: 'Le défi',
        prompt: quiz.prompt,
        body: null,
        choices: quiz.choices,
        correctChoice: quiz.answer,
        explanation: quiz.explanation,
      },
    ],
  };
}

function collectionCardSlugs(
  rule: GameDoc['collections'][number]['rule'],
  cards: CatalogCard[],
  countries: Map<string, CatalogCountry>,
): string[] {
  const categories = rule.categories ?? (rule.category ? [rule.category] : null);
  return cards
    .filter((card) => !categories || categories.includes(card.category))
    .filter((card) => !rule.continent || countries.get(card.countryCode)?.continent === rule.continent)
    .map((card) => card.slug);
}

function poolForPack(pack: GameDoc['packs'][number], cards: CatalogCard[]): CatalogCard[] {
  return cards.filter((card) => !pack.categories || pack.categories.includes(card.category));
}

export type ParseResult =
  { ok: true; catalog: Catalog; issues: [] } | { ok: false; catalog: null; issues: ContentIssue[] };

/**
 * Valide les documents de contenu et construit le catalogue normalisé.
 * `illustrationFiles` liste les fichiers présents dans `content/illustrations` (chemins relatifs).
 */
export function parseCatalog(
  rawCountries: unknown,
  rawGame: unknown,
  illustrationFiles: ReadonlySet<string> = new Set(),
): ParseResult {
  const issues: ContentIssue[] = [];
  const countriesParsed = countriesDocSchema.safeParse(rawCountries);
  const gameParsed = gameDocSchema.safeParse(rawGame);

  for (const [label, parsed] of [
    ['countries', countriesParsed],
    ['game', gameParsed],
  ] as const) {
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({ path: `${label}.${issue.path.join('.')}`, message: issue.message });
      }
    }
  }
  if (!countriesParsed.success || !gameParsed.success) {
    return { ok: false, catalog: null, issues };
  }

  const doc: CountriesDoc = countriesParsed.data;
  const game: GameDoc = gameParsed.data;

  const seenIso = new Set<string>();
  const seenNumeric = new Set<string>();
  const seenCapitals = new Set<string>();
  doc.countries.forEach((country, i) => {
    const path = `countries.${i}`;
    if (seenIso.has(country.iso)) issues.push({ path, message: `code ISO dupliqué : ${country.iso}` });
    if (seenNumeric.has(country.isoNumeric))
      issues.push({ path, message: `code numérique dupliqué : ${country.isoNumeric}` });
    if (seenCapitals.has(country.capital)) issues.push({ path, message: `capitale dupliquée : ${country.capital}` });
    seenIso.add(country.iso);
    seenNumeric.add(country.isoNumeric);
    seenCapitals.add(country.capital);

    const quiz = country.expedition.quiz;
    if (quiz.answer >= quiz.choices.length)
      issues.push({ path: `${path}.expedition.quiz.answer`, message: 'réponse hors des choix' });
    if (new Set(quiz.choices).size !== quiz.choices.length)
      issues.push({ path: `${path}.expedition.quiz.choices`, message: 'choix dupliqués' });
  });

  const countries: CatalogCountry[] = doc.countries.map((c) => ({
    iso: c.iso,
    isoNumeric: c.isoNumeric,
    name: c.name,
    nameWithArticle: nameWithArticle(c),
    nameGenitive: nameGenitive(c),
    capital: c.capital,
    continent: c.continent,
    region: c.region,
  }));
  const countriesByIso = new Map(countries.map((c) => [c.iso, c]));

  const cards = doc.countries.flatMap(cardsForCountry);
  const seenSlugs = new Set<string>();
  for (const card of cards) {
    if (seenSlugs.has(card.slug)) issues.push({ path: `cards.${card.slug}`, message: 'slug de carte dupliqué' });
    seenSlugs.add(card.slug);
    if (card.illustrationPath && !illustrationFiles.has(card.illustrationPath)) {
      issues.push({
        path: `cards.${card.slug}.illustration`,
        message: `fichier introuvable : content/illustrations/${card.illustrationPath}`,
      });
    }
  }

  if (doc.countries.length < 4) {
    issues.push({ path: 'countries', message: 'au moins 4 pays sont nécessaires pour les questions' });
  }
  const expeditions = doc.countries.map((c) => expeditionForCountry(c, doc.countries));

  const rarityRanks = new Set(game.rarities.map((r) => r.rank));
  const rarityNames = new Set(game.rarities.map((r) => r.rarity));
  if (rarityRanks.size !== RARITIES.length || rarityNames.size !== RARITIES.length) {
    issues.push({ path: 'game.rarities', message: 'raretés ou rangs dupliqués' });
  }

  const packSlugs = new Set<string>();
  game.packs.forEach((pack, i) => {
    const path = `game.packs.${i}`;
    if (packSlugs.has(pack.slug)) issues.push({ path, message: `paquet dupliqué : ${pack.slug}` });
    packSlugs.add(pack.slug);
    const sum = Object.values(pack.dropRates).reduce((acc, p) => acc + (p ?? 0), 0);
    if (Math.abs(sum - 1) > 1e-9) {
      issues.push({ path: `${path}.dropRates`, message: `la somme des probabilités vaut ${sum}, attendu 1` });
    }
    const pool = poolForPack(pack, cards);
    for (const [rarity, probability] of Object.entries(pack.dropRates)) {
      if (probability && !pool.some((card) => card.rarity === rarity)) {
        issues.push({
          path: `${path}.dropRates.${rarity}`,
          message: `aucune carte « ${rarity} » éligible : la probabilité affichée serait trompeuse`,
        });
      }
    }
  });

  const collectionSlugs = new Set<string>();
  const collections = game.collections.map((collection, i) => {
    if (collectionSlugs.has(collection.slug))
      issues.push({ path: `game.collections.${i}`, message: `collection dupliquée : ${collection.slug}` });
    collectionSlugs.add(collection.slug);
    const cardSlugs = collectionCardSlugs(collection.rule, cards, countriesByIso);
    if (cardSlugs.length === 0)
      issues.push({ path: `game.collections.${i}`, message: 'la collection ne contient aucune carte' });
    return { slug: collection.slug, cardSlugs };
  });

  const objectiveSlugs = new Set<string>();
  game.objectives.forEach((objective, i) => {
    const path = `game.objectives.${i}`;
    if (objectiveSlugs.has(objective.slug)) issues.push({ path, message: `objectif dupliqué : ${objective.slug}` });
    objectiveSlugs.add(objective.slug);
    if (!packSlugs.has(objective.rewardPack))
      issues.push({ path, message: `paquet de récompense inconnu : ${objective.rewardPack}` });
    if (objective.kind === 'collection_completed') {
      if (!objective.collection || !collectionSlugs.has(objective.collection))
        issues.push({ path, message: 'collection inconnue pour un objectif de complétion' });
    } else if (!objective.target) {
      issues.push({ path, message: 'cible manquante' });
    }
  });

  for (const key of ['starter_reward', 'timed_packs']) {
    const setting = game.settings[key];
    if (!setting) {
      issues.push({ path: `game.settings.${key}`, message: 'réglage obligatoire manquant' });
      continue;
    }
    const packSlug = setting.value.pack_slug;
    if (typeof packSlug !== 'string' || !packSlugs.has(packSlug))
      issues.push({ path: `game.settings.${key}`, message: 'paquet inconnu' });
  }
  const timed = game.settings.timed_packs?.value;
  if (timed) {
    const { interval_seconds: interval, max_stored: max } = timed;
    if (typeof interval !== 'number' || !Number.isInteger(interval) || interval < 60)
      issues.push({ path: 'game.settings.timed_packs', message: 'interval_seconds doit être un entier ≥ 60' });
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 1)
      issues.push({ path: 'game.settings.timed_packs', message: 'max_stored doit être un entier ≥ 1' });
  }
  const expeditionCharges = game.settings.expedition_charges?.value;
  if (!expeditionCharges) {
    issues.push({ path: 'game.settings.expedition_charges', message: 'réglage obligatoire manquant' });
  } else {
    const { interval_seconds: interval, max_stored: max } = expeditionCharges as {
      interval_seconds?: unknown;
      max_stored?: unknown;
    };
    if (typeof interval !== 'number' || !Number.isInteger(interval) || interval < 60)
      issues.push({
        path: 'game.settings.expedition_charges',
        message: 'interval_seconds doit être un entier ≥ 60',
      });
    if (typeof max !== 'number' || !Number.isInteger(max) || max < 1)
      issues.push({ path: 'game.settings.expedition_charges', message: 'max_stored doit être un entier ≥ 1' });
  }
  const shop = game.settings.fragment_shop?.value;
  if (!shop || !Array.isArray(shop.offers) || shop.offers.length < 1) {
    issues.push({ path: 'game.settings.fragment_shop', message: 'au moins une offre est requise' });
  } else {
    for (const [i, offer] of shop.offers.entries()) {
      const path = `game.settings.fragment_shop.offers.${i}`;
      if (!offer || typeof offer !== 'object') {
        issues.push({ path, message: 'offre invalide' });
        continue;
      }
      const packSlug = (offer as { pack_slug?: unknown }).pack_slug;
      const cost = (offer as { cost?: unknown }).cost;
      if (typeof packSlug !== 'string' || !packSlugs.has(packSlug))
        issues.push({ path, message: 'paquet inconnu' });
      if (typeof cost !== 'number' || !Number.isInteger(cost) || cost < 1)
        issues.push({ path, message: 'cost doit être un entier ≥ 1' });
    }
  }

  if (issues.length > 0) return { ok: false, catalog: null, issues };
  return { ok: true, catalog: { game, countries, cards, collections, expeditions }, issues: [] };
}
