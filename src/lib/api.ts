import { z } from 'zod';

import { AppError, toAppError } from './errors';
import { logger } from './logger';
import { getSupabase } from './supabase';

/**
 * Appelle une fonction RPC serveur et valide sa réponse. Toutes les actions qui modifient
 * l'état du joueur passent par ces fonctions transactionnelles : le client n'écrit jamais
 * directement dans les tables de jeu.
 */
export async function callRpc<S extends z.ZodTypeAny>(
  fn: string,
  args: Record<string, unknown>,
  schema: S,
): Promise<z.infer<S>> {
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) {
    const appError = toAppError(error);
    logger.warn(`rpc:${fn}`, appError.code);
    throw appError;
  }
  return parseResponse(fn, data, schema);
}

export function parseResponse<S extends z.ZodTypeAny>(context: string, data: unknown, schema: S): z.infer<S> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    logger.error(`invalid-response:${context}`, parsed.error.issues.slice(0, 3));
    throw new AppError('INVALID_RESPONSE', parsed.error);
  }
  return parsed.data;
}

/** Exécute une requête de lecture PostgREST et valide son résultat. */
export async function selectRows<S extends z.ZodTypeAny>(
  context: string,
  query: PromiseLike<{ data: unknown; error: unknown }>,
  schema: S,
): Promise<z.infer<S>> {
  const { data, error } = await query;
  if (error) {
    const appError = toAppError(error);
    logger.warn(`select:${context}`, appError.code);
    throw appError;
  }
  return parseResponse(context, data, schema);
}

/** Taille de page alignée sur la limite par défaut de PostgREST (`max_rows`). */
export const PAGE_SIZE = 1000;

/**
 * Lit toutes les lignes d'une requête page par page, pour qu'un catalogue qui grandit ne soit
 * jamais tronqué silencieusement. `page(from, to)` doit porter un ordre stable.
 */
export async function selectAllRows<T extends z.ZodTypeAny>(
  context: string,
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  itemSchema: T,
): Promise<z.infer<T>[]> {
  const rows: z.infer<T>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const batch = await selectRows(context, page(from, from + PAGE_SIZE - 1), z.array(itemSchema));
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}
