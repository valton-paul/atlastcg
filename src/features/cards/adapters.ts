import type { Card, Catalog } from '@/features/catalog/types';
import type { OpeningCard } from '@/features/packs/api';

import type { AtlasCardData } from './AtlasCard';

export function toCardData(catalog: Catalog, card: Card | OpeningCard): AtlasCardData {
  const country = card.country_code ? catalog.countriesByIso.get(card.country_code) : undefined;
  return {
    title: card.title,
    subtitle: card.subtitle,
    category: card.category,
    rarity: card.rarity,
    countryName: country?.name ?? null,
    isoNumeric: country?.iso_numeric ?? null,
    illustrationPath: card.illustration_path,
  };
}
