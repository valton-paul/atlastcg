import {
  type TestDb,
  asAnon,
  asUser,
  availablePacks,
  createTestDb,
  createUser,
  giveCards,
  randomUUID,
  rpc,
  scalar,
} from './support/db';
import { catalogCardCount } from './support/paths';

describe('initialisation du joueur', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('crée profil, portefeuille et deux paquets Découverte à l’inscription', async () => {
    const user = await createUser(db, { displayName: 'Ada' });
    const profile = await scalar<{ display_name: string; public_code: string }>(
      db,
      'select to_jsonb(p) from public.profiles p where id = $1',
      [user],
    );
    expect(profile.display_name).toBe('Ada');
    expect(profile.public_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await scalar<number>(db, 'select fragments from public.player_wallets where user_id = $1', [user])).toBe(0);
    expect(await availablePacks(db, user, 'decouverte')).toHaveLength(2);
  });

  it('ne distribue jamais deux fois les ressources de départ (appels répétés et simultanés)', async () => {
    const user = await createUser(db);
    await Promise.all(Array.from({ length: 6 }, () => rpc(db, user, 'ensure_player_initialized')));
    await rpc(db, user, 'ensure_player_initialized');
    expect(await availablePacks(db, user)).toHaveLength(2);
    expect(await scalar<number>(db, 'select count(*)::int from public.profiles where id = $1', [user])).toBe(1);
  });

  it('dédoublonne les pseudos et remplace un pseudo invalide', async () => {
    const a = await createUser(db, { displayName: 'Marco Polo' });
    const b = await createUser(db, { displayName: 'marco polo' });
    const c = await createUser(db, { displayName: '<script>' });
    const name = (id: string) => scalar<string>(db, 'select display_name from public.profiles where id = $1', [id]);
    expect(await name(a)).toBe('Marco Polo');
    expect(await name(b)).toMatch(/^marco polo-\d{4}$/);
    expect(await name(c)).toMatch(/^Explorateur/);
  });

  it('refuse l’initialisation sans authentification', async () => {
    await expect(rpc(db, null, 'ensure_player_initialized')).rejects.toThrow(/permission denied/);
  });
});

