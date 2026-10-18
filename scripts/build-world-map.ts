/**
 * Génère les tracés SVG de la carte du monde et des silhouettes de pays à partir de
 * Natural Earth (domaine public) distribué par le paquet `world-atlas`.
 * Le fond est au 1:110m ; les pays du catalogue absents à cette échelle (petits États insulaires,
 * micro-États) sont repris du 1:50m, ou à défaut du 1:10m.
 *   npm run map:build
 */
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import world10m from 'world-atlas/countries-10m.json';
import world110m from 'world-atlas/countries-110m.json';
import world50m from 'world-atlas/countries-50m.json';

const WIDTH = 1000;
const HEIGHT = 520;
const SILHOUETTE = 100;
const ANTARCTICA = '010';

type CountryFeature = Feature<Geometry, { name: string }> & { id: string };

function countriesOf(world: unknown): CountryFeature[] {
  const topology = world as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>;
  return collection.features.filter(
    (f): f is CountryFeature => typeof f.id === 'string' && f.id !== ANTARCTICA,
  );
}

const root = join(__dirname, '..');
const catalogIds: string[] = (
  JSON.parse(readFileSync(join(root, 'content', 'countries.json'), 'utf8')) as { countries: { isoNumeric: string }[] }
).countries.map((c) => c.isoNumeric);

const base = countriesOf(world110m);
const fallbacks = [countriesOf(world50m), countriesOf(world10m)];
const present = new Set(base.map((f) => f.id));
const added: CountryFeature[] = [];
for (const id of catalogIds) {
  if (present.has(id)) continue;
  const found = fallbacks.map((list) => list.find((f) => f.id === id)).find(Boolean);
  if (!found) throw new Error(`Pays ${id} introuvable dans Natural Earth.`);
  added.push(found);
  present.add(id);
}
const features = [...base, ...added];

// La projection reste calée sur le fond 1:110m pour que l'ajout de pays ne déplace pas la carte.
const worldProjection = geoNaturalEarth1().fitExtent(
  [
    [4, 4],
    [WIDTH - 4, HEIGHT - 4],
  ],
  { type: 'FeatureCollection', features: base } as FeatureCollection,
);
const worldPath = geoPath(worldProjection).digits(1);

/** Aire absolue (formule du lacet) d'un anneau déjà projeté. */
function ringArea(ring: [number, number][]): number {
  let sum = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xj, yj] = ring[j]!;
    const [xi, yi] = ring[i]!;
    sum += xj * yi - xi * yj;
  }
  return Math.abs(sum / 2);
}

function projectRing(ring: number[][]): [number, number][] {
  const out: [number, number][] = [];
  for (const c of ring) {
    const p = worldProjection(c as [number, number]);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Pour un MultiPolygon, ne garde que le plus grand polygone (aire absolue du lacet
 * en coordonnées projetées) afin que les territoires d'outre-mer ne tirent pas le
 * centroïde hors du territoire principal (ex. France / Guyane).
 */
function mainLandFeature(f: CountryFeature): CountryFeature {
  const geom = f.geometry;
  if (geom.type !== 'MultiPolygon' || geom.coordinates.length <= 1) return f;

  let best = geom.coordinates[0]!;
  let bestArea = -1;
  for (const polygon of geom.coordinates) {
    const outer = polygon[0];
    if (!outer) continue;
    const area = ringArea(projectRing(outer));
    if (area > bestArea) {
      bestArea = area;
      best = polygon;
    }
  }

  return {
    ...f,
    geometry: { type: 'Polygon', coordinates: best },
  };
}

const countries = features.map((f) => {
  const [cx, cy] = worldPath.centroid(mainLandFeature(f));
  return {
    id: f.id,
    name: f.properties.name,
    d: worldPath(f) ?? '',
    cx: Math.round(cx * 10) / 10,
    cy: Math.round(cy * 10) / 10,
  };
});

const silhouettes: Record<string, string> = {};
for (const f of features) {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [6, 6],
      [SILHOUETTE - 6, SILHOUETTE - 6],
    ],
    f,
  );
  silhouettes[f.id] = geoPath(projection).digits(1)(f) ?? '';
}

writeFileSync(
  join(root, 'src', 'features', 'world-map', 'data', 'world-map.json'),
  JSON.stringify({
    width: WIDTH,
    height: HEIGHT,
    source: 'Natural Earth 1:110m, compléments 1:50m et 1:10m (domaine public)',
    countries,
  }),
);
writeFileSync(
  join(root, 'src', 'features', 'cards', 'data', 'silhouettes.json'),
  JSON.stringify({ size: SILHOUETTE, paths: silhouettes }),
);
console.log(`${countries.length} pays générés, dont ${added.length} repris d'une échelle plus fine.`);
