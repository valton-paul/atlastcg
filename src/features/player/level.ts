/**
 * Progression d’explorateur à partir de `profiles.exploration_xp`.
 * Courbe douce : 100 XP pour le niv. 2, puis +40 XP par palier (140, 180, …).
 * Une expédition (~55–75 XP) fait clairement avancer les premiers niveaux.
 */

/** XP nécessaires pour passer du niveau `level` au suivant. */
export function xpRequiredForLevelUp(level: number): number {
  return 100 + Math.max(0, level - 1) * 40;
}

export type ExplorationProgress = {
  level: number;
  /** XP déjà gagnés dans le niveau actuel. */
  xpIntoLevel: number;
  /** XP totaux pour terminer le niveau actuel. */
  xpForNextLevel: number;
  /** 0–1 dans le niveau actuel. */
  progress: number;
};

export function explorationProgress(totalXp: number): ExplorationProgress {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  for (;;) {
    const need = xpRequiredForLevelUp(level);
    if (remaining < need) {
      return {
        level,
        xpIntoLevel: remaining,
        xpForNextLevel: need,
        progress: need > 0 ? remaining / need : 1,
      };
    }
    remaining -= need;
    level += 1;
    if (level >= 999) {
      return { level: 999, xpIntoLevel: 0, xpForNextLevel: need, progress: 1 };
    }
  }
}
