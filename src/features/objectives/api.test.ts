import { isClaimable, nextObjective, type Objective } from './api';

function objective(slug: string, progress: number, target: number, claimed = false): Objective {
  return {
    id: `00000000-0000-4000-8000-${slug.padStart(12, '0')}`,
    slug,
    title: slug,
    description: '',
    kind: 'cards_owned',
    target,
    progress,
    claimed,
    collection_slug: null,
    reward: { pack_slug: 'classique', pack_name: 'Classique', quantity: 1 },
  };
}

describe('objectifs', () => {
  it('met en avant une récompense à récupérer', () => {
    const list = [objective('1', 9, 10), objective('2', 5, 5), objective('3', 0, 3)];
    expect(nextObjective(list)?.slug).toBe('2');
    expect(isClaimable(list[1])).toBe(true);
  });

  it('sinon, l’objectif le plus proche du but', () => {
    expect(nextObjective([objective('1', 1, 10), objective('2', 4, 5)])?.slug).toBe('2');
  });

  it('ne propose rien quand tout est récupéré', () => {
    expect(nextObjective([objective('1', 10, 10, true)])).toBeNull();
    expect(isClaimable(objective('1', 10, 10, true))).toBe(false);
  });
});
