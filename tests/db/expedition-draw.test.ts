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
      charges: number;
      max_stored: number;
    }>(db, user, 'draw_expedition');

    expect(draw.country_code).toBe('FR');
    expect(draw.draw_id).toBeTruthy();
    expect(draw.replayed).toBe(false);
    expect(draw.already_active).toBe(false);
    expect(draw.charges).toBe(9);
    expect(draw.max_stored).toBe(10);
    expect(draw.iso_numeric).toMatch(/^\d{3}$/);

    const again = await rpc<typeof draw>(db, user, 'draw_expedition');
    expect(again).toMatchObject({
      draw_id: draw.draw_id,
      iso_numeric: draw.iso_numeric,
      expedition_slug: draw.expedition_slug,
      replayed: true,
      charges: 9,
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

  it('bloque sans charge disponible', async () => {
    const user = await createUser(db);

    const countries = await db.admin.query<{ iso: string; expedition_id: string; card_slug: string }>(
      `select e.country_code as iso, e.id as expedition_id, c.slug as card_slug
         from public.expeditions e
         join public.cards c on c.country_code = e.country_code and c.category = 'country' and c.status = 'published'
        where e.status = 'published'
        order by e.country_code
        limit 2`,
    );
    expect(countries.rows.length).toBe(2);

    await giveCards(
      db,
      user,
      countries.rows.map((r) => r.card_slug),
    );

    await db.admin.query(`update public.player_wallets set expedition_charges = 0, expedition_charge_anchor = now() where user_id = $1`, [
      user,
    ]);

    await expect(rpc(db, user, 'draw_expedition')).rejects.toThrow('EXPEDITION_NO_CHARGE');

    const second = countries.rows[1]!;
    await expect(rpc(db, user, 'start_expedition', { p_expedition_id: second.expedition_id })).rejects.toThrow(
      'EXPEDITION_NO_CHARGE',
    );
  });

  it('régénère une charge après l’intervalle', async () => {
    const user = await createUser(db);
    await giveCards(db, user, ['pays-fr']);

    await db.admin.query(
      `update public.player_wallets
          set expedition_charges = 0,
              expedition_charge_anchor = now() - interval '31 minutes'
        where user_id = $1`,
      [user],
    );

    const state = await rpc<{ charges: number; max_stored: number; next_at: string | null }>(
      db,
      user,
      'sync_expedition_charges',
    );
    expect(state.charges).toBe(1);
    expect(state.max_stored).toBe(10);
    expect(state.next_at).toBeTruthy();
  });
});
