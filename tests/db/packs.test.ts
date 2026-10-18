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
    // Les doublons sont détruits : un seul exemplaire par carte tirée au moins une fois.
    const owned = await scalar<number>(db, 'select count(*)::int from public.user_cards where user_id = $1', [user]);
    const distinctDrawn = await scalar<number>(
      db,
      `select count(distinct poc.card_id)::int from public.pack_opening_cards poc
         join public.pack_openings po on po.id = poc.opening_id where po.user_id = $1`,
      [user],
    );
    expect(owned).toBe(distinctDrawn);
    expect(await totalCards(db, user)).toBe(owned);
  });

  it('détruit chaque doublon contre le nombre de fragments prévu pour sa rareté', async () => {
    const user = await createUser(db);
    for (let i = 0; i < 6; i++) await grantPack(db, user, 'decouverte');
    const rates = await db.admin.query<{ rarity: string; duplicate_fragments: number }>(
      'select rarity::text, duplicate_fragments from public.rarities',
    );
    const fragmentsFor = new Map(rates.rows.map((r) => [r.rarity, r.duplicate_fragments]));
    let checked = 0;
    for (const packId of await availablePacks(db, user)) {
      const r = await rpc<Opening>(db, user, 'open_pack', { p_user_pack_id: packId, p_idempotency_key: randomUUID() });
      for (const card of r.cards) {
        expect(card.quantity).toBe(1);
        if (!card.is_new) {
          expect(card.fragments_awarded).toBe(fragmentsFor.get(card.rarity));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(
      await scalar<number>(db, 'select count(*)::int from public.user_cards where user_id = $1 and quantity <> 1', [
        user,
      ]),
    ).toBe(0);
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
                (select id from public.pack_definitions where slug = 'exploration'), 2, 5 + 0 * g)
        group by 1`,
    );
    const total = rows.reduce((acc, r) => acc + r.n, 0);
    expect(total).toBe(20000);
    const expected: Record<string, number> = {
      common: 0.547,
      uncommon: 0.27,
      rare: 0.11,
      epic: 0.06,
      legendary: 0.01,
      mythic: 0.003,
    };
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

describe('fragments', () => {
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
});

interface TimerState {
  available: number;
  max_stored: number;
  interval_seconds: number;
  granted: number;
  next_at: string | null;
  server_time: string;
}

describe('paquets régénérés (1 toutes les 10 min, réserve de 15)', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  const sync = (user: string) => rpc<TimerState>(db, user, 'sync_timed_packs');
  const secondsUntilNext = (s: TimerState) => (Date.parse(s.next_at as string) - Date.parse(s.server_time)) / 1000;
  async function rewindTimer(user: string, minutes: number) {
    await db.admin.query(
      'update public.player_wallets set pack_timer_anchor = now() - make_interval(mins => $2) where user_id = $1',
      [user, minutes],
    );
  }

  it('démarre le minuteur à la première synchronisation, sans paquet immédiat', async () => {
    const user = await createUser(db);
    const state = await sync(user);
    expect(state).toMatchObject({ available: 2, max_stored: 15, interval_seconds: 600, granted: 0 });
    expect(secondsUntilNext(state)).toBeCloseTo(600, -1);
  });

  it('attribue un paquet par intervalle écoulé et conserve le temps entamé, une seule fois malgré la concurrence', async () => {
    const user = await createUser(db);
    await sync(user);
    await rewindTimer(user, 25);
    const results = await Promise.all(Array.from({ length: 5 }, () => sync(user)));
    expect(results.reduce((sum, r) => sum + r.granted, 0)).toBe(2);
    expect(await availablePacks(db, user, 'exploration')).toHaveLength(2);
    const state = await sync(user);
    expect(state).toMatchObject({ available: 4, granted: 0 });
    // 25 min écoulées : 2 paquets, et les 5 minutes entamées comptent pour le suivant.
    expect(secondsUntilNext(state)).toBeCloseTo(300, -1);
  });

  it('plafonne la régénération à 15 paquets et suspend le minuteur', async () => {
    const user = await createUser(db);
    await sync(user);
    await rewindTimer(user, 60 * 24 * 10);
    const state = await sync(user);
    expect(state).toMatchObject({ available: 15, granted: 13, next_at: null });
    await rewindTimer(user, 60);
    expect(await sync(user)).toMatchObject({ available: 15, granted: 0, next_at: null });
  });

  it('le temps passé réserve pleine ne produit pas de paquet : ouvrir un paquet relance le minuteur', async () => {
    const user = await createUser(db);
    await sync(user);
    await rewindTimer(user, 60 * 24);
    await sync(user);
    await rewindTimer(user, 60 * 5);
    const [pack] = await availablePacks(db, user);
    await rpc(db, user, 'open_pack', { p_user_pack_id: pack, p_idempotency_key: randomUUID() });
    const state = await sync(user);
    expect(state).toMatchObject({ available: 14, granted: 0 });
    expect(secondsUntilNext(state)).toBeCloseTo(600, -1);
  });

  it('n’empêche jamais les autres récompenses de dépasser le plafond', async () => {
    const user = await createUser(db);
    await sync(user);
    await rewindTimer(user, 60 * 24);
    await sync(user);
    await grantPack(db, user, 'patrimoine');
    expect(await sync(user)).toMatchObject({ available: 16, granted: 0, next_at: null });
  });

  it('refuse toute manipulation du minuteur par le client', async () => {
    const user = await createUser(db);
    await expect(
      asUser(db, user, (c) =>
        c.query("update public.player_wallets set pack_timer_anchor = now() - interval '1 year'"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(asAnon(db, (c) => c.query('select public.sync_timed_packs()'))).rejects.toThrow(/permission denied/);
  });
});
