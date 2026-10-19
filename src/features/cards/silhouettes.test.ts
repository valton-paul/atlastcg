import silhouettes from './data/silhouettes.json';

const DATA = silhouettes as {
  size: number;
  paths: Record<string, string>;
  capitals: Record<string, { x: number; y: number }>;
};

describe('silhouettes de cartes', () => {
  it('expose un tracé et une capitale pour la France', () => {
    expect(DATA.paths['250']).toMatch(/^M/);
    expect(DATA.capitals['250']).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    );
  });

  it('place Paris dans le quart nord / centre de la silhouette française', () => {
    const paris = DATA.capitals['250']!;
    // ViewBox silhouette 0–100 ; Paris doit rester dans le territoire métropolitain.
    expect(paris.x).toBeGreaterThan(35);
    expect(paris.x).toBeLessThan(70);
    expect(paris.y).toBeGreaterThan(25);
    expect(paris.y).toBeLessThan(55);
  });

  it('couvre la majorité du catalogue avec des capitales projetées', () => {
    const pathCount = Object.keys(DATA.paths).length;
    const capitalCount = Object.keys(DATA.capitals).length;
    expect(pathCount).toBeGreaterThan(190);
    expect(capitalCount).toBeGreaterThan(190);
    expect(capitalCount / pathCount).toBeGreaterThan(0.9);
  });
});
