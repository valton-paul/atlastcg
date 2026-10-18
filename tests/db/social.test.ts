import { type TestDb, asUser, createTestDb, createUser, giveCards, rpc, scalar } from './support/db';

interface FriendList {
  friends: { friendship_id: string; display_name: string; public_code: string }[];
  incoming: { friendship_id: string; display_name: string }[];
  outgoing: { friendship_id: string }[];
}
interface Challenge {
  challenge_id: string;
  invite_code: string | null;
  questions: { position: number; prompt: string; choices: string[] }[];
  participants: { display_name: string; completed: boolean; score: number | null; is_me: boolean }[];
  my_result: { score: number } | null;
}

describe('amis et comparaison', () => {
  let db: TestDb;
  let alice: string;
  let bob: string;
  let carol: string;
  const code = (id: string) => scalar<string>(db, 'select public_code from public.profiles where id = $1', [id]);

  beforeAll(async () => {
    db = await createTestDb();
    alice = await createUser(db, { displayName: 'Alice' });
    bob = await createUser(db, { displayName: 'Bob' });
    carol = await createUser(db, { displayName: 'Carol' });
    await giveCards(db, alice, ['pays-fr', 'capitale-fr', 'tour-eiffel']);
  });
  afterAll(() => db.close());

  it('envoie, liste et accepte une demande via le code public', async () => {
    await expect(rpc(db, alice, 'send_friend_request', { p_public_code: 'ZZZZZZZZ' })).rejects.toThrow(
      'FRIEND_CODE_NOT_FOUND',
    );
    await expect(rpc(db, alice, 'send_friend_request', { p_public_code: await code(alice) })).rejects.toThrow(
      'CANNOT_FRIEND_SELF',
    );
    const sent = await rpc<{ status: string }>(db, alice, 'send_friend_request', {
      p_public_code: (await code(bob)).toLowerCase(),
    });
    expect(sent.status).toBe('pending');

    const bobList = await rpc<FriendList>(db, bob, 'list_friends');
    expect(bobList.incoming.map((f) => f.display_name)).toEqual(['Alice']);
    expect(JSON.stringify(bobList)).not.toContain(alice);

    await expect(
      rpc(db, alice, 'respond_friend_request', { p_friendship_id: bobList.incoming[0].friendship_id, p_accept: true }),
    ).rejects.toThrow('FRIEND_REQUEST_NOT_FOUND');
    await rpc(db, bob, 'respond_friend_request', {
      p_friendship_id: bobList.incoming[0].friendship_id,
      p_accept: true,
    });
    expect((await rpc<FriendList>(db, alice, 'list_friends')).friends.map((f) => f.display_name)).toEqual(['Bob']);
  });

  it('accepte automatiquement une demande croisée', async () => {
    await rpc(db, carol, 'send_friend_request', { p_public_code: await code(bob) });
    const result = await rpc<{ status: string }>(db, bob, 'send_friend_request', { p_public_code: await code(carol) });
    expect(result.status).toBe('accepted');
  });

  it('ne compare que des statistiques agrégées, entre amis, selon la visibilité choisie', async () => {
    const comparison = await rpc<{
      friend: { visible: boolean; stats: { cards_owned: number } | null };
      me: { cards_owned: number };
    }>(db, bob, 'get_friend_comparison', { p_public_code: await code(alice) });
    expect(comparison.friend.visible).toBe(true);
    expect(comparison.friend.stats?.cards_owned).toBe(3);
    expect(JSON.stringify(comparison)).not.toContain('tour-eiffel');

    await asUser(db, alice, (c) => c.query("update public.profiles set collection_visibility = 'private'"));
    const hidden = await rpc<{ friend: { visible: boolean; stats: unknown } }>(db, bob, 'get_friend_comparison', {
      p_public_code: await code(alice),
    });
    expect(hidden.friend).toMatchObject({ visible: false, stats: null });

    await expect(rpc(db, carol, 'get_friend_comparison', { p_public_code: await code(alice) })).rejects.toThrow(
      'NOT_FRIENDS',
    );
  });

  it('interdit la lecture directe des tables sociales', async () => {
    for (const table of ['friendships', 'challenges', 'challenge_questions', 'challenge_participants']) {
      await expect(asUser(db, alice, (c) => c.query(`select 1 from public.${table}`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });

  it('permet de retirer un ami', async () => {
    const [friendship] = (await rpc<FriendList>(db, carol, 'list_friends')).friends;
    await rpc(db, carol, 'remove_friend', { p_friendship_id: friendship.friendship_id });
    expect((await rpc<FriendList>(db, carol, 'list_friends')).friends).toEqual([]);
  });
});

describe('défis asynchrones', () => {
  let db: TestDb;
  let alice: string;
  let bob: string;
  let mallory: string;

  beforeAll(async () => {
    db = await createTestDb();
    alice = await createUser(db, { displayName: 'Alice' });
    bob = await createUser(db, { displayName: 'Bob' });
    mallory = await createUser(db, { displayName: 'Mallory' });
    const bobCode = await scalar<string>(db, 'select public_code from public.profiles where id = $1', [bob]);
    await rpc(db, alice, 'send_friend_request', { p_public_code: bobCode });
    const { incoming } = await rpc<FriendList>(db, bob, 'list_friends');
    await rpc(db, bob, 'respond_friend_request', { p_friendship_id: incoming[0].friendship_id, p_accept: true });
  });
  afterAll(() => db.close());

  async function bobCode() {
    return scalar<string>(db, 'select public_code from public.profiles where id = $1', [bob]);
  }

  it("refuse d'inviter un joueur qui n'est pas ami", async () => {
    const malloryCode = await scalar<string>(db, 'select public_code from public.profiles where id = $1', [mallory]);
    await expect(
      rpc(db, alice, 'create_challenge', { p_type: 'capitals', p_continent: null, p_friend_codes: [malloryCode] }),
    ).rejects.toThrow('NOT_FRIENDS');
  });

  it('crée un défi, le fait jouer à un ami et note les réponses côté serveur', async () => {
    const { challenge_id } = await rpc<{ challenge_id: string }>(db, alice, 'create_challenge', {
      p_type: 'capitals',
      p_continent: 'europe',
      p_friend_codes: [await bobCode()],
    });

    const forBob = await rpc<Challenge>(db, bob, 'get_challenge', { p_challenge_id: challenge_id });
    expect(forBob.questions).toHaveLength(5);
    expect(forBob.invite_code).toBeNull();
    expect(JSON.stringify(forBob)).not.toContain('correct');
    expect(forBob.questions[0].prompt).toMatch(/^Quelle est la capitale (de la|du|des|de l')/);

    const solutions = (
      await db.admin.query<{ correct_choice: number }>(
        'select correct_choice from atlas_private.challenge_solutions where challenge_id = $1 order by position',
        [challenge_id],
      )
    ).rows.map((r) => r.correct_choice);

    const answers = solutions.map((s, i) => (i < 3 ? s : (s + 1) % 4));
    const result = await rpc<{ score: number; total: number }>(db, bob, 'submit_challenge', {
      p_challenge_id: challenge_id,
      p_answers: answers,
    });
    expect(result).toMatchObject({ score: 3, total: 5 });
    await expect(
      rpc(db, bob, 'submit_challenge', { p_challenge_id: challenge_id, p_answers: solutions }),
    ).rejects.toThrow('CHALLENGE_ALREADY_COMPLETED');

    const forAlice = await rpc<Challenge>(db, alice, 'get_challenge', { p_challenge_id: challenge_id });
    const bobRow = forAlice.participants.find((p) => p.display_name === 'Bob');
    expect(bobRow).toMatchObject({ completed: true, score: null });
    await rpc(db, alice, 'submit_challenge', { p_challenge_id: challenge_id, p_answers: solutions });
    const afterAlice = await rpc<Challenge>(db, alice, 'get_challenge', { p_challenge_id: challenge_id });
    expect(afterAlice.participants.find((p) => p.display_name === 'Bob')?.score).toBe(3);
    expect(afterAlice.my_result?.score).toBe(5);
  });

  it('refuse les accès non autorisés et les réponses invalides', async () => {
    const { challenge_id } = await rpc<{ challenge_id: string }>(db, alice, 'create_challenge', {
      p_type: 'continents',
    });
    await expect(rpc(db, mallory, 'get_challenge', { p_challenge_id: challenge_id })).rejects.toThrow(
      'CHALLENGE_NOT_FOUND',
    );
    await expect(
      rpc(db, alice, 'submit_challenge', { p_challenge_id: challenge_id, p_answers: [0, 1] }),
    ).rejects.toThrow('INVALID_ARGUMENT');
    await expect(
      rpc(db, alice, 'submit_challenge', { p_challenge_id: challenge_id, p_answers: [7, 0, 0, 0, 0] }),
    ).rejects.toThrow('INVALID_CHOICE');
  });

  it('accepte un lien valide, refuse un lien révoqué ou expiré', async () => {
    const created = await rpc<{ challenge_id: string; invite_code: string }>(db, alice, 'create_challenge', {
      p_type: 'continents',
    });
    await rpc(db, mallory, 'join_challenge', { p_invite_code: created.invite_code });
    expect(
      (await rpc<Challenge>(db, mallory, 'get_challenge', { p_challenge_id: created.challenge_id })).questions,
    ).toHaveLength(5);

    await expect(rpc(db, bob, 'revoke_challenge_link', { p_challenge_id: created.challenge_id })).rejects.toThrow(
      'CHALLENGE_NOT_FOUND',
    );
    await rpc(db, alice, 'revoke_challenge_link', { p_challenge_id: created.challenge_id });
    await expect(rpc(db, bob, 'join_challenge', { p_invite_code: created.invite_code })).rejects.toThrow(
      'CHALLENGE_LINK_INVALID',
    );

    const expired = await rpc<{ challenge_id: string; invite_code: string }>(db, alice, 'create_challenge', {
      p_type: 'capitals',
    });
    await db.admin.query(
      "update public.challenges set created_at = now() - interval '9 days', expires_at = now() - interval '1 day' where id = $1",
      [expired.challenge_id],
    );
    await expect(rpc(db, bob, 'join_challenge', { p_invite_code: expired.invite_code })).rejects.toThrow(
      'CHALLENGE_LINK_INVALID',
    );
    await expect(
      rpc(db, alice, 'submit_challenge', { p_challenge_id: expired.challenge_id, p_answers: [0, 0, 0, 0, 0] }),
    ).rejects.toThrow('CHALLENGE_EXPIRED');
  });

  it('refuse un continent trop petit pour un défi de capitales', async () => {
    await expect(rpc(db, alice, 'create_challenge', { p_type: 'capitals', p_continent: 'oceania' })).rejects.toThrow(
      'CHALLENGE_POOL_TOO_SMALL',
    );
    await expect(rpc(db, alice, 'create_challenge', { p_type: 'flags' })).rejects.toThrow('INVALID_ARGUMENT');
  });
});
