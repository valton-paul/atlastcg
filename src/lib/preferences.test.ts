import { DEFAULT_PREFERENCES, parsePreferences, resolveReduceMotion } from './preferences';

describe('préférences de l’appareil', () => {
  it('revient aux valeurs par défaut si le stockage est vide ou corrompu', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{oops')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"motion":"wild","haptics":"yes"}')).toEqual(DEFAULT_PREFERENCES);
  });

  it('relit les préférences enregistrées', () => {
    expect(parsePreferences('{"motion":"reduced","haptics":false}')).toEqual({ motion: 'reduced', haptics: false });
  });

  it('respecte le réglage système sauf choix explicite', () => {
    expect(resolveReduceMotion('system', true)).toBe(true);
    expect(resolveReduceMotion('system', false)).toBe(false);
    expect(resolveReduceMotion('full', true)).toBe(false);
    expect(resolveReduceMotion('reduced', false)).toBe(true);
  });
});
