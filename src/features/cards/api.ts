import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import type { Card, Catalog, PackDefinition } from '@/features/catalog/types';
import { selectRows } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { getSupabase } from '@/lib/supabase';

const contentSchema = z.object({
  discovery_text: z.string(),
  fun_fact: z.string().nullable(),
  sources: z.array(z.string()),
});

export type CardContent = z.infer<typeof contentSchema>;

/** Le texte de découverte n'est lisible que pour une carte possédée (RLS). */
export function useCardContent(cardId: string | null, owned: boolean) {
  return useQuery({
    queryKey: [...queryKeys.cardDetail(cardId ?? ''), owned],
    enabled: !!cardId && owned,
    staleTime: 30 * 60_000,
    queryFn: () =>
      selectRows(
        'card-content',
        getSupabase()
          .from('card_contents')
          .select('discovery_text, fun_fact, sources')
          .eq('card_id', cardId as string)
          .maybeSingle(),
        contentSchema.nullable(),
      ),
  });
}

/** Paquets pouvant contenir la carte (même logique d'éligibilité que le tirage serveur). */
export function packsContaining(catalog: Catalog, card: Card): PackDefinition[] {
  const country = card.country_code ? catalog.countriesByIso.get(card.country_code) : undefined;
  return catalog.packs.filter((pack) => {
    if (pack.card_categories && !pack.card_categories.includes(card.category)) return false;
    if (pack.continent && country?.continent !== pack.continent) return false;
    return pack.pack_drop_rates.some((r) => r.rarity === card.rarity);
  });
}

export function shareMessage(card: Card, countryName: string | null): string {
  const place = countryName && card.category !== 'country' ? ` (${countryName})` : '';
  return `J’ai découvert la carte « ${card.title} »${place} dans Atlas, le jeu où le monde est à collectionner.`;
}
