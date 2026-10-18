import mapData from './data/world-map.json';

import { resolveMapCountryId } from './territories';

type MapCountry = { id: string; name: string; d: string; cx: number; cy: number };
const MAP = mapData as { width: number; height: number; countries: MapCountry[] };

/** Rayon de secours autour du centroïde (coordonnées SVG), pour les tout petits pays. */
const MARKER_HIT_R2 = 12 * 12;

let hitCtx: CanvasRenderingContext2D | null | undefined;

function pathContext(): CanvasRenderingContext2D | null {
  if (hitCtx !== undefined) return hitCtx;
  if (typeof document === 'undefined') {
    hitCtx = null;
    return null;
  }
  const canvas = document.createElement('canvas');
  hitCtx = canvas.getContext('2d');
  return hitCtx;
}

/**
 * Convertit un point écran (clientX/clientY) en coordonnées du viewBox SVG via la CTM.
 * Prend en compte pan, zoom et letterboxing sans les recalculer à la main.
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

/** Pays du catalogue sous le point SVG, ou null (secours Path2D / centroïde). */
export function countryAtSvgPoint(svgX: number, svgY: number, selectable: ReadonlySet<string>): string | null {
  const ctx = pathContext();
  if (ctx && typeof Path2D !== 'undefined') {
    let hit: string | null = null;
    for (const country of MAP.countries) {
      const ownerId = resolveMapCountryId(country.id);
      if (!selectable.has(ownerId)) continue;
      try {
        if (ctx.isPointInPath(new Path2D(country.d), svgX, svgY)) hit = ownerId;
      } catch {
        // chemin SVG invalide : ignorer
      }
    }
    if (hit) return hit;
  }

  let markerHit: string | null = null;
  let markerDist = MARKER_HIT_R2;
  for (const country of MAP.countries) {
    const ownerId = resolveMapCountryId(country.id);
    if (!selectable.has(ownerId)) continue;
    // Centroïde du souverain uniquement (pas celui du Groenland, trop à l’écart).
    if (ownerId !== country.id) continue;
    const d = (svgX - country.cx) ** 2 + (svgY - country.cy) ** 2;
    if (d <= markerDist) {
      markerDist = d;
      markerHit = ownerId;
    }
  }
  return markerHit;
}
