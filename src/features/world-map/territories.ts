/**
 * Territoires géographiques rattachés à un pays du catalogue (ISO numérique → souverain).
 * Ex. : le Groenland (304) s’affiche et se sélectionne comme le Danemark (208).
 */
export const MAP_TERRITORY_OF: Readonly<Record<string, string>> = {
  '304': '208', // Groenland → Danemark
};

/** Identifiant catalogue utilisé pour le palier, la sélection et le hit-test. */
export function resolveMapCountryId(isoNumeric: string): string {
  return MAP_TERRITORY_OF[isoNumeric] ?? isoNumeric;
}
