import {
  type TestDb,
  asAnon,
  asUser,
  availablePacks,
  createTestDb,
  createUser,
  grantPack,
  randomUUID,
  rpc,
  scalar,
} from './support/db';

interface OpeningCard {
  card_id: string;
  slug: string;
  rarity: string;
  category: string;
  is_new: boolean;
  quantity: number;
  fragments_awarded: number;
}
interface Opening {
  opening_id: string;
  replayed: boolean;
  cards: OpeningCard[];
  summary: {
    new_count: number;
    duplicate_count: number;
    fragments_awarded: number;
    fragments_balance: number;
    collections: { slug: string; owned: number; total: number }[];
  };
}

async function totalCards(db: TestDb, userId: string): Promise<number> {
  return scalar<number>(db, 'select coalesce(sum(quantity), 0)::int from public.user_cards where user_id = $1', [
    userId,
  ]);
}

describe('ouverture des paquets', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('attribue 5 cartes, consomme le paquet et renvoie un résumé cohérent', async () => {
    const user = await createUser(db);
    const [packId] = await availablePacks(db, user, 'decouverte');

    const result = await rpc<Opening>(db, user, 'open_pack', {
      p_user_pack_id: packId,
      p_idempotency_key: randomUUID(),
    });

    expect(result.replayed).toBe(false);
    expect(result.cards).toHaveLength(5);
    expect(result.cards.every((c) => ['country', 'capital'].includes(c.category))).toBe(true);
    expect(result.summary.new_count + result.summary.duplicate_count).toBe(5);
    expect(await totalCards(db, user)).toBe(5);
    expect(await scalar(db, 'select status::text from public.user_packs where id = $1', [packId])).toBe('opened');
    expect(
      await scalar<number>(db, 'select count(*)::int from public.pack_opening_cards where opening_id = $1', [
        result.opening_id,
      ]),
    ).toBe(5);
    expect(result.summary.collections.length).toBeGreaterThan(0);
  });

  it('renvoie le même résultat sans nouvelle attribution pour une clé rejouée (reconnexion)', async () => {
    const user = await createUser(db);
    const [packId] = await availablePacks(db, user);
    const key = randomUUID();
    const first = await rpc<Opening>(db, user, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: key });
    const again = await rpc<Opening>(db, user, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: key });

    expect(again.replayed).toBe(true);
    expect(again.opening_id).toBe(first.opening_id);
    expect(again.cards.map((c) => c.card_id)).toEqual(first.cards.map((c) => c.card_id));
    expect(await totalCards(db, user)).toBe(5);
  });

  it('renvoie le résultat enregistré si le paquet est rouvert avec une nouvelle clé', async () => {
    const user = await createUser(db);
    const [packId] = await availablePacks(db, user);
    const first = await rpc<Opening>(db, user, 'open_pack', {
      p_user_pack_id: packId,
      p_idempotency_key: randomUUID(),
    });
    const again = await rpc<Opening>(db, user, 'open_pack', {
      p_user_pack_id: packId,
      p_idempotency_key: randomUUID(),
    });
    expect(again.replayed).toBe(true);
    expect(again.opening_id).toBe(first.opening_id);
    expect(await totalCards(db, user)).toBe(5);
  });

  it('ne consomme le paquet qu’une fois lors de 8 ouvertures simultanées', async () => {
    const user = await createUser(db);
    const [packId] = await availablePacks(db, user);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        rpc<Opening>(db, user, 'open_pack', {
          p_user_pack_id: packId,
          p_idempotency_key: i % 2 === 0 ? randomUUID() : '00000000-0000-4000-8000-000000000001',
        }),
      ),
    );
    const openingIds = new Set(results.map((r) => r.opening_id));
    expect(openingIds.size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await totalCards(db, user)).toBe(5);
    expect(
      await scalar<number>(db, 'select count(*)::int from public.pack_openings where user_pack_id = $1', [packId]),
    ).toBe(1);
  });

  it('refuse la réutilisation d’une clé pour un autre paquet', async () => {
    const user = await createUser(db);
    const [a, b] = await availablePacks(db, user);
    const key = randomUUID();
    await rpc(db, user, 'open_pack', { p_user_pack_id: a, p_idempotency_key: key });
    await expect(rpc(db, user, 'open_pack', { p_user_pack_id: b, p_idempotency_key: key })).rejects.toThrow(
      'IDEMPOTENCY_KEY_REUSED',
    );
    expect(await scalar(db, 'select status::text from public.user_packs where id = $1', [b])).toBe('available');
  });

  it("empêche d'ouvrir le paquet d'un autre joueur", async () => {
    const owner = await createUser(db);
    const thief = await createUser(db);
    const [packId] = await availablePacks(db, owner);
    await expect(
      rpc(db, thief, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: randomUUID() }),
    ).rejects.toThrow('PACK_NOT_FOUND');
    expect(await totalCards(db, thief)).toBe(0);
    expect(await scalar(db, 'select status::text from public.user_packs where id = $1', [packId])).toBe('available');
  });

  it('refuse les appels anonymes et les arguments manquants', async () => {
    const user = await createUser(db);
    const [packId] = await availablePacks(db, user);
    await expect(
      rpc(db, null, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: randomUUID() }),
    ).rejects.toThrow(/permission denied/);
    await expect(rpc(db, user, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: null })).rejects.toThrow(
      'INVALID_ARGUMENT',
    );
  });

  it('compense les doublons en fragments, avec un historique cohérent avec le solde', async () => {
    const user = await createUser(db);
    for (let i = 0; i < 6; i++) await grantPack(db, user, 'decouverte');
    let duplicates = 0;
    for (const packId of await availablePacks(db, user)) {
      const r = await rpc<Opening>(db, user, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: randomUUID() });
      duplicates += r.summary.duplicate_count;
      for (const card of r.cards) {
        expect(card.is_new ? card.fragments_awarded === 0 : card.fragments_awarded > 0).toBe(true);
      }
    }
    expect(duplicates).toBeGreaterThan(0);
    const balance = await scalar<number>(db, 'select fragments from public.player_wallets where user_id = $1', [user]);
    const ledger = await scalar<number>(
      db,
      'select coalesce(sum(delta), 0)::int from public.resource_ledger where user_id = $1',
      [user],
    );
    const awarded = await scalar<number>(
      db,
      `select coalesce(sum(poc.fragments_awarded), 0)::int from public.pack_opening_cards poc
         join public.pack_openings po on po.id = poc.opening_id where po.user_id = $1`,
      [user],
    );
    expect(balance).toBe(ledger);
    expect(balance).toBe(awarded);
    // Chaque carte possédée correspond exactement aux attributions enregistrées.
    const mismatch = await scalar<number>(
      db,
      `select count(*)::int from public.user_cards uc
        where uc.user_id = $1 and uc.quantity <> (
          select count(*) from public.pack_opening_cards poc join public.pack_openings po on po.id = poc.opening_id
           where po.user_id = uc.user_id and poc.card_id = uc.card_id)`,
      [user],
    );
    expect(mismatch).toBe(0);
  });

  it('interdit toute écriture directe sur l’inventaire, les paquets et le solde', async () => {
    const user = await createUser(db);
    const statements = [
      'update public.player_wallets set fragments = 999999',
      'insert into public.user_cards (user_id, card_id, quantity) select auth.uid(), id, 1 from public.cards limit 1',
      "update public.user_packs set status = 'available', opened_at = null",
      "insert into public.user_packs (user_id, pack_id, source, grant_key) select auth.uid(), id, 'starter', 'starter' from public.pack_definitions limit 1",
      "insert into public.reward_grants (user_id, grant_key, source) values (auth.uid(), 'hack', 'daily')",
      'update public.pack_drop_rates set probability = 1',
      'delete from public.pack_openings',
    ];
    for (const sql of statements) {
      await expect(asUser(db, user, (c) => c.query(sql))).rejects.toThrow(/permission denied/);
    }
  });
});

