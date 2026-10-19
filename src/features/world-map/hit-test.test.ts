import {
  countryAtSvgPoint,
  framePointToSvg,
  isTinyMapCountry,
  pathBBoxArea,
  pointInSvgPath,
} from './hit-test';
import mapData from './data/world-map.json';

const MAP = mapData as {
  width: number;
  height: number;
  countries: { id: string; d: string; cx: number; cy: number; name: string }[];
};

function country(id: string) {
  return MAP.countries.find((c) => c.id === id)!;
}

const samples = [
  { id: '250', name: 'France' },
  { id: '276', name: 'Germany' },
  { id: '196', name: 'Cyprus' },
  { id: '840', name: 'United States of America' },
  { id: '076', name: 'Brazil' },
  { id: '032', name: 'Argentina' },
  { id: '156', name: 'China' },
  { id: '710', name: 'South Africa' },
  { id: '036', name: 'Australia' },
  { id: '392', name: 'Japan' },
] as const;

describe('pointInSvgPath', () => {
  it.each(samples)('contient le centroïde de $name', ({ id }) => {
    const c = country(id);
    expect(pointInSvgPath(c.d, c.cx, c.cy)).toBe(true);
  });

  it('ne met pas le centroïde français en Espagne', () => {
    const fr = country('250');
    const es = country('724');
    expect(pointInSvgPath(fr.d, fr.cx, fr.cy)).toBe(true);
    expect(pointInSvgPath(es.d, fr.cx, fr.cy)).toBe(false);
  });
});

describe('countryAtSvgPoint', () => {
  const all = new Set(samples.map((s) => s.id));

  it.each(samples)('sélectionne $name via son centroïde', ({ id }) => {
    expect(countryAtSvgPoint(country(id).cx, country(id).cy, all)).toBe(id);
  });

  it('ignore les pays hors catalogue', () => {
    const mali = country('466');
    expect(countryAtSvgPoint(mali.cx, mali.cy, new Set())).toBeNull();
  });

  it('rattache le Groenland au Danemark', () => {
    const greenland = country('304');
    expect(countryAtSvgPoint(greenland.cx, greenland.cy, new Set(['208']))).toBe('208');
  });

  it('préfère Chypre à la Turquie au centroïde chypriote', () => {
    const cy = country('196');
    expect(countryAtSvgPoint(cy.cx, cy.cy, new Set(['196', '792']))).toBe('196');
  });
});

describe('micro-pays', () => {
  it('classe la France comme grande et les micro-îles comme petites', () => {
    expect(pathBBoxArea(country('250').d)).toBeGreaterThan(500);
    expect(isTinyMapCountry(country('250'))).toBe(false);
    // Chypre ~9, Barbade ~0.5 : marqueur de secours ; Salvador ~28 : vraie silhouette.
    expect(isTinyMapCountry(country('196'))).toBe(true);
    expect(isTinyMapCountry(country('052'))).toBe(true);
    expect(isTinyMapCountry(country('222'))).toBe(false);
  });
});

describe('framePointToSvg', () => {
  it('retrouve le viewBox au centre sans zoom', () => {
    const { svgX, svgY } = framePointToSvg(500, 260, {
      frameWidth: 1000,
      frameHeight: 520,
      mapWidth: 1000,
      mapHeight: 520,
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
    expect(svgX).toBeCloseTo(500, 5);
    expect(svgY).toBeCloseTo(260, 5);
  });

  it('compense un zoom centré', () => {
    // Point layout qui, après scale 2 autour du centre, correspond au centroïde France.
    const fr = country('250');
    const frameW = 1000;
    const frameH = 520;
    const ratio = Math.min(frameW / MAP.width, frameH / MAP.height);
    const offsetX = (frameW - MAP.width * ratio) / 2;
    const offsetY = (frameH - MAP.height * ratio) / 2;
    const layoutX = offsetX + fr.cx * ratio;
    const layoutY = offsetY + fr.cy * ratio;
    const scale = 2;
    const cx = frameW / 2;
    const cy = frameH / 2;
    // Position écran après scale centré sans translation.
    const screenX = cx + (layoutX - cx) * scale;
    const screenY = cy + (layoutY - cy) * scale;
    const { svgX, svgY } = framePointToSvg(screenX, screenY, {
      frameWidth: frameW,
      frameHeight: frameH,
      mapWidth: MAP.width,
      mapHeight: MAP.height,
      scale,
      translateX: 0,
      translateY: 0,
    });
    expect(svgX).toBeCloseTo(fr.cx, 4);
    expect(svgY).toBeCloseTo(fr.cy, 4);
  });
});
