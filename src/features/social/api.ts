import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { continentEnum } from '@/features/catalog/types';
import { callRpc } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

const personSchema = z.object({
  friendship_id: z.string().uuid(),
  display_name: z.string(),
  public_code: z.string(),
  since: z.string(),
});

const friendsSchema = z.object({
  friends: z.array(personSchema),
  incoming: z.array(personSchema),
  outgoing: z.array(personSchema),
});

export type Person = z.infer<typeof personSchema>;

const statsSchema = z.object({
  cards_owned: z.number(),
  total_cards: z.number(),
  countries_discovered: z.number(),
  expeditions_completed: z.number(),
  collections: z.array(z.object({ slug: z.string(), title: z.string(), owned: z.number(), total: z.number() })),
});

export type PlayerStats = z.infer<typeof statsSchema>;

const comparisonSchema = z.object({
  friend: z.object({
    display_name: z.string(),
    public_code: z.string(),
    visible: z.boolean(),
    stats: statsSchema.nullable(),
  }),
  me: statsSchema,
});

export const challengeTypeEnum = z.enum(['capitals', 'continents']);
export type ChallengeType = z.infer<typeof challengeTypeEnum>;

const challengeSummarySchema = z.object({
  challenge_id: z.string().uuid(),
  challenge_type: challengeTypeEnum,
  continent: continentEnum.nullable(),
  creator_name: z.string(),
  is_creator: z.boolean(),
  created_at: z.string(),
  expires_at: z.string(),
  expired: z.boolean(),
  completed: z.boolean(),
  my_score: z.number().nullable(),
  question_count: z.number(),
  participant_count: z.number(),
});

export type ChallengeSummary = z.infer<typeof challengeSummarySchema>;

const detailSchema = z.object({
  position: z.number(),
  chosen: z.number().nullable(),
  correct_choice: z.number(),
  explanation: z.string(),
});

export type AnswerDetail = z.infer<typeof detailSchema>;

const challengeSchema = z.object({
  challenge_id: z.string().uuid(),
  challenge_type: challengeTypeEnum,
  continent: continentEnum.nullable(),
  creator_name: z.string(),
  is_creator: z.boolean(),
  invite_code: z.string().nullable(),
  expires_at: z.string(),
  expired: z.boolean(),
  question_count: z.number(),
  questions: z.array(z.object({ position: z.number(), prompt: z.string(), choices: z.array(z.string()) })).nullable(),
  my_result: z.object({ score: z.number(), completed_at: z.string(), details: z.array(detailSchema) }).nullable(),
  participants: z.array(
    z.object({ display_name: z.string(), is_me: z.boolean(), completed: z.boolean(), score: z.number().nullable() }),
  ),
});

export type Challenge = z.infer<typeof challengeSchema>;

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  capitals: 'Capitales',
  continents: 'Continents',
};

/** Normalise un code explorateur ou d'invitation saisi à la main. */
export function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidCode(value: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeCode(value));
}

export function useFriends() {
  return useQuery({ queryKey: queryKeys.friends, queryFn: () => callRpc('list_friends', {}, friendsSchema) });
}

function useSocialMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => client.invalidateQueries({ queryKey: ['social'] }),
  });
}

export function useSendFriendRequest() {
  return useSocialMutation((code: string) =>
    callRpc(
      'send_friend_request',
      { p_public_code: normalizeCode(code) },
      z.object({ status: z.enum(['pending', 'accepted']), friendship_id: z.string().uuid() }),
    ),
  );
}

export function useRespondFriendRequest() {
  return useSocialMutation(({ id, accept }: { id: string; accept: boolean }) =>
    callRpc('respond_friend_request', { p_friendship_id: id, p_accept: accept }, z.object({ status: z.string() })),
  );
}

export function useRemoveFriend() {
  return useSocialMutation((id: string) => callRpc('remove_friend', { p_friendship_id: id }, z.unknown()));
}

export function useComparison(code: string) {
  return useQuery({
    queryKey: queryKeys.comparison(code),
    queryFn: () => callRpc('get_friend_comparison', { p_public_code: code }, comparisonSchema),
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: queryKeys.challenges,
    queryFn: () => callRpc('list_challenges', {}, z.array(challengeSummarySchema)),
  });
}

export function useChallenge(id: string) {
  return useQuery({
    queryKey: queryKeys.challenge(id),
    queryFn: () => callRpc('get_challenge', { p_challenge_id: id }, challengeSchema),
  });
}

export function useCreateChallenge() {
  return useSocialMutation(
    ({ type, continent, friendCodes }: { type: ChallengeType; continent: string | null; friendCodes: string[] }) =>
      callRpc(
        'create_challenge',
        { p_type: type, p_continent: continent, p_friend_codes: friendCodes },
        z.object({ challenge_id: z.string().uuid(), invite_code: z.string() }),
      ),
  );
}

export function useJoinChallenge() {
  return useSocialMutation((code: string) =>
    callRpc('join_challenge', { p_invite_code: normalizeCode(code) }, z.object({ challenge_id: z.string().uuid() })),
  );
}

export function useRevokeChallengeLink() {
  return useSocialMutation((id: string) => callRpc('revoke_challenge_link', { p_challenge_id: id }, z.unknown()));
}

export function useSubmitChallenge() {
  return useSocialMutation(({ id, answers }: { id: string; answers: (number | null)[] }) =>
    callRpc(
      'submit_challenge',
      { p_challenge_id: id, p_answers: answers },
      z.object({ score: z.number(), total: z.number(), details: z.array(detailSchema) }),
    ),
  );
}