describe('isolation des données entre joueurs (RLS)', () => {
  let db: TestDb;
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    db = await createTestDb();
    alice = await createUser(db, { displayName: 'Alice' });
    bob = await createUser(db, { displayName: 'Bob' });
    const [pack] = await availablePacks(db, alice);
    await rpc(db, alice, 'open_pack', { p_user_pack_id: pack, p_idempotency_key: randomUUID() });
  });
  afterAll(() => db.close());

  const privateTables = [
    'profiles',
    'player_wallets',
    'resource_ledger',
    'reward_grants',
    'user_packs',
    'pack_openings',
    'pack_opening_cards',
    'user_cards',
    'user_expeditions',
    'user_expedition_steps',
  ];

  it.each(privateTables)("Bob ne voit aucune ligne d'Alice dans %s", async (table) => {
    const column = table === 'profiles' ? 'id' : table === 'pack_opening_cards' ? null : 'user_id';
    const rows = await asUser(db, bob, async (c) =>
      column
        ? (await c.query(`select 1 from public.${table} where ${column} = $1`, [alice])).rows
        : (
            await c.query(
              'select 1 from public.pack_opening_cards poc where not exists (select 1 from public.pack_openings po where po.id = poc.opening_id and po.user_id = auth.uid())',
            )
          ).rows,
    );
    expect(rows).toEqual([]);
  });

  it.each(privateTables)('un visiteur anonyme ne peut pas lire %s', async (table) => {
    await expect(asAnon(db, (c) => c.query(`select 1 from public.${table}`))).rejects.toThrow(/permission denied/);
  });

  it("Alice voit ses propres cartes et leur contenu, pas celui des cartes qu'elle ne possède pas", async () => {
    const owned = await asUser(
      db,
      alice,
      async (c) => (await c.query('select card_id from public.user_cards')).rows.length,
    );
    const contents = await asUser(
      db,
      alice,
      async (c) => (await c.query('select card_id from public.card_contents')).rows.length,
    );
    const distinctOwned = await scalar<number>(db, 'select count(*)::int from public.user_cards where user_id = $1', [
      alice,
    ]);
    expect(owned).toBe(distinctOwned);
    expect(contents).toBe(distinctOwned);
    const bobContents = await asUser(
      db,
      bob,
      async (c) => (await c.query('select 1 from public.card_contents')).rows.length,
    );
    expect(bobContents).toBe(0);
  });

  it('le catalogue publié est lisible sans compte, mais pas le contenu éditorial', async () => {
    const cards = await asAnon(db, async (c) => (await c.query('select id from public.cards')).rows.length);
    expect(cards).toBe(catalogCardCount());
    await expect(asAnon(db, (c) => c.query('select 1 from public.card_contents'))).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, (c) => c.query('select 1 from public.expedition_steps'))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('les solutions des expéditions et le journal d’audit sont inaccessibles', async () => {
    for (const table of ['atlas_private.expedition_step_solutions', 'atlas_private.config_audit_log']) {
      await expect(asUser(db, alice, (c) => c.query(`select 1 from ${table}`))).rejects.toThrow(/permission denied/);
    }
  });

  it('Bob ne peut pas modifier le profil d’Alice ; Alice ne modifie que les champs autorisés', async () => {
    const updated = await asUser(
      db,
      bob,
      async (c) =>
        (await c.query("update public.profiles set display_name = 'Pirate' where id = $1", [alice])).rowCount,
    );
    expect(updated).toBe(0);

    await asUser(db, alice, (c) =>
      c.query("update public.profiles set display_name = 'Alice B', collection_visibility = 'private'"),
    );
    expect(await scalar(db, 'select display_name from public.profiles where id = $1', [alice])).toBe('Alice B');

    await expect(
      asUser(db, alice, (c) => c.query("update public.profiles set public_code = 'AAAAAAAA'")),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(db, alice, (c) => c.query("update public.profiles set display_name = 'x'"))).rejects.toThrow(
      /check constraint/,
    );
    await expect(
      asUser(db, bob, (c) => c.query("update public.profiles set display_name = 'alice b'")),
    ).rejects.toThrow(/duplicate key/);
  });

  it('les cartes archivées restent visibles pour leurs propriétaires uniquement', async () => {
    const slug = await scalar<string>(
      db,
      'select c.slug from public.user_cards uc join public.cards c on c.id = uc.card_id where uc.user_id = $1 limit 1',
      [alice],
    );
    await db.admin.query("update public.cards set status = 'archived' where slug = $1", [slug]);
    const visibleForAlice = await asUser(
      db,
      alice,
      async (c) => (await c.query('select 1 from public.cards where slug = $1', [slug])).rows.length,
    );
    const visibleForBob = await asUser(
      db,
      bob,
      async (c) => (await c.query('select 1 from public.cards where slug = $1', [slug])).rows.length,
    );
    expect([visibleForAlice, visibleForBob]).toEqual([1, 0]);
    await db.admin.query("update public.cards set status = 'published' where slug = $1", [slug]);
  });

  it('mark_cards_seen ne touche que les cartes du joueur', async () => {
    const ids = (
      await db.admin.query<{ card_id: string }>('select card_id from public.user_cards where user_id = $1', [alice])
    ).rows.map((r) => r.card_id);
    expect(await rpc<number>(db, bob, 'mark_cards_seen', { p_card_ids: ids })).toBe(0);
    expect(await rpc<number>(db, alice, 'mark_cards_seen', { p_card_ids: ids })).toBe(ids.length);
    expect(await rpc<number>(db, alice, 'mark_cards_seen', { p_card_ids: ids })).toBe(0);
  });
});

describe('suppression de compte', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('exige une confirmation explicite', async () => {
    const user = await createUser(db);
    await expect(rpc(db, user, 'delete_my_account', { p_confirmation: 'oui' })).rejects.toThrow(
      'CONFIRMATION_REQUIRED',
    );
    expect(await scalar<number>(db, 'select count(*)::int from auth.users where id = $1', [user])).toBe(1);
  });

  it('supprime le compte et toutes les données associées', async () => {
    const user = await createUser(db);
    const friend = await createUser(db);
    const [pack] = await availablePacks(db, user);
    await rpc(db, user, 'open_pack', { p_user_pack_id: pack, p_idempotency_key: randomUUID() });
    await giveCards(db, user, ['pays-jp']);
    await rpc(db, user, 'start_expedition', {
      p_expedition_id: await scalar<string>(db, "select id from public.expeditions where slug = 'expedition-jp'"),
    });
    const code = await scalar<string>(db, 'select public_code from public.profiles where id = $1', [friend]);
    await rpc(db, user, 'send_friend_request', { p_public_code: code });

    await rpc(db, user, 'delete_my_account', { p_confirmation: 'SUPPRIMER' });

    const leftovers = await scalar<number>(
      db,
      `select (select count(*) from public.profiles where id = $1)
            + (select count(*) from public.user_cards where user_id = $1)
            + (select count(*) from public.user_packs where user_id = $1)
            + (select count(*) from public.pack_openings where user_id = $1)
            + (select count(*) from public.player_wallets where user_id = $1)
            + (select count(*) from public.resource_ledger where user_id = $1)
            + (select count(*) from public.user_expeditions where user_id = $1)
            + (select count(*) from public.friendships where requester_id = $1 or recipient_id = $1)`,
      [user],
    );
    expect(Number(leftovers)).toBe(0);
    expect(await scalar<number>(db, 'select count(*)::int from public.profiles where id = $1', [friend])).toBe(1);
  });
});
