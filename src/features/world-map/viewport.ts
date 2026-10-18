export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

export type Viewport = { scale: number; x: number; y: number };

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/**
 * Translation autorisée pour qu'une carte de taille `width × height`, agrandie de `scale`
 * autour de son centre, couvre toujours la zone visible.
 */
export function clampTranslation(scale: number, x: number, y: number, width: number, height: number) {
  'worklet';
  const maxX = ((scale - 1) * width) / 2;
  const maxY = ((scale - 1) * height) / 2;
  // `+ 0` normalise -0 en 0.
  return { x: clamp(x, -maxX, maxX) + 0, y: clamp(y, -maxY, maxY) + 0 };
}

/** Cadre centré sur un point de la carte (coordonnées dans l'espace d'affichage). */
export function focusViewport(px: number, py: number, scale: number, width: number, height: number): Viewport {
  'worklet';
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  const raw = { x: (width / 2 - px) * s, y: (height / 2 - py) * s };
  const t = clampTranslation(s, raw.x, raw.y, width, height);
  return { scale: s, x: t.x, y: t.y };
}
