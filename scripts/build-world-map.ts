/**
 * Génère les tracés SVG de la carte du monde et des silhouettes de pays à partir de
 * Natural Earth 1:110m (domaine public) distribué par le paquet `world-atlas`.
 *   npm run map:build
 */
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import world from 'world-atlas/countries-110m.json';

const WIDTH = 1000;
const HEIGHT = 520;
const SILHOUETTE = 100;
const ANTARCTICA = '010';

type CountryFeature = Feature<Geometry, { name: string }>;

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>;
const features = collection.features.filter(
  (f): f is CountryFeature & { id: string } => typeof f.id === 'string' && f.id !== ANTARCTICA,
);

const worldProjection = geoNaturalEarth1().fitExtent(
  [
    [4, 4],
    [WIDTH - 4, HEIGHT - 4],
  ],
  { type: 'FeatureCollection', features } as FeatureCollection,
);
const worldPath = geoPath(worldProjection).digits(1);

const countries = features.map((f) => {
  const [cx, cy] = worldPath.centroid(f);
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

const root = join(__dirname, '..');
writeFileSync(
  join(root, 'src', 'features', 'world-map', 'data', 'world-map.json'),
  JSON.stringify({ width: WIDTH, height: HEIGHT, source: 'Natural Earth 1:110m (domaine public)', countries }),
);
writeFileSync(
  join(root, 'src', 'features', 'cards', 'data', 'silhouettes.json'),
  JSON.stringify({ size: SILHOUETTE, paths: silhouettes }),
);
console.log(`${countries.length} pays générés.`);