describe('tirage côté serveur', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('respecte statistiquement les probabilités configurées (20 000 tirages)', async () => {
    const { rows } = await db.admin.query<{ rarity: string; n: number }>(
      `select draw_rarity::text as rarity, count(*)::int as n
         from generate_series(1, 4000) g,
              lateral atlas_private.draw_pack_cards(
                (select id from public.pack_definitions where slug = 'exploration'), 1, 5 + 0 * g)
        group by 1`,
    );
    const total = rows.reduce((acc, r) => acc + r.n, 0);
    expect(total).toBe(20000);
    const expected: Record<string, number> = { common: 0.55, uncommon: 0.27, rare: 0.11, epic: 0.06, legendary: 0.01 };
    for (const [rarity, p] of Object.entries(expected)) {
      const observed = (rows.find((r) => r.rarity === rarity)?.n ?? 0) / total;
      // 5 écarts-types d'une loi binomiale : un échec signale une anomalie réelle.
      const tolerance = 5 * Math.sqrt((p * (1 - p)) / total);
      expect(Math.abs(observed - p)).toBeLessThan(tolerance);
    }
  });

  it('ne tire jamais une carte non publiée et évite les répétitions dans un paquet', async () => {
    await db.admin.query("update public.cards set status = 'draft' where slug = 'pays-fr'");
    const { rows } = await db.admin.query<{ drafts: number; repeats: number }>(
      `select count(*) filter (where c.status <> 'published')::int as drafts,
              (select count(*) from (
                 select g, draw_card_id from generate_series(1, 300) g,
                   lateral atlas_private.draw_pack_cards((select id from public.pack_definitions where slug = 'decouverte'), 1, 5 + 0 * g)
                  group by 1, 2 having count(*) > 1) x)::int as repeats
         from generate_series(1, 300) g,
              lateral atlas_private.draw_pack_cards((select id from public.pack_definitions where slug = 'decouverte'), 1, 5 + 0 * g) d
         join public.cards c on c.id = d.draw_card_id`,
    );
    expect(rows[0]).toEqual({ drafts: 0, repeats: 0 });
    await db.admin.query("update public.cards set status = 'published' where slug = 'pays-fr'");
  });

  it('expose publiquement les probabilités de la version active', async () => {
    const rows = await asAnon(
      db,
      async (c) =>
        (
          await c.query<{ rarity: string; p: number }>(
            `select r.rarity::text, r.probability::float as p from public.pack_drop_rates r
             join public.pack_definitions p on p.id = r.pack_id and r.configuration_version = p.configuration_version
            where p.slug = 'decouverte' order by r.rarity`,
          )
        ).rows,
    );
    expect(rows).toEqual([
      { rarity: 'common', p: 0.7 },
      { rarity: 'uncommon', p: 0.3 },
    ]);
  });
});

