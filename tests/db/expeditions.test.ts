import { type TestDb, asUser, availablePacks, createTestDb, createUser, giveCards, rpc, scalar } from './support/db';

interface Step {
  id: string;
  position: number;
  kind: string;
  choices: string[] | null;
}
interface StepResult {
  correct: boolean;
  correct_choice: number | null;
  explanation: string;
  state: { completed_steps: number; total_steps: number; status: string };
}

describe('expéditions', () => {
  let db: TestDb;
  let expeditionId: string;

  beforeAll(async () => {
    db = await createTestDb();
    expeditionId = await scalar<string>(db, "select id from public.expeditions where slug = 'expedition-jp'");
  });
  afterAll(() => db.close());

  async function steps(userId: string): Promise<Step[]> {
    return asUser(
      db,
      userId,
      async (c) =>
        (
          await c.query<Step>(
            'select id, position, kind::text, choices from public.expedition_steps where expedition_id = $1 order by position',
            [expeditionId],
          )
        ).rows,
    );
  }

  async function solution(stepId: string): Promise<number> {
    return scalar<number>(db, 'select correct_choice from atlas_private.expedition_step_solutions where step_id = $1', [
      stepId,
    ]);
  }

  async function startedPlayer(): Promise<string> {
    const user = await createUser(db);
    await giveCards(db, user, ['pays-jp']);
    await rpc(db, user, 'start_expedition', { p_expedition_id: expeditionId });
    return user;
  }

  async function finishSteps(user: string) {
    for (const step of await steps(user)) {
      const choice = step.kind === 'discover' ? null : await solution(step.id);
      await rpc(db, user, 'submit_expedition_step', { p_step_id: step.id, p_choice: choice });
    }
  }

  it('est verrouillée tant que le joueur ne possède aucune carte du pays', async () => {
    const user = await createUser(db);
    await expect(rpc(db, user, 'start_expedition', { p_expedition_id: expeditionId })).rejects.toThrow(
      'EXPEDITION_LOCKED',
    );
  });

  it('ne révèle les étapes qu’après le démarrage, et jamais les bonnes réponses', async () => {
    const user = await createUser(db);
    await giveCards(db, user, ['capitale-jp']);
    expect(await steps(user)).toHaveLength(0);
    const state = await rpc<{ status: string; total_steps: number }>(db, user, 'start_expedition', {
      p_expedition_id: expeditionId,
    });
    expect(state).toMatchObject({ status: 'in_progress', total_steps: 3 });
    const visible = await steps(user);
    expect(visible.map((s) => s.kind)).toEqual(['locate', 'discover', 'quiz']);
    expect(Object.keys(visible[0])).not.toContain('correct_choice');
  });

  it('impose l’ordre des étapes', async () => {
    const user = await startedPlayer();
    const [, , quiz] = await steps(user);
    await expect(rpc(db, user, 'submit_expedition_step', { p_step_id: quiz.id, p_choice: 0 })).rejects.toThrow(
      'STEP_LOCKED',
    );
  });

  it('une mauvaise réponse renvoie une explication et permet de réessayer', async () => {
    const user = await startedPlayer();
    const [locate] = await steps(user);
    const correct = await solution(locate.id);
    const wrong = (correct + 1) % (locate.choices?.length ?? 2);

    const miss = await rpc<StepResult>(db, user, 'submit_expedition_step', { p_step_id: locate.id, p_choice: wrong });
    expect(miss).toMatchObject({ correct: false, correct_choice: correct });
    expect(miss.explanation).toContain('Tokyo');
    expect(miss.state.completed_steps).toBe(0);

    const hit = await rpc<StepResult>(db, user, 'submit_expedition_step', { p_step_id: locate.id, p_choice: correct });
    expect(hit.correct).toBe(true);
    expect(hit.state.completed_steps).toBe(1);
    expect(
      await scalar<number>(
        db,
        'select attempts from public.user_expedition_steps where user_id = $1 and step_id = $2',
        [user, locate.id],
      ),
    ).toBe(2);
  });

  it('refuse un choix hors limites', async () => {
    const user = await startedPlayer();
    const [locate] = await steps(user);
    await expect(rpc(db, user, 'submit_expedition_step', { p_step_id: locate.id, p_choice: 9 })).rejects.toThrow(
      'INVALID_CHOICE',
    );
  });

  it('refuse la finalisation tant que les étapes ne sont pas terminées', async () => {
    const user = await startedPlayer();
    await expect(rpc(db, user, 'complete_expedition', { p_expedition_id: expeditionId })).rejects.toThrow(
      'STEPS_INCOMPLETE',
    );
  });

  it('se finalise une seule fois et attribue la récompense une seule fois', async () => {
    const user = await startedPlayer();
    await finishSteps(user);
    const packsBefore = (await availablePacks(db, user)).length;

    const first = await rpc<{ newly_completed: boolean; packs_granted: number }>(db, user, 'complete_expedition', {
      p_expedition_id: expeditionId,
    });
    const second = await rpc<{ newly_completed: boolean; packs_granted: number }>(db, user, 'complete_expedition', {
      p_expedition_id: expeditionId,
    });
    expect(first).toMatchObject({ newly_completed: true, packs_granted: 1 });
    expect(second).toMatchObject({ newly_completed: false, packs_granted: 0 });
    expect((await availablePacks(db, user)).length).toBe(packsBefore + 1);
    await expect(
      rpc(db, user, 'submit_expedition_step', { p_step_id: (await steps(user))[0].id, p_choice: 0 }),
    ).rejects.toThrow('EXPEDITION_ALREADY_COMPLETED');
  });

  it('résiste aux finalisations simultanées', async () => {
    const user = await startedPlayer();
    await finishSteps(user);
    const packsBefore = (await availablePacks(db, user)).length;
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        rpc<{ newly_completed: boolean; packs_granted: number }>(db, user, 'complete_expedition', {
          p_expedition_id: expeditionId,
        }),
      ),
    );
    expect(results.filter((r) => r.newly_completed)).toHaveLength(1);
    expect(results.reduce((acc, r) => acc + r.packs_granted, 0)).toBe(1);
    expect((await availablePacks(db, user)).length).toBe(packsBefore + 1);
  });

  it('interdit de valider une expédition en écrivant directement en base', async () => {
    const user = await startedPlayer();
    await expect(
      asUser(db, user, (c) => c.query("update public.user_expeditions set status = 'completed', completed_at = now()")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('objectifs de découverte', () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.close());

  interface Objective {
    id: string;
    slug: string;
    progress: number;
    target: number;
    claimed: boolean;
  }

  it('calcule la progression côté serveur et refuse une réclamation prématurée', async () => {
    const user = await createUser(db);
    await giveCards(db, user, ['pays-fr', 'pays-jp']);
    const objectives = await rpc<Objective[]>(db, user, 'list_objectives');
    const first = objectives.find((o) => o.slug === 'premiers-pas');
    expect(first).toMatchObject({ progress: 2, target: 10, claimed: false });
    await expect(rpc(db, user, 'claim_objective', { p_objective_id: first?.id })).rejects.toThrow(
      'OBJECTIVE_NOT_COMPLETED',
    );
  });

  it('attribue la récompense une seule fois, même en cas de requêtes simultanées', async () => {
    const user = await createUser(db);
    const slugs = (
      await db.admin.query<{ slug: string }>("select slug from public.cards where category = 'country' limit 10")
    ).rows.map((r) => r.slug);
    await giveCards(db, user, slugs);
    const objective = (await rpc<Objective[]>(db, user, 'list_objectives')).find((o) => o.slug === 'premiers-pas');
    const packsBefore = (await availablePacks(db, user)).length;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        rpc<{ granted: boolean }>(db, user, 'claim_objective', { p_objective_id: objective?.id }),
      ),
    );
    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect((await availablePacks(db, user)).length).toBe(packsBefore + 1);
    const after = (await rpc<Objective[]>(db, user, 'list_objectives')).find((o) => o.slug === 'premiers-pas');
    expect(after?.claimed).toBe(true);
  });

  it('reconnaît la complétion d’une collection', async () => {
    const user = await createUser(db);
    const slugs = (
      await db.admin.query<{ slug: string }>(
        "select c.slug from public.collection_cards cc join public.collections col on col.id = cc.collection_id join public.cards c on c.id = cc.card_id where col.slug = 'pays-europe'",
      )
    ).rows.map((r) => r.slug);
    await giveCards(db, user, slugs.slice(1));
    let album = (await rpc<Objective[]>(db, user, 'list_objectives')).find((o) => o.slug === 'album-pays-europe');
    expect(album?.progress).toBe(0);
    await giveCards(db, user, slugs.slice(0, 1));
    album = (await rpc<Objective[]>(db, user, 'list_objectives')).find((o) => o.slug === 'album-pays-europe');
    expect(album?.progress).toBe(1);
    expect(await rpc<{ granted: boolean }>(db, user, 'claim_objective', { p_objective_id: album?.id })).toMatchObject({
      granted: true,
    });
  });
});
