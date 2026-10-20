import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { selectRows } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { getSupabase } from '@/lib/supabase';

export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  country_code: z.string(),
  expedition_id: z.string().uuid().nullable(),
  step_id: z.string().uuid().nullable(),
  kind: z.enum(['discovery', 'quiz', 'locate']),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
});

export const countryMasterySchema = z.object({
  country_code: z.string(),
  xp: z.number(),
  expeditions_completed: z.number(),
  updated_at: z.string(),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type CountryMastery = z.infer<typeof countryMasterySchema>;

export function useCountryMastery(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.player, 'country-mastery'],
    enabled,
    queryFn: () =>
      selectRows(
        'country-mastery',
        getSupabase().from('user_country_mastery').select('country_code, xp, expeditions_completed, updated_at'),
        z.array(countryMasterySchema),
      ),
  });
}

export function useCountryJournal(countryCode: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.player, 'journal', countryCode],
    enabled: enabled && !!countryCode,
    queryFn: () =>
      selectRows(
        'journal',
        getSupabase()
          .from('user_journal_entries')
          .select('id, country_code, expedition_id, step_id, kind, title, body, created_at')
          .eq('country_code', countryCode as string)
          .order('created_at', { ascending: false }),
        z.array(journalEntrySchema),
      ),
  });
}
