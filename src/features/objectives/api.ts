import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { callRpc } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

export const objectiveSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  kind: z.enum([
    'cards_owned',
    'countries_discovered',
    'continents_discovered',
    'expeditions_completed',
    'collection_completed',
  ]),
  target: z.number(),
  progress: z.number(),
  claimed: z.boolean(),
  collection_slug: z.string().nullable(),
  reward: z.object({ pack_slug: z.string(), pack_name: z.string(), quantity: z.number() }),
});

export type Objective = z.infer<typeof objectiveSchema>;

/** La progression est calculée par le serveur à partir des données vérifiées du joueur. */
export function useObjectives(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.player, 'objectives'],
    queryFn: () => callRpc('list_objectives', {}, z.array(objectiveSchema)),
    enabled,
  });
}

export function useClaimObjective() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (objectiveId: string) =>
      callRpc(
        'claim_objective',
        { p_objective_id: objectiveId },
        z.object({ granted: z.boolean(), packs_granted: z.number() }),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.player }),
  });
}

export function isClaimable(objective: Objective): boolean {
  return !objective.claimed && objective.progress >= objective.target;
}

/** Objectif mis en avant : d'abord une récompense à récupérer, sinon le plus proche du but. */
export function nextObjective(objectives: Objective[]): Objective | null {
  const claimable = objectives.find(isClaimable);
  if (claimable) return claimable;
  const open = objectives.filter((o) => !o.claimed);
  if (open.length === 0) return null;
  return [...open].sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
}