describe('fragments et paquet quotidien', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  async function setFragments(userId: string, amount: number) {
    await db.admin.query('update public.player_wallets set fragments = $2 where user_id = $1', [userId, amount]);
  }

  it('refuse un échange avec un solde insuffisant', async () => {
    const user = await createUser(db);
    await setFragments(user, 99);
    await expect(rpc(db, user, 'exchange_fragments', { p_idempotency_key: randomUUID() })).rejects.toThrow(
      'INSUFFICIENT_FRAGMENTS',
    );
  });

  it('échange 100 fragments contre un paquet, une seule fois par clé', async () => {
    const user = await createUser(db);
    await setFragments(user, 150);
    const key = randomUUID();
    const first = await rpc<{ packs_granted: number; fragments_balance: number }>(db, user, 'exchange_fragments', {
      p_idempotency_key: key,
    });
    const again = await rpc<{ replayed: boolean; packs_granted: number }>(db, user, 'exchange_fragments', {
      p_idempotency_key: key,
    });
    expect(first).toMatchObject({ packs_granted: 1, fragments_balance: 50 });
    expect(again).toMatchObject({ replayed: true, packs_granted: 0 });
    expect(await availablePacks(db, user, 'exploration')).toHaveLength(1);
  });

  it('ne laisse jamais le solde devenir négatif lors d’échanges concurrents', async () => {
    const user = await createUser(db);
    await setFragments(user, 250);
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => rpc(db, user, 'exchange_fragments', { p_idempotency_key: randomUUID() })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect(await scalar<number>(db, 'select fragments from public.player_wallets where user_id = $1', [user])).toBe(50);
    expect(await availablePacks(db, user, 'exploration')).toHaveLength(2);
  });

  it('attribue le paquet quotidien une seule fois par jour, même en cas de requêtes simultanées', async () => {
    const user = await createUser(db);
    expect(await rpc<{ available: boolean }>(db, user, 'get_daily_status')).toMatchObject({ available: true });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => rpc<{ granted: boolean }>(db, user, 'claim_daily_pack')),
    );
    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect(await availablePacks(db, user, 'exploration')).toHaveLength(1);
    expect(await rpc<{ available: boolean }>(db, user, 'get_daily_status')).toMatchObject({ available: false });
  });
});
