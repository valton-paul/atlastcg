import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { callRpc } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

export const expeditionDrawSchema = z.object({
  draw_id: z.string().uuid().nullable(),
  expedition_id: z.string().uuid(),
  expedition_slug: z.string(),
  title: z.string(),
  summary: z.string(),
  country_code: z.string(),
  iso_numeric: z.string(),
  country_name: z.string(),
  capital: z.string(),
  reward_pack_id: z.string().uuid().nullable(),
  reward_pack_quantity: z.number().int().positive().nullable(),
  reward_fragments: z.number().int().nonnegative().optional(),
  reward_xp: z.number().int().nonnegative().optional(),
  replayed: z.boolean(),
  already_active: z.boolean(),
  charges: z.number().int().nonnegative().optional(),
  max_stored: z.number().int().positive().optional(),
  next_at: z.string().nullable().optional(),
  /** Ancien champ (migration daily) — ignoré au profit de `charges`. */
  daily_remaining: z.number().int().nonnegative().optional(),
});

export type ExpeditionDraw = z.infer<typeof expeditionDrawSchema>;

const chargesSchema = z.object({
  charges: z.number().int().nonnegative(),
  max_stored: z.number().int().positive(),
  next_at: z.string().nullable(),
  server_time: z.string(),
});

export interface ExpeditionCharges {
  charges: number;
  maxStored: number;
  /** Prochaine charge, calée sur l’horloge locale ; null si réserve pleine. */
  nextAt: string | null;
}

const revealSchema = z.object({
  draw_id: z.string().uuid(),
  expedition_id: z.string().uuid(),
  country_code: z.string(),
  iso_numeric: z.string(),
  status: z.literal('revealed'),
});

/** Synchronise la réserve d’expéditions (+1 / 30 min, plafond 10). */
export function useExpeditionCharges(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.expeditionCharges,
    queryFn: async (): Promise<ExpeditionCharges> => {
      const state = await callRpc('sync_expedition_charges', {}, chargesSchema);
      const offset = Date.now() - Date.parse(state.server_time);
      return {
        charges: state.charges,
        maxStored: state.max_stored,
        nextAt: state.next_at ? new Date(Date.parse(state.next_at) + offset).toISOString() : null,
      };
    },
    enabled,
    refetchInterval: 60_000,
  });
}

/** Tire une destination côté serveur (ou reprend un tirage / une expédition en cours). */
export function useDrawExpedition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => callRpc('draw_expedition', {}, expeditionDrawSchema),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.player });
      void client.invalidateQueries({ queryKey: queryKeys.expeditionCharges });
    },
  });
}

export function useRevealExpeditionDraw() {
  return useMutation({
    mutationFn: (drawId: string) =>
      callRpc('reveal_expedition_draw', { p_draw_id: drawId }, revealSchema),
  });
}

/**
 * Séquence visuelle menant au pays tiré. Le résultat final est toujours `winnerId`
 * (choisi par le serveur) ; les étapes intermédiaires ne sont que du spectacle.
 */
export function buildDrawSequence(winnerId: string, poolIds: string[], steps = 28): string[] {
  const pool = poolIds.filter((id) => id !== winnerId);
  if (pool.length === 0) return Array.from({ length: Math.max(1, steps) }, () => winnerId);
  const sequence: string[] = [];
  let prev = '';
  for (let i = 0; i < steps - 1; i++) {
    let next = pool[Math.floor(Math.random() * pool.length)]!;
    if (next === prev && pool.length > 1) {
      next = pool[(pool.indexOf(next) + 1) % pool.length]!;
    }
    sequence.push(next);
    prev = next;
  }
  sequence.push(winnerId);
  return sequence;
}

/** Délai avant l’étape `index` (ms), rythme qui ralentit vers la fin. */
export function drawStepDelay(index: number, total: number): number {
  const t = total <= 1 ? 1 : index / (total - 1);
  return Math.round(45 + t * t * 220);
}
