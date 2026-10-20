import type { OpeningResult } from './api';
import { bestRarity, initialOpeningState, openingReducer, revealOrder, type OpeningState } from './opening-machine';

function result(replayed = false): OpeningResult {
  const base = {
    card_id: '00000000-0000-4000-8000-000000000001',
    subtitle: null,
    category: 'country' as const,
    country_code: 'FR',
    illustration_path: null,
    is_new: true,
    quantity: 1,
    fragments_awarded: 0,
    xp_awarded: 0,
  };
  return {
    opening_id: '00000000-0000-4000-8000-0000000000aa',
    user_pack_id: '00000000-0000-4000-8000-0000000000bb',
    pack: { slug: 'classique', name: 'Classique' },
    configuration_version: 1,
    opened_at: '2026-01-01T00:00:00Z',
    cards: [
      { ...base, slot: 1, slug: 'a', title: 'A', rarity: 'common' },
      { ...base, slot: 2, slug: 'b', title: 'B', rarity: 'rare' },
    ],
    summary: {
      new_count: 2,
      duplicate_count: 0,
      rare_count: 1,
      fragments_awarded: 0,
      xp_awarded: 0,
      fragments_balance: 0,
      collections: [],
    },
    replayed,
  };
}

function run(events: Parameters<typeof openingReducer>[1][], from: OpeningState = initialOpeningState) {
  return events.reduce(openingReducer, from);
}

describe('openingReducer', () => {
  it('déroule paquet scellé → ouverture → révélation carte par carte → récapitulatif', () => {
    let state = run([{ type: 'OPEN' }, { type: 'RESOLVED', result: result() }]);
    expect(state).toMatchObject({ phase: 'revealing', index: 0, flipped: false });
    state = run([{ type: 'NEXT' }], state);
    expect(state).toMatchObject({ index: 0, flipped: true });
    state = run([{ type: 'NEXT' }, { type: 'FLIP' }], state);
    expect(state).toMatchObject({ index: 1, flipped: true });
    state = run([{ type: 'NEXT' }], state);
    expect(state.phase).toBe('summary');
  });

  it('ignore une seconde demande d’ouverture pendant la requête (double toucher)', () => {
    const opening = run([{ type: 'OPEN' }]);
    expect(run([{ type: 'OPEN' }], opening)).toBe(opening);
  });

  it('permet de passer l’animation à tout moment', () => {
    const state = run([{ type: 'OPEN' }, { type: 'RESOLVED', result: result() }, { type: 'SKIP' }]);
    expect(state.phase).toBe('summary');
  });

  it('affiche directement le récapitulatif d’un paquet déjà ouvert (rejeu)', () => {
    expect(run([{ type: 'OPEN' }, { type: 'RESOLVED', result: result(true) }]).phase).toBe('summary');
  });

  it('autorise une nouvelle tentative après une erreur', () => {
    const failed = run([{ type: 'OPEN' }, { type: 'FAILED', message: 'Réseau', retryable: true }]);
    expect(failed.phase).toBe('error');
    expect(run([{ type: 'OPEN' }], failed).phase).toBe('opening');
  });

  it('rejoue la mise en scène sans nouvel appel serveur', () => {
    const summary = run([{ type: 'OPEN' }, { type: 'RESOLVED', result: result() }, { type: 'SKIP' }]);
    const replay = run([{ type: 'REPLAY' }], summary);
    expect(replay).toMatchObject({ phase: 'revealing', index: 0 });
    if (replay.phase === 'revealing' && summary.phase === 'summary') expect(replay.result).toBe(summary.result);
  });

  it('ignore un résultat arrivé hors de la phase d’ouverture', () => {
    expect(run([{ type: 'RESOLVED', result: result() }])).toBe(initialOpeningState);
  });
});

describe('revealOrder', () => {
  it('révèle la carte la plus rare en dernier', () => {
    const ranks: Record<string, number> = { common: 1, rare: 3, legendary: 5 };
    const ordered = revealOrder(
      [
        { slot: 1, rarity: 'legendary' },
        { slot: 2, rarity: 'common' },
        { slot: 3, rarity: 'rare' },
        { slot: 4, rarity: 'common' },
      ],
      (r) => ranks[r],
    );
    expect(ordered.map((c) => c.slot)).toEqual([2, 4, 3, 1]);
  });
});

describe('bestRarity', () => {
  const ranks: Record<string, number> = { common: 1, rare: 3, legendary: 5, mythic: 6 };
  it('retient la rareté la plus élevée du tirage', () => {
    const cards = [{ rarity: 'common' }, { rarity: 'mythic' }, { rarity: 'rare' }];
    expect(bestRarity(cards, (r) => ranks[r])).toBe('mythic');
  });
  it('renvoie null pour un tirage vide', () => {
    expect(bestRarity([], (r) => ranks[r])).toBeNull();
  });
});
