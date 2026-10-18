import { useCallback } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useCatalog } from '@/features/catalog/api';
import type { Catalog } from '@/features/catalog/types';

import { usePlayerState, type PlayerState } from './api';

export type AtlasData =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'ready'; catalog: Catalog; player: PlayerState; refreshing: boolean; refresh: () => void };

/** Catalogue publié + état du joueur, chargés ensemble pour les écrans principaux. */
export function useAtlasData(): AtlasData {
  const { userId } = useAuth();
  const catalog = useCatalog();
  const player = usePlayerState(userId);
  const refetchCatalog = catalog.refetch;
  const refetchPlayer = player.refetch;
  const refresh = useCallback(() => {
    void refetchCatalog();
    void refetchPlayer();
  }, [refetchCatalog, refetchPlayer]);

  if (catalog.data && player.data) {
    return {
      status: 'ready',
      catalog: catalog.data,
      player: player.data,
      refreshing: catalog.isRefetching || player.isRefetching,
      refresh,
    };
  }
  const error = catalog.error ?? player.error;
  if (error) return { status: 'error', error, retry: refresh };
  return { status: 'loading' };
}
