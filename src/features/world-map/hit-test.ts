import mapData from './data/world-map.json';

import { resolveMapCountryId } from './territories';

type MapCountry = { id: string; name: string; d: string; cx: number; cy: number };
const MAP = mapData as { width: number; height: number; countries: MapCountry[] };

/**
 * Aire en dessous de laquelle un marqueur de secours est utile (micro-États, îles).
 * Gardé bas pour ne pas élargir artificiellement Salvador, Haïti, Belize… :
 * leur vraie silhouette reste cliquable ; le zoom fine la précision.
 */
export const TINY_COUNTRY_AREA = 16;

/** Rayon SVG du marqueur de secours pour les tout petits pays (évite les chevauchements caraïbes). */
export const TINY_MARKER_R = 4.5;

const TINY_MARKER_R2 = TINY_MARKER_R * TINY_MARKER_R;

type Ring = { xs: number[]; ys: number[] };
type ParsedPath = { rings: Ring[]; bboxArea: number };

const pathCache = new Map<string, ParsedPath>();

/** Parse un path SVG M/L/Z (format de la carte) en anneaux utilisables pour un ray-cast. */
export function parseSvgPath(d: string): ParsedPath {
  const cached = pathCache.get(d);
  if (cached) return cached;

  const rings: Ring[] = [];
  let xs: number[] = [];
  let ys: number[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const flush = () => {
    if (xs.length >= 3) {
      rings.push({ xs, ys });
      for (let i = 0; i < xs.length; i++) {
        minX = Math.min(minX, xs[i]!);
        maxX = Math.max(maxX, xs[i]!);
        minY = Math.min(minY, ys[i]!);
        maxY = Math.max(maxY, ys[i]!);
      }
    }
    xs = [];
    ys = [];
  };

  const tokens = d.match(/[MLZmlz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let mode: 'M' | 'L' | null = null;
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token === 'M' || token === 'm') {
      flush();
      mode = 'M';
      i += 1;
      continue;
    }
    if (token === 'L' || token === 'l') {
      mode = 'L';
      i += 1;
      continue;
    }
    if (token === 'Z' || token === 'z') {
      flush();
      mode = null;
      i += 1;
      continue;
    }
    const x = Number(token);
    const y = Number(tokens[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || mode === null) {
      i += 1;
      continue;
    }
    xs.push(x);
    ys.push(y);
    if (mode === 'M') mode = 'L';
    i += 2;
  }
  flush();

  const bboxArea = Number.isFinite(minX) ? Math.max(0, (maxX - minX) * (maxY - minY)) : Number.POSITIVE_INFINITY;
  const parsed = { rings, bboxArea };
  pathCache.set(d, parsed);
  return parsed;
}

/** Aire approximative du bbox (classement des tailles / micro-pays). */
export function pathBBoxArea(d: string): number {
  return parseSvgPath(d).bboxArea;
}

export function isTinyMapCountry(country: Pick<MapCountry, 'd'>): boolean {
  return pathBBoxArea(country.d) < TINY_COUNTRY_AREA;
}

/** Point dans un polygone (ray casting), anneaux M/L/Z de la carte. */
export function pointInSvgPath(d: string, x: number, y: number): boolean {
  const { rings } = parseSvgPath(d);
  for (const ring of rings) {
    if (pointInRing(ring, x, y)) return true;
  }
  return false;
}

function pointInRing(ring: Ring, x: number, y: number): boolean {
  const { xs, ys } = ring;
  const n = xs.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = xs[i]!;
    const yi = ys[i]!;
    const xj = xs[j]!;
    const yj = ys[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Convertit un point dans le cadre de la carte (coords layout)
 * en viewBox SVG, en inversant pan/zoom centrés + letterboxing « meet ».
 */
export function framePointToSvg(
  localX: number,
  localY: number,
  opts: {
    frameWidth: number;
    frameHeight: number;
    mapWidth: number;
    mapHeight: number;
    scale: number;
    translateX: number;
    translateY: number;
  },
): { svgX: number; svgY: number } {
  const { frameWidth, frameHeight, mapWidth, mapHeight, scale, translateX, translateY } = opts;
  const cx = frameWidth / 2;
  const cy = frameHeight / 2;
  // Inverse de : translate puis scale autour du centre du cadre.
  const unscaledX = cx + (localX - cx - translateX) / scale;
  const unscaledY = cy + (localY - cy - translateY) / scale;
  const ratio = Math.min(frameWidth / mapWidth, frameHeight / mapHeight);
  const offsetX = (frameWidth - mapWidth * ratio) / 2;
  const offsetY = (frameHeight - mapHeight * ratio) / 2;
  return {
    svgX: (unscaledX - offsetX) / ratio,
    svgY: (unscaledY - offsetY) / ratio,
  };
}

/**
 * Convertit un point écran (clientX/clientY) en coordonnées du viewBox SVG via la CTM.
 * Prend en compte pan, zoom et letterboxing sans les recalculer à la main (web).
 */
export function clientToSvg(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
): { svgX: number; svgY: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const local = pt.matrixTransform(ctm.inverse());
  return { svgX: local.x, svgY: local.y };
}

/**
 * Sur le web : lit l’attribut `data-country` sous le pointeur (ordre d’empilement DOM).
 * Ignore les calques Gesture Handler / overlays au-dessus de la carte.
 */
export function countryFromDomPoint(clientX: number, clientY: number, selectable: ReadonlySet<string>): string | null {
  if (typeof document === 'undefined' || typeof document.elementsFromPoint !== 'function') return null;
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (!(el instanceof Element)) continue;
    const node = el.closest?.('[data-country]') ?? el;
    const id = node.getAttribute?.('data-country');
    if (id && selectable.has(id)) return id;
  }
  return null;
}

/** Pays du catalogue sous le point SVG (point-in-polygon ; micro-pays en secours). */
export function countryAtSvgPoint(svgX: number, svgY: number, selectable: ReadonlySet<string>): string | null {
  let hit: string | null = null;
  let hitArea = Number.POSITIVE_INFINITY;

  for (const country of MAP.countries) {
    const ownerId = resolveMapCountryId(country.id);
    if (!selectable.has(ownerId)) continue;
    if (!pointInSvgPath(country.d, svgX, svgY)) continue;
    // En cas de chevauchement, le plus petit pays gagne (Chypre vs Turquie, etc.).
    const area = pathBBoxArea(country.d);
    if (area < hitArea) {
      hitArea = area;
      hit = ownerId;
    }
  }
  if (hit) return hit;

  let markerHit: string | null = null;
  let markerDist = TINY_MARKER_R2;
  for (const country of MAP.countries) {
    const ownerId = resolveMapCountryId(country.id);
    if (!selectable.has(ownerId)) continue;
    if (ownerId !== country.id) continue;
    if (!isTinyMapCountry(country)) continue;
    const d = (svgX - country.cx) ** 2 + (svgY - country.cy) ** 2;
    if (d <= markerDist) {
      markerDist = d;
      markerHit = ownerId;
    }
  }
  return markerHit;
}
