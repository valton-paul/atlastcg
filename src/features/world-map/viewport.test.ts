import { clampTranslation, focusViewport, geometry, MAX_SCALE } from './viewport';

const full = geometry(360, 190);

describe('viewport de la carte', () => {
  it('interdit tout déplacement sans zoom', () => {
    expect(clampTranslation(1, 120, -40, full)).toEqual({ x: 0, y: 0 });
  });

  it('borne le déplacement pour que la carte couvre toujours l’écran', () => {
    expect(clampTranslation(2, 1000, -1000, full)).toEqual({ x: 180, y: -95 });
  });

  it('centre un pays tout en respectant les bornes', () => {
    expect(focusViewport(180, 95, 3, full)).toEqual({ scale: 3, x: 0, y: 0 });
    expect(focusViewport(0, 0, 2, full)).toEqual({ scale: 2, x: 180, y: 95 });
    expect(focusViewport(10, 10, 50, full).scale).toBe(MAX_SCALE);
  });

  it('centre une carte réduite dans le cadre au lieu de la laisser dériver', () => {
    const letterbox = geometry(1000, 600, { contentWidth: 1000, contentHeight: 500 });
    expect(clampTranslation(1, 0, 80, letterbox)).toEqual({ x: 0, y: 0 });
    expect(clampTranslation(2, 0, 1000, letterbox)).toEqual({ x: 0, y: 200 });
  });

  it('amène le pays au centre de la zone laissée libre par le panneau latéral', () => {
    const g = geometry(1000, 500, { insetRight: 400 });
    const v = focusViewport(500, 250, 2, g);
    // Le point se retrouve à x = 300, centre de la zone visible de 600 px.
    expect(500 + (500 - 500) * v.scale + v.x).toBe(300);
    expect(v).toEqual({ scale: 2, x: -200, y: 0 });
  });

  it('peut décaler un pays du bord droit pour qu’il ne soit pas caché par le panneau', () => {
    const g = geometry(1000, 500, { insetRight: 400 });
    const v = focusViewport(980, 250, 2.5, g);
    const screenX = 500 + (980 - 500) * v.scale + v.x;
    expect(screenX).toBeLessThanOrEqual(600);
    expect(clampTranslation(2.5, -10_000, 0, g).x).toBe(500 - 400 - 1250);
  });

  it('remonte un pays au-dessus du panneau du bas', () => {
    const g = geometry(360, 640, { contentHeight: 180, insetBottom: 300 });
    const v = focusViewport(180, 320, 3, g);
    expect(320 + (320 - 320) * v.scale + v.y).toBeCloseTo(170);
  });
});
