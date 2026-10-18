/** Probabilité affichée en pourcentage français (« 27 % », « 1,5 % »). */
export function formatProbability(probability: number): string {
  const percent = probability * 100;
  const rounded = percent >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10;
  return `${String(rounded).replace('.', ',')}\u00a0%`;
}
