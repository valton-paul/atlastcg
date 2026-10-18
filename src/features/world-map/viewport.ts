export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

export type Viewport = { scale: number; x: number; y: number };

/**
 * Géométrie de la carte : `frame` est la zone d'affichage, `content` la carte centrée dedans
 * (plus petite si elle est réduite pour tenir), `inset` la part du cadre masquée par un panneau.
 */
export type MapGeometry = {
  frameWidth: number;
  frameHeight: number;
  contentWidth: number;
  contentHeight: number;
  insetRight: number;
  insetBottom: number;
};

export function geometry(
  frameWidth: number,
  frameHeight: number,
  overrides: Partial<Omit<MapGeometry, 'frameWidth' | 'frameHeight'>> = {},
): MapGeometry {
  return {
    frameWidth,
    frameHeight,
    contentWidth: overrides.contentWidth ?? frameWidth,
    contentHeight: overrides.contentHeight ?? frameHeight,
    insetRight: overrides.insetRight ?? 0,
    insetBottom: overrides.insetBottom ?? 0,
  };
}

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Bornes de translation sur un axe, la mise à l'échelle se faisant autour du centre du cadre. */
function axisBounds(scale: number, frame: number, content: number, inset: number): [number, number] {
  'worklet';
  const half = (content * scale) / 2;
  const min = frame / 2 - inset - half;
  const max = half - frame / 2;
  // Carte plus petite que la zone visible : on la centre dans cette zone.
  if (min > max) return [-inset / 2, -inset / 2];
  return [min, max];
}

/** Translation autorisée pour que la carte couvre toujours la zone visible (hors panneau). */
export function clampTranslation(scale: number, x: number, y: number, g: MapGeometry) {
  'worklet';
  const [minX, maxX] = axisBounds(scale, g.frameWidth, g.contentWidth, g.insetRight);
  const [minY, maxY] = axisBounds(scale, g.frameHeight, g.contentHeight, g.insetBottom);
  // `+ 0` normalise -0 en 0.
  return { x: clamp(x, minX, maxX) + 0, y: clamp(y, minY, maxY) + 0 };
}

/** Cadre qui amène un point du cadre (`px`, `py`) au centre de la zone visible. */
export function focusViewport(px: number, py: number, scale: number, g: MapGeometry): Viewport {
  'worklet';
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  const cx = g.frameWidth / 2;
  const cy = g.frameHeight / 2;
  const targetX = (g.frameWidth - g.insetRight) / 2;
  const targetY = (g.frameHeight - g.insetBottom) / 2;
  const t = clampTranslation(s, targetX - cx + (cx - px) * s, targetY - cy + (cy - py) * s, g);
  return { scale: s, x: t.x, y: t.y };
}
