import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { callRpc, selectRows } from '@/lib/api';
import { toAppError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';
import { getSupabase } from '@/lib/supabase';

export const profileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  public_code: z.string(),
  collection_visibility: z.enum(['friends', 'private']),
  onboarding_completed_at: z.string().nullable(),
});

const ownedCardSchema = z.object({
  card_id: z.string().uuid(),
  quantity: z.number(),
  seen_at: z.string().nullable(),
  first_acquired_at: z.string(),
});

const userPackSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  source: z.enum(['starter', 'expedition', 'objective', 'daily', 'fragment_exchange']),
  created_at: z.string(),
});

const userExpeditionSchema = z.object({
  expedition_id: z.string().uuid(),
  status: z.enum(['in_progress', 'completed']),
  started_at: z.string(),
  completed_at: z.string().nullable(),
});

const userStepSchema = z.object({
  expedition_id: z.string().uuid(),
  step_id: z.string().uuid(),
  completed_at: z.string().nullable(),
});

export type Profile = z.infer<typeof profileSchema>;
export type OwnedCard = z.infer<typeof ownedCardSchema>;
export type UserPack = z.infer<typeof userPackSchema>;
export type UserExpedition = z.infer<typeof userExpeditionSchema>;

export type PlayerState = {
  profile: Profile;
  fragments: number;
  packs: UserPack[];
  ownedCards: Map<string, OwnedCard>;
  expeditions: Map<string, UserExpedition>;
  completedSteps: Map<string, number>;
  /** Nombre d'étapes des expéditions démarrées (les autres ne sont pas lisibles). */
  stepTotals: Map<string, number>;
};

/**
 * État du joueur lu en lecture seule (RLS : uniquement ses propres lignes).
 * Le serveur reste l'unique source de vérité ; ces données ne sont jamais modifiées localement.
 */
export async function fetchPlayerState(userId: string): Promise<PlayerState> {
  const db = getSupabase();
  const [profile, wallet, packs, cards, expeditions, steps, startedSteps] = await Promise.all([
    selectRows(
      'profile',
      db
        .from('profiles')
        .select('id, display_name, public_code, collection_visibility, onboarding_completed_at')
        .eq('id', userId)
        .maybeSingle(),
      profileSchema.nullable(),
    ),
    selectRows(
      'wallet',
      db.from('player_wallets').select('fragments').eq('user_id', userId).maybeSingle(),
      z.object({ fragments: z.number() }).nullable(),
    ),
    selectRows(
      'packs',
      db
        .from('user_packs')
        .select('id, pack_id, source, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: true }),
      z.array(userPackSchema),
    ),
    selectRows(
      'cards',
      db.from('user_cards').select('card_id, quantity, seen_at, first_acquired_at'),
      z.array(ownedCardSchema),
    ),
    selectRows(
      'expeditions',
      db.from('user_expeditions').select('expedition_id, status, started_at, completed_at'),
      z.array(userExpeditionSchema),
    ),
    selectRows(
      'expedition-steps',
      db.from('user_expedition_steps').select('expedition_id, step_id, completed_at'),
      z.array(userStepSchema),
    ),
    selectRows(
      'started-expedition-steps',
      db.from('expedition_steps').select('expedition_id'),
      z.array(z.object({ expedition_id: z.string().uuid() })),
    ),
  ]);

  const resolvedProfile = profile ?? (await ensurePlayerInitialized());
  const completedSteps = new Map<string, number>();
  for (const step of steps) {
    if (step.completed_at) completedSteps.set(step.expedition_id, (completedSteps.get(step.expedition_id) ?? 0) + 1);
  }
  const stepTotals = new Map<string, number>();
  for (const step of startedSteps) stepTotals.set(step.expedition_id, (stepTotals.get(step.expedition_id) ?? 0) + 1);
  return {
    profile: resolvedProfile,
    fragments: wallet?.fragments ?? 0,
    packs,
    ownedCards: new Map(cards.map((c) => [c.card_id, c])),
    expeditions: new Map(expeditions.map((e) => [e.expedition_id, e])),
    completedSteps,
    stepTotals,
  };
}

/** Rattrapage si le déclencheur d'inscription n'a pas encore créé le profil. Idempotent. */
export function ensurePlayerInitialized(): Promise<Profile> {
  return callRpc('ensure_player_initialized', {}, profileSchema.passthrough());
}

export function usePlayerState(userId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.player, 'state', userId],
    queryFn: () => fetchPlayerState(userId as string),
    enabled: !!userId,
  });
}

export function useInvalidatePlayer() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.player });
}

export function useCompleteOnboarding() {
  const invalidate = useInvalidatePlayer();
  return useMutation({
    mutationFn: () => callRpc('complete_onboarding', {}, z.unknown()),
    onSuccess: invalidate,
  });
}

export function useMarkCardsSeen() {
  const invalidate = useInvalidatePlayer();
  return useMutation({
    mutationFn: (cardIds: string[]) =>
      cardIds.length === 0
        ? Promise.resolve(0)
        : callRpc('mark_cards_seen', { p_card_ids: cardIds.slice(0, 200) }, z.number()),
    onSuccess: (count) => {
      if (count > 0) invalidate();
    },
  });
}

/** Seules ces deux colonnes sont modifiables par le joueur (privilège colonne + RLS). */
export function useUpdateProfile(userId: string | null) {
  const invalidate = useInvalidatePlayer();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, 'display_name' | 'collection_visibility'>>) => {
      if (!userId) throw toAppError({ message: 'NOT_AUTHENTICATED' });
      const { error } = await getSupabase().from('profiles').update(patch).eq('id', userId);
      if (error) throw toAppError(error);
    },
    onSuccess: invalidate,
  });
}

export function deleteMyAccount(confirmation: string) {
  return callRpc('delete_my_account', { p_confirmation: confirmation }, z.unknown());
}
