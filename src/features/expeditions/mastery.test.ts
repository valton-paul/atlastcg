import { masteryNextThreshold, masteryTier } from './mastery';

describe('masteryTier', () => {
  it('classe les paliers selon l’XP', () => {
    expect(masteryTier(0)).toBe('novice');
    expect(masteryTier(49)).toBe('novice');
    expect(masteryTier(50)).toBe('explorer');
    expect(masteryTier(149)).toBe('explorer');
    expect(masteryTier(150)).toBe('expert');
    expect(masteryTier(299)).toBe('expert');
    expect(masteryTier(300)).toBe('master');
  });
});

describe('masteryNextThreshold', () => {
  it('indique le prochain seuil ou null au max', () => {
    expect(masteryNextThreshold(0)).toBe(50);
    expect(masteryNextThreshold(50)).toBe(150);
    expect(masteryNextThreshold(150)).toBe(300);
    expect(masteryNextThreshold(300)).toBeNull();
  });
});
