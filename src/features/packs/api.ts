import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { categoryEnum, rarityEnum } from '@/features/catalog/types';
import { callRpc } from '@/lib/api';
import { toAppError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-client';

export const openingCardSchema = z.object({
  slot: z.number(),
  card_id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  category: categoryEnum,
  rarity: rarityEnum,
  country_code: z.string().nullable(),
  illustration_path: z.string().nullable(),
  is_new: z.boolean(),
  quantity: z.number(),
  fragments_awarded: z.number(),
});

export const openingResultSchema = z.object({
  opening_id: z.string().uuid(),
  user_pack_id: z.string().uuid(),
  pack: z.object({ slug: z.string(), name: z.string() }),
  configuration_version: z.number(),
  opened_at: z.string(),
  cards: z.array(openingCardSchema).min(1),
  summary: z.object({
    new_count: z.number(),
    duplicate_count: z.number(),
    rare_count: z.number(),
    fragments_awarded: z.number(),
    fragments_balance: z.number(),
    collections: z.array(z.object({ slug: z.string(), title: z.string(), owned: z.number(), total: z.number() })),
  }),
  replayed: z.boolean(),
});

export type OpeningCard = z.infer<typeof openingCardSchema>;
export type OpeningResult = z.infer<typeof openingResultSchema>;

const KEY_PREFIX = 'atlas.pack-opening.';

/**
 * Clé d'idempotence persistée par paquet : si la connexion coupe pendant l'ouverture,
 * la nouvelle tentative réutilise la même clé et le serveur renvoie le même résultat.
 */
export async function getOpeningKey(userPackId: string): Promise<string> {
  const storageKey = KEY_PREFIX + userPackId;
  const existing = await AsyncStorage.getItem(storageKey);
  if (existing) return existing;
  const key = randomUUID();
  await AsyncStorage.setItem(storageKey, key);
  return key;
}

/** Paquets dont l'ouverture a été lancée sans que le résultat ait été reçu (coupure, fermeture). */
export async function listInterruptedOpenings(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(KEY_PREFIX)).map((k) => k.slice(KEY_PREFIX.length));
}

export function useInterruptedOpenings(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.player, 'interrupted-openings'],
    queryFn: listInterruptedOpenings,
    enabled,
  });
}

export async function clearOpeningKey(userPackId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY_PREFIX + userPackId);
}

export async function openPack(userPackId: string): Promise<OpeningResult> {
  const key = await getOpeningKey(userPackId);
  try {
    const result = await callRpc(
      'open_pack',
      { p_user_pack_id: userPackId, p_idempotency_key: key },
      openingResultSchema,
    );
    await clearOpeningKey(userPackId).catch(() => undefined);
    return result;
  } catch (error) {
    // La clé n'est conservée que si l'issue est incertaine (réseau, réponse illisible).
    if (!toAppError(error).retryable) await clearOpeningKey(userPackId).catch(() => undefined);
    throw error;
  }
}

export function useOpenPack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: openPack,
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.player }),
  });
}

const exchangeSchema = z.object({ replayed: z.boolean(), packs_granted: z.number(), fragments_balance: z.number() });

export function useExchangeFragments() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => callRpc('exchange_fragments', { p_idempotency_key: randomUUID() }, exchangeSchema),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.player }),
  });
}

const dailyStatusSchema = z.object({ available: z.boolean(), next_available_at: z.string() });
const dailyClaimSchema = z.object({ granted: z.boolean(), packs_granted: z.number(), next_available_at: z.string() });

export function useDailyStatus(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.player, 'daily'],
    queryFn: () => callRpc('get_daily_status', {}, dailyStatusSchema),
    enabled,
  });
}

export function useClaimDaily() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => callRpc('claim_daily_pack', {}, dailyClaimSchema),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.player }),
  });
}
