import { buildDrawSequence, drawStepDelay } from './draw';

describe('buildDrawSequence', () => {
  it('termine toujours sur le pays tiré par le serveur', () => {
    const sequence = buildDrawSequence('392', ['250', '380', '724', '392'], 20);
    expect(sequence).toHaveLength(20);
    expect(sequence.at(-1)).toBe('392');
  });

  it('fonctionne même si le pool est vide hors gagnant', () => {
    expect(buildDrawSequence('250', [], 5)).toEqual(['250', '250', '250', '250', '250']);
  });
});

describe('drawStepDelay', () => {
  it('ralentit vers la fin', () => {
    expect(drawStepDelay(0, 20)).toBeLessThan(drawStepDelay(19, 20));
  });
});
