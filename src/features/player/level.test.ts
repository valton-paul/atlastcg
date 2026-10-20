import { explorationProgress, xpRequiredForLevelUp } from './level';

describe('progression d’explorateur', () => {
  it('commence au niveau 1 avec 0 XP', () => {
    expect(explorationProgress(0)).toMatchObject({
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 100,
      progress: 0,
    });
  });

  it('passe au niveau 2 à 100 XP', () => {
    expect(explorationProgress(100)).toMatchObject({
      level: 2,
      xpIntoLevel: 0,
      xpForNextLevel: 140,
    });
  });

  it('place correctement une XP partielle dans un niveau', () => {
    const p = explorationProgress(150);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(50);
    expect(p.xpForNextLevel).toBe(140);
    expect(p.progress).toBeCloseTo(50 / 140);
  });

  it('augmente le coût de niveau de 40 XP à chaque palier', () => {
    expect(xpRequiredForLevelUp(1)).toBe(100);
    expect(xpRequiredForLevelUp(2)).toBe(140);
    expect(xpRequiredForLevelUp(3)).toBe(180);
  });
});
