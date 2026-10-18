import { QueryClient } from '@tanstack/react-query';

import { toAppError } from './errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => failureCount < 2 && toAppError(error).retryable,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

/** Clés de cache centralisées : toute invalidation passe par ces fonctions. */
export const queryKeys = {
  catalog: ['catalog'] as const,
  profile: ['player', 'profile'] as const,
  wallet: ['player', 'wallet'] as const,
  packs: ['player', 'packs'] as const,
  ownedCards: ['player', 'cards'] as const,
  expeditions: ['player', 'expeditions'] as const,
  expedition: (slug: string) => ['player', 'expedition', slug] as const,
  cardDetail: (slug: string) => ['card', slug] as const,
  objectives: ['player', 'objectives'] as const,
  timedPacks: ['player', 'timed-packs'] as const,
  playerState: ['player', 'state'] as const,
  friends: ['social', 'friends'] as const,
  comparison: (code: string) => ['social', 'compare', code] as const,
  challenges: ['social', 'challenges'] as const,
  challenge: (id: string) => ['social', 'challenge', id] as const,
  player: ['player'] as const,
};
