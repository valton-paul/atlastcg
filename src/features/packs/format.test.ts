import { formatProbability } from './format';

describe('formatProbability', () => {
  it('formate les probabilités à la française', () => {
    expect(formatProbability(0.55)).toBe('55\u00a0%');
    expect(formatProbability(0.06)).toBe('6\u00a0%');
    expect(formatProbability(0.015)).toBe('1,5\u00a0%');
    expect(formatProbability(0.01)).toBe('1\u00a0%');
    expect(formatProbability(1)).toBe('100\u00a0%');
  });
});
