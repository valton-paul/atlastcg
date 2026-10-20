export type MasteryTier = 'novice' | 'explorer' | 'expert' | 'master';

export const MASTERY_TIER_LABELS: Record<MasteryTier, string> = {
  novice: 'Novice',
  explorer: 'Explorateur',
  expert: 'Expert',
  master: 'Maître',
};

/** Seuils d’XP de maîtrise par pays (alignés sur `atlas_private.mastery_tier`). */
export const MASTERY_THRESHOLDS: { tier: MasteryTier; minXp: number }[] = [
  { tier: 'novice', minXp: 0 },
  { tier: 'explorer', minXp: 50 },
  { tier: 'expert', minXp: 150 },
  { tier: 'master', minXp: 300 },
];

export function masteryTier(xp: number): MasteryTier {
  if (xp >= 300) return 'master';
  if (xp >= 150) return 'expert';
  if (xp >= 50) return 'explorer';
  return 'novice';
}

/** XP nécessaire pour le palier suivant ; null si déjà Maître. */
export function masteryNextThreshold(xp: number): number | null {
  if (xp >= 300) return null;
  if (xp >= 150) return 300;
  if (xp >= 50) return 150;
  return 50;
}
