import { countryAtSvgPoint } from './hit-test';
import mapData from './data/world-map.json';

const MAP = mapData as { countries: { id: string; cx: number; cy: number }[] };
const mali = MAP.countries.find((c) => c.id === '466')!;
const eritrea = MAP.countries.find((c) => c.id === '232')!;

describe('countryAtSvgPoint', () => {
  it('touche le Mali via son centroïde, pas l’Érythrée', () => {
    const selectable = new Set(['466', '232']);
    expect(countryAtSvgPoint(mali.cx, mali.cy, selectable)).toBe('466');
    expect(countryAtSvgPoint(eritrea.cx, eritrea.cy, selectable)).toBe('232');
  });

  it('ignore les pays hors catalogue', () => {
    expect(countryAtSvgPoint(mali.cx, mali.cy, new Set())).toBeNull();
  });

  it('rattache le Groenland au Danemark (Path2D)', () => {
    if (typeof Path2D === 'undefined') return;
    const greenland = MAP.countries.find((c) => c.id === '304')!;
    expect(countryAtSvgPoint(greenland.cx, greenland.cy, new Set(['208']))).toBe('208');
  });
});
