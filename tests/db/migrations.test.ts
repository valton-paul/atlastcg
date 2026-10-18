import { readMigrations, readSeed, readShim } from './support/paths';
import { type TestDb, createTestDb, createUser, rpc, scalar } from './support/db';

describe('migrations sur une base vierge', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb({ template: false });
    await db.admin.query(readShim());
    for (const migration of readMigrations()) await db.admin.query(migration.sql);
  });
  afterAll(() => db.close());

  it('crée le schéma complet sans catalogue', async () => {
    const tables = await scalar<number>(
      db,
      "select count(*)::int from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    expect(tables).toBeGreaterThanOrEqual(25);
    expect(await scalar<number>(db, 'select count(*)::int from public.cards')).toBe(0);
  });

  it("permet l'inscription avant la publication du catalogue, puis rattrape les paquets de départ", async () => {
    const userId = await createUser(db, { displayName: 'Pionnière' });
    expect(await scalar<number>(db, 'select count(*)::int from public.user_packs where user_id = $1', [userId])).toBe(
      0,
    );

    await db.admin.query(readSeed());
    await rpc(db, userId, 'ensure_player_initialized');
    expect(await scalar<number>(db, 'select count(*)::int from public.user_packs where user_id = $1', [userId])).toBe(
      2,
    );
  });

  it('applique le seed de manière idempotente', async () => {
    const before = await db.admin.query(
      'select (select count(*) from public.cards) c, (select count(*) from public.collection_cards) cc, (select count(*) from public.expedition_steps) s, (select count(*) from public.pack_drop_rates) r',
    );
    await db.admin.query(readSeed());
    const after = await db.admin.query(
      'select (select count(*) from public.cards) c, (select count(*) from public.collection_cards) cc, (select count(*) from public.expedition_steps) s, (select count(*) from public.pack_drop_rates) r',
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(Number(after.rows[0].c)).toBe(90);
  });

  it('active la RLS sur toutes les tables de public et atlas_private', async () => {
    const { rows } = await db.admin.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'atlas_private') and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("n'expose aux clients que les RPC prévues", async () => {
    const { rows } = await db.admin.query<{ fn: string; anon: boolean; auth: boolean }>(
      `select p.proname as fn,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as auth
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'`,
    );
    expect(rows.filter((r) => r.anon).map((r) => r.fn)).toEqual([]);
    expect(
      rows
        .filter((r) => r.auth)
        .map((r) => r.fn)
        .sort(),
    ).toEqual(
      [
        'claim_objective',
        'complete_expedition',
        'complete_onboarding',
        'create_challenge',
        'delete_my_account',
        'ensure_player_initialized',
        'exchange_fragments',
        'get_challenge',
        'get_friend_comparison',
        'join_challenge',
        'list_challenges',
        'list_friends',
        'list_objectives',
        'mark_cards_seen',
        'open_pack',
        'remove_friend',
        'respond_friend_request',
        'revoke_challenge_link',
        'send_friend_request',
        'start_expedition',
        'submit_challenge',
        'submit_expedition_step',
        'sync_timed_packs',
      ].sort(),
    );
  });

  it('interdit tout accès client au schéma privé', async () => {
    const { rows } = await db.admin.query(
      "select has_schema_privilege('authenticated', 'atlas_private', 'usage') a, has_schema_privilege('anon', 'atlas_private', 'usage') b",
    );
    expect(rows[0]).toEqual({ a: false, b: false });
  });

  it('refuse une configuration de probabilités dont la somme diffère de 1', async () => {
    await expect(
      db.admin.query(
        `update public.pack_drop_rates set probability = 0.5
          where rarity = 'common' and pack_id = (select id from public.pack_definitions where slug = 'exploration')`,
      ),
    ).rejects.toThrow('DROP_RATES_MUST_SUM_TO_ONE');
  });

  it('refuse un seed qui modifie les probabilités sans changer de version', async () => {
    const tampered = readSeed().replace("('exploration', 1, 'common', 0.55)", "('exploration', 1, 'common', 0.56)");
    expect(tampered).not.toEqual(readSeed());
    const client = await db.admin.connect();
    try {
      await expect(client.query(tampered)).rejects.toThrow('DROP_RATES_CHANGED_WITHOUT_VERSION_BUMP');
      await client.query('rollback');
    } finally {
      client.release();
    }
    expect(
      await scalar<string>(
        db,
        "select probability::text from public.pack_drop_rates r join public.pack_definitions p on p.id = r.pack_id where p.slug = 'exploration' and r.rarity = 'common'",
      ),
    ).toBe('0.550000');
  });

  it('journalise les modifications de configuration', async () => {
    await db.admin.query("update public.economy_settings set description = 'audit test' where key = 'timed_packs'");
    const count = await scalar<number>(
      db,
      "select count(*)::int from atlas_private.config_audit_log where table_name = 'economy_settings' and operation = 'UPDATE'",
    );
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('déclare le bucket public des illustrations', async () => {
    const { rows } = await db.admin.query("select public from storage.buckets where id = 'card-illustrations'");
    expect(rows[0]).toEqual({ public: true });
  });
});
