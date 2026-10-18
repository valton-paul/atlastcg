/**
 * Parcours principal de bout en bout, côté serveur, avec les mêmes appels que l'application :
 * créer un compte → recevoir un paquet → l'ouvrir → retrouver ses cartes → consulter un pays →
 * démarrer une expédition → se reconnecter et retrouver sa progression.
 */
import { type TestDb, asUser, createTestDb, createUser, randomUUID, rpc } from './support/db';

describe('parcours principal', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  it('fonctionne de bout en bout et persiste après reconnexion', async () => {
    // 1. Inscription (déclenche l'initialisation) puis premier lancement.
    const user = await createUser(db, { displayName: 'Exploratrice' });
    const profile = await rpc<{ display_name: string }>(db, user, 'ensure_player_initialized');
    expect(profile.display_name).toBe('Exploratrice');

    // 2. Paquets disponibles, tels que lus par l'écran d'accueil.
    const packs = await asUser(
      db,
      user,
      async (c) =>
        (
          await c.query<{ id: string; slug: string }>(
            `select up.id, p.slug from public.user_packs up join public.pack_definitions p on p.id = up.pack_id
            where up.status = 'available' order by up.created_at`,
          )
        ).rows,
    );
    expect(packs.map((p) => p.slug)).toEqual(['decouverte', 'decouverte']);

    // 3. Ouverture.
    const opening = await rpc<{ cards: { card_id: string; country_code: string }[] }>(db, user, 'open_pack', {
      p_user_pack_id: packs[0].id,
      p_idempotency_key: randomUUID(),
    });
    expect(opening.cards).toHaveLength(5);

    // 4. Collection et fiche carte (contenu éditorial débloqué).
    const collection = await asUser(
      db,
      user,
      async (c) =>
        (
          await c.query<{ card_id: string; discovery_text: string | null }>(
            `select uc.card_id, cc.discovery_text from public.user_cards uc
             left join public.card_contents cc on cc.card_id = uc.card_id`,
          )
        ).rows,
    );
    expect(new Set(collection.map((c) => c.card_id))).toEqual(new Set(opening.cards.map((c) => c.card_id)));
    expect(collection.every((c) => c.discovery_text)).toBe(true);

    // 5. Fiche pays et expédition du premier pays obtenu.
    const country = opening.cards[0].country_code;
    const expedition = await asUser(
      db,
      user,
      async (c) =>
        (await c.query<{ id: string }>('select id from public.expeditions where country_code = $1', [country])).rows[0],
    );
    await rpc(db, user, 'start_expedition', { p_expedition_id: expedition.id });
    const [locate] = await asUser(
      db,
      user,
      async (c) =>
        (
          await c.query<{ id: string }>(
            'select id from public.expedition_steps where expedition_id = $1 order by position',
            [expedition.id],
          )
        ).rows,
    );
    const answer = (
      await db.admin.query<{ correct_choice: number }>(
        'select correct_choice from atlas_private.expedition_step_solutions where step_id = $1',
        [locate.id],
      )
    ).rows[0].correct_choice;
    await rpc(db, user, 'submit_expedition_step', { p_step_id: locate.id, p_choice: answer });

    // 6. « Fermeture » puis nouvelle session : tout est relu depuis le serveur.
    const afterRestart = await asUser(db, user, async (c) => {
      const cards = (await c.query('select 1 from public.user_cards')).rows.length;
      const remaining = (await c.query("select 1 from public.user_packs where status = 'available'")).rows.length;
      const progress = (
        await c.query<{ status: string; done: number }>(
          `select ue.status::text, (select count(*)::int from public.user_expedition_steps s
             where s.expedition_id = ue.expedition_id and s.completed_at is not null) as done
             from public.user_expeditions ue`,
        )
      ).rows;
      return { cards, remaining, progress };
    });
    expect(afterRestart.cards).toBe(collection.length);
    expect(afterRestart.remaining).toBe(1);
    expect(afterRestart.progress).toEqual([{ status: 'in_progress', done: 1 }]);
  });
});
