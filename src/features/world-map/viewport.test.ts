import { clampTranslation, focusViewport, MAX_SCALE } from './viewport';

describe('viewport de la carte', () => {
  it('interdit tout déplacement sans zoom', () => {
    expect(clampTranslation(1, 120, -40, 360, 190)).toEqual({ x: 0, y: 0 });
  });

  it('borne le déplacement pour que la carte couvre toujours l’écran', () => {
    expect(clampTranslation(2, 1000, -1000, 360, 190)).toEqual({ x: 180, y: -95 });
  });

  it('centre un pays tout en respectant les bornes', () => {
    const v = focusViewport(180, 95, 3, 360, 190);
    expect(v).toEqual({ scale: 3, x: 0, y: 0 });
    const corner = focusViewport(0, 0, 2, 360, 190);
    expect(corner).toEqual({ scale: 2, x: 180, y: 95 });
    expect(focusViewport(10, 10, 50, 360, 190).scale).toBe(MAX_SCALE);
  });
});
