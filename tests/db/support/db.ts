import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client, Pool, type PoolClient } from 'pg';

import { type DbState, STATE_FILE, TEMPLATE_DB } from './paths';

function state(): DbState {
  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as DbState;
}

function connection(database: string) {
  return { host: '127.0.0.1', port: state().port, user: 'postgres', password: 'postgres', database };
}

export interface TestDb {
  /** Connexion superutilisateur (équivalent du rôle postgres / service). */
  admin: Pool;
  name: string;
  close(): Promise<void>;
}

/** Crée une base isolée pour un fichier de test. `template: false` donne une base totalement vide. */
export async function createTestDb(options: { template?: boolean } = {}): Promise<TestDb> {
  const name = `atlas_test_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const root = new Client(connection('postgres'));
  await root.connect();
  await root.query(
    options.template === false ? `create database ${name}` : `create database ${name} template ${TEMPLATE_DB}`,
  );
  await root.end();
  const admin = new Pool({ ...connection(name), max: 12 });
  return {
    admin,
    name,
    async close() {
      await admin.end();
      const cleanup = new Client(connection('postgres'));
      await cleanup.connect();
      await cleanup.query(`drop database if exists ${name} with (force)`);
      await cleanup.end();
    },
  };
}

export async function createUser(db: TestDb, options: { displayName?: string; email?: string } = {}): Promise<string> {
  const email = options.email ?? `${randomUUID()}@example.test`;
  const meta = options.displayName ? { display_name: options.displayName } : {};
  const { rows } = await db.admin.query<{ id: string }>(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id',
    [email, meta],
  );
  return rows[0].id;
}

type Role = 'anon' | 'authenticated';

/** Exécute `fn` dans une transaction avec le rôle et les claims JWT d'un client Supabase. */
export async function withRole<T>(
  db: TestDb,
  role: Role,
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.admin.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role } : { role }),
    ]);
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function asUser<T>(db: TestDb, userId: string, fn: (client: PoolClient) => Promise<T>) {
  return withRole(db, 'authenticated', userId, fn);
}

export function asAnon<T>(db: TestDb, fn: (client: PoolClient) => Promise<T>) {
  return withRole(db, 'anon', null, fn);
}

/** Appelle une RPC comme le ferait PostgREST (arguments nommés). */
export async function rpc<T = unknown>(
  db: TestDb,
  userId: string | null,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const names = Object.keys(args);
  const params = names.map((name, i) => `${name} => $${i + 1}`).join(', ');
  const run = async (client: PoolClient) => {
    const { rows } = await client.query<{ result: T }>(
      `select public.${fn}(${params}) as result`,
      names.map((n) => args[n]),
    );
    return rows[0].result;
  };
  return userId ? asUser(db, userId, run) : asAnon(db, run);
}

export async function availablePacks(db: TestDb, userId: string, slug?: string): Promise<string[]> {
  const { rows } = await db.admin.query<{ id: string }>(
    `select up.id from public.user_packs up join public.pack_definitions p on p.id = up.pack_id
      where up.user_id = $1 and up.status = 'available' and ($2::text is null or p.slug = $2)
      order by up.created_at, up.id`,
    [userId, slug ?? null],
  );
  return rows.map((r) => r.id);
}

/** Donne directement des cartes à un joueur (préparation de scénario, rôle superutilisateur). */
export async function giveCards(db: TestDb, userId: string, slugs: string[]): Promise<void> {
  await db.admin.query(
    `insert into public.user_cards (user_id, card_id, quantity)
     select $1, id, 1 from public.cards where slug = any($2)
     on conflict (user_id, card_id) do nothing`,
    [userId, slugs],
  );
}

export async function grantPack(db: TestDb, userId: string, packSlug: string, key = randomUUID()) {
  const { rows } = await db.admin.query<{ n: number }>(
    `select atlas_private.grant_reward_packs($1, $2, 'objective', null,
       (select id from public.pack_definitions where slug = $3), 1) as n`,
    [userId, `test:${key}`, packSlug],
  );
  return rows[0].n;
}

export async function scalar<T>(db: TestDb, sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.admin.query(sql, params);
  return Object.values(rows[0] as Record<string, unknown>)[0] as T;
}

export { randomUUID };
