import { type TestDb, createTestDb, createUser, giveCards, rpc, scalar } from './support/db';

describe('tirage d’expédition', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('exige au moins une carte du pays et tire uniquement parmi les pays découverts', async () => {
    const user = await createUser(db);

    await expect(rpc(db, user, 'draw_expedition')).rejects.toThrow('EXPEDITION_POOL_EMPTY');

    await giveCards(db, user, ['pays-fr']);
    const draw = await rpc<{
      draw_id: string;
      country_code: string;
      iso_numeric: string;
      expedition_slug: string;
      replayed: boolean;
      already_active: boolean;
      daily_remaining: number;
    }>(db, user, 'draw_expedition');

    expect(draw.country_code).toBe('FR');
    expect(draw.draw_id).toBeTruthy();
    expect(draw.replayed).toBe(false);
    expect(draw.already_active).toBe(false);
    expect(draw.daily_remaining).toBe(2);
    expect(draw.iso_numeric).toMatch(/^\d{3}$/);

    const again = await rpc<typeof draw>(db, user, 'draw_expedition');
    expect(again).toMatchObject({
      draw_id: draw.draw_id,
      iso_numeric: draw.iso_numeric,
      expedition_slug: draw.expedition_slug,
      replayed: true,
    });

    await rpc(db, user, 'reveal_expedition_draw', { p_draw_id: draw.draw_id });
    expect(
      await scalar<string>(db, "select status::text from public.expedition_draws where id = $1", [draw.draw_id]),
    ).toBe('revealed');

    // Expédition déjà en cours : pas de nouveau tirage.
    const active = await rpc<typeof draw>(db, user, 'draw_expedition');
    expect(active.already_active).toBe(true);
    expect(active.draw_id).toBeNull();
    expect(active.expedition_slug).toBe(draw.expedition_slug);
  });

  it('bloque après 3 expéditions démarrées le même jour UTC', async () => {
    const user = await createUser(db);

    // 3 pays découverts dont les expéditions sont déjà comptées aujourd’hui,
    // + un 4ᵉ pays découvert pour tenter un nouveau démarrage.
    const countries = await db.admin.query<{ iso: string; expedition_id: string; card_slug: string }>(
      `select e.country_code as iso, e.id as expedition_id, c.slug as card_slug
         from public.expeditions e
         join public.cards c on c.country_code = e.country_code and c.category = 'country' and c.status = 'published'
        where e.status = 'published'
        order by e.country_code
        limit 4`,
    );
    expect(countries.rows.length).toBe(4);

    await giveCards(
      db,
      user,
      countries.rows.map((r) => r.card_slug),
    );

    for (const row of countries.rows.slice(0, 3)) {
      await db.admin.query(
        `insert into public.user_expeditions (user_id, expedition_id, status, started_at, completed_at)
         values ($1, $2, 'completed', now(), now())`,
        [user, row.expedition_id],
      );
    }

    await expect(rpc(db, user, 'draw_expedition')).rejects.toThrow('EXPEDITION_DAILY_LIMIT');

    const fourth = countries.rows[3]!;
    await expect(rpc(db, user, 'start_expedition', { p_expedition_id: fourth.expedition_id })).rejects.toThrow(
      'EXPEDITION_DAILY_LIMIT',
    );
  });
});
