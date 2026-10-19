import { MAP_TERRITORY_OF, resolveMapCountryId } from './territories';

describe('territoires rattachés', () => {
  it('rattache le Groenland au Danemark', () => {
    expect(MAP_TERRITORY_OF['304']).toBe('208');
    expect(resolveMapCountryId('304')).toBe('208');
    expect(resolveMapCountryId('630')).toBe('840');
    expect(resolveMapCountryId('208')).toBe('208');
    expect(resolveMapCountryId('250')).toBe('250');
  });
});
